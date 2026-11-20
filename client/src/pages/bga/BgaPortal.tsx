import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  Building2,
  FileText,
  UserPlus,
  Users,
  MessageSquare,
  CreditCard,
  Briefcase,
  DollarSign,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  Send,
  Eye,
  Plus,
  Clock,
  ShieldCheck,
  Search,
  MapPin,
  Phone,
  Mail,
  Calendar,
  X,
  Filter,
  ArrowLeft,
  FileCheck,
  Bell,
  Sparkles,
  RefreshCw,
  Edit3,
  Save,
  Building,
  Globe,
  ExternalLink,
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  Award,
  Check,
  ChevronRight,
  Layers,
  Info,
  Calculator,
  SlidersHorizontal,
  History,
  Smartphone,
  Laptop,
  Code2,
  Hash,
  ArrowUpDown,
  ChevronDown,
  Copy,
  Share2,
  CheckSquare,
  Upload,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiRequest } from '../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonStatsRow, SkeletonTable, BgaDashboardSkeleton } from '../../components/Skeleton';
import { BgaProfileView } from './BgaProfileView';
import { getQuotationPdfUrl } from '../../utils/downloadPdf';
import { BUSINESS_CATEGORIES } from '../../constants/categories';
import { ModalPortal } from '../../components/ModalPortal';
import { MediaUploader, MediaUploadResult } from '../../components/MediaUploader';
import { QuotationHistoryTimeline } from '../../components/QuotationHistoryTimeline';
import { isExternalWebLink, downloadFile } from '../../utils/fileDownload';
import { FinalPaymentFollowUpModal } from '../../components/FinalPaymentFollowUpModal';
import { UnifiedClientFollowUpModal, FollowUpContextType } from '../../components/UnifiedClientFollowUpModal';
import {
  MonthlyAreaChart,
  CategoryDonutChart,
  PipelineFunnel,
  AssociatePeerLeaderboard,
} from '../../components/dashboard/DashboardCharts';

export const BgaPortal: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'profile' | 'resources' | 'new-client' | 'clients' | 'enquiries' | 'quotations' | 'projects' | 'earnings' | 'support' | 'requests'
  >(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const valid = ['dashboard', 'profile', 'clients', 'enquiries', 'quotations', 'projects', 'earnings', 'resources', 'support', 'requests', 'new-client'];
      if (tabParam && valid.includes(tabParam)) return tabParam as any;
      try {
        const saved = localStorage.getItem('bga_active_tab');
        if (saved && valid.includes(saved)) return saved as any;
      } catch (e) { }
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('bga_active_tab', activeTab);
    } catch (e) { }
  }, [activeTab]);

  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [clientRequests, setClientRequests] = useState<any[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [enquiriesLoaded, setEnquiriesLoaded] = useState(false);
  const [quotationsLoaded, setQuotationsLoaded] = useState(false);
  const [workOrdersLoaded, setWorkOrdersLoaded] = useState(false);
  const [commissionsLoaded, setCommissionsLoaded] = useState(false);

  // My Clients UI State
  const [clientViewMode, setClientViewMode] = useState<'list' | 'add' | 'edit' | 'detail'>('list');
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState<any | null>(null);
  const [activeClientDetail, setActiveClientDetail] = useState<any | null>(null);
  const [loadingClientDetail, setLoadingClientDetail] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientCategoryFilter, setClientCategoryFilter] = useState('ALL');
  const [clientStatusFilter, setClientStatusFilter] = useState('ALL');
  const [clientFollowUpFilter, setClientFollowUpFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'OVERDUE' | 'CONNECTED' | 'NONE'>('ALL');
  const [clientSortBy, setClientSortBy] = useState<'latest' | 'newest' | 'oldest' | 'name'>('latest');
  const [submittingClient, setSubmittingClient] = useState(false);

  // Contact Activity Modal State
  const [activityModal, setActivityModal] = useState<{ clientId: string; clientName: string } | null>(null);
  const [activityForm, setActivityForm] = useState({
    contactMethod: 'CALL',
    discussionSummary: '',
    followUpNotes: '',
    nextFollowUpDate: '',
    outcome: 'CONNECTED',
  });
  const [activitySubmitting, setActivitySubmitting] = useState(false);

  // Unified Activity Timeline State
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<string>('ALL');
  const [timelineSearchQuery, setTimelineSearchQuery] = useState<string>('');
  const [unifiedFollowUpModal, setUnifiedFollowUpModal] = useState<{
    isOpen: boolean;
    initialContext?: FollowUpContextType;
    initialTargetId?: string;
  } | null>(null);

  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Listen to portal tab switch events (dispatched from notifications or portal header)
  useEffect(() => {
    const handleSwitch = (e: any) => {
      const targetTab = e.detail?.tab;
      if (targetTab && ['dashboard', 'profile', 'clients', 'enquiries', 'quotations', 'projects', 'earnings', 'resources', 'support'].includes(targetTab)) {
        setActiveTab(targetTab as any);
      }
    };
    window.addEventListener('portal-switch-tab', handleSwitch);
    return () => window.removeEventListener('portal-switch-tab', handleSwitch);
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const path = (location.pathname || '').toLowerCase();

    if (tabParam && ['dashboard', 'profile', 'clients', 'enquiries', 'quotations', 'projects', 'earnings', 'resources', 'support'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    } else if (path.includes('/bga/clients') || path.includes('/bga/client')) {
      setActiveTab('clients');
    } else if (path.includes('/bga/projects') || path.includes('/bga/project') || path.includes('/bga/work-orders') || path.includes('/bga/workorders')) {
      setActiveTab('projects');
    } else if (path.includes('/bga/quotations') || path.includes('/bga/quotes')) {
      setActiveTab('quotations');
    } else if (path.includes('/bga/enquiries') || path.includes('/bga/inquiries')) {
      setActiveTab('enquiries');
    } else if (path.includes('/bga/earnings') || path.includes('/bga/commissions')) {
      setActiveTab('earnings');
    } else if (path.includes('/bga/resources')) {
      setActiveTab('resources');
    } else if (path.includes('/bga/support')) {
      setActiveTab('support');
    } else if (path.includes('/bga/profile')) {
      setActiveTab('profile');
    }
  }, [searchParams, location.pathname, location.search]);

  // Client Consultation & Follow-up Modal State (Response to Admin Scope Changes or Rejection)
  const [followUpModal, setFollowUpModal] = useState<any | null>(null);
  const [followUpForm, setFollowUpForm] = useState({
    consultationDate: new Date().toISOString().slice(0, 16),
    nextFollowUpDate: '',
    contactMethod: 'Phone Call',
    clientOutcome: 'Client Informed - Acknowledged Rejection & Closed',
    consultationNotes: '',
    revisedBudget: '',
    revisedRequirements: '',
    resubmit: false,
    isRejection: false,
  });
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const handleOpenFollowUpModal = (enq: any, forceRejection = false) => {
    const isRej = forceRejection || enq.status === 'REJECTED';
    setFollowUpModal(enq);
    setFollowUpForm({
      consultationDate: new Date().toISOString().slice(0, 16),
      nextFollowUpDate: '',
      contactMethod: 'Phone Call',
      clientOutcome: isRej ? 'Client Informed - Acknowledged Rejection & Closed' : 'Client Agreed to Scope & Budget',
      consultationNotes: '',
      revisedBudget: enq.expectedBudget ? String(enq.expectedBudget) : '',
      revisedRequirements: enq.requirements || '',
      resubmit: !isRej,
      isRejection: isRej,
    });
  };

  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpModal || submittingFollowUp) return;
    if (!followUpForm.consultationNotes.trim()) {
      toast.error('Please enter client consultation discussion notes.', 'Required Field');
      return;
    }

    setSubmittingFollowUp(true);
    try {
      const res = await apiRequest(`/api/bga/enquiries/${followUpModal.id}/follow-up`, {
        method: 'POST',
        body: JSON.stringify({
          consultationNotes: followUpForm.consultationNotes,
          consultationDate: followUpForm.consultationDate,
          nextFollowUpDate: followUpForm.nextFollowUpDate || undefined,
          contactMethod: followUpForm.contactMethod,
          clientOutcome: followUpForm.clientOutcome,
          revisedBudget: followUpForm.revisedBudget ? Number(followUpForm.revisedBudget) : undefined,
          revisedRequirements: followUpForm.revisedRequirements,
          resubmit: followUpForm.resubmit,
          isRejectionFollowUp: followUpForm.isRejection,
        }),
      });

      toast.success(
        res.message || 'Client follow-up recorded and updated for Management review.',
        followUpForm.isRejection ? 'Rejection Follow-up Saved' : 'Follow-up Submitted'
      );
      setFollowUpModal(null);
      await loadData();
      await loadTabData('enquiries');
      await loadTabData('clients');
      if (activeClientDetail?.id) {
        await handleOpenClientDetail(activeClientDetail.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit client follow-up', 'Submission Error');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  // Find rejected enquiries that still need client contact / follow-up
  const pendingRejectionAlerts = React.useMemo(() => {
    const list: any[] = [];
    clients.forEach((c) => {
      (c.enquiries || []).forEach((e: any) => {
        if (e.status === 'REJECTED' && (!e.discussionNotes || !e.discussionNotes.includes('Client Informed of Rejection'))) {
          list.push({ ...e, client: c });
        }
      });
    });
    enquiries.forEach((e) => {
      if (e.status === 'REJECTED' && (!e.discussionNotes || !e.discussionNotes.includes('Client Informed of Rejection'))) {
        if (!list.some((item) => item.id === e.id)) {
          list.push(e);
        }
      }
    });
    return list;
  }, [clients, enquiries]);

  // My Earnings & Commissions Dashboard State
  const [earningsData, setEarningsData] = useState<any | null>(null);
  const [earningsCategoryFilter, setEarningsCategoryFilter] = useState('ALL');
  const [earningsStatusFilter, setEarningsStatusFilter] = useState('ALL');
  const [earningsDateFilter, setEarningsDateFilter] = useState('ALL');
  const [earningsSearch, setEarningsSearch] = useState('');
  const [calculationModal, setCalculationModal] = useState<any | null>(null);

  // New Client Form
  const [clientForm, setClientForm] = useState({
    clientName: '',
    businessName: '',
    mobile: '',
    email: '',
    businessCategory: 'IT & Software',
    otherCategory: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
    requiredService: 'DIGITAL_MARKETING',
    expectedBudget: '',
    clientRequirements: '',
    discussionNotes: '',
    followUpDate: '',
  });
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [clientFormSuccess, setClientFormSuccess] = useState<string | null>(null);

  // New Enquiry Form Modal
  const [newEnquiryModal, setNewEnquiryModal] = useState<{ clientId: string; clientName: string } | null>(null);
  const [enquiryForm, setEnquiryForm] = useState({
    serviceCategory: 'WEBSITE_DEVELOPMENT',
    subCategory: '',
    expectedBudget: '',
    requirements: '',
    discussionNotes: '',
    attachmentUrl: '',
    attachmentFileType: 'DOCUMENT',
    attachmentFileName: '',
    attachmentFileSize: undefined as number | undefined,
  });

  // Client Media & Documents Upload Modal
  const [clientMediaModal, setClientMediaModal] = useState<{ clientId: string; clientName: string } | null>(null);
  const [clientMediaTitle, setClientMediaTitle] = useState('');
  const [clientMediaCategory, setClientMediaCategory] = useState('REQUIREMENTS_DOC');
  const [clientMediaNotes, setClientMediaNotes] = useState('');
  const [clientMediaUrl, setClientMediaUrl] = useState('');
  const [clientMediaFileType, setClientMediaFileType] = useState('DOCUMENT');
  const [clientMediaFileName, setClientMediaFileName] = useState('');
  const [clientMediaFileSize, setClientMediaFileSize] = useState<number | undefined>(undefined);

  // Quotation Revision Modal
  const [revisionModal, setRevisionModal] = useState<{ quotationId: string; quotationNumber: string } | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Quotation Acceptance Modal
  const [acceptanceModal, setAcceptanceModal] = useState<{ quotationId: string; quotationNumber: string } | null>(null);
  const [acceptanceNotes, setAcceptanceNotes] = useState('');

  // Quotation Reminder Direct Notification State (1-Click Notification)
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Deliverable Review Modal for BGA
  const [deliverableReviewModal, setDeliverableReviewModal] = useState<{
    deliverable: any;
    project: any;
  } | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE_AND_SHARE' | 'REQUEST_CHANGES'>('APPROVE_AND_SHARE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // BGA Feedback / Three-Way Communication Modal
  const [bgaFeedbackModal, setBgaFeedbackModal] = useState<{ project: any; clientName?: string } | null>(null);
  const [bgaFeedbackContent, setBgaFeedbackContent] = useState('');
  const [bgaFeedbackType, setBgaFeedbackType] = useState<'CLIENT_FEEDBACK' | 'INTERNAL_NOTE'>('CLIENT_FEEDBACK');
  const [bgaClientDecision, setBgaClientDecision] = useState<'APPROVED' | 'CHANGES_REQUESTED'>('APPROVED');
  const [bgaFeedbackSubmitting, setBgaFeedbackSubmitting] = useState(false);

  // Stage 2: Final Payment Follow-up Modal State
  const [followUpProjectModal, setFollowUpProjectModal] = useState<{ project: any; clientName: string } | null>(null);
  const [expandedFollowUpWoId, setExpandedFollowUpWoId] = useState<string | null>(null);

  // Associate Support Desk State
  const [supportCategory, setSupportCategory] = useState('Quotation & Commercial Inquiries');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) {
      setSupportError('Please describe your query or support requirement.');
      return;
    }
    setSupportSending(true);
    setSupportSuccess(null);
    setSupportError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user?.name || 'BGA Associate',
          email: user?.email || '',
          phone: user?.mobile || '',
          companyName: 'Atriowings Growth Associate Network',
          subject: `[Associate Support - ${supportCategory}] from ${user?.name || 'Associate'}`,
          message: supportMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit support request');
      }
      setSupportSuccess('Support ticket submitted successfully! Our executive desk at Atriowings headquarters will review and respond promptly.');
      setSupportMessage('');
      toast.success('Support message submitted successfully');
    } catch (err: any) {
      setSupportError(err.message || 'Unable to submit request. Please reach info@atriowings.in directly.');
      toast.error('Failed to send support request');
    } finally {
      setSupportSending(false);
    }
  };

  // Deliverable Review Handler (Approve & Share with Client OR Request Changes from Technical)
  const handleReviewDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverableReviewModal) return;
    setReviewSubmitting(true);
    try {
      await apiRequest(`/api/bga/deliverables/${deliverableReviewModal.deliverable.id}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          action: reviewAction,
          notes: reviewNotes.trim() || undefined,
        }),
      });
      toast.success(
        reviewAction === 'APPROVE_AND_SHARE'
          ? 'Deliverable approved & shared with client. Visible in Client Project Portal.'
          : 'Revision requested from Technical team.'
      );
      setDeliverableReviewModal(null);
      setReviewNotes('');
      await loadTabData('projects');
    } catch (err: any) {
      toast.error(err.message || 'Failed to review deliverable');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // BGA Post Feedback / Communication Handler
  const handlePostBgaFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgaFeedbackModal || !bgaFeedbackContent.trim()) return;
    setBgaFeedbackSubmitting(true);
    try {
      await apiRequest(`/api/bga/projects/${bgaFeedbackModal.project.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          content: bgaFeedbackContent.trim(),
          feedbackType: bgaFeedbackType,
          visibility: bgaFeedbackType === 'INTERNAL_NOTE' ? 'INTERNAL' : 'CLIENT_VISIBLE',
          clientDecision: bgaClientDecision,
        }),
      });
      toast.success(
        bgaFeedbackType === 'INTERNAL_NOTE'
          ? 'Internal note logged for Technical Team.'
          : bgaClientDecision === 'APPROVED'
            ? 'Client approval recorded & dispatched to Technical Team.'
            : 'Client revision request dispatched to Technical Team.'
      );
      setBgaFeedbackModal(null);
      setBgaFeedbackContent('');
      await loadTabData('projects');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback');
    } finally {
      setBgaFeedbackSubmitting(false);
    }
  };

  // Copy Client Project Portal Direct Access Link
  const handleCopyClientPortalLink = (token: string, clientName?: string) => {
    const url = `${window.location.origin}/client/project/${token}`;
    navigator.clipboard.writeText(url);
    toast.success(
      `Direct Client Portal link for ${clientName || 'client'} copied to clipboard! Send this link to the client to let them review deliverables and leave feedback.`,
      'Client Link Copied'
    );
  };

  // Load BGA Dashboard Stats independently
  const loadStats = async (bypass = false) => {
    try {
      const s = await apiRequest('/api/bga/dashboard-stats', { bypassCache: bypass });
      setStats(s);
    } catch (e) {
      console.error('Failed to load BGA stats:', e);
    }
  };

  // Load Active Tab Data immediately without awaiting stats
  const loadTabData = async (tab = activeTab) => {
    setTabLoading(true);
    try {
      if (tab === 'clients') {
        const [c, r] = await Promise.all([
          apiRequest('/api/bga/clients'),
          apiRequest('/api/bga/client-requests').catch(() => ({ requests: [] })),
        ]);
        setClients(c.clients || []);
        setClientRequests(r.requests || []);
        setClientsLoaded(true);
      } else if (tab === 'requests') {
        setActiveTab('clients');
      } else if (tab === 'enquiries') {
        const e = await apiRequest('/api/bga/enquiries');
        setEnquiries(e.enquiries || []);
        setEnquiriesLoaded(true);
      } else if (tab === 'quotations') {
        const q = await apiRequest('/api/bga/quotations');
        setQuotations(q.quotations || []);
        setQuotationsLoaded(true);
      } else if (tab === 'projects') {
        const w = await apiRequest('/api/bga/work-orders');
        setWorkOrders(w.workOrders || []);
        setWorkOrdersLoaded(true);
      } else if (tab === 'earnings') {
        const [dash, comm] = await Promise.all([
          apiRequest('/api/bga/earnings-dashboard').catch(() => null),
          apiRequest('/api/bga/commissions').catch(() => ({ commissions: [] })),
        ]);
        if (dash) {
          setEarningsData(dash);
          setCommissions(dash.commissions || comm.commissions || []);
        } else {
          setCommissions(comm.commissions || []);
        }
        setCommissionsLoaded(true);
      } else if (tab === 'resources') {
        const r = await apiRequest('/api/bga/resources');
        setResources(r.resources || []);
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

  // Initial load
  useEffect(() => {
    loadStats();
  }, []);

  // Immediate load on tab switch
  useEffect(() => {
    if (activeTab === ('new-client' as any)) {
      setActiveTab('clients');
      setClientViewMode('add');
      return;
    }
    if (activeTab === 'requests') {
      setActiveTab('clients');
      return;
    }
    loadTabData(activeTab);
  }, [activeTab]);

  // Enhanced client follow-up helper calculation
  const getClientFollowUpState = (c: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activities = (c.contactActivities || []).slice().sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latestActivity = activities[0] || null;

    // Check if there is an explicit upcoming scheduled next follow-up date
    let nextDate: Date | null = null;

    if (latestActivity?.nextFollowUpDate) {
      nextDate = new Date(latestActivity.nextFollowUpDate);
    } else if (!latestActivity) {
      // If no activities logged yet, check client or enquiry followUpDate
      if (c.followUpDate) {
        nextDate = new Date(c.followUpDate);
      } else if (c.enquiries && c.enquiries.length > 0) {
        const enq = c.enquiries.find((e: any) => e.followUpDate);
        if (enq?.followUpDate) {
          nextDate = new Date(enq.followUpDate);
        }
      }
    } else {
      // Activities exist: check if an enquiry has a future follow-up date that is AFTER latest activity
      const latestActTime = new Date(latestActivity.createdAt).getTime();
      if (c.enquiries && c.enquiries.length > 0) {
        const futureEnq = c.enquiries.find((e: any) => {
          if (!e.followUpDate) return false;
          const d = new Date(e.followUpDate).getTime();
          return d > latestActTime && d >= today.getTime();
        });
        if (futureEnq) {
          nextDate = new Date(futureEnq.followUpDate);
        }
      }
    }

    if (nextDate) {
      const target = new Date(nextDate);
      target.setHours(0, 0, 0, 0);

      const formattedDate = nextDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });

      if (target.getTime() > today.getTime()) {
        return {
          hasScheduled: true,
          scheduledDate: nextDate,
          status: 'UPCOMING',
          label: `Follow-up: ${formattedDate}`,
          badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
          iconType: 'calendar',
        };
      } else if (target.getTime() === today.getTime()) {
        return {
          hasScheduled: true,
          scheduledDate: nextDate,
          status: 'TODAY',
          label: `Today: ${formattedDate}`,
          badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
          iconType: 'calendar',
        };
      } else {
        // Scheduled date in the past: check if already satisfied by an activity on or after that date
        const targetTime = target.getTime();
        const activitySatisfied = activities.some((a: any) => {
          const actDate = new Date(a.createdAt);
          actDate.setHours(0, 0, 0, 0);
          return actDate.getTime() >= targetTime;
        });

        if (!activitySatisfied) {
          return {
            hasScheduled: true,
            scheduledDate: nextDate,
            status: 'OVERDUE',
            label: `Overdue: ${formattedDate}`,
            badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
            iconType: 'calendar',
          };
        }
      }
    }

    // If no unfulfilled scheduled date, but latest activity exists:
    if (latestActivity) {
      const actDate = new Date(latestActivity.createdAt);
      const formattedActDate = actDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });
      const outcomeUpper = (latestActivity.outcome || '').toUpperCase();
      const isConnected =
        outcomeUpper.includes('CONNECTED') ||
        outcomeUpper.includes('AGREE') ||
        outcomeUpper.includes('INFORMED') ||
        outcomeUpper.includes('INTERESTED');

      return {
        hasScheduled: false,
        scheduledDate: null,
        lastContactDate: actDate,
        status: 'CONNECTED',
        label: isConnected ? `Connected: ${formattedActDate}` : `Contacted: ${formattedActDate}`,
        badgeClass: 'bg-teal-50 text-teal-700 border border-teal-200',
        iconType: 'phone',
      };
    }

    return {
      hasScheduled: false,
      scheduledDate: null,
      status: 'NONE',
      label: 'No follow-up set',
      badgeClass: 'text-slate-400',
      iconType: 'none',
    };
  };

  const getClientFollowUpDate = (c: any): Date | null => {
    return getClientFollowUpState(c).scheduledDate;
  };

  const isFollowUpMatching = (c: any, filter: string): boolean => {
    if (filter === 'ALL') return true;
    const state = getClientFollowUpState(c);
    if (filter === 'TODAY') return state.status === 'TODAY';
    if (filter === 'UPCOMING') return state.status === 'UPCOMING';
    if (filter === 'OVERDUE') return state.status === 'OVERDUE';
    if (filter === 'CONNECTED') return state.status === 'CONNECTED';
    if (filter === 'NONE') return state.status === 'NONE' || state.status === 'CONNECTED';
    return true;
  };

  const loadClientTimeline = async (clientId: string) => {
    setLoadingTimeline(true);
    try {
      const res = await apiRequest(`/api/bga/clients/${clientId}/activity-timeline`);
      setTimelineData(res);
    } catch (err: any) {
      console.error('Failed to load activity timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleOpenClientDetail = async (clientId: string) => {
    setClientViewMode('detail');
    setLoadingClientDetail(true);
    try {
      const res = await apiRequest(`/api/bga/clients/${clientId}`);
      setActiveClientDetail(res.client);
      loadClientTimeline(clientId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load client details', 'Load Error');
      setClientViewMode('list');
    } finally {
      setLoadingClientDetail(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityModal || activitySubmitting) return;
    if (!activityForm.discussionSummary.trim()) {
      toast.error('Please enter a discussion summary', 'Required Field');
      return;
    }
    setActivitySubmitting(true);
    try {
      await apiRequest(`/api/bga/clients/${activityModal.clientId}/activities`, {
        method: 'POST',
        body: JSON.stringify(activityForm),
      });
      toast.success('Contact activity logged successfully!', 'Activity Logged');
      const refreshedId = activityModal.clientId;
      setActivityModal(null);
      setActivityForm({
        contactMethod: 'CALL',
        discussionSummary: '',
        followUpNotes: '',
        nextFollowUpDate: '',
        outcome: 'CONNECTED',
      });
      if (activeClientDetail?.id === refreshedId) {
        await handleOpenClientDetail(refreshedId);
      }
      await loadTabData('clients');
    } catch (err: any) {
      toast.error(err.message || 'Failed to log contact activity', 'Logging Failed');
    } finally {
      setActivitySubmitting(false);
    }
  };

  // Reset Client Form State
  const resetClientForm = () => {
    setClientForm({
      clientName: '',
      businessName: '',
      mobile: '',
      email: '',
      businessCategory: 'IT & Software',
      otherCategory: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pinCode: '',
      country: 'India',
      requiredService: 'DIGITAL_MARKETING',
      expectedBudget: '',
      clientRequirements: '',
      discussionNotes: '',
      followUpDate: '',
    });
    setEditingClient(null);
    setClientFormError(null);
  };

  // Open Registration Mode (Add)
  const handleOpenAddClient = () => {
    resetClientForm();
    setClientFormSuccess(null);
    setClientViewMode('add');
  };

  // Open Edit Mode (Prefill database values)
  const handleOpenEditClient = (c: any) => {
    let addr = c.address || {};
    if (!addr.addressLine1 && c.location) {
      try {
        if (c.location.startsWith('{')) {
          addr = JSON.parse(c.location);
        }
      } catch { }
    }

    const latestEnq = c.enquiries && c.enquiries.length > 0 ? c.enquiries[0] : null;
    const isStandardCat = BUSINESS_CATEGORIES.includes(c.businessCategory);
    const categoryVal = isStandardCat ? c.businessCategory : 'Other';
    const otherCatVal = isStandardCat ? '' : (c.businessCategory || '');

    let formattedDate = '';
    if (latestEnq?.followUpDate) {
      try {
        formattedDate = new Date(latestEnq.followUpDate).toISOString().split('T')[0];
      } catch { }
    }

    setEditingClient(c);
    setClientForm({
      clientName: c.clientName || '',
      businessName: c.businessName || '',
      mobile: c.mobile || '',
      email: c.email || '',
      businessCategory: categoryVal,
      otherCategory: otherCatVal,
      addressLine1: addr.addressLine1 || c.addressLine1 || '',
      addressLine2: addr.addressLine2 || c.addressLine2 || '',
      city: addr.city || c.city || '',
      state: addr.state || c.state || '',
      pinCode: addr.pinCode || c.pinCode || '',
      country: addr.country || c.country || 'India',
      requiredService: latestEnq?.serviceCategory || 'DIGITAL_MARKETING',
      expectedBudget:
        latestEnq?.expectedBudget !== undefined && latestEnq?.expectedBudget !== null
          ? String(latestEnq.expectedBudget)
          : '',
      clientRequirements: latestEnq?.requirements || '',
      discussionNotes: latestEnq?.discussionNotes || '',
      followUpDate: formattedDate,
    });
    setClientFormError(null);
    setClientFormSuccess(null);
    setClientViewMode('edit');
  };

  // Controlled Enter-Key Navigation to prevent accidental submission
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;

      // 1. Textarea must insert a newline normally
      if (target.tagName === 'TEXTAREA') {
        return;
      }

      // 2. Dropdown / Select must preserve normal selection behaviour
      if (target.tagName === 'SELECT') {
        return;
      }

      // 3. Do not intercept if target is a button
      if (target.tagName === 'BUTTON') {
        return;
      }

      // 4. Always block accidental implicit form submission on single-line inputs
      e.preventDefault();

      // 5. Move focus to the next enabled, visible, eligible input
      const form = e.currentTarget;
      const focusable = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([disabled]):not([readonly]), select:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
        )
      ).filter((el) => el.offsetParent !== null && !el.hasAttribute('aria-hidden'));

      const currentIndex = focusable.indexOf(target as HTMLElement);
      if (currentIndex !== -1 && currentIndex < focusable.length - 1) {
        const nextElement = focusable[currentIndex + 1];
        nextElement.focus();
        if (nextElement instanceof HTMLInputElement && typeof nextElement.select === 'function') {
          nextElement.select();
        }
      }
      // If it is the last field, doing nothing prevents accidental client registration!
    }
  };

  // Handle Client Form Submission (Register New Client or Edit Existing Client)
  const handleSubmitClientForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingClient) return; // Prevent duplicate requests while processing
    setClientFormError(null);
    setClientFormSuccess(null);

    // Validation 1: Required Client Name & Business Name
    if (!clientForm.clientName.trim()) {
      setClientFormError('Client contact name is required.');
      return;
    }
    if (!clientForm.businessName.trim()) {
      setClientFormError('Business / Company name is required.');
      return;
    }

    // Validation 2: Mobile Number (10 Digits)
    const cleanMobile = clientForm.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setClientFormError('Please enter a valid 10-digit Indian mobile number (numbers only, starting with 6, 7, 8, or 9).');
      return;
    }

    // Validation 3: Email Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientForm.email.trim())) {
      setClientFormError('Please enter a valid email address.');
      return;
    }

    // Validation 4: Business Category
    if (clientForm.businessCategory === 'Other' && !clientForm.otherCategory.trim()) {
      setClientFormError('Please enter your custom business category.');
      return;
    }

    // Validation 5: Address Fields
    if (!clientForm.addressLine1.trim()) {
      setClientFormError('Address Line 1 is required.');
      return;
    }
    if (!clientForm.city.trim()) {
      setClientFormError('City is required.');
      return;
    }
    if (!clientForm.state.trim()) {
      setClientFormError('State is required.');
      return;
    }
    const cleanPin = clientForm.pinCode.replace(/\D/g, '');
    if (!cleanPin) {
      setClientFormError('PIN / Postal Code is required.');
      return;
    }
    if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      setClientFormError('PIN Code must be exactly 6 digits (numbers only).');
      return;
    }

    // Validation 6: Expected Budget (valid non-negative number)
    if (clientForm.expectedBudget && clientForm.expectedBudget.trim()) {
      const parsedBudget = parseFloat(clientForm.expectedBudget);
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        setClientFormError('Expected budget must be a valid non-negative number.');
        return;
      }
    }

    setSubmittingClient(true);
    try {
      const payload = {
        ...clientForm,
        clientName: clientForm.clientName.trim(),
        businessName: clientForm.businessName.trim(),
        mobile: cleanMobile,
        email: clientForm.email.trim().toLowerCase(),
        location: clientForm.city.trim(),
      };

      if (clientViewMode === 'edit' && editingClient) {
        // Edit Mode: PUT /api/bga/clients/:id
        const res = await apiRequest(`/api/bga/clients/${editingClient.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        setClientFormSuccess(
          res.message || `Client '${payload.clientName}' updated successfully.`
        );
      } else {
        // Register Mode: POST /api/bga/clients
        const res = await apiRequest('/api/bga/clients', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setClientFormSuccess(
          res.message || `Client '${payload.clientName}' registered successfully and assigned to your portfolio.`
        );
      }

      const editedClientId = editingClient?.id;
      resetClientForm();
      await loadTabData('clients');
      await loadStats(true);
      if (editedClientId) {
        await handleOpenClientDetail(editedClientId);
      } else {
        setClientViewMode('list');
      }
    } catch (err: any) {
      setClientFormError(err.message || 'Operation failed. Please verify your details.');
    } finally {
      setSubmittingClient(false);
    }
  };

  // Handle Request Quotation
  const handleRequestQuotation = async (enquiryId: string) => {
    try {
      const res = await apiRequest(`/api/bga/enquiries/${enquiryId}/request-quotation`, {
        method: 'POST',
      });
      toast.success(res.message || 'Quotation request submitted to Accounts.', 'Quotation Requested');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to request quotation', 'Request Failed');
    }
  };

  // Handle Create Extra Enquiry for existing client
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnquiryModal || modalSubmitting) return;

    setModalSubmitting(true);
    try {
      await apiRequest('/api/bga/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          clientId: newEnquiryModal.clientId,
          ...enquiryForm,
          attachmentUrl: enquiryForm.attachmentUrl || undefined,
        }),
      });
      toast.success('Enquiry submitted successfully and forwarded to Admin for approval.', 'Enquiry Created');
      setNewEnquiryModal(null);
      setEnquiryForm({
        serviceCategory: 'WEBSITE_DEVELOPMENT',
        subCategory: '',
        expectedBudget: '',
        requirements: '',
        discussionNotes: '',
        attachmentUrl: '',
        attachmentFileType: 'DOCUMENT',
        attachmentFileName: '',
        attachmentFileSize: undefined,
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit enquiry', 'Enquiry Submission Failed');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Upload Client Media / Document / Audio / Video
  const handleUploadClientMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientMediaModal || !clientMediaTitle.trim() || !clientMediaUrl || modalSubmitting) return;

    setModalSubmitting(true);
    try {
      await apiRequest(`/api/bga/clients/${clientMediaModal.clientId}/media`, {
        method: 'POST',
        body: JSON.stringify({
          title: clientMediaTitle.trim(),
          fileUrl: clientMediaUrl,
          fileType: clientMediaFileType,
          fileSize: clientMediaFileSize,
          notes: clientMediaNotes.trim() || undefined,
          category: clientMediaCategory,
        }),
      });
      toast.success('Client media recorded and attached successfully!', 'Media Uploaded');
      const targetClientId = clientMediaModal.clientId;
      setClientMediaModal(null);
      setClientMediaTitle('');
      setClientMediaNotes('');
      setClientMediaUrl('');
      setClientMediaFileType('DOCUMENT');
      setClientMediaFileName('');
      setClientMediaFileSize(undefined);
      loadData();

      // If client details workspace is open, refresh its contact activities
      try {
        const actRes = await apiRequest(`/api/bga/clients/${targetClientId}/activities`);
        setSelectedClientDetails((prev: any) =>
          prev && prev.id === targetClientId
            ? { ...prev, contactActivities: actRes.activities || [] }
            : prev
        );
      } catch (err) {
        // ignore
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload client media', 'Upload Failed');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Submit Revision
  const handleSubmitRevision = async () => {
    if (!revisionModal || !revisionNotes || modalSubmitting) return;
    setModalSubmitting(true);
    try {
      await apiRequest(`/api/bga/quotations/${revisionModal.quotationId}/request-revision`, {
        method: 'POST',
        body: JSON.stringify({ revisionNotes }),
      });
      toast.success('Revision request forwarded to Accounts Department.', 'Revision Requested');
      setRevisionModal(null);
      setRevisionNotes('');
      loadData();
      if (activeClientDetail?.id) {
        await handleOpenClientDetail(activeClientDetail.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit revision request', 'Revision Failed');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Client Acceptance
  const handleClientAcceptance = async () => {
    if (!acceptanceModal || !acceptanceNotes || modalSubmitting) return;
    setModalSubmitting(true);
    try {
      const res = await apiRequest(`/api/bga/quotations/${acceptanceModal.quotationId}/client-decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'ACCEPTED',
          clientAcceptanceNotes: acceptanceNotes,
        }),
      });
      toast.success(
        res.message || 'Client acceptance recorded successfully. Work Order generated in PENDING_ADVANCE status.',
        'Acceptance Recorded'
      );
      setAcceptanceModal(null);
      setAcceptanceNotes('');
      loadData();
      if (activeClientDetail?.id) {
        await handleOpenClientDetail(activeClientDetail.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to record client acceptance', 'Acceptance Failed');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Quotation Reminder directly to Accounts & Admin (1-Click Notification)
  const handleSendReminder = async (quotationId: string) => {
    if (sendingReminderId) return;
    setSendingReminderId(quotationId);
    try {
      const res = await apiRequest(`/api/bga/quotations/${quotationId}/reminder`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success(res.message || 'Quotation reminder notification sent to Accounts & Admin!', 'Reminder Sent');
      await loadTabData('quotations');
      await loadTabData('clients');
      if (activeClientDetail?.id) {
        await handleOpenClientDetail(activeClientDetail.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reminder', 'Reminder Failed');
    } finally {
      setSendingReminderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <PortalHeader title="Growth Associate Portal" subtitle="Client Management, Quotation Requests & Earnings" />

      <div className="flex-1 flex flex-col md:flex-row relative min-h-0">
        {/* Sidebar Nav (Sticky, fixed in viewport, independent internal scrolling) */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-4 shrink-0 md:sticky md:top-[var(--portal-header-height,68px)] md:h-[calc(100vh-var(--portal-header-height,68px))] md:self-start flex flex-col justify-between z-30">
          <div className="space-y-1 overflow-y-auto flex-1 pr-1 -mr-1 sidebar-scrollbar">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
              Associate Workspace
            </div>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
                }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#80DED9]" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'profile' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
                }`}
            >
              <UserCheck className="w-4 h-4 text-[#80DED9]" />
              <span>My Profile & KYC</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('clients');
                setClientViewMode('list');
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'clients' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
                }`}
            >
              <Users className="w-4 h-4 text-[#80DED9]" />
              <span>My Clients</span>
            </button>

            <button
              onClick={() => setActiveTab('enquiries')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'enquiries' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
                }`}
            >
              <MessageSquare className="w-4 h-4 text-[#80DED9]" />
              <span>Enquiries & Quotation Req.</span>
            </button>

            <button
              onClick={() => setActiveTab('quotations')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'quotations' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
                }`}
            >
              <CreditCard className="w-4 h-4 text-[#80DED9]" />
              <span>My Quotations</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'projects' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
                }`}
            >
              <Briefcase className="w-4 h-4 text-[#80DED9]" />
              <span>Work Orders & Projects</span>
            </button>

            <button
              onClick={() => setActiveTab('earnings')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'earnings' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
                }`}
            >
              <DollarSign className="w-4 h-4 text-[#80DED9]" />
              <span>My Earnings & Commissions</span>
            </button>

            <button
              onClick={() => setActiveTab('resources')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'resources' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
                }`}
            >
              <FileText className="w-4 h-4 text-[#80DED9]" />
              <span>Company Resources</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'support' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
                }`}
            >
              <HelpCircle className="w-4 h-4 text-[#80DED9]" />
              <span>Associate Support</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 shrink-0">
            <div className="flex justify-between items-center px-1">
              <span>Account Status:</span>
              <span className="text-[#80DED9] font-bold uppercase">{user?.status}</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="w-full flex-1 min-w-0 p-6 md:p-8">
          {/* URGENT MANAGEMENT REJECTION ALERT BANNER */}
          {pendingRejectionAlerts.length > 0 && (
            <div className="mb-6 p-4 md:p-5 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-rose-300 rounded-2xl shadow-sm text-xs">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0 mt-0.5 shadow-sm">
                    <AlertTriangle className="w-6 h-6 animate-pulse text-rose-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-rose-900 uppercase tracking-wider text-[10px] bg-rose-200/80 px-2.5 py-0.5 rounded-full border border-rose-300">
                        ⚠️ Action Required • Management Rejection Alert
                      </span>
                      <span className="text-rose-700 font-bold text-xs">
                        ({pendingRejectionAlerts.length} {pendingRejectionAlerts.length === 1 ? 'enquiry' : 'enquiries'} awaiting client consultation)
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      Enquiry #{pendingRejectionAlerts[0].id} for client <span className="text-rose-700 underline font-extrabold">{pendingRejectionAlerts[0].client?.clientName}</span> was rejected by Management
                    </h4>
                    <p className="text-slate-700 mt-1">
                      <strong className="text-rose-950 font-bold">Admin Rejection Remarks:</strong> "{pendingRejectionAlerts[0].adminNotes || 'Scope/budget feasibility constraints'}"
                    </p>
                    <p className="text-slate-500 mt-1 text-[11px]">
                      Please contact the client to inform them of this management decision and record the consultation outcome so Admin is updated.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenFollowUpModal(pendingRejectionAlerts[0], true)}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shrink-0 shadow-md transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                  <span>Inform Client & Record Follow-up</span>
                </button>
              </div>
            </div>
          )}
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            !stats ? (
              <BgaDashboardSkeleton />
            ) : (
              <div className="space-y-6">
                {/* Dashboard Greeting Banner */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                      Welcome back, {user?.name || 'Associate'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Client acquisitions, quotation requests, and IT solution commissions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('clients');
                        setClientViewMode('add');
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-[#3066BE] to-[#119DA4] hover:from-[#255299] hover:to-[#0e8288] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Onboard New Client</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 font-semibold uppercase">My Registered Clients</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.clients}</div>
                    <span className="text-xs text-[#119DA4] font-medium">100% Exclusive Ownership</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Submitted Enquiries</span>
                    <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.enquiries}</div>
                    <span className="text-xs text-slate-400">Under Review / Approved</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Accepted Quotations</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.acceptedQuotations}</div>
                    <span className="text-xs text-slate-400">Total Quotes: {stats.quotations}</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Active In-Progress Projects</span>
                    <div className="text-2xl font-bold text-amber-600 mt-1">{stats.activeProjects}</div>
                    <span className="text-xs text-slate-400">Technical Execution Active</span>
                  </div>
                </div>

                {/* Commission Earnings Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-2xl bg-gradient-to-tr from-[#3066BE] to-[#119DA4] text-white shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-[#80DED9] uppercase tracking-wider font-semibold">
                        Commissions Received (Paid Out)
                      </span>
                      <div className="text-3xl font-extrabold mt-2">₹{stats.earnings.paid.toLocaleString()}</div>
                      <p className="text-xs text-blue-100/90 mt-1">
                        Directly disbursed to your verified bank account via NEFT/IMPS.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('earnings')}
                      className="mt-4 px-4 py-2 bg-white text-[#152544] rounded-lg text-xs font-bold hover:bg-[#AEECEF]/20 transition-colors w-fit"
                    >
                      View Commission Ledger →
                    </button>
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-tr from-[#152544] to-[#3066BE] text-white shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-[#AEECEF] uppercase tracking-wider font-semibold">
                        Commissions in Processing
                      </span>
                      <div className="text-3xl font-extrabold mt-2">₹{stats.earnings.pending.toLocaleString()}</div>
                      <p className="text-xs text-blue-100/90 mt-1">
                        Awaiting monthly cycle or technical project milestone completion.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('clients');
                        setClientViewMode('add');
                        setClientFormSuccess(null);
                      }}
                      className="mt-4 px-4 py-2 bg-white text-indigo-900 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors w-fit"
                    >
                      Register New Client +
                    </button>
                  </div>
                </div>

                {/* ANALYTICS ROW 1: MONTHLY PERFORMANCE TRENDS & PIPELINE FUNNEL */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7">
                    <MonthlyAreaChart
                      data={(stats.monthlyPerformance || []).map((m: any) => ({
                        month: m.month,
                        yearMonth: m.yearMonth,
                        value1: m.clients,
                        value2: m.enquiries,
                      }))}
                      title="Client Acquisition & Enquiry Pipeline Trends"
                      subtitle="Historical 6-month monthly velocity of clients onboarded vs enquiries logged."
                      label1="Clients Onboarded"
                      label2="Enquiries Logged"
                      color1="#3066BE"
                      color2="#119DA4"
                    />
                  </div>

                  <div className="lg:col-span-5">
                    <PipelineFunnel
                      title="Contract Conversion Funnel"
                      subtitle="Progressive conversion from client registration to project handover."
                      stages={[
                        { label: 'Registered Clients', count: stats.pipelineFunnel?.clients ?? stats.clients, color: '#3066BE' },
                        { label: 'Submitted Enquiries', count: stats.pipelineFunnel?.enquiries ?? stats.enquiries, color: '#119DA4' },
                        { label: 'Official Quotations', count: stats.pipelineFunnel?.quotations ?? stats.quotations, color: '#F59E0B' },
                        { label: 'Accepted Contracts', count: stats.pipelineFunnel?.acceptedQuotations ?? stats.acceptedQuotations, color: '#10B981' },
                        { label: 'Active Projects', count: stats.pipelineFunnel?.activeProjects ?? stats.activeProjects, color: '#8B5CF6' },
                        { label: 'Delivered Projects', count: stats.pipelineFunnel?.completedProjects ?? 0, color: '#059669' },
                      ]}
                    />
                  </div>
                </div>

                {/* ANALYTICS ROW 2: SERVICE BREAKDOWN & ASSOCIATE PEER BENCHMARK */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5">
                    <CategoryDonutChart
                      data={stats.categoryBreakdown || []}
                      title="Service Demand Distribution"
                      subtitle="Breakdown of client project requests across technology domains."
                      totalLabel="Enquiries Logged"
                    />
                  </div>

                  {/* ONE BGA CAN SHOW AND BENCHMARK AGAINST OTHER BGAS */}
                  <div className="lg:col-span-7">
                    <AssociatePeerLeaderboard
                      associates={stats.peerLeaderboard || []}
                      currentUserRank={stats.networkStats?.currentUserRank || 1}
                      totalNetworkCount={stats.networkStats?.totalNetworkBgas || 1}
                    />
                  </div>
                </div>

                {/* ANALYTICS ROW 3: ACTIVE PROJECT DELIVERABLES MONITOR */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#3066BE]" />
                        Active Technical Deliverables & Client Status
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Live execution progress of technical milestones for your signed client contracts.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('projects')}
                      className="text-xs font-bold text-[#3066BE] hover:text-[#255299] flex items-center gap-1 transition-colors"
                    >
                      View All Work Orders <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {stats.recentActiveProjects && stats.recentActiveProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stats.recentActiveProjects.map((p: any) => {
                        const completedMilestones = (p.milestones || []).filter((m: any) => m.status === 'COMPLETED').length;
                        const totalMilestones = (p.milestones || []).length;
                        return (
                          <div
                            key={p.id}
                            className="p-4 rounded-xl border border-slate-200 hover:border-[#3066BE]/40 hover:shadow-xs transition-all bg-slate-50/40 flex flex-col justify-between space-y-3"
                          >
                            <div>
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-mono font-bold text-[#3066BE]">{p.projectNumber}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'UNDER_REVIEW'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-amber-100 text-amber-800'
                                  }`}>
                                  {p.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <h4 className="font-bold text-xs text-slate-900 truncate">
                                {p.client?.businessName || p.client?.clientName || 'Client Project'}
                              </h4>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {p.serviceCategory?.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                                <span>Execution Progress</span>
                                <span className="font-mono text-[#3066BE]">{p.progressPercentage || 0}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#3066BE] to-[#119DA4] rounded-full transition-all"
                                  style={{ width: `${p.progressPercentage || 0}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Milestones: {completedMilestones}/{totalMilestones || 1}</span>
                                <span>Deliverables: {(p.deliverables || []).length}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                      No active technical projects currently in execution. Onboard a client and convert quotation to kickoff.
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* TAB 2: MY PROFILE & KYC */}
          {activeTab === 'profile' && <BgaProfileView />}

          {/* TAB 4: MY CLIENTS (Includes integrated client registration, directory, and full details) */}
          {(activeTab === 'clients' || activeTab === 'new-client') && (
            <div className="space-y-4">
              {/* MODE 1: REGISTER NEW CLIENT OR EDIT EXISTING CLIENT */}
              {(clientViewMode === 'add' || clientViewMode === 'edit') ? (
                <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                  {/* Back to Client List */}
                  <div className="mb-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setClientViewMode('list');
                        setClientFormError(null);
                        setEditingClient(null);
                      }}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to My Clients
                    </button>
                    <span className="text-xs font-semibold text-slate-400">
                      {clientViewMode === 'edit' ? 'Mode: Client Record Modification' : 'Step: Client Onboarding'}
                    </span>
                  </div>

                  <div className="border-b border-slate-100 pb-4 mb-6">
                    {clientViewMode === 'edit' ? (
                      <>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-2">
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                          Edit Client Record • ID: {editingClient?.id}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">
                          Edit Client — {editingClient?.clientName}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Modify business details, address, expected budget, and client requirements. Client ownership is strictly locked to your portfolio.
                        </p>
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                          <span className="text-slate-600">
                            Associate Owner: <strong className="text-slate-900">{user?.name} (You)</strong>
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Protected Client Lock
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-[#119DA4] border border-[#119DA4]/20 mb-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#119DA4]" />
                          Exclusive Ownership Guarantee
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Register a New Client</h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Once registered, this client is strictly assigned to your associate account. Our system automatically checks normalized phone and email to prevent duplicate claims across all associates.
                        </p>
                      </>
                    )}
                  </div>

                  {clientFormError && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">
                          {clientViewMode === 'edit' ? 'Update Blocked:' : 'Registration Blocked:'}
                        </strong>
                        <span>{clientFormError}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmitClientForm} onKeyDown={handleFormKeyDown} className="space-y-6 text-xs">
                    {/* SECTION 1: Client & Company Information */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#119DA4]" />
                        1. Client & Company Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Client Contact Name *</label>
                          <input
                            type="text"
                            required
                            value={clientForm.clientName}
                            onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                            placeholder="e.g. Anand Mahindra"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE]"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Business / Company Name *</label>
                          <input
                            type="text"
                            required
                            value={clientForm.businessName}
                            onChange={(e) => setClientForm({ ...clientForm, businessName: e.target.value })}
                            placeholder="e.g. Apex Global Logistics Pvt Ltd"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE]"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Mobile Number (10 Digits) *</label>
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            inputMode="numeric"
                            pattern="[6-9][0-9]{9}"
                            value={clientForm.mobile}
                            onChange={(e) => {
                              let clean = e.target.value.replace(/\D/g, '');
                              if (clean.length > 10 && clean.startsWith('91')) clean = clean.slice(2);
                              else if (clean.length > 10 && clean.startsWith('0')) clean = clean.slice(1);
                              setClientForm({ ...clientForm, mobile: clean.slice(0, 10) });
                            }}
                            placeholder="9876543210 (10 digits)"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                          <input
                            type="email"
                            required
                            value={clientForm.email}
                            onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                            placeholder="client@company.com"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE]"
                          />
                        </div>
                        <div className={clientForm.businessCategory === 'Other' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                          <label className="block text-slate-700 font-semibold mb-1">Business Category *</label>
                          <select
                            required
                            value={clientForm.businessCategory}
                            onChange={(e) => setClientForm({ ...clientForm, businessCategory: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE] bg-white"
                          >
                            {BUSINESS_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                        {clientForm.businessCategory === 'Other' && (
                          <div className="sm:col-span-1">
                            <label className="block text-slate-700 font-semibold mb-1">
                              Enter Business Category *
                            </label>
                            <input
                              type="text"
                              required
                              value={clientForm.otherCategory}
                              onChange={(e) => setClientForm({ ...clientForm, otherCategory: e.target.value })}
                              placeholder="e.g. Agriculture, Energy, Legal..."
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE]"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: Complete Business Address */}
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#119DA4]" />
                        2. Business Address
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Address Line 1 *</label>
                          <input
                            type="text"
                            required
                            value={clientForm.addressLine1}
                            onChange={(e) => setClientForm({ ...clientForm, addressLine1: e.target.value })}
                            placeholder="Building, Suite, Floor or Street Address"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE]"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">
                            Address Line 2 <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={clientForm.addressLine2}
                            onChange={(e) => setClientForm({ ...clientForm, addressLine2: e.target.value })}
                            placeholder="Area, Landmark or Additional Details"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE]"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">City *</label>
                            <input
                              type="text"
                              required
                              value={clientForm.city}
                              onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                              placeholder="e.g. Mumbai"
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE]"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">State *</label>
                            <input
                              type="text"
                              required
                              value={clientForm.state}
                              onChange={(e) => setClientForm({ ...clientForm, state: e.target.value })}
                              placeholder="e.g. Maharashtra"
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE]"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">PIN / Postal Code *</label>
                            <input
                              type="text"
                              required
                              maxLength={6}
                              inputMode="numeric"
                              pattern="[0-9]{6}"
                              value={clientForm.pinCode}
                              onChange={(e) => setClientForm({ ...clientForm, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                              placeholder="e.g. 400001 (6 digits)"
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE] font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Country *</label>
                            <input
                              type="text"
                              required
                              value={clientForm.country}
                              onChange={(e) => setClientForm({ ...clientForm, country: e.target.value })}
                              placeholder="India"
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3066BE] focus:border-[#3066BE]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: Initial Enquiry Details (Optional) */}
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#119DA4]" />
                        3. Initial Enquiry Details <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Primary Required Service</label>
                          <select
                            value={clientForm.requiredService}
                            onChange={(e) => setClientForm({ ...clientForm, requiredService: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                          >
                            <option value="DIGITAL_MARKETING">Digital Marketing (SEO, Ads, SMM)</option>
                            <option value="WEBSITE_DEVELOPMENT">Website Development</option>
                            <option value="MOBILE_APPLICATION_DEVELOPMENT">Mobile Application</option>
                            <option value="SOFTWARE_DEVELOPMENT">Custom Software / ERP / CRM</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Expected Budget (₹)</label>
                          <input
                            type="number"
                            value={clientForm.expectedBudget}
                            onChange={(e) => setClientForm({ ...clientForm, expectedBudget: e.target.value })}
                            placeholder="e.g. 50000"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="block text-slate-700 font-semibold mb-1">Client Scope & Requirements</label>
                        <textarea
                          rows={2}
                          value={clientForm.clientRequirements}
                          onChange={(e) => setClientForm({ ...clientForm, clientRequirements: e.target.value })}
                          placeholder="Describe what the client is looking to build or market..."
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Initial Discussion Notes</label>
                          <input
                            type="text"
                            value={clientForm.discussionNotes}
                            onChange={(e) => setClientForm({ ...clientForm, discussionNotes: e.target.value })}
                            placeholder="Met CEO on Monday, interested in launching next month"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Next Follow-Up Date</label>
                          <input
                            type="date"
                            value={clientForm.followUpDate}
                            onChange={(e) => setClientForm({ ...clientForm, followUpDate: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* FORM ACTIONS */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setClientViewMode('list');
                          setClientFormError(null);
                          setEditingClient(null);
                        }}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingClient}
                        className={`px-6 py-2.5 text-white font-bold rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2 cursor-pointer ${clientViewMode === 'edit'
                          ? 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50'
                          : 'bg-[#3066BE] hover:bg-[#255299] disabled:opacity-50'
                          }`}
                      >
                        {submittingClient ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            {clientViewMode === 'edit' ? 'Saving Changes...' : 'Registering Client...'}
                          </>
                        ) : clientViewMode === 'edit' ? (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Register Client & Submit Enquiry
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : clientViewMode === 'detail' ? (
                /* UNIFIED CLIENT WORKSPACE (Sections A, B, C, D/E, F) */
                <div className="space-y-6">
                  {/* Workspace Header Bar */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setClientViewMode('list');
                          setActiveClientDetail(null);
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0 mt-0.5 flex items-center justify-center"
                        title="Back to Clients"
                        aria-label="Back to Clients"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-lg font-bold text-slate-900">
                            {activeClientDetail?.clientName || 'Client Workspace'}
                          </h2>
                          {activeClientDetail && (
                            <>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#119DA4] border border-[#119DA4]/20">
                                {activeClientDetail.status || 'ACTIVE'}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {activeClientDetail.businessCategory}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {activeClientDetail?.businessName} • Unified Client & Quotation Pipeline Workspace
                        </p>
                      </div>
                    </div>

                    {activeClientDetail && (
                      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenEditClient(activeClientDetail)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-200"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Client
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActivityModal({
                              clientId: activeClientDetail.id,
                              clientName: activeClientDetail.clientName,
                            })
                          }
                          className="px-3.5 py-1.5 bg-teal-50 hover:bg-[#80DED9]/20 text-[#119DA4] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-[#119DA4]/20"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          + Log Activity
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNewEnquiryModal({
                              clientId: activeClientDetail.id,
                              clientName: activeClientDetail.clientName,
                            })
                          }
                          className="px-4 py-1.5 bg-[#3066BE] hover:bg-[#255299] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Request
                        </button>
                      </div>
                    )}
                  </div>

                  {loadingClientDetail ? (
                    <div className="space-y-4">
                      <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center shadow-sm">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#119DA4] mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">Loading complete client workspace...</p>
                      </div>
                    </div>
                  ) : !activeClientDetail ? (
                    <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center shadow-sm">
                      <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                      <h3 className="text-sm font-bold text-slate-800">Unable to load client details</h3>
                      <button
                        onClick={() => setClientViewMode('list')}
                        className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                      >
                        Back to Clients
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* SECTION A: CLIENT INFORMATION */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#119DA4]" />
                            Section A — Registered Client Information & Profile
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleOpenEditClient(activeClientDetail)}
                            className="text-xs text-[#3066BE] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Record
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* Col 1: Contact & Owner */}
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Contact & Identity
                            </span>
                            <div>
                              <span className="text-[11px] text-slate-500 block">Client Contact</span>
                              <strong className="text-sm text-slate-900">{activeClientDetail.clientName}</strong>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block">Direct Mobile</span>
                              <a
                                href={`tel:${activeClientDetail.mobile}`}
                                className="font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Phone className="w-3 h-3 text-slate-400" />
                                {activeClientDetail.mobile}
                              </a>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block">Email Address</span>
                              <a
                                href={`mailto:${activeClientDetail.email}`}
                                className="font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5 truncate"
                              >
                                <Mail className="w-3 h-3 text-slate-400" />
                                {activeClientDetail.email}
                              </a>
                            </div>
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Ownership</span>
                              <span className="text-xs font-bold text-[#119DA4] flex items-center gap-1 mt-0.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#119DA4]" />
                                Assigned to You ({user?.name || 'Associate'})
                              </span>
                            </div>
                          </div>

                          {/* Col 2: Business & Service Details */}
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Business Profile
                            </span>
                            <div>
                              <span className="text-[11px] text-slate-500 block">Company / Business Name</span>
                              <strong className="text-sm text-slate-900">{activeClientDetail.businessName}</strong>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block">Business Category</span>
                              <span className="font-bold text-slate-800">{activeClientDetail.businessCategory}</span>
                            </div>
                            {(() => {
                              const latestEnq = activeClientDetail.enquiries && activeClientDetail.enquiries.length > 0
                                ? activeClientDetail.enquiries[0]
                                : null;
                              const service = activeClientDetail.requiredService || latestEnq?.serviceCategory;
                              const budget = activeClientDetail.expectedBudget ?? latestEnq?.expectedBudget;
                              return (
                                <>
                                  <div>
                                    <span className="text-[11px] text-slate-500 block">Required Service</span>
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block mt-0.5">
                                      {service ? String(service).replace(/_/g, ' ') : 'General Enquiry'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[11px] text-slate-500 block">Expected Budget</span>
                                    <strong className="text-sm font-extrabold text-slate-900">
                                      {budget !== undefined && budget !== null && Number(budget) > 0
                                        ? `₹${Number(budget).toLocaleString('en-IN')}`
                                        : 'Not specified'}
                                    </strong>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* Col 3: Complete Structured Address */}
                          {(() => {
                            const addr = activeClientDetail.address || {};
                            return (
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Business Location & Address
                                </span>
                                <div>
                                  <span className="text-[11px] text-slate-500 block">Address Line 1</span>
                                  <strong className="text-xs text-slate-800">
                                    {addr.addressLine1 || activeClientDetail.addressLine1 || '—'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-[11px] text-slate-500 block">Address Line 2</span>
                                  <span className="text-xs text-slate-700">
                                    {addr.addressLine2 || activeClientDetail.addressLine2 || '—'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[11px] text-slate-500 block">City</span>
                                    <span className="text-xs font-bold text-slate-800">
                                      {addr.city || activeClientDetail.city || '—'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[11px] text-slate-500 block">State</span>
                                    <span className="text-xs font-bold text-slate-800">
                                      {addr.state || activeClientDetail.state || '—'}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[11px] text-slate-500 block">PIN / Postal Code</span>
                                  <span className="text-xs font-mono font-bold text-slate-800">
                                    {addr.pinCode || activeClientDetail.pinCode || '—'} ({addr.country || 'India'})
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Additional Notes & Scope */}
                        {(() => {
                          const latestEnq = activeClientDetail.enquiries && activeClientDetail.enquiries.length > 0
                            ? activeClientDetail.enquiries[0]
                            : null;
                          const reqs = activeClientDetail.clientRequirements || latestEnq?.requirements;
                          const notes = activeClientDetail.discussionNotes || latestEnq?.discussionNotes;
                          const followDate = activeClientDetail.followUpDate || latestEnq?.followUpDate;
                          if (!reqs && !notes && !followDate) return null;
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                              {reqs && (
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                    Initial Client Scope & Requirements
                                  </span>
                                  <p className="text-slate-700 whitespace-pre-wrap">
                                    {reqs}
                                  </p>
                                </div>
                              )}
                              {notes && (
                                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                                  <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">
                                    Discussion Notes
                                  </span>
                                  <p className="text-slate-700 whitespace-pre-wrap">
                                    {notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* SECTION B: CONTACT AND FOLLOW-UP HISTORY */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-[#119DA4]" />
                              Section B — Contact & Follow-up History
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Chronological record of phone calls, WhatsApp messages, emails, and meetings.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setActivityModal({
                                clientId: activeClientDetail.id,
                                clientName: activeClientDetail.clientName,
                              })
                            }
                            className="px-3.5 py-1.5 bg-[#3066BE] hover:bg-[#255299] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + Log Contact Activity
                          </button>
                        </div>

                        {!activeClientDetail.contactActivities || activeClientDetail.contactActivities.length === 0 ? (
                          <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                            <Phone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="font-semibold text-slate-700">No contact activities recorded yet.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Click &quot;+ Log Contact Activity&quot; to log follow-up calls, client chats, and scheduled meetings.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {activeClientDetail.contactActivities.map((act: any) => {
                              const outcomeColor =
                                act.outcome === 'CONNECTED' || act.outcome === 'CLOSED_WON'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : act.outcome === 'QUOTATION_REQUESTED' || act.outcome === 'INTERESTED'
                                    ? 'bg-teal-50 text-[#119DA4] border-[#119DA4]/20'
                                    : act.outcome === 'SCHEDULED_CALLBACK'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200';

                              return (
                                <div
                                  key={act.id}
                                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors space-y-2 text-xs"
                                >
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#3066BE]/10 text-[#3066BE] border border-[#3066BE]/20 flex items-center gap-1">
                                        {act.contactMethod === 'CALL' && <Phone className="w-3 h-3" />}
                                        {act.contactMethod === 'WHATSAPP' && <MessageSquare className="w-3 h-3" />}
                                        {act.contactMethod === 'EMAIL' && <Mail className="w-3 h-3" />}
                                        {act.contactMethod === 'MEETING' && <Users className="w-3 h-3" />}
                                        {act.contactMethod}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${outcomeColor}`}
                                      >
                                        {act.outcome?.replace(/_/g, ' ') || 'LOGGED'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      {new Date(act.createdAt).toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                      })}
                                    </div>
                                  </div>

                                  <p className="text-slate-800 font-medium whitespace-pre-wrap">
                                    {act.discussionSummary}
                                  </p>

                                  {act.followUpNotes && (
                                    <div className="text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60 text-[11px]">
                                      <strong>Notes:</strong> {act.followUpNotes}
                                    </div>
                                  )}

                                  {act.nextFollowUpDate && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-[#119DA4] font-semibold pt-1">
                                      <Clock className="w-3.5 h-3.5 text-[#119DA4]" />
                                      Next Scheduled Follow-up:{' '}
                                      <span className="font-bold">
                                        {new Date(act.nextFollowUpDate).toLocaleDateString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* SECTION C & D: ENQUIRIES AND SERVICE REQUESTS */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <FileCheck className="w-4 h-4 text-[#119DA4]" />
                              Section C & D — Enquiries, Quotations & End-to-End Pipeline
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Track service requests from submission through quotation approval, client acceptance, and project execution.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setNewEnquiryModal({
                                clientId: activeClientDetail.id,
                                clientName: activeClientDetail.clientName,
                              })
                            }
                            className="px-3.5 py-1.5 bg-[#3066BE] hover:bg-[#255299] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Service Request
                          </button>
                        </div>

                        {!activeClientDetail.enquiries || activeClientDetail.enquiries.length === 0 ? (
                          <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="font-semibold text-slate-700">No enquiries submitted for this client yet.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Click &quot;Add Service Request&quot; above to submit project requirements for Admin review.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {activeClientDetail.enquiries.map((enq: any) => {
                              const relatedQuote =
                                enq.quotations && enq.quotations.length > 0 ? enq.quotations[0] : null;
                              const relatedWorkOrder = relatedQuote?.workOrder || null;
                              const relatedProject = relatedWorkOrder?.project || null;

                              const isSubmitted = true;
                              const isAdminApproved = enq.status === 'APPROVED';

                              const isQuoteApproved =
                                relatedQuote?.status === 'ADMIN_APPROVED' ||
                                relatedQuote?.status === 'SENT_TO_BGA' ||
                                relatedQuote?.status === 'ACCEPTED' ||
                                relatedQuote?.adminApprovalStatus === 'APPROVED';

                              const isQuotePendingAdmin =
                                relatedQuote?.status === 'PENDING_ADMIN_APPROVAL' ||
                                (relatedQuote?.adminApprovalStatus === 'PENDING' && Boolean(relatedQuote?.preparedById));

                              const isQuoteAwaitingAccounts =
                                relatedQuote?.status === 'REQUESTED' ||
                                relatedQuote?.status === 'REVISION_REQUESTED' ||
                                (Boolean(relatedQuote) && !relatedQuote?.preparedById && relatedQuote?.adminApprovalStatus === 'PENDING');

                              const isQuoteAccepted = relatedQuote?.status === 'ACCEPTED';
                              const isAdvanceVerified = Boolean(relatedWorkOrder?.advanceVerified);
                              const isProjectCompleted = relatedProject?.status === 'COMPLETED';

                              return (
                                <div
                                  key={enq.id}
                                  className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4 text-xs"
                                >
                                  {/* Top Request Info */}
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-slate-700 text-xs">{enq.id}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          {enq.serviceCategory?.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-slate-400 block mt-0.5">
                                        Submitted on {new Date(enq.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${enq.status === 'APPROVED'
                                          ? 'bg-emerald-50 text-[#119DA4] border-[#119DA4]/20'
                                          : enq.status === 'CHANGES_REQUESTED'
                                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                                            : enq.status === 'SUBMITTED'
                                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                                              : 'bg-red-50 text-red-700 border-red-200'
                                          }`}
                                      >
                                        Admin: {enq.status}
                                      </span>
                                      {enq.expectedBudget && (
                                        <span className="text-xs font-bold text-slate-900">
                                          Budget: ₹{Number(enq.expectedBudget).toLocaleString('en-IN')}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Scope & Requirements */}
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Scope & Client Requirements
                                    </span>
                                    <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                                      {enq.requirements}
                                    </p>
                                    {enq.adminNotes && (
                                      <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${enq.status === 'REJECTED'
                                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                                        : 'bg-amber-50 border-amber-200 text-amber-900'
                                        }`}>
                                        <div>
                                          <strong className="block font-bold">
                                            {enq.status === 'REJECTED' ? '⚠️ Management Rejection Reason:' : 'Management Review Remarks:'}
                                          </strong>
                                          <span className="mt-0.5 block text-slate-800">{enq.adminNotes}</span>
                                        </div>
                                        {enq.status === 'CHANGES_REQUESTED' && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenFollowUpModal(enq, false)}
                                            className="px-3 py-1.5 bg-[#3066BE] hover:bg-[#255299] text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Record Follow-up
                                          </button>
                                        )}
                                        {enq.status === 'REJECTED' && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenFollowUpModal(enq, true)}
                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                          >
                                            <Phone className="w-3.5 h-3.5" />
                                            Inform Client & Log Follow-up
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {enq.discussionNotes && (
                                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                                        <div className="flex items-center justify-between font-bold text-emerald-900 border-b border-emerald-200/60 pb-1">
                                          <span className="flex items-center gap-1.5">
                                            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                                            Client Consultation & Follow-up History:
                                          </span>
                                          {(() => {
                                            const match = enq.discussionNotes?.match(/^\[(.*?)\]/);
                                            const consultDate = match ? match[1] : enq.followUpDate ? new Date(enq.followUpDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null;
                                            return consultDate ? (
                                              <span className="text-[10px] font-mono font-normal text-emerald-800">
                                                Consulted: {consultDate}
                                              </span>
                                            ) : null;
                                          })()}
                                        </div>
                                        <p className="whitespace-pre-wrap font-medium text-emerald-950 pl-5 leading-relaxed">
                                          {enq.discussionNotes}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* 6-Step Multi-Stage Pipeline Stepper */}
                                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                      End-to-End Workflow Pipeline Progress
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                      {/* Stage 1 */}
                                      <div
                                        className={`p-2 rounded-lg text-center border ${isSubmitted
                                          ? 'bg-emerald-50 border-emerald-200 text-[#119DA4]'
                                          : 'bg-white border-slate-200 text-slate-400'
                                          }`}
                                      >
                                        <span className="block text-[10px] font-bold">1. Submitted</span>
                                        <span className="text-[10px]">{isSubmitted ? '✓ Complete' : 'Pending'}</span>
                                      </div>
                                      {/* Stage 2 */}
                                      <div
                                        className={`p-2 rounded-lg text-center border ${isAdminApproved
                                          ? 'bg-emerald-50 border-emerald-200 text-[#119DA4]'
                                          : enq.status === 'SUBMITTED'
                                            ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                                            : 'bg-white border-slate-200 text-slate-400'
                                          }`}
                                      >
                                        <span className="block text-[10px] font-bold">2. Admin Review</span>
                                        <span className="text-[10px]">{enq.status}</span>
                                      </div>
                                      {/* Stage 3 */}
                                      <div
                                        className={`p-2 rounded-lg text-center border ${isQuoteApproved
                                          ? 'bg-emerald-50 border-emerald-200 text-[#119DA4]'
                                          : isQuotePendingAdmin
                                            ? 'bg-purple-50 border-purple-200 text-purple-700 animate-pulse'
                                            : isQuoteAwaitingAccounts
                                              ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                                              : isAdminApproved
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : 'bg-white border-slate-200 text-slate-400'
                                          }`}
                                      >
                                        <span className="block text-[10px] font-bold">3. Quotation</span>
                                        <span className="text-[10px]">
                                          {isQuoteApproved
                                            ? 'Issued'
                                            : isQuotePendingAdmin
                                              ? 'Admin Review'
                                              : isQuoteAwaitingAccounts
                                                ? 'Accounts Preparing'
                                                : isAdminApproved
                                                  ? 'Ready to Request'
                                                  : 'Pending'}
                                        </span>
                                      </div>
                                      {/* Stage 4 */}
                                      <div
                                        className={`p-2 rounded-lg text-center border ${isQuoteAccepted
                                          ? 'bg-emerald-50 border-emerald-200 text-[#119DA4]'
                                          : isQuoteApproved
                                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                                            : 'bg-white border-slate-200 text-slate-400'
                                          }`}
                                      >
                                        <span className="block text-[10px] font-bold">4. Client Decision</span>
                                        <span className="text-[10px]">
                                          {isQuoteAccepted
                                            ? 'Accepted'
                                            : isQuoteApproved
                                              ? 'Decision Pending'
                                              : isQuoteAwaitingAccounts || isQuotePendingAdmin
                                                ? 'Awaiting Quote'
                                                : 'Pending'}
                                        </span>
                                      </div>
                                      {/* Stage 5 */}
                                      <div
                                        className={`p-2 rounded-lg text-center border ${isAdvanceVerified
                                          ? 'bg-emerald-50 border-emerald-200 text-[#119DA4]'
                                          : isQuoteAccepted
                                            ? 'bg-purple-50 border-purple-200 text-purple-700'
                                            : 'bg-white border-slate-200 text-slate-400'
                                          }`}
                                      >
                                        <span className="block text-[10px] font-bold">5. Work Order</span>
                                        <span className="text-[10px]">
                                          {isAdvanceVerified ? 'Advance Verified' : isQuoteAccepted ? 'Awaiting Advance' : 'Pending'}
                                        </span>
                                      </div>
                                      {/* Stage 6 */}
                                      <div
                                        className={`p-2 rounded-lg text-center border ${isProjectCompleted
                                          ? 'bg-emerald-50 border-emerald-200 text-[#119DA4]'
                                          : relatedProject
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'bg-white border-slate-200 text-slate-400'
                                          }`}
                                      >
                                        <span className="block text-[10px] font-bold">6. Execution</span>
                                        <span className="text-[10px]">
                                          {isProjectCompleted
                                            ? 'Completed'
                                            : relatedProject
                                              ? `${relatedProject.progressPercentage || 0}% Done`
                                              : 'Not Started'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Quotation & Action Controls */}
                                  <div className="pt-2 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                                    {!relatedQuote ? (
                                      isAdminApproved ? (
                                        <button
                                          type="button"
                                          onClick={() => handleRequestQuotation(enq.id)}
                                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                        >
                                          <Send className="w-3.5 h-3.5" />
                                          Request Quotation from Accounts
                                        </button>
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">
                                          Awaiting Admin approval before quotation request.
                                        </span>
                                      )
                                    ) : (
                                      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <strong className="text-slate-900 font-mono">
                                              {relatedQuote.quotationNumber}
                                            </strong>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200">
                                              ₹{(relatedQuote.totalAmount || 0).toLocaleString('en-IN')}
                                            </span>
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isQuoteAccepted
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : isQuoteApproved
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : isQuotePendingAdmin
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-amber-100 text-amber-800'
                                                }`}
                                            >
                                              {isQuoteAccepted
                                                ? 'ACCEPTED BY CLIENT'
                                                : isQuoteApproved
                                                  ? 'APPROVED & ISSUED'
                                                  : isQuotePendingAdmin
                                                    ? 'PREPARED • AWAITING ADMIN SIGN-OFF'
                                                    : 'AWAITING ACCOUNTS PREPARATION'}
                                            </span>
                                            {relatedQuote.reminderCount > 0 && (
                                              <span className="text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded font-bold border border-red-200 flex items-center gap-1">
                                                <Bell className="w-3 h-3 text-red-600" /> {relatedQuote.reminderCount} Reminder(s)
                                              </span>
                                            )}
                                          </div>
                                          {!isQuoteApproved && (
                                            <p className="text-[11px] text-amber-800 mt-1.5 flex items-center gap-1.5">
                                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                                              <span>
                                                {isQuotePendingAdmin
                                                  ? 'Accounts has finalized the commercial quotation. Currently undergoing Admin executive review before release.'
                                                  : 'Accounts Department is actively preparing the official commercial quotation. Official PDF & client acceptance will unlock once approved.'}
                                              </span>
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                          {isQuoteApproved ? (
                                            <>
                                              <a
                                                href={getQuotationPdfUrl(relatedQuote.id)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-bold text-xs flex items-center gap-1"
                                              >
                                                <Eye className="w-3.5 h-3.5" />
                                                View Quote PDF
                                              </a>

                                              {relatedQuote.status !== 'ACCEPTED' && (
                                                <>
                                                  <button
                                                    type="button"
                                                    disabled={sendingReminderId === relatedQuote.id}
                                                    onClick={() => handleSendReminder(relatedQuote.id)}
                                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-amber-700 border border-amber-200 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                    title="Send reminder notification to Accounts & Admin"
                                                  >
                                                    {sendingReminderId === relatedQuote.id ? (
                                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                      <Bell className="w-3.5 h-3.5" />
                                                    )}
                                                    {sendingReminderId === relatedQuote.id ? 'Sending...' : 'Reminder'}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setRevisionModal({
                                                        quotationId: relatedQuote.id,
                                                        quotationNumber: relatedQuote.quotationNumber,
                                                      })
                                                    }
                                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 rounded-lg font-bold text-xs flex items-center gap-1"
                                                    title="Request commercial revision"
                                                  >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    Revision
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setAcceptanceModal({
                                                        quotationId: relatedQuote.id,
                                                        quotationNumber: relatedQuote.quotationNumber,
                                                      })
                                                    }
                                                    className="px-3.5 py-1 bg-[#119DA4] hover:bg-[#0e8389] text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                                                  >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Record Acceptance
                                                  </button>
                                                </>
                                              )}
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              disabled={sendingReminderId === relatedQuote.id}
                                              onClick={() => handleSendReminder(relatedQuote.id)}
                                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                                              title="Nudge Accounts & Admin to expedite quote preparation"
                                            >
                                              {sendingReminderId === relatedQuote.id ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                              ) : (
                                                <Bell className="w-3.5 h-3.5 text-amber-600" />
                                              )}
                                              {sendingReminderId === relatedQuote.id ? 'Sending...' : 'Nudge Accounts / Send Reminder'}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* SECTION F: UNIFIED CLIENT ACTIVITY TIMELINE */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-[#3066BE]" />
                              <h3 className="text-base font-bold text-slate-900">
                                Complete Client Lifecycle Activity Timeline
                              </h3>
                              {timelineData?.totalCount !== undefined && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3066BE]/10 text-[#3066BE]">
                                  {timelineData.totalCount} Events
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Chronological audit trail across onboarding, follow-ups, quotations, technical execution, communications, deliverables, payments, and commissions.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => loadClientTimeline(activeClientDetail.id)}
                              disabled={loadingTimeline}
                              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              title="Refresh activity timeline"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${loadingTimeline ? 'animate-spin text-[#3066BE]' : ''}`} />
                              <span>Refresh</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setUnifiedFollowUpModal({
                                  isOpen: true,
                                  initialContext: 'GENERAL',
                                })
                              }
                              className="px-3.5 py-1.5 bg-[#3066BE] hover:bg-[#204b8c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Log Activity / Follow-up</span>
                            </button>
                          </div>
                        </div>

                        {/* UPCOMING FOLLOW-UPS BANNER */}
                        {timelineData?.upcomingFollowUps && timelineData.upcomingFollowUps.length > 0 && (
                          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-amber-700" />
                                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                  Upcoming Actions & Promised Deadlines ({timelineData.upcomingFollowUps.length})
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                                Pending Follow-up
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {timelineData.upcomingFollowUps.map((up: any) => {
                                const isPayment = up.type === 'PAYMENT_EXPECTED';
                                const isEnquiry = up.type === 'ENQUIRY_FOLLOW_UP';
                                const isQuote = up.type === 'QUOTATION_DECISION_PENDING';
                                return (
                                  <div
                                    key={up.id}
                                    className="bg-white p-3 rounded-xl border border-amber-200/80 flex items-start justify-between gap-3 shadow-xs"
                                  >
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${isPayment ? 'bg-emerald-500' : isQuote ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                        <h4 className="text-xs font-bold text-slate-900 truncate">{up.title}</h4>
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                        <span className="font-semibold text-amber-800">
                                          Due: {new Date(up.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        {up.status && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600">
                                            {up.status.replace(/_/g, ' ')}
                                          </span>
                                        )}
                                      </div>
                                      {up.notes && (
                                        <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                                          "{up.notes}"
                                        </p>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setUnifiedFollowUpModal({
                                          isOpen: true,
                                          initialContext: isPayment ? 'FINAL_PAYMENT' : isQuote ? 'QUOTATION' : isEnquiry ? 'ENQUIRY' : 'GENERAL',
                                          initialTargetId: up.referenceNumber || undefined,
                                        })
                                      }
                                      className="shrink-0 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                                    >
                                      Act Now
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* CATEGORY FILTER PILLS & SEARCH BAR */}
                        <div className="space-y-2.5">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                            {/* Search */}
                            <div className="relative flex-1 max-w-sm">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={timelineSearchQuery}
                                onChange={(e) => setTimelineSearchQuery(e.target.value)}
                                placeholder="Search timeline events, authors, references..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE] outline-hidden transition-all"
                              />
                              {timelineSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setTimelineSearchQuery('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Active filter indicator */}
                            <div className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                              <Filter className="w-3.5 h-3.5 text-slate-400" />
                              <span>Filter by category:</span>
                            </div>
                          </div>

                          {/* Filter Tabs */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                            {[
                              { id: 'ALL', label: 'All Activities' },
                              { id: 'FOLLOW_UP', label: 'Follow-ups' },
                              { id: 'ENQUIRY', label: 'Enquiries' },
                              { id: 'QUOTATION', label: 'Quotations' },
                              { id: 'WORK_ORDER', label: 'Work Orders' },
                              { id: 'TECHNICAL', label: 'Projects' },
                              { id: 'COMMUNICATION', label: 'Communication' },
                              { id: 'DELIVERABLE', label: 'Deliverables' },
                              { id: 'PAYMENT', label: 'Payments' },
                              { id: 'COMMISSION', label: 'Commissions' },
                            ].map((tab) => {
                              const active = timelineCategoryFilter === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setTimelineCategoryFilter(tab.id)}
                                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${active
                                    ? 'bg-[#3066BE] text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                                >
                                  {tab.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* TIMELINE LIST */}
                        {loadingTimeline ? (
                          <div className="py-12 text-center space-y-3">
                            <RefreshCw className="w-6 h-6 animate-spin text-[#3066BE] mx-auto" />
                            <p className="text-xs text-slate-500 font-medium">Loading verified client lifecycle activity history...</p>
                          </div>
                        ) : (() => {
                          const rawEvents = timelineData?.events || [];
                          const filteredEvents = rawEvents.filter((ev: any) => {
                            if (timelineCategoryFilter !== 'ALL' && ev.category !== timelineCategoryFilter) {
                              return false;
                            }
                            if (timelineSearchQuery.trim()) {
                              const q = timelineSearchQuery.toLowerCase();
                              const matchTitle = (ev.title || '').toLowerCase().includes(q);
                              const matchDesc = (ev.description || '').toLowerCase().includes(q);
                              const matchAuthor = (ev.authorName || '').toLowerCase().includes(q);
                              const matchSource = (ev.sourceType || '').toLowerCase().includes(q);
                              if (!matchTitle && !matchDesc && !matchAuthor && !matchSource) {
                                return false;
                              }
                            }
                            return true;
                          });

                          if (filteredEvents.length === 0) {
                            return (
                              <div className="py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                                <h4 className="text-xs font-bold text-slate-700">No events found in this view</h4>
                                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                                  {timelineSearchQuery
                                    ? 'Try clearing the search query or selecting a different category filter.'
                                    : 'Log the first interaction or consultation with this client to begin the activity trail.'}
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 pt-2">
                              {filteredEvents.map((ev: any) => {
                                const isDeliverable = ev.category === 'DELIVERABLE';
                                const isCommunication = ev.category === 'COMMUNICATION';
                                const hasReplies = ev.replies && ev.replies.length > 0;

                                let EventIcon = Clock;
                                if (ev.category === 'ONBOARDING') EventIcon = UserPlus;
                                else if (ev.category === 'FOLLOW_UP') EventIcon = Phone;
                                else if (ev.category === 'ENQUIRY') EventIcon = FileText;
                                else if (ev.category === 'QUOTATION') EventIcon = CreditCard;
                                else if (ev.category === 'WORK_ORDER') EventIcon = Briefcase;
                                else if (ev.category === 'TECHNICAL') EventIcon = Code2;
                                else if (ev.category === 'COMMUNICATION') EventIcon = MessageSquare;
                                else if (ev.category === 'DELIVERABLE') EventIcon = Download;
                                else if (ev.category === 'PAYMENT') EventIcon = DollarSign;
                                else if (ev.category === 'COMMISSION') EventIcon = TrendingUp;

                                return (
                                  <div key={ev.id} className="relative group">
                                    {/* Timeline Marker Dot */}
                                    <span className="absolute -left-[31px] top-1 p-1 bg-white rounded-full border border-slate-300 text-[#3066BE] shadow-xs group-hover:border-[#3066BE] group-hover:scale-110 transition-all">
                                      <EventIcon className="w-3.5 h-3.5" />
                                    </span>

                                    {/* Main Event Card */}
                                    <div className="bg-slate-50/80 hover:bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs transition-colors shadow-xs">
                                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-slate-200/50 pb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <strong className="text-slate-900 font-bold text-xs">{ev.title}</strong>
                                          {ev.badgeLabel && (
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${ev.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                              {ev.badgeLabel}
                                            </span>
                                          )}
                                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                                            [{ev.category}]
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0">
                                          {ev.authorName && (
                                            <span className="font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                                              {ev.authorName} ({ev.authorRole || 'SYSTEM'})
                                            </span>
                                          )}
                                          <span>
                                            {new Date(ev.timestamp).toLocaleString('en-IN', {
                                              dateStyle: 'medium',
                                              timeStyle: 'short',
                                            })}
                                          </span>
                                        </div>
                                      </div>

                                      <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-line">
                                        {ev.description}
                                      </p>

                                      {/* SPECIALIZED RENDER: DELIVERABLES */}
                                      {isDeliverable && ev.metadata?.fileUrl && (
                                        <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700 shrink-0">
                                              <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                              <h5 className="text-xs font-bold text-slate-900 truncate">
                                                {ev.metadata.fileName || 'Project Deliverable'}
                                              </h5>
                                              <p className="text-[10px] text-slate-500">
                                                v{ev.metadata.version || 1} • {ev.metadata.fileType || 'Asset'}
                                                {ev.metadata.clientVisible ? ' • Shared with Client' : ' • Internal Draft'}
                                              </p>
                                            </div>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => downloadFile(ev.metadata.fileUrl, ev.metadata.fileName || 'deliverable')}
                                            className="shrink-0 px-3 py-1.5 bg-[#3066BE] hover:bg-[#204b8c] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Download</span>
                                          </button>
                                        </div>
                                      )}

                                      {/* SPECIALIZED RENDER: COMMUNICATION THREAD & REPLIES */}
                                      {isCommunication && (
                                        <div className="pt-2 space-y-2">
                                          {hasReplies && (
                                            <div className="pl-4 border-l-2 border-indigo-200 space-y-2 mt-2">
                                              {ev.replies.map((reply: any) => (
                                                <div key={reply.id} className="bg-white p-2.5 rounded-lg border border-indigo-100 text-xs space-y-1 shadow-2xs">
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="font-bold text-slate-900 text-[11px]">{reply.authorName}</span>
                                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700">
                                                        {reply.authorRole}
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                      {new Date(reply.timestamp).toLocaleString('en-IN', {
                                                        dateStyle: 'short',
                                                        timeStyle: 'short',
                                                      })}
                                                    </span>
                                                  </div>
                                                  <p className="text-slate-700 text-[11px] whitespace-pre-line">{reply.description}</p>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          <div className="flex justify-end pt-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setUnifiedFollowUpModal({
                                                  isOpen: true,
                                                  initialContext: 'PROJECT',
                                                  initialTargetId: ev.metadata?.projectId,
                                                })
                                              }
                                              className="px-2.5 py-1 text-indigo-700 hover:bg-indigo-50 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                            >
                                              <MessageSquare className="w-3 h-3" />
                                              <span>Reply to Discussion</span>
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* MODE 2: CLIENT PORTFOLIO DIRECTORY (Table & Main Listing) */
                <div className="space-y-4">
                  {/* Portfolio Header Bar */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">My Client Portfolio</h2>
                        {!clientsLoaded || tabLoading ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#119DA4] border border-emerald-200 flex items-center gap-1.5 animate-shimmer">
                            <RefreshCw className="w-3 h-3 animate-spin text-[#119DA4]" />
                            <span>Loading Portfolio...</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#119DA4]">
                            {clients.length} Registered
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Clients exclusively tied to your associate account. Click any client to view their unified workspace, follow-up history, and request pipeline.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenAddClient}
                      className="px-4 py-2 bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Client
                    </button>
                  </div>

                  {/* Success Alert Banner (Displayed right after successful client registration) */}
                  {clientFormSuccess && (
                    <div className="p-4 rounded-xl bg-teal-50 border border-[#119DA4]/20 text-[#119DA4] text-xs flex items-center justify-between gap-2 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-[#119DA4] shrink-0" />
                        <span className="font-semibold">{clientFormSuccess}</span>
                      </div>
                      <button
                        onClick={() => setClientFormSuccess(null)}
                        className="p-1 hover:bg-[#80DED9]/20 rounded text-[#119DA4]"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Multi-Filter and Sorting Toolbar */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
                    {/* Search */}
                    <div className="relative w-full lg:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search client, company, phone, email, city..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
                    </div>

                    {/* Filters & Sorting */}
                    <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
                      {/* Category Filter */}
                      <div className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          value={clientCategoryFilter}
                          onChange={(e) => setClientCategoryFilter(e.target.value)}
                          className="text-xs p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                        >
                          <option value="ALL">All Categories</option>
                          {BUSINESS_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Client Status Filter */}
                      <select
                        value={clientStatusFilter}
                        onChange={(e) => setClientStatusFilter(e.target.value)}
                        className="text-xs p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="LEAD">Lead</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>

                      {/* Follow-up Filter */}
                      <select
                        value={clientFollowUpFilter}
                        onChange={(e) => setClientFollowUpFilter(e.target.value as any)}
                        className="text-xs p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      >
                        <option value="ALL">All Follow-ups</option>
                        <option value="TODAY">Due Today</option>
                        <option value="UPCOMING">Upcoming</option>
                        <option value="OVERDUE">Overdue</option>
                        <option value="CONNECTED">Connected / Contacted</option>
                        <option value="NONE">No Pending Follow-up</option>
                      </select>

                      {/* Sort By */}
                      <select
                        value={clientSortBy}
                        onChange={(e) => setClientSortBy(e.target.value as any)}
                        className="text-xs p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      >
                        <option value="latest">Sort: Latest Activity</option>
                        <option value="newest">Sort: Registration (Newest)</option>
                        <option value="oldest">Sort: Registration (Oldest)</option>
                        <option value="name">Sort: Client Name (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  {/* Clients Listing Table */}
                  {!clientsLoaded || tabLoading ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-500 animate-shimmer">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                          <span className="font-semibold text-slate-700">Loading your exclusive client records...</span>
                        </div>
                        <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          100% Protected
                        </span>
                      </div>
                      <SkeletonTable rows={4} cols={7} />
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-base font-bold text-slate-800">No Clients Registered Yet</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                        Start building your exclusive client portfolio. Clients registered under your ID remain strictly assigned to you.
                      </p>
                      <button
                        onClick={handleOpenAddClient}
                        className="px-4 py-2 bg-[#3066BE] text-white rounded-lg text-xs font-bold hover:bg-[#255299] shadow-sm cursor-pointer"
                      >
                        + Add Your First Client
                      </button>
                    </div>
                  ) : (() => {
                    const filteredClients = clients
                      .filter((c) => {
                        const q = clientSearch.toLowerCase().trim();
                        const matchesSearch =
                          !q ||
                          c.clientName?.toLowerCase().includes(q) ||
                          c.businessName?.toLowerCase().includes(q) ||
                          c.mobile?.includes(q) ||
                          c.email?.toLowerCase().includes(q) ||
                          c.city?.toLowerCase().includes(q) ||
                          c.location?.toLowerCase().includes(q) ||
                          c.businessCategory?.toLowerCase().includes(q);

                        const matchesCategory =
                          clientCategoryFilter === 'ALL' ||
                          c.businessCategory === clientCategoryFilter ||
                          c.requiredService === clientCategoryFilter;

                        const matchesStatus =
                          clientStatusFilter === 'ALL' || c.status === clientStatusFilter;

                        const matchesFollowUp = isFollowUpMatching(c, clientFollowUpFilter);

                        return matchesSearch && matchesCategory && matchesStatus && matchesFollowUp;
                      })
                      .sort((a, b) => {
                        if (clientSortBy === 'name') {
                          return (a.clientName || '').localeCompare(b.clientName || '');
                        }
                        if (clientSortBy === 'oldest') {
                          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        }
                        if (clientSortBy === 'latest') {
                          const aDate = a.contactActivities?.[0]?.createdAt || a.updatedAt || a.createdAt;
                          const bDate = b.contactActivities?.[0]?.createdAt || b.updatedAt || b.createdAt;
                          return new Date(bDate).getTime() - new Date(aDate).getTime();
                        }
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      });

                    if (filteredClients.length === 0) {
                      return (
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
                          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-700">No clients match your filter criteria.</p>
                          <button
                            onClick={() => {
                              setClientSearch('');
                              setClientCategoryFilter('ALL');
                              setClientStatusFilter('ALL');
                              setClientFollowUpFilter('ALL');
                              setClientSortBy('latest');
                            }}
                            className="mt-3 text-xs text-[#119DA4] font-bold hover:underline"
                          >
                            Reset Search Filters
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="p-3.5">Client & Company</th>
                                <th className="p-3.5">Category & Service</th>
                                <th className="p-3.5">Contact & City</th>
                                <th className="p-3.5">Status & Follow-up</th>
                                <th className="p-3.5">Requests & Activity</th>
                                <th className="p-3.5">Registration</th>
                                <th className="p-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredClients.map((c) => {
                                let displayCity = c.city || '';
                                if (!displayCity && c.location) {
                                  try {
                                    if (c.location.startsWith('{')) {
                                      const p = JSON.parse(c.location);
                                      displayCity = p.city || p.displayLocation || '';
                                    } else {
                                      displayCity = c.location;
                                    }
                                  } catch {
                                    displayCity = c.location;
                                  }
                                }

                                const fuState = getClientFollowUpState(c);
                                const latestActivity = c.contactActivities?.[0] || null;
                                const latestEnq = c.enquiries?.[0] || null;

                                return (
                                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                    {/* 1. Client & Company */}
                                    <td className="p-3.5">
                                      <div className="font-bold text-slate-900 text-sm">{c.clientName}</div>
                                      <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                                        {c.businessName}
                                      </div>
                                    </td>

                                    {/* 2. Business Category & Service */}
                                    <td className="p-3.5">
                                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 block w-max">
                                        {c.businessCategory}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium block mt-1">
                                        {c.requiredService?.replace(/_/g, ' ') || 'General'}
                                      </span>
                                    </td>

                                    {/* 3. Mobile, Email & City */}
                                    <td className="p-3.5">
                                      <div className="text-slate-800 font-medium flex items-center gap-1.5">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span>{c.mobile}</span>
                                      </div>
                                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                                        <Mail className="w-3 h-3 text-slate-400" />
                                        <span className="truncate max-w-[150px]">{c.email}</span>
                                      </div>
                                      <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        <span>{displayCity || '—'}</span>
                                      </div>
                                    </td>

                                    {/* 4. Client Status & Next Follow-Up */}
                                    <td className="p-3.5">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#119DA4] border border-[#119DA4]/20 block w-max">
                                        {c.status || 'ACTIVE'}
                                      </span>
                                      {fuState.status === 'NONE' ? (
                                        <span className="text-[10px] text-slate-400 block mt-1">No follow-up set</span>
                                      ) : (
                                        <div
                                          className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded flex items-center gap-1 w-max ${fuState.badgeClass}`}
                                        >
                                          {fuState.iconType === 'phone' ? (
                                            <Phone className="w-3 h-3" />
                                          ) : (
                                            <Calendar className="w-3 h-3" />
                                          )}
                                          <span>{fuState.label}</span>
                                        </div>
                                      )}
                                    </td>

                                    {/* 5. Requests Count & Latest Activity */}
                                    <td className="p-3.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          {c.enquiries?.length || 0} {(c.enquiries?.length || 0) === 1 ? 'Request' : 'Requests'}
                                        </span>
                                      </div>
                                      {latestActivity ? (
                                        <div className="text-[10px] text-slate-600 mt-1 truncate max-w-[170px]" title={latestActivity.discussionSummary}>
                                          <span className="font-semibold">{latestActivity.contactMethod}:</span> {latestActivity.discussionSummary}
                                        </div>
                                      ) : latestEnq ? (
                                        <div className="space-y-1">
                                          <div className="text-[10px] text-slate-500">
                                            Enquiry: <span className={latestEnq.status === 'REJECTED' ? 'font-bold text-red-600' : ''}>{latestEnq.status}</span>
                                          </div>
                                          {latestEnq.status === 'REJECTED' && (!latestEnq.discussionNotes || !latestEnq.discussionNotes.includes('Client Informed of Rejection')) && (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse flex items-center gap-1 w-fit">
                                              <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                              Inform Client
                                            </span>
                                          )}
                                          {latestEnq.status === 'REJECTED' && latestEnq.discussionNotes && latestEnq.discussionNotes.includes('Client Informed of Rejection') && (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                              Client Informed
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 block mt-1">No activity yet</span>
                                      )}
                                    </td>

                                    {/* 6. Registration Date */}
                                    <td className="p-3.5 text-slate-600">
                                      <div className="flex items-center gap-1 font-medium">
                                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>
                                          {new Date(c.createdAt).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                          })}
                                        </span>
                                      </div>
                                    </td>

                                    {/* 7. Actions */}
                                    <td className="p-3.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {latestEnq && latestEnq.status === 'REJECTED' && (!latestEnq.discussionNotes || !latestEnq.discussionNotes.includes('Client Informed of Rejection')) && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenFollowUpModal(latestEnq, true)}
                                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm animate-pulse"
                                            title="Admin rejected enquiry - Inform client and record follow-up"
                                          >
                                            <Phone className="w-3.5 h-3.5" />
                                            Inform Client
                                          </button>
                                        )}
                                        {latestEnq && latestEnq.status === 'REJECTED' && latestEnq.discussionNotes && latestEnq.discussionNotes.includes('Client Informed of Rejection') && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenFollowUpModal(latestEnq, true)}
                                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Client already informed - View or add follow-up"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                            Follow-up
                                          </button>
                                        )}
                                        {latestEnq && latestEnq.status === 'CHANGES_REQUESTED' && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenFollowUpModal(latestEnq, false)}
                                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm animate-pulse"
                                            title="Admin requested scope changes - Record client consultation"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Follow-up
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenClientDetail(c.id)}
                                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                          title="Open Complete Client Workspace & Requests"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          Workspace →
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditClient(c)}
                                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                          title="Edit Client Details & Budget"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setNewEnquiryModal({ clientId: c.id, clientName: c.clientName })
                                          }
                                          className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-[#119DA4] hover:bg-[#80DED9]/20 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                          title="Submit New Request / Enquiry"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          Request
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* DETAILED CLIENT VIEW MODAL */}
              <ModalPortal
                isOpen={!!selectedClientDetails}
                onClose={() => setSelectedClientDetails(null)}
              >
                {selectedClientDetails && (
                  <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{selectedClientDetails.clientName}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#119DA4] border border-[#119DA4]/20">
                            Active Associate Client
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 block mt-0.5">
                          {selectedClientDetails.businessName} • {selectedClientDetails.businessCategory}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setClientMediaModal({
                              clientId: selectedClientDetails.id,
                              clientName: selectedClientDetails.clientName,
                            });
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Upload Client Media, Documents or Audio Notes"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Media / Files
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const c = selectedClientDetails;
                            setSelectedClientDetails(null);
                            handleOpenEditClient(c);
                          }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Edit Client Details & Budget"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Client
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedClientDetails(null)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-6 text-xs">
                      {/* Section 1: Contact & Client Overview */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#119DA4]" />
                          Client Contact Overview
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                              Mobile Number
                            </span>
                            <a
                              href={`tel:${selectedClientDetails.mobile}`}
                              className="text-sm font-bold text-indigo-600 hover:underline mt-0.5 block"
                            >
                              📞 {selectedClientDetails.mobile}
                            </a>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                              Email Address
                            </span>
                            <a
                              href={`mailto:${selectedClientDetails.email}`}
                              className="text-sm font-bold text-indigo-600 hover:underline mt-0.5 block truncate"
                            >
                              ✉️ {selectedClientDetails.email}
                            </a>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                              Registration Date
                            </span>
                            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                              {new Date(selectedClientDetails.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                              Exclusive Owner
                            </span>
                            <span className="text-xs font-bold text-[#119DA4] mt-0.5 block flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#119DA4]" />
                              Assigned to You ({user?.name})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Complete Business Address */}
                      {(() => {
                        let addr = selectedClientDetails.address || {};
                        if (!addr.addressLine1 && selectedClientDetails.location) {
                          try {
                            if (selectedClientDetails.location.startsWith('{')) {
                              addr = JSON.parse(selectedClientDetails.location);
                            }
                          } catch { }
                        }
                        const formattedFull =
                          addr.fullAddress ||
                          [
                            addr.addressLine1,
                            addr.addressLine2,
                            addr.city || selectedClientDetails.city,
                            addr.state,
                            addr.pinCode ? `PIN: ${addr.pinCode}` : '',
                            addr.country || 'India',
                          ]
                            .filter(Boolean)
                            .join(', ') ||
                          selectedClientDetails.location ||
                          'Not provided';

                        return (
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[#119DA4]" />
                              Complete Business Address
                            </h4>
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                    Address Line 1
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                                    {addr.addressLine1 || '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                    Address Line 2
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                                    {addr.addressLine2 || '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                    City & State
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                                    {addr.city || selectedClientDetails.city || '—'}
                                    {addr.state ? `, ${addr.state}` : ''}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                    PIN / Postal Code & Country
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                                    {addr.pinCode ? `PIN ${addr.pinCode}` : '—'} • {addr.country || 'India'}
                                  </span>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-200">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                  Formatted Postal Address
                                </span>
                                <p className="text-xs text-slate-700 font-medium mt-0.5">{formattedFull}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Section 3: Enquiries, Scope, Requirements & Notes */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-[#119DA4]" />
                            Client Enquiries & Requirements ({selectedClientDetails.enquiries?.length || 0})
                          </h4>
                          <button
                            onClick={() => {
                              const c = selectedClientDetails;
                              setSelectedClientDetails(null);
                              setNewEnquiryModal({ clientId: c.id, clientName: c.clientName });
                            }}
                            className="px-2.5 py-1 bg-teal-50 text-[#119DA4] hover:bg-[#80DED9]/20 rounded-lg text-xs font-bold transition-colors"
                          >
                            + Add Another Enquiry
                          </button>
                        </div>

                        {selectedClientDetails.enquiries && selectedClientDetails.enquiries.length > 0 ? (
                          <div className="space-y-3">
                            {selectedClientDetails.enquiries.map((enq: any, idx: number) => (
                              <div
                                key={enq.id || idx}
                                className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-sm"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-xs font-bold text-slate-900">
                                      {enq.serviceCategory?.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      ID: {enq.id} •{' '}
                                      {new Date(enq.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {enq.status}
                                    </span>
                                    {enq.expectedBudget ? (
                                      <span className="block text-xs font-bold text-slate-900 mt-1">
                                        Budget: ₹{enq.expectedBudget.toLocaleString()}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {enq.requirements && (
                                  <div className="pt-2 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                                      Scope & Deliverables
                                    </span>
                                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg whitespace-pre-wrap">
                                      {enq.requirements}
                                    </p>
                                  </div>
                                )}

                                {enq.attachmentUrl && (
                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                                      <span className="text-xs font-semibold text-slate-800 truncate">
                                        Client Brief / Attached Requirement Document
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {isExternalWebLink(enq.attachmentUrl) ? (
                                        <a
                                          href={enq.attachmentUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1 underline"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" /> Open Link
                                        </a>
                                      ) : (
                                        <>
                                          <a
                                            href={enq.attachmentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1 underline"
                                          >
                                            <Eye className="w-3.5 h-3.5" /> View
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => downloadFile(enq.attachmentUrl, `${enq.client?.clientName || 'client'}-brief`)}
                                            className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                          >
                                            <Download className="w-3.5 h-3.5" /> Download
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {enq.discussionNotes && (
                                  <div>
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                                      Discussion Notes
                                    </span>
                                    <p className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                                      💬 {enq.discussionNotes}
                                    </p>
                                  </div>
                                )}

                                {enq.followUpDate && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>
                                      Next Scheduled Follow-Up:{' '}
                                      <strong className="text-slate-800">
                                        {new Date(enq.followUpDate).toLocaleDateString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </strong>
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                            No enquiries recorded yet for this client.
                          </div>
                        )}
                      </div>

                      {/* Section 4: Quotations & Commercial History */}
                      {selectedClientDetails.quotations && selectedClientDetails.quotations.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-[#119DA4]" />
                            Commercial Quotations ({selectedClientDetails.quotations.filter((q: any) => q.status !== 'REQUESTED').length})
                            {selectedClientDetails.quotations.some((q: any) => q.status === 'REQUESTED') && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                {selectedClientDetails.quotations.filter((q: any) => q.status === 'REQUESTED').length} Draft Requested
                              </span>
                            )}
                          </h4>
                          <div className="space-y-2">
                            {selectedClientDetails.quotations.map((q: any) => (
                              <div
                                key={q.id}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 font-mono">{q.quotationNumber}</span>
                                    {(q.approvedCommissionRate || q.status === 'ADMIN_APPROVED' || q.status === 'ACCEPTED') && (
                                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                                        Approved Commission: {q.approvedCommissionRate ?? q.proposedCommissionRate ?? 10}% (₹{Math.round(((q.serviceFee || 0) - (q.discount || 0)) * ((q.approvedCommissionRate ?? q.proposedCommissionRate ?? 10) / 100)).toLocaleString('en-IN')})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-slate-400 text-[10px] block">
                                    Version v{q.version} • {new Date(q.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-extrabold text-slate-900 block">
                                    {q.status === 'REQUESTED' ? 'Awaiting Draft' : `₹${q.totalAmount?.toLocaleString()}`}
                                  </span>
                                  <span className={`text-[10px] font-bold ${q.status === 'REQUESTED' ? 'text-amber-700' : 'text-indigo-700'}`}>
                                    {q.status === 'REQUESTED' ? 'Awaiting Accounts Preparation' : q.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 5: Client Documents, Screenshots & Media Assets */}
                      {(() => {
                        const mediaActivities = (selectedClientDetails.contactActivities || []).filter(
                          (a: any) =>
                            a.contactMethod === 'CLIENT_MEDIA' ||
                            (a.followUpNotes && a.followUpNotes.includes('[ASSET_METADATA]:'))
                        );

                        return (
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <Upload className="w-4 h-4 text-[#119DA4]" />
                                Client Media & Requirement Documents ({mediaActivities.length})
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setClientMediaModal({
                                    clientId: selectedClientDetails.id,
                                    clientName: selectedClientDetails.clientName,
                                  });
                                }}
                                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Upload Media
                              </button>
                            </div>

                            {mediaActivities.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {mediaActivities.map((act: any) => {
                                  let meta: any = null;
                                  if (act.followUpNotes && act.followUpNotes.includes('[ASSET_METADATA]:')) {
                                    try {
                                      const raw = act.followUpNotes.split('[ASSET_METADATA]:')[1];
                                      meta = JSON.parse(raw);
                                    } catch { }
                                  }

                                  const fileUrl = meta?.fileUrl || '#';
                                  const fileType = meta?.fileType || 'DOCUMENT';
                                  const title = meta?.title || act.discussionSummary?.replace('Client Media Upload: ', '') || 'Client Document';
                                  const isImg = fileType === 'IMAGE' || fileUrl.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i);
                                  const isVid = fileType === 'VIDEO' || fileUrl.match(/\.(mp4|webm|mov)$/i) || fileUrl.includes('loom.com') || fileUrl.includes('youtube.com');
                                  const isAud = fileType === 'AUDIO' || fileUrl.match(/\.(mp3|wav|m4a|ogg)$/i);
                                  const isArch = fileType === 'ARCHIVE' || fileUrl.match(/\.(zip|rar|tar|gz)$/i);

                                  return (
                                    <div
                                      key={act.id}
                                      className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs flex flex-col justify-between"
                                    >
                                      <div>
                                        <div className="flex items-start gap-2.5">
                                          {isImg ? (
                                            <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-900 shrink-0 relative group">
                                              <img src={fileUrl} alt={title} className="w-full h-full object-cover" />
                                              <a
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                              >
                                                <Eye className="w-4 h-4 text-white" />
                                              </a>
                                            </div>
                                          ) : (
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${isVid
                                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                                              : isAud
                                                ? 'bg-purple-50 text-purple-600 border-purple-200'
                                                : isArch
                                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                              }`}>
                                              {isVid ? (
                                                <Video className="w-5 h-5" />
                                              ) : isAud ? (
                                                <Music className="w-5 h-5" />
                                              ) : isArch ? (
                                                <Archive className="w-5 h-5" />
                                              ) : (
                                                <FileText className="w-5 h-5" />
                                              )}
                                            </div>
                                          )}

                                          <div className="min-w-0 flex-1">
                                            <span className="font-bold text-slate-900 block truncate" title={title}>
                                              {title}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                                {fileType}
                                              </span>
                                              {meta?.fileSize && (
                                                <span className="text-[10px] text-slate-400">
                                                  {(meta.fileSize / (1024 * 1024)).toFixed(1)} MB
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {act.followUpNotes && !act.followUpNotes.startsWith('[ASSET_METADATA]:') && (
                                          <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2 rounded line-clamp-2">
                                            {act.followUpNotes.split('\n\n[ASSET_METADATA]:')[0]}
                                          </p>
                                        )}
                                      </div>

                                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400">
                                          {new Date(act.createdAt).toLocaleDateString()}
                                        </span>
                                        <a
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 underline"
                                        >
                                          <Download className="w-3 h-3" /> View / Download
                                        </a>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                                No client documents or media uploaded yet. Click above to attach client files, audio briefs, or screenshots.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                      <button
                        type="button"
                        onClick={() => {
                          const c = selectedClientDetails;
                          setSelectedClientDetails(null);
                          handleOpenEditClient(c);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Client & Budget
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedClientDetails(null)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                )}
              </ModalPortal>

              {/* Extra Enquiry Modal */}
              <ModalPortal
                isOpen={!!newEnquiryModal}
                onClose={() => !modalSubmitting && setNewEnquiryModal(null)}
              >
                {newEnquiryModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              Submit New Enquiry
                            </h3>
                            <p className="text-xs text-slate-500">
                              Client: <strong className="text-slate-800">{newEnquiryModal.clientName}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => !modalSubmitting && setNewEnquiryModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleCreateEnquiry} className="space-y-3.5 text-xs">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Service Category</label>
                          <select
                            value={enquiryForm.serviceCategory}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, serviceCategory: e.target.value })}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                          >
                            <option value="DIGITAL_MARKETING">Digital Marketing</option>
                            <option value="WEBSITE_DEVELOPMENT">Website Development</option>
                            <option value="MOBILE_APPLICATION_DEVELOPMENT">Mobile Application</option>
                            <option value="SOFTWARE_DEVELOPMENT">Custom Software / ERP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Expected Budget (₹)</label>
                          <input
                            type="number"
                            value={enquiryForm.expectedBudget}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, expectedBudget: e.target.value })}
                            placeholder="e.g. 75000"
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Detailed Requirements <span className="text-rose-500">*</span></label>
                          <textarea
                            rows={3}
                            required
                            value={enquiryForm.requirements}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, requirements: e.target.value })}
                            placeholder="Specify features, modules, deliverables..."
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                          />
                        </div>

                        <div>
                          <MediaUploader
                            value={enquiryForm.attachmentUrl}
                            fileType={enquiryForm.attachmentFileType}
                            fileName={enquiryForm.attachmentFileName}
                            fileSize={enquiryForm.attachmentFileSize}
                            onChange={(res) => {
                              if (res) {
                                setEnquiryForm({
                                  ...enquiryForm,
                                  attachmentUrl: res.url,
                                  attachmentFileType: res.fileType,
                                  attachmentFileName: res.originalName,
                                  attachmentFileSize: res.size,
                                });
                              } else {
                                setEnquiryForm({
                                  ...enquiryForm,
                                  attachmentUrl: '',
                                  attachmentFileType: 'DOCUMENT',
                                  attachmentFileName: '',
                                  attachmentFileSize: undefined,
                                });
                              }
                            }}
                            label="Client Brief Media & Documents (Optional)"
                            helperText="Attach client brief documents, voice notes, video briefings, or reference screenshots (Max 100MB)"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={modalSubmitting}
                            onClick={() => setNewEnquiryModal(null)}
                            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={modalSubmitting}
                            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                          >
                            {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {modalSubmitting ? 'Submitting...' : 'Submit Enquiry'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </ModalPortal>

              {/* Client Media & Documents Upload Modal */}
              <ModalPortal
                isOpen={!!clientMediaModal}
                onClose={() => !modalSubmitting && setClientMediaModal(null)}
              >
                {clientMediaModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500" />
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              Upload Client Media & Documents
                            </h3>
                            <p className="text-xs text-slate-500">
                              Client: <strong className="text-slate-800">{clientMediaModal.clientName}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => !modalSubmitting && setClientMediaModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleUploadClientMedia} className="space-y-3.5 text-xs">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">
                            Media Title / Label <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={clientMediaTitle}
                            onChange={(e) => setClientMediaTitle(e.target.value)}
                            placeholder="e.g. Requirement Specification PDF, Client Voice Brief, App Flow Screenshot"
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Category</label>
                          <select
                            value={clientMediaCategory}
                            onChange={(e) => setClientMediaCategory(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white"
                          >
                            <option value="REQUIREMENTS_DOC">Client Requirement Document (PDF/Doc/Excel)</option>
                            <option value="SCREENSHOT_DESIGN">UI / Wireframe / Screenshot Reference</option>
                            <option value="VOICE_AUDIO_BRIEF">Client Voice Note / Audio Brief</option>
                            <option value="VIDEO_WALKTHROUGH">Video Walkthrough / Loom Screen Recording</option>
                            <option value="BRAND_ASSET">Brand Logo / Artwork / Archive</option>
                            <option value="OTHER">Other Client Attachment</option>
                          </select>
                        </div>

                        <div>
                          <MediaUploader
                            value={clientMediaUrl}
                            fileType={clientMediaFileType}
                            fileName={clientMediaFileName}
                            fileSize={clientMediaFileSize}
                            onChange={(res) => {
                              if (res) {
                                setClientMediaUrl(res.url);
                                setClientMediaFileType(res.fileType);
                                setClientMediaFileName(res.originalName);
                                setClientMediaFileSize(res.size);
                                if (!clientMediaTitle) {
                                  setClientMediaTitle(res.originalName);
                                }
                              } else {
                                setClientMediaUrl('');
                                setClientMediaFileType('DOCUMENT');
                                setClientMediaFileName('');
                                setClientMediaFileSize(undefined);
                              }
                            }}
                            label="Upload Media File or Paste External Link"
                            helperText="Supports images, video, audio, PDFs, documents and archives up to 100MB"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Notes / Client Context (Optional)</label>
                          <textarea
                            rows={2}
                            value={clientMediaNotes}
                            onChange={(e) => setClientMediaNotes(e.target.value)}
                            placeholder="Add any discussion notes or instructions given by the client..."
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={modalSubmitting}
                            onClick={() => setClientMediaModal(null)}
                            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={modalSubmitting || !clientMediaUrl || !clientMediaTitle.trim()}
                            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                          >
                            {modalSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {modalSubmitting ? 'Uploading...' : 'Save & Attach to Client'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </ModalPortal>

              {/* Log Contact Activity Modal */}
              <ModalPortal
                isOpen={!!activityModal}
                onClose={() => !activitySubmitting && setActivityModal(null)}
              >
                {activityModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-[#119DA4] to-[#3066BE]" />
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-teal-50 rounded-xl border border-[#119DA4]/20">
                            <Phone className="w-5 h-5 text-[#119DA4]" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              Log Contact & Follow-up
                            </h3>
                            <p className="text-xs text-slate-500">
                              Client: <strong className="text-slate-800">{activityModal.clientName}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => !activitySubmitting && setActivityModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleAddActivity} className="space-y-3.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Contact Method *</label>
                            <select
                              value={activityForm.contactMethod}
                              onChange={(e) =>
                                setActivityForm({ ...activityForm, contactMethod: e.target.value as any })
                              }
                              className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                            >
                              <option value="CALL">Phone Call</option>
                              <option value="WHATSAPP">WhatsApp Chat</option>
                              <option value="EMAIL">Email</option>
                              <option value="MEETING">Meeting (In-person / Virtual)</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Outcome *</label>
                            <select
                              value={activityForm.outcome}
                              onChange={(e) =>
                                setActivityForm({ ...activityForm, outcome: e.target.value as any })
                              }
                              className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                            >
                              <option value="CONNECTED">Connected & Discussed</option>
                              <option value="QUOTATION_REQUESTED">Requested Quotation</option>
                              <option value="INTERESTED">Client Interested</option>
                              <option value="SCHEDULED_CALLBACK">Scheduled Callback</option>
                              <option value="BUSY_NO_ANSWER">Busy / No Answer</option>
                              <option value="NOT_INTERESTED">Not Interested</option>
                              <option value="CLOSED_WON">Closed Won (Deal Closed)</option>
                              <option value="CLOSED_LOST">Closed Lost</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">
                            Discussion Summary <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={activityForm.discussionSummary}
                            onChange={(e) =>
                              setActivityForm({ ...activityForm, discussionSummary: e.target.value })
                            }
                            placeholder="Key discussion points, budget agreed, specific deliverables requested..."
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Follow-up Notes</label>
                          <input
                            type="text"
                            value={activityForm.followUpNotes}
                            onChange={(e) =>
                              setActivityForm({ ...activityForm, followUpNotes: e.target.value })
                            }
                            placeholder="Next steps, materials to send, action items..."
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Next Follow-Up Date</label>
                          <input
                            type="date"
                            value={activityForm.nextFollowUpDate}
                            onChange={(e) =>
                              setActivityForm({ ...activityForm, nextFollowUpDate: e.target.value })
                            }
                            className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={activitySubmitting}
                            onClick={() => setActivityModal(null)}
                            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={activitySubmitting}
                            className="px-5 py-2 bg-[#3066BE] hover:bg-[#255299] text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                          >
                            {activitySubmitting ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            {activitySubmitting ? 'Saving Activity...' : 'Save Activity'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </ModalPortal>
            </div>
          )}

          {/* TAB 5: ENQUIRIES & REQUEST QUOTATION */}
          {activeTab === 'enquiries' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Enquiries & Quotation Requests</h2>
                <p className="text-xs text-slate-500">
                  Track management approval of client enquiries and request official commercial quotations from Accounts.
                </p>
              </div>

              <div className="space-y-3">
                {!enquiriesLoaded || tabLoading ? (
                  <SkeletonTable rows={4} cols={5} />
                ) : enquiries.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">No enquiries submitted yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Register a client and submit their project requirements to request management review and quotation drafting.
                    </p>
                  </div>
                ) : (
                  enquiries.map((enq) => {
                    const hasActiveQuote = enq.quotations && enq.quotations.length > 0;
                    return (
                      <div key={enq.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-500">{enq.id}</span>
                            <h3 className="text-sm font-bold text-slate-900">{enq.client?.clientName}</h3>
                            <span className="text-xs text-indigo-600 font-semibold">{enq.serviceCategory}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${enq.status === 'APPROVED'
                              ? 'bg-emerald-100 text-[#119DA4]'
                              : enq.status === 'CHANGES_REQUESTED'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : enq.status === 'SUBMITTED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                              Management: {enq.status?.replace('_', ' ')}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Budget: ₹{enq.expectedBudget?.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="py-3 text-xs text-slate-700 space-y-2">
                          <div>
                            <strong>Requirements:</strong>
                            <p className="text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                              {enq.requirements}
                            </p>
                          </div>
                          {enq.adminNotes && (
                            <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${enq.status === 'REJECTED'
                              ? 'bg-rose-50 border-rose-200 text-rose-900'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                              }`}>
                              <div>
                                <strong className="block font-bold">
                                  {enq.status === 'REJECTED' ? '⚠️ Management Rejection Reason:' : 'Admin Review Note:'}
                                </strong>
                                <span className="mt-0.5 block text-slate-800">{enq.adminNotes}</span>
                              </div>
                              {enq.status === 'CHANGES_REQUESTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFollowUpModal(enq, false)}
                                  className="px-3 py-1.5 bg-[#3066BE] hover:bg-[#255299] text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Record Follow-up
                                </button>
                              )}
                              {enq.status === 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFollowUpModal(enq, true)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  Inform Client & Log Follow-up
                                </button>
                              )}
                            </div>
                          )}
                          {enq.discussionNotes && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold text-emerald-900 border-b border-emerald-200/60 pb-1">
                                <span className="flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                                  Client Consultation & Follow-up History:
                                </span>
                                {(() => {
                                  const match = enq.discussionNotes?.match(/^\[(.*?)\]/);
                                  const consultDate = match ? match[1] : enq.followUpDate ? new Date(enq.followUpDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null;
                                  return consultDate ? (
                                    <span className="text-[10px] font-mono font-normal text-emerald-800">
                                      Consulted: {consultDate}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                              <p className="whitespace-pre-wrap font-medium text-emerald-950 pl-5 leading-relaxed">
                                {enq.discussionNotes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-100">
                          <span>Submitted on {new Date(enq.createdAt).toLocaleDateString()}</span>

                          {(() => {
                            const latestQuot = enq.quotations && enq.quotations.length > 0 ? enq.quotations[0] : null;

                            if (latestQuot) {
                              if (latestQuot.status === 'REQUESTED') {
                                return (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                      <span>Quotation Requested • Pending Accounts Preparation ({latestQuot.quotationNumber})</span>
                                    </span>
                                    <button
                                      onClick={() => setActiveTab('quotations')}
                                      className="text-[11px] text-[#3066BE] hover:underline font-semibold"
                                    >
                                      Track in Quotes →
                                    </button>
                                  </div>
                                );
                              }

                              if (latestQuot.status === 'PREPARED' || latestQuot.status === 'PENDING_ADMIN_APPROVAL') {
                                return (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Quotation Drafted • Pending Admin Approval ({latestQuot.quotationNumber})</span>
                                    </span>
                                    <button
                                      onClick={() => setActiveTab('quotations')}
                                      className="text-[11px] text-[#3066BE] hover:underline font-semibold"
                                    >
                                      Track in Quotes →
                                    </button>
                                  </div>
                                );
                              }

                              if (latestQuot.status === 'REVISION_REQUESTED') {
                                return (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Admin Requested Revision ({latestQuot.quotationNumber})</span>
                                    </span>
                                    <button
                                      onClick={() => setActiveTab('quotations')}
                                      className="text-[11px] text-[#3066BE] hover:underline font-semibold"
                                    >
                                      Track in Quotes →
                                    </button>
                                  </div>
                                );
                              }

                              if (latestQuot.status === 'ADMIN_APPROVED' || latestQuot.status === 'SENT_TO_BGA') {
                                return (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-[#119DA4] border border-emerald-200 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#119DA4]" />
                                      <span>Quotation Issued & Ready ({latestQuot.quotationNumber})</span>
                                    </span>
                                    <button
                                      onClick={() => setActiveTab('quotations')}
                                      className="px-2.5 py-1 bg-[#3066BE] text-white hover:bg-[#255299] rounded text-[11px] font-bold transition-colors"
                                    >
                                      Present to Client →
                                    </button>
                                  </div>
                                );
                              }

                              if (latestQuot.status === 'ACCEPTED') {
                                return (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Quotation Accepted ({latestQuot.quotationNumber})</span>
                                    </span>
                                    <button
                                      onClick={() => setActiveTab('projects')}
                                      className="text-[11px] text-[#3066BE] hover:underline font-semibold"
                                    >
                                      View Work Order →
                                    </button>
                                  </div>
                                );
                              }

                              if (latestQuot.status === 'REJECTED') {
                                return (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                    Quotation Declined ({latestQuot.quotationNumber})
                                  </span>
                                );
                              }

                              return (
                                <span className="text-slate-600 font-semibold text-xs">
                                  Quotation {latestQuot.status} ({latestQuot.quotationNumber})
                                </span>
                              );
                            }

                            // If no quotation requested yet
                            if (enq.status === 'APPROVED') {
                              return (
                                <button
                                  onClick={() => handleRequestQuotation(enq.id)}
                                  className="px-3.5 py-1.5 bg-[#3066BE] text-white rounded-lg text-xs font-bold hover:bg-[#255299] flex items-center gap-1.5 shadow-sm transition-colors"
                                >
                                  <Send className="w-3.5 h-3.5" /> Request Quotation from Accounts
                                </button>
                              );
                            }

                            if (enq.status === 'SUBMITTED') {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Awaiting Management Review
                                </span>
                              );
                            }

                            if (enq.status === 'CHANGES_REQUESTED') {
                              return (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    Scope Changes Requested by Admin
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFollowUpModal(enq)}
                                    className="px-3.5 py-1.5 bg-[#3066BE] hover:bg-[#255299] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Consult Client & Record Follow-up
                                  </button>
                                </div>
                              );
                            }

                            if (enq.status === 'REJECTED') {
                              const hasInformed = enq.discussionNotes && enq.discussionNotes.includes('Client Informed of Rejection');
                              return (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {hasInformed ? (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      Client Informed of Rejection
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                                      Awaiting Client Rejection Follow-up
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFollowUpModal(enq, true)}
                                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    {hasInformed ? 'Update Client Follow-up' : 'Inform Client & Record Follow-up'}
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                Enquiry Declined
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  }))}
              </div>
            </div>
          )}

          {/* TAB 6: MY QUOTATIONS & CLIENT ACCEPTANCE */}
          {activeTab === 'quotations' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Official Client Quotations</h2>
                  <p className="text-xs text-slate-500">
                    Official quotations prepared by Accounts and authorized by Admin. Send reminders if preparation is delayed, present approved quotes, and record client decisions.
                  </p>
                </div>
                <button
                  onClick={() => loadTabData('quotations')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" /> Refresh Quotes
                </button>
              </div>

              <div className="space-y-4">
                {!quotationsLoaded || tabLoading ? (
                  <SkeletonTable rows={4} cols={5} />
                ) : quotations.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                    <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">No official quotations yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Approved quotations generated by Accounts will appear here once requested for your approved enquiries.
                    </p>
                  </div>
                ) : (
                  quotations.map((q) => {
                    const isSuperseded = !!q.supersededBy;
                    const isApproved =
                      (q.status === 'ADMIN_APPROVED' || q.status === 'SENT_TO_BGA' || q.adminApprovalStatus === 'APPROVED') && !isSuperseded;
                    const isPendingAdmin =
                      (q.status === 'PENDING_ADMIN_APPROVAL' || (q.adminApprovalStatus === 'PENDING' && q.preparedById)) && !isSuperseded;
                    const isUnderPrep =
                      (q.status === 'REQUESTED' || q.status === 'REVISION_REQUESTED' || q.status === 'REJECTED') && !isSuperseded;

                    return (
                      <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-bold text-slate-900">{q.quotationNumber}</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                v{q.version}
                              </span>
                              {q.previousVersion && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  Revision of v{q.previousVersion.version}
                                </span>
                              )}
                              {q.reminderCount > 0 && !isSuperseded && (
                                <span className="text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded font-bold border border-red-200 flex items-center gap-1">
                                  <Bell className="w-3 h-3 text-red-600" /> {q.reminderCount} Reminder(s) Sent
                                </span>
                              )}
                            </div>
                            <h3 className="text-xs text-slate-600 mt-0.5">
                              Client: <strong>{q.client?.clientName}</strong> ({q.client?.businessName})
                            </h3>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${isSuperseded
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : q.status === 'ACCEPTED'
                                  ? 'bg-emerald-100 text-[#119DA4] border border-[#119DA4]/20'
                                  : isApproved
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : isPendingAdmin
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                            >
                              {isSuperseded
                                ? `SUPERSEDED BY V${q.supersededBy.version}`
                                : isApproved
                                  ? 'APPROVED & AVAILABLE FOR CLIENT'
                                  : isPendingAdmin
                                    ? 'QUOTATION PENDING ADMIN APPROVAL'
                                    : q.status === 'REQUESTED'
                                      ? 'AWAITING ACCOUNTS PREPARATION'
                                      : q.status === 'REVISION_REQUESTED'
                                        ? 'REVISION REQUESTED BY ADMIN'
                                        : isUnderPrep
                                          ? 'QUOTATION UNDER PREPARATION'
                                          : q.status}
                            </span>
                            {(isApproved || isSuperseded || (q.preparedById && q.status === 'EXPIRED')) && (
                              <a
                                href={getQuotationPdfUrl(q.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" /> {isSuperseded ? `v${q.version} PDF` : 'PDF'}
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Financial Breakdown (Visible only when approved or prepared) */}
                        {isSuperseded ? (
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="block font-semibold text-slate-900">
                                  Quotation Superseded by Revised Version {q.supersededBy.version} ({q.supersededBy.quotationNumber})
                                </strong>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  This initial draft (v{q.version}) was updated and replaced by revised quotation <strong className="text-slate-800">{q.supersededBy.quotationNumber}</strong>. It is preserved below as legal audit proof.
                                </p>
                              </div>
                            </div>
                            <a
                              href={getQuotationPdfUrl(q.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>View v{q.version} PDF Archive</span>
                            </a>
                          </div>
                        ) : isApproved ? (
                          <div className="py-2 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-slate-400 block">Service Fee</span>
                              <span className="font-bold text-slate-800">₹{q.serviceFee?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">GST ({q.taxRate}%)</span>
                              <span className="font-bold text-slate-800">₹{q.taxAmount?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Total Contract Value</span>
                              <span className="font-bold text-indigo-700 text-sm">₹{q.totalAmount?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Required Advance ({q.advanceRequiredPercent}%)</span>
                              <span className="font-bold text-[#119DA4]">₹{q.advanceRequiredAmount?.toLocaleString()}</span>
                            </div>
                            <div className="bg-amber-50/80 border border-amber-200/70 rounded-lg p-2 col-span-2 sm:col-span-1">
                              <span className="text-amber-800 block text-[10px] font-bold uppercase tracking-wider">Approved Commission</span>
                              <span className="font-extrabold text-amber-950 text-sm">
                                {q.approvedCommissionRate ?? q.proposedCommissionRate ?? 10}%
                              </span>
                              <span className="text-slate-500 block text-[10px] font-medium">
                                ₹{Math.round(((q.serviceFee || 0) - (q.discount || 0)) * ((q.approvedCommissionRate ?? q.proposedCommissionRate ?? 10) / 100)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-semibold">Official Quotation Under Processing</strong>
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                {isPendingAdmin
                                  ? 'Accounts has finalized the quotation. It is currently under review by Admin before release.'
                                  : 'Accounts Department is actively preparing your quotation. Use the button below to send a reminder if delayed.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Quotation Full Lifecycle History & Revision Audit Trail */}
                        <QuotationHistoryTimeline currentQuotation={q} defaultExpanded={false} />

                        {q.serviceScope && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <strong>Approved Scope:</strong> {q.serviceScope}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs pt-3 border-t border-slate-100">
                          <span className="text-slate-400">
                            Valid until {new Date(q.validityDate).toLocaleDateString()}
                          </span>

                          <div className="flex items-center gap-2 flex-wrap">
                            {isSuperseded && (
                              <span className="text-slate-500 font-medium">
                                Replaced by v{q.supersededBy.version} on {new Date(q.supersededBy.createdAt).toLocaleDateString()}
                              </span>
                            )}

                            {/* Send Reminder button if Accounts has not finished or quote is pending */}
                            {isUnderPrep && (
                              <button
                                type="button"
                                disabled={sendingReminderId === q.id}
                                onClick={() => handleSendReminder(q.id)}
                                className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                              >
                                {sendingReminderId === q.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                                ) : (
                                  <Bell className="w-3.5 h-3.5 text-amber-700" />
                                )}
                                {sendingReminderId === q.id ? 'Sending Reminder...' : 'Send Reminder to Accounts'}
                              </button>
                            )}

                            {isApproved && q.status !== 'ACCEPTED' && (
                              <>
                                <button
                                  onClick={() => setRevisionModal({ quotationId: q.id, quotationNumber: q.quotationNumber })}
                                  className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Request Revision
                                </button>
                                <button
                                  onClick={() => setAcceptanceModal({ quotationId: q.id, quotationNumber: q.quotationNumber })}
                                  className="px-4 py-1.5 bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm rounded-lg text-xs font-bold transition-colors shadow-sm"
                                >
                                  Record Client Acceptance ✓
                                </button>
                              </>
                            )}

                            {q.status === 'ACCEPTED' && (
                              <span className="text-[#119DA4] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-[#119DA4]" />
                                Accepted on {new Date(q.acceptedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }))}
              </div>

              {/* Revision Request Modal */}
              <ModalPortal
                isOpen={!!revisionModal}
                onClose={() => !modalSubmitting && setRevisionModal(null)}
              >
                {revisionModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-600" />
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                            <Edit3 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              Request Quotation Revision
                            </h3>
                            <p className="text-xs text-slate-500 font-mono">
                              {revisionModal.quotationNumber}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => !modalSubmitting && setRevisionModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        Enter the requested scope modifications, commercial revisions, or client feedback. The Accounts Department will draft an updated quotation.
                      </p>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Client Feedback / Revision Notes <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={revisionNotes}
                          onChange={(e) => setRevisionNotes(e.target.value)}
                          placeholder="e.g. Client requested a 10% commercial discount and inclusion of 2 additional landing pages..."
                          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none transition-all"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={modalSubmitting}
                          onClick={() => setRevisionModal(null)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!revisionNotes.trim() || modalSubmitting}
                          onClick={handleSubmitRevision}
                          className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                          {modalSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          {modalSubmitting ? 'Sending...' : 'Send to Accounts'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </ModalPortal>

              {/* Client Acceptance Modal */}
              <ModalPortal
                isOpen={!!acceptanceModal}
                onClose={() => !modalSubmitting && setAcceptanceModal(null)}
              >
                {acceptanceModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-600" />
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-200">
                            <CheckCircle2 className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              Record Client Acceptance
                            </h3>
                            <p className="text-xs text-slate-500 font-mono">
                              {acceptanceModal.quotationNumber}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => !modalSubmitting && setAcceptanceModal(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200/70 text-xs text-teal-900 leading-relaxed">
                        Recording client acceptance automatically generates an official <strong>Work Order</strong> and notifies Accounts to collect and verify the required advance payment.
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Acceptance Evidence / PO Reference Notes <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={acceptanceNotes}
                          onChange={(e) => setAcceptanceNotes(e.target.value)}
                          placeholder="e.g. Approved via email confirmation from MD on 17 Nov 2026. PO Ref: APEX-2026-PO99"
                          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none transition-all"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={modalSubmitting}
                          onClick={() => setAcceptanceModal(null)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!acceptanceNotes.trim() || modalSubmitting}
                          onClick={handleClientAcceptance}
                          className="px-5 py-2 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                          {modalSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {modalSubmitting ? 'Confirming...' : 'Confirm Acceptance'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </ModalPortal>
            </div>
          )}

          {/* TAB 7: WORK ORDERS & PROJECTS */}
          {
            activeTab === 'projects' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <h2 className="text-base font-bold text-slate-900">My Client Projects & Execution</h2>
                  <p className="text-xs text-slate-500">
                    Track technical implementation progress and milestones for contracts accepted by your clients.
                  </p>
                </div>

                <div className="space-y-4">
                  {!workOrdersLoaded || tabLoading ? (
                    <SkeletonTable rows={4} cols={5} />
                  ) : workOrders.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                      <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-800">No active projects yet</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Projects will appear here once your clients accept commercial quotations and technical execution kicks off.
                      </p>
                    </div>
                  ) : (
                    workOrders.map((wo) => {
                      const prj = wo.project;
                      return (
                        <div key={wo.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-900">{wo.workOrderNumber}</span>
                                {prj && <span className="font-mono text-xs text-indigo-600 font-bold">({prj.projectNumber})</span>}
                              </div>
                              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{wo.client?.clientName}</h3>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${wo.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : wo.advanceVerified
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-amber-100 text-amber-800'
                                }`}>
                                {wo.status === 'COMPLETED' ? 'Final Payment: VERIFIED (100% Settled)' : wo.advanceVerified ? 'Advance: VERIFIED' : 'Advance: AWAITING VERIFICATION'}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                Value: ₹{wo.totalValue?.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {prj ? (
                            <div className="mt-3 space-y-3">
                              <div>
                                <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                                  <div className="flex items-center gap-2">
                                    <span>Technical Execution:</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prj.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                      prj.status === 'CORRECTION_REQUIRED' ? 'bg-rose-100 text-rose-800' :
                                        prj.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' :
                                          'bg-blue-100 text-blue-800'
                                      }`}>
                                      {prj.status}
                                    </span>
                                  </div>
                                  <span className="font-bold">{prj.progressPercentage}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                  <div
                                    className="bg-[#3066BE] h-2 rounded-full transition-all"
                                    style={{ width: `${prj.progressPercentage}%` }}
                                  />
                                </div>
                              </div>

                              {/* Client Attached Requirement Document (if provided by client/enquiry) */}
                              {wo.quotation?.enquiry?.attachmentUrl && (
                                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <div>
                                      <span className="font-bold text-slate-800 block truncate">
                                        Client Requirement Document / Specs
                                      </span>
                                      <span className="text-[10px] text-indigo-700">Client-provided brief from enquiry</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isExternalWebLink(wo.quotation.enquiry.attachmentUrl) ? (
                                      <a
                                        href={wo.quotation.enquiry.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-[#3066BE] border border-slate-200 text-xs font-bold inline-flex items-center gap-1"
                                      >
                                        <ExternalLink className="w-3 h-3" /> Open Link
                                      </a>
                                    ) : (
                                      <>
                                        <a
                                          href={wo.quotation.enquiry.attachmentUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold inline-flex items-center gap-1"
                                        >
                                          <Eye className="w-3 h-3" /> View
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => downloadFile(wo.quotation.enquiry.attachmentUrl, `${wo.client?.clientName || 'client'}-brief`)}
                                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                        >
                                          <Download className="w-3 h-3" /> Download
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Uploaded Deliverables Section */}
                              {prj.deliverables && prj.deliverables.length > 0 && (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <FileCheck className="w-3.5 h-3.5 text-[#119DA4]" />
                                      Uploaded Deliverables ({prj.deliverables.length})
                                    </span>
                                    <span className="text-[10px] text-slate-500">Inspect deliverables before submitting client feedback</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {prj.deliverables.map((d: any) => (
                                      <div key={d.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex flex-col justify-between gap-2 shadow-2xs">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold text-slate-900 truncate">{d.title}</span>
                                              {d.version && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono font-bold">
                                                  v{d.version}
                                                </span>
                                              )}
                                            </div>
                                            {d.notes && <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{d.notes}</p>}
                                          </div>
                                          {d.fileUrl && (
                                            <div className="flex items-center gap-1 shrink-0">
                                              {isExternalWebLink(d.fileUrl) ? (
                                                <a
                                                  href={d.fileUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="px-2 py-1 rounded bg-blue-50 text-[#3066BE] hover:bg-blue-100 font-bold text-[11px] inline-flex items-center gap-1"
                                                >
                                                  <ExternalLink className="w-3 h-3" />
                                                  Open Link
                                                </a>
                                              ) : (
                                                <>
                                                  <a
                                                    href={d.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[11px] inline-flex items-center gap-1"
                                                  >
                                                    <Eye className="w-3 h-3" />
                                                    View
                                                  </a>
                                                  <button
                                                    type="button"
                                                    onClick={() => downloadFile(d.fileUrl, d.title || 'deliverable')}
                                                    className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                                                    title="Download deliverable"
                                                  >
                                                    <Download className="w-3 h-3 text-indigo-600" />
                                                    Download
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                                          <span className={`px-1.5 py-0.5 rounded font-semibold ${d.bgaApprovalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                                            d.bgaApprovalStatus === 'CHANGES_REQUESTED' ? 'bg-amber-50 text-amber-700' :
                                              'bg-slate-100 text-slate-600'
                                            }`}>
                                            {d.bgaApprovalStatus === 'APPROVED' ? '✓ Shared with Client' :
                                              d.bgaApprovalStatus === 'CHANGES_REQUESTED' ? '⚠ Changes Requested' :
                                                'Pending Review'}
                                          </span>
                                          {d.bgaApprovalStatus !== 'APPROVED' && (
                                            <button
                                              onClick={() => {
                                                setDeliverableReviewModal({ deliverable: d, project: prj });
                                                setReviewAction('APPROVE_AND_SHARE');
                                                setReviewNotes('');
                                              }}
                                              className="text-[#119DA4] hover:text-[#0c7479] font-bold text-[11px] hover:underline"
                                            >
                                              Review Deliverable →
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Bar: Add Client Review & Feedback + Share Portal */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBgaFeedbackModal({ project: prj, clientName: wo.client?.clientName });
                                      setBgaClientDecision('APPROVED');
                                      setBgaFeedbackType('CLIENT_FEEDBACK');
                                      setBgaFeedbackContent('');
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>+ Add Client Review & Feedback</span>
                                  </button>

                                  {prj.clientAccessToken && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyClientPortalLink(prj.clientAccessToken, wo.client?.clientName)}
                                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Copy direct portal link for client to review online"
                                    >
                                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Copy Client Portal Link</span>
                                    </button>
                                  )}
                                </div>

                                {prj.status === 'CORRECTION_REQUIRED' && (
                                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    Technical Team notified: Revisions in progress
                                  </span>
                                )}
                              </div>

                              {/* Review & Feedback History Log */}
                              {prj.feedback && prj.feedback.length > 0 && (
                                <div className="mt-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <History className="w-3.5 h-3.5 text-slate-500" />
                                    Client Reviews & Communication Log ({prj.feedback.length})
                                  </span>
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {prj.feedback.map((f: any) => (
                                      <div key={f.id} className="p-2 rounded-lg bg-white border border-slate-200 text-xs space-y-1 shadow-2xs">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-900">{f.authorName}</span>
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                                              {f.authorRole || 'BGA'}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${f.feedbackType === 'INTERNAL_NOTE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                              }`}>
                                              {f.feedbackType === 'INTERNAL_NOTE' ? 'Internal' : 'Client Review'}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-slate-400">
                                            {new Date(f.createdAt).toLocaleDateString('en-IN', {
                                              day: 'numeric',
                                              month: 'short',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                        <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">{f.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* STAGE 2: FINAL PAYMENT FOLLOW-UP DESK */}
                              <div className={`mt-3 p-3.5 rounded-xl border ${prj.status === 'COMPLETED'
                                ? 'bg-gradient-to-br from-indigo-50/90 via-blue-50/50 to-emerald-50/40 border-indigo-200 shadow-xs'
                                : 'bg-slate-50 border-slate-200'
                                }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="p-1 rounded-md bg-indigo-100 text-indigo-700">
                                        <Phone className="w-3.5 h-3.5" />
                                      </span>
                                      <h4 className="text-xs font-bold text-slate-900">
                                        Final Client Payment Follow-up
                                      </h4>
                                      {prj.status === 'COMPLETED' && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                                          ★ Technical Project Completed
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Follow up with {wo.client?.clientName} for final balance settlement to unlock commission clearance.
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setFollowUpProjectModal({ project: prj, clientName: wo.client?.clientName || 'Client' })}
                                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Record Follow-up
                                    </button>
                                    {prj.finalPaymentFollowUps && prj.finalPaymentFollowUps.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedFollowUpWoId(expandedFollowUpWoId === wo.id ? null : wo.id)}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                      >
                                        <History className="w-3 h-3 text-slate-500" />
                                        <span>{prj.finalPaymentFollowUps.length} Logs</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedFollowUpWoId === wo.id ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Latest follow-up status summary badge */}
                                {prj.finalPaymentFollowUps && prj.finalPaymentFollowUps.length > 0 ? (
                                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-slate-500">Latest Status:</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prj.finalPaymentFollowUps[0].status === 'PAYMENT_PROMISED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                        prj.finalPaymentFollowUps[0].status === 'PAYMENT_DELAYED' ? 'bg-amber-100 text-amber-800' :
                                          prj.finalPaymentFollowUps[0].status === 'CLIENT_DISPUTED' ? 'bg-rose-100 text-rose-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                        {prj.finalPaymentFollowUps[0].status?.replace(/_/g, ' ')}
                                      </span>
                                      {prj.finalPaymentFollowUps[0].expectedPaymentDate && (
                                        <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                          <Calendar className="w-3 h-3 text-slate-400" />
                                          Expected: <strong>{new Date(prj.finalPaymentFollowUps[0].expectedPaymentDate).toLocaleDateString('en-IN')}</strong>
                                        </span>
                                      )}
                                      {prj.finalPaymentFollowUps[0].expectedAmount && (
                                        <span className="text-[11px] font-bold text-emerald-700">
                                          ₹{Number(prj.finalPaymentFollowUps[0].expectedAmount).toLocaleString('en-IN')}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      Logged {new Date(prj.finalPaymentFollowUps[0].createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="mt-2 text-[11px] text-slate-500 italic">
                                    No follow-up entries yet. Log client communication regarding final payment.
                                  </div>
                                )}

                                {/* Expandable chronological follow-up history */}
                                {expandedFollowUpWoId === wo.id && prj.finalPaymentFollowUps && prj.finalPaymentFollowUps.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                      Follow-up Timeline & Client Commitments
                                    </span>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                      {prj.finalPaymentFollowUps.map((f: any) => (
                                        <div key={f.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1 shadow-2xs">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-semibold text-slate-800">{f.bga?.name || 'Associate'}</span>
                                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase">
                                                via {f.contactMethod}
                                              </span>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${f.status === 'PAYMENT_PROMISED' ? 'bg-emerald-50 text-emerald-700' :
                                                f.status === 'PAYMENT_DELAYED' ? 'bg-amber-50 text-amber-700' :
                                                  f.status === 'CLIENT_DISPUTED' ? 'bg-rose-50 text-rose-700' :
                                                    'bg-blue-50 text-blue-700'
                                                }`}>
                                                {f.status?.replace(/_/g, ' ')}
                                              </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400">
                                              {new Date(f.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              })}
                                            </span>
                                          </div>
                                          {f.clientResponse && (
                                            <div className="text-[11px] text-slate-600">
                                              <strong className="text-slate-700">Client Response:</strong> {f.clientResponse}
                                            </div>
                                          )}
                                          <p className="text-slate-700 text-xs leading-relaxed">{f.notes}</p>
                                          {(f.expectedPaymentDate || f.expectedAmount) && (
                                            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-medium">
                                              {f.expectedPaymentDate && (
                                                <span>Promise Date: <strong className="text-slate-800">{new Date(f.expectedPaymentDate).toLocaleDateString('en-IN')}</strong></span>
                                              )}
                                              {f.expectedAmount && (
                                                <span>Committed Amount: <strong className="text-emerald-700">₹{Number(f.expectedAmount).toLocaleString('en-IN')}</strong></span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
                              ⏳ Waiting for Accounts to verify advance payment receipt before technical handover.
                            </div>
                          )}
                        </div>
                      );
                    }))}
                </div>

                {/* Deliverable Individual Review Modal */}
                <ModalPortal
                  isOpen={!!deliverableReviewModal}
                  onClose={() => !reviewSubmitting && setDeliverableReviewModal(null)}
                >
                  {deliverableReviewModal && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500" />
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3066BE] flex items-center justify-center shrink-0 border border-blue-200">
                              <FileCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">
                                Review Deliverable
                              </h3>
                              <p className="text-xs text-slate-500">
                                {deliverableReviewModal.deliverable.title} {deliverableReviewModal.deliverable.version ? `(v${deliverableReviewModal.deliverable.version})` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeliverableReviewModal(null)}
                            disabled={reviewSubmitting}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {deliverableReviewModal.deliverable.fileUrl && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-700 font-medium truncate max-w-xs">
                              {deliverableReviewModal.deliverable.title}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              {isExternalWebLink(deliverableReviewModal.deliverable.fileUrl) ? (
                                <a
                                  href={deliverableReviewModal.deliverable.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-[#3066BE] hover:underline inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Open Link
                                </a>
                              ) : (
                                <>
                                  <a
                                    href={deliverableReviewModal.deliverable.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-[#3066BE] hover:underline inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => downloadFile(deliverableReviewModal.deliverable.fileUrl, deliverableReviewModal.deliverable.title || 'deliverable')}
                                    className="px-2.5 py-1 rounded bg-[#3066BE] text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer hover:bg-[#204482] transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleReviewDeliverable} className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">
                              Review Decision <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setReviewAction('APPROVE_AND_SHARE')}
                                className={`p-3 rounded-xl border text-left transition-all ${reviewAction === 'APPROVE_AND_SHARE'
                                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                                  }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className={`w-4 h-4 ${reviewAction === 'APPROVE_AND_SHARE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                  <span className="text-xs font-bold text-slate-900">Approve & Share</span>
                                </div>
                                <p className="text-[11px] text-slate-500">Makes deliverable visible to client on portal</p>
                              </button>

                              <button
                                type="button"
                                onClick={() => setReviewAction('REQUEST_CHANGES')}
                                className={`p-3 rounded-xl border text-left transition-all ${reviewAction === 'REQUEST_CHANGES'
                                  ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                                  }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className={`w-4 h-4 ${reviewAction === 'REQUEST_CHANGES' ? 'text-amber-600' : 'text-slate-400'}`} />
                                  <span className="text-xs font-bold text-slate-900">Request Changes</span>
                                </div>
                                <p className="text-[11px] text-slate-500">Sends correction request back to Technical team</p>
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Review Notes / Instructions {reviewAction === 'REQUEST_CHANGES' && <span className="text-red-500">*</span>}
                            </label>
                            <textarea
                              rows={3}
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder={
                                reviewAction === 'REQUEST_CHANGES'
                                  ? 'Detail the changes or corrections needed from the Technical team...'
                                  : 'Optional approval notes or message for the client...'
                              }
                              required={reviewAction === 'REQUEST_CHANGES'}
                              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE]"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setDeliverableReviewModal(null)}
                              disabled={reviewSubmitting}
                              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={reviewSubmitting || (reviewAction === 'REQUEST_CHANGES' && !reviewNotes.trim())}
                              className="px-4 py-2 rounded-xl bg-[#3066BE] hover:bg-[#204482] text-white text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {reviewSubmitting ? 'Submitting...' : 'Confirm Review'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </ModalPortal>

                {/* BGA Client Review & Feedback Modal */}
                <ModalPortal
                  isOpen={!!bgaFeedbackModal}
                  onClose={() => !bgaFeedbackSubmitting && setBgaFeedbackModal(null)}
                >
                  {bgaFeedbackModal && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500" />
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                              <MessageSquare className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">
                                Add Client Review & Feedback
                              </h3>
                              <p className="text-xs text-slate-500">
                                Project {bgaFeedbackModal.project.projectNumber} {bgaFeedbackModal.clientName ? `• ${bgaFeedbackModal.clientName}` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBgaFeedbackModal(null)}
                            disabled={bgaFeedbackSubmitting}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handlePostBgaFeedback} className="space-y-4">
                          {/* Client Decision: Approved vs Changes Requested */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">
                              Client Decision / Status <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setBgaClientDecision('APPROVED')}
                                className={`p-3 rounded-xl border text-left transition-all ${bgaClientDecision === 'APPROVED'
                                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                                  }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className={`w-4 h-4 ${bgaClientDecision === 'APPROVED' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                  <span className="text-xs font-bold text-slate-900">Client Approved</span>
                                </div>
                                <p className="text-[11px] text-slate-500">Client is satisfied with deliverables. Project advances to 95% completion.</p>
                              </button>

                              <button
                                type="button"
                                onClick={() => setBgaClientDecision('CHANGES_REQUESTED')}
                                className={`p-3 rounded-xl border text-left transition-all ${bgaClientDecision === 'CHANGES_REQUESTED'
                                  ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                                  }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className={`w-4 h-4 ${bgaClientDecision === 'CHANGES_REQUESTED' ? 'text-amber-600' : 'text-slate-400'}`} />
                                  <span className="text-xs font-bold text-slate-900">Changes Requested</span>
                                </div>
                                <p className="text-[11px] text-slate-500">Flags project as CORRECTION_REQUIRED and alerts Technical team to revise.</p>
                              </button>
                            </div>
                          </div>

                          {/* Communication Type */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Feedback Category
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setBgaFeedbackType('CLIENT_FEEDBACK')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${bgaFeedbackType === 'CLIENT_FEEDBACK'
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                              >
                                Client Review Feedback
                              </button>
                              <button
                                type="button"
                                onClick={() => setBgaFeedbackType('INTERNAL_NOTE')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${bgaFeedbackType === 'INTERNAL_NOTE'
                                  ? 'border-purple-600 bg-purple-50 text-purple-700 font-bold'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                              >
                                Internal Note (Technical Desk)
                              </button>
                            </div>
                          </div>

                          {/* Content */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Client Review & Feedback Details <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              rows={4}
                              value={bgaFeedbackContent}
                              onChange={(e) => setBgaFeedbackContent(e.target.value)}
                              placeholder={
                                bgaClientDecision === 'APPROVED'
                                  ? 'Enter client confirmation notes, appreciation, or final sign-off remarks...'
                                  : 'List the specific changes, edits, or corrections requested by the client...'
                              }
                              required
                              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setBgaFeedbackModal(null)}
                              disabled={bgaFeedbackSubmitting}
                              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={bgaFeedbackSubmitting || !bgaFeedbackContent.trim()}
                              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                            >
                              {bgaFeedbackSubmitting ? 'Recording...' : 'Submit Client Review'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </ModalPortal>
              </div>
            )
          }

          {/* TAB 8: MY EARNINGS & COMMISSIONS — COMPREHENSIVE PERFORMANCE DASHBOARD */}
          {
            activeTab === 'earnings' && (
              <div className="space-y-6">
                {/* Dashboard Header Bar */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-[#119DA4]" />
                      My Earnings & Business Performance Dashboard
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time commission tracking, business conversion funnel, service performance breakdown, and verified ledger.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadTabData('earnings')}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Dashboard
                  </button>
                </div>

                {!earningsData && tabLoading ? (
                  <div className="space-y-4">
                    <SkeletonStatsRow />
                    <SkeletonTable rows={5} cols={6} />
                  </div>
                ) : (() => {
                  const summary = earningsData?.summary || {
                    totalClients: clients.length,
                    activeClients: clients.filter((c) => c.status === 'ACTIVE').length,
                    totalServiceRequests: clientRequests.length,
                    approvedRequests: clientRequests.filter((r) => r.adminApprovalStatus === 'APPROVED').length,
                    quotationsAccepted: quotations.filter((q) => q.status === 'ACCEPTED').length,
                    projectsInProgress: workOrders.filter((w) => w.project && w.project.status !== 'COMPLETED').length,
                    projectsCompleted: workOrders.filter((w) => w.project && w.project.status === 'COMPLETED').length,
                    totalEligibleRevenue: 0,
                    totalCommissionEarned: commissions.filter((c) => c.eligibilityStatus === 'ELIGIBLE').reduce((a, c) => a + (c.calculatedCommission || 0), 0),
                    pendingCommission: commissions.filter((c) => c.eligibilityStatus === 'ELIGIBLE' && c.payoutStatus === 'UNPAID').reduce((a, c) => a + (c.calculatedCommission || 0), 0),
                    commissionPaid: commissions.filter((c) => c.eligibilityStatus === 'ELIGIBLE' && c.payoutStatus === 'PROCESSED').reduce((a, c) => a + (c.calculatedCommission || 0), 0),
                    commissionPipeline: commissions.filter((c) => c.eligibilityStatus === 'PENDING_CRITERIA').reduce((a, c) => a + (c.calculatedCommission || 0), 0),
                  };

                  const breakdown = earningsData?.breakdown || {
                    earned: summary.totalCommissionEarned,
                    pending: summary.pendingCommission,
                    paid: summary.commissionPaid,
                    pipeline: summary.commissionPipeline || 0,
                  };

                  const servicePerf: any[] = earningsData?.servicePerformance || [];

                  // Filter commissions list
                  const filteredCommissions = commissions.filter((c) => {
                    const q = earningsSearch.toLowerCase().trim();
                    const matchesSearch =
                      !q ||
                      c.client?.clientName?.toLowerCase().includes(q) ||
                      c.client?.businessName?.toLowerCase().includes(q) ||
                      c.workOrder?.workOrderNumber?.toLowerCase().includes(q) ||
                      c.payment?.transactionReference?.toLowerCase().includes(q);

                    const matchesCat =
                      earningsCategoryFilter === 'ALL' || c.serviceCategory === earningsCategoryFilter;

                    const matchesStatus =
                      earningsStatusFilter === 'ALL' ||
                      c.eligibilityStatus === earningsStatusFilter ||
                      c.payoutStatus === earningsStatusFilter;

                    let matchesDate = true;
                    if (earningsDateFilter === 'THIS_MONTH') {
                      const cDate = new Date(c.createdAt);
                      const now = new Date();
                      matchesDate =
                        cDate.getMonth() === now.getMonth() && cDate.getFullYear() === now.getFullYear();
                    } else if (earningsDateFilter === 'LAST_90_DAYS') {
                      const diffDays =
                        (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                      matchesDate = diffDays <= 90;
                    } else if (earningsDateFilter === 'THIS_YEAR') {
                      matchesDate = new Date(c.createdAt).getFullYear() === new Date().getFullYear();
                    }

                    return matchesSearch && matchesCat && matchesStatus && matchesDate;
                  });

                  return (
                    <div className="space-y-6">
                      {/* 1. 11 PERFORMANCE SUMMARY CARDS */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Performance Summary (11 Core Metrics)
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                          {/* 1. Total Clients */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Clients</span>
                            <div className="text-lg font-extrabold text-slate-900 mt-0.5">{summary.totalClients}</div>
                            <span className="text-[10px] text-slate-500">Registered portfolio</span>
                          </div>

                          {/* 2. Active Clients */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Active Clients</span>
                            <div className="text-lg font-extrabold text-teal-600 mt-0.5">{summary.activeClients}</div>
                            <span className="text-[10px] text-slate-500">In engagement</span>
                          </div>

                          {/* 3. Total Requests */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Requests</span>
                            <div className="text-lg font-extrabold text-indigo-600 mt-0.5">{summary.totalServiceRequests}</div>
                            <span className="text-[10px] text-slate-500">Enquiries logged</span>
                          </div>

                          {/* 4. Approved Requests */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Approved Requests</span>
                            <div className="text-lg font-extrabold text-emerald-600 mt-0.5">{summary.approvedRequests}</div>
                            <span className="text-[10px] text-slate-500">Admin validated</span>
                          </div>

                          {/* 5. Quotations Accepted */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Quotes Accepted</span>
                            <div className="text-lg font-extrabold text-[#3066BE] mt-0.5">{summary.quotationsAccepted}</div>
                            <span className="text-[10px] text-slate-500">Client approvals</span>
                          </div>

                          {/* 6. Projects In Progress */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">In Progress</span>
                            <div className="text-lg font-extrabold text-amber-600 mt-0.5">{summary.projectsInProgress}</div>
                            <span className="text-[10px] text-slate-500">Active tech delivery</span>
                          </div>

                          {/* 7. Projects Completed */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Completed</span>
                            <div className="text-lg font-extrabold text-teal-600 mt-0.5">{summary.projectsCompleted}</div>
                            <span className="text-[10px] text-slate-500">Delivered projects</span>
                          </div>

                          {/* 8. Total Eligible Revenue */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Eligible Revenue</span>
                            <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                              ₹{Number(summary.totalEligibleRevenue || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] text-slate-500">Verified receipts</span>
                          </div>

                          {/* 9. Total Commission Earned */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Commission Earned</span>
                            <div className="text-lg font-extrabold text-[#119DA4] mt-0.5">
                              ₹{Number(summary.totalCommissionEarned || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] text-slate-500">Total unlocked</span>
                          </div>

                          {/* 10. Pending Commission */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Pending Payout</span>
                            <div className="text-lg font-extrabold text-amber-600 mt-0.5">
                              ₹{Number(summary.pendingCommission || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] text-slate-500">Awaiting cycle</span>
                          </div>

                          {/* 11. Commission Paid */}
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Commission Paid</span>
                            <div className="text-lg font-extrabold text-[#3066BE] mt-0.5">
                              ₹{Number(summary.commissionPaid || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] text-slate-500">Disbursed to bank</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. 4 KEY FINANCIAL EARNINGS BREAKDOWN CARDS */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Financial Status Breakdown
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Card 1: Commission Earned */}
                          <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50/50 border border-teal-200/80 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                                Commission Earned
                              </span>
                              <Award className="w-5 h-5 text-[#119DA4]" />
                            </div>
                            <div className="text-2xl font-black text-teal-900 mt-2">
                              ₹{Number(breakdown.earned || 0).toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-teal-700 mt-1">
                              Total eligible commissions unlocked from verified client payments & completed deliverables.
                            </p>
                          </div>

                          {/* Card 2: Commission Pending */}
                          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                                Commission Pending
                              </span>
                              <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="text-2xl font-black text-amber-900 mt-2">
                              ₹{Number(breakdown.pending || 0).toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-amber-700 mt-1">
                              Approved commissions awaiting scheduled disbursement to your registered bank account.
                            </p>
                          </div>

                          {/* Card 3: Commission Paid */}
                          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                                Commission Paid
                              </span>
                              <CheckCircle2 className="w-5 h-5 text-[#3066BE]" />
                            </div>
                            <div className="text-2xl font-black text-blue-900 mt-2">
                              ₹{Number(breakdown.paid || 0).toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-blue-700 mt-1">
                              Disbursed payouts successfully transferred and cleared in your bank account.
                            </p>
                          </div>

                          {/* Card 4: Commission Pipeline */}
                          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Commission in Pipeline
                              </span>
                              <TrendingUp className="w-5 h-5 text-slate-500" />
                            </div>
                            <div className="text-2xl font-black text-slate-800 mt-2">
                              ₹{Number(breakdown.pipeline || 0).toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">
                              Potential commissions awaiting project milestone completion or client payment verification.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 3. SERVICE-WISE BUSINESS PERFORMANCE (4 CORE CATEGORIES) */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-[#119DA4]" />
                            Service-Wise Business Performance & Commission Rules
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Side-by-side performance breakdown across Digital Marketing, Website Dev, Mobile App Dev, and Custom Software.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            {
                              key: 'DIGITAL_MARKETING',
                              name: 'Digital Marketing',
                              rate: 'Configured Range',
                              model: 'Monthly Subscription (excl. ad spend)',
                              icon: TrendingUp,
                              accent: 'border-teal-200 bg-teal-50/30',
                            },
                            {
                              key: 'WEBSITE_DEVELOPMENT',
                              name: 'Website Development',
                              rate: 'Configured Range',
                              model: 'Project-based on delivery completion',
                              icon: Globe,
                              accent: 'border-blue-200 bg-blue-50/30',
                            },
                            {
                              key: 'MOBILE_APPLICATION_DEVELOPMENT',
                              name: 'Mobile Application',
                              rate: 'Configured Range',
                              model: 'Milestone / Full completion delivery',
                              icon: Smartphone,
                              accent: 'border-indigo-200 bg-indigo-50/30',
                            },
                            {
                              key: 'SOFTWARE_DEVELOPMENT',
                              name: 'Custom Software / ERP',
                              rate: 'Configured Range',
                              model: 'Enterprise milestones upon delivery',
                              icon: Code2,
                              accent: 'border-purple-200 bg-purple-50/30',
                            },
                          ].map((cat) => {
                            const stat = servicePerf.find((s) => s.category === cat.key) || {
                              clientCount: 0,
                              requestCount: 0,
                              approvedRequests: 0,
                              acceptedQuotations: 0,
                              activeProjects: 0,
                              completedProjects: 0,
                              eligibleRevenue: 0,
                              commissionEarned: 0,
                              pendingCommission: 0,
                            };

                            const IconComponent = cat.icon;

                            return (
                              <div
                                key={cat.key}
                                className={`p-4 rounded-xl border ${cat.accent} space-y-3 text-xs`}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <strong className="text-sm text-slate-900 block">{cat.name}</strong>
                                    <span className="text-[10px] text-slate-500 block mt-0.5">{cat.model}</span>
                                  </div>
                                  <span className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                                    <IconComponent className="w-4 h-4 text-[#3066BE]" />
                                  </span>
                                </div>

                                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60 flex items-center justify-between">
                                  <span className="text-[11px] text-slate-500">Commission Rate</span>
                                  <span className="font-bold text-[#119DA4]">{cat.rate}</span>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                  <div className="flex justify-between text-slate-600">
                                    <span>Clients Acquired:</span>
                                    <strong className="text-slate-900">{stat.clientCount}</strong>
                                  </div>
                                  <div className="flex justify-between text-slate-600">
                                    <span>Requests (Approved):</span>
                                    <strong className="text-slate-900">
                                      {stat.requestCount} ({stat.approvedRequests})
                                    </strong>
                                  </div>
                                  <div className="flex justify-between text-slate-600">
                                    <span>Quotations Accepted:</span>
                                    <strong className="text-slate-900">{stat.acceptedQuotations}</strong>
                                  </div>
                                  <div className="flex justify-between text-slate-600">
                                    <span>Active / Completed:</span>
                                    <strong className="text-slate-900">
                                      {stat.activeProjects} / {stat.completedProjects}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                                    <span>Eligible Revenue:</span>
                                    <strong className="text-slate-900">₹{Number(stat.eligibleRevenue || 0).toLocaleString('en-IN')}</strong>
                                  </div>
                                  <div className="flex justify-between text-[#119DA4] font-bold">
                                    <span>Commission Earned:</span>
                                    <span>₹{Number(stat.commissionEarned || 0).toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. INTERACTIVE EARNINGS HISTORY TABLE WITH LIVE FILTERS */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Layers className="w-4 h-4 text-[#119DA4]" />
                              Official Commission Ledger & Calculation History
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Filter transactions, inspect calculation steps, and audit payment clearance.
                            </p>
                          </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
                          {/* Search */}
                          <div className="relative w-full lg:w-72">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="Search client, work order #, transaction ref..."
                              value={earningsSearch}
                              onChange={(e) => setEarningsSearch(e.target.value)}
                              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                            />
                          </div>

                          {/* Filters */}
                          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto text-xs">
                            {/* Category Filter */}
                            <select
                              value={earningsCategoryFilter}
                              onChange={(e) => setEarningsCategoryFilter(e.target.value)}
                              className="p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                            >
                              <option value="ALL">All Categories</option>
                              <option value="DIGITAL_MARKETING">Digital Marketing</option>
                              <option value="WEBSITE_DEVELOPMENT">Website Dev</option>
                              <option value="MOBILE_APPLICATION_DEVELOPMENT">Mobile App Dev</option>
                              <option value="SOFTWARE_DEVELOPMENT">Custom Software</option>
                            </select>

                            {/* Status Filter */}
                            <select
                              value={earningsStatusFilter}
                              onChange={(e) => setEarningsStatusFilter(e.target.value)}
                              className="p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                            >
                              <option value="ALL">All Statuses</option>
                              <option value="ELIGIBLE">Eligible</option>
                              <option value="PENDING_CRITERIA">Pending Criteria</option>
                              <option value="UNPAID">Pending Payout</option>
                              <option value="PROCESSED">Paid / Disbursed</option>
                            </select>

                            {/* Date Filter */}
                            <select
                              value={earningsDateFilter}
                              onChange={(e) => setEarningsDateFilter(e.target.value)}
                              className="p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                            >
                              <option value="ALL">All Time</option>
                              <option value="THIS_MONTH">This Month</option>
                              <option value="LAST_90_DAYS">Last 90 Days</option>
                              <option value="THIS_YEAR">This Year</option>
                            </select>
                          </div>
                        </div>

                        {/* Ledger Table */}
                        {filteredCommissions.length === 0 ? (
                          <div className="p-10 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 text-xs text-slate-500">
                            <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                            {commissions.length === 0 ? (
                              <div className="max-w-md mx-auto space-y-1">
                                <p className="font-bold text-slate-700 text-sm">No Commissions Earned Yet</p>
                                <p className="text-slate-500 text-xs leading-relaxed">
                                  Commission records are automatically generated when the Accounts department verifies an eligible client payment (monthly retainers for Digital Marketing, or final milestone payments upon project completion for Development projects).
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="font-semibold text-slate-700">No commission records match your filter criteria.</p>
                                <p className="text-slate-400 mt-1">Try resetting the search keywords, category, status, or date range.</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="p-3.5">Client & Business</th>
                                  <th className="p-3.5">Service & Billing</th>
                                  <th className="p-3.5">Work Order & Project</th>
                                  <th className="p-3.5">Payment Base</th>
                                  <th className="p-3.5">Commission Amount</th>
                                  <th className="p-3.5">Eligibility</th>
                                  <th className="p-3.5">Payout Status</th>
                                  <th className="p-3.5 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredCommissions.map((c) => {
                                  const ratePct = c.commissionRate
                                    ? `${c.commissionRate}%`
                                    : 'Approved Rate';

                                  return (
                                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                      {/* Client & Business */}
                                      <td className="p-3.5">
                                        <div className="font-bold text-slate-900">{c.client?.clientName}</div>
                                        <div className="text-[11px] text-indigo-600 font-medium">
                                          {c.client?.businessName}
                                        </div>
                                      </td>

                                      {/* Service & Billing */}
                                      <td className="p-3.5">
                                        <span className="font-bold text-slate-800">
                                          {c.serviceCategory?.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block">{c.billingType}</span>
                                      </td>

                                      {/* Work Order & Project */}
                                      <td className="p-3.5 font-mono text-[11px]">
                                        <div className="text-slate-800 font-bold">
                                          {c.workOrder?.workOrderNumber || '—'}
                                        </div>
                                        {c.project && (
                                          <div className="text-[10px] text-slate-500 font-sans">
                                            Proj: {c.project.projectNumber} ({c.project.status})
                                          </div>
                                        )}
                                      </td>

                                      {/* Payment Base */}
                                      <td className="p-3.5">
                                        <div className="font-bold text-slate-900">
                                          ₹{Number(c.payment?.amount || c.workOrder?.totalValue || 0).toLocaleString('en-IN')}
                                        </div>
                                        {c.payment?.transactionReference && (
                                          <span className="text-[10px] text-slate-400 font-mono block">
                                            Ref: {c.payment.transactionReference}
                                          </span>
                                        )}
                                      </td>

                                      {/* Commission Amount */}
                                      <td className="p-3.5">
                                        <div className="text-sm font-black text-[#119DA4]">
                                          ₹{Number(c.calculatedCommission || 0).toLocaleString('en-IN')}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-semibold block">
                                          Rate: {ratePct}
                                        </span>
                                      </td>

                                      {/* Eligibility */}
                                      <td className="p-3.5">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.eligibilityStatus === 'ELIGIBLE'
                                            ? 'bg-emerald-100 text-[#119DA4] border border-[#119DA4]/20'
                                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                                            }`}
                                        >
                                          {c.eligibilityStatus}
                                        </span>
                                      </td>

                                      {/* Payout Status */}
                                      <td className="p-3.5">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.payoutStatus === 'PROCESSED'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                            }`}
                                        >
                                          {c.payoutStatus}
                                        </span>
                                        {c.payoutReference && (
                                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            Ref: {c.payoutReference}
                                          </div>
                                        )}
                                      </td>

                                      {/* Action */}
                                      <td className="p-3.5 text-right">
                                        <button
                                          type="button"
                                          onClick={() => setCalculationModal(c)}
                                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                          title="View Commission Calculation Breakdown"
                                        >
                                          <Calculator className="w-3.5 h-3.5" />
                                          Breakdown
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* CALCULATION BREAKDOWN MODAL */}
                <ModalPortal
                  isOpen={!!calculationModal}
                  onClose={() => setCalculationModal(null)}
                >
                  {calculationModal && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-[#119DA4] to-[#3066BE]" />
                      <div className="p-6 space-y-4 text-xs">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-teal-50 rounded-xl border border-[#119DA4]/20">
                              <Calculator className="w-5 h-5 text-[#119DA4]" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">Commission Calculation Breakdown</h3>
                              <p className="text-xs text-slate-500">
                                Client: <strong className="text-slate-800">{calculationModal.client?.clientName}</strong>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCalculationModal(null)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Calculation Steps */}
                        {(() => {
                          const isDM = calculationModal.serviceCategory === 'DIGITAL_MARKETING';
                          const ratePercent = isDM ? 15 : 12;
                          const rawPayment = Number(calculationModal.payment?.amount || calculationModal.workOrder?.totalValue || 0);
                          const adSpend = isDM ? Number(calculationModal.payment?.adBudgetAmount || 0) : 0;
                          const commissionableBase = Math.max(0, rawPayment - adSpend);
                          const calculatedCommission = Number(calculationModal.calculatedCommission || 0);

                          return (
                            <div className="space-y-3">
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Service Category:</span>
                                  <strong className="text-slate-900">{calculationModal.serviceCategory?.replace(/_/g, ' ')}</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Billing Model:</span>
                                  <span className="font-semibold text-slate-800">{calculationModal.billingType}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Work Order Ref:</span>
                                  <span className="font-mono text-slate-800 font-bold">{calculationModal.workOrder?.workOrderNumber || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Payment Status:</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {calculationModal.payment?.status || 'VERIFIED'}
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl bg-teal-50/50 border border-[#119DA4]/20 space-y-2">
                                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                                  Step-by-Step Mathematical Computation
                                </span>
                                <div className="flex justify-between text-slate-700">
                                  <span>1. Base Payment Received:</span>
                                  <strong>₹{rawPayment.toLocaleString('en-IN')}</strong>
                                </div>
                                {isDM && (
                                  <div className="flex justify-between text-amber-700">
                                    <span>2. Excluded Media Ad Spend:</span>
                                    <strong>- ₹{adSpend.toLocaleString('en-IN')}</strong>
                                  </div>
                                )}
                                <div className="flex justify-between text-slate-900 font-semibold pt-1 border-t border-teal-200/50">
                                  <span>{isDM ? '3.' : '2.'} Net Commissionable Service Fee:</span>
                                  <strong>₹{commissionableBase.toLocaleString('en-IN')}</strong>
                                </div>
                                <div className="flex justify-between text-slate-700">
                                  <span>{isDM ? '4.' : '3.'} Applicable Commission Rate:</span>
                                  <strong className="text-[#119DA4]">{ratePercent}%</strong>
                                </div>
                                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-teal-200">
                                  <span>Final Calculated Commission:</span>
                                  <span className="text-[#119DA4]">₹{calculatedCommission.toLocaleString('en-IN')}</span>
                                </div>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
                                <strong>Eligibility Rule:</strong>
                                <p>
                                  {isDM
                                    ? 'Digital Marketing commissions unlock upon verification of monthly retainer payment (ad spend strictly excluded from commission base).'
                                    : 'Website, Mobile & Software commissions unlock upon 100% technical project completion and full client payment clearance.'}
                                </p>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setCalculationModal(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                          >
                            Close Breakdown
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </ModalPortal>
              </div>
            )
          }

          {/* TAB 8: COMPANY RESOURCES */}
          {
            activeTab === 'resources' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <h2 className="text-base font-bold text-slate-900">Company Resources</h2>
                  <p className="text-xs text-slate-500">Official resources and presentations authorized by management for presenting to prospects.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.map((r) => (
                    <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">{r.category}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{r.title}</h4>
                        <p className="text-xs text-slate-600 mt-1.5">{r.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="font-mono text-slate-400">{r.fileType || 'DOCUMENT'} File</span>
                        {r.fileUrl ? (
                          <a
                            href={r.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded font-semibold hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                        ) : (
                          <button
                            onClick={() => toast.info(`Downloading presentation: ${r.title}`)}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded font-semibold hover:bg-indigo-100 flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          {/* TAB 11: SUPPORT */}
          {
            activeTab === 'support' && (
              <div className="w-full space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-[#152544] to-[#3066BE] text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#80DED9] bg-[#119DA4]/20 px-3 py-1 rounded-full border border-[#80DED9]/30 inline-block mb-2">
                        Associate Support & Headquarters Desk
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        Connect with Atriowings Technologies
                      </h3>
                      <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                        Have questions regarding quotation preparation, technical project feasibility, client onboarding, or commission disbursement? Reach our executive desk directly.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <a
                        href="https://wa.me/918825948859"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>WhatsApp Desk</span>
                      </a>
                      <a
                        href="tel:+918825948859"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all"
                      >
                        <Phone className="w-4 h-4 text-[#80DED9]" />
                        <span>Call Now</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Contact Information Cards (From Landing Page) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Corporate Office */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#3066BE]/10 text-[#3066BE] flex items-center justify-center mb-3">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider">Corporate Office</span>
                      <h4 className="font-bold text-slate-800 text-sm mt-0.5">Atriowings Technologies</h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        No. 1, Gurudev Complex, 57th St, Venkatraman Nagar, Korattur, Chennai, Tamil Nadu 600080.
                      </p>
                    </div>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=No.+1,+Gurudev+Complex,+57th+St,+Venkatraman+Nagar,+Korattur,+Chennai,+Tamil+Nadu+600080"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#3066BE] font-bold hover:underline mt-4 pt-3 border-t border-slate-100"
                    >
                      <span>Google Maps Directions</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Telephone Support */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#119DA4]/10 text-[#119DA4] flex items-center justify-center mb-3">
                        <Phone className="w-5 h-5" />
                      </div>
                      <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider">Direct Phone Helpline</span>
                      <h4 className="font-bold text-slate-800 text-sm mt-0.5">Associate Line</h4>
                      <a
                        href="tel:+918825948859"
                        className="text-base font-extrabold text-[#3066BE] hover:underline block mt-2"
                      >
                        +91 8825948859
                      </a>
                      <span className="text-xs text-slate-500 mt-1 block">
                        Mon – Sat, 9:00 AM – 7:00 PM IST
                      </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Desk Active</span>
                    </div>
                  </div>

                  {/* Official Email */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#6D96C5]/10 text-[#3066BE] flex items-center justify-center mb-3">
                        <Mail className="w-5 h-5" />
                      </div>
                      <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider">Official Email Address</span>
                      <h4 className="font-bold text-slate-800 text-sm mt-0.5">Corporate & Support Desk</h4>
                      <a
                        href="mailto:info@atriowings.in"
                        className="text-sm font-bold text-[#3066BE] hover:underline block mt-2 break-all"
                      >
                        info@atriowings.in
                      </a>
                      <span className="text-xs text-slate-500 mt-1 block">
                        Guaranteed response within 2–4 hours
                      </span>
                    </div>
                    <a
                      href="mailto:info@atriowings.in"
                      className="inline-flex items-center gap-1.5 text-xs text-[#3066BE] font-bold hover:underline mt-4 pt-3 border-t border-slate-100"
                    >
                      <span>Send Email to Desk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* WhatsApp & Web */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider">Direct WhatsApp & Web</span>
                      <h4 className="font-bold text-slate-800 text-sm mt-0.5">Atriowings Corporate Portal</h4>
                      <a
                        href="https://wa.me/918825948859"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-emerald-600 hover:underline block mt-2"
                      >
                        WhatsApp: +91 8825948859
                      </a>
                      <a
                        href="https://atriowings.in/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-slate-600 hover:text-[#3066BE] flex items-center gap-1 mt-1.5"
                      >
                        <span>https://atriowings.in</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <a
                      href="https://wa.me/918825948859"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold hover:underline mt-4 pt-3 border-t border-slate-100"
                    >
                      <span>Instant WhatsApp Chat</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Two Column Layout: Support Department Directory + In-Portal Support Ticket Form */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Department Operations Directory */}
                  <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-bold text-slate-900">Specialized Department Desks</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Route your queries to the appropriate management desk for faster turnaround:</p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Commercial & Quotation Desk</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Accounts</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          For quotation approvals, customized milestone billing terms, and official commercial pricing.
                        </p>
                        <a href="mailto:info@atriowings.in?subject=Commercial%20Quotation%20Desk%20Inquiry" className="text-[#3066BE] font-semibold hover:underline block pt-1">
                          info@atriowings.in
                        </a>
                      </div>

                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Technical Feasibility & Architecture</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold">Technical</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          Technical scoping, requirement analysis, tech stack validation, and project delivery schedules.
                        </p>
                        <a href="mailto:info@atriowings.in?subject=Technical%20Feasibility%20Desk%20Inquiry" className="text-[#119DA4] font-semibold hover:underline block pt-1">
                          info@atriowings.in
                        </a>
                      </div>

                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Commission & Payout Reconciliation</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Finance</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          Commission disbursements, bank NEFT/IMPS confirmations, TDS records, and milestone payout releases.
                        </p>
                        <a href="mailto:info@atriowings.in?subject=Commission%20Payout%20Desk%20Inquiry" className="text-emerald-700 font-semibold hover:underline block pt-1">
                          info@atriowings.in
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right: In-Portal Support Ticket Form */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                    <div className="border-b border-slate-100 pb-3 mb-4">
                      <h4 className="text-sm font-bold text-slate-900">Submit a Support Request</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Send a message directly to Atriowings management from your associate workspace:</p>
                    </div>

                    {supportSuccess && (
                      <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{supportSuccess}</span>
                      </div>
                    )}

                    {supportError && (
                      <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{supportError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSupportSubmit} className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Associate Name</label>
                          <input
                            type="text"
                            value={user?.name || ''}
                            readOnly
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Registered Email</label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            readOnly
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Contact Number</label>
                          <input
                            type="text"
                            value={user?.mobile || '+91 8825948859'}
                            readOnly
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Query Department *</label>
                          <select
                            value={supportCategory}
                            onChange={(e) => setSupportCategory(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#3066BE]"
                          >
                            <option value="Quotation & Commercial Inquiries">Quotation & Commercial Inquiries</option>
                            <option value="Technical Project Feasibility">Technical Project Feasibility</option>
                            <option value="Commission & Bank Payout">Commission & Bank Payout</option>
                            <option value="Client Registration & Ownership">Client Registration & Ownership</option>
                            <option value="KYC & Bank Verification">KYC & Bank Verification</option>
                            <option value="General Support">General Support</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Message & Request Details *</label>
                        <textarea
                          rows={4}
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          placeholder="Please describe your enquiry, client ID, quotation reference, or questions in detail..."
                          className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#3066BE]"
                          required
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400">
                          Dispatched directly to Atriowings Executive Operations
                        </span>
                        <button
                          type="submit"
                          disabled={supportSending}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3066BE] to-[#119DA4] hover:from-[#25549e] hover:to-[#0d8187] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {supportSending ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit Request</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )
          }

          {/* CLIENT CONSULTATION & FOLLOW-UP MODAL (ADMIN SCOPE CHANGE & REJECTION RESOLUTION) */}
          <AnimatePresence>
            {followUpModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                onClick={() => !submittingFollowUp && setFollowUpModal(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto my-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${followUpForm.isRejection
                          ? 'text-rose-700 bg-rose-50 border-rose-200'
                          : 'text-amber-600 bg-amber-50 border-amber-200'
                          }`}
                      >
                        {followUpForm.isRejection ? '⚠️ Rejection Consultation & Alert' : 'Client Consultation Follow-up'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {followUpForm.isRejection
                          ? 'Inform Client of Management Rejection'
                          : 'Record Client Discussion & Resubmit'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Enquiry <strong className="text-slate-800">{followUpModal.id}</strong> • Client:{' '}
                        <strong className="text-slate-800">{followUpModal.client?.clientName || followUpModal.clientName || 'Client'}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={submittingFollowUp}
                      onClick={() => setFollowUpModal(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {followUpModal.adminNotes && (
                    <div
                      className={`mb-4 p-3 rounded-xl border text-xs ${followUpForm.isRejection
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                    >
                      <span className="font-bold block mb-0.5">
                        {followUpForm.isRejection ? 'Management Rejection Remarks:' : 'Admin Scope Change Note:'}
                      </span>
                      <span className="text-slate-800 block">{followUpModal.adminNotes}</span>
                      {followUpForm.isRejection && (
                        <span className="text-[11px] text-rose-700 mt-1.5 block font-medium">
                          Guidance: Communicate this rejection reason clearly to the client and capture their response below.
                        </span>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleSubmitFollowUp} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Consultation Date & Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={followUpForm.consultationDate}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, consultationDate: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Communication Channel <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={followUpForm.contactMethod}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, contactMethod: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                        >
                          <option value="Phone Call">Phone Call (Direct)</option>
                          <option value="WhatsApp Message">WhatsApp Message</option>
                          <option value="In-person Meeting">In-person Meeting</option>
                          <option value="Official Email">Official Email</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Next Scheduled Follow-up Date <span className="text-slate-400 font-normal">(Optional — leave blank if consultation concluded)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={followUpForm.nextFollowUpDate}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Client Consultation Discussion Notes <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={followUpForm.consultationNotes}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, consultationNotes: e.target.value })}
                        placeholder={
                          followUpForm.isRejection
                            ? 'Detail what you communicated to the client regarding the rejection, how the client reacted, and what was agreed upon...'
                            : 'Detail what was discussed with the client regarding the scope, payment/budget agreed upon, and client confirmation...'
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
                    </div>

                    {followUpForm.isRejection ? (
                      <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">
                            Client Response Outcome <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={followUpForm.clientOutcome}
                            onChange={(e) => {
                              const val = e.target.value;
                              const shouldResubmit = val.includes('Re-evaluation');
                              setFollowUpForm({
                                ...followUpForm,
                                clientOutcome: val,
                                resubmit: shouldResubmit,
                              });
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                          >
                            <option value="Client Informed - Acknowledged Rejection & Closed">
                              Client Informed - Acknowledged Rejection & Enquiry Closed
                            </option>
                            <option value="Client Wants Alternate Proposal / Different Service">
                              Client Wants Alternate Proposal / Different Service
                            </option>
                            <option value="Client Agrees to Revised Payment / Scope (Request Re-evaluation)">
                              Client Agrees to Revised Payment / Scope (Request Re-evaluation)
                            </option>
                          </select>
                        </div>

                        {followUpForm.resubmit && (
                          <div className="space-y-3 pt-2 border-t border-slate-200">
                            <div>
                              <label className="block text-slate-700 font-semibold mb-1">
                                Agreed Revised Expected Budget (₹)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={followUpForm.revisedBudget}
                                onChange={(e) => setFollowUpForm({ ...followUpForm, revisedBudget: e.target.value })}
                                placeholder="e.g. 150000"
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-700 font-semibold mb-1">
                                Revised Scope / Requirements
                              </label>
                              <textarea
                                rows={2}
                                value={followUpForm.revisedRequirements}
                                onChange={(e) => setFollowUpForm({ ...followUpForm, revisedRequirements: e.target.value })}
                                placeholder="Describe agreed revised scope..."
                                className="w-full bg-white border border-slate-300 rounded-xl p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">
                              Agreed Expected Budget (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={followUpForm.revisedBudget}
                              onChange={(e) => setFollowUpForm({ ...followUpForm, revisedBudget: e.target.value })}
                              placeholder="e.g. 100000"
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">
                              Resubmit Status
                            </label>
                            <div className="h-[38px] flex items-center px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-semibold">
                              ✓ Send to Admin for Approval
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">
                            Updated Project Scope / Requirements (Optional)
                          </label>
                          <textarea
                            rows={2}
                            value={followUpForm.revisedRequirements}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, revisedRequirements: e.target.value })}
                            placeholder="Update scope details if changed based on client discussion..."
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={submittingFollowUp}
                        onClick={() => setFollowUpModal(null)}
                        className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingFollowUp}
                        className={`px-5 py-2 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer ${followUpForm.isRejection
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-[#3066BE] hover:bg-[#255299]'
                          }`}
                      >
                        {submittingFollowUp ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {followUpForm.isRejection
                                ? followUpForm.resubmit
                                  ? 'Save & Resubmit to Admin'
                                  : 'Save & Send Follow-up to Admin'
                                : 'Save & Resubmit to Admin'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final Payment Follow-up Modal */}
          {followUpProjectModal && (
            <FinalPaymentFollowUpModal
              isOpen={!!followUpProjectModal}
              onClose={() => setFollowUpProjectModal(null)}
              project={followUpProjectModal.project}
              clientName={followUpProjectModal.clientName}
              onSuccess={() => loadTabData('projects')}
            />
          )}

          {/* Unified Client Follow-up / Activity Modal */}
          {unifiedFollowUpModal?.isOpen && activeClientDetail && (
            <UnifiedClientFollowUpModal
              isOpen={unifiedFollowUpModal.isOpen}
              onClose={() => setUnifiedFollowUpModal(null)}
              client={activeClientDetail}
              initialContext={unifiedFollowUpModal.initialContext || 'GENERAL'}
              initialTargetId={unifiedFollowUpModal.initialTargetId}
              onSuccess={async () => {
                await loadClientTimeline(activeClientDetail.id);
                await handleOpenClientDetail(activeClientDetail.id);
                loadTabData('clients');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

