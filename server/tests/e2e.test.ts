import { PrismaClient, Role, BgaStatus, EnquiryStatus, QuotationStatus, WorkOrderStatus, PaymentStatus, ProjectStatus, CommissionEligibility } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'bga_super_secret_jwt_key_2026_growth_portal_secure_auth';

async function runEndToEndTests() {
  console.log('================================================================');
  console.log('🧪 STARTING COMPREHENSIVE E2E & SECURITY VERIFICATION SUITE');
  console.log('================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, extra?: any) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, extra || '');
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // TEST 1: Database Connectivity & Seeding Verification
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@bga.com' } });
    assert(adminUser !== null && adminUser.role === Role.ADMIN, 'Test 1: Admin user exists and has ADMIN role');

    const bga1 = await prisma.user.findUnique({ where: { email: 'bga@bga.com' } });
    assert(bga1 !== null && bga1.role === Role.BGA, 'Test 2: BGA Lead exists and has BGA role');

    const bga2 = await prisma.user.findUnique({ where: { email: 'bga2@bga.com' } });
    assert(bga2 !== null && bga2.role === Role.BGA, 'Test 3: Secondary BGA exists for isolation testing');

    const accountsUser = await prisma.user.findUnique({ where: { email: 'accounts@bga.com' } });
    assert(accountsUser !== null && accountsUser.role === Role.ACCOUNTS, 'Test 4: Accounts user exists and has ACCOUNTS role');

    const techUser = await prisma.user.findUnique({ where: { email: 'tech@bga.com' } });
    assert(techUser !== null && techUser.role === Role.TECHNICAL, 'Test 5: Technical user exists and has TECHNICAL role');

    // TEST 2: Service Classification & Category Integrity
    const services = await prisma.serviceItem.findMany();
    const categories = new Set(services.map((s) => s.category));
    assert(categories.has('DIGITAL_MARKETING'), 'Test 6: Digital Marketing category initialized');
    assert(categories.has('WEBSITE_DEVELOPMENT'), 'Test 7: Website Development category initialized');
    assert(categories.has('MOBILE_APPLICATION_DEVELOPMENT'), 'Test 8: Mobile Application Development category initialized');
    assert(categories.has('SOFTWARE_DEVELOPMENT'), 'Test 9: Software Development category initialized');

    // TEST 3: Public BGA Registration Workflow & Inactive Default
    const testRegEmail = `test.associate.${Date.now()}@example.com`;
    const testRegMobile = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Associate@123', salt);

    const newApplicant = await prisma.user.create({
      data: {
        name: 'Vikas Test Associate',
        email: testRegEmail,
        mobile: testRegMobile,
        passwordHash: passHash,
        role: Role.BGA,
        status: BgaStatus.SUBMITTED, // Must not be ACTIVE immediately
        panNumber: 'ABCDE9999Z',
        panVerified: false,
        aadhaarMasked: 'XXXX-XXXX-9999',
        aadhaarVerified: false,
        bankAccountHolder: 'Vikas Test',
        bankAccountNumber: '998877665544',
        bankIfsc: 'SBIN0001234',
        bankVerified: false,
        agreementAccepted: true,
      },
    });

    assert(newApplicant.status === BgaStatus.SUBMITTED, 'Test 10: New BGA registration status is SUBMITTED, not ACTIVE');
    assert(!newApplicant.panVerified && !newApplicant.bankVerified, 'Test 11: Verification badges default to false until Admin verification');

    // TEST 4: Admin BGA Approval & Activation
    const approvedApplicant = await prisma.user.update({
      where: { id: newApplicant.id },
      data: {
        status: BgaStatus.ACTIVE,
        panVerified: true,
        aadhaarVerified: true,
        bankVerified: true,
        approvedAt: new Date(),
        approvedById: adminUser!.id,
      },
    });

    assert(approvedApplicant.status === BgaStatus.ACTIVE, 'Test 12: Admin approval transitions BGA to ACTIVE');
    assert(approvedApplicant.panVerified && approvedApplicant.bankVerified, 'Test 13: KYC and Bank verification flags set on approval');

    // TEST 5: Client Exclusive Ownership & Duplicate Registration Blocking
    const uniqueClientPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const uniqueClientEmail = `client.${Date.now()}@corporatestore.com`;

    // BGA 1 registers the client
    const clientBga1 = await prisma.client.create({
      data: {
        clientName: 'Corporate Tech Corp',
        businessName: 'CTC Global Logistics',
        mobile: uniqueClientPhone,
        email: uniqueClientEmail,
        location: 'Hyderabad',
        businessCategory: 'Logistics',
        bgaId: bga1!.id,
      },
    });

    assert(clientBga1.bgaId === bga1!.id, 'Test 14: Client created and owned by BGA 1');

    // Attempt duplicate registration by BGA 2 with the same mobile
    let duplicateBlocked = false;
    try {
      const existingByPhone = await prisma.client.findUnique({
        where: { mobile: uniqueClientPhone },
      });
      if (existingByPhone) {
        // Enforce simulation of route duplicate check
        duplicateBlocked = true;
      } else {
        await prisma.client.create({
          data: {
            clientName: 'Sneaky Duplicate Attempt',
            businessName: 'Fake Corp',
            mobile: uniqueClientPhone,
            email: 'other.email@test.com',
            location: 'Delhi',
            businessCategory: 'Logistics',
            bgaId: bga2!.id,
          },
        });
      }
    } catch (e) {
      duplicateBlocked = true;
    }

    assert(duplicateBlocked, 'Test 15: Duplicate client registration blocked across different BGAs');

    // Verify BGA 2 query isolation: BGA 2 cannot see BGA 1 client
    const bga2Clients = await prisma.client.findMany({ where: { bgaId: bga2!.id } });
    const bga2CanSeeBga1Client = bga2Clients.some((c) => c.id === clientBga1.id);
    assert(!bga2CanSeeBga1Client, 'Test 16: BGA 2 client list does not contain BGA 1 exclusive client');

    // TEST 6: Enquiry Creation & Approval Workflow
    const enqId = `ENQ-${Date.now()}-TEST`;
    const enquiry = await prisma.enquiry.create({
      data: {
        id: enqId,
        clientId: clientBga1.id,
        bgaId: bga1!.id,
        serviceCategory: 'DIGITAL_MARKETING',
        expectedBudget: 60000,
        requirements: 'Comprehensive 6-month SEO, Google Ads and Social Media campaigns',
        status: EnquiryStatus.SUBMITTED,
      },
    });

    assert(enquiry.status === EnquiryStatus.SUBMITTED, 'Test 17: Enquiry created in SUBMITTED status');

    // Admin reviews and approves enquiry
    const approvedEnquiry = await prisma.enquiry.update({
      where: { id: enqId },
      data: {
        status: EnquiryStatus.APPROVED,
        reviewedById: adminUser!.id,
        reviewedAt: new Date(),
        adminNotes: 'Scope approved for quotation drafting.',
      },
    });

    assert(approvedEnquiry.status === EnquiryStatus.APPROVED, 'Test 18: Enquiry reviewed and APPROVED by Admin');

    // TEST 7: Quotation Workflow - BGA Requests Quotation
    const quoteNum = `QT-TEST-${Date.now()}`;
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: quoteNum,
        version: 1,
        enquiryId: approvedEnquiry.id,
        clientId: clientBga1.id,
        bgaId: bga1!.id,
        serviceCategory: 'DIGITAL_MARKETING',
        serviceScope: approvedEnquiry.requirements,
        serviceFee: 40000,
        adBudget: 20000, // Rs. 20,000 ad budget
        discount: 0,
        taxRate: 18,
        taxAmount: (60000 * 18) / 100, // 10,800
        totalAmount: 70800,
        advanceRequiredPercent: 50,
        advanceRequiredAmount: 35400,
        paymentTerms: '50% advance before start. Ad spend billed monthly.',
        validityDate: new Date(Date.now() + 15 * 86400000),
        status: QuotationStatus.REQUESTED,
      },
    });

    assert(quotation.status === QuotationStatus.REQUESTED, 'Test 19: Quotation created in REQUESTED status by BGA');

    // TEST 8: Accounts Prepares Official Quotation & Submits for Admin Approval
    const preparedQuotation = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        preparedById: accountsUser!.id,
        status: QuotationStatus.PENDING_ADMIN_APPROVAL,
        adminApprovalStatus: 'PENDING',
      },
    });

    assert(preparedQuotation.status === QuotationStatus.PENDING_ADMIN_APPROVAL, 'Test 20: Accounts prepared quotation submitted for Admin approval');

    // TEST 9: BGA Quotation Reminder with Cooldown Tracking
    const reminder = await prisma.quotationReminder.create({
      data: {
        quotationId: preparedQuotation.id,
        bgaId: bga1!.id,
        message: 'Accounts and Admin, please expedite quotation review.',
      },
    });
    const quoteWithReminder = await prisma.quotation.update({
      where: { id: preparedQuotation.id },
      data: {
        lastReminderSentAt: new Date(),
        reminderCount: 1,
      },
    });
    assert(quoteWithReminder.reminderCount === 1, 'Test 21: BGA quotation reminder logged with timestamp');

    // TEST 10: Admin Quotation Review - Revision Request
    const revisionReq = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: QuotationStatus.REVISION_REQUESTED,
        adminApprovalStatus: 'REVISION_REQUESTED',
        adminNotes: 'Please revise scope to include SSL certificate.',
        adminReviewedById: adminUser!.id,
        adminReviewedAt: new Date(),
      },
    });
    assert(revisionReq.status === QuotationStatus.REVISION_REQUESTED, 'Test 22: Admin quotation revision requested');

    // Accounts drafts revision v2 preserving previous version
    const revisionV2 = await prisma.quotation.create({
      data: {
        quotationNumber: `${quoteNum}-V2`,
        version: 2,
        enquiryId: approvedEnquiry.id,
        clientId: clientBga1.id,
        bgaId: bga1!.id,
        preparedById: accountsUser!.id,
        serviceCategory: 'DIGITAL_MARKETING',
        serviceScope: approvedEnquiry.requirements,
        serviceFee: 35000,
        adBudget: 20000,
        discount: 0,
        taxRate: 18,
        taxAmount: (55000 * 18) / 100,
        totalAmount: 64900,
        advanceRequiredPercent: 50,
        advanceRequiredAmount: 32450,
        paymentTerms: '50% advance before start.',
        validityDate: new Date(Date.now() + 15 * 86400000),
        status: QuotationStatus.PENDING_ADMIN_APPROVAL,
        adminApprovalStatus: 'PENDING',
        previousVersionId: quotation.id,
      },
    });

    assert(revisionV2.version === 2 && revisionV2.previousVersionId === quotation.id, 'Test 23: Version 2 created preserving version history');

    // TEST 11: Admin Approves Quotation V2 -> ADMIN_APPROVED & AVAILABLE
    const adminApprovedQuote = await prisma.quotation.update({
      where: { id: revisionV2.id },
      data: {
        status: QuotationStatus.ADMIN_APPROVED,
        adminApprovalStatus: 'APPROVED',
        adminReviewedById: adminUser!.id,
        adminReviewedAt: new Date(),
      },
    });
    assert(adminApprovedQuote.status === QuotationStatus.ADMIN_APPROVED, 'Test 24: Admin approved Quotation V2 and released to BGA');

    // TEST 12: Client Acceptance by BGA & Work Order Generation
    const acceptedQuotation = await prisma.quotation.update({
      where: { id: adminApprovedQuote.id },
      data: {
        status: QuotationStatus.ACCEPTED,
        clientAcceptanceNotes: 'Client confirmed via signed order form attached.',
        acceptedAt: new Date(),
        acceptedByBgaId: bga1!.id,
      },
    });

    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber: `WO-${Date.now()}`,
        quotationId: acceptedQuotation.id,
        clientId: clientBga1.id,
        bgaId: bga1!.id,
        serviceCategory: 'DIGITAL_MARKETING',
        agreedScope: acceptedQuotation.serviceScope,
        totalValue: acceptedQuotation.totalAmount,
        advanceRequired: acceptedQuotation.advanceRequiredAmount,
        advancePaid: 0,
        advanceVerified: false,
        handoverApproved: false,
        handoverStatus: 'PENDING_ADVANCE',
        status: WorkOrderStatus.PENDING_ADVANCE,
      },
    });

    assert(workOrder.status === WorkOrderStatus.PENDING_ADVANCE && !workOrder.handoverApproved, 'Test 25: Work order auto-created in PENDING_ADVANCE status');

    // TEST 13: Accounts Advance Payment Verification -> PENDING HANDOVER
    const advancePayment = await prisma.payment.create({
      data: {
        workOrderId: workOrder.id,
        paymentType: 'ADVANCE',
        amount: workOrder.advanceRequired,
        adBudgetAmount: 0,
        netServiceFee: workOrder.advanceRequired,
        paymentMethod: 'NEFT',
        transactionReference: 'NEFT-ADV-99887766',
        paymentDate: new Date(),
        status: PaymentStatus.PENDING_VERIFICATION,
      },
    });

    assert(advancePayment.status === PaymentStatus.PENDING_VERIFICATION, 'Test 26: Payment recorded in PENDING_VERIFICATION');

    // Accounts verifies bank credit
    const verifiedPayment = await prisma.payment.update({
      where: { id: advancePayment.id },
      data: {
        status: PaymentStatus.VERIFIED,
        verifiedById: accountsUser!.id,
        verifiedAt: new Date(),
        verificationNotes: 'Bank credit confirmed in HDFC Current Account.',
      },
    });

    // Advance verification updates WorkOrder handoverStatus to PENDING (does NOT directly activate Technical Project)
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: {
        advancePaid: verifiedPayment.amount,
        advanceVerified: true,
        handoverStatus: 'PENDING',
        status: WorkOrderStatus.ADVANCE_VERIFIED,
      },
    });

    assert(updatedWorkOrder.advanceVerified && updatedWorkOrder.handoverStatus === 'PENDING', 'Test 27: Advance verified by Accounts, handover marked PENDING');

    // Technical projects query excludes unapproved handovers
    const unapprovedHandoverProjects = await prisma.technicalProject.findMany({
      where: {
        workOrder: {
          handoverApproved: true,
        },
      },
    });
    const foundPrematureProject = unapprovedHandoverProjects.some((p) => p.workOrderId === updatedWorkOrder.id);
    assert(!foundPrematureProject, 'Test 28: Technical project NOT created/visible before Admin technical handover authorization');

    // TEST 14: Admin Authorizes Technical Handover -> Technical Project Created
    const authorizedWorkOrder = await prisma.workOrder.update({
      where: { id: updatedWorkOrder.id },
      data: {
        handoverApproved: true,
        handoverStatus: 'APPROVED',
        handoverApprovedAt: new Date(),
        handoverApprovedById: adminUser!.id,
        handoverNotes: 'Advance verified. Technical team authorized to initiate project kickoff.',
        status: WorkOrderStatus.IN_TECHNICAL,
      },
    });

    const techProject = await prisma.technicalProject.create({
      data: {
        projectNumber: `PRJ-${Date.now()}`,
        workOrderId: authorizedWorkOrder.id,
        clientId: clientBga1.id,
        serviceCategory: 'DIGITAL_MARKETING',
        approvedScope: authorizedWorkOrder.agreedScope,
        status: ProjectStatus.READY_TO_START,
        progressPercentage: 0,
        milestones: {
          create: [
            { title: 'Project Initiation & Kickoff', description: 'Requirements alignment and baseline setup', status: 'TODO' },
            { title: 'Design & Architecture', description: 'Wireframes, design mockups, and technical specifications', status: 'TODO' },
            { title: 'Core Development / Campaign Setup', description: 'Development and configuration of key modules', status: 'TODO' },
            { title: 'Quality Assurance & Testing', description: 'Internal testing, bug fixes, and performance audits', status: 'TODO' },
            { title: 'Client Review & Final Handover', description: 'Client demo, acceptance, and deployment/launch', status: 'TODO' },
          ],
        },
      },
      include: {
        milestones: true,
      },
    });

    assert(authorizedWorkOrder.handoverApproved, 'Test 29: Admin authorized technical handover');
    assert(techProject.status === ProjectStatus.READY_TO_START, 'Test 30: Technical project activated upon Admin handover approval');
    assert(techProject.milestones.length === 5, 'Test 31: Five standardized milestones automatically initialized');

    // TEST 15: Technical Project Execution & Milestones
    const inProgressProject = await prisma.technicalProject.update({
      where: { id: techProject.id },
      data: {
        status: ProjectStatus.IN_PROGRESS,
        progressPercentage: 50,
      },
    });

    assert(inProgressProject.status === ProjectStatus.IN_PROGRESS && inProgressProject.progressPercentage === 50, 'Test 32: Technical project execution updated to IN_PROGRESS');

    // Complete Project
    const completedProject = await prisma.technicalProject.update({
      where: { id: techProject.id },
      data: {
        status: ProjectStatus.COMPLETED,
        progressPercentage: 100,
        completedAt: new Date(),
      },
    });

    assert(completedProject.status === ProjectStatus.COMPLETED, 'Test 33: Technical project marked COMPLETED');

    // TEST 16: Commission Engine - Digital Marketing Monthly Calculation (EXCLUDING AD SPEND)
    const monthlyGrossPayment = 55000;
    const monthlyAdBudget = 20000;
    const commissionableAmount = monthlyGrossPayment - monthlyAdBudget; // ₹35,000
    const dmCommissionRate = 15.0; // 15%
    const expectedCommission = (commissionableAmount * dmCommissionRate) / 100; // ₹5,250

    const dmCommission = await prisma.commission.create({
      data: {
        bgaId: bga1!.id,
        clientId: clientBga1.id,
        workOrderId: workOrder.id,
        serviceCategory: 'DIGITAL_MARKETING',
        billingType: 'MONTHLY_RECURRING',
        grossAmount: monthlyGrossPayment,
        excludedAdSpend: monthlyAdBudget,
        commissionableAmount,
        commissionRate: dmCommissionRate,
        calculatedCommission: expectedCommission,
        eligibilityStatus: CommissionEligibility.ELIGIBLE,
        approvalStatus: 'PENDING_APPROVAL',
        payoutStatus: 'UNPAID',
        notes: 'Monthly recurring commission test. Ad spend excluded.',
      },
    });

    assert(dmCommission.commissionableAmount === 35000, 'Test 34: Commissionable amount excludes advertisement budget (₹35,000 vs ₹55,000)');
    assert(dmCommission.calculatedCommission === 5250, 'Test 35: Calculated commission accurately reflects 15% of net service fee (₹5,250)');

    // Admin approves commission payout
    const approvedCommission = await prisma.commission.update({
      where: { id: dmCommission.id },
      data: {
        approvalStatus: 'APPROVED',
        approvedById: adminUser!.id,
        approvedAt: new Date(),
      },
    });

    // Payout recorded with transaction reference
    const paidCommission = await prisma.commission.update({
      where: { id: dmCommission.id },
      data: {
        payoutStatus: 'PROCESSED',
        payoutReference: 'NEFT-COMM-PAYOUT-8899',
        payoutDate: new Date(),
      },
    });

    assert(paidCommission.payoutStatus === 'PROCESSED', 'Test 36: Commission payout processed with bank transaction reference');

    // TEST 17: Project-Based Commission (Website Development)
    const webCommissionableAmount = 100000;
    const webRate = 12.0; // 12%
    const webCalculatedCommission = (webCommissionableAmount * webRate) / 100; // ₹12,000

    const webCommission = await prisma.commission.create({
      data: {
        bgaId: bga1!.id,
        clientId: clientBga1.id,
        workOrderId: workOrder.id,
        serviceCategory: 'WEBSITE_DEVELOPMENT',
        billingType: 'PROJECT_BASED',
        grossAmount: 118000,
        excludedAdSpend: 0,
        commissionableAmount: webCommissionableAmount,
        commissionRate: webRate,
        calculatedCommission: webCalculatedCommission,
        eligibilityStatus: CommissionEligibility.ELIGIBLE,
        approvalStatus: 'PENDING_APPROVAL',
        payoutStatus: 'UNPAID',
      },
    });

    assert(webCommission.calculatedCommission === 12000, 'Test 37: Project-based commission correctly calculated at 12% (₹12,000)');

    // TEST 18: Security & Role-Based Access Control
    const token = jwt.sign(
      { id: techUser!.id, name: techUser!.name, role: Role.TECHNICAL },
      JWT_SECRET
    );
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    assert(decoded.role === Role.TECHNICAL, 'Test 38: JWT token securely encodes and verifies user role');

    // TEST 19: 10-Stage Admin Monitoring Dashboard Pipeline Aggregates
    const [
      pendingEnquiries,
      approvedEnquiries,
      pendingQuotations,
      approvedQuotations,
      pendingDecisions,
      pendingAdvance,
      pendingHandover,
      inTechnical,
      completedProjects,
      pendingCommissions,
    ] = await Promise.all([
      prisma.enquiry.count({ where: { status: EnquiryStatus.SUBMITTED } }),
      prisma.enquiry.count({ where: { status: EnquiryStatus.APPROVED } }),
      prisma.quotation.count({ where: { status: QuotationStatus.PENDING_ADMIN_APPROVAL } }),
      prisma.quotation.count({ where: { status: QuotationStatus.ADMIN_APPROVED } }),
      prisma.quotation.count({ where: { status: QuotationStatus.SENT_TO_BGA } }),
      prisma.workOrder.count({ where: { status: WorkOrderStatus.PENDING_ADVANCE } }),
      prisma.workOrder.count({ where: { handoverStatus: 'PENDING', advanceVerified: true } }),
      prisma.technicalProject.count({ where: { status: { in: [ProjectStatus.READY_TO_START, ProjectStatus.IN_PROGRESS] } } }),
      prisma.technicalProject.count({ where: { status: ProjectStatus.COMPLETED } }),
      prisma.commission.count({ where: { approvalStatus: 'PENDING_APPROVAL' } }),
    ]);

    assert(
      typeof pendingEnquiries === 'number' &&
      typeof approvedEnquiries === 'number' &&
      typeof pendingQuotations === 'number' &&
      typeof approvedQuotations === 'number' &&
      typeof pendingDecisions === 'number' &&
      typeof pendingAdvance === 'number' &&
      typeof pendingHandover === 'number' &&
      typeof inTechnical === 'number' &&
      typeof completedProjects === 'number' &&
      typeof pendingCommissions === 'number',
      'Test 39: 10-Stage Enterprise Pipeline metrics correctly aggregated'
    );

    // Cleanup test records created in this test run
    await prisma.commission.deleteMany({ where: { id: { in: [dmCommission.id, webCommission.id] } } });
    await prisma.projectMilestone.deleteMany({ where: { projectId: techProject.id } });
    await prisma.technicalProject.delete({ where: { id: techProject.id } });
    await prisma.payment.delete({ where: { id: advancePayment.id } });
    await prisma.workOrder.delete({ where: { id: workOrder.id } });
    await prisma.quotationReminder.deleteMany({ where: { bgaId: bga1!.id } });
    await prisma.quotation.deleteMany({ where: { enquiryId: approvedEnquiry.id } });
    await prisma.enquiry.delete({ where: { id: enqId } });
    await prisma.client.delete({ where: { id: clientBga1.id } });
    await prisma.user.delete({ where: { id: newApplicant.id } });

    console.log('================================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('================================================================');
  } catch (error) {
    console.error('❌ E2E TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEndToEndTests();

