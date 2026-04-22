import { useState, useMemo } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Filter,
  X,
  GitBranch,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useChanges } from '../../hooks/useChanges';

// ─── Types ───────────────────────────────────────────────────────────────────

type ChangeType = 'NORMAL' | 'STANDARD' | 'EMERGENCY';
type ChangeState = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SCHEDULED' | 'IMPLEMENTING' | 'COMPLETED' | 'CANCELLED';
type Risk = 'HIGH' | 'MEDIUM' | 'LOW';

interface Change {
  id: string;
  number: string;
  type: ChangeType;
  state: ChangeState;
  risk: Risk;
  shortDescription: string;
  requestedBy: string | { firstName?: string; lastName?: string } | null;
  plannedStartDate: string;
  createdAt: string;
}

type SortField = 'number' | 'type' | 'state' | 'risk' | 'shortDescription' | 'plannedStartDate';
type SortDir = 'asc' | 'desc';

const ALL_STATES: ChangeState[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'SCHEDULED', 'IMPLEMENTING', 'COMPLETED', 'CANCELLED'];
const ALL_TYPES: ChangeType[] = ['NORMAL', 'STANDARD', 'EMERGENCY'];
const ALL_RISKS: Risk[] = ['HIGH', 'MEDIUM', 'LOW'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const typeStyle: Record<ChangeType, React.CSSProperties> = {
  NORMAL: { background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' },
  STANDARD: { background: 'rgba(99,102,241,0.06)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.12)' },
  EMERGENCY: { background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)' },
};

const stateStyle: Record<ChangeState, React.CSSProperties> = {
  DRAFT: { background: 'rgba(100,116,139,0.06)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.12)' },
  SUBMITTED: { background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.15)' },
  APPROVED: { background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' },
  SCHEDULED: { background: 'rgba(99,102,241,0.06)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.12)' },
  IMPLEMENTING: { background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.15)' },
  COMPLETED: { background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.15)' },
  CANCELLED: { background: 'rgba(100,116,139,0.04)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.08)' },
};

const riskStyle: Record<Risk, React.CSSProperties> = {
  HIGH: { background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)' },
  MEDIUM: { background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.15)' },
  LOW: { background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.15)' },
};

const riskWeight: Record<Risk, number> = { HIGH: 1, MEDIUM: 2, LOW: 3 };

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

function getDisplayName(requestedBy: string | { firstName?: string; lastName?: string } | null): string {
  if (!requestedBy) return 'Unknown';
  if (typeof requestedBy === 'string') return requestedBy;
  const first = requestedBy.firstName || '';
  const last = requestedBy.lastName || '';
  return `${first} ${last}`.trim() || 'Unknown';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChangeList() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('plannedStartDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const hasFilters = search || selectedStates.length > 0 || selectedTypes.length > 0 || selectedRisks.length > 0;

  const clearFilters = () => {
    setSearch('');
    setSelectedStates([]);
    setSelectedTypes([]);
    setSelectedRisks([]);
    setPage(1);
  };

  // ─── API Call ────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useChanges({
    page,
    limit: pageSize,
    search: search || undefined,
    state: selectedStates.length > 0 ? selectedStates[0] : undefined,
    type: selectedTypes.length > 0 ? selectedTypes[0] : undefined,
    risk: selectedRisks.length > 0 ? selectedRisks[0] : undefined,
    sortBy: sortField,
    sortDir,
  });

  const changes: Change[] = data?.data || [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? changes.length;
  const totalPages = pagination?.pages ?? Math.max(1, Math.ceil(totalItems / pageSize));

  // ─── Compute KPI from real data ──────────────────────────────────────────────
  const kpiData = useMemo(() => {
    const open = changes.filter((c: Change) => !['COMPLETED', 'CANCELLED'].includes(c.state)).length;
    const implementing = changes.filter((c: Change) => c.state === 'IMPLEMENTING').length;
    const scheduledThisWeek = changes.filter((c: Change) => {
      if (c.state !== 'SCHEDULED') return false;
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      const scheduled = new Date(c.plannedStartDate);
      return scheduled >= startOfWeek && scheduled < endOfWeek;
    }).length;
    const completedThisMonth = changes.filter((c: Change) => {
      if (c.state !== 'COMPLETED') return false;
      const now = new Date();
      const created = new Date(c.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;
    const emergencyCount = changes.filter((c: Change) => c.type === 'EMERGENCY' && !['COMPLETED', 'CANCELLED'].includes(c.state)).length;
    return { open, implementing, scheduledThisWeek, completedThisMonth, emergencyCount };
  }, [changes]);

  // ─── Client-side sort for the current page (backend may already sort) ───────
  const sorted = useMemo(() => {
    const arr = [...changes];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'number': cmp = a.number.localeCompare(b.number); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'state': cmp = a.state.localeCompare(b.state); break;
        case 'risk': cmp = riskWeight[a.risk] - riskWeight[b.risk]; break;
        case 'shortDescription': cmp = a.shortDescription.localeCompare(b.shortDescription); break;
        case 'plannedStartDate': cmp = new Date(a.plannedStartDate).getTime() - new Date(b.plannedStartDate).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [changes, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} style={{ color: '#94a3b8' }} />;
    return sortDir === 'asc' ? <ChevronUp size={14} style={{ color: '#6366f1' }} /> : <ChevronDown size={14} style={{ color: '#6366f1' }} />;
  };

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* Dot grid texture overlay */}
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        {/* Ambient glow blobs — indigo + violet */}
        <div className="absolute -top-24 left-1/4 w-[480px] h-[320px] rounded-full blur-[90px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.40) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 right-10 w-[320px] h-[260px] rounded-full blur-[70px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.30) 0%, transparent 70%)' }} />

        <div className="relative px-6 pt-6 pb-14">
          {/* Title row + quick-action buttons */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.35)' }}>
                  <GitBranch size={16} style={{ color: '#818CF8' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Change Management</h1>
              </div>
              <p className="text-sm ml-[42px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Plan, approve, and track infrastructure changes &middot; <span className="font-mono" style={{ color: '#A5B4FC' }}>{totalItems}</span> total</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/changes/calendar')}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                <Calendar size={15} /> Calendar View
              </button>
              <button
                onClick={() => navigate('/changes/create')}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', border: '1px solid rgba(255,255,255,0.20)', boxShadow: '0 4px 20px rgba(79,70,229,0.35)' }}
              >
                <Plus size={15} /> New Change
              </button>
            </div>
          </div>

          {/* KPI pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
            {[
              { label: 'Total Changes', value: totalItems, icon: GitBranch, iconColor: '#A5B4FC' },
              { label: 'Planned', value: kpiData.scheduledThisWeek, icon: Calendar, iconColor: '#C4B5FD' },
              { label: 'Implementing', value: kpiData.implementing, icon: Clock, iconColor: '#FCD34D' },
              { label: 'Emergency', value: kpiData.emergencyCount, icon: AlertTriangle, iconColor: '#FCA5A5' },
              { label: 'Completed', value: kpiData.completedThisMonth, icon: CheckCircle, iconColor: '#6EE7B7' },
            ].map((s, i) => (
              <div
                key={s.label}
                className="backdrop-blur-sm rounded-xl p-4 animate-fade-in"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</p>
                    <p className="font-display text-2xl font-extrabold" style={{ color: '#ffffff' }}>{s.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <s.icon size={18} style={{ color: s.iconColor }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Gradient accent line separator */}
      <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #4F46E5, #7C3AED, #A5B4FC, transparent)' }} />

      {/* ── FILTER BAR ── */}
      <div className="-mt-3 relative z-10 rounded-xl p-3 mb-4" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input type="text" placeholder="Search changes..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-all" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }} />
          </div>
          <div className="w-px h-7 hidden sm:block" style={{ background: 'rgba(99,102,241,0.12)' }} />
          <div className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
            <Filter size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Filters</span>
          </div>
          <select value={selectedTypes[0] || ''} onChange={(e) => setSelectedTypes(e.target.value ? [e.target.value] : [])} className="rounded-lg text-sm px-3 py-1.5 focus:outline-none" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}>
            <option value="" style={{ background: '#ffffff' }}>All Types</option>
            {ALL_TYPES.map((t) => <option key={t} value={t} style={{ background: '#ffffff' }}>{t}</option>)}
          </select>
          <select value={selectedStates[0] || ''} onChange={(e) => setSelectedStates(e.target.value ? [e.target.value] : [])} className="rounded-lg text-sm px-3 py-1.5 focus:outline-none" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}>
            <option value="" style={{ background: '#ffffff' }}>All States</option>
            {ALL_STATES.map((s) => <option key={s} value={s} style={{ background: '#ffffff' }}>{s}</option>)}
          </select>
          <select value={selectedRisks[0] || ''} onChange={(e) => setSelectedRisks(e.target.value ? [e.target.value] : [])} className="rounded-lg text-sm px-3 py-1.5 focus:outline-none" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}>
            <option value="" style={{ background: '#ffffff' }}>All Risks</option>
            {ALL_RISKS.map((r) => <option key={r} value={r} style={{ background: '#ffffff' }}>{r}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all" style={{ color: '#94a3b8', border: '1px solid rgba(99,102,241,0.12)' }}><X size={13} /> Clear</button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                {([['number', 'Number'], ['type', 'Type'], ['state', 'State'], ['risk', 'Risk'], ['shortDescription', 'Description'], ['plannedStartDate', 'Scheduled']] as [SortField, string][]).map(([field, label]) => (
                  <th key={field} onClick={() => handleSort(field)} className="px-4 py-2.5 text-left cursor-pointer select-none transition-colors">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>{label} <SortIcon field={field} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded w-3/4" style={{ background: 'rgba(99,102,241,0.10)' }} /></td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertTriangle size={40} style={{ color: '#EF4444' }} />
                    <p className="text-lg font-medium" style={{ color: '#0f172a' }}>Failed to load changes</p>
                    <p className="text-sm" style={{ color: '#94a3b8' }}>Please try again later.</p>
                  </div>
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <GitBranch size={40} style={{ color: '#94a3b8' }} />
                    <p className="text-lg font-medium" style={{ color: '#94a3b8' }}>No changes found</p>
                  </div>
                </td></tr>
              ) : sorted.map((chg) => (
                <tr key={chg.id} onClick={() => navigate(`/changes/${chg.id}`)} className="cursor-pointer transition-colors group" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-4 py-3"><span className="font-mono group-hover:underline" style={{ color: '#6366f1' }}>{chg.number}</span></td>
                  <td className="px-4 py-3"><span className="badge text-[10px] px-2 py-0.5 rounded-md font-mono" style={typeStyle[chg.type]}>{chg.type}</span></td>
                  <td className="px-4 py-3"><span className="badge text-[10px] px-2 py-0.5 rounded-md" style={stateStyle[chg.state]}>{chg.state.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3"><span className="badge text-[10px] px-2 py-0.5 rounded-md" style={riskStyle[chg.risk]}>{chg.risk}</span></td>
                  <td className="px-4 py-3 max-w-xs truncate" style={{ color: '#6366f1' }}>{chg.shortDescription}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-mono" style={{ color: '#94a3b8' }}>{formatShortDate(chg.plannedStartDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-3 text-sm" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
            <span style={{ color: '#94a3b8' }}>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg transition-colors" style={{ color: page === 1 ? '#94a3b8' : '#64748b' }}><ChevronLeft size={18} /></button>
              <span className="px-3" style={{ color: '#94a3b8' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg transition-colors" style={{ color: page === totalPages ? '#94a3b8' : '#64748b' }}><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 size={28} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
      )}
    </div>
  );
}
