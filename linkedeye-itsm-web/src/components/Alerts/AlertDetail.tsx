import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Bell, Shield, CheckCircle2, VolumeX, Clock, Server,
  Activity, AlertTriangle, Flame, BarChart3, Globe, Cpu, Brain,
  ListChecks, Wrench, Target, Zap, Radio, Tag, Hash, ExternalLink,
  Loader2, CircleDot, Info, Layers, FileText, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  useAlert, useAlertKB, useAcknowledgeAlert, useSilenceAlert,
  useCreateIncidentFromAlert,
} from '../../hooks/useAlerts';

// =============================================================================
// Types
// =============================================================================

type Severity = 'CRITICAL' | 'WARNING' | 'INFO';
type AlertStatus = 'FIRING' | 'RESOLVED' | 'ACKNOWLEDGED' | 'SILENCED';

interface AlertData {
  id: string;
  alertId: string;
  name: string;
  severity: Severity;
  status: AlertStatus;
  source: string;
  description: string;
  metric: string;
  currentValue: number;
  threshold: number;
  labels: string;
  annotations: string;
  configItemId?: string;
  incidentId?: string;
  firedAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  silenceUntil?: string;
  configItem?: {
    id: string;
    name: string;
    type: string;
    hostname: string;
    ipAddress: string;
    os?: string;
    osVersion?: string;
  };
  incident?: {
    id: string;
    number: string;
    shortDescription: string;
    state: string;
  };
}

interface KBData {
  cat?: string;
  rootCause?: string[];
  investigate?: string[];
  remediate?: string[];
  escalation?: string;
  blast?: string;
}

// =============================================================================
// Constants
// =============================================================================

const SEVERITY_STYLES: Record<Severity, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: 'Critical' },
  WARNING:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'Warning' },
  INFO:     { color: '#6366F1', bg: 'rgba(99,102,241,0.15)', label: 'Info' },
};

const STATUS_STYLES: Record<AlertStatus, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  FIRING:       { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: Radio,        label: 'Firing' },
  RESOLVED:     { color: '#059669', bg: 'rgba(5,150,105,0.12)',  icon: CheckCircle2, label: 'Resolved' },
  ACKNOWLEDGED: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: Shield,       label: 'Acknowledged' },
  SILENCED:     { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', icon: VolumeX,      label: 'Silenced' },
};

const SOURCE_STYLES: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  PROMETHEUS: { color: '#E6522C', icon: Flame,     label: 'Prometheus' },
  GRAFANA:    { color: '#F46800', icon: BarChart3, label: 'Grafana' },
  CUSTOM:     { color: '#6366F1', icon: Globe,     label: 'Custom' },
};

// =============================================================================
// Helpers
// =============================================================================

function parseJSON(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function formatDuration(from: string, to?: string): string {
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const diff = Math.max(0, end - start);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function generateMetricData(current: number, threshold: number) {
  const points = 24;
  const data = [];
  const base = Math.min(current, threshold) * 0.6;
  const range = Math.max(current, threshold) * 0.3;
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    // Simulate a gradual rise that crosses the threshold near the end
    const trend = base + (current - base) * Math.pow(t, 1.8);
    const noise = (Math.random() - 0.5) * range * 0.3;
    data.push({
      time: `${String(Math.floor(i * 2.5)).padStart(2, '0')}:00`,
      value: Math.max(0, Math.round((trend + noise) * 100) / 100),
      threshold,
    });
  }
  return data;
}

// =============================================================================
// Sub-components
// =============================================================================

function SectionCard({ title, icon: Icon, children, accent = '#EF4444' }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: '#fff', borderColor: '#E7E5E4' }}
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b" style={{ borderColor: '#F5F5F4' }}>
        <div className="p-1.5 rounded-lg" style={{ background: `${accent}14` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <h3 className="font-display font-semibold text-sm" style={{ color: '#1C1917' }}>{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent: string;
}) {
  return (
    <div
      className="relative rounded-xl border px-4 py-3.5 overflow-hidden backdrop-blur-sm"
      style={{ background: 'rgba(255,255,255,0.06)', borderColor: '#E7E5E4' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-body mb-1" style={{ color: '#A8A29E' }}>{label}</p>
          <p className="text-lg font-display font-bold font-mono" style={{ color: '#1C1917' }}>{value}</p>
          {sub && <p className="text-xs font-mono mt-0.5" style={{ color: '#78716C' }}>{sub}</p>}
        </div>
        <div className="p-2 rounded-lg" style={{ background: `${accent}14` }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
    </div>
  );
}

function TimelineEvent({ label, time, isLast, color }: {
  label: string; time: string | undefined; isLast?: boolean; color: string;
}) {
  const hasTime = !!time;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full border-2 mt-0.5"
          style={{
            borderColor: hasTime ? color : '#D6D3D1',
            background: hasTime ? color : 'transparent',
          }}
        />
        {!isLast && (
          <div className="w-px flex-1 min-h-[24px]" style={{ background: '#E7E5E4' }} />
        )}
      </div>
      <div className="pb-4">
        <p className="text-sm font-body font-medium" style={{ color: hasTime ? '#1C1917' : '#A8A29E' }}>
          {label}
        </p>
        <p className="text-xs font-mono mt-0.5" style={{ color: hasTime ? '#78716C' : '#D6D3D1' }}>
          {hasTime ? formatTimestamp(time) : 'Pending'}
        </p>
      </div>
    </div>
  );
}

function LabelTable({ labels }: { labels: Record<string, string> }) {
  const entries = Object.entries(labels);
  if (entries.length === 0) return <p className="text-sm" style={{ color: '#A8A29E' }}>No labels</p>;
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-start gap-2">
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
            style={{ background: '#F5F5F4', color: '#78716C' }}
          >
            {k}
          </span>
          <span className="text-xs font-mono break-all" style={{ color: '#1C1917' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: alertRes, isLoading, isError } = useAlert(id);
  const alert: AlertData | undefined = alertRes?.data;

  const { data: kbRes } = useAlertKB(alert?.name);
  const kb: KBData | undefined = kbRes?.data;

  const ackMutation = useAcknowledgeAlert();
  const silenceMutation = useSilenceAlert();
  const createIncMutation = useCreateIncidentFromAlert();

  const labels = useMemo(() => parseJSON(alert?.labels), [alert?.labels]);
  const annotations = useMemo(() => parseJSON(alert?.annotations), [alert?.annotations]);

  const metricData = useMemo(() => {
    if (!alert?.currentValue && alert?.currentValue !== 0) return [];
    return generateMetricData(alert.currentValue, alert.threshold);
  }, [alert?.currentValue, alert?.threshold]);

  // Handlers
  const handleAcknowledge = () => {
    if (!id) return;
    ackMutation.mutate(id, {
      onSuccess: () => toast.success('Alert acknowledged'),
      onError: () => toast.error('Failed to acknowledge alert'),
    });
  };

  const handleSilence = () => {
    if (!id) return;
    silenceMutation.mutate(id, {
      onSuccess: () => toast.success('Alert silenced for 1 hour'),
      onError: () => toast.error('Failed to silence alert'),
    });
  };

  const handleCreateIncident = () => {
    if (!id) return;
    createIncMutation.mutate(id, {
      onSuccess: () => toast.success('Incident created from alert'),
      onError: () => toast.error('Failed to create incident'),
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#EF4444' }} />
          <span className="text-sm font-mono" style={{ color: '#78716C' }}>Loading alert...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !alert) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={32} style={{ color: '#EF4444' }} />
          <p className="font-display font-semibold" style={{ color: '#1C1917' }}>Alert not found</p>
          <p className="text-sm" style={{ color: '#78716C' }}>The alert may have been deleted or you lack access.</p>
          <button
            onClick={() => navigate('/alerts')}
            className="mt-2 text-sm font-medium px-4 py-2 rounded-lg border"
            style={{ color: '#EF4444', borderColor: '#EF4444' }}
          >
            Back to Alerts
          </button>
        </div>
      </div>
    );
  }

  const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.INFO;
  const status = STATUS_STYLES[alert.status] || STATUS_STYLES.FIRING;
  const StatusIcon = status.icon;
  const source = SOURCE_STYLES[alert.source] || SOURCE_STYLES.CUSTOM;
  const SourceIcon = source.icon;
  const hostname = alert.configItem?.hostname || labels.instance || labels.hostname || '--';
  const ip = alert.configItem?.ipAddress || labels.ip || '';
  const subjectLine = `[${alert.severity}] ${alert.name}${hostname !== '--' ? ` on ${hostname}` : ''}${ip ? ` (${ip})` : ''}`;
  const isFiring = alert.status === 'FIRING';
  const isActioning = ackMutation.isPending || silenceMutation.isPending || createIncMutation.isPending;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F5F5F4' }}>
      {/* ── Dark Hero Header ── */}
      <div className="relative overflow-hidden" style={{ background: '#0F172A' }}>
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Ambient glow */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: '#EF4444' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-6">
          {/* Back nav */}
          <button
            onClick={() => navigate('/alerts')}
            className="flex items-center gap-1.5 text-sm mb-4 hover:opacity-80 transition-opacity"
            style={{ color: '#94A3B8' }}
          >
            <ArrowLeft size={16} />
            <span>Alerts</span>
          </button>

          {/* Subject line */}
          <h1
            className="font-display font-bold text-xl sm:text-2xl leading-tight mb-3 break-words"
            style={{ color: '#F1F5F9' }}
          >
            {subjectLine}
          </h1>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: status.bg, color: status.color }}
            >
              <StatusIcon size={12} />
              {status.label}
            </span>
            {/* Severity badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: sev.bg, color: sev.color }}
            >
              <AlertTriangle size={12} />
              {sev.label}
            </span>
            {/* Source badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', color: source.color }}
            >
              <SourceIcon size={12} />
              {source.label}
            </span>
            {/* Duration */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8' }}
            >
              <Clock size={12} />
              {formatDuration(alert.firedAt, alert.resolvedAt ?? undefined)}
            </span>
          </div>
        </div>

        {/* Gradient accent line */}
        <div className="h-1" style={{ background: 'linear-gradient(to right, #EF4444, #F59E0B, #EF4444)' }} />
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Current Value"
            value={alert.currentValue != null ? String(alert.currentValue) : '--'}
            sub={alert.metric || undefined}
            icon={Activity}
            accent="#EF4444"
          />
          <StatCard
            label="Threshold"
            value={alert.threshold != null ? String(alert.threshold) : '--'}
            icon={Target}
            accent="#F59E0B"
          />
          <StatCard
            label="Duration"
            value={formatDuration(alert.firedAt, alert.resolvedAt ?? undefined)}
            sub={isFiring ? 'Active' : 'Resolved'}
            icon={Clock}
            accent="#6366F1"
          />
          <StatCard
            label="Source"
            value={source.label}
            sub={alert.alertId || undefined}
            icon={SourceIcon}
            accent={source.color}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alert Intelligence */}
            {kb && (kb.rootCause?.length || kb.investigate?.length || kb.remediate?.length) ? (
              <SectionCard title="Alert Intelligence" icon={Brain} accent="#7C3AED">
                <div className="space-y-5">
                  {kb.cat && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A8A29E' }}>Category</p>
                      <p className="text-sm font-body" style={{ color: '#1C1917' }}>{kb.cat}</p>
                    </div>
                  )}

                  {kb.rootCause && kb.rootCause.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap size={14} style={{ color: '#EF4444' }} />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#EF4444' }}>Root Cause Analysis</p>
                      </div>
                      <ul className="space-y-1.5">
                        {kb.rootCause.map((rc, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1C1917' }}>
                            <span className="font-mono text-xs mt-0.5 shrink-0" style={{ color: '#EF4444' }}>{i + 1}.</span>
                            <span className="font-body">{rc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {kb.investigate && kb.investigate.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ListChecks size={14} style={{ color: '#F59E0B' }} />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#F59E0B' }}>Investigation Steps</p>
                      </div>
                      <ol className="space-y-1.5">
                        {kb.investigate.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1C1917' }}>
                            <span
                              className="font-mono text-xs px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}
                            >
                              {i + 1}
                            </span>
                            <span className="font-body">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {kb.remediate && kb.remediate.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Wrench size={14} style={{ color: '#059669' }} />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#059669' }}>Recommended Actions</p>
                      </div>
                      <ol className="space-y-1.5">
                        {kb.remediate.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1C1917' }}>
                            <span
                              className="font-mono text-xs px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}
                            >
                              {i + 1}
                            </span>
                            <span className="font-body">{action}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </SectionCard>
            ) : null}

            {/* Alert Details */}
            <SectionCard title="Alert Details" icon={FileText} accent="#EF4444">
              <div className="space-y-4">
                {alert.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A8A29E' }}>Description</p>
                    <p className="text-sm font-body leading-relaxed" style={{ color: '#1C1917' }}>{alert.description}</p>
                  </div>
                )}
                {annotations.summary && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A8A29E' }}>Summary</p>
                    <p className="text-sm font-body leading-relaxed" style={{ color: '#44403C' }}>{annotations.summary}</p>
                  </div>
                )}
                {alert.metric && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A8A29E' }}>Metric</p>
                    <code className="text-sm font-mono px-2 py-1 rounded" style={{ background: '#F5F5F4', color: '#1C1917' }}>
                      {alert.metric}
                    </code>
                  </div>
                )}
                {/* Value gauge */}
                {alert.currentValue != null && alert.threshold != null && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A8A29E' }}>Value vs Threshold</p>
                    <div className="relative h-4 rounded-full overflow-hidden" style={{ background: '#F5F5F4' }}>
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (alert.currentValue / Math.max(alert.threshold, 1)) * 100)}%`,
                          background: alert.currentValue >= alert.threshold
                            ? 'linear-gradient(to right, #F59E0B, #EF4444)'
                            : 'linear-gradient(to right, #059669, #6366F1)',
                        }}
                      />
                      {/* threshold marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5"
                        style={{
                          left: `${Math.min(95, (alert.threshold / Math.max(alert.currentValue, alert.threshold) * 0.85) * 100)}%`,
                          background: '#1C1917',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs font-mono" style={{ color: '#78716C' }}>0</span>
                      <span className="text-xs font-mono" style={{ color: '#EF4444' }}>
                        {alert.currentValue} / {alert.threshold}
                      </span>
                    </div>
                  </div>
                )}
                {annotations.runbook_url && (
                  <a
                    href={annotations.runbook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    style={{ color: '#6366F1' }}
                  >
                    <ExternalLink size={14} />
                    View Runbook
                  </a>
                )}
              </div>
            </SectionCard>

            {/* Metric Visualization */}
            {metricData.length > 0 && (
              <SectionCard title="Metric Trend" icon={Activity} accent="#EF4444">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metricData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: '#A8A29E' }}
                        axisLine={{ stroke: '#E7E5E4' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: '#A8A29E' }}
                        axisLine={{ stroke: '#E7E5E4' }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0F172A',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: '#F1F5F9',
                        }}
                      />
                      <ReferenceLine
                        y={alert.threshold}
                        stroke="#EF4444"
                        strokeDasharray="6 3"
                        label={{
                          value: `Threshold: ${alert.threshold}`,
                          position: 'insideTopRight',
                          fill: '#EF4444',
                          fontSize: 10,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#EF4444"
                        strokeWidth={2}
                        fill="url(#metricGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            )}

            {/* Source & Metadata */}
            <SectionCard title="Source & Metadata" icon={Tag} accent="#78716C">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A8A29E' }}>Alert ID</p>
                    <p className="text-sm font-mono" style={{ color: '#1C1917' }}>{alert.alertId || alert.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A8A29E' }}>Source</p>
                    <p className="text-sm font-body" style={{ color: '#1C1917' }}>{source.label}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A8A29E' }}>Labels</p>
                  <LabelTable labels={labels} />
                </div>
                {Object.keys(annotations).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A8A29E' }}>Annotations</p>
                    <LabelTable labels={annotations} />
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* ── Right column (1/3) ── */}
          <div className="space-y-6">
            {/* Affected System */}
            <SectionCard title="Affected System" icon={Server} accent="#6366F1">
              <div className="space-y-3">
                {alert.configItem ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Cpu size={14} style={{ color: '#6366F1' }} />
                      <Link
                        to={`/assets/${alert.configItem.id}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: '#6366F1' }}
                      >
                        {alert.configItem.name}
                      </Link>
                    </div>
                    <InfoRow label="Type" value={alert.configItem.type} />
                    <InfoRow label="Hostname" value={alert.configItem.hostname} mono />
                    <InfoRow label="IP Address" value={alert.configItem.ipAddress} mono />
                    {alert.configItem.os && (
                      <InfoRow label="OS" value={`${alert.configItem.os} ${alert.configItem.osVersion || ''}`} />
                    )}
                  </>
                ) : (
                  <>
                    {labels.instance && <InfoRow label="Instance" value={labels.instance} mono />}
                    {labels.job && <InfoRow label="Job" value={labels.job} />}
                    {labels.namespace && <InfoRow label="Namespace" value={labels.namespace} mono />}
                    {labels.pod && <InfoRow label="Pod" value={labels.pod} mono />}
                    {labels.hostname && <InfoRow label="Hostname" value={labels.hostname} mono />}
                    {labels.client && <InfoRow label="Client" value={labels.client} />}
                    {labels.org && <InfoRow label="Org" value={labels.org} />}
                    {!labels.instance && !labels.job && !labels.hostname && (
                      <p className="text-sm" style={{ color: '#A8A29E' }}>No system information available</p>
                    )}
                  </>
                )}
              </div>
            </SectionCard>

            {/* Linked Incident */}
            {alert.incident && (
              <SectionCard title="Linked Incident" icon={Bell} accent="#F59E0B">
                <Link
                  to={`/incidents/${alert.incident.id}`}
                  className="flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-mono font-medium" style={{ color: '#6366F1' }}>
                      {alert.incident.number}
                    </p>
                    <p className="text-xs font-body mt-0.5" style={{ color: '#44403C' }}>
                      {alert.incident.shortDescription}
                    </p>
                    <span
                      className="inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: '#F5F5F4', color: '#78716C' }}
                    >
                      {alert.incident.state}
                    </span>
                  </div>
                  <ChevronRight size={16} style={{ color: '#A8A29E' }} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </SectionCard>
            )}

            {/* Timeline */}
            <SectionCard title="Timeline" icon={Clock} accent="#6366F1">
              <TimelineEvent label="Fired" time={alert.firedAt} color="#EF4444" />
              <TimelineEvent label="Acknowledged" time={alert.acknowledgedAt} color="#F59E0B" />
              <TimelineEvent label="Resolved" time={alert.resolvedAt} color="#059669" isLast />
              {alert.acknowledgedBy && (
                <p className="text-xs font-body mt-2 pt-2 border-t" style={{ color: '#78716C', borderColor: '#E7E5E4' }}>
                  Acknowledged by <span className="font-medium" style={{ color: '#1C1917' }}>{alert.acknowledgedBy}</span>
                </p>
              )}
              {alert.silenceUntil && (
                <p className="text-xs font-body mt-2 pt-2 border-t" style={{ color: '#A78BFA', borderColor: '#E7E5E4' }}>
                  Silenced until {formatTimestamp(alert.silenceUntil)}
                </p>
              )}
            </SectionCard>

            {/* Impact Assessment */}
            {kb && (kb.blast || kb.escalation) && (
              <SectionCard title="Impact Assessment" icon={Layers} accent="#EF4444">
                <div className="space-y-3">
                  {kb.blast && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A8A29E' }}>Blast Radius</p>
                      <p className="text-sm font-body" style={{ color: '#1C1917' }}>{kb.blast}</p>
                    </div>
                  )}
                  {kb.escalation && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A8A29E' }}>Escalation Path</p>
                      <p className="text-sm font-body" style={{ color: '#1C1917' }}>{kb.escalation}</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Action Bar ── */}
      <div
        className="fixed bottom-0 inset-x-0 border-t z-30"
        style={{ background: '#FFFFFF', borderColor: '#E7E5E4' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: isFiring ? '#EF4444' : '#059669' }}
            />
            <span className="text-sm font-body" style={{ color: '#78716C' }}>
              {alert.name} - {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAcknowledge}
              disabled={isActioning || alert.status === 'ACKNOWLEDGED' || alert.status === 'RESOLVED'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}
            >
              {ackMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              Acknowledge
            </button>
            <button
              onClick={handleSilence}
              disabled={isActioning || alert.status === 'SILENCED' || alert.status === 'RESOLVED'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA' }}
            >
              {silenceMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <VolumeX size={14} />}
              Silence
            </button>
            <button
              onClick={handleCreateIncident}
              disabled={isActioning || !!alert.incidentId}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: '#EF4444' }}
            >
              {createIncMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              Create Incident
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small info-row helper
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs shrink-0" style={{ color: '#A8A29E' }}>{label}</span>
      <span
        className={`text-xs text-right ${mono ? 'font-mono' : 'font-body'}`}
        style={{ color: '#1C1917' }}
      >
        {value}
      </span>
    </div>
  );
}
