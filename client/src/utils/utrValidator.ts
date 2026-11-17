/**
 * Bank Transaction / UTR (Unique Transaction Reference) Validation Engine (Client-side)
 * Supports standard Indian banking reference specifications:
 * - UPI: 12-digit numeric RRN (Retrieval Reference Number) or 12-character alphanumeric ID
 * - NEFT: 12-18 alphanumeric characters (e.g. CMS123456789012, AXISP26123456789)
 * - RTGS: 16-22 alphanumeric characters (e.g. PUNBR52026111712345678, HDFCR520261117001234)
 * - IMPS: 12-digit numeric reference
 * - CHEQUE: 6-10 digit clearance reference
 * - GENERAL / BANK_TRANSFER: 8-24 alphanumeric characters
 */

export interface UtrValidationResult {
  isValid: boolean;
  error?: string;
  formattedUtr: string;
  hint?: string;
}

export function validateBankUtr(rawReference: string | undefined | null, paymentMethod = 'BANK_TRANSFER'): UtrValidationResult {
  if (!rawReference || typeof rawReference !== 'string') {
    return {
      isValid: false,
      error: 'Bank Transaction / UTR Reference is required.',
      formattedUtr: '',
      hint: 'Please provide the transaction reference from your bank statement or payment receipt.',
    };
  }

  // Sanitize: Trim whitespace and uppercase
  const formatted = rawReference.trim().toUpperCase();

  if (formatted.length === 0) {
    return {
      isValid: false,
      error: 'Bank Transaction / UTR Reference cannot be empty.',
      formattedUtr: '',
    };
  }

  // Character set check: Alphanumeric and single hyphen only
  const legalCharsRegex = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
  if (!legalCharsRegex.test(formatted)) {
    return {
      isValid: false,
      error: 'Transaction reference can only contain uppercase letters, numbers, and hyphens without spaces.',
      formattedUtr: formatted,
      hint: 'Avoid spaces, punctuation, or special characters (e.g. @, #, $, /, .).',
    };
  }

  // Strip hyphens for content & repetition checks
  const stripped = formatted.replace(/-/g, '');

  // Anti-junk check: Must have at least 2 distinct characters (blocks 000000000000, 111111111111, XXXXXXXXXXXX)
  const uniqueChars = new Set(stripped);
  if (uniqueChars.size < 2 && stripped.length > 4) {
    return {
      isValid: false,
      error: 'Invalid UTR: Reference cannot consist of repeated identical dummy characters.',
      formattedUtr: formatted,
      hint: 'Enter the genuine bank transaction reference number.',
    };
  }

  const method = (paymentMethod || 'BANK_TRANSFER').toUpperCase();

  switch (method) {
    case 'UPI':
    case 'UPI_QR': {
      // Standard UPI RRN is 12 digits, or standard alphanumeric transaction ID (12 chars, or UPI- prefix max 16)
      if (stripped.length !== 12 && !(formatted.startsWith('UPI-') && stripped.length === 15)) {
        return {
          isValid: false,
          error: `UPI Reference must be exactly 12 digits (RRN) or alphanumeric characters. You entered ${stripped.length} characters.`,
          formattedUtr: formatted,
          hint: 'Example: 401234567890 (found in Google Pay, PhonePe, Paytm receipt as UPI Ref No / RRN).',
        };
      }
      return {
        isValid: true,
        formattedUtr: formatted,
        hint: 'Valid 12-digit UPI Transaction Reference / RRN.',
      };
    }

    case 'IMPS': {
      // Standard IMPS reference is 12 digits numeric
      if (stripped.length !== 12) {
        return {
          isValid: false,
          error: `IMPS Reference Number must be exactly 12 digits. You entered ${stripped.length} characters.`,
          formattedUtr: formatted,
          hint: 'Example: 432198765432 (12-digit IMPS Reference Number).',
        };
      }
      return {
        isValid: true,
        formattedUtr: formatted,
        hint: 'Valid 12-digit IMPS Reference Number.',
      };
    }

    case 'NEFT': {
      // Standard NEFT UTR is 12-18 alphanumeric characters
      if (stripped.length < 12 || stripped.length > 18) {
        return {
          isValid: false,
          error: `NEFT UTR reference must be between 12 and 18 alphanumeric characters. You entered ${stripped.length} characters.`,
          formattedUtr: formatted,
          hint: 'Example: AXISP26123456789 or CMS123456789012.',
        };
      }
      return {
        isValid: true,
        formattedUtr: formatted,
        hint: 'Valid NEFT Unique Transaction Reference (UTR).',
      };
    }

    case 'RTGS': {
      // Standard RBI RTGS UTR is 16-22 alphanumeric characters
      if (stripped.length < 16 || stripped.length > 22) {
        return {
          isValid: false,
          error: `RTGS UTR reference must be between 16 and 22 alphanumeric characters. You entered ${stripped.length} characters.`,
          formattedUtr: formatted,
          hint: 'Example: HDFCR520261117001234 or PUNBR52026111712345678.',
        };
      }
      return {
        isValid: true,
        formattedUtr: formatted,
        hint: 'Valid 22-character RBI RTGS Unique Transaction Reference.',
      };
    }

    case 'CHEQUE': {
      // Cheque number is 6-10 digits
      if (stripped.length < 6 || stripped.length > 10) {
        return {
          isValid: false,
          error: `Cheque Number must be between 6 and 10 digits. You entered ${stripped.length} digits.`,
          formattedUtr: formatted,
          hint: 'Example: 000123 (6-digit number at the bottom of the cheque leaf).',
        };
      }
      return {
        isValid: true,
        formattedUtr: formatted,
        hint: 'Valid 6-digit Bank Cheque Number.',
      };
    }

    default: {
      // General bank transfer or generic
      if (stripped.length < 8 || stripped.length > 24) {
        return {
          isValid: false,
          error: `Bank Transaction Reference must be between 8 and 24 characters. You entered ${stripped.length} characters.`,
          formattedUtr: formatted,
          hint: 'Enter the bank UTR, journal voucher, or IMPS/NEFT reference from the bank statement.',
        };
      }
      return {
        isValid: true,
        formattedUtr: formatted,
        hint: 'Valid Bank Transaction / UTR Reference.',
      };
    }
  }
}

/**
 * Returns dynamic helper and placeholder details based on selected payment method
 */
export function getUtrPlaceholderAndHint(paymentMethod: string): { placeholder: string; helper: string; expectedLength: string } {
  const method = (paymentMethod || 'BANK_TRANSFER').toUpperCase();
  switch (method) {
    case 'UPI':
      return {
        placeholder: 'e.g. 401234567890 (12-digit RRN)',
        helper: 'Enter the 12-digit UPI Reference Number / RRN from Google Pay, PhonePe, Paytm, or BHIM receipt.',
        expectedLength: '12 digits',
      };
    case 'NEFT':
      return {
        placeholder: 'e.g. AXISP26123456789 (16 chars)',
        helper: 'Enter the 16-character alphanumeric NEFT UTR reference from your corporate bank debit advice.',
        expectedLength: '12-18 chars',
      };
    case 'RTGS':
      return {
        placeholder: 'e.g. HDFCR520261117001234 (22 chars)',
        helper: 'Enter the 22-character RBI RTGS Unique Transaction Reference Number.',
        expectedLength: '16-22 chars',
      };
    case 'IMPS':
      return {
        placeholder: 'e.g. 432198765432 (12 digits)',
        helper: 'Enter the 12-digit IMPS Reference Number / RRN from mobile or net banking confirmation.',
        expectedLength: '12 digits',
      };
    case 'CHEQUE':
      return {
        placeholder: 'e.g. 000123 (6 digits)',
        helper: 'Enter the 6-digit cheque number printed at the bottom of the cheque leaf.',
        expectedLength: '6-10 digits',
      };
    default:
      return {
        placeholder: 'e.g. UTR123456789012',
        helper: 'Enter the official bank transaction reference or journal reference number.',
        expectedLength: '8-24 chars',
      };
  }
}
