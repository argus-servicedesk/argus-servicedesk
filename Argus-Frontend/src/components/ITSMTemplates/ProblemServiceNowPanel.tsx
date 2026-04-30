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

const PROBLEM_TRANSITIONS: Record<string, string[]> = {
  NEW: ['INVESTIGATION'],
  INVESTIGATION: ['RCA_IN_PROGRESS', 'KNOWN_ERROR'],
  RCA_IN_PROGRESS: ['KNOWN_ERROR', 'RESOLVED'],
  KNOWN_ERROR: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
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

  const stateOptions = Array.from(new Set([problem.state, ...(PROBLEM_TRANSITIONS[problem.state] || [])].filter(Boolean)));

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
      />

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
    </SNPage>
  );
}
