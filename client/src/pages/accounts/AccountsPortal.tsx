import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { apiRequest } from '../../utils/api';
import { SkeletonStatsRow, SkeletonTable } from '../../components/Skeleton';

export const AccountsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quotation-requests' | 'work-orders' | 'payments' | 'commissions'>('dashboard');

  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
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
    paymentMethod: 'BANK_TRANSFER',
    transactionReference: '',
    paymentDate: new Date().toISOString().slice(0, 10),
  });

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

    try {
      await apiRequest(`/api/accounts/quotations/${prepModal.quotation.id}/prepare`, {
        method: 'POST',
        body: JSON.stringify(quoteForm),
      });

      alert('Official quotation prepared and dispatched to the BGA.');
      setPrepModal(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Record Client Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;

    try {
      await apiRequest(`/api/accounts/work-orders/${paymentModal.workOrder.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentForm),
      });

      alert('Payment recorded. Now please verify the actual bank receipt.');
      setPaymentModal(null);
      setPaymentForm({
        paymentType: 'ADVANCE',
        amount: '',
        adBudgetAmount: '0',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: '',
        paymentDate: new Date().toISOString().slice(0, 10),
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Verify Payment (CRITICAL HANDOVER TRIGGER)
  const handleVerifyPayment = async (paymentId: string, action: 'VERIFY' | 'REJECT') => {
    const notes = prompt(`Enter verification audit notes for this ${action}:`) || 'Bank statement checked & verified';
    try {
      const res = await apiRequest(`/api/accounts/payments/${paymentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ action, verificationNotes: notes }),
      });
      alert(res.message);
      loadData();
    } catch (err: any) {
      alert(err.message);
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
                activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('quotation-requests')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'quotation-requests' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-4 h-4" />
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
                activeTab === 'work-orders' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Accepted Work Orders</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'payments' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
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
                activeTab === 'commissions' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Commission Engine</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Accounts Clearance: <span className="text-blue-400 font-bold">AUTHORIZED</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            !stats ? (
              <SkeletonStatsRow count={4} />
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
          {activeTab === 'quotation-requests' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Quotation Requests & Drafts</h2>
                <p className="text-xs text-slate-500">
                  Prepare official quotations requested by BGAs, including taxes, discounts, and advance payment requirements.
                </p>
              </div>

              <div className="space-y-3">
                {quotationRequests.map((q) => (
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
                          Client: <strong>{q.client?.clientName}</strong> ({q.client?.businessName}) • BGA: <strong>{q.bga?.name}</strong>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          q.status === 'REQUESTED'
                            ? 'bg-amber-100 text-amber-800'
                            : q.status === 'REVISION_REQUESTED'
                            ? 'bg-red-100 text-red-800'
                            : q.status === 'SENT_TO_BGA'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {q.status}
                        </span>
                        <a
                          href={`/api/resources/quotations/${q.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded text-xs font-bold flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </div>
                    </div>

                    <div className="py-3 text-xs text-slate-700 space-y-1">
                      <div>
                        <strong>Service Category:</strong> {q.serviceCategory}
                      </div>
                      <div>
                        <strong>Service Scope:</strong> {q.serviceScope}
                      </div>
                      {q.revisionNotes && (
                        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                          <strong>BGA Revision Feedback:</strong> {q.revisionNotes}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">
                        Total Value: ₹{q.totalAmount?.toLocaleString()} (Advance: ₹{q.advanceRequiredAmount?.toLocaleString()})
                      </span>

                      {(q.status === 'REQUESTED' || q.status === 'REVISION_REQUESTED') && (
                        <button
                          onClick={() => openPrepModal(q)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" /> {q.status === 'REVISION_REQUESTED' ? 'Draft Revised Quotation' : 'Prepare Official Quotation'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Prepare Quotation Modal */}
              {prepModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-base font-bold text-slate-900">
                      Prepare Official Quotation: {prepModal.quotation.quotationNumber}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Client: {prepModal.quotation.client?.clientName} ({prepModal.quotation.serviceCategory})
                    </p>

                    <form onSubmit={handlePrepareQuotation} className="mt-4 space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Approved Service Scope Description *</label>
                        <textarea
                          rows={3}
                          required
                          value={quoteForm.serviceScope}
                          onChange={(e) => setQuoteForm({ ...quoteForm, serviceScope: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Service Fee (₹) *</label>
                          <input
                            type="number"
                            required
                            value={quoteForm.serviceFee}
                            onChange={(e) => setQuoteForm({ ...quoteForm, serviceFee: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded font-semibold"
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
                            className="w-full p-2 border border-slate-300 rounded"
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
                            className="w-full p-2 border border-slate-300 rounded"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">GST Rate (%)</label>
                          <input
                            type="number"
                            value={quoteForm.taxRate}
                            onChange={(e) => setQuoteForm({ ...quoteForm, taxRate: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Advance Required (%)</label>
                          <input
                            type="number"
                            value={quoteForm.advanceRequiredPercent}
                            onChange={(e) => setQuoteForm({ ...quoteForm, advanceRequiredPercent: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded font-semibold text-emerald-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Commercial Payment Terms</label>
                        <textarea
                          rows={2}
                          value={quoteForm.paymentTerms}
                          onChange={(e) => setQuoteForm({ ...quoteForm, paymentTerms: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>

                      <div className="pt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPrepModal(null)}
                          className="px-3 py-1.5 rounded text-slate-600 font-semibold hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                        >
                          Generate & Dispatch Quotation
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
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
              {paymentModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                    <h3 className="text-base font-bold text-slate-900">
                      Record Client Payment ({paymentModal.workOrder.workOrderNumber})
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Client: {paymentModal.workOrder.client?.clientName}
                    </p>

                    <form onSubmit={handleRecordPayment} className="mt-4 space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Payment Type</label>
                        <select
                          value={paymentForm.paymentType}
                          onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded"
                        >
                          <option value="ADVANCE">Advance Payment</option>
                          <option value="INTERIM">Interim Milestone</option>
                          <option value="FINAL">Final Settlement</option>
                          <option value="MONTHLY_RECURRING">Monthly Subscription (DM)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Gross Payment Amount Received (₹) *</label>
                        <input
                          type="number"
                          required
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded font-semibold text-sm"
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
                            className="w-full p-2 border border-slate-300 rounded"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
                        <select
                          value={paymentForm.paymentMethod}
                          onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded"
                        >
                          <option value="NEFT">NEFT Bank Transfer</option>
                          <option value="RTGS">RTGS Bank Transfer</option>
                          <option value="IMPS">IMPS Immediate Transfer</option>
                          <option value="UPI">UPI / QR Code</option>
                          <option value="CHEQUE">Cheque Clearance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Bank Transaction / UTR Reference *</label>
                        <input
                          type="text"
                          required
                          value={paymentForm.transactionReference}
                          onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                          placeholder="e.g. UTR123456789012"
                          className="w-full p-2 border border-slate-300 rounded font-mono"
                        />
                      </div>

                      <div className="pt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentModal(null)}
                          className="px-3 py-1.5 rounded text-slate-600 font-semibold hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                        >
                          Save Payment Record
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PAYMENT VERIFICATION */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Payment Verification Ledger</h2>
                <p className="text-xs text-slate-500">
                  Verify actual bank credit. Advance verification triggers technical handover; final verification triggers commission eligibility.
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
                              onClick={() => handleVerifyPayment(p.id, 'VERIFY')}
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

