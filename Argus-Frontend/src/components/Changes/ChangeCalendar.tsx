import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useChanges } from '../../hooks/useChanges';
import { SNPage, sn } from '../ITSMTemplates/ServiceNowUI';
import { useAuth } from '../../hooks/useAuth';

interface ChangeItem {
  id: string;
  number?: string;
  changeNumber?: string;
  shortDescription?: string;
  title?: string;
  type?: string;
  state?: string;
  risk?: string;
  riskLevel?: string;
  plannedStartDate?: string;
  scheduledStart?: string;
  plannedEndDate?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthTitle(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function eventDate(change: ChangeItem): Date | null {
  const raw = change.plannedStartDate ?? change.scheduledStart;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function displayNumber(change: ChangeItem): string {
  return change.number ?? change.changeNumber ?? 'CHG';
}

function displayTitle(change: ChangeItem): string {
  return change.shortDescription ?? change.title ?? '';
}

function eventTone(change: ChangeItem): { bg: string; fg: string; border: string } {
  const risk = change.risk ?? change.riskLevel;
  if (risk === 'HIGH' || risk === 'CRITICAL' || change.type === 'EMERGENCY') {
    return { bg: '#fff6f6', fg: '#b42318', border: '#fca5a5' };
  }
  if (risk === 'MEDIUM') return { bg: '#fff7e8', fg: '#b45309', border: '#f5c266' };
  return { bg: '#eff6ff', fg: '#075985', border: '#bfdbfe' };
}

function buildMonthDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export default function ChangeCalendar() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { data, isLoading, isError, refetch, isFetching } = useChanges({
    page: 1,
    limit: 200,
    sortBy: 'plannedStartDate',
    sortDir: 'asc',
  });

  const changes: ChangeItem[] = data?.data ?? [];
  const monthDays = useMemo(() => buildMonthDays(month), [month]);

  const grouped = useMemo(() => {
    const result = new Map<string, ChangeItem[]>();
    changes.forEach((change) => {
      const date = eventDate(change);
      if (!date) return;
      const key = dateKey(date);
      const list = result.get(key) ?? [];
      list.push(change);
      result.set(key, list);
    });
    return result;
  }, [changes]);

  const thisMonthCount = changes.filter((change) => {
    const date = eventDate(change);
    return date && date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  }).length;

  const moveMonth = (delta: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', padding: 24, background: sn.shellBg }}>
      <div className="sn-list-shell">
        <div className="sn-list-titlebar flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[22px] font-bold" style={{ color: sn.navy }}>Change Calendar</div>
            <div className="mt-1 text-[12px]" style={{ color: '#667085' }}>
              Calendar view: <span className="font-bold">{monthTitle(month)}</span> | Scheduled changes: <span className="font-bold">{thisMonthCount}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => navigate('/changes')}>List</button>
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

        <div className="sn-list-toolbar flex items-center justify-between px-5 py-3">
          <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => moveMonth(-1)}>
            <ChevronLeft size={15} />
            Previous
          </button>
          <div className="text-[20px] font-bold" style={{ color: sn.navy }}>{monthTitle(month)}</div>
          <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => moveMonth(1)}>
            Next
            <ChevronRight size={15} />
          </button>
        </div>

        {isError ? (
          <div className="sn-list-empty flex items-center justify-center text-sm font-bold" style={{ color: sn.critical }}>
            Unable to load change calendar.
          </div>
        ) : isLoading ? (
          <div className="sn-list-empty flex items-center justify-center gap-3 text-sm font-bold" style={{ color: '#667085' }}>
            <Loader2 size={18} className="animate-spin" />
            Loading calendar...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="sn-list-table" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  {WEEKDAYS.map((day) => (
                    <th key={day} style={{ textAlign: 'center' }}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, rowIndex) => (
                  <tr key={rowIndex}>
                    {monthDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((day) => {
                      const inMonth = day.getMonth() === month.getMonth();
                      const items = grouped.get(dateKey(day)) ?? [];
                      return (
                        <td key={dateKey(day)} style={{ height: 118, verticalAlign: 'top', background: inMonth ? '#fff' : '#f7f8fa' }}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[13px] font-bold" style={{ color: inMonth ? '#344054' : '#98a2b3' }}>
                              {day.getDate()}
                            </span>
                            {items.length > 2 && <span className="text-[11px]" style={{ color: '#667085' }}>+{items.length - 2}</span>}
                          </div>
                          <div className="space-y-1">
                            {items.slice(0, 2).map((change) => {
                              const tone = eventTone(change);
                              return (
                                <button
                                  type="button"
                                  key={change.id}
                                  className="block w-full truncate rounded-sm border px-2 py-1 text-left text-[11px] font-bold"
                                  style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
                                  onClick={() => navigate(`/changes/${change.id}`)}
                                  title={`${displayNumber(change)} ${displayTitle(change)}`}
                                >
                                  {formatTime(change.plannedStartDate ?? change.scheduledStart)} {displayNumber(change)}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
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
