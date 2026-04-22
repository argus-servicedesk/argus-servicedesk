import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight, Filter,
  ClipboardList, Clock, ShieldCheck, CheckCircle2,
  ChevronsUpDown, X,
} from 'lucide-react';
import { useServiceRequests } from '../../hooks/useServiceRequests';
import type { ServiceRequest, ServiceRequestState, Priority } from '../../types/index';

// =============================================================================
// Constants & Mappings
// =============================================================================

const STATE_CONFIG: Record<ServiceRequestState, { label: string; color: string; bg: string; border: string }> = {
  NEW:         { label: 'New',             color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  border: '#3B82F6' },
  APPROVAL:    { label: 'Approval',        color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: '#F59E0B' },
  APPROVED:    { label: 'Approved',         color: '#22C55E', bg: 'rgba(34,197,94,0.10)',   border: '#22C55E' },
  FULFILLMENT: { label: 'Fulfillment',     color: '#6366F1', bg: 'rgba(99,102,241,0.10)',  border: '#6366F1' },
  FULFILLED:   { label: 'Fulfilled',       color: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: '#10B981' },
  CLOSED:      { label: 'Closed',          color: '#64748B', bg: 'rgba(100,116,139,0.10)', border: '#64748B' },
  CANCELLED:   { label: 'Cancelled',       color: '#EF4444', bg: 'rgba(239,68,68,0.10)',   border: '#EF4444' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string }> = {
  P1: { label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  border: '#EF4444' },
  P2: { label: 'High',     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: '#F59E0B' },
  P3: { label: 'Medium',   color: '#6366F1', bg: 'rgba(99,102,241,0.12)', border: '#6366F1' },
  P4: { label: 'Low',      color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: '#10B981' },
};

const ALL_STATES: ServiceRequestState[] = ['NEW', 'APPROVAL', 'APPROVED', 'FULFILLMENT', 'FULFILLED', 'CLOSED', 'CANCELLED'];
const ALL_PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];
const PAGE_SIZES = [15, 25, 50];

// =============================================================================
// Helpers
// =============================================================================

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============================================================================
// Sub-components
// =============================================================================

function StateBadge({ state }: { state: ServiceRequestState }) {
  const cfg = STATE_CONFIG[state];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        lineHeight: '18px',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        lineHeight: '18px',
      }}
    >
      {priority} - {cfg.label}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
        flex: '1 1 0',
        minWidth: 180,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: `${color}14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

function ServiceRequestList() {
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<ServiceRequestState | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const filters = useMemo(() => {
    const f: Record<string, string | number | boolean | undefined> = { page, limit: pageSize };
    if (search) f.search = search;
    if (stateFilter) f.state = stateFilter;
    if (priorityFilter) f.priority = priorityFilter;
    return f;
  }, [search, stateFilter, priorityFilter, page, pageSize]);

  const { data, isLoading, isError } = useServiceRequests(filters);

  const serviceRequests: ServiceRequest[] = data?.data ?? [];
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1 };

  // KPI calculations
  const kpis = useMemo(() => {
    const total = pagination.total ?? serviceRequests.length;
    const open = serviceRequests.filter((sr) => ['NEW', 'APPROVAL', 'APPROVED', 'FULFILLMENT'].includes(sr.state)).length;
    const pendingApproval = serviceRequests.filter((sr) => sr.state === 'APPROVAL').length;
    const fulfilled = serviceRequests.filter((sr) => sr.state === 'FULFILLED').length;
    return { total, open, pendingApproval, fulfilled };
  }, [serviceRequests, pagination.total]);

  const handleRowClick = useCallback(
    (id: string) => navigate(`/service-requests/${id}`),
    [navigate],
  );

  const clearFilters = () => {
    setSearch('');
    setStateFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  const hasActiveFilters = search || stateFilter || priorityFilter;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          padding: '36px 40px 32px',
          marginBottom: 28,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
          Service Requests
        </h1>
        <p style={{ margin: '6px 0 24px', fontSize: 14, color: '#94a3b8' }}>
          Track and manage service requests across your organization
        </p>

        {/* KPI Cards */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <KpiCard icon={ClipboardList} label="Total" value={kpis.total} color="#6366f1" />
          <KpiCard icon={Clock} label="Open" value={kpis.open} color="#F59E0B" />
          <KpiCard icon={ShieldCheck} label="Pending Approval" value={kpis.pendingApproval} color="#8B5CF6" />
          <KpiCard icon={CheckCircle2} label="Fulfilled" value={kpis.fulfilled} color="#10B981" />
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: '0 40px 40px' }}>
        {/* Filter Bar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search service requests..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 14,
                color: '#0f172a',
                backgroundColor: '#F8FAFC',
                outline: 'none',
              }}
            />
          </div>

          {/* State Filter */}
          <div style={{ position: 'relative' }}>
            <Filter size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <select
              value={stateFilter}
              onChange={(e) => { setStateFilter(e.target.value as ServiceRequestState | ''); setPage(1); }}
              style={{
                padding: '9px 32px 9px 30px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 14,
                color: '#0f172a',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
                appearance: 'none',
                outline: 'none',
              }}
            >
              <option value="">All States</option>
              {ALL_STATES.map((s) => (
                <option key={s} value={s}>{STATE_CONFIG[s].label}</option>
              ))}
            </select>
            <ChevronsUpDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>

          {/* Priority Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value as Priority | ''); setPage(1); }}
              style={{
                padding: '9px 32px 9px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 14,
                color: '#0f172a',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
                appearance: 'none',
                outline: 'none',
              }}
            >
              <option value="">All Priorities</option>
              {ALL_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p} - {PRIORITY_CONFIG[p].label}</option>
              ))}
            </select>
            <ChevronsUpDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                fontSize: 13,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {isLoading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              Loading service requests...
            </div>
          ) : isError ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#EF4444', fontSize: 14 }}>
              Failed to load service requests. Please try again.
            </div>
          ) : serviceRequests.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              No service requests found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Number', 'Short Description', 'State', 'Priority', 'Requested By', 'Created At'].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        backgroundColor: '#F8FAFC',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serviceRequests.map((sr) => (
                  <tr
                    key={sr.id}
                    onClick={() => handleRowClick(sr.id)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#6366f1' }}>
                      {sr.number}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#0f172a', maxWidth: 320 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sr.shortDescription}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StateBadge state={sr.state} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <PriorityBadge priority={sr.priority} />
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>
                      {sr.requestedBy
                        ? `${sr.requestedBy.firstName} ${sr.requestedBy.lastName}`
                        : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                      {relativeTime(sr.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {serviceRequests.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span style={{ marginLeft: 8 }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    opacity: page <= 1 ? 0.4 : 1,
                    color: '#0f172a',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                    opacity: page >= pagination.totalPages ? 0.4 : 1,
                    color: '#0f172a',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServiceRequestList;
