import { Router, Response } from 'express';
import {
  Role,
  QuotationStatus,
  WorkOrderStatus,
  PaymentStatus,
  PaymentType,
  ProjectStatus,
  CommissionEligibility,
  CommissionApproval,
  CommissionPayout,
  ServiceCategoryType,
} from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, authorizeRoles, AuthRequest, logAudit, createNotification } from '../middleware/auth';
import { appCache } from '../utils/cache';
import { validateBankUtr } from '../utils/utrValidator';
import { hydrateQuotationVersions } from '../utils/quotationVersion';
import { autoReleaseWorkOrderToTechnical } from '../utils/autoRelease';
import { resolveCommissionRate, computeCommissionBaseAndAmount } from '../services/commission.service';

const router = Router();
router.use(authenticateJWT);
router.use(authorizeRoles(Role.ACCOUNTS, Role.ADMIN));

const generateId = (prefix: string) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${random}`;
};

// 1. Accounts Dashboard Stats (Optimized with Promise.all & cache)
router.get('/dashboard-stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cached = appCache.get('accounts:dashboard-stats');
    if (cached) {
      res.json(cached);
      return;
    }

    const now = new Date();
    const months: { label: string; yearMonth: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleString('en-US', { month: 'short' });
      months.push({ label, yearMonth: `${label} ${start.getFullYear()}`, start, end });
    }
    const sixMonthsAgo = months[0].start;

    const [
      quotationRequests,
      acceptedQuotations,
      pendingPaymentVerifications,
      activeWorkOrders,
      eligibleCommissions,
      totalCollected,
      pendingVerificationAmount,
      eligibleCommissionAmount,
      recentPayments,
      recentWorkOrders,
      recentQuotationRequests,
      sixMonthPayments,
      workOrdersByCategory,
      pendingAdvanceCount,
      pendingBalanceCount,
    ] = await Promise.all([
      prisma.quotation.count({
        where: { status: { in: [QuotationStatus.REQUESTED, QuotationStatus.REVISION_REQUESTED, QuotationStatus.REJECTED] } },
      }),
      prisma.quotation.count({ where: { status: QuotationStatus.ACCEPTED } }),
      prisma.payment.count({
        where: { status: PaymentStatus.PENDING_VERIFICATION },
      }),
      prisma.workOrder.count({
        where: { status: { in: [WorkOrderStatus.PENDING_ADVANCE, WorkOrderStatus.ADVANCE_VERIFIED, WorkOrderStatus.IN_PRODUCTION] } },
      }),
      prisma.commission.count({
        where: { eligibilityStatus: CommissionEligibility.ELIGIBLE, payoutStatus: CommissionPayout.UNPAID },
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.VERIFIED },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PENDING_VERIFICATION },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: { eligibilityStatus: CommissionEligibility.ELIGIBLE, payoutStatus: CommissionPayout.UNPAID },
        _sum: { calculatedCommission: true },
      }),
      prisma.payment.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          workOrder: {
            include: {
              client: true,
              bga: { select: { id: true, name: true, email: true, mobile: true } },
            },
          },
        },
      }),
      prisma.workOrder.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          bga: { select: { id: true, name: true, email: true, mobile: true } },
          quotation: true,
          payments: true,
        },
      }),
      prisma.quotation.findMany({
        where: { status: { in: [QuotationStatus.REQUESTED, QuotationStatus.REVISION_REQUESTED, QuotationStatus.REJECTED] } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          bga: { select: { id: true, name: true, email: true, mobile: true } },
          enquiry: true,
        },
      }),
      // 6 month payments for trend
      prisma.payment.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { amount: true, paymentType: true, status: true, createdAt: true },
      }),
      // Category revenue from work orders
      prisma.workOrder.groupBy({
        by: ['serviceCategory'],
        _sum: { totalValue: true, advancePaid: true },
        _count: { id: true },
      }),
      prisma.payment.count({
        where: { status: PaymentStatus.PENDING_VERIFICATION, paymentType: PaymentType.ADVANCE },
      }),
      prisma.payment.count({
        where: { status: PaymentStatus.PENDING_VERIFICATION, paymentType: { in: [PaymentType.FINAL, PaymentType.INTERIM, PaymentType.MONTHLY_RECURRING] } },
      }),
    ]);

    // Monthly collections trend
    const monthlyCollections = months.map((m) => {
      const paymentsInMonth = sixMonthPayments.filter((p) => p.createdAt >= m.start && p.createdAt < m.end && p.status === PaymentStatus.VERIFIED);
      const advance = paymentsInMonth.filter((p) => p.paymentType === PaymentType.ADVANCE).reduce((sum, p) => sum + p.amount, 0);
      const balance = paymentsInMonth.filter((p) => p.paymentType !== PaymentType.ADVANCE).reduce((sum, p) => sum + p.amount, 0);
      return {
        month: m.label,
        yearMonth: m.yearMonth,
        advance,
        balance,
        total: advance + balance,
      };
    });

    // Service revenue breakdown
    const totalRevenueSum = totalCollected._sum.amount || 1;
    const serviceRevenueBreakdown = workOrdersByCategory.map((c) => ({
      category: c.serviceCategory,
      totalValue: c._sum.totalValue || 0,
      advancePaid: c._sum.advancePaid || 0,
      workOrdersCount: c._count.id,
      percentage: Math.round(((c._sum.advancePaid || 0) / totalRevenueSum) * 100),
    }));

    const result = {
      quotationRequests,
      acceptedQuotations,
      pendingPaymentVerifications,
      activeWorkOrders,
      eligibleCommissions,
      totalCollected: totalCollected._sum.amount || 0,
      pendingVerificationAmount: pendingVerificationAmount._sum.amount || 0,
      eligibleCommissionAmount: eligibleCommissionAmount._sum.calculatedCommission || 0,
      recentPayments,
      recentWorkOrders,
      recentQuotationRequests,
      monthlyCollections,
      serviceRevenueBreakdown,
      paymentAuditPipeline: {
        pendingAdvanceCount,
        pendingBalanceCount,
        totalPendingVerifications: pendingPaymentVerifications,
        pendingVerificationAmount: pendingVerificationAmount._sum.amount || 0,
      },
    };

    appCache.set('accounts:dashboard-stats', result, 20);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts stats' });
  }
});

// 2. Approved Enquiries & Quotation Requests
router.get('/quotation-requests', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawRequests = await prisma.quotation.findMany({
      where: {
        status: { not: QuotationStatus.EXPIRED },
      },
      include: {
        enquiry: true,
        client: true,
        bga: { select: { id: true, name: true, email: true, mobile: true } },
        reminders: { orderBy: { createdAt: 'desc' }, include: { bga: { select: { name: true } } } },
        workOrder: {
          include: {
            payments: { orderBy: { createdAt: 'asc' } },
            project: {
              include: {
                deliverables: true,
                finalPaymentFollowUps: {
                  include: { bga: { select: { id: true, name: true } } },
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
            commissions: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const requests = await hydrateQuotationVersions(rawRequests);
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load quotation requests' });
  }
});

// 3. Prepare Official Quotation (or Revision / Correction)
router.post('/quotations/:id/prepare', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      serviceScope,
      serviceFee,
      adBudget,
      discount,
      taxRate,
      advanceRequiredPercent,
      paymentTerms,
      validityDays,
      proposedCommissionRate,
      commissionBillingType,
      commissionCalculationBasis,
      commissionNotes,
      commissionExceptionReason,
    } = req.body;

    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { bga: true, client: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const fee = parseFloat(serviceFee) || 0;
    const ad = parseFloat(adBudget) || 0;
    const disc = parseFloat(discount) || 0;
    const rate = taxRate !== undefined && !isNaN(parseFloat(taxRate)) ? parseFloat(taxRate) : 18;

    const taxableAmount = Math.max(0, fee + ad - disc);
    const taxAmount = (taxableAmount * rate) / 100;
    const totalAmount = taxableAmount + taxAmount;

    const advPercent = parseFloat(advanceRequiredPercent) || 50;
    const advanceRequiredAmount = (totalAmount * advPercent) / 100;

    const days = parseInt(validityDays) || 15;
    const validityDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Validate proposed commission rate
    const propCommRate = parseFloat(proposedCommissionRate);
    if (isNaN(propCommRate) || propCommRate <= 0 || propCommRate > 100) {
      res.status(400).json({ error: 'A valid proposed commission percentage between 0.1% and 100% is required' });
      return;
    }

    // Fetch configured range for serviceCategory
    const rangeConfig = await prisma.commissionRangeConfig.findUnique({
      where: { serviceCategory: existing.serviceCategory },
    });

    const minRange = rangeConfig?.minPercentage ?? 10;
    const maxRange = rangeConfig?.maxPercentage ?? 15;
    const isException = propCommRate < minRange || propCommRate > maxRange;

    if (isException && (!commissionExceptionReason || !commissionExceptionReason.trim())) {
      res.status(400).json({
        error: `Proposed commission rate ${propCommRate}% is outside the configured range (${minRange}%–${maxRange}%). A mandatory exception justification reason is required for Admin review.`,
      });
      return;
    }

    const isRevision = existing.status === QuotationStatus.REVISION_REQUESTED || existing.status === QuotationStatus.REJECTED;
    let targetQuotationId = id;
    let targetQuotationNumber = existing.quotationNumber;

    if (isRevision) {
      // Archive current version and create new version
      const newVersionNum = existing.version + 1;
      const baseNumber = existing.quotationNumber.replace(/-V\d+$/i, '');
      const newQuotNumber = `${baseNumber}-V${newVersionNum}`;
      const newQuot = await prisma.quotation.create({
        data: {
          quotationNumber: newQuotNumber,
          version: newVersionNum,
          enquiryId: existing.enquiryId,
          clientId: existing.clientId,
          bgaId: existing.bgaId,
          preparedById: req.user!.id,
          serviceCategory: existing.serviceCategory,
          serviceScope: serviceScope || existing.serviceScope,
          serviceFee: fee,
          adBudget: ad,
          discount: disc,
          taxRate: rate,
          taxAmount,
          totalAmount,
          advanceRequiredPercent: advPercent,
          advanceRequiredAmount,
          paymentTerms: paymentTerms || existing.paymentTerms,
          validityDate,
          status: QuotationStatus.PENDING_ADMIN_APPROVAL,
          adminApprovalStatus: 'PENDING',
          adminNotes: null,
          previousVersionId: existing.id,
          // BGA Commission Proposal
          proposedCommissionRate: propCommRate,
          commissionBillingType: commissionBillingType || (existing.serviceCategory === 'DIGITAL_MARKETING' ? 'MONTHLY_RECURRING' : 'PROJECT_BASED'),
          commissionCalculationBasis: commissionCalculationBasis || 'NET_SERVICE_FEE',
          commissionNotes: commissionNotes ? commissionNotes.trim() : null,
          commissionRangeMin: minRange,
          commissionRangeMax: maxRange,
          commissionExceptionReason: isException ? commissionExceptionReason.trim() : null,
          isCommissionException: isException,
          commissionApprovalStatus: 'PENDING',
          approvedCommissionRate: null,
        },
      });

      // Update old version status
      await prisma.quotation.update({
        where: { id: existing.id },
        data: { status: QuotationStatus.EXPIRED },
      });

      targetQuotationId = newQuot.id;
      targetQuotationNumber = newQuot.quotationNumber;
    } else {
      // Update the requested quotation with prepared details and commission proposal
      await prisma.quotation.update({
        where: { id },
        data: {
          preparedById: req.user!.id,
          serviceScope: serviceScope || existing.serviceScope,
          serviceFee: fee,
          adBudget: ad,
          discount: disc,
          taxRate: rate,
          taxAmount,
          totalAmount,
          advanceRequiredPercent: advPercent,
          advanceRequiredAmount,
          paymentTerms: paymentTerms || existing.paymentTerms,
          validityDate,
          status: QuotationStatus.PENDING_ADMIN_APPROVAL,
          adminApprovalStatus: 'PENDING',
          adminNotes: null,
          // BGA Commission Proposal
          proposedCommissionRate: propCommRate,
          commissionBillingType: commissionBillingType || (existing.serviceCategory === 'DIGITAL_MARKETING' ? 'MONTHLY_RECURRING' : 'PROJECT_BASED'),
          commissionCalculationBasis: commissionCalculationBasis || 'NET_SERVICE_FEE',
          commissionNotes: commissionNotes ? commissionNotes.trim() : null,
          commissionRangeMin: minRange,
          commissionRangeMax: maxRange,
          commissionExceptionReason: isException ? commissionExceptionReason.trim() : null,
          isCommissionException: isException,
          commissionApprovalStatus: 'PENDING',
          approvedCommissionRate: null,
        },
      });
    }

    // Notify Admin of prepared quotation & commission proposal pending approval
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const a of admins) {
      await createNotification(
        a.id,
        isRevision ? 'Quotation & Commission Proposal Corrected - Admin Approval Required' : 'Quotation & Commission Proposal Prepared - Admin Approval Required',
        isRevision
          ? `Accounts has submitted corrected quotation ${targetQuotationNumber} with proposed BGA commission of ${propCommRate}%${isException ? ' [RANGE EXCEPTION FLAGGED]' : ''} for ${existing.client.clientName}. Total Value: Rs. ${totalAmount.toLocaleString('en-IN')}. Please review both and authorize for release to BGA.`
          : `Accounts has prepared official quotation and proposed BGA commission of ${propCommRate}%${isException ? ' [RANGE EXCEPTION FLAGGED]' : ''} for ${existing.client.clientName}. Total Value: Rs. ${totalAmount.toLocaleString('en-IN')}. Dual approval required before release to BGA.`,
        'ACTION_REQUIRED',
        '/admin/quotations'
      );
    }

    appCache.invalidatePrefix('admin:');
    appCache.invalidatePrefix('accounts:');

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'QUOTATION_PREPARED',
      'QUOTATION',
      targetQuotationId,
      { totalAmount, advanceRequiredAmount, isRevision, status: 'PENDING_ADMIN_APPROVAL' },
      req.ip
    );

    res.json({ message: 'Quotation submitted to Admin for approval' });
  } catch (error: any) {
    console.error('Quotation prep error:', error);
    res.status(500).json({ error: 'Failed to prepare quotation' });
  }
});

// 4. Work Orders
router.get('/work-orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      include: {
        client: true,
        bga: { select: { id: true, name: true, email: true, mobile: true } },
        quotation: true,
        payments: true,
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ workOrders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load work orders' });
  }
});

// Release Work Order to Technical Department (Delegates to Automated Release Engine)
router.post('/work-orders/:id/release', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        payments: true,
        project: true,
      },
    });

    if (!workOrder) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    if (workOrder.handoverStatus === 'ON_HOLD') {
      res.status(400).json({ error: 'Work order is on hold. Please resolve or resume hold before release.' });
      return;
    }

    const releaseResult = await autoReleaseWorkOrderToTechnical(workOrder.id, req.user!.id, req.ip);

    if (!releaseResult.released) {
      if (releaseResult.reason === 'INSUFFICIENT_ADVANCE') {
        res.status(400).json({
          error: 'Eligibility Requirement Unfulfilled: Work order requires verified advance payment before technical release.',
        });
        return;
      }
      res.status(400).json({ error: `Automatic release could not proceed: ${releaseResult.reason}` });
      return;
    }

    res.json({
      message: `Work order successfully released and routed to ${releaseResult.teamName}. Technical project is now active.`,
      project: releaseResult.project,
      routedTeam: releaseResult.team,
      teamName: releaseResult.teamName,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to release work order' });
  }
});

// Hold or Request Clarification for Work Order
router.post('/work-orders/:id/hold', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, action } = req.body; // HOLD or REQUEST_CLARIFICATION

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: { client: true, bga: true },
    });

    if (!workOrder) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    const isResume = action === 'RESUME' || action === 'CLEAR_HOLD';
    const handoverStatus = isResume
      ? (workOrder.handoverApproved ? 'APPROVED' : 'PENDING')
      : action === 'REQUEST_CLARIFICATION'
        ? 'CLARIFICATION_REQUESTED'
        : 'ON_HOLD';

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        handoverStatus,
        handoverNotes: reason || (isResume ? 'Hold removed by Accounts' : 'Action taken by Accounts Department'),
      },
    });

    if (isResume) {
      // Re-evaluate automatic release if advance is fulfilled
      await autoReleaseWorkOrderToTechnical(workOrder.id, req.user!.id, req.ip);
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      action === 'REQUEST_CLARIFICATION' ? 'WORK_ORDER_CLARIFICATION_REQUESTED' : 'WORK_ORDER_HELD',
      'WORK_ORDER',
      workOrder.id,
      { reason },
      req.ip
    );

    res.json({ message: `Work order status updated to ${handoverStatus}.`, workOrder: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update work order status' });
  }
});

// 5. Payment Management & Verification
router.get('/payments', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        workOrder: {
          include: {
            client: true,
            bga: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

// Record new client payment (Accounts records payment upon bank receipt -> automatically verified)
router.post('/work-orders/:id/payments', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentType, amount, adBudgetAmount, paymentMethod, transactionReference, paymentDate, proofAttachmentUrl } =
      req.body;

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

    // 1. Strict Bank Transaction / UTR Validation
    const utrValidation = validateBankUtr(transactionReference, paymentMethod);
    if (!utrValidation.isValid) {
      res.status(400).json({ error: utrValidation.error, hint: utrValidation.hint });
      return;
    }

    // 2. Duplicate UTR Check in Payment Ledger
    const existingPayment = await prisma.payment.findFirst({
      where: { transactionReference: utrValidation.formattedUtr },
      select: { id: true, workOrderId: true, paymentDate: true },
    });

    if (existingPayment) {
      res.status(400).json({
        error: `Duplicate Bank Transaction: Reference "${utrValidation.formattedUtr}" has already been recorded in the system.`,
        hint: 'Each bank transaction / UTR reference must be unique. Please verify your bank receipt.',
      });
      return;
    }

    const payAmount = parseFloat(amount);
    const adAmount = parseFloat(adBudgetAmount) || 0;
    const netFee = Math.max(0, payAmount - adAmount);

    // Payments recorded by Accounts are saved as PENDING_VERIFICATION until authorized & audited
    const payment = await prisma.payment.create({
      data: {
        workOrderId: id,
        paymentType: paymentType as PaymentType,
        amount: payAmount,
        adBudgetAmount: adAmount,
        netServiceFee: netFee,
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        transactionReference: utrValidation.formattedUtr,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        proofAttachmentUrl: proofAttachmentUrl || null,
        status: PaymentStatus.PENDING_VERIFICATION,
        verificationNotes: 'Recorded by Accounts. Awaiting payment audit and verification.',
      },
    });

    // Log to Client Follow-up & Activity History
    await prisma.contactActivity.create({
      data: {
        clientId: workOrder.clientId,
        bgaId: workOrder.bgaId,
        contactMethod: 'PAYMENT_RECEIPT',
        discussionSummary: `Accounts recorded ${paymentType} payment of ₹${payAmount.toLocaleString('en-IN')} via ${paymentMethod || 'BANK_TRANSFER'} (UTR: ${utrValidation.formattedUtr}).`,
        followUpNotes: 'Client payment recorded in financial ledger. Verification audit in progress.',
        outcome: paymentType === 'ADVANCE' ? 'ADVANCE_RECORDED' : 'FINAL_PAYMENT_RECORDED',
        createdBy: req.user!.name || 'Accounts Department',
      },
    });

    // Notify Assigned BGA of new payment recorded
    await createNotification(
      workOrder.bgaId,
      `${paymentType === 'ADVANCE' ? 'Advance' : 'Final'} Payment Received by Accounts`,
      `Accounts has recorded client payment of ₹${payAmount.toLocaleString('en-IN')} (UTR: ${utrValidation.formattedUtr}) for ${workOrder.client.clientName}. Payment audit and verification is currently in progress.`,
      'INFO',
      '/bga?tab=work-orders'
    );

    // Notify Accounts and Admin of new payment pending verification
    await createNotification(
      req.user!.id,
      'Payment Recorded - Ready for Verification',
      `Payment of ₹${payAmount.toLocaleString('en-IN')} (UTR: ${utrValidation.formattedUtr}) recorded for ${workOrder.client.clientName}. Ready for audit & verification.`,
      'ACTION_REQUIRED',
      '/accounts?tab=work-orders'
    );

    // Invalidate caches
    appCache.invalidatePrefix('accounts:');
    appCache.invalidatePrefix('admin:');
    appCache.invalidatePrefix('bga:');

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'PAYMENT_RECORDED',
      'PAYMENT',
      payment.id,
      { amount: payAmount, paymentType, utr: utrValidation.formattedUtr },
      req.ip
    );

    res.json({
      message: 'Payment recorded successfully. Awaiting payment audit and verification.',
      payment,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Verify Payment (CRITICAL HANDOVER TRIGGER TO TECHNICAL & COMMISSION CALCULATION)
router.post('/payments/:id/verify', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, verificationNotes } = req.body; // VERIFY or REJECT

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        workOrder: {
          include: {
            client: true,
            bga: true,
            quotation: true,
            project: true,
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const isVerified = action === 'VERIFY';

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: isVerified ? PaymentStatus.VERIFIED : PaymentStatus.REJECTED,
        verifiedById: req.user!.id,
        verifiedAt: new Date(),
        verificationNotes: verificationNotes || null,
      },
    });

    const workOrder = payment.workOrder;
    let releaseResult: any = null;

    if (isVerified) {
      // 1. Advance Payment Verification Handling -> Triggers Automatic Technical Release!
      if (payment.paymentType === PaymentType.ADVANCE) {
        releaseResult = await autoReleaseWorkOrderToTechnical(workOrder.id, req.user!.id, req.ip);

        // Log to Client Follow-up & Activity History
        await prisma.contactActivity.create({
          data: {
            clientId: workOrder.clientId,
            bgaId: workOrder.bgaId,
            contactMethod: 'ACCOUNTS_VERIFICATION',
            discussionSummary: `Advance Payment Verified: ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionReference}). Work Order auto-released to Technical Department for production.`,
            followUpNotes: verificationNotes || 'Advance payment verified by Accounts Head.',
            outcome: 'ADVANCE_VERIFIED',
            createdBy: req.user!.name || 'Accounts Head',
          },
        });

        // Notify Assigned BGA
        await createNotification(
          workOrder.bgaId,
          'Advance Payment Verified — Technical Execution Started',
          `Accounts has verified advance payment of ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionReference}) for ${workOrder.client.clientName}. Technical project is now active.`,
          'SUCCESS',
          '/bga?tab=work-orders'
        );

        // Notify Accounts
        await createNotification(
          req.user!.id,
          'Advance Payment Verified',
          `Advance payment of ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionReference}) verified for ${workOrder.client.clientName}. Work order released to Technical Team.`,
          'SUCCESS',
          '/accounts?tab=work-orders'
        );
      }

      // 2. Commission Calculation Engine (Dynamic Hierarchy: Project > Client > System)
      try {
        const resolved = await resolveCommissionRate(
          workOrder.clientId,
          workOrder.project?.id,
          workOrder.serviceCategory
        );
        const rate = resolved.rate;
        const rateSource = resolved.source;

        if (workOrder.serviceCategory === ServiceCategoryType.DIGITAL_MARKETING) {
          // Exclude advertisement spend!
          const { commissionableAmount, calculatedCommission } = computeCommissionBaseAndAmount(
            workOrder.serviceCategory,
            rate,
            { paymentAmount: payment.amount, adBudgetAmount: payment.adBudgetAmount }
          );

          await prisma.commission.create({
            data: {
              bgaId: workOrder.bgaId,
              clientId: workOrder.clientId,
              workOrderId: workOrder.id,
              paymentId: payment.id,
              projectId: workOrder.project?.id || null,
              serviceCategory: workOrder.serviceCategory,
              billingType: 'MONTHLY_RECURRING',
              grossAmount: payment.amount,
              excludedAdSpend: payment.adBudgetAmount,
              commissionableAmount,
              commissionRate: rate,
              calculatedCommission,
              eligibilityStatus: CommissionEligibility.ELIGIBLE,
              approvalStatus: CommissionApproval.PENDING_APPROVAL,
              payoutStatus: CommissionPayout.UNPAID,
              rateSource,
              notes: `Monthly recurring DM commission. Ad spend of Rs. ${payment.adBudgetAmount} strictly excluded. Rate: ${rate}% (${rateSource}).`,
            },
          });

          // Notify Admin for commission payout approval
          const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
          for (const a of admins) {
            await createNotification(
              a.id,
              'New Commission Awaiting Approval',
              `Eligible commission of ₹${calculatedCommission.toLocaleString('en-IN')} (${rate}% via ${rateSource}) for BGA ${workOrder.bga.name} (Client: ${workOrder.client.clientName}).`,
              'ACTION_REQUIRED',
              '/admin?tab=commissions'
            );
          }
        } else {
          // Development Projects: Website, Mobile App, Software
          if (payment.paymentType === PaymentType.FINAL) {
            const isProjectCompleted = workOrder.project?.status === ProjectStatus.COMPLETED;
            const { commissionableAmount, calculatedCommission } = computeCommissionBaseAndAmount(
              workOrder.serviceCategory,
              rate,
              {
                quotationServiceFee: workOrder.quotation.serviceFee,
                quotationDiscount: workOrder.quotation.discount,
                totalValue: workOrder.totalValue,
              }
            );

            await prisma.commission.create({
              data: {
                bgaId: workOrder.bgaId,
                clientId: workOrder.clientId,
                workOrderId: workOrder.id,
                paymentId: payment.id,
                projectId: workOrder.project?.id || null,
                serviceCategory: workOrder.serviceCategory,
                billingType: 'PROJECT_BASED',
                grossAmount: workOrder.totalValue,
                excludedAdSpend: 0,
                commissionableAmount,
                commissionRate: rate,
                calculatedCommission,
                eligibilityStatus: isProjectCompleted ? CommissionEligibility.ELIGIBLE : CommissionEligibility.PENDING_CRITERIA,
                approvalStatus: CommissionApproval.PENDING_APPROVAL,
                payoutStatus: CommissionPayout.UNPAID,
                rateSource,
                notes: isProjectCompleted
                  ? `Project-based commission for ${workOrder.serviceCategory}. Verified upon final payment and project completion. Rate: ${rate}% (${rateSource}).`
                  : `Final payment verified. Commission will become ELIGIBLE once Technical marks project COMPLETED. Rate: ${rate}% (${rateSource}).`,
              },
            });

            // Stage 4 Notification: Notify Admin
            const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
            for (const a of admins) {
              await createNotification(
                a.id,
                'Final Payment Received and Verified',
                `Accounts verified final payment of ₹${payment.amount.toLocaleString('en-IN')} for project ${workOrder.project?.projectNumber || workOrder.workOrderNumber} (${workOrder.client.clientName}, BGA: ${workOrder.bga.name}). Commission request generated: ₹${calculatedCommission.toLocaleString('en-IN')} (${rate}% via ${rateSource}) awaiting approval.`,
                'ACTION_REQUIRED',
                '/admin?tab=commissions'
              );
            }

            // Stage 4 Notification: Notify Assigned BGA
            await createNotification(
              workOrder.bgaId,
              'Final Payment Received and Verified',
              `Final client payment of ₹${payment.amount.toLocaleString('en-IN')} verified by Accounts for ${workOrder.client.clientName}. Your commission of ₹${calculatedCommission.toLocaleString('en-IN')} (${rate}%) is now awaiting Admin approval.`,
              'SUCCESS',
              '/bga?tab=earnings'
            );

            // Log to Client Follow-up & Activity History
            await prisma.contactActivity.create({
              data: {
                clientId: workOrder.clientId,
                bgaId: workOrder.bgaId,
                contactMethod: 'ACCOUNTS_VERIFICATION',
                discussionSummary: `Final Payment Verified: ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionReference}). 100% Contract Value Settled. Commission request submitted to Admin.`,
                followUpNotes: verificationNotes || 'Final payment verified by Accounts Head.',
                outcome: 'FINAL_PAYMENT_VERIFIED',
                createdBy: req.user!.name || 'Accounts Head',
              },
            });

            // Notify Accounts user confirmation
            await createNotification(
              req.user!.id,
              'Final Payment Verified',
              `Final payment of ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionReference}) verified for ${workOrder.client.clientName}. Commission approval request submitted to Admin.`,
              'SUCCESS',
              '/accounts?tab=work-orders'
            );
          }
        }
      } catch (rateErr: any) {
        console.error('Commission rate resolution failed:', rateErr.message);
        // If commission configuration is missing, alert Admin to configure rate!
        const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
        for (const a of admins) {
          await createNotification(
            a.id,
            'Commission Rate Configuration Required',
            `Final payment verified for ${workOrder.client.clientName} (WO: ${workOrder.workOrderNumber}), but no commission rate is configured. Please configure commission in Admin Commission Settings.`,
            'WARNING',
            '/admin?tab=commission-settings'
          );
        }
      }
    } else {
      // Payment Rejected by Accounts
      await prisma.contactActivity.create({
        data: {
          clientId: workOrder.clientId,
          bgaId: workOrder.bgaId,
          contactMethod: 'ACCOUNTS_AUDIT',
          discussionSummary: `Payment Rejected by Accounts: ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionReference}). Reason: ${verificationNotes || 'Invalid or unverified transaction.'}`,
          followUpNotes: verificationNotes || 'Payment rejected.',
          outcome: 'PAYMENT_REJECTED',
          createdBy: req.user!.name || 'Accounts Head',
        },
      });

      await createNotification(
        workOrder.bgaId,
        'Client Payment Verification Rejected',
        `Payment of ₹${payment.amount.toLocaleString('en-IN')} (UTR: ${payment.transactionReference}) for ${workOrder.client.clientName} was rejected by Accounts. Reason: ${verificationNotes || 'Invalid or unverified transaction.'}`,
        'WARNING',
        '/bga?tab=work-orders'
      );
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      `PAYMENT_${action}`,
      'PAYMENT',
      id,
      { amount: payment.amount, isVerified },
      req.ip
    );

    appCache.invalidatePrefix('accounts:');
    appCache.invalidatePrefix('admin:');
    appCache.invalidatePrefix('bga:');

    res.json({
      message: isVerified
        ? releaseResult?.released
          ? `Payment verified successfully. Work order has been automatically released to ${releaseResult.teamName}.`
          : `Payment verified successfully.${releaseResult?.reason === 'WORK_ORDER_ON_HOLD' ? ' Project remains on hold.' : ' Awaiting remaining advance balance.'}`
        : 'Payment successfully marked as REJECTED',
      payment: updatedPayment,
      autoReleased: releaseResult?.released || false,
      routedTeam: releaseResult?.team,
      teamName: releaseResult?.teamName,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Request Additional Payment Information / UTR Clarification
router.post('/payments/:id/request-info', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        workOrder: {
          include: { client: true, bga: true },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        verificationNotes: notes ? `Clarification Requested: ${notes}` : 'Accounts requested additional bank transfer verification proof.',
      },
    });

    // Notify BGA
    await createNotification(
      payment.workOrder.bgaId,
      'Payment Verification Info Requested',
      `Accounts requires clarification for UTR ${payment.transactionReference} (${payment.workOrder.client.clientName}): ${notes || 'Please verify transaction details.'}`,
      'ACTION_REQUIRED',
      '/bga/projects'
    );

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'PAYMENT_INFO_REQUESTED',
      'PAYMENT',
      payment.id,
      { notes, transactionReference: payment.transactionReference },
      req.ip
    );

    res.json({ message: 'Clarification request sent to associate successfully.', payment: updatedPayment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request payment info' });
  }
});

// 6. Commission Overview for Accounts
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
        client: { select: { clientName: true, businessName: true } },
        workOrder: { select: { workOrderNumber: true } },
        payment: { select: { amount: true, transactionReference: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ commissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load commissions' });
  }
});

// 7. Final Payment Verification Desk (Stage 3)
router.get('/final-payments', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await prisma.technicalProject.findMany({
      where: {
        status: { in: [ProjectStatus.COMPLETED, ProjectStatus.UNDER_REVIEW, ProjectStatus.IN_PROGRESS] },
      },
      include: {
        client: true,
        workOrder: {
          include: {
            payments: { orderBy: { paymentDate: 'desc' } },
            quotation: true,
            bga: { select: { id: true, name: true, email: true, mobile: true, bankAccountNumber: true, bankIfsc: true, status: true } },
          },
        },
        finalPaymentFollowUps: {
          orderBy: { createdAt: 'desc' },
          include: { bga: { select: { id: true, name: true } } },
        },
        commissions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch final payment projects' });
  }
});

// 8. Commission Payouts Desk for Accounts (Stage 5)
router.get('/commission-payouts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const commissions = await prisma.commission.findMany({
      where: {
        approvalStatus: CommissionApproval.APPROVED,
      },
      include: {
        client: true,
        bga: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            bankName: true,
            bankAccountHolder: true,
            bankAccountNumber: true,
            bankIfsc: true,
            bankVerified: true,
            status: true,
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderNumber: true,
            totalValue: true,
            advancePaid: true,
          },
        },
        project: {
          select: {
            id: true,
            projectNumber: true,
            status: true,
            closureStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ commissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commission payouts' });
  }
});

// 9. Accounts Records Actual Commission Payout (Stage 5 & Stage 6 Closure)
router.post('/commissions/:id/payout', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { transactionReference, paymentMethod, transferDate, receiptUrl, payoutNotes } = req.body;

    if (!transactionReference || !transactionReference.trim()) {
      res.status(400).json({ error: 'Bank transaction reference / UTR is required' });
      return;
    }

    const comm = await prisma.commission.findUnique({
      where: { id },
      include: {
        bga: true,
        client: true,
        workOrder: { include: { payments: true } },
        project: true,
      },
    });

    if (!comm) {
      res.status(404).json({ error: 'Commission record not found' });
      return;
    }

    if (comm.approvalStatus !== CommissionApproval.APPROVED) {
      res.status(400).json({ error: 'Cannot process payout: Commission has not been approved by Admin.' });
      return;
    }

    if (comm.payoutStatus === CommissionPayout.PROCESSED) {
      res.status(400).json({
        error: `Commission already disbursed on ${comm.payoutDate ? new Date(comm.payoutDate).toLocaleDateString() : 'earlier date'}.`,
      });
      return;
    }

    // Payout Security Check: Associate bank details verified
    if (!comm.bga.bankVerified) {
      res.status(400).json({
        error: 'Cannot process payout: Associate bank account is pending verification by Admin. Review bank details before disbursement.',
      });
      return;
    }

    const utrVal = validateBankUtr(transactionReference.trim(), paymentMethod || 'NEFT');
    if (!utrVal.isValid) {
      res.status(400).json({ error: utrVal.error, hint: utrVal.hint });
      return;
    }

    const updated = await prisma.commission.update({
      where: { id },
      data: {
        payoutStatus: CommissionPayout.PROCESSED,
        payoutReference: utrVal.formattedUtr,
        payoutDate: transferDate ? new Date(transferDate) : new Date(),
        payoutMethod: paymentMethod || 'BANK_TRANSFER',
        payoutReceiptUrl: receiptUrl || null,
        payoutProcessedById: req.user!.id,
        notes: payoutNotes ? `${comm.notes || ''} | Payout: ${payoutNotes.trim()}` : comm.notes,
      },
    });

    // Stage 6: Client & Project Closure Check
    // If technical project is COMPLETED and work order is fully paid, mark closureStatus: 'COMPLETED_AND_SETTLED'
    if (comm.project && comm.project.status === ProjectStatus.COMPLETED) {
      const totalPaid = comm.workOrder.payments
        .filter((p) => p.status === PaymentStatus.VERIFIED)
        .reduce((sum, p) => sum + p.amount, 0);

      if (totalPaid >= comm.workOrder.totalValue) {
        await prisma.technicalProject.update({
          where: { id: comm.project.id },
          data: {
            closureStatus: 'COMPLETED_AND_SETTLED',
            closedAt: new Date(),
            closedById: req.user!.id,
          },
        });

        // Notify Admin, BGA, Accounts of Project Settlement
        const closureMsg = `Project ${comm.project.projectNumber} (${comm.client.clientName}) has achieved full closure: Technical completion verified, final payment cleared, and BGA commission settled.`;
        await createNotification(comm.bgaId, 'Project Workflow Settled & Closed', closureMsg, 'SUCCESS', '/bga?tab=projects');
        await createNotification(req.user!.id, 'Project Workflow Settled & Closed', closureMsg, 'SUCCESS', '/accounts?tab=work-orders');
        const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
        for (const a of admins) {
          await createNotification(a.id, 'Project Workflow Settled & Closed', closureMsg, 'SUCCESS', '/admin?tab=technical');
        }
      }
    }

    // Automatic Notification: Notify BGA (Stage 5)
    await createNotification(
      comm.bgaId,
      'Commission Received',
      `Your commission payment of ₹${comm.calculatedCommission.toLocaleString('en-IN')} (${comm.commissionRate}%) for ${comm.client.clientName} has been recorded successfully. Ref #${utrVal.formattedUtr}.`,
      'SUCCESS',
      '/bga?tab=earnings'
    );

    // Notify Admin
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const a of admins) {
      await createNotification(
        a.id,
        'Commission Payout Completed',
        `Accounts disbursed commission of ₹${comm.calculatedCommission.toLocaleString('en-IN')} to BGA ${comm.bga.name} (Ref: ${utrVal.formattedUtr}).`,
        'INFO',
        '/admin?tab=commissions'
      );
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'COMMISSION_PAYOUT_DISBURSED',
      'COMMISSION',
      id,
      { amount: comm.calculatedCommission, payoutReference: utrVal.formattedUtr, paymentMethod },
      req.ip
    );

    appCache.invalidatePrefix('accounts:');
    appCache.invalidatePrefix('bga:');
    appCache.invalidatePrefix('admin:');

    res.json({ message: 'Commission payout recorded successfully', commission: updated });
  } catch (error) {
    console.error('Payout error:', error);
    res.status(500).json({ error: 'Failed to record payout' });
  }
});

export default router;

