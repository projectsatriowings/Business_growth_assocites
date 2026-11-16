import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-200 rounded w-24" />
        <div className="w-9 h-9 rounded-xl bg-slate-200" />
      </div>
      <div className="h-7 bg-slate-200 rounded w-32" />
      <div className="h-3 bg-slate-200 rounded w-20" />
    </div>
  );
};

export const SkeletonStatsRow: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="h-4 bg-slate-200 rounded w-32" />
        <div className="h-8 bg-slate-200 rounded w-48" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between space-x-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 bg-slate-200 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PageLoadingFallback: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-7 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
        <div className="w-10 h-10 bg-slate-200 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-96 bg-slate-200 rounded-2xl" />
    </div>
  );
};

