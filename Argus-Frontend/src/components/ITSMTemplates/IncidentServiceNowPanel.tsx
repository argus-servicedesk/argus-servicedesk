/**
 * ServiceNow-style incident record form.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import {
  SNPage,
  SNRecordHeader,
  SNCollapsibleSection,
  SNFieldGrid,
  SNFormRow,
  SNPillBadge,
  SNReadOnly,
  SNProcessRibbon,
  SNRelatedList,
  SNEmptyRelatedList,
  sn,
} from './ServiceNowUI';
import type { Incident, Priority } from '../../types';

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
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { firstName?: string; lastName?: string; name?: string; email?: string };
    if (obj.firstName || obj.lastName) return [obj.firstName, obj.lastName].filter(Boolean).join(' ');
    return obj.name || obj.email || '-';
  }
  return '-';
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
  }, [incident.id, incident.updatedAt, state]);

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
      <SNRecordHeader
        number={incident.number}
        titleNumber={incident.number}
        priorityPill={priorityBadge}
        statePill={stateBadge}
        onClone={handleClone}
        onLink={onOpenLinkProblem}
        onPrint={() => window.print()}
        onUpdate={handleUpdate}
        updateLoading={saving}
        secondaryActions={state === 'RESOLVED' || state === 'CLOSED' ? (
          <button
            type="button"
            className="sn-soft-button"
            onClick={() => {
              setStateSel('IN_PROGRESS');
              toast('State set to In Progress. Click Update to confirm.');
            }}
          >
            Reopen
          </button>
        ) : undefined}
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

            <SNFormRow label="Caller" required>
              <SNReadOnly>{callerLabel(incident)}</SNReadOnly>
            </SNFormRow>
            <SNFormRow label="Category">
              <select className="sn-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">-</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </SNFormRow>

            <SNFormRow label="Subcategory">
              <select className="sn-field" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                <option value="">-</option>
                {SUBCAT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </SNFormRow>
            <SNFormRow label="Contact Type">
              <select className="sn-field" value={contactTypeFromSource(incident.source)} onChange={() => undefined}>
                {CONTACT_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </SNFormRow>

            <SNFormRow label="State">
              <select className="sn-field" value={stateSel} onChange={(e) => setStateSel(e.target.value as IncidentState)}>
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
              <select className="sn-field" value={holdReason} onChange={(e) => setHoldReason(e.target.value)}>
                <option value="">-</option>
                {HOLD_REASONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </SNFormRow>
            <SNFormRow label="Impact">
              <select className="sn-field" value={impact} onChange={(e) => setImpact(e.target.value as Incident['impact'])}>
                {Object.entries(IMPACT_SN).map(([k, lab]) => (
                  <option key={k} value={k}>
                    {lab}
                  </option>
                ))}
              </select>
            </SNFormRow>

            <SNFormRow label="Urgency">
              <select className="sn-field" value={urgency} onChange={(e) => setUrgency(e.target.value as Incident['urgency'])}>
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
              />
            </SNFormRow>
            <SNFormRow label="Resolution Code">
              <select className="sn-field" value={resolutionCode} onChange={(e) => setResolutionCode(e.target.value)}>
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
              />
            </SNFormRow>
            <SNFormRow label="Resolution Notes" fullWidth>
              <textarea
                className="sn-field leading-relaxed"
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </SNFormRow>
          </SNFieldGrid>
        </SNCollapsibleSection>
      </div>

      <div className="px-1 pb-6">
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
    </SNPage>
  );
}
