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
  cardMaxWidth = 'max-w-[460px]',
}) => {
  return (
    <div
      className={`w-full ${cardMaxWidth} mx-auto bg-white rounded-2xl sm:rounded-[24px] border border-[#EAF0F9] shadow-[0_12px_40px_rgba(16,36,77,0.06)] sm:shadow-[0_20px_60px_rgba(16,36,77,0.08)] p-4 sm:p-7 transition-all duration-300 animate-fadeIn max-h-none lg:max-h-[calc(100vh-90px)] overflow-visible lg:overflow-y-auto custom-scrollbar`}
    >
      {/* Top Company Emblem Lockup */}
      <div className="flex flex-col items-center text-center mb-4">
        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-2 shadow-xs">
          <img
            src="/favicon.png"
            alt="Atriowings Emblem"
            className="w-12 h-12 object-contain"
          />
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[#10244D] tracking-tight">
          {title}
        </h2>
        <p className="text-xs sm:text-xs text-[#60769B] mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Global Card Feedback Banners */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{success}</div>
        </div>
      )}

      {info && (
        <div className="mb-4 p-3 rounded-xl bg-[#DCEBFF]/60 border border-[#0879E8]/30 text-[#10244D] text-xs flex items-start gap-2.5 animate-fadeIn">
          <Info className="w-4 h-4 text-[#0879E8] shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{info}</div>
        </div>
      )}

      {/* Form Content */}
      <div>{children}</div>
    </div>
  );
};
