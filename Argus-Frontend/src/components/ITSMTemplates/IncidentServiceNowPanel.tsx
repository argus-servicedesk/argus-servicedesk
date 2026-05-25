/**
 * ServiceNow-style incident record form.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SNPage, SNRecordHeader, SNCollapsibleSection, SNFieldGrid, SNFormRow, SNPillBadge, SNReadOnly, SNProcessRibbon, SNRelatedList, SNEmptyRelatedList, sn, SNModal, SNLabel } from './ServiceNowUI';
import { Upload, AlertCircle, CheckCircle2, ArrowUpCircle, XCircle, TrendingUp, Link2, Users, BarChart3, CheckSquare, Square } from 'lucide-react';
import api from '../../lib/api';
import { useResolveIncident, useReopenIncident, useCloseIncident, useEscalateIncident, usePromoteIncidentToProblem, useChildBulkOperations, useAddWorkNote } from '../../hooks/useIncidents';
import { useAuth } from '../../hooks/useAuth';
import type { Incident, Priority } from '../../types';
import IncidentBreadcrumb from '../Incidents/IncidentBreadcrumb';
import {
  assignableUsersForTeam,
  assignmentPersonLabel,
  extractAssignmentList,
  orderedAssignmentTeams,
  type AssignmentRosterTeam,
} from '../../utils/assignmentRoster';

type IncidentState = Incident['state'];

const IMPACT_SN: Record<string, string> = {
  ENTERPRISE: '1 - High',
  DEPARTMENT: '2 - Medium',
  TEAM: '3 - Low',
  INDIVIDUAL: '4 - Minor',
};

const URGENCY_SN: Record<string, string> = {
  CRITICAL: '1 - High',
  HIGH: '1 - High',
  MEDIUM: '2 - Medium',
  LOW: '3 - Low',
};

const PRIORITY_SN: Record<Priority, string> = {
  P1: '1 - Critical',
  P2: '2 - High',
  P3: '3 - Moderate',
  P4: '4 - Low',
};

const STATE_LABEL: Record<string, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const CONTACT_TYPES = ['Alert', 'Email', 'Phone', 'Chat', 'API', 'Self-service'];
const HOLD_REASONS = [
  { value: 'AWAITING_USER', label: 'Awaiting User' },
  { value: 'AWAITING_VENDOR', label: 'Awaiting Vendor' },
  { value: 'AWAITING_CHANGE_WINDOW', label: 'Awaiting Change Window' },
  { value: 'AWAITING_DEPENDENCY', label: 'Awaiting Dependency' },
  { value: 'MONITORING', label: 'Monitoring' },
  { value: 'OTHER', label: 'Other' },
];
const RESOLUTION_CODES = [
  { value: 'WORKAROUND_APPLIED', label: 'Workaround Applied' },
  { value: 'PERMANENT_FIX', label: 'Permanent Fix' },
  { value: 'CONFIG_CHANGE', label: 'Configuration Change' },
  { value: 'SERVICE_RESTART', label: 'Service Restart' },
  { value: 'DUPLICATE_INCIDENT', label: 'Duplicate Incident' },
  { value: 'USER_ERROR', label: 'User Error' },
  { value: 'NO_ISSUE_FOUND', label: 'No Issue Found' },
  { value: 'VENDOR_FIX', label: 'Vendor Fix' },
];

const SUBCAT_SUGGESTIONS = [
  'PostgreSQL',
  'MySQL',
  'Oracle',
  'SQL Server',
  'MongoDB',
  'Redis',
];

function formatOpened(iso: string): string {
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

function contactTypeFromSource(source?: string): string {
  switch (source) {
    case 'PROMETHEUS':
    case 'GRAFANA':
      return 'Alert';
    case 'EMAIL':
      return 'Email';
    case 'VOICE':
      return 'Phone';
    case 'SLACK':
      return 'Chat';
    case 'API':
      return 'API';
    default:
      return 'Self-service';
  }
}

function callerLabel(inc: Incident): ReactNode {
  if (inc.source === 'PROMETHEUS' || inc.source === 'GRAFANA') {
    return (
      <span style={{ color: sn.link }} className="font-bold">
        Monitoring System
      </span>
    );
  }
  if (inc.createdBy) {
    const cr = inc.createdBy as { firstName?: string; lastName?: string };
    const nm = `${cr.firstName || ''} ${cr.lastName || ''}`.trim();
    return <span style={{ color: sn.link }}>{nm || 'Caller'}</span>;
  }
  return <span>System</span>;
}

function formatPersonName(value: unknown): string {
  const label = assignmentPersonLabel(value);
  return label === 'Unassigned' ? '-' : label;
}

export default function IncidentServiceNowPanel({
  incident,
  incidentId,
  priority,
  state,
  slaSection,
  categories,
  submitting,
  cleanTitle,
  stateMetaLabel,
  incTransitions,
  updateIncident,
  onOpenLinkProblem,
}: {
  incident: Incident;
  incidentId: string;
  priority: Priority;
  state: IncidentState;
  slaSection: ReactNode;
  categories: string[];
  submitting: boolean;
  cleanTitle: (s: string) => string;
  stateMetaLabel: string;
  incTransitions: string[];
  updateIncident: {
    mutateAsync: (args: { id: string; data: Record<string, unknown> }) => Promise<unknown>;
    isPending?: boolean;
  };
  onOpenLinkProblem: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isManager, isAdmin, isClient } = useAuth();
  const canEditIncident = !isClient && (isManager || isAdmin || Boolean(incident.canEdit));
  const canResolve = canEditIncident;
  const canClose = isManager || isAdmin;
  const canEscalate = canEditIncident;
  const canPromote = canEditIncident;
  const canAssign = !isClient && (isManager || isAdmin);
  const canReopen = canResolve || isClient;

  const resolveIncident = useResolveIncident();
  const reopenIncident = useReopenIncident();
  const closeIncident = useCloseIncident();
  const escalateIncident = useEscalateIncident();
  const promoteToProb = usePromoteIncidentToProblem();
  const childBulkOps = useChildBulkOperations();
  const addWorkNote = useAddWorkNote(incidentId);
  const [shortDescription, setShortDescription] = useState(incident.shortDescription || '');
  const [description, setDescription] = useState(incident.description || '');
  const [impact, setImpact] = useState(incident.impact);
  const [urgency, setUrgency] = useState(incident.urgency);
  const [category, setCategory] = useState(incident.category || '');
  const [subcategory, setSubcategory] = useState(incident.subcategory || '');
  const [stateSel, setStateSel] = useState<IncidentState>(state);
  const [holdReason, setHoldReason] = useState((incident as any).holdReason || '');
  const [resolutionCode, setResolutionCode] = useState(incident.resolutionCode || '');
  const [resolutionNotes, setResolutionNotes] = useState(incident.resolutionNotes || '');
  const [escalationReason, setEscalationReason] = useState('');
  const [newWorkNote, setNewWorkNote] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [promoteConfirm, setPromoteConfirm] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'resolve' | 'close' | 'update'>('resolve');
  const [bulkResolutionCode, setBulkResolutionCode] = useState('');
  const [bulkResolutionNotes, setBulkResolutionNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [assignmentGroupId, setAssignmentGroupId] = useState(incident.assignmentGroupId || incident.assignmentGroup?.id || '');
  const [assignedToId, setAssignedToId] = useState(incident.assignedToId || incident.assignedTo?.id || '');
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const incidentOrganizationId = (incident as any).organizationId || (incident as any).organization?.id || '';
  const teamsQuery = useQuery({
    queryKey: ['assignment-teams', incidentOrganizationId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200', is_active: 'true' });
      if (incidentOrganizationId) params.set('organization', incidentOrganizationId);
      const { data } = await api.get(`/teams/?${params}`);
      return extractAssignmentList(data) as AssignmentRosterTeam[];
    },
    enabled: canAssign,
    staleTime: 60000,
  });

  useEffect(() => {
    setShortDescription(incident.shortDescription || '');
    setDescription(incident.description || '');
    setImpact(incident.impact);
    setUrgency(incident.urgency);
    setCategory(incident.category || '');
    setSubcategory(incident.subcategory || '');
    setStateSel(state);
    setHoldReason((incident as any).holdReason || '');
    setResolutionCode(incident.resolutionCode || '');
    setResolutionNotes(incident.resolutionNotes || '');
    setAssignmentGroupId(incident.assignmentGroupId || incident.assignmentGroup?.id || '');
    setAssignedToId(incident.assignedToId || incident.assignedTo?.id || '');
  }, [incident.id, incident.updatedAt, state]);

  const assignmentTeams = orderedAssignmentTeams(teamsQuery.data ?? []);
  const assignableUsers = assignableUsersForTeam(assignmentTeams, assignmentGroupId, incident.assignedTo as any);

  const isAssignmentChanged =
    assignmentGroupId !== (incident.assignmentGroupId || incident.assignmentGroup?.id || '')
    || assignedToId !== (incident.assignedToId || incident.assignedTo?.id || '');

  const stateDropdownOptions = Object.keys(STATE_LABEL).map((value) => ({
    value: value as IncidentState,
    label: STATE_LABEL[value] || String(value).replace(/_/g, ' '),
    isTransition: (incTransitions as string[]).includes(value)
  }));

  async function handleUpdate() {
    const data: Record<string, unknown> = {};
    if (shortDescription.trim() !== incident.shortDescription) data.shortDescription = shortDescription.trim();
    if ((description || '') !== (incident.description || '')) data.description = description || null;
    if (impact !== incident.impact) data.impact = impact;
    if (urgency !== incident.urgency) data.urgency = urgency;
    if (category !== (incident.category || '')) data.category = category || null;
    if (subcategory !== (incident.subcategory || '')) data.subcategory = subcategory || null;
    if (stateSel !== state) data.state = stateSel;
    if (holdReason !== (((incident as any).holdReason as string) || '')) data.holdReason = holdReason || null;
    if (resolutionCode !== (incident.resolutionCode || '')) data.resolutionCode = resolutionCode || null;
    if (resolutionNotes !== (incident.resolutionNotes || '')) data.resolutionNotes = resolutionNotes || null;

    if (stateSel === 'ON_HOLD' && !holdReason.trim()) {
      toast.error('Hold reason is required for On Hold');
      return;
    }
    if ((stateSel === 'RESOLVED' || stateSel === 'CLOSED') && !resolutionCode.trim()) {
      toast.error('Resolution code is required');
      return;
    }
    if ((stateSel === 'RESOLVED' || stateSel === 'CLOSED') && !resolutionNotes.trim()) {
      toast.error('Resolution notes are required');
      return;
    }

    if (Object.keys(data).length === 0) {
      toast('No changes to save');
      return;
    }

    try {
      await updateIncident.mutateAsync({ id: incidentId, data });
      toast.success('Record updated');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; code?: string; details?: any } }; message?: string };
      const errorMessage = err?.response?.data?.error || err?.message || 'Update failed';
      
      // Show specific error for invalid state transitions
      if (err?.response?.data?.code === 'INVALID_STATE_TRANSITION' || errorMessage.includes('Cannot transition')) {
        toast.error(`Invalid state transition: ${errorMessage}`);
      } else {
        toast.error(errorMessage);
      }
    }
  }

  async function handleAssignmentUpdate() {
    if (!isAssignmentChanged) {
      toast('No assignment changes to save');
      return;
    }

    setAssignmentSaving(true);
    try {
      await api.post(`/incidents/${incidentId}/reassign/`, {
        assignment_group: assignmentGroupId || undefined,
        assigned_to: assignedToId || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Assignment updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Assignment update failed');
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function handleAddWorkNote() {
    const content = newWorkNote.trim();
    if (!content) {
      toast.error('Notes are required');
      return;
    }

    try {
      await addWorkNote.mutateAsync({ content, isInternal: !isClient });
      setNewWorkNote('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  }

  function handleClone() {
    navigate('/incidents/create', {
      state: {
        clone: {
          shortDescription: `Copy of ${incident.number}: ${incident.shortDescription}`,
          description: incident.description || '',
          impact: incident.impact,
          urgency: incident.urgency,
          category: incident.category || '',
          source: incident.source === 'PROMETHEUS' || incident.source === 'GRAFANA' ? 'MANUAL' : incident.source,
        },
      },
    });
  }

  async function handleResolve() {
    if (!resolutionCode || !resolutionNotes.trim()) {
      toast.error('Resolution code and notes are required');
      return;
    }
    try {
      await resolveIncident.mutateAsync({ id: incidentId, resolutionCode, resolutionNotes });
      toast.success('Incident Resolved ✓');
      setShowResolutionModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Resolution failed');
    }
  }

  async function handleEscalate() {
    try {
      await escalateIncident.mutateAsync({ id: incidentId, reason: escalationReason || 'Manual escalation' });
      toast.success('Incident Escalated ↑');
      setShowEscalationModal(false);
      setEscalationReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Escalation failed');
    }
  }

  async function handleReopen() {
    try {
      await reopenIncident.mutateAsync({ id: incidentId, reason: reopenReason || 'Reopened by user' });
      toast.success('Incident Reopened');
      setShowReopenModal(false);
      setReopenReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Reopen failed');
    }
  }

  async function handleClose() {
    try {
      await closeIncident.mutateAsync({ id: incidentId });
      toast.success('Incident Closed ✓');
      setShowCloseModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Close failed');
    }
  }

  async function handlePromoteToProb() {
    try {
      const result = await promoteToProb.mutateAsync({ id: incidentId });
      toast.success(`Promoted to Problem ${result?.data?.number || ''}`);
      setPromoteConfirm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Promotion failed');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/incidents/${incidentId}/attachments/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('File uploaded');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleBulkOperation() {
    if (selectedChildren.length === 0) {
      toast.error('Please select at least one child incident');
      return;
    }

    if (bulkAction === 'resolve' && (!bulkResolutionCode || !bulkResolutionNotes.trim())) {
      toast.error('Resolution code and notes are required');
      return;
    }

    try {
      const updates = bulkAction === 'resolve' ? {
        resolution_code: bulkResolutionCode,
        resolution_notes: bulkResolutionNotes,
      } : {};

      await childBulkOps.mutateAsync({
        parentId: incidentId,
        action: bulkAction,
        childIds: selectedChildren,
        updates,
      });

      toast.success(`Bulk ${bulkAction} completed for ${selectedChildren.length} child incidents`);
      setShowBulkModal(false);
      setSelectedChildren([]);
      setBulkResolutionCode('');
      setBulkResolutionNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || `Bulk ${bulkAction} failed`);
    }
  }

  function toggleChildSelection(childId: string) {
    setSelectedChildren(prev => 
      prev.includes(childId) 
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  }

  function selectAllChildren() {
    const allChildIds = incident.childIncidents?.map(child => child.id) || [];
    setSelectedChildren(allChildIds);
  }

  function clearChildSelection() {
    setSelectedChildren([]);
  }

  function ChildStatusSummary({ summary }: { summary: any }) {
    if (!summary || summary.total === 0) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={16} className="text-blue-600" />
          <span className="font-medium text-blue-900">Child Incidents Summary</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg text-blue-600">{summary.total}</div>
            <div className="text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-green-600">{summary.resolved + summary.closed}</div>
            <div className="text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-orange-600">{summary.new + summary.inProgress + summary.escalated}</div>
            <div className="text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-blue-600">{summary.completionPercentage}%</div>
            <div className="text-gray-600">Complete</div>
          </div>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${summary.completionPercentage}%` }}
          />
        </div>
      </div>
    );
  }

  const priorityBadge = priority === 'P1' ? (
    <SNPillBadge label={PRIORITY_SN.P1} tone="critical" dot />
  ) : priority === 'P2' ? (
    <SNPillBadge label={PRIORITY_SN.P2} tone="warn" dot />
  ) : (
    <SNPillBadge label={PRIORITY_SN[priority]} tone="neutral" dot />
  );

  const stateBadge =
    state === 'IN_PROGRESS' || state === 'ESCALATED' ? (
      <SNPillBadge label={stateMetaLabel.toUpperCase()} tone="progress" icon={Loader2} />
    ) : state === 'NEW' ? (
      <SNPillBadge label={stateMetaLabel.toUpperCase()} tone="warn" />
    ) : state === 'RESOLVED' || state === 'CLOSED' ? (
      <SNPillBadge label={stateMetaLabel.toUpperCase()} tone="success" />
    ) : (
      <SNPillBadge label={stateMetaLabel.toUpperCase()} tone="neutral" />
    );

  const saving = Boolean(submitting || updateIncident.isPending);
  const workNotes = Array.isArray((incident as any).workNotes) ? (incident as any).workNotes : [];
  const activities = Array.isArray((incident as any).activities) ? (incident as any).activities : [];
  const linkedProblems = Array.isArray((incident as any).linkedProblems) ? (incident as any).linkedProblems : [];
  const linkedChanges = Array.isArray((incident as any).linkedChanges) ? (incident as any).linkedChanges : [];
  const relatedAlerts = Array.isArray((incident as any).relatedAlerts) ? (incident as any).relatedAlerts : [];

  return (
    <SNPage className="overflow-hidden rounded-md border shadow-sm" style={{ borderColor: sn.border }}>
      <IncidentBreadcrumb incident={incident} />
      
      <SNRecordHeader
        number={incident.number}
        titleNumber={incident.number}
        priorityPill={priorityBadge}
        statePill={stateBadge}
        onClone={canEditIncident ? handleClone : undefined}
        onLink={canEditIncident ? onOpenLinkProblem : undefined}
        onPrint={() => window.print()}
        onUpdate={canEditIncident ? handleUpdate : undefined}
        updateLoading={saving}
      secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Escalate — visible when incident is active */}
            {canEscalate && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(state) && (
              <button
                type="button"
                className="sn-soft-button flex items-center gap-1"
                onClick={() => setShowEscalationModal(true)}
                style={{ borderColor: sn.progress, color: sn.progress }}
              >
                <ArrowUpCircle size={12} /> Escalate
              </button>
            )}
            {/* Resolve — only when not already resolved/closed */}
            {canResolve && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(state) && (
              <button
                type="button"
                className="sn-soft-button flex items-center gap-1"
                onClick={() => setShowResolutionModal(true)}
                style={{ borderColor: '#067647', color: '#067647' }}
              >
                <CheckCircle2 size={12} /> Resolve
              </button>
            )}
            {/* Close — only when RESOLVED and manager+ */}
            {canClose && state === 'RESOLVED' && (
              <button
                type="button"
                className="sn-soft-button flex items-center gap-1"
                onClick={() => setShowCloseModal(true)}
                style={{ borderColor: '#344054', color: '#344054' }}
              >
                <XCircle size={12} /> Close
              </button>
            )}
            {/* Reopen — visible when resolved or closed */}
            {canReopen && ['RESOLVED', 'CLOSED'].includes(state) && (
              <button
                type="button"
                className="sn-soft-button flex items-center gap-1"
                onClick={() => setShowReopenModal(true)}
              >
                Reopen
              </button>
            )}
            {/* Promote to Problem — Engineer+ */}
            {canPromote && !['CANCELLED'].includes(state) && (
              <button
                type="button"
                className="sn-soft-button flex items-center gap-1"
                onClick={() => setPromoteConfirm(true)}
                style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
              >
                <TrendingUp size={12} /> Promote to Problem
              </button>
            )}
          </div>
        }
      />

      <SNProcessRibbon steps={['NEW', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']} current={state} />
      {slaSection}

      <div>
        <SNCollapsibleSection title="Incident details">
          <SNFieldGrid>
            <SNFormRow label="Number" required>
              <SNReadOnly>{incident.number}</SNReadOnly>
            </SNFormRow>
            <SNFormRow label="Opened">
              <SNReadOnly>{formatOpened(incident.createdAt)}</SNReadOnly>
            </SNFormRow>


            <SNFormRow label="Parent Incident">
              {(incident as any).parent ? (
                <button
                  type="button"
                  className="sn-list-link text-left"
                  onClick={() => navigate(`/incidents/${(incident as any).parent?.id}`)}
                >
                  {(incident as any).parent.number}
                </button>
              ) : (
                <SNReadOnly muted>None</SNReadOnly>
              )}
            </SNFormRow>
            <SNFormRow label="Caller" required>
              <SNReadOnly>{callerLabel(incident)}</SNReadOnly>
            </SNFormRow>
            <SNFormRow label="Category">
              <select className="sn-field" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canEditIncident}>
                <option value="">-</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </SNFormRow>

            <SNFormRow label="Subcategory">
              <select className="sn-field" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} disabled={!canEditIncident}>
                <option value="">-</option>
                {SUBCAT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </SNFormRow>
            <SNFormRow label="Contact Type">
              <select className="sn-field" value={contactTypeFromSource(incident.source)} onChange={() => undefined} disabled={!canEditIncident}>
                {CONTACT_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </SNFormRow>
            <SNFormRow label="Assignment group">
              <select
                className="sn-field"
                value={assignmentGroupId}
                onChange={(e) => {
                  setAssignmentGroupId(e.target.value);
                  setAssignedToId('');
                }}
                disabled={!canAssign || teamsQuery.isLoading}
              >
                <option value="">-- None --</option>
                {assignmentTeams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </SNFormRow>
            <SNFormRow label="Assigned to">
              <div className="flex gap-2">
                <select
                  className="sn-field"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  disabled={!canAssign || !assignmentGroupId}
                >
                  <option value="">-- None --</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id} disabled={Boolean(user.disabled)}>{assignmentPersonLabel(user)}</option>
                  ))}
                </select>
                {canAssign && (
                  <button
                    type="button"
                    className="sn-soft-button min-w-[86px]"
                    onClick={handleAssignmentUpdate}
                    disabled={!isAssignmentChanged || assignmentSaving}
                  >
                    {assignmentSaving ? <Loader2 size={14} className="animate-spin" /> : 'Assign'}
                  </button>
                )}
              </div>
            </SNFormRow>

            <SNFormRow label="State">
              <select className="sn-field" value={stateSel} onChange={(e) => setStateSel(e.target.value as IncidentState)} disabled={!canEditIncident}>
                {stateDropdownOptions.map((o) => (
                  <option 
                    key={o.value} 
                    value={o.value}
                    style={{ 
                      color: o.isTransition || o.value === state ? 'inherit' : '#999',
                      fontWeight: o.isTransition || o.value === state ? 'normal' : 'normal'
                    }}
                  >
                    {o.label} {!o.isTransition && o.value !== state ? '(Invalid)' : ''}
                  </option>
                ))}
              </select>
            </SNFormRow>
            <SNFormRow label="Hold reason">
              <select className="sn-field" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} disabled={!canEditIncident}>
                <option value="">-</option>
                {HOLD_REASONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </SNFormRow>
            <SNFormRow label="Impact">
              <select className="sn-field" value={impact} onChange={(e) => setImpact(e.target.value as Incident['impact'])} disabled={!canEditIncident}>
                {Object.entries(IMPACT_SN).map(([k, lab]) => (
                  <option key={k} value={k}>
                    {lab}
                  </option>
                ))}
              </select>
            </SNFormRow>

            <SNFormRow label="Urgency">
              <select className="sn-field" value={urgency} onChange={(e) => setUrgency(e.target.value as Incident['urgency'])} disabled={!canEditIncident}>
                {Object.entries(URGENCY_SN).map(([k, lab]) => (
                  <option key={k} value={k}>
                    {lab}
                  </option>
                ))}
              </select>
            </SNFormRow>
            <SNFormRow label="Priority">
              <SNReadOnly color={priority === 'P1' ? sn.critical : sn.text}>{PRIORITY_SN[priority]}</SNReadOnly>
            </SNFormRow>

            <SNFormRow label="Short Description" required fullWidth>
              <input
                className="sn-field"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                disabled={!canEditIncident}
              />
            </SNFormRow>
            <SNFormRow label="Resolution Code">
              <select className="sn-field" value={resolutionCode} onChange={(e) => setResolutionCode(e.target.value)} disabled={!canEditIncident}>
                <option value="">-</option>
                {RESOLUTION_CODES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </SNFormRow>
            <SNFormRow label="Description" fullWidth>
              <textarea
                className="sn-field leading-relaxed"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEditIncident}
              />
            </SNFormRow>
            <SNFormRow label="Notes" fullWidth>
              <div className="flex w-full flex-col gap-2">
                <textarea
                  className="sn-field leading-relaxed"
                  rows={4}
                  value={newWorkNote}
                  onChange={(e) => setNewWorkNote(e.target.value)}
                  placeholder="Add notes for this incident"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="sn-soft-button inline-flex items-center gap-2"
                    onClick={handleAddWorkNote}
                    disabled={!newWorkNote.trim() || addWorkNote.isPending}
                  >
                    {addWorkNote.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                    Add Note
                  </button>
                </div>
              </div>
            </SNFormRow>
            <SNFormRow label="Resolution Notes" fullWidth>
              <textarea
                className="sn-field leading-relaxed"
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                disabled={!canEditIncident}
              />
            </SNFormRow>
          </SNFieldGrid>
        </SNCollapsibleSection>
      </div>

      <div className="px-1 pb-6">
        <SNRelatedList 
          title="Attachments" 
          count={incident.attachments?.length || 0}
        >
          <div className="flex items-center justify-between p-3 border-b bg-slate-50">
             <span className="text-xs text-slate-500">Files attached to this incident</span>
             <label className="sn-soft-button flex items-center gap-1 cursor-pointer">
                <Upload size={12} />
                <span>Upload</span>
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
             </label>
          </div>
          {(!incident.attachments || incident.attachments.length === 0) ? (
            <SNEmptyRelatedList message="No attachments found." />
          ) : (
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Uploaded By</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {incident.attachments.map((at) => (
                  <tr key={at.id}>
                    <td>
                      <a href={`${api.defaults.baseURL}/media/${at.path}`} target="_blank" rel="noreferrer" className="sn-list-link">
                        {at.filename}
                      </a>
                    </td>
                    <td>{(at.size / 1024).toFixed(1)} KB</td>
                    <td>{formatPersonName(at.uploadedBy)}</td>
                    <td>{formatOpened(at.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SNRelatedList>

        <SNRelatedList title="Task SLAs" count={2}>
          <table className="sn-list-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Stage</th>
                <th>Business elapsed</th>
                <th>Business time left</th>
                <th>Breach</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Response</td>
                <td>{incident.responseTime ? 'Completed' : state === 'ON_HOLD' ? 'Paused' : 'In Progress'}</td>
                <td>{incident.responseTime || '-'}</td>
                <td>{incident.slaTargetResponse || '-'}</td>
                <td style={{ color: incident.slaBreached ? sn.critical : '#067647', fontWeight: 700 }}>{incident.slaBreached ? 'True' : 'False'}</td>
              </tr>
              <tr>
                <td>Resolution</td>
                <td>{incident.resolutionTime ? 'Completed' : state === 'ON_HOLD' ? 'Paused' : 'In Progress'}</td>
                <td>{incident.resolutionTime || '-'}</td>
                <td>{incident.slaTargetResolution || '-'}</td>
                <td style={{ color: incident.slaBreached ? sn.critical : '#067647', fontWeight: 700 }}>{incident.slaBreached ? 'True' : 'False'}</td>
              </tr>
            </tbody>
          </table>
        </SNRelatedList>

        <SNRelatedList title="Related Records" count={linkedProblems.length + linkedChanges.length + relatedAlerts.length}>
          {linkedProblems.length + linkedChanges.length + relatedAlerts.length === 0 ? (
            <SNEmptyRelatedList message="No related problems, changes, or alerts." />
          ) : (
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Number</th>
                  <th>Relationship</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {linkedProblems.map((item: any, index: number) => (
                  <tr key={`problem-${item.id || index}`}>
                    <td>Problem</td>
                    <td>{item.problem?.number || item.number || '-'}</td>
                    <td>{item.linkType || 'Related'}</td>
                    <td>{item.problem?.state || item.state || '-'}</td>
                  </tr>
                ))}
                {linkedChanges.map((item: any, index: number) => (
                  <tr key={`change-${item.id || index}`}>
                    <td>Change</td>
                    <td>{item.change?.number || item.number || '-'}</td>
                    <td>{item.linkType || 'Related'}</td>
                    <td>{item.change?.state || item.state || '-'}</td>
                  </tr>
                ))}
                {relatedAlerts.map((item: any, index: number) => (
                  <tr key={`alert-${item.id || index}`}>
                    <td>Alert</td>
                    <td>{item.alertName || item.name || item.id || '-'}</td>
                    <td>Source event</td>
                    <td>{item.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SNRelatedList>

        <SNRelatedList title="Child Incidents" count={incident.childIncidents?.length || 0}>
          <ChildStatusSummary summary={incident.childStatusSummary} />
          
          <div className="flex items-center justify-between p-3 border-b bg-slate-50">
             <span className="text-xs text-slate-500">Sub-incidents linked to this parent</span>
             <div className="flex items-center gap-2">
               {canEditIncident && incident.childIncidents && incident.childIncidents.length > 0 && (
                 <button 
                   type="button"
                   className="sn-soft-button flex items-center gap-1"
                   onClick={() => setShowBulkModal(true)}
                   disabled={selectedChildren.length === 0}
                 >
                   <Users size={12} />
                   <span>Bulk Actions ({selectedChildren.length})</span>
                 </button>
               )}
               {canEditIncident && (
                 <button 
                   type="button"
                   className="sn-soft-button flex items-center gap-1"
                   onClick={() => navigate('/incidents/create', { 
                     state: { 
                       clone: { 
                         shortDescription: `Child of ${incident.number}: ${incident.shortDescription}`,
                         category: incident.category,
                         impact: incident.impact,
                         urgency: incident.urgency,
                         parentId: incident.id
                       } 
                     } 
                   })}
                 >
                    <Link2 size={12} />
                    <span>Create Child Incident</span>
                 </button>
               )}
             </div>
          </div>
          {(!incident.childIncidents || incident.childIncidents.length === 0) ? (
            <SNEmptyRelatedList message="No child incidents found." />
          ) : (
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <button
                      type="button"
                      onClick={selectedChildren.length === incident.childIncidents.length ? clearChildSelection : selectAllChildren}
                      className="p-1"
                    >
                      {selectedChildren.length === incident.childIncidents.length ? (
                        <CheckSquare size={16} className="text-blue-600" />
                      ) : (
                        <Square size={16} className="text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th>Number</th>
                  <th>Priority</th>
                  <th>State</th>
                  <th>Short Description</th>
                </tr>
              </thead>
              <tbody>
                {incident.childIncidents.map((child) => (
                  <tr key={child.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleChildSelection(child.id)}
                        className="p-1"
                      >
                        {selectedChildren.includes(child.id) ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} className="text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td>
                      <button 
                        type="button"
                        className="sn-list-link" 
                        onClick={() => navigate(`/incidents/${child.id}`)}
                      >
                        {child.number}
                      </button>
                    </td>
                    <td>{child.priority}</td>
                    <td>{child.state}</td>
                    <td className="truncate max-w-xs">{child.shortDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SNRelatedList>

        <SNRelatedList title="Activity and Work Notes" count={workNotes.length + activities.length}>
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
                    <td>{formatOpened(note.createdAt || note.created_at || incident.updatedAt)}</td>
                    <td>{formatPersonName(note.createdBy || note.user || note.author)}</td>
                    <td>{note.content || note.note || '-'}</td>
                  </tr>
                ))}
                {activities.map((activity: any, index: number) => (
                  <tr key={`activity-${activity.id || index}`}>
                    <td>Activity</td>
                    <td>{formatOpened(activity.createdAt || activity.created_at || incident.updatedAt)}</td>
                    <td>{formatPersonName(activity.user || activity.createdBy)}</td>
                    <td>{activity.message || activity.description || activity.fieldName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SNRelatedList>
      </div>

      <div className="print-only hidden print:block mt-4 text-lg font-semibold">
        {cleanTitle(incident.shortDescription)}
      </div>

      <style>{`
        @media print {
          .print-only.hidden { display: block !important; }
        }
      `}</style>

      {/* Resolution Modal */}
      <SNModal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        title="Resolve Incident"
        footer={
          <>
            <button className="sn-soft-button" onClick={() => setShowResolutionModal(false)}>Cancel</button>
            <button
              className="sn-primary-button"
              onClick={handleResolve}
              disabled={resolveIncident.isPending}
            >
              {resolveIncident.isPending ? <><Loader2 size={14} className="animate-spin inline mr-1" />Resolving...</> : 'Resolve Incident'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <SNLabel required>Resolution Code</SNLabel>
            <select className="sn-field" value={resolutionCode} onChange={(e) => setResolutionCode(e.target.value)}>
              <option value="">- Select -</option>
              {RESOLUTION_CODES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <SNLabel required>Resolution Notes</SNLabel>
            <textarea
              className="sn-field"
              rows={4}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Explain how the incident was resolved..."
            />
          </div>
        </div>
      </SNModal>

      {/* Escalation Modal */}
      <SNModal
        isOpen={showEscalationModal}
        onClose={() => setShowEscalationModal(false)}
        title="Escalate Incident"
        footer={
          <>
            <button className="sn-soft-button" onClick={() => setShowEscalationModal(false)}>Cancel</button>
            <button
              className="sn-primary-button"
              style={{ background: sn.progress, borderColor: sn.progress }}
              onClick={handleEscalate}
              disabled={escalateIncident.isPending}
            >
              {escalateIncident.isPending ? <><Loader2 size={14} className="animate-spin inline mr-1" />Escalating...</> : 'Confirm Escalation'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
            <AlertCircle className="text-orange-600 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-orange-900">Escalation Warning</h4>
              <p className="text-sm text-orange-800 mt-1">
                Escalating will notify management, bump priority, and increment the escalation counter.
              </p>
            </div>
          </div>
          <div>
            <SNLabel>Reason (optional)</SNLabel>
            <textarea
              className="sn-field"
              rows={3}
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="Describe why this is being escalated..."
            />
          </div>
        </div>
      </SNModal>

      {/* Reopen Modal */}
      <SNModal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        title="Reopen Incident"
        footer={
          <>
            <button className="sn-soft-button" onClick={() => setShowReopenModal(false)}>Cancel</button>
            <button
              className="sn-primary-button"
              onClick={handleReopen}
              disabled={reopenIncident.isPending}
            >
              {reopenIncident.isPending ? <><Loader2 size={14} className="animate-spin inline mr-1" />Reopening...</> : 'Reopen Incident'}
            </button>
          </>
        }
      >
        <div>
          <SNLabel>Reason for reopening</SNLabel>
          <textarea
            className="sn-field"
            rows={3}
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="Why is this being reopened? (e.g. issue recurred)"
          />
        </div>
      </SNModal>

      {/* Close Modal */}
      <SNModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Close Incident"
        footer={
          <>
            <button className="sn-soft-button" onClick={() => setShowCloseModal(false)}>Cancel</button>
            <button
              className="sn-primary-button"
              style={{ background: '#344054', borderColor: '#344054' }}
              onClick={handleClose}
              disabled={closeIncident.isPending}
            >
              {closeIncident.isPending ? <><Loader2 size={14} className="animate-spin inline mr-1" />Closing...</> : 'Close Incident'}
            </button>
          </>
        }
      >
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
          <p className="text-sm text-slate-700">
            Closing this incident will permanently mark it as <strong>CLOSED</strong>.
            It can be reopened later if necessary. The incident must be <strong>RESOLVED</strong> before it can be closed.
          </p>
        </div>
      </SNModal>

      {/* Promote to Problem Confirmation */}
      <SNModal
        isOpen={promoteConfirm}
        onClose={() => setPromoteConfirm(false)}
        title="Promote to Problem"
        footer={
          <>
            <button className="sn-soft-button" onClick={() => setPromoteConfirm(false)}>Cancel</button>
            <button
              className="sn-primary-button"
              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
              onClick={handlePromoteToProb}
              disabled={promoteToProb.isPending}
            >
              {promoteToProb.isPending ? <><Loader2 size={14} className="animate-spin inline mr-1" />Promoting...</> : 'Create Problem Record'}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
          <TrendingUp className="text-purple-600 shrink-0" size={24} />
          <div>
            <h4 className="font-bold text-purple-900">Promote to Problem</h4>
            <p className="text-sm text-purple-800 mt-1">
              A new Problem record will be created with the same description and priority,
              and this incident will be linked to it as <strong>CAUSED_BY</strong>.
              Use this when the root cause needs deeper investigation.
            </p>
          </div>
        </div>
      </SNModal>

      {/* Bulk Operations Modal */}
      <SNModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Operations on Child Incidents"
        footer={
          <>
            <button className="sn-soft-button" onClick={() => setShowBulkModal(false)}>Cancel</button>
            <button
              className="sn-primary-button"
              onClick={handleBulkOperation}
              disabled={childBulkOps.isPending}
            >
              {childBulkOps.isPending ? (
                <><Loader2 size={14} className="animate-spin inline mr-1" />Processing...</>
              ) : (
                `${bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)} ${selectedChildren.length} Incidents`
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selected {selectedChildren.length} of {incident.childIncidents?.length} child incidents
          </p>
          
          <div>
            <SNLabel>Action</SNLabel>
            <select 
              className="sn-field" 
              value={bulkAction} 
              onChange={(e) => setBulkAction(e.target.value as 'resolve' | 'close' | 'update')}
            >
              <option value="resolve">Resolve All</option>
              <option value="close">Close All</option>
              <option value="update">Update All</option>
            </select>
          </div>

          {bulkAction === 'resolve' && (
            <>
              <div>
                <SNLabel>Resolution Code</SNLabel>
                <select 
                  className="sn-field" 
                  value={bulkResolutionCode} 
                  onChange={(e) => setBulkResolutionCode(e.target.value)}
                >
                  <option value="">Select resolution code</option>
                  {RESOLUTION_CODES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <SNLabel>Resolution Notes</SNLabel>
                <textarea
                  className="sn-field"
                  rows={3}
                  value={bulkResolutionNotes}
                  onChange={(e) => setBulkResolutionNotes(e.target.value)}
                  placeholder="Enter resolution notes for all selected incidents"
                />
              </div>
            </>
          )}
        </div>
      </SNModal>
    </SNPage>
  );
}

