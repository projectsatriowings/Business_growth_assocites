import React from 'react';
import { X, ShieldCheck, FileText, LifeBuoy, Mail, Phone, MapPin } from 'lucide-react';

export type PolicyType = 'privacy' | 'terms' | 'support' | null;

interface PolicyModalProps {
  type: PolicyType;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10244D]/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-2xl border border-[#D6E2F2] shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D6E2F2] bg-[#F5F9FF]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DCEBFF] text-[#0879E8] flex items-center justify-center">
              {type === 'privacy' && <ShieldCheck className="w-5 h-5" />}
              {type === 'terms' && <FileText className="w-5 h-5" />}
              {type === 'support' && <LifeBuoy className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#10244D]">
                {type === 'privacy' && 'Privacy Policy'}
                {type === 'terms' && 'Terms of Service & Associate Agreement'}
                {type === 'support' && 'Growth Associate Support'}
              </h3>
              <p className="text-xs text-[#60769B]">Atriowings Technologies India Private Limited</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#60769B] hover:text-[#10244D] hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto text-xs text-[#10244D] leading-relaxed space-y-4">
          {type === 'privacy' && (
            <>
              <p>
                <strong>Atriowings Technologies India Private Limited</strong> is committed to protecting the privacy and personal data of our Growth Associates, clients, and partners in full compliance with the Information Technology Act, 2000 and applicable Indian data protection principles.
              </p>
              <div>
                <h4 className="font-bold text-[#0879E8] mb-1">Information We Collect</h4>
                <p className="text-[#60769B]">
                  We collect information necessary to onboard and manage your Associate account, including full legal name, contact details (phone, email), postal address, government ID documentation (PAN/Aadhaar) for tax compliance, and bank account information for authorized commission disbursements.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#0879E8] mb-1">Data Protection & Security</h4>
                <p className="text-[#60769B]">
                  All confidential credentials and financial records are encrypted using industry-standard cryptographic hashing and secure socket layers (TLS/SSL). We never sell or rent your personal information to third-party commercial marketing platforms.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#0879E8] mb-1">Contacting the Data Protection Officer</h4>
                <p className="text-[#60769B]">
                  For any privacy inquiries or request to update your details, contact our compliance officer at <span className="font-semibold text-[#0879E8]">privacy@atriowings.com</span>.
                </p>
              </div>
            </>
          )}

          {type === 'terms' && (
            <>
              <p>
                By accessing or registering with the <strong>Atriowings Growth Associate Portal</strong>, you agree to adhere to the official business growth terms, referral policies, and service code of conduct.
              </p>
              <div>
                <h4 className="font-bold text-[#0879E8] mb-1">1. Program Eligibility & Admin Approval</h4>
                <p className="text-[#60769B]">
                  Submission of an associate registration does not guarantee immediate portal activation. All applications require verification by Atriowings Executive Administration. Active status is granted upon review of valid KYC and credentials.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#0879E8] mb-1">2. Commission Rules & Verified Payouts</h4>
                <p className="text-[#60769B]">
                  Commissions are calculated strictly on agreed IT services and retainer fees following Admin dual-approval. Payouts are disbursed to verified bank accounts via NEFT/IMPS with official bank UTR tracking upon verified client payments.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#0879E8] mb-1">3. Confidentiality & Non-Disclosure</h4>
                <p className="text-[#60769B]">
                  Associates agree to keep all corporate client lists, commercial quotations, scope details, and proprietary pricing confidential.
                </p>
              </div>
            </>
          )}

          {type === 'support' && (
            <>
              <p>
                Our Associate Success team is here to assist you with registration inquiries, KYC verification, commercial quotation questions, and payout status updates.
              </p>
              <div className="bg-[#F5F9FF] border border-[#D6E2F2] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#0879E8] shrink-0" />
                  <div>
                    <span className="text-[11px] text-[#60769B] block">Email Support</span>
                    <a href="mailto:support@atriowings.com" className="font-bold text-[#0879E8] hover:underline">
                      support@atriowings.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#0879E8] shrink-0" />
                  <div>
                    <span className="text-[11px] text-[#60769B] block">Corporate Desk</span>
                    <span className="font-bold text-[#10244D]">+91 (0) 44 4850 1200</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#0879E8] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-[#60769B] block">Headquarters</span>
                    <span className="text-xs text-[#10244D]">
                      Atriowings Technologies India Private Limited, Chennai, Tamil Nadu, India
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#60769B]">
                Operating Hours: Monday – Saturday, 9:30 AM to 6:30 PM IST (Excluding Public Holidays).
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#D6E2F2] bg-[#F5F9FF] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-[#0879E8] to-[#123FAD] text-white rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
