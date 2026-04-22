import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Users, Plus, X,
  Check, AlertCircle, CalendarDays, Shield,
} from 'lucide-react';
import api from '../../lib/api';
import { useCreateOnCallSchedule } from '../../hooks/useOnCall';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OnCallUser { id: string; firstName: string; lastName: string; phone?: string; email?: string; }
interface Schedule {
  id: string; userId: string; teamId: string;
  startTime: string; endTime: string; isPrimary: boolean;
  user: OnCallUser;
}
interface TeamMember { user: { id: string; firstName: string; lastName: string; email: string } }
interface Team { id: string; name: string; members?: TeamMember[] }

// ── Color palette — deterministic by userId ────────────────────────────────────
const COLORS = [
  { bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA', dot: '#6366F1' },
  { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', dot: '#10B981' },
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9', dot: '#8B5CF6' },
  { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', dot: '#EF4444' },
  { bg: '#F0FDFA', border: '#99F6E4', text: '#0F766E', dot: '#14B8A6' },
  { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', dot: '#F59E0B' },
  { bg: '#FDF2F8', border: '#FBCFE8', text: '#BE185D', dot: '#EC4899' },
  { bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1', dot: '#0EA5E9' },
];
function personColor(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function initials(u: { firstName: string; lastName: string }) {
  return `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
}
function pad(n: number) { return String(n).padStart(2, '0'); }
function toLocalDT(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OnCallCalendar() {
  const today = new Date();
  const [year, setYear]         = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth());
  const [teamId, setTeamId]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selDay, setSelDay]     = useState<Date | null>(null);
  const [form, setForm]         = useState({ userId: '', startTime: '', endTime: '', isPrimary: true });
  const [saveErr, setSaveErr]   = useState('');

  const qc = useQueryClient();
  const createShift = useCreateOnCallSchedule();

  const { data: teamsResp } = useQuery({
    queryKey: ['teams-list-cal'],
    queryFn: async () => { const { data } = await api.get('/teams?limit=50'); return data; },
    staleTime: 60000,
  });
  const teams: Team[] = teamsResp?.data || [];

  const { data: teamDetailResp } = useQuery({
    queryKey: ['team-detail-cal', teamId],
    queryFn: async () => { const { data } = await api.get(`/teams/${teamId}`); return data; },
    enabled: !!teamId,
    staleTime: 60000,
  });
  const members: TeamMember[] = teamDetailResp?.data?.members || [];

  const { data: historyResp, isLoading } = useQuery({
    queryKey: ['oncall-cal-history', teamId],
    queryFn: async () => { const { data } = await api.get(`/teams/${teamId}/on-call/history?limit=500&page=1`); return data; },
    enabled: !!teamId,
    staleTime: 30000,
  });
  const schedules: Schedule[] = historyResp?.data?.schedules || [];

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    schedules.forEach(s => {
      const cursor = new Date(s.startTime);
      cursor.setHours(0, 0, 0, 0);
      const end = new Date(s.endTime);
      while (cursor <= end) {
        if (cursor.getFullYear() === year && cursor.getMonth() === month) {
          const k = cursor.toISOString().slice(0, 10);
          if (!map.has(k)) map.set(k, []);
          map.get(k)!.push(s);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [schedules, year, month]);

  const legend = useMemo(() => {
    const seen = new Map<string, OnCallUser>();
    byDay.forEach(list => list.forEach(s => { if (!seen.has(s.userId)) seen.set(s.userId, s.user); }));
    return Array.from(seen.entries());
  }, [byDay]);

  function prevMonth() { month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1); }
  function nextMonth() { month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1); }

  function openModal(day?: Date) {
    const base = day || new Date();
    const s = new Date(base); s.setHours(9, 0, 0, 0);
    const e = new Date(base); e.setHours(9, 0, 0, 0); e.setDate(e.getDate() + 1);
    setSelDay(base);
    setForm({ userId: '', startTime: toLocalDT(s), endTime: toLocalDT(e), isPrimary: true });
    setSaveErr('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.userId || !form.startTime || !form.endTime) {
      setSaveErr('Engineer, start time, and end time are required.');
      return;
    }
    try {
      await createShift.mutateAsync({
        teamId,
        userId: form.userId,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        isPrimary: form.isPrimary,
      });
      setShowModal(false);
      qc.invalidateQueries({ queryKey: ['oncall-cal-history', teamId] });
    } catch (e: any) {
      setSaveErr(e?.response?.data?.error || 'Failed to save shift');
    }
  }

  const selectedTeamName = teams.find(t => t.id === teamId)?.name || '';

  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>

      {/* ── Header Card ── */}
      <div className="bg-white border-b border-slate-200">
        <div style={{ height: 4, background: 'linear-gradient(90deg, #8B5CF6, #A78BFA, #C4B5FD)' }} />
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <CalendarDays className="w-5 h-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-slate-400">On-Call</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-xs font-medium text-slate-500">Calendar</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">On-Call Rotation Calendar</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select value={teamId} onChange={e => setTeamId(e.target.value)}
                className="text-sm rounded-lg px-3 py-2 font-medium focus:outline-none border border-slate-200 bg-white text-slate-700"
                style={{ minWidth: 180 }}>
                <option value="">Select team...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              {teamId && (
                <button onClick={() => openModal()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ background: '#8B5CF6' }}>
                  <Plus className="w-4 h-4" /> Assign Shift
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Month Navigation ── */}
      <div className="bg-white mx-4 mt-4 rounded-t-xl border border-b-0 border-slate-200 px-5 py-3 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 select-none">
          <span className="text-lg font-bold text-slate-900">{MONTH_NAMES[month]}</span>
          <span className="text-lg font-bold text-slate-400">{year}</span>
          {selectedTeamName && (
            <>
              <span className="text-slate-300 mx-1">·</span>
              <span className="text-sm font-medium text-violet-600">{selectedTeamName}</span>
            </>
          )}
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
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

        {/* Grid cells */}
        <div className="grid grid-cols-7 gap-px" style={{ background: '#E2E8F0' }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="min-h-[110px]" style={{ background: '#F8FAFC' }} />;

            const key = day.toISOString().slice(0, 10);
            const isDayToday = day.toDateString() === today.toDateString();
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const daySched = byDay.get(key) || [];
            const primary = daySched.find(s => s.isPrimary);
            const backups = daySched.filter(s => !s.isPrimary);
            const visible = ([primary, ...backups].filter(Boolean) as Schedule[]).slice(0, 3);
            const overflow = daySched.length - visible.length;

            return (
              <div key={key}
                onClick={() => teamId && openModal(day)}
                className="min-h-[110px] p-2 flex flex-col transition-colors group"
                style={{
                  background: isDayToday ? '#F5F3FF' : isWeekend ? '#F8FAFC' : '#FFFFFF',
                  cursor: teamId ? 'pointer' : 'default',
                }}
                onMouseEnter={e => { if (teamId) e.currentTarget.style.background = isDayToday ? '#EDE9FE' : '#F8FAFC'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isDayToday ? '#F5F3FF' : isWeekend ? '#F8FAFC' : '#FFFFFF'; }}>

                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <span className={`text-sm font-semibold leading-none ${isDayToday ? 'text-white bg-violet-500 w-7 h-7 rounded-full flex items-center justify-center' : isWeekend ? 'text-slate-400' : 'text-slate-600'}`}>
                    {day.getDate()}
                  </span>
                </div>

                <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                  {visible.map(s => {
                    const c = personColor(s.userId);
                    return (
                      <div key={s.id} className="flex items-center gap-1.5 rounded-md px-1.5 py-1 min-w-0"
                        style={{ background: c.bg, borderLeft: `3px solid ${c.dot}` }}
                        onClick={e => e.stopPropagation()}>
                        <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-white"
                          style={{ background: c.dot }}>
                          {initials(s.user)}
                        </div>
                        <span className="text-[10px] font-semibold truncate" style={{ color: c.text }}>
                          {s.user.firstName}
                        </span>
                        {s.isPrimary && (
                          <Shield className="w-3 h-3 ml-auto shrink-0" style={{ color: c.dot }} />
                        )}
                      </div>
                    );
                  })}

                  {overflow > 0 && (
                    <span className="text-[10px] font-medium px-2 text-slate-400">+{overflow} more</span>
                  )}

                  {teamId && daySched.length === 0 && (
                    <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {legend.length > 0 && (
          <div className="mt-4 flex items-center gap-3 flex-wrap px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Engineers:</span>
            {legend.map(([uid, user]) => {
              const c = personColor(uid);
              return (
                <div key={uid} className="flex items-center gap-1.5 text-xs">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                    style={{ background: c.dot }}>
                    {initials(user)}
                  </div>
                  <span className="font-medium" style={{ color: c.text }}>{user.firstName} {user.lastName}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!teamId && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
              <Users className="w-6 h-6" style={{ color: '#8B5CF6' }} />
            </div>
            <p className="text-sm text-slate-400">Select a team to view the on-call calendar</p>
          </div>
        )}

        {teamId && isLoading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #E2E8F0', borderTopColor: '#8B5CF6' }} />
            <span className="text-xs text-slate-400">Loading schedules...</span>
          </div>
        )}
      </div>

      {/* ── Assign Shift Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-xl overflow-hidden bg-white shadow-2xl border border-slate-200">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign On-Call Shift</h3>
                {selDay && (
                  <p className="text-xs mt-0.5 text-slate-400">
                    {selDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Engineer select */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Engineer</label>
                <select value={form.userId}
                  onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400">
                  <option value="">Select engineer...</option>
                  {members.map((m: TeamMember) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.firstName} {m.user.lastName} — {m.user.email}
                    </option>
                  ))}
                </select>
                {members.length === 0 && (
                  <p className="text-[10px] mt-1 text-slate-400">No members found — add members to this team first.</p>
                )}
              </div>

              {/* Start / End times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Start</label>
                  <input type="datetime-local" value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                    style={{ colorScheme: 'light' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">End</label>
                  <input type="datetime-local" value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                    style={{ colorScheme: 'light' }} />
                </div>
              </div>

              {/* Primary toggle */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Primary Responder</p>
                  <p className="text-xs mt-0.5 text-slate-400">First point of contact for incidents</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, isPrimary: !f.isPrimary }))}
                  className="w-10 h-6 rounded-full relative shrink-0 transition-all"
                  style={{ background: form.isPrimary ? '#8B5CF6' : '#E2E8F0' }}>
                  <span className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all"
                    style={{ left: form.isPrimary ? 'calc(100% - 21px)' : '3px' }} />
                </button>
              </div>

              {saveErr && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {saveErr}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={createShift.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: '#8B5CF6' }}>
                <Check className="w-3.5 h-3.5" />
                {createShift.isPending ? 'Saving...' : 'Assign Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
