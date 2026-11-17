import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, ArrowRight, Briefcase, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const navLinks = [
    { label: 'About', target: 'about' },
    { label: 'Services', target: 'services' },
    { label: 'Why Us', target: 'why-atriowings' },
    { label: 'How It Works', target: 'how-it-works' },
    { label: 'Commission Model', target: 'earning' },
    { label: 'Portfolio', target: 'portfolio' },
    { label: 'Benefits', target: 'benefits' },
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
    <nav className="sticky top-0 z-50 glass-nav border-b border-slate-200/80 transition-all duration-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo & Parent Company Branding */}
          <Link
            to="/"
            onClick={() => {
              if (location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center space-x-3 shrink-0 group"
          >
            {!logoError ? (
              <img
                src="/img/logo.webp"
                alt="Atriowings Technologies"
                onError={() => setLogoError(true)}
                className="h-9 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#3066BE] to-[#119DA4] flex items-center justify-center text-white shadow-md shadow-[#3066BE]/20 group-hover:scale-105 transition-all duration-300">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            )}
            <div className="border-l border-slate-200 pl-3">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-slate-900 via-[#3066BE] to-[#119DA4] bg-clip-text text-transparent block leading-tight tracking-tight">
                  BGA Enterprise
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#119DA4]/10 text-[#119DA4] border border-[#80DED9]/40">
                  By Atriowings
                </span>
              </div>
              <span className="block text-[9px] sm:text-[10px] tracking-wider text-slate-500 font-semibold uppercase">
                Atriowings Technologies
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden xl:flex items-center space-x-6 text-[13px] font-semibold text-slate-600">
            {navLinks.map((link) => (
              <a
                key={link.target}
                href={`#${link.target}`}
                onClick={(e) => handleNavClick(e, link.target)}
                className="relative py-1 hover:text-[#3066BE] transition-colors duration-150 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#119DA4] hover:after:w-full after:transition-all after:duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Action Buttons (Only Public: Become a Growth Associate & BGA Login) */}
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
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#edf4fc] text-[#3066BE] hover:bg-[#dbe9fa] border border-[#6D96C5]/30 transition-all duration-150 flex items-center gap-2 shadow-sm"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#119DA4]" />
                  <span>My Portal ({user.role})</span>
                </button>
                <button
                  onClick={logout}
                  className="text-xs text-slate-500 hover:text-rose-600 underline font-semibold transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-[#3066BE] hover:bg-slate-100/70 rounded-xl transition-all duration-150 border border-slate-200/80"
                >
                  BGA Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] hover:from-[#25549e] hover:to-[#0d8187] text-white shadow-md shadow-[#3066BE]/25 hover:shadow-lg hover:shadow-[#3066BE]/30 transition-all duration-200 flex items-center space-x-1.5 transform hover:-translate-y-0.5"
                >
                  <span>Become a Growth Associate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center xl:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-[#3066BE]" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-5 pt-3 pb-6 space-y-4 shadow-xl animate-fadeIn">
          <div className="grid grid-cols-2 gap-1">
            {navLinks.map((link) => (
              <a
                key={link.target}
                href={`#${link.target}`}
                onClick={(e) => handleNavClick(e, link.target)}
                className="block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-[#edf4fc] hover:text-[#3066BE] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2.5">
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
                  className="w-full text-left px-4 py-3 text-sm font-bold rounded-xl bg-[#edf4fc] text-[#3066BE] hover:bg-[#dbe9fa] transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#119DA4]" />
                    My Portal ({user.role})
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  BGA Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] text-white shadow-md shadow-[#3066BE]/20 transition-all"
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
