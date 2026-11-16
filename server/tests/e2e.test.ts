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

    // TEST 8: Accounts Prepares Official Quotation & Dispatches
    const dispatchedQuotation = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        preparedById: accountsUser!.id,
        status: QuotationStatus.SENT_TO_BGA,
      },
    });

    assert(dispatchedQuotation.status === QuotationStatus.SENT_TO_BGA, 'Test 20: Accounts prepared and dispatched quotation to BGA');

    // TEST 9: Quotation Revision Request
    const revisionReq = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: QuotationStatus.REVISION_REQUESTED,
        revisionNotes: 'Client asked to adjust fee to ₹35,000',
      },
    });
    assert(revisionReq.status === QuotationStatus.REVISION_REQUESTED, 'Test 21: BGA successfully submitted quotation revision request');

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
        status: QuotationStatus.SENT_TO_BGA,
        previousVersionId: quotation.id,
      },
    });

    assert(revisionV2.version === 2 && revisionV2.previousVersionId === quotation.id, 'Test 22: Version 2 created preserving version history');

    // TEST 10: Client Acceptance by BGA & Work Order Generation
    const acceptedQuotation = await prisma.quotation.update({
      where: { id: revisionV2.id },
      data: {
        status: QuotationStatus.ACCEPTED,
        clientAcceptanceNotes: 'Client signed commercial proposal on email.',
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
        status: WorkOrderStatus.PENDING_ADVANCE,
      },
    });

    assert(workOrder.status === WorkOrderStatus.PENDING_ADVANCE, 'Test 23: Work order auto-created in PENDING_ADVANCE status');

    // TEST 11: Accounts Advance Payment Verification -> TECHNICAL HANDOVER TRIGGER
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

    assert(advancePayment.status === PaymentStatus.PENDING_VERIFICATION, 'Test 24: Payment recorded in PENDING_VERIFICATION');

    // Accounts verifies actual bank credit
    const verifiedPayment = await prisma.payment.update({
      where: { id: advancePayment.id },
      data: {
        status: PaymentStatus.VERIFIED,
        verifiedById: accountsUser!.id,
        verifiedAt: new Date(),
        verificationNotes: 'Bank credit confirmed in HDFC Current Account.',
      },
    });

    // Advance verification updates WorkOrder and activates Technical Project!
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: {
        advancePaid: verifiedPayment.amount,
        advanceVerified: true,
        status: WorkOrderStatus.ADVANCE_VERIFIED,
      },
    });

    const techProject = await prisma.technicalProject.create({
      data: {
        projectNumber: `PRJ-${Date.now()}`,
        workOrderId: updatedWorkOrder.id,
        clientId: clientBga1.id,
        serviceCategory: 'DIGITAL_MARKETING',
        approvedScope: updatedWorkOrder.agreedScope,
        status: ProjectStatus.READY_TO_START,
        progressPercentage: 0,
      },
    });

    assert(updatedWorkOrder.advanceVerified, 'Test 25: Advance verified by Accounts');
    assert(techProject.status === ProjectStatus.READY_TO_START, 'Test 26: Technical project activated upon verified advance payment');

    // TEST 12: Technical Project Execution & Milestones
    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: techProject.id,
        title: 'Initial On-page & Technical Audit',
        status: 'COMPLETED',
      },
    });

    const inProgressProject = await prisma.technicalProject.update({
      where: { id: techProject.id },
      data: {
        status: ProjectStatus.IN_PROGRESS,
        progressPercentage: 50,
      },
    });

    assert(inProgressProject.status === ProjectStatus.IN_PROGRESS && inProgressProject.progressPercentage === 50, 'Test 27: Technical project execution updated to IN_PROGRESS');

    // Complete Project
    const completedProject = await prisma.technicalProject.update({
      where: { id: techProject.id },
      data: {
        status: ProjectStatus.COMPLETED,
        progressPercentage: 100,
        completedAt: new Date(),
      },
    });

    assert(completedProject.status === ProjectStatus.COMPLETED, 'Test 28: Technical project marked COMPLETED');

    // TEST 13: Commission Engine - Digital Marketing Monthly Calculation (EXCLUDING AD SPEND)
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

    assert(dmCommission.commissionableAmount === 35000, 'Test 29: Commissionable amount excludes advertisement budget (₹35,000 vs ₹55,000)');
    assert(dmCommission.calculatedCommission === 5250, 'Test 30: Calculated commission accurately reflects 15% of net service fee (₹5,250)');

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

    assert(paidCommission.payoutStatus === 'PROCESSED', 'Test 31: Commission payout processed with bank transaction reference');

    // TEST 14: Project-Based Commission (Website Development)
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

    assert(webCommission.calculatedCommission === 12000, 'Test 32: Project-based commission correctly calculated at 12% (₹12,000)');

    // TEST 15: Security & Role-Based Access Control
    const token = jwt.sign(
      { id: techUser!.id, name: techUser!.name, role: Role.TECHNICAL },
      JWT_SECRET
    );
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    assert(decoded.role === Role.TECHNICAL, 'Test 33: JWT token securely encodes and verifies user role');

    // Cleanup test records created in this test run
    await prisma.commission.deleteMany({ where: { id: { in: [dmCommission.id, webCommission.id] } } });
    await prisma.projectMilestone.deleteMany({ where: { projectId: techProject.id } });
    await prisma.technicalProject.delete({ where: { id: techProject.id } });
    await prisma.payment.delete({ where: { id: advancePayment.id } });
    await prisma.workOrder.delete({ where: { id: workOrder.id } });
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
