import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, BgaStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, AuthRequest, logAudit, createNotification } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bga_super_secret_jwt_key_2026_growth_portal_secure_auth';

// 1. Unified Multi-Role Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, portalRole } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. User does not exist.' });
      return;
    }

    // Role check if logging in via a role-specific portal
    if (portalRole && user.role !== portalRole) {
      res.status(403).json({
        error: `Unauthorized portal access. Your registered role is ${user.role}, but you are attempting to login to the ${portalRole} portal.`,
      });
      return;
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
      return;
    }

    // BGA Status Check
    if (user.role === Role.BGA) {
      if (user.status === BgaStatus.SUSPENDED) {
        res.status(403).json({ error: 'Your account is suspended. Please contact Company Administration.' });
        return;
      }
      if (user.status === BgaStatus.REJECTED) {
        res.status(403).json({
          error: `Your registration was rejected. Reason: ${user.rejectionReason || 'Documents did not meet criteria.'}`,
        });
        return;
      }
      if (user.status !== BgaStatus.ACTIVE) {
        res.status(403).json({
          error: `Account is pending approval. Current status: ${user.status}. Active portal access is granted only after Admin verification.`,
          status: user.status,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.status,
            panVerified: user.panVerified,
            aadhaarVerified: user.aadhaarVerified,
            bankVerified: user.bankVerified,
          },
        });
        return;
      }
    }

    // Update Last Login Timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit Log
    await logAudit(
      user.id,
      user.email,
      user.role,
      'USER_LOGIN_SUCCESS',
      'USER',
      user.id,
      { portal: portalRole || user.role },
      req.ip
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        status: user.status,
        panVerified: user.panVerified,
        aadhaarVerified: user.aadhaarVerified,
        bankVerified: user.bankVerified,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// 2. Public BGA Registration
router.post('/register-bga', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fullName,
      dob,
      address,
      city,
      state,
      pinCode,
      mobile,
      email,
      password,
      panNumber,
      aadhaarNumber,
      bankName,
      bankAccountHolder,
      bankAccountNumber,
      bankIfsc,
      agreementAccepted,
    } = req.body;

    // Validations
    if (!fullName || !mobile || !email || !password) {
      res.status(400).json({ error: 'Full name, mobile, email, and password are required' });
      return;
    }

    if (!agreementAccepted) {
      res.status(400).json({ error: 'You must accept the terms, consent, and associate agreement' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.replace(/\D/g, '').slice(-10);

    if (normalizedMobile.length !== 10) {
      res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
      return;
    }

    // Check unique email and mobile
    const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail) {
      res.status(400).json({ error: 'An associate or user with this email address already exists.' });
      return;
    }

    const existingMobile = await prisma.user.findUnique({ where: { mobile: normalizedMobile } });
    if (existingMobile) {
      res.status(400).json({ error: 'An associate or user with this mobile number already exists.' });
      return;
    }

    // Validate PAN if provided
    let cleanPan = panNumber ? panNumber.trim().toUpperCase() : null;
    if (cleanPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      res.status(400).json({ error: 'Invalid PAN format. Standard format is 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)' });
      return;
    }

    // Secure Aadhaar Masking - Never store full Aadhaar number or OTPs as per compliance
    let maskedAadhaar = null;
    if (aadhaarNumber) {
      const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
      if (cleanAadhaar.length === 12) {
        maskedAadhaar = `XXXX-XXXX-${cleanAadhaar.slice(-4)}`;
      } else {
        res.status(400).json({ error: 'Invalid Aadhaar number. Must be a 12-digit number.' });
        return;
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Initial Registration Workflow Status: SUBMITTED
    const newBga = await prisma.user.create({
      data: {
        name: fullName.trim(),
        email: normalizedEmail,
        mobile: normalizedMobile,
        passwordHash,
        role: Role.BGA,
        status: BgaStatus.SUBMITTED,
        dob: dob ? new Date(dob) : null,
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        pinCode: pinCode ? pinCode.trim() : null,
        panNumber: cleanPan,
        panVerified: false,
        aadhaarMasked: maskedAadhaar,
        aadhaarVerified: false, // Pending admin or authorized provider verification
        kycSubmittedAt: new Date(),
        bankName: bankName ? bankName.trim() : null,
        bankAccountHolder: bankAccountHolder ? bankAccountHolder.trim() : null,
        bankAccountNumber: bankAccountNumber ? bankAccountNumber.trim() : null,
        bankIfsc: bankIfsc ? bankIfsc.trim().toUpperCase() : null,
        bankVerified: false,
        agreementAccepted: true,
        agreementAcceptedAt: new Date(),
        panDocumentUrl: cleanPan ? `/uploads/documents/pan-${normalizedMobile}.pdf` : null,
        addressProofUrl: address ? `/uploads/documents/address-${normalizedMobile}.pdf` : null,
        bankProofUrl: bankAccountNumber ? `/uploads/documents/bank-${normalizedMobile}.pdf` : null,
        agreementDocumentUrl: `/uploads/documents/agreement-${normalizedMobile}.pdf`,
      },
    });

    // Notify Admins
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'New BGA Registration Submitted',
        `${newBga.name} (${newBga.email}) has registered and is awaiting verification & approval.`,
        'ACTION_REQUIRED',
        '/admin/bga-management'
      );
    }

    // Audit log
    await logAudit(
      newBga.id,
      newBga.email,
      Role.BGA,
      'BGA_REGISTRATION_SUBMITTED',
      'USER',
      newBga.id,
      { panNumber: cleanPan, maskedAadhaar },
      req.ip
    );

    res.status(201).json({
      message: 'Registration submitted successfully. Your account is pending company verification and approval.',
      status: BgaStatus.SUBMITTED,
      userId: newBga.id,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// 3. Get Current User Profile
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

export default router;

