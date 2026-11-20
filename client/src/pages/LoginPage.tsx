import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthPrimaryButton } from '../components/auth/AuthPrimaryButton';

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
        subtitle="Sign in to your Growth Associate account."
        error={error}
        info={info}
      >
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {/* Registered Email */}
          <AuthInput
            label="Registered Email Address"
            type="email"
            icon={Mail}
            placeholder="associate@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            error={emailError || undefined}
            required
            autoComplete="email"
            autoFocus
          />

          {/* Password with Forgot Password link in header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-[#10244D]"
              >
                Password <span className="text-rose-500">*</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold text-[#0879E8] hover:text-[#123FAD] hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            <AuthInput
              id="auth-password"
              label=""
              icon={Lock}
              placeholder="Enter your password"
              isPassword
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              error={passwordError || undefined}
              required
              autoComplete="current-password"
            />
          </div>

          {/* Primary Submit Button */}
          <div className="pt-2">
            <AuthPrimaryButton loading={loading} loadingText="Signing In...">
              Sign In
            </AuthPrimaryButton>
          </div>

          {/* Divider with "OR" */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D6E2F2]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white px-3 text-[#60769B] font-bold">OR</span>
            </div>
          </div>

          {/* New to program / Register link */}
          <div className="text-center pt-1">
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
