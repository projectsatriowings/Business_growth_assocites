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
  AlertTriangle,
  Clock,
  Bell,
  Download,
  Send,
  Eye,
  Plus,
  RefreshCw,
  X,
  ShieldCheck,
  FileText,
  Loader2,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Copy,
  Check,
  Layers,
  ChevronRight,
  Building2,
  User,
  Info,
  Calendar,
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { SkeletonStatsRow, SkeletonTable, AccountsDashboardSkeleton } from '../../components/Skeleton';
import { validateBankUtr, getUtrPlaceholderAndHint, UtrValidationResult } from '../../utils/utrValidator';
import { useToast } from '../../context/ToastContext';
import { getQuotationPdfUrl, downloadQuotationPdf } from '../../utils/downloadPdf';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ModalPortal';

export const AccountsPortal: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'quotation-requests' | 'payments-work-orders' | 'commissions'
  >('dashboard');
  const [subTab, setSubTab] = useState<'payments' | 'work-orders'>('payments');

  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [quotationRequests, setQuotationRequests] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Search & Filter States for Consolidated Module
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('ALL');

  const [workOrderSearch, setWorkOrderSearch] = useState('');
  const [workOrderStatusFilter, setWorkOrderStatusFilter] = useState('ALL');
  const [workOrderEligibilityFilter, setWorkOrderEligibilityFilter] = useState('ALL');
  const [workOrderServiceFilter, setWorkOrderServiceFilter] = useState('ALL');

  // Detail Modals & Action Modals
  const [paymentDetailModal, setPaymentDetailModal] = useState<any | null>(null);
  const [workOrderDetailModal, setWorkOrderDetailModal] = useState<any | null>(null);
  const [releaseModal, setReleaseModal] = useState<{ workOrder: any } | null>(null);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [holdModal, setHoldModal] = useState<{ workOrder: any; action: 'HOLD' | 'REQUEST_CLARIFICATION' } | null>(null);
  const [holdNotes, setHoldNotes] = useState('');
  const [requestInfoModal, setRequestInfoModal] = useState<{ payment: any } | null>(null);
  const [requestInfoNotes, setRequestInfoNotes] = useState('');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

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

  // URL deep-linking and safe backward-compatible redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'payments' || tabParam === 'payment-verification') {
      setActiveTab('payments-work-orders');
      setSubTab('payments');
    } else if (tabParam === 'work-orders' || tabParam === 'accepted-work-orders') {
      setActiveTab('payments-work-orders');
      setSubTab('work-orders');
    } else if (tabParam === 'payments-work-orders') {
      setActiveTab('payments-work-orders');
      const sub = params.get('sub');
      if (sub === 'work-orders') setSubTab('work-orders');
      else setSubTab('payments');
    }
  }, []);

  const loadTabData = async (tab = activeTab) => {
    setTabLoading(true);
    try {
      if (tab === 'quotation-requests') {
        const q = await apiRequest('/api/accounts/quotation-requests');
        setQuotationRequests(q.requests || []);
      } else if (
        tab === 'payments-work-orders' ||
        (tab as string) === 'work-orders' ||
        (tab as string) === 'payments'
      ) {
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

  // Summary counts for Consolidated Payment & Work Orders module
  const summaryCounts = useMemo(() => {
    const pendingPaymentsCount = payments.filter((p) => p.status === 'PENDING_VERIFICATION').length;
    const verifiedPaymentsCount = payments.filter((p) => p.status === 'VERIFIED').length;
    const verifiedPaymentsAmount = payments
      .filter((p) => p.status === 'VERIFIED')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingWorkOrdersCount = workOrders.filter((w) => !w.handoverApproved).length;
    const eligibleForReleaseCount = workOrders.filter((w) => w.advanceVerified && !w.handoverApproved).length;
    const releasedWorkOrdersCount = workOrders.filter((w) => w.handoverApproved).length;

    return {
      pendingPaymentsCount,
      verifiedPaymentsCount,
      verifiedPaymentsAmount,
      pendingWorkOrdersCount,
      eligibleForReleaseCount,
      releasedWorkOrdersCount,
    };
  }, [payments, workOrders]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        !paymentSearch ||
        p.workOrder?.client?.clientName?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.workOrder?.client?.businessName?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.workOrder?.workOrderNumber?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.workOrder?.bga?.name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.transactionReference?.toLowerCase().includes(paymentSearch.toLowerCase());

      const matchStatus = paymentStatusFilter === 'ALL' || p.status === paymentStatusFilter;
      const matchType = paymentTypeFilter === 'ALL' || p.paymentType === paymentTypeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [payments, paymentSearch, paymentStatusFilter, paymentTypeFilter]);

  // Filtered Work Orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((w) => {
      const matchSearch =
        !workOrderSearch ||
        w.workOrderNumber?.toLowerCase().includes(workOrderSearch.toLowerCase()) ||
        w.client?.clientName?.toLowerCase().includes(workOrderSearch.toLowerCase()) ||
        w.client?.businessName?.toLowerCase().includes(workOrderSearch.toLowerCase()) ||
        w.bga?.name?.toLowerCase().includes(workOrderSearch.toLowerCase()) ||
        w.serviceCategory?.toLowerCase().includes(workOrderSearch.toLowerCase());

      const matchStatus = workOrderStatusFilter === 'ALL' || w.status === workOrderStatusFilter;
      const matchService = workOrderServiceFilter === 'ALL' || w.serviceCategory === workOrderServiceFilter;

      let matchEligibility = true;
      if (workOrderEligibilityFilter === 'ELIGIBLE_FOR_RELEASE') {
        matchEligibility = w.advanceVerified && !w.handoverApproved;
      } else if (workOrderEligibilityFilter === 'RELEASED') {
        matchEligibility = Boolean(w.handoverApproved);
      } else if (workOrderEligibilityFilter === 'AWAITING_ADVANCE') {
        matchEligibility = !w.advanceVerified;
      } else if (workOrderEligibilityFilter === 'ON_HOLD') {
        matchEligibility = w.handoverStatus === 'ON_HOLD' || w.handoverStatus === 'CLARIFICATION_REQUESTED';
      }

      return matchSearch && matchStatus && matchService && matchEligibility;
    });
  }, [workOrders, workOrderSearch, workOrderStatusFilter, workOrderServiceFilter, workOrderEligibilityFilter]);

  // Copy UTR to clipboard
  const copyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    toast.success(`Copied UTR "${utr}" to clipboard`);
    setTimeout(() => setCopiedUtr(null), 2500);
  };

  // Authorize & Release Work Order to Technical
  const confirmReleaseWorkOrder = async () => {
    if (!releaseModal) return;
    setModalSubmitting(true);
    try {
      const res = await apiRequest(`/api/accounts/work-orders/${releaseModal.workOrder.id}/release`, {
        method: 'POST',
        body: JSON.stringify({ notes: releaseNotes.trim() }),
      });
      toast.success(res.message || 'Work order released to Technical Department successfully!');
      setReleaseModal(null);
      setReleaseNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to release work order');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Hold or Request Clarification for Work Order
  const confirmHoldWorkOrder = async () => {
    if (!holdModal) return;
    setModalSubmitting(true);
    try {
      const res = await apiRequest(`/api/accounts/work-orders/${holdModal.workOrder.id}/hold`, {
        method: 'POST',
        body: JSON.stringify({ reason: holdNotes.trim(), action: holdModal.action }),
      });
      toast.success(res.message || 'Work order status updated');
      setHoldModal(null);
      setHoldNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update work order');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Request Payment Information / UTR Clarification
  const confirmRequestPaymentInfo = async () => {
    if (!requestInfoModal) return;
    setModalSubmitting(true);
    try {
      const res = await apiRequest(`/api/accounts/payments/${requestInfoModal.payment.id}/request-info`, {
        method: 'POST',
        body: JSON.stringify({ notes: requestInfoNotes.trim() }),
      });
      toast.success(res.message || 'Clarification request sent to associate.');
      setRequestInfoModal(null);
      setRequestInfoNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request payment info');
    } finally {
      setModalSubmitting(false);
    }
  };

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

      toast.success(
        prepModal.quotation.status === 'REJECTED' || prepModal.quotation.status === 'REVISION_REQUESTED'
          ? 'Corrected quotation submitted to Admin for approval.'
          : 'Official quotation submitted to Admin for approval.'
      );
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
      <PortalHeader title="Accounts Portal" subtitle="Commercial Quotations, Verification & Commission Processing" />

      <div className="flex-1 flex flex-col md:flex-row relative min-h-0">
        {/* Sidebar Nav (Sticky, fixed in viewport, independent internal scrolling) */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-4 shrink-0 md:sticky md:top-[var(--portal-header-height,68px)] md:h-[calc(100vh-var(--portal-header-height,68px))] flex flex-col justify-between z-30">
          <div className="space-y-1 overflow-y-auto flex-1 pr-1 -mr-1 sidebar-scrollbar">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
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
              onClick={() => {
                setActiveTab('payments-work-orders');
                const params = new URLSearchParams(window.location.search);
                params.set('tab', 'payments-work-orders');
                window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'payments-work-orders' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#80DED9]" />
                <span>Payment & Work Orders</span>
              </div>
              {(summaryCounts.pendingPaymentsCount > 0 || summaryCounts.eligibleForReleaseCount > 0) && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {summaryCounts.pendingPaymentsCount + summaryCounts.eligibleForReleaseCount}
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

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 shrink-0">
            <div className="flex justify-between items-center px-1">
              <span>Accounts Clearance:</span>
              <span className="text-[#80DED9] font-bold">AUTHORIZED</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="w-full flex-1 min-w-0 p-6 md:p-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            !stats ? (
              <AccountsDashboardSkeleton />
            ) : (
              <div className="space-y-6">
                {/* 1. WELCOME GREETING BANNER */}
                <div className="bg-gradient-to-r from-slate-900 via-[#1E293B] to-[#0F172A] p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#3066BE]/25 to-transparent pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                        Welcome back, {user?.name || 'Accounts Officer'}
                      </h1>
                      <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                        Reconcile bank receipts, audit client payment UTRs, prepare official quotations, and release verified work orders.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <button
                        onClick={() => loadStats(true)}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all backdrop-blur-xs border border-white/10"
                        title="Refresh live ledger stats"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Sync Ledger
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('quotation-requests');
                        }}
                        className="px-3.5 py-2 bg-[#3066BE] hover:bg-[#2554a0] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#3066BE]/30 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Prepare Quotation
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. URGENT ACTION ALERTS (TRIGGERED IF PENDING WORK) */}
                {stats.pendingPaymentVerifications > 0 && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-amber-950 flex items-center gap-2 flex-wrap">
                          <span>Action Required: {stats.pendingPaymentVerifications} Payment Receipt{stats.pendingPaymentVerifications > 1 ? 's' : ''} Awaiting Bank Verification</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold font-mono">
                            ₹{stats.pendingVerificationAmount?.toLocaleString('en-IN') || 0}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Technical project execution is locked until advance payment UTR is verified against corporate bank statements.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('payments-work-orders');
                        setSubTab('payments');
                        setPaymentStatusFilter('PENDING_VERIFICATION');
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      Audit Receipts <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 3. SIX CORE FINANCIAL KPI CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                  {/* Card 1: Verified Collections */}
                  <div
                    onClick={() => {
                      setActiveTab('payments-work-orders');
                      setSubTab('payments');
                      setPaymentStatusFilter('VERIFIED');
                    }}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Collections</span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      ₹{stats.totalCollected?.toLocaleString('en-IN') || 0}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Bank Settled
                    </div>
                  </div>

                  {/* Card 2: Pending Payment Verifications */}
                  <div
                    onClick={() => {
                      setActiveTab('payments-work-orders');
                      setSubTab('payments');
                      setPaymentStatusFilter('PENDING_VERIFICATION');
                    }}
                    className={`p-4 rounded-2xl bg-white border shadow-sm transition-all cursor-pointer group ${
                      stats.pendingPaymentVerifications > 0
                        ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400 hover:shadow-md'
                        : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">UTR Audits</span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        stats.pendingPaymentVerifications > 0
                          ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white'
                      }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className={`text-xl font-extrabold font-mono ${
                      stats.pendingPaymentVerifications > 0 ? 'text-amber-600' : 'text-slate-900'
                    }`}>
                      {stats.pendingPaymentVerifications}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-1">
                      {stats.pendingPaymentVerifications > 0 ? 'Verification needed' : 'All UTRs cleared'}
                    </div>
                  </div>

                  {/* Card 3: Pending Quotations */}
                  <div
                    onClick={() => setActiveTab('quotation-requests')}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Quote Queue</span>
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <FileCheck className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-blue-600 font-mono">
                      {stats.quotationRequests}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-1">
                      Enquiries to quote
                    </div>
                  </div>

                  {/* Card 4: Active Work Orders */}
                  <div
                    onClick={() => {
                      setActiveTab('payments-work-orders');
                      setSubTab('work-orders');
                    }}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Work Orders</span>
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {stats.activeWorkOrders}
                    </div>
                    <div className="text-[11px] text-indigo-600 truncate mt-1 font-semibold">
                      In execution pipeline
                    </div>
                  </div>

                  {/* Card 5: Commission Liabilities */}
                  <div
                    onClick={() => setActiveTab('commissions')}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Commissions</span>
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <DollarSign className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-purple-700 font-mono">
                      ₹{stats.eligibleCommissionAmount?.toLocaleString('en-IN') || 0}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-1">
                      {stats.eligibleCommissions || 0} payable payouts
                    </div>
                  </div>

                  {/* Card 6: Converted Quotations */}
                  <div
                    onClick={() => setActiveTab('quotation-requests')}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Accepted</span>
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {stats.acceptedQuotations}
                    </div>
                    <div className="text-[11px] text-teal-600 truncate mt-1 font-semibold">
                      Client sign-offs
                    </div>
                  </div>
                </div>

                {/* 4. MAIN OPERATIONAL GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT COLUMN: LIVE FINANCIAL TRANSACTIONS & WORK ORDER PIPELINE (7 Cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Live Payment Receipts & Ledger */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-slate-900">Recent Bank Receipts & Payment Ledger</h2>
                            <p className="text-[11px] text-slate-500">Live feed of client advance and milestone transactions</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('payments-work-orders');
                            setSubTab('payments');
                          }}
                          className="text-xs font-bold text-[#3066BE] hover:text-[#204a8c] flex items-center gap-1 transition-colors"
                        >
                          View All Payments <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {stats.recentPayments && stats.recentPayments.length > 0 ? (
                          stats.recentPayments.map((p: any) => (
                            <div key={p.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900">
                                    {p.workOrder?.client?.clientName || 'Valued Client'}
                                  </span>
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                    {p.workOrder?.workOrderNumber || 'WO-N/A'}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                                    {p.paymentType}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                                  <span className="font-medium text-slate-700">{p.paymentMethod}</span>
                                  <span>•</span>
                                  <span className="font-mono text-[10px] text-slate-600 bg-slate-50 px-1 rounded">
                                    UTR: {p.transactionReference}
                                  </span>
                                  <button
                                    onClick={() => copyUtr(p.transactionReference)}
                                    title="Copy UTR"
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    {copiedUtr === p.transactionReference ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  <span>•</span>
                                  <span>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-center">
                                <div className="text-right">
                                  <div className="font-mono font-bold text-sm text-slate-900">
                                    ₹{p.amount?.toLocaleString('en-IN')}
                                  </div>
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                    p.status === 'VERIFIED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : p.status === 'REJECTED'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800 animate-pulse'
                                  }`}>
                                    {p.status === 'VERIFIED' ? 'VERIFIED ✓' : p.status}
                                  </span>
                                </div>

                                {p.status === 'PENDING_VERIFICATION' && (
                                  <button
                                    onClick={() => {
                                      setVerifyModal({
                                        paymentId: p.id,
                                        action: 'VERIFY',
                                        clientName: p.workOrder?.client?.clientName,
                                        workOrderNumber: p.workOrder?.workOrderNumber,
                                        amount: p.amount,
                                        transactionReference: p.transactionReference,
                                      });
                                    }}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors shrink-0"
                                  >
                                    Verify UTR
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            No payment transactions recorded in the system yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Work Orders Advance Clearance Stream */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-slate-900">Work Orders Advance Clearance Pipeline</h2>
                            <p className="text-[11px] text-slate-500">Commercial status & Technical Handover readiness</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('payments-work-orders');
                            setSubTab('work-orders');
                          }}
                          className="text-xs font-bold text-[#3066BE] hover:text-[#204a8c] flex items-center gap-1 transition-colors"
                        >
                          View All Orders <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {stats.recentWorkOrders && stats.recentWorkOrders.length > 0 ? (
                          stats.recentWorkOrders.map((w: any) => (
                            <div key={w.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-900">{w.workOrderNumber}</span>
                                  <span className="font-semibold text-xs text-slate-800">{w.client?.clientName}</span>
                                  <span className="text-[10px] text-slate-400">BGA: {w.bga?.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span>Total: <strong className="font-mono text-slate-800">₹{w.totalValue?.toLocaleString('en-IN')}</strong></span>
                                  <span>•</span>
                                  <span>Advance Req: <strong className="font-mono text-slate-800">₹{w.advanceRequired?.toLocaleString('en-IN')}</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 self-end sm:self-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  w.advanceVerified
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {w.advanceVerified ? 'ADVANCE CLEARED ✓' : 'ADVANCE PENDING'}
                                </span>

                                {!w.advanceVerified ? (
                                  <button
                                    onClick={() => {
                                      setPaymentModal({ workOrder: w });
                                      setPaymentForm({
                                        paymentType: 'ADVANCE',
                                        amount: String(w.advanceRequired),
                                        adBudgetAmount: '0',
                                        paymentMethod: 'BANK_TRANSFER',
                                        transactionReference: '',
                                        paymentDate: new Date().toISOString().slice(0, 10),
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-2xs transition-colors shrink-0"
                                  >
                                    + Record Payment
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    In Production
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            No active work orders found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: QUICK SHORTCUTS, QUOTATIONS QUEUE & COMPLIANCE PROTOCOL (5 Cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Quick Financial Action Shortcuts */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#3066BE]" />
                        Quick Financial Actions
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => setActiveTab('quotation-requests')}
                          className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-200 text-left transition-all group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <FileCheck className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">Draft Quotation</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Admin-approved enquiries</div>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('payments-work-orders');
                            setSubTab('payments');
                            setPaymentStatusFilter('PENDING_VERIFICATION');
                          }}
                          className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-200 text-left transition-all group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-amber-700">Verify Bank UTR</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Audit receipt statements</div>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('payments-work-orders');
                            setSubTab('work-orders');
                          }}
                          className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-200 text-left transition-all group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Record Payment</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Log advance or milestone</div>
                        </button>

                        <button
                          onClick={() => setActiveTab('commissions')}
                          className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200 hover:border-purple-200 text-left transition-all group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <TrendingUp className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-purple-700">Commission Engine</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Disburse BGA earnings</div>
                        </button>
                      </div>
                    </div>

                    {/* Quotations Awaiting Drafting Queue */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#3066BE]" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Awaiting Official Quotation ({stats.quotationRequests})
                          </h3>
                        </div>
                        <button
                          onClick={() => setActiveTab('quotation-requests')}
                          className="text-[11px] font-bold text-[#3066BE] hover:underline"
                        >
                          View All
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 p-2">
                        {stats.recentQuotationRequests && stats.recentQuotationRequests.length > 0 ? (
                          stats.recentQuotationRequests.map((q: any) => (
                            <div key={q.id} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-slate-900">{q.client?.clientName}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  BGA: {q.bga?.name} • Budget: ₹{q.enquiry?.expectedBudget?.toLocaleString('en-IN') || 'Flexible'}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setPrepModal({ quotation: q });
                                  setQuoteForm({
                                    serviceScope: q.serviceScope || q.enquiry?.projectScope || '',
                                    serviceFee: String(q.serviceFee || q.enquiry?.expectedBudget || ''),
                                    adBudget: String(q.adBudget || '0'),
                                    discount: String(q.discount || '0'),
                                    taxRate: String(q.taxRate || '18'),
                                    advanceRequiredPercent: String(q.advanceRequiredPercent || '50'),
                                    paymentTerms: q.paymentTerms || '50% advance to initiate technical architecture. Balance in milestones.',
                                    validityDays: '15',
                                  });
                                }}
                                className="px-2.5 py-1 bg-[#3066BE] hover:bg-[#204a8c] text-white rounded text-[11px] font-bold transition-colors shrink-0 shadow-2xs"
                              >
                                Draft
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-400 text-xs">
                            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                            All quotation requests have been prepared.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Standard Accounts Verification & Governance Protocol */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/80 text-blue-950 space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#3066BE]" />
                        <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900">
                          Accounts Verification Protocol & Governance
                        </h3>
                      </div>
                      <div className="space-y-2 text-xs leading-relaxed text-blue-900/90">
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                          <p>
                            <strong>18% GST Mandatory:</strong> Official quotations must specify GST rate (standard 18%) and mandatory advance requirement (typically 50%).
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                          <p>
                            <strong>Zero-Trust Technical Handover:</strong> Technical Department cannot begin project execution until Accounts validates bank receipt of the advance payment. BGA declarations or screenshots are not sufficient.
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                          <p>
                            <strong>Commission Locking:</strong> BGA Commission Engine calculates earnings strictly upon verified payment receipts. Digital Marketing excludes ad spend.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
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
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : q.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : q.status === 'PENDING_ADMIN_APPROVAL'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : q.status === 'ADMIN_APPROVED' || q.status === 'SENT_TO_BGA'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : q.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {q.status === 'PENDING_ADMIN_APPROVAL'
                            ? 'PENDING ADMIN APPROVAL'
                            : q.status === 'REJECTED'
                            ? 'REJECTED BY ADMIN (CORRECTION NEEDED)'
                            : q.status === 'REVISION_REQUESTED'
                            ? 'REVISION REQUESTED BY ADMIN'
                            : q.status}
                        </span>
                        <button
                          type="button"
                          disabled={downloadingPdfId === q.id}
                          onClick={async () => {
                            setDownloadingPdfId(q.id);
                            try {
                              await downloadQuotationPdf(q.id, q.quotationNumber);
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to download quotation PDF');
                            } finally {
                              setDownloadingPdfId(null);
                            }
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          {downloadingPdfId === q.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          PDF
                        </button>
                      </div>
                    </div>

                    <div className="py-2 text-xs text-slate-700 space-y-1">
                      <div>
                        <strong>Service Category:</strong> {q.serviceCategory}
                      </div>
                      <div>
                        <strong>Service Scope:</strong> {q.serviceScope}
                      </div>
                      {q.reminderCount > 0 && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-amber-700 animate-pulse shrink-0" />
                            <div>
                              <strong className="text-amber-950 font-bold block">
                                Quotation Preparation Reminder ({q.reminderCount} {q.reminderCount === 1 ? 'time' : 'times'}):
                              </strong>
                              <span className="text-amber-900 mt-0.5 block">
                                BGA <strong>{q.bga?.name}</strong> has sent a reminder requesting immediate preparation of this official quotation for client <strong>{q.client?.clientName}</strong>.
                              </span>
                            </div>
                          </div>
                          {q.lastReminderSentAt && (
                            <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-mono shrink-0">
                              Reminder sent: {new Date(q.lastReminderSentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                      )}
                      {q.revisionNotes && (
                        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 mt-2">
                          <strong>Client Revision Feedback:</strong> {q.revisionNotes}
                        </div>
                      )}
                      {q.adminNotes && (
                        <div className={`p-3 rounded-xl border text-xs mt-2 ${
                          q.status === 'REJECTED'
                            ? 'bg-rose-50 border-rose-300 text-rose-950'
                            : 'bg-purple-50 border-purple-200 text-purple-900'
                        }`}>
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            <AlertCircle className={`w-4 h-4 shrink-0 ${q.status === 'REJECTED' ? 'text-rose-600' : 'text-purple-600'}`} />
                            <span>
                              {q.status === 'REJECTED'
                                ? 'Admin Rejection Guidance (Needed Corrections):'
                                : 'Admin Guidance / Revision Instructions:'}
                            </span>
                          </div>
                          <div className="pl-5 text-slate-800 font-medium leading-relaxed">
                            {q.adminNotes}
                          </div>
                          <div className="pl-5 text-[11px] text-rose-700 mt-1 font-semibold">
                            ⚠️ Admin has returned this quotation for corrections. Update the quotation properly and resubmit for executive approval.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs flex-wrap gap-2">
                      <span className="font-bold text-slate-800">
                        Total Value: ₹{(q.totalAmount || 0).toLocaleString()} (Advance: ₹{(q.advanceRequiredAmount || 0).toLocaleString()})
                      </span>

                      {(q.status === 'REQUESTED' || q.status === 'REVISION_REQUESTED' || q.status === 'REJECTED') ? (
                        <button
                          onClick={() => openPrepModal(q)}
                          className={`px-4 py-1.5 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ${
                            q.status === 'REJECTED'
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : q.status === 'REVISION_REQUESTED'
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-[#3066BE] hover:bg-[#255299]'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />{' '}
                          {q.status === 'REJECTED'
                            ? 'Make Corrections & Resubmit Quotation'
                            : q.status === 'REVISION_REQUESTED'
                            ? 'Draft Revised Quotation'
                            : 'Prepare Official Quotation'}
                        </button>
                      ) : q.status === 'PENDING_ADMIN_APPROVAL' ? (
                        <span className="text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                          Awaiting Admin Authorization
                        </span>
                      ) : (q.status === 'ADMIN_APPROVED' || q.status === 'SENT_TO_BGA' || q.status === 'ACCEPTED') ? (
                        <span className="text-emerald-700 font-semibold">
                          {q.status === 'ACCEPTED' ? 'Quotation Accepted by Client' : 'Released to BGA & Client'}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">
                          {q.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Prepare Quotation Modal */}
              <ModalPortal
                isOpen={!!prepModal}
                onClose={() => !modalSubmitting && setPrepModal(null)}
              >
                {prepModal && (
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
                              <h3 className="text-base font-bold text-slate-900">
                                {prepModal.quotation.status === 'REJECTED'
                                  ? 'Correct & Resubmit Quotation'
                                  : prepModal.quotation.status === 'REVISION_REQUESTED'
                                  ? 'Revise Official Quotation'
                                  : 'Official Quotation Builder'}
                              </h3>
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
                        {prepModal.quotation.adminNotes && (
                          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-rose-900 font-bold">
                                {prepModal.quotation.status === 'REJECTED'
                                  ? 'Admin Rejection Guidance (Needed Corrections):'
                                  : 'Admin Revision Instructions:'}
                              </strong>
                              <p className="mt-0.5 text-slate-800 font-medium">{prepModal.quotation.adminNotes}</p>
                            </div>
                          </div>
                        )}

                        {/* Company Policy Notice */}
                        <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Workflow Policy Notice:</strong> Submitted official quotations are routed to Admin review. Official quotes are held until Admin executive approval.
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
                              className="px-5 py-2 bg-gradient-to-r from-[#3066BE] to-[#255299] hover:from-[#255299] hover:to-[#1b3d73] text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                              {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {modalSubmitting
                                ? 'Submitting...'
                                : prepModal.quotation.status === 'REJECTED' || prepModal.quotation.status === 'REVISION_REQUESTED'
                                ? 'Submit Corrected Quotation to Admin →'
                                : 'Submit for Admin Approval →'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                )}
              </ModalPortal>
            </div>
          )}

          {/* UNIFIED TAB: PAYMENT & WORK ORDERS */}
          {activeTab === 'payments-work-orders' && (
            <div className="space-y-6">
              {/* Header Title & Actions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 text-indigo-600 rounded-xl border border-indigo-100">
                      <Layers className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">Payment & Work Orders</h2>
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      Unified Accounts Desk
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Verify client bank credits, reconcile commercial payments, and authorize production release to the Technical Department.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadData()}
                    disabled={loading || tabLoading}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading || tabLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>

                  {workOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const firstPending = workOrders.find((w) => !w.advanceVerified) || workOrders[0];
                        setPaymentModal({ workOrder: firstPending });
                        setPaymentForm({
                          paymentType: 'ADVANCE',
                          amount: String(firstPending.advanceRequired || ''),
                          adBudgetAmount: '0',
                          paymentMethod: 'UPI',
                          transactionReference: '',
                          paymentDate: new Date().toISOString().slice(0, 10),
                        });
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Record Payment
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Pending Payments */}
                <div
                  onClick={() => {
                    setSubTab('payments');
                    setPaymentStatusFilter('PENDING_VERIFICATION');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    subTab === 'payments' && paymentStatusFilter === 'PENDING_VERIFICATION'
                      ? 'bg-amber-50/70 border-amber-300 shadow-sm ring-2 ring-amber-400/20'
                      : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Payments</span>
                    <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                      <Clock className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-700">
                    {summaryCounts.pendingPaymentsCount}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Awaiting bank credit audit</span>
                    <ChevronRight className="w-3 h-3 text-amber-600" />
                  </p>
                </div>

                {/* 2. Verified Collections */}
                <div
                  onClick={() => {
                    setSubTab('payments');
                    setPaymentStatusFilter('VERIFIED');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    subTab === 'payments' && paymentStatusFilter === 'VERIFIED'
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-sm ring-2 ring-emerald-400/20'
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Collections</span>
                    <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-700">
                    ₹{summaryCounts.verifiedPaymentsAmount.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>{summaryCounts.verifiedPaymentsCount} verified receipts</span>
                    <ChevronRight className="w-3 h-3 text-emerald-600" />
                  </p>
                </div>

                {/* 3. Eligible for Release */}
                <div
                  onClick={() => {
                    setSubTab('work-orders');
                    setWorkOrderEligibilityFilter('ELIGIBLE_FOR_RELEASE');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    subTab === 'work-orders' && workOrderEligibilityFilter === 'ELIGIBLE_FOR_RELEASE'
                      ? 'bg-blue-50/70 border-blue-300 shadow-sm ring-2 ring-blue-400/20'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Awaiting Release</span>
                    <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-blue-700">
                    {summaryCounts.eligibleForReleaseCount}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Advance verified & ready</span>
                    <ChevronRight className="w-3 h-3 text-blue-600" />
                  </p>
                </div>

                {/* 4. Released to Technical */}
                <div
                  onClick={() => {
                    setSubTab('work-orders');
                    setWorkOrderEligibilityFilter('RELEASED');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    subTab === 'work-orders' && workOrderEligibilityFilter === 'RELEASED'
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-2 ring-indigo-400/20'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Production</span>
                    <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                      <Briefcase className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-indigo-700">
                    {summaryCounts.releasedWorkOrdersCount}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Released to Technical</span>
                    <ChevronRight className="w-3 h-3 text-indigo-600" />
                  </p>
                </div>
              </div>

              {/* Sub-Tab Navigation Switch */}
              <div className="flex border-b border-slate-200 space-x-2">
                <button
                  type="button"
                  onClick={() => setSubTab('payments')}
                  className={`pb-3 px-4 text-xs font-bold inline-flex items-center gap-2 border-b-2 transition-all ${
                    subTab === 'payments'
                      ? 'border-[#3066BE] text-[#3066BE]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Tab A: Payment Verification</span>
                  {summaryCounts.pendingPaymentsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                      {summaryCounts.pendingPaymentsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSubTab('work-orders')}
                  className={`pb-3 px-4 text-xs font-bold inline-flex items-center gap-2 border-b-2 transition-all ${
                    subTab === 'work-orders'
                      ? 'border-[#3066BE] text-[#3066BE]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Tab B: Work Orders</span>
                  {summaryCounts.eligibleForReleaseCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white">
                      {summaryCounts.eligibleForReleaseCount}
                    </span>
                  )}
                </button>
              </div>

              {/* SUBTAB A: PAYMENT VERIFICATION */}
              {subTab === 'payments' && (
                <div className="space-y-4">
                  {/* Filters Bar */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search by client, work order #, UTR, or BGA..."
                        value={paymentSearch}
                        onChange={(e) => setPaymentSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="text-xs p-1.5 border border-slate-200 rounded-xl font-medium text-slate-700 bg-white"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING_VERIFICATION">Pending Audit</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="REJECTED">Rejected</option>
                      </select>

                      <select
                        value={paymentTypeFilter}
                        onChange={(e) => setPaymentTypeFilter(e.target.value)}
                        className="text-xs p-1.5 border border-slate-200 rounded-xl font-medium text-slate-700 bg-white"
                      >
                        <option value="ALL">All Payment Types</option>
                        <option value="ADVANCE">Advance</option>
                        <option value="INTERIM">Interim Milestone</option>
                        <option value="FINAL">Final Settlement</option>
                        <option value="MONTHLY_RECURRING">Subscription (DM)</option>
                      </select>

                      {(paymentSearch || paymentStatusFilter !== 'ALL' || paymentTypeFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentSearch('');
                            setPaymentStatusFilter('ALL');
                            setPaymentTypeFilter('ALL');
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payments Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Client & Work Order</th>
                          <th className="p-3.5">Type & Method</th>
                          <th className="p-3.5">Amount</th>
                          <th className="p-3.5">Bank UTR Reference</th>
                          <th className="p-3.5">Verification Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{p.workOrder?.client?.clientName}</div>
                              {p.workOrder?.client?.businessName && (
                                <div className="text-[11px] text-slate-500 font-normal">
                                  {p.workOrder.client.businessName}
                                </div>
                              )}
                              <div className="text-[10px] text-indigo-600 font-mono mt-0.5 font-semibold">
                                {p.workOrder?.workOrderNumber}
                              </div>
                            </td>

                            <td className="p-3.5">
                              <span className="font-semibold text-slate-800 block">{p.paymentType}</span>
                              <div className="text-[10px] text-slate-500 font-medium">{p.paymentMethod}</div>
                            </td>

                            <td className="p-3.5 font-bold text-slate-900 text-sm">
                              ₹{p.amount?.toLocaleString()}
                              {p.adBudgetAmount > 0 && (
                                <div className="text-[10px] font-normal text-slate-500">
                                  Ad Spend: ₹{p.adBudgetAmount?.toLocaleString()}
                                </div>
                              )}
                            </td>

                            <td className="p-3.5 font-mono text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                                  {p.transactionReference}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyUtr(p.transactionReference)}
                                  title="Copy UTR"
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
                                >
                                  {copiedUtr === p.transactionReference ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                  p.status === 'VERIFIED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : p.status === 'PENDING_VERIFICATION'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {p.status === 'VERIFIED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {p.status === 'PENDING_VERIFICATION' && <Clock className="w-3 h-3 text-amber-600" />}
                                {p.status === 'REJECTED' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                                {p.status}
                              </span>
                            </td>

                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPaymentDetailModal(p)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="View Payment Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {p.status === 'PENDING_VERIFICATION' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openVerifyModal(p, 'VERIFY')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
                                    >
                                      Verify ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openVerifyModal(p, 'REJECT')}
                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRequestInfoModal({ payment: p })}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
                                    >
                                      Clarify
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-600 px-2 py-0.5">
                                    Audited ✓
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}

                        {filteredPayments.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                              <p className="font-semibold text-slate-600">No payment records found matching your filters.</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Try adjusting your search query or reset status filters.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBTAB B: WORK ORDERS */}
              {subTab === 'work-orders' && (
                <div className="space-y-4">
                  {/* Filters Bar */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search work order #, client, BGA, or service..."
                        value={workOrderSearch}
                        onChange={(e) => setWorkOrderSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={workOrderEligibilityFilter}
                        onChange={(e) => setWorkOrderEligibilityFilter(e.target.value)}
                        className="text-xs p-1.5 border border-slate-200 rounded-xl font-medium text-slate-700 bg-white"
                      >
                        <option value="ALL">All Release States</option>
                        <option value="ELIGIBLE_FOR_RELEASE">Eligible for Technical Release</option>
                        <option value="AWAITING_ADVANCE">Awaiting Advance Payment</option>
                        <option value="RELEASED">Released to Technical</option>
                        <option value="ON_HOLD">On Hold / Clarification</option>
                      </select>

                      <select
                        value={workOrderStatusFilter}
                        onChange={(e) => setWorkOrderStatusFilter(e.target.value)}
                        className="text-xs p-1.5 border border-slate-200 rounded-xl font-medium text-slate-700 bg-white"
                      >
                        <option value="ALL">All Order Statuses</option>
                        <option value="ACCEPTED_PENDING_PAYMENT">Pending Advance</option>
                        <option value="IN_PRODUCTION">In Production</option>
                        <option value="COMPLETED">Completed</option>
                      </select>

                      {(workOrderSearch || workOrderEligibilityFilter !== 'ALL' || workOrderStatusFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setWorkOrderSearch('');
                            setWorkOrderEligibilityFilter('ALL');
                            setWorkOrderStatusFilter('ALL');
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Work Orders Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Work Order Ref</th>
                          <th className="p-3.5">Client & BGA</th>
                          <th className="p-3.5">Total Value</th>
                          <th className="p-3.5">Advance Status</th>
                          <th className="p-3.5">Technical Release Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredWorkOrders.map((w) => {
                          const isEligibleForRelease = w.advanceVerified && !w.handoverApproved;
                          const isReleased = Boolean(w.handoverApproved);

                          return (
                            <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5">
                                <div className="font-bold font-mono text-slate-900">{w.workOrderNumber}</div>
                                <div className="text-[10px] text-slate-400">
                                  Created: {new Date(w.createdAt).toLocaleDateString()}
                                </div>
                              </td>

                              <td className="p-3.5">
                                <div className="font-semibold text-slate-800">{w.client?.clientName}</div>
                                {w.client?.businessName && (
                                  <div className="text-[11px] text-slate-500">{w.client.businessName}</div>
                                )}
                                <div className="text-[10px] text-slate-400">BGA: {w.bga?.name || 'Assigned'}</div>
                              </td>

                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">₹{w.totalValue?.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500">
                                  Adv. Req: ₹{w.advanceRequired?.toLocaleString()}
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                    w.advanceVerified
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {w.advanceVerified ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      ADVANCE VERIFIED
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      AWAITING ADVANCE
                                    </>
                                  )}
                                </span>
                              </td>

                              <td className="p-3.5">
                                {isReleased ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                                    IN TECHNICAL PRODUCTION
                                  </span>
                                ) : w.handoverStatus === 'ON_HOLD' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    ON HOLD
                                  </span>
                                ) : w.handoverStatus === 'CLARIFICATION_REQUESTED' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    CLARIFICATION REQUESTED
                                  </span>
                                ) : isEligibleForRelease ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 inline-flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 text-blue-600" />
                                    READY FOR RELEASE
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                    AWAITING ADVANCE CLEARANCE
                                  </span>
                                )}
                              </td>

                              <td className="p-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {w.quotationId && (
                                    <button
                                      type="button"
                                      disabled={downloadingPdfId === w.quotationId}
                                      onClick={async () => {
                                        setDownloadingPdfId(w.quotationId);
                                        try {
                                          await downloadQuotationPdf(
                                            w.quotationId,
                                            w.quotation?.quotationNumber || w.quotationNumber
                                          );
                                        } catch (err: any) {
                                          toast.error(err.message || 'Failed to download quotation PDF');
                                        } finally {
                                          setDownloadingPdfId(null);
                                        }
                                      }}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                                      title="Download Official Quotation PDF"
                                    >
                                      {downloadingPdfId === w.quotationId ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Download className="w-3 h-3" />
                                      )}
                                      PDF
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setWorkOrderDetailModal(w)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="View Work Order Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {!w.advanceVerified ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPaymentModal({ workOrder: w });
                                        setPaymentForm({
                                          paymentType: 'ADVANCE',
                                          amount: String(w.advanceRequired),
                                          adBudgetAmount: '0',
                                          paymentMethod: 'UPI',
                                          transactionReference: '',
                                          paymentDate: new Date().toISOString().slice(0, 10),
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
                                    >
                                      + Record Payment
                                    </button>
                                  ) : isEligibleForRelease ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setReleaseModal({ workOrder: w })}
                                        className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-all inline-flex items-center gap-1"
                                      >
                                        <span>Release to Tech</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setHoldModal({ workOrder: w, action: 'HOLD' })}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
                                      >
                                        Hold
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5">
                                      {isReleased ? 'Released ✓' : 'Awaiting Clearance'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredWorkOrders.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              <Briefcase className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                              <p className="font-semibold text-slate-600">No work orders found matching your filters.</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Try adjusting your search query or reset status filters.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODAL 1: PAYMENT DETAIL DRAWER */}
              <ModalPortal
                isOpen={!!paymentDetailModal}
                onClose={() => setPaymentDetailModal(null)}
              >
                {paymentDetailModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-600 shrink-0" />
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                            <CreditCard className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">Payment Verification Detail</h3>
                            <p className="text-xs text-slate-500 font-mono">
                              Ref: {paymentDetailModal.transactionReference}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentDetailModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 overflow-y-auto space-y-4 text-xs">
                        {/* Commercial Breakdown Card */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                            <span className="text-slate-500">Gross Payment Received:</span>
                            <span className="text-base font-black text-emerald-700">
                              ₹{paymentDetailModal.amount?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment Type:</span>
                            <span className="font-bold text-slate-800">{paymentDetailModal.paymentType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment Method:</span>
                            <span className="font-semibold text-slate-800">{paymentDetailModal.paymentMethod}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment Date:</span>
                            <span className="font-mono text-slate-700">
                              {paymentDetailModal.paymentDate ? new Date(paymentDetailModal.paymentDate).toLocaleDateString() : 'Recorded'}
                            </span>
                          </div>
                          {paymentDetailModal.adBudgetAmount > 0 && (
                            <div className="flex justify-between text-indigo-700 font-medium">
                              <span>Ad Spend Portion:</span>
                              <span>₹{paymentDetailModal.adBudgetAmount?.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Work Order & Client Info */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
                            Associated Client & Order
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Client Name:</span>
                            <span className="font-semibold text-slate-800">
                              {paymentDetailModal.workOrder?.client?.clientName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Work Order Number:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {paymentDetailModal.workOrder?.workOrderNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Assigned BGA:</span>
                            <span className="font-medium text-slate-700">
                              {paymentDetailModal.workOrder?.bga?.name || 'Assigned'}
                            </span>
                          </div>
                        </div>

                        {/* Audit / Notes */}
                        {paymentDetailModal.verificationNotes && (
                          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-900 text-xs">
                            <div className="font-bold mb-1 flex items-center gap-1 text-amber-800">
                              <Info className="w-3.5 h-3.5" />
                              Verification Audit Notes
                            </div>
                            <p className="text-amber-800/90">{paymentDetailModal.verificationNotes}</p>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPaymentDetailModal(null)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Close
                        </button>

                        {paymentDetailModal.status === 'PENDING_VERIFICATION' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const target = paymentDetailModal;
                                setPaymentDetailModal(null);
                                openVerifyModal(target, 'VERIFY');
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                            >
                              Verify Bank Credit ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const target = paymentDetailModal;
                                setPaymentDetailModal(null);
                                openVerifyModal(target, 'REJECT');
                              }}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                )}
              </ModalPortal>

              {/* MODAL 2: WORK ORDER DETAIL DRAWER */}
              <ModalPortal
                isOpen={!!workOrderDetailModal}
                onClose={() => setWorkOrderDetailModal(null)}
              >
                {workOrderDetailModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shrink-0" />
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">Work Order Specification</h3>
                              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {workOrderDetailModal.workOrderNumber}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Client: <strong className="text-slate-800">{workOrderDetailModal.client?.clientName}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWorkOrderDetailModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 overflow-y-auto space-y-4 text-xs">
                        {/* Commercial Summary Card */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                            <span className="text-slate-500">Total Contract Value:</span>
                            <span className="text-base font-black text-slate-900">
                              ₹{workOrderDetailModal.totalValue?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Mandatory Advance Required:</span>
                            <span className="font-bold text-emerald-700">
                              ₹{workOrderDetailModal.advanceRequired?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Advance Verification:</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                workOrderDetailModal.advanceVerified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {workOrderDetailModal.advanceVerified ? 'VERIFIED ✓' : 'AWAITING ADVANCE'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Technical Handover:</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                workOrderDetailModal.handoverApproved
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {workOrderDetailModal.handoverApproved ? 'RELEASED TO PRODUCTION ✓' : 'PENDING RELEASE'}
                            </span>
                          </div>
                        </div>

                        {/* Quotation & Service Scope */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                              Scope & Specification
                            </span>
                            {workOrderDetailModal.quotationId && (
                              <button
                                type="button"
                                disabled={downloadingPdfId === workOrderDetailModal.quotationId}
                                onClick={async () => {
                                  setDownloadingPdfId(workOrderDetailModal.quotationId);
                                  try {
                                    await downloadQuotationPdf(
                                      workOrderDetailModal.quotationId,
                                      workOrderDetailModal.quotation?.quotationNumber || workOrderDetailModal.workOrderNumber
                                    );
                                  } catch (err: any) {
                                    toast.error(err.message || 'Failed to download quotation PDF');
                                  } finally {
                                    setDownloadingPdfId(null);
                                  }
                                }}
                                className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                {downloadingPdfId === workOrderDetailModal.quotationId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                View Quotation PDF
                              </button>
                            )}
                          </div>
                          <p className="text-slate-600 text-xs leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                            {workOrderDetailModal.serviceScope || 'Standard commercial project deliverables and milestone specs.'}
                          </p>
                        </div>

                        {/* Handover Eligibility Audit Notice */}
                        {!workOrderDetailModal.advanceVerified ? (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-semibold">Advance Payment Required</strong>
                              <span className="text-[11px] text-amber-700">
                                This work order cannot be released to the Technical Department until the mandatory advance payment of ₹{workOrderDetailModal.advanceRequired?.toLocaleString()} is received and verified by Accounts.
                              </span>
                            </div>
                          </div>
                        ) : !workOrderDetailModal.handoverApproved ? (
                          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-800 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-semibold">Eligible for Production Release</strong>
                              <span className="text-[11px] text-blue-700">
                                All commercial conditions are satisfied. You may now authorize and release this project directly to the Technical Department.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-800 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-semibold">In Technical Production</strong>
                              <span className="text-[11px] text-indigo-700">
                                This project has already been authorized and handed over to Technical engineering.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setWorkOrderDetailModal(null)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Close
                        </button>

                        {workOrderDetailModal.advanceVerified && !workOrderDetailModal.handoverApproved && (
                          <button
                            type="button"
                            onClick={() => {
                              const target = workOrderDetailModal;
                              setWorkOrderDetailModal(null);
                              setReleaseModal({ workOrder: target });
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5"
                          >
                            <span>Release to Technical</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                )}
              </ModalPortal>

              {/* MODAL 3: RELEASE TO TECHNICAL MODAL */}
              <ModalPortal
                isOpen={!!releaseModal}
                onClose={() => !modalSubmitting && setReleaseModal(null)}
              >
                {releaseModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
                      
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
                              <Briefcase className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">Authorize Technical Release</h3>
                              <p className="text-xs text-slate-500 font-mono">
                                Order: {releaseModal.workOrder.workOrderNumber}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => !modalSubmitting && setReleaseModal(null)}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Client:</span>
                            <span className="font-semibold text-slate-800">{releaseModal.workOrder.client?.clientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Contract Value:</span>
                            <span className="font-bold text-slate-900">₹{releaseModal.workOrder.totalValue?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Advance Cleared:</span>
                            <span className="font-bold text-emerald-700">₹{releaseModal.workOrder.advanceRequired?.toLocaleString()} ✓</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Handover & Technical Instructions Notes (Optional)
                          </label>
                          <textarea
                            rows={3}
                            value={releaseNotes}
                            onChange={(e) => setReleaseNotes(e.target.value)}
                            placeholder="Add any specific client handover instructions or timeline constraints for Technical Lead..."
                            className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none transition-all"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={modalSubmitting}
                            onClick={() => setReleaseModal(null)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={modalSubmitting}
                            onClick={confirmReleaseWorkOrder}
                            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                          >
                            {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                            {modalSubmitting ? 'Releasing...' : 'Confirm Release to Technical'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                )}
              </ModalPortal>

              {/* MODAL 4: HOLD WORK ORDER MODAL */}
              <ModalPortal
                isOpen={!!holdModal}
                onClose={() => !modalSubmitting && setHoldModal(null)}
              >
                {holdModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-rose-500" />
                      
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                              <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">Hold Work Order</h3>
                              <p className="text-xs text-slate-500 font-mono">
                                Order: {holdModal.workOrder.workOrderNumber}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => !modalSubmitting && setHoldModal(null)}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Reason for Hold / Clarification Query <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            value={holdNotes}
                            onChange={(e) => setHoldNotes(e.target.value)}
                            placeholder="Enter the reason why this work order is placed on hold or what clarification is needed..."
                            className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none transition-all"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={modalSubmitting}
                            onClick={() => setHoldModal(null)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={modalSubmitting || !holdNotes.trim()}
                            onClick={confirmHoldWorkOrder}
                            className="px-5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                          >
                            {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                            {modalSubmitting ? 'Saving...' : 'Place Order on Hold'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                )}
              </ModalPortal>

              {/* MODAL 5: REQUEST PAYMENT INFO MODAL */}
              <ModalPortal
                isOpen={!!requestInfoModal}
                onClose={() => !modalSubmitting && setRequestInfoModal(null)}
              >
                {requestInfoModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                    
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
                            <HelpCircle className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">Request Payment Clarification</h3>
                            <p className="text-xs text-slate-500 font-mono">
                              UTR: {requestInfoModal.payment.transactionReference}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => !modalSubmitting && setRequestInfoModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Information Needed from Associate / Client <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={requestInfoNotes}
                          onChange={(e) => setRequestInfoNotes(e.target.value)}
                          placeholder="e.g. Please provide bank transaction screenshot showing credit timestamp or verify sender account name..."
                          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none transition-all"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={modalSubmitting}
                          onClick={() => setRequestInfoModal(null)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={modalSubmitting || !requestInfoNotes.trim()}
                          onClick={confirmRequestPaymentInfo}
                          className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                          {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          {modalSubmitting ? 'Sending...' : 'Send Query to Associate'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </ModalPortal>

              {/* MODAL 6: RECORD PAYMENT MODAL */}
              <ModalPortal
                isOpen={!!paymentModal}
                onClose={() => !modalSubmitting && setPaymentModal(null)}
              >
                {paymentModal && (
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
                )}
              </ModalPortal>

              {/* MODAL 7: VERIFY / REJECT AUDIT MODAL */}
              <ModalPortal
                isOpen={!!verifyModal}
                onClose={() => !modalSubmitting && setVerifyModal(null)}
              >
                {verifyModal && (
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
                )}
              </ModalPortal>
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

