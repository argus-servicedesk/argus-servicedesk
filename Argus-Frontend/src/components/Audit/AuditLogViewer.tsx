import { useState } from 'react';
import {
  ScrollText, Search, X, ChevronLeft, ChevronRight, ChevronDown,
  User, Calendar, Globe, AlertTriangle, ShieldAlert, Clock,
  Filter,
} from 'lucide-react';
import { useAuditLogs, useAuditAnomalies, useAuditResourceTypes } from '../../hooks/useAuditLogs';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  action: string;
  resourceType?: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: any;
  newData?: any;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

interface Anomaly {
  id?: string;
  type: string;
  severity: string;
  message: string;
  detectedAt?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS = ['ALL', 'INFO', 'WARNING', 'CRITICAL'];
const STATUS_OPTIONS = ['ALL', 'SUCCESS', 'FAILURE'];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function severityStyle(sev: string): { bg: string; text: string; border: string } {
  switch (sev?.toUpperCase()) {
    case 'CRITICAL': return { bg: 'rgba(220,38,38,0.08)', text: '#DC2626', border: 'rgba(220,38,38,0.2)' };
    case 'WARNING': return { bg: 'rgba(217,119,6,0.08)', text: '#D97706', border: 'rgba(217,119,6,0.2)' };
    default: return { bg: 'rgba(99,102,241,0.06)', text: '#4F46E5', border: 'rgba(99,102,241,0.15)' };
  }
}

function statusStyle(status: string): { bg: string; text: string } {
  switch (status?.toUpperCase()) {
    case 'SUCCESS': return { bg: 'rgba(5,150,105,0.08)', text: '#059669' };
    case 'FAILURE': return { bg: 'rgba(220,38,38,0.08)', text: '#DC2626' };
    default: return { bg: 'rgba(99,102,241,0.06)', text: '#64748b' };
  }
}

function shortAgent(ua?: string): string {
  if (!ua) return '--';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('axios') || ua.includes('node')) return 'API/Node';
  return ua.slice(0, 20);
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )
  ).sort();
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuditLogViewer() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [severity, setSeverity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filters = {
    page,
    pageSize,
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(severity && severity !== 'ALL' ? { severity } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const { data, isLoading } = useAuditLogs(filters);
  const { data: anomalies } = useAuditAnomalies();
  const { data: resourceTypes } = useAuditResourceTypes();

  const logs: AuditLog[] = (data as any)?.logs || [];
  const pagination = (data as any)?.pagination || { total: 0, pages: 1, totalPages: 1, page: 1 };
  const totalPages = pagination.pages || pagination.totalPages || 1;
  const total = pagination.total || 0;
  const activeAnomalies: Anomaly[] = anomalies || [];
  const resourceTypeOptions = uniqueStrings(resourceTypes);

  const hasFilters = action || resourceType || (severity && severity !== 'ALL') || startDate || endDate;

  function clearFilters() {
    setAction(''); setResourceType(''); setSeverity('');
    setStartDate(''); setEndDate(''); setPage(1);
  }

  function toggleRow(id: string) {
    setExpandedRow(prev => prev === id ? null : id);
  }

  return (
    <div className="animate-fade-in" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #fef2f2 50%, #fee2e2 100%)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl mx-4 mt-4" style={{ background: 'linear-gradient(135deg, #1c1917 0%, #450a0a 40%, #7f1d1d 100%)' }}>
        {/* 3px accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #fca5a5, #f87171, #ef4444, transparent)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"
          style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)' }} />

        <div className="relative px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}>
              <ScrollText className="w-5 h-5" style={{ color: '#fca5a5' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#fca5a5' }}>Security</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>Audit</span>
              </div>
              <h1 className="text-[22px] font-display font-bold tracking-tight" style={{ color: '#ffffff' }}>Audit Log Viewer</h1>
              <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Monitor all platform activity, detect anomalies, and investigate security events
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {total.toLocaleString()} entries
              </span>
              {isLoading && (
                <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fca5a5' }} />
              )}
            </div>
          </div>
        </div>
        {/* Divider */}
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #fca5a5, #f87171, #ef4444, transparent)' }} />
      </div>

      {/* ── Anomaly Alerts Banner ── */}
      {activeAnomalies.length > 0 && (
        <div className="px-4 pt-4">
          <div className="space-y-2">
            {activeAnomalies.map((anomaly, idx) => {
              const isCritical = anomaly.severity?.toUpperCase() === 'CRITICAL';
              return (
                <div key={anomaly.id || idx} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: isCritical ? 'rgba(220,38,38,0.06)' : 'rgba(217,119,6,0.06)',
                    border: `1px solid ${isCritical ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)'}`,
                  }}>
                  <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: isCritical ? '#DC2626' : '#D97706' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold" style={{ color: '#0f172a' }}>{anomaly.message}</p>
                    {anomaly.detectedAt && (
                      <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>Detected {relativeTime(anomaly.detectedAt)}</p>
                    )}
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase"
                    style={{
                      background: isCritical ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)',
                      color: isCritical ? '#DC2626' : '#D97706',
                      border: `1px solid ${isCritical ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)'}`,
                    }}>
                    {anomaly.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="px-4 pt-4">
        <div className="rounded-xl p-4 flex flex-wrap items-center gap-3"
          style={{ background: '#ffffff', border: '1px solid rgba(220,38,38,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

          {/* Search by action */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              value={action}
              onChange={e => { setAction(e.target.value); setPage(1); }}
              placeholder="Search by action..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] placeholder:opacity-50 focus:outline-none"
              style={{ background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.12)', color: '#0f172a' }}
            />
          </div>

          {/* Severity */}
          <select
            value={severity}
            onChange={e => { setSeverity(e.target.value); setPage(1); }}
            className="rounded-lg px-3 py-2 text-[12px] focus:outline-none"
            style={{ background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.12)', color: '#DC2626' }}>
            {SEVERITY_OPTIONS.map(s => (
              <option key={s} value={s === 'ALL' ? '' : s} style={{ background: '#ffffff' }}>
                {s === 'ALL' ? 'All Severities' : s}
              </option>
            ))}
          </select>

          {/* Resource type */}
          <select
            value={resourceType}
            onChange={e => { setResourceType(e.target.value); setPage(1); }}
            className="rounded-lg px-3 py-2 text-[12px] focus:outline-none"
            style={{ background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.12)', color: '#DC2626' }}>
            <option value="" style={{ background: '#ffffff' }}>All Resources</option>
            {resourceTypeOptions.map((t) => (
              <option key={`resource-${t}`} value={t} style={{ background: '#ffffff' }}>{t}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="rounded-lg px-2 py-2 text-[12px] focus:outline-none"
              style={{ background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.12)', color: '#DC2626', colorScheme: 'light' }}
            />
            <span className="text-[11px]" style={{ color: '#94a3b8' }}>&rarr;</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="rounded-lg px-2 py-2 text-[12px] focus:outline-none"
              style={{ background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.12)', color: '#DC2626', colorScheme: 'light' }}
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.20)' }}>
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="px-4 pt-3 pb-6">
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(220,38,38,0.1)', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Header row */}
          <div className="grid px-4 py-3"
            style={{
              gridTemplateColumns: '1.1fr 1.2fr 1fr 0.7fr 0.6fr 0.6fr 0.7fr 40px',
              background: 'rgba(220,38,38,0.02)',
              borderBottom: '1px solid rgba(220,38,38,0.06)',
            }}>
            {['Timestamp', 'User', 'Action', 'Resource', 'Severity', 'Status', 'IP Address', ''].map(h => (
              <p key={h || 'expand'} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>{h}</p>
            ))}
          </div>

          {isLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid rgba(220,38,38,0.2)', borderTopColor: '#DC2626' }} />
              <span className="text-[12px] font-mono" style={{ color: '#94a3b8' }}>Loading audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <ScrollText className="w-10 h-10 mb-3" style={{ color: '#94a3b8' }} />
              <p className="text-[13px] font-mono" style={{ color: '#94a3b8' }}>No audit entries found</p>
            </div>
          ) : (
            logs.map((entry, idx) => {
              const isExpanded = expandedRow === entry.id;
              const sevStyle = severityStyle(entry.severity || 'INFO');
              const statStyle = statusStyle(entry.status || '');
              const hasDetails = entry.changes || entry.newData;

              return (
                <div key={entry.id || `${entry.createdAt}-${entry.action}-${idx}`}>
                  <div
                    className="grid px-4 py-3 items-center transition-colors cursor-pointer"
                    style={{
                      gridTemplateColumns: '1.1fr 1.2fr 1fr 0.7fr 0.6fr 0.6fr 0.7fr 40px',
                      borderBottom: (idx < logs.length - 1 && !isExpanded) ? '1px solid rgba(220,38,38,0.04)' : 'none',
                    }}
                    onClick={() => hasDetails && toggleRow(entry.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Timestamp */}
                    <div>
                      <p className="text-[11px] font-mono" style={{ color: '#0f172a' }}>{fmtTime(entry.createdAt)}</p>
                      <p className="text-[9px] font-mono" style={{ color: '#94a3b8' }}>{relativeTime(entry.createdAt)}</p>
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-2">
                      {entry.user ? (
                        <>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}>
                            {entry.user.firstName?.[0]}{entry.user.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold truncate" style={{ color: '#0f172a' }}>
                              {entry.user.firstName} {entry.user.lastName}
                            </p>
                            <p className="text-[9px] font-mono" style={{ color: '#94a3b8' }}>{entry.user.role}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                          <span className="text-[11px]" style={{ color: '#94a3b8' }}>System</span>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div>
                      <p className="text-[11px] font-mono font-medium truncate" style={{ color: '#0f172a' }} title={entry.action}>
                        {entry.action}
                      </p>
                    </div>

                    {/* Resource */}
                    <div>
                      <span className="text-[11px] font-semibold" style={{ color: '#6366f1' }}>
                        {entry.resourceType || entry.entityType || '--'}
                      </span>
                    </div>

                    {/* Severity */}
                    <div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase"
                        style={{ background: sevStyle.bg, color: sevStyle.text, border: `1px solid ${sevStyle.border}` }}>
                        {entry.severity || 'INFO'}
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      {entry.status ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase"
                          style={{ background: statStyle.bg, color: statStyle.text }}>
                          {entry.status}
                        </span>
                      ) : (
                        <span className="text-[10px]" style={{ color: '#94a3b8' }}>--</span>
                      )}
                    </div>

                    {/* IP */}
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 shrink-0" style={{ color: '#94a3b8' }} />
                      <span className="text-[10px] font-mono truncate" style={{ color: '#64748b' }}>
                        {entry.ipAddress || '--'}
                      </span>
                    </div>

                    {/* Expand */}
                    <div className="flex justify-center">
                      {hasDetails && (
                        <ChevronDown
                          className="w-4 h-4 transition-transform"
                          style={{
                            color: '#94a3b8',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && hasDetails && (
                    <div className="px-4 pb-4" style={{ borderBottom: idx < logs.length - 1 ? '1px solid rgba(220,38,38,0.06)' : 'none' }}>
                      <div className="rounded-xl p-4" style={{ background: 'rgba(220,38,38,0.02)', border: '1px solid rgba(220,38,38,0.08)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>Changes / Details</p>
                        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-[300px] overflow-y-auto"
                          style={{ color: '#0f172a' }}>
                          {JSON.stringify(entry.changes || entry.newData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>
              Page {page} of {totalPages} &middot; {total.toLocaleString()} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg disabled:opacity-40 transition-colors"
                style={{ border: '1px solid rgba(220,38,38,0.12)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <ChevronLeft className="w-4 h-4" style={{ color: '#64748b' }} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-[12px] font-medium transition-colors"
                    style={p === page
                      ? { background: 'linear-gradient(135deg, #DC2626, #EF4444)', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(220,38,38,0.3)' }
                      : { background: 'rgba(220,38,38,0.03)', color: '#64748b', border: '1px solid rgba(220,38,38,0.12)' }}>
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg disabled:opacity-40 transition-colors"
                style={{ border: '1px solid rgba(220,38,38,0.12)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <ChevronRight className="w-4 h-4" style={{ color: '#64748b' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
