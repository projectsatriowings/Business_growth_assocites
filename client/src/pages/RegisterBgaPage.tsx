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
} from 'lucide-react';
import { Navbar } from '../components/Navbar';

export const RegisterBgaPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!formData.fullName || !formData.mobile || !formData.email || !formData.password) {
        setError('Please fill in all mandatory profile fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (formData.mobile.replace(/\D/g, '').length < 10) {
        setError('Please provide a valid 10-digit mobile number');
        return;
      }
    } else if (step === 2) {
      if (!formData.panNumber) {
        setError('PAN Number is required for tax & compliance');
        return;
      }
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(formData.panNumber.trim().toUpperCase())) {
        setError('Invalid PAN format. Standard format is 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)');
        return;
      }
      if (formData.aadhaarNumber && formData.aadhaarNumber.replace(/\D/g, '').length !== 12) {
        setError('Aadhaar must be a 12-digit number');
        return;
      }
    } else if (step === 3) {
      if (!formData.bankAccountHolder || !formData.bankAccountNumber || !formData.bankIfsc) {
        setError('Complete bank details are required for commission disbursement');
        return;
      }
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(formData.bankIfsc.trim().toUpperCase())) {
        setError('Invalid IFSC Code format (e.g. HDFC0001234)');
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.agreementAccepted) {
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
                    <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="As per Government ID (Aadhaar / PAN)"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Mobile Phone Number *</label>
                      <input
                        type="tel"
                        name="mobile"
                        required
                        value={formData.mobile}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
                    <textarea
                      name="address"
                      rows={2}
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Door No, Street, Locality, City, State, PIN"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@domain.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Password *</label>
                      <input
                        type="password"
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min. 6 characters"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Confirm Password *</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
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
                    <label className="block font-bold text-slate-700 mb-1">Permanent Account Number (PAN) *</label>
                    <input
                      type="text"
                      name="panNumber"
                      required
                      maxLength={10}
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Used for TDS deduction on eligible commission disbursements.</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Aadhaar Number (12 Digits)</label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      maxLength={12}
                      value={formData.aadhaarNumber}
                      onChange={handleChange}
                      placeholder="e.g. 123456789012"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Stored in masked format (XXXX-XXXX-1234) for security and privacy protection.
                    </p>
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
                    <label className="block font-bold text-slate-700 mb-1">Bank Account Beneficiary Name *</label>
                    <input
                      type="text"
                      name="bankAccountHolder"
                      required
                      value={formData.bankAccountHolder}
                      onChange={handleChange}
                      placeholder="Name as registered with your bank"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Bank Account Number *</label>
                      <input
                        type="text"
                        name="bankAccountNumber"
                        required
                        value={formData.bankAccountNumber}
                        onChange={handleChange}
                        placeholder="e.g. 9876543210123"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Bank IFSC Code *</label>
                      <input
                        type="text"
                        name="bankIfsc"
                        required
                        maxLength={11}
                        value={formData.bankIfsc}
                        onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                        placeholder="e.g. HDFC0001234"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
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
                    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
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
