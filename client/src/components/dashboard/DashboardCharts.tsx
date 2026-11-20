import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  Users,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Star,
  Activity,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

// ==========================================
// 1. INTERACTIVE MONTHLY AREA & BAR CHART
// ==========================================
export interface MonthlyDataPoint {
  month: string;
  yearMonth?: string;
  value1: number;
  value2?: number;
}

interface MonthlyAreaChartProps {
  data: MonthlyDataPoint[];
  title: string;
  subtitle?: string;
  label1: string;
  label2?: string;
  color1?: string;
  color2?: string;
  formatValue?: (val: number) => string;
}

export const MonthlyAreaChart: React.FC<MonthlyAreaChartProps> = ({
  data,
  title,
  subtitle,
  label1,
  label2,
  color1 = '#3066BE',
  color2 = '#119DA4',
  formatValue = (v) => v.toLocaleString(),
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-center min-h-[260px] text-slate-400 text-xs">
        No trend data recorded yet.
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.value1 || 0, d.value2 || 0)),
    10
  );

  const height = 180;
  const width = 500;
  const paddingX = 40;
  const paddingY = 25;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const getX = (idx: number) =>
    data.length === 1
      ? width / 2
      : paddingX + (idx / (data.length - 1)) * plotWidth;

  const getY = (val: number) =>
    height - paddingY - ((val || 0) / maxVal) * plotHeight;

  // Build SVG path points
  const points1 = data.map((d, i) => `${getX(i)},${getY(d.value1)}`).join(' ');
  const areaPoints1 = `${getX(0)},${height - paddingY} ${points1} ${getX(
    data.length - 1
  )},${height - paddingY}`;

  const hasSeries2 = data.some((d) => d.value2 !== undefined);
  const points2 = hasSeries2
    ? data.map((d, i) => `${getX(i)},${getY(d.value2 || 0)}`).join(' ')
    : '';

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3066BE]" />
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color1 }}
            />
            <span className="text-slate-600">{label1}</span>
          </div>
          {hasSeries2 && label2 && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color2 }}
              />
              <span className="text-slate-600">{label2}</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
        >
          <defs>
            <linearGradient id="areaGradient1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color1} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color1} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="areaGradient2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color2} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color2} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = height - paddingY - pct * plotHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#94a3b8"
                  fontFamily="monospace"
                >
                  {formatValue(Math.round(pct * maxVal))}
                </text>
              </g>
            );
          })}

          {/* Series 1 Area & Line */}
          <polygon points={areaPoints1} fill="url(#areaGradient1)" />
          <polyline
            fill="none"
            stroke={color1}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points1}
          />

          {/* Series 2 Line if exists */}
          {hasSeries2 && (
            <polyline
              fill="none"
              stroke={color2}
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points2}
            />
          )}

          {/* Data Points & Interaction Hover */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy1 = getY(d.value1);
            const isHovered = hoveredIndex === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingY}
                    x2={cx}
                    y2={height - paddingY}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Circle point 1 */}
                <circle
                  cx={cx}
                  cy={cy1}
                  r={isHovered ? 5 : 3.5}
                  fill="white"
                  stroke={color1}
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all"
                />

                {/* Circle point 2 if exists */}
                {hasSeries2 && d.value2 !== undefined && (
                  <circle
                    cx={cx}
                    cy={getY(d.value2)}
                    r={isHovered ? 4.5 : 3}
                    fill="white"
                    stroke={color2}
                    strokeWidth={2}
                    className="transition-all"
                  />
                )}

                {/* X axis labels */}
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  fill={isHovered ? '#0f172a' : '#64748b'}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute top-2 pointer-events-none bg-slate-900/95 text-white px-3 py-2 rounded-xl text-[11px] shadow-lg backdrop-blur-xs border border-slate-700 z-10 transition-all"
            style={{
              left: `${Math.min(
                Math.max((hoveredIndex / (data.length - 1)) * 80 + 10, 15),
                80
              )}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1 mb-1">
              {data[hoveredIndex].yearMonth || data[hoveredIndex].month}
            </div>
            <div className="flex items-center gap-2 justify-between">
              <span className="text-slate-400">{label1}:</span>
              <span className="font-mono font-bold text-[#80DED9]">
                {formatValue(data[hoveredIndex].value1)}
              </span>
            </div>
            {hasSeries2 && label2 && data[hoveredIndex].value2 !== undefined && (
              <div className="flex items-center gap-2 justify-between mt-0.5">
                <span className="text-slate-400">{label2}:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {formatValue(data[hoveredIndex].value2 || 0)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 2. DONUT CATEGORY DISTRIBUTION CHART
// ==========================================
export interface CategoryBreakdownItem {
  category: string;
  count: number;
  percentage?: number;
  totalValue?: number;
}

interface CategoryDonutChartProps {
  data: CategoryBreakdownItem[];
  title: string;
  subtitle?: string;
  totalLabel?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  WEB_DEVELOPMENT: '#3066BE',
  MOBILE_APP: '#119DA4',
  DIGITAL_MARKETING: '#F59E0B',
  CLOUD_INFRASTRUCTURE: '#8B5CF6',
  AI_AUTOMATION: '#EC4899',
  CONSULTING: '#10B981',
  DEFAULT: '#64748B',
};

const formatCategoryName = (cat: string) => {
  return cat
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  data,
  title,
  subtitle,
  totalLabel = 'Total Workload',
}) => {
  const totalCount = data.reduce((acc, curr) => acc + (curr.count || 0), 0);

  // If no data, show balanced fallback placeholder
  const displayItems =
    data && data.length > 0
      ? data
      : [
          { category: 'WEB_DEVELOPMENT', count: 0, percentage: 0 },
          { category: 'DIGITAL_MARKETING', count: 0, percentage: 0 },
        ];

  // SVG circle calculation
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col">
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#119DA4]" />
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 my-4">
        {/* SVG Donut Circle */}
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
            {/* Background ring */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="16"
            />

            {/* Segments */}
            {totalCount > 0 ? (
              displayItems.map((item, idx) => {
                const pct = (item.count / totalCount) * 100;
                const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += pct;
                const strokeColor =
                  CATEGORY_COLORS[item.category] || CATEGORY_COLORS.DEFAULT;

                return (
                  <circle
                    key={idx}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke={strokeColor}
                    strokeWidth="16"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500 hover:opacity-85"
                  />
                );
              })
            ) : (
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#e2e8f0"
                strokeWidth="16"
              />
            )}
          </svg>

          {/* Donut Center Counter */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalCount}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {totalLabel}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5">
          {displayItems.map((item, idx) => {
            const color =
              CATEGORY_COLORS[item.category] || CATEGORY_COLORS.DEFAULT;
            const pct =
              totalCount > 0
                ? Math.round((item.count / totalCount) * 100)
                : item.percentage || 0;

            return (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-slate-700 truncate">
                    {formatCategoryName(item.category)}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="font-bold text-slate-900">{item.count}</span>
                  <span className="text-[10px] text-slate-400 w-9 text-right font-semibold">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise Service Opportunity & Rate Coverage */}
      <div className="mt-2 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          <span>Enterprise Service Coverage</span>
          <span className="text-[#3066BE] font-semibold">{totalCount} enquiries logged</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            {
              id: 'SOFTWARE_DEVELOPMENT',
              name: 'Software Development',
              desc: 'Cloud ERP, CRM & Custom SaaS',
              color: '#8B5CF6',
            },
            {
              id: 'WEB_DEVELOPMENT',
              name: 'Website Development',
              desc: 'Corporate, Portal & E-Commerce',
              color: '#3066BE',
            },
            {
              id: 'DIGITAL_MARKETING',
              name: 'Digital Marketing',
              desc: 'Monthly Retainers (SEO & PPC)',
              color: '#F59E0B',
            },
            {
              id: 'MOBILE_APP',
              name: 'Mobile Applications',
              desc: 'iOS & Android Native & Flutter',
              color: '#119DA4',
            },
          ].map((domain) => {
            const match = data.find(
              (d) =>
                d.category?.toUpperCase() === domain.id ||
                d.category?.toUpperCase()?.replace(/_/g, '') === domain.id.replace(/_/g, '')
            );
            const count = match?.count || 0;
            const hasEnquiries = count > 0;

            return (
              <div
                key={domain.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  hasEnquiries
                    ? 'bg-blue-50/60 border-[#3066BE]/30'
                    : 'bg-slate-50/60 border-slate-200/70'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-bold text-xs text-slate-800 truncate">
                    {domain.name}
                  </span>
                  {hasEnquiries ? (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#3066BE] text-white shrink-0">
                      {count} Logged
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-200/70 text-slate-600 shrink-0">
                      Eligible
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 truncate">{domain.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. PIPELINE CONVERSION FUNNEL
// ==========================================
interface FunnelStage {
  label: string;
  count: number;
  color: string;
  description?: string;
}

interface PipelineFunnelProps {
  stages: FunnelStage[];
  title: string;
  subtitle?: string;
}

export const PipelineFunnel: React.FC<PipelineFunnelProps> = ({
  stages,
  title,
  subtitle,
}) => {
  const topCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#3066BE]" />
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const widthPct = Math.max(Math.round((stage.count / topCount) * 100), 12);
          const prevCount = idx > 0 ? stages[idx - 1].count : null;
          const convRate =
            prevCount && prevCount > 0
              ? Math.min(Math.round((stage.count / prevCount) * 100), 100)
              : null;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  {stage.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">
                    {stage.count}
                  </span>
                  {convRate !== null && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      {convRate}% conv
                    </span>
                  )}
                </div>
              </div>

              {/* Progress visual bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: stage.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 4. ASSOCIATE NETWORK PEER LEADERBOARD
// "for the bga it should be one bga should show another bga"
// ==========================================
export interface PeerAssociate {
  id: string;
  name: string;
  rank: number;
  tier: string;
  clientsCount: number;
  acceptedQuotesCount: number;
  completedProjectsCount: number;
  points: number;
  isCurrentUser?: boolean;
}

interface PeerLeaderboardProps {
  associates: PeerAssociate[];
  currentUserRank?: number;
  totalNetworkCount?: number;
  onViewNetwork?: () => void;
}

export const AssociatePeerLeaderboard: React.FC<PeerLeaderboardProps> = ({
  associates,
  currentUserRank = 1,
  totalNetworkCount = 1,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Top 5 associates for compact balanced dashboard display
  const top5 = associates.slice(0, 5);
  const currentUserInTop5 = top5.some((a) => a.isCurrentUser);
  const currentUserObj = associates.find((a) => a.isCurrentUser);

  const displayedAssociates = showAll
    ? associates
    : currentUserInTop5 || !currentUserObj
    ? top5
    : [...top5, currentUserObj];

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Associate Network Benchmark & Leaderboard
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Transparent enterprise rankings across clients onboarded and verified project deliveries.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-[#3066BE]/10 text-[#3066BE] text-xs font-bold flex items-center gap-1 border border-[#3066BE]/20">
            <Star className="w-3 h-3 fill-[#3066BE]" />
            Your Rank: #{currentUserRank} of {totalNetworkCount}
          </span>
        </div>
      </div>

      {/* Podium and Ranking List with max height limit for clean dashboard balance */}
      <div
        className={`divide-y divide-slate-100 ${
          showAll ? 'max-h-[440px] overflow-y-auto sidebar-scrollbar pr-1' : ''
        }`}
      >
        {displayedAssociates && displayedAssociates.length > 0 ? (
          displayedAssociates.map((peer, idx) => {
            const isTop3 = peer.rank <= 3;
            const rankIcon =
              peer.rank === 1
                ? '🥇'
                : peer.rank === 2
                ? '🥈'
                : peer.rank === 3
                ? '🥉'
                : `#${peer.rank}`;

            // If this is the pinned current user outside top 5
            const isPinnedCurrentUser =
              !showAll && !currentUserInTop5 && peer.isCurrentUser && idx === 5;

            return (
              <React.Fragment key={peer.id}>
                {isPinnedCurrentUser && (
                  <div className="py-1 text-center text-[10px] text-slate-400 font-bold tracking-widest">
                    • • •
                  </div>
                )}
                <div
                  className={`py-2.5 px-3 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    peer.isCurrentUser
                      ? 'bg-blue-50/70 border border-[#3066BE]/30 shadow-xs'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        peer.rank === 1
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : peer.rank === 2
                          ? 'bg-slate-200 text-slate-700'
                          : peer.rank === 3
                          ? 'bg-amber-50 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rankIcon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {peer.name}
                        </span>
                        {peer.isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#3066BE] text-white text-[10px] font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {peer.tier}
                      </span>
                    </div>
                  </div>

                  {/* Score & Delivery Metrics */}
                  <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block font-normal">
                        Clients
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {peer.clientsCount}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block font-normal">
                        Signed Deals
                      </span>
                      <span className="font-mono font-bold text-emerald-600">
                        {peer.acceptedQuotesCount}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block font-normal">
                        Completed
                      </span>
                      <span className="font-mono font-bold text-blue-600">
                        {peer.completedProjectsCount}
                      </span>
                    </div>
                    <div className="pl-2.5 border-l border-slate-200 text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-normal">
                        Score
                      </span>
                      <span className="font-mono font-extrabold text-[#3066BE]">
                        {peer.points} pts
                      </span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            No active peer records to display.
          </div>
        )}
      </div>

      {/* Show more toggle button */}
      {associates.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2.5 py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 text-[#3066BE] text-xs font-bold transition-all border border-slate-200/80 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>
            {showAll
              ? 'Show Top 5 Associates Only ↑'
              : `View All ${associates.length} Associates (${associates.length - 5} more) ↓`}
          </span>
        </button>
      )}

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Rankings updated in real-time upon verified client milestone settlements.
        </span>
      </div>
    </div>
  );
};
