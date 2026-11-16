import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { apiRequest } from '../../utils/api';

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'bgas' | 'services' | 'resources' | 'clients' | 'enquiries' | 'quotations' | 'workorders' | 'technical' | 'commissions' | 'settings'
  >('dashboard');

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
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

  // Modals & Action States
  const [transferModal, setTransferModal] = useState<{ client: any } | null>(null);
  const [targetBgaId, setTargetBgaId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [bgaStatusFilter, setBgaStatusFilter] = useState('ALL');
  const [searchBga, setSearchBga] = useState('');

  // Resource Create State
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

  // Load Dashboard Data
  const loadData = async () => {
    setLoading(true);
    try {
      const statsRes = await apiRequest('/api/admin/dashboard-stats');
      setStats(statsRes);

      if (activeTab === 'bgas') {
        const res = await apiRequest(`/api/admin/bgas?status=${bgaStatusFilter}&search=${searchBga}`);
        setBgas(res.bgas || []);
      } else if (activeTab === 'services') {
        const res = await apiRequest('/api/admin/services');
        setServices(res.services || []);
      } else if (activeTab === 'resources') {
        const res = await apiRequest('/api/admin/resources');
        setResources(res.resources || []);
      } else if (activeTab === 'clients') {
        const res = await apiRequest('/api/admin/clients');
        setClients(res.clients || []);
        // Also fetch active BGAs for transfer modal
        const bgaRes = await apiRequest('/api/admin/bgas?status=ACTIVE');
        setBgas(bgaRes.bgas || []);
      } else if (activeTab === 'enquiries') {
        const res = await apiRequest('/api/admin/enquiries');
        setEnquiries(res.enquiries || []);
      } else if (activeTab === 'quotations') {
        const res = await apiRequest('/api/accounts/quotation-requests');
        setQuotations(res.requests || []);
      } else if (activeTab === 'workorders') {
        const res = await apiRequest('/api/accounts/work-orders');
        setWorkOrders(res.workOrders || []);
      } else if (activeTab === 'technical') {
        const res = await apiRequest('/api/technical/projects');
        setProjects(res.projects || []);
      } else if (activeTab === 'commissions') {
        const res = await apiRequest('/api/admin/commissions');
        setCommissions(res.commissions || []);
      } else if (activeTab === 'settings') {
        const sRes = await apiRequest('/api/admin/settings');
        setSettings(sRes.settings || []);
        const logsRes = await apiRequest('/api/admin/audit-logs');
        setAuditLogs(logsRes.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, bgaStatusFilter]);

  // Handle BGA Approval Action
  const handleBgaAction = async (id: string, action: string, reason?: string) => {
    try {
      await apiRequest(`/api/admin/bgas/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Handle Enquiry Review Action
  const handleEnquiryReview = async (id: string, action: string) => {
    const notes = prompt(`Enter notes for enquiry ${action}:`) || '';
    try {
      await apiRequest(`/api/admin/enquiries/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, notes }),
      });
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Handle Commission Approval
  const handleCommissionAction = async (id: string, action: string) => {
    try {
      await apiRequest(`/api/admin/commissions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Handle Payout Disbursed
  const handlePayout = async (id: string) => {
    const payoutReference = prompt('Enter Bank / UTR Reference for payout:');
    if (!payoutReference) return;
    try {
      await apiRequest(`/api/admin/commissions/${id}/payout`, {
        method: 'POST',
        body: JSON.stringify({ payoutReference }),
      });
      loadData();
    } catch (e: any) {
      alert(e.message);
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
      setTransferModal(null);
      setTransferReason('');
      setTargetBgaId('');
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Handle Save Settings
  const handleSaveSetting = async (key: string, value: string) => {
    try {
      await apiRequest('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ settings: [{ key, value }] }),
      });
      alert('Setting updated successfully');
      loadData();
    } catch (e: any) {
      alert(e.message);
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
      alert('Resource uploaded successfully');
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
      alert(e.message);
    }
  };

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
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('bgas')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'bgas' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>BGA Management</span>
              </div>
              {stats?.bgas?.pendingApprovals > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {stats.bgas.pendingApprovals}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('enquiries')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'enquiries' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4" />
                <span>Enquiry Approvals</span>
              </div>
              {stats?.enquiries?.pending > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {stats.enquiries.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'clients' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Clients & Ownership</span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'services' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Services & Pricing</span>
            </button>

            <button
              onClick={() => setActiveTab('resources')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'resources' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Company Resources</span>
            </button>

            <button
              onClick={() => setActiveTab('quotations')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'quotations' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Quotation Monitoring</span>
            </button>

            <button
              onClick={() => setActiveTab('workorders')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'workorders' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Work Orders & Accounts</span>
            </button>

            <button
              onClick={() => setActiveTab('technical')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'technical' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Technical Projects</span>
            </button>

            <button
              onClick={() => setActiveTab('commissions')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'commissions' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Commissions & Payouts</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'settings' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Workflow & Audit Logs</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            PostgreSQL: Connected (Neon)
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Total BGAs</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.bgas.total}</div>
                  <span className="text-xs text-emerald-600 font-medium">{stats.bgas.active} Active Associates</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Pending BGA Approvals</span>
                  <div className="text-2xl font-bold text-amber-600 mt-1">{stats.bgas.pendingApprovals}</div>
                  <span className="text-xs text-slate-400">KYC & Bank verification pending</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Total Registered Clients</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.clients.total}</div>
                  <span className="text-xs text-indigo-600">{stats.enquiries.total} Enquiries Created</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Verified Revenue</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    ₹{stats.finance.totalVerifiedRevenue.toLocaleString()}
                  </div>
                  <span className="text-xs text-slate-400">Total verified client payments</span>
                </div>
              </div>

              {/* Commission Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-tr from-purple-900 to-indigo-900 text-white shadow-sm">
                  <span className="text-xs text-purple-200 uppercase tracking-wider font-semibold">Total Commissions</span>
                  <div className="text-3xl font-extrabold mt-1">₹{stats.finance.totalCommissions.toLocaleString()}</div>
                  <p className="text-xs text-purple-200/80 mt-1">Computed by system commission engine</p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-tr from-emerald-900 to-teal-900 text-white shadow-sm">
                  <span className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">Commissions Disbursed</span>
                  <div className="text-3xl font-extrabold mt-1">₹{stats.finance.paidCommissions.toLocaleString()}</div>
                  <p className="text-xs text-emerald-200/80 mt-1">Successfully transferred to associates</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase">Pending Approvals</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {stats.enquiries.pending} Enquiries • {stats.bgas.pendingApprovals} BGAs
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('enquiries')}
                    className="mt-4 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors text-left"
                  >
                    Review Pending Items →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BGA MANAGEMENT */}
          {activeTab === 'bgas' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-slate-900">BGA Associates Directory</h2>
                  <select
                    value={bgaStatusFilter}
                    onChange={(e) => setBgaStatusFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUBMITTED">SUBMITTED (New)</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search name, PAN, email..."
                    value={searchBga}
                    onChange={(e) => setSearchBga(e.target.value)}
                    className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={loadData}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Associate Details</th>
                      <th className="p-3.5">KYC Status</th>
                      <th className="p-3.5">Bank Details</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bgas.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{b.name}</div>
                          <div className="text-slate-500 text-[11px]">{b.email} • {b.mobile}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Clients: {b._count?.clients} • Enquiries: {b._count?.enquiries}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              b.panVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              PAN: {b.panNumber || 'Missing'} {b.panVerified ? '✓' : '(Unverified)'}
                            </span>
                            <br />
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              b.aadhaarVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              Aadhaar: {b.aadhaarMasked || 'None'} {b.aadhaarVerified ? '✓' : ''}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono text-[11px] text-slate-800">{b.bankAccountNumber || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500">IFSC: {b.bankIfsc || 'N/A'}</div>
                          <span className={`text-[10px] font-semibold ${b.bankVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {b.bankVerified ? 'Verified' : 'Verification Pending'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {b.status !== 'ACTIVE' ? (
                            <button
                              onClick={() => handleBgaAction(b.id, 'APPROVE_AND_ACTIVATE')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700"
                            >
                              Approve & Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBgaAction(b.id, 'SUSPEND')}
                              className="px-2.5 py-1 bg-amber-600 text-white rounded text-[11px] font-bold hover:bg-amber-700"
                            >
                              Suspend
                            </button>
                          )}
                          {b.status === 'SUBMITTED' && (
                            <button
                              onClick={() => handleBgaAction(b.id, 'REJECT')}
                              className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CLIENTS & OWNERSHIP (With Ownership Transfer) */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">All Registered Clients</h2>
                  <p className="text-xs text-slate-500">
                    Strict client ownership policy. Only Admin is authorized to transfer ownership between BGAs.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
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
                    {clients.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{c.clientName}</div>
                          <div className="text-slate-500 text-[11px]">{c.businessName} ({c.businessCategory})</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-800">{c.email}</div>
                          <div className="text-slate-500 text-[11px]">{c.mobile} • {c.location}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {c.bga?.name}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{c.bga?.email}</div>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {c._count?.enquiries} Enquiries • {c._count?.quotations} Quotes
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setTransferModal({ client: c })}
                            className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-semibold border border-slate-200 flex items-center gap-1 ml-auto"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Owner
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
                          className="w-full text-xs p-2 bg-slate-100 border border-slate-300 rounded text-slate-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Select New Owner BGA *</label>
                        <select
                          value={targetBgaId}
                          onChange={(e) => setTargetBgaId(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
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
                          className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        onClick={() => setTransferModal(null)}
                        className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeClientTransfer}
                        disabled={!targetBgaId}
                        className="px-4 py-2 rounded text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
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
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Enquiry Approvals & Review</h2>
                <p className="text-xs text-slate-500">
                  Review client requirements submitted by BGAs before quotations can be drafted by Accounts.
                </p>
              </div>

              <div className="space-y-3">
                {enquiries.map((enq) => (
                  <div key={enq.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-500">{enq.id}</span>
                        <h3 className="text-sm font-bold text-slate-900">
                          {enq.client?.clientName} ({enq.client?.businessName})
                        </h3>
                        <span className="text-xs text-indigo-600 font-semibold">{enq.serviceCategory}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          enq.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : enq.status === 'SUBMITTED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {enq.status}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          Budget: ₹{enq.expectedBudget?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="py-3 text-xs text-slate-700">
                      <strong>Requirements:</strong>
                      <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {enq.requirements}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100">
                      <span>Submitted by: <strong>{enq.bga?.name}</strong> ({enq.bga?.email})</span>

                      {enq.status === 'SUBMITTED' && (
                        <div className="space-x-2">
                          <button
                            onClick={() => handleEnquiryReview(enq.id, 'APPROVE')}
                            className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700"
                          >
                            Approve Enquiry
                          </button>
                          <button
                            onClick={() => handleEnquiryReview(enq.id, 'REQUEST_CHANGES')}
                            className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700"
                          >
                            Request Scope Changes
                          </button>
                          <button
                            onClick={() => handleEnquiryReview(enq.id, 'REJECT')}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SERVICES & COMMISSIONS CONFIG */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Service Categories & Base Pricing</h2>
                  <p className="text-xs text-slate-500">Configured across the 4 main service branches.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((svc) => (
                  <div key={svc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{svc.category}</span>
                        <h4 className="text-sm font-bold text-slate-900">{svc.name}</h4>
                        <span className="text-xs font-mono text-slate-400">{svc.code}</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {svc.defaultCommissionRate}% Commission
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2">{svc.description}</p>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Base Price: <strong>₹{svc.basePrice?.toLocaleString()}</strong></span>
                      <span className="text-slate-400">{svc.isMonthly ? 'Monthly Retainer' : 'One-time Project'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: COMPANY RESOURCES */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Upload / Publish Company Presentation</h3>
                <form onSubmit={handleCreateResource} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Resource Title *</label>
                    <input
                      type="text"
                      required
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      placeholder="e.g. Enterprise Cloud ERP Deck 2026"
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Category</label>
                    <select
                      value={newResource.category}
                      onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded"
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
                      placeholder="Summary of presentation contents"
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newResource.isPublished}
                        onChange={(e) => setNewResource({ ...newResource, isPublished: e.target.checked })}
                      />
                      <span>Published to BGAs</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newResource.isConfidential}
                        onChange={(e) => setNewResource({ ...newResource, isConfidential: e.target.checked })}
                      />
                      <span className="text-red-600 font-semibold">Confidential (Hidden from BGAs)</span>
                    </label>

                    <button
                      type="submit"
                      className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700"
                    >
                      Add Resource
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Title & Category</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">BGA Visibility</th>
                      <th className="p-3.5">Confidentiality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resources.map((r) => (
                      <tr key={r.id}>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{r.title}</div>
                          <div className="text-slate-500 text-[11px]">{r.description}</div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">{r.fileType}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {r.isPublished ? 'Published' : 'Draft / Unpublished'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {r.isConfidential ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                              Confidential
                            </span>
                          ) : (
                            <span className="text-slate-400">Public</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: COMMISSIONS & PAYOUTS */}
          {activeTab === 'commissions' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Commission Oversight & Payouts</h2>
                <p className="text-xs text-slate-500">
                  Authorize commissions generated for monthly Digital Marketing or completed projects.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
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
                    {commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{c.bga?.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {c.bga?.bankAccountNumber} ({c.bga?.bankIfsc})
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{c.client?.clientName}</div>
                          <div className="text-[11px] text-indigo-600">{c.serviceCategory}</div>
                          <div className="text-[10px] text-slate-400">{c.billingType}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-emerald-700 font-bold text-sm">
                            ₹{c.calculatedCommission?.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Fee: ₹{c.commissionableAmount?.toLocaleString()} @ {c.commissionRate}%
                          </div>
                          {c.excludedAdSpend > 0 && (
                            <div className="text-[10px] text-slate-400">
                              (Ad spend ₹{c.excludedAdSpend} excluded)
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.approvalStatus === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.approvalStatus}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.payoutStatus === 'PROCESSED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {c.payoutStatus}
                          </span>
                          {c.payoutReference && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Ref: {c.payoutReference}</div>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {c.approvalStatus !== 'APPROVED' ? (
                            <button
                              onClick={() => handleCommissionAction(c.id, 'APPROVE')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700"
                            >
                              Approve Payout
                            </button>
                          ) : c.payoutStatus !== 'PROCESSED' ? (
                            <button
                              onClick={() => handlePayout(c.id)}
                              className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700"
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
            </div>
          )}

          {/* TAB 8: SETTINGS & AUDIT LOGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Configurable Workflow Settings</h3>
                <div className="space-y-3">
                  {settings.map((s) => (
                    <div key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-slate-50 rounded-lg text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-800">{s.key}</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">{s.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.key === 'enquiry_approval_required_for_quotation' ? (
                          <button
                            onClick={() => handleSaveSetting(s.key, s.value === 'true' ? 'false' : 'true')}
                            className={`px-3 py-1.5 rounded text-xs font-bold ${
                              s.value === 'true' ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-800'
                            }`}
                          >
                            {s.value === 'true' ? 'Required (Enabled)' : 'Bypass Approval'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              defaultValue={s.value}
                              onBlur={(e) => handleSaveSetting(s.key, e.target.value)}
                              className="w-28 p-1 border border-slate-300 rounded font-semibold text-right"
                            />
                            {s.key.includes('rate') && <span>%</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Logs */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Immutable System Audit Trail</h3>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-2.5 flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="text-slate-400 text-[10px] ml-2">by {log.userRole || 'SYSTEM'} ({log.userEmail})</span>
                        <p className="text-slate-500 text-[11px] font-mono mt-0.5">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: QUOTATION MONITORING */}
          {activeTab === 'quotations' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Quotation Monitoring</h2>
                <p className="text-xs text-slate-500">Monitor all client quotations, versions, and acceptance states.</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Quotation No</th>
                      <th className="p-3.5">Client & BGA</th>
                      <th className="p-3.5">Service & Total</th>
                      <th className="p-3.5">Advance Req.</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotations.map((q) => (
                      <tr key={q.id}>
                        <td className="p-3.5 font-bold font-mono text-slate-900">
                          {q.quotationNumber} (v{q.version})
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{q.client?.clientName}</div>
                          <div className="text-[10px] text-slate-400">BGA: {q.bga?.name}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-800 font-bold">₹{q.totalAmount?.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500">{q.serviceCategory}</div>
                        </td>
                        <td className="p-3.5 font-semibold text-indigo-700">
                          ₹{q.advanceRequiredAmount?.toLocaleString()} ({q.advanceRequiredPercent}%)
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : q.status === 'SENT_TO_BGA'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <a
                            href={`/api/resources/quotations/${q.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded text-slate-700 font-semibold"
                          >
                            PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 10: WORK ORDERS & ACCOUNTS */}
          {activeTab === 'workorders' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Work Orders & Accounts Monitoring</h2>
                <p className="text-xs text-slate-500">Track contract execution and verified payment statuses.</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Work Order</th>
                      <th className="p-3.5">Client & BGA</th>
                      <th className="p-3.5">Contract Value</th>
                      <th className="p-3.5">Advance Verified</th>
                      <th className="p-3.5">Workflow Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workOrders.map((w) => (
                      <tr key={w.id}>
                        <td className="p-3.5 font-bold font-mono text-slate-900">{w.workOrderNumber}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{w.client?.clientName}</div>
                          <div className="text-[10px] text-slate-400">{w.bga?.name}</div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">₹{w.totalValue?.toLocaleString()}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.advanceVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {w.advanceVerified ? 'VERIFIED' : 'PENDING RECEIPT'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-700">{w.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 11: TECHNICAL PROJECTS */}
          {activeTab === 'technical' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Technical Projects Monitoring</h2>
                <p className="text-xs text-slate-500">Track implementation milestones and deliverables.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((p) => (
                  <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-500">{p.projectNumber}</span>
                        <h4 className="text-sm font-bold text-slate-900">{p.client?.clientName}</h4>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {p.status}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Progress</span>
                        <span className="font-bold">{p.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${p.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      Milestones: {p.milestones?.filter((m: any) => m.status === 'COMPLETED').length} / {p.milestones?.length} Done
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

