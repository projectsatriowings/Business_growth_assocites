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
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { SkeletonStatsRow, SkeletonTable, TechnicalDashboardSkeleton } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ModalPortal';
import { MediaUploader, MediaUploadResult } from '../../components/MediaUploader';
import { isExternalWebLink, extractUrls, downloadFile } from '../../utils/fileDownload';

export const TechnicalPortal: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const valid = ['dashboard', 'projects'];
      if (tabParam && valid.includes(tabParam)) return tabParam as any;
      try {
        const saved = localStorage.getItem('technical_active_tab');
        if (saved && valid.includes(saved)) return saved as any;
      } catch (e) {}
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('technical_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'SOFTWARE_DEVELOPMENT' | 'DIGITAL_MARKETING'>('ALL');

  const isDigitalMarketing = (cat?: string, team?: string) => {
    if (team === 'DIGITAL_MARKETING') return true;
    if (team === 'SOFTWARE_DEVELOPMENT') return false;
    const c = String(cat || '').toUpperCase();
    return (
      c.includes('DIGITAL') ||
      c.includes('MARKETING') ||
      c.includes('SEO') ||
      c.includes('SOCIAL') ||
      c.includes('SMM') ||
      c.includes('ADS')
    );
  };

  const softDevProjectsCount = projects.filter((p) => !isDigitalMarketing(p.serviceCategory, p.assignedTeam)).length;
  const digMktgProjectsCount = projects.filter((p) => isDigitalMarketing(p.serviceCategory, p.assignedTeam)).length;

  const filteredProjects = projects.filter((p) => {
    if (teamFilter === 'ALL') return true;
    const isDm = isDigitalMarketing(p.serviceCategory, p.assignedTeam);
    return teamFilter === 'DIGITAL_MARKETING' ? isDm : !isDm;
  });

  // Progress Update Modal
  const [progressModal, setProgressModal] = useState<{ projectId: string; current: number } | null>(null);
  const [progressInput, setProgressInput] = useState<number>(0);

  // New Deliverable Modal
  const [deliverableModal, setDeliverableModal] = useState<boolean>(false);
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableDesc, setDeliverableDesc] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableFileType, setDeliverableFileType] = useState<string>('OTHER');
  const [deliverableFileName, setDeliverableFileName] = useState<string>('');
  const [deliverableFileSize, setDeliverableFileSize] = useState<number | undefined>(undefined);
  const [deliverableVersion, setDeliverableVersion] = useState('1.0');

  // Correction Request & Three-Way Communication Modal
  const [feedbackModal, setFeedbackModal] = useState<boolean>(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackVisibility, setFeedbackVisibility] = useState<'CLIENT_VISIBLE' | 'INTERNAL'>('CLIENT_VISIBLE');

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

  // Handle Add Deliverable (With Media Upload & BGA Review Notification)
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
        }),
      });
      toast.success('Response posted to project communication thread.');
      setFeedbackModal(false);
      setFeedbackContent('');
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
      <PortalHeader title="Technical & IT Solutions Portal" subtitle="Software Engineering, Deliverables & Handover" />

      <div className="flex-1 flex flex-col md:flex-row relative min-h-0">
        {/* Sidebar Nav (Sticky, fixed in viewport, independent internal scrolling) */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-4 shrink-0 md:sticky md:top-[var(--portal-header-height,68px)] md:h-[calc(100vh-var(--portal-header-height,68px))] flex flex-col justify-between z-30">
          <div className="space-y-1 overflow-y-auto flex-1 pr-1 -mr-1 sidebar-scrollbar">
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

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 shrink-0">
            <div className="flex justify-between items-center px-1">
              <span>Security Scope:</span>
              <span className="text-[#80DED9] font-bold">FINANCIAL DATA ISOLATED</span>
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
                {/* Engineering Greeting Banner */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                      Welcome back, {user?.name || 'Engineer'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Deliverables execution, client reviews, and project handover.
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
                  approved scopes, and deliverables. Sensitive BGA commissions, personal banking data, and unrelated accounts
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
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Active Technical Projects</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Projects automatically routed for execution upon verified advance payment. Select any project to open its execution workspace.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setTeamFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          teamFilter === 'ALL'
                            ? 'bg-[#3066BE] text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        All Projects ({projects.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamFilter('SOFTWARE_DEVELOPMENT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          teamFilter === 'SOFTWARE_DEVELOPMENT'
                            ? 'bg-[#3066BE] text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Software Development ({softDevProjectsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamFilter('DIGITAL_MARKETING')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          teamFilter === 'DIGITAL_MARKETING'
                            ? 'bg-[#3066BE] text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Digital Marketing ({digMktgProjectsCount})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProjects.map((p) => {
                      const isDm = isDigitalMarketing(p.serviceCategory, p.assignedTeam);
                      const isNewProject = p.status === 'READY_TO_START';

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProject(p)}
                          className={`bg-white p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isNewProject
                              ? 'border-emerald-300 ring-2 ring-emerald-500/20 shadow-md hover:border-emerald-400'
                              : 'border-slate-200 shadow-sm hover:border-amber-400'
                          }`}
                        >
                          <div>
                            {isNewProject && (
                              <div className="mb-3 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                  ✨ NEW PROJECT • READY TO START
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono">
                                  Auto-Released
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-500">{p.projectNumber}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                    {isDm ? 'Digital Marketing Team' : 'Software Development Team'}
                                  </span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 mt-1">{p.client?.clientName}</h3>
                                <span className="text-xs text-amber-700 font-semibold">{p.serviceCategory}</span>
                              </div>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                p.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-800'
                                  : p.status === 'CORRECTION_REQUIRED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                              }`}>
                                {p.status === 'READY_TO_START' ? 'Ready to Start' : p.status}
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
                            <span>{p.deliverables?.length || 0} Deliverables Registered</span>
                            <span className="font-bold text-amber-700">Open Workspace →</span>
                          </div>
                        </div>
                      );
                    })}

                    {filteredProjects.length === 0 && (
                      <div className="col-span-full p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                        <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">No projects found in this department.</p>
                      </div>
                    )}
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
                            className="px-3.5 py-2 bg-[#119DA4] hover:bg-[#0e8389] text-white rounded-lg text-xs font-bold cursor-pointer"
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

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Box 1: Requirements & Scope */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                        <strong className="block text-slate-800 font-bold mb-1">Approved Requirements & Scope:</strong>
                        <p className="text-slate-600 leading-relaxed">{selectedProject.approvedScope}</p>
                        <div className="pt-2 border-t border-slate-200/60 mt-2 text-[11px]">
                          <span className="text-slate-500">Service Category: </span>
                          <span className="font-semibold text-slate-800">{selectedProject.serviceCategory}</span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-slate-500">Assigned Team: </span>
                          <span className="font-bold text-indigo-700">
                            {isDigitalMarketing(selectedProject.serviceCategory, selectedProject.assignedTeam)
                              ? 'Digital Marketing Team'
                              : 'Software Development Team'}
                          </span>
                        </div>

                        {/* Client Uploaded Brief / Requirements Document */}
                        {selectedProject.workOrder?.quotation?.enquiry?.attachmentUrl && (
                          <div className="pt-2 border-t border-slate-200/60 mt-2">
                            <span className="text-slate-500 block mb-1 text-[11px] font-semibold">Client Uploaded Brief / Document:</span>
                            <div className="flex items-center gap-2">
                              {isExternalWebLink(selectedProject.workOrder.quotation.enquiry.attachmentUrl) ? (
                                <a
                                  href={selectedProject.workOrder.quotation.enquiry.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-1 text-[11px]"
                                >
                                  <ExternalLink className="w-3 h-3" /> Open Client Link
                                </a>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={selectedProject.workOrder.quotation.enquiry.attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold text-[11px] flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" /> View
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => downloadFile(selectedProject.workOrder.quotation.enquiry.attachmentUrl, `${selectedProject.client?.clientName || 'client'}-brief`)}
                                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Download className="w-3 h-3" /> Download Doc
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Box 2: Client & BGA Details */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <strong className="block text-slate-800 font-bold">Client & Associate Information:</strong>
                        <div>
                          <div className="font-semibold text-slate-800">{selectedProject.client?.clientName}</div>
                          {selectedProject.client?.businessName && (
                            <div className="text-slate-500 text-[11px]">{selectedProject.client.businessName}</div>
                          )}
                          {selectedProject.client?.email && (
                            <div className="text-slate-600 text-[11px] font-mono">{selectedProject.client.email}</div>
                          )}
                          {selectedProject.client?.phone && (
                            <div className="text-slate-600 text-[11px]">{selectedProject.client.phone}</div>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 text-[11px]">
                          <span className="text-slate-500">BGA: </span>
                          <span className="font-bold text-slate-900">{selectedProject.workOrder?.bga?.name || 'Assigned'}</span>
                          {selectedProject.workOrder?.bga?.email && (
                            <div className="text-slate-600 font-mono">{selectedProject.workOrder.bga.email}</div>
                          )}
                        </div>
                      </div>

                      {/* Box 3: Handover, Quotation & Verified Advance */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                        <strong className="block text-slate-800 font-bold">Quotation & Advance Clearance:</strong>
                        <div className="text-slate-700">
                          WO: <span className="font-mono font-bold text-slate-900">{selectedProject.workOrder?.workOrderNumber || 'N/A'}</span>
                        </div>
                        <div className="text-slate-700">
                          Quotation: <span className="font-mono font-bold text-slate-900">{selectedProject.workOrder?.quotationNumber || selectedProject.workOrder?.quotation?.quotationNumber || 'Approved'}</span>
                        </div>
                        <div className="text-slate-700">
                          Total Value: <span className="font-bold text-slate-900">₹{(selectedProject.workOrder?.totalValue || selectedProject.workOrder?.quotation?.totalAmount || 0)?.toLocaleString()}</span>
                        </div>
                        <div className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Verified Advance: ₹{(selectedProject.workOrder?.advancePaid || selectedProject.workOrder?.advanceRequired || 0)?.toLocaleString()} ✓
                        </div>
                        <div className="text-indigo-700 font-semibold text-[11px] pt-1">
                          ✓ Auto-Released to Technical Department
                        </div>
                      </div>
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
                                    {isExternalWebLink(d.fileUrl) ? (
                                      <a
                                        href={d.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 font-semibold"
                                      >
                                        <ExternalLink className="w-3 h-3" /> Access Deliverable Link
                                      </a>
                                    ) : (
                                      <div className="flex items-center gap-2">
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
                                              <Eye className="w-3 h-3" /> View Deliverable Artifact
                                            </>
                                          )}
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => downloadFile(d.fileUrl, d.title || 'deliverable')}
                                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                          title="Download deliverable"
                                        >
                                          <Download className="w-3 h-3 text-indigo-600" /> Download
                                        </button>
                                      </div>
                                    )}
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

                              {/* Extract any attached docs/links in feedback */}
                              {(() => {
                                const urls = extractUrls(f.content);
                                if (!urls.length) return null;
                                return (
                                  <div className="mt-2 pt-2 border-t border-slate-200/50 flex flex-wrap gap-2 items-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Attached Resources / Docs:</span>
                                    {urls.map((u, i) => {
                                      const isLink = isExternalWebLink(u);
                                      return isLink ? (
                                        <a
                                          key={i}
                                          href={u}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1"
                                        >
                                          <ExternalLink className="w-3 h-3" /> Open Link
                                        </a>
                                      ) : (
                                        <div key={i} className="flex items-center gap-1">
                                          <a
                                            href={u}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-slate-600 hover:text-indigo-600 font-bold flex items-center gap-0.5"
                                          >
                                            <Eye className="w-3 h-3" /> View
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => downloadFile(u, 'feedback-attachment')}
                                            className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                          >
                                            <Download className="w-3 h-3 text-indigo-600" /> Download Doc
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

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

