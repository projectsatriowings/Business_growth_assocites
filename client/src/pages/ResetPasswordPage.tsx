import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft, Check, X, RefreshCw } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthPrimaryButton } from '../components/auth/AuthPrimaryButton';

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
        error: 'Missing password reset token. Please use the secure link sent to your email.',
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
            error: data.error || 'This password reset link is invalid or has expired (valid for 30 minutes).',
          });
        } else {
          setVerification({
            valid: true,
            email: data.email,
            name: data.name,
            role: data.role,
          });
        }
      } catch {
        setVerification({
          valid: false,
          error: 'Unable to connect to verification server. Please ensure the backend server is running.',
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Password Validation Criteria according to backend policy
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
      setSubmitError('Please fulfill all password security requirements before proceeding.');
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to update password. Please request a new reset link.');
        setSubmitting(false);
        return;
      }

      setResetSuccess(true);
    } catch {
      setSubmitError('Cannot connect to authentication service. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout customSubtitle="Configure a strong, secure password for your Growth Associate portal account.">
      {/* 1. Verifying Token State */}
      {verifying ? (
        <AuthCard
          title="Verifying Security Token"
          subtitle="Validating your password reset token with Atriowings authentication service..."
        >
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#0879E8] animate-spin" />
            <p className="text-xs font-semibold text-[#60769B]">Securing connection...</p>
          </div>
        </AuthCard>
      ) : /* 2. Invalid or Expired Token State */
      !verification?.valid ? (
        <AuthCard
          title="Reset Link Invalid or Expired"
          subtitle="We could not verify your security reset token."
          error={verification?.error}
        >
          <div className="py-4 space-y-4 text-center">
            <p className="text-xs text-[#60769B] leading-relaxed">
              For security, password reset tokens are single-use and expire after 30 minutes. You can request a fresh reset link right now.
            </p>

            <div className="pt-2 space-y-2.5">
              <Link
                to="/forgot-password"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#0879E8] to-[#123FAD] shadow-[0_6px_20px_rgba(8,121,232,0.28)] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] transition-all"
              >
                Request New Reset Link
              </Link>
              <div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0879E8] hover:text-[#123FAD] hover:underline transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </AuthCard>
      ) : /* 3. Password Successfully Reset State */
      resetSuccess ? (
        <AuthCard
          title="Password Updated Successfully"
          subtitle="Your password has been updated. You can now sign in using your new password."
        >
          <div className="text-center py-4 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <p className="text-xs sm:text-sm text-[#60769B] leading-relaxed">
              Your credentials have been securely updated in the Atriowings authentication system. Please proceed to sign in with your updated password.
            </p>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#0879E8] to-[#123FAD] shadow-[0_6px_20px_rgba(8,121,232,0.28)] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] transition-all"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        </AuthCard>
      ) : (
        /* 4. Active Reset Password Form */
        <AuthCard
          title="Create a New Password"
          subtitle="Choose a strong password to secure your Growth Associate account."
          error={submitError}
          info={
            verification?.email
              ? `Resetting password for registered account: ${verification.email}`
              : null
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* New Password */}
            <AuthInput
              label="New Password"
              icon={Lock}
              placeholder="Enter new password"
              isPassword
              showPasswordToggle
              showPassword={showNewPassword}
              onTogglePassword={() => setShowNewPassword(!showNewPassword)}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            {/* Password Policy Checklist */}
            <div className="p-3.5 rounded-xl bg-[#F5F9FF] border border-[#D6E2F2] space-y-1.5 text-[11px]">
              <span className="font-bold text-[#10244D] block mb-1">Password Requirements:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#60769B]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-semibold' : ''}`}>
                  {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  <span>At least 6 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 font-semibold' : ''}`}>
                  {hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  <span>One uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 font-semibold' : ''}`}>
                  {hasLower ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  <span>One lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-semibold' : ''}`}>
                  {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  <span>One number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 col-span-1 sm:col-span-2 ${hasSpecial ? 'text-emerald-600 font-semibold' : ''}`}>
                  {hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  <span>One special character (e.g. @#$%^&*)</span>
                </div>
              </div>
            </div>

            {/* Confirm New Password */}
            <AuthInput
              label="Confirm New Password"
              icon={Lock}
              placeholder="Re-enter new password"
              isPassword
              showPasswordToggle
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={
                confirmPassword && !passwordsMatch
                  ? 'Passwords do not match.'
                  : undefined
              }
              required
              autoComplete="new-password"
            />

            {/* Primary Submit */}
            <div className="pt-2">
              <AuthPrimaryButton
                loading={submitting}
                loadingText="Updating Password..."
                disabled={!isFormValid}
              >
                Reset Password
              </AuthPrimaryButton>
            </div>

            <div className="text-center pt-1">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0879E8] hover:text-[#123FAD] hover:underline transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        </AuthCard>
      )}
    </AuthLayout>
  );
};

export default ResetPasswordPage;
