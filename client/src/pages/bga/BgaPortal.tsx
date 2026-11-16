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
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';

export const BgaPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'profile' | 'services' | 'resources' | 'new-client' | 'clients' | 'enquiries' | 'quotations' | 'projects' | 'earnings' | 'support'
  >('dashboard');

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // New Client Form
  const [clientForm, setClientForm] = useState({
    clientName: '',
    businessName: '',
    mobile: '',
    email: '',
    location: '',
    businessCategory: 'IT & Software',
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

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await apiRequest('/api/bga/dashboard-stats');
      setStats(s);

      if (activeTab === 'clients') {
        const c = await apiRequest('/api/bga/clients');
        setClients(c.clients || []);
      } else if (activeTab === 'enquiries') {
        const e = await apiRequest('/api/bga/enquiries');
        setEnquiries(e.enquiries || []);
      } else if (activeTab === 'quotations') {
        const q = await apiRequest('/api/bga/quotations');
        setQuotations(q.quotations || []);
      } else if (activeTab === 'projects') {
        const w = await apiRequest('/api/bga/work-orders');
        setWorkOrders(w.workOrders || []);
      } else if (activeTab === 'earnings') {
        const comm = await apiRequest('/api/bga/commissions');
        setCommissions(comm.commissions || []);
      } else if (activeTab === 'resources') {
        const r = await apiRequest('/api/bga/resources');
        setResources(r.resources || []);
      } else if (activeTab === 'services') {
        const svc = await apiRequest('/api/bga/services');
        setServices(svc.services || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Handle Client Registration
  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientFormError(null);
    setClientFormSuccess(null);

    try {
      const res = await apiRequest('/api/bga/clients', {
        method: 'POST',
        body: JSON.stringify(clientForm),
      });

      setClientFormSuccess(res.message);
      setClientForm({
        clientName: '',
        businessName: '',
        mobile: '',
        email: '',
        location: '',
        businessCategory: 'IT & Software',
        requiredService: 'DIGITAL_MARKETING',
        expectedBudget: '',
        clientRequirements: '',
        discussionNotes: '',
        followUpDate: '',
      });
      loadData();
    } catch (err: any) {
      setClientFormError(err.message);
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
              onClick={() => setActiveTab('new-client')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'new-client' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Client</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
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
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && stats && (
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
                    onClick={() => setActiveTab('new-client')}
                    className="mt-4 px-4 py-2 bg-white text-indigo-900 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors w-fit"
                  >
                    Register New Client +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY PROFILE & KYC */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Associate Profile & Verification Badges</h3>
                <p className="text-xs text-slate-500">
                  Your identity documents and bank details are securely verified for authorized operations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">PAN Verification</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">{user?.panVerified ? 'VERIFIED' : 'PENDING'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">Aadhaar Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      {user?.aadhaarVerified ? 'VERIFIED (MASKED)' : 'COMPLETED'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs text-slate-500 block">Bank Account</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      {user?.bankVerified ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs border-t border-slate-100 pt-4">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Associate Name</span>
                  <span className="font-semibold text-slate-900">{user?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Registered Email</span>
                  <span className="font-semibold text-slate-900">{user?.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mobile Phone</span>
                  <span className="font-semibold text-slate-900">{user?.mobile}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">System Role</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NEW CLIENT REGISTRATION (With Strict Duplicate Check) */}
          {activeTab === 'new-client' && (
            <div className="max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Exclusive Ownership Guarantee
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Register a New Client</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Once registered, this client is strictly assigned to you. Our system automatically checks normalized phone and email to prevent duplicate claims.
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

              {clientFormSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{clientFormSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegisterClient} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Client Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={clientForm.clientName}
                      onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                      placeholder="e.g. Anand Mahindra"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
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
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Mobile Number (10 Digits) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientForm.mobile}
                      onChange={(e) => setClientForm({ ...clientForm, mobile: e.target.value })}
                      placeholder="9876543210"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
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
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">City / Location *</label>
                    <input
                      type="text"
                      required
                      value={clientForm.location}
                      onChange={(e) => setClientForm({ ...clientForm, location: e.target.value })}
                      placeholder="e.g. Mumbai / Bangalore"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Business Category *</label>
                    <input
                      type="text"
                      required
                      value={clientForm.businessCategory}
                      onChange={(e) => setClientForm({ ...clientForm, businessCategory: e.target.value })}
                      placeholder="e.g. Healthcare, Retail, Manufacturing"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Initial Enquiry Details (Optional)</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Primary Required Service</label>
                      <select
                        value={clientForm.requiredService}
                        onChange={(e) => setClientForm({ ...clientForm, requiredService: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
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
                      >
                      </input>
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

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-sm transition-colors"
                  >
                    Register Client & Submit Enquiry
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: MY CLIENTS */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">My Client Portfolio</h2>
                  <p className="text-xs text-slate-500">
                    Clients exclusively tied to your associate account. (Other BGAs cannot view or access your clients).
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('new-client')}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                >
                  + Add New Client
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clients.map((c) => (
                  <div key={c.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{c.clientName}</h3>
                          <span className="text-xs text-indigo-600 font-semibold">{c.businessName}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          Active Client
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 space-y-1">
                        <div>📞 {c.mobile}</div>
                        <div>✉️ {c.email}</div>
                        <div>📍 {c.location} • Category: {c.businessCategory}</div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-500">
                        <span>{c.enquiries?.length || 0} Enquiries</span>
                        <span>•</span>
                        <span>{c.quotations?.length || 0} Quotations</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        onClick={() => setNewEnquiryModal({ clientId: c.id, clientName: c.clientName })}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100"
                      >
                        + Submit New Enquiry
                      </button>
                    </div>
                  </div>
                ))}
              </div>

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
            <div className="max-w-xl bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
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
