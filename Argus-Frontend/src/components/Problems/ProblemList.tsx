import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useProblems } from '../../hooks/useProblems';
import { SNPage, sn } from '../ITSMTemplates/ServiceNowUI';

type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type SortField = 'number' | 'priority' | 'state' | 'shortDescription' | 'relatedIncidents' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface Person {
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
}

interface Problem {
  id: string;
  number?: string;
  priority?: Priority | string;
  state?: string;
  shortDescription?: string;
  assignedTo?: string | Person | null;
  assignmentGroup?: { name?: string } | null;
  relatedIncidents?: number;
  linkedIncidents?: unknown[];
  rootCause?: string | null;
  isKnownError?: boolean;
  knownErrorId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const PAGE_SIZE = 25;
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;
const STATES = ['NEW', 'INVESTIGATION', 'RCA_IN_PROGRESS', 'KNOWN_ERROR', 'RESOLVED', 'CLOSED', 'CANCELLED'] as const;

const priorityLabel: Record<string, string> = {
  P1: '1 - Critical',
  P2: '2 - High',
  P3: '3 - Moderate',
  P4: '4 - Low',
};

const stateLabel: Record<string, string> = {
  NEW: 'New',
  INVESTIGATION: 'Investigation',
  RCA_IN_PROGRESS: 'RCA In Progress',
  KNOWN_ERROR: 'Known Error',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const priorityTone: Record<string, { bg: string; fg: string; border: string; dot: string }> = {
  P1: { bg: '#fff6f6', fg: '#d0272b', border: '#fca5a5', dot: '#d0272b' },
  P2: { bg: '#fff7e8', fg: '#b45309', border: '#f5c266', dot: '#f59e0b' },
  P3: { bg: '#eef2ff', fg: '#3730a3', border: '#c7d2fe', dot: '#4f46e5' },
  P4: { bg: '#ecfdf3', fg: '#067647', border: '#9be7bd', dot: '#10b981' },
};

const stateTone: Record<string, { bg: string; fg: string; border: string; dot: string }> = {
  NEW: { bg: '#eef2ff', fg: '#1d4ed8', border: '#bfdbfe', dot: '#2563eb' },
  INVESTIGATION: { bg: '#fff1df', fg: '#f05a00', border: '#fed7aa', dot: '#f05a00' },
  RCA_IN_PROGRESS: { bg: '#fff7e8', fg: '#b45309', border: '#f5c266', dot: '#f59e0b' },
  KNOWN_ERROR: { bg: '#fff6f6', fg: '#d0272b', border: '#fca5a5', dot: '#d0272b' },
  RESOLVED: { bg: '#ecfdf3', fg: '#067647', border: '#9be7bd', dot: '#12b76a' },
  CLOSED: { bg: '#f5f6f7', fg: '#475467', border: '#d8dde6', dot: '#98a2b3' },
  CANCELLED: { bg: '#f5f6f7', fg: '#475467', border: '#d8dde6', dot: '#98a2b3' },
};

function personName(value: string | Person | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const first = value.firstName ?? value.first_name ?? '';
  const last = value.lastName ?? value.last_name ?? '';
  return `${first} ${last}`.trim();
}

function relatedCount(problem: Problem): number {
  if (typeof problem.relatedIncidents === 'number') return problem.relatedIncidents;
  return Array.isArray(problem.linkedIncidents) ? problem.linkedIncidents.length : 0;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function compareValues(a: string | number, b: string | number, dir: SortDir): number {
  const result = typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a).localeCompare(String(b));
  return dir === 'asc' ? result : -result;
}

function SortButton({
  field,
  activeField,
  sortDir,
  children,
  onSort,
}: {
  field: SortField;
  activeField: SortField;
  sortDir: SortDir;
  children: string;
  onSort: (field: SortField) => void;
}) {
  const active = field === activeField;
  return (
    <button type="button" onClick={() => onSort(field)} className="flex w-full items-center justify-between gap-2 text-left">
      <span>{children}</span>
      {active ? (
        sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
      ) : (
        <ChevronDown size={14} style={{ color: '#98a2b3' }} />
      )}
    </button>
  );
}

function StatusChip({ value, tones, fallback }: {
  value?: string;
  tones: Record<string, { bg: string; fg: string; border: string; dot: string }>;
  fallback?: string;
}) {
  const tone = tones[value ?? ''] ?? { bg: '#f5f6f7', fg: '#344054', border: '#d8dde6', dot: '#98a2b3' };
  return (
    <span className="sn-status-chip" style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}>
      <span className="h-2 w-2 rounded-full" style={{ background: tone.dot }} />
      {fallback ?? value ?? ''}
    </span>
  );
}

export default function ProblemList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [state, setState] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isFetching } = useProblems({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    priority: priority || undefined,
    state: state || undefined,
    sortBy: sortField,
    sortDir,
  });

  const problems: Problem[] = data?.data ?? [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? problems.length;
  const totalPages = pagination?.totalPages ?? pagination?.pages ?? Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const hasFilters = Boolean(search || priority || state);

  const rows = useMemo(() => {
    return [...problems].sort((a, b) => {
      if (sortField === 'priority') {
        const rank: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
        return compareValues(rank[a.priority ?? ''] ?? 99, rank[b.priority ?? ''] ?? 99, sortDir);
      }
      if (sortField === 'relatedIncidents') {
        return compareValues(relatedCount(a), relatedCount(b), sortDir);
      }
      if (sortField === 'createdAt') {
        return compareValues(new Date(a.createdAt ?? 0).getTime(), new Date(b.createdAt ?? 0).getTime(), sortDir);
      }
      return compareValues(String(a[sortField] ?? ''), String(b[sortField] ?? ''), sortDir);
    });
  }, [problems, sortField, sortDir]);

  const openCount = problems.filter((item) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(item.state ?? '')).length;
  const knownErrorCount = problems.filter((item) => item.isKnownError || item.state === 'KNOWN_ERROR').length;
  const relatedTotal = problems.reduce((total, item) => total + relatedCount(item), 0);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'createdAt' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setPriority('');
    setState('');
    setPage(1);
  };

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', padding: 24, background: sn.shellBg }}>
      <div className="sn-list-shell">
        <div className="sn-list-titlebar flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[22px] font-bold" style={{ color: sn.navy }}>Problems</div>
            <div className="mt-1 text-[12px]" style={{ color: '#667085' }}>
              List view: <span className="font-bold">All</span> | Total rows: <span className="font-bold">{totalItems}</span> | Open: <span className="font-bold">{openCount}</span> | Known errors: <span className="font-bold">{knownErrorCount}</span> | Related incidents: <span className="font-bold">{relatedTotal}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => refetch()}>
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Refresh
            </button>
            <button type="button" className="sn-primary-button inline-flex items-center gap-2" onClick={() => navigate('/problems/create')}>
              <Plus size={16} />
              New
            </button>
          </div>
        </div>

        <div className="sn-list-toolbar flex flex-col gap-3 px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-[260px] max-w-[520px] flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#667085' }} />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                className="sn-list-input"
                placeholder="Search problems"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={16} style={{ color: '#667085' }} />
              <select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }} className="sn-list-select">
                <option value="">Priority: All</option>
                {PRIORITIES.map((item) => <option key={item} value={item}>{priorityLabel[item]}</option>)}
              </select>
              <select value={state} onChange={(event) => { setState(event.target.value); setPage(1); }} className="sn-list-select">
                <option value="">State: All</option>
                {STATES.map((item) => <option key={item} value={item}>{stateLabel[item]}</option>)}
              </select>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="sn-soft-button inline-flex items-center gap-2">
                  <X size={14} />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[12px]" style={{ color: '#667085' }}>
            Page {page} of {totalPages}
            <button type="button" className="sn-soft-button inline-flex items-center" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeft size={15} />
            </button>
            <button type="button" className="sn-soft-button inline-flex items-center" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {isError ? (
          <div className="sn-list-empty flex items-center justify-center text-sm font-bold" style={{ color: sn.critical }}>
            Unable to load problems.
          </div>
        ) : isLoading ? (
          <div className="sn-list-empty flex items-center justify-center gap-3 text-sm font-bold" style={{ color: '#667085' }}>
            <Loader2 size={18} className="animate-spin" />
            Loading problems...
          </div>
        ) : rows.length === 0 ? (
          <div className="sn-list-empty flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-[20px] font-bold" style={{ color: sn.navy }}>No records to display</div>
            <div className="max-w-md text-sm" style={{ color: '#667085' }}>Change the filter criteria or create a new problem record.</div>
            <button type="button" className="sn-primary-button inline-flex items-center gap-2" onClick={() => navigate('/problems/create')}>
              <Plus size={16} />
              New Problem
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="sn-list-table">
              <colgroup>
                <col style={{ width: 42 }} />
                <col style={{ width: 132 }} />
                <col style={{ width: 128 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 430 }} />
                <col style={{ width: 132 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 168 }} />
                <col style={{ width: 152 }} />
              </colgroup>
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all problems" /></th>
                  <th><SortButton field="number" activeField={sortField} sortDir={sortDir} onSort={handleSort}>Number</SortButton></th>
                  <th><SortButton field="priority" activeField={sortField} sortDir={sortDir} onSort={handleSort}>Priority</SortButton></th>
                  <th><SortButton field="state" activeField={sortField} sortDir={sortDir} onSort={handleSort}>State</SortButton></th>
                  <th><SortButton field="shortDescription" activeField={sortField} sortDir={sortDir} onSort={handleSort}>Short description</SortButton></th>
                  <th><SortButton field="relatedIncidents" activeField={sortField} sortDir={sortDir} onSort={handleSort}>Incidents</SortButton></th>
                  <th>Assigned to</th>
                  <th><SortButton field="createdAt" activeField={sortField} sortDir={sortDir} onSort={handleSort}>Opened</SortButton></th>
                  <th>Known error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((problem) => (
                  <tr key={problem.id} onDoubleClick={() => navigate(`/problems/${problem.id}`)}>
                    <td><input type="checkbox" aria-label={`Select ${problem.number}`} /></td>
                    <td>
                      <button type="button" className="sn-list-link" onClick={() => navigate(`/problems/${problem.id}`)}>
                        {problem.number}
                      </button>
                    </td>
                    <td>
                      <StatusChip
                        value={problem.priority}
                        tones={priorityTone}
                        fallback={priorityLabel[problem.priority ?? ''] ?? problem.priority}
                      />
                    </td>
                    <td>
                      <StatusChip
                        value={problem.state}
                        tones={stateTone}
                        fallback={stateLabel[problem.state ?? ''] ?? problem.state}
                      />
                    </td>
                    <td className="truncate" title={problem.shortDescription}>{problem.shortDescription}</td>
                    <td>{relatedCount(problem)}</td>
                    <td className="truncate" title={personName(problem.assignedTo)}>{personName(problem.assignedTo) || '-'}</td>
                    <td>{formatDateTime(problem.createdAt)}</td>
                    <td className="truncate">
                      {problem.isKnownError || problem.knownErrorId ? (
                        <span style={{ color: sn.critical, fontWeight: 700 }}>{problem.knownErrorId || 'Yes'}</span>
                      ) : (
                        <span style={{ color: '#667085' }}>No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SNPage>
  );
}
