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
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Download,
} from 'lucide-react';
import { PortalHeader } from '../../components/PortalHeader';
import { apiRequest } from '../../utils/api';
import { SkeletonStatsRow, SkeletonTable, TechnicalDashboardSkeleton } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ModalPortal';
import { MediaUploader, MediaUploadResult } from '../../components/MediaUploader';

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
  const [deliverableFileType, setDeliverableFileType] = useState<string>('OTHER');
  const [deliverableFileName, setDeliverableFileName] = useState<string>('');
  const [deliverableFileSize, setDeliverableFileSize] = useState<number | undefined>(undefined);
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

  // Handle Add Deliverable (With Milestone Link, Media Upload & BGA Review Notification)
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
          fileType: deliverableFileType || undefined,
          fileSize: deliverableFileSize || undefined,
          version: deliverableVersion,
          milestoneId: deliverableMilestoneId || undefined,
        }),
      });
      toast.success('Deliverable uploaded & submitted to BGA for client sharing review.');
      setDeliverableModal(false);
      setDeliverableTitle('');
      setDeliverableDesc('');
      setDeliverableUrl('');
      setDeliverableFileType('OTHER');
      setDeliverableFileName('');
      setDeliverableFileSize(undefined);
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
      <PortalHeader title="Technical & IT Solutions Portal" subtitle="Software Engineering, Milestone Delivery & Handover" />

      <div className="flex-1 flex flex-col md:flex-row relative min-h-0">
        {/* Sidebar Nav (Sticky, fixed in viewport, independent internal scrolling) */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-4 shrink-0 md:sticky md:top-[var(--portal-header-height,68px)] md:h-[calc(100vh-var(--portal-header-height,68px))] flex flex-col justify-between z-30">
          <div className="space-y-1 overflow-y-auto flex-1 pr-1 -mr-1 sidebar-scrollbar">
            {/* Parent Company & Portal Brand Identity */}
            <div className="px-3 pt-1 pb-3 mb-2 border-b border-slate-800">
              <span className="text-[10px] tracking-wider uppercase text-[#80DED9] font-bold block">
                Atriowings Technologies
              </span>
              <span className="text-xs font-bold text-white block mt-0.5">
                Technical & IT Solutions
              </span>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
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

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 shrink-0 space-y-1">
            <div className="flex justify-between items-center">
              <span>Security Scope:</span>
              <span className="text-[#80DED9] font-bold">FINANCIAL DATA ISOLATED</span>
            </div>
            <div className="text-[9px] text-slate-500 text-center pt-1.5 border-t border-slate-800/60">
              © Atriowings Technologies
            </div>
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
                {/* Engineering Brand Welcome Banner */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Atriowings Technologies
                      </span>
                      <span className="text-xs text-slate-400 font-medium">• Software & IT Solutions Engineering</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1.5">
                      Welcome to Atriowings Technical & IT Solutions Portal
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Engineering Team • Milestone Execution, Deliverables & Client Feedback Revisions
                    </p>
                  </div>
                </div>
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

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
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
                    </div>
                  </div>

                  {/* Milestones Section */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Project Milestones</h3>
                        <p className="text-[11px] text-slate-500">Track execution phases and mark milestones complete to auto-advance project progress.</p>
                      </div>
                      <button
                        onClick={() => setMilestoneModal(true)}
                        className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Milestone
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(!selectedProject.milestones || selectedProject.milestones.length === 0) ? (
                        <div className="text-xs text-slate-400 py-3 text-center">No milestones added yet. Add milestones to track progressive completion.</div>
                      ) : (
                        selectedProject.milestones.map((m: any) => (
                          <div
                            key={m.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex justify-between items-center text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{m.title}</span>
                              {m.description && <p className="text-slate-500 text-[11px] mt-0.5">{m.description}</p>}
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

                              {m.status !== 'COMPLETED' && (
                                <button
                                  onClick={() => handleMilestoneStatus(m.id, 'COMPLETED')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  Mark Complete
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Deliverables Section */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Deliverables & Releases</h3>
                        <p className="text-[11px] text-slate-500">
                          Upload screenshots, demo videos, documentation, code archives, or release links. Assigned BGA reviews and shares with client.
                        </p>
                      </div>
                      <button
                        onClick={() => setDeliverableModal(true)}
                        className="px-3.5 py-1.5 bg-[#3066BE] hover:bg-[#255299] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload / Register Deliverable
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(!selectedProject.deliverables || selectedProject.deliverables.length === 0) ? (
                        <div className="text-xs text-slate-400 py-4 text-center">No deliverables recorded yet. Click above to register deliverables for client review.</div>
                      ) : (
                        selectedProject.deliverables.map((d: any) => {
                          const isImg = d.fileType === 'IMAGE' || (d.fileUrl && d.fileUrl.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i));
                          const isVid = d.fileType === 'VIDEO' || (d.fileUrl && (d.fileUrl.match(/\.(mp4|webm|mov)$/i) || d.fileUrl.includes('loom.com') || d.fileUrl.includes('youtube.com')));
                          const isAud = d.fileType === 'AUDIO' || (d.fileUrl && d.fileUrl.match(/\.(mp3|wav|m4a|ogg)$/i));
                          const isArch = d.fileType === 'ARCHIVE' || (d.fileUrl && d.fileUrl.match(/\.(zip|rar|tar|gz)$/i));

                          return (
                            <div
                              key={d.id}
                              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                {/* Visual Thumbnail or Media Type Badge */}
                                {isImg ? (
                                  <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-900 shrink-0 relative group">
                                    <img src={d.fileUrl} alt={d.title} className="w-full h-full object-cover" />
                                    <a
                                      href={d.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                      title="Click to view full image"
                                    >
                                      <Eye className="w-4 h-4 text-white" />
                                    </a>
                                  </div>
                                ) : (
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                                    isVid
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

                                <div className="space-y-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900">{d.title}</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">v{d.version}</span>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      isImg
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : isVid
                                        ? 'bg-rose-100 text-rose-800'
                                        : isAud
                                        ? 'bg-purple-100 text-purple-800'
                                        : isArch
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {d.fileType || (isImg ? 'IMAGE' : isVid ? 'VIDEO' : isAud ? 'AUDIO' : 'DOCUMENT')}
                                    </span>
                                  </div>
                                  {d.description && <p className="text-slate-600 text-[11px] leading-relaxed">{d.description}</p>}
                                  <div className="flex flex-wrap items-center gap-3 text-slate-500 font-mono text-[11px] pt-0.5">
                                    <a
                                      href={d.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 font-semibold"
                                    >
                                      {isImg ? (
                                        <>
                                          <Eye className="w-3 h-3" /> View Image Screenshot
                                        </>
                                      ) : isVid ? (
                                        <>
                                          <Play className="w-3 h-3" /> Play Video Demo
                                        </>
                                      ) : (
                                        <>
                                          <ExternalLink className="w-3 h-3" /> Access Deliverable Artifact
                                        </>
                                      )}
                                    </a>
                                    {d.fileSize && (
                                      <span className="text-slate-400">
                                        ({(d.fileSize / (1024 * 1024)).toFixed(1)} MB)
                                      </span>
                                    )}
                                    <span className="text-slate-400">Uploaded {new Date(d.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1.5 shrink-0 self-start md:self-center">
                                {d.status === 'SHARED_WITH_CLIENT' || d.isClientVisible ? (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Approved & Shared with Client
                                  </span>
                                ) : d.status === 'REVISION_REQUIRED' ? (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Changes Requested by BGA
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Pending BGA Review
                                  </span>
                                )}

                                {d.clientViewedAt && (
                                  <span className="text-[10px] text-teal-700 font-medium flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> Client Viewed: {new Date(d.clientViewedAt).toLocaleDateString()}
                                  </span>
                                )}

                                {d.bgaReviewNotes && (
                                  <span className="text-[10px] text-slate-600 italic max-w-xs text-right">
                                    BGA Note: {d.bgaReviewNotes}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Client Feedback (Logged by BGA) & Technical Team Responses */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Client Feedback & Engineering Responses</h3>
                        <p className="text-[11px] text-slate-500">
                          Review feedback and revision requests submitted by BGA on behalf of the client and reply with technical solutions.
                        </p>
                      </div>
                      <button
                        onClick={() => setFeedbackModal(true)}
                        className="px-3 py-1 bg-[#3066BE] hover:bg-[#255299] text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Post Technical Reply to BGA
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(!selectedProject.feedback || selectedProject.feedback.length === 0) ? (
                        <div className="text-xs text-slate-400 py-4 text-center">No feedback recorded yet. Client feedback submitted by BGA will appear here.</div>
                      ) : (
                        selectedProject.feedback.map((f: any) => {
                          const isBga = f.authorRole === 'BGA' || f.authorRole === 'BGA_REPRESENTATIVE';

                          return (
                            <div
                              key={f.id}
                              className={`p-3.5 rounded-xl border text-xs ${
                                isBga
                                  ? 'bg-blue-50/50 border-blue-200'
                                  : 'bg-indigo-50/50 border-indigo-200'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/60">
                                <div className="flex items-center gap-2">
                                  {isBga ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                      🗣️ CLIENT FEEDBACK (Logged by BGA: {f.authorName || 'Associate'})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                      🛠️ TECHNICAL TEAM RESPONSE ({f.authorName || 'Engineer'})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(f.createdAt).toLocaleString()}
                                  </span>
                                  {isBga && (
                                    <>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        f.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {f.status}
                                      </span>
                                      {f.status !== 'RESOLVED' && (
                                        <button
                                          onClick={() => handleResolveFeedback(f.id)}
                                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                        >
                                          Mark Resolved ✓
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              <p className="text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                                {f.content}
                              </p>
                            </div>
                          );
                        })
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
                    <p className="text-xs text-slate-500 mt-1">
                      Define a structured milestone to track engineering progress toward completion.
                    </p>
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
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setMilestoneModal(false)}
                          className="px-3 py-1.5 rounded text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-[#3066BE] text-white shadow-sm rounded font-bold hover:bg-[#255299] transition-colors"
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
                    className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-base font-bold text-slate-900">Register Project Deliverable</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Upload screenshots, video demo, audio walkthrough, or documents. Forwarded to BGA for review before client release.
                    </p>
                    <form onSubmit={handleAddDeliverable} className="mt-4 space-y-3.5 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Deliverable Title *</label>
                        <input
                          type="text"
                          required
                          value={deliverableTitle}
                          onChange={(e) => setDeliverableTitle(e.target.value)}
                          placeholder="e.g. Website Core Implementation v1"
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>

                      {selectedProject?.milestones && selectedProject.milestones.length > 0 && (
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Associated Milestone</label>
                          <select
                            value={deliverableMilestoneId}
                            onChange={(e) => setDeliverableMilestoneId(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800"
                          >
                            <option value="">-- General / No Milestone Attached --</option>
                            {selectedProject.milestones.map((m: any) => (
                              <option key={m.id} value={m.id}>
                                {m.title} ({m.status})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Direct Media Upload (Images, Video, Audio, Docs) or URL Toggle */}
                      <div>
                        <MediaUploader
                          value={deliverableUrl}
                          fileType={deliverableFileType}
                          fileName={deliverableFileName}
                          fileSize={deliverableFileSize}
                          onChange={(res) => {
                            if (res) {
                              setDeliverableUrl(res.url);
                              setDeliverableFileType(res.fileType);
                              setDeliverableFileName(res.originalName);
                              setDeliverableFileSize(res.size);
                            } else {
                              setDeliverableUrl('');
                              setDeliverableFileType('OTHER');
                              setDeliverableFileName('');
                              setDeliverableFileSize(undefined);
                            }
                          }}
                          label="Deliverable Media / Files / Staging Artifact"
                          helperText="Upload screenshots, demo video, source zip, or audio walkthrough (Max 100MB), or toggle link"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Version Number</label>
                          <input
                            type="text"
                            value={deliverableVersion}
                            onChange={(e) => setDeliverableVersion(e.target.value)}
                            placeholder="1.0"
                            className="w-full p-2 border border-slate-300 rounded font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Description / Release Notes</label>
                        <textarea
                          rows={2}
                          value={deliverableDesc}
                          onChange={(e) => setDeliverableDesc(e.target.value)}
                          placeholder="Explain what has been completed, test instructions, or notes for BGA/Client..."
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setDeliverableModal(false)}
                          className="px-3 py-1.5 rounded text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!deliverableUrl}
                          className="px-4 py-1.5 bg-[#3066BE] text-white rounded font-bold hover:bg-[#255299] transition-colors disabled:opacity-50"
                        >
                          Upload & Submit for BGA Review
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </ModalPortal>

              {/* Technical Reply Modal */}
              <ModalPortal
                isOpen={feedbackModal}
                onClose={() => setFeedbackModal(false)}
              >
                {feedbackModal && (
                  <div
                    className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-base font-bold text-slate-900">Post Technical Reply to BGA</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Post an engineering response, fix update, or clarification that the BGA can communicate back to the client.
                    </p>
                    <form onSubmit={handleAddFeedback} className="mt-4 space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Technical Reply Details *</label>
                        <textarea
                          rows={4}
                          required
                          value={feedbackContent}
                          onChange={(e) => setFeedbackContent(e.target.value)}
                          placeholder="Describe the solution, deployed fix, or instructions for BGA to convey to client..."
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setFeedbackModal(false)}
                          className="px-3 py-1.5 rounded text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-[#3066BE] text-white rounded font-bold hover:bg-[#255299] transition-colors"
                        >
                          Send Reply to BGA
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

