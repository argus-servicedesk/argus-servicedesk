import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, ChevronRight, Mail, MessageSquare, Phone, Zap, Bell, CheckCircle, AlertCircle, Loader2, Users, Clock, Shield, GitMerge } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Rule { level: number; delayMinutes: number; notifyType: string; notifyTargets: string; }
interface Policy { id: string; name: string; description?: string; isActive: boolean; rules: Rule[]; }
interface Team { id: string; name: string; organizationId?: string; }

const NOTIFY_TYPES = [
  { value: 'SMS_NOTIFY',   label: 'SMS',       icon: MessageSquare, color: '#059669', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)' },
  { value: 'VOICE_NOTIFY', label: 'Voice Call', icon: Phone,        color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.3)' },
  { value: 'EMAIL_NOTIFY', label: 'Email',      icon: Mail,         color: '#D97706', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
  { value: 'SLACK_NOTIFY', label: 'Slack',      icon: Zap,          color: '#334155', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.18)' },
  { value: 'ALL',          label: 'All Channels',icon: Bell,        color: '#DC2626', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' },
];

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.10)',
  color: '#0f172a',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const emptyRule = (): Rule => ({ level: 1, delayMinutes: 5, notifyType: 'SMS_NOTIFY', notifyTargets: '' });

function RuleCard({
  rule, index, total, onChange, onRemove,
}: { rule: Rule; index: number; total: number; onChange: (r: Rule) => void; onRemove: () => void; }) {
  const nt = NOTIFY_TYPES.find(n => n.value === rule.notifyType) || NOTIFY_TYPES[0];
  const Icon = nt.icon;

  return (
    <div className="relative">
      {/* Connector line + delay label */}
      {index > 0 && (
        <div className="flex flex-col items-center mb-0 -mt-1">
          <div className="flex items-center gap-2">
            <div className="w-px h-4" style={{ background: 'rgba(99,102,241,0.12)' }} />
          </div>
          <div className="flex items-center gap-2 py-1.5 px-3 rounded-full text-[10px] font-mono font-bold"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#6366f1' }}>
            <Clock className="w-3 h-3" />
            Wait {rule.delayMinutes} min if no response
          </div>
          <div className="w-px h-4" style={{ background: 'rgba(99,102,241,0.12)' }} />
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent -mt-0.5" style={{ borderTopColor: 'rgba(99,102,241,0.18)' }} />
        </div>
      )}

      {/* Stage card */}
      <div className="rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
              style={{ background: nt.bg, border: `1px solid ${nt.border}`, color: nt.color }}>
              {index + 1}
            </div>
            <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>Level {index + 1}</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: nt.bg, border: `1px solid ${nt.border}`, color: nt.color }}>
              <Icon className="w-3 h-3" />
              {nt.label}
            </div>
          </div>
          {total > 1 && (
            <button onClick={onRemove} className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors" style={{ color: '#DC2626' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Delay */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
                {index === 0 ? 'Trigger After (min)' : 'Escalate After (min)'}
              </label>
              <div className="relative">
                <input
                  type="number" min={0} max={480}
                  value={rule.delayMinutes}
                  onChange={e => onChange({ ...rule, delayMinutes: parseInt(e.target.value) || 0 })}
                  className="font-mono focus:outline-none"
                  style={inputStyle}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: '#94a3b8' }}>min</span>
              </div>
            </div>

            {/* Notify type */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Notification Channel</label>
              <select
                value={rule.notifyType}
                onChange={e => onChange({ ...rule, notifyType: e.target.value })}
                className="appearance-none focus:outline-none"
                style={inputStyle}
              >
                {NOTIFY_TYPES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
          </div>

          {/* Targets */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
              Contact Targets <span className="normal-case" style={{ color: '#94a3b8' }}>(phone numbers, emails, or user IDs -- comma-separated)</span>
            </label>
            <input
              type="text"
              value={rule.notifyTargets}
              onChange={e => onChange({ ...rule, notifyTargets: e.target.value })}
              placeholder="+91-9876543210, engineer@acme.com, user-uuid"
              className="focus:outline-none"
              style={inputStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Policy Form ───────────────────────────────────────────────────────────────
function PolicyForm({ teamId, policy, onSaved, onCancel }: {
  teamId: string; policy?: Policy | null; onSaved: () => void; onCancel: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!policy;
  const [name, setName] = useState(policy?.name || '');
  const [desc, setDesc] = useState(policy?.description || '');
  const [rules, setRules] = useState<Rule[]>(
    policy?.rules?.length ? policy.rules : [{ ...emptyRule(), level: 1 }]
  );
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, description: desc, rules: rules.map((r, i) => ({ ...r, level: i + 1 })) };
      if (isEdit) {
        return api.put(`/teams/${teamId}/escalation-policies/${policy!.id}`, payload);
      }
      return api.post(`/teams/${teamId}/escalation-policies`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-escalation', teamId] });
      setToast({ ok: true, msg: isEdit ? 'Policy updated' : 'Policy created successfully' });
      setTimeout(onSaved, 1200);
    },
    onError: (e: any) => setToast({ ok: false, msg: e?.response?.data?.error || 'Save failed' }),
  });

  const addRule = () => setRules(r => [...r, { ...emptyRule(), level: r.length + 1 }]);
  const removeRule = (i: number) => setRules(r => r.filter((_, idx) => idx !== i));
  const updateRule = (i: number, updated: Rule) => setRules(r => r.map((x, idx) => idx === i ? updated : x));

  return (
    <div className="space-y-5">
      {/* Policy name + description */}
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Policy Name *</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. P1 Critical Escalation"
            className="focus:outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Description <span className="normal-case" style={{ color: '#94a3b8' }}>(optional)</span></label>
          <input
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="When does this policy activate?"
            className="focus:outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Escalation levels */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Escalation Levels</span>
          <span className="text-[10px]" style={{ color: '#94a3b8' }}>{rules.length} level{rules.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="space-y-0">
          {rules.map((rule, i) => (
            <RuleCard key={i} rule={rule} index={i} total={rules.length}
              onChange={r => updateRule(i, r)} onRemove={() => removeRule(i)} />
          ))}
        </div>

        <button
          onClick={addRule}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.25)', color: '#6366f1' }}
        >
          <Plus className="w-4 h-4" />
          Add Escalation Level
        </button>
      </div>

      {/* Feedback */}
      {toast && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={toast.ok
            ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669' }
            : { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#DC2626' }
          }>
          {toast.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => save.mutate()}
          disabled={!name.trim() || save.isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Update Policy' : 'Save Policy'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm transition-colors"
          style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', color: '#64748b' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EscalationPolicyBuilder() {
  const qc = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [editPolicy, setEditPolicy] = useState<Policy | null | 'new'>('new');

  const { data: teamsData } = useQuery({
    queryKey: ['teams-list'],
    queryFn: () => api.get('/teams').then(r => r.data),
  });
  const teams: Team[] = teamsData?.data || [];

  const { data: polData, isLoading: loadingPolicies } = useQuery({
    queryKey: ['team-escalation', selectedTeam],
    queryFn: () => api.get(`/teams/${selectedTeam}/escalation`).then(r => r.data),
    enabled: !!selectedTeam,
  });
  const policies: Policy[] = polData?.data || [];

  const deletePolicy = useMutation({
    mutationFn: (policyId: string) => api.delete(`/teams/${selectedTeam}/escalation-policies/${policyId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-escalation', selectedTeam] }),
  });

  const activeTeam = teams.find(t => t.id === selectedTeam);

  const activePolicies = policies.filter(p => p.isActive).length;
  const totalLevels = policies.reduce((sum, p) => sum + p.rules.length, 0);

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC' }}>
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* dot-grid texture */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* ambient glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" style={{ background: 'rgba(217,119,6,0.25)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(245,158,11,0.2)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full -translate-x-1/4 pointer-events-none" style={{ background: 'rgba(217,119,6,0.15)', filter: 'blur(80px)' }} />

        <div className="relative px-6 pt-6 pb-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(217,119,6,0.2)', border: '1px solid rgba(217,119,6,0.3)' }}>
                <GitMerge size={18} style={{ color: '#FCD34D' }} />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold tracking-tight" style={{ color: '#ffffff' }}>Escalation Policies</h1>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Define multi-level escalation chains -- who gets notified, how, and when</p>
              </div>
            </div>
          </div>

          {/* Hero Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Shield, label: 'Total Policies', value: policies.length, color: '#FCD34D' },
              { icon: CheckCircle, label: 'Active', value: activePolicies, color: '#6ee7b7' },
              { icon: Users, label: 'Teams', value: teams.length, color: '#93c5fd' },
              { icon: Zap, label: 'Total Levels', value: totalLevels, color: '#C4B5FD' },
            ].map((s, i) => (
              <div key={s.label} className="rounded-xl p-4 animate-fade-in"
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</p>
                    <p className="font-display text-2xl font-extrabold" style={{ color: '#ffffff' }}>{s.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #D97706, #F59E0B, #FCD34D, transparent)' }} />
      </div>

      {/* ── Team Selector ── */}
      <div className="-mt-3 relative z-10 rounded-xl p-3 mb-4"
        style={{ background: '#ffffff', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex items-center gap-3">
          <Users size={14} style={{ color: '#94a3b8' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Team</span>
          <select
            value={selectedTeam}
            onChange={e => { setSelectedTeam(e.target.value); setEditPolicy('new'); }}
            className="flex-1 max-w-xs px-3 py-1.5 rounded-lg text-sm focus:outline-none"
            style={inputStyle}
          >
            <option value="">-- choose a team --</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {loadingPolicies && <Loader2 size={14} className="animate-spin" style={{ color: '#94a3b8' }} />}
        </div>
      </div>

      {/* ── 2-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* LEFT: Policy List (col-span-4) */}
        <div className="col-span-4 space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
              <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
                <Shield size={14} style={{ color: '#6366f1' }} />
                Policies
              </span>
              {selectedTeam && (
                <button
                  onClick={() => setEditPolicy('new')}
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                  <Plus size={10} />
                  New
                </button>
              )}
            </div>
            <div className="px-4 py-3">
              {!selectedTeam ? (
                <div className="py-10 text-center">
                  <Users size={28} className="mx-auto mb-2" style={{ color: '#cbd5e1' }} />
                  <p className="text-sm" style={{ color: '#94a3b8' }}>Select a team above</p>
                </div>
              ) : loadingPolicies ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#94a3b8' }} />
                </div>
              ) : policies.length === 0 ? (
                <div className="py-10 text-center">
                  <Shield size={28} className="mx-auto mb-2" style={{ color: '#cbd5e1' }} />
                  <p className="text-sm" style={{ color: '#94a3b8' }}>No policies yet</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#cbd5e1' }}>Create one to enable escalation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {policies.map(p => {
                    const isSelected = editPolicy && typeof editPolicy === 'object' && editPolicy.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setEditPolicy(p)}
                        className="w-full text-left rounded-xl px-4 py-3 transition-all"
                        style={isSelected
                          ? { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }
                          : { background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }
                        }
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{p.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {p.isActive && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}>ACTIVE</span>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); if (confirm(`Delete "${p.name}"?`)) deletePolicy.mutate(p.id); }}
                              className="p-1 rounded transition-colors"
                              style={{ color: '#DC2626' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] font-mono mb-2" style={{ color: '#94a3b8' }}>{p.rules.length} level{p.rules.length !== 1 ? 's' : ''}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {p.rules.map((r, i) => {
                            const nt = NOTIFY_TYPES.find(n => n.value === r.notifyType);
                            const Icon = nt?.icon || Bell;
                            return (
                              <div key={i} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: nt?.bg, color: nt?.color, border: `1px solid ${nt?.border}` }}>
                                <Icon className="w-2.5 h-2.5" />
                                L{r.level} {r.delayMinutes}m
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Policy Form (col-span-8) */}
        <div className="col-span-8">
          <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
              <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
                <Zap size={14} style={{ color: '#6366f1' }} />
                {editPolicy === 'new' ? 'New Policy' : typeof editPolicy === 'object' ? editPolicy?.name : 'Policy Editor'}
              </span>
              {selectedTeam && activeTeam && (
                <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{activeTeam.name}</span>
              )}
            </div>
            <div className="px-5 py-5">
              {!selectedTeam ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Users size={28} className="mb-2" style={{ color: '#cbd5e1' }} />
                  <p className="text-sm" style={{ color: '#94a3b8' }}>Select a team to manage its escalation policies</p>
                </div>
              ) : (
                (editPolicy === 'new' || typeof editPolicy === 'object') && (
                  <PolicyForm
                    key={typeof editPolicy === 'object' ? editPolicy?.id : 'new'}
                    teamId={selectedTeam}
                    policy={typeof editPolicy === 'object' ? editPolicy : null}
                    onSaved={() => setEditPolicy('new')}
                    onCancel={() => setEditPolicy('new')}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
