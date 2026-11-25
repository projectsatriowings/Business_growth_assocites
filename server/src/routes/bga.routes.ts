import { Router, Response } from 'express';
import crypto from 'crypto';
import { Role, BgaStatus, EnquiryStatus, QuotationStatus, WorkOrderStatus, ServiceCategoryType, ProjectStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, authorizeRoles, checkBgaActive, AuthRequest, logAudit, createNotification } from '../middleware/auth';
import { appCache } from '../utils/cache';
import { hydrateQuotationVersions } from '../utils/quotationVersion';
import { getClientActivityTimeline } from '../utils/activityTimeline';

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

// 1. BGA Dashboard Stats (Optimized with Promise.all & tenant-isolated cache)
router.get('/dashboard-stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;
    const cacheKey = `bga:${bgaId}:dashboard-stats`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Helper for 6 months range
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
      totalClients,
      totalEnquiries,
      totalQuotations,
      acceptedQuotations,
      activeProjects,
      completedProjects,
      totalEarnings,
      pendingEarnings,
      recentClients,
      recentEnquiries,
      recentAcceptedQuotes,
      categoryStats,
      allBgas,
      recentActiveProjects,
    ] = await Promise.all([
      prisma.client.count({ where: { bgaId } }),
      prisma.enquiry.count({ where: { bgaId } }),
      prisma.quotation.count({ where: { bgaId } }),
      prisma.quotation.count({ where: { bgaId, status: QuotationStatus.ACCEPTED } }),
      prisma.technicalProject.count({
        where: {
          workOrder: { bgaId },
          status: { in: ['READY_TO_START', 'IN_PROGRESS', 'UNDER_REVIEW', 'CORRECTION_REQUIRED'] },
        },
      }),
      prisma.technicalProject.count({
        where: {
          workOrder: { bgaId },
          status: ProjectStatus.COMPLETED,
        },
      }),
      prisma.commission.aggregate({
        where: { bgaId, payoutStatus: 'PROCESSED' },
        _sum: { calculatedCommission: true },
      }),
      prisma.commission.aggregate({
        where: { bgaId, payoutStatus: 'UNPAID' },
        _sum: { calculatedCommission: true },
      }),
      // Last 6 months clients for monthly acquisition chart
      prisma.client.findMany({
        where: { bgaId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      // Last 6 months enquiries for monthly trend
      prisma.enquiry.findMany({
        where: { bgaId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      // Last 6 months accepted quotes
      prisma.quotation.findMany({
        where: { bgaId, status: QuotationStatus.ACCEPTED, updatedAt: { gte: sixMonthsAgo } },
        select: { totalAmount: true, updatedAt: true },
      }),
      // Service Category Breakdown
      prisma.enquiry.groupBy({
        by: ['serviceCategory'],
        where: { bgaId },
        _count: { id: true },
      }),
      // Associate Peer Network ("for the bga it should be one bga should show another bga")
      prisma.user.findMany({
        where: { role: Role.BGA, status: BgaStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              clients: true,
              enquiries: true,
              quotations: { where: { status: QuotationStatus.ACCEPTED } },
              workOrders: { where: { project: { status: ProjectStatus.COMPLETED } } },
            },
          },
        },
      }),
      // Active project execution cards
      prisma.technicalProject.findMany({
        where: { workOrder: { bgaId } },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          projectNumber: true,
          serviceCategory: true,
          status: true,
          progressPercentage: true,
          updatedAt: true,
          client: { select: { clientName: true, businessName: true } },
          milestones: { select: { id: true, title: true, status: true } },
          deliverables: { select: { id: true, title: true, status: true } },
        },
      }),
    ]);

    // Build 6-month trend arrays
    const monthlyPerformance = months.map((m) => {
      const clientsCount = recentClients.filter((c) => c.createdAt >= m.start && c.createdAt < m.end).length;
      const enquiriesCount = recentEnquiries.filter((e) => e.createdAt >= m.start && e.createdAt < m.end).length;
      const acceptedQuotes = recentAcceptedQuotes.filter((q) => q.updatedAt >= m.start && q.updatedAt < m.end);
      const revenue = acceptedQuotes.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      return {
        month: m.label,
        yearMonth: m.yearMonth,
        clients: clientsCount,
        enquiries: enquiriesCount,
        acceptedQuotes: acceptedQuotes.length,
        revenue,
      };
    });

    // Format service category breakdown
    const totalEnquiriesCount = totalEnquiries || 1;
    const categoryBreakdown = categoryStats.map((c) => ({
      category: c.serviceCategory,
      count: c._count.id,
      percentage: Math.round((c._count.id / totalEnquiriesCount) * 100),
    }));

    // Build Peer Leaderboard / Network Benchmark
    // Calculate performance scores
    const peerLeaderboard = allBgas
      .map((b) => {
        const clients = b._count.clients;
        const acceptedQuotes = b._count.quotations;
        const completedProjects = b._count.workOrders;
        const enquiries = b._count.enquiries;
        // Weighted formula for ranking
        const points = acceptedQuotes * 30 + completedProjects * 40 + clients * 15 + enquiries * 5;
        return {
          id: b.id,
          name: b.name,
          clientsCount: clients,
          acceptedQuotesCount: acceptedQuotes,
          completedProjectsCount: completedProjects,
          enquiriesCount: enquiries,
          points,
          isCurrentUser: b.id === bgaId,
        };
      })
      .sort((a, b) => b.points - a.points || b.clientsCount - a.clientsCount)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
        tier: idx === 0 ? 'Elite Diamond' : idx <= 2 ? 'Gold Producer' : idx <= 5 ? 'Silver Partner' : 'Rising Associate',
      }));

    // Find current user position in network
    const currentUserRank = peerLeaderboard.find((p) => p.isCurrentUser)?.rank || 1;
    const totalNetworkBgas = peerLeaderboard.length;

    const result = {
      clients: totalClients,
      enquiries: totalEnquiries,
      quotations: totalQuotations,
      acceptedQuotations,
      activeProjects,
      completedProjects,
      earnings: {
        paid: totalEarnings._sum.calculatedCommission || 0,
        pending: pendingEarnings._sum.calculatedCommission || 0,
      },
      monthlyPerformance,
      categoryBreakdown,
      pipelineFunnel: {
        clients: totalClients,
        enquiries: totalEnquiries,
        quotations: totalQuotations,
        acceptedQuotations,
        activeProjects,
        completedProjects,
      },
      peerLeaderboard: peerLeaderboard.slice(0, 10), // Top 10 associates
      networkStats: {
        currentUserRank,
        totalNetworkBgas,
        networkPercentile: Math.max(5, Math.round(((totalNetworkBgas - currentUserRank + 1) / totalNetworkBgas) * 100)),
      },
      recentActiveProjects,
    };

    appCache.set(cacheKey, result, 20);
    res.json(result);
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
        profileImageUrl: true,
        dob: true,
        address: true,
        city: true,
        district: true,
        state: true,
        pinCode: true,
        panNumber: true,
        panVerified: true,
        panVerifiedAt: true,
        aadhaarNumber: true,
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
      district: user.district || '',
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
      'panNumber', 'panVerified', 'aadhaarNumber', 'aadhaarMasked', 'aadhaarVerified',
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
        district: structuredAddress.district,
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

// 1c-2. Upload / Update Profile Image
router.put('/profile-image', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;
    const { profileImageUrl } = req.body;

    if (!profileImageUrl || typeof profileImageUrl !== 'string' || !profileImageUrl.trim()) {
      res.status(400).json({ error: 'Profile image URL is required' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: bgaId },
      data: { profileImageUrl: profileImageUrl.trim() },
      select: { id: true, name: true, email: true, profileImageUrl: true },
    });

    appCache.invalidatePrefix('bga:');
    appCache.invalidatePrefix('admin:');

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'UPDATE_PROFILE_IMAGE',
      'USER',
      bgaId,
      { profileImageUrl: updated.profileImageUrl },
      req.ip
    );

    res.json({ message: 'Profile image updated successfully', user: updated });
  } catch (error) {
    console.error('Failed to update profile image:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
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
      cleanProposed = `${cleanAadhaar.slice(0, 4)} ${cleanAadhaar.slice(4, 8)} ${cleanAadhaar.slice(8, 12)}`;
    }

    const currentMap: Record<string, string | null> = {
      PAN: currentUser.panNumber,
      AADHAAR: (currentUser as any).aadhaarNumber || currentUser.aadhaarMasked,
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
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    const resources = await prisma.companyResource.findMany({
      where: {
        isPublished: true,
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
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
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
        contactActivities: {
          orderBy: { createdAt: 'desc' },
        },
        enquiries: {
          select: {
            id: true,
            serviceCategory: true,
            expectedBudget: true,
            status: true,
            requirements: true,
            discussionNotes: true,
            followUpDate: true,
            adminNotes: true,
            reviewedAt: true,
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
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
            },
            project: {
              include: {
                deliverables: true,
                finalPaymentFollowUps: {
                  include: { bga: { select: { id: true, name: true } } },
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
            commissions: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { workOrders: true, enquiries: true, quotations: true, contactActivities: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedClients = clients.map((c) => {
      const addr = parseClientLocation(c.location);
      const latestEnq = c.enquiries && c.enquiries.length > 0 ? c.enquiries[0] : null;
      return {
        ...c,
        requiredService: (c as any).requiredService || latestEnq?.serviceCategory || null,
        expectedBudget: (c as any).expectedBudget ?? (latestEnq?.expectedBudget !== undefined ? latestEnq.expectedBudget : null),
        clientRequirements: (c as any).clientRequirements || latestEnq?.requirements || null,
        discussionNotes: (c as any).discussionNotes || latestEnq?.discussionNotes || null,
        followUpDate: (c as any).followUpDate || latestEnq?.followUpDate || null,
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
    if (!resolvedPinCode || !/^\d{6}$/.test(resolvedPinCode)) {
      res.status(400).json({ error: 'PIN Code must be a valid 6-digit postal code' });
      return;
    }

    const normalizedMobile = mobile.replace(/\D/g, '').slice(-10);
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedMobile.length !== 10 || !/^[6-9]\d{9}$/.test(normalizedMobile)) {
      res.status(400).json({ error: 'Valid 10-digit mobile number starting with 6, 7, 8, or 9 is required' });
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

    appCache.invalidatePrefix(`bga:${req.user!.id}:`);
    appCache.invalidatePrefix('admin:');

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

// Fetch single client details with ownership validation
router.get('/clients/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findFirst({
      where: { id, bgaId: req.user!.id },
      include: {
        contactActivities: {
          orderBy: { createdAt: 'desc' },
        },
        enquiries: {
          include: {
            quotations: {
              include: {
                workOrder: {
                  include: {
                    project: {
                      select: {
                        id: true,
                        projectNumber: true,
                        status: true,
                        progressPercentage: true,
                      },
                    },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          include: {
            workOrder: {
              include: {
                project: {
                  select: {
                    id: true,
                    projectNumber: true,
                    status: true,
                    progressPercentage: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        workOrders: {
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
            },
            project: {
              include: {
                milestones: {
                  orderBy: { createdAt: 'asc' },
                },
                deliverables: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        commissions: {
          include: {
            workOrder: {
              select: {
                workOrderNumber: true,
                totalValue: true,
              },
            },
            payment: {
              select: {
                amount: true,
                transactionReference: true,
                paymentDate: true,
              },
            },
            project: {
              select: {
                projectNumber: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { workOrders: true, enquiries: true, quotations: true, contactActivities: true } },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found or not assigned to your account' });
      return;
    }

    const addr = parseClientLocation(client.location);
    const latestEnq = client.enquiries && client.enquiries.length > 0 ? client.enquiries[0] : null;
    res.json({
      client: {
        ...client,
        requiredService: (client as any).requiredService || latestEnq?.serviceCategory || null,
        expectedBudget: (client as any).expectedBudget ?? (latestEnq?.expectedBudget !== undefined ? latestEnq.expectedBudget : null),
        clientRequirements: (client as any).clientRequirements || latestEnq?.requirements || null,
        discussionNotes: (client as any).discussionNotes || latestEnq?.discussionNotes || null,
        followUpDate: (client as any).followUpDate || latestEnq?.followUpDate || null,
        address: addr,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        city: addr.city,
        state: addr.state,
        pinCode: addr.pinCode,
        country: addr.country,
        fullAddress: addr.fullAddress,
        displayLocation: addr.displayLocation,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client details' });
  }
});

// Add Contact / Follow-up Activity under a Client
router.post('/clients/:id/activities', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { contactMethod, discussionSummary, followUpNotes, nextFollowUpDate, outcome } = req.body;

    if (!discussionSummary || !discussionSummary.trim()) {
      res.status(400).json({ error: 'Discussion summary is required' });
      return;
    }

    // Verify client belongs to logged-in BGA
    const client = await prisma.client.findFirst({
      where: { id, bgaId: req.user!.id },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found or not owned by you' });
      return;
    }

    const activity = await prisma.contactActivity.create({
      data: {
        clientId: id,
        bgaId: req.user!.id,
        contactMethod: contactMethod || 'CALL',
        discussionSummary: discussionSummary.trim(),
        followUpNotes: followUpNotes ? followUpNotes.trim() : null,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        outcome: outcome || 'CONNECTED',
        createdBy: req.user!.name,
      },
    });

    // If next follow-up date was supplied, also update the latest enquiry's followUpDate for consistency
    if (nextFollowUpDate) {
      const latestEnq = await prisma.enquiry.findFirst({
        where: { clientId: id, bgaId: req.user!.id },
        orderBy: { createdAt: 'desc' },
      });
      if (latestEnq) {
        await prisma.enquiry.update({
          where: { id: latestEnq.id },
          data: {
            followUpDate: new Date(nextFollowUpDate),
            ...(discussionSummary ? { discussionNotes: discussionSummary.trim() } : {}),
          },
        });
      }
    }

    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'CREATE_CONTACT_ACTIVITY', 'CLIENT', id, {
      activityId: activity.id,
      contactMethod: activity.contactMethod,
      outcome: activity.outcome,
    });

    res.status(201).json({ activity, message: 'Contact activity logged successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record contact activity' });
  }
});

// Upload and attach client media (Documents, Screenshots/Images, Audio, Video, Archives)
router.post('/clients/:id/media', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, fileUrl, fileType, fileSize, notes, category } = req.body;

    if (!title || !title.trim() || !fileUrl) {
      res.status(400).json({ error: 'Title and file URL are required' });
      return;
    }

    const client = await prisma.client.findFirst({
      where: { id, bgaId: req.user!.id },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found or not owned by you' });
      return;
    }

    const mediaMetadata = JSON.stringify({
      title: title.trim(),
      fileUrl,
      fileType: fileType || 'DOCUMENT',
      fileSize: fileSize || null,
      category: category || 'CLIENT_ASSET',
      uploadedBy: req.user!.name,
      uploadedAt: new Date().toISOString(),
    });

    const activity = await prisma.contactActivity.create({
      data: {
        clientId: id,
        bgaId: req.user!.id,
        contactMethod: 'CLIENT_MEDIA',
        discussionSummary: `Client Media Upload: ${title.trim()} (${fileType || 'DOCUMENT'})`,
        followUpNotes: notes ? `${notes.trim()}\n\n[ASSET_METADATA]:${mediaMetadata}` : `[ASSET_METADATA]:${mediaMetadata}`,
        outcome: 'DOCUMENT_RECEIVED',
        createdBy: req.user!.name,
      },
    });

    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'UPLOAD_CLIENT_MEDIA', 'CLIENT', id, {
      title,
      fileUrl,
      fileType,
    });

    res.status(201).json({ activity, message: 'Client media uploaded and recorded successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record client media' });
  }
});

// Get Contact Activities for a Client
router.get('/clients/:id/activities', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findFirst({
      where: { id, bgaId: req.user!.id },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found or not owned by you' });
      return;
    }

    const activities = await prisma.contactActivity.findMany({
      where: { clientId: id, bgaId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contact activities' });
  }
});

// Comprehensive Unified Client Activity Timeline
router.get('/clients/:id/activity-timeline', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const timeline = await getClientActivityTimeline(id, {
      id: req.user!.id,
      role: req.user!.role as Role,
      name: req.user!.name,
    });

    if (!timeline) {
      res.status(404).json({ error: 'Client not found or not owned by you' });
      return;
    }

    res.json(timeline);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED_CLIENT_ACCESS') {
      res.status(403).json({ error: 'Unauthorized: client is not owned by you' });
      return;
    }
    console.error('Error fetching activity timeline:', error);
    res.status(500).json({ error: 'Failed to fetch client activity timeline' });
  }
});

// Update client information, address, and discussion/enquiry fields
router.put('/clients/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
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

    // Strict Ownership Enforcement: Must belong to authenticated BGA
    const client = await prisma.client.findFirst({
      where: { id, bgaId: req.user!.id },
      include: {
        enquiries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found or not assigned to your account' });
      return;
    }

    // Validate clientName if passed
    if (clientName !== undefined) {
      if (!clientName || !clientName.trim()) {
        res.status(400).json({ error: 'Client contact name cannot be empty' });
        return;
      }
    }

    // Validate businessName if passed
    if (businessName !== undefined) {
      if (!businessName || !businessName.trim()) {
        res.status(400).json({ error: 'Business / Company name cannot be empty' });
        return;
      }
    }

    // Validate Mobile & Global Duplicate Check if passed
    let normalizedMobile = client.mobile;
    if (mobile !== undefined && mobile !== null && mobile !== '') {
      const cleanMob = mobile.replace(/\D/g, '').slice(-10);
      if (cleanMob.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMob)) {
        res.status(400).json({ error: 'Valid 10-digit mobile number starting with 6, 7, 8, or 9 is required' });
        return;
      }
      normalizedMobile = cleanMob;

      if (normalizedMobile !== client.mobile) {
        const existingMob = await prisma.client.findFirst({
          where: {
            mobile: normalizedMobile,
            id: { not: client.id },
          },
          select: { id: true },
        });
        if (existingMob) {
          res.status(409).json({
            error: 'Registration Conflict: A client with this mobile number or email address is already registered in the system. Duplicate client registrations are not permitted under company ownership policy.',
          });
          return;
        }
      }
    }

    // Validate Email & Global Duplicate Check if passed
    let normalizedEmail = client.email;
    if (email !== undefined && email !== null && email !== '') {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({ error: 'Please enter a valid email address' });
        return;
      }
      normalizedEmail = cleanEmail;

      if (normalizedEmail !== client.email) {
        const existingEmail = await prisma.client.findFirst({
          where: {
            email: normalizedEmail,
            id: { not: client.id },
          },
          select: { id: true },
        });
        if (existingEmail) {
          res.status(409).json({
            error: 'Registration Conflict: A client with this mobile number or email address is already registered in the system. Duplicate client registrations are not permitted under company ownership policy.',
          });
          return;
        }
      }
    }

    // Resolve Business Category
    let resolvedCategory = client.businessCategory;
    if (businessCategory !== undefined) {
      resolvedCategory = businessCategory.trim();
      if (!resolvedCategory || resolvedCategory === 'Other') {
        if (!otherCategory || !otherCategory.trim()) {
          res.status(400).json({ error: 'Please enter your custom business category' });
          return;
        }
        resolvedCategory = otherCategory.trim();
      }
    }

    // Resolve Address
    const existingAddr = parseClientLocation(client.location);
    let locationToSave = client.location;
    if (
      addressLine1 !== undefined ||
      addressLine2 !== undefined ||
      city !== undefined ||
      state !== undefined ||
      pinCode !== undefined ||
      country !== undefined
    ) {
      const newLine1 = (addressLine1 !== undefined ? addressLine1 : existingAddr.addressLine1).trim();
      const newLine2 = (addressLine2 !== undefined ? addressLine2 : existingAddr.addressLine2).trim();
      const newCity = (city !== undefined ? city : existingAddr.city).trim();
      const newState = (state !== undefined ? state : existingAddr.state).trim();
      const newPin = (pinCode !== undefined ? pinCode : existingAddr.pinCode).trim();
      const newCountry = (country !== undefined ? country : (existingAddr.country || 'India')).trim();

      if (!newLine1) {
        res.status(400).json({ error: 'Business Address Line 1 cannot be empty' });
        return;
      }
      if (!newCity) {
        res.status(400).json({ error: 'City cannot be empty' });
        return;
      }
      if (!newState) {
        res.status(400).json({ error: 'State cannot be empty' });
        return;
      }
      if (!newPin || !/^\d{6}$/.test(newPin)) {
        res.status(400).json({ error: 'PIN Code must be a valid 6-digit postal code' });
        return;
      }

      const structuredAddress = {
        addressLine1: newLine1,
        addressLine2: newLine2,
        city: newCity,
        state: newState,
        pinCode: newPin,
        country: newCountry,
        fullAddress: [
          newLine1,
          newLine2,
          newCity,
          newState,
          newPin ? `PIN: ${newPin}` : '',
          newCountry,
        ].filter(Boolean).join(', '),
      };
      locationToSave = JSON.stringify(structuredAddress);
    } else if (location !== undefined && location.trim()) {
      locationToSave = location.trim();
    }

    // Validate expectedBudget if passed
    let parsedBudget: number | undefined = undefined;
    if (expectedBudget !== undefined && expectedBudget !== null && expectedBudget !== '') {
      parsedBudget = parseFloat(expectedBudget);
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        res.status(400).json({ error: 'Expected budget must be a valid non-negative amount' });
        return;
      }
    } else if (expectedBudget === '') {
      parsedBudget = 0;
    }

    // Update Client in DB (Strictly preserve bgaId)
    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        ...(clientName ? { clientName: clientName.trim() } : {}),
        ...(businessName ? { businessName: businessName.trim() } : {}),
        mobile: normalizedMobile,
        email: normalizedEmail,
        businessCategory: resolvedCategory,
        location: locationToSave,
      },
    });

    // Update or Create Enquiry record
    const latestEnquiry = client.enquiries && client.enquiries.length > 0 ? client.enquiries[0] : null;
    let updatedEnquiry = null;

    if (
      parsedBudget !== undefined ||
      requiredService !== undefined ||
      clientRequirements !== undefined ||
      discussionNotes !== undefined ||
      followUpDate !== undefined
    ) {
      if (latestEnquiry) {
        updatedEnquiry = await prisma.enquiry.update({
          where: { id: latestEnquiry.id },
          data: {
            ...(parsedBudget !== undefined ? { expectedBudget: parsedBudget } : {}),
            ...(requiredService ? { serviceCategory: requiredService as ServiceCategoryType } : {}),
            ...(clientRequirements !== undefined ? { requirements: clientRequirements.trim() } : {}),
            ...(discussionNotes !== undefined ? { discussionNotes: discussionNotes ? discussionNotes.trim() : null } : {}),
            ...(followUpDate !== undefined ? { followUpDate: followUpDate ? new Date(followUpDate) : null } : {}),
          },
        });
      } else if (
        (requiredService && clientRequirements?.trim()) ||
        parsedBudget !== undefined
      ) {
        const enquiryId = generateId('ENQ');
        updatedEnquiry = await prisma.enquiry.create({
          data: {
            id: enquiryId,
            clientId: updatedClient.id,
            bgaId: req.user!.id,
            serviceCategory: (requiredService as ServiceCategoryType) || 'WEBSITE_DEVELOPMENT',
            expectedBudget: parsedBudget || 0,
            requirements: (clientRequirements && clientRequirements.trim()) || 'Initial client scope details.',
            discussionNotes: discussionNotes ? discussionNotes.trim() : null,
            followUpDate: followUpDate ? new Date(followUpDate) : null,
            status: EnquiryStatus.SUBMITTED,
          },
        });
      }
    }

    // Audit Logging
    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'CLIENT_UPDATED',
      'CLIENT',
      updatedClient.id,
      {
        clientName: updatedClient.clientName,
        businessName: updatedClient.businessName,
        expectedBudget: parsedBudget,
      },
      req.ip
    );

    appCache.invalidatePrefix(`bga:${req.user!.id}:`);
    appCache.invalidatePrefix('admin:');

    // Fetch refreshed complete client object with all relations
    const refreshedClient = await prisma.client.findUnique({
      where: { id: updatedClient.id },
      include: {
        contactActivities: {
          orderBy: { createdAt: 'desc' },
        },
        enquiries: {
          select: {
            id: true,
            serviceCategory: true,
            expectedBudget: true,
            status: true,
            requirements: true,
            discussionNotes: true,
            followUpDate: true,
            adminNotes: true,
            reviewedAt: true,
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
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
            },
            project: {
              include: {
                deliverables: true,
                finalPaymentFollowUps: {
                  include: { bga: { select: { id: true, name: true } } },
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
            commissions: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { workOrders: true, enquiries: true, quotations: true, contactActivities: true } },
      },
    });

    const parsedAddr = parseClientLocation(refreshedClient?.location || updatedClient.location);
    const targetClient = refreshedClient || updatedClient;
    const latestEnq = (targetClient as any)?.enquiries && (targetClient as any).enquiries.length > 0
      ? (targetClient as any).enquiries[0]
      : updatedEnquiry || null;
    const enriched = {
      ...targetClient,
      requiredService: (targetClient as any).requiredService || latestEnq?.serviceCategory || null,
      expectedBudget: (targetClient as any).expectedBudget ?? (latestEnq?.expectedBudget !== undefined ? latestEnq.expectedBudget : null),
      clientRequirements: (targetClient as any).clientRequirements || latestEnq?.requirements || null,
      discussionNotes: (targetClient as any).discussionNotes || latestEnq?.discussionNotes || null,
      followUpDate: (targetClient as any).followUpDate || latestEnq?.followUpDate || null,
      address: parsedAddr,
      addressLine1: parsedAddr.addressLine1,
      addressLine2: parsedAddr.addressLine2,
      city: parsedAddr.city,
      state: parsedAddr.state,
      pinCode: parsedAddr.pinCode,
      country: parsedAddr.country,
      fullAddress: parsedAddr.fullAddress,
      displayLocation: parsedAddr.displayLocation,
    };

    res.json({
      message: `Client '${updatedClient.clientName}' updated successfully.`,
      client: enriched,
      enquiry: updatedEnquiry,
    });
  } catch (error: any) {
    console.error('Client update error:', error);
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
          orderBy: { version: 'desc' },
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
    const { clientId, serviceCategory, subCategory, expectedBudget, requirements, discussionNotes, followUpDate, attachmentUrl } =
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
        attachmentUrl: attachmentUrl || null,
        status: EnquiryStatus.SUBMITTED,
      },
    });

    // Notify Admins and Accounts
    const adminAndAccounts = await prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.ACCOUNTS] }, status: 'ACTIVE' },
    });
    for (const a of adminAndAccounts) {
      await createNotification(
        a.id,
        'New Client Enquiry Awaiting Review',
        `Associate ${req.user!.name} created enquiry ${enquiryId} for ${client.clientName} (${serviceCategory}).`,
        'ACTION_REQUIRED',
        a.role === Role.ADMIN ? '/admin/enquiries' : '/accounts/quotation-requests'
      );
    }

    // Confirmation notification & email to BGA
    await createNotification(
      req.user!.id,
      'Enquiry Submitted Successfully',
      `Your enquiry ${enquiryId} for ${client.clientName} (${serviceCategory}) has been submitted for company review.`,
      'SUCCESS',
      '/bga?tab=enquiries'
    );

    await logAudit(req.user!.id, req.user!.email, req.user!.role, 'CREATE_ENQUIRY', 'ENQUIRY', enquiry.id, {
      enquiryId,
      clientId,
    });

    res.status(201).json({ enquiry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create enquiry' });
  }
});

// BGA Client Consultation & Follow-up on Enquiry (Response to Management Scope Changes or Rejection)
router.post('/enquiries/:id/follow-up', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      consultationNotes,
      consultationDate,
      nextFollowUpDate,
      contactMethod,
      clientOutcome,
      revisedBudget,
      revisedRequirements,
      resubmit,
      isRejectionFollowUp,
    } = req.body;

    if (!consultationNotes || !consultationNotes.trim()) {
      res.status(400).json({ error: 'Client consultation notes are required.' });
      return;
    }

    const enquiry = await prisma.enquiry.findFirst({
      where: { id, bgaId: req.user!.id },
      include: { client: true, bga: true },
    });

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found or not assigned to your account.' });
      return;
    }

    const isRej = enquiry.status === 'REJECTED' || !!isRejectionFollowUp;

    const dateObj = consultationDate ? new Date(consultationDate) : new Date();
    const formattedDateTime = dateObj.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const methodStr = contactMethod ? ` via ${contactMethod}` : '';
    let newEntry: string;
    if (isRej) {
      newEntry = `[${formattedDateTime}] Client Informed of Rejection by BGA ${req.user!.name}${methodStr}:\n${consultationNotes.trim()}`;
      if (clientOutcome) {
        newEntry += `\n• Client Outcome / Next Step: ${clientOutcome}`;
      }
    } else {
      newEntry = `[${formattedDateTime}] Client Consultation by BGA ${req.user!.name}${methodStr}:\n${consultationNotes.trim()}`;
    }

    if (revisedBudget !== undefined && !isNaN(Number(revisedBudget)) && Number(revisedBudget) !== enquiry.expectedBudget) {
      newEntry += `\n• Revised Budget: ₹${Number(revisedBudget).toLocaleString('en-IN')} (Previous: ₹${enquiry.expectedBudget.toLocaleString('en-IN')})`;
    }
    if (revisedRequirements && revisedRequirements.trim() && revisedRequirements.trim() !== enquiry.requirements.trim()) {
      newEntry += `\n• Updated Scope Details:\n${revisedRequirements.trim()}`;
    }

    const updatedDiscussionNotes = enquiry.discussionNotes
      ? `${newEntry}\n\n----------------------------------------\n${enquiry.discussionNotes}`
      : newEntry;

    const updateData: any = {
      discussionNotes: updatedDiscussionNotes,
      followUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
    };

    if (revisedBudget !== undefined && !isNaN(Number(revisedBudget)) && Number(revisedBudget) > 0) {
      updateData.expectedBudget = Number(revisedBudget);
    }

    if (revisedRequirements && revisedRequirements.trim()) {
      updateData.requirements = revisedRequirements.trim();
    }

    // Default to true for CHANGES_REQUESTED so Admin can verify & approve;
    // For REJECTED, only transition to SUBMITTED if BGA explicitly chose to resubmit
    if (isRej) {
      if (resubmit === true) {
        updateData.status = EnquiryStatus.SUBMITTED;
      }
    } else {
      if (resubmit !== false) {
        updateData.status = EnquiryStatus.SUBMITTED;
      }
    }

    const updatedEnquiry = await prisma.enquiry.update({
      where: { id: enquiry.id },
      data: updateData,
      include: { client: true },
    });

    // Also record as a ContactActivity under the client for CRM timeline tracking
    try {
      await prisma.contactActivity.create({
        data: {
          clientId: enquiry.clientId,
          bgaId: req.user!.id,
          contactMethod: contactMethod || (isRej ? 'PHONE_CALL' : 'MEETING'),
          discussionSummary: isRej
            ? `Client informed of rejection on ${enquiry.id}: ${consultationNotes.trim().slice(0, 160)}`
            : `Consultation on Enquiry ${enquiry.id}: ${consultationNotes.trim().slice(0, 180)}`,
          followUpNotes: consultationNotes.trim(),
          outcome: clientOutcome || 'CONNECTED',
          nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
          createdBy: req.user!.name,
          createdAt: dateObj,
        },
      });
    } catch (crmErr) {
      console.warn('Could not record ContactActivity (non-blocking):', crmErr);
    }

    // Notify Management / Admins
    try {
      const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
      const notifTitle = isRej
        ? resubmit
          ? `Enquiry Resubmitted After Rejection Discussion`
          : `Client Informed of Rejection: ${enquiry.client.clientName}`
        : 'Client Consultation Follow-up Submitted';

      const notifMsg = isRej
        ? resubmit
          ? `BGA ${req.user!.name} informed client ${enquiry.client.clientName} of rejected enquiry ${enquiry.id} and resubmitted with revised terms for Admin review.`
          : `BGA ${req.user!.name} informed client ${enquiry.client.clientName} regarding rejected enquiry ${enquiry.id}. Client Response: "${consultationNotes.trim().slice(0, 120)}"`
        : `BGA ${req.user!.name} consulted client ${enquiry.client.clientName} on ${enquiry.id}. Ready for management verification.`;

      for (const adm of admins) {
        await createNotification(
          adm.id,
          notifTitle,
          notifMsg,
          isRej && !resubmit ? 'INFO' : 'ACTION_REQUIRED',
          `/admin?tab=enquiries&enquiryId=${enquiry.id}`
        );
      }
    } catch (notifErr) {
      console.warn('Could not send admin notification (non-blocking):', notifErr);
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      isRej ? 'ENQUIRY_REJECTION_FOLLOW_UP_SUBMITTED' : 'ENQUIRY_FOLLOW_UP_SUBMITTED',
      'ENQUIRY',
      enquiry.id,
      {
        clientName: enquiry.client.clientName,
        consultationDate: dateObj,
        isRejection: isRej,
        outcome: clientOutcome,
        budgetUpdated: !!revisedBudget,
        resubmitted: updateData.status === EnquiryStatus.SUBMITTED,
      }
    );

    res.json({
      message: isRej
        ? 'Client rejection follow-up recorded successfully and forwarded to Management.'
        : 'Client consultation follow-up recorded successfully and submitted for Admin verification.',
      enquiry: updatedEnquiry,
    });
  } catch (error: any) {
    console.error('Error logging enquiry follow-up:', error);
    res.status(500).json({ error: error.message || 'Failed to submit client consultation follow-up' });
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
        advanceRequiredPercent: enquiry.serviceCategory === ServiceCategoryType.DIGITAL_MARKETING ? 100 : 50,
        advanceRequiredAmount:
          enquiry.serviceCategory === ServiceCategoryType.DIGITAL_MARKETING
            ? enquiry.expectedBudget + (enquiry.expectedBudget * 18) / 100
            : (enquiry.expectedBudget + (enquiry.expectedBudget * 18) / 100) * 0.5,
        paymentTerms:
          enquiry.serviceCategory === ServiceCategoryType.DIGITAL_MARKETING
            ? '100% advance full payment required prior to campaign strategy, setup, and execution.'
            : '50% advance upon contract signing. Balance upon delivery milestones.',
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

// View My Quotations (Includes reminder history and status)
router.get('/quotations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawQuotations = await prisma.quotation.findMany({
      where: { bgaId: req.user!.id },
      include: {
        client: true,
        enquiry: true,
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
        reminders: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const quotations = await hydrateQuotationVersions(rawQuotations);
    res.json({ quotations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load quotations' });
  }
});

// Send Quotation Reminder to Accounts & Admin (with cooldown)
router.post('/quotations/:id/reminder', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const quotation = await prisma.quotation.findFirst({
      where: { id, bgaId: req.user!.id },
      include: { client: true },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation request not found or not owned by you' });
      return;
    }

    // Cooldown check: 15 minutes between reminders
    const cooldownMs = 15 * 60 * 1000;
    if (quotation.lastReminderSentAt && Date.now() - new Date(quotation.lastReminderSentAt).getTime() < cooldownMs) {
      const waitMins = Math.ceil((cooldownMs - (Date.now() - new Date(quotation.lastReminderSentAt).getTime())) / (60 * 1000));
      res.status(429).json({
        error: `Reminder cooldown active. Please wait ${waitMins} minute(s) before sending another reminder.`,
      });
      return;
    }

    // Record reminder in database
    await prisma.quotationReminder.create({
      data: {
        quotationId: quotation.id,
        bgaId: req.user!.id,
        message: message ? String(message).trim() : null,
      },
    });

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        reminderCount: (quotation.reminderCount || 0) + 1,
        lastReminderSentAt: new Date(),
      },
    });

    // Notify Accounts Department
    const accountsUsers = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
    for (const acc of accountsUsers) {
      await createNotification(
        acc.id,
        '⚠️ Quotation Preparation Reminder',
        `BGA ${req.user!.name} sent an urgent reminder to prepare quotation for client ${quotation.client.clientName} (${quotation.quotationNumber}).`,
        'ACTION_REQUIRED',
        '/accounts'
      );
    }

    // Notify Admin
    const adminUsers = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const a of adminUsers) {
      await createNotification(
        a.id,
        'Delayed Quotation Reminder',
        `BGA ${req.user!.name} sent a reminder regarding pending quotation for ${quotation.client.clientName}. Total reminders: ${updated.reminderCount}.`,
        'WARNING',
        '/admin/quotations'
      );
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'QUOTATION_REMINDER_SENT',
      'QUOTATION',
      quotation.id,
      { reminderCount: updated.reminderCount, message },
      req.ip
    );

    res.json({ message: 'Quotation reminder dispatched to Accounts & Admin successfully', quotation: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send quotation reminder' });
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
        adminApprovalStatus: 'PENDING',
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
      // Must verify quotation is Admin approved before accepting!
      if (
        quotation.status !== QuotationStatus.ADMIN_APPROVED &&
        quotation.status !== QuotationStatus.SENT_TO_BGA &&
        quotation.adminApprovalStatus !== 'APPROVED'
      ) {
        res.status(400).json({
          error: 'Official quotation has not been approved by Admin yet. Only Admin-approved quotations can be accepted by clients.',
        });
        return;
      }

      if (!clientAcceptanceNotes || !clientAcceptanceNotes.trim()) {
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
          handoverApproved: false,
          handoverStatus: 'PENDING',
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

      // Notify Admin
      const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
      for (const a of admins) {
        await createNotification(
          a.id,
          'Quotation Accepted by Client',
          `Client ${quotation.client.clientName} has accepted quotation ${quotation.quotationNumber}. Work Order ${workOrderNumber} generated.`,
          'INFO',
          '/admin/work-orders'
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

      appCache.invalidatePrefix('bga:');
      appCache.invalidatePrefix('accounts:');
      appCache.invalidatePrefix('admin:');

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
          clientAcceptanceNotes: clientAcceptanceNotes ? clientAcceptanceNotes.trim() : 'Client rejected quotation',
        },
      });

      // Notify Accounts & Admin
      const accounts = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
      for (const a of accounts) {
        await createNotification(
          a.id,
          'Quotation Rejected by Client',
          `Client ${quotation.client.clientName} has rejected quotation ${quotation.quotationNumber}.`,
          'WARNING',
          '/accounts/quotations'
        );
      }

      res.json({ message: 'Client rejection recorded', quotation: updatedQuotation });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to record client decision' });
  }
});

// Dedicated BGA Approval Tracking: "My Client Requests"
router.get('/client-requests', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      where: { bgaId: req.user!.id },
      include: {
        enquiries: {
          include: {
            quotations: {
              include: {
                reminders: { orderBy: { createdAt: 'desc' } },
                workOrder: {
                  include: {
                    payments: { orderBy: { createdAt: 'desc' } },
                    project: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requests = clients.flatMap((client) => {
      if (client.enquiries.length === 0) {
        return [
          {
            clientId: client.id,
            clientName: client.clientName,
            businessName: client.businessName,
            enquiryId: 'N/A',
            serviceCategory: 'N/A',
            subCategory: 'N/A',
            submissionDate: client.createdAt,
            adminApprovalStatus: 'PENDING_ADMIN_APPROVAL',
            quotationStatus: 'NOT_REQUESTED',
            clientResponse: 'AWAITING_RESPONSE',
            paymentStatus: 'AWAITING_PAYMENT',
            projectStatus: 'NOT_STARTED',
          },
        ];
      }

      return client.enquiries.map((enq) => {
        const latestQuot = enq.quotations[0];
        const workOrder = latestQuot?.workOrder;
        const latestPayment = workOrder?.payments?.[0];
        const project = workOrder?.project;

        let quotationStatus = 'NOT_REQUESTED';
        if (latestQuot) {
          if (latestQuot.status === 'REQUESTED') quotationStatus = 'QUOTATION_REQUESTED';
          else if (latestQuot.status === 'PREPARED' || latestQuot.status === 'PENDING_ADMIN_APPROVAL') quotationStatus = 'QUOTATION_PENDING_ADMIN_APPROVAL';
          else if (latestQuot.status === 'ADMIN_APPROVED' || latestQuot.status === 'SENT_TO_BGA') quotationStatus = 'QUOTATION_APPROVED';
          else if (latestQuot.status === 'REVISION_REQUESTED') quotationStatus = 'QUOTATION_REVISION_REQUESTED';
          else if (latestQuot.status === 'ACCEPTED') quotationStatus = 'QUOTATION_ACCEPTED';
          else quotationStatus = latestQuot.status;
        }

        let clientResponse = 'AWAITING_RESPONSE';
        if (latestQuot?.status === 'ACCEPTED') clientResponse = 'ACCEPTED';
        else if (latestQuot?.status === 'REJECTED') clientResponse = 'REJECTED';
        else if (latestQuot?.status === 'REVISION_REQUESTED') clientResponse = 'REVISION_REQUESTED';

        let paymentStatus = 'AWAITING_PAYMENT';
        if (latestPayment) {
          if (latestPayment.status === 'VERIFIED') paymentStatus = 'VERIFIED';
          else if (latestPayment.status === 'PENDING_VERIFICATION') paymentStatus = 'PAYMENT_SUBMITTED';
          else paymentStatus = latestPayment.status;
        }

        let projectStatus = 'NOT_STARTED';
        if (project) {
          projectStatus = project.status;
        } else if (workOrder?.advanceVerified && !workOrder?.handoverApproved) {
          projectStatus = 'PENDING_HANDOVER_APPROVAL';
        } else if (workOrder?.status === 'PENDING_ADVANCE') {
          projectStatus = 'PENDING_ADVANCE_PAYMENT';
        }

        return {
          clientId: client.id,
          clientName: client.clientName,
          businessName: client.businessName,
          enquiryId: enq.id,
          serviceCategory: enq.serviceCategory,
          subCategory: enq.subCategory || 'General',
          submissionDate: enq.createdAt,
          adminApprovalStatus: enq.status,
          quotationStatus,
          clientResponse,
          paymentStatus,
          projectStatus,
          quotation: latestQuot
            ? {
                id: latestQuot.id,
                quotationNumber: latestQuot.quotationNumber,
                totalAmount: latestQuot.totalAmount,
                status: latestQuot.status,
                adminApprovalStatus: latestQuot.adminApprovalStatus,
                reminderCount: latestQuot.reminderCount || 0,
                lastReminderSentAt: latestQuot.lastReminderSentAt,
              }
            : null,
          workOrder: workOrder
            ? {
                id: workOrder.id,
                workOrderNumber: workOrder.workOrderNumber,
                advancePaid: workOrder.advancePaid,
                advanceRequired: workOrder.advanceRequired,
                advanceVerified: workOrder.advanceVerified,
                handoverApproved: workOrder.handoverApproved,
              }
            : null,
        };
      });
    });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load client requests' });
  }
});

// 7. Work Orders & My Projects (With Full Deliverables, Milestones & Feedback)
router.get('/work-orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      where: { bgaId: req.user!.id },
      include: {
        client: true,
        quotation: {
          include: {
            enquiry: {
              select: {
                id: true,
                requirements: true,
                attachmentUrl: true,
              },
            },
          },
        },
        payments: true,
        project: {
          include: {
            milestones: {
              orderBy: { createdAt: 'asc' },
            },
            deliverables: {
              include: {
                milestone: {
                  select: { id: true, title: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            feedback: {
              orderBy: { createdAt: 'asc' },
            },
            finalPaymentFollowUps: {
              orderBy: { createdAt: 'desc' },
              include: {
                bga: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Ensure all projects have clientAccessToken for client-sharing
    for (const wo of workOrders) {
      if (wo.project && !wo.project.clientAccessToken) {
        const token = `prj_${crypto.randomBytes(16).toString('hex')}`;
        await prisma.technicalProject.update({
          where: { id: wo.project.id },
          data: { clientAccessToken: token },
        });
        (wo.project as any).clientAccessToken = token;
      }
    }

    res.json({ workOrders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load work orders' });
  }
});

// BGA Reviews Deliverable (Approve for Client or Request Changes from Technical)
router.put('/deliverables/:id/review', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // 'APPROVE_AND_SHARE' | 'REQUEST_CHANGES'

    const deliverable = await prisma.projectDeliverable.findUnique({
      where: { id },
      include: {
        project: {
          include: {
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
            client: true,
          },
        },
      },
    });

    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable not found' });
      return;
    }

    // Verify BGA ownership
    if (deliverable.project.workOrder.bgaId !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized to review this deliverable' });
      return;
    }

    let updatedStatus = deliverable.status;
    let bgaApprovalStatus = deliverable.bgaApprovalStatus;
    let isClientVisible = deliverable.isClientVisible;

    if (action === 'APPROVE_AND_SHARE') {
      updatedStatus = 'SHARED_WITH_CLIENT';
      bgaApprovalStatus = 'APPROVED';
      isClientVisible = true;
    } else if (action === 'REQUEST_CHANGES') {
      updatedStatus = 'REVISION_REQUIRED';
      bgaApprovalStatus = 'CHANGES_REQUESTED';
      isClientVisible = false;
    }

    const updated = await prisma.projectDeliverable.update({
      where: { id },
      data: {
        status: updatedStatus,
        bgaApprovalStatus,
        isClientVisible,
        bgaReviewNotes: notes ? notes.trim() : null,
      },
    });

    // Notify Technical team
    const techUsers = await prisma.user.findMany({
      where: { role: { in: [Role.TECHNICAL, Role.ADMIN] } },
    });

    const notifMsg =
      action === 'APPROVE_AND_SHARE'
        ? `BGA ${req.user!.name} approved and shared deliverable "${deliverable.title}" (v${deliverable.version}) with client.`
        : `BGA ${req.user!.name} requested changes on deliverable "${deliverable.title}" (v${deliverable.version}): ${notes || 'Revision required'}`;

    for (const tech of techUsers) {
      await createNotification(tech.id, 'Deliverable Review Update', notifMsg, 'INFO', '/technical');
    }

    appCache.invalidatePrefix('technical:');
    appCache.invalidatePrefix('bga:');

    res.json({
      message:
        action === 'APPROVE_AND_SHARE'
          ? 'Deliverable approved and shared with client.'
          : 'Revision request sent to Technical team.',
      deliverable: updated,
    });
  } catch (error) {
    console.error('Deliverable review error:', error);
    res.status(500).json({ error: 'Failed to review deliverable' });
  }
});

// BGA Submits Project Feedback (Recorded on behalf of Client or Internal Note)
router.post('/projects/:id/feedback', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content, messageType, visibility, milestoneId, deliverableId, clientDecision, parentFeedbackId } = req.body;

    const project = await prisma.technicalProject.findUnique({
      where: { id },
      include: { workOrder: true, client: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.workOrder.bgaId !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized to post feedback for this project' });
      return;
    }

    const isInternal = visibility === 'INTERNAL';
    const feedback = await prisma.projectFeedback.create({
      data: {
        projectId: id,
        content: content.trim(),
        authorId: req.user!.id,
        authorName: req.user!.name,
        authorRole: 'BGA',
        messageType: messageType || (isInternal ? 'INTERNAL_NOTE' : 'BGA_REPRESENTATIVE'),
        visibility: isInternal ? 'INTERNAL' : 'CLIENT_VISIBLE',
        feedbackType: isInternal ? 'INTERNAL_NOTE' : 'CLIENT_FEEDBACK',
        status: 'NEW',
        milestoneId: milestoneId || null,
        deliverableId: deliverableId || null,
        parentFeedbackId: parentFeedbackId || null,
      },
    });

    // If client requested corrections or approved, update project state accordingly
    if (clientDecision === 'CHANGES_REQUESTED') {
      await prisma.technicalProject.update({
        where: { id },
        data: { status: ProjectStatus.CORRECTION_REQUIRED },
      });
    } else if (clientDecision === 'APPROVED') {
      await prisma.technicalProject.update({
        where: { id },
        data: { progressPercentage: 95 },
      });
    }

    // Notify Technical team
    const techUsers = await prisma.user.findMany({
      where: { role: { in: [Role.TECHNICAL, Role.ADMIN] } },
    });
    const title =
      clientDecision === 'CHANGES_REQUESTED'
        ? 'Client Requested Corrections'
        : clientDecision === 'APPROVED'
          ? 'Client Approved Deliverables'
          : isInternal
            ? 'Internal Project Note from BGA'
            : 'Client Feedback Recorded by BGA';
    const desc = `BGA ${req.user!.name} posted: "${content.trim().slice(0, 70)}..." on project ${project.projectNumber}`;

    for (const tech of techUsers) {
      await createNotification(tech.id, title, desc, 'INFO', '/technical');
    }

    appCache.invalidatePrefix('technical:');
    appCache.invalidatePrefix('bga:');

    res.status(201).json({ message: 'Feedback recorded successfully.', feedback });
  } catch (error) {
    console.error('BGA feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// ==========================================
// 7.1 Final Payment Follow-Up Management (Stage 2)
// ==========================================
router.get('/projects/:id/final-payment-follow-ups', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await prisma.technicalProject.findUnique({
      where: { id },
      include: { workOrder: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.workOrder.bgaId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Unauthorized to view follow-ups for this project' });
      return;
    }

    const followUps = await prisma.finalPaymentFollowUp.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        bga: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ followUps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

router.post('/projects/:id/final-payment-follow-ups', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      contactMethod,
      clientResponse,
      notes,
      expectedPaymentDate,
      expectedAmount,
      status,
    } = req.body;

    if (!notes || !notes.trim()) {
      res.status(400).json({ error: 'Follow-up notes are required' });
      return;
    }

    const project = await prisma.technicalProject.findUnique({
      where: { id },
      include: { workOrder: true, client: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.workOrder.bgaId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Unauthorized to record follow-up for this project' });
      return;
    }

    const followUp = await prisma.finalPaymentFollowUp.create({
      data: {
        projectId: id,
        clientId: project.clientId,
        bgaId: req.user!.id,
        contactMethod: contactMethod || 'CALL',
        clientResponse: clientResponse ? clientResponse.trim() : null,
        notes: notes.trim(),
        expectedPaymentDate: expectedPaymentDate ? new Date(expectedPaymentDate) : null,
        expectedAmount: expectedAmount ? parseFloat(expectedAmount) : null,
        status: status || 'CLIENT_CONTACTED',
      },
      include: {
        bga: { select: { id: true, name: true, email: true } },
      },
    });

    // Also record into Client Follow-up & Activity History
    await prisma.contactActivity.create({
      data: {
        clientId: project.clientId,
        bgaId: req.user!.id,
        contactMethod: contactMethod || 'CALL',
        discussionSummary: `Final Payment Follow-up [${(status || 'CLIENT_CONTACTED').replace(/_/g, ' ')}]: ${notes.trim().slice(0, 150)}${expectedPaymentDate ? ` • Promised by ${new Date(expectedPaymentDate).toLocaleDateString('en-IN')}` : ''}${expectedAmount ? ` • Amount: ₹${parseFloat(expectedAmount).toLocaleString('en-IN')}` : ''}`,
        followUpNotes: clientResponse ? `Client Response: ${clientResponse.trim()}` : null,
        nextFollowUpDate: expectedPaymentDate ? new Date(expectedPaymentDate) : null,
        outcome: status || 'PAYMENT_FOLLOW_UP',
        createdBy: req.user!.name || 'BGA',
      },
    });

    // Notify Accounts and Admin when payment is promised or commitment made
    const isPaymentCommitment = status === 'PAYMENT_PROMISED' || status === 'CLIENT_CONFIRMED_PAYMENT' || !!expectedPaymentDate;
    if (isPaymentCommitment) {
      const expDateStr = expectedPaymentDate ? new Date(expectedPaymentDate).toLocaleDateString('en-IN') : 'promised date';
      const expAmtStr = expectedAmount ? `₹${parseFloat(expectedAmount).toLocaleString('en-IN')}` : 'outstanding balance';

      const accountsUsers = await prisma.user.findMany({ where: { role: Role.ACCOUNTS } });
      for (const acc of accountsUsers) {
        await createNotification(
          acc.id,
          'Client Payment Commitment Recorded',
          `BGA ${req.user!.name} recorded payment commitment for project ${project.projectNumber} (${project.client.clientName}). Expected: ${expAmtStr} on ${expDateStr}. Notes: "${notes.trim().slice(0, 60)}..."`,
          'INFO',
          `/accounts?tab=final-payments&projectId=${project.id}`
        );
      }

      const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
      for (const a of admins) {
        await createNotification(
          a.id,
          'BGA Recorded Final Payment Follow-up',
          `BGA ${req.user!.name} updated payment follow-up for ${project.projectNumber} (${project.client.clientName}): [${status}] Expected ${expAmtStr} by ${expDateStr}.`,
          'INFO',
          `/admin?tab=technical&projectId=${project.id}`
        );
      }
    }

    await logAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'FINAL_PAYMENT_FOLLOW_UP_RECORDED',
      'PROJECT',
      id,
      { status, contactMethod, expectedPaymentDate, expectedAmount },
      req.ip
    );

    appCache.invalidatePrefix('bga:');
    appCache.invalidatePrefix('accounts:');
    appCache.invalidatePrefix('admin:');

    res.status(201).json({ message: 'Follow-up recorded successfully', followUp });
  } catch (error) {
    console.error('Follow-up error:', error);
    res.status(500).json({ error: 'Failed to record follow-up' });
  }
});

// 8. Commissions & Complete My Earnings Performance Dashboard
router.get('/earnings-dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bgaId = req.user!.id;

    // 1. Overall Performance Summary (11 core metrics)
    const [
      totalClients,
      activeClients,
      totalServiceRequests,
      approvedRequests,
      quotationsPrepared,
      quotationsAccepted,
      workOrdersCount,
      advanceVerifiedOrders,
      projectsReleased,
      projectsInProgress,
      projectsCompleted,
      verifiedPayments,
      commissions,
    ] = await Promise.all([
      prisma.client.count({ where: { bgaId } }),
      prisma.client.count({ where: { bgaId, status: 'ACTIVE' } }),
      prisma.enquiry.count({ where: { bgaId } }),
      prisma.enquiry.count({ where: { bgaId, status: 'APPROVED' } }),
      prisma.quotation.count({
        where: {
          bgaId,
          status: { in: ['PREPARED', 'PENDING_ADMIN_APPROVAL', 'ADMIN_APPROVED', 'SENT_TO_BGA', 'ACCEPTED', 'REVISION_REQUESTED'] },
        },
      }),
      prisma.quotation.count({ where: { bgaId, status: QuotationStatus.ACCEPTED } }),
      prisma.workOrder.count({ where: { bgaId } }),
      prisma.workOrder.count({ where: { bgaId, advanceVerified: true } }),
      prisma.technicalProject.count({ where: { workOrder: { bgaId } } }),
      prisma.technicalProject.count({
        where: {
          workOrder: { bgaId },
          status: { in: ['READY_TO_START', 'IN_PROGRESS', 'UNDER_REVIEW', 'CORRECTION_REQUIRED'] },
        },
      }),
      prisma.technicalProject.count({
        where: {
          workOrder: { bgaId },
          status: 'COMPLETED',
        },
      }),
      prisma.payment.findMany({
        where: {
          workOrder: { bgaId },
          status: 'VERIFIED',
        },
        select: {
          amount: true,
          adBudgetAmount: true,
          netServiceFee: true,
          workOrder: { select: { serviceCategory: true } },
        },
      }),
      prisma.commission.findMany({
        where: { bgaId },
        include: {
          client: { select: { id: true, clientName: true, businessName: true, email: true } },
          workOrder: { select: { id: true, workOrderNumber: true, totalValue: true, serviceCategory: true } },
          project: { select: { id: true, projectNumber: true, status: true, progressPercentage: true, completedAt: true } },
          payment: { select: { id: true, amount: true, transactionReference: true, paymentDate: true, paymentMethod: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Financial calculations strictly from verified payments & commissions
    const totalEligibleRevenue = verifiedPayments.reduce(
      (acc, p) => acc + (p.netServiceFee || Math.max(0, p.amount - (p.adBudgetAmount || 0))),
      0
    );

    let totalCommissionEarned = 0;
    let pendingCommission = 0;
    let commissionPaid = 0;
    let commissionPipeline = 0;

    for (const c of commissions) {
      if (c.eligibilityStatus === 'ELIGIBLE') {
        totalCommissionEarned += c.calculatedCommission;
        if (c.payoutStatus === 'UNPAID') {
          pendingCommission += c.calculatedCommission;
        } else if (c.payoutStatus === 'PROCESSED') {
          commissionPaid += c.calculatedCommission;
        }
      } else if (c.eligibilityStatus === 'PENDING_CRITERIA') {
        commissionPipeline += c.calculatedCommission;
      }
    }

    // 2. Service-Wise Business Performance
    const categories: ServiceCategoryType[] = [
      'DIGITAL_MARKETING',
      'WEBSITE_DEVELOPMENT',
      'MOBILE_APPLICATION_DEVELOPMENT',
      'SOFTWARE_DEVELOPMENT',
    ];

    const allEnquiries = await prisma.enquiry.findMany({
      where: { bgaId },
      select: { clientId: true, serviceCategory: true, status: true },
    });

    const allQuotations = await prisma.quotation.findMany({
      where: { bgaId },
      select: { serviceCategory: true, status: true },
    });

    const allProjects = await prisma.technicalProject.findMany({
      where: { workOrder: { bgaId } },
      select: { serviceCategory: true, status: true },
    });

    const servicePerformance = categories.map((cat) => {
      const catEnquiries = allEnquiries.filter((e) => e.serviceCategory === cat);
      const catClients = new Set(catEnquiries.map((e) => e.clientId)).size;
      const catRequests = catEnquiries.length;
      const catApproved = catEnquiries.filter((e) => e.status === 'APPROVED').length;
      const catQuotations = allQuotations.filter((q) => q.serviceCategory === cat);
      const catAccepted = catQuotations.filter((q) => q.status === 'ACCEPTED').length;
      const catProjects = allProjects.filter((p) => p.serviceCategory === cat);
      const catActiveProjects = catProjects.filter((p) => p.status !== 'COMPLETED').length;
      const catCompletedProjects = catProjects.filter((p) => p.status === 'COMPLETED').length;

      const catPayments = verifiedPayments.filter((p) => p.workOrder?.serviceCategory === cat);
      const catEligibleRev = catPayments.reduce(
        (acc, p) => acc + (p.netServiceFee || Math.max(0, p.amount - (p.adBudgetAmount || 0))),
        0
      );

      const catCommissions = commissions.filter((c) => c.serviceCategory === cat);
      const catCommEarned = catCommissions
        .filter((c) => c.eligibilityStatus === 'ELIGIBLE')
        .reduce((acc, c) => acc + c.calculatedCommission, 0);
      const catCommPending = catCommissions
        .filter((c) => c.eligibilityStatus === 'ELIGIBLE' && c.payoutStatus === 'UNPAID')
        .reduce((acc, c) => acc + c.calculatedCommission, 0);

      return {
        category: cat,
        clientCount: catClients,
        requestCount: catRequests,
        approvedRequests: catApproved,
        acceptedQuotations: catAccepted,
        activeProjects: catActiveProjects,
        completedProjects: catCompletedProjects,
        eligibleRevenue: catEligibleRev,
        commissionEarned: catCommEarned,
        pendingCommission: catCommPending,
      };
    });

    // 3. Business Conversion Funnel (11 stages)
    const funnel = [
      { step: 1, key: 'clientsAcquired', label: 'Clients Acquired', count: totalClients },
      { step: 2, key: 'requestsSubmitted', label: 'Service Requests Submitted', count: totalServiceRequests },
      { step: 3, key: 'requestsApproved', label: 'Admin Requests Approved', count: approvedRequests },
      { step: 4, key: 'quotationsPrepared', label: 'Official Quotations Prepared', count: quotationsPrepared },
      { step: 5, key: 'quotationsAccepted', label: 'Quotations Accepted', count: quotationsAccepted },
      { step: 6, key: 'workOrdersCreated', label: 'Work Orders Created', count: workOrdersCount },
      { step: 7, key: 'advancePaymentsVerified', label: 'Advance Payments Verified', count: advanceVerifiedOrders },
      { step: 8, key: 'projectsReleased', label: 'Technical Projects Released', count: projectsReleased },
      { step: 9, key: 'projectsCompleted', label: 'Projects Completed', count: projectsCompleted },
      { step: 10, key: 'eligiblePaymentsReceived', label: 'Eligible Payments Received', count: verifiedPayments.length },
      { step: 11, key: 'commissionsEligible', label: 'Commissions Eligible', count: commissions.filter((c) => c.eligibilityStatus === 'ELIGIBLE').length },
    ];

    res.json({
      summary: {
        totalClients,
        activeClients,
        totalServiceRequests,
        approvedRequests,
        quotationsAccepted,
        projectsInProgress,
        projectsCompleted,
        totalEligibleRevenue,
        totalCommissionEarned,
        pendingCommission,
        commissionPaid,
        commissionPipeline,
      },
      breakdown: {
        earned: totalCommissionEarned,
        pending: pendingCommission,
        paid: commissionPaid,
        pipeline: commissionPipeline,
      },
      servicePerformance,
      funnel,
      commissions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate earnings dashboard metrics' });
  }
});

// 8b. Commissions & My Earnings
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

