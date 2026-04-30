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
  onOpenResolve,
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
  onOpenResolve: () => void;
}) {
  const navigate = useNavigate();
  const [shortDescription, setShortDescription] = useState(incident.shortDescription || '');
  const [description, setDescription] = useState(incident.description || '');
  const [impact, setImpact] = useState(incident.impact);
  const [urgency, setUrgency] = useState(incident.urgency);
  const [category, setCategory] = useState(incident.category || '');
  const [subcategory, setSubcategory] = useState(incident.subcategory || '');
  const [stateSel, setStateSel] = useState<IncidentState>(state);

  useEffect(() => {
    setShortDescription(incident.shortDescription || '');
    setDescription(incident.description || '');
    setImpact(incident.impact);
    setUrgency(incident.urgency);
    setCategory(incident.category || '');
    setSubcategory(incident.subcategory || '');
    setStateSel(state);
  }, [incident.id, incident.updatedAt, state]);

  const stateDropdownOptions = (() => {
    const opts: { value: IncidentState; label: string }[] = [];
    const add = (v: IncidentState) => {
      if (opts.some((o) => o.value === v)) return;
      opts.push({ value: v, label: STATE_LABEL[v] || String(v).replace(/_/g, ' ') });
    };
    add(state);
    (incTransitions as IncidentState[]).forEach(add);
    return opts;
  })();

  async function handleUpdate() {
    if (stateSel === 'RESOLVED' && state !== 'RESOLVED') {
      onOpenResolve();
      return;
    }

    const data: Record<string, unknown> = {};
    if (shortDescription.trim() !== incident.shortDescription) data.shortDescription = shortDescription.trim();
    if ((description || '') !== (incident.description || '')) data.description = description || null;
    if (impact !== incident.impact) data.impact = impact;
    if (urgency !== incident.urgency) data.urgency = urgency;
    if (category !== (incident.category || '')) data.category = category || null;
    if (subcategory !== (incident.subcategory || '')) data.subcategory = subcategory || null;
    if (stateSel !== state) data.state = stateSel;

    if (Object.keys(data).length === 0) {
      toast('No changes to save');
      return;
    }

    try {
      await updateIncident.mutateAsync({ id: incidentId, data });
      toast.success('Record updated');
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message || 'Update failed');
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
      />

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
                  <option key={o.value} value={o.value}>
                    {o.label}
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
            <SNFormRow label="Description" fullWidth>
              <textarea
                className="sn-field leading-relaxed"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </SNFormRow>
          </SNFieldGrid>
        </SNCollapsibleSection>
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
