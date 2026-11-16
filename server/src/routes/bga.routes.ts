import { Router, Response } from 'express';
import { Role, BgaStatus, EnquiryStatus, QuotationStatus, WorkOrderStatus, ServiceCategoryType } from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, authorizeRoles, checkBgaActive, AuthRequest, logAudit, createNotification } from '../middleware/auth';

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

// 1. BGA Dashboard Stats
router.get('/dashboard-stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;

    const totalClients = await prisma.client.count({ where: { bgaId } });
    const totalEnquiries = await prisma.enquiry.count({ where: { bgaId } });
    const totalQuotations = await prisma.quotation.count({ where: { bgaId } });
    const acceptedQuotations = await prisma.quotation.count({ where: { bgaId, status: QuotationStatus.ACCEPTED } });

    const activeProjects = await prisma.technicalProject.count({
      where: {
        workOrder: { bgaId },
        status: { in: ['READY_TO_START', 'IN_PROGRESS', 'UNDER_REVIEW', 'CORRECTION_REQUIRED'] },
      },
    });

    const totalEarnings = await prisma.commission.aggregate({
      where: { bgaId, payoutStatus: 'PROCESSED' },
      _sum: { calculatedCommission: true },
    });

    const pendingEarnings = await prisma.commission.aggregate({
      where: { bgaId, payoutStatus: 'UNPAID' },
      _sum: { calculatedCommission: true },
    });

    res.json({
      clients: totalClients,
      enquiries: totalEnquiries,
      quotations: totalQuotations,
      acceptedQuotations,
      activeProjects,
      earnings: {
        paid: totalEarnings._sum.calculatedCommission || 0,
        pending: pendingEarnings._sum.calculatedCommission || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load BGA stats' });
  }
});

// 1b. Complete BGA Self-Service Profile & Verification Data
router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: bgaId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
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
        approvedById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Associate profile not found' });
      return;
    }

    // Parse structured address if stored in JSON format, or fall back to standard fields
    let parsedAddress = {
      houseNumber: '',
      streetAddress: '',
      locality: '',
      city: user.city || '',
      district: '',
      state: user.state || '',
      pinCode: user.pinCode || '',
      country: 'India',
      fullAddress: user.address || '',
    };

    if (user.address) {
      try {
        if (user.address.startsWith('{') && user.address.endsWith('}')) {
          const jsonAddr = JSON.parse(user.address);
          parsedAddress = { ...parsedAddress, ...jsonAddr };
        } else {
          parsedAddress.streetAddress = user.address;
          parsedAddress.fullAddress = user.address;
        }
      } catch {
        parsedAddress.streetAddress = user.address;
        parsedAddress.fullAddress = user.address;
      }
    }

    // Fetch related audit logs for change history, bank history, and identity corrections
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId: bgaId,
        action: {
          in: [
            'PROFILE_UPDATE',
            'BANK_DETAILS_UPDATE',
            'BANK_ACCOUNT_REPLACED',
            'BANK_VERIFIED',
            'BANK_REJECTED',
            'IDENTITY_CORRECTION_REQUEST',
            'IDENTITY_CORRECTION_APPROVED',
            'IDENTITY_CORRECTION_REJECTED',
            'DOCUMENT_UPLOAD',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const bankHistory: any[] = [];
    const identityCorrections: any[] = [];
    const changeHistory: any[] = [];

    for (const log of auditLogs) {
      let parsedDetails: any = {};
      try {
        parsedDetails = log.details ? JSON.parse(log.details) : {};
      } catch {
        parsedDetails = { raw: log.details };
      }

      if (log.action === 'BANK_ACCOUNT_REPLACED' && parsedDetails.previousAccount) {
        bankHistory.push({
          id: log.id,
          ...parsedDetails.previousAccount,
          replacedAt: log.createdAt,
          status: 'REPLACED',
        });
      }

      if (log.action.startsWith('IDENTITY_CORRECTION')) {
        identityCorrections.push({
          id: parsedDetails.id || log.id,
          correctionType: parsedDetails.correctionType,
          currentValue: parsedDetails.currentValue,
          proposedValue: parsedDetails.proposedValue,
          reason: parsedDetails.reason,
          documentUrl: parsedDetails.documentUrl,
          status: parsedDetails.status || (log.action.endsWith('APPROVED') ? 'APPROVED' : log.action.endsWith('REJECTED') ? 'REJECTED' : 'PENDING_REVIEW'),
          requestedAt: parsedDetails.requestedAt || log.createdAt,
          reviewedAt: parsedDetails.reviewedAt,
          adminRemarks: parsedDetails.adminRemarks,
        });
      }

      changeHistory.push({
        id: log.id,
        action: log.action,
        field: parsedDetails.field || log.action.replace(/_/g, ' '),
        oldValue: parsedDetails.oldValue || '—',
        newValue: parsedDetails.newValue || '—',
        status: parsedDetails.status || 'COMPLETED',
        requestedAt: log.createdAt,
        remarks: parsedDetails.remarks || parsedDetails.reason || log.action,
      });
    }

    res.json({
      user,
      addressDetails: parsedAddress,
      bankHistory,
      identityCorrections,
      changeHistory,
    });
  } catch (error) {
    console.error('Failed to get BGA profile:', error);
    res.status(500).json({ error: 'Failed to load profile details' });
  }
});

// 1c. Update Permitted Personal Details & Address
router.put('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;
    const body = req.body;

    // Reject attempt to modify restricted fields
    const restrictedFields = [
      'panNumber', 'panVerified', 'aadhaarMasked', 'aadhaarVerified',
      'role', 'status', 'bankVerified', 'id', 'createdAt', 'approvedAt'
    ];
    for (const field of restrictedFields) {
      if (body[field] !== undefined) {
        res.status(403).json({
          error: `Modification of restricted field '${field}' is not permitted through ordinary profile update. Identity fields require formal Admin review.`
        });
        return;
      }
    }

    // Check email/mobile change attempt
    if (body.email !== undefined || body.mobile !== undefined) {
      res.status(400).json({
        error: 'Email and mobile phone changes require security OTP verification and Admin approval. Please submit an administrative support ticket.'
      });
      return;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: bgaId } });
    if (!currentUser) {
      res.status(404).json({ error: 'Associate not found' });
      return;
    }

    const {
      houseNumber,
      streetAddress,
      locality,
      district,
      city,
      state,
      pinCode,
      country,
    } = body;

    // Validate PIN code if provided
    if (pinCode && !/^\d{6}$/.test(String(pinCode).trim())) {
      res.status(400).json({ error: 'PIN Code must be a 6-digit number' });
      return;
    }

    // Construct structured address
    const structuredAddress = {
      houseNumber: houseNumber ? String(houseNumber).trim() : '',
      streetAddress: streetAddress ? String(streetAddress).trim() : '',
      locality: locality ? String(locality).trim() : '',
      district: district ? String(district).trim() : '',
      city: city ? String(city).trim() : (currentUser.city || ''),
      state: state ? String(state).trim() : (currentUser.state || ''),
      pinCode: pinCode ? String(pinCode).trim() : (currentUser.pinCode || ''),
      country: country ? String(country).trim() : 'India',
      fullAddress: [
        houseNumber,
        streetAddress,
        locality,
        city,
        district,
        state,
        pinCode ? `PIN: ${pinCode}` : '',
        country || 'India',
      ].filter(Boolean).join(', '),
    };

    const newAddressStr = JSON.stringify(structuredAddress);

    // Track changes for audit history
    const changes: any[] = [];
    if (currentUser.city !== structuredAddress.city) {
      changes.push({ field: 'City', oldValue: currentUser.city || '—', newValue: structuredAddress.city });
    }
    if (currentUser.state !== structuredAddress.state) {
      changes.push({ field: 'State', oldValue: currentUser.state || '—', newValue: structuredAddress.state });
    }
    if (currentUser.pinCode !== structuredAddress.pinCode) {
      changes.push({ field: 'PIN Code', oldValue: currentUser.pinCode || '—', newValue: structuredAddress.pinCode });
    }
    if (currentUser.address !== newAddressStr) {
      changes.push({ field: 'Residential Address', oldValue: currentUser.address ? 'Previous Address' : '—', newValue: structuredAddress.fullAddress });
    }

    const updatedUser = await prisma.user.update({
      where: { id: bgaId },
      data: {
        address: newAddressStr,
        city: structuredAddress.city,
        state: structuredAddress.state,
        pinCode: structuredAddress.pinCode,
      },
    });

    // Record audit logs for profile changes
    for (const change of changes) {
      await logAudit(
        bgaId,
        req.user!.email,
        Role.BGA,
        'PROFILE_UPDATE',
        'USER_PROFILE',
        bgaId,
        {
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          status: 'APPROVED',
          updatedAt: new Date(),
        },
        req.ip
      );
    }

    res.json({
      message: 'Personal details and address updated successfully',
      user: updatedUser,
      addressDetails: structuredAddress,
    });
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: 'Failed to update personal details' });
  }
});

// 1d. Add / Update / Replace Bank Account
router.post('/bank-account', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;
    const {
      bankAccountHolder,
      bankName,
      bankAccountNumber,
      confirmAccountNumber,
      bankIfsc,
      branchName,
    } = req.body;

    if (!bankAccountHolder || !bankName || !bankAccountNumber || !bankIfsc) {
      res.status(400).json({ error: 'Account holder name, bank name, account number, and IFSC code are mandatory' });
      return;
    }

    if (confirmAccountNumber && bankAccountNumber.trim() !== confirmAccountNumber.trim()) {
      res.status(400).json({ error: 'Account numbers do not match' });
      return;
    }

    const cleanAcc = bankAccountNumber.replace(/\s+/g, '');
    if (cleanAcc.length < 8 || cleanAcc.length > 20 || !/^\d+$/.test(cleanAcc)) {
      res.status(400).json({ error: 'Invalid bank account number. Must be between 8 and 20 numeric digits.' });
      return;
    }

    const cleanIfsc = bankIfsc.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      res.status(400).json({ error: 'Invalid IFSC format. Example: HDFC0001234' });
      return;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: bgaId } });
    if (!currentUser) {
      res.status(404).json({ error: 'Associate not found' });
      return;
    }

    const mask = (num: string | null) => (num && num.length > 4 ? `••••••••${num.slice(-4)}` : num || '—');

    // Archive previous bank account in AuditLog if replacing existing
    if (currentUser.bankAccountNumber) {
      await logAudit(
        bgaId,
        req.user!.email,
        Role.BGA,
        'BANK_ACCOUNT_REPLACED',
        'BANK_ACCOUNT',
        bgaId,
        {
          previousAccount: {
            bankAccountHolder: currentUser.bankAccountHolder,
            bankName: currentUser.bankName,
            bankAccountNumberMasked: mask(currentUser.bankAccountNumber),
            bankIfsc: currentUser.bankIfsc,
            bankVerified: currentUser.bankVerified,
            bankVerifiedAt: currentUser.bankVerifiedAt,
          },
          newAccount: {
            bankAccountHolder: bankAccountHolder.trim(),
            bankName: bankName.trim(),
            bankAccountNumberMasked: mask(cleanAcc),
            bankIfsc: cleanIfsc,
          },
          status: 'PENDING_VERIFICATION',
        },
        req.ip
      );
    }

    // Update to new account and mark as PENDING_VERIFICATION (bankVerified = false)
    const updatedUser = await prisma.user.update({
      where: { id: bgaId },
      data: {
        bankAccountHolder: bankAccountHolder.trim(),
        bankName: bankName.trim(),
        bankAccountNumber: cleanAcc,
        bankIfsc: cleanIfsc,
        bankVerified: false, // Must be verified by Admin before payouts!
        bankVerifiedAt: null,
      },
    });

    // Record change history
    await logAudit(
      bgaId,
      req.user!.email,
      Role.BGA,
      'BANK_DETAILS_UPDATE',
      'BANK_ACCOUNT',
      bgaId,
      {
        field: 'Bank Account Details',
        oldValue: mask(currentUser.bankAccountNumber),
        newValue: `${bankName.trim()} (${mask(cleanAcc)})`,
        status: 'PENDING_VERIFICATION',
        remarks: 'New bank details submitted. Pending Admin verification.',
      },
      req.ip
    );

    // Notify all Admins
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'Bank Account Verification Required',
        `${currentUser.name} (${currentUser.email}) has updated bank details to ${bankName} (${mask(cleanAcc)}). Verification required before commission disbursement.`,
        'ACTION_REQUIRED',
        '/admin/bga-management'
      );
    }

    res.json({
      message: 'Bank account updated successfully. Account is in PENDING_VERIFICATION status until reviewed by Company Admin.',
      user: {
        ...updatedUser,
        bankAccountNumberMasked: mask(updatedUser.bankAccountNumber),
      },
    });
  } catch (error) {
    console.error('Failed to update bank account:', error);
    res.status(500).json({ error: 'Failed to update bank details' });
  }
});

// 1e. Submit Formal Identity Correction Request
router.post('/identity-correction', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;
    const { correctionType, proposedValue, reason, documentUrl } = req.body;

    if (!correctionType || !proposedValue || !reason) {
      res.status(400).json({ error: 'Correction type, proposed value, and reason are required' });
      return;
    }

    if (!['PAN', 'AADHAAR', 'NAME', 'DOB'].includes(correctionType)) {
      res.status(400).json({ error: 'Correction type must be PAN, AADHAAR, NAME, or DOB' });
      return;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: bgaId } });
    if (!currentUser) {
      res.status(404).json({ error: 'Associate not found' });
      return;
    }

    let cleanProposed = String(proposedValue).trim();
    if (correctionType === 'PAN') {
      cleanProposed = cleanProposed.toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanProposed)) {
        res.status(400).json({ error: 'Invalid PAN format. Standard format is 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)' });
        return;
      }
    } else if (correctionType === 'AADHAAR') {
      const cleanAadhaar = cleanProposed.replace(/\D/g, '');
      if (cleanAadhaar.length !== 12) {
        res.status(400).json({ error: 'Aadhaar must be a 12-digit number' });
        return;
      }
      cleanProposed = `XXXX-XXXX-${cleanAadhaar.slice(-4)}`;
    }

    const currentMap: Record<string, string | null> = {
      PAN: currentUser.panNumber,
      AADHAAR: currentUser.aadhaarMasked,
      NAME: currentUser.name,
      DOB: currentUser.dob ? new Date(currentUser.dob).toISOString().slice(0, 10) : null,
    };

    const corrId = `CORR-${Date.now()}`;
    const requestDetails = {
      id: corrId,
      correctionType,
      currentValue: currentMap[correctionType] || '—',
      proposedValue: cleanProposed,
      reason: String(reason).trim(),
      documentUrl: documentUrl ? String(documentUrl).trim() : null,
      status: 'PENDING_REVIEW',
      requestedAt: new Date(),
    };

    // Log to AuditLog
    await logAudit(
      bgaId,
      req.user!.email,
      Role.BGA,
      'IDENTITY_CORRECTION_REQUEST',
      'IDENTITY_CORRECTION',
      corrId,
      requestDetails,
      req.ip
    );

    // Notify Admins
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'Identity Correction Request Submitted',
        `${currentUser.name} submitted a ${correctionType} correction request: ${cleanProposed}. Reason: ${reason}`,
        'ACTION_REQUIRED',
        '/admin/bga-management'
      );
    }

    res.status(201).json({
      message: 'Identity correction request submitted successfully. Company Admin will review your supporting documentation.',
      correctionRequest: requestDetails,
    });
  } catch (error) {
    console.error('Failed to submit identity correction:', error);
    res.status(500).json({ error: 'Failed to submit identity correction request' });
  }
});

// 1f. Upload / Update Permitted Compliance Document
router.post('/documents', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;
    const { documentType, fileUrl, fileName } = req.body;

    if (!documentType || !fileUrl) {
      res.status(400).json({ error: 'Document type and file URL are required' });
      return;
    }

    const updateData: any = {};
    if (documentType === 'ADDRESS_PROOF') updateData.addressProofUrl = fileUrl;
    else if (documentType === 'BANK_PROOF') updateData.bankProofUrl = fileUrl;
    else if (documentType === 'PAN_PROOF') updateData.panDocumentUrl = fileUrl;
    else {
      res.status(400).json({ error: 'Unsupported document type' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: bgaId },
      data: updateData,
    });

    await logAudit(
      bgaId,
      req.user!.email,
      Role.BGA,
      'DOCUMENT_UPLOAD',
      'DOCUMENT',
      bgaId,
      {
        field: `${documentType.replace(/_/g, ' ')} Uploaded`,
        fileName: fileName || fileUrl,
        status: 'SUBMITTED',
        uploadedAt: new Date(),
      },
      req.ip
    );

    res.json({
      message: 'Document uploaded successfully and queued for compliance verification.',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// 2. Company Published Resources (Confidential / unpublished resources strictly hidden)
router.get('/resources', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
    const services = await prisma.serviceItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Helper to parse client location/address consistently
export function parseClientLocation(locationStr: string | null | undefined) {
  if (!locationStr) {
    return {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pinCode: '',
      country: 'India',
      fullAddress: 'Not provided',
      displayLocation: '—',
    };
  }
  try {
    if (locationStr.startsWith('{') && locationStr.endsWith('}')) {
      const parsed = JSON.parse(locationStr);
      const parts = [
        parsed.addressLine1,
        parsed.addressLine2,
        parsed.city,
        parsed.state,
        parsed.pinCode ? `PIN: ${parsed.pinCode}` : '',
        parsed.country || 'India',
      ].filter(Boolean);
      return {
        addressLine1: parsed.addressLine1 || '',
        addressLine2: parsed.addressLine2 || '',
        city: parsed.city || '',
        state: parsed.state || '',
        pinCode: parsed.pinCode || '',
        country: parsed.country || 'India',
        fullAddress: parsed.fullAddress || parts.join(', '),
        displayLocation: parsed.city ? `${parsed.city}${parsed.state ? ', ' + parsed.state : ''}` : (parsed.fullAddress || locationStr),
      };
    }
  } catch {}
  return {
    addressLine1: '',
    addressLine2: '',
    city: locationStr,
    state: '',
    pinCode: '',
    country: 'India',
    fullAddress: locationStr,
    displayLocation: locationStr,
  };
}

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
            requirements: true,
            discussionNotes: true,
            followUpDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          select: {
            id: true,
            quotationNumber: true,
            version: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        workOrders: {
          select: {
            id: true,
            workOrderNumber: true,
            status: true,
            totalValue: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { workOrders: true, enquiries: true, quotations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedClients = clients.map((c) => {
      const addr = parseClientLocation(c.location);
      return {
        ...c,
        address: addr,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        city: addr.city,
        state: addr.state,
        pinCode: addr.pinCode,
        country: addr.country,
        fullAddress: addr.fullAddress,
        displayLocation: addr.displayLocation,
      };
    });

    res.json({ clients: enrichedClients });
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
      addressLine1,
      addressLine2,
      city,
      state,
      pinCode,
      country,
      businessCategory,
      otherCategory,
      requiredService,
      expectedBudget,
      clientRequirements,
      discussionNotes,
      followUpDate,
    } = req.body;

    // Validate Core Client Details
    if (!clientName || !clientName.trim()) {
      res.status(400).json({ error: 'Client contact name is required' });
      return;
    }
    if (!businessName || !businessName.trim()) {
      res.status(400).json({ error: 'Business / Company name is required' });
      return;
    }
    if (!mobile || !mobile.trim()) {
      res.status(400).json({ error: 'Mobile phone number is required' });
      return;
    }
    if (!email || !email.trim()) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    // Resolve Business Category (support custom category if 'Other')
    let resolvedCategory = (businessCategory || '').trim();
    if (!resolvedCategory || resolvedCategory === 'Other') {
      if (!otherCategory || !otherCategory.trim()) {
        res.status(400).json({ error: 'Please enter your custom business category' });
        return;
      }
      resolvedCategory = otherCategory.trim();
    }

    // Resolve Business Address
    const resolvedAddressLine1 = (addressLine1 || '').trim();
    const resolvedAddressLine2 = (addressLine2 || '').trim();
    const resolvedCity = (city || location || '').trim();
    const resolvedState = (state || '').trim();
    const resolvedPinCode = (pinCode || '').trim();
    const resolvedCountry = (country || 'India').trim();

    if (!resolvedAddressLine1) {
      res.status(400).json({ error: 'Business Address Line 1 is required' });
      return;
    }
    if (!resolvedCity) {
      res.status(400).json({ error: 'City is required' });
      return;
    }
    if (!resolvedState) {
      res.status(400).json({ error: 'State is required' });
      return;
    }
    if (!resolvedPinCode) {
      res.status(400).json({ error: 'PIN / Postal Code is required' });
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

    // Prepare structured address object
    const structuredAddress = {
      addressLine1: resolvedAddressLine1,
      addressLine2: resolvedAddressLine2,
      city: resolvedCity,
      state: resolvedState,
      pinCode: resolvedPinCode,
      country: resolvedCountry,
      fullAddress: [
        resolvedAddressLine1,
        resolvedAddressLine2,
        resolvedCity,
        resolvedState,
        resolvedPinCode ? `PIN: ${resolvedPinCode}` : '',
        resolvedCountry,
      ].filter(Boolean).join(', '),
    };

    // Create Client
    const client = await prisma.client.create({
      data: {
        clientName: clientName.trim(),
        businessName: businessName.trim(),
        mobile: normalizedMobile,
        email: normalizedEmail,
        location: JSON.stringify(structuredAddress),
        businessCategory: resolvedCategory,
        bgaId: req.user!.id,
      },
    });

    // If an initial enquiry was submitted along with client registration
    let initialEnquiry = null;
    if (requiredService && clientRequirements && clientRequirements.trim()) {
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
      { clientName: client.clientName, businessName: client.businessName, businessCategory: resolvedCategory },
      req.ip
    );

    const parsedAddr = parseClientLocation(client.location);
    const enrichedClient = {
      ...client,
      address: parsedAddr,
      addressLine1: parsedAddr.addressLine1,
      addressLine2: parsedAddr.addressLine2,
      city: parsedAddr.city,
      state: parsedAddr.state,
      pinCode: parsedAddr.pinCode,
      country: parsedAddr.country,
      fullAddress: parsedAddr.fullAddress,
      displayLocation: parsedAddr.displayLocation,
      enquiries: initialEnquiry ? [initialEnquiry] : [],
      quotations: [],
      workOrders: [],
    };

    res.status(201).json({
      message: `Client '${client.clientName}' registered successfully and assigned to your portfolio.`,
      client: enrichedClient,
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
    const {
      businessName,
      location,
      addressLine1,
      addressLine2,
      city,
      state,
      pinCode,
      country,
      businessCategory,
      otherCategory,
    } = req.body;

    const client = await prisma.client.findFirst({
      where: { id, bgaId: req.user!.id },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found or not assigned to you' });
      return;
    }

    let resolvedCategory = businessCategory?.trim() || client.businessCategory;
    if (resolvedCategory === 'Other') {
      if (otherCategory && otherCategory.trim()) {
        resolvedCategory = otherCategory.trim();
      }
    }

    let locationToSave = client.location;
    if (addressLine1 || city || state || pinCode) {
      const existingAddr = parseClientLocation(client.location);
      const structuredAddress = {
        addressLine1: (addressLine1 ?? existingAddr.addressLine1 ?? '').trim(),
        addressLine2: (addressLine2 ?? existingAddr.addressLine2 ?? '').trim(),
        city: (city ?? existingAddr.city ?? '').trim(),
        state: (state ?? existingAddr.state ?? '').trim(),
        pinCode: (pinCode ?? existingAddr.pinCode ?? '').trim(),
        country: (country ?? existingAddr.country ?? 'India').trim(),
        fullAddress: [
          (addressLine1 ?? existingAddr.addressLine1 ?? '').trim(),
          (addressLine2 ?? existingAddr.addressLine2 ?? '').trim(),
          (city ?? existingAddr.city ?? '').trim(),
          (state ?? existingAddr.state ?? '').trim(),
          (pinCode ?? existingAddr.pinCode ?? '').trim() ? `PIN: ${(pinCode ?? existingAddr.pinCode ?? '').trim()}` : '',
          (country ?? existingAddr.country ?? 'India').trim(),
        ].filter(Boolean).join(', '),
      };
      locationToSave = JSON.stringify(structuredAddress);
    } else if (location) {
      locationToSave = location.trim();
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(businessName ? { businessName: businessName.trim() } : {}),
        businessCategory: resolvedCategory,
        location: locationToSave,
      },
    });

    const parsedAddr = parseClientLocation(updated.location);
    res.json({
      client: {
        ...updated,
        address: parsedAddr,
        addressLine1: parsedAddr.addressLine1,
        addressLine2: parsedAddr.addressLine2,
        city: parsedAddr.city,
        state: parsedAddr.state,
        pinCode: parsedAddr.pinCode,
        country: parsedAddr.country,
        fullAddress: parsedAddr.fullAddress,
        displayLocation: parsedAddr.displayLocation,
      },
    });
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
    const enrichedEnquiries = enquiries.map((e) => {
      const addr = parseClientLocation(e.client.location);
      return {
        ...e,
        client: {
          ...e.client,
          displayLocation: addr.displayLocation,
          city: addr.city,
          fullAddress: addr.fullAddress,
        },
      };
    });
    res.json({ enquiries: enrichedEnquiries });
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

