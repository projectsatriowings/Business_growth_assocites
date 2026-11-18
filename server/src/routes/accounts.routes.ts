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
    ]);

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
    const rate = parseFloat(taxRate) !== undefined ? parseFloat(taxRate) : 18;

    const taxableAmount = Math.max(0, fee + ad - disc);
    const taxAmount = (taxableAmount * rate) / 100;
    const totalAmount = taxableAmount + taxAmount;

    const advPercent = parseFloat(advanceRequiredPercent) || 50;
    const advanceRequiredAmount = (totalAmount * advPercent) / 100;

    const days = parseInt(validityDays) || 15;
    const validityDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

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
      // Update the requested quotation with prepared details
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
        },
      });
    }

    // Notify Admin of prepared quotation pending approval
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const a of admins) {
      await createNotification(
        a.id,
        isRevision ? 'Quotation Corrected - Admin Approval Required' : 'Quotation Prepared - Admin Approval Required',
        isRevision
          ? `Accounts has submitted corrected quotation ${targetQuotationNumber} for ${existing.client.clientName}. Total Value: Rs. ${totalAmount.toLocaleString('en-IN')}. Please review and authorize for release to BGA.`
          : `Accounts has prepared official quotation for ${existing.client.clientName}. Total Value: Rs. ${totalAmount.toLocaleString('en-IN')}. Please review and authorize for release to BGA.`,
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
      }

      // 2. Commission Calculation Engine
      // Digital Marketing Monthly Payment: Commission calculated per monthly verified payment
      if (workOrder.serviceCategory === ServiceCategoryType.DIGITAL_MARKETING) {
        // Exclude advertisement spend!
        const commissionableAmount = Math.max(0, payment.amount - payment.adBudgetAmount);

        // Fetch configured commission rate
        const dmSetting = await prisma.systemSetting.findUnique({ where: { key: 'dm_commission_rate' } });
        const rate = dmSetting ? parseFloat(dmSetting.value) : 15;
        const calculatedCommission = (commissionableAmount * rate) / 100;

        await prisma.commission.create({
          data: {
            bgaId: workOrder.bgaId,
            clientId: workOrder.clientId,
            workOrderId: workOrder.id,
            paymentId: payment.id,
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
            notes: `Monthly recurring DM commission. Ad spend of Rs. ${payment.adBudgetAmount} strictly excluded.`,
          },
        });

        // Notify Admin for commission payout approval
        const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
        for (const a of admins) {
          await createNotification(
            a.id,
            'New Commission Awaiting Approval',
            `Eligible commission of Rs. ${calculatedCommission.toLocaleString()} for BGA ${workOrder.bga.name} (Client: ${workOrder.client.clientName}).`,
            'ACTION_REQUIRED',
            '/admin/commissions'
          );
        }
      } else {
        // Website, Mobile App, Software: Commission on project completion and final payment verification
        if (payment.paymentType === PaymentType.FINAL) {
          // Check if project is completed
          const isProjectCompleted = workOrder.project?.status === ProjectStatus.COMPLETED;

          // Fetch configured rate
          let rateKey = 'website_commission_rate';
          if (workOrder.serviceCategory === ServiceCategoryType.MOBILE_APPLICATION_DEVELOPMENT) {
            rateKey = 'mobile_commission_rate';
          } else if (workOrder.serviceCategory === ServiceCategoryType.SOFTWARE_DEVELOPMENT) {
            rateKey = 'software_commission_rate';
          }

          const rateSetting = await prisma.systemSetting.findUnique({ where: { key: rateKey } });
          const rate = rateSetting ? parseFloat(rateSetting.value) : 12;

          // Calculate on total contract value excluding taxes/discounts
          const commissionableAmount = workOrder.quotation.serviceFee - workOrder.quotation.discount;
          const calculatedCommission = (commissionableAmount * rate) / 100;

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
              notes: isProjectCompleted
                ? `Project-based commission for ${workOrder.serviceCategory}. Verified upon final payment and project completion.`
                : `Final payment verified. Commission will become ELIGIBLE once Technical marks project COMPLETED.`,
            },
          });
        }
      }
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

export default router;

