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
  Bug,
  Target,
  TrendingUp,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  BookOpen,
} from 'lucide-react';
import { useProblems, useProblemStats } from '../../hooks/useProblems';

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type ProblemState = 'NEW' | 'INVESTIGATION' | 'RCA_IN_PROGRESS' | 'KNOWN_ERROR' | 'RESOLVED' | 'CLOSED';

interface Problem {
  id: string;
  number: string;
  priority: Priority;
  state: ProblemState;
  shortDescription: string;
  description?: string | null;
  assignedTo: string | { firstName?: string; lastName?: string } | null;
  relatedIncidents: number;
  createdAt: string;
}

type SortField = 'number' | 'priority' | 'state' | 'shortDescription' | 'relatedIncidents' | 'createdAt';
type SortDir = 'asc' | 'desc';

const ALL_STATES: ProblemState[] = ['NEW', 'INVESTIGATION', 'RCA_IN_PROGRESS', 'KNOWN_ERROR', 'RESOLVED', 'CLOSED'];
const ALL_PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const priorityClass: Record<Priority, string> = { P1: 'priority-p1', P2: 'priority-p2', P3: 'priority-p3', P4: 'priority-p4' };

const stateLabel: Record<ProblemState, string> = {
  NEW: 'New',
  INVESTIGATION: 'Investigating',
  RCA_IN_PROGRESS: 'RCA Identified',
  KNOWN_ERROR: 'Known Error',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

// Dark glass badge styles per state
const stateDarkStyle: Record<ProblemState, React.CSSProperties> = {
  NEW: { background: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.3)' },
  INVESTIGATION: { background: 'rgba(245,158,11,0.15)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' },
  RCA_IN_PROGRESS: { background: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.3)' },
  KNOWN_ERROR: { background: 'rgba(239,68,68,0.15)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' },
  RESOLVED: { background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' },
  CLOSED: { background: 'rgba(99,102,241,0.06)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.12)' },
};

const priorityWeight: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };

function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'Unknown';
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProblemList() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const hasFilters = search || selectedStates.length > 0 || selectedPriorities.length > 0;

  const clearFilters = () => { setSearch(''); setSelectedStates([]); setSelectedPriorities([]); setPage(1); };

  // ─── API Calls ─────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useProblems({
    page,
    limit: pageSize,
    search: search || undefined,
    state: selectedStates.length > 0 ? selectedStates[0] : undefined,
    priority: selectedPriorities.length > 0 ? selectedPriorities[0] : undefined,
    sortBy: sortField,
    sortDir,
  });

  const { data: statsData } = useProblemStats();
  const stateCounts: Record<string, number> = statsData?.data?.stateCounts || {};
  const knownErrors: any[] = statsData?.data?.knownErrors || [];

  const problems: Problem[] = data?.data || [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? problems.length;
  const totalPages = pagination?.pages ?? Math.max(1, Math.ceil(totalItems / pageSize));

  // ─── Compute KPI from real data ──────────────────────────────────────────
  const openCount = useMemo(() => problems.filter((p: Problem) => !['RESOLVED', 'CLOSED'].includes(p.state)).length, [problems]);
  const knownErrorCount = useMemo(() => problems.filter((p: Problem) => p.state === 'KNOWN_ERROR').length, [problems]);
  const totalRelated = useMemo(() => problems.reduce((acc: number, p: Problem) => acc + (p.relatedIncidents || 0), 0), [problems]);
  const resolvedCount = useMemo(() => problems.filter((p: Problem) => p.state === 'RESOLVED').length, [problems]);

  // ─── Client-side sort ─────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...problems];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'number': cmp = a.number.localeCompare(b.number); break;
        case 'priority': cmp = priorityWeight[a.priority] - priorityWeight[b.priority]; break;
        case 'state': cmp = a.state.localeCompare(b.state); break;
        case 'shortDescription': cmp = a.shortDescription.localeCompare(b.shortDescription); break;
        case 'relatedIncidents': cmp = (a.relatedIncidents || 0) - (b.relatedIncidents || 0); break;
        case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [problems, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} style={{ color: '#94a3b8' }} />;
    return sortDir === 'asc' ? <ChevronUp size={14} style={{ color: '#334155' }} /> : <ChevronDown size={14} style={{ color: '#334155' }} />;
  };

  const handleStatePipelineClick = (state: string) => {
    if (selectedStates[0] === state) {
      setSelectedStates([]);
    } else {
      setSelectedStates([state]);
    }
    setPage(1);
  };

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* Top gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA, #C4B5FD, transparent)' }} />
        {/* Dot grid texture */}
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Ambient glow blobs — violet */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.45) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full blur-[60px] translate-y-1/2 translate-x-1/4 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)' }} />
        <div className="relative px-6 pt-6 pb-14">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)' }}>
                  <Bug size={17} style={{ color: '#C4B5FD' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>Problem Management</h1>
              </div>
              <p className="text-sm font-body ml-[46px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Root cause analysis &amp; known error tracking &middot; <span className="font-mono" style={{ color: '#C4B5FD' }}>{totalItems}</span> total</p>
            </div>
            <button
              onClick={() => navigate('/problems/create')}
              className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold font-body transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(124,58,237,0.35)', border: '1px solid rgba(124,58,237,0.5)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
            >
              <Plus size={15} /> New Problem
            </button>
          </div>
          {/* KPI Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Total Problems', value: totalItems, icon: Bug, iconColor: '#C4B5FD' },
              { label: 'Under Investigation', value: (stateCounts['INVESTIGATION'] ?? 0) + (stateCounts['RCA_IN_PROGRESS'] ?? 0), icon: Target, iconColor: '#FBBF24' },
              { label: 'Known Errors', value: knownErrorCount, icon: AlertTriangle, iconColor: '#FCA5A5' },
              { label: 'Resolved', value: resolvedCount, icon: CheckCircle, iconColor: '#6EE7B7' },
            ].map((s, i) => (
              <div
                key={s.label}
                className="rounded-xl p-4 animate-fade-in"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium font-body uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</p>
                    <p className="font-display text-2xl font-extrabold" style={{ color: '#FFFFFF' }}>{s.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.20)', border: '1px solid rgba(124,58,237,0.25)' }}>
                    <s.icon size={18} style={{ color: s.iconColor }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Gradient accent line separator */}
      <div className="h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA, #C4B5FD, transparent)' }} />

      {/* ── STATE PIPELINE ── */}
      <div className="px-2 py-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {ALL_STATES.map((state, idx) => {
            const count = stateCounts[state] ?? 0;
            const darkStyle = stateDarkStyle[state];
            const isActive = selectedStates[0] === state;
            return (
              <div key={state} className="flex items-center shrink-0">
                <button
                  onClick={() => handleStatePipelineClick(state)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                  style={isActive ? { ...darkStyle, outline: '2px solid rgba(99,102,241,0.25)' } : { background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: (darkStyle.color as string) }} />
                  <span className="text-[11px] font-semibold" style={{ color: isActive ? (darkStyle.color as string) : '#94a3b8' }}>
                    {stateLabel[state]}
                  </span>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md" style={isActive ? { background: 'rgba(99,102,241,0.12)', color: darkStyle.color as string } : { background: 'rgba(99,102,241,0.06)', color: '#94a3b8' }}>
                    {count}
                  </span>
                </button>
                {idx < ALL_STATES.length - 1 && (
                  <div className="flex items-center mx-1 shrink-0">
                    <ArrowRight size={12} style={{ color: '#94a3b8' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KNOWN ERROR DATABASE (KEDB) ── */}
      {knownErrors.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <BookOpen size={13} style={{ color: '#DC2626' }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Known Error Database</span>
            <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{knownErrors.length}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {knownErrors.map((ke: any) => (
              <button
                key={ke.id}
                onClick={() => navigate(`/problems/${ke.id}`)}
                className="shrink-0 w-72 rounded-xl p-4 text-left transition-all group"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] font-bold" style={{ color: '#DC2626' }}>{ke.number}</span>
                  <span className={clsx('badge', priorityClass[ke.priority as Priority])}>{ke.priority}</span>
                  {ke.category && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.06)', color: '#94a3b8' }}>{ke.category}</span>}
                </div>
                <p className="text-xs font-medium truncate mb-2" style={{ color: '#334155' }}>{ke.shortDescription}</p>
                {ke.workaround && (
                  <div className="flex items-start gap-1.5 text-[10px] rounded-lg px-2 py-1.5" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.2)', color: '#D97706' }}>
                    <Lightbulb size={11} className="shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{ke.workaround}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div className="-mt-1 relative z-10 rounded-xl p-3 mb-4" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input type="text" placeholder="Search problems..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-all" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }} />
          </div>
          <div className="w-px h-7 hidden sm:block" style={{ background: 'rgba(99,102,241,0.12)' }} />
          <div className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
            <Filter size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Filters</span>
          </div>
          <select value={selectedStates[0] || ''} onChange={(e) => { setSelectedStates(e.target.value ? [e.target.value] : []); setPage(1); }} className="rounded-lg text-sm px-3 py-1.5 focus:outline-none" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}>
            <option value="" style={{ background: '#ffffff' }}>All States</option>
            {ALL_STATES.map((s) => <option key={s} value={s} style={{ background: '#ffffff' }}>{stateLabel[s]}</option>)}
          </select>
          <select value={selectedPriorities[0] || ''} onChange={(e) => { setSelectedPriorities(e.target.value ? [e.target.value] : []); setPage(1); }} className="rounded-lg text-sm px-3 py-1.5 focus:outline-none" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}>
            <option value="" style={{ background: '#ffffff' }}>All Priorities</option>
            {ALL_PRIORITIES.map((p) => <option key={p} value={p} style={{ background: '#ffffff' }}>{p}</option>)}
          </select>
          {hasFilters && <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all" style={{ color: '#94a3b8', border: '1px solid rgba(99,102,241,0.12)' }}><X size={13} /> Clear</button>}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                {([['number', 'Number'], ['priority', 'Priority'], ['state', 'State'], ['shortDescription', 'Short Description'], ['relatedIncidents', 'Incidents'], ['createdAt', 'Created']] as [SortField, string][]).map(([field, label]) => (
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
                    <p className="text-lg font-medium" style={{ color: '#0f172a' }}>Failed to load problems</p>
                    <p className="text-sm" style={{ color: '#94a3b8' }}>Please try again later.</p>
                  </div>
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Bug size={40} style={{ color: '#94a3b8' }} />
                    <p className="text-lg font-medium" style={{ color: '#94a3b8' }}>No problems found</p>
                  </div>
                </td></tr>
              ) : sorted.map((prb) => (
                <tr key={prb.id} onClick={() => navigate(`/problems/${prb.id}`)} className="cursor-pointer transition-colors group" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-4 py-3"><span className="font-mono group-hover:underline" style={{ color: '#334155' }}>{prb.number}</span></td>
                  <td className="px-4 py-3"><span className={clsx('badge', priorityClass[prb.priority])}>{prb.priority}</span></td>
                  <td className="px-4 py-3"><span className="badge text-[10px] px-2 py-0.5 rounded-md" style={stateDarkStyle[prb.state]}>{stateLabel[prb.state]}</span></td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate font-medium" style={{ color: '#334155' }}>{prb.shortDescription}</p>
                    <p className="truncate text-[11px]" style={{ color: '#94a3b8' }}>
                      {prb.description || 'No additional description'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(prb.relatedIncidents || 0) > 0 ? (
                      <span className="badge text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' }}>{prb.relatedIncidents}</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#94a3b8' }}>{relativeTime(prb.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-3 text-sm" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
            <span style={{ color: '#94a3b8' }}>{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalItems)} of {totalItems}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg transition-colors" style={{ color: page === 1 ? '#94a3b8' : '#64748b' }}><ChevronLeft size={18} /></button>
              <span className="px-3" style={{ color: '#94a3b8' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg transition-colors" style={{ color: page === totalPages ? '#94a3b8' : '#64748b' }}><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 size={28} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
      )}
    </div>
  );
}

