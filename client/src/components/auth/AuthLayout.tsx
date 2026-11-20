import React from 'react';
import { AuthBrandPanel } from './AuthBrandPanel';
import { AuthFooter } from './AuthFooter';

interface AuthLayoutProps {
  children: React.ReactNode;
  customSubtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  customSubtitle,
}) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#F5F9FF] via-[#EBF3FE] to-[#DCEBFF] text-[#10244D] relative overflow-x-hidden selection:bg-[#DCEBFF] selection:text-[#0879E8]">
      {/* Decorative Organic Vector Curves / Waves Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft flowing wave top-right */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-[#DCEBFF]/70 via-[#E4EFFF]/40 to-transparent blur-2xl" />

        {/* Soft flowing wave center-left */}
        <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#0879E8]/5 via-[#123FAD]/5 to-transparent blur-3xl" />

        {/* Translucent background SVG wave ribbon */}
        <svg
          className="absolute bottom-0 right-0 w-full h-[360px] opacity-15"
          viewBox="0 0 1440 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M 0 180 C 320 280 480 80 800 160 C 1120 240 1280 120 1440 200 L 1440 360 L 0 360 Z"
            fill="url(#waveGradient1)"
          />
          <path
            d="M 0 240 C 360 140 600 320 960 220 C 1200 160 1360 260 1440 240 L 1440 360 L 0 360 Z"
            fill="url(#waveGradient2)"
            opacity="0.6"
          />
          <defs>
            <linearGradient id="waveGradient1" x1="0" y1="0" x2="1440" y2="360" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0879E8" />
              <stop offset="1" stopColor="#123FAD" />
            </linearGradient>
            <linearGradient id="waveGradient2" x1="1440" y1="0" x2="0" y2="360" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DCEBFF" />
              <stop offset="1" stopColor="#0879E8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Two-Column Desktop Layout */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12">
          {/* Left Panel (~45% / 5 cols) */}
          <div className="lg:col-span-5 hidden lg:block">
            <AuthBrandPanel customSubtitle={customSubtitle} />
          </div>

          {/* Right Panel (~55% / 7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center w-full">
            {/* Mobile Header: Visible only on small screens */}
            <div className="lg:hidden flex flex-col items-center mb-6 text-center">
              <img
                src="/img/atriowings-official-logo.png"
                alt="Atriowings Technologies"
                className="h-9 w-auto object-contain mb-2"
              />
              <span className="text-xs font-bold text-[#0879E8] uppercase tracking-wider">
                Growth Associate Portal
              </span>
            </div>

            {children}
          </div>
        </div>
      </main>

      {/* Shared Corporate Footer */}
      <AuthFooter />
    </div>
  );
};
