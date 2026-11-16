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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-12 flex-1 w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Official Associate Onboarding
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Become a Business Growth Associate</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto">
            Complete the 4-step registration to start referring enterprise clients and earning recurring commissions.
          </p>
        </div>

        {/* Success Screen */}
        {success ? (
          <div className="bg-white rounded-2xl p-8 border border-emerald-200 shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
              Workflow Status: SUBMITTED
            </span>

            <h2 className="text-2xl font-bold text-slate-900">Registration Submitted Successfully!</h2>

            <p className="text-xs text-slate-600 mt-3 max-w-lg mx-auto leading-relaxed">
              Your associate profile, PAN, Aadhaar consent, and banking details have been recorded. In accordance with
              company security and KYC compliance, accounts are not activated automatically.
            </p>

            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs max-w-md mx-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Associate Name:</span>
                <span className="font-semibold text-slate-800">{formData.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Email:</span>
                <span className="font-semibold text-slate-800">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verification State:</span>
                <span className="font-semibold text-amber-600">Pending Admin Verification</span>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => navigate('/login/bga')}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
              >
                Go to BGA Portal Login
              </button>
              <Link
                to="/"
                className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Step Indicators */}
            <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/50 text-xs font-semibold">
              <div
                className={`p-3.5 text-center border-r border-slate-200 flex items-center justify-center gap-1.5 ${
                  step === 1 ? 'bg-indigo-50/80 text-indigo-700 border-b-2 border-b-indigo-600' : 'text-slate-500'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">1. Profile</span>
              </div>
              <div
                className={`p-3.5 text-center border-r border-slate-200 flex items-center justify-center gap-1.5 ${
                  step === 2 ? 'bg-indigo-50/80 text-indigo-700 border-b-2 border-b-indigo-600' : 'text-slate-500'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">2. KYC / PAN</span>
              </div>
              <div
                className={`p-3.5 text-center border-r border-slate-200 flex items-center justify-center gap-1.5 ${
                  step === 3 ? 'bg-indigo-50/80 text-indigo-700 border-b-2 border-b-indigo-600' : 'text-slate-500'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">3. Bank Info</span>
              </div>
              <div
                className={`p-3.5 text-center flex items-center justify-center gap-1.5 ${
                  step === 4 ? 'bg-indigo-50/80 text-indigo-700 border-b-2 border-b-indigo-600' : 'text-slate-500'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">4. Agreement</span>
              </div>
            </div>

            {error && (
              <div className="m-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-6 sm:p-8">
              {/* Step 1: Personal Details */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                    Step 1: Associate Personal & Contact Information
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Ramesh Chandra"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (10 digits) *</label>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        placeholder="9876543210"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="associate@example.com"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Address / City</label>
                    <textarea
                      name="address"
                      rows={2}
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Residential / Office location"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Create Password *</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Minimum 6 characters"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm password"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: KYC & Identification */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                    Step 2: PAN & Identity Verification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compliant verification to ensure accurate commission TDS withholding and identity proof.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Permanent Account Number (PAN) *
                    </label>
                    <input
                      type="text"
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={handleChange}
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Standard format: 5 uppercase letters, 4 digits, 1 uppercase letter.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Aadhaar Number (12 digits)
                    </label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      value={formData.aadhaarNumber}
                      onChange={handleChange}
                      maxLength={12}
                      placeholder="1234 5678 9012"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                      🔒 <strong>Privacy & Compliance Notice:</strong> In adherence with regulatory guidelines, our system does
                      not store raw Aadhaar numbers or OTPs. Numbers are masked as <code>XXXX-XXXX-####</code> and verified via
                      authorized verification providers.
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Banking & Payouts */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                    Step 3: Bank Account for Direct Commission Disbursement
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your verified bank account where all approved commission payouts will be directly transferred via NEFT/IMPS.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account Holder Name *</label>
                    <input
                      type="text"
                      name="bankAccountHolder"
                      value={formData.bankAccountHolder}
                      onChange={handleChange}
                      placeholder="As per bank passbook / cheque"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account Number *</label>
                    <input
                      type="text"
                      name="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={handleChange}
                      placeholder="e.g. 123456789012"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code *</label>
                    <input
                      type="text"
                      name="bankIfsc"
                      value={formData.bankIfsc}
                      onChange={handleChange}
                      maxLength={11}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Consent & Legal Agreement */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                    Step 4: Associate Terms & Legal Consent
                  </h3>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2 max-h-48 overflow-y-auto">
                    <p className="font-bold text-slate-800">BUSINESS GROWTH ASSOCIATE AGREEMENT & CONFIDENTIALITY TERMS</p>
                    <p>
                      1. <strong>Exclusive Client Ownership:</strong> Registered clients are exclusively assigned to the
                      introducing Associate. Client poaching or duplicate claims are strictly forbidden.
                    </p>
                    <p>
                      2. <strong>Quotation Protocol:</strong> Official commercial quotations are prepared exclusively by the
                      Company Accounts Department. Associates shall not issue independent binding quotes.
                    </p>
                    <p>
                      3. <strong>Commission Eligibility:</strong> Digital Marketing commissions are disbursed per verified monthly
                      fee (excluding ad spend). IT Development commissions are payable strictly upon project completion and verified
                      final payment.
                    </p>
                    <p>
                      4. <strong>Account Verification:</strong> Access to portal tools is subject to Admin approval of KYC
                      and banking credentials.
                    </p>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        name="agreementAccepted"
                        checked={formData.agreementAccepted}
                        onChange={handleChange}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>
                        I have read, understood, and accept the Business Growth Associate terms, confidentiality conditions, and
                        consent to identity verification.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => { setError(null); setStep(step - 1); }}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                ) : (
                  <Link to="/login" className="text-xs text-indigo-600 hover:underline font-semibold">
                    Already registered? Log in here
                  </Link>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Submitting Registration...' : 'Submit Application'}
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

