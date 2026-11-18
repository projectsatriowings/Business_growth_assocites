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
    const requests = await prisma.quotation.findMany({
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

// Release Work Order to Technical Department (Accounts Authorization)
router.post('/work-orders/:id/release', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

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

    // Eligibility check: Advance payment must be verified by Accounts
    if (!workOrder.advanceVerified) {
      res.status(400).json({
        error: 'Eligibility Requirement Unfulfilled: Work order cannot be released to Technical Department until advance payment has been verified.',
      });
      return;
    }

    // Prevent duplicate release
    if (workOrder.handoverApproved) {
      res.status(400).json({ error: 'Work order has already been released to the Technical Department.' });
      return;
    }

    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        handoverApproved: true,
        handoverStatus: 'APPROVED',
        handoverApprovedAt: new Date(),
        handoverApprovedById: req.user!.id,
        handoverNotes: notes || 'Released to Technical by Accounts',
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

    // Notify Technical team
    const techUsers = await prisma.user.findMany({ where: { role: Role.TECHNICAL } });
    for (const t of techUsers) {
      await createNotification(
        t.id,
        'Work Order Released - Ready for Technical Execution',
        `Accounts released work order ${workOrder.workOrderNumber} for ${workOrder.client.clientName} (${workOrder.serviceCategory}). Project is now active.`,
        'ACTION_REQUIRED',
        '/technical/projects'
      );
    }

    // Notify BGA
    await createNotification(
      workOrder.bgaId,
      'Work Order Released to Technical',
      `Accounts has verified payments and officially released the work order for ${workOrder.client.clientName} to engineering execution.`,
      'SUCCESS',
      '/bga/projects'
    );

    appCache.invalidatePrefix('accounts:');
    appCache.invalidatePrefix('admin:');
    appCache.invalidatePrefix('technical:');
    appCache.invalidatePrefix('bga:');

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'WORK_ORDER_RELEASED_TO_TECHNICAL',
      'WORK_ORDER',
      workOrder.id,
      { workOrderNumber: workOrder.workOrderNumber, notes },
      req.ip
    );

    res.json({
      message: 'Work order successfully released. Technical project is now active.',
      workOrder: updatedWorkOrder,
      project,
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

    const handoverStatus = action === 'REQUEST_CLARIFICATION' ? 'CLARIFICATION_REQUESTED' : 'ON_HOLD';

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        handoverStatus,
        handoverNotes: reason || 'Action taken by Accounts Department',
      },
    });

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

    // Payments recorded by Accounts are verified immediately upon recording
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
        status: PaymentStatus.VERIFIED,
        verifiedById: req.user!.id,
        verifiedAt: new Date(),
        verificationNotes: 'Recorded and verified directly by Accounts upon bank receipt',
      },
    });

    // 1. Advance Payment Verification Handling -> Moves to Admin for Technical Handover!
    if (paymentType === PaymentType.ADVANCE) {
      const newAdvancePaid = workOrder.advancePaid + payAmount;
      const isAdvanceFulfilled = newAdvancePaid >= workOrder.advanceRequired;

      await prisma.workOrder.update({
        where: { id: workOrder.id },
        data: {
          advancePaid: newAdvancePaid,
          advanceVerified: isAdvanceFulfilled,
          handoverStatus: isAdvanceFulfilled ? 'PENDING' : workOrder.handoverStatus,
          status: isAdvanceFulfilled ? WorkOrderStatus.ADVANCE_VERIFIED : workOrder.status,
        },
      });

      if (isAdvanceFulfilled) {
        // Notify Admin to review and authorize Technical Handover
        const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
        for (const a of admins) {
          await createNotification(
            a.id,
            'Advance Payment Verified - Technical Handover Required',
            `Accounts verified advance payment (Rs. ${payAmount.toLocaleString('en-IN')}) for ${workOrder.client.clientName}. Please review and authorize Technical Handover.`,
            'ACTION_REQUIRED',
            '/admin/work-orders'
          );
        }

        // Notify BGA that payment is verified and waiting for Admin handover authorization
        await createNotification(
          workOrder.bgaId,
          'Advance Payment Verified',
          `Accounts verified advance payment for ${workOrder.client.clientName}. Awaiting Admin Technical Handover authorization.`,
          'SUCCESS',
          '/bga/projects'
        );
      }
    }

    // 2. Commission Calculation Engine
    // Digital Marketing Monthly Payment: Commission calculated per monthly verified payment
    if (workOrder.serviceCategory === ServiceCategoryType.DIGITAL_MARKETING) {
      const commissionableAmount = Math.max(0, payAmount - adAmount);
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
          grossAmount: payAmount,
          excludedAdSpend: adAmount,
          commissionableAmount,
          commissionRate: rate,
          calculatedCommission,
          eligibilityStatus: CommissionEligibility.ELIGIBLE,
          approvalStatus: CommissionApproval.PENDING_APPROVAL,
          payoutStatus: CommissionPayout.UNPAID,
          notes: `Monthly recurring DM commission. Ad spend of Rs. ${adAmount} strictly excluded.`,
        },
      });

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
    } else if (paymentType === PaymentType.FINAL) {
      // Website, Mobile App, Software: Commission on project completion and final payment verification
      const isProjectCompleted = workOrder.project?.status === ProjectStatus.COMPLETED;
      let rateKey = 'website_commission_rate';
      if (workOrder.serviceCategory === ServiceCategoryType.MOBILE_APPLICATION_DEVELOPMENT) {
        rateKey = 'mobile_commission_rate';
      } else if (workOrder.serviceCategory === ServiceCategoryType.SOFTWARE_DEVELOPMENT) {
        rateKey = 'software_commission_rate';
      }

      const rateSetting = await prisma.systemSetting.findUnique({ where: { key: rateKey } });
      const rate = rateSetting ? parseFloat(rateSetting.value) : 12;

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

    // Invalidate caches
    appCache.invalidatePrefix('accounts:');
    appCache.invalidatePrefix('admin:');
    appCache.invalidatePrefix('bga:');

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'PAYMENT_RECORDED_AND_VERIFIED',
      'PAYMENT',
      payment.id,
      { amount: payAmount, type: paymentType, utr: utrValidation.formattedUtr },
      req.ip
    );

    res.status(201).json({ message: 'Payment recorded and verified successfully. Work order advance cleared.', payment });
  } catch (error) {
    console.error('Record payment error:', error);
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

    if (isVerified) {
      // 1. Advance Payment Verification Handling -> Moves to Admin for Technical Handover!
      if (payment.paymentType === PaymentType.ADVANCE) {
        const newAdvancePaid = workOrder.advancePaid + payment.amount;
        const isAdvanceFulfilled = newAdvancePaid >= workOrder.advanceRequired;

        await prisma.workOrder.update({
          where: { id: workOrder.id },
          data: {
            advancePaid: newAdvancePaid,
            advanceVerified: isAdvanceFulfilled,
            handoverStatus: isAdvanceFulfilled ? 'PENDING' : workOrder.handoverStatus,
            status: isAdvanceFulfilled ? WorkOrderStatus.ADVANCE_VERIFIED : workOrder.status,
          },
        });

        if (isAdvanceFulfilled) {
          // Notify Admin to review and authorize Technical Handover
          const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
          for (const a of admins) {
            await createNotification(
              a.id,
              'Advance Payment Verified - Technical Handover Required',
              `Accounts verified advance payment (Rs. ${payment.amount.toLocaleString('en-IN')}) for ${workOrder.client.clientName}. Please review and authorize Technical Handover.`,
              'ACTION_REQUIRED',
              '/admin/work-orders'
            );
          }

          // Notify BGA that payment is verified and waiting for Admin handover authorization
          await createNotification(
            workOrder.bgaId,
            'Advance Payment Verified',
            `Accounts verified advance payment for ${workOrder.client.clientName}. Awaiting Admin Technical Handover authorization.`,
            'SUCCESS',
            '/bga/projects'
          );
        }
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

    res.json({ message: `Payment successfully marked as ${isVerified ? 'VERIFIED' : 'REJECTED'}`, payment: updatedPayment });
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

