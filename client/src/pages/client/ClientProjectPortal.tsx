import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  MessageSquare,
  Send,
  Building2,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Layers,
  Sparkles,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ClientProjectPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feedback form state
  const [feedbackContent, setFeedbackContent] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');
  const [selectedDeliverableId, setSelectedDeliverableId] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const fetchProject = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/client-portal/project/${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load project');
      }
      setProject(data.project);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to client portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [token]);

  // Record deliverable view
  const handleDeliverableAccess = async (deliverableId: string, url: string) => {
    try {
      fetch(`/api/client-portal/project/${token}/deliverables/${deliverableId}/view`, {
        method: 'POST',
      });
    } catch {}
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Submit client feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim() || !token) return;

    setSubmittingFeedback(true);
    try {
      const res = await fetch(`/api/client-portal/project/${token}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: feedbackContent.trim(),
          milestoneId: selectedMilestoneId || null,
          deliverableId: selectedDeliverableId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setFeedbackContent('');
      setSelectedMilestoneId('');
      setSelectedDeliverableId('');
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 4000);
      fetchProject();
    } catch (err: any) {
      alert(err.message || 'Error submitting feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 animate-bounce">
            <Layers className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-700">Connecting to Atriowings Secure Client Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Project Link Inactive</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'This project link could not be verified or has been revoked. Please contact your dedicated Business Growth Associate.'}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
          >
            Go to Atriowings Home
          </a>
        </div>
      </div>
    );
  }

  const deliverables = project.deliverables || [];
  const milestones = project.milestones || [];
  const feedbackList = project.feedback || [];
  const bga = project.workOrder?.bga;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3066BE] to-[#119DA4] flex items-center justify-center text-white font-black text-sm shadow-sm">
              AT
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight text-slate-900 block">
                Atriowings Technologies
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                Official Client Project Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Client Session</span>
            </div>
            <button
              onClick={() => fetchProject()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh project state"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Project Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#3066BE] via-[#119DA4] to-emerald-500 absolute top-0 left-0" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-100">
                  {project.projectNumber}
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {project.serviceCategory?.replace(/_/g, ' ')}
                </span>
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  project.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : project.status === 'UNDER_REVIEW'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {project.status?.replace(/_/g, ' ')}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {project.client?.businessName || project.client?.clientName}
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                {project.approvedScope}
              </p>
            </div>

            {/* BGA Dedicated Associate Card */}
            {bga && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shrink-0 w-full sm:w-80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Your Dedicated Associate
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {bga.name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <strong className="text-xs font-bold text-slate-900 block truncate">{bga.name}</strong>
                    <div className="text-[11px] text-slate-500 truncate">{bga.email}</div>
                    {bga.mobile && (
                      <div className="text-[11px] text-slate-500 font-mono">{bga.mobile}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Overall Progress Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Overall Milestone Completion
              </span>
              <span className="text-base font-black text-[#3066BE] font-mono">
                {project.progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${project.progressPercentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="bg-gradient-to-r from-[#3066BE] via-[#119DA4] to-emerald-500 h-full rounded-full"
              />
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Milestones & Deliverables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Milestones Timeline */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Layers className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900">Milestone Roadmap</h2>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {milestones.filter((m: any) => m.status === 'COMPLETED').length} of {milestones.length} Completed
              </span>
            </div>

            <div className="space-y-3">
              {milestones.map((m: any, idx: number) => {
                const isDone = m.status === 'COMPLETED';
                const isCurrent = m.status === 'IN_PROGRESS';

                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      isDone
                        ? 'bg-emerald-50/50 border-emerald-200/70'
                        : isCurrent
                        ? 'bg-blue-50/60 border-blue-200'
                        : 'bg-slate-50/50 border-slate-100 text-slate-500'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <strong className={`text-xs font-bold truncate ${isDone ? 'text-emerald-950' : isCurrent ? 'text-blue-950' : 'text-slate-700'}`}>
                          {idx + 1}. {m.title}
                        </strong>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCurrent
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                      {m.description && (
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{m.description}</p>
                      )}
                      {m.completedAt && (
                        <div className="text-[10px] text-emerald-700 font-medium mt-1">
                          Completed on {new Date(m.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Deliverables & Releases */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                  <Download className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900">Deliverables & Releases</h2>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {deliverables.length} Available
              </span>
            </div>

            {deliverables.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No deliverables shared yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Our engineering team is actively building the first milestone. Approved artifacts will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliverables.map((d: any) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-300 hover:shadow-xs transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-slate-900">{d.title}</strong>
                          <span className="text-[10px] font-mono font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-100">
                            v{d.version}
                          </span>
                        </div>
                        {d.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{d.description}</p>
                        )}
                        {d.milestone && (
                          <div className="text-[10px] text-indigo-600 font-medium mt-1">
                            Milestone: {d.milestone.title}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeliverableAccess(d.id, d.fileUrl)}
                        className="px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                      >
                        <span>Access</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Shared on {new Date(d.createdAt).toLocaleDateString()}</span>
                      <span className="text-emerald-600 font-semibold">✓ Verified & Approved</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unified Project Feedback & Revision Conversation */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-bold text-slate-900">Project Communication & Feedback</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct thread between you, your Growth Associate, and the Technical Engineering lead.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {feedbackList.length} Messages
            </span>
          </div>

          {/* Conversation Stream */}
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
            {feedbackList.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No feedback submitted yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Have a suggestion, question, or change request? Post below to reach the engineering team.
                </p>
              </div>
            ) : (
              feedbackList.map((f: any) => {
                const isClient = f.authorRole === 'CLIENT';
                const isTech = f.authorRole === 'TECHNICAL';
                const isBga = f.authorRole === 'BGA';

                return (
                  <div
                    key={f.id}
                    className={`p-4 rounded-2xl border transition-all space-y-1.5 ${
                      isClient
                        ? 'bg-blue-50/40 border-blue-200/80'
                        : isTech
                        ? 'bg-slate-50/70 border-slate-200'
                        : 'bg-emerald-50/40 border-emerald-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isClient
                            ? 'bg-blue-100 text-blue-800'
                            : isTech
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isClient ? 'You (Client)' : isTech ? 'Technical Team' : 'Growth Associate'}
                        </span>
                        <strong className="text-xs font-bold text-slate-800">{f.authorName}</strong>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-1">
                      {f.content}
                    </p>

                    {f.status && f.status !== 'NEW' && (
                      <div className="pt-1 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Status:</span>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase">
                          {f.status}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* New Feedback Submission Form */}
          <form onSubmit={handleSubmitFeedback} className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Post Feedback or Request a Modification
              </label>
              <textarea
                required
                rows={3}
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                placeholder="Describe your review notes, questions, or change requests for this deliverable..."
                className="w-full text-xs p-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {milestones.length > 0 && (
                  <select
                    value={selectedMilestoneId}
                    onChange={(e) => setSelectedMilestoneId(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                  >
                    <option value="">Link Milestone (Optional)</option>
                    {milestones.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        Milestone: {m.title}
                      </option>
                    ))}
                  </select>
                )}

                {deliverables.length > 0 && (
                  <select
                    value={selectedDeliverableId}
                    onChange={(e) => setSelectedDeliverableId(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                  >
                    <option value="">Link Deliverable (Optional)</option>
                    {deliverables.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        Deliverable: {d.title} (v{d.version})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingFeedback || !feedbackContent.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-[#3066BE] to-[#255299] hover:from-[#255299] hover:to-[#1b3d73] text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                {submittingFeedback ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{submittingFeedback ? 'Posting...' : 'Send Feedback to Team'}</span>
              </button>
            </div>

            {feedbackSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your feedback has been posted and notified to the engineering team.</span>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Atriowings Technologies India Private Limited. All rights reserved.</p>
      </footer>
    </div>
  );
};
