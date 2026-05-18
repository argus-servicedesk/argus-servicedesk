import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
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
import { useChanges } from '../../hooks/useChanges';
import { SNPage, sn } from '../ITSMTemplates/ServiceNowUI';
import { useAuth } from '../../hooks/useAuth';
import clsx from 'clsx';

type SortField = 'number' | 'type' | 'state' | 'risk' | 'shortDescription' | 'plannedStartDate' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface Person {
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
}

interface Change {
  id: string;
  number?: string;
  changeNumber?: string;
  type?: string;
  state?: string;
  risk?: string;
  riskLevel?: string;
  shortDescription?: string;
  title?: string;
  requestedBy?: string | Person | null;
  assignedTo?: string | Person | null;
  assignmentGroup?: { name?: string } | null;
  plannedStartDate?: string;
  plannedEndDate?: string;
  scheduledStart?: string;
  createdAt?: string;
  isAssignedToMe?: boolean;
  canEdit?: boolean;
}

const PAGE_SIZE = 25;
const TYPES = ['NORMAL', 'STANDARD', 'EMERGENCY'] as const;
const STATES = ['NEW', 'ASSESSMENT', 'APPROVAL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'SCHEDULED', 'IMPLEMENTING', 'REVIEW', 'COMPLETED', 'CLOSED', 'CANCELLED'] as const;
const RISKS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const typeLabel: Record<string, string> = {
  NORMAL: 'Normal',
  STANDARD: 'Standard',
  EMERGENCY: 'Emergency',
};

const stateLabel: Record<string, string> = {
  NEW: 'New',
  ASSESSMENT: 'Assessment',
  APPROVAL: 'Approval',
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  IMPLEMENTING: 'Implementing',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const riskTone: Record<string, { bg: string; fg: string; border: string; dot: string }> = {
  LOW: { bg: '#ecfdf3', fg: '#067647', border: '#9be7bd', dot: '#12b76a' },
  MEDIUM: { bg: '#fff7e8', fg: '#b45309', border: '#f5c266', dot: '#f59e0b' },
  HIGH: { bg: '#fff6f6', fg: '#d0272b', border: '#fca5a5', dot: '#d0272b' },
  CRITICAL: { bg: '#fff6f6', fg: '#b42318', border: '#f97066', dot: '#b42318' },
};

const stateTone: Record<string, { bg: string; fg: string; border: string; dot: string }> = {
  NEW: { bg: '#eef2ff', fg: '#1d4ed8', border: '#bfdbfe', dot: '#2563eb' },
  ASSESSMENT: { bg: '#eff6ff', fg: '#075985', border: '#bfdbfe', dot: '#0ea5e9' },
  APPROVAL: { bg: '#fff7e8', fg: '#b45309', border: '#f5c266', dot: '#f59e0b' },
  DRAFT: { bg: '#f5f6f7', fg: '#475467', border: '#d8dde6', dot: '#98a2b3' },
  SUBMITTED: { bg: '#fff7e8', fg: '#b45309', border: '#f5c266', dot: '#f59e0b' },
  APPROVED: { bg: '#eff6ff', fg: '#075985', border: '#bfdbfe', dot: '#0ea5e9' },
  SCHEDULED: { bg: '#eef2ff', fg: '#1d4ed8', border: '#bfdbfe', dot: '#2563eb' },
  IMPLEMENTING: { bg: '#fff1df', fg: '#f05a00', border: '#fed7aa', dot: '#f05a00' },
  REVIEW: { bg: '#f4f3ff', fg: '#5925dc', border: '#d9d6fe', dot: '#7a5af8' },
  COMPLETED: { bg: '#ecfdf3', fg: '#067647', border: '#9be7bd', dot: '#12b76a' },
  CLOSED: { bg: '#f5f6f7', fg: '#475467', border: '#d8dde6', dot: '#98a2b3' },
  CANCELLED: { bg: '#f5f6f7', fg: '#475467', border: '#d8dde6', dot: '#98a2b3' },
};

const typeTone: Record<string, { bg: string; fg: string; border: string; dot: string }> = {
  NORMAL: { bg: '#eff6ff', fg: '#075985', border: '#bfdbfe', dot: '#0ea5e9' },
  STANDARD: { bg: '#ecfdf3', fg: '#067647', border: '#9be7bd', dot: '#12b76a' },
  EMERGENCY: { bg: '#fff6f6', fg: '#d0272b', border: '#fca5a5', dot: '#d0272b' },
};

function personName(value: string | Person | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const first = value.firstName ?? value.first_name ?? '';
  const last = value.lastName ?? value.last_name ?? '';
  return `${first} ${last}`.trim();
}

function changeNumber(change: Change): string {
  return change.number ?? change.changeNumber ?? '';
}

function changeTitle(change: Change): string {
  return change.shortDescription ?? change.title ?? '';
}

function riskValue(change: Change): string {
  return change.risk ?? change.riskLevel ?? '';
}

function startDate(change: Change): string {
  return change.plannedStartDate ?? change.scheduledStart ?? '';
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

interface FilterOption {
  value: string;
  label: string;
}

function HeaderSortFilter({
  field,
  activeField,
  sortDir,
  label,
  onSort,
  filterValue,
  onFilterChange,
  options,
}: {
  field: SortField;
  activeField: SortField;
  sortDir: SortDir;
  label: string;
  onSort: (field: SortField) => void;
  filterValue?: string;
  onFilterChange?: (val: string) => void;
  options?: FilterOption[];
}) {
  const active = field === activeField;
  return (
    <div className="flex items-center justify-between gap-1 w-full text-[11px] font-bold uppercase tracking-wider text-slate-700">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-slate-900 text-left flex-1"
      >
        <span>{label}</span>
        {active && (
          sortDir === 'asc' ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />
        )}
      </button>
      {onFilterChange && options && (
        <div className="relative flex items-center justify-center w-4 h-4 rounded hover:bg-slate-200 cursor-pointer">
          <select
            value={filterValue ?? ''}
            onChange={(e) => onFilterChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title={`Filter by ${label}`}
          >
            <option value="">All</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className={clsx(
              "pointer-events-none",
              filterValue ? "text-blue-600 font-extrabold stroke-[3]" : "text-slate-400"
            )}
          />
        </div>
      )}
    </div>
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

export default function ChangeList() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [state, setState] = useState('');
  const [risk, setRisk] = useState('');
  const [sortField, setSortField] = useState<SortField>('plannedStartDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isFetching } = useChanges({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    type: type || undefined,
    state: state || undefined,
    risk: risk || undefined,
    sortBy: sortField,
    sortDir,
  });

  const changes: Change[] = data?.data ?? [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? changes.length;
  const totalPages = pagination?.totalPages ?? pagination?.pages ?? Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const hasFilters = Boolean(search || type || state || risk);

  const rows = useMemo(() => {
    return [...changes].sort((a, b) => {
      if (sortField === 'risk') {
        const rank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return compareValues(rank[riskValue(a)] ?? 99, rank[riskValue(b)] ?? 99, sortDir);
      }
      if (sortField === 'plannedStartDate') {
        return compareValues(new Date(startDate(a) || 0).getTime(), new Date(startDate(b) || 0).getTime(), sortDir);
      }
      if (sortField === 'createdAt') {
        return compareValues(new Date(a.createdAt ?? 0).getTime(), new Date(b.createdAt ?? 0).getTime(), sortDir);
      }
      if (sortField === 'number') return compareValues(changeNumber(a), changeNumber(b), sortDir);
      if (sortField === 'shortDescription') return compareValues(changeTitle(a), changeTitle(b), sortDir);
      return compareValues(String(a[sortField] ?? ''), String(b[sortField] ?? ''), sortDir);
    });
  }, [changes, sortField, sortDir]);

  const openCount = changes.filter((item) => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(item.state ?? '')).length;
  const emergencyCount = changes.filter((item) => item.type === 'EMERGENCY').length;
  const implementingCount = changes.filter((item) => item.state === 'IMPLEMENTING').length;

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'plannedStartDate' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setType('');
    setState('');
    setRisk('');
    setPage(1);
  };

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', padding: 24, background: sn.shellBg }}>
      <div className="sn-list-shell">
        <div className="sn-list-titlebar flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[22px] font-bold" style={{ color: sn.navy }}>Changes</div>
            <div className="mt-1 text-[12px]" style={{ color: '#667085' }}>
              List view: <span className="font-bold">All</span> | Total rows: <span className="font-bold">{totalItems}</span> | Open: <span className="font-bold">{openCount}</span> | Implementing: <span className="font-bold">{implementingCount}</span> | Emergency: <span className="font-bold">{emergencyCount}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => navigate('/changes/calendar')}>
              <CalendarDays size={15} />
              Calendar
            </button>
            <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => refetch()}>
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Refresh
            </button>
            {canManage('changes') && (
              <button type="button" className="sn-primary-button inline-flex items-center gap-2" onClick={() => navigate('/changes/create')}>
                <Plus size={16} />
                New
              </button>
            )}
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
                placeholder="Search changes"
              />
            </div>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="sn-soft-button inline-flex items-center gap-2">
                <X size={14} />
                Clear Filters
              </button>
            )}
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
            Unable to load changes.
          </div>
        ) : isLoading ? (
          <div className="sn-list-empty flex items-center justify-center gap-3 text-sm font-bold" style={{ color: '#667085' }}>
            <Loader2 size={18} className="animate-spin" />
            Loading changes...
          </div>
        ) : rows.length === 0 ? (
          <div className="sn-list-empty flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-[20px] font-bold" style={{ color: sn.navy }}>No records to display</div>
            <div className="max-w-md text-sm" style={{ color: '#667085' }}>Change the filter criteria or create a new change record.</div>
            {canManage('changes') && (
              <button type="button" className="sn-primary-button inline-flex items-center gap-2" onClick={() => navigate('/changes/create')}>
                <Plus size={16} />
                New Change
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="sn-list-table">
              <colgroup>
                <col style={{ width: 42 }} />
                <col style={{ width: 64 }} />
                <col style={{ width: 132 }} />
                <col style={{ width: 118 }} />
                <col style={{ width: 142 }} />
                <col style={{ width: 118 }} />
                <col style={{ width: 410 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 168 }} />
                <col style={{ width: 168 }} />
              </colgroup>
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all changes" /></th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-slate-700" title="Assigned to you directly or through your team">Mine</th>
                  <th>
                    <HeaderSortFilter field="number" activeField={sortField} sortDir={sortDir} label="Number" onSort={handleSort} />
                  </th>
                  <th>
                    <HeaderSortFilter
                      field="type" activeField={sortField} sortDir={sortDir} label="Type" onSort={handleSort}
                      filterValue={type} onFilterChange={(val) => { setType(val); setPage(1); }}
                      options={TYPES.map(t => ({ value: t, label: typeLabel[t] }))}
                    />
                  </th>
                  <th>
                    <HeaderSortFilter
                      field="state" activeField={sortField} sortDir={sortDir} label="State" onSort={handleSort}
                      filterValue={state} onFilterChange={(val) => { setState(val); setPage(1); }}
                      options={STATES.map(s => ({ value: s, label: stateLabel[s] }))}
                    />
                  </th>
                  <th>
                    <HeaderSortFilter
                      field="risk" activeField={sortField} sortDir={sortDir} label="Risk" onSort={handleSort}
                      filterValue={risk} onFilterChange={(val) => { setRisk(val); setPage(1); }}
                      options={RISKS.map(r => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))}
                    />
                  </th>
                  <th>
                    <HeaderSortFilter field="shortDescription" activeField={sortField} sortDir={sortDir} label="Short description" onSort={handleSort} />
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Requested by</th>
                  <th>
                    <HeaderSortFilter field="plannedStartDate" activeField={sortField} sortDir={sortDir} label="Planned start" onSort={handleSort} />
                  </th>
                  <th>
                    <HeaderSortFilter field="createdAt" activeField={sortField} sortDir={sortDir} label="Created" onSort={handleSort} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((change) => {
                  const isMine = Boolean(change.isAssignedToMe);
                  return (
                  <tr key={change.id} className={isMine ? 'sn-row-mine' : undefined} onDoubleClick={() => navigate(`/changes/${change.id}`)}>
                    <td><input type="checkbox" aria-label={`Select ${changeNumber(change)}`} /></td>
                    <td className="sn-ownership-cell">
                      {isMine ? (
                        <span className="sn-owned-badge" title="Assigned to you directly or through your team">Mine</span>
                      ) : null}
                    </td>
                    <td>
                      <button type="button" className="sn-list-link" onClick={() => navigate(`/changes/${change.id}`)}>
                        {changeNumber(change)}
                      </button>
                    </td>
                    <td><StatusChip value={change.type} tones={typeTone} fallback={typeLabel[change.type ?? ''] ?? change.type} /></td>
                    <td><StatusChip value={change.state} tones={stateTone} fallback={stateLabel[change.state ?? ''] ?? change.state} /></td>
                    <td><StatusChip value={riskValue(change)} tones={riskTone} fallback={riskValue(change)} /></td>
                    <td className="truncate" title={changeTitle(change)}>{changeTitle(change)}</td>
                    <td className="truncate" title={personName(change.requestedBy ?? change.assignedTo)}>{personName(change.requestedBy ?? change.assignedTo) || '-'}</td>
                    <td>{formatDateTime(startDate(change))}</td>
                    <td>{formatDateTime(change.createdAt)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SNPage>
  );
}
