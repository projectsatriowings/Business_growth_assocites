import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, Users, Calendar, DollarSign, Clock, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { apiRequest } from '../utils/api';
import { useToast } from '../context/ToastContext';

interface FinalPaymentFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  clientName: string;
  onSuccess: () => void;
}

export const FinalPaymentFollowUpModal: React.FC<FinalPaymentFollowUpModalProps> = ({
  isOpen,
  onClose,
  project,
  clientName,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [contactMethod, setContactMethod] = useState<'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'OTHER'>('CALL');
  const [clientResponse, setClientResponse] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedPaymentDate, setExpectedPaymentDate] = useState('');
  const [expectedAmount, setExpectedAmount] = useState<string>('');
  const [status, setStatus] = useState<string>('CLIENT_CONTACTED');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error('Follow-up notes are required');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/api/bga/projects/${project.id}/final-payment-follow-ups`, {
        method: 'POST',
        body: JSON.stringify({
          contactMethod,
          clientResponse: clientResponse.trim() || undefined,
          notes: notes.trim(),
          expectedPaymentDate: expectedPaymentDate || undefined,
          expectedAmount: expectedAmount ? parseFloat(expectedAmount) : undefined,
          status,
        }),
      });

      toast.success(
        status === 'PAYMENT_PROMISED'
          ? 'Client payment commitment recorded! Accounts notified.'
          : 'Final payment follow-up logged successfully.'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <span className="font-mono text-xs text-[#3066BE] font-bold">
              {project?.projectNumber || 'PROJECT'}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Record Final Payment Follow-up
            </h3>
            <p className="text-xs text-slate-500">Client: <strong>{clientName}</strong></p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Contact Method */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Contact Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'CALL', label: 'Call', icon: Phone },
                { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
                { id: 'EMAIL', label: 'Email', icon: Mail },
                { id: 'MEETING', label: 'Meeting', icon: Users },
                { id: 'OTHER', label: 'Other', icon: Clock },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = contactMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setContactMethod(m.id as any)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'border-[#3066BE] bg-blue-50 text-[#3066BE] font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Follow-up Status */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Follow-up Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE]"
            >
              <option value="FOLLOW_UP_PENDING">Follow-up Pending (Initial Stage)</option>
              <option value="CLIENT_CONTACTED">Client Contacted (Discussion in progress)</option>
              <option value="PAYMENT_PROMISED">Payment Promised / Date Confirmed (Notifies Accounts)</option>
              <option value="PAYMENT_DELAYED">Payment Delayed (Client requested extension)</option>
              <option value="DISPUTED">Client Disputed / Concerns Raised</option>
              <option value="FOLLOW_UP_REQUIRED">Follow-up Required (Call again later)</option>
            </select>
          </div>

          {/* Expected Payment Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Expected Payment Date
              </label>
              <input
                type="date"
                value={expectedPaymentDate}
                onChange={(e) => setExpectedPaymentDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Expected Amount (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE]"
              />
            </div>
          </div>

          {/* Client Response */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Client Response / Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Client confirmed invoice is approved by finance team..."
              value={clientResponse}
              onChange={(e) => setClientResponse(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE]"
            />
          </div>

          {/* Follow-up Notes (Required) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Detailed Follow-up Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Record exact discussion notes, expected clearance timeline, payment mode committed, or obstacles..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE]"
            />
          </div>

          {/* Important Security Notice */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Compliance Notice:</strong> Follow-up records inform Accounts and Admin of client payment commitments. Verbal promises or BGA follow-up logs do NOT constitute financial clearance. Final payment is only cleared once bank credit is verified by Accounts.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !notes.trim()}
              className="px-5 py-2 rounded-xl bg-[#3066BE] hover:bg-[#204482] text-white font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              {submitting ? 'Recording...' : 'Submit Follow-up'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
