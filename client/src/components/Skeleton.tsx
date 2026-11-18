import React from 'react';
import { Building2, Sparkles, ShieldCheck, RefreshCw, BarChart3, Layers, CreditCard, Users } from 'lucide-react';

/**
 * Base shimmer building block
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return (
    <div
      className={`bg-slate-200/80 rounded-md animate-shimmer relative overflow-hidden ${className}`}
    />
  );
};

/**
 * Single KPI Metric Card Skeleton with Shimmer
 */
export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-shimmer relative overflow-hidden space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3.5 bg-slate-200/90 rounded-md w-28" />
        <div className="w-9 h-9 rounded-xl bg-slate-200/80" />
      </div>
      <div className="h-8 bg-slate-200/90 rounded-lg w-36 mt-1" />
      <div className="h-3 bg-slate-200/70 rounded-md w-24" />
    </div>
  );
};

/**
 * Row of KPI Metric Cards
 */
export const SkeletonStatsRow: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4 mb-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

/**
 * Table Skeleton with Header, Filter Bar, and Rows
 */
export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-shimmer relative">
      {/* Table Top Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70">
        <div className="space-y-1.5">
          <div className="h-4 bg-slate-200/90 rounded-md w-40" />
          <div className="h-3 bg-slate-200/70 rounded-md w-56" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 bg-slate-200/80 rounded-lg w-28" />
          <div className="h-8 bg-slate-200/80 rounded-lg w-36" />
        </div>
      </div>

      {/* Table Header Row */}
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-100/50 flex items-center justify-between gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="h-3 bg-slate-200/80 rounded-md flex-1" />
        ))}
      </div>

      {/* Table Data Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-lg bg-slate-200/80 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-slate-200/90 rounded-md w-3/4" />
                <div className="h-2.5 bg-slate-200/70 rounded-md w-1/2" />
              </div>
            </div>
            {Array.from({ length: cols - 1 }).map((_, c) => (
              <div key={c} className="h-3.5 bg-slate-200/80 rounded-md flex-1 hidden sm:block" />
            ))}
            <div className="h-7 w-20 bg-slate-200/80 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Specialized Full-Page Dashboard Skeleton for BGA Associate Portal
 * (Renders full layout matching the user's workspace so there is zero empty void)
 */
export const BgaDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 w-full animate-shimmer relative">
      {/* 1. Synchronizing Status Banner */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Synchronizing BGA Associate Telemetry...</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Connecting to secure client lock database and verified commission ledger...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Exclusive Client Protection Active</span>
        </div>
      </div>

      {/* 2. Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Registered Clients */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">My Registered Clients</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="h-8 bg-slate-200/80 rounded-lg w-20" />
          <div className="h-3 bg-emerald-100/80 rounded-md w-36" />
        </div>

        {/* Card 2: Submitted Enquiries */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Submitted Enquiries</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="h-8 bg-slate-200/80 rounded-lg w-20" />
          <div className="h-3 bg-indigo-100/80 rounded-md w-32" />
        </div>

        {/* Card 3: Accepted Quotations */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Accepted Quotations</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="h-8 bg-slate-200/80 rounded-lg w-20" />
          <div className="h-3 bg-blue-100/80 rounded-md w-28" />
        </div>

        {/* Card 4: Active Projects */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Active In-Progress Projects</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="h-8 bg-slate-200/80 rounded-lg w-20" />
          <div className="h-3 bg-amber-100/80 rounded-md w-36" />
        </div>
      </div>

      {/* 3. Two Large Commission Earnings Banners Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Paid Commissions Skeleton */}
        <div className="p-6 rounded-2xl bg-gradient-to-tr from-emerald-950/80 to-teal-900/80 border border-emerald-500/20 text-white shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="h-3.5 bg-emerald-400/40 rounded-md w-44" />
            <div className="h-9 bg-white/30 rounded-lg w-36 mt-3" />
            <div className="h-3 bg-emerald-200/40 rounded-md w-3/4 mt-2" />
          </div>
          <div className="h-8 bg-white/20 rounded-lg w-36 mt-2" />
        </div>

        {/* Processing Commissions Skeleton */}
        <div className="p-6 rounded-2xl bg-gradient-to-tr from-indigo-950/80 to-blue-900/80 border border-indigo-500/20 text-white shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="h-3.5 bg-indigo-400/40 rounded-md w-44" />
            <div className="h-9 bg-white/30 rounded-lg w-36 mt-3" />
            <div className="h-3 bg-indigo-200/40 rounded-md w-3/4 mt-2" />
          </div>
          <div className="h-8 bg-white/20 rounded-lg w-36 mt-2" />
        </div>
      </div>

      {/* 4. Client Pipeline & Activity Placeholder Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="space-y-1">
            <div className="h-4 bg-slate-200/90 rounded-md w-48" />
            <div className="h-3 bg-slate-200/70 rounded-md w-64" />
          </div>
          <div className="h-8 bg-slate-200/80 rounded-xl w-32 hidden sm:block" />
        </div>

        <div className="divide-y divide-slate-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200/80 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-200/90 rounded-md w-40" />
                  <div className="h-3 bg-slate-200/70 rounded-md w-28" />
                </div>
              </div>

              <div className="h-6 bg-slate-200/80 rounded-full w-24 hidden md:block" />
              <div className="h-6 bg-slate-200/80 rounded-full w-28 hidden sm:block" />
              <div className="h-8 bg-slate-200/80 rounded-lg w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Specialized Dashboard Skeleton for Admin Portal
 */
export const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 w-full animate-shimmer relative">
      {/* Overview Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 bg-slate-200/90 rounded-lg w-64" />
          <div className="h-3.5 bg-slate-200/70 rounded-md w-96" />
        </div>
        <div className="h-9 bg-slate-200/80 rounded-xl w-32" />
      </div>

      {/* 10-Stage Pipeline Ribbon Placeholder */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="h-4 bg-slate-200/90 rounded-md w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200/60 text-center space-y-1.5">
              <div className="h-6 bg-slate-200/90 rounded-md w-8 mx-auto" />
              <div className="h-2.5 bg-slate-200/70 rounded-md w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Table Skeleton */}
      <SkeletonTable rows={4} cols={6} />
    </div>
  );
};

/**
 * Specialized Dashboard Skeleton for Accounts Portal
 */
export const AccountsDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 w-full animate-shimmer relative">
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-xs font-bold text-slate-800">Synchronizing Financial Ledger & Quotation Queue...</span>
        </div>
        <div className="h-7 bg-slate-200/80 rounded-lg w-28" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <SkeletonTable rows={4} cols={5} />
    </div>
  );
};

/**
 * Specialized Dashboard Skeleton for Technical Portal
 */
export const TechnicalDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 w-full animate-shimmer relative">
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
          <span className="text-xs font-bold text-slate-800">Synchronizing Authorized Technical Sprints...</span>
        </div>
        <div className="h-7 bg-slate-200/80 rounded-lg w-28" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-slate-200/90 rounded-md w-24" />
                <div className="h-5 bg-slate-200/90 rounded-md w-48" />
              </div>
              <div className="h-5 bg-slate-200/80 rounded-full w-20" />
            </div>
            <div className="h-2 bg-slate-200/80 rounded-full w-full" />
            <div className="h-12 bg-slate-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Modern Executive Branded Full-Screen Page Loading Fallback (For React Suspense)
 */
export const PageLoadingFallback: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative text-center space-y-5 max-w-sm">
        {/* Animated Glowing Logo */}
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-indigo-500 via-teal-400 to-blue-500 opacity-60 blur-lg animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-2xl">
            <img
              src="/favicon.png"
              alt="Atriowings Technologies"
              className="w-10 h-10 object-contain animate-pulse"
            />
          </div>
        </div>

        {/* Title & Micro-Status */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-extrabold text-white tracking-tight">
            Atriowings Technologies
          </h2>
          <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
            Growth Network & IT Solutions
          </p>
        </div>

        {/* Progress Spinner & Shimmer Bar */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
            <span>Securing session & loading workspace...</span>
          </div>
          
          <div className="w-48 mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-teal-400 via-indigo-500 to-blue-500 rounded-full w-2/3 animate-[shimmer_1.5s_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
};
