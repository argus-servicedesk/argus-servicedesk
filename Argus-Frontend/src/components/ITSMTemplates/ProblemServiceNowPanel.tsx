import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
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
  const [shortDescription, setShortDescription] = useState(problem.shortDescription || '');
  const [description, setDescription] = useState(problem.description || '');
  const [priority, setPriority] = useState(problem.priority || 'P3');
  const [state, setState] = useState(problem.state || 'NEW');
  const [category, setCategory] = useState(problem.category || '');
  const [rootCause, setRootCause] = useState(problem.rootCause || '');
  const [workaround, setWorkaround] = useState(problem.workaround || '');
  const [permanentFix, setPermanentFix] = useState(problem.permanentFix || '');

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

  const stateTone = state === 'RESOLVED' || state === 'CLOSED' ? 'success' : state === 'KNOWN_ERROR' ? 'critical' : state === 'NEW' ? 'warn' : 'progress';

  return (
    <SNPage className="overflow-hidden rounded-md border shadow-sm" style={{ borderColor: sn.border }}>
      <SNRecordHeader
        number={problem.number}
        titleNumber={problem.number}
        priorityPill={<SNPillBadge label={PRIORITY_LABELS[priority] || priority} tone={priorityTone(priority)} dot={priority === 'P1'} />}
        statePill={<SNPillBadge label={(PROBLEM_STATE_LABELS[state] || state).toUpperCase()} tone={stateTone} icon={stateTone === 'progress' ? Loader2 : undefined} />}
        extraBadges={problem.isKnownError ? <SNPillBadge label={problem.knownErrorId || 'Known Error'} tone="critical" /> : null}
        onClone={handleClone}
        onLink={() => {
          navigator.clipboard.writeText(window.location.href);
          toast.success('Problem link copied');
        }}
        onPrint={() => window.print()}
        onUpdate={handleUpdate}
        updateLoading={Boolean(updateProblem.isPending)}
        secondaryActions={state === 'RESOLVED' || state === 'CLOSED' ? (
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
        ) : undefined}
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
            <textarea className="sn-field" value={description} onChange={(event) => setDescription(event.target.value)} />
          </SNFormRow>
        </SNFieldGrid>
      </SNCollapsibleSection>

      <SNCollapsibleSection title="Root cause analysis">
        <SNFieldGrid>
          <SNFormRow label="Root cause" fullWidth>
            <textarea className="sn-field" value={rootCause} onChange={(event) => setRootCause(event.target.value)} />
          </SNFormRow>
          <SNFormRow label="Workaround" fullWidth>
            <textarea className="sn-field" value={workaround} onChange={(event) => setWorkaround(event.target.value)} />
          </SNFormRow>
          <SNFormRow label="Permanent fix" fullWidth>
            <textarea className="sn-field" value={permanentFix} onChange={(event) => setPermanentFix(event.target.value)} />
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

        <SNRelatedList title="Activity" count={workNotes.length + activities.length}>
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
                  <tr key={`note-${note.id || index}`}>
                    <td>Work note</td>
                    <td>{formatDateTime(note.createdAt || note.created_at)}</td>
                    <td>{formatPersonName(note.createdBy || note.user || note.author)}</td>
                    <td>{note.content || note.note || '-'}</td>
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
