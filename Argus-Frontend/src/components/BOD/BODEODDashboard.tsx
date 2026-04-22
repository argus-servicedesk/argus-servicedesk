// BOD/EOD Operations Dashboard — matches DashboardOverview design system

import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Activity, CheckCircle, AlertTriangle, XCircle,
  Globe, RefreshCw,
  ChevronRight, ChevronDown,
  Maximize2, Minimize2, Eye,
} from 'lucide-react';
import { useBodEodOverview } from '../../hooks/useBodEod';
import type { BodEodItem, BodEodSubItem, UrlHealthItem } from '../../hooks/useBodEod';

/* ===================================================================
   DESIGN SYSTEM — matches DashboardOverview T constants
   =================================================================== */
const T = {
  pageBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  panelBg: '#FFFFFF',
  panelBorder: '#E2E8F0',
  panelHeaderBg: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  divider: '#E2E8F0',
  heroBg: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)',
  // Accents
  indigo: '#4F46E5',
  violet: '#7C3AED',
  emerald: '#059669',
  amber: '#D97706',
  crimson: '#DC2626',
  blue: '#2563EB',
  cyan: '#0891B2',
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
} as const;

/* ===================================================================
   HELPERS
   =================================================================== */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTimestamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  } catch {
    return dateStr;
  }
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + '...' : u.pathname;
    return u.hostname + path;
  } catch {
    return url.length > 50 ? url.slice(0, 50) + '...' : url;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'UP': return T.emerald;
    case 'WARNING': return T.amber;
    case 'CRITICAL': return T.crimson;
    default: return T.textMuted;
  }
}

function getSubStatusColor(statusCode: number): string {
  switch (statusCode) {
    case 2: return T.emerald;
    case 1: return T.amber;
    case 0: return T.crimson;
    default: return T.textMuted;
  }
}

function getSubStatusLabel(sub: BodEodSubItem): string {
  if (sub.isSuccess) return 'OK';
  if (sub.status === 0) return 'FAIL';
  if (sub.status === 1) return 'WARN';
  return 'N/A';
}

function getWorstColor(items: BodEodItem[]): string {
  if (items.some(i => i.status === 'CRITICAL')) return T.crimson;
  if (items.some(i => i.status === 'WARNING')) return T.amber;
  if (items.length > 0 && items.every(i => i.status === 'UP')) return T.emerald;
  return T.textMuted;
}

function countOk(items: BodEodItem[]): number {
  return items.filter(i => i.status === 'UP').length;
}

/* ===================================================================
   LIVE PULSE
   =================================================================== */
function LivePulse({ color = T.emerald, size = 7 }: { color?: string; size?: number }) {
  return (
    <span className="relative flex flex-shrink-0" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color }} />
    </span>
  );
}

/* ===================================================================
   STATUS DOT
   =================================================================== */
function StatusDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span className="inline-block rounded-full flex-shrink-0" style={{ width: size, height: size, background: color }} />
  );
}

/* ===================================================================
   PANEL COMPONENT — matches DashboardOverview Panel
   =================================================================== */
function Panel({ title, titleIcon, titleExtra, actions, children, accentColor, noPad = false }: {
  title: React.ReactNode;
  titleIcon?: React.ReactNode;
  titleExtra?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  accentColor?: string;
  noPad?: boolean;
}) {
  return (
    <div className="rounded-xl overflow-hidden relative"
      style={{ background: T.panelBg, border: `1px solid ${T.panelBorder}`, boxShadow: T.cardShadow }}>
      {accentColor && <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ background: T.panelHeaderBg, borderBottom: `1px solid ${T.divider}` }}>
        <div className="flex items-center gap-2">
          {titleIcon}
          <span className="text-[13px] font-bold tracking-tight" style={{ color: T.text }}>{title}</span>
          {titleExtra}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className={noPad ? '' : 'px-5 py-4'}>{children}</div>
    </div>
  );
}

/* ===================================================================
   KPI CARD
   =================================================================== */
function KPICard({ label, ok, total, accentColor }: { label: string; ok: number; total: number; accentColor: string }) {
  const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
  return (
    <div className="rounded-xl px-4 py-4 relative overflow-hidden"
      style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: T.textMuted }}>{label}</div>
      <div className="flex items-end gap-2">
        <div className="text-[26px] font-black font-mono leading-none" style={{ color: T.text }}>{ok}/{total}</div>
        <div className="text-[13px] font-bold font-mono pb-0.5" style={{ color: accentColor }}>{pct}%</div>
      </div>
      <div className="mt-2" style={{ height: 4, background: T.divider, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: accentColor, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

/* ===================================================================
   EXPANDED SUB-ITEMS
   =================================================================== */
function SubItemsPanel({ item }: { item: BodEodItem }) {
  const subItems = (item.data || []) as BodEodSubItem[];
  const sorted = [...subItems].sort((a, b) => a.status - b.status);

  return (
    <div style={{ background: '#EFF6FF', padding: '8px 12px 10px 44px', borderBottom: `1px solid ${T.divider}` }}>
      {item.executedOn && (
        <div className="mb-2 flex items-center gap-3">
          <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textMuted }}>
            Executed: {formatTimestamp(item.executedOn)}
          </span>
          {item.message && (
            <span style={{ fontSize: 10, color: T.textSecondary }}>{item.message}</span>
          )}
        </div>
      )}
      {sorted.map((sub, idx) => {
        const dotColor = getSubStatusColor(sub.status);
        const label = getSubStatusLabel(sub);
        return (
          <div key={idx} className="flex items-center gap-3"
            style={{ padding: '4px 8px', fontSize: 11, borderBottom: idx < sorted.length - 1 ? `1px solid ${T.divider}` : 'none' }}>
            <StatusDot color={dotColor} size={6} />
            <span style={{ fontWeight: 600, color: T.text, minWidth: 100 }}>{sub.segment}</span>
            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: dotColor, minWidth: 36 }}>{label}</span>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted }}>{sub.detail || '--'}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ===================================================================
   MONITOR TABLE ROW
   =================================================================== */
function MonitorRow({ item, isExpanded, onToggle }: {
  item: BodEodItem; isExpanded: boolean; onToggle: () => void;
}) {
  const statusColor = getStatusColor(item.status);
  const hasSubItems = Array.isArray(item.data) && item.data.length > 0;
  const subItems = (item.data || []) as BodEodSubItem[];
  const okCount = subItems.filter(s => s.isSuccess || s.status === 2).length;
  const totalSub = subItems.length;
  const warnCount = subItems.filter(s => s.status === 1).length;
  const failCount = subItems.filter(s => s.status === 0).length;

  return (
    <>
      <tr
        style={{
          cursor: hasSubItems ? 'pointer' : 'default',
          borderBottom: `1px solid ${T.divider}`,
          borderLeft: isExpanded ? `3px solid ${T.indigo}` : '3px solid transparent',
        }}
        onClick={() => hasSubItems && onToggle()}
        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#EFF6FF'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
      >
        <td style={{ padding: '7px 12px', width: 36 }}>
          <StatusDot color={statusColor} />
        </td>
        <td style={{ padding: '7px 4px', width: 24 }}>
          {hasSubItems ? (
            isExpanded
              ? <ChevronDown size={13} style={{ color: T.indigo }} />
              : <ChevronRight size={13} style={{ color: T.textMuted }} />
          ) : null}
        </td>
        <td style={{ padding: '7px 8px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.name}</span>
        </td>
        <td style={{ padding: '7px 8px' }}>
          {totalSub > 0 ? (
            <span style={{ fontSize: 11, fontFamily: T.mono }}>
              <span style={{ color: T.emerald, fontWeight: 700 }}>{okCount}/{totalSub} OK</span>
              {warnCount > 0 && <span style={{ color: T.amber, marginLeft: 6 }}>{warnCount} warn</span>}
              {failCount > 0 && <span style={{ color: T.crimson, marginLeft: 6 }}>{failCount} fail</span>}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: T.textMuted }}>--</span>
          )}
        </td>
        <td style={{ padding: '7px 8px' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            color: statusColor, background: `${statusColor}10`,
            padding: '2px 7px', borderRadius: 4,
          }}>
            {item.status}
          </span>
        </td>
        <td style={{ padding: '7px 8px' }}>
          <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textMuted }}>
            {item.lastUpdated ? timeAgo(item.lastUpdated) : '--'}
          </span>
        </td>
      </tr>
      {isExpanded && hasSubItems && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <SubItemsPanel item={item} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ===================================================================
   MONITOR TABLE
   =================================================================== */
function MonitorTable({ items, allExpanded }: { items: BodEodItem[]; allExpanded: boolean }) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (allExpanded) {
      setExpandedKeys(new Set(items.map((item, idx) => item.key || `row-${idx}`)));
    } else {
      setExpandedKeys(new Set());
    }
  }, [allExpanded, items]);

  const toggleRow = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10" style={{ color: T.textMuted }}>
        <Activity size={24} style={{ opacity: 0.3 }} />
        <p style={{ fontSize: 12 }}>No items to display</p>
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: T.panelHeaderBg }}>
          {['', '', 'CHECK', 'SUB-CHECKS', 'STATUS', 'LAST RUN'].map((h, i) => (
            <th key={i} style={{
              padding: '7px 12px',
              textAlign: 'left',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: T.textMuted,
              borderBottom: `1px solid ${T.divider}`,
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const rowKey = item.key || `row-${idx}`;
          return (
            <MonitorRow
              key={rowKey}
              item={item}
              isExpanded={expandedKeys.has(rowKey)}
              onToggle={() => toggleRow(rowKey)}
            />
          );
        })}
      </tbody>
    </table>
  );
}

/* ===================================================================
   URL HEALTH CARDS
   =================================================================== */
function UrlHealthGrid({ items }: { items: UrlHealthItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((item, idx) => {
        const code = item.httpStatus ?? item.statusCode;
        const isHealthy = code >= 200 && code < 300;
        const codeColor = isHealthy ? T.emerald : code >= 400 ? T.crimson : T.amber;
        return (
          <div key={item.url + idx} className="rounded-xl relative overflow-hidden"
            style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow, padding: '12px 14px' }}>
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: codeColor }} />
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                {(item as any).name || 'Endpoint'}
              </span>
              <span style={{ fontSize: 18, fontWeight: 900, fontFamily: T.mono, color: codeColor }}>{code}</span>
            </div>
            <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textMuted, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {shortenUrl(item.url)}
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textSecondary }}>
                {item.responseTime !== null ? `${item.responseTime}ms` : '--'}
              </span>
              <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textMuted }}>{(item as any).ip || ''}</span>
            </div>
            {item.responseTime !== null && (
              <div style={{ marginTop: 8, height: 4, background: T.divider, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((item.responseTime / 2000) * 100, 100)}%`,
                  background: item.responseTime < 500 ? T.emerald : item.responseTime < 1000 ? T.amber : T.crimson,
                  borderRadius: 2,
                }} />
              </div>
            )}
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="col-span-full flex flex-col items-center gap-2 py-10" style={{ color: T.textMuted }}>
          <Globe size={24} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: 12 }}>No URL health data</p>
        </div>
      )}
    </div>
  );
}

/* ===================================================================
   MAIN COMPONENT
   =================================================================== */
export default function BODEODDashboard() {
  const { data, isLoading, error } = useBodEodOverview();
  const [activeTab, setActiveTab] = useState<'bod' | 'adp' | 'eod' | 'urls'>('bod');
  const [liveUpdate, setLiveUpdate] = useState(true);
  const [allExpanded, setAllExpanded] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const overview = data?.data;
  const bodItems = overview?.bod || [];
  const eodItems = overview?.eod || [];
  const adpItems = overview?.adp || [];
  const urlHealth = overview?.urlHealth || [];

  const allItems = useMemo(() => [...bodItems, ...eodItems, ...adpItems], [bodItems, eodItems, adpItems]);
  const totalChecks = allItems.length;
  const healthyCount = allItems.filter(i => i.status === 'UP').length;
  const healthPct = totalChecks > 0 ? Math.round((healthyCount / totalChecks) * 100) : 0;

  const currentItems = activeTab === 'bod' ? bodItems : activeTab === 'adp' ? adpItems : activeTab === 'eod' ? eodItems : [];
  const urlsHealthy = urlHealth.filter(u => { const c = u.httpStatus ?? u.statusCode; return c >= 200 && c < 300; }).length;

  const systemStatus = healthPct >= 90
    ? { label: 'All Systems Operational', color: '#6EE7B7' }
    : healthPct >= 70
    ? { label: 'Elevated Issues', color: '#FCD34D' }
    : { label: 'Critical Issues Detected', color: '#FCA5A5' };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.pageBg }}>
        <Activity size={24} className="animate-pulse" style={{ color: T.indigo }} />
        <span className="ml-3" style={{ fontSize: 13, color: T.textSecondary }}>Loading operations data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.pageBg }}>
        <XCircle size={24} style={{ color: T.crimson }} />
        <span className="ml-3" style={{ fontSize: 13, color: T.textSecondary }}>Failed to load operations data</span>
      </div>
    );
  }

  if (overview?.needsSetup || totalChecks === 0) {
    return (
      <div style={{ background: T.pageBg, minHeight: '100vh' }}>
        <div className="relative rounded-2xl overflow-hidden mx-4 mt-4" style={{ background: T.heroBg }}>
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #4F46E5, #818CF8, #A5B4FC, transparent)' }} />
          <div className="relative px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.20)' }}>
                <Activity size={20} style={{ color: '#A5B4FC' }} />
              </div>
              <div>
                <h1 className="text-[22px] font-bold" style={{ color: '#ffffff' }}>BOD / EOD Operations</h1>
                <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Beginning & End of Day health checks</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Globe size={28} style={{ color: '#6366f1' }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#0f172a' }}>Monitoring Not Configured</h3>
          <p className="text-sm max-w-md mb-4" style={{ color: '#64748b' }}>
            {overview?.setupMessage || 'BOD/EOD monitoring requires a configured integration. Set up Prometheus or Kubernetes monitoring in Settings > Integrations to see real health checks here.'}
          </p>
          <a href="/integrations" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6366f1' }}>
            Configure Integrations
          </a>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'bod' as const, label: 'Beginning of Day', count: bodItems.length, color: T.blue },
    { key: 'adp' as const, label: 'Adhoc Processes', count: adpItems.length, color: T.violet },
    { key: 'eod' as const, label: 'End of Day', count: eodItems.length, color: T.cyan },
    { key: 'urls' as const, label: 'URL Health', count: urlHealth.length, color: T.emerald },
  ];

  const currentTabColor = tabs.find(t => t.key === activeTab)?.color || T.indigo;

  return (
    <div className="space-y-5 animate-fade-in min-h-screen -m-4 p-5" style={{ background: T.pageBg }}>

      {/* ═══════════════════════════════════════════════
          HERO BANNER
          ═══════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: T.heroBg }}>
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
          style={{ background: 'rgba(79,70,229,0.2)' }} />
        <div className="absolute -bottom-16 right-8 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
          style={{ background: 'rgba(5,150,105,0.15)' }} />

        <div className="relative px-6 pt-5 pb-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: identity */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #059669)', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
                <Eye size={20} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-extrabold tracking-tight text-white">Daily Operations Checklist</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-widest"
                    style={{ color: systemStatus.color, border: `1px solid ${systemStatus.color}40`, background: `${systemStatus.color}20` }}>
                    {systemStatus.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {totalChecks} monitors · {healthPct}% healthy
                  </p>
                  {liveUpdate && (
                    <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
                      30s refresh
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
              <button
                onClick={() => setLiveUpdate(!liveUpdate)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  border: `1px solid ${liveUpdate ? 'rgba(110,231,183,0.5)' : 'rgba(255,255,255,0.15)'}`,
                  color: liveUpdate ? '#6EE7B7' : 'rgba(255,255,255,0.5)',
                  background: liveUpdate ? 'rgba(110,231,183,0.1)' : 'transparent',
                }}>
                {liveUpdate ? 'Auto' : 'Paused'}
              </button>
              <button
                onClick={() => setAllExpanded(!allExpanded)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', background: 'transparent' }}>
                {allExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="BOD Checks" ok={countOk(bodItems)} total={bodItems.length} accentColor={T.blue} />
        <KPICard label="ADP Processes" ok={countOk(adpItems)} total={adpItems.length} accentColor={T.violet} />
        <KPICard label="EOD Checks" ok={countOk(eodItems)} total={eodItems.length} accentColor={T.cyan} />
        <KPICard
          label="URL Health"
          ok={urlsHealthy}
          total={urlHealth.length}
          accentColor={urlsHealthy === urlHealth.length && urlHealth.length > 0 ? T.emerald : T.amber}
        />
      </div>

      {/* TAB NAV */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 rounded-lg transition-all text-[12px] font-semibold flex items-center gap-1.5"
              style={{
                color: isActive ? '#FFFFFF' : T.textSecondary,
                background: isActive ? tab.color : 'transparent',
              }}
            >
              {tab.label}
              <span className="text-[10px] rounded-full px-1.5 py-0.5"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : T.pageBg,
                  color: isActive ? '#fff' : T.textMuted,
                }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      {activeTab !== 'urls' ? (
        <Panel
          title={activeTab === 'bod' ? 'Beginning of Day Checks' : activeTab === 'adp' ? 'Automated Data Processes' : 'End of Day Checks'}
          titleIcon={<Activity size={14} style={{ color: currentTabColor }} />}
          titleExtra={
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: `${currentTabColor}12`, color: currentTabColor }}>
              {currentItems.length} monitors
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              {currentItems.filter(i => i.status === 'UP').length > 0 && (
                <span className="flex items-center gap-1 text-[10px]">
                  <CheckCircle size={11} style={{ color: T.emerald }} />
                  <span style={{ color: T.emerald, fontWeight: 600 }}>{currentItems.filter(i => i.status === 'UP').length}</span>
                </span>
              )}
              {currentItems.filter(i => i.status === 'WARNING').length > 0 && (
                <span className="flex items-center gap-1 text-[10px]">
                  <AlertTriangle size={11} style={{ color: T.amber }} />
                  <span style={{ color: T.amber, fontWeight: 600 }}>{currentItems.filter(i => i.status === 'WARNING').length}</span>
                </span>
              )}
              {currentItems.filter(i => i.status === 'CRITICAL').length > 0 && (
                <span className="flex items-center gap-1 text-[10px]">
                  <XCircle size={11} style={{ color: T.crimson }} />
                  <span style={{ color: T.crimson, fontWeight: 600 }}>{currentItems.filter(i => i.status === 'CRITICAL').length}</span>
                </span>
              )}
            </div>
          }
          accentColor={currentTabColor}
          noPad
        >
          <MonitorTable items={currentItems} allExpanded={allExpanded} />
        </Panel>
      ) : (
        <Panel
          title="URL Health Monitor"
          titleIcon={<Globe size={14} style={{ color: T.emerald }} />}
          titleExtra={
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: '#ECFDF5', color: T.emerald }}>
              {urlHealth.length} endpoints
            </span>
          }
          accentColor={T.emerald}
        >
          <UrlHealthGrid items={urlHealth} />
        </Panel>
      )}
    </div>
  );
}
