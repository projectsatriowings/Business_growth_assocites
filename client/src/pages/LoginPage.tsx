import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Layers,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';

interface RolePortalConfig {
  id: UserRole;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  demoEmail: string;
  demoPassword: string;
}

const PORTAL_CONFIGS: Record<UserRole, RolePortalConfig> = {
  BGA: {
    id: 'BGA',
    title: 'BGA Portal',
    subtitle: 'Business Growth Associate',
    icon: UserCheck,
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    demoEmail: 'bga@bga.com',
    demoPassword: 'Bga@123',
  },
  ADMIN: {
    id: 'ADMIN',
    title: 'Admin Portal',
    subtitle: 'System Control & Operations',
    icon: ShieldCheck,
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
    demoEmail: 'admin@bga.com',
    demoPassword: 'Admin@123',
  },
  ACCOUNTS: {
    id: 'ACCOUNTS',
    title: 'Accounts Portal',
    subtitle: 'Quotations & Finance',
    icon: CreditCard,
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
    demoEmail: 'accounts@bga.com',
    demoPassword: 'Accounts@123',
  },
  TECHNICAL: {
    id: 'TECHNICAL',
    title: 'Technical Portal',
    subtitle: 'Engineering & Project Delivery',
    icon: Layers,
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
    demoEmail: 'tech@bga.com',
    demoPassword: 'Tech@123',
  },
};

export const LoginPage: React.FC = () => {
  const { role: routeRole } = useParams<{ role?: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Determine active role: default to BGA for public login, or internal role if direct route accessed
  const [activeRole, setActiveRole] = useState<UserRole>('BGA');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (routeRole) {
      const upper = routeRole.toUpperCase();
      if (['ADMIN', 'ACCOUNTS', 'TECHNICAL'].includes(upper)) {
        setActiveRole(upper as UserRole);
        return;
      }
    }
    setActiveRole('BGA');
  }, [routeRole]);

  const currentPortal = PORTAL_CONFIGS[activeRole] || PORTAL_CONFIGS.BGA;
  const PortalIcon = currentPortal.icon;
  const isInternal = activeRole !== 'BGA';

  // Quick fill helper for development & testing
  const fillDemoAccount = (roleToFill: UserRole) => {
    setError(null);
    setInfo(null);
    const cfg = PORTAL_CONFIGS[roleToFill];
    if (cfg) {
      setEmail(cfg.demoEmail);
      setPassword(cfg.demoPassword);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          portalRole: activeRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.status && data.status !== 'ACTIVE') {
          setInfo(data.error);
        } else {
          setError(data.error || 'Login failed');
        }
        setLoading(false);
        return;
      }

      // Successful login
      login(data.token, data.user);

      // Route to role-specific dashboard
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
      setError(err.message || 'Server connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Branding & Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 mb-4 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent block leading-tight">
                  BGA Enterprise
                </span>
                <span className="text-[10px] tracking-widest text-indigo-600 font-semibold uppercase block">
                  Growth Network & IT Solutions
                </span>
              </div>
            </Link>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {isInternal ? `${currentPortal.title} Login` : 'BGA Portal Login'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isInternal
                ? `Authorized Internal Access — ${currentPortal.subtitle}`
                : 'Business Growth Associate — Secure Partner Login'}
            </p>
          </div>

          {/* Centered Login Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${currentPortal.badgeColor}`}>
                  <PortalIcon className="w-5 h-5 text-current" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                    {activeRole} PORTAL
                  </span>
                  <h2 className="text-base font-bold text-slate-900">Sign in to {currentPortal.title}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fillDemoAccount(activeRole)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
              >
                Fill Demo
              </button>
            </div>

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

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter registered email"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <Link to="/#contact" className="text-[11px] text-indigo-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : `Log in to ${currentPortal.title}`}</span>
              </button>
            </form>

            {/* Test Credentials (Role-Specific Only) */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Instant Test Credentials
              </span>
              <button
                type="button"
                onClick={() => fillDemoAccount(activeRole)}
                className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-left font-medium text-xs flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <PortalIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>🔑 {currentPortal.title} ({currentPortal.demoEmail})</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to fill</span>
              </button>
            </div>

            {/* Registration link for associates on public login */}
            {!isInternal && (
              <div className="mt-6 text-center text-xs text-slate-500">
                Not registered as an associate yet?{' '}
                <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
                  Register here
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
