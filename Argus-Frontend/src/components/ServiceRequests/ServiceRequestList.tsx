import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
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
import { useAuth } from '../../hooks/useAuth';
import { useServiceRequests } from '../../hooks/useServiceRequests';
import type { Priority, ServiceRequest, ServiceRequestState } from '../../types/index';
import { SNPage, sn } from '../ITSMTemplates/ServiceNowUI';

type SortField = 'number' | 'priority' | 'state' | 'shortDescription' | 'requestedBy' | 'createdAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;
const ALL_STATES: ServiceRequestState[] = ['NEW', 'APPROVAL', 'APPROVED', 'FULFILLMENT', 'FULFILLED', 'CLOSED', 'CANCELLED'];
const ALL_PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];

const priorityLabel: Record<string, string> = {
  P1: '1 - Critical',
  P2: '2 - High',
  P3: '3 - Moderate',
  P4: '4 - Low',
};

const priorityTone: Record<string, { bg: string; fg: string; border: string; dot: string }> = {
  P1: { bg: '#fff6f6', fg: '#d0272b', border: '#fca5a5', dot: '#d0272b' },
  P2: { bg: '#fff7e8', fg: '#b45309', border: '#f5c266', dot: '#f59e0b' },
  P3: { bg: '#eef2ff', fg: '#3730a3', border: '#c7d2fe', dot: '#4f46e5' },
  P4: { bg: '#ecfdf3', fg: '#067647', border: '#9be7bd', dot: '#10b981' },
};

const stateLabel: Record<string, string> = {
  NEW: 'New',
  APPROVAL: 'Approval',
  APPROVED: 'Approved',
  FULFILLMENT: 'Fulfillment',
  FULFILLED: 'Fulfilled',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const stateTone: Record<string, { bg: string; fg: string; border: string; dot: string }> = {
  NEW: { bg: '#eef2ff', fg: '#1d4ed8', border: '#bfdbfe', dot: '#2563eb' },
  APPROVAL: { bg: '#fff7e8', fg: '#b45309', border: '#f5c266', dot: '#f59e0b' },
  APPROVED: { bg: '#ecfdf3', fg: '#067647', border: '#9be7bd', dot: '#12b76a' },
  FULFILLMENT: { bg: '#fff1df', fg: '#f05a00', border: '#fed7aa', dot: '#f05a00' },
  FULFILLED: { bg: '#ecfdf3', fg: '#067647', border: '#9be7bd', dot: '#12b76a' },
  CLOSED: { bg: '#f5f6f7', fg: '#475467', border: '#d8dde6', dot: '#98a2b3' },
  CANCELLED: { bg: '#f5f6f7', fg: '#475467', border: '#d8dde6', dot: '#98a2b3' },
};

type PersonSummary = NonNullable<ServiceRequest['requestedBy']> & {
  first_name?: string;
  last_name?: string;
  username?: string;
};

function personLabel(user: ServiceRequest['requestedBy']): string {
  if (!user) return '';
  const person = user as PersonSummary;
  const first = person.firstName ?? person.first_name ?? '';
  const last = person.lastName ?? person.last_name ?? '';
  return `${first} ${last}`.trim() || person.email || person.username || '';
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

function StatusChip({
  value,
  tones,
  fallback,
}: {
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

export default function ServiceRequestList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [priority, setPriority] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [myRequests, setMyRequests] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useServiceRequests({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    state: state || undefined,
    priority: priority || undefined,
  });

  const serviceRequests = useMemo<ServiceRequest[]>(() => data?.data ?? [], [data?.data]);
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? serviceRequests.length;
  const totalPages = pagination?.totalPages ?? pagination?.pages ?? Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const hasFilters = Boolean(search || state || priority);

  const visibleRequests = useMemo(() => {
    const filtered = myRequests
      ? serviceRequests.filter((item) => item.requestedById === user?.id || item.requestedBy?.id === user?.id)
      : serviceRequests;

    return [...filtered].sort((a, b) => {
      if (sortField === 'priority') {
        const rank: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
        return compareValues(rank[a.priority ?? ''] ?? 99, rank[b.priority ?? ''] ?? 99, sortDir);
      }
      if (sortField === 'createdAt') {
        return compareValues(new Date(a.createdAt ?? 0).getTime(), new Date(b.createdAt ?? 0).getTime(), sortDir);
      }
      if (sortField === 'requestedBy') {
        return compareValues(personLabel(a.requestedBy), personLabel(b.requestedBy), sortDir);
      }
      return compareValues(String(a[sortField] ?? ''), String(b[sortField] ?? ''), sortDir);
    });
  }, [myRequests, serviceRequests, sortDir, sortField, user?.id]);

  const openCount = serviceRequests.filter((item) => !['FULFILLED', 'CLOSED', 'CANCELLED'].includes(item.state)).length;
  const approvalCount = serviceRequests.filter((item) => item.state === 'APPROVAL').length;
  const fulfilledCount = serviceRequests.filter((item) => item.state === 'FULFILLED').length;

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
    setState('');
    setPriority('');
    setPage(1);
  };

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', padding: 24, background: sn.shellBg }}>
      <div className="sn-list-shell">
        <div className="sn-list-titlebar flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-end gap-6">
              <div className="text-[22px] font-bold" style={{ color: sn.navy }}>Service Requests</div>
              <div className="mb-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setMyRequests(false); setPage(1); }}
                  className={clsx('rounded px-3 py-1 text-xs font-bold', !myRequests ? 'bg-slate-200' : 'hover:bg-slate-100')}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => { setMyRequests(true); setPage(1); }}
                  className={clsx('rounded px-3 py-1 text-xs font-bold', myRequests ? 'bg-slate-200' : 'hover:bg-slate-100')}
                >
                  My Requests
                </button>
              </div>
            </div>
            <div className="mt-1 text-[12px]" style={{ color: '#667085' }}>
              List view: <span className="font-bold">{myRequests ? 'My Requests' : 'All'}</span> | Total rows: <span className="font-bold">{totalItems}</span> | Open: <span className="font-bold">{openCount}</span> | Pending approval: <span className="font-bold">{approvalCount}</span> | Fulfilled: <span className="font-bold">{fulfilledCount}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => refetch()}>
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Refresh
            </button>
            <button type="button" className="sn-primary-button inline-flex items-center gap-2" onClick={() => navigate('/service-requests/create')}>
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
                placeholder="Search service requests"
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
            Unable to load service requests.
          </div>
        ) : isLoading ? (
          <div className="sn-list-empty flex items-center justify-center gap-3 text-sm font-bold" style={{ color: '#667085' }}>
            <Loader2 size={18} className="animate-spin" />
            Loading service requests...
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="sn-list-empty flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-[20px] font-bold" style={{ color: sn.navy }}>No records to display</div>
            <div className="max-w-md text-sm" style={{ color: '#667085' }}>Change the filter criteria or create a new service request.</div>
            <button type="button" className="sn-primary-button inline-flex items-center gap-2" onClick={() => navigate('/service-requests/create')}>
              <Plus size={16} />
              New Service Request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="sn-list-table">
              <colgroup>
                <col style={{ width: 42 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 420 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 140 }} />
              </colgroup>
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all service requests" /></th>
                  <th>
                    <HeaderSortFilter field="number" activeField={sortField} sortDir={sortDir} label="Number" onSort={handleSort} />
                  </th>
                  <th>
                    <HeaderSortFilter
                      field="priority" activeField={sortField} sortDir={sortDir} label="Priority" onSort={handleSort}
                      filterValue={priority} onFilterChange={(val) => { setPriority(val); setPage(1); }}
                      options={ALL_PRIORITIES.map(p => ({ value: p, label: priorityLabel[p] }))}
                    />
                  </th>
                  <th>
                    <HeaderSortFilter
                      field="state" activeField={sortField} sortDir={sortDir} label="State" onSort={handleSort}
                      filterValue={state} onFilterChange={(val) => { setState(val); setPage(1); }}
                      options={ALL_STATES.map(s => ({ value: s, label: stateLabel[s] }))}
                    />
                  </th>
                  <th>
                    <HeaderSortFilter field="shortDescription" activeField={sortField} sortDir={sortDir} label="Short description" onSort={handleSort} />
                  </th>
                  <th>
                    <HeaderSortFilter field="requestedBy" activeField={sortField} sortDir={sortDir} label="Requested by" onSort={handleSort} />
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Assignment group</th>
                  <th>
                    <HeaderSortFilter field="createdAt" activeField={sortField} sortDir={sortDir} label="Opened" onSort={handleSort} />
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Items</th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((request) => (
                  <tr key={request.id} onDoubleClick={() => navigate(`/service-requests/${request.id}`)}>
                    <td><input type="checkbox" aria-label={`Select ${request.number}`} /></td>
                    <td>
                      <button type="button" className="sn-list-link" onClick={() => navigate(`/service-requests/${request.id}`)}>
                        {request.number}
                      </button>
                    </td>
                    <td>
                      <StatusChip
                        value={request.priority}
                        tones={priorityTone}
                        fallback={priorityLabel[request.priority] ?? request.priority}
                      />
                    </td>
                    <td>
                      <StatusChip
                        value={request.state}
                        tones={stateTone}
                        fallback={stateLabel[request.state] ?? request.state}
                      />
                    </td>
                    <td className="truncate" title={request.shortDescription}>{request.shortDescription}</td>
                    <td className="truncate" title={personLabel(request.requestedBy)}>{personLabel(request.requestedBy) || '-'}</td>
                    <td className="truncate" title={request.assignmentGroup?.name}>{request.assignmentGroup?.name || '-'}</td>
                    <td>{formatDateTime(request.createdAt)}</td>
                    <td>{request.requestItems?.length ?? 0}</td>
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
