import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Lock,
  CreditCard,
  FileText,
  ShieldCheck,
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
  Building2,
} from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthPrimaryButton } from '../components/auth/AuthPrimaryButton';
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
        <label className="block text-xs font-semibold text-[#10244D]">
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
              className="px-2.5 py-1 text-[11px] font-bold text-[#0879E8] hover:bg-white rounded-lg transition-colors"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-[#60769B] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
    addressProofUrl: '',
    bankProofUrl: '',
    agreementDocumentUrl: '',
  });

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
    } else if (step === 2) {
      const step2Fields = ['panNumber'];
      if (formData.pinCode) step2Fields.push('pinCode');
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

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-bga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
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
                className="w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#0879E8] to-[#123FAD] shadow-[0_6px_20px_rgba(8,121,232,0.28)] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] transition-all"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AuthInput
                    label="Full Legal Name"
                    icon={User}
                    placeholder="Enter your name"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: '' });
                    }}
                    error={fieldErrors.fullName}
                    required
                  />

                  <AuthInput
                    label="Mobile Number"
                    type="tel"
                    icon={Phone}
                    placeholder="10-digit mobile"
                    value={formData.mobile}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, mobile: clean });
                      if (fieldErrors.mobile) setFieldErrors({ ...fieldErrors, mobile: '' });
                    }}
                    error={fieldErrors.mobile}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AuthInput
                    label="Registered Email Address"
                    type="email"
                    icon={Mail}
                    placeholder="associate@example.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                    }}
                    error={fieldErrors.email}
                    required
                  />

                  <AuthInput
                    label="Date of Birth"
                    type="date"
                    icon={Calendar}
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AuthInput
                    label="Create Password"
                    icon={Lock}
                    placeholder="Min 6 characters"
                    isPassword
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                    }}
                    error={fieldErrors.password}
                    required
                  />

                  <AuthInput
                    label="Confirm Password"
                    icon={Lock}
                    placeholder="Re-enter password"
                    isPassword
                    showPasswordToggle
                    showPassword={showConfirmPassword}
                    onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                    }}
                    error={fieldErrors.confirmPassword}
                    required
                  />
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
                  <AuthInput
                    label="PAN Card Number"
                    placeholder="ABCDE1234F"
                    value={formData.panNumber}
                    onChange={(e) => {
                      const upper = e.target.value.toUpperCase().slice(0, 10);
                      setFormData({ ...formData, panNumber: upper });
                      if (fieldErrors.panNumber) setFieldErrors({ ...fieldErrors, panNumber: '' });
                    }}
                    error={fieldErrors.panNumber}
                    required
                  />

                  <AuthInput
                    label="Aadhaar Number (Optional)"
                    placeholder="12-digit UID"
                    value={formData.aadhaarNumber}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setFormData({ ...formData, aadhaarNumber: clean });
                    }}
                  />
                </div>

                <AuthInput
                  label="Street Address"
                  icon={MapPin}
                  placeholder="Door / Flat / Street name"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />

                <div className="grid grid-cols-3 gap-3">
                  <AuthInput
                    label="City"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                  <AuthInput
                    label="State"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                  <AuthInput
                    label="PIN Code"
                    placeholder="6 digits"
                    value={formData.pinCode}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData({ ...formData, pinCode: clean });
                      if (fieldErrors.pinCode) setFieldErrors({ ...fieldErrors, pinCode: '' });
                    }}
                    error={fieldErrors.pinCode}
                  />
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

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-3 px-4 rounded-xl font-bold text-xs text-[#60769B] hover:text-[#10244D] hover:bg-slate-100 transition-colors flex items-center gap-1.5"
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
                  <AuthInput
                    label="Bank Name"
                    icon={Building2}
                    placeholder="e.g. HDFC Bank, SBI"
                    value={formData.bankName}
                    onChange={(e) => {
                      setFormData({ ...formData, bankName: e.target.value });
                      if (fieldErrors.bankName) setFieldErrors({ ...fieldErrors, bankName: '' });
                    }}
                    error={fieldErrors.bankName}
                    required
                  />

                  <AuthInput
                    label="Beneficiary Account Name"
                    icon={User}
                    placeholder="Name as per passbook"
                    value={formData.bankAccountHolder}
                    onChange={(e) => {
                      setFormData({ ...formData, bankAccountHolder: e.target.value });
                      if (fieldErrors.bankAccountHolder) setFieldErrors({ ...fieldErrors, bankAccountHolder: '' });
                    }}
                    error={fieldErrors.bankAccountHolder}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AuthInput
                    label="Account Number"
                    icon={CreditCard}
                    placeholder="9 to 18 digits"
                    value={formData.bankAccountNumber}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 18);
                      setFormData({ ...formData, bankAccountNumber: clean });
                      if (fieldErrors.bankAccountNumber) setFieldErrors({ ...fieldErrors, bankAccountNumber: '' });
                    }}
                    error={fieldErrors.bankAccountNumber}
                    required
                  />

                  <AuthInput
                    label="IFSC Code"
                    placeholder="e.g. HDFC0001234"
                    value={formData.bankIfsc}
                    onChange={(e) => {
                      const upper = e.target.value.toUpperCase().slice(0, 11);
                      setFormData({ ...formData, bankIfsc: upper });
                      if (fieldErrors.bankIfsc) setFieldErrors({ ...fieldErrors, bankIfsc: '' });
                    }}
                    error={fieldErrors.bankIfsc}
                    required
                  />
                </div>

                {/* Bank Proof Upload */}
                <DocumentUploadField
                  label="Cancelled Cheque / Passbook Copy"
                  helpText="Upload bank passbook or cancelled cheque for NEFT verification"
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
                    className="py-3 px-4 rounded-xl font-bold text-xs text-[#60769B] hover:text-[#10244D] hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <div className="flex-1">
                    <AuthPrimaryButton loading={loading} loadingText="Submitting Application...">
                      Create Account
                    </AuthPrimaryButton>
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
