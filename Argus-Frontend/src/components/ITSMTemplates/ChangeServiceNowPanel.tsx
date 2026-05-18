import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, Loader2, XCircle, FileText, Send, Clock, Users, UserCheck, ShieldAlert } from 'lucide-react';
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
  SNModal,
  SNLabel,
  sn,
} from './ServiceNowUI';
import { useAuth } from '../../hooks/useAuth';
import { useAddChangeWorkNote } from '../../hooks/useChanges';
import api from '../../lib/api';
import {
  assignableUsersForTeam,
  assignmentPersonLabel,
  extractAssignmentList,
  orderedAssignmentTeams,
  type AssignmentRosterTeam,
} from '../../utils/assignmentRoster';

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
  return assignmentPersonLabel(value);
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
  onApprove?: (comments: string) => void;
  onReject?: (comments: string) => void;
}) {
  const navigate = useNavigate();
  const { user, isClient, isManager, isAdmin } = useAuth();
  const canModify = !isClient && (isManager || isAdmin || Boolean(change.canEdit));
  const canAssign = !isClient && (isManager || isAdmin);

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
  const [assignmentGroupId, setAssignmentGroupId] = useState(change.assignmentGroupId || change.assignmentGroup?.id || '');
  const [assignedToId, setAssignedToId] = useState(change.assignedToId || change.assignedTo?.id || '');

  const [newWorkNote, setNewWorkNote] = useState('');
  const addWorkNote = useAddChangeWorkNote(change?.id || '');

  // Approval Modals
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');

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
    setAssignmentGroupId(change.assignmentGroupId || change.assignmentGroup?.id || '');
    setAssignedToId(change.assignedToId || change.assignedTo?.id || '');
  }, [change.id, change.updatedAt]);

  const changeOrganizationId = change.organizationId || change.organization?.id || '';
  const { data: teamsData } = useQuery({
    queryKey: ['teams', 'change-assignment', changeOrganizationId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200', is_active: 'true' });
      if (changeOrganizationId) params.set('organization', changeOrganizationId);
      const { data } = await api.get(`/teams/?${params}`);
      return data;
    },
    enabled: canAssign,
    staleTime: 60000,
  });
  const assignmentTeams = orderedAssignmentTeams(extractAssignmentList(teamsData) as AssignmentRosterTeam[]);
  const assignableUsers = assignableUsersForTeam(assignmentTeams, assignmentGroupId, change.assignedTo);

  const stateOptions = Object.keys(CHANGE_STATE_LABELS);
  const approvals = Array.isArray(change.approvals) ? change.approvals : [];
  const affectedCis = Array.isArray(change.affectedCIs || change.affectedCis) ? (change.affectedCIs || change.affectedCis) : [];
  const linkedIncidents = Array.isArray(change.linkedIncidents) ? change.linkedIncidents : [];
  const workNotes = Array.isArray(change.workNotes) ? change.workNotes : [];
  const activities = Array.isArray(change.activities) ? change.activities : [];

  // Check if current user is an approver with PENDING state
  const isPendingApprover = approvals.some((a: any) => 
    (a.approver?.id === user?.id || a.user?.id === user?.id) && a.state === 'PENDING'
  );

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
    if ((assignmentGroupId || '') !== (change.assignmentGroupId || change.assignmentGroup?.id || '')) data.assignmentGroupId = assignmentGroupId || null;
    if ((assignedToId || '') !== (change.assignedToId || change.assignedTo?.id || '')) data.assignedToId = assignedToId || null;

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

  const confirmApprove = () => {
    if (onApprove) onApprove(approvalComments);
    setShowApprovalModal(false);
    setApprovalComments('');
  };

  const confirmReject = () => {
    if (onReject) onReject(approvalComments);
    setShowRejectModal(false);
    setApprovalComments('');
  };

  const stateTone = state === 'CLOSED' ? 'success' : state === 'CANCELLED' ? 'neutral' : state === 'APPROVAL' ? 'warn' : 'progress';
  const riskTone = risk === 'HIGH' ? 'critical' : risk === 'MEDIUM' ? 'warn' : 'success';

  return (
    <SNPage className="overflow-hidden rounded-md border shadow-sm" style={{ borderColor: sn.border }}>
      <SNRecordHeader
        number={change.number}
        titleNumber={change.number}
        priorityPill={<SNPillBadge label={riskLabel(risk)} tone={riskTone} dot={risk === 'HIGH'} />}
        statePill={<SNPillBadge label={(CHANGE_STATE_LABELS[state] || state).toUpperCase()} tone={stateTone} icon={stateTone === 'progress' ? Loader2 : undefined} />}
        extraBadges={<SNPillBadge label={type} tone={type === 'EMERGENCY' ? 'critical' : 'info'} />}
        onClone={canModify ? handleClone : undefined}
        onLink={() => {
          navigator.clipboard.writeText(window.location.href);
          toast.success('Change link copied');
        }}
        onPrint={() => window.print()}
        onUpdate={canModify ? handleUpdate : undefined}
        updateLoading={Boolean(updateChange.isPending)}
        secondaryActions={
          <div className="flex items-center gap-2">
            {canModify && change.state === 'APPROVAL' && isPendingApprover && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={approveLoading}
                  className="sn-soft-button flex items-center gap-1"
                  style={{ borderColor: sn.critical, color: sn.critical }}
                >
                  <XCircle size={14} />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(true)}
                  disabled={approveLoading}
                  className="sn-soft-button flex items-center gap-1"
                  style={{ borderColor: '#067647', color: '#067647' }}
                >
                  <CheckCircle size={14} />
                  Approve
                </button>
              </>
            )}
          </div>
        }
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
            {canModify ? (
              <select className="sn-field" value={type} onChange={(event) => setType(event.target.value)}>
                {CHANGE_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            ) : (
              <SNReadOnly>{type || '-'}</SNReadOnly>
            )}
          </SNFormRow>

          <SNFormRow label="State">
            {canModify ? (
              <select className="sn-field" value={state} onChange={(event) => setState(event.target.value)}>
                {stateOptions.map((value) => <option key={value} value={value}>{CHANGE_STATE_LABELS[value] || value}</option>)}
              </select>
            ) : (
              <SNReadOnly>{CHANGE_STATE_LABELS[state] || state || '-'}</SNReadOnly>
            )}
          </SNFormRow>
          <SNFormRow label="Risk">
            {canModify ? (
              <select className="sn-field" value={risk} onChange={(event) => setRisk(event.target.value)}>
                {RISK_LEVELS.map((value) => <option key={value} value={value}>{riskLabel(value)}</option>)}
              </select>
            ) : (
              <SNReadOnly>{riskLabel(risk)}</SNReadOnly>
            )}
          </SNFormRow>

          <SNFormRow label="Category">
            {canModify ? (
              <select className="sn-field" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">-</option>
                {CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            ) : (
              <SNReadOnly>{category || '-'}</SNReadOnly>
            )}
          </SNFormRow>
          <SNFormRow label="Assignment group">
            {canAssign ? (
              <select
                className="sn-field"
                value={assignmentGroupId}
                onChange={(event) => {
                  setAssignmentGroupId(event.target.value);
                  setAssignedToId('');
                }}
              >
                <option value="">-- None --</option>
                {assignmentTeams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            ) : (
              <SNReadOnly>{formatPersonName(change.assignmentGroup)}</SNReadOnly>
            )}
          </SNFormRow>

          <SNFormRow label="Performed by">
            {canAssign ? (
              <select
                className="sn-field"
                value={assignedToId}
                onChange={(event) => setAssignedToId(event.target.value)}
                disabled={!assignmentGroupId}
              >
                <option value="">-- None --</option>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id} disabled={Boolean(user.disabled)}>{formatPersonName(user)}</option>
                ))}
              </select>
            ) : (
              <SNReadOnly>{formatPersonName(change.assignedTo)}</SNReadOnly>
            )}
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
            {canModify ? (
              <input className="sn-field" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} />
            ) : (
              <SNReadOnly>{shortDescription || '-'}</SNReadOnly>
            )}
          </SNFormRow>
          <SNFormRow label="Description" fullWidth>
            {canModify ? (
              <textarea className="sn-field" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            ) : (
              <SNReadOnly muted>{description || '-'}</SNReadOnly>
            )}
          </SNFormRow>
          <SNFormRow label="Justification" fullWidth>
            {canModify ? (
              <textarea className="sn-field" rows={2} value={justification} onChange={(event) => setJustification(event.target.value)} />
            ) : (
              <SNReadOnly muted>{justification || '-'}</SNReadOnly>
            )}
          </SNFormRow>
        </SNFieldGrid>
      </SNCollapsibleSection>

      <SNCollapsibleSection title="Planning">
        <SNFieldGrid>
          <SNFormRow label="Implementation plan" fullWidth>
            {canModify ? (
              <textarea className="sn-field" rows={4} value={implementationPlan} onChange={(event) => setImplementationPlan(event.target.value)} />
            ) : (
              <SNReadOnly muted>{implementationPlan || '-'}</SNReadOnly>
            )}
          </SNFormRow>
          <SNFormRow label="Backout plan" fullWidth>
            {canModify ? (
              <textarea className="sn-field" rows={4} value={rollbackPlan} onChange={(event) => setRollbackPlan(event.target.value)} />
            ) : (
              <SNReadOnly muted>{rollbackPlan || '-'}</SNReadOnly>
            )}
          </SNFormRow>
          <SNFormRow label="Test plan" fullWidth>
            {canModify ? (
              <textarea className="sn-field" rows={4} value={testPlan} onChange={(event) => setTestPlan(event.target.value)} />
            ) : (
              <SNReadOnly muted>{testPlan || '-'}</SNReadOnly>
            )}
          </SNFormRow>
          <SNFormRow label="Review notes" fullWidth>
            {canModify ? (
              <textarea className="sn-field" rows={2} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} />
            ) : (
              <SNReadOnly muted>{reviewNotes || '-'}</SNReadOnly>
            )}
          </SNFormRow>
          <SNFormRow label="Closure code">
            {canModify ? (
              <select className="sn-field" value={closureCode} onChange={(event) => setClosureCode(event.target.value)}>
                <option value="">-</option>
                <option value="SUCCESSFUL">Successful</option>
                <option value="FAILED">Failed</option>
                <option value="PARTIAL">Partial</option>
              </select>
            ) : (
              <SNReadOnly>{closureCode || '-'}</SNReadOnly>
            )}
          </SNFormRow>
        </SNFieldGrid>
      </SNCollapsibleSection>

      {/* Change Approvers Quorum Panel */}
      <div className="px-1 pb-6 mt-4">
        <SNRelatedList title={`Approvers Quorum (${approvals.length})`} count={approvals.length}>
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-slate-600" />
              <span className="font-semibold text-slate-800">Approval Policy:</span>
              <span className="text-sm text-slate-600">All assigned approvers must approve before transition to SCHEDULED. Any rejection cancels the Change.</span>
            </div>
            {change.type === 'EMERGENCY' && (
              <div className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1 bg-red-50 p-2 rounded border border-red-100">
                <ShieldAlert size={16} /> Emergency Change — Standard approval policy is bypassed.
              </div>
            )}
          </div>
          {approvals.length === 0 ? (
            <SNEmptyRelatedList message="No approval records generated for this Change." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white">
              {approvals.map((approval: any, index: number) => {
                const isPending = approval.state === 'PENDING';
                const isApproved = approval.state === 'APPROVED';
                const isRejected = approval.state === 'REJECTED';
                
                return (
                  <div key={approval.id || index} className={`p-4 rounded-lg border flex flex-col gap-3 ${
                    isApproved ? 'bg-green-50 border-green-200' : 
                    isRejected ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        isApproved ? 'bg-green-100 text-green-700' : 
                        isRejected ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isApproved ? <CheckCircle size={20} /> : isRejected ? <XCircle size={20} /> : <Clock size={20} />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{formatPersonName(approval.approver || approval.user)}</div>
                        <div className={`text-xs font-bold uppercase tracking-wide ${
                          isApproved ? 'text-green-700' : isRejected ? 'text-red-700' : 'text-slate-500'
                        }`}>
                          {approval.state || 'PENDING'}
                        </div>
                      </div>
                    </div>
                    {approval.comments && (
                      <div className="text-sm text-slate-700 italic border-t pt-2 border-slate-200/50">
                        "{approval.comments}"
                      </div>
                    )}
                    {approval.approvedAt && (
                      <div className="text-xs text-slate-500 text-right mt-auto">
                        {formatDateTime(approval.approvedAt)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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

        <SNRelatedList title="Activity and Work Notes" count={workNotes.length + activities.length}>
          {canModify && (
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

      {/* Approve Modal */}
      <SNModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="Approve Change Request"
        footer={
          <>
            <button className="sn-soft-button" onClick={() => setShowApprovalModal(false)}>Cancel</button>
            <button
              className="sn-primary-button"
              style={{ background: '#067647', borderColor: '#067647' }}
              onClick={confirmApprove}
            >
              Confirm Approval
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">You are approving this Change. It will progress to SCHEDULED if all required approvers grant approval.</p>
          <div>
            <SNLabel>Approval Comments (Optional)</SNLabel>
            <textarea
              className="sn-field"
              rows={3}
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              placeholder="Add your approval notes..."
            />
          </div>
        </div>
      </SNModal>

      {/* Reject Modal */}
      <SNModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Change Request"
        footer={
          <>
            <button className="sn-soft-button" onClick={() => setShowRejectModal(false)}>Cancel</button>
            <button
              className="sn-primary-button"
              style={{ background: sn.critical, borderColor: sn.critical }}
              onClick={confirmReject}
            >
              Reject Change
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md flex gap-2">
            <ShieldAlert className="shrink-0 text-red-600" size={18} />
            <p>Rejecting will immediately transition this Change to <strong>CANCELLED</strong> state.</p>
          </div>
          <div>
            <SNLabel required>Rejection Reason</SNLabel>
            <textarea
              className="sn-field"
              rows={3}
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              placeholder="Why is this change being rejected? (Required)"
            />
          </div>
        </div>
      </SNModal>
    </SNPage>
  );
}
