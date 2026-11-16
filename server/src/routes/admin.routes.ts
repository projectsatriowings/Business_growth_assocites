import { Router, Response } from 'express';
import { Role, BgaStatus, EnquiryStatus, ServiceCategoryType, CommissionApproval, CommissionPayout } from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, authorizeRoles, AuthRequest, logAudit, createNotification, invalidateUserCache } from '../middleware/auth';
import { appCache } from '../utils/cache';

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
      pendingEnquiries,
      totalQuotations,
      totalWorkOrders,
      activeProjects,
      completedProjects,
      verifiedPayments,
      totalCommissions,
      paidCommissions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.BGA } }),
      prisma.user.count({ where: { role: Role.BGA, status: BgaStatus.ACTIVE } }),
      prisma.user.count({
        where: { role: Role.BGA, status: { in: [BgaStatus.SUBMITTED, BgaStatus.UNDER_REVIEW, BgaStatus.VERIFICATION_PENDING] } },
      }),
      prisma.client.count(),
      prisma.enquiry.count(),
      prisma.enquiry.count({ where: { status: EnquiryStatus.SUBMITTED } }),
      prisma.quotation.count(),
      prisma.workOrder.count(),
      prisma.technicalProject.count({
        where: { status: { in: ['READY_TO_START', 'IN_PROGRESS', 'UNDER_REVIEW', 'CORRECTION_REQUIRED'] } },
      }),
      prisma.technicalProject.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.aggregate({
        where: { status: 'VERIFIED' },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        _sum: { calculatedCommission: true },
      }),
      prisma.commission.aggregate({
        where: { payoutStatus: CommissionPayout.PROCESSED },
        _sum: { calculatedCommission: true },
      }),
    ]);

    const result = {
      bgas: { total: totalBgas, active: activeBgas, pendingApprovals: pendingBgaApprovals },
      clients: { total: totalClients },
      enquiries: { total: totalEnquiries, pending: pendingEnquiries },
      quotations: { total: totalQuotations },
      workOrders: { total: totalWorkOrders },
      projects: { active: activeProjects, completed: completedProjects },
      finance: {
        totalVerifiedRevenue: verifiedPayments._sum.amount || 0,
        totalCommissions: totalCommissions._sum.calculatedCommission || 0,
        paidCommissions: paidCommissions._sum.calculatedCommission || 0,
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
        panNumber: true,
        panVerified: true,
        aadhaarMasked: true,
        aadhaarVerified: true,
        bankAccountHolder: true,
        bankAccountNumber: true,
        bankIfsc: true,
        bankVerified: true,
        agreementAccepted: true,
        rejectionReason: true,
        statusNotes: true,
        approvedAt: true,
        createdAt: true,
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

    if (panVerified !== undefined) updateData.panVerified = Boolean(panVerified);
    if (aadhaarVerified !== undefined) updateData.aadhaarVerified = Boolean(aadhaarVerified);
    if (bankVerified !== undefined) updateData.bankVerified = Boolean(bankVerified);

    if (action === 'APPROVE_AND_ACTIVATE') {
      updateData.status = BgaStatus.ACTIVE;
      updateData.approvedAt = new Date();
      updateData.approvedById = req.user!.id;
      updateData.panVerified = true;
      updateData.aadhaarVerified = true;
      updateData.bankVerified = true;

      await createNotification(
        bga.id,
        'Congratulations! Your BGA Account is Approved & Active',
        'Your profile, KYC, and banking documents have been verified and approved. You now have full access to register clients and earn commissions.',
        'SUCCESS',
        '/bga/dashboard'
      );
    } else if (action === 'REJECT') {
      updateData.status = BgaStatus.REJECTED;
      updateData.rejectionReason = reason || 'Documentation failed verification criteria.';

      await createNotification(
        bga.id,
        'BGA Registration Not Approved',
        `Your application was rejected. Reason: ${updateData.rejectionReason}`,
        'WARNING'
      );
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
    res.json({ clients });
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
    let notifMsg = `Your enquiry for ${enquiry.client.clientName} (${enquiry.serviceCategory}) has been approved. You can now request an official quotation from Accounts.`;
    let notifType: 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED' = 'SUCCESS';

    if (action === 'REJECT') {
      newStatus = EnquiryStatus.REJECTED;
      notifTitle = 'Enquiry Rejected';
      notifMsg = `Enquiry for ${enquiry.client.clientName} was rejected. Note: ${notes || 'Scope or feasibility constraints.'}`;
      notifType = 'WARNING';
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

    // Notify BGA
    await createNotification(enquiry.bgaId, notifTitle, notifMsg, notifType, '/bga/quotation-requests');

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

    if (!payoutReference) {
      res.status(400).json({ error: 'Bank transfer/payout transaction reference is required' });
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

export default router;

