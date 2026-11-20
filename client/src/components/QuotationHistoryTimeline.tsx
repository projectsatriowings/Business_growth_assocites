import React, { useState } from 'react';
import {
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  History,
  Bell,
  Clock,
  ArrowRight,
  Briefcase,
  DollarSign,
  ShieldCheck,
  Phone,
  FileCheck,
  Award,
  Wallet,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { getQuotationPdfUrl } from '../utils/downloadPdf';
import { QuotationPostAcceptanceTrail } from './QuotationPostAcceptanceTrail';

interface Reminder {
  id: string;
  message?: string | null;
  createdAt: string | Date;
  bga?: { name: string } | null;
}

export interface PaymentItem {
  id: string;
  paymentType: 'ADVANCE' | 'FINAL' | 'INTERIM' | 'MONTHLY_RECURRING' | string;
  amount: number;
  adBudgetAmount?: number;
  netServiceFee?: number;
  paymentMethod?: string;
  transactionReference?: string;
  paymentDate?: string | Date;
  proofAttachmentUrl?: string | null;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | string;
  verifiedAt?: string | Date | null;
  verifiedById?: string | null;
  verificationNotes?: string | null;
  createdAt: string | Date;
}

export interface FinalPaymentFollowUpItem {
  id: string;
  followUpDate: string | Date;
  contactMethod: string;
  clientResponse?: string | null;
  notes: string;
  expectedPaymentDate?: string | Date | null;
  expectedAmount?: number | null;
  status: string;
  createdAt: string | Date;
  bga?: { name: string } | null;
}

export interface ProjectDeliverableItem {
  id: string;
  title: string;
  fileUrl?: string | null;
  version?: number;
  notes?: string | null;
  bgaApprovalStatus?: string;
  createdAt: string | Date;
}

export interface TechnicalProjectItem {
  id: string;
  projectNumber: string;
  status: string;
  progressPercentage?: number;
  completionNotes?: string | null;
  completedAt?: string | Date | null;
  deliverables?: ProjectDeliverableItem[];
  finalPaymentFollowUps?: FinalPaymentFollowUpItem[];
}

export interface CommissionItem {
  id: string;
  calculatedCommission: number;
  commissionRate: number;
  approvalStatus: string;
  payoutStatus: string;
  payoutTransactionRef?: string | null;
  payoutDate?: string | Date | null;
  notes?: string | null;
}

export interface WorkOrderItem {
  id: string;
  workOrderNumber: string;
  status: string;
  agreedScope?: string;
  totalValue?: number;
  advanceRequired?: number;
  advancePaid?: number;
  advanceVerified?: boolean;
  handoverApproved?: boolean;
  handoverStatus?: string | null;
  handoverNotes?: string | null;
  handoverApprovedAt?: string | Date | null;
  createdAt: string | Date;
  payments?: PaymentItem[];
  project?: TechnicalProjectItem | null;
  commissions?: CommissionItem[];
}

export interface QuotationVersionItem {
  id: string;
  quotationNumber: string;
  version: number;
  status: string;
  adminApprovalStatus?: string | null;
  adminNotes?: string | null;
  adminReviewedAt?: string | Date | null;
  revisionNotes?: string | null;
  serviceCategory?: string;
  serviceScope?: string;
  serviceFee?: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  advanceRequiredPercent?: number;
  advanceRequiredAmount?: number;
  proposedCommissionRate?: number | null;
  approvedCommissionRate?: number | null;
  commissionApprovalStatus?: string | null;
  commissionExceptionReason?: string | null;
  commissionNotes?: string | null;
  createdAt: string | Date;
  acceptedAt?: string | Date | null;
  clientAcceptanceNotes?: string | null;
  preparedById?: string | null;
  reminders?: Reminder[];
  workOrder?: WorkOrderItem | null;
}

interface QuotationHistoryTimelineProps {
  currentQuotation: QuotationVersionItem & {
    versionHistory?: QuotationVersionItem[];
    previousVersion?: QuotationVersionItem | null;
    supersededBy?: { id: string; quotationNumber: string; version: number } | null;
    workOrder?: WorkOrderItem | null;
  };
  defaultExpanded?: boolean;
}

export const QuotationHistoryTimeline: React.FC<QuotationHistoryTimelineProps> = ({
  currentQuotation,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  // Derive version history array (sorted by version ascending)
  const history: QuotationVersionItem[] = (
    currentQuotation.versionHistory && currentQuotation.versionHistory.length > 0
      ? currentQuotation.versionHistory
      : currentQuotation.previousVersion
      ? [currentQuotation.previousVersion, currentQuotation]
      : [currentQuotation]
  ).slice().sort((a, b) => a.version - b.version);

  // If there's only 1 version and no rejections, no reminders, no special history, show compact
  const hasMultipleVersions = history.length > 1;
  const hasRejectionOrNotes = history.some(
    (h) => h.adminNotes || h.revisionNotes || (h.reminders && h.reminders.length > 0)
  );

  return (
    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs mt-3">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 px-4 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-200/80"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              <span>Quotation Revision, Rejection & Follow-up History</span>
              {hasMultipleVersions && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold border border-blue-200">
                  {history.length} Versions Recorded
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Complete chronological audit trail: Version 1 draft, rejection reasons, updated versions, executive approvals, and BGA reminders.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 self-end sm:self-auto shrink-0"
        >
          <span>{isExpanded ? 'Hide History' : 'View Full History'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Timeline Body */}
      {isExpanded && (
        <div className="p-4 md:p-5 space-y-6">
          {history.map((ver, idx) => {
            const isCurrent = ver.id === currentQuotation.id;
            const prevVer = idx > 0 ? history[idx - 1] : null;
            const priceDiff = prevVer && ver.totalAmount != null && prevVer.totalAmount != null
              ? ver.totalAmount - prevVer.totalAmount
              : null;

            const isAccepted = ver.status === 'ACCEPTED' || !!ver.acceptedAt;
            const isApproved =
              ver.adminApprovalStatus === 'APPROVED' ||
              ver.status === 'ADMIN_APPROVED' ||
              ver.status === 'SENT_TO_BGA';
            const isRejected =
              ver.adminApprovalStatus === 'REJECTED' || ver.status === 'REJECTED';
            const isRevisionRequested =
              ver.status === 'REVISION_REQUESTED' || ver.adminApprovalStatus === 'REVISION_REQUESTED';
            const isSuperseded =
              ver.status === 'EXPIRED' ||
              idx < history.length - 1;

            return (
              <div
                key={ver.id || `ver-${ver.version}`}
                className={`relative rounded-xl border p-4 space-y-3.5 transition-all ${
                  isCurrent
                    ? 'bg-white border-blue-300 ring-1 ring-blue-100 shadow-sm'
                    : 'bg-white/80 border-slate-200 shadow-2xs'
                }`}
              >
                {/* Top Badge & Version Meta */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Version {ver.version} {isCurrent && '(Active)'}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {ver.quotationNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(ver.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Pill */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        isAccepted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isApproved
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : isRejected
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isRevisionRequested
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isSuperseded
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isAccepted
                        ? 'CLIENT ACCEPTED'
                        : isApproved
                        ? 'ADMIN APPROVED'
                        : isRejected
                        ? 'ADMIN REJECTED'
                        : isRevisionRequested
                        ? 'REVISION REQUESTED'
                        : isSuperseded
                        ? `SUPERSEDED (V${ver.version})`
                        : ver.status}
                    </span>

                    {/* PDF Download Button for this version */}
                    {ver.preparedById != null ? (
                      <a
                        href={getQuotationPdfUrl(ver.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                        title={`Download Version ${ver.version} Official PDF Document`}
                      >
                        <Download className="w-3 h-3 text-slate-200" />
                        <span>v{ver.version} PDF</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Draft Pending</span>
                    )}
                  </div>
                </div>

                {/* Financial Summary & Delta vs Previous Version */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Service Fee</span>
                    <span className="font-bold text-slate-900">₹{(ver.serviceFee || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">GST ({ver.taxRate || 18}%)</span>
                    <span className="font-bold text-slate-900">₹{(ver.taxAmount || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Total Contract Value</span>
                    <span className="font-bold text-indigo-700">₹{(ver.totalAmount || 0).toLocaleString()}</span>
                    {priceDiff != null && priceDiff !== 0 && (
                      <span
                        className={`block text-[10px] font-extrabold mt-0.5 ${
                          priceDiff > 0 ? 'text-indigo-600' : 'text-emerald-600'
                        }`}
                      >
                        {priceDiff > 0 ? `+₹${priceDiff.toLocaleString()}` : `-₹${Math.abs(priceDiff).toLocaleString()}`} vs v{prevVer?.version}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Required Advance ({ver.advanceRequiredPercent || 50}%)
                    </span>
                    <span className="font-bold text-[#119DA4]">₹{(ver.advanceRequiredAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-amber-50/80 border border-amber-200/60 rounded-lg p-2">
                    <span className="text-amber-800 block text-[10px] uppercase font-bold">
                      BGA Commission {ver.approvedCommissionRate || ver.status === 'ADMIN_APPROVED' || ver.adminApprovalStatus === 'APPROVED' ? '(Approved)' : '(Proposed)'}
                    </span>
                    <span className="font-extrabold text-amber-950 text-xs">
                      {ver.approvedCommissionRate ?? ver.proposedCommissionRate ?? (ver.status === 'ADMIN_APPROVED' ? 10 : 10)}%
                    </span>
                    <span className="text-slate-500 block text-[10px] font-medium mt-0.5">
                      ₹{Math.round(((ver.serviceFee || 0) - (ver.discount || 0)) * ((ver.approvedCommissionRate ?? ver.proposedCommissionRate ?? 10) / 100)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Scope of Work */}
                {ver.serviceScope && (
                  <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100">
                    <strong className="text-slate-900">Scope of Work (v{ver.version}):</strong>{' '}
                    <span className="text-slate-600">{ver.serviceScope}</span>
                  </div>
                )}

                {/* REJECTION REASON & MESSAGE (Crucial for clarification) */}
                {(isRejected || (ver.adminApprovalStatus === 'REJECTED' && ver.adminNotes)) && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Admin Rejection Reason & Return Guidance:</span>
                      {ver.adminReviewedAt && (
                        <span className="text-[10px] font-mono text-rose-600 font-normal ml-auto">
                          {new Date(ver.adminReviewedAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="pl-5 text-rose-950 font-semibold bg-white/70 p-2 rounded-lg border border-rose-100">
                      "{ver.adminNotes || 'Quotation returned for corrections. Scope or pricing adjustments required.'}"
                    </div>
                    <p className="pl-5 text-[11px] text-rose-700">
                      Accounts updated this quotation based on the feedback above and issued the subsequent version.
                    </p>
                  </div>
                )}

                {/* BGA / CLIENT REVISION FEEDBACK NOTES */}
                {ver.revisionNotes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Revision Request Feedback from Client / Associate:</span>
                    </div>
                    <div className="pl-5 text-amber-950 font-semibold bg-white/70 p-2 rounded-lg border border-amber-100">
                      "{ver.revisionNotes}"
                    </div>
                  </div>
                )}

                {/* ADMIN APPROVAL GUIDANCE (When Approved) */}
                {isApproved && ver.adminNotes && !isRejected && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Executive Approval Verification:</span>
                      {ver.adminReviewedAt && (
                        <span className="text-[10px] font-mono text-blue-600 font-normal ml-auto">
                          {new Date(ver.adminReviewedAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="pl-5 text-blue-950 font-semibold bg-white/70 p-2 rounded-lg border border-blue-100">
                      "{ver.adminNotes}"
                    </div>
                  </div>
                )}

                {/* CLIENT ACCEPTANCE CONFIRMATION */}
                {isAccepted && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Client Acceptance & Commercial Agreement:</span>
                      {ver.acceptedAt && (
                        <span className="text-[10px] font-mono text-emerald-700 font-normal ml-auto">
                          Accepted: {new Date(ver.acceptedAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>
                    {ver.clientAcceptanceNotes && (
                      <div className="pl-5 text-emerald-950 font-medium">
                        "{ver.clientAcceptanceNotes}"
                      </div>
                    )}
                  </div>
                )}

                {/* FOLLOW-UP & REMINDERS SENT DURING THIS VERSION */}
                {ver.reminders && ver.reminders.length > 0 && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <Bell className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      <span>Follow-up Reminders Logged during Version {ver.version} ({ver.reminders.length}):</span>
                    </div>
                    <div className="space-y-1.5 pl-2">
                      {ver.reminders.map((rem, rIdx) => (
                        <div
                          key={rem.id || rIdx}
                          className="bg-white p-2 rounded-lg border border-amber-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 text-[11px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-slate-800 font-medium">
                              {rem.message || 'Quotation preparation reminder sent to Accounts Department.'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {new Date(rem.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Post-Acceptance Milestone & Payment Audit Trail */}
          {(() => {
            const wo =
              currentQuotation.workOrder ||
              history.find((h: any) => h.workOrder)?.workOrder ||
              null;
            if (!wo) return null;
            return <QuotationPostAcceptanceTrail workOrder={wo} />;
          })()}
        </div>
      )}
    </div>
  );
};
