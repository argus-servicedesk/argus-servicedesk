import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarDays, X, GitBranch,
  Clock, User, AlertTriangle, LayoutGrid, List, ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChanges } from '../../hooks/useChanges';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Change {
  id: string;
  title: string;
  changeNumber: string;
  type: 'NORMAL' | 'STANDARD' | 'EMERGENCY' | 'MAJOR';
  state: string;
  risk: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  assignee?: { firstName: string; lastName: string } | null;
  description?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  NORMAL:    { bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA', dot: '#6366F1', label: 'Normal' },
  STANDARD:  { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', dot: '#10B981', label: 'Standard' },
  EMERGENCY: { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', dot: '#EF4444', label: 'Emergency' },
  MAJOR:     { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', dot: '#F59E0B', label: 'Major' },
};

const STATE_BADGE: Record<string, { bg: string; text: string }> = {
  NEW:          { bg: '#EEF2FF', text: '#4338CA' },
  ASSESSMENT:   { bg: '#EEF2FF', text: '#4338CA' },
  APPROVAL:     { bg: '#FFFBEB', text: '#B45309' },
  SCHEDULED:    { bg: '#ECFDF5', text: '#047857' },
  IMPLEMENTING: { bg: '#FEF3C7', text: '#92400E' },
  REVIEW:       { bg: '#F5F3FF', text: '#6D28D9' },
  CLOSED:       { bg: '#F1F5F9', text: '#64748B' },
  CANCELLED:    { bg: '#FEF2F2', text: '#B91C1C' },
};

function riskStyle(risk: string) {
  if (risk === 'HIGH' || risk === 'CRITICAL') return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  if (risk === 'MEDIUM') return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
}

function fmtDate(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'N/A';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'N/A';
  return date.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ChangeCalendar() {
  const today = new Date();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [view, setView]   = useState<'month' | 'week'>('month');
  const [selected, setSelected] = useState<Change | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data, isLoading } = useChanges({ limit: 500, page: 1 });
  const changes: Change[] = data?.data || [];

  const monthCells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentDate]);

  const weekCells = useMemo(() => {
    const cells: Date[] = [];
    const s = new Date(weekStart);
    for (let i = 0; i < 7; i++) { cells.push(new Date(s)); s.setDate(s.getDate() + 1); }
    return cells;
  }, [weekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, Change[]>();
    changes.forEach(c => {
      if (!c.scheduledStart) return;
      const start = new Date(c.scheduledStart);
      const end = c.scheduledEnd ? new Date(c.scheduledEnd) : start;
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(23, 59, 59, 999);
      while (cursor <= endDay) {
        const k = cursor.toISOString().slice(0, 10);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(c);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [changes]);

  function prevPeriod() {
    if (view === 'week') {
      setCurrentDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() - 7);
        return next;
      });
      return;
    }
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextPeriod() {
    if (view === 'week') {
      setCurrentDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + 7);
        return next;
      });
      return;
    }
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const headerLabel = useMemo(() => {
    if (view === 'month') return `${MONTH_NAMES[month]} ${year}`;
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const startLabel = weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const endLabel = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${startLabel} - ${endLabel}`;
  }, [view, month, year, weekStart]);

  const activeCells = view === 'month' ? monthCells : weekCells;

  const typesInMonth = useMemo(() => {
    const seen = new Set<string>();
    activeCells.forEach(day => {
      if (!day) return;
      const k = day.toISOString().slice(0, 10);
      (byDay.get(k) || []).forEach(c => seen.add(c.type));
    });
    return Array.from(seen);
  }, [activeCells, byDay]);

  // Count changes this month
  const monthChangeCount = useMemo(() => {
    const seen = new Set<string>();
    activeCells.forEach(day => {
      if (!day) return;
      const k = day.toISOString().slice(0, 10);
      (byDay.get(k) || []).forEach(c => seen.add(c.id));
    });
    return seen.size;
  }, [activeCells, byDay]);

  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>

      {/* ── Header Card ── */}
      <div className="bg-white border-b border-slate-200">
        <div style={{ height: 4, background: 'linear-gradient(90deg, #6366F1, #818CF8, #A5B4FC)' }} />
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                <CalendarDays className="w-5 h-5" style={{ color: '#6366F1' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-slate-400">Changes</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-xs font-medium text-slate-500">Calendar</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">Change Calendar</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4 mr-2">
                <div className="text-right">
                  <p className="text-xs text-slate-400">This month</p>
                  <p className="text-lg font-bold text-slate-900">{monthChangeCount}</p>
                </div>
                {isLoading && (
                  <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #E2E8F0', borderTopColor: '#6366F1' }} />
                )}
              </div>

              {/* View toggle */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
                <button onClick={() => setView('month')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
                  style={view === 'month' ? { background: '#6366F1', color: '#fff' } : { background: '#fff', color: '#64748B' }}>
                  <LayoutGrid className="w-3.5 h-3.5" /> Month
                </button>
                <button onClick={() => setView('week')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
                  style={view === 'week' ? { background: '#6366F1', color: '#fff' } : { background: '#fff', color: '#64748B' }}>
                  <List className="w-3.5 h-3.5" /> Week
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Month Navigation ── */}
      <div className="bg-white mx-4 mt-4 rounded-t-xl border border-b-0 border-slate-200 px-5 py-3 flex items-center justify-between">
        <button onClick={prevPeriod} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 select-none">
          <span className="text-lg font-bold text-slate-900">{headerLabel}</span>
        </div>
        <button onClick={nextPeriod} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Calendar Grid ── */}
      <div className="bg-white mx-4 rounded-b-xl border border-t-0 border-slate-200 shadow-sm px-4 pb-5">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px mb-px">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center py-2.5 text-[11px] font-semibold tracking-wider uppercase text-slate-400">{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-px" style={{ background: '#E2E8F0' }}>
          {activeCells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="min-h-[110px]" style={{ background: '#F8FAFC' }} />;

            const key = day.toISOString().slice(0, 10);
            const isToday = day.toDateString() === today.toDateString();
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isOtherMonth = view === 'week' && day.getMonth() !== month;
            const dayChanges = byDay.get(key) || [];
            const visible = dayChanges.slice(0, 3);
            const overflow = dayChanges.length - visible.length;

            return (
              <div key={key} className="min-h-[110px] p-2 flex flex-col"
                style={{
                  background: isToday ? '#EEF2FF' : isWeekend ? '#F8FAFC' : '#FFFFFF',
                  opacity: isOtherMonth ? 0.4 : 1,
                }}>
                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <span className={`text-sm font-semibold leading-none ${isToday ? 'text-white bg-indigo-500 w-7 h-7 rounded-full flex items-center justify-center' : isWeekend ? 'text-slate-400' : 'text-slate-600'}`}>
                    {day.getDate()}
                  </span>
                </div>

                <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                  {visible.map(c => {
                    const tc = TYPE_COLORS[c.type] || TYPE_COLORS.NORMAL;
                    return (
                      <button key={c.id} onClick={() => setSelected(c)}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 min-w-0 text-left transition-all hover:shadow-sm"
                        style={{ background: tc.bg, borderLeft: `3px solid ${tc.dot}` }}>
                        <span className="text-[10px] font-bold truncate" style={{ color: tc.text }}>
                          {c.changeNumber}
                        </span>
                        {c.scheduledStart && (
                          <span className="text-[9px] ml-auto shrink-0" style={{ color: tc.text, opacity: 0.7 }}>
                            {fmtTime(c.scheduledStart)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="text-[10px] font-medium px-2 text-slate-400">+{overflow} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {typesInMonth.length > 0 && (
          <div className="mt-4 flex items-center gap-3 flex-wrap px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Legend:</span>
            {typesInMonth.map(t => {
              const tc = TYPE_COLORS[t] || TYPE_COLORS.NORMAL;
              return (
                <div key={t} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: tc.dot }} />
                  <span className="font-medium" style={{ color: tc.text }}>{tc.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {changes.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
              <GitBranch className="w-6 h-6" style={{ color: '#6366F1' }} />
            </div>
            <p className="text-sm text-slate-400">No scheduled changes found</p>
          </div>
        )}
      </div>

      {/* ── Detail Panel ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-full max-w-md h-full overflow-y-auto bg-white shadow-2xl border-l border-slate-200 flex flex-col">

            {/* Panel accent bar */}
            <div style={{ height: 4, background: (TYPE_COLORS[selected.type] || TYPE_COLORS.NORMAL).dot }} />

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: (TYPE_COLORS[selected.type] || TYPE_COLORS.NORMAL).bg }}>
                  <GitBranch className="w-4 h-4" style={{ color: (TYPE_COLORS[selected.type] || TYPE_COLORS.NORMAL).dot }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold font-mono" style={{ color: (TYPE_COLORS[selected.type] || TYPE_COLORS.NORMAL).text }}>
                    {selected.changeNumber}
                  </p>
                  <p className="text-sm font-bold text-slate-900 truncate">{selected.title}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="px-5 py-5 space-y-5 flex-1">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md"
                  style={{ background: (TYPE_COLORS[selected.type] || TYPE_COLORS.NORMAL).bg, color: (TYPE_COLORS[selected.type] || TYPE_COLORS.NORMAL).text }}>
                  {selected.type}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md"
                  style={{ background: (STATE_BADGE[selected.state] || STATE_BADGE.NEW).bg, color: (STATE_BADGE[selected.state] || STATE_BADGE.NEW).text }}>
                  {selected.state?.replace(/_/g, ' ')}
                </span>
                {selected.risk && (() => {
                  const rs = riskStyle(selected.risk);
                  return (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md"
                      style={{ background: rs.bg, color: rs.text }}>
                      {selected.risk} Risk
                    </span>
                  );
                })()}
              </div>

              {/* Description */}
              {selected.description && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</p>
                  <p className="text-sm leading-relaxed text-slate-600">{selected.description}</p>
                </div>
              )}

              {/* Schedule */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Schedule</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase">Start</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selected.scheduledStart ? fmtDate(selected.scheduledStart) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase">End</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selected.scheduledEnd ? fmtDate(selected.scheduledEnd) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignee */}
              {selected.assignee && (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                    {selected.assignee.firstName[0]}{selected.assignee.lastName[0]}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-medium text-slate-400">Assignee</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selected.assignee.firstName} {selected.assignee.lastName}
                    </p>
                  </div>
                  <User className="w-4 h-4 ml-auto text-slate-300" />
                </div>
              )}

              {/* Emergency alert */}
              {selected.type === 'EMERGENCY' && (
                <div className="flex items-center gap-2.5 rounded-lg px-4 py-3"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <p className="text-xs font-semibold text-red-700">Emergency change — requires expedited approval</p>
                </div>
              )}

              {/* View full detail */}
              <button onClick={() => navigate(`/changes/${selected.id}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: '#6366F1', color: '#fff' }}>
                <ExternalLink className="w-4 h-4" />
                View Full Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
