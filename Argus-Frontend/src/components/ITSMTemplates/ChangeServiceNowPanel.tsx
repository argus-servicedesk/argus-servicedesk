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
  SNProcessRibbon,
  SNRelatedList,
  SNEmptyRelatedList,
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

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  implementation_plan: 'Implementation plan',
  rollback_plan: 'Backout plan',
  test_plan: 'Test plan',
  review_notes: 'Review notes',
  closure_code: 'Closure code',
};

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
  const [reviewNotes, setReviewNotes] = useState(change.reviewNotes || '');
  const [closureCode, setClosureCode] = useState(change.closureCode || '');

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
    setReviewNotes(change.reviewNotes || '');
    setClosureCode(change.closureCode || '');
  }, [change.id, change.updatedAt]);

  const stateOptions = Object.keys(CHANGE_STATE_LABELS);
  const approvals = Array.isArray(change.approvals) ? change.approvals : [];
  const affectedCis = Array.isArray(change.affectedCIs || change.affectedCis) ? (change.affectedCIs || change.affectedCis) : [];
  const linkedIncidents = Array.isArray(change.linkedIncidents) ? change.linkedIncidents : [];
  const workNotes = Array.isArray(change.workNotes) ? change.workNotes : [];
  const activities = Array.isArray(change.activities) ? change.activities : [];

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
    if (reviewNotes !== (change.reviewNotes || '')) data.reviewNotes = reviewNotes || null;
    if (closureCode !== (change.closureCode || '')) data.closureCode = closureCode || null;

    if (state !== change.state) {
      const requiredMap = (change.requiredFieldsForState || {}) as Record<string, string[]>;
      const requiredForTarget = requiredMap[state] || [];
      const localValues: Record<string, string | null> = {
        implementation_plan: implementationPlan || null,
        rollback_plan: rollbackPlan || null,
        test_plan: testPlan || null,
        review_notes: reviewNotes || null,
        closure_code: closureCode || null,
      };
      const missing = requiredForTarget.filter((field) => !String(localValues[field] || '').trim());
      if (missing.length > 0) {
        toast.error(`Missing required fields: ${missing.map((m) => REQUIRED_FIELD_LABELS[m] || m).join(', ')}`);
        return;
      }
    }

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

      <SNProcessRibbon steps={['NEW', 'ASSESSMENT', 'APPROVAL', 'SCHEDULED', 'IMPLEMENTING', 'REVIEW', 'CLOSED']} current={state} />

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
          <SNFormRow label="Review notes" fullWidth>
            <textarea className="sn-field" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} />
          </SNFormRow>
          <SNFormRow label="Closure code">
            <select className="sn-field" value={closureCode} onChange={(event) => setClosureCode(event.target.value)}>
              <option value="">-</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="FAILED">Failed</option>
              <option value="PARTIAL">Partial</option>
            </select>
          </SNFormRow>
        </SNFieldGrid>
      </SNCollapsibleSection>

      <div className="px-1 pb-6">
        <SNRelatedList title="Approvers" count={approvals.length}>
          {approvals.length === 0 ? (
            <SNEmptyRelatedList message="No approval records." />
          ) : (
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Approver</th>
                  <th>State</th>
                  <th>Approved</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((approval: any, index: number) => (
                  <tr key={approval.id || index}>
                    <td>{formatPersonName(approval.approver || approval.user)}</td>
                    <td>{approval.state || '-'}</td>
                    <td>{formatDateTime(approval.approvedAt)}</td>
                    <td>{approval.comments || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SNRelatedList>

        <SNRelatedList title="Affected CIs" count={affectedCis.length}>
          {affectedCis.length === 0 ? (
            <SNEmptyRelatedList message="No affected configuration items." />
          ) : (
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                {affectedCis.map((item: any, index: number) => {
                  const ci = item.configItem || item.configurationItem || item.ci || item;
                  return (
                    <tr key={item.id || ci.id || index}>
                      <td>{ci.name || '-'}</td>
                      <td>{ci.type || '-'}</td>
                      <td>{ci.status || '-'}</td>
                      <td>{item.impactType || item.impact || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SNRelatedList>

        <SNRelatedList title="Linked Incidents" count={linkedIncidents.length}>
          {linkedIncidents.length === 0 ? (
            <SNEmptyRelatedList message="No incidents are linked to this change." />
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
