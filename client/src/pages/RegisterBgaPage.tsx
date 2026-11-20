import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Mail,
  Phone,
  KeyRound,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { uploadPublicFile } from '../utils/api';

interface DocumentUploadFieldProps {
  label: string;
  required?: boolean;
  helpText: string;
  value: string;
  docName?: string;
  onUploaded: (url: string, name: string) => void;
  onRemove: () => void;
  error?: string;
}

const DocumentUploadField: React.FC<DocumentUploadFieldProps> = ({
  label,
  required,
  helpText,
  value,
  docName,
  onUploaded,
  onRemove,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploadError(null);
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File size exceeds 20MB limit.');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadPublicFile(file);
      onUploaded(res.url, file.name);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[#10244D]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Uploaded
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        className="hidden"
      />

      {value ? (
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#10244D] truncate">{docName || value.split('/').pop()}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">• Document ready for verification</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => window.open(value, '_blank')}
              className="px-2.5 py-1 text-[11px] font-bold text-[#0879E8] hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-[#60769B] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
            error || uploadError
              ? 'border-rose-300 bg-rose-50/20'
              : 'border-[#D6E2F2] bg-[#F5F9FF]/60 hover:border-[#0879E8] hover:bg-[#DCEBFF]/30'
          }`}
        >
          {uploading ? (
            <div className="py-1 flex items-center justify-center gap-2 text-xs font-semibold text-[#0879E8]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading document...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-[#60769B]">
              <Upload className="w-4 h-4 text-[#0879E8]" />
              <span className="font-semibold text-[#10244D]">Click to upload document</span>
              <span className="text-[10px] text-[#60769B]">(PDF, PNG, JPG max 20MB)</span>
            </div>
          )}
        </div>
      )}

      {uploadError || error ? (
        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{uploadError || error}</span>
        </p>
      ) : (
        <p className="text-[10px] text-[#60769B]">{helpText}</p>
      )}
    </div>
  );
};

export const RegisterBgaPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any | null>(null);

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field Errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [docMeta, setDocMeta] = useState<Record<string, { name: string }>>({});

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    panNumber: '',
    aadhaarNumber: '',
    bankName: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankIfsc: '',
    agreementAccepted: false,
    panDocumentUrl: '',
    addressProofUrl: '', // Aadhaar document
    bankProofUrl: '',    // Bank passbook
    agreementDocumentUrl: '',
  });

  // Unique Registration Session ID
  const [sessionId] = useState<string>(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `bga-sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  });

  // Email Verification State
  const [emailStatus, setEmailStatus] = useState<
    'IDLE' | 'CHECKING' | 'AVAILABLE' | 'OTP_SENDING' | 'OTP_SENT' | 'VERIFYING' | 'VERIFIED' | 'ALREADY_REGISTERED' | 'INVALID_OTP' | 'EXPIRED_OTP' | 'ERROR'
  >('IDLE');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  // Mobile Verification State
  const [mobileCountryCode, setMobileCountryCode] = useState('+91');
  const [mobileStatus, setMobileStatus] = useState<
    'IDLE' | 'CHECKING' | 'AVAILABLE' | 'OTP_SENDING' | 'OTP_SENT' | 'VERIFYING' | 'VERIFIED' | 'ALREADY_REGISTERED' | 'INVALID_OTP' | 'EXPIRED_OTP' | 'DELIVERY_FAILED' | 'ERROR'
  >('IDLE');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileCooldown, setMobileCooldown] = useState(0);
  const [mobileMessage, setMobileMessage] = useState<string | null>(null);
  const [verifiedMobile, setVerifiedMobile] = useState<string | null>(null);

  const isEmailVerified = emailStatus === 'VERIFIED' && verifiedEmail === formData.email.trim().toLowerCase();
  const isMobileVerified = mobileStatus === 'VERIFIED' && verifiedMobile === formData.mobile.replace(/\D/g, '').slice(-10);

  // Cooldown countdown timers
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const interval = setInterval(() => {
      setEmailCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [emailCooldown]);

  useEffect(() => {
    if (mobileCooldown <= 0) return;
    const interval = setInterval(() => {
      setMobileCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [mobileCooldown]);

  // Invalidate email verification on change
  const handleEmailChange = (val: string) => {
    setFormData((prev) => ({ ...prev, email: val }));
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
    if (emailStatus !== 'IDLE') {
      setEmailStatus('IDLE');
      setVerifiedEmail(null);
      setEmailOtp('');
      setEmailMessage(null);
    }
  };

  // Invalidate mobile verification on change
  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, mobile: clean }));
    if (fieldErrors.mobile) setFieldErrors((prev) => ({ ...prev, mobile: '' }));
    if (mobileStatus !== 'IDLE') {
      setMobileStatus('IDLE');
      setVerifiedMobile(null);
      setMobileOtp('');
      setMobileMessage(null);
    }
  };

  // 1. Check Email Availability
  const handleCheckEmail = async () => {
    setEmailMessage(null);
    const emailErr = validateField('email', formData.email);
    if (emailErr) {
      setFieldErrors((prev) => ({ ...prev, email: emailErr }));
      return;
    }

    setEmailStatus('CHECKING');
    try {
      const res = await fetch('/api/auth/verify/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.available) {
        setEmailStatus('AVAILABLE');
        setEmailMessage('Email address is available for registration.');
      } else {
        setEmailStatus('ALREADY_REGISTERED');
        setEmailMessage(data.message || 'This email address is already registered. Please sign in or use another email address.');
      }
    } catch {
      setEmailStatus('ERROR');
      setEmailMessage('Network error checking email availability.');
    }
  };

  // 2. Send Email OTP
  const handleSendEmailOtp = async () => {
    setEmailMessage(null);
    const emailErr = validateField('email', formData.email);
    if (emailErr) {
      setFieldErrors((prev) => ({ ...prev, email: emailErr }));
      return;
    }

    setEmailStatus('OTP_SENDING');
    try {
      const res = await fetch('/api/auth/verify/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          email: formData.email.trim().toLowerCase(),
          fullName: formData.fullName.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatus('OTP_SENT');
        setEmailCooldown(data.cooldownSeconds || 60);
        setEmailMessage(data.message || `Verification code sent to ${formData.email}. Valid for 5 minutes.`);
        setEmailOtp('');
      } else {
        if (data.message && data.message.includes('already registered')) {
          setEmailStatus('ALREADY_REGISTERED');
        } else {
          setEmailStatus('ERROR');
        }
        setEmailMessage(data.message || 'Failed to dispatch email verification OTP.');
        if (data.cooldownSeconds) setEmailCooldown(data.cooldownSeconds);
      }
    } catch {
      setEmailStatus('ERROR');
      setEmailMessage('Cannot connect to authentication service.');
    }
  };

  // 3. Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    setEmailMessage(null);
    const cleanOtp = emailOtp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setEmailStatus('INVALID_OTP');
      setEmailMessage('Please enter a valid 6-digit numeric verification code.');
      return;
    }

    setEmailStatus('VERIFYING');
    try {
      const res = await fetch('/api/auth/verify/confirm-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type: 'EMAIL',
          identifier: formData.email.trim().toLowerCase(),
          otp: cleanOtp,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatus('VERIFIED');
        setVerifiedEmail(formData.email.trim().toLowerCase());
        setEmailMessage('Email address verified successfully.');
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.email;
          return next;
        });
      } else {
        if (data.message && data.message.toLowerCase().includes('expired')) {
          setEmailStatus('EXPIRED_OTP');
        } else {
          setEmailStatus('INVALID_OTP');
        }
        setEmailMessage(data.message || 'Invalid verification code.');
      }
    } catch {
      setEmailStatus('ERROR');
      setEmailMessage('Network error while verifying OTP.');
    }
  };

  // 4. Check Mobile Availability
  const handleCheckMobile = async () => {
    setMobileMessage(null);
    const mobileErr = validateField('mobile', formData.mobile);
    if (mobileErr) {
      setFieldErrors((prev) => ({ ...prev, mobile: mobileErr }));
      return;
    }

    setMobileStatus('CHECKING');
    try {
      const res = await fetch('/api/auth/verify/check-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: formData.mobile,
          countryCode: mobileCountryCode,
        }),
      });
      const data = await res.json();
      if (data.available) {
        setMobileStatus('AVAILABLE');
        setMobileMessage('Mobile number is available for registration.');
      } else {
        setMobileStatus('ALREADY_REGISTERED');
        setMobileMessage(data.message || 'This mobile number is already registered. Please use another number or contact support.');
      }
    } catch {
      setMobileStatus('ERROR');
      setMobileMessage('Network error checking mobile availability.');
    }
  };

  // 5. Send Mobile OTP
  const handleSendMobileOtp = async () => {
    setMobileMessage(null);
    const mobileErr = validateField('mobile', formData.mobile);
    if (mobileErr) {
      setFieldErrors((prev) => ({ ...prev, mobile: mobileErr }));
      return;
    }

    setMobileStatus('OTP_SENDING');
    try {
      const res = await fetch('/api/auth/verify/send-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mobile: formData.mobile,
          countryCode: mobileCountryCode,
          fullName: formData.fullName.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMobileStatus('OTP_SENT');
        setMobileCooldown(data.cooldownSeconds || 60);
        setMobileMessage(data.message || `Verification code sent to ${mobileCountryCode} ${formData.mobile}. Valid for 5 minutes.`);
        setMobileOtp('');
      } else {
        if (data.message && data.message.includes('already registered')) {
          setMobileStatus('ALREADY_REGISTERED');
        } else if (data.message && (data.message.includes('not configured') || data.message.includes('failed'))) {
          setMobileStatus('DELIVERY_FAILED');
        } else {
          setMobileStatus('ERROR');
        }
        setMobileMessage(data.message || 'Failed to dispatch mobile OTP.');
        if (data.cooldownSeconds) setMobileCooldown(data.cooldownSeconds);
      }
    } catch {
      setMobileStatus('ERROR');
      setMobileMessage('Cannot connect to authentication service.');
    }
  };

  // 6. Verify Mobile OTP
  const handleVerifyMobileOtp = async () => {
    setMobileMessage(null);
    const cleanOtp = mobileOtp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setMobileStatus('INVALID_OTP');
      setMobileMessage('Please enter a valid 6-digit numeric verification code.');
      return;
    }

    setMobileStatus('VERIFYING');
    try {
      const res = await fetch('/api/auth/verify/confirm-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type: 'MOBILE',
          identifier: `${mobileCountryCode}${formData.mobile.replace(/\D/g, '').slice(-10)}`,
          otp: cleanOtp,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMobileStatus('VERIFIED');
        setVerifiedMobile(formData.mobile.replace(/\D/g, '').slice(-10));
        setMobileMessage('Mobile phone number verified successfully.');
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.mobile;
          return next;
        });
      } else {
        if (data.message && data.message.toLowerCase().includes('expired')) {
          setMobileStatus('EXPIRED_OTP');
        } else {
          setMobileStatus('INVALID_OTP');
        }
        setMobileMessage(data.message || 'Invalid verification code.');
      }
    } catch {
      setMobileStatus('ERROR');
      setMobileMessage('Network error while verifying mobile OTP.');
    }
  };

  const validateField = (name: string, value: any, form = formData): string | undefined => {
    switch (name) {
      case 'fullName':
        if (!value || !value.trim()) return 'Full legal name is required';
        if (value.trim().length < 3) return 'Name must be at least 3 characters';
        if (!/^[a-zA-Z\s.']+$/.test(value.trim())) return 'Name must contain letters only';
        return undefined;

      case 'mobile':
        if (!value || !value.trim()) return 'Mobile number is required';
        const cleanMobile = value.replace(/\D/g, '');
        if (cleanMobile.length !== 10) return 'Must be exactly 10 digits';
        if (!/^[6-9]\d{9}$/.test(cleanMobile)) return 'Enter valid Indian mobile starting with 6, 7, 8, or 9';
        return undefined;

      case 'email':
        if (!value || !value.trim()) return 'Email address is required';
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) {
          return 'Enter a valid email address';
        }
        return undefined;

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Must be at least 6 characters';
        if (!/[A-Z]/.test(value)) return 'Must contain an uppercase letter';
        if (!/[a-z]/.test(value)) return 'Must contain a lowercase letter';
        if (!/[0-9]/.test(value)) return 'Must contain a number';
        if (!/[^A-Za-z0-9]/.test(value)) return 'Must contain a special character';
        return undefined;

      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== form.password) return 'Passwords do not match';
        return undefined;

      case 'pinCode':
        if (value && value.trim()) {
          const cleanPin = value.replace(/\D/g, '');
          if (cleanPin.length !== 6) return 'PIN Code must be 6 digits';
        }
        return undefined;

      case 'panNumber':
        if (!value || !value.trim()) return 'PAN Number is required for compliance';
        const cleanPan = value.trim().toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
          return 'Invalid PAN format (e.g. ABCDE1234F)';
        }
        return undefined;

      case 'aadhaarNumber':
        if (value && value.trim()) {
          const cleanAadhaar = value.replace(/\D/g, '');
          if (cleanAadhaar.length !== 12) return 'Aadhaar must be exactly 12 digits';
        }
        return undefined;

      case 'bankName':
        if (!value || !value.trim()) return 'Bank name is required';
        return undefined;

      case 'bankAccountHolder':
        if (!value || !value.trim()) return 'Beneficiary name is required';
        return undefined;

      case 'bankAccountNumber':
        if (!value || !value.trim()) return 'Bank account number is required';
        const cleanAcc = value.replace(/\D/g, '');
        if (cleanAcc.length < 9 || cleanAcc.length > 18) {
          return 'Must be between 9 and 18 digits';
        }
        return undefined;

      case 'bankIfsc':
        if (!value || !value.trim()) return 'IFSC code is required';
        const cleanIfsc = value.trim().toUpperCase();
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
          return 'Invalid IFSC format (e.g. HDFC0001234)';
        }
        return undefined;

      case 'agreementAccepted':
        if (!value) return 'You must accept the associate terms to proceed';
        return undefined;

      default:
        return undefined;
    }
  };

  // Password validation checks
  const pass = formData.password;
  const hasMin = pass.length >= 6;
  const hasUp = /[A-Z]/.test(pass);
  const hasLow = /[a-z]/.test(pass);
  const hasNum = /[0-9]/.test(pass);
  const hasSpec = /[^A-Za-z0-9]/.test(pass);

  const handleNextStep = () => {
    setError(null);
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      const step1Fields = ['fullName', 'email', 'mobile', 'password', 'confirmPassword'];
      for (const f of step1Fields) {
        const err = validateField(f, (formData as any)[f], formData);
        if (err) newErrors[f] = err;
      }

      // Strict Ownership Verification Checks
      if (!isEmailVerified) {
        newErrors.email = 'Email address must be OTP-verified before proceeding.';
      }
      if (!isMobileVerified) {
        newErrors.mobile = 'Mobile phone number must be OTP-verified before proceeding.';
      }
    } else if (step === 2) {
      const step2Fields = ['panNumber'];
      if (formData.pinCode) step2Fields.push('pinCode');
      if (formData.aadhaarNumber) step2Fields.push('aadhaarNumber');
      for (const f of step2Fields) {
        const err = validateField(f, (formData as any)[f], formData);
        if (err) newErrors[f] = err;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...newErrors }));
      setError('Please review the highlighted fields before proceeding.');
      return;
    }

    setFieldErrors({});
    setStep((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const step3Fields = ['bankName', 'bankAccountHolder', 'bankAccountNumber', 'bankIfsc', 'agreementAccepted'];
    const newErrors: Record<string, string> = {};
    for (const f of step3Fields) {
      const err = validateField(f, (formData as any)[f], formData);
      if (err) newErrors[f] = err;
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...newErrors }));
      setError('Please complete all required bank and agreement fields.');
      return;
    }

    if (!isEmailVerified || !isMobileVerified) {
      setError('Both Email and Mobile Phone Number must be OTP-verified to create your account.');
      setStep(1);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-bga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          registrationSessionId: sessionId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please verify your details.');
        setLoading(false);
        return;
      }

      setSuccess({
        message: data.message || 'Application submitted successfully.',
        userId: data.userId || 'AT-BGA-XXXX',
      });
    } catch {
      setError('Cannot connect to authentication service. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout customSubtitle="Apply to become an authorized Growth Associate and earn on verified corporate projects.">
      {success ? (
        /* Submission Success / Pending Approval Screen */
        <AuthCard
          title="Application Submitted"
          subtitle="Your registration is under executive review and approval."
          cardMaxWidth="max-w-xl"
        >
          <div className="py-4 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F9FF] border border-[#D6E2F2] text-left space-y-3">
              <div className="flex items-center justify-between border-b border-[#D6E2F2] pb-2">
                <span className="text-xs text-[#60769B]">Assigned Associate ID</span>
                <span className="text-sm font-mono font-extrabold text-[#0879E8]">
                  {success.userId}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#D6E2F2] pb-2">
                <span className="text-xs text-[#60769B]">Application Status</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  PENDING ADMIN APPROVAL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#60769B]">Registered Email</span>
                <span className="text-xs font-semibold text-[#10244D]">{formData.email}</span>
              </div>
            </div>

            <div className="text-left bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-[#60769B]">
              <h4 className="font-bold text-[#10244D] text-xs">What Happens Next?</h4>
              <p>1. Our corporate compliance team verifies your submitted KYC & Bank details.</p>
              <p>2. Upon Admin approval, your portal credentials will be activated.</p>
              <p>3. You will receive an official onboarding confirmation alert on your registered email.</p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#0879E8] to-[#123FAD] shadow-[0_6px_20px_rgba(8,121,232,0.28)] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] transition-all cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        </AuthCard>
      ) : (
        /* Multi-Step Registration Form */
        <AuthCard
          title="Become a Growth Associate"
          subtitle="Join our network and grow with Atriowings."
          cardMaxWidth="max-w-2xl"
          error={error}
        >
          {/* Step Progression Bar */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div
              className={`py-2 px-3 rounded-xl text-center text-xs font-bold transition-all border ${
                step === 1
                  ? 'bg-[#DCEBFF] text-[#0879E8] border-[#0879E8]/30 shadow-xs'
                  : step > 1
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              1. Personal & Security
            </div>
            <div
              className={`py-2 px-3 rounded-xl text-center text-xs font-bold transition-all border ${
                step === 2
                  ? 'bg-[#DCEBFF] text-[#0879E8] border-[#0879E8]/30 shadow-xs'
                  : step > 2
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              2. Location & KYC
            </div>
            <div
              className={`py-2 px-3 rounded-xl text-center text-xs font-bold transition-all border ${
                step === 3
                  ? 'bg-[#DCEBFF] text-[#0879E8] border-[#0879E8]/30 shadow-xs'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              3. Bank & Agreement
            </div>
          </div>

          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNextStep(); }} noValidate>
            {/* STEP 1: Personal Information & Account Security */}
            {step === 1 && (
              <div className="space-y-4">
                {/* 1. Full Legal Name & Date of Birth */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({ ...formData, fullName: e.target.value });
                        if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: '' });
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.fullName
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                          : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                      }`}
                      required
                    />
                    {fieldErrors.fullName && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6E2F2] text-xs font-medium text-[#10244D] bg-white transition-all focus:outline-none focus:border-[#0879E8] focus:ring-2 focus:ring-[#DCEBFF]"
                    />
                  </div>
                </div>

                {/* 2. Registered Email Address & Real-Time OTP Verification */}
                <div className="p-3.5 rounded-2xl border border-[#D6E2F2] bg-[#F8FAFD] space-y-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#10244D]">
                      Registered Email Address <span className="text-rose-500">*</span>
                    </label>
                    {isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified ✓
                      </span>
                    ) : emailStatus === 'CHECKING' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> Checking...
                      </span>
                    ) : emailStatus === 'AVAILABLE' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3 text-emerald-600" /> Available for OTP
                      </span>
                    ) : emailStatus === 'OTP_SENT' || emailStatus === 'VERIFYING' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-blue-600" /> OTP Sent (5m)
                      </span>
                    ) : emailStatus === 'ALREADY_REGISTERED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3 text-rose-600" /> Already Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Not Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#60769B]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        placeholder="associate@example.com"
                        value={formData.email}
                        disabled={isEmailVerified}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                          isEmailVerified
                            ? 'bg-slate-50 text-slate-600 border-emerald-300'
                            : fieldErrors.email
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                            : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                        }`}
                        required
                      />
                    </div>

                    {isEmailVerified ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEmailStatus('IDLE');
                          setVerifiedEmail(null);
                          setEmailOtp('');
                          setEmailMessage(null);
                        }}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#60769B] hover:text-[#10244D] transition-colors cursor-pointer shrink-0"
                      >
                        Change
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleCheckEmail}
                          disabled={!formData.email.trim() || emailStatus === 'CHECKING'}
                          className="px-2.5 py-2.5 rounded-xl border border-[#D6E2F2] bg-white hover:bg-[#F0F7FF] text-xs font-bold text-[#0879E8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {emailStatus === 'CHECKING' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Check'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={!formData.email.trim() || emailStatus === 'OTP_SENDING' || emailCooldown > 0}
                          className="px-3.5 py-2.5 rounded-xl bg-[#0879E8] hover:bg-[#076cd0] text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {emailStatus === 'OTP_SENDING' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : emailCooldown > 0 ? (
                            <span>Resend ({emailCooldown}s)</span>
                          ) : (
                            <span>Send OTP</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {fieldErrors.email && (
                    <p className="text-[11px] text-rose-600 font-medium pl-1">{fieldErrors.email}</p>
                  )}

                  {emailStatus === 'ALREADY_REGISTERED' && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>This email address is already registered.</span>
                      </div>
                      <p className="text-[11px] text-rose-700 pl-5.5">
                        Please <Link to="/login" className="font-bold underline text-rose-900">Sign In</Link> to your account, or use another email address.
                      </p>
                    </div>
                  )}

                  {emailStatus === 'AVAILABLE' && (
                    <p className="text-[11px] text-emerald-700 font-medium pl-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Email address is available. Click &quot;Send OTP&quot; to verify.</span>
                    </p>
                  )}

                  {(emailStatus === 'OTP_SENT' ||
                    emailStatus === 'VERIFYING' ||
                    emailStatus === 'INVALID_OTP' ||
                    emailStatus === 'EXPIRED_OTP') && (
                    <div className="p-3 rounded-xl bg-[#F0F7FF] border border-[#BFDBFE] space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#10244D] flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-[#0879E8]" /> Enter 6-Digit Email OTP
                        </span>
                        <span className="text-[10px] text-[#60769B]">Expires in 5 minutes</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••••"
                          value={emailOtp}
                          onChange={(e) => {
                            setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                            if (emailStatus === 'INVALID_OTP') setEmailStatus('OTP_SENT');
                          }}
                          className="w-36 px-3 py-2 rounded-lg border border-[#D6E2F2] text-sm font-mono font-extrabold tracking-widest text-center text-[#10244D] bg-white focus:outline-none focus:border-[#0879E8] focus:ring-2 focus:ring-[#DCEBFF]"
                        />

                        <button
                          type="button"
                          onClick={handleVerifyEmailOtp}
                          disabled={emailOtp.trim().length !== 6 || emailStatus === 'VERIFYING'}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#0879E8] to-[#123FAD] text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {emailStatus === 'VERIFYING' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <span>Verify OTP</span>
                          )}
                        </button>

                        {emailCooldown > 0 ? (
                          <span className="text-[11px] text-[#60769B] font-medium pl-2">
                            Resend in {emailCooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendEmailOtp}
                            className="text-[11px] font-bold text-[#0879E8] hover:underline pl-2 cursor-pointer"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>

                      {emailMessage && (
                        <p
                          className={`text-[11px] font-medium ${
                            emailStatus === 'INVALID_OTP' || emailStatus === 'EXPIRED_OTP'
                              ? 'text-rose-600'
                              : 'text-[#0879E8]'
                          }`}
                        >
                          {emailMessage}
                        </p>
                      )}
                    </div>
                  )}

                  {isEmailVerified && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">Email verified successfully via OTP. Ownership confirmed.</span>
                    </div>
                  )}
                </div>

                {/* 3. Mobile Phone Number & Real-Time OTP Verification */}
                <div className="p-3.5 rounded-2xl border border-[#D6E2F2] bg-[#F8FAFD] space-y-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#10244D]">
                      Mobile Phone Number <span className="text-rose-500">*</span>
                    </label>
                    {isMobileVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified ✓
                      </span>
                    ) : mobileStatus === 'CHECKING' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> Checking...
                      </span>
                    ) : mobileStatus === 'AVAILABLE' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3 text-emerald-600" /> Available for OTP
                      </span>
                    ) : mobileStatus === 'OTP_SENT' || mobileStatus === 'VERIFYING' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-blue-600" /> OTP Sent (5m)
                      </span>
                    ) : mobileStatus === 'ALREADY_REGISTERED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3 text-rose-600" /> Already Registered
                      </span>
                    ) : mobileStatus === 'DELIVERY_FAILED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3 text-amber-600" /> Delivery Notice
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Not Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Country Code Selector */}
                    <select
                      value={mobileCountryCode}
                      disabled={isMobileVerified}
                      onChange={(e) => {
                        setMobileCountryCode(e.target.value);
                        if (mobileStatus !== 'IDLE') {
                          setMobileStatus('IDLE');
                          setVerifiedMobile(null);
                          setMobileOtp('');
                          setMobileMessage(null);
                        }
                      }}
                      className="px-2.5 py-2.5 rounded-xl border border-[#D6E2F2] bg-white text-xs font-bold text-[#10244D] focus:outline-none focus:border-[#0879E8] focus:ring-2 focus:ring-[#DCEBFF] shrink-0"
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+65">🇸🇬 +65</option>
                    </select>

                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#60769B]">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={formData.mobile}
                        disabled={isMobileVerified}
                        onChange={(e) => handleMobileChange(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-mono font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                          isMobileVerified
                            ? 'bg-slate-50 text-slate-600 border-emerald-300'
                            : fieldErrors.mobile
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                            : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                        }`}
                        required
                      />
                    </div>

                    {isMobileVerified ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileStatus('IDLE');
                          setVerifiedMobile(null);
                          setMobileOtp('');
                          setMobileMessage(null);
                        }}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#60769B] hover:text-[#10244D] transition-colors cursor-pointer shrink-0"
                      >
                        Change
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleCheckMobile}
                          disabled={!formData.mobile.trim() || mobileStatus === 'CHECKING'}
                          className="px-2.5 py-2.5 rounded-xl border border-[#D6E2F2] bg-white hover:bg-[#F0F7FF] text-xs font-bold text-[#0879E8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {mobileStatus === 'CHECKING' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Check'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendMobileOtp}
                          disabled={!formData.mobile.trim() || mobileStatus === 'OTP_SENDING' || mobileCooldown > 0}
                          className="px-3.5 py-2.5 rounded-xl bg-[#0879E8] hover:bg-[#076cd0] text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {mobileStatus === 'OTP_SENDING' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : mobileCooldown > 0 ? (
                            <span>Resend ({mobileCooldown}s)</span>
                          ) : (
                            <span>Send OTP</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {fieldErrors.mobile && (
                    <p className="text-[11px] text-rose-600 font-medium pl-1">{fieldErrors.mobile}</p>
                  )}

                  {mobileStatus === 'ALREADY_REGISTERED' && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>This mobile number is already registered.</span>
                      </div>
                      <p className="text-[11px] text-rose-700 pl-5.5">
                        Please use another number or contact <a href="mailto:info@atriowings.in" className="font-bold underline text-rose-900">support@atriowings.in</a>.
                      </p>
                    </div>
                  )}

                  {mobileStatus === 'DELIVERY_FAILED' && mobileMessage && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>SMS Gateway Delivery Notice</span>
                      </div>
                      <p className="text-[11px] text-amber-800 pl-5.5">{mobileMessage}</p>
                    </div>
                  )}

                  {mobileStatus === 'AVAILABLE' && (
                    <p className="text-[11px] text-emerald-700 font-medium pl-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mobile number is available. Click &quot;Send OTP&quot; to verify.</span>
                    </p>
                  )}

                  {(mobileStatus === 'OTP_SENT' ||
                    mobileStatus === 'VERIFYING' ||
                    mobileStatus === 'INVALID_OTP' ||
                    mobileStatus === 'EXPIRED_OTP') && (
                    <div className="p-3 rounded-xl bg-[#F0F7FF] border border-[#BFDBFE] space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#10244D] flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-[#0879E8]" /> Enter 6-Digit Mobile SMS OTP
                        </span>
                        <span className="text-[10px] text-[#60769B]">Expires in 5 minutes</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••••"
                          value={mobileOtp}
                          onChange={(e) => {
                            setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                            if (mobileStatus === 'INVALID_OTP') setMobileStatus('OTP_SENT');
                          }}
                          className="w-36 px-3 py-2 rounded-lg border border-[#D6E2F2] text-sm font-mono font-extrabold tracking-widest text-center text-[#10244D] bg-white focus:outline-none focus:border-[#0879E8] focus:ring-2 focus:ring-[#DCEBFF]"
                        />

                        <button
                          type="button"
                          onClick={handleVerifyMobileOtp}
                          disabled={mobileOtp.trim().length !== 6 || mobileStatus === 'VERIFYING'}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#0879E8] to-[#123FAD] text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {mobileStatus === 'VERIFYING' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <span>Verify OTP</span>
                          )}
                        </button>

                        {mobileCooldown > 0 ? (
                          <span className="text-[11px] text-[#60769B] font-medium pl-2">
                            Resend in {mobileCooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendMobileOtp}
                            className="text-[11px] font-bold text-[#0879E8] hover:underline pl-2 cursor-pointer"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>

                      {mobileMessage && (
                        <p
                          className={`text-[11px] font-medium ${
                            mobileStatus === 'INVALID_OTP' || mobileStatus === 'EXPIRED_OTP'
                              ? 'text-rose-600'
                              : 'text-[#0879E8]'
                          }`}
                        >
                          {mobileMessage}
                        </p>
                      )}
                    </div>
                  )}

                  {isMobileVerified && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">Mobile number verified successfully via OTP. Ownership confirmed.</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      Create Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 6 characters"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value });
                          if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                        }}
                        className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-xs font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                          fieldErrors.password
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                            : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#60769B] hover:text-[#0879E8] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData({ ...formData, confirmPassword: e.target.value });
                          if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                        }}
                        className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-xs font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                          fieldErrors.confirmPassword
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                            : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#60769B] hover:text-[#0879E8] cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Password Policy Indicator */}
                <div className="p-3 rounded-xl bg-[#F5F9FF] border border-[#D6E2F2] text-[11px] space-y-1">
                  <span className="font-bold text-[#10244D]">Security Requirements:</span>
                  <div className="grid grid-cols-2 gap-1 text-[#60769B]">
                    <span className={hasMin ? 'text-emerald-600 font-semibold flex items-center gap-1' : 'flex items-center gap-1'}>
                      {hasMin ? <Check className="w-3 h-3" /> : '•'} 6+ characters
                    </span>
                    <span className={hasUp ? 'text-emerald-600 font-semibold flex items-center gap-1' : 'flex items-center gap-1'}>
                      {hasUp ? <Check className="w-3 h-3" /> : '•'} Uppercase (A-Z)
                    </span>
                    <span className={hasLow ? 'text-emerald-600 font-semibold flex items-center gap-1' : 'flex items-center gap-1'}>
                      {hasLow ? <Check className="w-3 h-3" /> : '•'} Lowercase (a-z)
                    </span>
                    <span className={hasNum && hasSpec ? 'text-emerald-600 font-semibold flex items-center gap-1' : 'flex items-center gap-1'}>
                      {hasNum && hasSpec ? <Check className="w-3 h-3" /> : '•'} Number & Special
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#0879E8] to-[#123FAD] shadow-[0_6px_20px_rgba(8,121,232,0.28)] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Location & KYC</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Location & KYC Information */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      PAN Card Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      value={formData.panNumber}
                      onChange={(e) => {
                        const upper = e.target.value.toUpperCase().slice(0, 10);
                        setFormData({ ...formData, panNumber: upper });
                        if (fieldErrors.panNumber) setFieldErrors({ ...fieldErrors, panNumber: '' });
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium font-mono text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.panNumber
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                          : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                      }`}
                      required
                    />
                    {fieldErrors.panNumber && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.panNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      Aadhaar Number (Optional)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="12-digit UID"
                      value={formData.aadhaarNumber}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setFormData({ ...formData, aadhaarNumber: clean });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6E2F2] text-xs font-medium font-mono text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:border-[#0879E8] focus:ring-2 focus:ring-[#DCEBFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    placeholder="Door / Flat / Street name"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6E2F2] text-xs font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:border-[#0879E8] focus:ring-2 focus:ring-[#DCEBFF]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6E2F2] text-xs font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:border-[#0879E8] focus:ring-2 focus:ring-[#DCEBFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6E2F2] text-xs font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:border-[#0879E8] focus:ring-2 focus:ring-[#DCEBFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6 digits"
                      value={formData.pinCode}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setFormData({ ...formData, pinCode: clean });
                        if (fieldErrors.pinCode) setFieldErrors({ ...fieldErrors, pinCode: '' });
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium font-mono text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.pinCode
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                          : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                      }`}
                    />
                    {fieldErrors.pinCode && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.pinCode}</p>
                    )}
                  </div>
                </div>

                {/* PAN Document Upload */}
                <DocumentUploadField
                  label="PAN Document / Photo"
                  helpText="Upload front copy of PAN card for identity verification"
                  value={formData.panDocumentUrl}
                  docName={docMeta.pan?.name}
                  onUploaded={(url, name) => {
                    setFormData({ ...formData, panDocumentUrl: url });
                    setDocMeta({ ...docMeta, pan: { name } });
                  }}
                  onRemove={() => {
                    setFormData({ ...formData, panDocumentUrl: '' });
                    setDocMeta({ ...docMeta, pan: { name: '' } });
                  }}
                />

                {/* Aadhaar Document Upload (Requested by user) */}
                <DocumentUploadField
                  label="Aadhaar Document / Photo"
                  helpText="Upload front & back copy of Aadhaar card for address and identity verification"
                  value={formData.addressProofUrl}
                  docName={docMeta.aadhaar?.name}
                  onUploaded={(url, name) => {
                    setFormData({ ...formData, addressProofUrl: url });
                    setDocMeta({ ...docMeta, aadhaar: { name } });
                  }}
                  onRemove={() => {
                    setFormData({ ...formData, addressProofUrl: '' });
                    setDocMeta({ ...docMeta, aadhaar: { name: '' } });
                  }}
                />

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-3 px-4 rounded-xl font-bold text-xs text-[#60769B] hover:text-[#10244D] hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#0879E8] to-[#123FAD] shadow-[0_6px_20px_rgba(8,121,232,0.28)] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Bank & Agreement</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Banking & Agreement */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      value={formData.bankName}
                      onChange={(e) => {
                        setFormData({ ...formData, bankName: e.target.value });
                        if (fieldErrors.bankName) setFieldErrors({ ...fieldErrors, bankName: '' });
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.bankName
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                          : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                      }`}
                      required
                    />
                    {fieldErrors.bankName && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.bankName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      Bank Account Beneficiary Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Name as registered with your bank"
                      value={formData.bankAccountHolder}
                      onChange={(e) => {
                        setFormData({ ...formData, bankAccountHolder: e.target.value });
                        if (fieldErrors.bankAccountHolder) setFieldErrors({ ...fieldErrors, bankAccountHolder: '' });
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.bankAccountHolder
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                          : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                      }`}
                      required
                    />
                    {fieldErrors.bankAccountHolder && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.bankAccountHolder}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      Bank Account Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={18}
                      placeholder="9 to 18 digits"
                      value={formData.bankAccountNumber}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 18);
                        setFormData({ ...formData, bankAccountNumber: clean });
                        if (fieldErrors.bankAccountNumber) setFieldErrors({ ...fieldErrors, bankAccountNumber: '' });
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium font-mono text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.bankAccountNumber
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                          : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                      }`}
                      required
                    />
                    {fieldErrors.bankAccountNumber && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.bankAccountNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#10244D] mb-1.5">
                      Bank IFSC Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="e.g. HDFC0001234"
                      value={formData.bankIfsc}
                      onChange={(e) => {
                        const upper = e.target.value.toUpperCase().slice(0, 11);
                        setFormData({ ...formData, bankIfsc: upper });
                        if (fieldErrors.bankIfsc) setFieldErrors({ ...fieldErrors, bankIfsc: '' });
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium font-mono text-[#10244D] placeholder:text-[#60769B]/70 bg-white transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.bankIfsc
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                          : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                      }`}
                      required
                    />
                    {fieldErrors.bankIfsc && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.bankIfsc}</p>
                    )}
                  </div>
                </div>

                {/* Bank Passbook Upload (Updated from Cancelled Cheque / Passbook Copy) */}
                <DocumentUploadField
                  label="Bank passbook"
                  helpText="Upload front page of bank passbook clearly showing account number and IFSC code"
                  value={formData.bankProofUrl}
                  docName={docMeta.bank?.name}
                  onUploaded={(url, name) => {
                    setFormData({ ...formData, bankProofUrl: url });
                    setDocMeta({ ...docMeta, bank: { name } });
                  }}
                  onRemove={() => {
                    setFormData({ ...formData, bankProofUrl: '' });
                    setDocMeta({ ...docMeta, bank: { name: '' } });
                  }}
                />

                {/* Agreement Checkbox */}
                <div className="p-3.5 rounded-xl bg-[#F5F9FF] border border-[#D6E2F2] space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.agreementAccepted}
                      onChange={(e) => {
                        setFormData({ ...formData, agreementAccepted: e.target.checked });
                        if (fieldErrors.agreementAccepted) setFieldErrors({ ...fieldErrors, agreementAccepted: '' });
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-[#0879E8] focus:ring-[#0879E8] border-[#D6E2F2]"
                      required
                    />
                    <span className="text-xs text-[#10244D] leading-normal font-medium">
                      I accept the{' '}
                      <span className="font-bold text-[#0879E8]">Atriowings Associate Agreement</span> and consent to official verification of my KYC credentials for commission payouts.
                    </span>
                  </label>
                  {fieldErrors.agreementAccepted && (
                    <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.agreementAccepted}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="py-3 px-4 rounded-xl font-bold text-xs text-[#60769B] hover:text-[#10244D] hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <div className="flex-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white shadow-[0_6px_20px_rgba(8,121,232,0.28)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                        loading
                          ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#0879E8] to-[#123FAD] hover:from-[#076cd0] hover:to-[#0f3494] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] active:scale-[0.99]'
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span>Submitting Application...</span>
                        </>
                      ) : (
                        <span>Create Account</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Already have an account footer */}
          <div className="text-center pt-5 border-t border-[#D6E2F2]/60 mt-5">
            <p className="text-xs text-[#60769B]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-[#0879E8] hover:text-[#123FAD] hover:underline transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </AuthCard>
      )}
    </AuthLayout>
  );
};

export default RegisterBgaPage;
