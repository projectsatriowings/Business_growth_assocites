import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Briefcase, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'About', target: 'about' },
    { label: 'Services', target: 'services' },
    { label: 'Why Us', target: 'why-atriowings' },
    { label: 'How It Works', target: 'how-it-works' },
    { label: 'Commissions', target: 'earning' },
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
    <nav className="sticky top-0 z-50 glass-nav border-b border-slate-200/80 transition-all duration-200 bg-white/95 backdrop-blur-md shadow-sm w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-6 2xl:px-10">
        <div className="flex justify-between items-center h-20 gap-2 sm:gap-4">
          {/* Official Company Logo */}
          <Link
            to="/"
            onClick={() => {
              if (location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center shrink-0 group py-1.5 mr-2 lg:mr-3 xl:mr-3 2xl:mr-6"
            title="Atriowings Technologies India Private Limited"
          >
            <img
              src="/img/atriowings-official-logo.png"
              alt="Atriowings Technologies India Private Limited"
              className="h-8 sm:h-9 xl:h-9 2xl:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </Link>

          {/* Desktop Nav Links (Responsive font and gap for standard laptops vs ultra-wide displays) */}
          <div className="hidden xl:flex items-center gap-x-2 2xl:gap-x-5 text-[11.5px] 2xl:text-[13px] font-semibold text-slate-600 shrink min-w-0">
            {navLinks.map((link) => (
              <a
                key={link.target}
                href={`#${link.target}`}
                onClick={(e) => handleNavClick(e, link.target)}
                className="relative py-1 px-1 2xl:px-1.5 whitespace-nowrap hover:text-[#3066BE] transition-colors duration-150 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#3066BE] hover:after:w-full after:transition-all after:duration-200"
              >
                {link.label}
              </a>
            ))}

            {/* Portal Login positioned right near Contact */}
            {!user && (
              <Link
                to="/login"
                className="ml-1 2xl:ml-2 px-2.5 py-1 2xl:px-3.5 2xl:py-1.5 text-[11px] 2xl:text-xs font-bold text-slate-700 hover:text-[#3066BE] bg-slate-50 hover:bg-white rounded-lg transition-all duration-150 border border-slate-300 hover:border-[#3066BE]/40 shadow-sm whitespace-nowrap shrink-0"
              >
                Portal Login
              </Link>
            )}
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center shrink-0 ml-auto xl:ml-0">
            {user ? (
              <div className="flex items-center space-x-2 2xl:space-x-3">
                <button
                  onClick={() => {
                    if (user.role === 'ADMIN') navigate('/admin');
                    else if (user.role === 'BGA') navigate('/bga');
                    else if (user.role === 'ACCOUNTS') navigate('/accounts');
                    else if (user.role === 'TECHNICAL') navigate('/technical');
                  }}
                  className="px-3 py-1.5 2xl:px-4 2xl:py-2 text-xs font-bold rounded-xl bg-[#edf4fc] text-[#3066BE] hover:bg-[#dbe9fa] border border-[#6D96C5]/30 transition-all duration-150 flex items-center gap-1.5 2xl:gap-2 shadow-sm whitespace-nowrap"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#119DA4]" />
                  <span>My Portal ({user.role})</span>
                </button>
                <button
                  onClick={logout}
                  className="text-xs text-slate-500 hover:text-rose-600 underline font-semibold transition-colors whitespace-nowrap"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 2xl:space-x-3">
                <Link
                  to="/login"
                  className="xl:hidden px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-[#3066BE] hover:bg-slate-50 rounded-xl transition-all duration-150 border border-slate-200 shadow-sm whitespace-nowrap"
                >
                  Portal Login
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-2 2xl:px-5 2xl:py-2.5 text-xs 2xl:text-sm font-bold rounded-xl bg-gradient-to-r from-[#1E40AF] via-[#2563EB] to-[#0D9488] hover:from-[#1E3A8A] hover:to-[#0F766E] text-white shadow-md shadow-blue-900/25 hover:shadow-lg hover:shadow-blue-900/35 transition-all duration-200 flex items-center space-x-1.5 2xl:space-x-2 whitespace-nowrap transform hover:-translate-y-0.5"
                >
                  <span className="text-white drop-shadow-sm font-bold tracking-wide">Become a Growth Associate</span>
                  <ArrowRight className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0 text-white" />
                </Link>
              </div>
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
        <div className="xl:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl px-5 pt-3 pb-6 space-y-4 shadow-xl animate-fadeIn">
          <div className="grid grid-cols-2 gap-1.5">
            {navLinks.map((link) => (
              <a
                key={link.target}
                href={`#${link.target}`}
                onClick={(e) => handleNavClick(e, link.target)}
                className="block px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-[#edf4fc] hover:text-[#3066BE] transition-colors"
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
                  Portal Login
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

export default Navbar;
