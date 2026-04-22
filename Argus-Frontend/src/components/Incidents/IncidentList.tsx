import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, ShieldAlert, Timer, X, Filter,
  LayoutList, Kanban, CalendarClock, Flame,
  Hash, Mail, Mic, Radio, Globe, Zap, UserPlus, ArrowUpRight,
  CheckCircle2, Eye, Activity, TrendingUp,
  ChevronsUpDown, SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import { useIncidents } from '../../hooks/useIncidents';
import { QuickReportButton } from './IncidentReportGenerator';

// =============================================================================
// Types
// =============================================================================

type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type IncidentState = 'NEW' | 'IN_PROGRESS' | 'ON_HOLD' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
type ViewMode = 'table' | 'board' | 'timeline';
type SortField = 'number' | 'priority' | 'state' | 'shortDescription' | 'assignedTo' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface Incident {
  id: string; number: string; priority: Priority;
  state: IncidentState; shortDescription: string; description?: string;
  assignedTo: { firstName: string; lastName: string } | null;
  assignmentGroup?: { name: string } | null;
  source?: string; category?: string;
  configItem?: { id: string; name: string; hostname?: string; ipAddress?: string } | null;
  createdAt: string; updatedAt?: string;
  slaBreached?: boolean; resolvedAt?: string | null;
  impact?: string; urgency?: string;
}

// =============================================================================
// Constants & Mappings
// =============================================================================

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dotColor: string; borderColor: string; bgColor: string; badgeClass: string }> = {
  P1: { label: 'Critical', color: '#EF4444', dotColor: '#EF4444', borderColor: '#EF4444', bgColor: 'rgba(239,68,68,0.12)', badgeClass: 'priority-p1' },
  P2: { label: 'High',     color: '#F59E0B', dotColor: '#F59E0B', borderColor: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)', badgeClass: 'priority-p2' },
  P3: { label: 'Medium',   color: '#6366f1', dotColor: '#6366f1', borderColor: '#6366f1', bgColor: 'transparent', badgeClass: 'priority-p3' },
  P4: { label: 'Low',      color: '#10B981', dotColor: '#10B981', borderColor: '#10B981', bgColor: 'transparent', badgeClass: 'priority-p4' },
};

const STATE_CONFIG: Record<IncidentState, { label: string; badgeClass: string; columnColor: string; borderColor: string }> = {
  NEW:         { label: 'New',         badgeClass: 'state-new',         columnColor: '#a855f7',  borderColor: '#a855f7' },
  IN_PROGRESS: { label: 'In Progress', badgeClass: 'state-in-progress', columnColor: '#6366f1',  borderColor: '#6366f1' },
  ON_HOLD:     { label: 'On Hold',     badgeClass: 'state-on-hold',     columnColor: '#F59E0B',  borderColor: '#F59E0B' },
  ESCALATED:   { label: 'Escalated',   badgeClass: 'state-escalated',   columnColor: '#EF4444',  borderColor: '#EF4444' },
  RESOLVED:    { label: 'Resolved',    badgeClass: 'state-resolved',    columnColor: '#10B981',  borderColor: '#10B981' },
  CLOSED:      { label: 'Closed',      badgeClass: 'state-closed',      columnColor: '#94a3b8',  borderColor: '#94a3b8' },
};

const ALL_STATES: IncidentState[] = ['NEW', 'IN_PROGRESS', 'ON_HOLD', 'ESCALATED', 'RESOLVED', 'CLOSED'];
const ALL_PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  MANUAL: Hash,
  PROMETHEUS: Activity,
  GRAFANA: Flame,
  API: Globe,
  EMAIL: Mail,
  VOICE: Mic,
  SLACK: Radio,
};

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'state', label: 'State' },
  { value: 'number', label: 'Incident Number' },
  { value: 'shortDescription', label: 'Title' },
];

const PAGE_SIZES = [15, 25, 50];

// =============================================================================
// Helpers
// =============================================================================

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function getSlaProgress(incident: Incident): { percent: number; status: 'ok' | 'warning' | 'danger' } {
  if (incident.slaBreached) return { percent: 100, status: 'danger' };
  if (incident.state === 'RESOLVED' || incident.state === 'CLOSED') return { percent: 0, status: 'ok' };
  const created = new Date(incident.createdAt).getTime();
  const now = Date.now();
  const elapsed = now - created;
  const slaMinutes = incident.priority === 'P1' ? 60 : incident.priority === 'P2' ? 240 : incident.priority === 'P3' ? 1440 : 4320;
  const slaMs = slaMinutes * 60 * 1000;
  const percent = Math.min(100, Math.round((elapsed / slaMs) * 100));
  if (percent > 80) return { percent, status: 'danger' };
  if (percent > 50) return { percent, status: 'warning' };
  return { percent, status: 'ok' };
}

// =============================================================================
// Sub-Components
// =============================================================================

function SkeletonTable() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}
    >
      <div className="px-4 py-3" style={{ background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
        <div className="flex items-center gap-6">
          <div className="w-5 h-5 rounded animate-pulse" style={{ background: 'rgba(99,102,241,0.10)' }} />
          {[80, 60, 200, 70, 80, 100, 80, 60].map((w, i) => (
            <div key={i} className="h-3 rounded animate-pulse" style={{ width: `${w}px`, background: 'rgba(99,102,241,0.10)' }} />
          ))}
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-4 flex items-center gap-6" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
          <div className="w-5 h-5 rounded animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
          <div className="w-12 h-6 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
          <div className="w-24 h-4 rounded animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded animate-pulse w-3/4" style={{ background: 'rgba(99,102,241,0.06)' }} />
            <div className="h-3 rounded animate-pulse w-1/3" style={{ background: 'rgba(99,102,241,0.04)' }} />
          </div>
          <div className="w-20 h-6 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
            <div className="w-16 h-3 rounded animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
          </div>
          <div className="w-16 h-3 rounded animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
          <div className="w-12 h-3 rounded animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div
      className="rounded-2xl py-20 px-8 flex flex-col items-center justify-center text-center"
      style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(16,185,129,0.12)' }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 4L6 12V28L20 36L34 28V12L20 4Z" stroke="#10B981" strokeWidth="2" strokeLinejoin="round" fill="rgba(16,185,129,0.15)" />
          <path d="M14 20L18 24L26 16" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="font-display text-xl font-bold mb-2" style={{ color: '#0f172a' }}>All Clear</h3>
      <p className="text-sm max-w-sm mb-8" style={{ color: '#64748b' }}>
        No incidents match your current filters. Adjust your search criteria or create a new incident to get started.
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
      >
        <Plus size={16} />
        Create Incident
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  pulse,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
  pulse?: boolean;
  delay: number;
}) {
  return (
    <div
      className="backdrop-blur-md rounded-xl p-4 hover:scale-[1.03] transition-all duration-300 group animate-fade-in"
      style={{
        animationDelay: `${delay}ms`,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
          <p className="font-display text-2xl font-extrabold" style={{ color: '#ffffff' }}>{value}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center relative"
          style={{ background: iconBg }}
        >
          <Icon style={{ color: iconColor }} size={18} />
          {pulse && value > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
          )}
        </div>
      </div>
    </div>
  );
}

function AvatarInitials({ firstName, lastName, size = 'sm' }: { firstName: string; lastName: string; size?: 'sm' | 'md' }) {
  const initials = getInitials(firstName, lastName);
  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-full font-semibold flex-shrink-0',
        size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs'
      )}
      style={{ background: 'rgba(99,102,241,0.2)', color: '#334155' }}
    >
      {initials}
    </div>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const IconComp = SOURCE_ICONS[source] || Zap;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] rounded px-1 py-0.5 ml-1.5 font-medium"
      style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.10)' }}
    >
      <IconComp size={10} />
      {source.charAt(0) + source.slice(1).toLowerCase()}
    </span>
  );
}

function SlaIndicator({ incident }: { incident: Incident }) {
  const { percent, status } = getSlaProgress(incident);
  if (incident.state === 'RESOLVED' || incident.state === 'CLOSED') {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle2 size={12} style={{ color: '#10B981' }} />
        <span className="font-mono text-[10px]" style={{ color: '#059669' }}>Done</span>
      </div>
    );
  }
  const barColor = status === 'danger' ? '#EF4444' : status === 'warning' ? '#F59E0B' : '#10B981';
  const textColor = status === 'danger' ? '#FCA5A5' : status === 'warning' ? '#FCD34D' : '#94a3b8';
  return (
    <div className="min-w-[56px]">
      <span className="font-mono text-[10px]" style={{ color: textColor }}>
        {incident.slaBreached ? 'Breached' : `${percent}%`}
      </span>
      <div className="w-full h-1 rounded-full mt-0.5 overflow-hidden" style={{ background: 'rgba(99,102,241,0.10)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, background: barColor }} />
      </div>
    </div>
  );
}

// =============================================================================
// Board View
// =============================================================================

function BoardView({
  incidents,
  selectedIds,
  onToggleSelect,
  onNavigate,
}: {
  incidents: Incident[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const columns = useMemo(() => {
    const map: Record<IncidentState, Incident[]> = {
      NEW: [], IN_PROGRESS: [], ON_HOLD: [], ESCALATED: [], RESOLVED: [], CLOSED: [],
    };
    incidents.forEach((inc) => {
      if (map[inc.state]) map[inc.state].push(inc);
    });
    return map;
  }, [incidents]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {ALL_STATES.map((state) => {
        const config = STATE_CONFIG[state];
        const items = columns[state];
        return (
          <div key={state} className="flex-shrink-0 w-72">
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(99,102,241,0.12)',
                borderTop: `3px solid ${config.borderColor}`,
              }}
            >
              <div className="px-3 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#334155' }}>{config.label}</span>
                </div>
                <span
                  className="text-[10px] font-mono font-bold rounded-full px-2 py-0.5"
                  style={{ color: '#64748b', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                  {items.length}
                </span>
              </div>
              <div className="px-2 pb-2 space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
                {items.length === 0 && (
                  <div className="text-center py-8 text-xs" style={{ color: '#94a3b8' }}>No incidents</div>
                )}
                {items.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => onNavigate(inc.id)}
                    className="rounded-lg p-3 transition-shadow cursor-pointer group"
                    style={{
                      background: selectedIds.has(inc.id) ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.06)',
                      border: selectedIds.has(inc.id) ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(99,102,241,0.10)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_CONFIG[inc.priority].dotColor }} />
                        <span className="font-mono text-[10px] font-semibold" style={{ color: '#94a3b8' }}>{inc.number}</span>
                      </div>
                      <span className={clsx('badge text-[10px]', PRIORITY_CONFIG[inc.priority].badgeClass)}>
                        {inc.priority}
                      </span>
                    </div>
                    <p className="text-sm font-medium line-clamp-2 mb-2.5 leading-snug" style={{ color: '#0f172a' }}>
                      {inc.shortDescription}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {inc.assignedTo ? (
                          <>
                            <AvatarInitials firstName={inc.assignedTo.firstName} lastName={inc.assignedTo.lastName} />
                            <span className="text-[10px] truncate max-w-[80px]" style={{ color: '#64748b' }}>
                              {inc.assignedTo.firstName}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] italic" style={{ color: '#94a3b8' }}>Unassigned</span>
                        )}
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: '#94a3b8' }}>
                        {relativeTime(inc.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Timeline View
// =============================================================================

function TimelineView({
  incidents,
  onNavigate,
}: {
  incidents: Incident[];
  onNavigate: (id: string) => void;
}) {
  const sorted = useMemo(
    () => [...incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [incidents]
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>
        No incidents to display on timeline.
      </div>
    );
  }

  return (
    <div className="relative max-w-4xl mx-auto py-4">
      {/* Vertical line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2" style={{ background: 'rgba(99,102,241,0.15)' }} />

      {sorted.map((inc, idx) => {
        const isLeft = idx % 2 === 0;
        const prioConfig = PRIORITY_CONFIG[inc.priority];
        return (
          <div
            key={inc.id}
            className={clsx(
              'relative flex items-center mb-6 animate-fade-in',
              isLeft ? 'flex-row' : 'flex-row-reverse'
            )}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Card side */}
            <div className={clsx('w-[calc(50%-24px)]', isLeft ? 'pr-4 text-right' : 'pl-4 text-left')}>
              <div
                onClick={() => onNavigate(inc.id)}
                className="rounded-xl p-4 transition-all cursor-pointer group inline-block text-left w-full"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(99,102,241,0.12)',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={clsx('badge text-[10px]', prioConfig.badgeClass)}>{inc.priority}</span>
                  <span className="font-mono text-[10px] font-semibold" style={{ color: '#94a3b8' }}>{inc.number}</span>
                  <span className={clsx('badge text-[10px]', STATE_CONFIG[inc.state].badgeClass)}>
                    {STATE_CONFIG[inc.state].label}
                  </span>
                </div>
                <p className="text-sm font-medium line-clamp-2 leading-snug mb-2" style={{ color: '#0f172a' }}>
                  {inc.shortDescription}
                </p>
                <div className="flex items-center gap-2">
                  {inc.assignedTo ? (
                    <div className="flex items-center gap-1.5">
                      <AvatarInitials firstName={inc.assignedTo.firstName} lastName={inc.assignedTo.lastName} />
                      <span className="text-[10px]" style={{ color: '#64748b' }}>
                        {inc.assignedTo.firstName} {inc.assignedTo.lastName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] italic" style={{ color: '#94a3b8' }}>Unassigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Center dot */}
            <div className="relative z-10 flex-shrink-0">
              <div
                className="w-4 h-4 rounded-full shadow-sm"
                style={{ background: prioConfig.dotColor, border: '3px solid #ffffff' }}
              />
            </div>

            {/* Time side */}
            <div className={clsx('w-[calc(50%-24px)]', isLeft ? 'pl-4 text-left' : 'pr-4 text-right')}>
              <span className="font-mono text-xs" style={{ color: '#64748b' }}>{relativeTime(inc.createdAt)}</span>
              <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                {new Date(inc.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Bulk Action Bar
// =============================================================================

function BulkActionBar({
  count,
  onDeselectAll,
  onAssign,
  onEscalate,
  onExport,
}: {
  count: number;
  onDeselectAll: () => void;
  onAssign: () => void;
  onEscalate: () => void;
  onExport: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-slide-in">
      <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
      <div className="px-6 py-3" style={{ background: '#ffffff', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#334155' }}
            >
              {count}
            </span>
            <span className="text-sm font-medium" style={{ color: '#334155' }}>
              incident{count !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAssign}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ color: '#334155', background: 'rgba(99,102,241,0.10)' }}
            >
              <UserPlus size={13} />
              Assign
            </button>
            <button
              onClick={onEscalate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ color: '#a855f7', background: 'rgba(217,70,239,0.12)' }}
            >
              <ArrowUpRight size={13} />
              Escalate
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ color: '#a855f7', background: 'rgba(217,70,239,0.12)' }}
            >
              <TrendingUp size={13} />
              Export
            </button>
            <div className="w-px h-5 mx-1" style={{ background: 'rgba(99,102,241,0.15)' }} />
            <button
              onClick={onDeselectAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ color: '#94a3b8' }}
            >
              <X size={13} />
              Deselect All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Pagination
// =============================================================================

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
}) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      const rangeStart = Math.max(2, page - 1);
      const rangeEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  if (total === 0) return null;

  return (
    <div
      className="rounded-xl p-3 flex items-center justify-between"
      style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ color: '#94a3b8' }}>
          Showing <span className="font-semibold" style={{ color: '#334155' }}>{start}-{end}</span> of{' '}
          <span className="font-semibold" style={{ color: '#334155' }}>{total}</span> incidents
        </span>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: '#94a3b8' }}>Per page</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="text-xs rounded-md px-1.5 py-0.5 focus:outline-none transition-all"
            style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.15)',
              color: '#334155',
            }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ color: '#64748b' }}
        >
          <ChevronLeft size={14} />
        </button>
        {pageNumbers.map((pn, idx) =>
          pn === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1 text-xs" style={{ color: '#94a3b8' }}>...</span>
          ) : (
            <button
              key={pn}
              onClick={() => onPageChange(pn)}
              className="w-7 h-7 rounded-md text-xs font-medium transition-all"
              style={
                pn === page
                  ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }
                  : { color: '#64748b' }
              }
            >
              {pn}
            </button>
          )
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ color: '#64748b' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function IncidentList() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // -- Filter & UI State --
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activePriorities, setActivePriorities] = useState<Set<Priority>>(new Set());
  const [activeStates, setActiveStates] = useState<Set<IncidentState>>(new Set());
  const [showStateFilter, setShowStateFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedRowIdx, setFocusedRowIdx] = useState<number>(-1);

  const stateDropdownRef = useRef<HTMLDivElement>(null);

  // -- Debounce search --
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // -- Close state dropdown on outside click --
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setShowStateFilter(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // -- Build filters --
  const filters = useMemo(() => {
    const f: Record<string, any> = {
      page,
      limit: viewMode === 'table' ? limit : 100,
      sortBy,
      sortOrder,
    };
    if (debouncedSearch) f.search = debouncedSearch;
    if (activePriorities.size === 1) f.priority = Array.from(activePriorities)[0];
    if (activePriorities.size > 1) f.priority = Array.from(activePriorities).join(',');
    if (activeStates.size === 1) f.state = Array.from(activeStates)[0];
    if (activeStates.size > 1) f.state = Array.from(activeStates).join(',');
    return f;
  }, [page, limit, sortBy, sortOrder, debouncedSearch, activePriorities, activeStates, viewMode]);

  // -- API Call --
  const { data: response, isLoading } = useIncidents(filters);
  const incidents: Incident[] = response?.data ?? [];
  const pagination = response?.pagination ?? { total: 0, page: 1, limit: 15, totalPages: 0 };

  // -- Computed stats --
  const stats = useMemo(() => {
    const active = incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.state)).length;
    const critical = incidents.filter((i) => i.priority === 'P1').length;
    const high = incidents.filter((i) => i.priority === 'P2').length;
    const slaBreach = incidents.filter((i) => i.slaBreached).length;
    const resolvedToday = incidents.filter(
      (i) => (i.state === 'RESOLVED' || i.state === 'CLOSED') && (isToday(i.resolvedAt) || isToday(i.updatedAt))
    ).length;
    return { active, critical, high, slaBreach, resolvedToday };
  }, [incidents]);

  // -- Handlers --
  const togglePriority = useCallback((p: Priority) => {
    setActivePriorities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
    setPage(1);
  }, []);

  const toggleState = useCallback((s: IncidentState) => {
    setActiveStates((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
    setPage(1);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === incidents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(incidents.map((i) => i.id)));
    }
  }, [incidents, selectedIds.size]);

  const handleRowClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input[type="checkbox"]')) return;
      navigate(`/incidents/${id}`);
    },
    [navigate]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('desc');
      }
      setPage(1);
    },
    [sortBy]
  );

  // -- Keyboard navigation --
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
      if (viewMode !== 'table') return;

      if (e.key === 'j') {
        e.preventDefault();
        setFocusedRowIdx((prev) => Math.min(prev + 1, incidents.length - 1));
      } else if (e.key === 'k') {
        e.preventDefault();
        setFocusedRowIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusedRowIdx >= 0 && focusedRowIdx < incidents.length) {
        e.preventDefault();
        navigate(`/incidents/${incidents[focusedRowIdx].id}`);
      } else if (e.key === 'x' && focusedRowIdx >= 0 && focusedRowIdx < incidents.length) {
        e.preventDefault();
        toggleSelect(incidents[focusedRowIdx].id);
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [viewMode, incidents, focusedRowIdx, navigate, toggleSelect]);

  // -- Scroll focused row into view --
  useEffect(() => {
    if (focusedRowIdx < 0 || viewMode !== 'table') return;
    const rows = tableRef.current?.querySelectorAll('tbody tr');
    if (rows && rows[focusedRowIdx]) {
      rows[focusedRowIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedRowIdx, viewMode]);

  // -- Sort indicator --
  function SortIndicator({ field }: { field: SortField }) {
    if (sortBy !== field) return <ChevronsUpDown size={12} style={{ color: '#94a3b8' }} className="ml-0.5" />;
    return sortOrder === 'asc'
      ? <ChevronUp size={12} style={{ color: '#a855f7' }} className="ml-0.5" />
      : <ChevronDown size={12} style={{ color: '#a855f7' }} className="ml-0.5" />;
  }

  // -- Render --
  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      {/* ------------------------------------------------------------------ */}
      {/* HERO BANNER                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}
      >
        {/* Dot grid texture */}
        <div className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Ambient glow blobs */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4"
          style={{ background: 'rgba(217,119,6,0.25)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"
          style={{ background: 'rgba(245,158,11,0.15)' }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'rgba(251,191,36,0.10)' }}
        />

        <div className="relative px-6 pt-6 pb-6">
          {/* Top row: Title + Actions */}
          <div className="flex items-start justify-between">
            {/* Left: icon + title + context */}
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(217,119,6,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(217,119,6,0.25)' }}
                >
                  <AlertTriangle size={20} style={{ color: '#FBBF24' }} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>
                    Incident Management
                  </h1>
                  <p className="text-xs font-body mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Production Environment &middot; Real-time monitoring & response
                  </p>
                </div>
              </div>
            </div>

            {/* Right: quick-action buttons */}
            <div className="flex items-center gap-3">
              {/* View Board button */}
              <button
                onClick={() => { setViewMode('board'); setFocusedRowIdx(-1); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Kanban size={15} />
                View Board
              </button>

              {/* + New Incident button */}
              <button
                onClick={() => navigate('/incidents/create')}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)', boxShadow: '0 4px 20px rgba(217,119,6,0.35)' }}
              >
                <Plus size={15} />
                New Incident
              </button>
            </div>
          </div>

          {/* KPI Pills row */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            {/* Total */}
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}
            >
              <Activity size={14} style={{ color: '#94A3B8' }} />
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Total</span>
              <span className="font-display text-base font-bold" style={{ color: '#FFFFFF' }}>{pagination.total}</span>
            </div>
            {/* P1 Critical */}
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', backdropFilter: 'blur(8px)' }}
            >
              <Flame size={14} style={{ color: '#EF4444' }} />
              <span className="text-xs font-medium" style={{ color: 'rgba(239,68,68,0.7)' }}>P1</span>
              <span className="font-display text-base font-bold" style={{ color: '#FCA5A5' }}>{stats.critical}</span>
              {stats.critical > 0 && (
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
              )}
            </div>
            {/* P2 High */}
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)', backdropFilter: 'blur(8px)' }}
            >
              <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
              <span className="text-xs font-medium" style={{ color: 'rgba(245,158,11,0.7)' }}>P2</span>
              <span className="font-display text-base font-bold" style={{ color: '#FDE68A' }}>{stats.high}</span>
            </div>
            {/* Open / Active */}
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg"
              style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)', backdropFilter: 'blur(8px)' }}
            >
              <Eye size={14} style={{ color: '#818CF8' }} />
              <span className="text-xs font-medium" style={{ color: 'rgba(99,102,241,0.7)' }}>Open</span>
              <span className="font-display text-base font-bold" style={{ color: '#C7D2FE' }}>{stats.active}</span>
            </div>
            {/* SLA Breached */}
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <Timer size={14} style={{ color: '#F87171' }} />
              <span className="text-xs font-medium" style={{ color: 'rgba(239,68,68,0.6)' }}>SLA Breached</span>
              <span className="font-display text-base font-bold" style={{ color: '#FCA5A5' }}>{stats.slaBreach}</span>
            </div>
          </div>

          {/* View mode toggle (below KPIs) */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-[10px] uppercase tracking-wider font-medium mr-1" style={{ color: 'rgba(255,255,255,0.35)' }}>View</span>
            <div className="flex items-center rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {([
                { mode: 'table' as ViewMode, icon: LayoutList, label: 'Table' },
                { mode: 'board' as ViewMode, icon: Kanban, label: 'Board' },
                { mode: 'timeline' as ViewMode, icon: CalendarClock, label: 'Timeline' },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); setFocusedRowIdx(-1); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
                  style={
                    viewMode === mode
                      ? { background: 'rgba(217,119,6,0.25)', color: '#FBBF24', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)' }
                      : { color: 'rgba(255,255,255,0.45)' }
                  }
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Amber gradient accent line */}
      <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #D97706, #F59E0B, #FBBF24, transparent)' }} />

      {/* ------------------------------------------------------------------ */}
      {/* FILTER BAR                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="-mt-3 relative z-10 backdrop-blur-xl rounded-xl p-3 mb-4"
        style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incidents..."
              className="w-full pl-9 pr-16 py-2 rounded-lg text-sm focus:outline-none transition-all"
              style={{
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                color: '#0f172a',
              }}
            />
            <kbd
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] rounded px-1.5 py-0.5 font-mono hidden sm:inline-block"
              style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)' }}
            >
              {'\u2318'}K
            </kbd>
          </div>

          {/* Divider */}
          <div className="w-px h-6 hidden sm:block" style={{ background: 'rgba(99,102,241,0.15)' }} />

          {/* Priority pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-medium mr-0.5" style={{ color: '#94a3b8' }}>Priority</span>
            {ALL_PRIORITIES.map((p) => {
              const isActive = activePriorities.has(p);
              const config = PRIORITY_CONFIG[p];
              return (
                <button
                  key={p}
                  onClick={() => togglePriority(p)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all duration-200"
                  style={
                    isActive
                      ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }
                      : { background: 'rgba(99,102,241,0.06)', color: '#64748b', border: '1px solid rgba(99,102,241,0.12)' }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dotColor }} />
                  {p}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-6 hidden sm:block" style={{ background: 'rgba(99,102,241,0.15)' }} />

          {/* State filter dropdown */}
          <div className="relative" ref={stateDropdownRef}>
            <button
              onClick={() => setShowStateFilter(!showStateFilter)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                activeStates.size > 0
                  ? { background: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.25)' }
                  : { background: 'rgba(99,102,241,0.06)', color: '#64748b', border: '1px solid rgba(99,102,241,0.12)' }
              }
            >
              <Filter size={13} />
              State
              {activeStates.size > 0 && (
                <span
                  className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold"
                  style={{ background: '#6366f1', color: '#FFFFFF' }}
                >
                  {activeStates.size}
                </span>
              )}
            </button>
            {showStateFilter && (
              <div
                className="absolute top-full left-0 mt-1.5 rounded-xl p-2 z-30 min-w-[180px] animate-fade-in"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(99,102,241,0.15)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                {ALL_STATES.map((s) => {
                  const isActive = activeStates.has(s);
                  const config = STATE_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => toggleState(s)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={
                        isActive
                          ? { background: 'rgba(99,102,241,0.15)', color: '#334155' }
                          : { color: '#64748b' }
                      }
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: config.columnColor }} />
                      {config.label}
                      {isActive && <CheckCircle2 size={12} className="ml-auto" style={{ color: '#6366f1' }} />}
                    </button>
                  );
                })}
                {activeStates.size > 0 && (
                  <>
                    <div className="h-px my-1.5" style={{ background: 'rgba(99,102,241,0.10)' }} />
                    <button
                      onClick={() => { setActiveStates(new Set()); setPage(1); }}
                      className="w-full text-left px-2.5 py-1.5 text-[10px] rounded-lg"
                      style={{ color: '#94a3b8' }}
                    >
                      Clear all
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal size={13} style={{ color: '#94a3b8' }} />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortField); setPage(1); }}
              className="min-w-[120px] text-xs rounded-md px-2 py-1 focus:outline-none"
              style={{
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.12)',
                color: '#334155',
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: '#64748b' }}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Active filter count + clear */}
          {(activePriorities.size > 0 || activeStates.size > 0 || debouncedSearch) && (
            <button
              onClick={() => {
                setActivePriorities(new Set());
                setActiveStates(new Set());
                setSearch('');
                setDebouncedSearch('');
                setPage(1);
              }}
              className="flex items-center gap-1 text-[10px] transition-colors"
              style={{ color: '#94a3b8' }}
            >
              <X size={11} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CONTENT AREA                                                        */}
      {/* ------------------------------------------------------------------ */}

      {isLoading ? (
        <SkeletonTable />
      ) : incidents.length === 0 ? (
        <EmptyState onCreateClick={() => navigate('/incidents/create')} />
      ) : viewMode === 'table' ? (
        /* -- TABLE VIEW -- */
        <div
          ref={tableRef}
          className="rounded-xl overflow-hidden mb-4"
          style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid rgba(99,102,241,0.10)' }}>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={incidents.length > 0 && selectedIds.size === incidents.length}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                      style={{ accentColor: '#6366f1' }}
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button onClick={() => handleSort('priority')} className="flex items-center text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: '#94a3b8' }}>
                      Priority <SortIndicator field="priority" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button onClick={() => handleSort('number')} className="flex items-center text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: '#94a3b8' }}>
                      Number <SortIndicator field="number" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left min-w-[280px]">
                    <button onClick={() => handleSort('shortDescription')} className="flex items-center text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: '#94a3b8' }}>
                      Title <SortIndicator field="shortDescription" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button onClick={() => handleSort('state')} className="flex items-center text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: '#94a3b8' }}>
                      State <SortIndicator field="state" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Assignee</span>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>SLA</span>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button onClick={() => handleSort('createdAt')} className="flex items-center text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: '#94a3b8' }}>
                      Time <SortIndicator field="createdAt" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-center w-20">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc, idx) => {
                  const prioConfig = PRIORITY_CONFIG[inc.priority];
                  const stateConfig = STATE_CONFIG[inc.state];
                  const isSelected = selectedIds.has(inc.id);
                  const isFocused = focusedRowIdx === idx;
                  const isP1 = inc.priority === 'P1';

                  return (
                    <tr
                      key={inc.id}
                      onClick={(e) => handleRowClick(inc.id, e)}
                      className="transition-all cursor-pointer group"
                      style={{
                        borderBottom: '1px solid rgba(99,102,241,0.08)',
                        borderLeft: `3px solid ${prioConfig.borderColor}`,
                        background: isSelected
                          ? 'rgba(99,102,241,0.15)'
                          : isP1
                            ? 'rgba(239,68,68,0.06)'
                            : 'transparent',
                        ...(isFocused ? { boxShadow: 'inset 0 0 0 2px #6366f1' } : {}),
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isP1) {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isP1) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }
                      }}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(inc.id)}
                          className="w-3.5 h-3.5 rounded cursor-pointer"
                          style={{ accentColor: '#6366f1' }}
                        />
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-3">
                        <span className={clsx('badge text-[10px] font-semibold', prioConfig.badgeClass)}>
                          {inc.priority}
                        </span>
                      </td>

                      {/* Number */}
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs font-semibold" style={{ color: '#64748b' }}>{inc.number}</span>
                      </td>

                      {/* Title + source */}
                      <td className="px-3 py-3 max-w-xs">
                        <div className="flex items-center">
                          <span className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{inc.shortDescription}</span>
                          <SourceBadge source={inc.source} />
                        </div>
                        {inc.configItem && (
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: '#94a3b8' }}>
                            {inc.configItem.name}
                            {inc.configItem.hostname ? ` (${inc.configItem.hostname})` : ''}
                          </p>
                        )}
                      </td>

                      {/* State */}
                      <td className="px-3 py-3">
                        <span className={clsx('badge text-[10px] font-medium', stateConfig.badgeClass)}>
                          {stateConfig.label}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="px-3 py-3">
                        {inc.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <AvatarInitials firstName={inc.assignedTo.firstName} lastName={inc.assignedTo.lastName} />
                            <div className="min-w-0">
                              <span className="text-xs font-medium truncate block max-w-[100px]" style={{ color: '#334155' }}>
                                {inc.assignedTo.firstName} {inc.assignedTo.lastName.charAt(0)}.
                              </span>
                              {inc.assignmentGroup && (
                                <span className="text-[10px] truncate block max-w-[100px]" style={{ color: '#94a3b8' }}>
                                  {inc.assignmentGroup.name}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs italic" style={{ color: '#94a3b8' }}>Unassigned</span>
                        )}
                      </td>

                      {/* SLA */}
                      <td className="px-3 py-3">
                        <SlaIndicator incident={inc} />
                      </td>

                      {/* Time */}
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>{relativeTime(inc.createdAt)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <QuickReportButton
                            incidentId={inc.id}
                            incidentNumber={inc.number}
                            size="sm"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/incidents/${inc.id}`); }}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#94a3b8' }}
                            title="View details"
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.color = '#a855f7';
                              (e.currentTarget as HTMLElement).style.background = 'rgba(217,70,239,0.12)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'board' ? (
        /* -- BOARD VIEW -- */
        <div className="mb-4">
          <BoardView
            incidents={incidents}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onNavigate={(id) => navigate(`/incidents/${id}`)}
          />
        </div>
      ) : (
        /* -- TIMELINE VIEW -- */
        <div className="mb-4">
          <TimelineView
            incidents={incidents}
            onNavigate={(id) => navigate(`/incidents/${id}`)}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PAGINATION (table view only)                                        */}
      {/* ------------------------------------------------------------------ */}
      {viewMode === 'table' && !isLoading && incidents.length > 0 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={limit}
          onPageChange={(p) => { setPage(p); setFocusedRowIdx(-1); }}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KEYBOARD HINTS                                                      */}
      {/* ------------------------------------------------------------------ */}
      {viewMode === 'table' && !isLoading && incidents.length > 0 && (
        <div className="flex items-center justify-center gap-4 py-3 mt-2">
          <div className="flex items-center gap-1 text-[10px]" style={{ color: '#94a3b8' }}>
            <kbd
              className="font-mono rounded px-1 py-0.5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)', color: '#94a3b8' }}
            >J</kbd>
            <kbd
              className="font-mono rounded px-1 py-0.5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)', color: '#94a3b8' }}
            >K</kbd>
            <span className="ml-0.5">Navigate</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: '#94a3b8' }}>
            <kbd
              className="font-mono rounded px-1 py-0.5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)', color: '#94a3b8' }}
            >Enter</kbd>
            <span className="ml-0.5">Open</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: '#94a3b8' }}>
            <kbd
              className="font-mono rounded px-1 py-0.5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)', color: '#94a3b8' }}
            >X</kbd>
            <span className="ml-0.5">Select</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: '#94a3b8' }}>
            <kbd
              className="font-mono rounded px-1 py-0.5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)', color: '#94a3b8' }}
            >{'\u2318'}K</kbd>
            <span className="ml-0.5">Search</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BULK ACTION BAR                                                     */}
      {/* ------------------------------------------------------------------ */}
      <BulkActionBar
        count={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        onAssign={() => {
          // Placeholder: would open assign modal
        }}
        onEscalate={() => {
          // Placeholder: would open escalate modal
        }}
        onExport={() => {
          // Placeholder: would trigger bulk export
        }}
      />

      {/* Bottom spacer when bulk bar is visible */}
      {selectedIds.size > 0 && <div className="h-16" />}
    </div>
  );
}
