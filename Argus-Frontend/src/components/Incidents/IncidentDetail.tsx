import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useIncident, useUpdateIncident } from '../../hooks/useIncidents';
import IncidentServiceNowPanel from '../ITSMTemplates/IncidentServiceNowPanel';
import { SNPage, sn } from '../ITSMTemplates/ServiceNowUI';
import type { Incident } from '../../types';

type IncidentState = Incident['state'];

const CATEGORIES = ['Hardware', 'Software', 'Network', 'Database', 'Security', 'Cloud', 'Kubernetes', 'Application', 'Infrastructure', 'Other'];

const STATE_LABEL: Record<string, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

function cleanTitle(value: string): string {
  return value.replace(/^\[(WARNING|CRITICAL|INFO|OK|UNKNOWN)\]\s*/i, '').trim();
}

function SlaBanner({ incident }: { incident: Incident }) {
  return (
    <div className="border-x px-8 py-3 text-sm font-bold" style={{ borderColor: sn.border, background: incident.slaBreached ? '#fff6f6' : '#f7f8fa', color: incident.slaBreached ? sn.critical : '#344054' }}>
      SLA: {incident.slaBreached ? 'Breached' : 'Active'} {incident.slaTargetResolution ? `| Resolution target ${incident.slaTargetResolution}` : ''}
    </div>
  );
}

export default function IncidentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useIncident(id);
  const updateIncident = useUpdateIncident();
  const incident = data?.data as Incident | undefined;

  const transitions = (incident as any)?.availableTransitions || [];

  if (isLoading) {
    return (
      <SNPage className="flex min-h-[360px] items-center justify-center gap-3" style={{ margin: '-24px', background: '#fff' }}>
        <Loader2 className="animate-spin" size={20} />
        Loading incident...
      </SNPage>
    );
  }

  if (isError || !incident) {
    return (
      <SNPage className="flex min-h-[360px] flex-col items-center justify-center gap-3" style={{ margin: '-24px', background: '#fff' }}>
        <div className="text-lg font-bold" style={{ color: sn.critical }}>Incident not found</div>
        <button type="button" className="sn-soft-button" onClick={() => navigate('/incidents')}>Back to Incidents</button>
      </SNPage>
    );
  }

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', padding: 24, background: sn.shellBg }}>
      <IncidentServiceNowPanel
        incident={incident}
        incidentId={id}
        priority={incident.priority}
        state={incident.state}
        slaSection={<SlaBanner incident={incident} />}
        categories={CATEGORIES}
        submitting={false}
        cleanTitle={cleanTitle}
        stateMetaLabel={STATE_LABEL[incident.state] ?? incident.state}
        incTransitions={transitions}
        updateIncident={updateIncident}
        onOpenLinkProblem={() => navigate('/problems/create', { state: { incidentId: id } })}
      />
    </SNPage>
  );
}
