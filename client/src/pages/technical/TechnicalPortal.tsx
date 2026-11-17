import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  MessageSquare,
  Sparkles,
  Play,
  CheckSquare,
  Plus,
  X,
  RefreshCw,
  ExternalLink,
  Send,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { apiRequest } from '../../utils/api';
import { SkeletonStatsRow, SkeletonTable, TechnicalDashboardSkeleton } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ModalPortal';

export const TechnicalPortal: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  // New Milestone Modal
  const [milestoneModal, setMilestoneModal] = useState<boolean>(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');

  // New Deliverable Modal
  const [deliverableModal, setDeliverableModal] = useState<boolean>(false);
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableDesc, setDeliverableDesc] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableVersion, setDeliverableVersion] = useState('1.0');
  const [deliverableMilestoneId, setDeliverableMilestoneId] = useState('');

  // Correction Request & Three-Way Communication Modal
  const [feedbackModal, setFeedbackModal] = useState<boolean>(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackVisibility, setFeedbackVisibility] = useState<'CLIENT_VISIBLE' | 'INTERNAL'>('CLIENT_VISIBLE');
  const [feedbackMilestoneId, setFeedbackMilestoneId] = useState('');

  const loadStats = async (bypass = false) => {
    try {
      const s = await apiRequest('/api/technical/dashboard-stats', { bypassCache: bypass });
      setStats(s);
    } catch (e) {
      console.error('Failed to load technical stats:', e);
    }
  };

  const loadProjects = async (bypass = false) => {
    setTabLoading(true);
    try {
      const p = await apiRequest('/api/technical/projects', { bypassCache: bypass });
      const projectList = p.projects || [];
      setProjects(projectList);
      
      // Use functional state updater to eliminate stale closure bugs
      setSelectedProject((prev: any) => {
        if (!prev) return null;
        const refreshed = projectList.find((x: any) => x.id === prev.id);
        return refreshed ? { ...prev, ...refreshed } : prev;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setTabLoading(false);
    }
  };

  const loadData = async (bypass = false) => {
    setLoading(true);
    try {
      await Promise.all([loadStats(bypass), loadProjects(bypass)]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadProjects();
  }, []);

  // Handle Project Status Update
  const handleUpdateStatus = async (projectId: string, newStatus: string, progress?: number) => {
    // 1. Instant optimistic update so the user sees the new percentage and status immediately
    if (progress !== undefined) {
      setSelectedProject((prev: any) => {
        if (!prev || prev.id !== projectId) return prev;
        return { ...prev, status: newStatus, progressPercentage: progress };
      });
      setProjects((prev: any[]) =>
        prev.map((proj: any) =>
          proj.id === projectId
            ? { ...proj, status: newStatus, progressPercentage: progress }
            : proj
        )
      );
    }

    try {
      const res = await apiRequest(`/api/technical/projects/${projectId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, progressPercentage: progress }),
      });
      toast.success(res.message || 'Project status updated successfully.');
      
      // Update with server confirmed data
      if (res.project) {
        setSelectedProject((prev: any) => {
          if (!prev || prev.id !== projectId) return prev;
          return { ...prev, ...res.project };
        });
      }

      await loadData(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update project status');
      await loadData(true);
    }
  };

  // Handle Add Milestone
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !milestoneTitle) return;

    try {
      await apiRequest(`/api/technical/projects/${selectedProject.id}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ title: milestoneTitle, description: milestoneDesc }),
      });
      toast.success('Milestone added successfully.');
      setMilestoneModal(false);
      setMilestoneTitle('');
      setMilestoneDesc('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add milestone');
    }
  };

  // Handle Milestone Status - Auto-recalculates project progress percentage
  const handleMilestoneStatus = async (milestoneId: string, status: string) => {
    try {
      const res = await apiRequest(`/api/technical/milestones/${milestoneId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      const newProgress = res.progressPercentage !== undefined ? res.progressPercentage : null;
      toast.success(
        newProgress !== null
          ? `Milestone marked as ${status.toLowerCase()}. Progress updated to ${newProgress}%.`
          : `Milestone marked as ${status.toLowerCase()}.`
      );

      // Instant optimistic update with recalculated progress
      if (newProgress !== null) {
        setSelectedProject((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            progressPercentage: newProgress,
            status: res.projectStatus || prev.status,
            milestones: prev.milestones?.map((m: any) =>
              m.id === milestoneId ? { ...m, status } : m
            ),
          };
        });
        setProjects((prev: any[]) =>
          prev.map((p: any) =>
            p.id === selectedProject?.id
              ? { ...p, progressPercentage: newProgress, status: res.projectStatus || p.status }
              : p
          )
        );
      }
      loadData(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update milestone status');
    }
  };

  // Handle Add Deliverable (With Milestone Link & BGA Review Notification)
  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !deliverableTitle) return;

    try {
      await apiRequest(`/api/technical/projects/${selectedProject.id}/deliverables`, {
        method: 'POST',
        body: JSON.stringify({
          title: deliverableTitle,
          description: deliverableDesc || undefined,
          fileUrl: deliverableUrl || 'https://deliverables.bga.com/release-v1.zip',
          version: deliverableVersion,
          milestoneId: deliverableMilestoneId || undefined,
        }),
      });
      toast.success('Deliverable uploaded & submitted to BGA for client sharing review.');
      setDeliverableModal(false);
      setDeliverableTitle('');
      setDeliverableDesc('');
      setDeliverableUrl('');
      setDeliverableVersion('1.0');
      setDeliverableMilestoneId('');
      loadData(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add deliverable');
    }
  };

  // Handle Add Feedback / Technical Reply in Three-Way Thread
  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !feedbackContent) return;

    try {
      await apiRequest(`/api/technical/projects/${selectedProject.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          content: feedbackContent,
          feedbackType: feedbackVisibility === 'INTERNAL' ? 'INTERNAL_NOTE' : 'TECHNICAL_RESPONSE',
          messageType: 'TECHNICAL_REPLY',
          visibility: feedbackVisibility,
          milestoneId: feedbackMilestoneId || undefined,
        }),
      });
      toast.success('Response posted to project communication thread.');
      setFeedbackModal(false);
      setFeedbackContent('');
      setFeedbackMilestoneId('');
      loadData(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit feedback');
    }
  };

  // Resolve Feedback
  const handleResolveFeedback = async (feedbackId: string) => {
    try {
      await apiRequest(`/api/technical/feedback/${feedbackId}/resolve`, {
        method: 'PUT',
      });
      toast.success('Feedback marked as resolved.');
      loadData(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to resolve feedback');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <PortalHeader title="Technical Portal" subtitle="Engineering Architecture, Milestone Delivery & Handover" />

      <div className="flex-1 flex flex-col md:flex-row relative min-h-0">
        {/* Sidebar Nav (Sticky, fixed in viewport, independent internal scrolling) */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-4 shrink-0 md:sticky md:top-[var(--portal-header-height,68px)] md:h-[calc(100vh-var(--portal-header-height,68px))] flex flex-col justify-between z-30">
          <div className="space-y-1 overflow-y-auto flex-1 pr-1 -mr-1 sidebar-scrollbar">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
              Engineering Workspace
            </div>

            <button
              onClick={() => { setActiveTab('dashboard'); setSelectedProject(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#80DED9]" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'projects' ? 'bg-[#3066BE] text-white font-bold shadow-md shadow-[#3066BE]/25' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#80DED9]" />
                <span>Assigned Projects</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-bold">
                {projects.length}
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 shrink-0">
            Privacy Scope: <span className="text-[#80DED9] font-bold">FINANCIAL DATA ISOLATED</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="w-full flex-1 min-w-0 p-6 md:p-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            !stats ? (
              <TechnicalDashboardSkeleton />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Total Projects</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Ready to Start</span>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{stats.readyToStart}</div>
                  <span className="text-[11px] text-slate-400">Handover Authorized</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">In Progress</span>
                  <div className="text-2xl font-bold text-amber-600 mt-1">{stats.inProgress}</div>
                  <span className="text-[11px] text-slate-400">Active Sprints</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Correction Required</span>
                  <div className="text-2xl font-bold text-red-600 mt-1">{stats.correctionRequired}</div>
                  <span className="text-[11px] text-slate-400">Client Feedback</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Completed & Handed Over</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</div>
                  <span className="text-[11px] text-slate-400">Final Delivered</span>
                </div>
              </div>

              {/* Technical Privacy Notice */}
              <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <h3 className="font-bold text-sm mb-1">Technical Department Security Boundary</h3>
                <p className="leading-relaxed">
                  As per company role security guidelines, the Technical Department views strictly technical requirements,
                  approved scopes, and milestones. Sensitive BGA commissions, personal banking data, and unrelated accounts
                  records are isolated and restricted from technical view.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setActiveTab('projects')}
                  className="px-4 py-2 bg-[#3066BE] hover:bg-[#255299] text-white rounded-lg text-xs font-bold transition-colors"
                >
                  View Active Projects →
                </button>
              </div>
            </div>
            )
          )}

          {/* TAB 2: ASSIGNED PROJECTS & PROJECT DETAILS */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              {!selectedProject ? (
                <>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">Active Technical Projects</h2>
                    <p className="text-xs text-slate-500">
                      Projects authorized for execution following advance payment verification and Admin technical handover approval. Click any project to open execution workspace.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-500">{p.projectNumber}</span>
                              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{p.client?.clientName}</h3>
                              <span className="text-xs text-amber-700 font-semibold">{p.serviceCategory}</span>
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'IN_PROGRESS'
                                ? 'bg-amber-100 text-amber-800'
                                : p.status === 'CORRECTION_REQUIRED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {p.status}
                            </span>
                          </div>

                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                              <span>Completion Progress</span>
                              <span className="font-bold">{p.progressPercentage}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div
                                className="bg-amber-600 h-2 rounded-full transition-all"
                                style={{ width: `${p.progressPercentage}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                            <strong>Approved Scope:</strong> {p.approvedScope}
                          </div>
                          {p.workOrder?.bga && (
                            <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                              <span>BGA: <strong className="text-slate-700">{p.workOrder.bga.name}</strong></span>
                              <span className="text-emerald-700 font-semibold">✓ Handover Authorized</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                          <span>{p.milestones?.length || 0} Milestones • {p.deliverables?.length || 0} Deliverables</span>
                          <span className="font-bold text-amber-700">Open Workspace →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Selected Project Detail Workspace */
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <button
                          onClick={() => setSelectedProject(null)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-semibold mb-1 block"
                        >
                          ← Back to Projects List
                        </button>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-900">{selectedProject.client?.clientName}</h2>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                            {selectedProject.projectNumber}
                          </span>
                        </div>
                        <span className="text-xs text-amber-700 font-bold">{selectedProject.serviceCategory}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedProject.status === 'READY_TO_START' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedProject.id, 'IN_PROGRESS', 15)}
                            className="px-4 py-2 bg-[#3066BE] hover:bg-[#255299] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <Play className="w-4 h-4" /> Start Project Execution
                          </button>
                        )}

                        {selectedProject.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedProject.id, 'UNDER_REVIEW', 90)}
                            className="px-3 py-1.5 bg-[#119DA4] hover:bg-[#0e8389] text-white rounded-lg text-xs font-bold"
                          >
                            Submit for Client Review
                          </button>
                        )}

                        {selectedProject.status === 'UNDER_REVIEW' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedProject.id, 'COMPLETED', 100)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Mark Project Completed ✓
                          </button>
                        )}

                        {selectedProject.status === 'CORRECTION_REQUIRED' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedProject.id, 'UNDER_REVIEW', 95)}
                            className="px-4 py-2 bg-[#3066BE] hover:bg-[#255299] text-white rounded-lg text-xs font-bold"
                          >
                            Re-submit After Corrections
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2">
                        <strong className="block text-slate-800 mb-1">Approved Requirements & Scope:</strong>
                        <p className="text-slate-600 leading-relaxed">{selectedProject.approvedScope}</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <strong className="block text-slate-800 mb-1">Handover & Assignment:</strong>
                        <div className="text-slate-700">WO: <span className="font-mono font-bold text-slate-900">{selectedProject.workOrder?.workOrderNumber || 'N/A'}</span></div>
                        <div className="text-slate-700 mt-1">BGA: <span className="font-bold text-slate-900">{selectedProject.workOrder?.bga?.name || 'N/A'}</span></div>
                        <div className="text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Handover Authorized
                        </div>
                        {selectedProject.workOrder?.handoverApprovedAt && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Auth Date: {new Date(selectedProject.workOrder.handoverApprovedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <strong className="block text-slate-800 mb-1">Execution Status:</strong>
                          <div className="flex items-center justify-between">
                            <span className="text-amber-800 font-bold uppercase">{selectedProject.status}</span>
                            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {selectedProject.progressPercentage || 0}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5">
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, selectedProject.progressPercentage || 0))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Milestones Section */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-sm">Project Milestones</h3>
                      <button
                        onClick={() => setMilestoneModal(true)}
                        className="px-3 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Milestone
                      </button>
                    </div>

                    <div className="space-y-2">
                      {selectedProject.milestones?.map((m: any) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{m.title}</span>
                            {m.description && <p className="text-slate-500 text-[11px]">{m.description}</p>}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.status === 'IN_PROGRESS'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {m.status}
                            </span>

                            {m.status !== 'COMPLETED' ? (
                              <button
                                onClick={() => handleMilestoneStatus(m.id, 'COMPLETED')}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700"
                              >
                                Mark Done ✓
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMilestoneStatus(m.id, 'IN_PROGRESS')}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] hover:bg-slate-300"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deliverables Section */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-sm">Deliverables & Releases</h3>
                      <button
                        onClick={() => setDeliverableModal(true)}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload / Register Deliverable
                      </button>
                    </div>

                    <div className="space-y-2">
                      {selectedProject.deliverables?.length === 0 ? (
                        <div className="text-xs text-slate-400 py-3 text-center">No deliverables recorded yet.</div>
                      ) : (
                        selectedProject.deliverables?.map((d: any) => (
                          <div
                            key={d.id}
                            className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex justify-between items-center text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{d.title}</span>
                              <span className="text-[10px] text-slate-400 ml-2">v{d.version}</span>
                              <div className="text-slate-500 font-mono text-[11px]">{d.fileUrl}</div>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(d.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Correction Requests & Feedback */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-sm">Client Feedback & Corrections</h3>
                      <button
                        onClick={() => setFeedbackModal(true)}
                        className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-bold flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Log Correction Request
                      </button>
                    </div>

                    <div className="space-y-2">
                      {selectedProject.feedback?.length === 0 ? (
                        <div className="text-xs text-slate-400 py-3 text-center">No correction requests logged.</div>
                      ) : (
                        selectedProject.feedback?.map((f: any) => (
                          <div
                            key={f.id}
                            className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex justify-between items-start text-xs"
                          >
                            <div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                f.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {f.status}
                              </span>
                              <p className="text-slate-700 mt-1.5">{f.content}</p>
                            </div>

                            {f.status !== 'RESOLVED' && (
                              <button
                                onClick={() => handleResolveFeedback(f.id)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700 shrink-0 ml-4"
                              >
                                Mark Resolved ✓
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Add Milestone Modal */}
              <ModalPortal
                isOpen={milestoneModal}
                onClose={() => setMilestoneModal(false)}
              >
                {milestoneModal && (
                  <div
                    className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-base font-bold text-slate-900">Add Project Milestone</h3>
                    <form onSubmit={handleAddMilestone} className="mt-4 space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Milestone Title *</label>
                        <input
                          type="text"
                          required
                          value={milestoneTitle}
                          onChange={(e) => setMilestoneTitle(e.target.value)}
                          placeholder="e.g. Backend API Architecture & DB push"
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={milestoneDesc}
                          onChange={(e) => setMilestoneDesc(e.target.value)}
                          placeholder="Details of deliverables for this milestone..."
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setMilestoneModal(false)}
                          className="px-3 py-1.5 rounded text-slate-600 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-[#3066BE] text-white shadow-sm rounded font-bold hover:bg-amber-700"
                        >
                          Add Milestone
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </ModalPortal>

              {/* Add Deliverable Modal */}
              <ModalPortal
                isOpen={deliverableModal}
                onClose={() => setDeliverableModal(false)}
              >
                {deliverableModal && (
                  <div
                    className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-base font-bold text-slate-900">Register Deliverable</h3>
                    <form onSubmit={handleAddDeliverable} className="mt-4 space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Deliverable Title *</label>
                        <input
                          type="text"
                          required
                          value={deliverableTitle}
                          onChange={(e) => setDeliverableTitle(e.target.value)}
                          placeholder="e.g. Production Release Artifacts"
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Download / Staging Link</label>
                        <input
                          type="text"
                          value={deliverableUrl}
                          onChange={(e) => setDeliverableUrl(e.target.value)}
                          placeholder="https://client-staging.bga.com or zip URL"
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Version</label>
                        <input
                          type="text"
                          value={deliverableVersion}
                          onChange={(e) => setDeliverableVersion(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setDeliverableModal(false)}
                          className="px-3 py-1.5 rounded text-slate-600 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                        >
                          Save Deliverable
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </ModalPortal>

              {/* Feedback Modal */}
              <ModalPortal
                isOpen={feedbackModal}
                onClose={() => setFeedbackModal(false)}
              >
                {feedbackModal && (
                  <div
                    className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-base font-bold text-slate-900">Log Correction Request</h3>
                    <form onSubmit={handleAddFeedback} className="mt-4 space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Feedback / Defect Details *</label>
                        <textarea
                          rows={3}
                          required
                          value={feedbackContent}
                          onChange={(e) => setFeedbackContent(e.target.value)}
                          placeholder="Describe the requested correction from the client or QA..."
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setFeedbackModal(false)}
                          className="px-3 py-1.5 rounded text-slate-600 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-red-600 text-white rounded font-bold hover:bg-red-700"
                        >
                          Submit Correction
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </ModalPortal>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

