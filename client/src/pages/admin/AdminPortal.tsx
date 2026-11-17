import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Layers,
  FileText,
  UserCheck,
  CreditCard,
  Briefcase,
  DollarSign,
  Settings,
  ShieldAlert,
  ArrowRightLeft,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  Filter,
  Calendar,
  Building2,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Lock,
  Download,
  Trash2,
  Globe,
  Smartphone,
  Cpu,
  Megaphone,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { AssociateProfileView } from './AssociateProfileView';
import { apiRequest } from '../../utils/api';
import { SkeletonCard, SkeletonStatsRow, SkeletonTable, AdminDashboardSkeleton } from '../../components/Skeleton';
import { validateBankUtr } from '../../utils/utrValidator';
import { useToast } from '../../context/ToastContext';
import { getQuotationPdfUrl } from '../../utils/downloadPdf';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Generic Reusable Empty State Component
const EmptyState: React.FC<{
  icon: any;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ icon: Icon, title, description, actionText, onAction }) => (
  <div className="w-full p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
    <div className="w-14 h-14 rounded-2xl bg-blue-50/70 border border-purple-100 flex items-center justify-center text-[#3066BE] shadow-sm">
      <Icon className="w-7 h-7" />
    </div>
    <h3 className="text-base font-bold text-slate-800">{title}</h3>
    <p className="text-xs text-slate-500 max-w-md leading-relaxed">{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="mt-2 px-4 py-2 bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm rounded-xl text-xs font-bold transition-colors shadow-sm"
      >
        {actionText}
      </button>
    )}
  </div>
);

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'bgas' | 'services' | 'resources' | 'clients' | 'enquiries' | 'quotations' | 'workorders' | 'technical' | 'commissions' | 'settings'
  >('dashboard');

  const [selectedAssociateId, setSelectedAssociateId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<any>(null);

  const switchTab = (tab: typeof activeTab) => {
    if (activeTab === tab) return;
    setTabLoading(true);
    setActiveTab(tab);
  };
  const [bgas, setBgas] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & Filter States
  const [bgaStatusFilter, setBgaStatusFilter] = useState('ALL');
  const [searchBga, setSearchBga] = useState('');

  const [enquirySearch, setEnquirySearch] = useState('');
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState('ALL');

  const [clientSearch, setClientSearch] = useState('');
  const [clientBgaFilter, setClientBgaFilter] = useState('ALL');

  const [serviceCategoryTab, setServiceCategoryTab] = useState('ALL');

  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState('ALL');

  const [quotationSearch, setQuotationSearch] = useState('');
  const [quotationStatusFilter, setQuotationStatusFilter] = useState('ALL');

  const [workOrderSearch, setWorkOrderSearch] = useState('');
  const [workOrderStatusFilter, setWorkOrderStatusFilter] = useState('ALL');

  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('ALL');

  const [commissionTypeTab, setCommissionTypeTab] = useState<'ALL' | 'DM_SUBSCRIPTION' | 'PROJECT_BASED'>('ALL');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState('ALL');
  const [commissionSearch, setCommissionSearch] = useState('');

  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditLogRoleFilter, setAuditLogRoleFilter] = useState('ALL');

  const { toast } = useToast();

  // Modals & Action States
  const [deleteResourceModal, setDeleteResourceModal] = useState<{ id: string; title: string } | null>(null);
  const [transferModal, setTransferModal] = useState<{ client: any } | null>(null);
  const [targetBgaId, setTargetBgaId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const [enquiryReviewModal, setEnquiryReviewModal] = useState<{
    enquiry: any;
    action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';
  } | null>(null);
  const [enquiryReviewNotes, setEnquiryReviewNotes] = useState('');

  const [quotationReviewModal, setQuotationReviewModal] = useState<{
    quotation: any;
    action: 'APPROVE' | 'REQUEST_REVISION' | 'REJECT';
  } | null>(null);
  const [quotationReviewNotes, setQuotationReviewNotes] = useState('');

  const [handoverReviewModal, setHandoverReviewModal] = useState<{
    workOrder: any;
    action: 'APPROVE' | 'HOLD' | 'REQUEST_CLARIFICATION';
  } | null>(null);
  const [handoverReviewNotes, setHandoverReviewNotes] = useState('');

  const [enquiryDetailModal, setEnquiryDetailModal] = useState<any | null>(null);
  const [quotationDetailModal, setQuotationDetailModal] = useState<any | null>(null);
  const [projectDetailModal, setProjectDetailModal] = useState<any | null>(null);
  const [payoutModal, setPayoutModal] = useState<{ commissionId: string; amount: number; bgaName: string } | null>(null);
  const [payoutReferenceInput, setPayoutReferenceInput] = useState('');

  // Resource Create State
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    category: 'PRESENTATION',
    serviceCategory: 'DIGITAL_MARKETING',
    fileUrl: '',
    fileType: 'PDF',
    isPublished: true,
    isConfidential: false,
  });

  // Load Dashboard Stats independently
  const loadStats = async (bypass = false) => {
    try {
      const statsRes = await apiRequest('/api/admin/dashboard-stats', { bypassCache: bypass });
      setStats(statsRes);
    } catch (e) {
      console.error('Failed to load admin stats:', e);
    }
  };

  // Load Active Tab Data immediately (without blocking on stats)
  const loadTabData = async (tab = activeTab, filter = bgaStatusFilter, search = searchBga) => {
    setTabLoading(true);
    try {
      if (tab === 'bgas') {
        const res = await apiRequest(`/api/admin/bgas?status=${filter}&search=${encodeURIComponent(search)}`);
        setBgas(res.bgas || []);
      } else if (tab === 'services') {
        const res = await apiRequest('/api/admin/services');
        setServices(res.services || []);
      } else if (tab === 'resources') {
        const res = await apiRequest('/api/admin/resources');
        setResources(res.resources || []);
      } else if (tab === 'clients') {
        const [clientRes, bgaRes] = await Promise.all([
          apiRequest('/api/admin/clients'),
          apiRequest('/api/admin/bgas?status=ACTIVE'),
        ]);
        setClients(clientRes.clients || []);
        setBgas(bgaRes.bgas || []);
      } else if (tab === 'enquiries') {
        const res = await apiRequest('/api/admin/enquiries');
        setEnquiries(res.enquiries || []);
      } else if (tab === 'quotations') {
        const res = await apiRequest('/api/accounts/quotation-requests');
        setQuotations(res.requests || []);
      } else if (tab === 'workorders') {
        const res = await apiRequest('/api/accounts/work-orders');
        setWorkOrders(res.workOrders || []);
      } else if (tab === 'technical') {
        const res = await apiRequest('/api/technical/projects');
        setProjects(res.projects || []);
      } else if (tab === 'commissions') {
        const res = await apiRequest('/api/admin/commissions');
        setCommissions(res.commissions || []);
      } else if (tab === 'settings') {
        const [sRes, logsRes] = await Promise.all([
          apiRequest('/api/admin/settings'),
          apiRequest('/api/admin/audit-logs'),
        ]);
        setSettings(sRes.settings || []);
        setAuditLogs(logsRes.logs || []);
      }
      setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
    } catch (e) {
      console.error('Failed to load portal data:', e);
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

  // Tab switch or status filter changes: load tab immediately
  useEffect(() => {
    loadTabData(activeTab, bgaStatusFilter, searchBga);
  }, [activeTab, bgaStatusFilter]);

  // Debounced search for BGAs
  useEffect(() => {
    if (activeTab !== 'bgas') return;
    const timeout = setTimeout(() => {
      loadTabData('bgas', bgaStatusFilter, searchBga);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchBga]);

  // Handle BGA Approval Action
  const handleBgaAction = async (id: string, action: string, reason?: string) => {
    try {
      await apiRequest(`/api/admin/bgas/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
      toast.success('BGA account status updated successfully.');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update BGA status');
    }
  };

  // Handle Enquiry Review Execution
  const executeEnquiryReview = async () => {
    if (!enquiryReviewModal) return;
    try {
      await apiRequest(`/api/admin/enquiries/${enquiryReviewModal.enquiry.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action: enquiryReviewModal.action,
          notes: enquiryReviewNotes,
        }),
      });
      toast.success(`Enquiry ${enquiryReviewModal.action.toLowerCase()} recorded successfully.`);
      setEnquiryReviewModal(null);
      setEnquiryReviewNotes('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to review enquiry');
    }
  };

  // Handle Quotation Review Execution (Approve, Revision, Reject)
  const executeQuotationReview = async () => {
    if (!quotationReviewModal) return;
    try {
      await apiRequest(`/api/admin/quotations/${quotationReviewModal.quotation.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action: quotationReviewModal.action,
          notes: quotationReviewNotes,
        }),
      });
      toast.success(`Quotation ${quotationReviewModal.action.toLowerCase()} action processed.`);
      setQuotationReviewModal(null);
      setQuotationReviewNotes('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to review quotation');
    }
  };

  // Handle Technical Handover Authorization (Approve, Hold, Clarification)
  const executeHandoverReview = async () => {
    if (!handoverReviewModal) return;
    try {
      await apiRequest(`/api/admin/handovers/${handoverReviewModal.workOrder.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action: handoverReviewModal.action,
          notes: handoverReviewNotes,
        }),
      });
      toast.success(`Technical handover ${handoverReviewModal.action.toLowerCase()} recorded.`);
      setHandoverReviewModal(null);
      setHandoverReviewNotes('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to process handover review');
    }
  };

  // Handle Commission Approval
  const handleCommissionAction = async (id: string, action: string) => {
    try {
      await apiRequest(`/api/admin/commissions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      toast.success(`Commission ${action.toLowerCase()} processed successfully.`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update commission');
    }
  };

  // Handle Payout Disbursed
  const executePayout = async () => {
    if (!payoutModal) return;
    const validation = validateBankUtr(payoutReferenceInput, 'BANK_TRANSFER');
    if (!validation.isValid) {
      toast.warning(`Invalid Bank Transaction / UTR: ${validation.error}${validation.hint ? ' (' + validation.hint + ')' : ''}`);
      return;
    }
    try {
      await apiRequest(`/api/admin/commissions/${payoutModal.commissionId}/payout`, {
        method: 'POST',
        body: JSON.stringify({ payoutReference: validation.formattedUtr }),
      });
      toast.success(`Disbursement of ₹${payoutModal.amount?.toLocaleString()} recorded with UTR: ${validation.formattedUtr}`);
      setPayoutModal(null);
      setPayoutReferenceInput('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to record payout disbursement');
    }
  };

  // Handle Client Ownership Transfer
  const executeClientTransfer = async () => {
    if (!transferModal || !targetBgaId) return;
    try {
      await apiRequest(`/api/admin/clients/${transferModal.client.id}/transfer-ownership`, {
        method: 'POST',
        body: JSON.stringify({ newBgaId: targetBgaId, reason: transferReason }),
      });
      toast.success('Client ownership transferred successfully.');
      setTransferModal(null);
      setTransferReason('');
      setTargetBgaId('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to transfer client ownership');
    }
  };

  // Handle Save Settings
  const handleSaveSetting = async (key: string, value: string) => {
    try {
      await apiRequest('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ settings: [{ key, value }] }),
      });
      toast.success('System setting updated successfully.');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save setting');
    }
  };

  // Create Resource
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/resources', {
        method: 'POST',
        body: JSON.stringify(newResource),
      });
      toast.success('Resource created and published successfully.');
      setShowResourceForm(false);
      setNewResource({
        title: '',
        description: '',
        category: 'PRESENTATION',
        serviceCategory: 'DIGITAL_MARKETING',
        fileUrl: '',
        fileType: 'PDF',
        isPublished: true,
        isConfidential: false,
      });
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create resource');
    }
  };

  // Toggle Resource Published
  const handleToggleResourcePublish = async (id: string, current: boolean) => {
    try {
      await apiRequest(`/api/admin/resources/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isPublished: !current }),
      });
      toast.success(`Resource ${!current ? 'published' : 'unpublished'}.`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to toggle resource status');
    }
  };

  // Delete Resource Execution
  const confirmDeleteResource = async () => {
    if (!deleteResourceModal) return;
    try {
      await apiRequest(`/api/admin/resources/${deleteResourceModal.id}`, { method: 'DELETE' });
      toast.success('Resource deleted permanently.');
      setDeleteResourceModal(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete resource');
    }
  };

  // Filtered Enquiries
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((enq) => {
      const matchSearch =
        !enquirySearch ||
        enq.client?.clientName?.toLowerCase().includes(enquirySearch.toLowerCase()) ||
        enq.client?.businessName?.toLowerCase().includes(enquirySearch.toLowerCase()) ||
        enq.bga?.name?.toLowerCase().includes(enquirySearch.toLowerCase()) ||
        enq.serviceCategory?.toLowerCase().includes(enquirySearch.toLowerCase());
      const matchStatus = enquiryStatusFilter === 'ALL' || enq.status === enquiryStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [enquiries, enquirySearch, enquiryStatusFilter]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        !clientSearch ||
        c.clientName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.businessName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.mobile?.includes(clientSearch) ||
        c.location?.toLowerCase().includes(clientSearch.toLowerCase());
      const matchBga = clientBgaFilter === 'ALL' || c.bgaId === clientBgaFilter;
      return matchSearch && matchBga;
    });
  }, [clients, clientSearch, clientBgaFilter]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      return serviceCategoryTab === 'ALL' || s.category === serviceCategoryTab;
    });
  }, [services, serviceCategoryTab]);

  // Filtered Resources
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const matchSearch =
        !resourceSearch ||
        r.title?.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.description?.toLowerCase().includes(resourceSearch.toLowerCase());
      const matchCat = resourceCategoryFilter === 'ALL' || r.category === resourceCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [resources, resourceSearch, resourceCategoryFilter]);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchSearch =
        !quotationSearch ||
        q.quotationNumber?.toLowerCase().includes(quotationSearch.toLowerCase()) ||
        q.client?.clientName?.toLowerCase().includes(quotationSearch.toLowerCase()) ||
        q.bga?.name?.toLowerCase().includes(quotationSearch.toLowerCase());
      
      let matchStatus = quotationStatusFilter === 'ALL' || q.status === quotationStatusFilter;
      if (quotationStatusFilter === 'DELAYED') {
        matchStatus = (q.reminderCount || 0) > 0;
      } else if (quotationStatusFilter === 'PENDING_ADMIN_APPROVAL') {
        matchStatus = q.status === 'PENDING_ADMIN_APPROVAL' || (q.adminApprovalStatus === 'PENDING' && q.preparedById);
      }
      return matchSearch && matchStatus;
    });
  }, [quotations, quotationSearch, quotationStatusFilter]);

  // Filtered Work Orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((w) => {
      const matchSearch =
        !workOrderSearch ||
        w.workOrderNumber?.toLowerCase().includes(workOrderSearch.toLowerCase()) ||
        w.client?.clientName?.toLowerCase().includes(workOrderSearch.toLowerCase()) ||
        w.bga?.name?.toLowerCase().includes(workOrderSearch.toLowerCase());
      
      let matchStatus = workOrderStatusFilter === 'ALL' || w.status === workOrderStatusFilter;
      if (workOrderStatusFilter === 'PENDING_HANDOVER') {
        matchStatus = w.advanceVerified && !w.handoverApproved;
      } else if (workOrderStatusFilter === 'ADVANCE_VERIFIED') {
        matchStatus = w.advanceVerified;
      }
      return matchSearch && matchStatus;
    });
  }, [workOrders, workOrderSearch, workOrderStatusFilter]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        !projectSearch ||
        p.projectNumber?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.client?.clientName?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.assignedLead?.name?.toLowerCase().includes(projectSearch.toLowerCase());
      const matchStatus = projectStatusFilter === 'ALL' || p.status === projectStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, projectSearch, projectStatusFilter]);

  // Filtered Commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      const matchType =
        commissionTypeTab === 'ALL' ||
        (commissionTypeTab === 'DM_SUBSCRIPTION' && c.serviceCategory === 'DIGITAL_MARKETING') ||
        (commissionTypeTab === 'PROJECT_BASED' && c.serviceCategory !== 'DIGITAL_MARKETING');
      const matchStatus =
        commissionStatusFilter === 'ALL' ||
        c.approvalStatus === commissionStatusFilter ||
        c.payoutStatus === commissionStatusFilter;
      const matchSearch =
        !commissionSearch ||
        c.bga?.name?.toLowerCase().includes(commissionSearch.toLowerCase()) ||
        c.client?.clientName?.toLowerCase().includes(commissionSearch.toLowerCase()) ||
        c.payoutReference?.toLowerCase().includes(commissionSearch.toLowerCase());
      return matchType && matchStatus && matchSearch;
    });
  }, [commissions, commissionTypeTab, commissionStatusFilter, commissionSearch]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchRole = auditLogRoleFilter === 'ALL' || log.userRole === auditLogRoleFilter;
      const matchSearch =
        !auditLogSearch ||
        log.action?.toLowerCase().includes(auditLogSearch.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(auditLogSearch.toLowerCase()) ||
        log.details?.toLowerCase().includes(auditLogSearch.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [auditLogs, auditLogRoleFilter, auditLogSearch]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <PortalHeader title="Admin Portal" subtitle="Central Company Management & Executive Controls" />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
              Management Modules
            </div>

            <button
              onClick={() => switchTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#80DED9]" />
              <span>Dashboard & Analytics</span>
            </button>

            <button
              onClick={() => {
                setSelectedAssociateId(null);
                switchTab('bgas');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'bgas' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#80DED9]" />
                <span>BGA Management</span>
              </div>
              {stats?.bgas?.pendingApprovals > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {stats.bgas.pendingApprovals}
                </span>
              )}
            </button>

            <button
              onClick={() => switchTab('enquiries')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'enquiries' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4 text-[#80DED9]" />
                <span>Enquiry Approvals</span>
              </div>
              {stats?.enquiries?.pending > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {stats.enquiries.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => switchTab('clients')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'clients' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#80DED9]" />
              <span>Clients & Ownership</span>
            </button>

            <button
              onClick={() => switchTab('services')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'services' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4 text-[#80DED9]" />
              <span>Services & Pricing</span>
            </button>

            <button
              onClick={() => switchTab('resources')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'resources' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 text-[#80DED9]" />
              <span>Company Resources</span>
            </button>

            <button
              onClick={() => switchTab('quotations')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'quotations' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <CreditCard className="w-4 h-4 text-[#80DED9]" />
              <span>Quotation Monitoring</span>
            </button>

            <button
              onClick={() => switchTab('workorders')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'workorders' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#80DED9]" />
              <span>Work Orders & Accounts</span>
            </button>

            <button
              onClick={() => switchTab('technical')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'technical' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4 text-[#80DED9]" />
              <span>Technical Projects</span>
            </button>

            <button
              onClick={() => switchTab('commissions')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'commissions' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <DollarSign className="w-4 h-4 text-[#80DED9]" />
              <span>Commissions & Payouts</span>
            </button>

            <button
              onClick={() => switchTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'settings' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4 text-[#80DED9]" />
              <span>Workflow & Audit Logs</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Database: <span className="text-emerald-400 font-semibold">Neon Cloud PostgreSQL</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="w-full flex-1 min-w-0 p-6 md:p-8 overflow-y-auto">
          {/* TAB 1: DASHBOARD & ANALYTICS */}
          {activeTab === 'dashboard' && (
            !stats ? (
              <AdminDashboardSkeleton />
            ) : (
            <div className="space-y-6 w-full">
              {/* Executive Overview Header */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Executive Company Dashboard</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time consolidated analytics across associates, clients, contracts, technical execution, and finance.
                  </p>
                </div>
                <button
                  onClick={loadData}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Analytics
                </button>
              </div>

              {/* Core Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => switchTab('bgas')}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-[#3066BE]/35 transition-all cursor-pointer group"
                >
                  <span className="text-xs text-slate-500 font-semibold uppercase block">Total Associates</span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1 group-hover:text-[#3066BE] transition-colors">
                    {stats?.bgas?.total || 0}
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-emerald-600 font-bold">{stats?.bgas?.active || 0} Active</span>
                    <span className="text-amber-600 font-bold">{stats?.bgas?.pendingApprovals || 0} Pending</span>
                  </div>
                </div>

                <div
                  onClick={() => switchTab('enquiries')}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-[#3066BE]/35 transition-all cursor-pointer group"
                >
                  <span className="text-xs text-slate-500 font-semibold uppercase block">Total Enquiries</span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1 group-hover:text-[#3066BE] transition-colors">
                    {stats?.enquiries?.total || 0}
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-emerald-600 font-bold">{stats?.enquiries?.approved || 0} Approved</span>
                    <span className="text-amber-600 font-bold">{stats?.enquiries?.pending || 0} Pending</span>
                  </div>
                </div>

                <div
                  onClick={() => switchTab('clients')}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-[#3066BE]/35 transition-all cursor-pointer group"
                >
                  <span className="text-xs text-slate-500 font-semibold uppercase block">Registered Clients</span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1 group-hover:text-[#3066BE] transition-colors">
                    {stats?.clients?.total || 0}
                  </div>
                  <span className="text-xs text-[#3066BE] font-medium block mt-2">
                    100% Associate Ownership Guaranteed
                  </span>
                </div>

                <div
                  onClick={() => switchTab('workorders')}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-[#3066BE]/35 transition-all cursor-pointer group"
                >
                  <span className="text-xs text-slate-500 font-semibold uppercase block">Verified Revenue</span>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-1">
                    ₹{(stats?.finance?.totalVerifiedRevenue || 0).toLocaleString()}
                  </div>
                  <span className="text-xs text-slate-400 block mt-2">
                    {stats?.workOrders?.total || 0} Work Orders Total
                  </span>
                </div>
              </div>

              {/* MODULE 8: 10-STAGE ENTERPRISE WORKFLOW MONITORING PIPELINE */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 p-6 rounded-2xl border border-purple-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#3066BE]" />
                      10-Stage Enterprise Workflow Pipeline Monitoring
                    </h3>
                    <p className="text-xs text-slate-500">
                      Real-time progression tracking across client approvals, quotation preparation, payment clearance, and technical delivery. Click any card to filter tasks.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#3066BE] bg-purple-100 px-3 py-1 rounded-full border border-[#3066BE]/25">
                    Live System Feeds
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {/* Stage 1 */}
                  <div
                    onClick={() => {
                      switchTab('enquiries');
                      setEnquiryStatusFilter('SUBMITTED');
                    }}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Stage 1</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block group-hover:text-[#3066BE]">
                      Pending Approvals
                    </span>
                    <div className="text-2xl font-black text-amber-600 mt-2">
                      {stats?.workflow?.pendingClientApprovals || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Awaiting Admin sign-off</span>
                  </div>

                  {/* Stage 2 */}
                  <div
                    onClick={() => {
                      switchTab('enquiries');
                      setEnquiryStatusFilter('APPROVED');
                    }}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Stage 2</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block group-hover:text-[#3066BE]">
                      Approved Enquiries
                    </span>
                    <div className="text-2xl font-black text-emerald-600 mt-2">
                      {stats?.workflow?.approvedEnquiries || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Ready for Accounts quotation</span>
                  </div>

                  {/* Stage 3 */}
                  <div
                    onClick={() => {
                      switchTab('quotations');
                      setQuotationStatusFilter('REQUESTED');
                    }}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Stage 3</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block group-hover:text-[#3066BE]">
                      Pending Quotations
                    </span>
                    <div className="text-2xl font-black text-blue-600 mt-2">
                      {stats?.workflow?.pendingQuotations || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Under Accounts preparation</span>
                  </div>

                  {/* Stage 4 */}
                  <div
                    onClick={() => {
                      switchTab('quotations');
                      setQuotationStatusFilter('DELAYED');
                    }}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Stage 4</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block group-hover:text-red-600">
                      Delayed Quotations
                    </span>
                    <div className="text-2xl font-black text-red-600 mt-2">
                      {stats?.workflow?.delayedQuotations || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">BGA reminder triggered</span>
                  </div>

                  {/* Stage 5 */}
                  <div
                    onClick={() => {
                      switchTab('quotations');
                      setQuotationStatusFilter('PENDING_ADMIN_APPROVAL');
                    }}
                    className="p-4 rounded-xl bg-white border border-[#3066BE]/25 bg-blue-50/70/30 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-[#3066BE] font-bold uppercase block tracking-wider">Stage 5</span>
                    <span className="text-xs font-bold text-[#152544] mt-0.5 block group-hover:text-[#3066BE]">
                      Quote Approvals
                    </span>
                    <div className="text-2xl font-black text-[#3066BE] mt-2">
                      {stats?.workflow?.pendingQuotationApprovals || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Pending Admin release</span>
                  </div>

                  {/* Stage 6 */}
                  <div
                    onClick={() => {
                      switchTab('quotations');
                      setQuotationStatusFilter('ACCEPTED');
                    }}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Stage 6</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block group-hover:text-[#3066BE]">
                      Accepted Quotations
                    </span>
                    <div className="text-2xl font-black text-emerald-600 mt-2">
                      {stats?.workflow?.acceptedQuotations || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Client confirmed contract</span>
                  </div>

                  {/* Stage 7 */}
                  <div
                    onClick={() => {
                      switchTab('workorders');
                      setWorkOrderStatusFilter('PENDING_ADVANCE');
                    }}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Stage 7</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block group-hover:text-[#3066BE]">
                      Pending Advances
                    </span>
                    <div className="text-2xl font-black text-amber-600 mt-2">
                      {stats?.workflow?.pendingAdvancePayments || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Awaiting client payment</span>
                  </div>

                  {/* Stage 8 */}
                  <div
                    onClick={() => {
                      switchTab('workorders');
                      setWorkOrderStatusFilter('ADVANCE_VERIFIED');
                    }}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Stage 8</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block group-hover:text-[#3066BE]">
                      Payments Verified
                    </span>
                    <div className="text-2xl font-black text-emerald-600 mt-2">
                      {stats?.workflow?.paymentsVerified || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Confirmed bank funds</span>
                  </div>

                  {/* Stage 9 */}
                  <div
                    onClick={() => {
                      switchTab('workorders');
                      setWorkOrderStatusFilter('PENDING_HANDOVER');
                    }}
                    className="p-4 rounded-xl bg-white border border-indigo-200 bg-indigo-50/30 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-indigo-600 font-bold uppercase block tracking-wider">Stage 9</span>
                    <span className="text-xs font-bold text-indigo-900 mt-0.5 block group-hover:text-indigo-600">
                      Pending Handovers
                    </span>
                    <div className="text-2xl font-black text-indigo-600 mt-2">
                      {stats?.workflow?.pendingTechnicalHandovers || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Admin kickoff authorization</span>
                  </div>

                  {/* Stage 10 */}
                  <div
                    onClick={() => switchTab('technical')}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Stage 10</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block group-hover:text-[#3066BE]">
                      Active Tech Projects
                    </span>
                    <div className="text-2xl font-black text-[#3066BE] mt-2">
                      {stats?.workflow?.activeTechnicalProjects || 0}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Engineering sprints active</span>
                  </div>
                </div>
              </div>

              {/* Commission & Technical Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => switchTab('commissions')}
                  className="p-6 rounded-2xl bg-gradient-to-tr from-[#152544] to-[#3066BE] text-white shadow-md cursor-pointer hover:shadow-xl transition-all"
                >
                  <span className="text-xs text-purple-200 uppercase tracking-wider font-semibold">Total Commissions</span>
                  <div className="text-3xl font-extrabold mt-1">₹{(stats?.finance?.totalCommissions || 0).toLocaleString()}</div>
                  <p className="text-xs text-purple-200/80 mt-1">Engine computed across all service categories</p>
                  <div className="mt-4 pt-3 border-t border-purple-800/60 flex justify-between text-xs">
                    <span>Pending Approval:</span>
                    <strong className="text-amber-300 font-bold">₹{(stats?.finance?.pendingCommissions || 0).toLocaleString()}</strong>
                  </div>
                </div>

                <div
                  onClick={() => switchTab('commissions')}
                  className="p-6 rounded-2xl bg-gradient-to-tr from-emerald-900 to-teal-900 text-white shadow-md cursor-pointer hover:shadow-xl transition-all"
                >
                  <span className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">Commissions Disbursed</span>
                  <div className="text-3xl font-extrabold mt-1">₹{(stats?.finance?.paidCommissions || 0).toLocaleString()}</div>
                  <p className="text-xs text-emerald-200/80 mt-1">Transferred with bank transaction references</p>
                  <div className="mt-4 pt-3 border-t border-emerald-800/60 flex justify-between text-xs">
                    <span>Disbursement Rate:</span>
                    <strong className="text-emerald-200 font-bold">
                      {(stats?.finance?.totalCommissions || 0) > 0
                        ? `${Math.round(((stats?.finance?.paidCommissions || 0) / stats.finance.totalCommissions) * 100)}%`
                        : '100%'}
                    </strong>
                  </div>
                </div>

                <div
                  onClick={() => switchTab('technical')}
                  className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm cursor-pointer hover:border-[#3066BE]/35 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Technical Delivery</span>
                    <div className="text-3xl font-extrabold text-slate-900 mt-1">
                      {stats?.technical?.total || stats?.projects?.total || 0} Projects
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Active delivery sprints and milestones</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between text-xs">
                    <span className="text-amber-600 font-bold">
                      {stats?.technical?.active || stats?.projects?.active || 0} In Execution
                    </span>
                    <span className="text-emerald-600 font-bold">
                      {stats?.technical?.completed || stats?.projects?.completed || 0} Completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Action Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900">Direct Module Navigation</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { label: 'BGA Management', tab: 'bgas', icon: Users, desc: 'Approve & manage associates' },
                    { label: 'Enquiry Approvals', tab: 'enquiries', icon: CheckSquare, desc: 'Review client requirements' },
                    { label: 'Clients & Ownership', tab: 'clients', icon: UserCheck, desc: 'Client registry & transfers' },
                    { label: 'Services & Pricing', tab: 'services', icon: Layers, desc: 'Commission rates & prices' },
                    { label: 'Company Resources', tab: 'resources', icon: FileText, desc: 'Presentations & brochures' },
                    { label: 'Quotation Monitoring', tab: 'quotations', icon: CreditCard, desc: 'Official quote tracking' },
                    { label: 'Work Orders', tab: 'workorders', icon: Briefcase, desc: 'Contract & payment tracking' },
                    { label: 'Technical Projects', tab: 'technical', icon: Layers, desc: 'Milestone & progress monitoring' },
                    { label: 'Commissions', tab: 'commissions', icon: DollarSign, desc: 'Authorize & disburse payouts' },
                    { label: 'System Audit Logs', tab: 'settings', icon: Settings, desc: 'Immutable security trail' },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.tab}
                        onClick={() => switchTab(m.tab as any)}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-[#3066BE]/35 hover:bg-[#AEECEF]/20 text-left transition-all group"
                      >
                        <Icon className="w-5 h-5 text-[#3066BE] group-hover:scale-110 transition-transform mb-2" />
                        <span className="font-bold text-xs text-slate-900 block">{m.label}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* TAB 2: BGA MANAGEMENT */}
          {activeTab === 'bgas' && (
            selectedAssociateId ? (
              <AssociateProfileView
                associateId={selectedAssociateId}
                onBack={() => setSelectedAssociateId(null)}
                onRefreshList={loadData}
              />
            ) : (
              <div className="space-y-4 w-full">
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-900 whitespace-nowrap">BGA Associates Directory</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50/70 text-[#3066BE] font-bold border border-[#3066BE]/25">
                      {bgas.length} Registered Associates
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                      value={bgaStatusFilter}
                      onChange={(e) => setBgaStatusFilter(e.target.value)}
                      className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3066BE] font-medium"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="SUBMITTED">SUBMITTED (Awaiting Approval)</option>
                      <option value="ACTIVE">ACTIVE (Authorized)</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search associate, PAN, email..."
                          value={searchBga}
                          onChange={(e) => setSearchBga(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadData()}
                          className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                        />
                      </div>
                      <button
                        onClick={loadData}
                        className="px-4 py-2 bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm rounded-xl text-xs font-bold transition-colors whitespace-nowrap shadow-sm"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>

                {tabLoading || !loadedTabs['bgas'] ? (
                  <SkeletonTable rows={5} cols={5} />
                ) : bgas.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No Associates Found"
                    description="No business growth associates match your search or filter criteria. New associate applications will appear here in SUBMITTED status."
                    actionText="Reset Filters"
                    onAction={() => {
                      setBgaStatusFilter('ALL');
                      setSearchBga('');
                      loadData();
                    }}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm w-full">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-4 w-[28%]">Associate Details</th>
                          <th className="p-4 w-[22%]">KYC Status</th>
                          <th className="p-4 w-[22%]">Bank Verification Status</th>
                          <th className="p-4 w-[12%]">Account Status</th>
                          <th className="p-4 w-[16%] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bgas.map((b) => (
                          <tr
                            key={b.id}
                            onClick={() => setSelectedAssociateId(b.id)}
                            className="hover:bg-[#AEECEF]/20/50 cursor-pointer transition-colors group"
                            title="Click row to view complete associate profile"
                          >
                            <td className="p-4">
                              <div className="font-bold text-slate-900 text-sm group-hover:text-[#3066BE] transition-colors">
                                {b.name}
                              </div>
                              <div className="text-slate-500 text-[11px] mt-0.5">{b.email} • {b.mobile}</div>
                              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                ID: {b.id.slice(0, 10)}... • Clients: <strong className="text-slate-700">{b._count?.clients || 0}</strong>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  b.panVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  PAN: {b.panNumber ? b.panNumber.slice(0, 5) + '••••' : 'Missing'} {b.panVerified ? '✓' : '(Unverified)'}
                                </span>
                                <br />
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  b.aadhaarVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  Aadhaar: {b.aadhaarMasked || 'Pending'} {b.aadhaarVerified ? '✓' : ''}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-mono text-xs font-semibold text-slate-800">
                                {b.bankAccountNumber ? '••••••••' + b.bankAccountNumber.slice(-4) : 'Not provided'}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {b.bankName || 'Bank'} {b.bankIfsc ? `(${b.bankIfsc})` : ''}
                              </div>
                              <span className={`inline-block mt-1 text-[10px] font-bold ${
                                b.bankVerified ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {b.bankVerified ? 'Verified ✓' : 'Verification Pending'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                b.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : b.status === 'SUBMITTED'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {b.status !== 'ACTIVE' ? (
                                <button
                                  onClick={() => handleBgaAction(b.id, 'APPROVE_AND_ACTIVATE')}
                                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors"
                                >
                                  Approve & Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBgaAction(b.id, 'SUSPEND')}
                                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shadow-sm transition-colors"
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedAssociateId(b.id)}
                                className="px-3 py-1.5 bg-blue-50/70 text-[#3066BE] hover:bg-purple-100 border border-[#3066BE]/25 rounded-lg text-xs font-bold transition-colors"
                              >
                                View Profile →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          )}

          {/* TAB 3: CLIENTS & OWNERSHIP (With Ownership Transfer) */}
          {activeTab === 'clients' && (
            <div className="space-y-4 w-full">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Clients & Ownership Governance</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Strict client ownership policy. Only Admin is authorized to transfer ownership between BGAs.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={clientBgaFilter}
                    onChange={(e) => setClientBgaFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                  >
                    <option value="ALL">All Assigned BGAs</option>
                    {bgas.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.email})
                      </option>
                    ))}
                  </select>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search client, company, phone..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>
                </div>
              </div>

              {!loadedTabs['clients'] || (tabLoading && clients.length === 0) ? (
                <SkeletonTable rows={5} cols={5} />
              ) : filteredClients.length === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="No clients registered yet"
                  description="Clients registered exclusively by your Growth Associates will appear here with activity counts and ownership controls."
                  actionText="Refresh Directory"
                  onAction={loadData}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm w-full">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Client & Business</th>
                        <th className="p-3.5">Contact Information</th>
                        <th className="p-3.5">Assigned BGA Associate</th>
                        <th className="p-3.5">Activity</th>
                        <th className="p-3.5 text-right">Ownership</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClients.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-sm">{c.clientName}</div>
                            <div className="text-slate-500 text-[11px] mt-0.5">{c.businessName} ({c.businessCategory})</div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-slate-800 font-semibold">{c.email}</div>
                            <div className="text-slate-500 text-[11px] mt-0.5">{c.mobile} • {c.location || 'India'}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {c.bga?.name}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">{c.bga?.email}</div>
                          </td>
                          <td className="p-3.5 text-slate-600">
                            <span className="font-semibold">{c._count?.enquiries || 0}</span> Enquiries •{' '}
                            <span className="font-semibold">{c._count?.quotations || 0}</span> Quotes •{' '}
                            <span className="font-semibold">{c._count?.workOrders || 0}</span> Orders
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setTransferModal({ client: c })}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#AEECEF]/20 hover:text-[#3066BE] text-xs font-semibold border border-slate-200 flex items-center gap-1.5 ml-auto transition-colors"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Owner
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Ownership Transfer Modal */}
              {transferModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                    <h3 className="text-base font-bold text-slate-900">Transfer Client Ownership</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Reassigning <strong>{transferModal.client.clientName}</strong> ({transferModal.client.businessName})
                    </p>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Current Owner BGA</label>
                        <input
                          type="text"
                          disabled
                          value={`${transferModal.client.bga?.name} (${transferModal.client.bga?.email})`}
                          className="w-full text-xs p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Select New Owner BGA *</label>
                        <select
                          value={targetBgaId}
                          onChange={(e) => setTargetBgaId(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#3066BE]"
                        >
                          <option value="">-- Choose active associate --</option>
                          {bgas
                            .filter((b) => b.id !== transferModal.client.bgaId)
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({b.email})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Transfer *</label>
                        <textarea
                          rows={2}
                          value={transferReason}
                          onChange={(e) => setTransferReason(e.target.value)}
                          placeholder="Audit reason (e.g. Associate inactive, territory realignment)..."
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#3066BE]"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        onClick={() => setTransferModal(null)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeClientTransfer}
                        disabled={!targetBgaId}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-[#3066BE] text-white shadow-sm hover:bg-[#255299] disabled:opacity-50"
                      >
                        Confirm Transfer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ENQUIRIES REVIEW */}
          {activeTab === 'enquiries' && (
            <div className="space-y-4 w-full">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Enquiry Approvals & Scope Review</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review client requirements submitted by BGAs before quotations can be drafted by Accounts.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={enquiryStatusFilter}
                    onChange={(e) => setEnquiryStatusFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUBMITTED">SUBMITTED (Pending)</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search enquiry, client, BGA..."
                      value={enquirySearch}
                      onChange={(e) => setEnquirySearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>
                </div>
              </div>

              {!loadedTabs['enquiries'] || (tabLoading && enquiries.length === 0) ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between text-xs text-purple-900 animate-shimmer">
                    <div className="flex items-center gap-2.5">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                      <span className="font-bold text-slate-800">Loading incoming BGA enquiries & scope reviews...</span>
                    </div>
                    <span className="text-[11px] text-purple-700 font-extrabold bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-xs">
                      Enquiry Feed Active
                    </span>
                  </div>

                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 animate-shimmer">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="space-y-1.5 w-1/3">
                          <div className="h-3.5 bg-slate-200 rounded-md w-28" />
                          <div className="h-5 bg-slate-200 rounded-md w-44" />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 bg-slate-200 rounded-full w-20" />
                          <div className="h-7 bg-slate-200 rounded-lg w-36" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 rounded-md w-40" />
                        <div className="h-14 bg-slate-100 rounded-xl w-full" />
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-slate-100 gap-3">
                        <div className="h-3.5 bg-slate-200 rounded-md w-56" />
                        <div className="flex items-center gap-2">
                          <div className="h-7 bg-slate-200 rounded-lg w-24" />
                          <div className="h-7 bg-slate-200 rounded-lg w-28" />
                          <div className="h-7 bg-slate-200 rounded-lg w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredEnquiries.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="No enquiries submitted yet"
                  description="Enquiries submitted by active Growth Associates will appear here for scope evaluation, budget check, and official approval."
                  actionText="Refresh Enquiries"
                  onAction={loadData}
                />
              ) : (
                <div className="space-y-3">
                  {filteredEnquiries.map((enq) => (
                    <div key={enq.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500">{enq.id}</span>
                            <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {enq.serviceCategory}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-1">
                            {enq.client?.clientName} ({enq.client?.businessName})
                          </h3>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            enq.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : enq.status === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {enq.status}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                            Expected Budget: ₹{enq.expectedBudget?.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700">
                        <strong className="block text-slate-900 mb-1">Client Requirements & Specifications:</strong>
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                          {enq.requirements}
                        </p>
                      </div>

                      {enq.adminNotes && (
                        <div className="p-3 bg-blue-50/70 rounded-xl border border-purple-100 text-xs">
                          <strong className="text-[#152544] block font-semibold">Executive Review Remarks:</strong>
                          <span className="text-[#152544] mt-0.5 block">{enq.adminNotes}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-400 pt-3 border-t border-slate-100 gap-3">
                        <span>Submitted by: <strong className="text-slate-700">{enq.bga?.name}</strong> ({enq.bga?.email} • {enq.bga?.mobile})</span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEnquiryDetailModal(enq)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                          >
                            View Full Details
                          </button>

                          {enq.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => setEnquiryReviewModal({ enquiry: enq, action: 'APPROVE' })}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm"
                              >
                                Approve Enquiry
                              </button>
                              <button
                                onClick={() => setEnquiryReviewModal({ enquiry: enq, action: 'REQUEST_CHANGES' })}
                                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shadow-sm"
                              >
                                Request Scope Changes
                              </button>
                              <button
                                onClick={() => setEnquiryReviewModal({ enquiry: enq, action: 'REJECT' })}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Enquiry Review Action Modal */}
              {enquiryReviewModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                    <h3 className="text-base font-bold text-slate-900">
                      {enquiryReviewModal.action === 'APPROVE'
                        ? 'Approve Client Enquiry'
                        : enquiryReviewModal.action === 'REQUEST_CHANGES'
                        ? 'Request Scope Changes'
                        : 'Reject Client Enquiry'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Client: <strong>{enquiryReviewModal.enquiry.client?.clientName}</strong> ({enquiryReviewModal.enquiry.serviceCategory})
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Reviewer Notes & Remarks *</label>
                      <textarea
                        rows={3}
                        value={enquiryReviewNotes}
                        onChange={(e) => setEnquiryReviewNotes(e.target.value)}
                        placeholder="Add review guidelines for Accounts or notes for BGA..."
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#3066BE]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setEnquiryReviewModal(null);
                          setEnquiryReviewNotes('');
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeEnquiryReview}
                        className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm ${
                          enquiryReviewModal.action === 'APPROVE'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : enquiryReviewModal.action === 'REQUEST_CHANGES'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        Confirm {enquiryReviewModal.action}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Enquiry Detail Modal */}
              {enquiryDetailModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <span className="font-mono text-xs text-slate-400">Enquiry #{enquiryDetailModal.id}</span>
                        <h3 className="text-base font-bold text-slate-900">{enquiryDetailModal.client?.clientName}</h3>
                      </div>
                      <button
                        onClick={() => setEnquiryDetailModal(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Service Category</span>
                        <span className="font-bold text-slate-800">{enquiryDetailModal.serviceCategory}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Expected Budget</span>
                        <span className="font-bold text-slate-800">₹{enquiryDetailModal.expectedBudget?.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Submitting Associate</span>
                        <span className="font-bold text-slate-800">{enquiryDetailModal.bga?.name} ({enquiryDetailModal.bga?.email})</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Submission Timestamp</span>
                        <span className="font-bold text-slate-800">{new Date(enquiryDetailModal.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <strong className="block text-slate-700 mb-1">Detailed Client Requirements:</strong>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {enquiryDetailModal.requirements}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setEnquiryDetailModal(null)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SERVICES & PRICING */}
          {activeTab === 'services' && (
            <div className="space-y-4 w-full">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Official Service Catalog & Base Pricing</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized across the 4 core business sectors: Digital Marketing, Website Dev, Mobile App Dev, Software Dev.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'ALL', label: 'All Services' },
                    { id: 'DIGITAL_MARKETING', label: 'Digital Marketing' },
                    { id: 'WEBSITE_DEVELOPMENT', label: 'Website Dev' },
                    { id: 'MOBILE_APP_DEVELOPMENT', label: 'Mobile Apps' },
                    { id: 'SOFTWARE_DEVELOPMENT', label: 'Custom Software' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setServiceCategoryTab(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        serviceCategoryTab === cat.id
                          ? 'bg-[#3066BE] text-white shadow-sm shadow-sm font-bold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {!loadedTabs['services'] || (tabLoading && services.length === 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : filteredServices.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No services configured yet"
                  description="Official service pricing and commission rates configured in the master schema will appear here."
                  actionText="Reload Services"
                  onAction={loadData}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredServices.map((svc) => (
                    <div key={svc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {svc.category}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{svc.name}</h4>
                          <span className="text-xs font-mono text-slate-400">Code: {svc.code}</span>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {svc.defaultCommissionRate}% Commission
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{svc.description}</p>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-slate-500">
                          Base Price: <strong className="text-slate-900 text-sm">₹{svc.basePrice?.toLocaleString()}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {svc.isMonthly ? 'Monthly Retainer' : 'One-time Project'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: COMPANY RESOURCES */}
          {activeTab === 'resources' && (
            <div className="space-y-4 w-full">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Company Presentations & Sales Collateral</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official sales decks and resources published to equip active Business Growth Associates.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search resources..."
                      value={resourceSearch}
                      onChange={(e) => setResourceSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>

                  <button
                    onClick={() => setShowResourceForm(!showResourceForm)}
                    className="px-4 py-2 bg-[#3066BE] hover:bg-[#255299] text-white shadow-sm rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> {showResourceForm ? 'Hide Form' : 'Upload Resource'}
                  </button>
                </div>
              </div>

              {/* Upload Form */}
              {showResourceForm && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Publish New Presentation or Brochure</h3>
                  <form onSubmit={handleCreateResource} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Resource Title *</label>
                      <input
                        type="text"
                        required
                        value={newResource.title}
                        onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                        placeholder="e.g. Enterprise Cloud ERP Presentation Deck 2026"
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#3066BE]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Category</label>
                      <select
                        value={newResource.category}
                        onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#3066BE]"
                      >
                        <option value="PRESENTATION">Presentation Deck</option>
                        <option value="PROFILE">Company Profile</option>
                        <option value="PORTFOLIO">Portfolio Catalog</option>
                        <option value="BROCHURE">Brochure</option>
                        <option value="CASE_STUDY">Case Study</option>
                        <option value="PRICING">Pricing Guide</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-semibold mb-1">Description</label>
                      <input
                        type="text"
                        value={newResource.description}
                        onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                        placeholder="Key talking points or executive summary of presentation contents..."
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#3066BE]"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between pt-2">
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newResource.isPublished}
                            onChange={(e) => setNewResource({ ...newResource, isPublished: e.target.checked })}
                          />
                          <span className="font-semibold text-slate-800">Publish to BGAs Immediately</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newResource.isConfidential}
                            onChange={(e) => setNewResource({ ...newResource, isConfidential: e.target.checked })}
                          />
                          <span className="text-red-600 font-semibold">Confidential (Hidden from BGAs)</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#3066BE] text-white shadow-sm rounded-xl text-xs font-bold hover:bg-[#255299] shadow-sm"
                      >
                        Confirm & Publish
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {!loadedTabs['resources'] || (tabLoading && resources.length === 0) ? (
                <SkeletonTable rows={4} cols={4} />
              ) : filteredResources.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No company resources published yet"
                  description="Upload presentations, case studies, and collateral to equip your Growth Associates with client-facing materials."
                  actionText="Upload First Resource"
                  onAction={() => setShowResourceForm(true)}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm w-full">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Title & Description</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Visibility Status</th>
                        <th className="p-3.5">Confidentiality</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResources.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-sm">{r.title}</div>
                            <div className="text-slate-500 text-[11px] mt-0.5">{r.description || 'No description provided'}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {r.category}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {r.isPublished ? 'Published to BGAs' : 'Draft / Unpublished'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {r.isConfidential ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                                Confidential
                              </span>
                            ) : (
                              <span className="text-slate-400">Public Collateral</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleToggleResourcePublish(r.id, r.isPublished)}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                            >
                              {r.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              onClick={() => setDeleteResourceModal({ id: r.id, title: r.title })}
                              className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Delete Resource Confirmation Modal */}
              <AnimatePresence>
                {deleteResourceModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    onClick={() => setDeleteResourceModal(null)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-red-600" />
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                              <Trash2 className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">Delete Marketing Resource</h3>
                              <p className="text-xs text-slate-500">This action cannot be undone.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeleteResourceModal(null)}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          Are you sure you want to permanently delete <strong className="text-slate-900">{deleteResourceModal.title}</strong>? It will no longer be visible or downloadable by BGA associates.
                        </p>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setDeleteResourceModal(null)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={confirmDeleteResource}
                            className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Permanently Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 7: QUOTATION MONITORING */}
          {activeTab === 'quotations' && (
            <div className="space-y-4 w-full">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Quotation Monitoring & Approval Tracking</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monitor all BGA quotation requests, official Accounts drafts, revisions, and client acceptance states.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={quotationStatusFilter}
                    onChange={(e) => setQuotationStatusFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING_ADMIN_APPROVAL">PENDING_ADMIN_APPROVAL (Stage 5)</option>
                    <option value="DELAYED">DELAYED (BGA Reminders Sent)</option>
                    <option value="REQUESTED">REQUESTED</option>
                    <option value="ADMIN_APPROVED">ADMIN_APPROVED</option>
                    <option value="SENT_TO_BGA">SENT_TO_BGA</option>
                    <option value="REVISION_REQUESTED">REVISION_REQUESTED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search quote #, client, BGA..."
                      value={quotationSearch}
                      onChange={(e) => setQuotationSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>
                </div>
              </div>

              {!loadedTabs['quotations'] || (tabLoading && quotations.length === 0) ? (
                <SkeletonTable rows={5} cols={6} />
              ) : filteredQuotations.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No quotation requests available yet"
                  description="Submitted quotation requests and official quotations drafted by the Accounts Department will appear here."
                  actionText="Refresh Quotations"
                  onAction={loadData}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm w-full">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Quotation No</th>
                        <th className="p-3.5">Client & BGA</th>
                        <th className="p-3.5">Service & Total Value</th>
                        <th className="p-3.5">Advance Req.</th>
                        <th className="p-3.5">Workflow Status</th>
                        <th className="p-3.5 text-right">Admin Approval & Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredQuotations.map((q) => {
                        const isPendingApproval =
                          q.status === 'PENDING_ADMIN_APPROVAL' || (q.adminApprovalStatus === 'PENDING' && q.preparedById);

                        return (
                          <tr key={q.id} className="hover:bg-slate-50/50">
                            <td className="p-3.5">
                              <span className="font-bold font-mono text-slate-900 text-sm block">
                                {q.quotationNumber}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] text-[#3066BE] bg-blue-50/70 px-1.5 py-0.5 rounded font-bold border border-purple-100">
                                  Version {q.version}
                                </span>
                                {q.reminderCount > 0 && (
                                  <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded font-bold border border-red-200 flex items-center gap-1 animate-pulse">
                                    ⚠️ {q.reminderCount} Reminder{q.reminderCount > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-800 text-sm">{q.client?.clientName}</div>
                              <div className="text-[11px] text-slate-500">BGA: {q.bga?.name} ({q.bga?.email})</div>
                            </td>
                            <td className="p-3.5">
                              <div className="text-slate-900 font-extrabold text-sm">
                                ₹{(q.totalAmount || 0).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-500">{q.serviceCategory}</div>
                            </td>
                            <td className="p-3.5">
                              <span className="font-bold text-indigo-700">
                                ₹{(q.advanceRequiredAmount || 0).toLocaleString()}
                              </span>
                              <span className="text-slate-400 text-[10px] block">
                                ({q.advanceRequiredPercent || 50}% mandatory)
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  q.status === 'ACCEPTED'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : q.status === 'ADMIN_APPROVED' || q.status === 'SENT_TO_BGA'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : q.status === 'PENDING_ADMIN_APPROVAL'
                                    ? 'bg-purple-100 text-[#152544] border border-[#3066BE]/25'
                                    : q.status === 'REVISION_REQUESTED'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                                }`}
                              >
                                {q.status === 'PENDING_ADMIN_APPROVAL'
                                  ? 'PENDING_ADMIN_APPROVAL'
                                  : q.status === 'ADMIN_APPROVED' || q.status === 'SENT_TO_BGA'
                                  ? 'APPROVED & SENT TO BGA'
                                  : q.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-y-1">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {isPendingApproval && (
                                  <>
                                    <button
                                      onClick={() => setQuotationReviewModal({ quotation: q, action: 'APPROVE' })}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                    >
                                      Approve Quote
                                    </button>
                                    <button
                                      onClick={() => setQuotationReviewModal({ quotation: q, action: 'REQUEST_REVISION' })}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
                                    >
                                      Revision
                                    </button>
                                    <button
                                      onClick={() => setQuotationReviewModal({ quotation: q, action: 'REJECT' })}
                                      className="px-2.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setQuotationDetailModal(q)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-[#AEECEF]/20 hover:text-[#3066BE] text-xs font-semibold"
                                >
                                  Scope
                                </button>
                                <a
                                  href={getQuotationPdfUrl(q.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold inline-block hover:bg-slate-800"
                                >
                                  PDF
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Quotation Scope & Line Items Modal */}
              {quotationDetailModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-mono text-[#3066BE] font-bold">
                          {quotationDetailModal.quotationNumber} (Version {quotationDetailModal.version})
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {quotationDetailModal.client?.clientName}
                        </h3>
                      </div>
                      <button
                        onClick={() => setQuotationDetailModal(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Total Contract Value</span>
                        <span className="font-bold text-slate-900 text-base">₹{(quotationDetailModal.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Advance Required</span>
                        <span className="font-bold text-indigo-700 text-base">₹{(quotationDetailModal.advanceRequiredAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <strong className="block text-slate-700 mb-1">Approved Commercial Terms & Scope:</strong>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {quotationDetailModal.scopeOfWork || 'Scope details configured in quotation line items.'}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setQuotationDetailModal(null)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quotation Review Action Modal (Approve, Revision, Reject) */}
              {quotationReviewModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                    <h3 className="text-base font-bold text-slate-900">
                      {quotationReviewModal.action === 'APPROVE'
                        ? 'Approve Official Quotation & Release to BGA'
                        : quotationReviewModal.action === 'REQUEST_REVISION'
                        ? 'Request Quotation Revision from Accounts'
                        : 'Reject Official Quotation'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Quotation: <strong>{quotationReviewModal.quotation?.quotationNumber}</strong> for{' '}
                      <strong>{quotationReviewModal.quotation?.client?.clientName}</strong>. Total Value: ₹
                      {(quotationReviewModal.quotation?.totalAmount || 0).toLocaleString()}.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Executive Remarks / Revision Instructions {quotationReviewModal.action !== 'APPROVE' && '*'}
                      </label>
                      <textarea
                        rows={3}
                        value={quotationReviewNotes}
                        onChange={(e) => setQuotationReviewNotes(e.target.value)}
                        placeholder="Add review guidelines for Accounts or notes for BGA..."
                        className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE] resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setQuotationReviewModal(null);
                          setQuotationReviewNotes('');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeQuotationReview}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors ${
                          quotationReviewModal.action === 'APPROVE'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : quotationReviewModal.action === 'REQUEST_REVISION'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        Confirm {quotationReviewModal.action}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: WORK ORDERS & ACCOUNTS */}
          {activeTab === 'workorders' && (
            <div className="space-y-4 w-full">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Work Orders, Payment Clearance & Technical Handover</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review Accounts-verified advance payments and authorize engineering handover to activate Technical projects.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={workOrderStatusFilter}
                    onChange={(e) => setWorkOrderStatusFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING_HANDOVER">PENDING_HANDOVER (Payment Verified - Stage 9)</option>
                    <option value="ADVANCE_VERIFIED">ADVANCE_VERIFIED (Stage 8)</option>
                    <option value="PENDING_ADVANCE">PENDING_ADVANCE</option>
                    <option value="ACTIVE_IN_PROGRESS">ACTIVE_IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search order #, client, BGA..."
                      value={workOrderSearch}
                      onChange={(e) => setWorkOrderSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>
                </div>
              </div>

              {!loadedTabs['workorders'] || (tabLoading && workOrders.length === 0) ? (
                <SkeletonTable rows={5} cols={6} />
              ) : filteredWorkOrders.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No work orders generated yet"
                  description="Work orders will appear once client quotations are accepted and verified advance payments are confirmed by the Accounts Department."
                  actionText="Refresh Work Orders"
                  onAction={loadData}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm w-full">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Work Order</th>
                        <th className="p-3.5">Client & BGA</th>
                        <th className="p-3.5">Contract Value</th>
                        <th className="p-3.5">Advance Verified</th>
                        <th className="p-3.5">Verified Payments</th>
                        <th className="p-3.5">Handover Status</th>
                        <th className="p-3.5 text-right">Technical Handover Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWorkOrders.map((w) => {
                        const verifiedPayments = w.payments
                          ? w.payments
                              .filter((p: any) => p.status === 'VERIFIED')
                              .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
                          : 0;
                        const isPendingHandover = w.advanceVerified && !w.handoverApproved;

                        return (
                          <tr key={w.id} className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold font-mono text-slate-900 text-sm">
                              {w.workOrderNumber}
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-800 text-sm">{w.client?.clientName}</div>
                              <div className="text-[11px] text-slate-500">BGA: {w.bga?.name}</div>
                            </td>
                            <td className="p-3.5 font-bold text-slate-900 text-sm">
                              ₹{(w.totalValue || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  w.advanceVerified
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {w.advanceVerified ? 'VERIFIED' : 'PENDING RECEIPT'}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-emerald-700">
                              ₹{verifiedPayments.toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  w.handoverApproved
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : isPendingHandover
                                    ? 'bg-purple-100 text-[#152544] border border-[#3066BE]/25 animate-pulse'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {w.handoverApproved
                                  ? 'HANDOVER APPROVED'
                                  : isPendingHandover
                                  ? 'AWAITING HANDOVER APPROVAL'
                                  : w.handoverStatus || 'PENDING'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {w.quotationId && (
                                  <a
                                    href={getQuotationPdfUrl(w.quotationId)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                                    title="View Quotation PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" /> Quote PDF
                                  </a>
                                )}
                                {isPendingHandover ? (
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    <button
                                      onClick={() => setHandoverReviewModal({ workOrder: w, action: 'APPROVE' })}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                    >
                                      Authorize Handover
                                    </button>
                                    <button
                                      onClick={() => setHandoverReviewModal({ workOrder: w, action: 'HOLD' })}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
                                    >
                                      Hold
                                    </button>
                                    <button
                                      onClick={() => setHandoverReviewModal({ workOrder: w, action: 'REQUEST_CLARIFICATION' })}
                                      className="px-2.5 py-1 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-lg text-xs font-bold transition-colors"
                                    >
                                      Clarify
                                    </button>
                                  </div>
                                ) : w.handoverApproved ? (
                                  <span className="text-xs text-emerald-700 font-bold flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Project Active
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">Awaiting Advance</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Handover Review Action Modal */}
              {handoverReviewModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                    <h3 className="text-base font-bold text-slate-900">
                      {handoverReviewModal.action === 'APPROVE'
                        ? 'Authorize Technical Handover & Activate Project'
                        : handoverReviewModal.action === 'HOLD'
                        ? 'Place Technical Handover On Hold'
                        : 'Request Handover Clarification'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Work Order: <strong>{handoverReviewModal.workOrder?.workOrderNumber}</strong> for{' '}
                      <strong>{handoverReviewModal.workOrder?.client?.clientName}</strong>. Advance Verified: ₹
                      {(handoverReviewModal.workOrder?.advancePaid || 0).toLocaleString()}.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Executive Handover Instructions / Notes {handoverReviewModal.action !== 'APPROVE' && '*'}
                      </label>
                      <textarea
                        rows={3}
                        value={handoverReviewNotes}
                        onChange={(e) => setHandoverReviewNotes(e.target.value)}
                        placeholder="Add kickoff guidelines for Technical Lead or notes for Accounts..."
                        className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE] resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setHandoverReviewModal(null);
                          setHandoverReviewNotes('');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeHandoverReview}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors ${
                          handoverReviewModal.action === 'APPROVE'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : handoverReviewModal.action === 'HOLD'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        Confirm {handoverReviewModal.action}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: TECHNICAL PROJECTS */}
          {activeTab === 'technical' && (
            <div className="space-y-4 w-full">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Technical Projects Execution & Delivery</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track sprint progress, milestones, deliverables, and quality review states across assigned engineering teams.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={projectStatusFilter}
                    onChange={(e) => setProjectStatusFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="READY_TO_START">READY_TO_START</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="CORRECTION_REQUIRED">CORRECTION_REQUIRED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search project, client, lead..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>
                </div>
              </div>

              {!loadedTabs['technical'] || (tabLoading && projects.length === 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No projects have been released to the Technical team yet"
                  description="Projects are released automatically once advance payments are verified by Accounts and management approval is recorded."
                  actionText="Refresh Technical Feed"
                  onAction={loadData}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProjects.map((p) => (
                    <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#3066BE] bg-blue-50/70 px-2 py-0.5 rounded border border-purple-100">
                            {p.projectNumber}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{p.client?.clientName}</h4>
                          <span className="text-xs text-slate-500">{p.client?.businessName} • {p.serviceCategory}</span>
                        </div>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                          {p.status}
                        </span>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                          <span className="font-semibold">Implementation Progress</span>
                          <span className="font-bold text-slate-900">{p.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-[#3066BE] h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${p.progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                        <div className="p-2.5 bg-slate-50 rounded-xl">
                          <span className="text-slate-400 block text-[10px]">Technical Lead</span>
                          <span className="font-bold text-slate-800">{p.assignedLead?.name || 'Unassigned'}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl">
                          <span className="text-slate-400 block text-[10px]">Milestones Completed</span>
                          <span className="font-bold text-slate-800">
                            {p.milestones?.filter((m: any) => m.status === 'COMPLETED').length || 0} / {p.milestones?.length || 0} Done
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-400">
                          Deliverables: <strong>{p.deliverables?.length || 0} files</strong>
                        </span>
                        <button
                          onClick={() => setProjectDetailModal(p)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-[#AEECEF]/20 hover:text-[#3066BE] font-semibold"
                        >
                          View Milestones →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Project Milestones Detail Modal */}
              {projectDetailModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <span className="font-mono text-xs text-[#3066BE] font-bold">{projectDetailModal.projectNumber}</span>
                        <h3 className="text-base font-bold text-slate-900">{projectDetailModal.client?.clientName}</h3>
                      </div>
                      <button
                        onClick={() => setProjectDetailModal(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3">
                      <strong className="text-xs text-slate-700 block">Project Milestones & Deliverables:</strong>
                      {projectDetailModal.milestones && projectDetailModal.milestones.length > 0 ? (
                        projectDetailModal.milestones.map((m: any, idx: number) => (
                          <div key={m.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-800">{m.title}</span>
                              <p className="text-[11px] text-slate-500 mt-0.5">{m.description || 'Sprint milestone'}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {m.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No milestones registered yet for this project.</p>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setProjectDetailModal(null)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 10: COMMISSIONS & PAYOUTS */}
          {activeTab === 'commissions' && (
            <div className="space-y-4 w-full">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Commission Ledger & Associate Payouts</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Separating Digital Marketing monthly subscriptions from project-based commissions with strict eligibility verification.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="flex rounded-xl bg-slate-100 p-1">
                    {[
                      { id: 'ALL', label: 'All Commissions' },
                      { id: 'DM_SUBSCRIPTION', label: 'DM Subscriptions' },
                      { id: 'PROJECT_BASED', label: 'Project-Based' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setCommissionTypeTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          commissionTypeTab === tab.id
                            ? 'bg-[#3066BE] text-white shadow-sm font-bold shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search associate, client..."
                      value={commissionSearch}
                      onChange={(e) => setCommissionSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                    />
                  </div>
                </div>
              </div>

              {!loadedTabs['commissions'] || (tabLoading && commissions.length === 0) ? (
                <SkeletonTable rows={5} cols={5} />
              ) : filteredCommissions.length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  title="No commission records available yet"
                  description="Eligible commissions will appear after the required payment and completion conditions are met. Verified subscription payments unlock DM commissions; project completion unlocks Web/App commissions."
                  actionText="Refresh Commission Ledger"
                  onAction={loadData}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm w-full">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Associate & Bank</th>
                        <th className="p-3.5">Client & Service</th>
                        <th className="p-3.5">Calculation Breakdown</th>
                        <th className="p-3.5">Approval Status</th>
                        <th className="p-3.5">Disbursement</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCommissions.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-sm">{c.bga?.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {c.bga?.bankAccountNumber ? '••••••••' + c.bga.bankAccountNumber.slice(-4) : 'Bank details pending'} ({c.bga?.bankIfsc || 'IFSC'})
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800 text-sm">{c.client?.clientName}</div>
                            <div className="text-[11px] text-indigo-600 font-semibold">{c.serviceCategory}</div>
                            <div className="text-[10px] text-slate-400">{c.billingType}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-emerald-700 font-extrabold text-sm">
                              ₹{(c.calculatedCommission || 0).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Net Fee: ₹{(c.commissionableAmount || 0).toLocaleString()} @ {c.commissionRate}%
                            </div>
                            {c.excludedAdSpend > 0 && (
                              <div className="text-[10px] text-slate-400">
                                (Ad budget ₹{c.excludedAdSpend} excluded)
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              c.approvalStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {c.approvalStatus}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              c.payoutStatus === 'PROCESSED'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {c.payoutStatus}
                            </span>
                            {c.payoutReference && (
                              <div className="text-[10px] text-slate-500 font-mono mt-1">Ref: {c.payoutReference}</div>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {c.approvalStatus !== 'APPROVED' ? (
                              <button
                                onClick={() => handleCommissionAction(c.id, 'APPROVE')}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm"
                              >
                                Approve Payout
                              </button>
                            ) : c.payoutStatus !== 'PROCESSED' ? (
                              <button
                                onClick={() =>
                                  setPayoutModal({
                                    commissionId: c.id,
                                    amount: c.calculatedCommission,
                                    bgaName: c.bga?.name,
                                  })
                                }
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm"
                              >
                                Mark Disbursed
                              </button>
                            ) : (
                              <span className="text-emerald-600 text-xs font-bold">Disbursed ✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payout Reference Modal */}
              {payoutModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                    <h3 className="text-base font-bold text-slate-900">Record Commission Disbursement</h3>
                    <p className="text-xs text-slate-500">
                      Disbursing <strong>₹{payoutModal.amount?.toLocaleString()}</strong> to <strong>{payoutModal.bgaName}</strong>
                    </p>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Bank Transaction / UTR Reference *
                        </label>
                        <span className="text-[10px] font-mono text-slate-500">
                          {payoutReferenceInput.length} chars (8-24 req)
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={payoutReferenceInput}
                        onChange={(e) => setPayoutReferenceInput(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
                        placeholder="e.g. AXISP26123456789 / NEFT-2026-X"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#3066BE] font-mono uppercase"
                      />
                      {payoutReferenceInput && (
                        (() => {
                          const v = validateBankUtr(payoutReferenceInput, 'BANK_TRANSFER');
                          return v.isValid ? (
                            <p className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid transaction reference format
                            </p>
                          ) : (
                            <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {v.error}
                            </p>
                          );
                        })()
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setPayoutModal(null);
                          setPayoutReferenceInput('');
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executePayout}
                        disabled={!payoutReferenceInput || !validateBankUtr(payoutReferenceInput, 'BANK_TRANSFER').isValid}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white hover:bg-blue-700 shadow-sm"
                      >
                        Confirm Disbursement
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 11: SETTINGS & AUDIT LOGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 w-full">
              {/* Workflow Configuration */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1">Configurable Workflow Governance</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Manage core system parameters, quotation pre-approval constraints, and commission thresholds.
                </p>

                <div className="space-y-3">
                  {settings.map((s) => (
                    <div key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-slate-50 rounded-xl text-xs border border-slate-100">
                      <div>
                        <span className="font-mono font-bold text-slate-800 text-sm">{s.key}</span>
                        <p className="text-slate-500 text-xs mt-0.5">{s.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.key === 'enquiry_approval_required_for_quotation' ? (
                          <button
                            onClick={() => handleSaveSetting(s.key, s.value === 'true' ? 'false' : 'true')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                              s.value === 'true' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-300 text-slate-800'
                            }`}
                          >
                            {s.value === 'true' ? 'Enforced (Required)' : 'Bypass Approval'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              defaultValue={s.value}
                              onBlur={(e) => handleSaveSetting(s.key, e.target.value)}
                              className="w-28 p-1.5 border border-slate-300 rounded-lg font-semibold text-right text-xs"
                            />
                            {s.key.includes('rate') && <span className="font-bold">%</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immutable Audit Logs */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Immutable System Audit Trail</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tamper-evident log of all administrative reviews, status changes, and financial disbursements.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={auditLogRoleFilter}
                      onChange={(e) => setAuditLogRoleFilter(e.target.value)}
                      className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="BGA">BGA</option>
                      <option value="ACCOUNTS">ACCOUNTS</option>
                      <option value="TECHNICAL">TECHNICAL</option>
                    </select>

                    <div className="relative w-full sm:w-48">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search audit trail..."
                        value={auditLogSearch}
                        onChange={(e) => setAuditLogSearch(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3066BE]"
                      />
                    </div>
                  </div>
                </div>

                {!loadedTabs['settings'] || (tabLoading && auditLogs.length === 0) ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 bg-slate-200/80 rounded-lg animate-shimmer" />
                    ))}
                  </div>
                ) : filteredAuditLogs.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No system audit events recorded yet"
                    description="Administrative actions, approval events, and state mutations will be recorded automatically."
                    actionText="Refresh Logs"
                    onAction={loadData}
                  />
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {filteredAuditLogs.map((log) => (
                      <div key={log.id} className="py-3 flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{log.action}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {log.userRole || 'SYSTEM'}
                            </span>
                            <span className="text-slate-400 text-[11px]">({log.userEmail})</span>
                          </div>
                          <p className="text-slate-600 font-mono text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {log.details}
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
