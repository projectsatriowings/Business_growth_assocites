import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Layers,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';

export const LoginPage: React.FC = () => {
  const { role: routeRole } = useParams<{ role?: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeRole, setActiveRole] = useState<UserRole>('BGA');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (routeRole) {
      const upper = routeRole.toUpperCase();
      if (['ADMIN', 'BGA', 'ACCOUNTS', 'TECHNICAL'].includes(upper)) {
        setActiveRole(upper as UserRole);
      }
    }
  }, [routeRole]);

  // Demo accounts helper
  const fillDemoAccount = (roleToFill: UserRole) => {
    setError(null);
    setInfo(null);
    setActiveRole(roleToFill);
    switch (roleToFill) {
      case 'ADMIN':
        setEmail('admin@bga.com');
        setPassword('Admin@123');
        break;
      case 'BGA':
        setEmail('bga@bga.com');
        setPassword('Bga@123');
        break;
      case 'ACCOUNTS':
        setEmail('accounts@bga.com');
        setPassword('Accounts@123');
        break;
      case 'TECHNICAL':
        setEmail('tech@bga.com');
        setPassword('Tech@123');
        break;
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

  const rolesConfig = [
    {
      id: 'BGA' as UserRole,
      title: 'BGA Portal',
      subtitle: 'Business Growth Associate',
      icon: UserCheck,
      color: 'border-emerald-500 bg-emerald-50/40 text-emerald-700',
      activeTab: 'bg-emerald-600 text-white',
    },
    {
      id: 'ACCOUNTS' as UserRole,
      title: 'Accounts Portal',
      subtitle: 'Quotations & Finance',
      icon: CreditCard,
      color: 'border-blue-500 bg-blue-50/40 text-blue-700',
      activeTab: 'bg-blue-600 text-white',
    },
    {
      id: 'TECHNICAL' as UserRole,
      title: 'Technical Portal',
      subtitle: 'Engineering & Delivery',
      icon: Layers,
      color: 'border-amber-500 bg-amber-50/40 text-amber-700',
      activeTab: 'bg-amber-600 text-white',
    },
    {
      id: 'ADMIN' as UserRole,
      title: 'Admin Portal',
      subtitle: 'Full System Control',
      icon: ShieldCheck,
      color: 'border-purple-500 bg-purple-50/40 text-purple-700',
      activeTab: 'bg-purple-600 text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Role-Based Multi-Portal Login
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select your department portal to securely access authorized workspace modules.
            </p>
          </div>

          {/* Role Portal Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {rolesConfig.map((r) => {
              const Icon = r.icon;
              const isSelected = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActiveRole(r.id);
                    setError(null);
                    setInfo(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? `${r.color} shadow-sm border-2 font-bold`
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-current' : 'text-slate-400'}`} />
                  <div className="text-xs font-bold leading-tight">{r.title}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{r.subtitle}</div>
                </button>
              );
            })}
          </div>

          {/* Login Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  {activeRole} ACCESS
                </span>
                <h2 className="text-lg font-bold text-slate-900">Sign in to {activeRole} Portal</h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Quick Demo:</span>
                <button
                  type="button"
                  onClick={() => fillDemoAccount(activeRole)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                >
                  Fill {activeRole} Demo
                </button>
              </div>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
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
                  <a href="#contact" className="text-[11px] text-indigo-600 hover:underline">
                    Forgot password?
                  </a>
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
                <span>{loading ? 'Authenticating...' : `Log in to ${activeRole} Portal`}</span>
              </button>
            </form>

            {/* Quick Demo Accounts Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Instant Test Credentials (1-Click Fill)
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('ADMIN')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 text-left font-medium"
                >
                  🔑 Admin (admin@bga.com)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('BGA')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-left font-medium"
                >
                  🔑 BGA (bga@bga.com)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('ACCOUNTS')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-left font-medium"
                >
                  🔑 Accounts (accounts@bga.com)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('TECHNICAL')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 text-left font-medium"
                >
                  🔑 Technical (tech@bga.com)
                </button>
              </div>
            </div>

            {activeRole === 'BGA' && (
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
