/**
 * Enterprise SMS Service for Atriowings BGA Registration OTP Verification
 * Supports:
 * 1. Fast2SMS (Indian DLT/Quick OTP Gateway)
 * 2. Twilio (Global SMS API)
 * 3. Generic HTTP Webhook Gateway
 * 4. Development test provider (when explicitly enabled via SMS_PROVIDER="dev-test")
 */

export interface SendSmsOptions {
  to: string; // E.164 formatted international mobile number, e.g. +919876543210
  otp: string;
  name?: string;
  expiryMinutes?: number;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string; // +919876543210
  nationalNumber: string; // 9876543210
  countryCode: string; // +91
  error?: string;
}

/**
 * Validates and normalizes phone numbers.
 * Defaults to India (+91) with standard 10-digit validation (starting with 6-9).
 */
export function validateAndNormalizePhone(rawMobile: string, countryCode = '+91'): PhoneValidationResult {
  if (!rawMobile || typeof rawMobile !== 'string') {
    return {
      valid: false,
      normalized: '',
      nationalNumber: '',
      countryCode,
      error: 'Mobile phone number is required.',
    };
  }

  // Strip all non-digit characters except leading plus
  let cleaned = rawMobile.trim().replace(/[\s\-\(\)\.]/g, '');

  let nationalNumber = cleaned;
  let detectedCountryCode = countryCode;

  if (cleaned.startsWith('+91')) {
    nationalNumber = cleaned.slice(3);
    detectedCountryCode = '+91';
  } else if (cleaned.startsWith('0091')) {
    nationalNumber = cleaned.slice(4);
    detectedCountryCode = '+91';
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    nationalNumber = cleaned.slice(2);
    detectedCountryCode = '+91';
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    nationalNumber = cleaned.slice(1);
    detectedCountryCode = '+91';
  } else if (cleaned.startsWith('+')) {
    // Other international country codes
    const match = cleaned.match(/^(\+\d{1,4})(\d{6,14})$/);
    if (match) {
      detectedCountryCode = match[1];
      nationalNumber = match[2];
    }
  }

  // Digits-only national number check
  nationalNumber = nationalNumber.replace(/\D/g, '');

  if (detectedCountryCode === '+91') {
    if (nationalNumber.length !== 10) {
      return {
        valid: false,
        normalized: '',
        nationalNumber,
        countryCode: detectedCountryCode,
        error: 'Indian mobile numbers must be exactly 10 digits.',
      };
    }

    if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
      return {
        valid: false,
        normalized: '',
        nationalNumber,
        countryCode: detectedCountryCode,
        error: 'Indian mobile number must start with 6, 7, 8, or 9.',
      };
    }
  } else {
    // Generic E.164 length check (7 to 15 digits)
    if (nationalNumber.length < 7 || nationalNumber.length > 15) {
      return {
        valid: false,
        normalized: '',
        nationalNumber,
        countryCode: detectedCountryCode,
        error: 'Invalid international phone number length.',
      };
    }
  }

  return {
    valid: true,
    normalized: `${detectedCountryCode}${nationalNumber}`,
    nationalNumber,
    countryCode: detectedCountryCode,
  };
}

/**
 * Sends OTP via configured SMS Gateway.
 * If credentials are not configured, returns a clear error rather than faking delivery.
 */
export async function sendMobileOtp(options: SendSmsOptions): Promise<SendSmsResult> {
  const { to, otp, expiryMinutes = 5 } = options;

  const phoneInfo = validateAndNormalizePhone(to);
  if (!phoneInfo.valid) {
    return {
      success: false,
      error: phoneInfo.error || 'Invalid destination phone number.',
    };
  }

  const provider = (process.env.SMS_PROVIDER || '').toLowerCase().trim();
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
  const genericGatewayUrl = process.env.SMS_GATEWAY_URL;

  // 1. Fast2SMS Provider (India)
  if (provider === 'fast2sms' || (!provider && fast2SmsKey)) {
    if (!fast2SmsKey) {
      return {
        success: false,
        error: 'Fast2SMS configuration error: Missing FAST2SMS_API_KEY in environment variables.',
      };
    }

    try {
      // Fast2SMS OTP Route
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: phoneInfo.nationalNumber,
        }),
      });

      const data: any = await response.json().catch(() => ({}));
      if (response.ok && data.return === true) {
        console.log(`[SMS Gateway] Fast2SMS OTP dispatched to ${phoneInfo.normalized.slice(0, 7)}**** | RequestID: ${data.request_id}`);
        return {
          success: true,
          messageId: data.request_id || 'fast2sms-ok',
        };
      } else {
        const errorMsg = data.message?.[0] || data.message || 'Fast2SMS dispatch failed';
        console.error(`[SMS Gateway Error] Fast2SMS rejected: ${errorMsg}`);
        return {
          success: false,
          error: `SMS provider delivery failed: ${errorMsg}`,
        };
      }
    } catch (err: any) {
      console.error('[SMS Gateway Error] Network failure connecting to Fast2SMS:', err?.message || err);
      return {
        success: false,
        error: 'Network error connecting to SMS gateway service.',
      };
    }
  }

  // 2. Twilio Provider
  if (provider === 'twilio' || (!provider && twilioSid && twilioToken)) {
    if (!twilioSid || !twilioToken || !twilioFrom) {
      return {
        success: false,
        error: 'Twilio configuration error: Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER.',
      };
    }

    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const body = new URLSearchParams({
        From: twilioFrom,
        To: phoneInfo.normalized,
        Body: `Your Atriowings BGA verification code is ${otp}. Valid for ${expiryMinutes} minutes. Do not share this OTP with anyone.`,
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data: any = await response.json().catch(() => ({}));
      if (response.ok && data.sid) {
        console.log(`[SMS Gateway] Twilio OTP dispatched to ${phoneInfo.normalized.slice(0, 7)}**** | SID: ${data.sid}`);
        return {
          success: true,
          messageId: data.sid,
        };
      } else {
        const errorMsg = data.message || `Twilio status ${response.status}`;
        console.error(`[SMS Gateway Error] Twilio rejected: ${errorMsg}`);
        return {
          success: false,
          error: `Twilio delivery failed: ${errorMsg}`,
        };
      }
    } catch (err: any) {
      console.error('[SMS Gateway Error] Network failure connecting to Twilio:', err?.message || err);
      return {
        success: false,
        error: 'Network error connecting to Twilio SMS service.',
      };
    }
  }

  // 3. Generic Gateway URL
  if (provider === 'generic' || (!provider && genericGatewayUrl)) {
    if (!genericGatewayUrl) {
      return {
        success: false,
        error: 'Generic SMS configuration error: Missing SMS_GATEWAY_URL in environment.',
      };
    }

    try {
      const response = await fetch(genericGatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SMS_API_KEY ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          mobile: phoneInfo.normalized,
          nationalNumber: phoneInfo.nationalNumber,
          otp,
          message: `Your Atriowings BGA verification code is ${otp}. Valid for ${expiryMinutes} minutes.`,
        }),
      });

      if (response.ok) {
        return {
          success: true,
          messageId: `generic-${Date.now()}`,
        };
      } else {
        return {
          success: false,
          error: `Generic SMS provider returned HTTP ${response.status}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: 'Network failure communicating with custom SMS gateway.',
      };
    }
  }

  // 4. Development Test Provider (ONLY when explicitly enabled via SMS_PROVIDER="dev-test")
  if (provider === 'dev-test') {
    console.log(`[SMS Gateway (dev-test)] Emulated SMS OTP to ${phoneInfo.normalized} (expires in ${expiryMinutes}m)`);
    return {
      success: true,
      messageId: `dev-test-${Date.now()}`,
    };
  }

  // 5. No SMS Provider Configured
  console.warn('[SMS Gateway] Attempted to dispatch SMS OTP, but no SMS provider credentials are configured in environment variables.');
  return {
    success: false,
    error: 'SMS Gateway is not configured. Missing SMS provider credentials (FAST2SMS_API_KEY or TWILIO_ACCOUNT_SID) in server environment. Please contact support.',
  };
}
