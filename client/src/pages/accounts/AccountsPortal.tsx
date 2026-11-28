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
  Phone,
  ChevronDown,
  History,
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import {
  SkeletonStatsRow,
  SkeletonTable,
  AccountsDashboardSkeleton,
  QuotationRequestsSkeleton,
  WorkOrdersDeskSkeleton,
} from '../../components/Skeleton';
import { validateBankUtr, getUtrPlaceholderAndHint, UtrValidationResult } from '../../utils/utrValidator';
import { useToast } from '../../context/ToastContext';
import { getQuotationPdfUrl, downloadQuotationPdf } from '../../utils/downloadPdf';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ModalPortal';
import { DatePicker } from '../../components/DatePicker';
import { QuotationHistoryTimeline } from '../../components/QuotationHistoryTimeline';
import {
  MonthlyAreaChart,
  CategoryDonutChart,
  PipelineFunnel,
} from '../../components/dashboard/DashboardCharts';

export const AccountsPortal: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'quotation-requests' | 'payments-work-orders' | 'commissions'
  >(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const valid = ['dashboard', 'quotation-requests', 'payments-work-orders', 'commissions'];
      if (tabParam && valid.includes(tabParam)) return tabParam as any;
      try {
        const saved = localStorage.getItem('accounts_active_tab');
        if (saved && valid.includes(saved)) return saved as any;
      } catch (e) {}
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('accounts_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  useEffect(() => {
    const handleSwitch = (e: any) => {
      const targetTab = e.detail?.tab;
      if (targetTab && ['dashboard', 'quotation-requests', 'payments-work-orders', 'commissions'].includes(targetTab)) {
        setActiveTab(targetTab as any);
        setMobileMenuOpen(false);
      }
    };
    const handleToggleMobile = () => setMobileMenuOpen((prev) => !prev);
    const handleCloseMobile = () => setMobileMenuOpen(false);

    window.addEventListener('portal-switch-tab', handleSwitch);
    window.addEventListener('portal-toggle-mobile-sidebar', handleToggleMobile);
    window.addEventListener('portal-close-mobile-sidebar', handleCloseMobile);
    return () => {
      window.removeEventListener('portal-switch-tab', handleSwitch);
      window.removeEventListener('portal-toggle-mobile-sidebar', handleToggleMobile);
      window.removeEventListener('portal-close-mobile-sidebar', handleCloseMobile);
    };
  }, []);
  const [subTab, setSubTab] = useState<'payments' | 'work-orders'>('payments');

  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});
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
  const [holdModal, setHoldModal] = useState<{ workOrder: any; action: 'HOLD' | 'REQUEST_CLARIFICATION' | 'RESUME' } | null>(null);
  const [holdNotes, setHoldNotes] = useState('');
  const [requestInfoModal, setRequestInfoModal] = useState<{ payment: any } | null>(null);
  const [requestInfoNotes, setRequestInfoNotes] = useState('');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Prepare Quotation Modal & Commission Policy
  const [prepModal, setPrepModal] = useState<{ quotation: any } | null>(null);
  const [commissionRanges, setCommissionRanges] = useState<any[]>([]);
  const [quoteForm, setQuoteForm] = useState({
    serviceScope: '',
    serviceFee: '',
    adBudget: '0',
    discount: '0',
    taxRate: '18',
    advanceRequiredPercent: '50',
    paymentTerms: '50% advance to initiate technical architecture. Balance in milestones.',
    validityDays: '15',
    proposedCommissionRate: '10',
    commissionExceptionReason: '',
    commissionNotes: '',
    commissionBillingType: 'PROJECT_BASED',
  });

  // Record Payment Modal
  const [paymentModal, setPaymentModal] = useState<{ workOrder: any } | null>(null);
  const [utrTouched, setUtrTouched] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'ADVANCE',
    amount: '',
    adBudgetAmount: '0',
    paymentMethod: 'UPI',
    transactionReference: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    autoVerify: true,
  });

  // Verify / Audit Payment Modal (replaces browser prompt)
  const [verifyModal, setVerifyModal] = useState<{
    paymentId: string;
    action: 'VERIFY' | 'REJECT';
    paymentType?: string;
    clientName?: string;
    workOrderNumber?: string;
    amount?: number;
    transactionReference?: string;
  } | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('Bank statement checked & verified');

  // Stage 3 & Stage 5 State: Final Payment Clearance & Commission Payouts
  const [workOrderSubTab, setWorkOrderSubTab] = useState<'WORK_ORDERS' | 'FINAL_CLEARANCE'>('WORK_ORDERS');
  const [finalPaymentProjects, setFinalPaymentProjects] = useState<any[]>([]);
  const [expandedFollowUpPrjId, setExpandedFollowUpPrjId] = useState<string | null>(null);

  const [commissionSubTab, setCommissionSubTab] = useState<'LEDGER' | 'PAYOUTS'>('LEDGER');
  const [payoutsList, setPayoutsList] = useState<any[]>([]);
  const [disburseModal, setDisburseModal] = useState<any | null>(null);
  const [payoutUtr, setPayoutUtr] = useState('');
  const [payoutUtrTouched, setPayoutUtrTouched] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('NEFT');
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [payoutReceiptUrl, setPayoutReceiptUrl] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [disbursing, setDisbursing] = useState(false);

  const payoutUtrConfig = useMemo(() => {
    return getUtrPlaceholderAndHint(payoutMethod);
  }, [payoutMethod]);

  const payoutUtrValidation = useMemo((): UtrValidationResult => {
    return validateBankUtr(payoutUtr, payoutMethod);
  }, [payoutUtr, payoutMethod]);

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
    const handleSwitch = (e: any) => {
      const targetTab = e.detail?.tab;
      if (targetTab) {
        if (targetTab === 'quotations' || targetTab === 'quotation-requests') {
          setActiveTab('quotation-requests');
        } else if (targetTab === 'payments-work-orders' || targetTab === 'payments' || targetTab === 'work-orders') {
          setActiveTab('payments-work-orders');
          if (targetTab === 'work-orders') setSubTab('work-orders');
          else setSubTab('payments');
        } else if (targetTab === 'commissions') {
          setActiveTab('commissions');
        } else if (targetTab === 'dashboard') {
          setActiveTab('dashboard');
        }
      }
    };
    window.addEventListener('portal-switch-tab', handleSwitch);
    return () => window.removeEventListener('portal-switch-tab', handleSwitch);
  }, []);

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
    } else if (tabParam === 'quotations' || tabParam === 'quotation-requests') {
      setActiveTab('quotation-requests');
    } else if (tabParam === 'commissions') {
      setActiveTab('commissions');
    } else if (tabParam === 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [window.location.search]);

  const loadTabData = async (tab = activeTab) => {
    setTabLoading(true);
    try {
      if (tab === 'quotation-requests') {
        const q = await apiRequest('/api/accounts/quotation-requests');
        setQuotationRequests(q.requests || []);
        setLoadedTabs((prev) => ({ ...prev, 'quotation-requests': true }));
      } else if (
        tab === 'payments-work-orders' ||
        (tab as string) === 'work-orders' ||
        (tab as string) === 'payments'
      ) {
        const [p, w, fp] = await Promise.all([
          apiRequest('/api/accounts/payments'),
          apiRequest('/api/accounts/work-orders'),
          apiRequest('/api/accounts/final-payments').catch(() => ({ projects: [] })),
        ]);
        setPayments(p.payments || []);
        setWorkOrders(w.workOrders || []);
        setFinalPaymentProjects(fp.projects || []);
        setLoadedTabs((prev) => ({ ...prev, 'payments-work-orders': true }));
      } else if (tab === 'commissions') {
        const [comm, payouts] = await Promise.all([
          apiRequest('/api/accounts/commissions'),
          apiRequest('/api/accounts/commission-payouts').catch(() => ({ commissions: [] })),
        ]);
        setCommissions(comm.commissions || []);
        setPayoutsList(payouts.commissions || []);
        setLoadedTabs((prev) => ({ ...prev, 'commissions': true }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTabLoading(false);
    }
  };

  const loadData = async (bypassCache = false) => {
    setLoading(true);
    try {
      await Promise.all([loadStats(bypassCache), loadTabData()]);
      setLoadedTabs((prev) => ({ ...prev, [activeTab]: true }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Load Admin-configured public commission ranges
    apiRequest('/api/public/commission-ranges')
      .then((data) => {
        if (data?.ranges && Array.isArray(data.ranges)) {
          setCommissionRanges(data.ranges);
        }
      })
      .catch((err) => console.error('Failed to load commission ranges:', err));
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
    const awaitingAdvanceCount = workOrders.filter(
      (w) => !w.advanceVerified && !w.payments?.some((p: any) => p.status === 'PENDING_VERIFICATION')
    ).length;
    const awaitingVerificationCount = workOrders.filter(
      (w) => w.payments?.some((p: any) => p.status === 'PENDING_VERIFICATION')
    ).length;
    const inProductionCount = workOrders.filter((w) => Boolean(w.handoverApproved)).length;

    return {
      pendingPaymentsCount,
      verifiedPaymentsCount,
      verifiedPaymentsAmount,
      awaitingAdvanceCount,
      awaitingVerificationCount,
      inProductionCount,
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
      if (workOrderEligibilityFilter === 'AWAITING_ADVANCE') {
        matchEligibility = !w.advanceVerified && !w.payments?.some((p: any) => p.status === 'PENDING_VERIFICATION');
      } else if (workOrderEligibilityFilter === 'AWAITING_VERIFICATION') {
        matchEligibility = Boolean(w.payments?.some((p: any) => p.status === 'PENDING_VERIFICATION'));
      } else if (workOrderEligibilityFilter === 'RELEASED') {
        matchEligibility = Boolean(w.handoverApproved);
      } else if (workOrderEligibilityFilter === 'ON_HOLD') {
        matchEligibility = w.handoverStatus === 'ON_HOLD' || w.handoverStatus === 'CLARIFICATION_REQUESTED';
      } else if (workOrderEligibilityFilter === 'FULLY_SETTLED') {
        const verifiedPaid = (w.payments || []).filter((p: any) => p.status === 'VERIFIED').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        matchEligibility = (w.totalValue > 0 && verifiedPaid >= w.totalValue) || (w.payments || []).some((p: any) => p.paymentType === 'FINAL' && p.status === 'VERIFIED') || w.status === 'COMPLETED';
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

  // Current quotation category commission range
  const currentCategoryRange = useMemo(() => {
    if (!prepModal?.quotation) return { minPercentage: 10, maxPercentage: 15 };
    const cat = prepModal.quotation.serviceCategory;
    const found = commissionRanges.find((r: any) => r.serviceCategory === cat);
    return {
      minPercentage: found?.minPercentage ?? 10,
      maxPercentage: found?.maxPercentage ?? 15,
    };
  }, [prepModal, commissionRanges]);

  const isRateOutsideRange = useMemo(() => {
    const rate = parseFloat(quoteForm.proposedCommissionRate);
    if (isNaN(rate)) return false;
    return rate < currentCategoryRange.minPercentage || rate > currentCategoryRange.maxPercentage;
  }, [quoteForm.proposedCommissionRate, currentCategoryRange]);

  // Open Prepare Quotation Modal
  const openPrepModal = (q: any) => {
    const cat = q.serviceCategory;
    const foundRange = commissionRanges.find((r: any) => r.serviceCategory === cat);
    const defaultRate = q.proposedCommissionRate
      ? String(q.proposedCommissionRate)
      : String(foundRange?.minPercentage ?? 10);

    const isDigitalMarketing = q.serviceCategory === 'DIGITAL_MARKETING';
    const defaultAdvancePercent = isDigitalMarketing ? '100' : String(q.advanceRequiredPercent || 50);
    const defaultPaymentTerms = isDigitalMarketing
      ? '100% advance full payment required prior to campaign strategy, setup, and project execution.'
      : (q.paymentTerms || '50% advance to initiate technical architecture. Balance in milestones.');

    setPrepModal({ quotation: q });
    setQuoteForm({
      serviceScope: q.serviceScope || q.enquiry?.requirements || q.enquiry?.projectScope || '',
      serviceFee: String(q.serviceFee || q.enquiry?.expectedBudget || 50000),
      adBudget: String(q.adBudget || 0),
      discount: String(q.discount || 0),
      taxRate: String(q.taxRate || 18),
      advanceRequiredPercent: defaultAdvancePercent,
      paymentTerms: defaultPaymentTerms,
      validityDays: '15',
      proposedCommissionRate: defaultRate,
      commissionExceptionReason: q.commissionExceptionReason || '',
      commissionNotes: q.commissionNotes || '',
      commissionBillingType: q.commissionBillingType || (q.serviceCategory === 'DIGITAL_MARKETING' ? 'MONTHLY_RECURRING' : 'PROJECT_BASED'),
    });
  };

  // Submit Official Quotation
  const handlePrepareQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepModal) return;

    const rate = parseFloat(quoteForm.proposedCommissionRate);
    if (isNaN(rate) || rate <= 0 || rate > 100) {
      toast.error('A valid proposed commission percentage between 0.1% and 100% is required');
      return;
    }

    if (isRateOutsideRange && (!quoteForm.commissionExceptionReason || !quoteForm.commissionExceptionReason.trim())) {
      toast.error(`Proposed commission rate ${rate}% is outside the configured range (${currentCategoryRange.minPercentage}%–${currentCategoryRange.maxPercentage}%). A mandatory exception justification reason is required for Admin review.`);
      return;
    }

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
      const res = await apiRequest(`/api/accounts/work-orders/${paymentModal.workOrder.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          ...paymentForm,
          transactionReference: validation.formattedUtr,
        }),
      });

      toast.success(res.message || (paymentForm.autoVerify ? `Payment recorded and verified with UTR: ${validation.formattedUtr}.` : `Payment recorded as pending audit.`));
      setPaymentModal(null);
      setUtrTouched(false);
      setPaymentForm({
        paymentType: 'ADVANCE',
        amount: '',
        adBudgetAmount: '0',
        paymentMethod: 'UPI',
        transactionReference: '',
        paymentDate: new Date().toISOString().slice(0, 10),
        autoVerify: true,
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
      paymentType: payment.paymentType,
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

  // Stage 5: Disburse Commission Payout to Associate Bank Account
  const handleDisbursePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseModal) return;

    const validation = validateBankUtr(payoutUtr, payoutMethod);
    if (!validation.isValid) {
      toast.warning(`Invalid Bank Transaction / UTR: ${validation.error}${validation.hint ? ' (' + validation.hint + ')' : ''}`);
      return;
    }

    setDisbursing(true);
    try {
      const res = await apiRequest(`/api/accounts/commissions/${disburseModal.id}/payout`, {
        method: 'POST',
        body: JSON.stringify({
          transactionReference: validation.formattedUtr,
          paymentMethod: payoutMethod,
          transferDate: payoutDate,
          receiptUrl: payoutReceiptUrl.trim() || undefined,
          payoutNotes: payoutNotes.trim() || undefined,
        }),
      });

      toast.success(res.message || `Commission payout of ₹${disburseModal.calculatedCommission?.toLocaleString()} processed successfully!`);
      setDisburseModal(null);
      setPayoutUtr('');
      setPayoutUtrTouched(false);
      setPayoutNotes('');
      setPayoutReceiptUrl('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disburse commission payout');
    } finally {
      setDisbursing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <PortalHeader title="Accounts Portal" subtitle="Commercial Quotations, Verification & Commission Processing" />

      <div className="flex-1 flex flex-col md:flex-row relative min-h-0">
        {/* Mobile Drawer Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Nav (Sticky on desktop, off-canvas sliding drawer on mobile) */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-300 p-4 flex flex-col justify-between transition-transform duration-300 ease-in-out
            md:static md:w-64 md:translate-x-0 md:z-30 md:sticky md:top-[var(--portal-header-height,68px)] md:h-[calc(100vh-var(--portal-header-height,68px))] md:self-start
            ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div className="space-y-1 overflow-y-auto flex-1 pr-1 -mr-1 sidebar-scrollbar">
            {/* Mobile Drawer Header with Close Button */}
            <div className="flex md:hidden items-center justify-between pb-3 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <img src="/favicon.png" alt="Atriowings" className="w-6 h-6 rounded object-contain" />
                <span className="text-xs font-bold text-white">Financial Modules</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 hidden md:block">
              Financial Modules
            </div>

            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#80DED9]" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveTab('quotation-requests'); setMobileMenuOpen(false); }}
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
                setMobileMenuOpen(false);
                const params = new URLSearchParams(window.location.search);
                params.set('tab', 'payments-work-orders');
                window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'payments-work-orders' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-[#80DED9]" />
                <span>Work Orders</span>
              </div>
              {summaryCounts.awaitingVerificationCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold" title="Work orders awaiting payment verification">
                  {summaryCounts.awaitingVerificationCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('commissions'); setMobileMenuOpen(false); }}
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
        <main className="w-full flex-1 min-w-0 p-3.5 sm:p-5 md:p-8 overflow-x-hidden">
          {/* Mobile Quick Navigation Strip */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 -mx-1 px-1 scrollbar-none">
            <button
              type="button"
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-[#3066BE] text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('quotation-requests'); setMobileMenuOpen(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'quotation-requests' ? 'bg-[#3066BE] text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Quotation Requests {stats?.quotationRequests > 0 ? `(${stats.quotationRequests})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('payments-work-orders');
                setMobileMenuOpen(false);
                const params = new URLSearchParams(window.location.search);
                params.set('tab', 'payments-work-orders');
                window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'payments-work-orders' ? 'bg-[#3066BE] text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Work Orders {summaryCounts.awaitingVerificationCount > 0 ? `(${summaryCounts.awaitingVerificationCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('commissions'); setMobileMenuOpen(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'commissions' ? 'bg-[#3066BE] text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Commission Engine
            </button>
          </div>
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
                        setWorkOrderEligibilityFilter('AWAITING_ADVANCE');
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      Audit Work Orders <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 3. SIX CORE FINANCIAL KPI CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                  {/* Card 1: Verified Collections */}
                  <div
                    onClick={() => {
                      setActiveTab('payments-work-orders');
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

                  {/* Card 2: Pending Advance Work Orders */}
                  <div
                    onClick={() => {
                      setActiveTab('payments-work-orders');
                      setWorkOrderEligibilityFilter('AWAITING_ADVANCE');
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

                {/* FINANCIAL ANALYTICS ROW 1: MONTHLY CASH COLLECTIONS & CATEGORY REVENUE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7">
                    <MonthlyAreaChart
                      data={(stats.monthlyCollections || []).map((m: any) => ({
                        month: m.month,
                        yearMonth: m.yearMonth,
                        value1: m.advance,
                        value2: m.balance,
                      }))}
                      title="Monthly Cash Collections & Bank Settlements"
                      subtitle="6-month trend of verified client advance receipts vs final milestone balance settlements."
                      label1="Advance Received"
                      label2="Milestone Balance"
                      color1="#10B981"
                      color2="#3066BE"
                      formatValue={(v) => `₹${v.toLocaleString('en-IN')}`}
                    />
                  </div>

                  <div className="lg:col-span-5">
                    <CategoryDonutChart
                      data={(stats.serviceRevenueBreakdown || []).map((b: any) => ({
                        category: b.category,
                        count: b.workOrdersCount,
                        percentage: b.percentage,
                      }))}
                      title="Contract Invoicing by Service Stream"
                      subtitle="Distribution of contracted work orders across enterprise service domains."
                      totalLabel="Work Orders"
                    />
                  </div>
                </div>

                {/* FINANCIAL ANALYTICS ROW 2: PAYMENT AUDIT & CLEARANCE PIPELINE */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        Bank Reconciliation & Payment Audit Funnel
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Lifecycle clearance from client quotation release to complete milestone settlement.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Total Verified: ₹{(stats.totalCollected || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <PipelineFunnel
                    title=""
                    stages={[
                      { label: 'Quotation Requests', count: stats.quotationRequests || 0, color: '#3066BE' },
                      { label: 'Accepted Quotations', count: stats.acceptedQuotations || 0, color: '#119DA4' },
                      { label: 'Advance UTR Audits Pending', count: stats.paymentAuditPipeline?.pendingAdvanceCount ?? stats.pendingPaymentVerifications ?? 0, color: '#F59E0B' },
                      { label: 'Work Orders in Production', count: stats.activeWorkOrders || 0, color: '#8B5CF6' },
                      { label: 'Balance Milestone Audits Pending', count: stats.paymentAuditPipeline?.pendingBalanceCount ?? 0, color: '#EC4899' },
                      { label: 'Eligible BGA Commissions', count: stats.eligibleCommissions || 0, color: '#10B981' },
                    ]}
                  />
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
                          }}
                          className="text-xs font-bold text-[#3066BE] hover:text-[#204a8c] flex items-center gap-1 transition-colors"
                        >
                          View Work Orders <ArrowRight className="w-3.5 h-3.5" />
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
                                      setUtrTouched(false);
                                      setPaymentForm({
                                        paymentType: 'ADVANCE',
                                        amount: String(w.advanceRequired),
                                        adBudgetAmount: '0',
                                        paymentMethod: 'BANK_TRANSFER',
                                        transactionReference: '',
                                        paymentDate: new Date().toISOString().slice(0, 10),
                                        autoVerify: true,
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
                            setWorkOrderEligibilityFilter('AWAITING_ADVANCE');
                          }}
                          className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-200 text-left transition-all group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-amber-700">Awaiting Advance</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Manage work order deposits</div>
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
                                onClick={() => openPrepModal(q)}
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
            tabLoading || !loadedTabs['quotation-requests'] ? (
              <QuotationRequestsSkeleton />
            ) : (
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
                  onClick={() => loadData(true)}
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
                          {q.version > 1 && (
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold border border-blue-200">
                              {q.previousVersion ? `Revision of v${q.previousVersion.version}` : `Resubmitted (v${q.version})`}
                            </span>
                          )}
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
                        {q.status === 'REQUESTED' || !q.preparedById ? (
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Drafting required before PDF can be generated">
                            Awaiting Draft
                          </span>
                        ) : (
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
                        )}
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
                        <div className={`p-3 rounded-xl border text-xs mt-2 ${
                          q.status === 'REJECTED'
                            ? 'bg-rose-50 border-rose-300 text-rose-950'
                            : q.status === 'REVISION_REQUESTED'
                            ? 'bg-amber-50 border-amber-300 text-amber-950'
                            : q.status === 'PENDING_ADMIN_APPROVAL'
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        }`}>
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            {q.status === 'REJECTED' ? (
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            ) : q.status === 'REVISION_REQUESTED' ? (
                              <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                            ) : q.status === 'PENDING_ADMIN_APPROVAL' ? (
                              <Clock className="w-4 h-4 shrink-0 text-blue-600" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                            )}
                            <span>
                              {q.status === 'REJECTED'
                                ? 'Admin Rejection Guidance (Needed Corrections):'
                                : q.status === 'REVISION_REQUESTED'
                                ? 'Admin Revision Instructions:'
                                : q.status === 'PENDING_ADMIN_APPROVAL'
                                ? 'Admin Previous Guidance:'
                                : 'Admin Executive Approval Remarks:'}
                            </span>
                          </div>
                          <div className="pl-5 text-slate-900 font-semibold leading-relaxed">
                            "{q.adminNotes}"
                          </div>
                          {q.status === 'REJECTED' && (
                            <div className="pl-5 text-[11px] text-rose-700 mt-1 font-semibold">
                              ⚠️ Admin has returned this quotation for corrections. Update the quotation properly and resubmit for executive approval.
                            </div>
                          )}
                          {q.status === 'REVISION_REQUESTED' && (
                            <div className="pl-5 text-[11px] text-amber-700 mt-1 font-semibold">
                              ⚠️ Admin has requested adjustments on this quotation. Update the draft and resubmit for executive approval.
                            </div>
                          )}
                          {q.status === 'PENDING_ADMIN_APPROVAL' && (
                            <div className="pl-5 text-[11px] text-blue-700 mt-1 font-semibold">
                              ⏳ Corrected quotation submitted to Admin. Awaiting executive review and authorization.
                            </div>
                          )}
                          {(q.status === 'ADMIN_APPROVED' || q.status === 'SENT_TO_BGA' || q.status === 'ACCEPTED') && (
                            <div className="pl-5 text-[11px] text-emerald-700 mt-1 font-semibold">
                              ✓ Quotation approved by Admin and released to BGA / Client{q.status === 'ACCEPTED' ? ' • Accepted by Client' : ''}.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quotation Full Lifecycle History & Revision Audit Trail */}
                    <QuotationHistoryTimeline currentQuotation={q} defaultExpanded={false} />

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-slate-800">
                          Total Value: ₹{(q.totalAmount || 0).toLocaleString()} (Advance: ₹{(q.advanceRequiredAmount || 0).toLocaleString()})
                        </span>
                        {(q.approvedCommissionRate || q.proposedCommissionRate || q.status === 'ADMIN_APPROVED') && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            BGA Commission: <strong>{q.approvedCommissionRate ?? q.proposedCommissionRate ?? 10}%</strong>
                            <span className="text-slate-500 font-normal">
                              (₹{Math.round(((q.serviceFee || 0) - (q.discount || 0)) * ((q.approvedCommissionRate ?? q.proposedCommissionRate ?? 10) / 100)).toLocaleString('en-IN')})
                            </span>
                            {q.approvedCommissionRate || q.status === 'ADMIN_APPROVED' || q.adminApprovalStatus === 'APPROVED' ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200 ml-1">
                                APPROVED
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 ml-1">
                                PROPOSED
                              </span>
                            )}
                          </span>
                        )}
                      </div>

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
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-slate-700 font-semibold">Advance Required (%)</label>
                                {prepModal?.quotation?.serviceCategory === 'DIGITAL_MARKETING' && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                    100% Mandatory for Digital Marketing
                                  </span>
                                )}
                              </div>
                              <input
                                type="number"
                                disabled={prepModal?.quotation?.serviceCategory === 'DIGITAL_MARKETING'}
                                value={quoteForm.advanceRequiredPercent}
                                onChange={(e) => setQuoteForm({ ...quoteForm, advanceRequiredPercent: e.target.value })}
                                className={`w-full p-2.5 border border-slate-200 rounded-xl font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 ${
                                  prepModal?.quotation?.serviceCategory === 'DIGITAL_MARKETING' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                                }`}
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

                          {/* BGA Commission Proposal (Dual Approval Required) */}
                          <div className="p-3.5 bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200/90 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                                <span className="font-bold text-amber-900 text-xs">
                                  BGA Associate Commission Proposal (Dual Approval)
                                </span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Policy Range: {currentCategoryRange.minPercentage}% – {currentCategoryRange.maxPercentage}%
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Propose commission percentage for Associate{' '}
                              <strong className="text-slate-800">{prepModal.quotation.bga?.name || 'Assigned BGA'}</strong>.
                              Admin executive approval is required before this quotation and commission rate are authorized.
                            </p>

                            <div className="grid grid-cols-2 gap-3 items-start">
                              <div>
                                <label className="block text-slate-700 font-semibold mb-1">
                                  Proposed Commission Rate (%) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    max="100"
                                    required
                                    value={quoteForm.proposedCommissionRate}
                                    onChange={(e) => setQuoteForm({ ...quoteForm, proposedCommissionRate: e.target.value })}
                                    className="w-full p-2.5 pr-8 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white"
                                    placeholder="e.g. 10"
                                  />
                                  <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                                </div>
                              </div>

                              <div className="p-2.5 bg-white/90 border border-amber-200/60 rounded-xl">
                                <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">
                                  Estimated Payout
                                </span>
                                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                                  ₹{Math.round(
                                    Math.max(0, (parseFloat(quoteForm.serviceFee) || 0) - (parseFloat(quoteForm.discount) || 0)) *
                                    ((parseFloat(quoteForm.proposedCommissionRate) || 0) / 100)
                                  ).toLocaleString('en-IN')}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Calculated on Net Fee (excl. GST & Ad Spends)
                                </span>
                              </div>
                            </div>

                            {/* Exception Notice & Reason */}
                            {isRateOutsideRange && (
                              <div className="space-y-1.5 p-2.5 bg-rose-50/90 border border-rose-200 rounded-lg text-rose-950">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>Policy Exception: Rate outside standard {currentCategoryRange.minPercentage}%–{currentCategoryRange.maxPercentage}%</span>
                                </div>
                                <label className="block text-[11px] font-semibold text-rose-900">
                                  Mandatory Exception Justification for Admin <span className="text-rose-600">*</span>
                                </label>
                                <textarea
                                  rows={2}
                                  required={isRateOutsideRange}
                                  value={quoteForm.commissionExceptionReason}
                                  onChange={(e) => setQuoteForm({ ...quoteForm, commissionExceptionReason: e.target.value })}
                                  placeholder="Provide commercial rationale for rate outside approved range..."
                                  className="w-full p-2 text-xs border border-rose-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none text-slate-800"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                                Commission Internal Notes (Optional for Admin)
                              </label>
                              <input
                                type="text"
                                value={quoteForm.commissionNotes}
                                onChange={(e) => setQuoteForm({ ...quoteForm, commissionNotes: e.target.value })}
                                placeholder="e.g. Standard rate for direct associate referral"
                                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
                              />
                            </div>
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
            )
          )}

          {/* UNIFIED TAB: PAYMENT & WORK ORDERS */}
          {activeTab === 'payments-work-orders' && (
            tabLoading || !loadedTabs['payments-work-orders'] ? (
              <WorkOrdersDeskSkeleton />
            ) : (
            <div className="space-y-6">
              {/* Header Title & Actions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 text-indigo-600 rounded-xl border border-indigo-100">
                      <Briefcase className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">Work Orders & Technical Release</h2>
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      Production Release Desk
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Track client work orders, reconcile advance payments, and authorize production release to the Technical Department.
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
                        setUtrTouched(false);
                        setPaymentForm({
                          paymentType: 'ADVANCE',
                          amount: String(firstPending.advanceRequired || ''),
                          adBudgetAmount: '0',
                          paymentMethod: 'UPI',
                          transactionReference: '',
                          paymentDate: new Date().toISOString().slice(0, 10),
                          autoVerify: true,
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
                {/* 1. Total Orders */}
                <div
                  onClick={() => {
                    setWorkOrderEligibilityFilter('ALL');
                    setWorkOrderStatusFilter('ALL');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    workOrderEligibilityFilter === 'ALL' && workOrderStatusFilter === 'ALL'
                      ? 'bg-slate-50/70 border-slate-300 shadow-sm ring-2 ring-slate-400/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
                    <span className="p-2 rounded-xl bg-slate-100 text-slate-700">
                      <Briefcase className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-800">
                    {workOrders.length}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>All client work orders</span>
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                  </p>
                </div>

                {/* 2. Awaiting Advance */}
                <div
                  onClick={() => {
                    setWorkOrderEligibilityFilter('AWAITING_ADVANCE');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    workOrderEligibilityFilter === 'AWAITING_ADVANCE'
                      ? 'bg-amber-50/70 border-amber-300 shadow-sm ring-2 ring-amber-400/20'
                      : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Awaiting Advance</span>
                    <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                      <Clock className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-700">
                    {summaryCounts.awaitingAdvanceCount}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Pending client advance</span>
                    <ChevronRight className="w-3 h-3 text-amber-600" />
                  </p>
                </div>

                {/* 3. Awaiting Verification */}
                <div
                  onClick={() => {
                    setWorkOrderEligibilityFilter('AWAITING_VERIFICATION');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    workOrderEligibilityFilter === 'AWAITING_VERIFICATION'
                      ? 'bg-blue-50/70 border-blue-300 shadow-sm ring-2 ring-blue-400/20'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Awaiting Verification</span>
                    <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-blue-700">
                    {summaryCounts.awaitingVerificationCount}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Recorded, pending audit</span>
                    <ChevronRight className="w-3 h-3 text-blue-600" />
                  </p>
                </div>

                {/* 4. Released to Technical */}
                <div
                  onClick={() => {
                    setWorkOrderEligibilityFilter('RELEASED');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    workOrderEligibilityFilter === 'RELEASED'
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
                    {summaryCounts.inProductionCount}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Auto-released to Technical</span>
                    <ChevronRight className="w-3 h-3 text-indigo-600" />
                  </p>
                </div>
              </div>

              {/* Module Sub-tabs: Production Work Orders vs Stage 3 Final Payment Clearance */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setWorkOrderSubTab('WORK_ORDERS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    workOrderSubTab === 'WORK_ORDERS'
                      ? 'bg-[#3066BE] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Production Work Orders ({workOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkOrderSubTab('FINAL_CLEARANCE')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    workOrderSubTab === 'FINAL_CLEARANCE'
                      ? 'bg-[#3066BE] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Stage 3: Final Payment Clearance Desk ({finalPaymentProjects.length})</span>
                  {finalPaymentProjects.filter((p: any) => p.status === 'COMPLETED').length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-black">
                      {finalPaymentProjects.filter((p: any) => p.status === 'COMPLETED').length} Ready
                    </span>
                  )}
                </button>
              </div>

              {/* SUB-TAB 1: WORK ORDERS DESK */}
              {workOrderSubTab === 'WORK_ORDERS' && (
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
                        <option value="AWAITING_ADVANCE">Awaiting Advance</option>
                        <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
                        <option value="RELEASED">In Production (Auto-Released)</option>
                        <option value="ON_HOLD">On Hold</option>
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
                          <th className="p-3.5">Payment Status</th>
                          <th className="p-3.5">Technical Release Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredWorkOrders.map((w) => {
                          const payments = w.payments || [];
                          const verifiedPayments = payments.filter((p: any) => p.status === 'VERIFIED');
                          const pendingPayments = payments.filter((p: any) => p.status === 'PENDING_VERIFICATION');
                          const totalVerifiedPaid = verifiedPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
                          const totalVal = w.totalValue || 0;
                          const isFullySettled = (totalVal > 0 && totalVerifiedPaid >= totalVal) || verifiedPayments.some((p: any) => p.paymentType === 'FINAL') || w.status === 'COMPLETED';
                          const hasVerifiedAdvance = Boolean(w.advanceVerified || verifiedPayments.some((p: any) => p.paymentType === 'ADVANCE'));
                          const pendingFinalPayment = pendingPayments.find((p: any) => p.paymentType === 'FINAL');
                          const pendingAdvancePayment = pendingPayments.find((p: any) => p.paymentType === 'ADVANCE');
                          const pendingPayment = pendingPayments[0];
                          const isReleased = Boolean(w.handoverApproved || w.project || w.status === 'IN_PRODUCTION' || w.status === 'COMPLETED');
                          const isHeld = w.handoverStatus === 'ON_HOLD' || w.handoverStatus === 'CLARIFICATION_REQUESTED';
                          const isDigitalMarketing = w.serviceCategory === 'DIGITAL_MARKETING' || w.quotation?.serviceCategory === 'DIGITAL_MARKETING';

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
                                {isFullySettled ? (
                                  <div className="space-y-0.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      FINAL PAYMENT VERIFIED
                                    </span>
                                    <div className="text-[10px] font-semibold text-emerald-700">
                                      100% Settled (₹{totalVerifiedPaid.toLocaleString('en-IN')})
                                    </div>
                                  </div>
                                ) : pendingFinalPayment ? (
                                  <div className="space-y-0.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1 animate-pulse">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      FINAL PAYMENT AWAITING AUDIT
                                    </span>
                                    <div className="text-[10px] text-amber-700">
                                      ₹{pendingFinalPayment.amount?.toLocaleString('en-IN')} pending verification
                                    </div>
                                  </div>
                                ) : hasVerifiedAdvance ? (
                                  <div className="space-y-0.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                      ADVANCE VERIFIED
                                    </span>
                                    <div className="text-[10px] text-slate-500">
                                      Paid: ₹{totalVerifiedPaid.toLocaleString('en-IN')} / ₹{totalVal.toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                ) : pendingAdvancePayment || pendingPayment ? (
                                  <div className="space-y-0.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1 animate-pulse">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      {isDigitalMarketing ? 'FULL PAYMENT AWAITING AUDIT' : 'ADVANCE AWAITING AUDIT'}
                                    </span>
                                    <div className="text-[10px] text-amber-700">
                                      ₹{(pendingAdvancePayment || pendingPayment).amount?.toLocaleString('en-IN')} pending
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 inline-flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-500" />
                                      {isDigitalMarketing ? 'AWAITING FULL PAYMENT (100%)' : 'AWAITING ADVANCE'}
                                    </span>
                                    <div className="text-[10px] text-slate-400">
                                      Req: ₹{w.advanceRequired?.toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                )}
                              </td>

                              <td className="p-3.5">
                                {isHeld ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    ON HOLD
                                  </span>
                                ) : w.status === 'COMPLETED' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    PROJECT COMPLETED
                                  </span>
                                ) : isReleased ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                                    IN TECHNICAL PRODUCTION
                                  </span>
                                ) : pendingAdvancePayment ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1 animate-pulse">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    AWAITING VERIFICATION
                                  </span>
                                ) : !hasVerifiedAdvance ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                    {isDigitalMarketing ? 'AWAITING FULL PAYMENT (100%)' : 'AWAITING ADVANCE'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    QUEUED FOR RELEASE
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

                                  {pendingPayment ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        openVerifyModal({
                                          id: pendingPayment.id,
                                          paymentType: pendingPayment.paymentType,
                                          transactionReference: pendingPayment.transactionReference,
                                          amount: pendingPayment.amount,
                                          workOrder: {
                                            workOrderNumber: w.workOrderNumber,
                                            client: w.client,
                                          },
                                        }, 'VERIFY');
                                      }}
                                      className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors inline-flex items-center gap-1"
                                      title={pendingPayment.paymentType === 'FINAL' ? 'Verify final client payment against bank statement' : isDigitalMarketing ? 'Verify 100% full client payment' : 'Verify client advance payment'}
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      {pendingPayment.paymentType === 'FINAL' ? 'Verify Final Payment' : isDigitalMarketing ? 'Verify Full Payment' : 'Verify Advance'}
                                    </button>
                                  ) : isFullySettled ? (
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Settled
                                    </span>
                                  ) : !hasVerifiedAdvance ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPaymentModal({ workOrder: w });
                                        setUtrTouched(false);
                                        setPaymentForm({
                                          paymentType: 'ADVANCE',
                                          amount: String(w.advanceRequired),
                                          adBudgetAmount: '0',
                                          paymentMethod: 'UPI',
                                          transactionReference: '',
                                          paymentDate: new Date().toISOString().slice(0, 10),
                                          autoVerify: true,
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
                                    >
                                      {isDigitalMarketing ? '+ Record Full Payment' : '+ Record Advance'}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const balance = Math.max(0, totalVal - totalVerifiedPaid);
                                        setPaymentModal({ workOrder: w });
                                        setUtrTouched(false);
                                        setPaymentForm({
                                          paymentType: 'FINAL',
                                          amount: String(balance),
                                          adBudgetAmount: '0',
                                          paymentMethod: 'UPI',
                                          transactionReference: '',
                                          paymentDate: new Date().toISOString().slice(0, 10),
                                          autoVerify: true,
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors inline-flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Record Final
                                    </button>
                                  )}

                                  {isHeld ? (
                                    <button
                                      type="button"
                                      onClick={() => setHoldModal({ workOrder: w, action: 'RESUME' })}
                                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[11px] font-semibold transition-colors"
                                      title="Resume work order execution"
                                    >
                                      Resume
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setHoldModal({ workOrder: w, action: 'HOLD' })}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
                                      title="Put work order on hold"
                                    >
                                      Hold
                                    </button>
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

              {/* SUB-TAB 2: STAGE 3 FINAL PAYMENT CLEARANCE DESK */}
              {workOrderSubTab === 'FINAL_CLEARANCE' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          Stage 3: Accounts Final Payment Clearance Desk
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Projects completed by Technical or actively underway. Reconcile final client payments against bank receipts and BGA commitments to unlock commission clearance.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadData()}
                        disabled={loading || tabLoading}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading || tabLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                  </div>

                  {finalPaymentProjects.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                      <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-800">No projects currently awaiting final payment</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        When Technical finishes a project or when client reaches final milestone, it will appear here for payment settlement.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {finalPaymentProjects.map((p) => {
                        const wo = p.workOrder;
                        const verifiedPayments = (wo?.payments || []).filter((pay: any) => pay.status === 'VERIFIED');
                        const totalVerifiedPaid = verifiedPayments.reduce((acc: number, pay: any) => acc + (pay.amount || 0), 0);
                        const totalVal = wo?.totalValue || 0;
                        const balanceRemaining = Math.max(0, totalVal - totalVerifiedPaid);
                        const latestFollowUp = p.finalPaymentFollowUps?.[0];

                        return (
                          <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                    {p.projectNumber}
                                  </span>
                                  <span className="font-mono text-xs text-slate-500">
                                    WO: {wo?.workOrderNumber}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                    p.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {p.status} ({p.progressPercentage}%)
                                  </span>
                                  {p.closureStatus === 'COMPLETED_AND_SETTLED' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white">
                                      ✓ Settled & Closed
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 mt-1">
                                  {p.client?.clientName}
                                  <span className="text-xs font-normal text-slate-500 ml-2">
                                    • Service: <strong className="text-slate-700">{p.serviceCategory?.replace(/_/g, ' ')}</strong>
                                  </span>
                                </h4>
                                <div className="text-xs text-slate-500">
                                  Growth Associate: <strong>{wo?.bga?.name}</strong> ({wo?.bga?.mobile || wo?.bga?.email})
                                </div>
                              </div>

                              <div className="text-right flex flex-col items-end gap-1">
                                <div className="text-xs text-slate-500">
                                  Total Contract: <strong className="text-slate-800">₹{totalVal.toLocaleString('en-IN')}</strong>
                                </div>
                                <div className="text-xs text-emerald-700 font-semibold">
                                  Verified Paid: ₹{totalVerifiedPaid.toLocaleString('en-IN')}
                                </div>
                                <div className={`text-sm font-extrabold ${balanceRemaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                  {balanceRemaining > 0 ? `Balance Due: ₹${balanceRemaining.toLocaleString('en-IN')}` : 'Fully Settled ✓'}
                                </div>
                              </div>
                            </div>

                            {/* BGA Final Payment Follow-up Card */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                                  BGA Final Payment Follow-up & Commitment
                                </span>
                                {p.finalPaymentFollowUps && p.finalPaymentFollowUps.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedFollowUpPrjId(expandedFollowUpPrjId === p.id ? null : p.id)}
                                    className="text-[11px] font-bold text-[#3066BE] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <History className="w-3 h-3" />
                                    {p.finalPaymentFollowUps.length} Follow-ups
                                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedFollowUpPrjId === p.id ? 'rotate-180' : ''}`} />
                                  </button>
                                )}
                              </div>

                              {latestFollowUp ? (
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      latestFollowUp.status === 'PAYMENT_PROMISED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                      latestFollowUp.status === 'PAYMENT_DELAYED' ? 'bg-amber-100 text-amber-800' :
                                      latestFollowUp.status === 'CLIENT_DISPUTED' ? 'bg-rose-100 text-rose-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {latestFollowUp.status?.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-slate-500 text-[11px]">
                                      via {latestFollowUp.contactMethod} by <strong>{latestFollowUp.bga?.name}</strong> on {new Date(latestFollowUp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                  {latestFollowUp.clientResponse && (
                                    <p className="text-slate-600 text-xs">
                                      <strong>Client:</strong> {latestFollowUp.clientResponse}
                                    </p>
                                  )}
                                  <p className="text-slate-700 text-xs italic">
                                    "{latestFollowUp.notes}"
                                  </p>
                                  {(latestFollowUp.expectedPaymentDate || latestFollowUp.expectedAmount) && (
                                    <div className="flex items-center gap-3 pt-1 text-slate-600 text-[11px] font-medium">
                                      {latestFollowUp.expectedPaymentDate && (
                                        <span>Promised Date: <strong className="text-slate-800">{new Date(latestFollowUp.expectedPaymentDate).toLocaleDateString('en-IN')}</strong></span>
                                      )}
                                      {latestFollowUp.expectedAmount && (
                                        <span>Expected Amount: <strong className="text-emerald-700 font-bold">₹{Number(latestFollowUp.expectedAmount).toLocaleString('en-IN')}</strong></span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  BGA has not recorded a client follow-up yet.
                                </p>
                              )}

                              {/* Expanded Follow-up Logs */}
                              {expandedFollowUpPrjId === p.id && p.finalPaymentFollowUps && (
                                <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {p.finalPaymentFollowUps.map((fu: any) => (
                                    <div key={fu.id} className="p-2 rounded bg-white border border-slate-200 text-[11px] space-y-0.5">
                                      <div className="flex items-center justify-between text-slate-500">
                                        <span className="font-semibold text-slate-800">{fu.status?.replace(/_/g, ' ')} ({fu.contactMethod})</span>
                                        <span>{new Date(fu.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      <p className="text-slate-700">{fu.notes}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                {(() => {
                                  const pendingFinal = (wo?.payments || []).find((pay: any) => pay.status === 'PENDING_VERIFICATION');
                                  if (pendingFinal) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          openVerifyModal({
                                            id: pendingFinal.id,
                                            paymentType: pendingFinal.paymentType || 'FINAL',
                                            transactionReference: pendingFinal.transactionReference,
                                            amount: pendingFinal.amount,
                                            workOrder: {
                                              workOrderNumber: wo?.workOrderNumber,
                                              client: p.client,
                                            },
                                          }, 'VERIFY');
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer animate-pulse"
                                        title="Audit bank credit and verify this final settlement payment"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Verify Final Payment (UTR: {pendingFinal.transactionReference} • ₹{pendingFinal.amount?.toLocaleString('en-IN')})
                                      </button>
                                    );
                                  }

                                  if (balanceRemaining > 0) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPaymentModal({ workOrder: wo });
                                          setUtrTouched(false);
                                          setPaymentForm({
                                            paymentType: 'FINAL',
                                            amount: String(balanceRemaining),
                                            adBudgetAmount: '0',
                                            paymentMethod: 'UPI',
                                            transactionReference: '',
                                            paymentDate: new Date().toISOString().slice(0, 10),
                                            autoVerify: true,
                                          });
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Record & Verify Final Payment (₹{balanceRemaining.toLocaleString('en-IN')})
                                      </button>
                                    );
                                  }

                                  return (
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      All Project Payments Fully Verified
                                    </span>
                                  );
                                })()}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (wo?.quotationId) {
                                      setDownloadingPdfId(wo.quotationId);
                                      try {
                                        await downloadQuotationPdf(
                                          wo.quotationId,
                                          wo.quotation?.quotationNumber || wo.workOrderNumber
                                        );
                                      } catch (err: any) {
                                        toast.error(err.message || 'Failed to download quotation PDF');
                                      } finally {
                                        setDownloadingPdfId(null);
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  {downloadingPdfId === wo?.quotationId ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3 text-slate-500" />
                                  )}
                                  Quotation / Work Order PDF
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                        <div>
                          {workOrderDetailModal.handoverApproved ? (
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                              Auto-Released to Technical Department
                            </span>
                          ) : workOrderDetailModal.advanceVerified ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Advance Verified • Queued for Technical Routing
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Awaiting Advance Payment Verification
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setWorkOrderDetailModal(null)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </motion.div>
                )}
              </ModalPortal>

              {/* MODAL 3: HOLD / RESUME WORK ORDER MODAL */}
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
                      <div className={`h-1.5 w-full ${holdModal.action === 'RESUME' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-amber-500 to-rose-500'}`} />
                      
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${holdModal.action === 'RESUME' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                              {holdModal.action === 'RESUME' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">
                                {holdModal.action === 'RESUME' ? 'Resume Work Order' : 'Hold Work Order'}
                              </h3>
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
                            {holdModal.action === 'RESUME' ? 'Resume Notes (Optional)' : <>Reason for Hold / Clarification Query <span className="text-rose-500">*</span></>}
                          </label>
                          <textarea
                            rows={3}
                            value={holdNotes}
                            onChange={(e) => setHoldNotes(e.target.value)}
                            placeholder={holdModal.action === 'RESUME' ? 'Optional reason or note regarding resuming execution...' : 'Enter the reason why this work order is placed on hold or what clarification is needed...'}
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
                            disabled={modalSubmitting || (holdModal.action !== 'RESUME' && !holdNotes.trim())}
                            onClick={confirmHoldWorkOrder}
                            className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 ${
                              holdModal.action === 'RESUME'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                                : 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700'
                            }`}
                          >
                            {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : holdModal.action === 'RESUME' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                            {modalSubmitting ? 'Processing...' : holdModal.action === 'RESUME' ? 'Resume Work Order' : 'Place Order on Hold'}
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
                          onClick={() => {
                            if (!modalSubmitting) {
                              setPaymentModal(null);
                              setUtrTouched(false);
                            }
                          }}
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
                              onChange={(e) => {
                                const newMethod = e.target.value;
                                const newConfig = getUtrPlaceholderAndHint(newMethod);
                                setPaymentForm({
                                  ...paymentForm,
                                  paymentMethod: newMethod,
                                  transactionReference: paymentForm.transactionReference.slice(0, newConfig.maxLength),
                                });
                                setUtrTouched(false);
                              }}
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
                                  : 'text-slate-500 font-medium'
                              }`}>
                                {paymentForm.transactionReference.length}/{utrConfig.maxLength} chars • Req: {utrConfig.expectedLength}
                              </span>
                            </div>

                            <div className="relative">
                              <input
                                type="text"
                                required
                                maxLength={utrConfig.maxLength}
                                value={paymentForm.transactionReference}
                                onFocus={() => setUtrTouched(false)}
                                onBlur={() => setUtrTouched(true)}
                                onChange={(e) => {
                                  let val = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
                                  if (val.length > utrConfig.maxLength) {
                                    val = val.slice(0, utrConfig.maxLength);
                                  }
                                  setPaymentForm({ ...paymentForm, transactionReference: val });
                                }}
                                placeholder={utrConfig.placeholder}
                                className={`w-full p-2.5 pr-9 border rounded-xl font-mono text-sm uppercase tracking-wide transition-all ${
                                  !paymentForm.transactionReference
                                    ? 'border-slate-300 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500'
                                    : utrCheck.isValid
                                    ? 'border-emerald-500 bg-emerald-50/20 text-emerald-900 focus:ring-2 focus:ring-emerald-500'
                                    : utrTouched && paymentForm.transactionReference.length < utrConfig.minLength
                                    ? 'border-amber-400 bg-amber-50/20 text-amber-900 focus:ring-2 focus:ring-amber-500'
                                    : !utrTouched && paymentForm.transactionReference.length < utrConfig.minLength
                                    ? 'border-slate-300 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500'
                                    : 'border-red-400 bg-red-50/20 text-red-900 focus:ring-2 focus:ring-red-500'
                                }`}
                              />
                              <div className="absolute right-3 top-3">
                                {paymentForm.transactionReference && (
                                  utrCheck.isValid ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : !utrTouched && paymentForm.transactionReference.length < utrConfig.minLength ? (
                                    <span className="text-[10px] font-semibold text-slate-400 font-mono">
                                      {paymentForm.transactionReference.length}/{utrConfig.maxLength}
                                    </span>
                                  ) : utrTouched && paymentForm.transactionReference.length < utrConfig.minLength ? (
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                  )
                                )}
                              </div>
                            </div>

                            {/* Helper and Error feedback banner */}
                            {paymentForm.transactionReference && utrCheck.isValid ? (
                              <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="font-semibold">{utrCheck.hint || `Valid ${paymentForm.paymentMethod} transaction reference.`}</span>
                              </div>
                            ) : paymentForm.transactionReference && !utrTouched && paymentForm.transactionReference.length < utrConfig.minLength ? (
                              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                                <span>{utrConfig.helper}</span>
                                <span className="text-emerald-600 font-semibold shrink-0 ml-2">
                                  {utrConfig.minLength - paymentForm.transactionReference.length} more needed
                                </span>
                              </div>
                            ) : paymentForm.transactionReference && utrTouched && paymentForm.transactionReference.length < utrConfig.minLength ? (
                              <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                <span>Incomplete reference: {paymentForm.transactionReference.length} of {utrConfig.expectedLength} entered. Need {utrConfig.minLength - paymentForm.transactionReference.length} more digit{utrConfig.minLength - paymentForm.transactionReference.length > 1 ? 's' : ''}.</span>
                              </div>
                            ) : paymentForm.transactionReference && !utrCheck.isValid ? (
                              <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 space-y-0.5">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                                  <span>{utrCheck.error}</span>
                                </div>
                                {utrCheck.hint && (
                                  <p className="text-slate-600 pl-5">{utrCheck.hint}</p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-1 text-[11px] text-slate-500">
                                {utrConfig.helper}
                              </p>
                            )}
                          </div>

                          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              id="autoVerifyCheck"
                              checked={paymentForm.autoVerify}
                              onChange={(e) => setPaymentForm({ ...paymentForm, autoVerify: e.target.checked })}
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <label htmlFor="autoVerifyCheck" className="text-xs text-emerald-950 font-medium cursor-pointer">
                              <strong>Verify & Clear Immediately</strong>
                              <p className="text-[11px] text-emerald-800">
                                Confirms bank credit receipt and verifies the payment record in the official ledger in a single step.
                              </p>
                            </label>
                          </div>

                          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                            <button
                              type="button"
                              disabled={modalSubmitting}
                              onClick={() => {
                                setPaymentModal(null);
                                setUtrTouched(false);
                              }}
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
                              <span>{modalSubmitting ? 'Processing...' : paymentForm.autoVerify ? 'Record & Verify Payment' : 'Save as Pending Audit'}</span>
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
                              {verifyModal.action === 'VERIFY'
                                ? verifyModal.paymentType === 'FINAL'
                                  ? 'Verify Final Payment Credit'
                                  : 'Verify Advance Milestone Credit'
                                : 'Reject Payment Record'}
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
                          <span className="text-slate-500">Payment Stage:</span>
                          <span className={`font-bold ${verifyModal.paymentType === 'FINAL' ? 'text-indigo-700' : 'text-blue-700'}`}>
                            {verifyModal.paymentType === 'FINAL' ? 'Final Payment (100% Contract Balance)' : 'Advance Payment (Technical Release)'}
                          </span>
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
            )
          )}

          {/* TAB 5: COMMISSION ENGINE */}
          {activeTab === 'commissions' && (
            tabLoading || !loadedTabs['commissions'] ? (
              <div className="space-y-6">
                <SkeletonStatsRow count={4} />
                <SkeletonTable rows={5} cols={6} />
              </div>
            ) : (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Commission Engine & Payouts Processing</h2>
                  <p className="text-xs text-slate-500">
                    Audited calculations based on verified receipts. Disburse approved commissions directly to associate bank accounts.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCommissionSubTab('LEDGER')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      commissionSubTab === 'LEDGER'
                        ? 'bg-[#3066BE] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Computations ({commissions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommissionSubTab('PAYOUTS')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      commissionSubTab === 'PAYOUTS'
                        ? 'bg-[#3066BE] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>Stage 5: Commission Payouts Desk</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {payoutsList.length}
                    </span>
                  </button>
                </div>
              </div>

              {commissionSubTab === 'LEDGER' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">BGA Associate</th>
                        <th className="p-3.5">Client & Service</th>
                        <th className="p-3.5">Commission Amount</th>
                        <th className="p-3.5">Rate & Source</th>
                        <th className="p-3.5">Eligibility Condition</th>
                        <th className="p-3.5">Admin Approval</th>
                        <th className="p-3.5">Payout Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {commissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No commission records generated yet.
                          </td>
                        </tr>
                      ) : (
                        commissions.map((c) => (
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
                              <div className="font-bold text-slate-800">{c.commissionRate}%</div>
                              {c.rateSource && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                  c.rateSource === 'PROJECT_OVERRIDE' ? 'bg-indigo-100 text-indigo-700' :
                                  c.rateSource === 'CLIENT_DEFAULT' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  [{c.rateSource.replace(/_/g, ' ')}]
                                </span>
                              )}
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SUB-TAB 2: STAGE 5 COMMISSION PAYOUTS DESK */}
              {commissionSubTab === 'PAYOUTS' && (
                <div className="space-y-4">
                  {payoutsList.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                      <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-800">No commissions pending disbursement</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        When Admin authorizes a commission, it will appear here for Accounts to record the bank transfer.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="p-3.5">Associate & Bank Details</th>
                            <th className="p-3.5">Client & Project</th>
                            <th className="p-3.5">Approved Amount</th>
                            <th className="p-3.5">Rate & Hierarchy Source</th>
                            <th className="p-3.5">Admin Approval</th>
                            <th className="p-3.5">Disbursement Status</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payoutsList.map((c) => {
                            const isPaid = c.payoutStatus === 'PROCESSED';
                            return (
                              <tr key={c.id} className="hover:bg-slate-50/50">
                                <td className="p-3.5">
                                  <div className="font-bold text-slate-900 text-sm">{c.bga?.name}</div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                    {c.bga?.bankName || 'Bank'}: {c.bga?.bankAccountNumber ? '••••••••' + c.bga.bankAccountNumber.slice(-4) : 'Pending'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    IFSC: {c.bga?.bankIfsc || '—'}
                                  </div>
                                  <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    c.bga?.bankVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {c.bga?.bankVerified ? '✓ Bank Verified' : '⚠ Bank Unverified'}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <div className="font-semibold text-slate-800 text-sm">{c.client?.clientName}</div>
                                  <div className="text-[11px] text-indigo-600 font-medium">
                                    {c.project?.projectNumber || c.workOrder?.workOrderNumber || 'Contract'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{c.serviceCategory}</div>
                                </td>
                                <td className="p-3.5">
                                  <div className="text-emerald-700 font-black text-sm flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    ₹{Number(c.calculatedCommission || 0).toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Gross: ₹{Number(c.grossAmount || 0).toLocaleString('en-IN')}
                                  </div>
                                </td>
                                <td className="p-3.5">
                                  <div className="font-bold text-slate-800">{c.commissionRate}%</div>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                                    c.rateSource === 'PROJECT_OVERRIDE' ? 'bg-indigo-100 text-indigo-700' :
                                    c.rateSource === 'CLIENT_DEFAULT' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    [{c.rateSource?.replace(/_/g, ' ') || 'SYSTEM DEFAULT'}]
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    APPROVED ✓
                                  </span>
                                  {c.approvedAt && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {new Date(c.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isPaid ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}>
                                    {isPaid ? 'PAID / DISBURSED' : 'READY FOR TRANSFER'}
                                  </span>
                                  {c.payoutReference && (
                                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                                      UTR: {c.payoutReference}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3.5 text-right whitespace-nowrap">
                                  {!isPaid ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDisburseModal(c);
                                        setPayoutUtr('');
                                        setPayoutUtrTouched(false);
                                        setPayoutMethod('NEFT');
                                        setPayoutDate(new Date().toISOString().slice(0, 10));
                                        setPayoutReceiptUrl('');
                                        setPayoutNotes('');
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" />
                                      Disburse Payout
                                    </button>
                                  ) : (
                                    <span className="text-emerald-700 font-bold text-xs inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      Disbursed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 5 DISBURSE PAYOUT MODAL */}
              <ModalPortal
                isOpen={!!disburseModal}
                onClose={() => !disbursing && setDisburseModal(null)}
              >
                {disburseModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
                    <div className="p-6 space-y-4 overflow-y-auto">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Stage 5 Bank Disbursement
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-1">
                            Disburse Commission Payout
                          </h3>
                          <p className="text-xs text-slate-500">
                            Transferring authorized payout to <strong>{disburseModal.bga?.name}</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={disbursing}
                          onClick={() => setDisburseModal(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Locked Amount & Bank Summary Card */}
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Approved Payout Amount (Locked)
                          </span>
                          <span className="text-lg font-black text-emerald-800">
                            ₹{Number(disburseModal.calculatedCommission || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-[11px] text-emerald-950">
                          <div>
                            <span className="text-emerald-700 block">Bank Account:</span>
                            <span className="font-mono font-bold">{disburseModal.bga?.bankAccountNumber || '—'}</span>
                          </div>
                          <div>
                            <span className="text-emerald-700 block">IFSC Code:</span>
                            <span className="font-mono font-bold">{disburseModal.bga?.bankIfsc || '—'}</span>
                          </div>
                          <div>
                            <span className="text-emerald-700 block">Account Holder:</span>
                            <span className="font-bold">{disburseModal.bga?.bankAccountHolder || disburseModal.bga?.name}</span>
                          </div>
                          <div>
                            <span className="text-emerald-700 block">Bank Name:</span>
                            <span className="font-bold">{disburseModal.bga?.bankName || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleDisbursePayout} className="space-y-3.5 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">
                              Payment Method <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={payoutMethod}
                              onChange={(e) => setPayoutMethod(e.target.value)}
                              className="w-full p-2.5 border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                              <option value="NEFT">NEFT Transfer</option>
                              <option value="RTGS">RTGS Transfer</option>
                              <option value="IMPS">IMPS Immediate</option>
                              <option value="UPI">UPI Transfer</option>
                              <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-xs">
                              Transfer Date <span className="text-rose-500">*</span>
                            </label>
                            <DatePicker
                              value={payoutDate}
                              onChange={(val) => setPayoutDate(val)}
                              placeholder="Select transfer date"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block font-bold text-slate-700">
                              {payoutMethod === 'BANK_TRANSFER'
                                ? 'Bank Transaction Reference'
                                : payoutMethod === 'UPI' || payoutMethod === 'IMPS'
                                ? `${payoutMethod} Reference / RRN`
                                : `${payoutMethod} Unique Transaction Reference (UTR)`}{' '}
                              <span className="text-rose-500">*</span>
                            </label>
                            <span
                              className={`text-[11px] font-mono ${
                                payoutUtr.length === 0
                                  ? 'text-slate-400'
                                  : payoutUtrValidation.isValid
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-slate-500 font-medium'
                              }`}
                            >
                              {payoutUtr.length}/{payoutUtrConfig.maxLength} chars • Req: {payoutUtrConfig.expectedLength}
                            </span>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              required
                              maxLength={payoutUtrConfig.maxLength}
                              value={payoutUtr}
                              onFocus={() => setPayoutUtrTouched(false)}
                              onBlur={() => setPayoutUtrTouched(true)}
                              onChange={(e) => {
                                let val = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
                                if (val.length > payoutUtrConfig.maxLength) {
                                  val = val.slice(0, payoutUtrConfig.maxLength);
                                }
                                setPayoutUtr(val);
                              }}
                              placeholder={payoutUtrConfig.placeholder}
                              className={`w-full p-2.5 pr-9 font-mono border rounded-xl uppercase text-xs tracking-wide transition-all ${
                                !payoutUtr
                                  ? 'border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                                  : payoutUtrValidation.isValid
                                  ? 'border-emerald-500 bg-emerald-50/20 text-emerald-900 focus:ring-2 focus:ring-emerald-500'
                                  : payoutUtrTouched && payoutUtr.length < payoutUtrConfig.minLength
                                  ? 'border-amber-400 bg-amber-50/20 text-amber-900 focus:ring-2 focus:ring-amber-500'
                                  : !payoutUtrTouched && payoutUtr.length < payoutUtrConfig.minLength
                                  ? 'border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                                  : 'border-red-400 bg-red-50/20 text-red-900 focus:ring-2 focus:ring-red-500'
                              }`}
                            />
                            <div className="absolute right-3 top-2.5">
                              {payoutUtr && (
                                payoutUtrValidation.isValid ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : !payoutUtrTouched && payoutUtr.length < payoutUtrConfig.minLength ? (
                                  <span className="text-[10px] font-semibold text-slate-400 font-mono">
                                    {payoutUtr.length}/{payoutUtrConfig.maxLength}
                                  </span>
                                ) : payoutUtrTouched && payoutUtr.length < payoutUtrConfig.minLength ? (
                                  <AlertCircle className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )
                              )}
                            </div>
                          </div>

                          {/* Live Helper and Error feedback banner */}
                          {payoutUtr && payoutUtrValidation.isValid ? (
                            <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-semibold">
                                {payoutUtrValidation.hint || `Valid ${payoutMethod} transaction reference.`}
                              </span>
                            </div>
                          ) : payoutUtr && !payoutUtrTouched && payoutUtr.length < payoutUtrConfig.minLength ? (
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                              <span>{payoutUtrConfig.helper}</span>
                              <span className="text-emerald-600 font-semibold shrink-0 ml-2">
                                {payoutUtrConfig.minLength - payoutUtr.length} more needed
                              </span>
                            </div>
                          ) : payoutUtr && payoutUtrTouched && payoutUtr.length < payoutUtrConfig.minLength ? (
                            <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                              <span>
                                Incomplete reference: {payoutUtr.length} of {payoutUtrConfig.expectedLength} entered. Need{' '}
                                {payoutUtrConfig.minLength - payoutUtr.length} more character
                                {payoutUtrConfig.minLength - payoutUtr.length > 1 ? 's' : ''}.
                              </span>
                            </div>
                          ) : payoutUtr && !payoutUtrValidation.isValid ? (
                            <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                                <span>{payoutUtrValidation.error}</span>
                              </div>
                              {payoutUtrValidation.hint && (
                                <p className="text-slate-600 pl-5">{payoutUtrValidation.hint}</p>
                              )}
                            </div>
                          ) : (
                            <p className="mt-1 text-[11px] text-slate-500">{payoutUtrConfig.helper}</p>
                          )}
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Payment Receipt / Screenshot Link (Optional)
                          </label>
                          <input
                            type="url"
                            placeholder="https://... or cloud storage receipt url"
                            value={payoutReceiptUrl}
                            onChange={(e) => setPayoutReceiptUrl(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Accounts Notes / Audit Memo
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Disbursed via corporate banking portal..."
                            value={payoutNotes}
                            onChange={(e) => setPayoutNotes(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={disbursing}
                            onClick={() => setDisburseModal(null)}
                            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={disbursing || !payoutUtr || !payoutUtrValidation.isValid}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            {disbursing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>{disbursing ? 'Recording Payout...' : 'Confirm Bank Payout'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </ModalPortal>
            </div>
            )
          )}
        </main>
      </div>
    </div>
  );
};

