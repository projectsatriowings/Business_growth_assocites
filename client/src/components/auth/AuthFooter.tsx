import React, { useState } from 'react';
import { PolicyModal, PolicyType } from './PolicyModal';

export const AuthFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);

  return (
    <>
      <footer className="w-full py-4 px-6 sm:px-10 border-t border-[#D6E2F2]/60 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#60769B]">
          <div className="text-center sm:text-left">
            © {currentYear} Atriowings Technologies India Private Limited. All rights reserved.
          </div>
          <div className="flex items-center gap-5 font-medium">
            <button
              type="button"
              onClick={() => setActivePolicy('privacy')}
              className="hover:text-[#0879E8] transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-[#D6E2F2]">•</span>
            <button
              type="button"
              onClick={() => setActivePolicy('terms')}
              className="hover:text-[#0879E8] transition-colors"
            >
              Terms of Service
            </button>
            <span className="text-[#D6E2F2]">•</span>
            <button
              type="button"
              onClick={() => setActivePolicy('support')}
              className="hover:text-[#0879E8] transition-colors"
            >
              Support
            </button>
          </div>
        </div>
      </footer>

      <PolicyModal type={activePolicy} onClose={() => setActivePolicy(null)} />
    </>
  );
};
