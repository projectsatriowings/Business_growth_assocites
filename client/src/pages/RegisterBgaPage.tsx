import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  FileText,
  User,
  CreditCard,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { uploadPublicFile } from '../utils/api';

interface DocumentUploadFieldProps {
  label: string;
  required?: boolean;
  helpText: string;
  value: string;
  docName?: string;
  docSize?: number;
  onUploaded: (url: string, name: string, size?: number) => void;
  onRemove: () => void;
  error?: string;
  accept?: string;
}

const DocumentUploadField: React.FC<DocumentUploadFieldProps> = ({
  label,
  required,
  helpText,
  value,
  docName,
  docSize,
  onUploaded,
  onRemove,
  error,
  accept = '.pdf,image/png,image/jpeg,image/webp',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = async (file: File) => {
    setUploadError(null);
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 20MB.');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadPublicFile(file);
      onUploaded(res.url, file.name, file.size);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const isImage = value && value.match(/\.(jpeg|jpg|png|webp|svg)($|\?)/i);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-700">
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
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {docName || value.split('/').pop()}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                {docSize ? <span>{formatBytes(docSize)}</span> : null}
                <span className="text-emerald-600 font-semibold">• Document ready</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => window.open(value, '_blank')}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#3066BE] hover:bg-blue-50 border border-[#3066BE]/30 rounded-lg flex items-center gap-1 transition-colors"
              title="Preview Document"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white border border-slate-300 rounded-lg flex items-center gap-1 transition-colors"
              title="Replace File"
            >
              <Upload className="w-3.5 h-3.5" /> Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Remove File"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
            dragActive
              ? 'border-[#3066BE] bg-blue-50/30'
              : error || uploadError
              ? 'border-rose-300 bg-rose-50/10 hover:border-rose-400'
              : 'border-slate-300 bg-slate-50/50 hover:border-[#3066BE] hover:bg-blue-50/20'
          }`}
        >
          {uploading ? (
            <div className="py-2 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#3066BE] animate-spin" />
              <p className="text-xs font-semibold text-[#3066BE]">Uploading document, please wait...</p>
            </div>
          ) : (
            <div className="py-1 space-y-1.5">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3066BE] flex items-center justify-center mx-auto">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Click to upload or drag & drop document
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PDF, JPG, PNG, WEBP (Max 20MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadError ? (
        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{uploadError}</span>
        </p>
      ) : error ? (
        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        <p className="text-[11px] text-slate-400 mt-1">{helpText}</p>
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

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field Validation State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Document metadata state for UI labels
  const [docMeta, setDocMeta] = useState<Record<string, { name: string; size?: number }>>({});

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

  const validateField = (name: string, value: any, currentForm = formData): string | undefined => {
    switch (name) {
      case 'fullName':
        if (!value || !value.trim()) return 'Full legal name is required';
        if (value.trim().length < 3) return 'Name must be at least 3 characters';
        if (!/^[a-zA-Z\s.']+$/.test(value.trim())) return 'Name must contain letters only';
        return undefined;

      case 'dob':
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age < 18) return 'You must be at least 18 years old to register';
          if (age > 100) return 'Please enter a valid date of birth';
        }
        return undefined;

      case 'mobile':
        if (!value || !value.trim()) return 'Mobile number is required';
        const cleanMobile = value.replace(/\D/g, '');
        if (cleanMobile.length !== 10) return 'Mobile phone number must be exactly 10 digits (numbers only)';
        if (!/^[6-9]\d{9}$/.test(cleanMobile)) return 'Enter valid Indian mobile number starting with 6, 7, 8, or 9';
        return undefined;

      case 'address':
        if (value && value.trim().length > 0 && value.trim().length < 6) {
          return 'Please enter a complete address (min. 6 characters)';
        }
        return undefined;

      case 'city':
        if (value && value.trim().length > 0) {
          if (value.trim().length < 2) return 'City name must be at least 2 characters';
          if (!/^[a-zA-Z\s]+$/.test(value.trim())) return 'City must contain letters only';
        }
        return undefined;

      case 'state':
        if (value && value.trim().length > 0) {
          if (value.trim().length < 2) return 'State name must be at least 2 characters';
          if (!/^[a-zA-Z\s]+$/.test(value.trim())) return 'State must contain letters only';
        }
        return undefined;

      case 'pinCode':
        if (currentForm.address && (!value || !value.trim())) {
          return 'PIN Code is required when address is entered';
        }
        if (value && value.trim().length > 0) {
          const cleanPin = value.replace(/\D/g, '');
          if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
            return 'PIN Code must be exactly 6 digits (numbers only)';
          }
        }
        return undefined;

      case 'email':
        if (!value || !value.trim()) return 'Email address is required';
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) {
          return 'Enter a valid email address (e.g. name@domain.com)';
        }
        return undefined;

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (!/[A-Z]/.test(value)) return 'Must contain at least one uppercase letter (A-Z)';
        if (!/[a-z]/.test(value)) return 'Must contain at least one lowercase letter (a-z)';
        if (!/[0-9]/.test(value)) return 'Must contain at least one number (0-9)';
        if (!/[^A-Za-z0-9]/.test(value)) return 'Must contain at least one special character';
        return undefined;

      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== currentForm.password) return 'Passwords do not match';
        return undefined;

      case 'panNumber':
        if (!value || !value.trim()) return 'PAN Number is required for tax & compliance';
        const cleanPan = value.trim().toUpperCase();
        if (cleanPan.length !== 10) return 'PAN must be exactly 10 characters (e.g. ABCDE1234F)';
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
          return 'Invalid PAN format (5 letters, 4 digits, 1 letter, e.g. ABCDE1234F)';
        }
        return undefined;

      case 'aadhaarNumber':
        if (value && value.trim()) {
          const cleanAadhaar = value.replace(/\D/g, '');
          if (cleanAadhaar.length !== 12 || !/^\d{12}$/.test(cleanAadhaar)) {
            return 'Aadhaar must be exactly 12 digits (numbers only)';
          }
        }
        return undefined;

      case 'bankName':
        if (!value || !value.trim()) return 'Bank name is required';
        if (value.trim().length < 2) return 'Bank name must be at least 2 characters';
        if (!/^[a-zA-Z\s.&'-]+$/.test(value.trim())) return 'Bank name must contain letters only';
        return undefined;

      case 'bankAccountHolder':
        if (!value || !value.trim()) return 'Bank beneficiary name is required';
        if (value.trim().length < 3) return 'Name must be at least 3 characters';
        if (!/^[a-zA-Z\s.']+$/.test(value.trim())) return 'Beneficiary name must contain letters only';
        return undefined;

      case 'bankAccountNumber':
        if (!value || !value.trim()) return 'Bank account number is required';
        const cleanAcc = value.replace(/\D/g, '');
        if (cleanAcc.length < 9 || cleanAcc.length > 18 || !/^\d{9,18}$/.test(cleanAcc)) {
          return 'Account number must be between 9 and 18 digits (numbers only)';
        }
        return undefined;

      case 'bankIfsc':
        if (!value || !value.trim()) return 'Bank IFSC Code is required';
        const cleanIfsc = value.trim().toUpperCase();
        if (cleanIfsc.length !== 11) return 'IFSC Code must be exactly 11 characters (e.g. HDFC0001234)';
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
          return 'Invalid IFSC format (4 letters, 0, 6 characters, e.g. HDFC0001234)';
        }
        return undefined;

      case 'agreementAccepted':
        if (!value) return 'You must accept the associate terms to proceed';
        return undefined;

      default:
        return undefined;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let nextVal: any = value;

    if (type === 'checkbox') {
      nextVal = (e.target as HTMLInputElement).checked;
    } else if (name === 'fullName') {
      nextVal = value.replace(/[^a-zA-Z\s.']/g, '');
    } else if (name === 'city' || name === 'state') {
      nextVal = value.replace(/[^a-zA-Z\s]/g, '');
    } else if (name === 'mobile') {
      let clean = value.replace(/\D/g, '');
      if (clean.length > 10 && clean.startsWith('91')) clean = clean.slice(2);
      else if (clean.length > 10 && clean.startsWith('0')) clean = clean.slice(1);
      nextVal = clean.slice(0, 10);
    } else if (name === 'pinCode') {
      nextVal = value.replace(/\D/g, '').slice(0, 6);
    } else if (name === 'aadhaarNumber') {
      nextVal = value.replace(/\D/g, '').slice(0, 12);
    } else if (name === 'bankAccountNumber') {
      nextVal = value.replace(/\D/g, '').slice(0, 18);
    } else if (name === 'panNumber') {
      nextVal = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    } else if (name === 'bankIfsc') {
      nextVal = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    } else if (name === 'bankName') {
      nextVal = value.replace(/[^a-zA-Z\s.&'-]/g, '');
    } else if (name === 'bankAccountHolder') {
      nextVal = value.replace(/[^a-zA-Z\s.']/g, '');
    }

    const nextForm = { ...formData, [name]: nextVal };
    setFormData(nextForm);

    if (touched[name]) {
      const err = validateField(name, nextVal, nextForm);
      setFieldErrors((prev) => ({ ...prev, [name]: err || '' }));
    }

    if (name === 'password' && touched.confirmPassword) {
      const confirmErr = validateField('confirmPassword', formData.confirmPassword, nextForm);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmErr || '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value, formData);
    setFieldErrors((prev) => ({ ...prev, [name]: err || '' }));
  };

  const handleNext = () => {
    setError(null);
    let stepFields: string[] = [];

    if (step === 1) {
      stepFields = ['fullName', 'mobile', 'email', 'password', 'confirmPassword'];
      if (formData.dob) stepFields.push('dob');
      if (formData.address) stepFields.push('address');
      if (formData.city) stepFields.push('city');
      if (formData.state) stepFields.push('state');
      if (formData.pinCode) stepFields.push('pinCode');
    } else if (step === 2) {
      stepFields = ['panNumber'];
      if (formData.aadhaarNumber) stepFields.push('aadhaarNumber');
    } else if (step === 3) {
      stepFields = ['bankName', 'bankAccountHolder', 'bankAccountNumber', 'bankIfsc'];
    }

    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = { ...touched };

    let hasErrors = false;
    for (const f of stepFields) {
      newTouched[f] = true;
      const err = validateField(f, (formData as any)[f], formData);
      if (err) {
        newErrors[f] = err;
        hasErrors = true;
      }
    }

    setTouched(newTouched);
    setFieldErrors((prev) => ({ ...prev, ...newErrors }));

    if (hasErrors) {
      const firstError = Object.values(newErrors)[0];
      setError(firstError || 'Please correct the highlighted errors before continuing');
      return;
    }

    setStep((prev) => prev + 1);
  };

  const getInputClasses = (fieldName: string, isMono = false, hasIconPadding = false) => {
    const isErr = touched[fieldName] && fieldErrors[fieldName];
    const isValid = touched[fieldName] && (formData as any)[fieldName] && !fieldErrors[fieldName];
    return `w-full ${hasIconPadding ? 'pl-4 pr-11' : 'px-4'} py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
      isMono ? 'font-mono' : ''
    } ${
      isErr
        ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200 text-rose-900'
        : isValid
        ? 'border-emerald-400 bg-emerald-50/10 focus:ring-emerald-200'
        : 'border-slate-300 focus:ring-[#3066BE]'
    }`;
  };

  const renderFieldError = (fieldName: string, defaultHelp?: string) => {
    if (touched[fieldName] && fieldErrors[fieldName]) {
      return (
        <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-fadeIn">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{fieldErrors[fieldName]}</span>
        </p>
      );
    }
    if (defaultHelp) {
      return <p className="text-[11px] text-slate-400 mt-1">{defaultHelp}</p>;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.agreementAccepted) {
      setTouched((prev) => ({ ...prev, agreementAccepted: true }));
      setFieldErrors((prev) => ({ ...prev, agreementAccepted: 'You must accept the associate agreement and consent terms' }));
      setError('You must accept the associate agreement and consent terms');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-bga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit registration');
      }

      setSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during registration');
    } finally {
      setLoading(false);
    }
  };

  // Password Complexity Flags for Step 1
  const pwdMinLength = formData.password.length >= 6;
  const pwdUpper = /[A-Z]/.test(formData.password);
  const pwdLower = /[a-z]/.test(formData.password);
  const pwdNumber = /[0-9]/.test(formData.password);
  const pwdSpecial = /[^A-Za-z0-9]/.test(formData.password);
  const pwdMatches = formData.password.length > 0 && formData.password === formData.confirmPassword;

  const stepsMeta = [
    { num: 1, title: 'Personal & Profile', icon: User },
    { num: 2, title: 'KYC & Compliance', icon: ShieldCheck },
    { num: 3, title: 'Bank Account', icon: CreditCard },
    { num: 4, title: 'Agreement & Terms', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-12 flex-1 w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#edf4fc] border border-[#6D96C5]/30 text-[#3066BE] text-xs font-bold mb-3 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#119DA4]" />
            <span>Atriowings Technologies • Official Associate Onboarding</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Become an Atriowings Growth Associate
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto font-normal">
            Complete the 4-step registration to start referring enterprise clients and earning predictable commissions with Atriowings Technologies.
          </p>
        </div>

        {/* Success Screen */}
        {success ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#80DED9]/60 shadow-card text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-[#e7f7f8] text-[#119DA4] flex items-center justify-center mx-auto mb-4 border border-[#80DED9]/40 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-2">
              Workflow Status: SUBMITTED
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Registration Submitted!</h2>

            <p className="text-xs sm:text-sm text-slate-600 mt-3 max-w-lg mx-auto leading-relaxed">
              Your associate profile, PAN, Aadhaar consent, and banking details have been recorded. In accordance with
              company security and KYC compliance, accounts are reviewed by Administration before activation.
            </p>

            <div className="mt-6 p-5 rounded-2xl bg-[#edf4fc]/50 border border-[#6D96C5]/20 text-left text-xs max-w-md mx-auto space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Associate Name:</span>
                <span className="font-bold text-slate-800">{formData.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Registered Email:</span>
                <span className="font-bold text-slate-800">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Verification Status:</span>
                <span className="font-bold text-amber-600">Pending Admin Verification</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                Go to Atriowings Growth Portal
              </button>
              <Link
                to="/"
                className="px-7 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card overflow-hidden">
            {/* Step Indicators */}
            <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/70 text-xs font-semibold">
              {stepsMeta.map((s) => {
                const Icon = s.icon;
                const isActive = step === s.num;
                const isCompleted = step > s.num;
                return (
                  <div
                    key={s.num}
                    className={`p-3.5 text-center border-r border-slate-200 last:border-r-0 flex items-center justify-center gap-2 transition-colors ${
                      isActive
                        ? 'bg-white text-[#3066BE] font-bold border-b-2 border-b-[#3066BE]'
                        : isCompleted
                        ? 'text-[#119DA4] bg-[#e7f7f8]/50'
                        : 'text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 hidden sm:inline" />
                    <span className="truncate">
                      {s.num}. {s.title}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-6 sm:p-8">
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: PERSONAL & CONTACT */}
              {step === 1 && (
                <div className="space-y-4 text-xs animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-slate-900">Step 1: Personal & Account Credentials</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Enter your basic identification details to create your associate profile.</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="As per Government ID (Aadhaar / PAN)"
                      className={getInputClasses('fullName')}
                    />
                    {renderFieldError('fullName', 'Enter your full name as registered in official documents')}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getInputClasses('dob')}
                      />
                      {renderFieldError('dob', 'Must be at least 18 years of age')}
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Mobile Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        required
                        inputMode="numeric"
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        value={formData.mobile}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="10-digit mobile number"
                        className={getInputClasses('mobile', true)}
                      />
                      {renderFieldError('mobile', '10 digits without +91 or leading 0')}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
                    <textarea
                      name="address"
                      rows={2}
                      value={formData.address}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Flat / House No., Building, Street Name, Area / Locality"
                      className={getInputClasses('address')}
                    />
                    {renderFieldError('address', 'House, street, and locality details')}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Kanchipuram"
                        className={getInputClasses('city')}
                      />
                      {renderFieldError('city')}
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Tamil Nadu"
                        className={getInputClasses('state')}
                      />
                      {renderFieldError('state')}
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        name="pinCode"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={formData.pinCode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. 631501"
                        className={getInputClasses('pinCode', true)}
                      />
                      {renderFieldError('pinCode', '6-digit PIN code (numbers only)')}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="name@domain.com"
                      className={getInputClasses('email')}
                    />
                    {renderFieldError('email', 'Used for official notifications & login credentials')}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Min. 6 characters"
                          className={getInputClasses('password', false, true)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none transition-colors"
                          title={showPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {renderFieldError('password', 'Requires uppercase, lowercase, number, special char')}
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          required
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Re-enter password"
                          className={getInputClasses('confirmPassword', false, true)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none transition-colors"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {touched.confirmPassword && fieldErrors.confirmPassword ? (
                        <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.confirmPassword}</span>
                        </p>
                      ) : touched.confirmPassword && formData.confirmPassword && !fieldErrors.confirmPassword ? (
                        <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Passwords match</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1">Must match password</p>
                      )}
                    </div>
                  </div>

                  {/* Real-time Password Complexity Checklist */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 mt-3">
                    <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                      Requirements:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${pwdMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {pwdMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>6+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdUpper ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {pwdUpper ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Uppercase (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdLower ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {pwdLower ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Lowercase (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {pwdNumber ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {pwdSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Special character</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdMatches ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {pwdMatches ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Passwords match</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: KYC & COMPLIANCE */}
              {step === 2 && (
                <div className="space-y-4 text-xs animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-slate-900">Step 2: KYC & Tax Compliance</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Government identification details required for TDS compliance and associate verification.</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Permanent Account Number (PAN) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="panNumber"
                      required
                      maxLength={10}
                      pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                      value={formData.panNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. ABCDE1234F"
                      className={getInputClasses('panNumber', true)}
                    />
                    {renderFieldError('panNumber', '5 letters, 4 digits, 1 letter (used for statutory TDS compliance)')}
                  </div>

                  <DocumentUploadField
                    label="Upload PAN Card Document"
                    helpText="Upload a clear scan or photo of your official PAN card (PDF, JPG, PNG)."
                    value={formData.panDocumentUrl}
                    docName={docMeta.panDocumentUrl?.name}
                    docSize={docMeta.panDocumentUrl?.size}
                    onUploaded={(url, name, size) => {
                      setFormData((prev) => ({ ...prev, panDocumentUrl: url }));
                      setDocMeta((prev) => ({ ...prev, panDocumentUrl: { name, size } }));
                      setFieldErrors((prev) => ({ ...prev, panDocumentUrl: '' }));
                    }}
                    onRemove={() => {
                      setFormData((prev) => ({ ...prev, panDocumentUrl: '' }));
                      setDocMeta((prev) => {
                        const copy = { ...prev };
                        delete copy.panDocumentUrl;
                        return copy;
                      });
                    }}
                    error={touched.panDocumentUrl ? fieldErrors.panDocumentUrl : undefined}
                  />

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Aadhaar Number (12 Digits)</label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      inputMode="numeric"
                      pattern="[0-9]{12}"
                      maxLength={12}
                      value={formData.aadhaarNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. 123456789012"
                      className={getInputClasses('aadhaarNumber', true)}
                    />
                    {renderFieldError('aadhaarNumber', 'Enter 12-digit UIDAI Aadhaar number (numbers only).')}
                  </div>

                  <DocumentUploadField
                    label="Upload Aadhaar / Address Proof Document"
                    helpText="Upload front & back copy of Aadhaar card, Voter ID, Passport, or utility bill."
                    value={formData.addressProofUrl}
                    docName={docMeta.addressProofUrl?.name}
                    docSize={docMeta.addressProofUrl?.size}
                    onUploaded={(url, name, size) => {
                      setFormData((prev) => ({ ...prev, addressProofUrl: url }));
                      setDocMeta((prev) => ({ ...prev, addressProofUrl: { name, size } }));
                      setFieldErrors((prev) => ({ ...prev, addressProofUrl: '' }));
                    }}
                    onRemove={() => {
                      setFormData((prev) => ({ ...prev, addressProofUrl: '' }));
                      setDocMeta((prev) => {
                        const copy = { ...prev };
                        delete copy.addressProofUrl;
                        return copy;
                      });
                    }}
                    error={touched.addressProofUrl ? fieldErrors.addressProofUrl : undefined}
                  />

                  <div className="p-4 rounded-xl bg-[#edf4fc] border border-[#6D96C5]/30 text-slate-700 space-y-1">
                    <span className="font-bold block text-slate-900">Compliance & Privacy Guarantee:</span>
                    <p className="text-[11px] leading-relaxed">
                      All identity credentials are used strictly for company onboarding and Indian statutory tax filing. All identity documents are verified by company administration for onboarding and regulatory compliance.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: BANK DETAILS */}
              {step === 3 && (
                <div className="space-y-4 text-xs animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-slate-900">Step 3: Bank Account for Commission Payouts</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Direct bank transfer details for approved monthly and project payouts.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Bank Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bankName"
                        required
                        value={formData.bankName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. HDFC Bank, SBI, ICICI"
                        className={getInputClasses('bankName')}
                      />
                      {renderFieldError('bankName', 'Official name of your bank')}
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Bank Account Beneficiary Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bankAccountHolder"
                        required
                        value={formData.bankAccountHolder}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Name as registered with your bank"
                        className={getInputClasses('bankAccountHolder')}
                      />
                      {renderFieldError('bankAccountHolder', 'Must match official bank account records')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Bank Account Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bankAccountNumber"
                        required
                        inputMode="numeric"
                        pattern="[0-9]{9,18}"
                        maxLength={18}
                        value={formData.bankAccountNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. 9876543210123"
                        className={getInputClasses('bankAccountNumber', true)}
                      />
                      {renderFieldError('bankAccountNumber', 'Between 9 and 18 numeric digits (numbers only)')}
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Bank IFSC Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bankIfsc"
                        required
                        maxLength={11}
                        pattern="[A-Z]{4}0[A-Z0-9]{6}"
                        value={formData.bankIfsc}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. HDFC0001234"
                        className={getInputClasses('bankIfsc', true)}
                      />
                      {renderFieldError('bankIfsc', '11-character alphanumeric IFSC code (e.g. HDFC0001234)')}
                    </div>
                  </div>

                  <DocumentUploadField
                    label="Upload Bank Proof Document"
                    helpText="Upload a cancelled cheque, passbook first page, or bank statement clearly showing your name and account number."
                    value={formData.bankProofUrl}
                    docName={docMeta.bankProofUrl?.name}
                    docSize={docMeta.bankProofUrl?.size}
                    onUploaded={(url, name, size) => {
                      setFormData((prev) => ({ ...prev, bankProofUrl: url }));
                      setDocMeta((prev) => ({ ...prev, bankProofUrl: { name, size } }));
                      setFieldErrors((prev) => ({ ...prev, bankProofUrl: '' }));
                    }}
                    onRemove={() => {
                      setFormData((prev) => ({ ...prev, bankProofUrl: '' }));
                      setDocMeta((prev) => {
                        const copy = { ...prev };
                        delete copy.bankProofUrl;
                        return copy;
                      });
                    }}
                    error={touched.bankProofUrl ? fieldErrors.bankProofUrl : undefined}
                  />

                  <div className="p-4 rounded-xl bg-[#e7f7f8] border border-[#80DED9]/50 text-slate-700">
                    <p className="text-[11px] leading-relaxed">
                      💡 Ensure the beneficiary name matches your registered identity documents to prevent bank verification delays during admin approval.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 4: AGREEMENT & SUBMIT */}
              {step === 4 && (
                <div className="space-y-4 text-xs animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-slate-900">Step 4: Associate Agreement & Terms</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Please review and accept our growth associate code of conduct and revenue sharing terms.</p>
                  </div>

                  <div className="max-h-48 overflow-y-auto p-4 rounded-xl border border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-2 leading-relaxed">
                    <p className="font-bold text-slate-800">1. Associate Role & Representation</p>
                    <p>
                      The Business Growth Associate acts as an authorized client referral partner. The associate agrees to conduct interactions with high professional integrity and represent official service scopes accurately.
                    </p>
                    <p className="font-bold text-slate-800">2. Client Ownership Exclusivity</p>
                    <p>
                      Clients registered by an associate are protected under exclusive ownership. Any dispute regarding client assignment is resolved through normalized mobile/email timestamp records.
                    </p>
                    <p className="font-bold text-slate-800">3. Commission Terms & Exclusions</p>
                    <p>
                      Associate commissions are determined on an approved client project basis within Admin-configured category ranges. For Digital Marketing, recurring commissions apply to verified service retainers with third-party ad spend strictly excluded. For Web, Mobile, and Custom Software projects, commissions are eligible upon milestone sign-off and verified final payment clearance.
                    </p>
                  </div>

                  <div className="pt-2">
                    <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      touched.agreementAccepted && fieldErrors.agreementAccepted
                        ? 'border-rose-400 bg-rose-50/30'
                        : formData.agreementAccepted
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="checkbox"
                        name="agreementAccepted"
                        checked={formData.agreementAccepted}
                        onChange={handleChange}
                        className="mt-0.5 w-4 h-4 text-[#3066BE] rounded border-slate-300 focus:ring-[#3066BE]"
                      />
                      <span className="text-xs text-slate-700 leading-relaxed">
                        I hereby declare that the details provided are true and accurate. I accept the Business Growth
                        Associate terms, commission structure, and privacy policies.
                      </span>
                    </label>
                    {renderFieldError('agreementAccepted')}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep((prev) => prev - 1);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                ) : (
                  <Link to="/login" className="text-xs text-[#3066BE] font-bold hover:underline">
                    Already registered? Sign in
                  </Link>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <span>Proceed to Step {step + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading || !formData.agreementAccepted}
                    onClick={handleSubmit}
                    className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] hover:from-[#25549e] hover:to-[#0d8187] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{loading ? 'Submitting Application...' : 'Submit BGA Application'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterBgaPage;
