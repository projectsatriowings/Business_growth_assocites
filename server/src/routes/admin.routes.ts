import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  Role,
  BgaStatus,
  EnquiryStatus,
  QuotationStatus,
  WorkOrderStatus,
  PaymentStatus,
  ProjectStatus,
  ServiceCategoryType,
  CommissionApproval,
  CommissionPayout,
} from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, authorizeRoles, AuthRequest, logAudit, createNotification, invalidateUserCache } from '../middleware/auth';
import { appCache } from '../utils/cache';
import { validateBankUtr } from '../utils/utrValidator';
import { verifySmtpConnection, sendEmail, sendKycStatusEmail, ADMIN_ALERT_EMAIL } from '../utils/mailer';

const router = Router();
router.use(authenticateJWT);
router.use(authorizeRoles(Role.ADMIN));

// 1. Dashboard Analytics (Optimized with concurrent Promise.all & isolated in-memory cache)
router.get('/dashboard-stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cached = appCache.get('admin:dashboard-stats');
    if (cached) {
      res.json(cached);
      return;
    }

    const [
      totalBgas,
      activeBgas,
      pendingBgaApprovals,
      totalClients,
      totalEnquiries,
      approvedEnquiries,
      pendingEnquiries,
      totalQuotations,
      totalWorkOrders,
      totalProjects,
      activeProjects,
      completedProjects,
      verifiedPayments,
      totalCommissions,
      paidCommissions,
      pendingCommissions,
      pendingQuotations,
      delayedQuotations,
      pendingQuotationApprovals,
      acceptedQuotations,
      pendingAdvancePayments,
      paymentsVerifiedCount,
      pendingTechnicalHandovers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.BGA } }),
      prisma.user.count({ where: { role: Role.BGA, status: BgaStatus.ACTIVE } }),
      prisma.user.count({
        where: { role: Role.BGA, status: { in: [BgaStatus.SUBMITTED, BgaStatus.UNDER_REVIEW, BgaStatus.VERIFICATION_PENDING] } },
      }),
      prisma.client.count(),
      prisma.enquiry.count(),
      prisma.enquiry.count({ where: { status: EnquiryStatus.APPROVED } }),
      prisma.enquiry.count({ where: { status: EnquiryStatus.SUBMITTED } }),
      prisma.quotation.count(),
      prisma.workOrder.count(),
      prisma.technicalProject.count(),
      prisma.technicalProject.count({
        where: { status: { in: [ProjectStatus.READY_TO_START, ProjectStatus.IN_PROGRESS, ProjectStatus.UNDER_REVIEW, ProjectStatus.CORRECTION_REQUIRED] } },
      }),
      prisma.technicalProject.count({ where: { status: ProjectStatus.COMPLETED } }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.VERIFIED },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        _sum: { calculatedCommission: true },
      }),
      prisma.commission.aggregate({
        where: { payoutStatus: CommissionPayout.PROCESSED },
        _sum: { calculatedCommission: true },
      }),
      prisma.commission.aggregate({
        where: { payoutStatus: { not: CommissionPayout.PROCESSED } },
        _sum: { calculatedCommission: true },
      }),
      prisma.quotation.count({
        where: { status: { in: [QuotationStatus.REQUESTED, QuotationStatus.REVISION_REQUESTED] } },
      }),
      prisma.quotation.count({
        where: {
          status: { in: [QuotationStatus.REQUESTED, QuotationStatus.REVISION_REQUESTED] },
          reminderCount: { gt: 0 },
        },
      }),
      prisma.quotation.count({
        where: { status: QuotationStatus.PENDING_ADMIN_APPROVAL },
      }),
      prisma.quotation.count({
        where: { status: QuotationStatus.ACCEPTED },
      }),
      prisma.workOrder.count({
        where: { status: WorkOrderStatus.PENDING_ADVANCE, advanceVerified: false },
      }),
      prisma.payment.count({
        where: { status: PaymentStatus.VERIFIED },
      }),
      prisma.workOrder.count({
        where: { advanceVerified: true, handoverApproved: false },
      }),
    ]);

    const result = {
      bgas: { total: totalBgas, active: activeBgas, pendingApprovals: pendingBgaApprovals },
      clients: { total: totalClients },
      enquiries: { total: totalEnquiries, approved: approvedEnquiries, pending: pendingEnquiries },
      quotations: { total: totalQuotations },
      workOrders: { total: totalWorkOrders },
      projects: { total: totalProjects, active: activeProjects, completed: completedProjects },
      technical: { total: totalProjects, active: activeProjects, completed: completedProjects },
      finance: {
        totalVerifiedRevenue: verifiedPayments._sum.amount || 0,
        totalCommissions: totalCommissions._sum.calculatedCommission || 0,
        paidCommissions: paidCommissions._sum.calculatedCommission || 0,
        pendingCommissions: pendingCommissions._sum.calculatedCommission || 0,
      },
      workflow: {
        pendingClientApprovals: pendingEnquiries,
        approvedEnquiries,
        pendingQuotations,
        delayedQuotations,
        pendingQuotationApprovals,
        acceptedQuotations,
        pendingAdvancePayments,
        paymentsVerified: paymentsVerifiedCount,
        pendingTechnicalHandovers,
        activeTechnicalProjects: activeProjects,
      },
    };

    appCache.set('admin:dashboard-stats', result, 20);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// 2. BGA Management List
router.get('/bgas', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    const where: any = { role: Role.BGA };

    if (status && status !== 'ALL') {
      where.status = status as BgaStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { mobile: { contains: String(search) } },
        { panNumber: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const bgas = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        status: true,
        dob: true,
        address: true,
        city: true,
        state: true,
        pinCode: true,
        panNumber: true,
        panVerified: true,
        panVerifiedAt: true,
        aadhaarMasked: true,
        aadhaarVerified: true,
        aadhaarVerifiedAt: true,
        kycSubmittedAt: true,
        bankName: true,
        bankAccountHolder: true,
        bankAccountNumber: true,
        bankIfsc: true,
        bankVerified: true,
        bankVerifiedAt: true,
        panDocumentUrl: true,
        addressProofUrl: true,
        bankProofUrl: true,
        agreementAccepted: true,
        agreementAcceptedAt: true,
        agreementDocumentUrl: true,
        lastLoginAt: true,
        rejectionReason: true,
        statusNotes: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            clients: true,
            enquiries: true,
            commissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ bgas });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load BGAs' });
  }
});

// 2b. Complete Associate Profile by ID
router.get('/bgas/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bga = await prisma.user.findUnique({
      where: { id },
      include: {
        clients: {
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
                totalAmount: true,
                status: true,
              },
            },
            _count: {
              select: { workOrders: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        enquiries: {
          include: {
            client: { select: { id: true, clientName: true, businessName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          include: {
            client: { select: { id: true, clientName: true, businessName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        workOrders: {
          include: {
            client: { select: { id: true, clientName: true, businessName: true } },
            project: {
              select: {
                id: true,
                projectNumber: true,
                status: true,
                progressPercentage: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                paymentType: true,
                status: true,
                transactionReference: true,
                paymentDate: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        commissions: {
          include: {
            client: { select: { id: true, clientName: true, businessName: true } },
            workOrder: { select: { id: true, workOrderNumber: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          take: 30,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!bga || bga.role !== Role.BGA) {
      res.status(404).json({ error: 'Associate profile not found' });
      return;
    }

    // Performance metrics calculated from real DB records
    const totalClients = bga.clients.length;
    const enquiriesApproved = bga.enquiries.filter((e) => e.status === EnquiryStatus.APPROVED).length;
    const enquiriesPending = bga.enquiries.filter(
      (e) => e.status === EnquiryStatus.SUBMITTED || e.status === EnquiryStatus.UNDER_REVIEW
    ).length;
    const enquiriesRejected = bga.enquiries.filter((e) => e.status === EnquiryStatus.REJECTED).length;
    const enquiriesChangesRequested = bga.enquiries.filter(
      (e) => e.status === EnquiryStatus.CHANGES_REQUESTED
    ).length;

    const activeProjects = bga.workOrders.filter(
      (w) => w.project && ['READY_TO_START', 'IN_PROGRESS', 'UNDER_REVIEW', 'CORRECTION_REQUIRED'].includes(w.project.status)
    ).length;
    const completedProjects = bga.workOrders.filter((w) => w.project && w.project.status === 'COMPLETED').length;

    const totalCommissionEarned = bga.commissions.reduce((acc, c) => acc + c.calculatedCommission, 0);
    const pendingCommission = bga.commissions
      .filter((c) => c.payoutStatus === CommissionPayout.UNPAID)
      .reduce((acc, c) => acc + c.calculatedCommission, 0);
    const paidCommission = bga.commissions
      .filter((c) => c.payoutStatus === CommissionPayout.PROCESSED)
      .reduce((acc, c) => acc + c.calculatedCommission, 0);

    // Strip sensitive password hash
    const { passwordHash, ...safeProfile } = bga;

    res.json({
      associate: safeProfile,
      metrics: {
        totalClients,
        enquiries: {
          total: bga.enquiries.length,
          approved: enquiriesApproved,
          pending: enquiriesPending,
          rejected: enquiriesRejected,
          changesRequested: enquiriesChangesRequested,
        },
        projects: {
          total: bga.workOrders.filter((w) => w.project).length,
          active: activeProjects,
          completed: completedProjects,
        },
        commissions: {
          totalEarned: totalCommissionEarned,
          pending: pendingCommission,
          paid: paidCommission,
        },
      },
    });
  } catch (error: any) {
    console.error('Error loading associate profile:', error);
    res.status(500).json({ error: 'Failed to load associate profile' });
  }
});

// 2c. Secure Associate Password Reset
router.post('/bgas/:id/reset-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const bga = await prisma.user.findUnique({ where: { id } });
    if (!bga || bga.role !== Role.BGA) {
      res.status(404).json({ error: 'Associate not found' });
      return;
    }

    const tempPassword = newPassword || `BGA@${Math.floor(100000 + Math.random() * 900000)}`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'ADMIN_RESET_BGA_PASSWORD',
      'USER',
      id,
      { associateEmail: bga.email },
      req.ip
    );

    res.json({
      message: 'Password reset successfully',
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// 3. BGA Status Action (Approve, Reject, Activate, Suspend, Verify KYC/Bank)
router.post('/bgas/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, status, reason, panVerified, aadhaarVerified, bankVerified } = req.body;

    const bga = await prisma.user.findUnique({ where: { id } });
    if (!bga || bga.role !== Role.BGA) {
      res.status(404).json({ error: 'BGA not found' });
      return;
    }

    const updateData: any = {};

    if (panVerified !== undefined) {
      updateData.panVerified = Boolean(panVerified);
      if (Boolean(panVerified)) updateData.panVerifiedAt = new Date();
    }
    if (aadhaarVerified !== undefined) {
      updateData.aadhaarVerified = Boolean(aadhaarVerified);
      if (Boolean(aadhaarVerified)) updateData.aadhaarVerifiedAt = new Date();
    }
    if (bankVerified !== undefined) {
      updateData.bankVerified = Boolean(bankVerified);
      updateData.bankVerifiedAt = Boolean(bankVerified) ? new Date() : null;
    }

    if (action === 'APPROVE_AND_ACTIVATE') {
      updateData.status = BgaStatus.ACTIVE;
      updateData.approvedAt = new Date();
      updateData.approvedById = req.user!.id;
      updateData.panVerified = true;
      updateData.panVerifiedAt = new Date();
      updateData.aadhaarVerified = true;
      updateData.aadhaarVerifiedAt = new Date();
      updateData.bankVerified = true;
      updateData.bankVerifiedAt = new Date();

      await createNotification(
        bga.id,
        'Congratulations! Your BGA Account is Approved & Active',
        'Your profile, KYC, and banking documents have been verified and approved. You now have full access to register clients and earn commissions.',
        'SUCCESS',
        '/bga/dashboard'
      );

      // Send email notification to associate
      sendKycStatusEmail({
        name: bga.name,
        email: bga.email,
        status: 'APPROVED',
        remarks: reason || 'Your KYC, identity, and profile documents have been officially approved.',
      }).catch((err) => console.error('Failed to send KYC approval email:', err));
    } else if (action === 'REJECT') {
      updateData.status = BgaStatus.REJECTED;
      updateData.rejectionReason = reason || 'Documentation failed verification criteria.';

      await createNotification(
        bga.id,
        'BGA Registration Not Approved',
        `Your application was rejected. Reason: ${updateData.rejectionReason}`,
        'WARNING'
      );

      // Send email notification to associate
      sendKycStatusEmail({
        name: bga.name,
        email: bga.email,
        status: 'REJECTED',
        remarks: updateData.rejectionReason,
      }).catch((err) => console.error('Failed to send KYC rejection email:', err));
    } else if (action === 'SUSPEND') {
      updateData.status = BgaStatus.SUSPENDED;
      updateData.statusNotes = reason || 'Suspended by admin.';

      await createNotification(
        bga.id,
        'Account Suspended',
        'Your BGA portal account has been temporarily suspended by management.',
        'WARNING'
      );
    } else if (action === 'ACTIVATE') {
      updateData.status = BgaStatus.ACTIVE;
      await createNotification(bga.id, 'Account Activated', 'Your account has been reactivated.', 'SUCCESS');
    } else if (status) {
      updateData.status = status;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    invalidateUserCache(id);
    appCache.invalidatePrefix('admin:');
    appCache.invalidatePrefix('bga:');

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      `BGA_STATUS_UPDATED_${action || 'UPDATE'}`,
      'USER',
      id,
      { previousStatus: bga.status, newStatus: updated.status, updateData },
      req.ip
    );

    res.json({ message: 'BGA status updated successfully', bga: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update BGA status' });
  }
});

// 4. Service Categories Management
router.get('/services', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const services = await prisma.serviceItem.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.post('/services', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, name, code, description, basePrice, defaultCommissionRate, isMonthly } = req.body;

    const service = await prisma.serviceItem.create({
      data: {
        category,
        name,
        code: code.trim().toUpperCase(),
        description,
        basePrice: parseFloat(basePrice) || 0,
        defaultCommissionRate: parseFloat(defaultCommissionRate) || 10,
        isMonthly: Boolean(isMonthly),
      },
    });

    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'CREATE_SERVICE', 'SERVICE', service.id, { service });
    res.status(201).json({ service });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create service' });
  }
});

router.put('/services/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, basePrice, defaultCommissionRate, isActive, isMonthly } = req.body;

    const service = await prisma.serviceItem.update({
      where: { id },
      data: {
        name,
        description,
        basePrice: parseFloat(basePrice),
        defaultCommissionRate: parseFloat(defaultCommissionRate),
        isActive,
        isMonthly,
      },
    });

    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'UPDATE_SERVICE', 'SERVICE', id, { service });
    res.json({ service });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update service' });
  }
});

// 5. Company Resources Management
router.get('/resources', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resources = await prisma.companyResource.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

router.post('/resources', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category, serviceCategory, fileUrl, fileType, isPublished, isConfidential } = req.body;

    const resource = await prisma.companyResource.create({
      data: {
        title,
        description,
        category,
        serviceCategory: serviceCategory || null,
        fileUrl: fileUrl || '/sample-resource.pdf',
        fileType: fileType || 'PDF',
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
        isConfidential: Boolean(isConfidential),
        uploadedById: req.user!.id,
      },
    });

    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'CREATE_RESOURCE', 'RESOURCE', resource.id, { title });
    res.status(201).json({ resource });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create resource' });
  }
});

router.put('/resources/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, category, serviceCategory, isPublished, isConfidential } = req.body;

    const resource = await prisma.companyResource.update({
      where: { id },
      data: {
        title,
        description,
        category,
        serviceCategory: serviceCategory || null,
        isPublished,
        isConfidential,
      },
    });

    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'UPDATE_RESOURCE', 'RESOURCE', id, { title });
    res.json({ resource });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update resource' });
  }
});

router.delete('/resources/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.companyResource.delete({ where: { id } });
    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'DELETE_RESOURCE', 'RESOURCE', id);
    res.json({ message: 'Resource deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// 6. Client Management & Ownership Transfer
router.get('/clients', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        bga: { select: { id: true, name: true, email: true, mobile: true } },
        _count: { select: { enquiries: true, quotations: true, workOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedClients = clients.map((c) => {
      let displayLocation = c.location;
      let addressDetails: any = null;
      try {
        if (c.location && c.location.startsWith('{')) {
          const parsed = JSON.parse(c.location);
          addressDetails = parsed;
          displayLocation = parsed.city ? `${parsed.city}${parsed.state ? ', ' + parsed.state : ''}` : (parsed.fullAddress || c.location);
        }
      } catch {}
      return {
        ...c,
        location: displayLocation,
        displayLocation,
        addressDetails,
      };
    });

    res.json({ clients: enrichedClients });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load clients' });
  }
});

// Transfer Client Ownership (Strictly Admin only, fully audited)
router.post('/clients/:id/transfer-ownership', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newBgaId, reason } = req.body;

    if (!newBgaId) {
      res.status(400).json({ error: 'Target BGA ID is required for transfer' });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: { bga: true },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const targetBga = await prisma.user.findUnique({
      where: { id: newBgaId },
    });

    if (!targetBga || targetBga.role !== Role.BGA || targetBga.status !== BgaStatus.ACTIVE) {
      res.status(400).json({ error: 'Target user is not an active BGA' });
      return;
    }

    const previousBga = client.bga;

    // Update Client Owner
    const updatedClient = await prisma.client.update({
      where: { id },
      data: { bgaId: targetBga.id },
    });

    // Notify both BGAs
    await createNotification(
      targetBga.id,
      'Client Transferred to Your Account',
      `Client '${client.clientName}' (${client.businessName}) has been reassigned to you by Company Administration.`,
      'INFO',
      '/bga/clients'
    );

    await createNotification(
      previousBga.id,
      'Client Ownership Reassigned',
      `Client '${client.clientName}' has been reassigned to another associate by Administration. Reason: ${reason || 'Administrative re-allocation'}`,
      'WARNING'
    );

    // Audit Log Transfer
    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'CLIENT_OWNERSHIP_TRANSFER',
      'CLIENT',
      client.id,
      {
        clientName: client.clientName,
        fromBga: { id: previousBga.id, name: previousBga.name, email: previousBga.email },
        toBga: { id: targetBga.id, name: targetBga.name, email: targetBga.email },
        reason: reason || 'Admin re-assignment',
      },
      req.ip
    );

    res.json({ message: 'Client ownership successfully transferred', client: updatedClient });
  } catch (error) {
    res.status(500).json({ error: 'Failed to transfer client ownership' });
  }
});

// 7. Enquiry Management & Approvals
router.get('/enquiries', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as EnquiryStatus;
    }

    const enquiries = await prisma.enquiry.findMany({
      where,
      include: {
        client: true,
        bga: { select: { id: true, name: true, email: true, mobile: true } },
        quotations: { select: { id: true, quotationNumber: true, version: true, status: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ enquiries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load enquiries' });
  }
});

router.post('/enquiries/:id/review', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // APPROVE, REJECT, REQUEST_CHANGES

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: { bga: true, client: true },
    });

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found' });
      return;
    }

    let newStatus: EnquiryStatus = EnquiryStatus.APPROVED;
    let notifTitle = 'Enquiry Approved by Management';
    let notifMsg = `Your enquiry for ${enquiry.client.clientName} (${enquiry.serviceCategory}) has been approved. Accounts has been assigned to prepare the official quotation.`;
    let notifType: 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED' = 'SUCCESS';

    if (action === 'REJECT') {
      newStatus = EnquiryStatus.REJECTED;
      notifTitle = '⚠️ Action Required: Enquiry Rejected by Management';
      notifMsg = `Management rejected enquiry ${enquiry.id} for client ${enquiry.client.clientName}. Reason: "${notes || 'Scope or feasibility constraints.'}". Please inform the client and record their response.`;
      notifType = 'ACTION_REQUIRED';
    } else if (action === 'REQUEST_CHANGES') {
      newStatus = EnquiryStatus.CHANGES_REQUESTED;
      notifTitle = 'Enquiry Scope Changes Requested';
      notifMsg = `Management requested changes for ${enquiry.client.clientName}. Details: ${notes}`;
      notifType = 'ACTION_REQUIRED';
    }

    const updated = await prisma.enquiry.update({
      where: { id },
      data: {
        status: newStatus,
        adminNotes: notes || null,
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    // If approved, automatically create a Quotation task for Accounts & notify Accounts
    if (action === 'APPROVE') {
      const existingQuotation = await prisma.quotation.findFirst({
        where: { enquiryId: enquiry.id },
      });

      if (!existingQuotation) {
        const quotationNumber = `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        await prisma.quotation.create({
          data: {
            quotationNumber,
            version: 1,
            enquiryId: enquiry.id,
            clientId: enquiry.clientId,
            bgaId: enquiry.bgaId,
            serviceCategory: enquiry.serviceCategory,
            serviceScope: enquiry.requirements,
            serviceFee: enquiry.expectedBudget || 0,
            totalAmount: enquiry.expectedBudget || 0,
            advanceRequiredAmount: (enquiry.expectedBudget || 0) * 0.5,
            paymentTerms: '50% Advance on Kick-off, 50% on Delivery Completion',
            validityDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            status: QuotationStatus.REQUESTED,
            adminApprovalStatus: 'PENDING',
          },
        });
      } else {
        await prisma.quotation.update({
          where: { id: existingQuotation.id },
          data: {
            serviceFee: enquiry.expectedBudget || existingQuotation.serviceFee,
            serviceScope: enquiry.requirements || existingQuotation.serviceScope,
            totalAmount: enquiry.expectedBudget || existingQuotation.totalAmount,
            advanceRequiredAmount: (enquiry.expectedBudget || existingQuotation.totalAmount) * 0.5,
          },
        });
      }

      // Notify Accounts users
      const accountsUsers = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
      for (const acc of accountsUsers) {
        await createNotification(
          acc.id,
          'New Approved Enquiry - Quotation Task Assigned',
          `Admin approved enquiry for ${enquiry.client.clientName} (${enquiry.serviceCategory}). Please prepare official quotation.`,
          'ACTION_REQUIRED',
          '/accounts/quotation-requests'
        );
      }
    }

    // Notify BGA
    const bgaNotifLink = action === 'APPROVE' ? '/bga/quotations' : `/bga?tab=enquiries&enquiryId=${enquiry.id}`;
    await createNotification(enquiry.bgaId, notifTitle, notifMsg, notifType, bgaNotifLink);

    // Invalidate caches
    appCache.invalidatePrefix('admin:');
    appCache.invalidatePrefix('accounts:');
    appCache.invalidatePrefix('bga:');

    // Audit Log
    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      `ENQUIRY_REVIEW_${action}`,
      'ENQUIRY',
      enquiry.id,
      { previousStatus: enquiry.status, newStatus, notes },
      req.ip
    );

    res.json({ message: `Enquiry status updated to ${newStatus}`, enquiry: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review enquiry' });
  }
});

// Quotations List & Admin Quotation Approvals
router.get('/quotations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as QuotationStatus;
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        client: true,
        bga: { select: { id: true, name: true, email: true, mobile: true } },
        enquiry: true,
        reminders: { orderBy: { createdAt: 'desc' } },
        workOrder: { select: { id: true, workOrderNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ quotations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load quotations' });
  }
});

router.get('/quotations/pending-approval', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pendingQuotations = await prisma.quotation.findMany({
      where: {
        OR: [
          { status: QuotationStatus.PENDING_ADMIN_APPROVAL },
          { adminApprovalStatus: 'PENDING', preparedById: { not: null } },
        ],
      },
      include: {
        client: true,
        bga: { select: { id: true, name: true, email: true, mobile: true } },
        enquiry: true,
        reminders: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ quotations: pendingQuotations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load pending quotation approvals' });
  }
});

router.post('/quotations/:id/review', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // APPROVE, REQUEST_REVISION, REJECT

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { client: true, bga: true },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    let newStatus: QuotationStatus = QuotationStatus.ADMIN_APPROVED;
    let adminApprovalStatus = 'APPROVED';

    if (action === 'APPROVE') {
      newStatus = QuotationStatus.ADMIN_APPROVED;
      adminApprovalStatus = 'APPROVED';

      // Notify Accounts
      const accountsUsers = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
      for (const acc of accountsUsers) {
        await createNotification(
          acc.id,
          'Quotation Approved by Admin',
          `Official quotation ${quotation.quotationNumber} for ${quotation.client.clientName} approved by Admin and released to BGA.`,
          'SUCCESS',
          '/accounts/quotation-requests'
        );
      }

      // Notify BGA - Release to BGA
      await createNotification(
        quotation.bgaId,
        'Official Quotation Approved & Ready for Client',
        `Admin has approved official quotation ${quotation.quotationNumber} for ${quotation.client.clientName} (Total: Rs. ${quotation.totalAmount.toLocaleString('en-IN')}). You can now download the PDF and present it to the client.`,
        'SUCCESS',
        '/bga/quotations'
      );
    } else if (action === 'REQUEST_REVISION') {
      newStatus = QuotationStatus.REVISION_REQUESTED;
      adminApprovalStatus = 'REVISION_REQUESTED';

      // Notify Accounts with revision reason
      const accountsUsers = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
      for (const acc of accountsUsers) {
        await createNotification(
          acc.id,
          'Quotation Revision Requested by Admin',
          `Admin requested changes on quotation ${quotation.quotationNumber} for ${quotation.client.clientName}. Note: ${notes || 'Revision required.'}`,
          'ACTION_REQUIRED',
          '/accounts/quotation-requests'
        );
      }
    } else if (action === 'REJECT') {
      newStatus = QuotationStatus.REJECTED;
      adminApprovalStatus = 'REJECTED';

      // Notify Accounts & BGA
      const accountsUsers = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
      for (const acc of accountsUsers) {
        await createNotification(
          acc.id,
          'Quotation Rejected by Admin',
          `Quotation ${quotation.quotationNumber} for ${quotation.client.clientName} was rejected by Admin. Note: ${notes || 'Rejected.'}`,
          'WARNING',
          '/accounts/quotation-requests'
        );
      }
      await createNotification(
        quotation.bgaId,
        'Quotation Rejected by Admin',
        `Quotation ${quotation.quotationNumber} for ${quotation.client.clientName} was rejected by Admin.`,
        'WARNING',
        '/bga/quotations'
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: newStatus,
        adminApprovalStatus,
        adminNotes: notes || null,
        adminReviewedAt: new Date(),
        adminReviewedById: req.user!.id,
      },
    });

    appCache.invalidatePrefix('admin:');
    appCache.invalidatePrefix('accounts:');
    appCache.invalidatePrefix('bga:');

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      `QUOTATION_ADMIN_REVIEW_${action}`,
      'QUOTATION',
      quotation.id,
      { previousStatus: quotation.status, newStatus, adminApprovalStatus, notes },
      req.ip
    );

    res.json({ message: `Quotation updated to ${newStatus}`, quotation: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review quotation' });
  }
});

// Work Orders & Payment Verification / Technical Handover
router.get('/work-orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      include: {
        client: true,
        bga: { select: { id: true, name: true, email: true, mobile: true } },
        quotation: true,
        payments: { orderBy: { createdAt: 'desc' } },
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ workOrders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load work orders' });
  }
});

router.get('/handovers/pending', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pendingHandovers = await prisma.workOrder.findMany({
      where: {
        advanceVerified: true,
        handoverApproved: false,
      },
      include: {
        client: true,
        bga: { select: { id: true, name: true, email: true, mobile: true } },
        quotation: true,
        payments: { where: { status: PaymentStatus.VERIFIED }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ handovers: pendingHandovers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load pending handovers' });
  }
});

router.post('/handovers/:id/review', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // APPROVE, HOLD, REQUEST_CLARIFICATION

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        client: true,
        bga: true,
        quotation: true,
        project: true,
      },
    });

    if (!workOrder) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    if (!workOrder.advanceVerified) {
      res.status(400).json({ error: 'Cannot authorize technical handover before advance payment has been verified by Accounts' });
      return;
    }

    if (action === 'APPROVE') {
      const updatedWorkOrder = await prisma.workOrder.update({
        where: { id },
        data: {
          handoverApproved: true,
          handoverStatus: 'APPROVED',
          handoverApprovedAt: new Date(),
          handoverApprovedById: req.user!.id,
          handoverNotes: notes || null,
          status: WorkOrderStatus.IN_PRODUCTION,
        },
      });

      // Activate or create Technical Project
      let project = workOrder.project;
      if (!project) {
        const projectNumber = `PRJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        project = await prisma.technicalProject.create({
          data: {
            projectNumber,
            workOrderId: workOrder.id,
            clientId: workOrder.clientId,
            serviceCategory: workOrder.serviceCategory,
            approvedScope: workOrder.agreedScope,
            status: ProjectStatus.READY_TO_START,
            progressPercentage: 0,
            startDate: new Date(),
          },
        });

        // Seed 5 standard technical milestones
        await prisma.projectMilestone.createMany({
          data: [
            { projectId: project.id, title: 'Project Kick-off & Requirement Deep Dive', status: 'TODO' },
            { projectId: project.id, title: 'Architecture / Wireframes / Design Approval', status: 'TODO' },
            { projectId: project.id, title: 'Core Implementation & Deliverable Build', status: 'TODO' },
            { projectId: project.id, title: 'Quality Assurance & Client Review', status: 'TODO' },
            { projectId: project.id, title: 'Final Handover & Project Sign-off', status: 'TODO' },
          ],
        });
      }

      // Notify Technical users
      const techUsers = await prisma.user.findMany({ where: { role: Role.TECHNICAL } });
      for (const t of techUsers) {
        await createNotification(
          t.id,
          'New Project Handed Over - Ready to Start',
          `Admin authorized technical handover for ${workOrder.client.clientName} (${workOrder.serviceCategory}). Work Order: ${workOrder.workOrderNumber}.`,
          'ACTION_REQUIRED',
          '/technical/projects'
        );
      }

      // Notify BGA
      await createNotification(
        workOrder.bgaId,
        'Technical Handover Approved',
        `Admin has approved technical handover for ${workOrder.client.clientName}. Project has been dispatched to the Technical team!`,
        'SUCCESS',
        '/bga/projects'
      );

      appCache.invalidatePrefix('admin:');
      appCache.invalidatePrefix('accounts:');
      appCache.invalidatePrefix('technical:');
      appCache.invalidatePrefix('bga:');

      await logAudit(
        req.user!.id,
        req.user!.email,
        req.user!.role,
        'TECHNICAL_HANDOVER_APPROVED',
        'WORK_ORDER',
        workOrder.id,
        { workOrderNumber: workOrder.workOrderNumber, notes },
        req.ip
      );

      res.json({ message: 'Technical handover authorized. Project is now active in Technical Department.', workOrder: updatedWorkOrder, project });
      return;
    } else if (action === 'HOLD') {
      const updatedWorkOrder = await prisma.workOrder.update({
        where: { id },
        data: {
          handoverStatus: 'ON_HOLD',
          handoverNotes: notes || 'Project placed on hold by Admin',
        },
      });

      // Notify Accounts and BGA
      await createNotification(
        workOrder.bgaId,
        'Project Placed on Hold by Admin',
        `Technical handover for ${workOrder.client.clientName} placed on hold. Reason: ${notes || 'Pending administrative review.'}`,
        'WARNING',
        '/bga/projects'
      );

      res.json({ message: 'Handover held successfully', workOrder: updatedWorkOrder });
      return;
    } else if (action === 'REQUEST_CLARIFICATION') {
      const updatedWorkOrder = await prisma.workOrder.update({
        where: { id },
        data: {
          handoverStatus: 'CLARIFICATION_REQUESTED',
          handoverNotes: notes || 'Clarification requested by Admin',
        },
      });

      // Notify Accounts
      const accountsUsers = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
      for (const acc of accountsUsers) {
        await createNotification(
          acc.id,
          'Handover Clarification Requested by Admin',
          `Admin requested payment/scope clarification on work order ${workOrder.workOrderNumber} (${workOrder.client.clientName}). Note: ${notes}`,
          'ACTION_REQUIRED',
          '/accounts/work-orders'
        );
      }

      res.json({ message: 'Clarification requested', workOrder: updatedWorkOrder });
      return;
    } else {
      res.status(400).json({ error: 'Invalid handover review action' });
      return;
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to review technical handover' });
  }
});

// 8. Commission Approvals & Payout Management
router.get('/commissions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const commissions = await prisma.commission.findMany({
      include: {
        bga: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            bankAccountHolder: true,
            bankAccountNumber: true,
            bankIfsc: true,
            bankVerified: true,
          },
        },
        client: { select: { id: true, clientName: true, businessName: true } },
        workOrder: { select: { id: true, workOrderNumber: true, totalValue: true } },
        payment: { select: { id: true, amount: true, transactionReference: true, paymentDate: true } },
        project: { select: { id: true, projectNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ commissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load commissions' });
  }
});

router.post('/commissions/:id/approve', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // APPROVE or REJECT

    const comm = await prisma.commission.findUnique({
      where: { id },
      include: { bga: true },
    });

    if (!comm) {
      res.status(404).json({ error: 'Commission record not found' });
      return;
    }

    // Payout Security Check: Bank account MUST be verified before funds disbursement
    if (!comm.bga.bankVerified) {
      res.status(400).json({
        error: 'Cannot process payout: Associate bank account is pending verification by Admin. Please review and verify bank details in BGA Management before disbursing funds.'
      });
      return;
    }

    const isApprove = action === 'APPROVE';
    const updated = await prisma.commission.update({
      where: { id },
      data: {
        approvalStatus: isApprove ? CommissionApproval.APPROVED : CommissionApproval.REJECTED,
        approvedById: req.user!.id,
        approvedAt: new Date(),
        notes: notes || comm.notes,
      },
    });

    await createNotification(
      comm.bgaId,
      isApprove ? 'Commission Payout Approved' : 'Commission Held/Rejected',
      isApprove
        ? `Your commission of Rs. ${comm.calculatedCommission.toLocaleString()} has been approved by Admin and queued for bank disbursement.`
        : `Your commission was rejected/held. Reason: ${notes || 'Verification required'}`,
      isApprove ? 'SUCCESS' : 'WARNING',
      '/bga/earnings'
    );

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      `COMMISSION_${action}`,
      'COMMISSION',
      id,
      { amount: comm.calculatedCommission, notes },
      req.ip
    );

    res.json({ message: `Commission ${action} successful`, commission: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process commission approval' });
  }
});

// Mark Commission as Paid (Disbursed)
router.post('/commissions/:id/payout', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { payoutReference, notes } = req.body;

    const utrValidation = validateBankUtr(payoutReference, 'BANK_TRANSFER');
    if (!utrValidation.isValid) {
      res.status(400).json({ error: utrValidation.error, hint: utrValidation.hint });
      return;
    }

    const comm = await prisma.commission.findUnique({
      where: { id },
      include: { bga: true },
    });

    if (!comm) {
      res.status(404).json({ error: 'Commission record not found' });
      return;
    }

    // Payout Security Check: Bank account MUST be verified before funds disbursement
    if (!comm.bga.bankVerified) {
      res.status(400).json({
        error: 'Cannot process payout: Associate bank account is pending verification by Admin. Please review and verify bank details in BGA Management before disbursing funds.'
      });
      return;
    }

    const updated = await prisma.commission.update({
      where: { id },
      data: {
        payoutStatus: CommissionPayout.PROCESSED,
        payoutReference,
        payoutDate: new Date(),
        notes: notes ? `${comm.notes || ''} | Payout: ${notes}` : comm.notes,
      },
    });

    await createNotification(
      comm.bgaId,
      'Commission Disbursed to Bank Account',
      `Rs. ${comm.calculatedCommission.toLocaleString()} disbursed via Ref #${payoutReference} to your verified bank account.`,
      'SUCCESS',
      '/bga/earnings'
    );

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'COMMISSION_PAYOUT_DISBURSED',
      'COMMISSION',
      id,
      { amount: comm.calculatedCommission, payoutReference },
      req.ip
    );

    res.json({ message: 'Commission payout recorded', commission: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record payout' });
  }
});

// 9. System Settings & Workflow Toggles
router.get('/settings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await prisma.systemSetting.findMany();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

router.post('/settings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { settings } = req.body; // array of { key, value }

    if (!Array.isArray(settings)) {
      res.status(400).json({ error: 'Expected an array of settings' });
      return;
    }

    for (const item of settings) {
      await prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { value: String(item.value) },
        create: { key: item.key, value: String(item.value) },
      });
    }

    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'UPDATE_SYSTEM_SETTINGS', 'SYSTEM', undefined, settings);
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// 10. Audit Logs
router.get('/audit-logs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

// 11. Identity Correction Review (Approve or Reject formal change requests)
router.post('/identity-corrections/:corrId/review', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { corrId } = req.params;
    const { bgaId, action, remarks } = req.body;

    if (!bgaId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ error: 'bgaId and valid action (APPROVE or REJECT) are required' });
      return;
    }

    const bga = await prisma.user.findUnique({ where: { id: bgaId } });
    if (!bga) {
      res.status(404).json({ error: 'Associate not found' });
      return;
    }

    const log = await prisma.auditLog.findFirst({
      where: {
        userId: bgaId,
        entityId: corrId,
        action: 'IDENTITY_CORRECTION_REQUEST',
      },
    });

    let requestDetails: any = {};
    if (log?.details) {
      try {
        requestDetails = JSON.parse(log.details);
      } catch {
        requestDetails = { raw: log.details };
      }
    }

    const isApprove = action === 'APPROVE';
    const updateData: any = {};

    if (isApprove && requestDetails.correctionType) {
      if (requestDetails.correctionType === 'PAN') {
        updateData.panNumber = requestDetails.proposedValue;
        updateData.panVerified = true;
        updateData.panVerifiedAt = new Date();
      } else if (requestDetails.correctionType === 'AADHAAR') {
        updateData.aadhaarMasked = requestDetails.proposedValue;
        updateData.aadhaarVerified = true;
        updateData.aadhaarVerifiedAt = new Date();
      } else if (requestDetails.correctionType === 'NAME') {
        updateData.name = requestDetails.proposedValue;
      } else if (requestDetails.correctionType === 'DOB') {
        updateData.dob = new Date(requestDetails.proposedValue);
      }

      await prisma.user.update({
        where: { id: bgaId },
        data: updateData,
      });
    }

    // Log the review decision
    await logAudit(
      bgaId,
      bga.email,
      Role.BGA,
      isApprove ? 'IDENTITY_CORRECTION_APPROVED' : 'IDENTITY_CORRECTION_REJECTED',
      'IDENTITY_CORRECTION',
      corrId,
      {
        ...requestDetails,
        status: isApprove ? 'APPROVED' : 'REJECTED',
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        adminRemarks: remarks || (isApprove ? 'Approved by Admin' : 'Rejected by Admin'),
      },
      req.ip
    );

    await createNotification(
      bgaId,
      isApprove ? 'Identity Correction Approved' : 'Identity Correction Rejected',
      isApprove
        ? `Your request to correct ${requestDetails.correctionType || 'identity details'} to ${requestDetails.proposedValue} has been approved by Admin.`
        : `Your identity correction request was rejected. Remarks: ${remarks || 'Supporting documentation did not meet verification criteria.'}`,
      isApprove ? 'SUCCESS' : 'WARNING',
      '/bga/profile'
    );

    res.json({ message: `Identity correction ${action.toLowerCase()}d successfully` });
  } catch (error) {
    console.error('Failed to review identity correction:', error);
    res.status(500).json({ error: 'Failed to process identity correction review' });
  }
});

// 15. SMTP Diagnostic & Testing Routes
router.get('/smtp-status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = await verifySmtpConnection();
    res.json({
      configured: true,
      sender: ADMIN_ALERT_EMAIL,
      ...status,
    });
  } catch (err: any) {
    res.status(500).json({ configured: false, error: err?.message || 'SMTP check failed' });
  }
});

router.post('/send-test-email', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetEmail = req.body.email || req.user?.email || ADMIN_ALERT_EMAIL;
    const result = await sendEmail({
      to: targetEmail,
      subject: `[SMTP Test] Atriowings Enterprise Nodemailer Verification`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
          <h2 style="color: #4f46e5;">SMTP Nodemailer Test Successful!</h2>
          <p>This email confirms that the SMTP integration for <strong>${ADMIN_ALERT_EMAIL}</strong> using Nodemailer is working properly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Server:</strong> smtp.gmail.com</p>
          <p><strong>Recipient:</strong> ${targetEmail}</p>
        </div>
      `,
    });

    if (result.success) {
      res.json({ success: true, message: `Test email dispatched to ${targetEmail}`, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch test email' });
  }
});

export default router;

