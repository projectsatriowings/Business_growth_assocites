import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, ArrowRight, Briefcase, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Services', target: 'services' },
    { label: 'How It Works', target: 'how-it-works' },
    { label: 'Calculator', target: 'calculator' },
    { label: 'Portfolio', target: 'portfolio' },
    { label: 'FAQ', target: 'faq' },
    { label: 'Contact', target: 'contact' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname === '/') {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `#${targetId}`);
      }
    } else {
      navigate(`/#${targetId}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs text-slate-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link
            to="/"
            onClick={() => {
              if (location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center space-x-3 shrink-0 group"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-extrabold tracking-tight block leading-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                BGA Enterprise
              </span>
              <span className="block text-[10px] tracking-wider text-indigo-600 font-bold uppercase">
                Growth Network & IT Solutions
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center space-x-1 sm:space-x-2 text-xs xl:text-sm font-semibold text-slate-600">
            {navLinks.map((link) => (
              <a
                key={link.target}
                href={`#${link.target}`}
                onClick={(e) => handleNavClick(e, link.target)}
                className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-slate-50 transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    if (user.role === 'ADMIN') navigate('/admin');
                    else if (user.role === 'BGA') navigate('/bga');
                    else if (user.role === 'ACCOUNTS') navigate('/accounts');
                    else if (user.role === 'TECHNICAL') navigate('/technical');
                  }}
                  className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 transition-all flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  My Dashboard ({user.role})
                </button>
                <button
                  onClick={logout}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600 underline transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 transition-all"
                >
                  Portal Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 flex items-center space-x-1.5"
                >
                  <span>Become an Associate</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-3 pb-6 space-y-3 bg-white border-t border-slate-200 shadow-xl">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.target}
                href={`#${link.target}`}
                onClick={(e) => handleNavClick(e, link.target)}
                className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (user.role === 'ADMIN') navigate('/admin');
                    else if (user.role === 'BGA') navigate('/bga');
                    else if (user.role === 'ACCOUNTS') navigate('/accounts');
                    else if (user.role === 'TECHNICAL') navigate('/technical');
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm font-bold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  My Dashboard ({user.role})
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Portal Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25 hover:from-indigo-700 hover:to-blue-700"
                >
                  Become a Growth Associate
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
