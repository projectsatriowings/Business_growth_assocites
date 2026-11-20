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
    <div className="flex flex-col justify-between h-full py-4 pr-4 xl:pr-8">
      {/* Top Branding & Content Section */}
      <div className="space-y-8 xl:space-y-10">
        {/* Atriowings Official Logo Lockup */}
        <Link to="/" className="inline-block group" title="Atriowings Technologies India Private Limited">
          <img
            src="/img/atriowings-official-logo.png"
            alt="Atriowings Technologies India Private Limited"
            className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </Link>

        {/* Portal Headline & Intro */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl xl:text-[44px] font-extrabold text-[#10244D] tracking-tight leading-[1.15]">
            Growth Associate<br />Portal
          </h1>
          <p className="text-sm sm:text-base text-[#60769B] leading-relaxed max-w-sm">
            {customSubtitle}
          </p>
        </div>

        {/* Three Official Corporate Benefit Points matching reference screenshot */}
        <div className="space-y-6 pt-2 max-w-md">
          {/* Benefit 1 */}
          <div className="flex items-center gap-4 group">
            <div className="w-11 h-11 rounded-full bg-[#DCEBFF] text-[#0879E8] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#10244D]">
                Partner with Us
              </h4>
              <p className="text-xs text-[#60769B]">
                Grow Together
              </p>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="flex items-center gap-4 group">
            <div className="w-11 h-11 rounded-full bg-[#DCEBFF] text-[#0879E8] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#10244D]">
                Earn on Verified Projects
              </h4>
              <p className="text-xs text-[#60769B]">
                Get Reliable Commissions
              </p>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="flex items-center gap-4 group">
            <div className="w-11 h-11 rounded-full bg-[#DCEBFF] text-[#0879E8] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#10244D]">
                Transparent & Trusted
              </h4>
              <p className="text-xs text-[#60769B]">
                Built for Your Success
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
