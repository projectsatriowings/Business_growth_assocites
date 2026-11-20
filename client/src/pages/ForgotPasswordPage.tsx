import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthPrimaryButton } from '../components/auth/AuthPrimaryButton';

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
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
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
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <AuthInput
              label="Registered Email Address"
              type="email"
              icon={Mail}
              placeholder="associate@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              error={emailError || undefined}
              required
              autoComplete="email"
              autoFocus
            />

            <AuthPrimaryButton loading={loading} loadingText="Sending Reset Link...">
              Send Reset Link
            </AuthPrimaryButton>

            <div className="text-center pt-2">
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
