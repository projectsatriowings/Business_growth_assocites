import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role, BgaStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { authenticateJWT, AuthRequest, logAudit, createNotification } from '../middleware/auth';
import { sendBgaWelcomeEmail, sendBgaRegistrationAdminAlert, sendPasswordResetEmail } from '../utils/mailer';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bga_super_secret_jwt_key_2026_growth_portal_secure_auth';

/**
 * Generate sequential professional Associate ID: AT-BGA-1001, AT-BGA-1002, etc.
 */
async function getNextAssociateId(): Promise<string> {
  const START_ID = 1001;
  const bgasWithCustomId = await prisma.user.findMany({
    where: {
      id: {
        startsWith: 'AT-BGA-',
      },
    },
    select: {
      id: true,
    },
  });

  let maxSeq = START_ID - 1;
  for (const b of bgasWithCustomId) {
    const match = b.id.match(/^AT-BGA-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  if (maxSeq < START_ID) {
    const count = await prisma.user.count({ where: { role: Role.BGA } });
    return `AT-BGA-${START_ID + count}`;
  }

  return `AT-BGA-${maxSeq + 1}`;
}

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

    // Validate bank details if provided
    if (bankName || bankAccountHolder || bankAccountNumber || bankIfsc) {
      if (!bankName || !bankName.trim()) {
        res.status(400).json({ error: 'Bank name is required' });
        return;
      }
      if (!bankAccountHolder || !bankAccountHolder.trim()) {
        res.status(400).json({ error: 'Bank beneficiary name is required' });
        return;
      }
      if (!bankAccountNumber || !bankAccountNumber.trim()) {
        res.status(400).json({ error: 'Bank account number is required' });
        return;
      }
      if (!bankIfsc || !bankIfsc.trim()) {
        res.status(400).json({ error: 'Bank IFSC code is required' });
        return;
      }
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

    // Generate sequential professional Associate ID (e.g. AT-BGA-1001)
    const associateId = await getNextAssociateId();

    // Initial Registration Workflow Status: SUBMITTED
    const newBga = await prisma.user.create({
      data: {
        id: associateId,
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

    // Dispatch SMTP Emails asynchronously
    sendBgaWelcomeEmail({
      id: newBga.id,
      name: newBga.name,
      email: newBga.email,
      mobile: newBga.mobile,
    }).catch((err) => console.error('Failed to send BGA welcome email:', err));

    sendBgaRegistrationAdminAlert({
      id: newBga.id,
      name: newBga.name,
      email: newBga.email,
      mobile: newBga.mobile,
      city: newBga.city,
      state: newBga.state,
    }).catch((err) => console.error('Failed to send BGA registration admin alert email:', err));

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

// In-memory rate limiting for sensitive password recovery actions
const resetRateLimits = new Map<string, { count: number; firstAttempt: number }>();

function checkResetRateLimit(key: string, limit: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const record = resetRateLimits.get(key);

  if (!record || now - record.firstAttempt > windowMs) {
    resetRateLimits.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

// 4. Request Password Reset (Public / Anti-Enumeration)
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Please enter a valid registered email address.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';

    // Rate Limiting by IP and email
    if (!checkResetRateLimit(`forgot_ip_${clientIp}`) || !checkResetRateLimit(`forgot_email_${normalizedEmail}`)) {
      res.status(429).json({
        error: 'Too many password reset requests. Please wait 15 minutes before trying again.',
      });
      return;
    }

    // Generic response message to prevent account enumeration
    const genericResponse = {
      message: 'If an account exists for this email address, you will receive password reset instructions shortly.',
    };

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Do not reveal that the account does not exist
      res.json(genericResponse);
      return;
    }

    // Invalidate previous unconsumed tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate cryptographically secure token (32 bytes)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes validity

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Determine application reset URL
    const rawOrigin = req.headers.origin || req.headers.referer || process.env.APP_URL || 'http://localhost:5173';
    let appBaseUrl = 'http://localhost:5173';
    try {
      const parsedUrl = new URL(typeof rawOrigin === 'string' ? rawOrigin : 'http://localhost:5173');
      appBaseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch {
      appBaseUrl = process.env.APP_URL || 'http://localhost:5173';
    }

    const resetLink = `${appBaseUrl}/reset-password?token=${rawToken}`;

    // Dispatch branded SMTP email asynchronously
    sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      resetLink,
      ip: clientIp,
    }).catch((err) => {
      console.error('[Mailer] Error delivering password reset email:', err);
    });

    // Audit log
    await logAudit(
      user.id,
      user.email,
      user.role,
      'PASSWORD_RESET_REQUESTED',
      'USER',
      user.id,
      { clientIp },
      clientIp
    );

    res.json(genericResponse);
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal error processing password reset request.' });
  }
});

// 5. Verify Password Reset Token (Checks validity without consuming token)
router.get('/verify-reset-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ valid: false, error: 'A reset token is required.' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!resetRecord) {
      res.status(400).json({
        valid: false,
        error: 'This password reset link is invalid. Please request a new link.',
      });
      return;
    }

    if (resetRecord.usedAt !== null) {
      res.status(400).json({
        valid: false,
        error: 'This password reset link has already been used. Please request a new link.',
      });
      return;
    }

    if (new Date() > resetRecord.expiresAt) {
      res.status(400).json({
        valid: false,
        error: 'This password reset link has expired (valid for 30 minutes). Please request a new link.',
      });
      return;
    }

    // Mask email for user verification
    const [local, domain] = resetRecord.user.email.split('@');
    const maskedEmail = `${local.charAt(0)}${'*'.repeat(Math.max(local.length - 2, 2))}${local.slice(-1)}@${domain}`;

    res.json({
      valid: true,
      email: maskedEmail,
      name: resetRecord.user.name,
      role: resetRecord.user.role,
    });
  } catch (error: any) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ valid: false, error: 'Failed to verify reset token.' });
  }
});

// 6. Complete Password Reset
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Reset token is required.' });
      return;
    }

    if (!newPassword || !confirmPassword) {
      res.status(400).json({ error: 'New password and confirmation are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New passwords do not match. Please verify and try again.' });
      return;
    }

    // Password Complexity Rules: minimum 6 characters, upper, lower, number, special char
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      res.status(400).json({
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt !== null || new Date() > resetRecord.expiresAt) {
      res.status(400).json({
        error: 'This password reset link is invalid or has expired. Please request a new link.',
      });
      return;
    }

    // Hash new password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user password and consume token atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          updatedAt: new Date(),
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Remove any other unused tokens for this user
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetRecord.userId,
          id: { not: resetRecord.id },
        },
      }),
    ]);

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';

    // Audit log
    await logAudit(
      resetRecord.user.id,
      resetRecord.user.email,
      resetRecord.user.role,
      'PASSWORD_RESET_COMPLETED',
      'USER',
      resetRecord.user.id,
      { clientIp },
      clientIp
    );

    res.json({
      success: true,
      message: 'Password has been successfully reset. You can now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// 7. Authenticated Change Password (from profile / account settings)
router.post('/change-password', authenticateJWT, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ error: 'Current password, new password, and confirmation are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New password and confirmation do not match.' });
      return;
    }

    // Password Complexity
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      res.status(400).json({
        error: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    // Verify current password
    const isCurrentMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentMatch) {
      res.status(400).json({ error: 'Your current password was entered incorrectly.' });
      return;
    }

    // Disallow setting the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      res.status(400).json({ error: 'Your new password cannot be identical to your current password.' });
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    // Invalidate any outstanding reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';

    // Audit log
    await logAudit(
      user.id,
      user.email,
      user.role,
      'USER_PASSWORD_CHANGED',
      'USER',
      user.id,
      { clientIp },
      clientIp
    );

    res.json({
      success: true,
      message: 'Your password has been changed successfully.',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

export default router;

