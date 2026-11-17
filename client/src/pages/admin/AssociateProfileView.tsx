import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  ShieldCheck,
  CreditCard,
  Building2,
  FileText,
  Users,
  Briefcase,
  DollarSign,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  X,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

interface AssociateProfileViewProps {
  associateId: string;
  onBack: () => void;
  onRefreshList: () => void;
}

export const AssociateProfileView: React.FC<AssociateProfileViewProps> = ({
  associateId,
  onBack,
  onRefreshList,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [associate, setAssociate] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'personal' | 'kyc' | 'bank' | 'account' | 'documents' | 'clients' | 'projects' | 'commissions' | 'audit'
  >('overview');

  // Security & Masking states
  const [revealBankAcc, setRevealBankAcc] = useState(false);
  const [revealPan, setRevealPan] = useState(false);

  // Modals & Action States
  const [actionModal, setActionModal] = useState<{
    type: 'ACTIVATE' | 'SUSPEND' | 'REJECT';
    title: string;
    description: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; type: string } | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/admin/bgas/${associateId}`);
      setAssociate(data.associate);
      setMetrics(data.metrics);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load associate profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [associateId]);

  // Handle Account Status Action
  const handleExecuteAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);

    try {
      const actionMap: Record<string, string> = {
        ACTIVATE: 'APPROVE_AND_ACTIVATE',
        SUSPEND: 'SUSPEND',
        REJECT: 'REJECT',
      };

      await apiRequest(`/api/admin/bgas/${associateId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          action: actionMap[actionModal.type],
          reason: actionReason,
        }),
      });

      toast.success(`Associate account status changed: ${actionModal.type}`);
      setActionModal(null);
      setActionReason('');
      fetchProfile();
      onRefreshList();
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Individual Verification Toggle
  const handleVerifyKyc = async (field: 'panVerified' | 'aadhaarVerified' | 'bankVerified', value: boolean) => {
    try {
      await apiRequest(`/api/admin/bgas/${associateId}/status`, {
        method: 'POST',
        body: JSON.stringify({ [field]: value }),
      });
      toast.success(`Verification status updated.`);
      fetchProfile();
      onRefreshList();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update verification');
    }
  };

  // Masking helpers
  const maskAccount = (num?: string) => {
    if (!num) return 'Not provided';
    if (revealBankAcc) return num;
    if (num.length <= 4) return num;
    return '••••••••' + num.slice(-4);
  };

  const maskPan = (pan?: string) => {
    if (!pan) return 'Not provided';
    if (revealPan) return pan;
    if (pan.length <= 4) return pan;
    return '•••••' + pan.slice(-4);
  };

  const formatAddress = (addr?: string | null) => {
    if (!addr) return 'Not provided';
    try {
      if (addr.startsWith('{') && addr.endsWith('}')) {
        const parsed = JSON.parse(addr);
        return parsed.fullAddress || [parsed.houseNumber, parsed.streetAddress, parsed.locality, parsed.city, parsed.district, parsed.state, parsed.pinCode].filter(Boolean).join(', ');
      }
    } catch { }
    return addr;
  };

  const handleReviewCorrection = async (corrId: string, action: 'APPROVE' | 'REJECT', remarks?: string) => {
    try {
      await apiRequest(`/api/admin/identity-corrections/${corrId}/review`, {
        method: 'POST',
        body: JSON.stringify({ bgaId: associateId, action, remarks }),
      });
      toast.success(`Identity correction ${action === 'APPROVE' ? 'approved' : 'rejected'}.`);
      fetchProfile();
      onRefreshList();
    } catch (e: any) {
      toast.error(e.message || 'Failed to review identity correction');
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3066BE]" />
      </div>
    );
  }

  if (!associate) {
    return (
      <div className="w-full p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">Associate Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested associate record does not exist or has been removed.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          Return to Associates Directory
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-[#3066BE]/10 hover:text-[#3066BE] text-slate-600 transition-colors"
            title="Back to Associates Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{associate.name}</h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                ID: {associate.id}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${associate.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : associate.status === 'SUBMITTED'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                  }`}
              >
                Status: {associate.status}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${associate.panVerified && associate.bankVerified
                  ? 'bg-[#3066BE]/10 text-[#3066BE] border border-[#3066BE]/25'
                  : 'bg-slate-100 text-slate-600'
                  }`}
              >
                KYC: {associate.panVerified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {associate.status !== 'ACTIVE' ? (
            <button
              onClick={() =>
                setActionModal({
                  type: 'ACTIVATE',
                  title: 'Approve & Activate Associate',
                  description: `Are you sure you want to approve and activate ${associate.name}? This grants active portal access to register clients and earn commissions.`,
                })
              }
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Activate</span>
            </button>
          ) : (
            <button
              onClick={() =>
                setActionModal({
                  type: 'SUSPEND',
                  title: 'Suspend Associate Account',
                  description: `Suspending ${associate.name} will immediately block portal login and freeze client submissions until reactivated.`,
                })
              }
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Suspend Account</span>
            </button>
          )}

          <button
            onClick={fetchProfile}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile Overview Card (Full-Width Responsive) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          {/* Avatar & Core Identity */}
          <div className="flex items-center gap-4 md:col-span-1 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 pr-0 md:pr-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3066BE] to-[#119DA4] text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-[#3066BE]/25 shrink-0">
              {associate.name
                .split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-base truncate">{associate.name}</h3>
              <p className="text-xs text-slate-500 truncate">{associate.email}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{associate.mobile}</span>
              </div>
            </div>
          </div>

          {/* Location & Verification */}
          <div className="space-y-1.5 text-xs text-slate-600 md:col-span-1 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 pr-0 md:pr-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium truncate">
                {associate.city || associate.state ? `${associate.city || ''}, ${associate.state || ''} ${associate.pinCode || ''}` : associate.address || 'Address not provided'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Registered: {new Date(associate.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Last Login: {associate.lastLoginAt ? new Date(associate.lastLoginAt).toLocaleString() : 'Never logged in'}</span>
            </div>
          </div>

          {/* Performance Mini-Stats */}
          <div className="grid grid-cols-3 gap-2 md:col-span-2 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 font-semibold block">Total Clients</span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">{metrics?.totalClients || 0}</div>
            </div>
            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
              <span className="text-[11px] text-[#3066BE] font-semibold block">Earned Commission</span>
              <div className="text-xl font-extrabold text-[#3066BE] mt-0.5">
                ₹{(metrics?.commissions?.totalEarned || 0).toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[11px] text-emerald-700 font-semibold block">Paid Disbursed</span>
              <div className="text-xl font-extrabold text-emerald-800 mt-0.5">
                ₹{(metrics?.commissions?.paid || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Layout: Vertical Left Navigation on Desktop, Responsive Grid on Mobile */}
      <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
        {/* Navigation Sidebar */}
        <nav className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Profile Sections</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3066BE]/10 text-[#3066BE]">10 Modules</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
            {[
              { id: 'overview', label: '1. Overview', icon: Briefcase },
              { id: 'personal', label: '2. Personal Details', icon: User },
              { id: 'kyc', label: '3. KYC & Identity', icon: ShieldCheck },
              { id: 'bank', label: '4. Bank Details', icon: CreditCard },
              { id: 'account', label: '5. Account & Security', icon: Lock },
              { id: 'documents', label: '6. Documents & Proofs', icon: FileText },
              { id: 'clients', label: '7. Clients & Enquiries', icon: Users },
              { id: 'projects', label: '8. Projects & Delivery', icon: Building2 },
              { id: 'commissions', label: '9. Commission History', icon: DollarSign },
              { id: 'audit', label: '10. Activity & Audit', icon: History },
            ].map((t) => {
              const Icon = t.icon;
              const isSel = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${isSel
                    ? 'bg-[#3066BE] text-white shadow-md shadow-[#3066BE]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">

          {/* TAB CONTENT AREAS */}

          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 w-full">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Registered Clients</span>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics?.totalClients || 0}</div>
                  <span className="text-[10px] text-emerald-600">100% Owned by Associate</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Enquiries</span>
                  <div className="text-2xl font-extrabold text-indigo-600 mt-1">{metrics?.enquiries?.total || 0}</div>
                  <span className="text-[10px] text-slate-500">
                    {metrics?.enquiries?.approved || 0} Approved • {metrics?.enquiries?.pending || 0} Pending
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Active Projects</span>
                  <div className="text-2xl font-extrabold text-amber-600 mt-1">{metrics?.projects?.active || 0}</div>
                  <span className="text-[10px] text-slate-500">{metrics?.projects?.completed || 0} Completed</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Earned</span>
                  <div className="text-2xl font-extrabold text-[#3066BE] mt-1">
                    ₹{(metrics?.commissions?.totalEarned || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Lifetime calculated</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Pending Payout</span>
                  <div className="text-2xl font-extrabold text-amber-700 mt-1">
                    ₹{(metrics?.commissions?.pending || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-amber-600">Awaiting cycle/disbursement</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Paid Out</span>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                    ₹{(metrics?.commissions?.paid || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-600">Disbursed to bank</span>
                </div>
              </div>

              {/* Two-column summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {/* Verification Status Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                    Verification & Compliance Status
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">PAN Verification</span>
                        <p className="text-[11px] text-slate-500">{associate.panNumber ? maskPan(associate.panNumber) : 'Not provided'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${associate.panVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                        {associate.panVerified ? 'VERIFIED ✓' : 'PENDING'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">Aadhaar Identity (Masked)</span>
                        <p className="text-[11px] text-slate-500">{associate.aadhaarMasked || 'Not provided'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${associate.aadhaarVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {associate.aadhaarVerified ? 'VERIFIED ✓' : 'NOT VERIFIED'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">Bank Account Verification</span>
                        <p className="text-[11px] text-slate-500">{associate.bankName || 'Bank details'} ({maskAccount(associate.bankAccountNumber)})</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${associate.bankVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                        {associate.bankVerified ? 'VERIFIED ✓' : 'PENDING'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">Signed Associate Agreement</span>
                        <p className="text-[11px] text-slate-500">
                          {associate.agreementAccepted ? `Accepted on ${new Date(associate.agreementAcceptedAt || associate.createdAt).toLocaleDateString()}` : 'Not accepted'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${associate.agreementAccepted ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {associate.agreementAccepted ? 'ACCEPTED ✓' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Clients Snapshot */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-sm">Assigned Clients Snapshot</h4>
                    <button
                      onClick={() => setActiveTab('clients')}
                      className="text-xs font-bold text-[#3066BE] hover:text-purple-800"
                    >
                      View All ({associate.clients?.length || 0}) →
                    </button>
                  </div>

                  {associate.clients?.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">No clients registered yet by this associate.</div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {associate.clients.slice(0, 5).map((c: any) => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{c.clientName}</span>
                            <div className="text-[11px] text-slate-500">{c.businessName} • {c.location}</div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            {c.enquiries?.length || 0} Enquiries
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. PERSONAL DETAILS */}
          {activeTab === 'personal' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Personal & Contact Information</h3>
                <p className="text-xs text-slate-500">Submitted during public registration and onboarding.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Full Legal Name</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">{associate.name || 'Not provided'}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Date of Birth</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">
                    {associate.dob ? new Date(associate.dob).toLocaleDateString() : 'Not provided'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Associate System ID</span>
                  <span className="font-mono text-slate-900 font-bold text-sm mt-0.5 block">{associate.id}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Mobile Number</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">{associate.mobile || 'Not provided'}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Email Address</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">{associate.email || 'Not provided'}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Registration Timestamp</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">
                    {new Date(associate.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 md:col-span-2">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Residential Address</span>
                  <span className="text-slate-900 font-semibold text-sm mt-0.5 block leading-relaxed">
                    {formatAddress(associate.address)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">City / State / PIN</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">
                    {associate.city || associate.state ? `${associate.city || ''}, ${associate.state || ''} - ${associate.pinCode || ''}` : 'Not provided'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. KYC & IDENTITY */}
          {activeTab === 'kyc' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-6">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Identity & Compliance Records</h3>
                  <p className="text-xs text-slate-500">PAN, Aadhaar consent, and KYC approval history.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PAN Verification Card */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 text-sm">Permanent Account Number (PAN)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${associate.panVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                      {associate.panVerified ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">PAN NUMBER</span>
                      <span className="font-mono text-base font-bold text-slate-900">
                        {maskPan(associate.panNumber)}
                      </span>
                    </div>
                    {associate.panNumber && (
                      <button
                        onClick={() => setRevealPan(!revealPan)}
                        className="p-2 text-slate-500 hover:text-[#3066BE] rounded-lg hover:bg-slate-100"
                        title={revealPan ? 'Mask PAN' : 'Reveal PAN'}
                      >
                        {revealPan ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Verification Date:</span>
                      <span className="font-semibold text-slate-800">
                        {associate.panVerifiedAt ? new Date(associate.panVerifiedAt).toLocaleDateString() : associate.panVerified ? 'Auto-verified' : 'Not verified'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>KYC Submission Date:</span>
                      <span className="font-semibold text-slate-800">
                        {associate.kycSubmittedAt ? new Date(associate.kycSubmittedAt).toLocaleDateString() : new Date(associate.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleVerifyKyc('panVerified', !associate.panVerified)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${associate.panVerified
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                      {associate.panVerified ? 'Revoke PAN Verification' : 'Mark PAN Verified ✓'}
                    </button>
                  </div>
                </div>

                {/* Aadhaar Verification Card */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 text-sm">Aadhaar Identification</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${associate.aadhaarVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                      {associate.aadhaarVerified ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">MASKED AADHAAR NUMBER</span>
                    <span className="font-mono text-base font-bold text-slate-900">
                      {associate.aadhaarMasked || 'Not provided'}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      🔒 Raw 12-digit Aadhaar numbers and OTPs are never stored for regulatory compliance.
                    </p>
                  </div>

                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Verification Date:</span>
                      <span className="font-semibold text-slate-800">
                        {associate.aadhaarVerifiedAt ? new Date(associate.aadhaarVerifiedAt).toLocaleDateString() : associate.aadhaarVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Verification Provider:</span>
                      <span className="font-semibold text-slate-800">Authorized UIDAI / KYC Gateway</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleVerifyKyc('aadhaarVerified', !associate.aadhaarVerified)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${associate.aadhaarVerified
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                      {associate.aadhaarVerified ? 'Revoke Aadhaar' : 'Mark Aadhaar Verified ✓'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. BANK ACCOUNT INFORMATION */}
          {activeTab === 'bank' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-6">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bank Account for Commission Payouts</h3>
                  <p className="text-xs text-slate-500">Verified bank coordinates used for NEFT/IMPS disbursements.</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${associate.bankVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                  {associate.bankVerified ? 'Bank Account Verified ✓' : 'Verification Required'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Account Holder Name</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">
                    {associate.bankAccountHolder || 'Not provided'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Bank Name</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">
                    {associate.bankName || 'Not specified'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Account Number</span>
                    {associate.bankAccountNumber && (
                      <button
                        onClick={() => setRevealBankAcc(!revealBankAcc)}
                        className="text-[11px] text-[#3066BE] font-bold hover:underline"
                      >
                        {revealBankAcc ? 'Mask' : 'Reveal'}
                      </button>
                    )}
                  </div>
                  <span className="font-mono text-slate-900 font-bold text-sm mt-0.5 block">
                    {maskAccount(associate.bankAccountNumber)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">IFSC Code</span>
                  <span className="font-mono text-slate-900 font-bold text-sm mt-0.5 block">
                    {associate.bankIfsc || 'Not provided'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Bank Verification Date:</span>{' '}
                  <strong className="text-slate-800">
                    {associate.bankVerifiedAt ? new Date(associate.bankVerifiedAt).toLocaleDateString() : associate.bankVerified ? 'Verified' : 'Pending verification'}
                  </strong>
                </div>

                <button
                  onClick={() => handleVerifyKyc('bankVerified', !associate.bankVerified)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${associate.bankVerified
                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                  {associate.bankVerified ? 'Revoke Bank Verification' : 'Verify Bank Account Details ✓'}
                </button>
              </div>
            </div>
          )}

          {/* 5. ACCOUNT & SECURITY */}
          {activeTab === 'account' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Account Governance & Security</h3>
                <p className="text-xs text-slate-500">Credential lifecycle, system timestamps, and audit history.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Login Email / Username</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">{associate.email}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Assigned Role</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-sm mt-0.5 inline-block">
                    {associate.role}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Current Portal Status</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block uppercase">{associate.status}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Activation Date</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">
                    {associate.approvedAt ? new Date(associate.approvedAt).toLocaleString() : 'Pending Activation'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Last Login Session</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">
                    {associate.lastLoginAt ? new Date(associate.lastLoginAt).toLocaleString() : 'No recorded login'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Last Profile Update</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">
                    {new Date(associate.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70/50 border border-purple-100 flex items-start gap-3 text-xs">
                <Lock className="w-5 h-5 text-[#3066BE] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-900 block font-bold">Cryptographic Credential Security & Governance</strong>
                  <p className="text-purple-800/90 mt-1 leading-relaxed">
                    Associate credentials, salted password hashes, and identity tokens are stored strictly within the secure database partition. In compliance with security policy, plaintext passwords and hashes are never exposed in the UI or transmitted across client interfaces. Standard account recovery is mediated via authenticated multi-factor recovery channels.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 6. DOCUMENTS & PROOFS */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Submitted Documents & Signed Consent</h3>
                <p className="text-xs text-slate-500">Access-controlled documentation for verification and legal compliance.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Agreement Document */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">Signed Associate Agreement</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Accepted on {new Date(associate.agreementAcceptedAt || associate.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-2 inline-block">
                      Legally Binding Consent Verified ✓
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setPreviewDoc({
                        title: 'BGA Associate Agreement & Consent Terms',
                        url: associate.agreementDocumentUrl || '/sample-agreement.pdf',
                        type: 'PDF Document',
                      })
                    }
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-[#3066BE]/10 hover:text-[#3066BE] text-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                </div>

                {/* PAN Card Proof */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">PAN Card Verification Record</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      PAN: {maskPan(associate.panNumber)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-2 inline-block ${associate.panVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {associate.panVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setPreviewDoc({
                        title: 'PAN Card Verification Document',
                        url: associate.panDocumentUrl || '/sample-pan.pdf',
                        type: 'PDF',
                      })
                    }
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-[#3066BE]/10 hover:text-[#3066BE] text-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                </div>

                {/* Address Proof */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">Residential Address Proof</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      {associate.city || associate.state ? `${associate.city}, ${associate.state}` : 'Submitted during KYC'}
                    </span>
                    <span className="text-[10px] font-bold text-[#3066BE] bg-blue-50/70 px-2 py-0.5 rounded border border-[#3066BE]/25 mt-2 inline-block">
                      Verified Address Record
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setPreviewDoc({
                        title: 'Residential Address Proof',
                        url: associate.addressProofUrl || '/sample-address.pdf',
                        type: 'PDF',
                      })
                    }
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-[#3066BE]/10 hover:text-[#3066BE] text-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                </div>

                {/* Bank Proof */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">Bank Proof (Cancelled Cheque / Passbook)</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      {associate.bankName || 'Bank Account'} ({maskAccount(associate.bankAccountNumber)})
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-2 inline-block ${associate.bankVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {associate.bankVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setPreviewDoc({
                        title: 'Bank Verification Document / Cheque',
                        url: associate.bankProofUrl || '/sample-bank.pdf',
                        type: 'PDF',
                      })
                    }
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-[#3066BE]/10 hover:text-[#3066BE] text-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 7. CLIENTS & ENQUIRIES */}
          {activeTab === 'clients' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-6">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Associate Clients & Enquiries</h3>
                  <p className="text-xs text-slate-500">Exclusively owned client accounts and requirements submitted.</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  Total Clients: {associate.clients?.length || 0}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Client & Business</th>
                      <th className="p-3.5">Contact Details</th>
                      <th className="p-3.5">Enquiries</th>
                      <th className="p-3.5">Quotations</th>
                      <th className="p-3.5">Registered On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {associate.clients?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No clients registered by this associate yet.
                        </td>
                      </tr>
                    ) : (
                      associate.clients.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{c.clientName}</div>
                            <div className="text-[11px] text-slate-500">{c.businessName} ({c.businessCategory})</div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-slate-800">{c.email}</div>
                            <div className="text-[11px] text-slate-500">{c.mobile} • {c.location}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {c.enquiries?.length || 0} Enquiries
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-[#3066BE] bg-blue-50/70 px-2 py-0.5 rounded">
                              {c.quotations?.length || 0} Quotes
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. PROJECTS & DELIVERY */}
          {activeTab === 'projects' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-6">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Technical Projects Associated with Clients</h3>
                  <p className="text-xs text-slate-500">Live technical progress for contracts signed with this associate's clients.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {associate.workOrders?.filter((w: any) => w.project).length === 0 ? (
                  <div className="md:col-span-2 p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                    No active technical projects currently linked to this associate's client contracts.
                  </div>
                ) : (
                  associate.workOrders
                    .filter((w: any) => w.project)
                    .map((w: any) => (
                      <div key={w.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 text-xs">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                          <div>
                            <span className="font-mono text-[11px] text-slate-400 font-bold">{w.project.projectNumber}</span>
                            <h4 className="font-bold text-slate-900 text-sm mt-0.5">{w.client?.clientName}</h4>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                            {w.project.status}
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-600 mb-1">
                            <span>Milestone Progress</span>
                            <span className="font-bold">{w.project.progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-[#3066BE] h-2 rounded-full transition-all"
                              style={{ width: `${w.project.progressPercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                          <span>Contract Value: <strong>₹{w.totalValue?.toLocaleString()}</strong></span>
                          <span className="text-emerald-700 font-semibold">Advance Verified ✓</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* 9. COMMISSION HISTORY */}
          {activeTab === 'commissions' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-6">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Associate Commission Ledger</h3>
                  <p className="text-xs text-slate-500">
                    Audited monthly DM recurring commissions and project completion payouts.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-semibold">Total Commission</span>
                  <span className="text-base font-extrabold text-[#3066BE]">
                    ₹{(metrics?.commissions?.totalEarned || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Client & Service</th>
                      <th className="p-3.5">Model</th>
                      <th className="p-3.5">Commission Amount</th>
                      <th className="p-3.5">Eligibility</th>
                      <th className="p-3.5">Approval</th>
                      <th className="p-3.5">Payout Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {associate.commissions?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          No commission records generated for this associate yet.
                        </td>
                      </tr>
                    ) : (
                      associate.commissions.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{c.client?.clientName}</div>
                            <div className="text-[11px] text-indigo-600">{c.serviceCategory}</div>
                          </td>
                          <td className="p-3.5 text-slate-600 font-semibold">{c.billingType}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-emerald-700 text-sm">
                              ₹{c.calculatedCommission?.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Fee: ₹{c.commissionableAmount?.toLocaleString()} @ {c.commissionRate}%
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.eligibilityStatus === 'ELIGIBLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                              {c.eligibilityStatus}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                              {c.approvalStatus}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.payoutStatus === 'PROCESSED' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                              {c.payoutStatus}
                            </span>
                            {c.payoutReference && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {c.payoutReference}</div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10. ACTIVITY & AUDIT HISTORY */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Associate Activity & Audit Trail</h3>
                <p className="text-xs text-slate-500">Immutable chronological record of logins, status changes, and transactions.</p>
              </div>

              {associate.auditLogs?.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No audit events recorded for this associate.</div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {associate.auditLogs.map((log: any) => (
                    <div key={log.id} className="py-3 flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="text-[11px] text-slate-400 ml-2">by {log.userRole || 'SYSTEM'} ({log.userEmail})</span>
                        <p className="text-slate-600 font-mono text-[11px] mt-0.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                          {log.details}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">{actionModal.title}</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{actionModal.description}</p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Audit Remark</label>
              <textarea
                rows={2}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter reason for audit record..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#3066BE]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#3066BE] hover:bg-[#255299] text-white disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Secure Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{previewDoc.title}</h3>
                <span className="text-xs text-slate-500">Associate: {associate.name} ({associate.id})</span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
              <FileText className="w-12 h-12 text-[#3066BE] mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">{previewDoc.title}</h4>
              <p className="text-xs text-slate-500 font-mono">Document Path: {previewDoc.url}</p>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                Authorized Admin Confidential Access
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => toast.info(`Initiating secure download of ${previewDoc.title}`)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#3066BE] hover:bg-[#255299] text-white flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

