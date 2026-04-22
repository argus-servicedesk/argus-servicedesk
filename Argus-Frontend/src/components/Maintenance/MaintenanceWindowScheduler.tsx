import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus, Trash2, Clock, CheckCircle, AlertCircle, Loader2, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Change {
  id: string; number: string; shortDescription: string; changeType: string;
  state: string; plannedStart?: string; plannedEnd?: string; category?: string;
  organization?: { name: string };
}

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.10)',
  color: '#0f172a',
  borderRadius: '0.5rem',
  padding: '0.625rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

function formatDT(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function countdown(end: string) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
}

function windowStatus(w: Change): { label: string; color: string; bg: string; border: string } {
  const now = Date.now();
  const start = w.plannedStart ? new Date(w.plannedStart).getTime() : 0;
  const end = w.plannedEnd ? new Date(w.plannedEnd).getTime() : 0;
  if (now >= start && now <= end) return { label: 'ACTIVE', color: '#059669', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' };
  if (now < start) return { label: 'UPCOMING', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.15)' };
  return { label: 'COMPLETED', color: '#94a3b8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' };
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function WeekTimeline({ windows }: { windows: Change[] }) {
  const now = Date.now();
  const weekStart = now - 24 * 60 * 60 * 1000;
  const weekEnd   = now + 6 * 24 * 60 * 60 * 1000;
  const weekLen   = weekEnd - weekStart;

  const days = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(weekStart + i * 24 * 60 * 60 * 1000);
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }), ts: d.getTime() };
  });

  const relevant = windows.filter(w => {
    const s = w.plannedStart ? new Date(w.plannedStart).getTime() : 0;
    const e = w.plannedEnd ? new Date(w.plannedEnd).getTime() : 0;
    return e >= weekStart && s <= weekEnd;
  });

  return (
    <div className="rounded-xl overflow-hidden mb-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
        <CalendarClock className="w-4 h-4" style={{ color: '#6366f1' }} />
        <span className="text-xs font-bold" style={{ color: '#0f172a' }}>7-Day Window View</span>
        <span className="text-[10px]" style={{ color: '#94a3b8' }}>today +/- 6 days</span>
      </div>
      <div className="p-4">
        {/* Day markers */}
        <div className="relative h-2 mb-1">
          {days.map(d => (
            <div key={d.ts} className="absolute text-[9px] -translate-x-1/2"
              style={{ left: `${((d.ts - weekStart) / weekLen) * 100}%`, color: '#94a3b8' }}>
              {d.label}
            </div>
          ))}
        </div>

        {/* Timeline track */}
        <div className="relative h-8 mt-4 rounded-md" style={{ background: 'rgba(99,102,241,0.03)' }}>
          {/* NOW line */}
          <div className="absolute top-0 bottom-0 w-px z-10" style={{ left: `${((now - weekStart) / weekLen) * 100}%`, background: '#EF4444' }}>
            <div className="absolute -top-4 -translate-x-1/2 text-[8px] font-bold" style={{ color: '#DC2626' }}>NOW</div>
          </div>

          {/* Window bands */}
          {relevant.map(w => {
            const s = Math.max(new Date(w.plannedStart || '').getTime(), weekStart);
            const e = Math.min(new Date(w.plannedEnd || '').getTime(), weekEnd);
            const left = ((s - weekStart) / weekLen) * 100;
            const width = ((e - s) / weekLen) * 100;
            const st = windowStatus(w);
            return (
              <div key={w.id} title={w.shortDescription}
                className="absolute top-1 bottom-1 rounded cursor-default"
                style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%`, background: st.bg, border: `1px solid ${st.border}` }}>
                <div className="px-1 text-[8px] font-bold truncate leading-6" style={{ color: st.color }}>
                  {w.shortDescription}
                </div>
              </div>
            );
          })}

          {relevant.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px]" style={{ color: '#cbd5e1' }}>No windows scheduled</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MaintenanceWindowScheduler() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const [form, setForm] = useState({
    shortDescription: '',
    description: '',
    plannedStart: '',
    plannedEnd: '',
    category: 'Maintenance',
    changeType: 'STANDARD',
  });

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-windows'],
    queryFn: () => api.get('/changes?category=Maintenance&limit=50').then(r => r.data),
    staleTime: 30000,
  });
  const windows: Change[] = data?.data || [];

  const create = useMutation({
    mutationFn: () => api.post('/changes', {
      ...form,
      shortDescription: form.shortDescription || 'Maintenance Window',
      riskLevel: 'LOW',
      impact: 'TEAM',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-windows'] });
      setToastMsg({ ok: true, msg: 'Maintenance window scheduled' });
      setShowForm(false);
      setForm({ shortDescription: '', description: '', plannedStart: '', plannedEnd: '', category: 'Maintenance', changeType: 'STANDARD' });
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: (e: any) => {
      setToastMsg({ ok: false, msg: e?.response?.data?.error || 'Failed to create window' });
      setTimeout(() => setToastMsg(null), 4000);
    },
  });

  const deleteWindow = useMutation({
    mutationFn: (id: string) => api.delete(`/changes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance-windows'] }),
  });

  const active   = windows.filter(w => windowStatus(w).label === 'ACTIVE');
  const upcoming = windows.filter(w => windowStatus(w).label === 'UPCOMING');
  const past     = windows.filter(w => windowStatus(w).label === 'COMPLETED').slice(0, 10);

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC' }}>

      {/* ── Hero ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* dot-grid texture */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* ambient glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" style={{ background: 'rgba(79,70,229,0.25)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(99,102,241,0.2)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full -translate-x-1/4 pointer-events-none" style={{ background: 'rgba(79,70,229,0.15)', filter: 'blur(80px)' }} />
        <div className="relative px-6 py-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.3)' }}>
                <CalendarClock className="w-5 h-5" style={{ color: '#C7D2FE' }} />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Maintenance Windows</h1>
              {active.length > 0 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#6ee7b7', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {active.length} ACTIVE
                </span>
              )}
            </div>
            <p className="text-sm ml-[52px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Schedule planned downtime to suppress false alerts during deployments and upgrades.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 text-white"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <Plus className="w-4 h-4" />
            Schedule Window
          </button>
        </div>
        {/* KPI pills */}
        <div className="px-6 pb-4 ml-[52px] flex gap-3">
          {[
            { label: 'Active Now', val: active.length, color: '#6ee7b7' },
            { label: 'Upcoming', val: upcoming.length, color: '#C7D2FE' },
            { label: 'Completed', val: past.length, color: 'rgba(255,255,255,0.5)' },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-lg font-black" style={{ color: p.color }}>{p.val}</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.label}</span>
            </div>
          ))}
        </div>
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #4F46E5, #818CF8, #C7D2FE, transparent)' }} />
      </div>

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4"
          style={toastMsg.ok
            ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669' }
            : { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#DC2626' }
          }>
          {toastMsg.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toastMsg.msg}
        </div>
      )}

      {/* ── 7-day timeline ── */}
      <WeekTimeline windows={[...active, ...upcoming]} />

      {/* ── Create form modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)' }} />
          <div className="relative rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}
            style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(99,102,241,0.10)', backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5" style={{ color: '#6366f1' }} />
                <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>Schedule Maintenance Window</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="transition-colors" style={{ color: '#94a3b8' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Window Name *</label>
                <input value={form.shortDescription} onChange={e => setF('shortDescription', e.target.value)}
                  placeholder="e.g. Database upgrade -- prod cluster"
                  className="focus:outline-none"
                  style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Reason / Description</label>
                <textarea value={form.description} onChange={e => setF('description', e.target.value)}
                  rows={2} placeholder="What work is being done?"
                  className="resize-none focus:outline-none"
                  style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Start Time *</label>
                  <input type="datetime-local" value={form.plannedStart} onChange={e => setF('plannedStart', e.target.value)}
                    className="focus:outline-none"
                    style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>End Time *</label>
                  <input type="datetime-local" value={form.plannedEnd} onChange={e => setF('plannedEnd', e.target.value)}
                    className="focus:outline-none"
                    style={inputStyle} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => create.mutate()}
                disabled={!form.shortDescription || !form.plannedStart || !form.plannedEnd || create.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              >
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
                Schedule
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#64748b' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Windows list ── */}
      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#cbd5e1' }} /></div>
      )}

      {!isLoading && [...active, ...upcoming, ...past].length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <CalendarClock className="w-10 h-10 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>No maintenance windows scheduled.</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Click "Schedule Window" to plan your first maintenance period.</p>
        </div>
      )}

      {[
        { label: 'Active', items: active, color: '#059669' },
        { label: 'Upcoming', items: upcoming, color: '#6366f1' },
        { label: 'Completed', items: past, color: '#94a3b8' },
      ].filter(g => g.items.length > 0).map(group => (
        <div key={group.label} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>{group.label}</span>
            <span className="text-[10px]" style={{ color: '#94a3b8' }}>{group.items.length}</span>
          </div>
          <div className="space-y-2">
            {group.items.map(w => {
              const st = windowStatus(w);
              return (
                <div key={w.id} className="flex items-center gap-4 px-5 py-4 rounded-xl"
                  style={{ background: '#ffffff', border: `1px solid ${st.border}`, backdropFilter: 'blur(12px)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{w.shortDescription}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: '#64748b' }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {w.plannedStart ? formatDT(w.plannedStart) : '--'}
                        <ChevronRight className="w-3 h-3" />
                        {w.plannedEnd ? formatDT(w.plannedEnd) : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {st.label === 'ACTIVE' && w.plannedEnd && (
                      <div className="text-xs font-bold mb-1" style={{ color: '#059669' }}>{countdown(w.plannedEnd)}</div>
                    )}
                    {st.label === 'UPCOMING' && w.plannedStart && (
                      <div className="text-xs mb-1" style={{ color: '#6366f1' }}>Starts {new Date(w.plannedStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                    )}
                    {w.number && <div className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{w.number}</div>}
                  </div>
                  {st.label !== 'ACTIVE' && (
                    <button onClick={() => { if (confirm('Delete this window?')) deleteWindow.mutate(w.id); }}
                      className="p-1.5 rounded-lg transition-colors" style={{ color: '#DC2626' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
