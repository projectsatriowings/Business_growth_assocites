import { Router, Response } from 'express';
import { Role, BgaStatus, EnquiryStatus, QuotationStatus, WorkOrderStatus, ServiceCategoryType } from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, authorizeRoles, checkBgaActive, AuthRequest, logAudit, createNotification } from '../middleware/auth';
import { appCache } from '../utils/cache';

const router = Router();
router.use(authenticateJWT);
router.use(authorizeRoles(Role.BGA));
router.use(checkBgaActive);

// Helper for generating enquiry/workorder IDs
const generateId = (prefix: string) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${random}`;
};

// 1. BGA Dashboard Stats (Optimized with Promise.all & tenant-isolated cache)
router.get('/dashboard-stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;
    const cacheKey = `bga:${bgaId}:dashboard-stats`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [
      totalClients,
      totalEnquiries,
      totalQuotations,
      acceptedQuotations,
      activeProjects,
      totalEarnings,
      pendingEarnings,
    ] = await Promise.all([
      prisma.client.count({ where: { bgaId } }),
      prisma.enquiry.count({ where: { bgaId } }),
      prisma.quotation.count({ where: { bgaId } }),
      prisma.quotation.count({ where: { bgaId, status: QuotationStatus.ACCEPTED } }),
      prisma.technicalProject.count({
        where: {
          workOrder: { bgaId },
          status: { in: ['READY_TO_START', 'IN_PROGRESS', 'UNDER_REVIEW', 'CORRECTION_REQUIRED'] },
        },
      }),
      prisma.commission.aggregate({
        where: { bgaId, payoutStatus: 'PROCESSED' },
        _sum: { calculatedCommission: true },
      }),
      prisma.commission.aggregate({
        where: { bgaId, payoutStatus: 'UNPAID' },
        _sum: { calculatedCommission: true },
      }),
    ]);

    const result = {
      clients: totalClients,
      enquiries: totalEnquiries,
      quotations: totalQuotations,
      acceptedQuotations,
      activeProjects,
      earnings: {
        paid: totalEarnings._sum.calculatedCommission || 0,
        pending: pendingEarnings._sum.calculatedCommission || 0,
      },
    };

    appCache.set(cacheKey, result, 20);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load BGA stats' });
  }
});

// 2. Company Published Resources (Confidential / unpublished resources strictly hidden)
router.get('/resources', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    const resources = await prisma.companyResource.findMany({
      where: {
        isPublished: true,
        isConfidential: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load company resources' });
  }
});

// 3. Services Catalog
router.get('/services', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    const services = await prisma.serviceItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// 4. Client Management (Strict Ownership Isolation)
router.get('/clients', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      where: { bgaId: req.user!.id },
      include: {
        enquiries: {
          select: {
            id: true,
            serviceCategory: true,
            expectedBudget: true,
            status: true,
            createdAt: true,
          },
        },
        quotations: {
          select: {
            id: true,
            quotationNumber: true,
            version: true,
            totalAmount: true,
            status: true,
          },
        },
        _count: { select: { workOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ clients });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load clients' });
  }
});

// Register New Client (Enforce unique mobile & email without leaking other BGA's identity)
router.post('/clients', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      clientName,
      businessName,
      mobile,
      email,
      location,
      businessCategory,
      requiredService,
      expectedBudget,
      clientRequirements,
      discussionNotes,
      followUpDate,
    } = req.body;

    if (!clientName || !businessName || !mobile || !email || !location || !businessCategory) {
      res.status(400).json({ error: 'All core client details are required' });
      return;
    }

    const normalizedMobile = mobile.replace(/\D/g, '').slice(-10);
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedMobile.length !== 10) {
      res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
      return;
    }

    // CRITICAL OWNERSHIP CHECK: Check across all clients in the entire system
    const existingClientByMobile = await prisma.client.findUnique({
      where: { mobile: normalizedMobile },
      select: { id: true, bgaId: true },
    });

    const existingClientByEmail = await prisma.client.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, bgaId: true },
    });

    if (existingClientByMobile || existingClientByEmail) {
      // Must NOT reveal who the other BGA is, or client private info!
      res.status(409).json({
        error: 'Registration Conflict: A client with this mobile number or email address is already registered in the system. Duplicate client registrations are not permitted under company ownership policy.',
      });
      return;
    }

    // Create Client
    const client = await prisma.client.create({
      data: {
        clientName: clientName.trim(),
        businessName: businessName.trim(),
        mobile: normalizedMobile,
        email: normalizedEmail,
        location: location.trim(),
        businessCategory: businessCategory.trim(),
        bgaId: req.user!.id,
      },
    });

    // If an initial enquiry was submitted along with client registration
    let initialEnquiry = null;
    if (requiredService && clientRequirements) {
      const enquiryId = generateId('ENQ');
      initialEnquiry = await prisma.enquiry.create({
        data: {
          id: enquiryId,
          clientId: client.id,
          bgaId: req.user!.id,
          serviceCategory: requiredService as ServiceCategoryType,
          expectedBudget: parseFloat(expectedBudget) || 0,
          requirements: clientRequirements.trim(),
          discussionNotes: discussionNotes ? discussionNotes.trim() : null,
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          status: EnquiryStatus.SUBMITTED,
        },
      });

      // Notify Admins of new enquiry
      const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
      for (const a of admins) {
        await createNotification(
          a.id,
          'New Client Enquiry Submitted',
          `${req.user!.name} submitted enquiry for ${client.clientName} (${requiredService}).`,
          'ACTION_REQUIRED',
          '/admin/enquiries'
        );
      }
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'CLIENT_REGISTERED',
      'CLIENT',
      client.id,
      { clientName: client.clientName, businessName: client.businessName },
      req.ip
    );

    appCache.invalidatePrefix(`bga:${req.user!.id}:`);
    appCache.invalidatePrefix('admin:');

    res.status(201).json({
      message: 'Client registered successfully and assigned to your account.',
      client,
      enquiry: initialEnquiry,
    });
  } catch (error: any) {
    console.error('Client registration error:', error);
    res.status(500).json({ error: 'Failed to register client' });
  }
});

// Update client discussions/followups
router.put('/clients/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { location, businessCategory } = req.body;

    const client = await prisma.client.findFirst({
      where: { id, bgaId: req.user!.id },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found or not assigned to you' });
      return;
    }

    const updated = await prisma.client.update({
      where: { id },
      data: { location, businessCategory },
    });

    res.json({ client: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// 5. Enquiries Management
router.get('/enquiries', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      where: { bgaId: req.user!.id },
      include: {
        client: true,
        quotations: {
          select: {
            id: true,
            quotationNumber: true,
            version: true,
            status: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ enquiries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load enquiries' });
  }
});

router.post('/enquiries', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId, serviceCategory, subCategory, expectedBudget, requirements, discussionNotes, followUpDate } =
      req.body;

    // Verify client belongs to this BGA
    const client = await prisma.client.findFirst({
      where: { id: clientId, bgaId: req.user!.id },
    });

    if (!client) {
      res.status(403).json({ error: 'Unauthorized. You can only create enquiries for your own clients.' });
      return;
    }

    const enquiryId = generateId('ENQ');
    const enquiry = await prisma.enquiry.create({
      data: {
        id: enquiryId,
        clientId,
        bgaId: req.user!.id,
        serviceCategory,
        subCategory,
        expectedBudget: parseFloat(expectedBudget) || 0,
        requirements: requirements.trim(),
        discussionNotes,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        status: EnquiryStatus.SUBMITTED,
      },
    });

    // Notify Admins
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const a of admins) {
      await createNotification(
        a.id,
        'New Client Enquiry Awaiting Review',
        `Associate ${req.user!.name} created enquiry ${enquiryId} for ${client.clientName}.`,
        'ACTION_REQUIRED',
        '/admin/enquiries'
      );
    }

    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'CREATE_ENQUIRY', 'ENQUIRY', enquiry.id, {
      enquiryId,
      clientId,
    });

    res.status(201).json({ enquiry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create enquiry' });
  }
});

// 6. Quotation Workflow (BGA interacts with Quotations)
// Request Quotation from Accounts
router.post('/enquiries/:id/request-quotation', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const enquiry = await prisma.enquiry.findFirst({
      where: { id, bgaId: req.user!.id },
      include: { client: true },
    });

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found or not owned by you' });
      return;
    }

    // Check Configurable Workflow Setting: enquiry_approval_required_for_quotation
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'enquiry_approval_required_for_quotation' },
    });

    const isApprovalRequired = setting?.value === 'true';

    if (isApprovalRequired && enquiry.status !== EnquiryStatus.APPROVED) {
      res.status(400).json({
        error: `Management approval is required before requesting an official quotation. Current enquiry status is '${enquiry.status}'. Please wait for Admin approval.`,
      });
      return;
    }

    // Check if there is already an active quotation for this enquiry
    const existingQuotation = await prisma.quotation.findFirst({
      where: { enquiryId: id, status: { in: [QuotationStatus.REQUESTED, QuotationStatus.PREPARED, QuotationStatus.SENT_TO_BGA] } },
    });

    if (existingQuotation) {
      res.status(400).json({
        error: `A quotation request already exists for this enquiry (${existingQuotation.quotationNumber}, status: ${existingQuotation.status}).`,
      });
      return;
    }

    // Create Initial Quotation in REQUESTED status
    const quotationNumber = generateId('QT');
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        version: 1,
        enquiryId: enquiry.id,
        clientId: enquiry.clientId,
        bgaId: req.user!.id,
        serviceCategory: enquiry.serviceCategory,
        serviceScope: enquiry.requirements,
        serviceFee: enquiry.expectedBudget,
        adBudget: 0,
        discount: 0,
        taxRate: 18,
        taxAmount: (enquiry.expectedBudget * 18) / 100,
        totalAmount: enquiry.expectedBudget + (enquiry.expectedBudget * 18) / 100,
        advanceRequiredPercent: 50,
        advanceRequiredAmount: (enquiry.expectedBudget + (enquiry.expectedBudget * 18) / 100) * 0.5,
        paymentTerms: '50% advance upon contract signing. Balance upon delivery milestones.',
        validityDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        status: QuotationStatus.REQUESTED,
      },
    });

    // Notify Accounts Team immediately!
    const accountsStaff = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
    for (const acc of accountsStaff) {
      await createNotification(
        acc.id,
        'New Quotation Request from BGA',
        `BGA ${req.user!.name} requested an official quotation for ${enquiry.client.clientName} (${enquiry.serviceCategory}).`,
        'ACTION_REQUIRED',
        '/accounts/quotation-requests'
      );
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'QUOTATION_REQUESTED',
      'QUOTATION',
      quotation.id,
      { quotationNumber, enquiryId: id },
      req.ip
    );

    res.status(201).json({
      message: 'Quotation requested successfully. The Accounts Department has been notified to prepare the official quotation.',
      quotation,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request quotation' });
  }
});

// View My Quotations
router.get('/quotations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quotations = await prisma.quotation.findMany({
      where: { bgaId: req.user!.id },
      include: {
        client: true,
        enquiry: true,
        workOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ quotations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load quotations' });
  }
});

// Request Quotation Revision
router.post('/quotations/:id/request-revision', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { revisionNotes } = req.body;

    if (!revisionNotes) {
      res.status(400).json({ error: 'Revision feedback notes from the client are required' });
      return;
    }

    const quotation = await prisma.quotation.findFirst({
      where: { id, bgaId: req.user!.id },
      include: { client: true },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found or not owned by you' });
      return;
    }

    if (quotation.status === QuotationStatus.ACCEPTED) {
      res.status(400).json({ error: 'Quotation is already accepted and cannot be revised.' });
      return;
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.REVISION_REQUESTED,
        revisionNotes: revisionNotes.trim(),
      },
    });

    // Notify Accounts
    const accounts = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
    for (const a of accounts) {
      await createNotification(
        a.id,
        'Quotation Revision Requested',
        `BGA ${req.user!.name} submitted client revision feedback for ${quotation.quotationNumber}.`,
        'ACTION_REQUIRED',
        '/accounts/quotations'
      );
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'QUOTATION_REVISION_REQUESTED',
      'QUOTATION',
      id,
      { revisionNotes },
      req.ip
    );

    res.json({ message: 'Revision request forwarded to Accounts Department', quotation: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request revision' });
  }
});

// Record Client Acceptance or Rejection
router.post('/quotations/:id/client-decision', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { decision, clientAcceptanceProof, clientAcceptanceNotes } = req.body; // ACCEPTED or REJECTED

    const quotation = await prisma.quotation.findFirst({
      where: { id, bgaId: req.user!.id },
      include: { client: true },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found or not owned by you' });
      return;
    }

    if (quotation.status === QuotationStatus.ACCEPTED) {
      res.status(400).json({ error: 'Quotation has already been accepted.' });
      return;
    }

    if (decision === 'ACCEPTED') {
      if (!clientAcceptanceNotes) {
        res.status(400).json({ error: 'Client acceptance details/reference notes are mandatory' });
        return;
      }

      // Update Quotation Status
      const updatedQuotation = await prisma.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.ACCEPTED,
          clientAcceptanceProof: clientAcceptanceProof || null,
          clientAcceptanceNotes: clientAcceptanceNotes.trim(),
          acceptedAt: new Date(),
          acceptedByBgaId: req.user!.id,
        },
      });

      // Automatically generate Work Order
      const workOrderNumber = generateId('WO');
      const workOrder = await prisma.workOrder.create({
        data: {
          workOrderNumber,
          quotationId: quotation.id,
          clientId: quotation.clientId,
          bgaId: req.user!.id,
          serviceCategory: quotation.serviceCategory,
          agreedScope: quotation.serviceScope,
          totalValue: quotation.totalAmount,
          advanceRequired: quotation.advanceRequiredAmount,
          advancePaid: 0,
          advanceVerified: false,
          status: WorkOrderStatus.PENDING_ADVANCE,
        },
      });

      // Notify Accounts that work order is created and waiting for advance verification
      const accounts = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
      for (const a of accounts) {
        await createNotification(
          a.id,
          'Quotation Accepted - Advance Payment Required',
          `Quotation ${quotation.quotationNumber} accepted for ${quotation.client.clientName}. Work Order ${workOrderNumber} created. Awaiting advance payment receipt & verification.`,
          'ACTION_REQUIRED',
          '/accounts/work-orders'
        );
      }

      await logAudit(
        req.user!.id,
        req.user!.email,
        req.user!.role,
        'QUOTATION_CLIENT_ACCEPTED',
        'QUOTATION',
        id,
        { workOrderNumber, notes: clientAcceptanceNotes },
        req.ip
      );

      res.json({
        message: 'Client acceptance recorded successfully. Work Order generated in PENDING_ADVANCE status.',
        quotation: updatedQuotation,
        workOrder,
      });
    } else {
      // REJECTED
      const updatedQuotation = await prisma.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.REJECTED,
          revisionNotes: clientAcceptanceNotes || 'Client declined quotation.',
        },
      });

      await logAudit(req.user!.id, req.user!.email, req.user!.role, 'QUOTATION_CLIENT_REJECTED', 'QUOTATION', id, {
        notes: clientAcceptanceNotes,
      });

      res.json({ message: 'Quotation marked as rejected by client', quotation: updatedQuotation });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to record client decision' });
  }
});

// 7. Work Orders & My Projects
router.get('/work-orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      where: { bgaId: req.user!.id },
      include: {
        client: true,
        quotation: true,
        payments: true,
        project: {
          include: {
            milestones: true,
            deliverables: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ workOrders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load work orders' });
  }
});

// 8. Commissions & My Earnings
router.get('/commissions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const commissions = await prisma.commission.findMany({
      where: { bgaId: req.user!.id },
      include: {
        client: { select: { clientName: true, businessName: true } },
        workOrder: { select: { workOrderNumber: true, totalValue: true } },
        project: { select: { projectNumber: true, status: true } },
        payment: { select: { amount: true, transactionReference: true, paymentDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ commissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load commissions' });
  }
});

export default router;

