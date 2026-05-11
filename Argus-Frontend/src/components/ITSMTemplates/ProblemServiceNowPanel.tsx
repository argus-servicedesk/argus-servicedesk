import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Sparkles, Send, FileText, CheckCircle } from 'lucide-react';
import {
  SNFieldGrid,
  SNFormRow,
  SNPage,
  SNReadOnly,
  SNRecordHeader,
  SNCollapsibleSection,
  SNPillBadge,
  SNProcessRibbon,
  SNRelatedList,
  SNEmptyRelatedList,
  sn,
} from './ServiceNowUI';
import { useAuth } from '../../hooks/useAuth';
import { useAiRCA, useAddProblemWorkNote } from '../../hooks/useProblems';

const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Database', 'Security', 'Cloud', 'Infrastructure', 'Application', 'Configuration', 'Human Error', 'Other'];

const PRIORITY_LABELS: Record<string, string> = {
  P1: '1 - Critical',
  P2: '2 - High',
  P3: '3 - Moderate',
  P4: '4 - Low',
};

const PROBLEM_STATE_LABELS: Record<string, string> = {
  NEW: 'New',
  INVESTIGATION: 'Investigation',
  RCA_IN_PROGRESS: 'RCA In Progress',
  KNOWN_ERROR: 'Known Error',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

function formatPersonName(value: unknown): string {
  if (!value) return 'Unassigned';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { firstName?: string; lastName?: string; name?: string };
    if (obj.firstName || obj.lastName) return [obj.firstName, obj.lastName].filter(Boolean).join(' ');
    if (obj.name) return obj.name;
  }
  return 'Unassigned';
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function priorityTone(priority: string): 'critical' | 'warn' | 'neutral' | 'success' {
  if (priority === 'P1') return 'critical';
  if (priority === 'P2') return 'warn';
  if (priority === 'P4') return 'success';
  return 'neutral';
}

export default function ProblemServiceNowPanel({
  problem,
  updateProblem,
}: {
  problem: any;
  updateProblem: {
    mutateAsync: (args: { id: string; data: Record<string, unknown> }) => Promise<unknown>;
    isPending?: boolean;
  };
}) {
  const navigate = useNavigate();
  const { isEngineer, isManager, isAdmin, hasRole, canManage } = useAuth();
  const canModify = canManage('problems');

  const aiRCA = useAiRCA();
  const addWorkNote = useAddProblemWorkNote(problem?.id || '');

  const [shortDescription, setShortDescription] = useState(problem.shortDescription || '');
  const [description, setDescription] = useState(problem.description || '');
  const [priority, setPriority] = useState(problem.priority || 'P3');
  const [state, setState] = useState(problem.state || 'NEW');
  const [category, setCategory] = useState(problem.category || '');
  const [rootCause, setRootCause] = useState(problem.rootCause || '');
  const [workaround, setWorkaround] = useState(problem.workaround || '');
  const [permanentFix, setPermanentFix] = useState(problem.permanentFix || '');
  
  const [newWorkNote, setNewWorkNote] = useState('');

  useEffect(() => {
    setShortDescription(problem.shortDescription || '');
    setDescription(problem.description || '');
    setPriority(problem.priority || 'P3');
    setState(problem.state || 'NEW');
    setCategory(problem.category || '');
    setRootCause(problem.rootCause || '');
    setWorkaround(problem.workaround || '');
    setPermanentFix(problem.permanentFix || '');
  }, [problem.id, problem.updatedAt]);

  const stateOptions = Object.keys(PROBLEM_STATE_LABELS);
  const linkedIncidents = Array.isArray(problem.linkedIncidents) ? problem.linkedIncidents : [];
  const workNotes = Array.isArray(problem.workNotes) ? problem.workNotes : [];
  const activities = Array.isArray(problem.activities) ? problem.activities : [];
  const problemTasks = Array.isArray(problem.problemTasks || problem.tasks) ? (problem.problemTasks || problem.tasks) : [];

  async function handleUpdate() {
    const data: Record<string, unknown> = {};
    if (shortDescription.trim() !== problem.shortDescription) data.shortDescription = shortDescription.trim();
    if ((description || '') !== (problem.description || '')) data.description = description || null;
    if (priority !== problem.priority) data.priority = priority;
    if (state !== problem.state) {
      data.state = state;
      if (state === 'KNOWN_ERROR') data.isKnownError = true;
    }
    if (category !== (problem.category || '')) data.category = category || null;
    if (rootCause !== (problem.rootCause || '')) data.rootCause = rootCause || null;
    if (workaround !== (problem.workaround || '')) data.workaround = workaround || null;
    if (permanentFix !== (problem.permanentFix || '')) data.permanentFix = permanentFix || null;

    if (Object.keys(data).length === 0) {
      toast('No changes to save');
      return;
    }

    try {
      await updateProblem.mutateAsync({ id: problem.id, data });
      toast.success('Problem updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update problem');
    }
  }

  function handleClone() {
    navigate('/problems/create', {
      state: {
        clone: {
          shortDescription: `Copy of ${problem.number}: ${problem.shortDescription}`,
          description: problem.description || '',
          priority: problem.priority || 'P3',
          category: problem.category || '',
          rootCause: problem.rootCause || '',
          workaround: problem.workaround || '',
          permanentFix: problem.permanentFix || '',
        },
      },
    });
  }

  async function handleAiRCA() {
    try {
      await aiRCA.mutateAsync(problem.id);
      toast.success('AI RCA Analysis Complete. See Work Notes.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'AI RCA failed');
    }
  }

  async function handleAddWorkNote() {
    if (!newWorkNote.trim()) return;
    try {
      await addWorkNote.mutateAsync({ content: newWorkNote, isInternal: true });
      toast.success('Work note added');
      setNewWorkNote('');
    } catch (err: any) {
      toast.error('Failed to add work note');
    }
  }

  const stateTone = state === 'RESOLVED' || state === 'CLOSED' ? 'success' : state === 'KNOWN_ERROR' ? 'critical' : state === 'NEW' ? 'warn' : 'progress';

  return (
    <SNPage className="overflow-hidden rounded-md border shadow-sm" style={{ borderColor: sn.border }}>
      <SNRecordHeader
        number={problem.number}
        titleNumber={problem.number}
        priorityPill={<SNPillBadge label={PRIORITY_LABELS[priority] || priority} tone={priorityTone(priority)} dot={priority === 'P1'} />}
        statePill={<SNPillBadge label={(PROBLEM_STATE_LABELS[state] || state).toUpperCase()} tone={stateTone} icon={stateTone === 'progress' ? Loader2 : undefined} />}
        extraBadges={problem.isKnownError ? <SNPillBadge label={problem.knownErrorId || 'Known Error'} tone="critical" /> : null}
        onClone={canModify ? handleClone : undefined}
        onLink={() => {
          navigator.clipboard.writeText(window.location.href);
          toast.success('Problem link copied');
        }}
        onPrint={() => window.print()}
        onUpdate={canModify ? handleUpdate : undefined}
        updateLoading={Boolean(updateProblem.isPending)}
        secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            {canManage && state !== 'RESOLVED' && state !== 'CLOSED' && (
              <button
                type="button"
                className="sn-soft-button flex items-center gap-1"
                onClick={() => {
                  setState('RESOLVED');
                  toast('State set to Resolved. Click Update to confirm.');
                }}
                style={{ borderColor: '#067647', color: '#067647' }}
              >
                <CheckCircle size={12} /> Resolve
              </button>
            )}
            {canManage && (state === 'RESOLVED' || state === 'CLOSED') && (
              <button
                type="button"
                className="sn-soft-button"
                onClick={() => {
                  setState('INVESTIGATION');
                  toast('State set to Investigation. Click Update to confirm.');
                }}
              >
                Reopen
              </button>
            )}
          </div>
        }
      />

      <SNProcessRibbon steps={['NEW', 'INVESTIGATION', 'RCA_IN_PROGRESS', 'KNOWN_ERROR', 'RESOLVED', 'CLOSED']} current={state} />

      <SNCollapsibleSection title="Problem details">
        <SNFieldGrid>
          <SNFormRow label="Number" required>
            <SNReadOnly>{problem.number}</SNReadOnly>
          </SNFormRow>
          <SNFormRow label="Opened">
            <SNReadOnly>{formatDateTime(problem.createdAt)}</SNReadOnly>
          </SNFormRow>

          <SNFormRow label="Reported by" required>
            <SNReadOnly color={sn.link}>{formatPersonName(problem.createdBy)}</SNReadOnly>
          </SNFormRow>
          <SNFormRow label="Category">
            <select className="sn-field" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">-</option>
              {CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </SNFormRow>

          <SNFormRow label="State">
            <select className="sn-field" value={state} onChange={(event) => setState(event.target.value)}>
              {stateOptions.map((value) => <option key={value} value={value}>{PROBLEM_STATE_LABELS[value] || value}</option>)}
            </select>
          </SNFormRow>
          <SNFormRow label="Priority">
            <select className="sn-field" value={priority} onChange={(event) => setPriority(event.target.value)}>
              {PRIORITIES.map((value) => <option key={value} value={value}>{PRIORITY_LABELS[value]}</option>)}
            </select>
          </SNFormRow>

          <SNFormRow label="Assignment group">
            <SNReadOnly>{formatPersonName(problem.assignmentGroup)}</SNReadOnly>
          </SNFormRow>
          <SNFormRow label="Assigned to">
            <SNReadOnly>{formatPersonName(problem.assignedTo)}</SNReadOnly>
          </SNFormRow>

          <SNFormRow label="Known Error ID">
            <SNReadOnly>{problem.knownErrorId || '-'}</SNReadOnly>
          </SNFormRow>
          <SNFormRow label="Related change">
            <SNReadOnly>{problem.relatedChangeInfo?.number || problem.relatedChangeId || '-'}</SNReadOnly>
          </SNFormRow>

          <SNFormRow label="Short Description" required fullWidth>
            <input className="sn-field" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} />
          </SNFormRow>
          <SNFormRow label="Description" fullWidth>
            <textarea className="sn-field" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          </SNFormRow>
        </SNFieldGrid>
      </SNCollapsibleSection>

      <SNCollapsibleSection title="Root cause analysis">
        <SNFieldGrid>
          <SNFormRow label="AI RCA Assistance" fullWidth>
            <div className="flex items-center gap-4 bg-slate-50 p-3 border rounded-md">
              <Sparkles className="text-purple-600 shrink-0" size={24} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Run Automated Root Cause Analysis</p>
                <p className="text-xs text-slate-500">Analyze linked incidents and problem description to generate a preliminary RCA.</p>
              </div>
              <button
                type="button"
                className="sn-primary-button whitespace-nowrap"
                style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                onClick={handleAiRCA}
                disabled={aiRCA.isPending}
              >
                {aiRCA.isPending ? <><Loader2 size={14} className="animate-spin inline mr-1" />Analyzing...</> : 'Generate RCA'}
              </button>
            </div>
          </SNFormRow>
          <SNFormRow label="Root cause" fullWidth>
            <textarea className="sn-field" rows={4} value={rootCause} onChange={(event) => setRootCause(event.target.value)} placeholder="Describe the underlying cause..." />
          </SNFormRow>
          <SNFormRow label="Workaround" fullWidth>
            <textarea className="sn-field" rows={3} value={workaround} onChange={(event) => setWorkaround(event.target.value)} placeholder="Temporary fix or mitigation..." />
          </SNFormRow>
          <SNFormRow label="Permanent fix" fullWidth>
            <textarea className="sn-field" rows={3} value={permanentFix} onChange={(event) => setPermanentFix(event.target.value)} placeholder="Long-term resolution..." />
          </SNFormRow>
        </SNFieldGrid>
      </SNCollapsibleSection>

      <div className="px-1 pb-6">
        <SNRelatedList title="Related Incidents" count={linkedIncidents.length}>
          {linkedIncidents.length === 0 ? (
            <SNEmptyRelatedList message="No incidents are linked to this problem." />
          ) : (
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Relationship</th>
                  <th>State</th>
                  <th>Short description</th>
                </tr>
              </thead>
              <tbody>
                {linkedIncidents.map((item: any, index: number) => (
                  <tr key={item.id || index}>
                    <td>{item.incident?.number || item.number || '-'}</td>
                    <td>{item.linkType || 'Related'}</td>
                    <td>{item.incident?.state || item.state || '-'}</td>
                    <td>{item.incident?.shortDescription || item.shortDescription || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SNRelatedList>

        <SNRelatedList title="Problem Tasks" count={problemTasks.length}>
          {problemTasks.length === 0 ? (
            <SNEmptyRelatedList message="No RCA tasks have been created." />
          ) : (
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>State</th>
                  <th>Assigned to</th>
                  <th>Short description</th>
                </tr>
              </thead>
              <tbody>
                {problemTasks.map((task: any, index: number) => (
                  <tr key={task.id || index}>
                    <td>{task.number || '-'}</td>
                    <td>{task.state || '-'}</td>
                    <td>{formatPersonName(task.assignedTo)}</td>
                    <td>{task.shortDescription || task.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SNRelatedList>

        <SNRelatedList title="Knowledge and Known Error" count={problem.isKnownError || problem.knownErrorId ? 1 : 0}>
          {problem.isKnownError || problem.knownErrorId ? (
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Known Error ID</th>
                  <th>Workaround</th>
                  <th>Permanent fix</th>
                  <th>Related change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{problem.knownErrorId || 'Known Error'}</td>
                  <td>{workaround || '-'}</td>
                  <td>{permanentFix || '-'}</td>
                  <td>{problem.relatedChangeInfo?.number || problem.relatedChangeId || '-'}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <SNEmptyRelatedList message="This problem is not marked as a known error." />
          )}
        </SNRelatedList>

        <SNRelatedList title="Activity and Work Notes" count={workNotes.length + activities.length}>
          {canManage && (
            <div className="p-4 border-b bg-slate-50 flex gap-2 items-start">
              <FileText className="text-slate-400 mt-2 shrink-0" size={18} />
              <div className="flex-1">
                <textarea
                  className="sn-field bg-yellow-50 focus:bg-yellow-50"
                  rows={2}
                  placeholder="Type a work note (Internal)..."
                  value={newWorkNote}
                  onChange={(e) => setNewWorkNote(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="sn-primary-button self-end"
                onClick={handleAddWorkNote}
                disabled={!newWorkNote.trim() || addWorkNote.isPending}
              >
                {addWorkNote.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          )}
          {workNotes.length + activities.length === 0 ? (
            <SNEmptyRelatedList message="No activity has been recorded yet." />
          ) : (
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Created</th>
                  <th>User</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {workNotes.map((note: any, index: number) => (
                  <tr key={`note-${note.id || index}`} className="bg-yellow-50/50">
                    <td>Work note</td>
                    <td>{formatDateTime(note.createdAt || note.created_at)}</td>
                    <td>{formatPersonName(note.createdBy || note.user || note.author)}</td>
                    <td className="font-medium">{note.content || note.note || '-'}</td>
                  </tr>
                ))}
                {activities.map((activity: any, index: number) => (
                  <tr key={`activity-${activity.id || index}`}>
                    <td>Activity</td>
                    <td>{formatDateTime(activity.createdAt || activity.created_at)}</td>
                    <td>{formatPersonName(activity.user || activity.createdBy)}</td>
                    <td>{activity.message || activity.description || activity.fieldName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SNRelatedList>
      </div>
    </SNPage>
  );
}
