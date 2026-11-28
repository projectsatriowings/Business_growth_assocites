import React from 'react';
import { AuthBrandPanel } from './AuthBrandPanel';
import { AuthFooter } from './AuthFooter';

interface AuthLayoutProps {
  children: React.ReactNode;
  customSubtitle?: string;
  hideBrandPanelMobile?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  customSubtitle,
}) => {
  return (
    <div
      className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col justify-between bg-cover bg-center bg-no-repeat text-[#10244D] relative overflow-x-hidden selection:bg-[#DCEBFF] selection:text-[#0879E8]"
      style={{
        backgroundImage: "url('/image/loginpagebg.png')",
        backgroundColor: '#F0F6FF',
      }}
    >
      {/* Top Branding Section on Mobile (on desktop, logo is in AuthBrandPanel) */}
      <div className="lg:hidden p-4 sm:p-6 pb-0 flex items-center justify-between z-10">
        <img
          src="/img/atriowings-official-logo.png"
          alt="Atriowings Technologies"
          className="h-8 sm:h-9 w-auto object-contain"
        />
        <span className="text-[10px] sm:text-[11px] font-bold text-[#0879E8] uppercase tracking-wider">
          Growth Associate Portal
        </span>
      </div>

      {/* Main Two-Column Desktop Layout */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-3 sm:py-6 px-3 sm:px-8 lg:px-12 xl:px-16 min-h-0">
        <div className="w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12 xl:gap-16">
          {/* Left Panel (~45% / 5.5 cols) */}
          <div className="lg:col-span-5 hidden lg:block">
            <AuthBrandPanel customSubtitle={customSubtitle} />
          </div>

          {/* Right Panel (~55% / 6.5 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Corporate Footer matching reference */}
      <AuthFooter />
    </div>
  );
};
