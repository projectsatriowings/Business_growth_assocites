import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  FileCheck,
  CreditCard,
  Briefcase,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Send,
  Eye,
  Plus,
  RefreshCw,
  X,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { apiRequest } from '../../utils/api';
import { SkeletonStatsRow, SkeletonTable, AccountsDashboardSkeleton } from '../../components/Skeleton';
import { validateBankUtr, getUtrPlaceholderAndHint, UtrValidationResult } from '../../utils/utrValidator';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

export const AccountsPortal: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quotation-requests' | 'work-orders' | 'payments' | 'commissions'>('dashboard');

  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [quotationRequests, setQuotationRequests] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);

  // Prepare Quotation Modal
  const [prepModal, setPrepModal] = useState<{ quotation: any } | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    serviceScope: '',
    serviceFee: '',
    adBudget: '0',
    discount: '0',
    taxRate: '18',
    advanceRequiredPercent: '50',
    paymentTerms: '50% advance to initiate technical architecture. Balance in milestones.',
    validityDays: '15',
  });

  // Record Payment Modal
  const [paymentModal, setPaymentModal] = useState<{ workOrder: any } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'ADVANCE',
    amount: '',
    adBudgetAmount: '0',
    paymentMethod: 'UPI',
    transactionReference: '',
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  // Verify / Audit Payment Modal (replaces browser prompt)
  const [verifyModal, setVerifyModal] = useState<{
    paymentId: string;
    action: 'VERIFY' | 'REJECT';
    clientName?: string;
    workOrderNumber?: string;
    amount?: number;
    transactionReference?: string;
  } | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('Bank statement checked & verified');

  const loadStats = async (bypass = false) => {
    try {
      const s = await apiRequest('/api/accounts/dashboard-stats', { bypassCache: bypass });
      setStats(s);
    } catch (e) {
      console.error('Failed to load accounts stats:', e);
    }
  };

  const loadTabData = async (tab = activeTab) => {
    setTabLoading(true);
    try {
      if (tab === 'quotation-requests') {
        const q = await apiRequest('/api/accounts/quotation-requests');
        setQuotationRequests(q.requests || []);
      } else if (tab === 'work-orders') {
        const w = await apiRequest('/api/accounts/work-orders');
        setWorkOrders(w.workOrders || []);
      } else if (tab === 'payments') {
        const [p, w] = await Promise.all([
          apiRequest('/api/accounts/payments'),
          apiRequest('/api/accounts/work-orders'),
        ]);
        setPayments(p.payments || []);
        setWorkOrders(w.workOrders || []);
      } else if (tab === 'commissions') {
        const comm = await apiRequest('/api/accounts/commissions');
        setCommissions(comm.commissions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTabLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadTabData()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  // Open Prepare Quotation Modal
  const openPrepModal = (q: any) => {
    setPrepModal({ quotation: q });
    setQuoteForm({
      serviceScope: q.serviceScope || q.enquiry?.requirements || '',
      serviceFee: String(q.serviceFee || q.enquiry?.expectedBudget || 50000),
      adBudget: String(q.adBudget || 0),
      discount: String(q.discount || 0),
      taxRate: String(q.taxRate || 18),
      advanceRequiredPercent: String(q.advanceRequiredPercent || 50),
      paymentTerms: q.paymentTerms || '50% advance to initiate technical architecture. Balance in milestones.',
      validityDays: '15',
    });
  };

  // Submit Official Quotation
  const handlePrepareQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepModal) return;
    setModalSubmitting(true);

    try {
      await apiRequest(`/api/accounts/quotations/${prepModal.quotation.id}/prepare`, {
        method: 'POST',
        body: JSON.stringify(quoteForm),
      });

      toast.success('Official quotation prepared and dispatched to the BGA successfully.');
      setPrepModal(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to prepare quotation');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Dynamic UTR helper and live validation
  const utrConfig = useMemo(() => {
    return getUtrPlaceholderAndHint(paymentForm.paymentMethod);
  }, [paymentForm.paymentMethod]);

  const utrCheck = useMemo((): UtrValidationResult => {
    return validateBankUtr(paymentForm.transactionReference, paymentForm.paymentMethod);
  }, [paymentForm.transactionReference, paymentForm.paymentMethod]);

  // Handle Record Client Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;

    const validation = validateBankUtr(paymentForm.transactionReference, paymentForm.paymentMethod);
    if (!validation.isValid) {
      toast.warning(`Invalid Bank Transaction / UTR: ${validation.error}${validation.hint ? ' (' + validation.hint + ')' : ''}`);
      return;
    }

    setModalSubmitting(true);
    try {
      await apiRequest(`/api/accounts/work-orders/${paymentModal.workOrder.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          ...paymentForm,
          transactionReference: validation.formattedUtr,
        }),
      });

      toast.success(`Payment recorded with UTR: ${validation.formattedUtr}. Awaiting Accounts verification.`);
      setPaymentModal(null);
      setPaymentForm({
        paymentType: 'ADVANCE',
        amount: '',
        adBudgetAmount: '0',
        paymentMethod: 'UPI',
        transactionReference: '',
        paymentDate: new Date().toISOString().slice(0, 10),
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open Verify Payment Modal (Clean custom UI instead of prompt)
  const openVerifyModal = (payment: any, action: 'VERIFY' | 'REJECT') => {
    setVerifyModal({
      paymentId: payment.id,
      action,
      clientName: payment.workOrder?.client?.clientName,
      workOrderNumber: payment.workOrder?.workOrderNumber,
      amount: payment.amount,
      transactionReference: payment.transactionReference,
    });
    setVerifyNotes(action === 'VERIFY' ? 'Bank statement checked & verified' : 'Payment discrepancy detected in bank records');
  };

  // Execute Verify / Reject Payment
  const confirmVerifyPayment = async () => {
    if (!verifyModal) return;
    setModalSubmitting(true);
    try {
      const res = await apiRequest(`/api/accounts/payments/${verifyModal.paymentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          action: verifyModal.action,
          verificationNotes: verifyNotes.trim() || 'Bank statement checked & verified',
        }),
      });
      toast.success(res.message || `Payment ${verifyModal.action === 'VERIFY' ? 'verified' : 'rejected'} successfully.`);
      setVerifyModal(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment status');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <PortalHeader title="Accounts Portal" subtitle="Quotation Drafting, Commercial Verification & Commission Processing" />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
              Financial Modules
            </div>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#80DED9]" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('quotation-requests')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'quotation-requests' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-4 h-4 text-[#80DED9]" />
                <span>Quotation Requests</span>
              </div>
              {stats?.quotationRequests > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {stats.quotationRequests}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('work-orders')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'work-orders' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#80DED9]" />
              <span>Accepted Work Orders</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'payments' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-[#80DED9]" />
                <span>Payment Verification</span>
              </div>
              {stats?.pendingPaymentVerifications > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {stats.pendingPaymentVerifications}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('commissions')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'commissions' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <DollarSign className="w-4 h-4 text-[#80DED9]" />
              <span>Commission Engine</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Accounts Clearance: <span className="text-[#80DED9] font-bold">AUTHORIZED</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="w-full flex-1 min-w-0 p-6 md:p-8 overflow-y-auto">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            !stats ? (
              <AccountsDashboardSkeleton />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Pending Quotation Requests</span>
                  <div className="text-2xl font-bold text-amber-600 mt-1">{stats.quotationRequests}</div>
                  <span className="text-xs text-slate-400">Awaiting official drafting / revision</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Pending Payment Verifications</span>
                  <div className="text-2xl font-bold text-red-600 mt-1">{stats.pendingPaymentVerifications}</div>
                  <span className="text-xs text-slate-400">Bank receipt verification required</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Active Work Orders</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.activeWorkOrders}</div>
                  <span className="text-xs text-indigo-600">Accepted by clients</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Total Verified Collections</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">₹{stats.totalCollected.toLocaleString()}</div>
                  <span className="text-xs text-slate-400">Verified received funds</span>
                </div>
              </div>

              {/* Accounts Operational Notice */}
              <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <h3 className="font-bold text-sm mb-1">Accounts Verification Protocol</h3>
                <p className="leading-relaxed">
                  1. Official quotations must specify GST rate (standard 18%) and mandatory advance requirement (typically 50%). <br />
                  2. <strong>Crucial Rule:</strong> The Technical Department cannot begin project execution until Accounts
                  verifies bank receipt of the advance payment. BGA declaration or screenshots are not sufficient.
                </p>
              </div>
            </div>
            )
          )}

          {/* TAB 2: QUOTATION REQUESTS */}
          {/* TAB 2: APPROVED ENQUIRIES & QUOTATION PREPARATION */}
          {activeTab === 'quotation-requests' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[#3066BE]" />
                    Approved Client Enquiries & Quotation Preparation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Accounts prepares official quotations exclusively for Admin-approved enquiries. Drafts are submitted to Admin for executive sign-off.
                  </p>
                </div>
                <button
                  onClick={loadData}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Enquiries
                </button>
              </div>

              <div className="space-y-3">
                {quotationRequests.map((q) => (
                  <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-slate-900">{q.quotationNumber}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            v{q.version}
                          </span>
                          {q.reminderCount > 0 && (
                            <span className="text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded font-bold border border-red-200 animate-pulse">
                              ⚠️ {q.reminderCount} BGA Reminder{q.reminderCount > 1 ? 's' : ''} Received
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs text-slate-600 mt-0.5">
                          Client: <strong>{q.client?.clientName}</strong> ({q.client?.businessName}) • BGA: <strong>{q.bga?.name}</strong>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            q.status === 'REQUESTED'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : q.status === 'REVISION_REQUESTED'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : q.status === 'PENDING_ADMIN_APPROVAL'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : q.status === 'ADMIN_APPROVED' || q.status === 'SENT_TO_BGA'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {q.status === 'PENDING_ADMIN_APPROVAL' ? 'PENDING ADMIN APPROVAL' : q.status}
                        </span>
                        <a
                          href={`/api/resources/quotations/${q.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </div>
                    </div>

                    <div className="py-2 text-xs text-slate-700 space-y-1">
                      <div>
                        <strong>Service Category:</strong> {q.serviceCategory}
                      </div>
                      <div>
                        <strong>Service Scope:</strong> {q.serviceScope}
                      </div>
                      {q.revisionNotes && (
                        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 mt-2">
                          <strong>Client Revision Feedback:</strong> {q.revisionNotes}
                        </div>
                      )}
                      {q.adminNotes && (
                        <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 text-purple-900 mt-2">
                          <strong>Admin Guidance:</strong> {q.adminNotes}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs flex-wrap gap-2">
                      <span className="font-bold text-slate-800">
                        Total Value: ₹{(q.totalAmount || 0).toLocaleString()} (Advance: ₹{(q.advanceRequiredAmount || 0).toLocaleString()})
                      </span>

                      {(q.status === 'REQUESTED' || q.status === 'REVISION_REQUESTED') ? (
                        <button
                          onClick={() => openPrepModal(q)}
                          className="px-4 py-1.5 bg-[#3066BE] hover:bg-[#255299] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />{' '}
                          {q.status === 'REVISION_REQUESTED' ? 'Draft Revised Quotation' : 'Prepare Official Quotation'}
                        </button>
                      ) : q.status === 'PENDING_ADMIN_APPROVAL' ? (
                        <span className="text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                          Awaiting Admin Authorization
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">
                          Released to BGA & Client
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Prepare Quotation Modal */}
              <AnimatePresence>
                {prepModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    onClick={() => !modalSubmitting && setPrepModal(null)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 shrink-0" />
                      
                      <div className="p-6 border-b border-slate-100 flex items-start justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                            <FileText className="w-5 h-5 text-[#3066BE]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">Official Quotation Builder</h3>
                              <span className="font-mono text-xs font-bold text-[#3066BE] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {prepModal.quotation.quotationNumber}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Client: <strong className="text-slate-800">{prepModal.quotation.client?.clientName}</strong> • Category: <strong className="text-slate-800">{prepModal.quotation.serviceCategory}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => !modalSubmitting && setPrepModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 overflow-y-auto space-y-4">
                        {/* Company Policy Notice */}
                        <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Workflow Policy Notice:</strong> Submitted official quotations are routed to Admin review. Official quotes are automatically released to the BGA immediately upon Admin approval.
                          </div>
                        </div>

                        <form onSubmit={handlePrepareQuotation} className="space-y-3.5 text-xs">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Approved Service Scope Description <span className="text-rose-500">*</span></label>
                            <textarea
                              rows={3}
                              required
                              value={quoteForm.serviceScope}
                              onChange={(e) => setQuoteForm({ ...quoteForm, serviceScope: e.target.value })}
                              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
                              placeholder="Detail scope of deliverables..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-700 font-semibold mb-1">Service Fee (₹) <span className="text-rose-500">*</span></label>
                              <input
                                type="number"
                                required
                                value={quoteForm.serviceFee}
                                onChange={(e) => setQuoteForm({ ...quoteForm, serviceFee: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 font-semibold mb-1">
                                Ad Budget (₹) {prepModal.quotation.serviceCategory === 'DIGITAL_MARKETING' ? '(Excluded from comm.)' : ''}
                              </label>
                              <input
                                type="number"
                                value={quoteForm.adBudget}
                                onChange={(e) => setQuoteForm({ ...quoteForm, adBudget: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-slate-700 font-semibold mb-1">Discount (₹)</label>
                              <input
                                type="number"
                                value={quoteForm.discount}
                                onChange={(e) => setQuoteForm({ ...quoteForm, discount: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 font-semibold mb-1">GST Rate (%)</label>
                              <input
                                type="number"
                                value={quoteForm.taxRate}
                                onChange={(e) => setQuoteForm({ ...quoteForm, taxRate: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 font-semibold mb-1">Advance Required (%)</label>
                              <input
                                type="number"
                                value={quoteForm.advanceRequiredPercent}
                                onChange={(e) => setQuoteForm({ ...quoteForm, advanceRequiredPercent: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Commercial Payment Terms</label>
                            <textarea
                              rows={2}
                              value={quoteForm.paymentTerms}
                              onChange={(e) => setQuoteForm({ ...quoteForm, paymentTerms: e.target.value })}
                              className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                            />
                          </div>

                          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                            <button
                              type="button"
                              disabled={modalSubmitting}
                              onClick={() => setPrepModal(null)}
                              className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={modalSubmitting}
                              className="px-5 py-2 bg-gradient-to-r from-[#3066BE] to-[#255299] hover:from-[#255299] hover:to-[#1b3d73] text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                            >
                              {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {modalSubmitting ? 'Submitting...' : 'Submit for Admin Approval →'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 3: WORK ORDERS */}
          {activeTab === 'work-orders' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Accepted Client Work Orders</h2>
                <p className="text-xs text-slate-500">
                  Record advance or milestone payments against accepted work orders.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Work Order</th>
                      <th className="p-3.5">Client & BGA</th>
                      <th className="p-3.5">Total Value</th>
                      <th className="p-3.5">Advance Req.</th>
                      <th className="p-3.5">Advance Verified</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workOrders.map((w) => (
                      <tr key={w.id}>
                        <td className="p-3.5 font-bold font-mono text-slate-900">{w.workOrderNumber}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{w.client?.clientName}</div>
                          <div className="text-[10px] text-slate-400">BGA: {w.bga?.name}</div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">₹{w.totalValue?.toLocaleString()}</td>
                        <td className="p-3.5 font-semibold text-slate-700">₹{w.advanceRequired?.toLocaleString()}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.advanceVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {w.advanceVerified ? 'VERIFIED ✓' : 'PENDING'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setPaymentModal({ workOrder: w });
                              setPaymentForm({
                                paymentType: w.advanceVerified ? 'FINAL' : 'ADVANCE',
                                amount: String(w.advanceRequired),
                                adBudgetAmount: '0',
                                paymentMethod: 'BANK_TRANSFER',
                                transactionReference: '',
                                paymentDate: new Date().toISOString().slice(0, 10),
                              });
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                          >
                            + Record Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Record Payment Modal */}
              <AnimatePresence>
                {paymentModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    onClick={() => !modalSubmitting && setPaymentModal(null)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 shrink-0" />
                      
                      <div className="p-6 border-b border-slate-100 flex items-start justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                            <CreditCard className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">Record Client Payment</h3>
                              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                {paymentModal.workOrder.workOrderNumber}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Client: <strong className="text-slate-800">{paymentModal.workOrder.client?.clientName}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => !modalSubmitting && setPaymentModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 overflow-y-auto space-y-4">
                        <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Payment Type</label>
                            <select
                              value={paymentForm.paymentType}
                              onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                              className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                            >
                              <option value="ADVANCE">Advance Payment</option>
                              <option value="INTERIM">Interim Milestone</option>
                              <option value="FINAL">Final Settlement</option>
                              <option value="MONTHLY_RECURRING">Monthly Subscription (DM)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Gross Payment Amount Received (₹) <span className="text-rose-500">*</span></label>
                            <input
                              type="number"
                              required
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                              placeholder="e.g. 50000"
                              className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                            />
                          </div>

                          {paymentForm.paymentType === 'MONTHLY_RECURRING' && (
                            <div>
                              <label className="block text-slate-700 font-semibold mb-1">
                                Media Advertisement Spend Amount (₹) - Excluded from commission
                              </label>
                              <input
                                type="number"
                                value={paymentForm.adBudgetAmount}
                                onChange={(e) => setPaymentForm({ ...paymentForm, adBudgetAmount: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Payment Method <span className="text-rose-500">*</span></label>
                            <select
                              value={paymentForm.paymentMethod}
                              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                              className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                            >
                              <option value="UPI">UPI / QR Code</option>
                              <option value="NEFT">NEFT Bank Transfer</option>
                              <option value="RTGS">RTGS Bank Transfer</option>
                              <option value="IMPS">IMPS Immediate Transfer</option>
                              <option value="CHEQUE">Cheque Clearance</option>
                            </select>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-slate-700 font-semibold text-xs">
                                Bank Transaction / UTR Reference <span className="text-rose-500">*</span>
                              </label>
                              <span className={`text-[11px] font-mono ${
                                paymentForm.transactionReference.length === 0
                                  ? 'text-slate-400'
                                  : utrCheck.isValid
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-amber-600 font-semibold'
                              }`}>
                                {paymentForm.transactionReference.length} chars • Req: {utrConfig.expectedLength}
                              </span>
                            </div>

                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={paymentForm.transactionReference}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
                                  setPaymentForm({ ...paymentForm, transactionReference: val });
                                }}
                                placeholder={utrConfig.placeholder}
                                className={`w-full p-2.5 pr-9 border rounded-xl font-mono text-sm uppercase tracking-wide transition-all ${
                                  !paymentForm.transactionReference
                                    ? 'border-slate-300 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500'
                                    : utrCheck.isValid
                                    ? 'border-emerald-500 bg-emerald-50/20 text-emerald-900 focus:ring-2 focus:ring-emerald-500'
                                    : 'border-red-400 bg-red-50/20 text-red-900 focus:ring-2 focus:ring-red-500'
                                }`}
                              />
                              <div className="absolute right-3 top-3">
                                {paymentForm.transactionReference && (
                                  utrCheck.isValid ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                  )
                                )}
                              </div>
                            </div>

                            {/* Helper and Error feedback banner */}
                            {paymentForm.transactionReference && !utrCheck.isValid ? (
                              <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 space-y-0.5">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                                  <span>{utrCheck.error}</span>
                                </div>
                                {utrCheck.hint && (
                                  <p className="text-slate-600 pl-5">{utrCheck.hint}</p>
                                )}
                              </div>
                            ) : paymentForm.transactionReference && utrCheck.isValid ? (
                              <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="font-semibold">{utrCheck.hint || `Valid ${paymentForm.paymentMethod} transaction reference.`}</span>
                              </div>
                            ) : (
                              <p className="mt-1 text-[11px] text-slate-500">
                                {utrConfig.helper}
                              </p>
                            )}
                          </div>

                          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                            <button
                              type="button"
                              disabled={modalSubmitting}
                              onClick={() => setPaymentModal(null)}
                              className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!paymentForm.transactionReference || !utrCheck.isValid || modalSubmitting}
                              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                              {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>{modalSubmitting ? 'Saving...' : 'Save Payment Record'}</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 4: PAYMENT VERIFICATION */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Payment Verification Ledger</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify actual receipt of bank funds. Advance payment verification immediately forwards the record to Management for Technical Handover authorization; final payments trigger commission calculations.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Client & Work Order</th>
                      <th className="p-3.5">Type & Method</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Transaction Ref</th>
                      <th className="p-3.5">Verification Status</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{p.workOrder?.client?.clientName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.workOrder?.workOrderNumber}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-800">{p.paymentType}</span>
                          <div className="text-[10px] text-slate-400">{p.paymentMethod}</div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 text-sm">
                          ₹{p.amount?.toLocaleString()}
                          {p.adBudgetAmount > 0 && (
                            <div className="text-[10px] text-slate-400">
                              Ad Spend: ₹{p.adBudgetAmount?.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">{p.transactionReference}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'PENDING_VERIFICATION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {p.status === 'PENDING_VERIFICATION' ? (
                            <button
                              onClick={() => openVerifyModal(p, 'VERIFY')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-sm"
                            >
                              Verify Bank Credit ✓
                            </button>
                          ) : (
                            <span className="text-emerald-600 text-xs font-semibold">Verified ✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Verification Modal */}
              <AnimatePresence>
                {verifyModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    onClick={() => !modalSubmitting && setVerifyModal(null)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={`h-1.5 w-full ${verifyModal.action === 'VERIFY' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-red-600'}`} />
                      
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              verifyModal.action === 'VERIFY' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}>
                              {verifyModal.action === 'VERIFY' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">
                                {verifyModal.action === 'VERIFY' ? 'Verify Bank Credit' : 'Reject Payment Record'}
                              </h3>
                              <p className="text-xs text-slate-500 font-mono">
                                UTR: {verifyModal.transactionReference}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => !modalSubmitting && setVerifyModal(null)}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Client:</span>
                            <span className="font-semibold text-slate-800">{verifyModal.clientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Amount Received:</span>
                            <span className="font-bold text-emerald-700">₹{verifyModal.amount?.toLocaleString()}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Bank Statement Audit / Verification Notes <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            value={verifyNotes}
                            onChange={(e) => setVerifyNotes(e.target.value)}
                            placeholder="Enter bank statement audit notes..."
                            className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none transition-all"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={modalSubmitting}
                            onClick={() => setVerifyModal(null)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={modalSubmitting}
                            onClick={confirmVerifyPayment}
                            className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 ${
                              verifyModal.action === 'VERIFY'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700'
                            }`}
                          >
                            {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {modalSubmitting ? 'Processing...' : `Confirm ${verifyModal.action === 'VERIFY' ? 'Verification' : 'Rejection'}`}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 5: COMMISSION ENGINE */}
          {activeTab === 'commissions' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Commission Engine Computations</h2>
                <p className="text-xs text-slate-500">
                  Audited calculations based on verified receipts. DM commissions exclude advertisement budgets.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">BGA Associate</th>
                      <th className="p-3.5">Client & Service</th>
                      <th className="p-3.5">Commission Amount</th>
                      <th className="p-3.5">Eligibility Condition</th>
                      <th className="p-3.5">Admin Approval</th>
                      <th className="p-3.5">Payout Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissions.map((c) => (
                      <tr key={c.id}>
                        <td className="p-3.5 font-bold text-slate-900">{c.bga?.name}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{c.client?.clientName}</div>
                          <div className="text-[10px] text-indigo-600">{c.serviceCategory}</div>
                        </td>
                        <td className="p-3.5 font-bold text-emerald-700 text-sm">
                          ₹{c.calculatedCommission?.toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.eligibilityStatus === 'ELIGIBLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.eligibilityStatus}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.approvalStatus}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.payoutStatus === 'PROCESSED' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.payoutStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

