import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  Users,
  Clock,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Send,
} from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { DatePicker } from './DatePicker';
import { apiRequest } from '../utils/api';
import { useToast } from '../context/ToastContext';

export type FollowUpContextType = 'GENERAL' | 'ENQUIRY' | 'QUOTATION' | 'PROJECT' | 'FINAL_PAYMENT';

interface UnifiedClientFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    clientName: string;
    businessName: string;
    mobile?: string;
    email?: string;
    enquiries?: any[];
    quotations?: any[];
    workOrders?: any[];
  };
  initialContext?: FollowUpContextType;
  initialTargetId?: string;
  onSuccess: () => void;
}

export const UnifiedClientFollowUpModal: React.FC<UnifiedClientFollowUpModalProps> = ({
  isOpen,
  onClose,
  client,
  initialContext = 'GENERAL',
  initialTargetId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [context, setContext] = useState<FollowUpContextType>(initialContext);

  // General discussion fields
  const [contactMethod, setContactMethod] = useState<'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'OTHER'>('CALL');
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [outcome, setOutcome] = useState('INTERESTED');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  // Enquiry context fields
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string>('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [clientOutcome, setClientOutcome] = useState<'PROCEED' | 'DROPPED' | 'RESCHEDULED'>('PROCEED');
  const [revisedBudget, setRevisedBudget] = useState('');

  // Quotation context fields
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [quotationNotes, setQuotationNotes] = useState('');
  const [quotationAction, setQuotationAction] = useState<'REMINDER' | 'DISCUSSION'>('REMINDER');

  // Project feedback context fields
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectMessage, setProjectMessage] = useState('');
  const [projectMessageType, setProjectMessageType] = useState<string>('BGA_REPRESENTATIVE');
  const [projectVisibility, setProjectVisibility] = useState<'CLIENT_VISIBLE' | 'INTERNAL'>('CLIENT_VISIBLE');
  const [clientDecision, setClientDecision] = useState<'NONE' | 'APPROVED' | 'CHANGES_REQUESTED'>('NONE');

  // Final payment follow-up fields
  const [clientResponse, setClientResponse] = useState('');
  const [expectedPaymentDate, setExpectedPaymentDate] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('CLIENT_CONTACTED');

  // Extract available projects from work orders
  const availableProjects = (client?.workOrders || [])
    .filter((wo: any) => wo.project)
    .map((wo: any) => ({
      ...wo.project,
      workOrderNumber: wo.workOrderNumber,
    }));

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setContext(initialContext);
      if (initialTargetId) {
        if (initialContext === 'ENQUIRY') setSelectedEnquiryId(initialTargetId);
        if (initialContext === 'QUOTATION') setSelectedQuotationId(initialTargetId);
        if (initialContext === 'PROJECT' || initialContext === 'FINAL_PAYMENT') setSelectedProjectId(initialTargetId);
      } else {
        if (client?.enquiries?.length) setSelectedEnquiryId(client.enquiries[0].id);
        if (client?.quotations?.length) setSelectedQuotationId(client.quotations[0].id);
        if (availableProjects.length) setSelectedProjectId(availableProjects[0].id);
      }
    }
  }, [isOpen, initialContext, initialTargetId, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (context === 'GENERAL') {
        if (!discussionSummary.trim()) {
          toast.error('Discussion summary is required');
          setSubmitting(false);
          return;
        }

        await apiRequest(`/api/bga/clients/${client.id}/activities`, {
          method: 'POST',
          body: JSON.stringify({
            contactMethod,
            discussionSummary: discussionSummary.trim(),
            followUpNotes: followUpNotes.trim() || undefined,
            outcome,
            nextFollowUpDate: nextFollowUpDate || undefined,
          }),
        });

        toast.success('Client contact activity logged successfully');
      } else if (context === 'ENQUIRY') {
        if (!selectedEnquiryId) {
          toast.error('Please select an enquiry');
          setSubmitting(false);
          return;
        }
        if (!consultationNotes.trim()) {
          toast.error('Consultation notes are required');
          setSubmitting(false);
          return;
        }

        await apiRequest(`/api/bga/enquiries/${selectedEnquiryId}/consultation`, {
          method: 'PUT',
          body: JSON.stringify({
            consultationNotes: consultationNotes.trim(),
            clientOutcome,
            revisedBudget: revisedBudget ? parseFloat(revisedBudget) : undefined,
            nextFollowUpDate: nextFollowUpDate || undefined,
          }),
        });

        toast.success('Enquiry consultation notes saved');
      } else if (context === 'QUOTATION') {
        if (!selectedQuotationId) {
          toast.error('Please select a quotation');
          setSubmitting(false);
          return;
        }

        if (quotationAction === 'REMINDER') {
          await apiRequest(`/api/bga/quotations/${selectedQuotationId}/remind`, {
            method: 'POST',
            body: JSON.stringify({ notes: quotationNotes.trim() || undefined }),
          });
          toast.success('Quotation reminder notification sent');
        } else {
          // Log as general discussion linked to client with quotation ref
          const targetQuote = (client?.quotations || []).find((q: any) => q.id === selectedQuotationId);
          await apiRequest(`/api/bga/clients/${client.id}/activities`, {
            method: 'POST',
            body: JSON.stringify({
              contactMethod,
              discussionSummary: `Quotation Discussion (${targetQuote?.quotationNumber || 'Quote'}): ${quotationNotes.trim()}`,
              followUpNotes: followUpNotes.trim() || undefined,
              outcome: 'QUOTATION_REVIEW',
              nextFollowUpDate: nextFollowUpDate || undefined,
            }),
          });
          toast.success('Quotation discussion logged');
        }
      } else if (context === 'PROJECT') {
        if (!selectedProjectId) {
          toast.error('Please select an active project');
          setSubmitting(false);
          return;
        }
        if (!projectMessage.trim()) {
          toast.error('Message content is required');
          setSubmitting(false);
          return;
        }

        await apiRequest(`/api/bga/projects/${selectedProjectId}/feedback`, {
          method: 'POST',
          body: JSON.stringify({
            content: projectMessage.trim(),
            messageType: projectMessageType,
            visibility: projectVisibility,
            clientDecision: clientDecision === 'NONE' ? undefined : clientDecision,
          }),
        });

        toast.success('Project communication recorded');
      } else if (context === 'FINAL_PAYMENT') {
        if (!selectedProjectId) {
          toast.error('Please select a project with pending payment');
          setSubmitting(false);
          return;
        }
        if (!followUpNotes.trim() && !discussionSummary.trim()) {
          toast.error('Follow-up notes are required');
          setSubmitting(false);
          return;
        }

        await apiRequest(`/api/bga/projects/${selectedProjectId}/final-payment-follow-ups`, {
          method: 'POST',
          body: JSON.stringify({
            contactMethod,
            clientResponse: clientResponse.trim() || undefined,
            notes: (followUpNotes || discussionSummary).trim(),
            expectedPaymentDate: expectedPaymentDate || undefined,
            expectedAmount: expectedAmount ? parseFloat(expectedAmount) : undefined,
            status: paymentStatus,
          }),
        });

        toast.success(
          paymentStatus === 'PAYMENT_PROMISED'
            ? 'Client payment commitment recorded! Accounts notified.'
            : 'Final payment follow-up logged successfully.'
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#3066BE] font-bold">
                {client?.businessName || 'CLIENT'}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {client?.clientName}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Unified Follow-up & Activity Workspace
            </h3>
            <p className="text-xs text-slate-500">
              Log client consultations, quotation negotiations, project notes, or payment follow-ups in one place.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Activity Context Tabs */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Select Follow-Up Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'GENERAL', label: 'General Activity', icon: Phone },
              { id: 'ENQUIRY', label: 'Enquiry Consultation', icon: FileText },
              { id: 'QUOTATION', label: 'Quotation Follow-up', icon: MessageSquare },
              { id: 'PROJECT', label: 'Project Message', icon: Briefcase },
              { id: 'FINAL_PAYMENT', label: 'Final Payment', icon: DollarSign },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = context === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setContext(tab.id as FollowUpContextType)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    active
                      ? 'bg-[#3066BE] text-white border-[#3066BE] shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${active ? 'text-white' : 'text-slate-500'}`} />
                  <span className="text-[10px] leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* CONTEXT-SPECIFIC SELECTORS */}

          {/* Enquiry Selector */}
          {context === 'ENQUIRY' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Client Enquiry <span className="text-red-500">*</span>
              </label>
              {(client?.enquiries || []).length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  No enquiries recorded for this client yet.
                </div>
              ) : (
                <select
                  value={selectedEnquiryId}
                  onChange={(e) => setSelectedEnquiryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden"
                >
                  {(client?.enquiries || []).map((enq: any) => (
                    <option key={enq.id} value={enq.id}>
                      {enq.serviceCategory?.replace(/_/g, ' ')} — Status: {enq.status} (Budget: ₹{enq.expectedBudget?.toLocaleString('en-IN') || 'N/A'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Quotation Selector */}
          {context === 'QUOTATION' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Client Quotation <span className="text-red-500">*</span>
              </label>
              {(client?.quotations || []).length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  No quotations prepared for this client yet.
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedQuotationId}
                    onChange={(e) => setSelectedQuotationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden"
                  >
                    {(client?.quotations || []).map((q: any) => (
                      <option key={q.id} value={q.id}>
                        {q.quotationNumber} (v{q.version}) — ₹{(q.totalAmount || 0).toLocaleString('en-IN')} [{q.status}]
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQuotationAction('REMINDER')}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                        quotationAction === 'REMINDER'
                          ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Expedite / Nudge Reminder
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotationAction('DISCUSSION')}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                        quotationAction === 'DISCUSSION'
                          ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Record Client Discussion
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Project Selector (for Project Message or Final Payment) */}
          {(context === 'PROJECT' || context === 'FINAL_PAYMENT') && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Active Project <span className="text-red-500">*</span>
              </label>
              {availableProjects.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  No active technical projects found for this client.
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden"
                >
                  {availableProjects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} (Order: {p.workOrderNumber}) — {p.status?.replace(/_/g, ' ')} ({p.progressPercentage || 0}%)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Contact Method Selector (for General, Quotation Discussion, and Final Payment) */}
          {(context === 'GENERAL' || (context === 'QUOTATION' && quotationAction === 'DISCUSSION') || context === 'FINAL_PAYMENT') && (
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
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setContactMethod(item.id as any)}
                      className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        contactMethod === item.id
                          ? 'border-[#3066BE] bg-[#3066BE]/10 text-[#3066BE] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DYNAMIC FORM FIELDS */}

          {/* 1. GENERAL ACTIVITY */}
          {context === 'GENERAL' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Discussion Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={discussionSummary}
                  onChange={(e) => setDiscussionSummary(e.target.value)}
                  placeholder="Summary of topics discussed with the client..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Follow-up Notes</label>
                <textarea
                  rows={2}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Next steps, commitments, or reminders..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Outcome</label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="INTERESTED">Interested / Exploring</option>
                    <option value="NEEDS_PROPOSAL">Requested Proposal</option>
                    <option value="FOLLOW_UP_SCHEDULED">Follow-up Scheduled</option>
                    <option value="CALL_BACK_LATER">Call Back Later</option>
                    <option value="NOT_INTERESTED">Not Interested</option>
                    <option value="CLOSED">Closed / Converted</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Next Follow-up Date</label>
                  <DatePicker
                    min={new Date().toISOString().split('T')[0]}
                    value={nextFollowUpDate}
                    onChange={(val) => setNextFollowUpDate(val)}
                    placeholder="Select next follow-up"
                  />
                </div>
              </div>
            </>
          )}

          {/* 2. ENQUIRY CONSULTATION */}
          {context === 'ENQUIRY' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Consultation Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  placeholder="Details of client discussion following admin feedback or initial discovery..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client Decision</label>
                  <select
                    value={clientOutcome}
                    onChange={(e) => setClientOutcome(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="PROCEED">Proceed to Quotation</option>
                    <option value="RESCHEDULED">Follow-up Rescheduled</option>
                    <option value="DROPPED">Client Dropped / Unviable</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Revised Budget (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={revisedBudget}
                    onChange={(e) => setRevisedBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Next Follow-up Date</label>
                  <DatePicker
                    min={new Date().toISOString().split('T')[0]}
                    value={nextFollowUpDate}
                    onChange={(val) => setNextFollowUpDate(val)}
                    placeholder="Select next follow-up"
                  />
                </div>
              </div>
            </>
          )}

          {/* 3. QUOTATION FOLLOW-UP */}
          {context === 'QUOTATION' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {quotationAction === 'REMINDER' ? 'Expedite Notes / Priority' : 'Discussion Summary'}
                </label>
                <textarea
                  rows={2}
                  value={quotationNotes}
                  onChange={(e) => setQuotationNotes(e.target.value)}
                  placeholder={
                    quotationAction === 'REMINDER'
                      ? 'e.g. Client needs quote by 2 PM for board meeting...'
                      : 'Commercial terms discussed, client feedback on price or deliverables...'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden text-xs"
                />
              </div>

              {quotationAction === 'DISCUSSION' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Follow-up Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Will confirm after consulting partner..."
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">Next Follow-up Date</label>
                    <DatePicker
                      min={new Date().toISOString().split('T')[0]}
                      value={nextFollowUpDate}
                      onChange={(val) => setNextFollowUpDate(val)}
                      placeholder="Select next follow-up"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* 4. PROJECT COMMUNICATION */}
          {context === 'PROJECT' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Message / Communication <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={projectMessage}
                  onChange={(e) => setProjectMessage(e.target.value)}
                  placeholder="Share feedback, engineering questions, or client requirements with Technical Team..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Visibility</label>
                  <select
                    value={projectVisibility}
                    onChange={(e) => setProjectVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="CLIENT_VISIBLE">Client & Team Visible</option>
                    <option value="INTERNAL">Internal Team Note Only</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Message Type</label>
                  <select
                    value={projectMessageType}
                    onChange={(e) => setProjectMessageType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="BGA_REPRESENTATIVE">BGA Message / Reply</option>
                    <option value="CLIENT_FEEDBACK">Client Feedback</option>
                    <option value="CHANGE_REQUEST">Change / Scope Request</option>
                    <option value="INTERNAL_NOTE">Internal Discussion</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deliverable Review</label>
                  <select
                    value={clientDecision}
                    onChange={(e) => setClientDecision(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="NONE">No Status Change</option>
                    <option value="APPROVED">Deliverable Approved (95%)</option>
                    <option value="CHANGES_REQUESTED">Correction Required</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* 5. FINAL PAYMENT FOLLOW-UP */}
          {context === 'FINAL_PAYMENT' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Follow-up Notes / Discussion <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Notes from payment discussion with the client..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Client Response / Commitment</label>
                <input
                  type="text"
                  value={clientResponse}
                  onChange={(e) => setClientResponse(e.target.value)}
                  placeholder="e.g. Promised payment via RTGS by tomorrow morning..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                  >
                    <option value="CLIENT_CONTACTED">Client Contacted</option>
                    <option value="PAYMENT_PROMISED">Payment Promised</option>
                    <option value="PAYMENT_DELAYED">Payment Delayed</option>
                    <option value="DISPUTED">Disputed / Query</option>
                    <option value="FOLLOW_UP_REQUIRED">Follow-up Required</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 25000"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Promised Date</label>
                  <DatePicker
                    min={new Date().toISOString().split('T')[0]}
                    value={expectedPaymentDate}
                    onChange={(val) => setExpectedPaymentDate(val)}
                    placeholder="Select promised date"
                  />
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#3066BE] hover:bg-[#204b8c] text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Saving Activity...' : 'Log Activity / Follow-up'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
