import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
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

const CHANGE_TYPES = ['NORMAL', 'STANDARD', 'EMERGENCY'];
const RISK_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Database', 'Security', 'Cloud', 'Infrastructure', 'Application', 'Other'];

const CHANGE_STATE_LABELS: Record<string, string> = {
  NEW: 'New',
  ASSESSMENT: 'Assessment',
  APPROVAL: 'Approval',
  SCHEDULED: 'Scheduled',
  IMPLEMENTING: 'Implementing',
  REVIEW: 'Review',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const CHANGE_TRANSITIONS: Record<string, string[]> = {
  NEW: ['ASSESSMENT', 'APPROVAL', 'CANCELLED'],
  ASSESSMENT: ['APPROVAL', 'CANCELLED'],
  APPROVAL: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['IMPLEMENTING', 'CANCELLED'],
  IMPLEMENTING: ['REVIEW', 'CANCELLED'],
  REVIEW: ['CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
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

function riskLabel(risk: string): string {
  if (risk === 'HIGH') return '1 - High Risk';
  if (risk === 'MEDIUM') return '2 - Moderate Risk';
  return '3 - Low Risk';
}

export default function ChangeServiceNowPanel({
  change,
  updateChange,
  approveLoading,
  onApprove,
  onReject,
}: {
  change: any;
  updateChange: {
    mutateAsync: (args: { id: string; data: Record<string, unknown> }) => Promise<unknown>;
    isPending?: boolean;
  };
  approveLoading?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const navigate = useNavigate();
  const [shortDescription, setShortDescription] = useState(change.shortDescription || '');
  const [description, setDescription] = useState(change.description || '');
  const [type, setType] = useState(change.type || 'NORMAL');
  const [risk, setRisk] = useState(change.risk || change.riskLevel || 'MEDIUM');
  const [state, setState] = useState(change.state || 'NEW');
  const [category, setCategory] = useState(change.category || '');
  const [justification, setJustification] = useState(change.justification || '');
  const [implementationPlan, setImplementationPlan] = useState(change.implementationPlan || '');
  const [rollbackPlan, setRollbackPlan] = useState(change.rollbackPlan || change.backoutPlan || '');
  const [testPlan, setTestPlan] = useState(change.testPlan || '');

  useEffect(() => {
    setShortDescription(change.shortDescription || '');
    setDescription(change.description || '');
    setType(change.type || 'NORMAL');
    setRisk(change.risk || change.riskLevel || 'MEDIUM');
    setState(change.state || 'NEW');
    setCategory(change.category || '');
    setJustification(change.justification || '');
    setImplementationPlan(change.implementationPlan || '');
    setRollbackPlan(change.rollbackPlan || change.backoutPlan || '');
    setTestPlan(change.testPlan || '');
  }, [change.id, change.updatedAt]);

  const stateOptions = Array.from(new Set([change.state, ...(CHANGE_TRANSITIONS[change.state] || [])].filter(Boolean)));

  async function handleUpdate() {
    const data: Record<string, unknown> = {};
    if (shortDescription.trim() !== change.shortDescription) data.shortDescription = shortDescription.trim();
    if ((description || '') !== (change.description || '')) data.description = description || null;
    if (type !== change.type) data.type = type;
    if (risk !== (change.risk || change.riskLevel)) data.riskLevel = risk;
    if (state !== change.state) data.state = state;
    if (category !== (change.category || '')) data.category = category || null;
    if (justification !== (change.justification || '')) data.justification = justification || null;
    if (implementationPlan !== (change.implementationPlan || '')) data.implementationPlan = implementationPlan || null;
    if (rollbackPlan !== (change.rollbackPlan || change.backoutPlan || '')) data.rollbackPlan = rollbackPlan || null;
    if (testPlan !== (change.testPlan || '')) data.testPlan = testPlan || null;

    if (Object.keys(data).length === 0) {
      toast('No changes to save');
      return;
    }

    try {
      await updateChange.mutateAsync({ id: change.id, data });
      toast.success('Change updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update change');
    }
  }

  function handleClone() {
    navigate('/changes/create', {
      state: {
        clone: {
          shortDescription: `Copy of ${change.number}: ${change.shortDescription}`,
          description: change.description || '',
          type: change.type,
          riskLevel: change.risk || change.riskLevel,
          category: change.category || '',
          justification: change.justification || '',
          implementationPlan: change.implementationPlan || '',
          rollbackPlan: change.rollbackPlan || change.backoutPlan || '',
          testPlan: change.testPlan || '',
        },
      },
    });
  }

  const stateTone = state === 'CLOSED' ? 'success' : state === 'CANCELLED' ? 'neutral' : state === 'APPROVAL' ? 'warn' : 'progress';
  const riskTone = risk === 'HIGH' ? 'critical' : risk === 'MEDIUM' ? 'warn' : 'success';

  return (
    <SNPage className="overflow-hidden rounded-md border shadow-sm" style={{ borderColor: sn.border }}>
      <SNRecordHeader
        number={change.number}
        titleNumber={change.number}
        priorityPill={<SNPillBadge label={riskLabel(risk)} tone={riskTone} dot={risk === 'HIGH'} />}
        statePill={<SNPillBadge label={(CHANGE_STATE_LABELS[state] || state).toUpperCase()} tone={stateTone} icon={stateTone === 'progress' ? Loader2 : undefined} />}
        extraBadges={<SNPillBadge label={type} tone="info" />}
        onClone={handleClone}
        onLink={() => {
          navigator.clipboard.writeText(window.location.href);
          toast.success('Change link copied');
        }}
        onPrint={() => window.print()}
        onUpdate={handleUpdate}
        updateLoading={Boolean(updateChange.isPending)}
        secondaryActions={change.state === 'APPROVAL' && onApprove && onReject ? (
          <>
            <button
              type="button"
              onClick={onReject}
              disabled={approveLoading}
              className="inline-flex min-h-[47px] items-center justify-center gap-2 rounded border px-5 py-3 text-[18px] font-medium"
              style={{ borderColor: '#f1b2b5', color: sn.critical, background: '#fff6f6' }}
            >
              <XCircle size={19} />
              Reject
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={approveLoading}
              className="inline-flex min-h-[47px] items-center justify-center gap-2 rounded border px-5 py-3 text-[18px] font-medium"
              style={{ borderColor: '#9be7bd', color: '#067647', background: '#ecfdf3' }}
            >
              <CheckCircle size={19} />
              Approve
            </button>
          </>
        ) : null}
      />

      <SNCollapsibleSection title="Change details">
        <SNFieldGrid>
          <SNFormRow label="Number" required>
            <SNReadOnly>{change.number}</SNReadOnly>
          </SNFormRow>
          <SNFormRow label="Opened">
            <SNReadOnly>{formatDateTime(change.createdAt)}</SNReadOnly>
          </SNFormRow>

          <SNFormRow label="Requested by" required>
            <SNReadOnly color={sn.link}>{formatPersonName(change.requestedBy || change.createdBy)}</SNReadOnly>
          </SNFormRow>
          <SNFormRow label="Type">
            <select className="sn-field" value={type} onChange={(event) => setType(event.target.value)}>
              {CHANGE_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </SNFormRow>

          <SNFormRow label="State">
            <select className="sn-field" value={state} onChange={(event) => setState(event.target.value)}>
              {stateOptions.map((value) => <option key={value} value={value}>{CHANGE_STATE_LABELS[value] || value}</option>)}
            </select>
          </SNFormRow>
          <SNFormRow label="Risk">
            <select className="sn-field" value={risk} onChange={(event) => setRisk(event.target.value)}>
              {RISK_LEVELS.map((value) => <option key={value} value={value}>{riskLabel(value)}</option>)}
            </select>
          </SNFormRow>

          <SNFormRow label="Category">
            <select className="sn-field" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">-</option>
              {CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </SNFormRow>
          <SNFormRow label="Assignment group">
            <SNReadOnly>{formatPersonName(change.assignmentGroup)}</SNReadOnly>
          </SNFormRow>

          <SNFormRow label="Assigned to">
            <SNReadOnly>{formatPersonName(change.assignedTo)}</SNReadOnly>
          </SNFormRow>
          <SNFormRow label="Planned start">
            <SNReadOnly>{formatDateTime(change.plannedStartDate || change.scheduledStart)}</SNReadOnly>
          </SNFormRow>

          <SNFormRow label="Planned end">
            <SNReadOnly>{formatDateTime(change.plannedEndDate || change.scheduledEnd)}</SNReadOnly>
          </SNFormRow>
          <SNFormRow label="Actual end">
            <SNReadOnly>{formatDateTime(change.actualEndDate)}</SNReadOnly>
          </SNFormRow>

          <SNFormRow label="Short Description" required fullWidth>
            <input className="sn-field" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} />
          </SNFormRow>
          <SNFormRow label="Description" fullWidth>
            <textarea className="sn-field" value={description} onChange={(event) => setDescription(event.target.value)} />
          </SNFormRow>
          <SNFormRow label="Justification" fullWidth>
            <textarea className="sn-field" value={justification} onChange={(event) => setJustification(event.target.value)} />
          </SNFormRow>
        </SNFieldGrid>
      </SNCollapsibleSection>

      <SNCollapsibleSection title="Planning">
        <SNFieldGrid>
          <SNFormRow label="Implementation plan" fullWidth>
            <textarea className="sn-field" value={implementationPlan} onChange={(event) => setImplementationPlan(event.target.value)} />
          </SNFormRow>
          <SNFormRow label="Backout plan" fullWidth>
            <textarea className="sn-field" value={rollbackPlan} onChange={(event) => setRollbackPlan(event.target.value)} />
          </SNFormRow>
          <SNFormRow label="Test plan" fullWidth>
            <textarea className="sn-field" value={testPlan} onChange={(event) => setTestPlan(event.target.value)} />
          </SNFormRow>
        </SNFieldGrid>
      </SNCollapsibleSection>
    </SNPage>
  );
}
