import type React from 'react';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell, LineChart, Line, RadialBarChart,
  RadialBar, PieChart, Pie, Legend,
} from 'recharts';
import {
  Download, BarChart3, TrendingUp, Shield, FileText, Loader2,
  AlertTriangle, CheckCircle2, Clock, Zap, Users, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, Activity, Target,
  GitMerge, Bell, ChevronRight,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

// ─── Types ─────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d';
type Section = 'overview' | 'incidents' | 'sla' | 'teams' | 'changes';

// ─── Color constants ────────────────────────────────────────────────────────

const P_COLORS: Record<string, string> = {
  P1: '#DC2626', P2: '#D97706', P3: '#6366f1', P4: '#059669',
};
const STATE_COLORS: Record<string, string> = {
  NEW: '#6366f1', IN_PROGRESS: '#D97706', ESCALATED: '#DC2626',
  RESOLVED: '#059669', CLOSED: '#94a3b8', PENDING: '#818cf8',
};
const SOURCE_COLORS = ['#6366f1','#818cf8','#D97706','#DC2626','#059669','#a855f7','#94a3b8'];
const CHANGE_COLORS: Record<string, string> = {
  Normal: '#6366f1', Standard: '#059669', Emergency: '#DC2626',
};

const TT = {
  contentStyle: {
    background: '#ffffff', border: '1px solid #E2E8F0',
    borderRadius: '10px', fontSize: '11px', color: '#6366f1',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  labelStyle: { color: '#64748b', fontWeight: 600 },
  cursor: { stroke: '#E2E8F0', strokeWidth: 1 },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, suffix = ''): string {
  if (n == null) return '\u2013';
  return `${n.toLocaleString()}${suffix}`;
}

function fmtMttr(mins: number | null | undefined): string {
  const value = Number(mins);
  if (!Number.isFinite(value) || value < 0) return '\u2013';
  const rounded = Math.round(value);
  if (rounded < 60) return `${rounded}m`;
  return `${Math.floor(rounded / 60)}h ${rounded % 60}m`;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg', className)} style={{ background: '#E2E8F0' }} />;
}

// Color token map for KpiCard accent colors
const KPI_ACCENT: Record<string, { color: string; bg: string }> = {
  'bg-indigo-500':  { color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  'bg-amber-500':   { color: '#D97706', bg: 'rgba(217,119,6,0.15)' },
  'bg-red-500':     { color: '#DC2626', bg: 'rgba(220,38,38,0.15)' },
  'bg-red-400':     { color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  'bg-violet-500':  { color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  'bg-violet-400':  { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  'bg-emerald-500': { color: '#059669', bg: 'rgba(5,150,105,0.15)' },
  'bg-sky-500':     { color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  'bg-rose-500':    { color: '#DC2626', bg: 'rgba(244,63,94,0.15)' },
};

function KpiCard({
  label, value, sub, icon: Icon, trend, trendVal, color, loading,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  trend?: 'up' | 'down' | 'flat'; trendVal?: string;
  color: string; loading?: boolean;
}) {
  const trendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const TrendIcon = trendIcon;
  const trendStyle: React.CSSProperties = trend === 'up'
    ? { color: '#059669', background: 'rgba(5,150,105,0.12)' }
    : trend === 'down'
    ? { color: '#DC2626', background: 'rgba(220,38,38,0.12)' }
    : { color: '#94a3b8', background: 'rgba(99,102,241,0.06)' };
  const accent = KPI_ACCENT[color] || { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' };

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: accent.color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent.bg }}>
          <Icon size={16} style={{ color: accent.color }} />
        </div>
        {trendVal && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={trendStyle}>
            <TrendIcon size={11} /> {trendVal}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      ) : (
        <>
          <div className="text-[28px] font-extrabold leading-none font-mono tracking-tight mb-1.5" style={{ color: '#0f172a' }}>
            {value}
          </div>
          <div className="text-[11px] font-medium" style={{ color: '#64748b' }}>{label}</div>
          <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{sub}</div>
        </>
      )}
    </div>
  );
}

function EmptySection({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.1)' }}>
        <BarChart3 size={24} style={{ color: '#6366f1' }} />
      </div>
      <h3 className="text-base font-bold mb-1.5" style={{ color: '#0f172a' }}>No {title} Data</h3>
      <p className="text-sm max-w-sm" style={{ color: '#94a3b8' }}>
        Data will appear here once your organization starts tracking {title.toLowerCase()}.
      </p>
    </div>
  );
}

function SectionHeader({ title, subtitle, loading }: { title: string; subtitle?: string; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{subtitle}</p>}
      </div>
      {loading && <Loader2 size={14} className="animate-spin" style={{ color: '#6366f1' }} />}
    </div>
  );
}

function ChartCard({ title, subtitle, children, loading, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; loading?: boolean; className?: string;
}) {
  return (
    <div className={clsx('rounded-2xl p-5', className)} style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-bold" style={{ color: '#0f172a' }}>{title}</h3>
          {subtitle && <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>{subtitle}</p>}
        </div>
        {loading && <Loader2 size={12} className="animate-spin" style={{ color: '#6366f1' }} />}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message = 'No data available for this period' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: '#94a3b8' }}>
      <BarChart3 size={28} />
      <p className="text-xs font-medium text-center">{message}</p>
    </div>
  );
}

function SlaRing({ value, label, size = 90 }: { value: number; label: string; size?: number }) {
  const circ = 2 * Math.PI * 36;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  const color = value >= 95 ? '#059669' : value >= 85 ? '#D97706' : '#DC2626';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="none" stroke="#E2E8F0" strokeWidth="7" />
          <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[15px] font-extrabold font-mono" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</span>
    </div>
  );
}

// ─── OVERVIEW SECTION ──────────────────────────────────────────────────────

function OverviewSection({ period }: { period: Period }) {
  const { data: sumData, isLoading: sumL } = useQuery({
    queryKey: ['reports', 'executive-summary', period],
    queryFn: async () => { const { data } = await api.get('/reports/executive-summary'); return data; },
    staleTime: 60000,
  });

  const { data: trendData, isLoading: trendL } = useQuery({
    queryKey: ['reports', 'incident-trend', period],
    queryFn: async () => { const { data } = await api.get(`/reports/incident-trend?period=${period}`); return data; },
    staleTime: 60000,
  });

  const { data: incData, isLoading: incL } = useQuery({
    queryKey: ['reports', 'incidents', period],
    queryFn: async () => { const { data } = await api.get(`/reports/incidents?period=${period}`); return data; },
    staleTime: 60000,
  });

  const s = sumData?.data || {};
  const trend = trendData?.data || {};
  const inc = incData?.data || {};

  const dailyCounts = trend.dailyCounts || [];
  const mttrTrend = trend.mttrTrend || [];
  const slaData = trend.slaCompliance || [];
  const changesByType = trend.changesByType || [];
  const bySource = (inc.bySource || []).map((r: any, i: number) => ({
    name: r.source || r._source || 'Unknown',
    value: r._count || r.count || 0,
    color: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }));
  const byPriority = (inc.byPriority || []).map((r: any) => ({
    priority: r.priority,
    count: r._count || r.count || 0,
    color: P_COLORS[r.priority] || '#94a3b8',
  }));

  const hasData = !sumL && (s.totalIncidents > 0 || s.currentlyOpen > 0 || s.totalChanges > 0 || s.openProblems > 0);

  if (!sumL && !trendL && !incL && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(99,102,241,0.1)' }}>
          <BarChart3 size={28} style={{ color: '#6366f1' }} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: '#0f172a' }}>No data yet</h3>
        <p className="text-sm max-w-md" style={{ color: '#64748b' }}>
          Reports will populate once incidents, changes, and problems are created in your organization. Start by creating your first incident to see analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <KpiCard label="Total Incidents" value={fmt(s.totalIncidents)} sub={`Last ${period}`}
          icon={AlertTriangle} color="bg-indigo-500" loading={sumL}
          trend={s.totalIncidents > 20 ? 'up' : 'down'} trendVal={`${period}`} />
        <KpiCard label="Currently Open" value={fmt(s.currentlyOpen)} sub="Active incidents"
          icon={Activity} color="bg-amber-500" loading={sumL}
          trend={s.currentlyOpen > 5 ? 'up' : 'flat'} />
        <KpiCard label="P1 Critical" value={fmt(s.p1Last7Days)} sub="Last 7 days"
          icon={Zap} color="bg-red-500" loading={sumL}
          trend={s.p1Last7Days > 0 ? 'down' : 'flat'} trendVal={s.p1Last7Days > 0 ? 'Active' : 'Clear'} />
        <KpiCard label="Avg MTTR" value={fmtMttr(s.avgMttrMinutes)} sub="Mean time to resolve"
          icon={Clock} color="bg-violet-500" loading={sumL} />
        <KpiCard label="SLA Compliance" value={s.slaCompliancePct != null ? `${s.slaCompliancePct}%` : '\u2013'} sub="Target: 95%"
          icon={Shield} color={s.slaCompliancePct >= 95 ? 'bg-emerald-500' : 'bg-amber-500'} loading={sumL}
          trend={s.slaCompliancePct >= 95 ? 'up' : 'down'} trendVal={s.slaCompliancePct >= 95 ? 'On target' : 'Below'} />
        <KpiCard label="Change Success" value={s.changeSuccessPct != null ? `${s.changeSuccessPct}%` : '\u2013'} sub="Successful changes"
          icon={GitMerge} color="bg-emerald-500" loading={sumL}
          trend={s.changeSuccessPct >= 80 ? 'up' : 'down'} />
      </div>

      {/* Second KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'SLA Breached', value: fmt(s.slaBreached30d), sub: `Last ${period}`, icon: Target, color: 'bg-red-400' },
          { label: 'Open Changes', value: fmt(s.totalChanges), sub: `Last ${period}`, icon: GitMerge, color: 'bg-sky-500' },
          { label: 'Open Problems', value: fmt(s.openProblems), sub: 'Under investigation', icon: FileText, color: 'bg-violet-400' },
          { label: 'Firing Alerts', value: fmt(s.firingAlerts), sub: 'Right now', icon: Bell, color: 'bg-rose-500' },
        ].map(k => (
          <KpiCard key={k.label} {...k} loading={sumL} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Incident Volume" subtitle={`Daily incidents vs resolved \u2014 ${period}`} loading={trendL}>
          <div className="h-52">
            {dailyCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyCounts} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={Math.floor(dailyCounts.length / 6)} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#6366f1" fill="url(#gInc)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#059669" fill="url(#gRes)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
          <div className="flex gap-4 mt-3">
            {[['#6366f1', 'Incidents'], ['#059669', 'Resolved']].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5 text-[11px]" style={{ color: '#64748b' }}>
                <span className="w-3 h-1.5 rounded-full inline-block" style={{ background: c }} />{l}
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Mean Time to Resolve" subtitle="MTTR trend by day (minutes)" loading={trendL}>
          <div className="h-52">
            {mttrTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mttrTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={Math.floor(mttrTrend.length / 6)} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} formatter={(v: any) => [`${v}m`, 'MTTR']} />
                  <Line type="monotone" dataKey="mttr" stroke="#a855f7" strokeWidth={2.5} dot={false}
                    activeDot={{ r: 4, fill: '#a855f7', stroke: '#0f172a', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Priority breakdown */}
        <ChartCard title="Incidents by Priority" loading={incL}>
          <div className="space-y-3 mt-1">
            {byPriority.length > 0 ? byPriority.sort((a: any, b: any) => a.priority.localeCompare(b.priority)).map((p: any) => {
              const max = Math.max(...byPriority.map((x: any) => x.count), 1);
              return (
                <div key={p.priority}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold" style={{ color: p.color }}>{p.priority}</span>
                    <span className="text-[11px] font-mono font-semibold" style={{ color: '#6366f1' }}>{p.count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(p.count / max) * 100}%`, background: p.color }} />
                  </div>
                </div>
              );
            }) : <EmptyChart message="No incident priority data" />}
          </div>
        </ChartCard>

        {/* Source breakdown */}
        <ChartCard title="Incidents by Source" loading={incL}>
          {bySource.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bySource} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={35} outerRadius={60} paddingAngle={3}>
                    {bySource.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip {...TT} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-44"><EmptyChart /></div>}
          <div className="flex flex-wrap gap-2 mt-2">
            {bySource.map((s: any) => (
              <span key={s.name} className="flex items-center gap-1 text-[10px]" style={{ color: '#64748b' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Change types */}
        <ChartCard title="Changes by Type" loading={trendL}>
          {changesByType.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={changesByType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={35} outerRadius={60} paddingAngle={3}>
                    {changesByType.map((e: any, i: number) => (
                      <Cell key={i} fill={CHANGE_COLORS[e.name] || e.color || SOURCE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip {...TT} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-44"><EmptyChart /></div>}
          <div className="flex flex-wrap gap-2 mt-2">
            {changesByType.map((c: any) => (
              <span key={c.name} className="flex items-center gap-1 text-[10px]" style={{ color: '#64748b' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: CHANGE_COLORS[c.name] || c.color }} />
                {c.name} ({c.value})
              </span>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── INCIDENTS SECTION ─────────────────────────────────────────────────────

function IncidentsSection({ period }: { period: Period }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'incidents', period],
    queryFn: async () => { const { data } = await api.get(`/reports/incidents?period=${period}`); return data; },
    staleTime: 60000,
  });

  const d = data?.data || {};
  const byState = (d.byState || []).map((r: any) => ({
    state: r.state,
    count: r._count || 0,
    color: STATE_COLORS[r.state] || '#94a3b8',
  }));
  const byCategory = (d.byCategory || []).map((r: any) => ({
    name: r.category || 'Uncategorized',
    count: r._count || 0,
  }));
  const createdOverTime = d.createdOverTime || [];
  const mttr = (d.mttr || []).map((r: any) => ({
    priority: r.priority,
    mttr: r.avg_mttr_minutes || 0,
    resolved: r.resolved_count || 0,
    color: P_COLORS[r.priority] || '#94a3b8',
  }));
  const slaCompliance = (d.slaCompliance || []).map((r: any) => ({
    priority: r.priority,
    total: r.total || 0,
    met: r.met || 0,
    pct: Number(r.compliance_pct) || 0,
  }));

  if (!isLoading && !d.total) return <EmptySection title="Incident" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Total', value: fmt(d.total), color: 'bg-indigo-500', icon: AlertTriangle },
          { label: 'Resolved', value: fmt((d.byState || []).find((s: any) => s.state === 'RESOLVED')?._count || 0), color: 'bg-emerald-500', icon: CheckCircle2 },
          { label: 'Avg MTTR (P1)', value: fmtMttr(mttr.find((m: any) => m.priority === 'P1')?.mttr), color: 'bg-red-500', icon: Clock },
          { label: 'SLA Met', value: slaCompliance.reduce((s: number, r: any) => s + r.met, 0).toString(), color: 'bg-violet-500', icon: Shield },
        ].map(k => <KpiCard key={k.label} {...k} sub="" loading={isLoading} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Created Over Time" subtitle="Daily incident creation" loading={isLoading}>
          <div className="h-52">
            {createdOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={createdOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    interval={Math.floor(createdOverTime.length / 6)} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={8}>
                    {createdOverTime.map((_: any, i: number) => (
                      <Cell key={i} fill={`rgba(99,102,241,${0.4 + (i / createdOverTime.length) * 0.6})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="State Distribution" loading={isLoading}>
          <div className="space-y-2.5 mt-1">
            {byState.length > 0 ? byState.map((s: any) => {
              const max = Math.max(...byState.map((x: any) => x.count), 1);
              return (
                <div key={s.state} className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold w-24 shrink-0" style={{ color: '#64748b' }}>{s.state.replace('_', ' ')}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full" style={{ width: `${(s.count / max) * 100}%`, background: s.color }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold w-6 text-right" style={{ color: '#6366f1' }}>{s.count}</span>
                </div>
              );
            }) : <EmptyChart message="No state data" />}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="MTTR by Priority" subtitle="Average minutes to resolve" loading={isLoading}>
          <div className="h-52">
            {mttr.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttr} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 60 ? `${Math.floor(v / 60)}h` : `${v}m`} />
                  <YAxis dataKey="priority" type="category" tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 700 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip {...TT} formatter={(v: any) => [fmtMttr(v), 'Avg MTTR']} />
                  <Bar dataKey="mttr" radius={[0, 6, 6, 0]} barSize={18}>
                    {mttr.map((m: any) => <Cell key={m.priority} fill={m.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="Top Categories" subtitle="Incident categories (top 10)" loading={isLoading}>
          <div className="h-52 overflow-y-auto space-y-2 pr-1">
            {byCategory.length > 0 ? byCategory.slice(0, 10).map((c: any, i: number) => {
              const max = byCategory[0]?.count || 1;
              return (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-4" style={{ color: '#cbd5e1' }}>{i + 1}</span>
                  <span className="text-[11px] truncate w-36" style={{ color: '#64748b' }}>{c.name}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: '#818cf8' }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold" style={{ color: '#6366f1' }}>{c.count}</span>
                </div>
              );
            }) : <EmptyChart message="No category data" />}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── SLA SECTION ───────────────────────────────────────────────────────────

function SLASection({ period }: { period: Period }) {
  const { data: trendData, isLoading: trendL } = useQuery({
    queryKey: ['reports', 'incident-trend', period],
    queryFn: async () => { const { data } = await api.get(`/reports/incident-trend?period=${period}`); return data; },
    staleTime: 60000,
  });

  const { data: incData, isLoading: incL } = useQuery({
    queryKey: ['reports', 'incidents', period],
    queryFn: async () => { const { data } = await api.get(`/reports/incidents?period=${period}`); return data; },
    staleTime: 60000,
  });

  const slaRings = (trendData?.data?.slaCompliance || []).map((r: any) => ({
    priority: r.priority,
    value: Number(r.compliance) || 0,
    target: r.target || 95,
  }));

  const slaTable = (incData?.data?.slaCompliance || []).map((r: any) => ({
    priority: r.priority,
    total: r.total || 0,
    met: r.met || 0,
    pct: Number(r.compliance_pct) || 0,
  }));

  const overallPct = slaTable.length > 0
    ? Math.round(slaTable.reduce((s: number, r: any) => s + r.pct, 0) / slaTable.length)
    : null;

  const SLA_DEFS: Record<string, string> = {
    P1: '5min acknowledge \u00B7 1hr resolve',
    P2: '15min acknowledge \u00B7 4hr resolve',
    P3: '1hr acknowledge \u00B7 24hr resolve',
    P4: '4hr acknowledge \u00B7 72hr resolve',
  };

  if (!trendL && !incL && slaTable.length === 0) return <EmptySection title="SLA" />;

  return (
    <div className="space-y-6">
      {/* Overall SLA score */}
      <div className="rounded-2xl p-6 flex items-center gap-8"
        style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #E2E8F0 100%)', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Overall SLA Score</p>
          <p className="text-[52px] font-extrabold font-mono leading-none" style={{ color: '#0f172a' }}>
            {overallPct != null ? `${overallPct}%` : '\u2013'}
          </p>
          <p className="text-sm mt-2" style={{ color: '#64748b' }}>
            {overallPct != null
              ? overallPct >= 95 ? 'Meeting SLA target' : 'Below SLA target'
              : 'No data for this period'}
          </p>
        </div>
        <div className="h-16 w-px" style={{ background: '#E2E8F0' }} />
        <div className="flex gap-6">
          {(trendL || !slaRings.length
            ? [{ priority: 'P1', value: 0 }, { priority: 'P2', value: 0 }, { priority: 'P3', value: 0 }, { priority: 'P4', value: 0 }]
            : slaRings
          ).map((r: any) => (
            <SlaRing key={r.priority} value={r.value} label={r.priority} />
          ))}
        </div>
        <div className="ml-auto hidden xl:block">
          <p className="text-xs mb-2 font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>SLA Definitions</p>
          {['P1', 'P2', 'P3', 'P4'].map(p => (
            <p key={p} className="text-[11px] leading-6" style={{ color: '#64748b' }}>
              <span className="font-bold" style={{ color: P_COLORS[p] }}>{p}</span> &nbsp; {SLA_DEFS[p]}
            </p>
          ))}
        </div>
      </div>

      {/* SLA Bar chart + target line */}
      <ChartCard title="SLA Compliance by Priority" subtitle="Compliance % vs 95% target" loading={trendL}>
        <div className="h-56">
          {slaRings.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaRings} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="priority" tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip {...TT} formatter={(v: any) => [`${v}%`, 'Compliance']} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={44}>
                  {slaRings.map((r: any) => (
                    <Cell key={r.priority} fill={r.value >= 95 ? '#059669' : r.value >= 85 ? '#D97706' : '#DC2626'} />
                  ))}
                </Bar>
                {/* Target reference line rendered as overlay */}
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No SLA data available" />}
        </div>
      </ChartCard>

      {/* SLA Detail Table */}
      <ChartCard title="SLA Breakdown by Priority" loading={incL}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8', borderBottom: '1px solid #E2E8F0' }}>
              {['Priority', 'Total Incidents', 'SLA Met', 'Breached', 'Compliance', 'Target'].map(h => (
                <th key={h} className="text-left pb-3 font-semibold pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slaTable.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-sm" style={{ color: '#94a3b8' }}>No SLA data for this period</td></tr>
            ) : slaTable.map((r: any) => (
              <tr key={r.priority} className="transition-colors" style={{ borderBottom: '1px solid #F1F5F9' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <td className="py-3 pr-4">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ color: P_COLORS[r.priority], background: P_COLORS[r.priority] + '15' }}>
                    {r.priority}
                  </span>
                </td>
                <td className="py-3 pr-4 font-mono font-semibold" style={{ color: '#6366f1' }}>{r.total}</td>
                <td className="py-3 pr-4 font-mono font-semibold" style={{ color: '#059669' }}>{r.met}</td>
                <td className="py-3 pr-4 font-mono font-semibold" style={{ color: '#DC2626' }}>{r.total - r.met}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                      <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 95 ? '#059669' : r.pct >= 85 ? '#D97706' : '#DC2626' }} />
                    </div>
                    <span className="text-[11px] font-bold font-mono" style={{ color: r.pct >= 95 ? '#059669' : r.pct >= 85 ? '#D97706' : '#DC2626' }}>
                      {r.pct}%
                    </span>
                  </div>
                </td>
                <td className="py-3 text-[11px]" style={{ color: '#94a3b8' }}>95%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}

// ─── TEAMS SECTION ─────────────────────────────────────────────────────────

function TeamsSection({ period }: { period: Period }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'team-performance', period],
    queryFn: async () => { const { data } = await api.get(`/reports/team-performance?period=${period}`); return data; },
    staleTime: 60000,
  });

  const teams: any[] = Array.isArray(data?.data?.teams) ? data.data.teams : [];
  const maxIncidents = Math.max(...teams.map(t => t.incident_count || 0), 1);
  const teamsWithMttr = teams.filter((t) => Number.isFinite(Number(t.avg_mttr_minutes)) && Number(t.avg_mttr_minutes) > 0);
  const bestMttr = teamsWithMttr.length > 0
    ? Math.min(...teamsWithMttr.map((t) => Number(t.avg_mttr_minutes)))
    : null;

  if (!isLoading && teams.length === 0) return <EmptySection title="Team Performance" />;

  return (
    <div className="space-y-6">
      {/* Team KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Total Teams', value: teams.length.toString(), icon: Users, color: 'bg-indigo-500' },
          { label: 'Total Assigned', value: fmt(teams.reduce((s, t) => s + (t.incident_count || 0), 0)), icon: AlertTriangle, color: 'bg-amber-500' },
          { label: 'Total Resolved', value: fmt(teams.reduce((s, t) => s + (t.resolved_count || 0), 0)), icon: CheckCircle2, color: 'bg-emerald-500' },
          { label: 'Best MTTR', value: fmtMttr(bestMttr), icon: Clock, color: 'bg-violet-500' },
        ].map(k => <KpiCard key={k.label} {...k} sub="" loading={isLoading} />)}
      </div>

      {/* Team performance table */}
      <ChartCard title="Team Performance" subtitle={`Incident resolution stats \u2014 ${period}`} loading={isLoading}>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : teams.length === 0 ? (
          <div className="py-12 text-center"><EmptyChart message="No team performance data for this period" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8', borderBottom: '1px solid #E2E8F0' }}>
                  {['Team', 'Incidents', 'Resolved', 'Avg MTTR', 'SLA Compliance', 'Resolution Rate'].map(h => (
                    <th key={h} className="text-left pb-3 font-semibold pr-6 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((t: any) => {
                  const name = t.team_name || '\u2013';
                  const assigned = t.incident_count || 0;
                  const resolved = t.resolved_count || 0;
                  const mttr = t.avg_mttr_minutes;
                  const sla = Number(t.sla_compliance) || 0;
                  const resPct = assigned > 0 ? Math.round((resolved / assigned) * 100) : 0;
                  return (
                    <tr key={name} className="transition-colors group" style={{ borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="py-3.5 pr-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                            style={{ background: '#E2E8F0', color: '#6366f1' }}>
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[12px]" style={{ color: '#0f172a' }}>{name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-6">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                            <div className="h-full rounded-full" style={{ width: `${(assigned / maxIncidents) * 100}%`, background: '#818cf8' }} />
                          </div>
                          <span className="font-mono text-[12px] font-bold" style={{ color: '#6366f1' }}>{assigned}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-6 font-mono text-[12px] font-bold" style={{ color: '#059669' }}>{resolved}</td>
                      <td className="py-3.5 pr-6 font-mono text-[11px]" style={{ color: '#64748b' }}>{fmtMttr(mttr)}</td>
                      <td className="py-3.5 pr-6">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                            <div className="h-full rounded-full" style={{ width: `${sla}%`, background: sla >= 95 ? '#059669' : sla >= 80 ? '#D97706' : '#DC2626' }} />
                          </div>
                          <span className="text-[11px] font-bold font-mono" style={{ color: sla >= 95 ? '#059669' : sla >= 80 ? '#D97706' : '#DC2626' }}>
                            {sla}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                          style={resPct >= 90
                            ? { background: 'rgba(5,150,105,0.15)', color: '#059669' }
                            : resPct >= 70
                            ? { background: 'rgba(217,119,6,0.15)', color: '#D97706' }
                            : { background: 'rgba(220,38,38,0.15)', color: '#DC2626' }
                          }>
                          {resPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* MTTR comparison bar */}
      {teamsWithMttr.length > 0 && (
        <ChartCard title="MTTR Comparison Across Teams" subtitle="Lower is better (minutes)">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamsWithMttr} layout="vertical"
                margin={{ top: 0, right: 30, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 60 ? `${Math.floor(v / 60)}h` : `${v}m`} />
                <YAxis dataKey="team_name" type="category" tick={{ fontSize: 10, fill: '#0f172a' }} tickLine={false} axisLine={false} width={78} />
                <Tooltip {...TT} formatter={(v: any) => [fmtMttr(v), 'Avg MTTR']} />
                <Bar dataKey="avg_mttr_minutes" radius={[0, 6, 6, 0]} barSize={14}>
                  {teamsWithMttr.map((_: any, i: number) => (
                    <Cell key={i} fill={`hsl(${270 - i * 15}, 70%, ${55 + i * 5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// ─── CHANGES SECTION ───────────────────────────────────────────────────────

function ChangesSection({ period }: { period: Period }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'changes', period],
    queryFn: async () => { const { data } = await api.get(`/reports/changes?period=${period}`); return data; },
    staleTime: 60000,
  });

  const d = data?.data || {};
  const successRate = d.successRate?.[0] || {};
  const byType = (d.byType || []).map((r: any, i: number) => ({
    name: r.type?.charAt(0) + r.type?.slice(1).toLowerCase(),
    value: r._count || 0,
    color: Object.values(CHANGE_COLORS)[i] || SOURCE_COLORS[i],
  }));
  const byState = (d.byState || []).map((r: any) => ({
    state: r.state?.replace(/_/g, ' '),
    count: r._count || 0,
    color: STATE_COLORS[r.state] || '#94a3b8',
  }));
  const byRisk = (d.byRisk || []).map((r: any) => ({
    risk: r.riskLevel,
    count: r._count || 0,
    color: r.riskLevel === 'HIGH' ? '#DC2626' : r.riskLevel === 'MEDIUM' ? '#D97706' : '#059669',
  }));

  const successPct = Number(successRate.success_rate) || 0;

  if (!isLoading && !d.total) return <EmptySection title="Change" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Total Changes', value: fmt(d.total), icon: GitMerge, color: 'bg-indigo-500' },
          { label: 'Completed', value: fmt(successRate.total_completed), icon: CheckCircle2, color: 'bg-emerald-500' },
          { label: 'Successful', value: fmt(successRate.successful), icon: TrendingUp, color: 'bg-violet-500' },
          { label: 'Success Rate', value: successPct ? `${successPct}%` : '\u2013', icon: Target, color: successPct >= 80 ? 'bg-emerald-500' : 'bg-amber-500' },
        ].map(k => <KpiCard key={k.label} {...k} sub="" loading={isLoading} />)}
      </div>

      {/* Success rate gauge */}
      <div className="rounded-2xl p-6 flex items-center gap-8"
        style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #E2E8F0 100%)', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Change Success Rate</p>
          <p className="text-[52px] font-extrabold font-mono leading-none" style={{ color: '#0f172a' }}>{successPct}%</p>
          <p className="text-sm mt-2" style={{ color: successPct >= 80 ? '#6EE7B7' : '#FCD34D' }}>
            {successPct >= 80 ? 'Above target' : 'Below 80% target'}
          </p>
        </div>
        <div className="h-16 w-px" style={{ background: '#E2E8F0' }} />
        <div className="flex gap-8 text-sm" style={{ color: '#64748b' }}>
          {[
            ['Total Completed', successRate.total_completed],
            ['Successful', successRate.successful],
            ['Failed/Cancelled', (successRate.total_completed || 0) - (successRate.successful || 0)],
          ].map(([l, v]) => (
            <div key={l as string}>
              <p className="text-2xl font-bold font-mono" style={{ color: '#0f172a' }}>{fmt(v as number)}</p>
              <p className="text-[11px]">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* By Type */}
        <ChartCard title="Changes by Type" loading={isLoading}>
          {byType.length > 0 ? (
            <>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={30} outerRadius={55} paddingAngle={3}>
                      {byType.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...TT} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-1">
                {byType.map((t: any) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#64748b' }}>
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.color }} />{t.name}
                    </span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: '#6366f1' }}>{t.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-40"><EmptyChart /></div>}
        </ChartCard>

        {/* By State */}
        <ChartCard title="Changes by State" loading={isLoading}>
          <div className="space-y-2.5 mt-1">
            {byState.length > 0 ? byState.map((s: any) => {
              const max = Math.max(...byState.map((x: any) => x.count), 1);
              return (
                <div key={s.state} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 shrink-0 truncate" style={{ color: '#64748b' }}>{s.state}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full" style={{ width: `${(s.count / max) * 100}%`, background: s.color }} />
                  </div>
                  <span className="font-mono text-[11px] font-bold w-5 text-right" style={{ color: '#6366f1' }}>{s.count}</span>
                </div>
              );
            }) : <EmptyChart message="No state data" />}
          </div>
        </ChartCard>

        {/* By Risk */}
        <ChartCard title="Changes by Risk Level" loading={isLoading}>
          <div className="space-y-4 mt-3">
            {byRisk.length > 0 ? byRisk.map((r: any) => (
              <div key={r.risk} className="flex items-center gap-3">
                <span className="text-[11px] font-bold w-16" style={{ color: r.color }}>{r.risk}</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(r.count / Math.max(...byRisk.map((x: any) => x.count), 1)) * 100}%`, background: r.color }} />
                </div>
                <span className="font-mono text-[12px] font-bold" style={{ color: '#6366f1' }}>{r.count}</span>
              </div>
            )) : <EmptyChart message="No risk data" />}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'sla', label: 'SLA', icon: Shield },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'changes', label: 'Changes', icon: GitMerge },
];

export default function ReportsDashboard() {
  const [section, setSection] = useState<Section>('overview');
  const [period, setPeriod] = useState<Period>('30d');

  const organization = useAuthStore((s) => s.organization);
  const selectedOrgId = useAuthStore((s) => s.selectedOrgId);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'ADMIN' && !user?.organizationId;

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => { const { data } = await api.get('/organizations?limit=50'); return data; },
    staleTime: 120000, enabled: isSuperAdmin,
  });
  const orgs = orgsData?.data || [];
  const selectedOrg = selectedOrgId ? orgs.find((o: any) => o.id === selectedOrgId) : null;
  const heroOrgName = selectedOrg?.name || organization?.name || null;
  const heroEnv: string = selectedOrg?.environment || organization?.environment || 'DEV';

  const envBadgeStyle: Record<string, React.CSSProperties> = {
    PROD: { background: 'rgba(5,150,105,0.15)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)' },
    DR:   { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
    UAT:  { background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' },
    DEV:  { background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' },
  };

  function handleExport() {
    const prev = document.title;
    document.title = `Argus Analytics \u2014 ${heroOrgName || 'All Orgs'} \u2014 ${period} \u2014 ${new Date().toLocaleDateString('en-IN')}`;
    window.print();
    document.title = prev;
  }

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      {/* ── HERO ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5"
        style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* 3px accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #4F46E5, #818CF8, #A5B4FC, transparent)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.15 }} />
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.45) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.35) 0%, transparent 70%)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(79,70,229,0.20)', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
                  <BarChart3 size={20} style={{ color: '#A5B4FC' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#A5B4FC' }}>Analytics</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                    <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>Reports</span>
                  </div>
                  <h1 className="font-display text-[22px] font-bold tracking-tight" style={{ color: '#ffffff' }}>
                    Reports & Analytics
                  </h1>
                </div>
                {heroOrgName && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    {heroOrgName}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase"
                  style={envBadgeStyle[heroEnv] || envBadgeStyle.DEV}>
                  {heroEnv}
                </span>
              </div>
              <p className="text-[12px] ml-[50px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Operational intelligence across Incidents, SLA, Teams, and Changes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg p-0.5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                {(['7d', '30d', '90d'] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
                    style={period === p
                      ? { background: 'rgba(255,255,255,0.2)', color: '#ffffff' }
                      : { color: 'rgba(255,255,255,0.5)' }}
                    onMouseEnter={(e) => { if (period !== p) (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { if (period !== p) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}>
                    {p}
                  </button>
                ))}
              </div>
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <Download size={13} /> Export PDF
              </button>
            </div>
          </div>

          {/* Hero KPI summary cards */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { icon: Activity, label: 'Incidents', sub: `Last ${period}` },
              { icon: Shield, label: 'SLA Compliance', sub: 'All priorities' },
              { icon: Users, label: 'Team Performance', sub: 'Active teams' },
              { icon: GitMerge, label: 'Changes', sub: 'Tracked changes' },
            ].map((card, i) => (
              <div key={i} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className="w-3.5 h-3.5" style={{ color: '#A5B4FC' }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{card.label}</span>
                </div>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Gradient divider */}
      <div className="h-0.5 -mt-5 mb-5" style={{ background: 'linear-gradient(90deg, #4F46E5, #818CF8, #A5B4FC, transparent)' }} />

      {/* ── LAYOUT: sidebar + content ── */}
      <div className="flex gap-5">
        {/* Left nav */}
        <aside className="w-[168px] shrink-0">
          <nav className="rounded-2xl overflow-hidden sticky top-4"
            style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}>
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #E2E8F0' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Sections</p>
            </div>
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setSection(id)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-semibold transition-all group"
                style={section === id
                  ? { background: '#F1F5F9', color: '#4F46E5', borderRight: '2px solid #4F46E5' }
                  : { color: '#94a3b8' }}
                onMouseEnter={(e) => { if (section !== id) { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.color = '#64748b'; } }}
                onMouseLeave={(e) => { if (section !== id) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; } }}>
                <Icon size={13} style={{ color: section === id ? '#4F46E5' : '#cbd5e1' }} />
                {label}
                {section === id && <ChevronRight size={10} className="ml-auto" style={{ color: '#4F46E5' }} />}
              </button>
            ))}
            <div className="px-3 py-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              <p className="text-[9px] text-center" style={{ color: '#cbd5e1' }}>Argus Analytics v2</p>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {section === 'overview'  && <OverviewSection  period={period} />}
          {section === 'incidents' && <IncidentsSection period={period} />}
          {section === 'sla'       && <SLASection       period={period} />}
          {section === 'teams'     && <TeamsSection     period={period} />}
          {section === 'changes'   && <ChangesSection   period={period} />}
        </main>
      </div>
    </div>
  );
}
