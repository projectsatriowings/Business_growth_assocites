import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailError('Please enter your registered email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address (e.g. name@domain.com).');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to submit password reset request. Please try again.');
        setLoading(false);
        return;
      }

      // Display the anti-enumeration confirmation card
      setIsSubmitted(true);
    } catch {
      setError('Cannot connect to authentication service. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout customSubtitle="Secure password recovery for your Growth Associate account.">
      {isSubmitted ? (
        <AuthCard
          title="Check Your Email"
          subtitle="Password reset instructions have been dispatched."
        >
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <p className="text-xs sm:text-sm text-[#60769B] leading-relaxed">
              We've received your password reset request. If an account exists for{' '}
              <strong className="text-[#10244D]">{email}</strong>, you'll receive a secure password reset link valid for 30 minutes.
            </p>

            <div className="pt-4">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#0879E8] to-[#123FAD] shadow-[0_6px_20px_rgba(8,121,232,0.28)] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </AuthCard>
      ) : (
        <AuthCard
          title="Forgot Your Password?"
          subtitle="Don't worry. Enter your registered email address and we'll help you reset your password."
          error={error}
        >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#60769B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="Enter registered email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  className={`w-full text-xs font-medium text-[#10244D] bg-white border rounded-xl py-3.5 pl-10 pr-4 placeholder:text-[#60769B]/70 transition-all focus:outline-none focus:ring-2 ${
                    emailError
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                  }`}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {emailError && (
                <p className="text-[11px] text-rose-600 font-medium pl-1">{emailError}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-[0_6px_20px_rgba(8,121,232,0.28)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  loading
                    ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#0879E8] to-[#123FAD] hover:from-[#076cd0] hover:to-[#0f3494] hover:shadow-[0_8px_24px_rgba(8,121,232,0.36)] active:scale-[0.99]'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 rounded-full bg-white text-[#0879E8] flex items-center justify-center font-bold text-[10px] shrink-0">
                      ➔
                    </span>
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-3">
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

export default ForgotPasswordPage;
