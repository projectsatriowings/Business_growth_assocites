import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Percent,
  CheckCircle2,
  Clock,
  History,
  Building2,
  Briefcase,
  AlertCircle,
  X,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Edit3,
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { ModalPortal } from './ModalPortal';
import { DatePicker } from './DatePicker';

export const CommissionSettingsPanel: React.FC = () => {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'CLIENT' | 'PROJECT'>('ALL');

  // New Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configLevel, setConfigLevel] = useState<'CLIENT' | 'PROJECT'>('CLIENT');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [percentageInput, setPercentageInput] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Edit Rate Modal State (Requires Mandatory Reason)
  const [editingConfig, setEditingConfig] = useState<any | null>(null);
  const [editRateInput, setEditRateInput] = useState('');
  const [editReasonInput, setEditReasonInput] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Audit History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedConfigHistory, setSelectedConfigHistory] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configsRes, clientsRes, projectsRes, historyRes] = await Promise.all([
        apiRequest('/api/admin/commission-configs'),
        apiRequest('/api/admin/clients'),
        apiRequest('/api/technical/projects'),
        apiRequest('/api/admin/commission-configs/history'),
      ]);

      setConfigs(configsRes.configs || []);
      setClients(clientsRes.clients || []);
      setProjects(projectsRes.projects || []);
      setHistoryList(historyRes.history || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load commission settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Please select a client');
      return;
    }

    const pct = parseFloat(percentageInput);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      toast.error('Please enter a valid percentage between 0.1% and 100%');
      return;
    }

    setModalSubmitting(true);
    try {
      await apiRequest('/api/admin/commission-configs', {
        method: 'POST',
        body: JSON.stringify({
          clientId: selectedClientId,
          projectId: configLevel === 'PROJECT' ? selectedProjectId || undefined : undefined,
          commissionPercentage: pct,
          effectiveDate: effectiveDate || undefined,
          expiryDate: expiryDate || undefined,
          internalNotes: internalNotes.trim() || undefined,
        }),
      });

      toast.success(
        configLevel === 'PROJECT'
          ? 'Project-level commission rate override established successfully!'
          : 'Client-level default commission rate saved successfully!'
      );
      setShowConfigModal(false);
      resetModal();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save commission configuration');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleSaveEditRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    if (!editReasonInput.trim()) {
      toast.error('A mandatory reason is required to modify an established commission rate.');
      return;
    }

    const pct = parseFloat(editRateInput);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      toast.error('Please enter a valid percentage between 0.1% and 100%');
      return;
    }

    setEditSubmitting(true);
    try {
      await apiRequest(`/api/admin/commission-configs/${editingConfig.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          commissionPercentage: pct,
          reason: editReasonInput.trim(),
        }),
      });

      toast.success(`Commission rate updated to ${pct}% and audit logged.`);
      setEditingConfig(null);
      setEditRateInput('');
      setEditReasonInput('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update commission rate');
    } finally {
      setEditSubmitting(false);
    }
  };

  const resetModal = () => {
    setConfigLevel('CLIENT');
    setSelectedClientId('');
    setSelectedProjectId('');
    setPercentageInput('');
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setExpiryDate('');
    setInternalNotes('');
  };

  // Filter projects for currently selected client in modal
  const clientProjects = selectedClientId
    ? projects.filter((p) => p.clientId === selectedClientId)
    : [];

  const filteredConfigs = configs.filter((c) => {
    const matchesSearch =
      (c.client?.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.client?.businessName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.project?.projectNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.bga?.name || '').toLowerCase().includes(search.toLowerCase());

    const isProj = !!c.projectId;
    if (levelFilter === 'CLIENT') return matchesSearch && !isProj;
    if (levelFilter === 'PROJECT') return matchesSearch && isProj;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Admin Commission Configuration</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure dynamic commission rates per client and per project. Project overrides take strict precedence over client default rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedConfigHistory(null);
              setShowHistoryModal(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Rate Audit History</span>
          </button>
          <button
            onClick={() => {
              resetModal();
              setShowConfigModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#3066BE] hover:bg-[#204482] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Configure Commission Rate</span>
          </button>
        </div>
      </div>

      {/* Hierarchy Precedence Explainer Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
            Priority 1 (Highest)
          </span>
          <h4 className="font-bold text-slate-900">Project-Specific Override</h4>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Specific rate assigned to an individual technical project. Takes priority over client-level default.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
            Priority 2 (Default)
          </span>
          <h4 className="font-bold text-slate-900">Client-Level Default</h4>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Default rate configured for a specific client. Automatically applies to all projects for this client unless overridden.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Priority 3 (Fallback)
          </span>
          <h4 className="font-bold text-slate-900">System Category Baseline</h4>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Configured baseline range managed by Admin per service category.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by client, project #, or associate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3066BE]/20 focus:border-[#3066BE]"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500 font-medium">Filter Level:</span>
          {(['ALL', 'CLIENT', 'PROJECT'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                levelFilter === lvl
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl === 'ALL' ? 'All Configs' : lvl === 'CLIENT' ? 'Client Defaults' : 'Project Overrides'}
            </button>
          ))}
        </div>
      </div>

      {/* Configs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading commission configurations...</div>
        ) : filteredConfigs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <SlidersHorizontal className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Commission Configurations Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Configure client-specific or project-specific rates to override global system defaults.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Level & Scope</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Project / Service</th>
                  <th className="py-3 px-4">Rate (%)</th>
                  <th className="py-3 px-4">Effective Timeline</th>
                  <th className="py-3 px-4">Audit History</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConfigs.map((cfg) => {
                  const isProjectLevel = !!cfg.projectId;

                  return (
                    <tr key={cfg.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isProjectLevel
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isProjectLevel ? 'PROJECT OVERRIDE' : 'CLIENT DEFAULT'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{cfg.client?.clientName}</div>
                        {cfg.client?.businessName && (
                          <div className="text-[11px] text-slate-400">{cfg.client.businessName}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isProjectLevel ? (
                          <div>
                            <span className="font-mono font-bold text-indigo-600 block">
                              {cfg.project?.projectNumber}
                            </span>
                            <span className="text-[11px] text-slate-500">{cfg.project?.serviceCategory}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">All Client Projects (Default)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                          {cfg.commissionPercentage}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-600">
                        <div>From: {new Date(cfg.effectiveDate).toLocaleDateString()}</div>
                        {cfg.expiryDate ? (
                          <div className="text-slate-400">Until: {new Date(cfg.expiryDate).toLocaleDateString()}</div>
                        ) : (
                          <span className="text-slate-400 italic">No expiry</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[11px]">
                        <button
                          onClick={() => {
                            setSelectedConfigHistory(cfg);
                            setShowHistoryModal(true);
                          }}
                          className="text-[#3066BE] hover:underline font-semibold flex items-center gap-1"
                        >
                          <History className="w-3 h-3" />
                          <span>{cfg.history?.length || 1} change(s)</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingConfig(cfg);
                            setEditRateInput(String(cfg.commissionPercentage));
                            setEditReasonInput('');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3 h-3 text-slate-600" />
                          Edit Rate
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

      {/* Modal 1: Configure New Commission Rate */}
      <ModalPortal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)}>
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Configure Commission Rate</h3>
              <p className="text-xs text-slate-500">Set client-level default or project-specific override</p>
            </div>
            <button
              onClick={() => setShowConfigModal(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            {/* Level Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Configuration Level</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfigLevel('CLIENT')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    configLevel === 'CLIENT'
                      ? 'border-[#3066BE] bg-blue-50/60 ring-2 ring-[#3066BE]/20 font-bold text-slate-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#3066BE] mb-1" />
                  <div>Client-Level Default</div>
                  <span className="text-[10px] text-slate-500 font-normal">Applies to all projects for client</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigLevel('PROJECT')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    configLevel === 'PROJECT'
                      ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20 font-bold text-slate-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-purple-600 mb-1" />
                  <div>Project-Level Override</div>
                  <span className="text-[10px] text-slate-500 font-normal">Overrides client default for 1 project</span>
                </button>
              </div>
            </div>

            {/* Client Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Client <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedProjectId('');
                }}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="">-- Choose Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName} {c.businessName ? `(${c.businessName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Selection (if project-level) */}
            {configLevel === 'PROJECT' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value="">-- Choose Project --</option>
                  {clientProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} — {p.serviceCategory} ({p.status})
                    </option>
                  ))}
                </select>
                {clientProjects.length === 0 && selectedClientId && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No active technical projects found for this client.
                  </p>
                )}
              </div>
            )}

            {/* Commission Percentage */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Commission Percentage (%) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  required
                  placeholder="e.g. 8.5"
                  value={percentageInput}
                  onChange={(e) => setPercentageInput(e.target.value)}
                  className="w-full p-2.5 pl-8 rounded-xl border border-slate-200 font-mono font-bold text-sm"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5" />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">Effective Date</label>
                <DatePicker
                  value={effectiveDate}
                  onChange={(val) => setEffectiveDate(val)}
                  placeholder="Select effective date"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">Expiry Date (Optional)</label>
                <DatePicker
                  value={expiryDate}
                  onChange={(val) => setExpiryDate(val)}
                  placeholder="Select expiry date"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Internal Reason / Notes</label>
              <textarea
                rows={2}
                placeholder="Explain the commercial justification or agreement terms for this rate..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalSubmitting || !selectedClientId || !percentageInput}
                className="px-5 py-2 rounded-xl bg-[#3066BE] hover:bg-[#204482] text-white font-bold transition-all disabled:opacity-50 shadow-sm"
              >
                {modalSubmitting ? 'Saving...' : 'Establish Rate Configuration'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* Modal 2: Edit Rate with Mandatory Reason */}
      <ModalPortal isOpen={!!editingConfig} onClose={() => setEditingConfig(null)}>
        {editingConfig && (
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Modify Commission Rate</h3>
                <p className="text-xs text-slate-500">
                  {editingConfig.client?.clientName} {editingConfig.project ? `(${editingConfig.project.projectNumber})` : ''}
                </p>
              </div>
              <button
                onClick={() => setEditingConfig(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRate} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed text-[11px]">
                <strong>Audit Protection:</strong> Existing approved or paid commissions are permanently locked and will not be retroactively modified. All changes are logged with your name and mandatory reason.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Current Commission Rate
                </label>
                <span className="font-mono text-base font-bold text-slate-800">
                  {editingConfig.commissionPercentage}%
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Commission Rate (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  required
                  placeholder="e.g. 10.0"
                  value={editRateInput}
                  onChange={(e) => setEditRateInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mandatory Reason for Change <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this commission rate is being altered (e.g. renegotiated terms, revised quotation scope)..."
                  value={editReasonInput}
                  onChange={(e) => setEditReasonInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || !editReasonInput.trim() || !editRateInput}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  {editSubmitting ? 'Updating...' : 'Log & Apply Rate Change'}
                </button>
              </div>
            </form>
          </div>
        )}
      </ModalPortal>

      {/* Modal 3: Audit History Drawer */}
      <ModalPortal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Commission Rate Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                {selectedConfigHistory
                  ? `History for ${selectedConfigHistory.client?.clientName}`
                  : 'Chronological log of all rate configurations and modifications'}
              </p>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {(selectedConfigHistory ? selectedConfigHistory.history || [] : historyList).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No rate change events recorded yet.</p>
            ) : (
              (selectedConfigHistory ? selectedConfigHistory.history || [] : historyList).map((h: any) => (
                <div key={h.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">
                      {h.client?.clientName || 'Client'} {h.project ? `(${h.project.projectNumber})` : ''}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono font-bold text-xs">
                    <span className="text-slate-500">
                      {h.previousRate !== null ? `${h.previousRate}%` : 'Baseline'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {h.newRate}%
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans font-normal ml-2">
                      Changed by: <strong>{h.changedByName || 'Admin'}</strong>
                    </span>
                  </div>

                  <p className="text-slate-700 text-[11px] bg-white p-2 rounded border border-slate-100 mt-1 italic">
                    "{h.reason}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};
