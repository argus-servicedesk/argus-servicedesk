import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSearch, Search, X, Filter, ChevronLeft, ChevronRight,
  User, Calendar, Globe,
} from 'lucide-react';
import api from '../../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  newData?: any;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const ENTITY_TYPES = [
  'ALL', 'Incident', 'Change', 'Problem', 'Alert', 'Asset',
  'Team', 'User', 'Integration', 'Organization',
];

const ACTION_METHODS = ['ALL', 'POST', 'PATCH', 'PUT', 'DELETE'];

function methodFromAction(action: string): 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'GET' | 'OTHER' {
  if (action.startsWith('POST')) return 'POST';
  if (action.startsWith('PATCH')) return 'PATCH';
  if (action.startsWith('PUT')) return 'PUT';
  if (action.startsWith('DELETE')) return 'DELETE';
  if (action.startsWith('GET')) return 'GET';
  return 'OTHER';
}

const METHOD_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  POST:   { bg: 'rgba(16,185,129,0.12)',  text: '#6EE7B7', label: 'CREATE' },
  PATCH:  { bg: 'rgba(217,119,6,0.12)',   text: '#FCD34D', label: 'UPDATE' },
  PUT:    { bg: 'rgba(217,119,6,0.12)',   text: '#FCD34D', label: 'UPDATE' },
  DELETE: { bg: 'rgba(220,38,38,0.12)',   text: '#FCA5A5', label: 'DELETE' },
  GET:    { bg: 'rgba(99,102,241,0.08)',  text: '#6366f1', label: 'READ' },
  OTHER:  { bg: 'rgba(99,102,241,0.06)',  text: '#64748b', label: 'ACTION' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function shortAgent(ua?: string): string {
  if (!ua) return '—';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('axios') || ua.includes('node')) return 'API/Node';
  return ua.slice(0, 20);
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const [search, setSearch]         = useState('');
  const [entityType, setEntityType] = useState('ALL');
  const [actionFilter, setAction]   = useState('ALL');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [page, setPage]             = useState(1);
  const LIMIT = 50;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    ...(search ? { search } : {}),
    ...(entityType !== 'ALL' ? { entityType } : {}),
    ...(actionFilter !== 'ALL' ? { action: actionFilter } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search, entityType, actionFilter, startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get(`/audit?${params}`);
      return data;
    },
    staleTime: 10000,
    placeholderData: (prev) => prev,
  });

  const logs: AuditEntry[] = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  function clearFilters() {
    setSearch(''); setEntityType('ALL'); setAction('ALL');
    setStartDate(''); setEndDate(''); setPage(1);
  }

  const hasFilters = search || entityType !== 'ALL' || actionFilter !== 'ALL' || startDate || endDate;

  return (
    <div className="animate-fade-in" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e0e7ff 100%)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl mx-4 mt-4" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)' }}>
        {/* 3px accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #a5b4fc, #c4b5fd, #ddd6fe, transparent)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)' }} />

        <div className="relative px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
              <FileSearch className="w-5 h-5" style={{ color: '#c4b5fd' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#a5b4fc' }}>Platform</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>Audit Log</span>
              </div>
              <h1 className="text-[22px] font-display font-bold tracking-tight" style={{ color: '#ffffff' }}>Audit Log Browser</h1>
              <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Track all changes and actions performed in the platform
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {pagination.total.toLocaleString()} entries
              </span>
              {isLoading && (
                <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#c4b5fd' }} />
              )}
            </div>
          </div>
        </div>
        {/* Divider */}
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #a5b4fc, #c4b5fd, #ddd6fe, transparent)' }} />
      </div>

      {/* ── Filters ── */}
      <div className="px-4 pt-4">
        <div className="rounded-xl p-4 flex flex-wrap items-center gap-3"
          style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search entity ID, type, action..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] placeholder:opacity-50 focus:outline-none"
              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}
            />
          </div>

          {/* Entity type */}
          <select
            value={entityType}
            onChange={e => { setEntityType(e.target.value); setPage(1); }}
            className="rounded-lg px-3 py-2 text-[12px] focus:outline-none"
            style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#6366f1' }}>
            {ENTITY_TYPES.map(t => <option key={t} value={t} style={{ background: '#ffffff' }}>{t === 'ALL' ? 'All Entities' : t}</option>)}
          </select>

          {/* Action method */}
          <select
            value={actionFilter}
            onChange={e => { setAction(e.target.value); setPage(1); }}
            className="rounded-lg px-3 py-2 text-[12px] focus:outline-none"
            style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#6366f1' }}>
            {ACTION_METHODS.map(m => <option key={m} value={m} style={{ background: '#ffffff' }}>{m === 'ALL' ? 'All Actions' : m}</option>)}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="rounded-lg px-2 py-2 text-[12px] focus:outline-none"
              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#6366f1', colorScheme: 'light' }}
            />
            <span className="text-[11px]" style={{ color: '#94a3b8' }}>-&gt;</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="rounded-lg px-2 py-2 text-[12px] focus:outline-none"
              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#6366f1', colorScheme: 'light' }}
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
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.15)', background: '#ffffff', backdropFilter: 'blur(12px)' }}>
          {/* Header row */}
          <div className="grid px-4 py-3"
            style={{
              gridTemplateColumns: '1fr 1.2fr 0.8fr 0.9fr 0.7fr 0.7fr',
              background: 'rgba(99,102,241,0.03)',
              borderBottom: '1px solid rgba(99,102,241,0.06)',
            }}>
            {['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'IP Address'].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>{h}</p>
            ))}
          </div>

          {isLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1' }} />
              <span className="text-[12px] font-mono" style={{ color: '#94a3b8' }}>Loading audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <FileSearch className="w-10 h-10 mb-3" style={{ color: '#94a3b8' }} />
              <p className="text-[13px] font-mono" style={{ color: '#94a3b8' }}>No audit entries found</p>
            </div>
          ) : (
            logs.map((entry, idx) => {
              const method = methodFromAction(entry.action);
              const ms = METHOD_STYLES[method] || METHOD_STYLES.OTHER;
              return (
                <div
                  key={entry.id}
                  className="grid px-4 py-3 items-center group transition-colors"
                  style={{
                    gridTemplateColumns: '1fr 1.2fr 0.8fr 0.9fr 0.7fr 0.7fr',
                    borderBottom: idx < logs.length - 1 ? '1px solid rgba(99,102,241,0.04)' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {/* Timestamp */}
                  <div>
                    <p className="text-[11px] font-mono" style={{ color: '#0f172a' }}>{fmtTime(entry.createdAt)}</p>
                  </div>

                  {/* User */}
                  <div className="flex items-center gap-2">
                    {entry.user ? (
                      <>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
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

                  {/* Action badge */}
                  <div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md"
                      style={{ background: ms.bg, color: ms.text }}>
                      {ms.label}
                    </span>
                  </div>

                  {/* Entity type */}
                  <div>
                    <span className="text-[11px] font-semibold" style={{ color: '#6366f1' }}>{entry.entityType}</span>
                  </div>

                  {/* Entity ID */}
                  <div>
                    <span className="text-[10px] font-mono truncate block" title={entry.entityId} style={{ color: '#64748b' }}>
                      {entry.entityId ? entry.entityId.slice(0, 8) + '...' : '—'}
                    </span>
                  </div>

                  {/* IP */}
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 shrink-0" style={{ color: '#94a3b8' }} />
                    <span className="text-[10px] font-mono truncate" style={{ color: '#64748b' }}>
                      {entry.ipAddress || '—'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>
              Page {page} of {pagination.totalPages} · {pagination.total.toLocaleString()} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg disabled:opacity-40 transition-colors"
                style={{ border: '1px solid rgba(99,102,241,0.15)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <ChevronLeft className="w-4 h-4" style={{ color: '#64748b' }} />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-[12px] font-medium transition-colors"
                    style={p === page
                      ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }
                      : { background: 'rgba(99,102,241,0.03)', color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg disabled:opacity-40 transition-colors"
                style={{ border: '1px solid rgba(99,102,241,0.15)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
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
