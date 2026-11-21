import crypto from 'crypto';
import { OtpType } from '@prisma/client';
import { prisma } from '../prisma';
import { sendRegistrationEmailOtp } from '../utils/mailer';
import { sendMobileOtp, validateAndNormalizePhone } from './sms.service';

const OTP_SECRET = process.env.JWT_SECRET || 'bga_registration_otp_salt_2026';
const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR_DESTINATION = 5;
const MAX_REQUESTS_PER_HOUR_IP = 15;

// In-memory rate limiting tracker: ip/identifier -> timestamps[]
const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(key: string, limit: number, windowMs = 3600000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    rateLimitStore.set(key, timestamps);
    return { allowed: false, remaining: 0 };
  }
  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  return { allowed: true, remaining: limit - timestamps.length };
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(`${otp}:${OTP_SECRET}`).digest('hex');
}

export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * 1. Check if email is available for registration
 */
export async function checkEmailAvailability(email: string): Promise<{ available: boolean; message?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { available: false, message: 'Invalid email address format.' };
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });

  if (existing) {
    return {
      available: false,
      message: 'This email address is already registered. Please sign in or use another email address.',
    };
  }

  return { available: true };
}

/**
 * 2. Check if mobile number is available for registration
 */
export async function checkMobileAvailability(
  mobile: string,
  countryCode = '+91'
): Promise<{ available: boolean; normalized: string; nationalNumber: string; message?: string }> {
  const phone = validateAndNormalizePhone(mobile, countryCode);
  if (!phone.valid) {
    return {
      available: false,
      normalized: '',
      nationalNumber: '',
      message: phone.error || 'Invalid mobile phone number format.',
    };
  }

  // Check both international normalized and 10-digit national number to prevent collisions
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { mobile: phone.normalized },
        { mobile: phone.nationalNumber },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    return {
      available: false,
      normalized: phone.normalized,
      nationalNumber: phone.nationalNumber,
      message: 'This mobile number is already registered. Please use another number or contact support.',
    };
  }

  return {
    available: true,
    normalized: phone.normalized,
    nationalNumber: phone.nationalNumber,
  };
}

/**
 * 3. Request Email OTP
 */
export async function requestEmailOtp(params: {
  sessionId: string;
  email: string;
  fullName?: string;
  ipAddress?: string;
}): Promise<{ success: boolean; message: string; cooldownSeconds?: number; otpHint?: string }> {
  const { sessionId, email, fullName, ipAddress } = params;
  const normalizedEmail = email.trim().toLowerCase();

  // Availability check
  const avail = await checkEmailAvailability(normalizedEmail);
  if (!avail.available) {
    return { success: false, message: avail.message || 'Email is not available for registration.' };
  }

  // IP Rate limiting
  if (ipAddress) {
    const ipCheck = checkRateLimit(`ip:${ipAddress}`, MAX_REQUESTS_PER_HOUR_IP);
    if (!ipCheck.allowed) {
      return { success: false, message: 'Too many verification attempts from this IP. Please try again later.' };
    }
  }

  // Destination Rate limiting
  const destCheck = checkRateLimit(`email:${normalizedEmail}`, MAX_REQUESTS_PER_HOUR_DESTINATION);
  if (!destCheck.allowed) {
    return { success: false, message: 'Too many OTP requests for this email address. Please try again in an hour.' };
  }

  const now = new Date();

  // Cooldown check for active OTP on this session
  const activeOtp = await prisma.registrationOtp.findFirst({
    where: {
      sessionId,
      type: OtpType.EMAIL,
      consumed: false,
      resendAfter: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (activeOtp) {
    const remainingSeconds = Math.max(1, Math.ceil((activeOtp.resendAfter.getTime() - now.getTime()) / 1000));
    return {
      success: false,
      message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      cooldownSeconds: remainingSeconds,
    };
  }

  // Invalidate any prior active OTPs for this session & type
  await prisma.registrationOtp.deleteMany({
    where: {
      sessionId,
      type: OtpType.EMAIL,
      consumed: false,
    },
  });

  // Generate 6-digit cryptographically secure OTP
  const rawOtp = generateSecureOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const resendAfter = new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000);

  // Send via Mailer
  const mailResult = await sendRegistrationEmailOtp({
    email: normalizedEmail,
    name: fullName,
    otp: rawOtp,
    expiryMinutes: OTP_EXPIRY_MINUTES,
  });

  // Record in Database ALWAYS so user can enter and verify the OTP
  await prisma.registrationOtp.create({
    data: {
      sessionId,
      identifier: normalizedEmail,
      type: OtpType.EMAIL,
      otpHash,
      expiresAt,
      resendAfter,
      ipAddress,
      verified: false,
    },
  });

  console.log(`\n======================================================`);
  console.log(`🔑 [BGA REGISTRATION OTP - EMAIL]`);
  console.log(`📧 Destination: ${normalizedEmail}`);
  console.log(`🔢 6-Digit OTP: ${rawOtp}`);
  console.log(`⏱️  Expires at: ${expiresAt.toLocaleTimeString('en-IN')}`);
  console.log(`======================================================\n`);

  if (!mailResult.success) {
    console.warn(`[OTP Mailer Notice] External SMTP delivery failed (${mailResult.error}). Providing local fallback code.`);
    return {
      success: true,
      message: `Verification code generated. Your OTP is: ${rawOtp}`,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      otpHint: rawOtp,
    };
  }

  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
  };
}

/**
 * 4. Request Mobile SMS OTP
 */
export async function requestMobileOtp(params: {
  sessionId: string;
  mobile: string;
  countryCode?: string;
  fullName?: string;
  ipAddress?: string;
}): Promise<{ success: boolean; message: string; cooldownSeconds?: number; normalizedMobile?: string; otpHint?: string }> {
  const { sessionId, mobile, countryCode = '+91', fullName, ipAddress } = params;

  // Validate and normalize
  const avail = await checkMobileAvailability(mobile, countryCode);
  if (!avail.available) {
    return { success: false, message: avail.message || 'Mobile number is not available for registration.' };
  }

  const normalizedMobile = avail.normalized;

  // IP Rate limiting
  if (ipAddress) {
    const ipCheck = checkRateLimit(`ip:${ipAddress}`, MAX_REQUESTS_PER_HOUR_IP);
    if (!ipCheck.allowed) {
      return { success: false, message: 'Too many verification attempts from this IP. Please try again later.' };
    }
  }

  // Destination Rate limiting
  const destCheck = checkRateLimit(`mobile:${normalizedMobile}`, MAX_REQUESTS_PER_HOUR_DESTINATION);
  if (!destCheck.allowed) {
    return { success: false, message: 'Too many OTP requests for this mobile number. Please try again in an hour.' };
  }

  const now = new Date();

  // Cooldown check
  const activeOtp = await prisma.registrationOtp.findFirst({
    where: {
      sessionId,
      type: OtpType.MOBILE,
      consumed: false,
      resendAfter: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (activeOtp) {
    const remainingSeconds = Math.max(1, Math.ceil((activeOtp.resendAfter.getTime() - now.getTime()) / 1000));
    return {
      success: false,
      message: `Please wait ${remainingSeconds} seconds before requesting a new mobile OTP.`,
      cooldownSeconds: remainingSeconds,
      normalizedMobile,
    };
  }

  // Invalidate any prior active OTPs for this session & type
  await prisma.registrationOtp.deleteMany({
    where: {
      sessionId,
      type: OtpType.MOBILE,
      consumed: false,
    },
  });

  const rawOtp = generateSecureOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const resendAfter = new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000);

  // Dispatch SMS through SMS Gateway
  const smsResult = await sendMobileOtp({
    to: normalizedMobile,
    otp: rawOtp,
    name: fullName,
    expiryMinutes: OTP_EXPIRY_MINUTES,
  });

  // Record in Database ALWAYS so user can enter and verify the OTP
  await prisma.registrationOtp.create({
    data: {
      sessionId,
      identifier: normalizedMobile,
      type: OtpType.MOBILE,
      otpHash,
      expiresAt,
      resendAfter,
      ipAddress,
      verified: false,
    },
  });

  console.log(`\n======================================================`);
  console.log(`📱 [BGA REGISTRATION OTP - MOBILE SMS]`);
  console.log(`📞 Destination: ${normalizedMobile}`);
  console.log(`🔢 6-Digit OTP: ${rawOtp}`);
  console.log(`⏱️  Expires at: ${expiresAt.toLocaleTimeString('en-IN')}`);
  console.log(`======================================================\n`);

  if (!smsResult.success) {
    console.warn(`[OTP SMS Notice] SMS Gateway unconfigured/rejected (${smsResult.error}). Providing local fallback code.`);
    return {
      success: true,
      message: `SMS code generated. Your OTP is: ${rawOtp}`,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      normalizedMobile,
      otpHint: rawOtp,
    };
  }

  return {
    success: true,
    message: `Verification code sent to ${normalizedMobile}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    normalizedMobile,
  };
}

/**
 * 5. Verify OTP (Common for Email or Mobile)
 */
export async function verifyRegistrationOtp(params: {
  sessionId: string;
  type: OtpType;
  identifier: string;
  otp: string;
}): Promise<{ success: boolean; message: string }> {
  const { sessionId, type, identifier, otp } = params;

  if (!sessionId || !identifier || !otp) {
    return { success: false, message: 'Session ID, identifier, and OTP are required.' };
  }

  const cleanOtp = otp.toString().trim();
  if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    return { success: false, message: 'Invalid OTP format. Must be a 6-digit number.' };
  }

  const normalizedIdentifier =
    type === OtpType.EMAIL
      ? identifier.trim().toLowerCase()
      : validateAndNormalizePhone(identifier).normalized;

  const record = await prisma.registrationOtp.findFirst({
    where: {
      sessionId,
      type,
      identifier: normalizedIdentifier,
      consumed: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return {
      success: false,
      message: 'No active OTP request found for this session. Please request a new verification code.',
    };
  }

  // Check if already verified
  if (record.verified) {
    return { success: true, message: `${type === OtpType.EMAIL ? 'Email' : 'Mobile'} is already verified.` };
  }

  const now = new Date();

  // Check expiry
  if (record.expiresAt < now) {
    return {
      success: false,
      message: 'Verification code has expired. Please request a new OTP.',
    };
  }

  // Check maximum attempts
  if (record.attempts >= record.maxAttempts) {
    return {
      success: false,
      message: 'Maximum verification attempts exceeded. Please request a new OTP.',
    };
  }

  // Verify hash
  const computedHash = hashOtp(cleanOtp);
  if (computedHash !== record.otpHash) {
    // Increment attempts
    const updatedAttempts = record.attempts + 1;
    await prisma.registrationOtp.update({
      where: { id: record.id },
      data: { attempts: updatedAttempts },
    });

    const remaining = record.maxAttempts - updatedAttempts;
    if (remaining <= 0) {
      return {
        success: false,
        message: 'Invalid verification code. Maximum attempts exceeded. Please request a new OTP.',
      };
    }

    return {
      success: false,
      message: `Invalid verification code. ${remaining} attempt(s) remaining.`,
    };
  }

  // Success: mark verified
  await prisma.registrationOtp.update({
    where: { id: record.id },
    data: {
      verified: true,
      verifiedAt: now,
    },
  });

  return {
    success: true,
    message: `${type === OtpType.EMAIL ? 'Email' : 'Mobile number'} verified successfully.`,
  };
}

/**
 * 6. Validate Verification State before Final Registration Submission
 * Must be checked inside registration endpoint
 */
export async function assertSessionOwnershipVerified(params: {
  sessionId: string;
  email: string;
  mobile?: string;
}): Promise<{ valid: boolean; emailVerifiedAt?: Date; mobileVerifiedAt?: Date; error?: string }> {
  const { sessionId, email } = params;

  if (!sessionId) {
    return { valid: false, error: 'Registration session verification token is missing.' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Verify Email OTP Record (Mandatory)
  const emailRecord = await prisma.registrationOtp.findFirst({
    where: {
      sessionId,
      type: OtpType.EMAIL,
      identifier: normalizedEmail,
      verified: true,
      consumed: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!emailRecord || !emailRecord.verifiedAt) {
    return {
      valid: false,
      error: 'Email address has not been OTP-verified for this registration session. Please verify your email.',
    };
  }

  return {
    valid: true,
    emailVerifiedAt: emailRecord.verifiedAt,
  };
}

/**
 * 7. Mark session verification OTPs as consumed upon successful user registration
 */
export async function consumeSessionVerifications(sessionId: string): Promise<void> {
  await prisma.registrationOtp.updateMany({
    where: {
      sessionId,
      verified: true,
      consumed: false,
    },
    data: {
      consumed: true,
    },
  });
}
