import React from 'react';
import { Link } from 'react-router-dom';
import { Handshake, TrendingUp, ShieldCheck } from 'lucide-react';

interface AuthBrandPanelProps {
  customSubtitle?: string;
}

export const AuthBrandPanel: React.FC<AuthBrandPanelProps> = ({
  customSubtitle = 'Sign in to access your associate account and unlock new opportunities.',
}) => {
  return (
    <div className="relative flex flex-col justify-between h-full p-8 lg:p-12 xl:p-16 overflow-hidden">
      {/* Top Branding Section */}
      <div className="relative z-10 space-y-8">
        {/* Atriowings Official Logo Lockup */}
        <Link to="/" className="inline-block group" title="Atriowings Technologies India Private Limited">
          <img
            src="/img/atriowings-official-logo.png"
            alt="Atriowings Technologies India Private Limited"
            className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </Link>

        {/* Portal Headline & Intro */}
        <div className="space-y-3 pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#DCEBFF] text-[#0879E8] border border-[#0879E8]/20 tracking-wide uppercase">
            Official BGA Workspace
          </span>
          <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-extrabold text-[#10244D] tracking-tight leading-[1.15]">
            Growth Associate Portal
          </h1>
          <p className="text-sm sm:text-base text-[#60769B] max-w-md leading-relaxed">
            {customSubtitle}
          </p>
        </div>

        {/* Three Official Corporate Benefit Points */}
        <div className="space-y-4 pt-4 max-w-lg">
          {/* Benefit 1 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#D6E2F2]/80 shadow-[0_4px_16px_rgba(16,36,77,0.03)] hover:border-[#0879E8]/40 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-xl bg-[#DCEBFF] text-[#0879E8] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#0879E8] group-hover:text-white transition-all duration-200">
              <Handshake className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-[#10244D]">
                Partner with Us – Grow Together
              </h4>
              <p className="text-[11px] sm:text-xs text-[#60769B] leading-normal">
                Collaborate with Atriowings' enterprise delivery engine and scale your business network.
              </p>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#D6E2F2]/80 shadow-[0_4px_16px_rgba(16,36,77,0.03)] hover:border-[#0879E8]/40 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-xl bg-[#DCEBFF] text-[#0879E8] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#0879E8] group-hover:text-white transition-all duration-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-[#10244D]">
                Earn on Verified Projects – Get Reliable Commissions
              </h4>
              <p className="text-[11px] sm:text-xs text-[#60769B] leading-normal">
                Disbursements backed by formal client quotations, milestone verification, and official bank UTR tracking.
              </p>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#D6E2F2]/80 shadow-[0_4px_16px_rgba(16,36,77,0.03)] hover:border-[#0879E8]/40 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-xl bg-[#DCEBFF] text-[#0879E8] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#0879E8] group-hover:text-white transition-all duration-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-[#10244D]">
                Transparent & Trusted – Built for Your Success
              </h4>
              <p className="text-[11px] sm:text-xs text-[#60769B] leading-normal">
                End-to-end auditability across lead status, commercial quotes, client payments, and payout approvals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Illustration Container: City Skyline Silhouette & Upward Growth Arrow */}
      <div className="relative mt-8 pt-8 pointer-events-none select-none">
        {/* Upward Growth Arrow Graphic */}
        <div className="absolute right-6 -top-4 w-44 h-44 opacity-25">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <linearGradient id="growthGradient" x1="20" y1="180" x2="180" y2="20" gradientUnits="userSpaceOnUse">
                <stop stopColor="#123FAD" stopOpacity="0.1" />
                <stop offset="0.6" stopColor="#0879E8" stopOpacity="0.8" />
                <stop offset="1" stopColor="#0879E8" />
              </linearGradient>
            </defs>
            <path
              d="M 20 170 C 60 160 100 130 140 70 L 170 30"
              stroke="url(#growthGradient)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 125 30 L 175 25 L 170 75"
              stroke="#0879E8"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="170" cy="30" r="5" fill="#0879E8" />
          </svg>
        </div>

        {/* City Skyline Silhouette SVG */}
        <div className="w-full h-24 overflow-hidden opacity-20">
          <svg
            viewBox="0 0 600 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-bottom"
            preserveAspectRatio="none"
          >
            {/* Soft skyline silhouette */}
            <path
              d="M 0 120 L 0 95 L 30 95 L 30 75 L 50 75 L 50 95 L 80 95 L 80 60 L 100 60 L 100 45 L 105 45 L 105 30 L 107 30 L 107 45 L 115 45 L 115 70 L 140 70 L 140 85 L 170 85 L 170 50 L 190 50 L 190 40 L 210 40 L 210 50 L 225 50 L 225 90 L 250 90 L 250 65 L 270 65 L 270 55 L 285 55 L 285 65 L 310 65 L 310 80 L 335 80 L 335 45 L 345 35 L 355 45 L 355 85 L 380 85 L 380 60 L 405 60 L 405 95 L 430 95 L 430 70 L 450 70 L 450 50 L 460 50 L 460 38 L 462 38 L 462 25 L 464 25 L 464 38 L 475 38 L 475 75 L 500 75 L 500 90 L 530 90 L 530 65 L 555 65 L 555 85 L 580 85 L 580 100 L 600 100 L 600 120 Z"
              fill="#123FAD"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
