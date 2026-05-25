import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CalendarClock, CheckCircle2, Clock3, GraduationCap, Loader2, Plus, Save, Search, ShieldCheck, UserPlus, XCircle } from 'lucide-react';
import { SNPage, SNPillBadge, sn } from '../ITSMTemplates/ServiceNowUI';
import { useAuth } from '../../hooks/useAuth';
import { useTeams } from '../../hooks/useTeams';
import {
  type LearningTrackInput,
  useAssignLearningTrack,
  useCompleteLearningModule,
  useCreateLearningTrack,
  useLearningEnrollments,
  useLearningSummary,
  useLearningTracks,
  useLearningUsers,
  useMyLearningTracks,
  useReopenLearningModule,
  useUpdateLearningTrack,
} from '../../hooks/useLearning';
import type { LearningEnrollment, LearningModule, LearningTrack, Team, User } from '../../types';

type TabKey = 'mine' | 'tracks' | 'builder' | 'progress';
type LearningModuleInput = NonNullable<LearningTrackInput['modules']>[number];

const AUDIENCE_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'NOC', label: 'NOC' },
  { value: 'INFRA', label: 'Infra' },
  { value: 'DEVOPS', label: 'DevOps' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'SERVICE_DESK', label: 'Service Desk' },
];

const MODULE_TYPES = [
  { value: 'ARTICLE', label: 'Article' },
  { value: 'SOP', label: 'SOP' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'TASK', label: 'Task' },
  { value: 'LINK', label: 'Link' },
];

function extractList<T = any>(payload: any): T[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function userName(user?: User | null) {
  if (!user) return '-';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Unnamed user';
}

function dateLabel(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function audienceLabel(value?: string) {
  return AUDIENCE_OPTIONS.find((option) => option.value === value)?.label ?? value ?? 'General';
}

function progressTone(percent: number) {
  if (percent >= 100) return 'success';
  if (percent > 0) return 'progress';
  return 'neutral';
}

function statusBadge(status: string, overdue?: boolean) {
  if (overdue) return <SNPillBadge label="Overdue" tone="critical" dot />;
  if (status === 'COMPLETED') return <SNPillBadge label="Completed" tone="success" dot />;
  if (status === 'IN_PROGRESS') return <SNPillBadge label="In Progress" tone="progress" dot />;
  return <SNPillBadge label="Assigned" tone="info" dot />;
}

function emptyModule(order = 1): LearningModuleInput {
  return {
    order,
    title: '',
    module_type: 'ARTICLE',
    content: '',
    external_url: '',
    estimated_minutes: 30,
    is_required: true,
  };
}

const emptyTrackForm: LearningTrackInput = {
  title: '',
  audience_role: 'GENERAL',
  description: '',
  team_id: '',
  owner_id: '',
  is_active: true,
  modules: [emptyModule(1)],
};

function buildFormFromTrack(track: LearningTrack): LearningTrackInput {
  return {
    title: track.title || '',
    audience_role: track.audience_role ?? track.audienceRole ?? 'GENERAL',
    description: track.description || '',
    team_id: track.team?.id ?? '',
    owner_id: track.owner?.id ?? '',
    is_active: track.is_active ?? track.isActive ?? true,
    modules: (track.modules ?? []).map((module, index) => ({
      id: module.id,
      order: module.order ?? index + 1,
      title: module.title || '',
      module_type: module.module_type ?? module.moduleType ?? 'ARTICLE',
      content: module.content || '',
      external_url: module.external_url ?? module.externalUrl ?? '',
      estimated_minutes: module.estimated_minutes ?? module.estimatedMinutes ?? 30,
      is_required: module.is_required ?? module.isRequired ?? true,
    })),
  };
}

function normalizeTrackPayload(form: LearningTrackInput): LearningTrackInput {
  return {
    ...form,
    team_id: form.team_id || null,
    owner_id: form.owner_id || null,
    modules: (form.modules ?? [])
      .filter((module) => module.title.trim())
      .map((module, index) => ({
        ...module,
        order: index + 1,
        content: module.content || '',
        external_url: module.external_url || '',
        estimated_minutes: Number(module.estimated_minutes || 30),
        is_required: module.is_required !== false,
      })),
  };
}

function percentBar(percent: number) {
  return (
    <div className="h-2 w-full rounded-sm bg-slate-200">
      <div
        className="h-2 rounded-sm"
        style={{
          width: `${Math.min(100, Math.max(0, percent))}%`,
          background: percent >= 100 ? '#16a34a' : sn.primaryBtn,
        }}
      />
    </div>
  );
}

function ModuleList({ enrollment }: { enrollment: LearningEnrollment }) {
  const completeModule = useCompleteLearningModule();
  const reopenModule = useReopenLearningModule();
  const modules = [...(enrollment.track.modules ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="divide-y rounded-sm border" style={{ borderColor: sn.border }}>
      {modules.map((module) => {
        const done = Boolean(module.isCompleted);
        const busy = completeModule.isPending || reopenModule.isPending;
        const minutes = module.estimated_minutes ?? module.estimatedMinutes ?? 0;
        const externalUrl = module.external_url ?? module.externalUrl;
        const required = module.is_required ?? module.isRequired;
        return (
          <div key={module.id} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto]" style={{ borderColor: sn.border }}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-bold" style={{ color: sn.navy }}>#{module.order}</span>
                <span className="font-semibold text-slate-900">{module.title}</span>
                <SNPillBadge label={module.module_type ?? module.moduleType ?? 'ARTICLE'} tone="neutral" />
                {required ? <SNPillBadge label="Required" tone="info" /> : null}
              </div>
              {module.content ? <p className="mt-2 text-sm text-slate-600">{module.content}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Clock3 size={13} /> {minutes} min</span>
                {externalUrl ? <a className="font-semibold" style={{ color: sn.link }} href={externalUrl} target="_blank" rel="noreferrer">Open resource</a> : null}
                {module.completedAt ? <span>Completed {dateLabel(module.completedAt)}</span> : null}
              </div>
            </div>
            <button
              type="button"
              className="sn-soft-button inline-flex items-center justify-center gap-2 self-start px-3"
              disabled={busy}
              onClick={() => {
                const payload = { enrollmentId: enrollment.id, moduleId: module.id };
                if (done) reopenModule.mutate(payload);
                else completeModule.mutate(payload);
              }}
              style={done ? { color: '#067647', borderColor: '#9be7bd', background: '#ecfdf3' } : undefined}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : done ? <CheckCircle2 size={14} /> : <BookOpenCheck size={14} />}
              {done ? 'Completed' : 'Mark complete'}
            </button>
          </div>
        );
      })}
      {modules.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">No modules configured.</div> : null}
    </div>
  );
}

function MyKtPanel({ enrollments, loading }: { enrollments: LearningEnrollment[]; loading: boolean }) {
  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading assigned KT tracks...</div>;
  }
  if (!enrollments.length) {
    return (
      <div className="rounded-sm border bg-white p-8 text-center" style={{ borderColor: sn.border }}>
        <GraduationCap className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <p className="font-semibold text-slate-900">No KT track is assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => (
        <section key={enrollment.id} className="rounded-sm border bg-white" style={{ borderColor: sn.border }}>
          <div className="grid gap-4 border-b p-4 lg:grid-cols-[minmax(0,1fr)_220px]" style={{ borderColor: sn.border }}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold" style={{ color: sn.navy }}>{enrollment.track.title}</h2>
                {statusBadge(enrollment.status, enrollment.isOverdue)}
                <SNPillBadge label={audienceLabel(enrollment.track.audienceRole ?? enrollment.track.audience_role)} tone="neutral" />
              </div>
              <p className="mt-2 text-sm text-slate-600">{enrollment.track.description || 'No description provided.'}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Mentor: <strong className="text-slate-700">{userName(enrollment.mentor)}</strong></span>
                <span>Due: <strong className="text-slate-700">{dateLabel(enrollment.dueDate ?? enrollment.due_date)}</strong></span>
                <span>{enrollment.completedModules}/{enrollment.totalModules} modules</span>
              </div>
            </div>
            <div className="rounded-sm border bg-slate-50 p-3" style={{ borderColor: sn.border }}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Progress</span>
                <SNPillBadge label={`${enrollment.progressPercent}%`} tone={progressTone(enrollment.progressPercent)} />
              </div>
              {percentBar(enrollment.progressPercent)}
            </div>
          </div>
          <div className="p-4">
            <ModuleList enrollment={enrollment} />
          </div>
        </section>
      ))}
    </div>
  );
}

function TracksPanel({
  tracks,
  teams,
  users,
  canAssign,
}: {
  tracks: LearningTrack[];
  teams: Team[];
  users: User[];
  canAssign: boolean;
}) {
  const assignTrack = useAssignLearningTrack();
  const [assignment, setAssignment] = useState({ trackId: '', user_id: '', mentor_id: '', due_date: '' });

  const submitAssignment = () => {
    if (!assignment.trackId || !assignment.user_id) return;
    const dueDate = assignment.due_date ? new Date(`${assignment.due_date}T23:59:00`).toISOString() : null;
    assignTrack.mutate({
      trackId: assignment.trackId,
      user_id: assignment.user_id,
      mentor_id: assignment.mentor_id || null,
      due_date: dueDate,
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="sn-list-shell">
        <div className="sn-list-titlebar flex items-center justify-between px-5">
          <div>
            <h2 className="text-[20px] font-bold" style={{ color: sn.navy }}>KT Tracks</h2>
            <p className="text-sm text-slate-500">Total rows: {tracks.length}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="sn-list-table">
            <thead>
              <tr>
                <th>Track</th>
                <th>Audience</th>
                <th>Team</th>
                <th>Modules</th>
                <th>Enrollments</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.id}>
                  <td>
                    <div className="font-bold" style={{ color: sn.navy }}>{track.title}</div>
                    <div className="truncate text-xs text-slate-500">{track.description}</div>
                  </td>
                  <td>{audienceLabel(track.audienceRole ?? track.audience_role)}</td>
                  <td>{track.team?.name ?? '-'}</td>
                  <td>{track.moduleCount ?? track.modules?.length ?? 0}</td>
                  <td>{track.enrollmentCount ?? 0}</td>
                  <td>{track.is_active ?? track.isActive ? <SNPillBadge label="Active" tone="success" /> : <SNPillBadge label="Inactive" tone="neutral" />}</td>
                </tr>
              ))}
              {!tracks.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="py-10 text-center text-sm text-slate-500">No KT tracks found.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {canAssign ? (
        <section className="rounded-sm border bg-white" style={{ borderColor: sn.border }}>
          <div className="border-b px-4 py-3" style={{ borderColor: sn.border, background: '#f7f8fa' }}>
            <h2 className="font-bold" style={{ color: sn.navy }}>Assign Track</h2>
          </div>
          <div className="space-y-3 p-4">
            <label className="block text-sm font-semibold text-slate-700">
              Track
              <select className="sn-field mt-1" value={assignment.trackId} onChange={(e) => setAssignment((v) => ({ ...v, trackId: e.target.value }))}>
                <option value="">-- Select KT track --</option>
                {tracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Fresher / Engineer
              <select className="sn-field mt-1" value={assignment.user_id} onChange={(e) => setAssignment((v) => ({ ...v, user_id: e.target.value }))}>
                <option value="">-- Select user --</option>
                {users.map((user) => <option key={user.id} value={user.id}>{userName(user)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Mentor
              <select className="sn-field mt-1" value={assignment.mentor_id} onChange={(e) => setAssignment((v) => ({ ...v, mentor_id: e.target.value }))}>
                <option value="">-- No mentor --</option>
                {users.map((user) => <option key={user.id} value={user.id}>{userName(user)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Due date
              <input className="sn-field mt-1" type="date" value={assignment.due_date} onChange={(e) => setAssignment((v) => ({ ...v, due_date: e.target.value }))} />
            </label>
            <button
              type="button"
              className="sn-primary-button inline-flex w-full items-center justify-center gap-2"
              disabled={!assignment.trackId || !assignment.user_id || assignTrack.isPending}
              onClick={submitAssignment}
            >
              {assignTrack.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Assign KT Track
            </button>
            <div className="rounded-sm border bg-slate-50 p-3 text-xs text-slate-500" style={{ borderColor: sn.border }}>
              Teams configured: {teams.length}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function BuilderPanel({ tracks, teams, users }: { tracks: LearningTrack[]; teams: Team[]; users: User[] }) {
  const [selectedId, setSelectedId] = useState('');
  const selectedTrack = tracks.find((track) => track.id === selectedId);
  const [form, setForm] = useState<LearningTrackInput>(emptyTrackForm);
  const createTrack = useCreateLearningTrack();
  const updateTrack = useUpdateLearningTrack();

  useEffect(() => {
    if (selectedTrack) setForm(buildFormFromTrack(selectedTrack));
    else setForm(emptyTrackForm);
  }, [selectedTrack]);

  const modules = form.modules ?? [];
  const setModule = (index: number, patch: Partial<LearningModuleInput>) => {
    setForm((current) => ({
      ...current,
      modules: (current.modules ?? []).map((module, i) => (i === index ? { ...module, ...patch } : module)),
    }));
  };

  const saveTrack = () => {
    const payload = normalizeTrackPayload(form);
    if (selectedId) updateTrack.mutate({ id: selectedId, data: payload });
    else createTrack.mutate(payload);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="rounded-sm border bg-white" style={{ borderColor: sn.border }}>
        <div className="border-b px-4 py-3" style={{ borderColor: sn.border, background: '#f7f8fa' }}>
          <h2 className="font-bold" style={{ color: sn.navy }}>Track Builder</h2>
        </div>
        <div className="space-y-2 p-3">
          <button
            type="button"
            className="sn-primary-button inline-flex w-full items-center justify-center gap-2"
            onClick={() => setSelectedId('')}
          >
            <Plus size={14} /> New Track
          </button>
          {tracks.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => setSelectedId(track.id)}
              className="w-full rounded-sm border px-3 py-2 text-left text-sm"
              style={{
                borderColor: selectedId === track.id ? sn.primaryBtn : sn.border,
                background: selectedId === track.id ? '#eef2ff' : '#fff',
                color: sn.text,
              }}
            >
              <span className="block font-bold">{track.title}</span>
              <span className="text-xs text-slate-500">{track.moduleCount ?? track.modules?.length ?? 0} modules</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-sm border bg-white" style={{ borderColor: sn.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: sn.border, background: '#f7f8fa' }}>
          <h2 className="font-bold" style={{ color: sn.navy }}>{selectedId ? 'Edit KT Track' : 'Create KT Track'}</h2>
          <button
            type="button"
            className="sn-primary-button inline-flex items-center gap-2"
            disabled={!form.title.trim() || !modules.some((module) => module.title.trim()) || createTrack.isPending || updateTrack.isPending}
            onClick={saveTrack}
          >
            {createTrack.isPending || updateTrack.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>

        <div className="sn-record-grid">
          <div className="sn-record-label">Title *</div>
          <div className="sn-record-control">
            <input className="sn-field" value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} />
          </div>
          <div className="sn-record-label">Audience</div>
          <div className="sn-record-control">
            <select className="sn-field" value={form.audience_role} onChange={(e) => setForm((v) => ({ ...v, audience_role: e.target.value }))}>
              {AUDIENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="sn-record-label">Team</div>
          <div className="sn-record-control">
            <select className="sn-field" value={form.team_id ?? ''} onChange={(e) => setForm((v) => ({ ...v, team_id: e.target.value }))}>
              <option value="">-- None --</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </div>
          <div className="sn-record-label">Owner</div>
          <div className="sn-record-control">
            <select className="sn-field" value={form.owner_id ?? ''} onChange={(e) => setForm((v) => ({ ...v, owner_id: e.target.value }))}>
              <option value="">-- Current user --</option>
              {users.map((user) => <option key={user.id} value={user.id}>{userName(user)}</option>)}
            </select>
          </div>
          <div className="sn-record-label">Description</div>
          <div className="sn-record-control sn-record-control-wide">
            <textarea className="sn-field" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
          </div>
        </div>

        <div className="border-t p-4" style={{ borderColor: sn.border }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold" style={{ color: sn.navy }}>Modules</h3>
            <button
              type="button"
              className="sn-soft-button inline-flex items-center gap-2"
              onClick={() => setForm((v) => ({ ...v, modules: [...(v.modules ?? []), emptyModule((v.modules?.length ?? 0) + 1)] }))}
            >
              <Plus size={14} /> Add Module
            </button>
          </div>
          <div className="space-y-3">
            {modules.map((module, index) => (
              <div key={module.id ?? index} className="rounded-sm border p-3" style={{ borderColor: sn.border }}>
                <div className="grid gap-3 lg:grid-cols-[72px_minmax(0,1fr)_150px_120px_120px_auto]">
                  <input className="sn-field" type="number" value={module.order} onChange={(e) => setModule(index, { order: Number(e.target.value || index + 1) })} />
                  <input className="sn-field" placeholder="Module title" value={module.title} onChange={(e) => setModule(index, { title: e.target.value })} />
                  <select className="sn-field" value={module.module_type} onChange={(e) => setModule(index, { module_type: e.target.value })}>
                    {MODULE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input className="sn-field" type="number" value={module.estimated_minutes} onChange={(e) => setModule(index, { estimated_minutes: Number(e.target.value || 30) })} />
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={module.is_required !== false} onChange={(e) => setModule(index, { is_required: e.target.checked })} />
                    Required
                  </label>
                  <button
                    type="button"
                    className="sn-soft-button inline-flex items-center justify-center"
                    onClick={() => setForm((v) => ({ ...v, modules: (v.modules ?? []).filter((_, i) => i !== index) }))}
                    aria-label="Remove module"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
                <input className="sn-field mt-3" placeholder="SOP, video, or document link" value={module.external_url} onChange={(e) => setModule(index, { external_url: e.target.value })} />
                <textarea className="sn-field mt-3" placeholder="Module content, task checklist, or KT notes" value={module.content} onChange={(e) => setModule(index, { content: e.target.value })} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgressPanel({ enrollments, summary }: { enrollments: LearningEnrollment[]; summary?: any }) {
  const cards = [
    { label: 'Assigned', value: summary?.assigned ?? 0, icon: BookOpenCheck },
    { label: 'In Progress', value: summary?.inProgress ?? 0, icon: Clock3 },
    { label: 'Completed', value: summary?.completed ?? 0, icon: CheckCircle2 },
    { label: 'Overdue', value: summary?.overdue ?? 0, icon: CalendarClock },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-sm border bg-white p-4" style={{ borderColor: sn.border }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm" style={{ background: '#eef2ff', color: sn.primaryBtn }}>
                <Icon size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: sn.navy }}>{value}</div>
                <div className="text-xs font-semibold text-slate-500">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <section className="sn-list-shell">
        <div className="sn-list-titlebar flex items-center justify-between px-5">
          <h2 className="text-[20px] font-bold" style={{ color: sn.navy }}>KT Progress</h2>
          <SNPillBadge label={`${summary?.averageProgress ?? 0}% average`} tone="info" />
        </div>
        <div className="overflow-x-auto">
          <table className="sn-list-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Track</th>
                <th>Status</th>
                <th>Mentor</th>
                <th>Due</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td>{userName(enrollment.user)}</td>
                  <td>{enrollment.track.title}</td>
                  <td>{statusBadge(enrollment.status, enrollment.isOverdue)}</td>
                  <td>{userName(enrollment.mentor)}</td>
                  <td>{dateLabel(enrollment.dueDate ?? enrollment.due_date)}</td>
                  <td>
                    <div className="flex min-w-[180px] items-center gap-3">
                      {percentBar(enrollment.progressPercent)}
                      <span className="w-10 text-right text-xs font-bold">{enrollment.progressPercent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!enrollments.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="py-10 text-center text-sm text-slate-500">No learning enrollments found.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function LearningHub() {
  const { isClient, hasPermission } = useAuth();
  const [tab, setTab] = useState<TabKey>('mine');
  const [search, setSearch] = useState('');

  const canManageLearning = hasPermission('learning:manage');
  const canAssignLearning = canManageLearning || hasPermission('learning:assign');

  const tracksQuery = useLearningTracks({ includeInactive: canManageLearning ? 'true' : undefined });
  const myTracksQuery = useMyLearningTracks();
  const enrollmentsQuery = useLearningEnrollments({}, canAssignLearning || tab === 'mine');
  const summaryQuery = useLearningSummary({}, canAssignLearning);
  const usersQuery = useLearningUsers(canAssignLearning || canManageLearning);
  const teamsQuery = useTeams({ limit: 200 });

  const teams = extractList<Team>(teamsQuery.data);
  const users = usersQuery.data ?? [];
  const tracks = useMemo(() => {
    const value = search.trim().toLowerCase();
    const rows = tracksQuery.data ?? [];
    if (!value) return rows;
    return rows.filter((track) => [track.title, track.description, track.team?.name].join(' ').toLowerCase().includes(value));
  }, [search, tracksQuery.data]);
  const myEnrollments = myTracksQuery.data ?? [];
  const enrollments = canAssignLearning ? enrollmentsQuery.data ?? [] : myEnrollments;

  useEffect(() => {
    if ((tab === 'builder' && !canManageLearning) || (tab === 'progress' && !canAssignLearning)) {
      setTab('mine');
    }
  }, [tab, canManageLearning, canAssignLearning]);

  if (isClient) {
    return (
      <SNPage className="min-h-full" style={{ margin: '-24px', padding: 24, background: sn.shellBg }}>
        <div className="rounded-sm border bg-white p-8 text-center" style={{ borderColor: sn.border }}>
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <h1 className="text-xl font-bold" style={{ color: sn.navy }}>Learning Hub is internal only</h1>
        </div>
      </SNPage>
    );
  }

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'mine', label: 'My KT Plan' },
    { key: 'tracks', label: 'Tracks' },
    ...(canManageLearning ? [{ key: 'builder' as TabKey, label: 'Builder' }] : []),
    ...(canAssignLearning ? [{ key: 'progress' as TabKey, label: 'Progress' }] : []),
  ];

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', padding: 24, background: sn.shellBg }}>
      <div className="mb-4 rounded-sm border bg-white" style={{ borderColor: sn.border }}>
        <div className="flex flex-col gap-4 border-b px-6 py-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: sn.border }}>
          <div>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-7 w-7" style={{ color: sn.primaryBtn }} />
              <h1 className="text-2xl font-bold" style={{ color: sn.navy }}>Learning Hub</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Assigned: {myEnrollments.length} | Tracks: {tracksQuery.data?.length ?? 0} | Average progress: {summaryQuery.data?.averageProgress ?? 0}%
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="sn-list-input w-full"
              placeholder="Search KT tracks"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 px-5 pt-3">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sn-tab ${tab === item.key ? 'sn-tab-active' : ''}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mine' ? <MyKtPanel enrollments={myEnrollments} loading={myTracksQuery.isLoading} /> : null}
      {tab === 'tracks' ? <TracksPanel tracks={tracks} teams={teams} users={users} canAssign={canAssignLearning} /> : null}
      {tab === 'builder' && canManageLearning ? <BuilderPanel tracks={tracks} teams={teams} users={users} /> : null}
      {tab === 'progress' && canAssignLearning ? <ProgressPanel enrollments={enrollments} summary={summaryQuery.data} /> : null}
    </SNPage>
  );
}
