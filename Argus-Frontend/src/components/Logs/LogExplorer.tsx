import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, RefreshCw, Terminal, Clock, AlertTriangle,
  Filter, Download, Loader2, X, ChevronRight, FileText,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectSeverity(msg: string): 'error' | 'warn' | 'debug' | 'info' {
  if (/error|err|fatal|panic|exception|crit/i.test(msg)) return 'error';
  if (/warn|warning/i.test(msg)) return 'warn';
  if (/debug|trace/i.test(msg)) return 'debug';
  return 'info';
}

function formatNanoTs(ns: string) {
  try {
    const ms = Number(BigInt(ns) / BigInt(1_000_000));
    const d = new Date(ms);
    return d.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch { return ns?.slice(0, 19) || ''; }
}

function highlightSearch(text: string, search: string) {
  if (!search.trim()) return <>{text}</>;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === search.toLowerCase()
          ? <mark key={i} style={{ background: 'rgba(168,85,247,0.3)', color: '#a855f7', borderRadius: '2px', padding: '0 2px' }}>{part}</mark>
          : part
      )}
    </>
  );
}

// Static severity style lookups
function sevBadgeStyle(sev: string): React.CSSProperties {
  if (sev === 'error') return { background: 'rgba(239,68,68,0.2)', color: '#DC2626' };
  if (sev === 'warn')  return { background: 'rgba(245,158,11,0.2)', color: '#D97706' };
  if (sev === 'debug') return { background: 'rgba(99,102,241,0.15)', color: '#64748b' };
  return { background: 'rgba(99,102,241,0.12)', color: '#6366f1' };
}

function sevRowBg(sev: string): string {
  if (sev === 'error') return 'rgba(239,68,68,0.06)';
  if (sev === 'warn')  return 'rgba(245,158,11,0.04)';
  return 'transparent';
}

function sevTextColor(sev: string): string {
  if (sev === 'error') return '#FCA5A5';
  if (sev === 'warn')  return '#FCD34D';
  if (sev === 'debug') return '#94a3b8';
  return '#6366f1';
}

// ── Stat Card (glassmorphic inside dark hero) ─────────────────────────────────
function SevCard({
  label, count, colorStyle, active, onClick,
}: {
  label: string; count: number; colorStyle: React.CSSProperties; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-4 transition-all duration-200 backdrop-blur-sm"
      style={active
        ? { background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 0 20px rgba(245,158,11,0.15)' }
        : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
      <p className="font-display text-3xl font-extrabold" style={colorStyle}>{count}</p>
      {active && (
        <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <X size={9} /> Clear filter
        </p>
      )}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════
const SINCE_OPTS = ['15m', '1h', '6h', '24h', '7d'] as const;
const LIMIT_OPTS = [100, 500, 1000, 2000] as const;

export default function LogExplorer() {
  const { selectedOrgId } = useAuthStore();
  const headers = selectedOrgId ? { 'X-Organization-Id': selectedOrgId } : {};

  const [since, setSince] = useState<string>('1h');
  const [limit, setLimit] = useState(500);
  const [queryInput, setQueryInput] = useState('{}');
  const [activeQuery, setActiveQuery] = useState('{}');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch, error: queryError } = useQuery({
    queryKey: ['loki-logs', selectedOrgId, activeQuery, since, limit],
    queryFn: () =>
      api.get('/k8s/logs', { headers, params: { query: activeQuery, since, limit, direction: 'backward' } })
        .then(r => r.data.data),
    retry: 1,
    refetchInterval: 15000,
  });

  const { data: labelsData } = useQuery({
    queryKey: ['loki-labels', selectedOrgId],
    queryFn: () => api.get('/k8s/logs/labels', { headers }).then(r => r.data.data),
    staleTime: 60000,
  });

  const { data: labelValuesData } = useQuery({
    queryKey: ['loki-label-values', selectedOrgId, selectedLabel],
    queryFn: () => api.get(`/k8s/logs/labels/${selectedLabel}/values`, { headers }).then(r => r.data.data),
    enabled: !!selectedLabel,
    staleTime: 30000,
  });

  const runQuery = useCallback(() => setActiveQuery(queryInput), [queryInput]);

  const injectLabel = (label: string, value: string) => {
    const kv = `${label}="${value}"`;
    if (queryInput.includes(kv)) return;
    const updated = queryInput.replace(/}$/, `, ${kv}}`).replace('{, ', '{');
    setQueryInput(updated);
  };

  const logs: any[] = data?.logs || [];
  const filteredLogs = logs.filter(l => {
    if (search && !l.message?.toLowerCase().includes(search.toLowerCase())) return false;
    if (severityFilter && detectSeverity(l.message) !== severityFilter) return false;
    return true;
  });

  const counts = { error: 0, warn: 0, info: 0, debug: 0 };
  for (const l of logs) { const s = detectSeverity(l.message); counts[s as keyof typeof counts]++; }

  const handleExport = () => {
    const txt = filteredLogs.map(l => `${formatNanoTs(l.timestamp)}  ${l.message}`).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([txt], { type: 'text/plain' })),
      download: `linkedeye-logs-${new Date().toISOString().slice(0, 19)}.txt`,
    });
    a.click();
  };

  return (
    <div className="animate-fade-in space-y-0">

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        {/* Indigo glow blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full -translate-y-1/3 translate-x-1/4" style={{ background: 'rgba(79,70,229,0.30)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full translate-y-1/2 -translate-x-1/4" style={{ background: 'rgba(79,70,229,0.20)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/3 left-1/3 w-48 h-48 rounded-full" style={{ background: 'rgba(79,70,229,0.12)', filter: 'blur(80px)' }} />

        <div className="relative px-6 pt-6 pb-16">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Terminal size={17} style={{ color: '#A5B4FC' }} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight leading-none" style={{ color: '#ffffff' }}>Log Analytics</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: '#A5B4FC', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>LOKI</span>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>LogQL · SSH-proxied · {since} window</span>
                  </div>
                </div>
              </div>
              <p className="text-xs ml-[48px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Real-time log search across infrastructure · auto-refresh 15s
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExport}
                disabled={filteredLogs.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                style={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <Download size={13} /> Export
              </button>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* Severity stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <SevCard label="Errors"   count={counts.error} colorStyle={{ color: '#FCA5A5' }} active={severityFilter === 'error'} onClick={() => setSeverityFilter(severityFilter === 'error' ? null : 'error')} />
            <SevCard label="Warnings" count={counts.warn}  colorStyle={{ color: '#FCD34D' }} active={severityFilter === 'warn'}  onClick={() => setSeverityFilter(severityFilter === 'warn'  ? null : 'warn')}  />
            <SevCard label="Info"     count={counts.info}  colorStyle={{ color: '#A5B4FC' }} active={severityFilter === 'info'}  onClick={() => setSeverityFilter(severityFilter === 'info'  ? null : 'info')}  />
            <SevCard label="Debug"    count={counts.debug} colorStyle={{ color: 'rgba(255,255,255,0.5)' }} active={severityFilter === 'debug'} onClick={() => setSeverityFilter(severityFilter === 'debug' ? null : 'debug')} />
          </div>
        </div>
      </div>

      {/* Indigo accent line */}
      <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #4F46E5, #818CF8, #C7D2FE, transparent)' }} />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* QUERY BAR (floating)                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="-mt-3 relative z-10 backdrop-blur-xl rounded-xl p-3 mb-3" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="flex flex-wrap items-center gap-2">
          {/* LogQL input */}
          <div className="flex-1 min-w-[260px] relative">
            <Terminal size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              value={queryInput}
              onChange={e => setQueryInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runQuery()}
              placeholder='{} or {namespace="my-ns"} or {app="my-app"}'
              className="w-full pl-8 pr-3 py-2 text-[12px] rounded-lg font-mono focus:outline-none"
              style={{ border: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.04)', color: '#0f172a' }}
            />
          </div>

          {/* Run */}
          <button
            onClick={runQuery}
            className="flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 4px 20px rgba(99,102,241,0.5)' }}
          >
            <Search size={12} /> Run
          </button>

          {/* Label browser toggle */}
          <button
            onClick={() => setShowLabels(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={showLabels
              ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', border: '1px solid rgba(99,102,241,0.5)' }
              : { background: 'rgba(99,102,241,0.04)', color: '#64748b', border: '1px solid rgba(99,102,241,0.12)' }
            }
          >
            <Filter size={12} /> Labels
          </button>

          {/* Time range */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'rgba(99,102,241,0.06)' }}>
            {SINCE_OPTS.map(opt => (
              <button
                key={opt}
                onClick={() => setSince(opt)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
                style={since === opt
                  ? { background: 'rgba(99,102,241,0.2)', color: '#6366f1' }
                  : { color: '#94a3b8' }
                }
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Limit */}
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="text-[11px] rounded-lg px-2 py-1.5 font-mono focus:outline-none"
            style={{ border: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.04)', color: '#0f172a' }}
          >
            {LIMIT_OPTS.map(n => <option key={n} value={n} style={{ background: '#ffffff' }}>{n} lines</option>)}
          </select>

          {/* Live dot */}
          <div className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: '#94a3b8' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />
            Live · 15s
          </div>
        </div>

        {/* Quick query presets */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
          <span className="text-[10px] uppercase tracking-wider font-medium shrink-0" style={{ color: '#94a3b8' }}>Quick:</span>
          {[
            { label: 'All logs', q: '{}' },
            { label: 'Errors only', q: '{} |= "error"' },
            { label: 'Warnings', q: '{} |= "warn"' },
            { label: 'kube-system', q: '{namespace="kube-system"}' },
            { label: 'linkedeye-inc', q: '{namespace="linkedeye-inc"}' },
          ].map(p => (
            <button
              key={p.q}
              onClick={() => { setQueryInput(p.q); setActiveQuery(p.q); }}
              className="px-2 py-0.5 rounded text-[11px] font-mono transition-colors"
              style={activeQuery === p.q
                ? { background: 'rgba(99,102,241,0.12)', color: '#a855f7', border: '1px solid rgba(99,102,241,0.3)' }
                : { background: 'rgba(99,102,241,0.04)', color: '#64748b', border: '1px solid rgba(99,102,241,0.12)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Active filters row */}
        {(severityFilter || search) && (
          <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#94a3b8' }}>Filters:</span>
            {severityFilter && (
              <button
                onClick={() => setSeverityFilter(null)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff' }}
              >
                {severityFilter} <X size={10} />
              </button>
            )}
            {search && (
              <button
                onClick={() => setSearch('')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                "{search}" <X size={10} />
              </button>
            )}
            <span className="text-[10px]" style={{ color: '#94a3b8' }}>{filteredLogs.length} / {logs.length} entries</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LABEL BROWSER                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showLabels && (
        <div className="rounded-xl p-4 mb-3 animate-fade-in" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Filter size={13} style={{ color: '#a855f7' }} />
            <span className="font-display text-sm font-semibold" style={{ color: '#0f172a' }}>Label Browser</span>
            <span className="text-[10px] ml-1" style={{ color: '#94a3b8' }}>Click a value to add it to the query</span>
          </div>
          <div className="flex gap-4">
            {/* Label names */}
            <div className="w-44 pr-4 shrink-0" style={{ borderRight: '1px solid rgba(99,102,241,0.08)' }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#94a3b8' }}>Labels</p>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {(labelsData?.labels || []).map((lbl: string) => (
                  <button
                    key={lbl}
                    onClick={() => setSelectedLabel(lbl)}
                    className="flex items-center gap-1 w-full text-left px-2 py-1 rounded text-[12px] font-mono transition-colors"
                    style={selectedLabel === lbl
                      ? { background: 'rgba(99,102,241,0.12)', color: '#a855f7' }
                      : { color: '#64748b' }
                    }
                    onMouseEnter={e => { if (selectedLabel !== lbl) e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                    onMouseLeave={e => { if (selectedLabel !== lbl) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {selectedLabel === lbl && <ChevronRight size={10} />}
                    {lbl}
                  </button>
                ))}
                {!(labelsData?.labels?.length) && (
                  <p className="text-[11px] px-2" style={{ color: '#94a3b8' }}>No labels. Ensure Loki is running on port 3100.</p>
                )}
              </div>
            </div>
            {/* Values */}
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#94a3b8' }}>
                Values {selectedLabel && <span className="normal-case font-mono" style={{ color: '#a855f7' }}>({selectedLabel})</span>}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {selectedLabel && (labelValuesData?.values || []).map((val: string) => (
                  <button
                    key={val}
                    onClick={() => injectLabel(selectedLabel, val)}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-colors"
                    style={{ background: 'rgba(99,102,241,0.06)', color: '#64748b', border: '1px solid rgba(99,102,241,0.12)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.color = '#a855f7'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)'; }}
                  >
                    {val}
                  </button>
                ))}
                {!selectedLabel && <p className="text-[11px]" style={{ color: '#94a3b8' }}>Select a label</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SEARCH BAR                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Client-side filter — search within results..."
          className="w-full pl-9 pr-4 py-2.5 text-[12px] rounded-xl font-mono focus:outline-none"
          style={{ border: '1px solid rgba(99,102,241,0.12)', background: '#ffffff', color: '#0f172a' }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LOG OUTPUT                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 0 40px rgba(99,102,241,0.1)' }}>
        {/* Terminal header bar */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            {/* Traffic light dots */}
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.6)' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(245,158,11,0.6)' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(16,185,129,0.6)' }} />
            </div>
            <div className="w-px h-4" style={{ background: 'rgba(99,102,241,0.15)' }} />
            <Terminal size={12} style={{ color: '#a855f7' }} />
            <span className="text-[12px] font-mono" style={{ color: '#94a3b8' }}>
              {activeQuery}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: '#cbd5e1' }}>
            <span>{filteredLogs.length} lines</span>
            <span>·</span>
            <span>{since}</span>
            {isFetching && <Loader2 size={12} className="animate-spin" style={{ color: '#a855f7' }} />}
          </div>
        </div>

        {/* Log lines */}
        <div className="overflow-auto max-h-[680px]">
          {isLoading ? (
            <div className="py-24 text-center">
              <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: '#a855f7' }} />
              <p className="text-sm font-mono" style={{ color: '#94a3b8' }}>Querying Loki via SSH...</p>
            </div>
          ) : queryError ? (
            <div className="py-20 text-center px-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={24} style={{ color: '#EF4444' }} />
              </div>
              <p className="font-semibold mb-1" style={{ color: '#64748b' }}>
                {!selectedOrgId ? 'No Organization Selected' : 'Log Query Failed'}
              </p>
              <p className="text-sm max-w-sm mx-auto" style={{ color: '#94a3b8' }}>
                {!selectedOrgId
                  ? 'Select an organization from the sidebar to view its logs.'
                  : 'Could not reach the log endpoint. Check network or SSH connectivity.'}
              </p>
              <p className="text-xs mt-2 font-mono" style={{ color: '#cbd5e1' }}>
                {(queryError as any)?.response?.data?.error || (queryError as any)?.message}
              </p>
            </div>
          ) : data?.error ? (
            <div className="py-20 text-center px-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertTriangle size={24} style={{ color: '#F59E0B' }} />
              </div>
              <p className="font-semibold mb-1" style={{ color: '#64748b' }}>Loki Unavailable</p>
              <p className="text-sm max-w-sm mx-auto" style={{ color: '#94a3b8' }}>
                Could not connect to Loki on the selected org's infrastructure.
                Ensure Loki is deployed and accessible on port 3100 via SSH.
              </p>
              <p className="text-xs mt-2 font-mono" style={{ color: '#cbd5e1' }}>{data.error}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-24 text-center px-8">
              <FileText size={32} className="mx-auto mb-3" style={{ color: '#e2e8f0' }} />
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>No log entries matched</p>
              <p className="text-xs mt-1 mb-4" style={{ color: '#cbd5e1' }}>Try widening the time range, using <code style={{ color: '#a855f7', background: 'rgba(168,85,247,0.12)', padding: '0 4px', borderRadius: '4px' }}>{'{}' }</code> to show all logs, or open the <strong style={{ color: '#64748b' }}>Labels</strong> browser to explore available streams.</p>
              <div className="flex flex-wrap justify-center gap-2 text-[11px]">
                {[
                  { label: 'Show all logs', q: '{}' },
                  { label: 'Errors only', q: '{} |= "error"' },
                ].map(p => (
                  <button
                    key={p.q}
                    onClick={() => { setQueryInput(p.q!); setActiveQuery(p.q!); }}
                    className="px-3 py-1 rounded-lg font-mono transition-colors"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#a855f7', border: '1px solid rgba(99,102,241,0.25)' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <table className="w-full text-[12px] font-mono border-collapse">
              <tbody>
                {filteredLogs.map((l: any, i: number) => {
                  const sev = detectSeverity(l.message);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)', background: sevRowBg(sev) }}
                      onMouseEnter={e => { if (sev !== 'error' && sev !== 'warn') e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                      onMouseLeave={e => { if (sev !== 'error' && sev !== 'warn') e.currentTarget.style.background = 'transparent'; }}
                      className="group">
                      {/* Line number */}
                      <td className="px-2 py-0.5 select-none text-right w-10 align-top tabular-nums" style={{ color: '#cbd5e1' }}>
                        {i + 1}
                      </td>
                      {/* Timestamp */}
                      <td className="px-2 py-0.5 whitespace-nowrap w-[110px] align-top tabular-nums" style={{ color: '#94a3b8' }}>
                        {formatNanoTs(l.timestamp)}
                      </td>
                      {/* Severity badge */}
                      <td className="px-1 py-0.5 w-[46px] align-top">
                        <span className="text-[10px] px-1.5 rounded font-bold" style={sevBadgeStyle(sev)}>
                          {sev === 'error' ? 'ERR' : sev === 'warn' ? 'WRN' : sev === 'debug' ? 'DBG' : 'INF'}
                        </span>
                      </td>
                      {/* Message */}
                      <td className="px-2 py-0.5 break-all align-top" style={{ color: sevTextColor(sev) }}>
                        {search ? highlightSearch(l.message, search) : l.message}
                        {/* Labels on hover */}
                        {l.labels && Object.keys(l.labels).length > 0 && (
                          <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]" style={{ color: '#e2e8f0' }}>
                            {Object.entries(l.labels).filter(([k]) => k !== '__name__').slice(0, 4).map(([k, v]) => `${k}=${v}`).join(' ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
