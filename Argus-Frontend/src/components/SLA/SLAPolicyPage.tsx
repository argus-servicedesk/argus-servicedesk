import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Save, X } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
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
  sn,
} from '../ITSMTemplates/ServiceNowUI';

interface SLARow {
  priority: string;
  total: number;
  met: number;
  compliance_pct: number;
}

interface SLADef {
  id?: string;
  priority: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
}

const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];

const PRIORITY_META: Record<string, {
  label: string;
  color: string;
  defaultResponse: number;
  defaultResolution: number;
  description: string;
}> = {
  P1: {
    label: 'Critical',
    color: '#d0272b',
    defaultResponse: 5,
    defaultResolution: 60,
    description: 'Major outage or business-critical impact',
  },
  P2: {
    label: 'High',
    color: '#b45309',
    defaultResponse: 15,
    defaultResolution: 240,
    description: 'Significant degradation with limited workaround',
  },
  P3: {
    label: 'Moderate',
    color: '#075985',
    defaultResponse: 60,
    defaultResolution: 1440,
    description: 'Minor impact with functional workaround',
  },
  P4: {
    label: 'Low',
    color: '#067647',
    defaultResponse: 240,
    defaultResolution: 4320,
    description: 'Minimal impact, request, or informational work',
  },
};

function fmtMins(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function formatDateTime(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function EditModal({
  def,
  onClose,
  onSave,
}: {
  def: SLADef;
  onClose: () => void;
  onSave: (updated: SLADef) => Promise<void>;
}) {
  const [response, setResponse] = useState(def.responseTimeMinutes);
  const [resolution, setResolution] = useState(def.resolutionTimeMinutes);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const meta = PRIORITY_META[def.priority] || PRIORITY_META.P4;

  async function handleSave() {
    setSaving(true);
    setErr('');
    try {
      await onSave({ ...def, responseTimeMinutes: response, resolutionTimeMinutes: resolution });
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Failed to update SLA policy');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded border bg-white shadow-2xl" style={{ borderColor: sn.border }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: sn.sectionBg, borderBottom: `1px solid ${sn.border}` }}>
          <div>
            <h3 className="text-[18px] font-bold" style={{ color: sn.label }}>Edit SLA Policy</h3>
            <p className="mt-1 text-[12px]" style={{ color: '#667085' }}>{def.priority} - {meta.label}: {meta.description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold" style={{ color: sn.label }}>Response Time Target (minutes)</span>
            <input
              type="number"
              min={1}
              value={response}
              onChange={(event) => setResponse(Number(event.target.value))}
              className="sn-field"
              style={{ border: `1px solid ${sn.borderInput}`, borderRadius: 4, height: 42, width: '100%', padding: '0 12px', fontSize: 16 }}
            />
            <span className="mt-1 block text-[12px] font-mono text-slate-500">= {fmtMins(response)}</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[13px] font-bold" style={{ color: sn.label }}>Resolution Time Target (minutes)</span>
            <input
              type="number"
              min={1}
              value={resolution}
              onChange={(event) => setResolution(Number(event.target.value))}
              className="sn-field"
              style={{ border: `1px solid ${sn.borderInput}`, borderRadius: 4, height: 42, width: '100%', padding: '0 12px', fontSize: 16 }}
            />
            <span className="mt-1 block text-[12px] font-mono text-slate-500">= {fmtMins(resolution)}</span>
          </label>

          {err && (
            <div className="flex items-center gap-2 rounded border px-3 py-2 text-[13px]" style={{ borderColor: '#f1b2b5', color: sn.critical, background: '#fff6f6' }}>
              <AlertTriangle size={15} />
              {err}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${sn.border}` }}>
          <button type="button" onClick={onClose} className="rounded border bg-white px-4 py-2 text-[14px] font-semibold" style={{ borderColor: sn.border, color: sn.label }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded px-4 py-2 text-[14px] font-bold text-white disabled:opacity-60" style={{ background: sn.primaryBtn }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Policy
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SLAPolicyPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [editDef, setEditDef] = useState<SLADef | null>(null);
  const [period, setPeriod] = useState('30d');

  const { data: reportResp, isLoading: reportLoading, refetch: refetchReport } = useQuery({
    queryKey: ['sla-report', period],
    queryFn: async () => {
      const { data } = await api.get(`/reports/incidents?period=${period}`);
      return data;
    },
    staleTime: 60000,
  });

  const { data: defsResp, isLoading: defsLoading, refetch: refetchDefs } = useQuery({
    queryKey: ['sla-defs'],
    queryFn: async () => {
      const { data } = await api.get('/sla/?appliesTo=INCIDENT');
      return data;
    },
    staleTime: 120000,
  });

  const slaCompliance: SLARow[] = reportResp?.data?.slaCompliance || [];
  const definitions: SLADef[] = defsResp?.data || [];
  const isLoading = reportLoading || defsLoading;

  const rows = PRIORITIES.map((priority) => {
    const comp = slaCompliance.find((item) => item.priority === priority);
    const definition = definitions.find((item) => item.priority === priority);
    const meta = PRIORITY_META[priority];
    return {
      id: definition?.id,
      priority,
      meta,
      responseTarget: definition?.responseTimeMinutes ?? meta.defaultResponse,
      resolutionTarget: definition?.resolutionTimeMinutes ?? meta.defaultResolution,
      total: comp?.total || 0,
      met: comp?.met || 0,
      pct: comp ? Number(comp.compliance_pct) : 100,
      breaches: comp ? comp.total - comp.met : 0,
    };
  });

  const totalIncidents = rows.reduce((acc, row) => acc + row.total, 0);
  const totalMet = rows.reduce((acc, row) => acc + row.met, 0);
  const totalBreaches = rows.reduce((acc, row) => acc + row.breaches, 0);
  const overallCompliance = totalIncidents > 0 ? (totalMet / totalIncidents) * 100 : 100;
  const complianceTone = overallCompliance >= 95 ? 'success' : overallCompliance >= 80 ? 'warn' : 'critical';

  async function handleSave(updated: SLADef) {
    try {
      await api.patch(`/sla/${updated.priority}`, {
        responseTimeMinutes: updated.responseTimeMinutes,
        resolutionTimeMinutes: updated.resolutionTimeMinutes,
      });
    } finally {
      refetchDefs();
      refetchReport();
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#ebebeb', margin: '-1.5rem', padding: '1.5rem' }}>
      <SNPage className="overflow-hidden rounded-md border shadow-sm" style={{ borderColor: sn.border }}>
        <SNRecordHeader
          number="SLA0001"
          titleNumber="SLA0001"
          priorityPill={<SNPillBadge label={`${overallCompliance.toFixed(1)}% COMPLIANCE`} tone={complianceTone} dot={overallCompliance < 95} />}
          statePill={<SNPillBadge label={totalBreaches > 0 ? 'BREACHES ACTIVE' : 'IN COMPLIANCE'} tone={totalBreaches > 0 ? 'critical' : 'success'} icon={totalBreaches > 0 ? AlertTriangle : CheckCircle2} />}
          extraBadges={<SNPillBadge label="SLA MANAGEMENT" tone="info" icon={Clock} />}
          onPrint={() => window.print()}
          onUpdate={() => {
            refetchDefs();
            refetchReport();
          }}
          updateLoading={isLoading}
        />

        <SNProcessRibbon
          steps={['START', 'IN PROGRESS', '50% WARNING', '75% WARNING', 'BREACH', 'STOP']}
          current={totalBreaches > 0 ? 'BREACH' : totalIncidents > 0 ? 'IN PROGRESS' : 'START'}
        />

        <SNCollapsibleSection title="SLA details">
          <SNFieldGrid>
            <SNFormRow label="Number" required>
              <SNReadOnly>SLA0001</SNReadOnly>
            </SNFormRow>
            <SNFormRow label="Opened">
              <SNReadOnly>{formatDateTime()}</SNReadOnly>
            </SNFormRow>
            <SNFormRow label="Policy Group" required>
              <SNReadOnly color={sn.link}>Argus Service Desk</SNReadOnly>
            </SNFormRow>
            <SNFormRow label="Reporting Period">
              <select className="sn-field" value={period} onChange={(event) => setPeriod(event.target.value)}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </SNFormRow>
            <SNFormRow label="Overall Compliance">
              <SNReadOnly color={overallCompliance >= 95 ? '#067647' : overallCompliance >= 80 ? '#b45309' : sn.critical}>{overallCompliance.toFixed(1)}%</SNReadOnly>
            </SNFormRow>
            <SNFormRow label="Total Incidents">
              <SNReadOnly>{totalIncidents}</SNReadOnly>
            </SNFormRow>
            <SNFormRow label="SLAs Met">
              <SNReadOnly color="#067647">{totalMet}</SNReadOnly>
            </SNFormRow>
            <SNFormRow label="Breaches">
              <SNReadOnly color={totalBreaches > 0 ? sn.critical : '#067647'}>{totalBreaches}</SNReadOnly>
            </SNFormRow>
          </SNFieldGrid>
        </SNCollapsibleSection>

        <SNCollapsibleSection title="SLA definitions">
          <div className="overflow-x-auto bg-white">
            <table className="sn-list-table">
              <thead>
                <tr>
                  {['Priority', 'Description', 'Response Target', 'Resolution Target', 'Breaches', 'Compliance %', 'Actions'].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[14px]" style={{ color: '#667085' }}>
                      <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading SLA data...</span>
                    </td>
                  </tr>
                ) : rows.map((row) => (
                  <tr key={row.priority}>
                    <td>
                      <span className="inline-flex rounded border px-3 py-1 text-[14px] font-bold" style={{ color: row.meta.color, borderColor: row.meta.color, background: '#fff' }}>
                        {row.priority} - {row.meta.label}
                      </span>
                    </td>
                    <td>{row.meta.description}</td>
                    <td className="font-mono">{fmtMins(row.responseTarget)}</td>
                    <td className="font-mono">{fmtMins(row.resolutionTarget)}</td>
                    <td className="font-mono" style={{ color: row.breaches > 0 ? sn.critical : '#067647' }}>
                      {row.breaches} of {row.total}
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full" style={{ background: '#edf0f3' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(Math.max(row.pct, 0), 100)}%`,
                              background: row.pct >= 95 ? '#067647' : row.pct >= 80 ? '#b45309' : sn.critical,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[14px] font-bold" style={{ color: row.pct >= 95 ? '#067647' : row.pct >= 80 ? '#b45309' : sn.critical }}>
                          {row.pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setEditDef({
                            id: row.id,
                            priority: row.priority,
                            responseTimeMinutes: row.responseTarget,
                            resolutionTimeMinutes: row.resolutionTarget,
                          })}
                          className="rounded border bg-white px-4 py-2 text-[14px] font-semibold"
                          style={{ borderColor: sn.borderStrong, color: sn.label }}
                        >
                          Edit
                        </button>
                      ) : (
                        <span className="text-[13px] text-slate-400">Read only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SNCollapsibleSection>

        <div className="px-1 pb-6">
          <SNRelatedList title="Start, Pause, Stop, and Reset Conditions" count={4}>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Condition Type</th>
                  <th>Incident rule</th>
                  <th>Change rule</th>
                  <th>Task SLA effect</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Start</td>
                  <td>Active is true and priority is P1-P4</td>
                  <td>Active is true and state is not Closed or Cancelled</td>
                  <td>Attach task SLA and calculate breach time</td>
                </tr>
                <tr>
                  <td>Pause</td>
                  <td>State is On Hold</td>
                  <td>State is Approval or Scheduled</td>
                  <td>Pause elapsed business time</td>
                </tr>
                <tr>
                  <td>Stop</td>
                  <td>State is Resolved or Closed</td>
                  <td>State is Closed or Cancelled</td>
                  <td>Complete task SLA tracking</td>
                </tr>
                <tr>
                  <td>Reset</td>
                  <td>Priority, impact, or urgency changes</td>
                  <td>Risk or planned dates change</td>
                  <td>Recalculate target and warning thresholds</td>
                </tr>
              </tbody>
            </table>
          </SNRelatedList>

          <SNRelatedList title="Task SLA Stage Legend" count={5}>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Percentage Range</th>
                  <th>Meaning</th>
                  <th>Color</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>In Progress</td>
                  <td>0-50%</td>
                  <td>Task is within the expected window</td>
                  <td style={{ color: '#067647', fontWeight: 700 }}>Green</td>
                </tr>
                <tr>
                  <td>Warning</td>
                  <td>50-75%</td>
                  <td>Service desk should monitor for potential breach</td>
                  <td style={{ color: '#b45309', fontWeight: 700 }}>Yellow</td>
                </tr>
                <tr>
                  <td>At Risk</td>
                  <td>75-100%</td>
                  <td>Escalation is recommended</td>
                  <td style={{ color: '#f05a00', fontWeight: 700 }}>Orange</td>
                </tr>
                <tr>
                  <td>Breached</td>
                  <td>100%+</td>
                  <td>Service commitment was missed</td>
                  <td style={{ color: sn.critical, fontWeight: 700 }}>Red</td>
                </tr>
                <tr>
                  <td>Paused</td>
                  <td>Paused</td>
                  <td>Clock is stopped by pause conditions or schedule</td>
                  <td style={{ color: '#667085', fontWeight: 700 }}>Gray</td>
                </tr>
              </tbody>
            </table>
          </SNRelatedList>
        </div>
      </SNPage>

      {editDef && <EditModal def={editDef} onClose={() => setEditDef(null)} onSave={handleSave} />}
    </div>
  );
}
