import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Field validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validate = (): boolean => {
    let valid = true;
    setEmailError(null);
    setPasswordError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Registered email address is required.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email format.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    }

    return valid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (data.status && data.status !== 'ACTIVE') {
          setInfo(
            data.error ||
              'Your registration is currently awaiting verification and Admin approval.'
          );
        } else {
          setError(
            data.error ||
              'Authentication failed. Please verify your credentials and try again.'
          );
        }
        setLoading(false);
        return;
      }

      // Successful login - persist in auth context
      login(data.token, data.user);

      // Route to role-specific dashboard based on authenticated user role
      switch (data.user.role) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'BGA':
          navigate('/bga');
          break;
        case 'ACCOUNTS':
          navigate('/accounts');
          break;
        case 'TECHNICAL':
          navigate('/technical');
          break;
        default:
          navigate('/bga');
      }
    } catch {
      setError(
        'Cannot connect to the authentication server. Please ensure the backend service is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout customSubtitle="Sign in to access your associate account and unlock new opportunities.">
      <AuthCard
        title="Welcome Back!"
        subtitle="Sign in to your Growth Associate account"
        error={error}
        info={info}
      >
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {/* Registered Email */}
          <div className="space-y-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#60769B]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="auth-email"
                type="email"
                placeholder="Enter registered email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
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

          {/* Password with Eye Toggle */}
          <div className="space-y-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#60769B]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                className={`w-full text-xs font-medium text-[#10244D] bg-white border rounded-xl py-3.5 pl-10 pr-11 placeholder:text-[#60769B]/70 transition-all focus:outline-none focus:ring-2 ${
                  passwordError
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-[#D6E2F2] focus:border-[#0879E8] focus:ring-[#DCEBFF]'
                }`}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#60769B] hover:text-[#0879E8] transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-[11px] text-rose-600 font-medium pl-1">{passwordError}</p>
            )}

            {/* Forgot Password link positioned right below the password field */}
            <div className="flex justify-end pt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-[#0879E8] hover:text-[#123FAD] hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          {/* Primary Submit Button matching reference */}
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
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full bg-white text-[#0879E8] flex items-center justify-center font-bold text-[10px] shrink-0">
                    ➔
                  </span>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>

          {/* Divider with "OR" */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8EFF8]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white px-3 text-[#60769B] font-semibold">OR</span>
            </div>
          </div>

          {/* New to program / Register link */}
          <div className="text-center pt-0.5">
            <p className="text-xs text-[#60769B]">
              New to the program?{' '}
              <Link
                to="/register"
                className="font-bold text-[#0879E8] hover:text-[#123FAD] hover:underline transition-colors"
              >
                Register here
              </Link>
            </p>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
};

export default LoginPage;
