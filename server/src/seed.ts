import { PrismaClient, Role, BgaStatus, ServiceCategoryType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Seeding ---');

  // Password hash
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const bgaPassword = await bcrypt.hash('Bga@123', salt);
  const bga2Password = await bcrypt.hash('Bga2@123', salt);
  const accountsPassword = await bcrypt.hash('Accounts@123', salt);
  const techPassword = await bcrypt.hash('Tech@123', salt);

  // 1. Create Portal Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bga.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@bga.com',
      mobile: '9876543210',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      status: BgaStatus.ACTIVE,
      panVerified: true,
      aadhaarVerified: true,
      bankVerified: true,
      agreementAccepted: true,
      agreementAcceptedAt: new Date(),
    },
  });

  const bga = await prisma.user.upsert({
    where: { email: 'bga@bga.com' },
    update: {
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500033',
      bankName: 'HDFC Bank Ltd.',
      panVerifiedAt: new Date('2026-01-10'),
      aadhaarVerifiedAt: new Date('2026-01-10'),
      bankVerifiedAt: new Date('2026-01-12'),
      kycSubmittedAt: new Date('2026-01-08'),
      lastLoginAt: new Date('2026-11-16T10:15:00'),
      panDocumentUrl: '/uploads/documents/pan-rajesh.pdf',
      addressProofUrl: '/uploads/documents/address-rajesh.pdf',
      bankProofUrl: '/uploads/documents/cheque-rajesh.pdf',
      agreementDocumentUrl: '/uploads/documents/bga-agreement-rajesh.pdf',
    },
    create: {
      name: 'Rajesh Kumar (BGA Lead)',
      email: 'bga@bga.com',
      mobile: '9876543211',
      passwordHash: bgaPassword,
      role: Role.BGA,
      status: BgaStatus.ACTIVE,
      dob: new Date('1992-05-15'),
      address: 'Plot 45, Jubilee Hills, Road No. 10',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500033',
      panNumber: 'ABCDE1234F',
      panVerified: true,
      panVerifiedAt: new Date('2026-01-10'),
      aadhaarMasked: 'XXXX-XXXX-8921',
      aadhaarVerified: true,
      aadhaarVerifiedAt: new Date('2026-01-10'),
      kycSubmittedAt: new Date('2026-01-08'),
      bankName: 'HDFC Bank Ltd.',
      bankAccountHolder: 'Rajesh Kumar',
      bankAccountNumber: '123456789012',
      bankIfsc: 'HDFC0001234',
      bankVerified: true,
      bankVerifiedAt: new Date('2026-01-12'),
      panDocumentUrl: '/uploads/documents/pan-rajesh.pdf',
      addressProofUrl: '/uploads/documents/address-rajesh.pdf',
      bankProofUrl: '/uploads/documents/cheque-rajesh.pdf',
      agreementDocumentUrl: '/uploads/documents/bga-agreement-rajesh.pdf',
      agreementAccepted: true,
      agreementAcceptedAt: new Date('2026-01-08'),
      approvedAt: new Date('2026-01-12'),
      lastLoginAt: new Date('2026-11-16T10:15:00'),
    },
  });

  const bga2 = await prisma.user.upsert({
    where: { email: 'bga2@bga.com' },
    update: {
      city: 'Bangalore',
      state: 'Karnataka',
      pinCode: '560066',
      bankName: 'ICICI Bank',
      panVerifiedAt: new Date('2026-02-15'),
      aadhaarVerifiedAt: new Date('2026-02-15'),
      bankVerifiedAt: new Date('2026-02-16'),
      kycSubmittedAt: new Date('2026-02-14'),
      lastLoginAt: new Date('2026-11-15T16:40:00'),
      panDocumentUrl: '/uploads/documents/pan-priya.pdf',
      addressProofUrl: '/uploads/documents/address-priya.pdf',
      bankProofUrl: '/uploads/documents/cheque-priya.pdf',
      agreementDocumentUrl: '/uploads/documents/bga-agreement-priya.pdf',
    },
    create: {
      name: 'Priya Sharma (BGA Associate)',
      email: 'bga2@bga.com',
      mobile: '9876543212',
      passwordHash: bga2Password,
      role: Role.BGA,
      status: BgaStatus.ACTIVE,
      dob: new Date('1994-08-20'),
      address: 'Flat 302, Palm Meadows, Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      pinCode: '560066',
      panNumber: 'FGHIJ5678K',
      panVerified: true,
      panVerifiedAt: new Date('2026-02-15'),
      aadhaarMasked: 'XXXX-XXXX-4567',
      aadhaarVerified: true,
      aadhaarVerifiedAt: new Date('2026-02-15'),
      kycSubmittedAt: new Date('2026-02-14'),
      bankName: 'ICICI Bank',
      bankAccountHolder: 'Priya Sharma',
      bankAccountNumber: '987654321098',
      bankIfsc: 'ICIC0000456',
      bankVerified: true,
      bankVerifiedAt: new Date('2026-02-16'),
      panDocumentUrl: '/uploads/documents/pan-priya.pdf',
      addressProofUrl: '/uploads/documents/address-priya.pdf',
      bankProofUrl: '/uploads/documents/cheque-priya.pdf',
      agreementDocumentUrl: '/uploads/documents/bga-agreement-priya.pdf',
      agreementAccepted: true,
      agreementAcceptedAt: new Date('2026-02-14'),
      approvedAt: new Date('2026-02-16'),
      lastLoginAt: new Date('2026-11-15T16:40:00'),
    },
  });

  // Also seed a pending BGA applicant to test reviewing and activating in Admin portal
  const bgaPendingPassword = await bcrypt.hash('Applicant@123', salt);
  const bgaPending = await prisma.user.upsert({
    where: { email: 'ananya.patel@growth.in' },
    update: {},
    create: {
      name: 'Ananya Patel',
      email: 'ananya.patel@growth.in',
      mobile: '9876543299',
      passwordHash: bgaPendingPassword,
      role: Role.BGA,
      status: BgaStatus.SUBMITTED,
      dob: new Date('1996-11-04'),
      address: 'B-1402, Lodha Bellissimo, Worli',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400018',
      panNumber: 'JKLMN9012P',
      panVerified: false,
      aadhaarMasked: 'XXXX-XXXX-3344',
      aadhaarVerified: false,
      kycSubmittedAt: new Date('2026-11-14T09:30:00'),
      bankName: 'Axis Bank',
      bankAccountHolder: 'Ananya Patel',
      bankAccountNumber: '918020045678901',
      bankIfsc: 'UTIB0000123',
      bankVerified: false,
      panDocumentUrl: '/uploads/documents/pan-ananya.pdf',
      addressProofUrl: '/uploads/documents/address-ananya.pdf',
      bankProofUrl: '/uploads/documents/cheque-ananya.pdf',
      agreementDocumentUrl: '/uploads/documents/bga-agreement-ananya.pdf',
      agreementAccepted: true,
      agreementAcceptedAt: new Date('2026-11-14T09:30:00'),
    },
  });

  const accounts = await prisma.user.upsert({
    where: { email: 'accounts@bga.com' },
    update: {},
    create: {
      name: 'Sunita Rao (Accounts Head)',
      email: 'accounts@bga.com',
      mobile: '9876543213',
      passwordHash: accountsPassword,
      role: Role.ACCOUNTS,
      status: BgaStatus.ACTIVE,
      panVerified: true,
      aadhaarVerified: true,
      bankVerified: true,
      agreementAccepted: true,
    },
  });

  const technical = await prisma.user.upsert({
    where: { email: 'tech@bga.com' },
    update: {},
    create: {
      name: 'Vikram Verma (Tech Lead)',
      email: 'tech@bga.com',
      mobile: '9876543214',
      passwordHash: techPassword,
      role: Role.TECHNICAL,
      status: BgaStatus.ACTIVE,
      panVerified: true,
      aadhaarVerified: true,
      bankVerified: true,
      agreementAccepted: true,
    },
  });

  console.log('Created Users:', {
    admin: admin.email,
    bga: bga.email,
    bga2: bga2.email,
    accounts: accounts.email,
    technical: technical.email,
  });

  // 2. System Settings
  const settings = [
    { key: 'enquiry_approval_required_for_quotation', value: 'true', description: 'Whether enquiries must be approved by Admin before requesting quotation' },
    { key: 'company_name', value: 'Business Growth Associates & Tech Solutions Ltd.', description: 'Official Company Name' },
    { key: 'company_email', value: 'billing@bga-solutions.com', description: 'Official Company Email' },
    { key: 'company_phone', value: '+91 98765 43210', description: 'Official Support Phone' },
    { key: 'company_address', value: 'Level 4, Cyber Gateway, HITEC City, Hyderabad - 500081', description: 'Headquarters Address' },
    { key: 'company_gstin', value: '36AAACB1234F1Z5', description: 'Company GSTIN Number' },
    { key: 'dm_commission_rate', value: '15', description: 'Digital Marketing recurring commission percentage (excludes ad budget)' },
    { key: 'website_commission_rate', value: '12', description: 'Website Development project commission percentage' },
    { key: 'mobile_commission_rate', value: '12', description: 'Mobile Application project commission percentage' },
    { key: 'software_commission_rate', value: '10', description: 'Custom Software project commission percentage' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }

  // 3. Service Items (The 4 core categories)
  const services = [
    // Digital Marketing
    { code: 'DM-SEO', name: 'Search Engine Optimization (SEO)', category: ServiceCategoryType.DIGITAL_MARKETING, description: 'Complete On-page, Off-page, Technical SEO and keyword ranking', basePrice: 25000, defaultCommissionRate: 15, isMonthly: true },
    { code: 'DM-SMM', name: 'Social Media Marketing (SMM)', category: ServiceCategoryType.DIGITAL_MARKETING, description: 'Brand building across Instagram, LinkedIn, Facebook with creatives & reels', basePrice: 30000, defaultCommissionRate: 15, isMonthly: true },
    { code: 'DM-GADS', name: 'Google Ads Management', category: ServiceCategoryType.DIGITAL_MARKETING, description: 'High-conversion Google Search & Display PPC Campaign management', basePrice: 20000, defaultCommissionRate: 15, isMonthly: true },
    { code: 'DM-META', name: 'Meta Ads Management (FB & Insta)', category: ServiceCategoryType.DIGITAL_MARKETING, description: 'Targeted lead generation campaigns on Facebook and Instagram', basePrice: 20000, defaultCommissionRate: 15, isMonthly: true },
    { code: 'DM-CONTENT', name: 'Content Marketing & Copywriting', category: ServiceCategoryType.DIGITAL_MARKETING, description: 'High authority blogs, whitepapers, press releases and email campaigns', basePrice: 15000, defaultCommissionRate: 15, isMonthly: true },

    // Website Development
    { code: 'WEB-BIZ', name: 'Business Website', category: ServiceCategoryType.WEBSITE_DEVELOPMENT, description: 'Modern, responsive 5-10 page business showcase website with contact forms', basePrice: 45000, defaultCommissionRate: 12, isMonthly: false },
    { code: 'WEB-CORP', name: 'Corporate Portal Website', category: ServiceCategoryType.WEBSITE_DEVELOPMENT, description: 'Enterprise-grade corporate website with multilingual support & CMS', basePrice: 85000, defaultCommissionRate: 12, isMonthly: false },
    { code: 'WEB-ECOM', name: 'E-commerce Website', category: ServiceCategoryType.WEBSITE_DEVELOPMENT, description: 'Full-featured online store with payment gateway, inventory and cart', basePrice: 120000, defaultCommissionRate: 12, isMonthly: false },
    { code: 'WEB-LAND', name: 'High-Conversion Landing Page', category: ServiceCategoryType.WEBSITE_DEVELOPMENT, description: 'Ultra-fast landing page optimized for ad conversions and lead gen', basePrice: 25000, defaultCommissionRate: 12, isMonthly: false },

    // Mobile Application Development
    { code: 'MOB-AND', name: 'Android Native Mobile App', category: ServiceCategoryType.MOBILE_APPLICATION_DEVELOPMENT, description: 'Native Kotlin Android app with Material UI and cloud backend', basePrice: 150000, defaultCommissionRate: 12, isMonthly: false },
    { code: 'MOB-IOS', name: 'iOS Native Mobile App', category: ServiceCategoryType.MOBILE_APPLICATION_DEVELOPMENT, description: 'Native Swift iOS application for iPhone & iPad with App Store publishing', basePrice: 180000, defaultCommissionRate: 12, isMonthly: false },
    { code: 'MOB-CROSS', name: 'Cross-Platform App (React Native/Flutter)', category: ServiceCategoryType.MOBILE_APPLICATION_DEVELOPMENT, description: 'Unified iOS and Android app with single codebase and native performance', basePrice: 220000, defaultCommissionRate: 12, isMonthly: false },

    // Software Development
    { code: 'SOFT-CUST', name: 'Custom Cloud Software', category: ServiceCategoryType.SOFTWARE_DEVELOPMENT, description: 'Tailored SaaS or web software solution built to exact business specs', basePrice: 300000, defaultCommissionRate: 10, isMonthly: false },
    { code: 'SOFT-ERP', name: 'Enterprise Resource Planning (ERP)', category: ServiceCategoryType.SOFTWARE_DEVELOPMENT, description: 'Integrated ERP for manufacturing, supply chain, inventory and HR', basePrice: 500000, defaultCommissionRate: 10, isMonthly: false },
    { code: 'SOFT-CRM', name: 'Customer Relationship Management (CRM)', category: ServiceCategoryType.SOFTWARE_DEVELOPMENT, description: 'Lead tracking, pipeline automation, sales performance and customer portal', basePrice: 250000, defaultCommissionRate: 10, isMonthly: false },
    { code: 'SOFT-BILL', name: 'Billing & POS Management System', category: ServiceCategoryType.SOFTWARE_DEVELOPMENT, description: 'GST-compliant billing, inventory tracking, barcodes, thermal printer support', basePrice: 150000, defaultCommissionRate: 10, isMonthly: false },
  ];

  for (const s of services) {
    await prisma.serviceItem.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
  }

  // 4. Initial Company Resources
  const sampleResources = [
    {
      title: 'Company Profile & Capabilities 2026',
      description: 'Comprehensive corporate presentation of company services, leadership, and track record.',
      category: 'PROFILE',
      serviceCategory: null,
      fileUrl: '/uploads/resources/company-profile-2026.pdf',
      fileType: 'PDF',
      isPublished: true,
      isConfidential: false,
      uploadedById: admin.id,
    },
    {
      title: 'Digital Marketing Playbook & Pricing Deck',
      description: 'Official client deck for SEO, PPC, and Social Media growth campaigns.',
      category: 'PRESENTATION',
      serviceCategory: ServiceCategoryType.DIGITAL_MARKETING,
      fileUrl: '/uploads/resources/dm-playbook.pdf',
      fileType: 'PDF',
      isPublished: true,
      isConfidential: false,
      uploadedById: admin.id,
    },
    {
      title: 'Web & Mobile Apps Portfolio Catalog',
      description: 'Showcase of 40+ completed web and mobile development client case studies.',
      category: 'PORTFOLIO',
      serviceCategory: ServiceCategoryType.WEBSITE_DEVELOPMENT,
      fileUrl: '/uploads/resources/tech-portfolio.pdf',
      fileType: 'PDF',
      isPublished: true,
      isConfidential: false,
      uploadedById: admin.id,
    },
    {
      title: 'ERP & Custom Software Solutions Brochure',
      description: 'Brochure highlighting ERP modules, billing, and custom SaaS architecture.',
      category: 'BROCHURE',
      serviceCategory: ServiceCategoryType.SOFTWARE_DEVELOPMENT,
      fileUrl: '/uploads/resources/erp-software-brochure.pdf',
      fileType: 'PDF',
      isPublished: true,
      isConfidential: false,
      uploadedById: admin.id,
    },
  ];

  for (const res of sampleResources) {
    const existing = await prisma.companyResource.findFirst({ where: { title: res.title } });
    if (!existing) {
      await prisma.companyResource.create({ data: res });
    }
  }

  // 5. Initial Notifications
  await prisma.notification.create({
    data: {
      userId: bga.id,
      title: 'Welcome to BGA Management System',
      message: 'Your account is active. Start registering clients and submitting enquiries to earn lucrative commissions!',
      type: 'SUCCESS',
      link: '/bga/clients',
    },
  });

  console.log('--- Database Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

