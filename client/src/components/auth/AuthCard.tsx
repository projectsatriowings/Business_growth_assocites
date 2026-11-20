import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  error?: string | null;
  success?: string | null;
  info?: string | null;
  children: React.ReactNode;
  cardMaxWidth?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  title,
  subtitle,
  error,
  success,
  info,
  children,
  cardMaxWidth = 'max-w-md',
}) => {
  return (
    <div
      className={`w-full ${cardMaxWidth} mx-auto bg-white rounded-[22px] border border-[#D6E2F2] shadow-[0_16px_48px_rgba(16,36,77,0.08)] p-6 sm:p-9 transition-all duration-300 animate-fadeIn`}
    >
      {/* Top Company Favicon / Icon Lockup */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#DCEBFF]/70 border border-[#0879E8]/20 flex items-center justify-center p-2 mb-4 shadow-sm group">
          <img
            src="/favicon.png"
            alt="Atriowings Favicon"
            className="w-7 h-7 object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </div>

        <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#10244D] tracking-tight">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-[#60769B] mt-1.5 leading-relaxed max-w-sm">
          {subtitle}
        </p>
      </div>

      {/* Global Card Feedback Banners */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{success}</div>
        </div>
      )}

      {info && (
        <div className="mb-5 p-3.5 rounded-xl bg-[#DCEBFF]/60 border border-[#0879E8]/30 text-[#10244D] text-xs flex items-start gap-2.5 animate-fadeIn">
          <Info className="w-4 h-4 text-[#0879E8] shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{info}</div>
        </div>
      )}

      {/* Form Content */}
      <div className="space-y-4">{children}</div>
    </div>
  );
};
