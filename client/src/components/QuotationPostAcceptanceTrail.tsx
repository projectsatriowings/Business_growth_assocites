import React from 'react';
import {
  Briefcase,
  DollarSign,
  CheckCircle2,
  Clock,
  Award,
  FileCheck,
  Phone,
  ShieldCheck,
  Wallet,
  Sparkles,
} from 'lucide-react';

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

interface QuotationPostAcceptanceTrailProps {
  workOrder: WorkOrderItem;
}

export const QuotationPostAcceptanceTrail: React.FC<QuotationPostAcceptanceTrailProps> = ({ workOrder }) => {
  const payments = workOrder.payments || [];
  const advancePayments = payments.filter((p) => p.paymentType === 'ADVANCE');
  const finalPayments = payments.filter((p) => p.paymentType === 'FINAL');
  const otherPayments = payments.filter((p) => p.paymentType !== 'ADVANCE' && p.paymentType !== 'FINAL');
  const prj = workOrder.project || null;
  const followUps = prj?.finalPaymentFollowUps || [];
  const commissions = workOrder.commissions || [];
  const primaryComm = commissions[0] || null;

  return (
    <div className="pt-3 border-t border-blue-200/60 space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div>
          <h5 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">
            Client Execution, Payment Audit & Follow-up History
          </h5>
          <p className="text-[11px] text-slate-500">
            Reconciled bank records, technical production status, BGA follow-up logs, and commission clearance.
          </p>
        </div>
      </div>

      {/* 1. Work Order Card */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 text-xs space-y-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Briefcase className="w-4 h-4 text-blue-700 shrink-0" />
            <span className="font-bold text-slate-900">Work Order Generated:</span>
            <span className="font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
              {workOrder.workOrderNumber}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                workOrder.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : workOrder.status === 'IN_PRODUCTION'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {workOrder.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Created: {new Date(workOrder.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white/80 p-2.5 rounded-lg border border-blue-100">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-medium">Total Contract Value</span>
            <span className="font-bold text-slate-900">₹{(workOrder.totalValue || 0).toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-medium">Required Advance</span>
            <span className="font-bold text-indigo-700">₹{(workOrder.advanceRequired || 0).toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-medium">Advance Verification</span>
            <span className={`font-bold ${workOrder.advanceVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {workOrder.advanceVerified ? '✓ VERIFIED' : 'PENDING'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-medium">Handover Status</span>
            <span className="font-bold text-slate-800">
              {workOrder.handoverStatus || (workOrder.advanceVerified ? 'AUTHORIZED' : 'PENDING')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Advance Payment Audit & Accounts Verification */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Advance Payment Audit & Accounts Verification</span>
        </div>

        {advancePayments.length === 0 ? (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs flex items-start gap-2 text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Awaiting Client Advance Payment:</strong>
              <span className="text-[11px] text-amber-800">
                Quotation accepted. Accounts will audit the bank receipt, record the advance payment, and verify the transaction reference before technical release.
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {advancePayments.map((adv) => {
              const isAdvVerified = adv.status === 'VERIFIED';
              const isAdvRejected = adv.status === 'REJECTED';
              return (
                <div
                  key={adv.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                    isAdvVerified
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : isAdvRejected
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-black/5 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          isAdvVerified
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isAdvRejected
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {isAdvVerified ? '✓ ADVANCE PAYMENT VERIFIED' : isAdvRejected ? '✗ ADVANCE REJECTED' : '⏳ ADVANCE PENDING VERIFICATION'}
                      </span>
                      <span className="font-bold text-sm">
                        ₹{adv.amount?.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] font-mono text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-black/10">
                        UTR: {adv.transactionReference || 'N/A'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Method: {adv.paymentMethod || 'BANK_TRANSFER'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Paid: {new Date(adv.paymentDate || adv.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-lg border border-black/5 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">
                        {isAdvVerified ? 'Accounts Audit Clearance:' : isAdvRejected ? 'Accounts Rejection Reason:' : 'Accounts In-Review Notes:'}
                      </span>
                      {adv.verifiedAt && (
                        <span className="font-mono text-[10px] text-slate-400">
                          Verified: {new Date(adv.verifiedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800">
                      "{adv.verificationNotes || (isAdvVerified ? 'Bank receipt audited and verified against company ledger. Authorized production release.' : 'Payment logged by Accounts department.')}"
                    </p>
                    {isAdvVerified && (
                      <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Automatic handover triggered: Work Order authorized and released to Technical Production.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Technical Project Execution Status */}
      {prj && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Award className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-bold text-slate-900">Technical Team Execution:</span>
              <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {prj.projectNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  prj.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : prj.status === 'UNDER_REVIEW'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {prj.status}
              </span>
            </div>
            <span className="font-bold text-indigo-700 text-xs">
              Progress: {prj.progressPercentage || (prj.status === 'COMPLETED' ? 100 : 0)}%
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all"
              style={{ width: `${prj.progressPercentage || (prj.status === 'COMPLETED' ? 100 : 0)}%` }}
            />
          </div>

          {prj.status === 'COMPLETED' && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
              <div className="flex items-center justify-between font-bold text-emerald-900">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Technical Project Successfully Completed
                </span>
                {prj.completedAt && (
                  <span className="font-mono text-[10px] text-emerald-700 font-normal">
                    {new Date(prj.completedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                )}
              </div>
              {prj.completionNotes && <p className="font-medium">"{prj.completionNotes}"</p>}
              <p className="text-[10px] text-emerald-700">
                ✓ All milestone deliverables uploaded. Final client payment follow-up and verification initiated.
              </p>
            </div>
          )}

          {prj.deliverables && prj.deliverables.length > 0 && (
            <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                {prj.deliverables.length} Deliverable(s) Registered by Technical Team
              </span>
              <span className="text-[10px] text-slate-400">Available in Project Workspace</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Final Payment Follow-up Records (BGA & Client Logs) */}
      {followUps.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              <span>BGA Final Payment Follow-up Records ({followUps.length}):</span>
            </div>
            <span className="text-[10px] text-amber-700">Synchronized with Accounts & Admin</span>
          </div>

          <div className="space-y-2 pl-1">
            {followUps.map((fUp) => (
              <div
                key={fUp.id}
                className="p-2.5 bg-white rounded-lg border border-amber-200/80 text-[11px] space-y-1.5 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      {fUp.contactMethod}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {fUp.status?.replace(/_/g, ' ')}
                    </span>
                    {fUp.bga?.name && (
                      <span className="text-slate-600 font-semibold">by {fUp.bga.name}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(fUp.followUpDate || fUp.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                <p className="text-slate-800 font-medium">"{fUp.notes}"</p>

                {fUp.clientResponse && (
                  <p className="text-[10px] text-slate-500 italic">
                    Client Response: "{fUp.clientResponse}"
                  </p>
                )}

                {(fUp.expectedPaymentDate || fUp.expectedAmount != null) && (
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[10px] text-slate-600 font-medium">
                    {fUp.expectedAmount != null && (
                      <span>Expected Amount: <strong>₹{fUp.expectedAmount.toLocaleString('en-IN')}</strong></span>
                    )}
                    {fUp.expectedPaymentDate && (
                      <span>Promised Date: <strong>{new Date(fUp.expectedPaymentDate).toLocaleDateString('en-IN')}</strong></span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Final Payment Audit & Verification (Accounts) */}
      {(finalPayments.length > 0 || (prj?.status === 'COMPLETED' && advancePayments.length > 0)) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Final Payment Verification & Financial Settlement</span>
          </div>

          {finalPayments.length === 0 ? (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-start gap-2 text-blue-900">
              <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Awaiting Final Payment from Client:</strong>
                <span className="text-[11px] text-blue-800">
                  Technical deliverables completed. Assigned BGA is following up for final payment clearance. Accounts will audit bank credit once received.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {finalPayments.map((fin) => {
                const isFinVerified = fin.status === 'VERIFIED';
                const isFinRejected = fin.status === 'REJECTED';
                return (
                  <div
                    key={fin.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                      isFinVerified
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : isFinRejected
                        ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                        : 'bg-amber-50/70 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-black/5 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isFinVerified
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isFinRejected
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isFinVerified ? '✓ FINAL PAYMENT VERIFIED — 100% SETTLED' : isFinRejected ? '✗ FINAL PAYMENT REJECTED' : '⏳ FINAL PAYMENT PENDING VERIFICATION'}
                        </span>
                        <span className="font-bold text-sm">
                          ₹{fin.amount?.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] font-mono text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-black/10">
                          UTR: {fin.transactionReference || 'N/A'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Paid: {new Date(fin.paymentDate || fin.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-black/5 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-semibold">
                          {isFinVerified ? 'Accounts Audit Settlement:' : isFinRejected ? 'Accounts Rejection Reason:' : 'Accounts In-Review Notes:'}
                        </span>
                        {fin.verifiedAt && (
                          <span className="font-mono text-[10px] text-slate-400">
                            Verified: {new Date(fin.verifiedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-800">
                        "{fin.verificationNotes || (isFinVerified ? 'Final payment verified against bank statement. Contract settled in full.' : 'Payment logged by Accounts department.')}"
                      </p>
                      {isFinVerified && (
                        <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          100% client financial settlement confirmed. Commission request forwarded to Admin for approval.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Other / Interim / Monthly Payments (if any) */}
      {otherPayments.length > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
          <span className="font-bold text-slate-800 block">Recurring & Interim Payment Records ({otherPayments.length}):</span>
          <div className="space-y-1.5">
            {otherPayments.map((op) => (
              <div key={op.id} className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{op.paymentType}</span>
                  <span className="font-mono text-slate-600">₹{op.amount?.toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 font-mono">UTR: {op.transactionReference}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  op.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {op.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Associate Commission Approval & Payout History */}
      {primaryComm && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-blue-50/40 border border-teal-200 text-xs space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Wallet className="w-4 h-4 text-teal-700 shrink-0" />
              <span className="font-bold text-slate-900">BGA Associate Commission:</span>
              <span className="font-extrabold text-sm text-teal-800">
                ₹{primaryComm.calculatedCommission?.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-teal-100">
                Rate: {primaryComm.commissionRate}%
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  primaryComm.approvalStatus === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : primaryComm.approvalStatus === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                Admin: {primaryComm.approvalStatus?.replace(/_/g, ' ')}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  primaryComm.payoutStatus === 'PAID'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                Payout: {primaryComm.payoutStatus?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {primaryComm.payoutStatus === 'PAID' ? (
            <div className="p-2 bg-white/90 rounded-lg border border-teal-100 text-[11px] text-teal-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
              <span className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Commission disbursed to verified bank account (UTR: {primaryComm.payoutTransactionRef || 'Disbursed'})
              </span>
              {primaryComm.payoutDate && (
                <span className="font-mono text-[10px] text-slate-500">
                  Disbursed: {new Date(primaryComm.payoutDate).toLocaleDateString('en-IN')}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic pl-1">
              {primaryComm.approvalStatus === 'APPROVED'
                ? 'Commission approved by Admin. Accounts is processing the bank transfer.'
                : 'Commission calculation submitted. Awaiting Admin review & sign-off.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
