import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Layers,
  Lock,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Mail,
  Send,
} from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';

interface DemoAccount {
  role: UserRole;
  title: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hoverBorder: string;
  activeBorder: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'ADMIN',
    title: 'Admin Demo',
    email: 'admin@bga.com',
    password: 'Admin@123',
    icon: ShieldCheck,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    hoverBorder: 'hover:border-purple-300 hover:bg-purple-50/40',
    activeBorder: 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-500/20',
  },
  {
    role: 'BGA',
    title: 'BGA Demo',
    email: 'bga@bga.com',
    password: 'Bga@123',
    icon: UserCheck,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    hoverBorder: 'hover:border-emerald-300 hover:bg-emerald-50/40',
    activeBorder: 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20',
  },
  {
    role: 'ACCOUNTS',
    title: 'Accounts Demo',
    email: 'accounts@bga.com',
    password: 'Accounts@123',
    icon: CreditCard,
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    hoverBorder: 'hover:border-blue-300 hover:bg-blue-50/40',
    activeBorder: 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20',
  },
  {
    role: 'TECHNICAL',
    title: 'Technical Demo',
    email: 'tech@bga.com',
    password: 'Tech@123',
    icon: Layers,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    hoverBorder: 'hover:border-amber-300 hover:bg-amber-50/40',
    activeBorder: 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20',
  },
];

export const LoginPage: React.FC = () => {
  const { role: routeRole } = useParams<{ role?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Internal role used for authentication payload and role-specific routing
  const [internalRole, setInternalRole] = useState<UserRole>('BGA');
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // Forgot Password Mode State
  const [isForgotMode, setIsForgotMode] = useState<boolean>(false);
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Development & Testing visibility: enabled in dev mode, localhost, or via explicit flag
  const isDemoEnabled =
    import.meta.env.DEV ||
    import.meta.env.MODE === 'development' ||
    import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true' ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '0.0.0.0'));

  useEffect(() => {
    if (searchParams.get('forgot') === 'true') {
      setIsForgotMode(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (routeRole) {
      const upper = routeRole.toUpperCase();
      if (['ADMIN', 'ACCOUNTS', 'TECHNICAL'].includes(upper)) {
        setInternalRole(upper as UserRole);
        setSelectedDemoRole(upper as UserRole);
        return;
      }
    }
    setInternalRole('BGA');
    setSelectedDemoRole(null);
  }, [routeRole]);

  // Handle Quick Access Demo Account click
  const handleSelectDemo = (demo: DemoAccount) => {
    setIsForgotMode(false);
    setError(null);
    setInfo(null);
    setForgotError(null);
    setForgotSuccessMessage(null);
    setEmail(demo.email);
    setPassword(demo.password);
    setInternalRole(demo.role);
    setSelectedDemoRole(demo.role);
    setConfirmationMessage(`${demo.title} credentials filled`);
  };

  // Handle Forgot Password Request (Anti-Enumeration)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || 'Failed to submit password reset request. Please try again.');
        setForgotLoading(false);
        return;
      }

      // Standard Anti-Enumeration Confirmation Message
      setForgotSuccessMessage(
        data.message ||
        'If an account exists for this email address, you will receive password reset instructions shortly.'
      );
    } catch (err: any) {
      setForgotError('Cannot reach the authentication server. Please ensure the backend server is running.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      let res: Response;
      try {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });
      } catch (fetchErr: any) {
        setError('Cannot reach authentication server on port 5000. Please ensure the backend server is running.');
        setLoading(false);
        return;
      }

      // Safe JSON response parsing
      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (data.status && data.status !== 'ACTIVE') {
          setInfo(data.error || 'Your registration is awaiting approval.');
        } else {
          setError(
            data.error ||
            (res.status === 502 || res.status === 504 || res.status === 500
              ? 'Backend server is not reachable on port 5000. Please ensure the backend server is running.'
              : `Authentication failed (HTTP ${res.status})`)
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
          navigate('/');
      }
    } catch (err: any) {
      if (err.message?.includes('JSON') || err.message?.includes('fetch')) {
        setError('Cannot reach authentication server on port 5000. Please ensure the backend server is running.');
      } else {
        setError(err.message || 'Server connection failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-lg mx-auto">
          {/* Header & Branding */}
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
              {isForgotMode
                ? 'Reset Your Account Password'
                : selectedDemoRole === 'ADMIN'
                  ? 'Atriowings Admin Portal'
                  : selectedDemoRole === 'ACCOUNTS'
                    ? 'Atriowings Accounts Portal'
                    : selectedDemoRole === 'TECHNICAL'
                      ? 'Atriowings Technical Portal'
                      : 'Growth Associate Portal'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              {isForgotMode
                ? 'Enter your registered email address to receive secure recovery instructions'
                : selectedDemoRole === 'ADMIN'
                  ? 'Sign in with your enterprise administrator credentials'
                  : selectedDemoRole === 'ACCOUNTS'
                    ? 'Sign in to review payments, work orders, and billing'
                    : selectedDemoRole === 'TECHNICAL'
                      ? 'Sign in to access engineering workspace & milestone releases'
                      : 'Sign in to access your associate account'}
            </p>
          </div>

          {/* Main Login Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            {/* 1. FORGOT PASSWORD MODE */}
            {isForgotMode ? (
              <div className="space-y-4">
                {forgotSuccessMessage ? (
                  <div className="space-y-4 text-center py-2 animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Check Your Email</h3>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-left">
                        {forgotSuccessMessage}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left text-[11px] text-amber-800 space-y-1">
                      <span className="font-bold block">Important Security Notice:</span>
                      <p>The password recovery link is strictly valid for 30 minutes and can only be used once.</p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotMode(false);
                          setForgotSuccessMessage(null);
                          setForgotError(null);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Return to Sign In</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                      <KeyRound className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Enter your account's registered email. If matched in our records, a secure single-use recovery link will be sent to your inbox.
                      </p>
                    </div>

                    {forgotError && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{forgotError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setForgotError(null);
                          }}
                          placeholder="e.g. associate@atriowings.in"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{forgotLoading ? 'Sending Recovery Link...' : 'Send Password Reset Link'}</span>
                    </button>

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotMode(false);
                          setForgotError(null);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1.5 focus:outline-none"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Sign In</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* 2. STANDARD LOGIN MODE */
              <div>
                {/* Feedback Notifications */}
                {confirmationMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between transition-all">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{confirmationMessage}</span>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                      Click Login to continue
                    </span>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {info && (
                  <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{info}</p>
                      <p className="text-[11px] text-amber-700 mt-1">
                        Once the Company Admin reviews and approves your registration, you can log in.
                      </p>
                    </div>
                  </div>
                )}

                {/* Main Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setConfirmationMessage(null);
                        if (selectedDemoRole && e.target.value !== DEMO_ACCOUNTS.find(d => d.role === selectedDemoRole)?.email) {
                          setSelectedDemoRole(null);
                        }
                      }}
                      placeholder="Enter registered email"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setError(null);
                          setInfo(null);
                          setConfirmationMessage(null);
                          setForgotError(null);
                          setForgotSuccessMessage(null);
                          setIsForgotMode(true);
                        }}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold focus:outline-none"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setConfirmationMessage(null);
                      }}
                      placeholder="Enter password"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {loading
                        ? 'Authenticating...'
                        : selectedDemoRole === 'ADMIN'
                          ? 'Login to Atriowings Admin Portal'
                          : selectedDemoRole === 'ACCOUNTS'
                            ? 'Login to Atriowings Accounts Portal'
                            : selectedDemoRole === 'TECHNICAL'
                              ? 'Login to Atriowings Technical Portal'
                              : 'Sign In to Atriowings Growth Portal'}
                    </span>
                  </button>
                </form>

                {/* Registration link for associates */}
                <div className="mt-5 text-center text-xs text-slate-500">
                  Not registered as an associate yet?{' '}
                  <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
                    Register here
                  </Link>
                </div>
              </div>
            )}

            {/* QUICK ACCESS — DEVELOPMENT TEST ACCOUNTS */}
            {isDemoEnabled && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    QUICK ACCESS — DEVELOPMENT TEST ACCOUNTS
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    1-Click Test Credentials
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {DEMO_ACCOUNTS.map((demo) => {
                    const Icon = demo.icon;
                    const isSelected = selectedDemoRole === demo.role && email === demo.email;
                    return (
                      <button
                        key={demo.role}
                        type="button"
                        onClick={() => handleSelectDemo(demo)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${isSelected
                            ? demo.activeBorder
                            : `border-slate-200 bg-slate-50/70 ${demo.hoverBorder} hover:shadow-sm`
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${demo.color}`}>
                          <Icon className="w-4 h-4 text-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 leading-tight flex items-center justify-between">
                            <span>{demo.title}</span>
                            {isSelected ? (
                              <span className="text-[10px] text-emerald-600 font-bold">Filled ✓</span>
                            ) : (
                              <span className="text-[10px] text-indigo-600 font-medium">Click to fill</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {demo.email}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
