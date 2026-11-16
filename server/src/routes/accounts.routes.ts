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
    ] = await Promise.all([
      prisma.quotation.count({
        where: { status: { in: [QuotationStatus.REQUESTED, QuotationStatus.REVISION_REQUESTED] } },
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
    ]);

    const result = {
      quotationRequests,
      acceptedQuotations,
      pendingPaymentVerifications,
      activeWorkOrders,
      eligibleCommissions,
      totalCollected: totalCollected._sum.amount || 0,
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
      include: {
        enquiry: true,
        client: true,
        bga: { select: { id: true, name: true, email: true, mobile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load quotation requests' });
  }
});

// 3. Prepare Official Quotation (or Revision)
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

    const isRevision = existing.status === QuotationStatus.REVISION_REQUESTED;
    let targetQuotationId = id;

    if (isRevision) {
      // Archive current version and create new version
      const newVersionNum = existing.version + 1;
      const newQuot = await prisma.quotation.create({
        data: {
          quotationNumber: `${existing.quotationNumber}-V${newVersionNum}`,
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
          status: QuotationStatus.SENT_TO_BGA,
          previousVersionId: existing.id,
        },
      });

      // Update old version status
      await prisma.quotation.update({
        where: { id: existing.id },
        data: { status: QuotationStatus.EXPIRED },
      });

      targetQuotationId = newQuot.id;
    } else {
      // Update the requested quotation
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
          status: QuotationStatus.SENT_TO_BGA,
        },
      });
    }

    // Notify BGA immediately
    await createNotification(
      existing.bgaId,
      'Official Quotation Prepared & Dispatched',
      `Accounts has prepared official quotation for ${existing.client.clientName}. Total Value: Rs. ${totalAmount.toLocaleString('en-IN')}. Please present to client.`,
      'SUCCESS',
      '/bga/quotations'
    );

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'QUOTATION_PREPARED',
      'QUOTATION',
      targetQuotationId,
      { totalAmount, advanceRequiredAmount, isRevision },
      req.ip
    );

    res.json({ message: 'Quotation successfully prepared and dispatched to BGA' });
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

// Record new client payment
router.post('/work-orders/:id/payments', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentType, amount, adBudgetAmount, paymentMethod, transactionReference, paymentDate, proofAttachmentUrl } =
      req.body;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: { client: true, bga: true },
    });

    if (!workOrder) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    const payAmount = parseFloat(amount);
    const adAmount = parseFloat(adBudgetAmount) || 0;
    const netFee = Math.max(0, payAmount - adAmount);

    const payment = await prisma.payment.create({
      data: {
        workOrderId: id,
        paymentType: paymentType as PaymentType,
        amount: payAmount,
        adBudgetAmount: adAmount,
        netServiceFee: netFee,
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        transactionReference: transactionReference || 'TXN-' + Date.now(),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        proofAttachmentUrl: proofAttachmentUrl || null,
        status: PaymentStatus.PENDING_VERIFICATION,
      },
    });

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'PAYMENT_RECORDED',
      'PAYMENT',
      payment.id,
      { amount: payAmount, type: paymentType },
      req.ip
    );

    res.status(201).json({ message: 'Payment recorded. Pending Accounts bank verification.', payment });
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

    if (isVerified) {
      // 1. Advance Payment Verification Handling -> TRIGGER TECHNICAL HANDOVER!
      if (payment.paymentType === PaymentType.ADVANCE) {
        const newAdvancePaid = workOrder.advancePaid + payment.amount;
        const isAdvanceFulfilled = newAdvancePaid >= workOrder.advanceRequired;

        await prisma.workOrder.update({
          where: { id: workOrder.id },
          data: {
            advancePaid: newAdvancePaid,
            advanceVerified: isAdvanceFulfilled,
            status: isAdvanceFulfilled ? WorkOrderStatus.ADVANCE_VERIFIED : workOrder.status,
          },
        });

        // Trigger Technical Department Handover if advance is verified
        if (isAdvanceFulfilled && !workOrder.project) {
          const projectNumber = generateId('PRJ');
          const technicalProject = await prisma.technicalProject.create({
            data: {
              projectNumber,
              workOrderId: workOrder.id,
              clientId: workOrder.clientId,
              serviceCategory: workOrder.serviceCategory,
              approvedScope: workOrder.agreedScope,
              status: ProjectStatus.READY_TO_START,
              progressPercentage: 0,
            },
          });

          // Create standard initial milestones based on service
          await prisma.projectMilestone.createMany({
            data: [
              { projectId: technicalProject.id, title: 'Project Kick-off & Requirement Deep Dive', status: 'TODO' },
              { projectId: technicalProject.id, title: 'Architecture / Wireframes / Design Approval', status: 'TODO' },
              { projectId: technicalProject.id, title: 'Core Implementation & Deliverable Build', status: 'TODO' },
              { projectId: technicalProject.id, title: 'Quality Assurance & Client Review', status: 'TODO' },
              { projectId: technicalProject.id, title: 'Final Handover & Project Sign-off', status: 'TODO' },
            ],
          });

          // Notify Technical Department
          const techUsers = await prisma.user.findMany({ where: { role: Role.TECHNICAL } });
          for (const t of techUsers) {
            await createNotification(
              t.id,
              'New Project Released for Execution',
              `Advance payment for ${workOrder.client.clientName} has been verified by Accounts. Project ${projectNumber} is READY_TO_START.`,
              'ACTION_REQUIRED',
              '/technical/projects'
            );
          }

          // Notify BGA
          await createNotification(
            workOrder.bgaId,
            'Advance Payment Verified & Project Activated',
            `Accounts verified advance payment for ${workOrder.client.clientName}. Technical project ${projectNumber} is now active.`,
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

    res.json({ message: `Payment successfully marked as ${isVerified ? 'VERIFIED' : 'REJECTED'}`, payment: updatedPayment });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
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

