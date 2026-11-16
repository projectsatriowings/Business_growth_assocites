import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { SkeletonStatsRow, SkeletonTable } from '../../components/Skeleton';
import { BgaProfileView } from './BgaProfileView';

export const BUSINESS_CATEGORIES = [
  'IT & Software',
  'Education & Training',
  'Healthcare & Medical',
  'Retail & E-commerce',
  'Manufacturing & Industrial',
  'Real Estate & Construction',
  'Finance & Banking',
  'Hospitality & Tourism',
  'Food & Restaurants',
  'Logistics & Transportation',
  'Media & Entertainment',
  'Professional Services',
  'Other',
];

export const BgaPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'profile' | 'services' | 'resources' | 'new-client' | 'clients' | 'enquiries' | 'quotations' | 'projects' | 'earnings' | 'support'
  >('dashboard');

  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // My Clients UI State
  const [clientViewMode, setClientViewMode] = useState<'list' | 'add'>('list');
  const [selectedClientDetails, setSelectedClientDetails] = useState<any | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientCategoryFilter, setClientCategoryFilter] = useState('ALL');
  const [submittingClient, setSubmittingClient] = useState(false);

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
  });

  // Quotation Revision Modal
  const [revisionModal, setRevisionModal] = useState<{ quotationId: string; quotationNumber: string } | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Quotation Acceptance Modal
  const [acceptanceModal, setAcceptanceModal] = useState<{ quotationId: string; quotationNumber: string } | null>(null);
  const [acceptanceNotes, setAcceptanceNotes] = useState('');

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
        const c = await apiRequest('/api/bga/clients');
        setClients(c.clients || []);
      } else if (tab === 'enquiries') {
        const e = await apiRequest('/api/bga/enquiries');
        setEnquiries(e.enquiries || []);
      } else if (tab === 'quotations') {
        const q = await apiRequest('/api/bga/quotations');
        setQuotations(q.quotations || []);
      } else if (tab === 'projects') {
        const w = await apiRequest('/api/bga/work-orders');
        setWorkOrders(w.workOrders || []);
      } else if (tab === 'earnings') {
        const comm = await apiRequest('/api/bga/commissions');
        setCommissions(comm.commissions || []);
      } else if (tab === 'resources') {
        const r = await apiRequest('/api/bga/resources');
        setResources(r.resources || []);
      } else if (tab === 'services') {
        const svc = await apiRequest('/api/bga/services');
        setServices(svc.services || []);
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
    loadTabData(activeTab);
  }, [activeTab]);

  // Handle Client Registration
  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientFormError(null);
    setClientFormSuccess(null);

    // Business Category Validation
    if (clientForm.businessCategory === 'Other' && !clientForm.otherCategory.trim()) {
      setClientFormError('Please enter your custom business category.');
      return;
    }

    const cleanMobile = clientForm.mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      setClientFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

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
    if (!clientForm.pinCode.trim()) {
      setClientFormError('PIN / Postal Code is required.');
      return;
    }

    setSubmittingClient(true);
    try {
      const payload = {
        ...clientForm,
        mobile: cleanMobile,
        location: clientForm.city.trim(),
      };

      const res = await apiRequest('/api/bga/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setClientFormSuccess(
        res.message || `Client '${clientForm.clientName}' registered successfully and assigned to your portfolio.`
      );
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
      await loadData();
      setClientViewMode('list');
    } catch (err: any) {
      // Keep entered data in form so user does not lose inputs
      setClientFormError(err.message || 'Failed to register client');
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
      alert(res.message);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Handle Create Extra Enquiry for existing client
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnquiryModal) return;

    try {
      await apiRequest('/api/bga/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          clientId: newEnquiryModal.clientId,
          ...enquiryForm,
        }),
      });
      alert('Enquiry submitted successfully and forwarded to Admin for approval.');
      setNewEnquiryModal(null);
      setEnquiryForm({
        serviceCategory: 'WEBSITE_DEVELOPMENT',
        subCategory: '',
        expectedBudget: '',
        requirements: '',
        discussionNotes: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Submit Revision
  const handleSubmitRevision = async () => {
    if (!revisionModal || !revisionNotes) return;
    try {
      await apiRequest(`/api/bga/quotations/${revisionModal.quotationId}/request-revision`, {
        method: 'POST',
        body: JSON.stringify({ revisionNotes }),
      });
      alert('Revision request forwarded to Accounts Department.');
      setRevisionModal(null);
      setRevisionNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Client Acceptance
  const handleClientAcceptance = async () => {
    if (!acceptanceModal || !acceptanceNotes) return;
    try {
      const res = await apiRequest(`/api/bga/quotations/${acceptanceModal.quotationId}/client-decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'ACCEPTED',
          clientAcceptanceNotes: acceptanceNotes,
        }),
      });
      alert(res.message);
      setAcceptanceModal(null);
      setAcceptanceNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <PortalHeader title="BGA Associate Portal" subtitle="Client Management, Quotation Requests & Earnings" />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
              Associate Workspace
            </div>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'profile' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>My Profile & KYC</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('clients');
                setClientViewMode('list');
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'clients' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>My Clients</span>
            </button>

            <button
              onClick={() => setActiveTab('enquiries')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'enquiries' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enquiries & Quotation Req.</span>
            </button>

            <button
              onClick={() => setActiveTab('quotations')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'quotations' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>My Quotations</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'projects' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Work Orders & Projects</span>
            </button>

            <button
              onClick={() => setActiveTab('earnings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'earnings' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>My Earnings & Commissions</span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'services' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Company Services</span>
            </button>

            <button
              onClick={() => setActiveTab('resources')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'resources' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Pitch Decks & Resources</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'support' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Associate Support</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Account Status:{' '}
            <span className="text-emerald-400 font-bold uppercase">{user?.status}</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="w-full flex-1 min-w-0 p-6 md:p-8 overflow-y-auto">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            !stats ? (
              <SkeletonStatsRow count={4} />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">My Registered Clients</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.clients}</div>
                  <span className="text-xs text-emerald-600 font-medium">100% Exclusive Ownership</span>
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
                <div className="p-6 rounded-2xl bg-gradient-to-tr from-emerald-900 to-teal-800 text-white shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">
                      Commissions Received (Paid Out)
                    </span>
                    <div className="text-3xl font-extrabold mt-2">₹{stats.earnings.paid.toLocaleString()}</div>
                    <p className="text-xs text-emerald-100/80 mt-1">
                      Directly disbursed to your verified bank account via NEFT/IMPS.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('earnings')}
                    className="mt-4 px-4 py-2 bg-white text-emerald-900 rounded-lg text-xs font-bold hover:bg-emerald-50 transition-colors w-fit"
                  >
                    View Commission Ledger →
                  </button>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-tr from-indigo-900 to-blue-900 text-white shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">
                      Commissions in Processing
                    </span>
                    <div className="text-3xl font-extrabold mt-2">₹{stats.earnings.pending.toLocaleString()}</div>
                    <p className="text-xs text-indigo-100/80 mt-1">
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
            </div>
            )
          )}

          {/* TAB 2: MY PROFILE & KYC */}
          {activeTab === 'profile' && <BgaProfileView />}

          {/* TAB 4: MY CLIENTS (Includes integrated client registration, directory, and full details) */}
          {(activeTab === 'clients' || activeTab === 'new-client') && (
            <div className="space-y-4">
              {/* MODE 1: REGISTER NEW CLIENT (Directly inside My Clients module) */}
              {clientViewMode === 'add' ? (
                <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                  {/* Back to Client List */}
                  <div className="mb-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setClientViewMode('list');
                        setClientFormError(null);
                      }}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to My Clients
                    </button>
                    <span className="text-xs font-semibold text-slate-400">Step: Client Onboarding</span>
                  </div>

                  <div className="border-b border-slate-100 pb-4 mb-6">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Exclusive Ownership Guarantee
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Register a New Client</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Once registered, this client is strictly assigned to your associate account. Our system automatically checks normalized phone and email to prevent duplicate claims across all associates.
                    </p>
                  </div>

                  {clientFormError && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Registration Blocked:</strong>
                        <span>{clientFormError}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleRegisterClient} className="space-y-6 text-xs">
                    {/* SECTION 1: Client & Company Information */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
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
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Mobile Number (10 Digits) *</label>
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={clientForm.mobile}
                            onChange={(e) => setClientForm({ ...clientForm, mobile: e.target.value.replace(/\D/g, '') })}
                            placeholder="9876543210"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
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
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        <div className={clientForm.businessCategory === 'Other' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                          <label className="block text-slate-700 font-semibold mb-1">Business Category *</label>
                          <select
                            required
                            value={clientForm.businessCategory}
                            onChange={(e) => setClientForm({ ...clientForm, businessCategory: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: Complete Business Address */}
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
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
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">PIN / Postal Code *</label>
                            <input
                              type="text"
                              required
                              value={clientForm.pinCode}
                              onChange={(e) => setClientForm({ ...clientForm, pinCode: e.target.value })}
                              placeholder="e.g. 400001"
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
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
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: Initial Enquiry Details (Optional) */}
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
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
                        }}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingClient}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2"
                      >
                        {submittingClient ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            Registering Client...
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
              ) : (
                /* MODE 2: CLIENT PORTFOLIO DIRECTORY (Table & Detailed Cards) */
                <div className="space-y-4">
                  {/* Portfolio Header Bar */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">My Client Portfolio</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {clients.length} Registered
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Clients exclusively tied to your associate account. Other associates cannot view or access your clients.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setClientViewMode('add');
                        setClientFormSuccess(null);
                        setClientFormError(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      + Add New Client
                    </button>
                  </div>

                  {/* Success Alert Banner (Displayed right after successful client registration) */}
                  {clientFormSuccess && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{clientFormSuccess}</span>
                      </div>
                      <button
                        onClick={() => setClientFormSuccess(null)}
                        className="p-1 hover:bg-emerald-100 rounded text-emerald-600"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Search and Category Filter */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search by client, business, category, phone, email, city..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={clientCategoryFilter}
                        onChange={(e) => setClientCategoryFilter(e.target.value)}
                        className="w-full sm:w-auto text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
                      >
                        <option value="ALL">All Categories ({clients.length})</option>
                        {BUSINESS_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Clients Listing Table */}
                  {clients.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-base font-bold text-slate-800">No Clients Registered Yet</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                        Start building your exclusive client portfolio. Clients registered under your ID remain strictly assigned to you.
                      </p>
                      <button
                        onClick={() => {
                          setClientViewMode('add');
                          setClientFormSuccess(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm"
                      >
                        + Add Your First Client
                      </button>
                    </div>
                  ) : clients.filter((c) => {
                      const matchesSearch =
                        !clientSearch ||
                        c.clientName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                        c.businessName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                        c.mobile?.includes(clientSearch) ||
                        c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                        c.city?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                        c.location?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                        c.businessCategory?.toLowerCase().includes(clientSearch.toLowerCase());
                      const matchesCategory =
                        clientCategoryFilter === 'ALL' || c.businessCategory === clientCategoryFilter;
                      return matchesSearch && matchesCategory;
                    }).length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No clients match your filter criteria.</p>
                      <button
                        onClick={() => {
                          setClientSearch('');
                          setClientCategoryFilter('ALL');
                        }}
                        className="mt-3 text-xs text-emerald-600 font-bold hover:underline"
                      >
                        Reset Search Filters
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="p-3.5">Client & Company</th>
                              <th className="p-3.5">Business Category</th>
                              <th className="p-3.5">Contact Details</th>
                              <th className="p-3.5">City</th>
                              <th className="p-3.5">Enquiry Status</th>
                              <th className="p-3.5">Registration Date</th>
                              <th className="p-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clients
                              .filter((c) => {
                                const matchesSearch =
                                  !clientSearch ||
                                  c.clientName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                  c.businessName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                  c.mobile?.includes(clientSearch) ||
                                  c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                  c.city?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                  c.location?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                  c.businessCategory?.toLowerCase().includes(clientSearch.toLowerCase());
                                const matchesCategory =
                                  clientCategoryFilter === 'ALL' || c.businessCategory === clientCategoryFilter;
                                return matchesSearch && matchesCategory;
                              })
                              .map((c) => {
                                // Extract structured or legacy location
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

                                const latestEnquiry = c.enquiries && c.enquiries.length > 0 ? c.enquiries[0] : null;

                                return (
                                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                    {/* 1. Client Contact Name & Business Name */}
                                    <td className="p-3.5">
                                      <div className="font-bold text-slate-900 text-sm">{c.clientName}</div>
                                      <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                                        {c.businessName}
                                      </div>
                                    </td>

                                    {/* 2. Business Category */}
                                    <td className="p-3.5">
                                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                        {c.businessCategory}
                                      </span>
                                    </td>

                                    {/* 3. Mobile and Email */}
                                    <td className="p-3.5">
                                      <div className="text-slate-800 font-medium flex items-center gap-1.5">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span>{c.mobile}</span>
                                      </div>
                                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                                        <Mail className="w-3 h-3 text-slate-400" />
                                        <span>{c.email}</span>
                                      </div>
                                    </td>

                                    {/* 4. City */}
                                    <td className="p-3.5">
                                      <div className="text-slate-700 font-medium flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{displayCity || '—'}</span>
                                      </div>
                                    </td>

                                    {/* 5. Enquiry Status */}
                                    <td className="p-3.5">
                                      {latestEnquiry ? (
                                        <div>
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                              latestEnquiry.status === 'APPROVED'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : latestEnquiry.status === 'QUOTATION_REQUESTED'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : latestEnquiry.status === 'SUBMITTED'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}
                                          >
                                            {latestEnquiry.status.replace(/_/g, ' ')}
                                          </span>
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                            {c.enquiries.length} {c.enquiries.length === 1 ? 'Enquiry' : 'Enquiries'}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                          No Enquiries
                                        </span>
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
                                        <button
                                          onClick={() => setSelectedClientDetails(c)}
                                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 transition-colors"
                                          title="View Client Details"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          Details
                                        </button>
                                        <button
                                          onClick={() =>
                                            setNewEnquiryModal({ clientId: c.id, clientName: c.clientName })
                                          }
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 transition-colors"
                                          title="Submit New Enquiry"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          Enquiry
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
                  )}
                </div>
              )}

              {/* DETAILED CLIENT VIEW MODAL */}
              {selectedClientDetails && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{selectedClientDetails.clientName}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active Associate Client
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 block mt-0.5">
                          {selectedClientDetails.businessName} • {selectedClientDetails.businessCategory}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedClientDetails(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-6 text-xs">
                      {/* Section 1: Contact & Client Overview */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
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
                            <span className="text-xs font-bold text-emerald-700 mt-0.5 block flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
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
                          } catch {}
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
                              <MapPin className="w-4 h-4 text-emerald-600" />
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
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                            Client Enquiries & Requirements ({selectedClientDetails.enquiries?.length || 0})
                          </h4>
                          <button
                            onClick={() => {
                              const c = selectedClientDetails;
                              setSelectedClientDetails(null);
                              setNewEnquiryModal({ clientId: c.id, clientName: c.clientName });
                            }}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
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
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                            Commercial Quotations ({selectedClientDetails.quotations.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedClientDetails.quotations.map((q: any) => (
                              <div
                                key={q.id}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs"
                              >
                                <div>
                                  <span className="font-bold text-slate-900 font-mono">{q.quotationNumber}</span>
                                  <span className="text-slate-400 text-[10px] block">
                                    Version v{q.version} • {new Date(q.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-extrabold text-slate-900 block">
                                    ₹{q.totalAmount?.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-bold text-indigo-700">{q.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                      <button
                        onClick={() => setSelectedClientDetails(null)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Extra Enquiry Modal */}
              {newEnquiryModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                    <h3 className="text-base font-bold text-slate-900">
                      Submit Enquiry for {newEnquiryModal.clientName}
                    </h3>
                    <form onSubmit={handleCreateEnquiry} className="mt-4 space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Service</label>
                        <select
                          value={enquiryForm.serviceCategory}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, serviceCategory: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded"
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
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Detailed Requirements</label>
                        <textarea
                          rows={3}
                          required
                          value={enquiryForm.requirements}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, requirements: e.target.value })}
                          placeholder="Specify features, modules, deliverables..."
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setNewEnquiryModal(null)}
                          className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                        >
                          Submit Enquiry
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
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
                {enquiries.map((enq) => {
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            enq.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : enq.status === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            Management: {enq.status}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            Budget: ₹{enq.expectedBudget?.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="py-3 text-xs text-slate-700">
                        <strong>Requirements:</strong>
                        <p className="text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {enq.requirements}
                        </p>
                        {enq.adminNotes && (
                          <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 text-amber-900">
                            <strong>Admin Review Note:</strong> {enq.adminNotes}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100">
                        <span>Submitted on {new Date(enq.createdAt).toLocaleDateString()}</span>

                        {hasActiveQuote ? (
                          <span className="text-emerald-600 font-semibold">
                            Quotation Issued ({enq.quotations[0].quotationNumber})
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRequestQuotation(enq.id)}
                            className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" /> Request Quotation from Accounts
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: MY QUOTATIONS & CLIENT ACCEPTANCE */}
          {activeTab === 'quotations' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Official Quotations Received</h2>
                <p className="text-xs text-slate-500">
                  Quotations prepared by Accounts. Present to your client, download PDF, request revisions, or record acceptance.
                </p>
              </div>

              <div className="space-y-4">
                {quotations.map((q) => (
                  <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900">{q.quotationNumber}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            v{q.version}
                          </span>
                        </div>
                        <h3 className="text-xs text-slate-600 mt-0.5">
                          Client: <strong>{q.client?.clientName}</strong> ({q.client?.businessName})
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          q.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.status === 'SENT_TO_BGA'
                            ? 'bg-blue-100 text-blue-800'
                            : q.status === 'REVISION_REQUESTED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {q.status}
                        </span>
                        <a
                          href={`/api/resources/quotations/${q.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </div>
                    </div>

                    <div className="py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
                        <span className="font-bold text-emerald-700">₹{q.advanceRequiredAmount?.toLocaleString()}</span>
                      </div>
                    </div>

                    {q.serviceScope && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
                        <strong>Approved Scope:</strong> {q.serviceScope}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-100">
                      <span className="text-slate-400">
                        Valid until {new Date(q.validityDate).toLocaleDateString()}
                      </span>

                      {q.status === 'SENT_TO_BGA' && (
                        <div className="space-x-2">
                          <button
                            onClick={() => setRevisionModal({ quotationId: q.id, quotationNumber: q.quotationNumber })}
                            className="px-3 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded text-xs font-bold"
                          >
                            Request Revision
                          </button>
                          <button
                            onClick={() => setAcceptanceModal({ quotationId: q.id, quotationNumber: q.quotationNumber })}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
                          >
                            Record Client Acceptance ✓
                          </button>
                        </div>
                      )}

                      {q.status === 'ACCEPTED' && (
                        <span className="text-emerald-700 font-bold">
                          Client Accepted on {new Date(q.acceptedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Revision Request Modal */}
              {revisionModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                    <h3 className="text-base font-bold text-slate-900">
                      Request Quotation Revision ({revisionModal.quotationNumber})
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter the changes or commercial feedback requested by the client. Accounts will prepare a revised version.
                    </p>
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Client Feedback / Notes *</label>
                      <textarea
                        rows={3}
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        placeholder="Client requested a 10% discount and inclusion of 2 additional landing pages..."
                        className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => setRevisionModal(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitRevision}
                        disabled={!revisionNotes}
                        className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Send to Accounts
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Acceptance Modal */}
              {acceptanceModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                    <h3 className="text-base font-bold text-slate-900">
                      Record Client Acceptance ({acceptanceModal.quotationNumber})
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Recording client acceptance generates a Work Order and alerts Accounts to collect/verify the advance payment.
                    </p>
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Acceptance Evidence / PO Reference Notes *
                      </label>
                      <textarea
                        rows={3}
                        value={acceptanceNotes}
                        onChange={(e) => setAcceptanceNotes(e.target.value)}
                        placeholder="e.g. Approved via email confirmation from MD on 16 Nov 2026. PO Ref: APEX-2026-PO99"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => setAcceptanceModal(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClientAcceptance}
                        disabled={!acceptanceNotes}
                        className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Confirm Acceptance
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: WORK ORDERS & PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">My Client Projects & Execution</h2>
                <p className="text-xs text-slate-500">
                  Track technical implementation progress and milestones for contracts accepted by your clients.
                </p>
              </div>

              <div className="space-y-4">
                {workOrders.map((wo) => {
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
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            wo.advanceVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Advance: {wo.advanceVerified ? 'VERIFIED' : 'AWAITING VERIFICATION'}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            Value: ₹{wo.totalValue?.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {prj ? (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span>Technical Execution: <strong>{prj.status}</strong></span>
                            <span className="font-bold">{prj.progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all"
                              style={{ width: `${prj.progressPercentage}%` }}
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {prj.milestones?.map((m: any) => (
                              <div key={m.id} className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px]">
                                <span className="font-semibold text-slate-800 block truncate">{m.title}</span>
                                <span className={`text-[10px] font-bold ${
                                  m.status === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-400'
                                }`}>
                                  {m.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
                          ⏳ Waiting for Accounts to verify advance payment receipt before technical handover.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 8: MY EARNINGS & COMMISSIONS */}
          {activeTab === 'earnings' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">My Commission Ledger</h2>
                <p className="text-xs text-slate-500">
                  Detailed ledger of all eligible, approved, and disbursed commissions across your clients.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Client & Service</th>
                      <th className="p-3.5">Model</th>
                      <th className="p-3.5">Commission Amount</th>
                      <th className="p-3.5">Eligibility</th>
                      <th className="p-3.5">Admin Approval</th>
                      <th className="p-3.5">Payout Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissions.map((c) => (
                      <tr key={c.id}>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{c.client?.clientName}</div>
                          <div className="text-[10px] text-slate-400">{c.serviceCategory}</div>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-600">{c.billingType}</td>
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
                          {c.payoutReference && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {c.payoutReference}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: COMPANY SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Standardized Services Catalog</h2>
                <p className="text-xs text-slate-500">Official company services available for client pitches.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((s) => (
                  <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{s.category}</span>
                        <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {s.defaultCommissionRate}% Commission
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">{s.description}</p>
                    <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      Standard Pricing: <strong>₹{s.basePrice?.toLocaleString()}</strong> {s.isMonthly ? '/ month' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: RESOURCES & PITCH DECKS */}
          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Approved Marketing & Presentation Decks</h2>
                <p className="text-xs text-slate-500">Official resources authorized by management for presenting to prospects.</p>
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
                      <span className="font-mono text-slate-400">{r.fileType} Document</span>
                      <button
                        onClick={() => alert(`Downloading presentation: ${r.title}`)}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded font-semibold hover:bg-indigo-100 flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: SUPPORT */}
          {activeTab === 'support' && (
            <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Associate Support Desk</h3>
              <p className="text-xs text-slate-500">
                Have questions regarding a quotation, technical feasibility, or commission payout? Reach our executive desk:
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Accounts & Quotation Queries</span>
                  <span className="font-semibold text-slate-800">accounts@bga-solutions.com</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Technical Project Feasibility</span>
                  <span className="font-semibold text-slate-800">tech@bga-solutions.com</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Direct Associate Helpline</span>
                  <span className="font-semibold text-slate-800">+91 98765 43210 (Mon - Sat, 9 AM - 7 PM)</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

