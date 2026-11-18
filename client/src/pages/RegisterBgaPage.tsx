import React, { useState } from 'react';
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
} from 'lucide-react';
import { Navbar } from '../components/Navbar';

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

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    address: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    panNumber: '',
    aadhaarNumber: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankIfsc: '',
    agreementAccepted: false,
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
        if (cleanMobile.length !== 10) return 'Mobile number must be exactly 10 digits';
        if (!/^[6-9]\d{9}$/.test(cleanMobile)) return 'Enter valid Indian mobile number starting with 6, 7, 8, or 9';
        return undefined;

      case 'address':
        if (value && value.trim().length > 0 && value.trim().length < 6) {
          return 'Please enter a complete address (min. 6 characters)';
        }
        return undefined;

      case 'email':
        if (!value || !value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) return 'Enter a valid email address (e.g. name@domain.com)';
        return undefined;

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return undefined;

      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== currentForm.password) return 'Passwords do not match';
        return undefined;

      case 'panNumber':
        if (!value || !value.trim()) return 'PAN Number is required for tax & compliance';
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.trim().toUpperCase())) {
          return 'Invalid PAN format (e.g. ABCDE1234F: 5 letters, 4 digits, 1 letter)';
        }
        return undefined;

      case 'aadhaarNumber':
        if (value && value.trim()) {
          const cleanAadhaar = value.replace(/\D/g, '');
          if (cleanAadhaar.length !== 12) return 'Aadhaar must be a 12-digit number';
        }
        return undefined;

      case 'bankAccountHolder':
        if (!value || !value.trim()) return 'Bank beneficiary name is required';
        if (value.trim().length < 3) return 'Name must be at least 3 characters';
        return undefined;

      case 'bankAccountNumber':
        if (!value || !value.trim()) return 'Bank account number is required';
        const cleanAcc = value.replace(/\D/g, '');
        if (cleanAcc.length < 9 || cleanAcc.length > 18) return 'Account number must be between 9 and 18 digits';
        return undefined;

      case 'bankIfsc':
        if (!value || !value.trim()) return 'Bank IFSC Code is required';
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.trim().toUpperCase())) {
          return 'Invalid IFSC format (e.g. HDFC0001234: 4 letters, 0, 6 characters)';
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
    } else if (name === 'panNumber' || name === 'bankIfsc') {
      nextVal = value.toUpperCase();
    } else if (name === 'mobile' || name === 'aadhaarNumber' || name === 'bankAccountNumber') {
      nextVal = value.replace(/\D/g, '');
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
    } else if (step === 2) {
      stepFields = ['panNumber'];
      if (formData.aadhaarNumber) stepFields.push('aadhaarNumber');
    } else if (step === 3) {
      stepFields = ['bankAccountHolder', 'bankAccountNumber', 'bankIfsc'];
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
                      placeholder="Door No, Street, Locality, City, State, PIN"
                      className={getInputClasses('address')}
                    />
                    {renderFieldError('address')}
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
                      {renderFieldError('password', 'Minimum 6 characters')}
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
                      value={formData.panNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. ABCDE1234F"
                      className={getInputClasses('panNumber', true)}
                    />
                    {renderFieldError('panNumber', '5 letters, 4 digits, 1 letter (used for statutory TDS compliance)')}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Aadhaar Number (12 Digits)</label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      maxLength={12}
                      value={formData.aadhaarNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. 123456789012"
                      className={getInputClasses('aadhaarNumber', true)}
                    />
                    {renderFieldError('aadhaarNumber', 'Stored in masked format (XXXX-XXXX-1234) for security and privacy protection.')}
                  </div>

                  <div className="p-4 rounded-xl bg-[#edf4fc] border border-[#6D96C5]/30 text-slate-700 space-y-1">
                    <span className="font-bold block text-slate-900">Compliance & Privacy Guarantee:</span>
                    <p className="text-[11px] leading-relaxed">
                      All identity credentials are used strictly for company onboarding and Indian statutory tax filing. Sensitive numbers are masked in accordance with Indian regulatory norms.
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Bank Account Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bankAccountNumber"
                        required
                        maxLength={18}
                        value={formData.bankAccountNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. 9876543210123"
                        className={getInputClasses('bankAccountNumber', true)}
                      />
                      {renderFieldError('bankAccountNumber', 'Between 9 and 18 numeric digits')}
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
                        value={formData.bankIfsc}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. HDFC0001234"
                        className={getInputClasses('bankIfsc', true)}
                      />
                      {renderFieldError('bankIfsc', '11-character alphanumeric IFSC code (e.g. HDFC0001234)')}
                    </div>
                  </div>

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
                      Digital Marketing commission (15%) is recurring on verified monthly fees, with ad spend strictly excluded. Web, Mobile, and Software commissions (10-12%) are eligible upon milestone sign-off and verified final client receipt.
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
