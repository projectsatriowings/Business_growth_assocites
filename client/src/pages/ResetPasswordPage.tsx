import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';

interface TokenVerification {
  valid: boolean;
  email?: string;
  name?: string;
  role?: string;
  error?: string;
}

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [verification, setVerification] = useState<TokenVerification | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Validate Token on Mount
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setVerification({
        valid: false,
        error: 'Missing password reset token in link. Please use the complete link provided in your email.',
      });
      return;
    }

    const verifyToken = async () => {
      setVerifying(true);
      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setVerification({
            valid: false,
            error: data.error || 'This password reset link is invalid or has expired.',
          });
        } else {
          setVerification({
            valid: true,
            email: data.email,
            name: data.name,
            role: data.role,
          });
        }
      } catch (err: any) {
        setVerification({
          valid: false,
          error: 'Unable to connect to verification server. Please ensure the backend server is reachable.',
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Password Validation Criteria
  const hasMinLength = newPassword.length >= 6;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isFormValid) {
      setSubmitError('Please ensure all password security requirements are fulfilled.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to reset password. Please try again or request a new link.');
        setSubmitting(false);
        return;
      }

      setResetSuccess(true);
    } catch (err: any) {
      setSubmitError('Failed to communicate with authentication service. Please check your network.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Header Branding */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group justify-center">
              <img
                src="/favicon.png"
                alt="Atriowings Technologies"
                className="w-8 h-8 rounded-lg object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span className="text-base font-bold text-slate-800 tracking-tight">
                Atriowings Technologies
              </span>
            </Link>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Reset Your Password
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Create a strong, new password for your enterprise account
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            {/* 1. Verifying State */}
            {verifying && (
              <div className="text-center py-10 space-y-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-spin">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Verifying Security Token...</h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Please hold on while we validate your single-use password recovery authorization.
                </p>
              </div>
            )}

            {/* 2. Invalid or Expired Token */}
            {!verifying && verification && !verification.valid && (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7" />
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Recovery Link Invalid or Expired</h2>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed px-2">
                    {verification.error}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 text-left">
                  <strong className="block font-bold mb-1">Why might this happen?</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Recovery links expire 30 minutes after issuance.</li>
                    <li>The link has already been used once.</li>
                    <li>A newer password reset was requested.</li>
                  </ul>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    onClick={() => navigate('/login?forgot=true')}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Request a New Reset Link</span>
                  </button>

                  <Link
                    to="/login"
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold py-1 block text-center"
                  >
                    Return to Sign In
                  </Link>
                </div>
              </div>
            )}

            {/* 3. Password Reset Success */}
            {!verifying && resetSuccess && (
              <div className="text-center py-6 space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Password Reset Complete!</h2>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Your account password has been updated securely. You can now use your new password to sign in across all authorized portals.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left">
                  <span className="font-semibold text-slate-800 block mb-0.5">Global Single-Credential Protection</span>
                  Your updated password is now active across Admin, BGA, Accounts, and Technical portals.
                </div>

                <div className="pt-2">
                  <Link
                    to="/login"
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Sign In &rarr;</span>
                  </Link>
                </div>
              </div>
            )}

            {/* 4. Valid Form State */}
            {!verifying && verification && verification.valid && !resetSuccess && (
              <div>
                {/* Account Context Badge */}
                <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Target Account
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {verification.name || 'Enterprise User'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {verification.email}
                    </span>
                  </div>
                  {verification.role && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase">
                      {verification.role}
                    </span>
                  )}
                </div>

                {submitError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter secure new password"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors ${
                          confirmPassword && !passwordsMatch
                            ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Real-Time Password Checklist */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <span className="font-bold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">
                      Security Requirements:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>At least 6 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {hasLower ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>At least one number</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Special character (!@#$)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                        {passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Passwords match</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!isFormValid || submitting}
                    className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{submitting ? 'Updating Password...' : 'Save New Password & Complete'}</span>
                  </button>

                  <div className="pt-2 text-center">
                    <Link
                      to="/login"
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </Link>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
