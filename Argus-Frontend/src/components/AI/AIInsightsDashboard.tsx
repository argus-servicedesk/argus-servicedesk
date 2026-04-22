import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  CheckCircle,
  Target,
  Lightbulb,
  GitCompare,
  Loader2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Send,
  Bot,
  User,
  ExternalLink,
  Activity,
  Server,
  Database,
  FileText,
  Zap,
  HardDrive,
  Cpu,
  MemoryStick,
  Shield,
  Clock,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import api from '../../lib/api';
import {
  useClusterHealth,
  useServerAnalysis,
  useDBAnalysis,
  useLogAnalysis,
  useAITips,
} from '../../hooks/useAIAgent';

/* ====================================================================
   SUBCOMPONENTS
   ==================================================================== */

function StatsCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  color: string;
}) {
  const c: Record<string, { border: string; iconColor: string; bg: string }> = {
    signal:  { border: 'rgba(99,102,241,0.18)', iconColor: '#6366f1', bg: 'rgba(99,102,241,0.10)' },
    crimson: { border: 'rgba(220,38,38,0.18)',  iconColor: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
    amber:   { border: 'rgba(217,119,6,0.18)',  iconColor: '#D97706', bg: 'rgba(217,119,6,0.10)' },
    emerald: { border: 'rgba(5,150,105,0.18)',  iconColor: '#059669', bg: 'rgba(5,150,105,0.10)' },
    violet:  { border: 'rgba(99,102,241,0.18)', iconColor: '#818cf8', bg: 'rgba(99,102,241,0.10)' },
  };
  const s = c[color] || c.signal;
  return (
    <div className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5"
      style={{ background: '#ffffff', border: `1px solid ${s.border}`, backdropFilter: 'blur(12px)' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-xl" style={{ background: s.bg }}>
          <Icon className="w-4 h-4" style={{ color: s.iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-display font-bold tracking-tight" style={{ color: '#0f172a' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{label}</p>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 90 ? '#059669' :
    value >= 75 ? '#6366f1' :
    value >= 60 ? '#D97706' :
    '#DC2626';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[80px]" style={{ background: 'rgba(99,102,241,0.12)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-[11px] font-mono font-semibold" style={{ color }}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

function ClassificationStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    accepted: { bg: 'rgba(5,150,105,0.12)', color: '#059669', border: 'rgba(5,150,105,0.25)' },
    rejected: { bg: 'rgba(220,38,38,0.12)', color: '#DC2626', border: 'rgba(220,38,38,0.25)' },
    pending:  { bg: 'rgba(217,119,6,0.12)', color: '#D97706', border: 'rgba(217,119,6,0.25)' },
  };
  const s = styles[status] || styles.pending;
  const label =
    status === 'accepted' ? 'Accepted' :
    status === 'rejected' ? 'Rejected' :
    'Pending';
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {label}
    </span>
  );
}

function DonutStat({ accepted, rejected, pending }: { accepted: number; rejected: number; pending: number }) {
  const total = accepted + rejected + pending;
  const acceptedPct = total > 0 ? (accepted / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;

  const circumference = 2 * Math.PI * 42;
  const acceptedOffset = 0;
  const rejectedOffset = (acceptedPct / 100) * circumference;
  const pendingOffset = ((acceptedPct + rejectedPct) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[120px] h-[120px]">
        <svg className="-rotate-90" width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="42" fill="none" stroke="#059669" strokeWidth="10"
            strokeDasharray={`${(acceptedPct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-acceptedOffset}
            className="transition-all duration-1000"
          />
          <circle
            cx="60" cy="60" r="42" fill="none" stroke="#DC2626" strokeWidth="10"
            strokeDasharray={`${(rejectedPct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-rejectedOffset}
            className="transition-all duration-1000"
          />
          <circle
            cx="60" cy="60" r="42" fill="none" stroke="#D97706" strokeWidth="10"
            strokeDasharray={`${(pendingPct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-pendingOffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold font-mono" style={{ color: '#059669' }}>{acceptedPct.toFixed(0)}%</span>
          <span className="text-[9px] font-semibold" style={{ color: '#94a3b8' }}>Accuracy</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#059669' }} />
          <span style={{ color: '#64748b' }}>Accepted ({accepted}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#DC2626' }} />
          <span style={{ color: '#64748b' }}>Rejected ({rejected}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#D97706' }} />
          <span style={{ color: '#64748b' }}>Pending ({pending}%)</span>
        </div>
      </div>
    </div>
  );
}

function HealthScoreGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 160 : size === 'md' ? 120 : 80;
  const r = size === 'lg' ? 60 : size === 'md' ? 42 : 28;
  const sw = size === 'lg' ? 12 : size === 'md' ? 10 : 6;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626';
  const fontSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-lg' : 'text-sm';

  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      <svg className="-rotate-90" width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth={sw} />
        <circle
          cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx('font-extrabold font-mono', fontSize)} style={{ color }}>{score}</span>
        <span className="text-[9px] font-semibold" style={{ color: '#94a3b8' }}>Score</span>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    critical: { bg: 'rgba(220,38,38,0.12)', color: '#DC2626', border: 'rgba(220,38,38,0.25)' },
    warning:  { bg: 'rgba(217,119,6,0.12)', color: '#D97706', border: 'rgba(217,119,6,0.25)' },
    info:     { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  };
  const s = styles[severity] || styles.info;
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {severity}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    high:   { bg: 'rgba(220,38,38,0.12)', color: '#DC2626', border: 'rgba(220,38,38,0.25)' },
    medium: { bg: 'rgba(217,119,6,0.12)', color: '#D97706', border: 'rgba(217,119,6,0.25)' },
    low:    { bg: 'rgba(5,150,105,0.12)', color: '#059669', border: 'rgba(5,150,105,0.25)' },
  };
  const s = styles[priority] || styles.low;
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {priority}
    </span>
  );
}

function AgentLoadingState({ label }: { label: string }) {
  return (
    <div className="p-12 text-center">
      <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: '#6366f1' }} />
      <p className="font-medium text-sm" style={{ color: '#64748b' }}>{label}</p>
    </div>
  );
}

function AgentErrorState({ label }: { label: string }) {
  return (
    <div className="p-12 text-center">
      <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: '#D97706' }} />
      <p className="font-medium text-sm" style={{ color: '#64748b' }}>{label}</p>
      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Data source may be unavailable</p>
    </div>
  );
}

/* ====================================================================
   AI AGENT TAB PANELS
   ==================================================================== */

function InfrastructureTab() {
  const { data: clusterRes, isLoading: clusterLoading, isError: clusterError } = useClusterHealth();
  const { data: serverRes, isLoading: serverLoading, isError: serverError } = useServerAnalysis();

  const cluster = clusterRes?.success ? clusterRes.data : null;
  const servers = serverRes?.success ? serverRes.data : null;

  if (clusterLoading && serverLoading) return <AgentLoadingState label="Analyzing infrastructure..." />;

  return (
    <div className="space-y-6">
      {/* Cluster Health */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
          <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Server className="w-4 h-4" style={{ color: '#6366f1' }} />
            K8s Cluster Health
          </span>
          {cluster && (
            <SeverityBadge severity={cluster.health === 'healthy' ? 'info' : cluster.health} />
          )}
        </div>
        {clusterLoading ? <AgentLoadingState label="Loading cluster data..." /> :
         clusterError || !cluster ? <AgentErrorState label="Cluster data unavailable" /> : (
          <div className="p-5">
            <div className="flex items-start gap-6 mb-5">
              <HealthScoreGauge score={cluster.score} />
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Nodes', value: cluster.nodes?.length || 0 },
                    { label: 'Targets', value: cluster.targets?.activeCount ?? 'N/A' },
                    { label: 'Alerts', value: cluster.firingAlerts?.length || 0, isDanger: true },
                    { label: 'CPU Req', value: `${parseFloat(cluster.cpuRequests || '0').toFixed(1)} cores` },
                  ].map(item => (
                    <div key={item.label} className="p-2.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
                      <p className="text-[10px] font-mono uppercase" style={{ color: '#94a3b8' }}>{item.label}</p>
                      <p className="text-sm font-bold" style={{ color: item.isDanger ? '#DC2626' : '#0f172a' }}>{item.value}</p>
                    </div>
                  ))}
                </div>
                {cluster.aiAnalysis && cluster.aiAnalysis !== 'AI analysis unavailable' && (
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: '#6366f1' }}>
                      <Brain className="w-3 h-3" /> AI Analysis
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#6366f1' }}>{cluster.aiAnalysis}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pod Phases */}
            {cluster.podPhases?.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Pod Phases</p>
                <div className="flex flex-wrap gap-2">
                  {cluster.podPhases.map((p: any) => {
                    const phaseColor = p.phase === 'Running' ? '#059669' : p.phase === 'Pending' ? '#D97706' : p.phase === 'Failed' ? '#DC2626' : '#64748b';
                    return (
                      <div key={p.phase} className="px-3 py-1.5 rounded-lg text-xs font-mono"
                        style={{ background: `${phaseColor}12`, border: `1px solid ${phaseColor}30`, color: phaseColor }}>
                        {p.phase}: {p.count}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Namespace CPU */}
            {cluster.namespaces?.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Namespace CPU Usage</p>
                <div className="space-y-2">
                  {cluster.namespaces.slice(0, 6).map((ns: any) => (
                    <div key={ns.namespace} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-40 truncate" style={{ color: '#6366f1' }}>{ns.namespace}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.12)' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(parseFloat(ns.cpuCores) * 50, 100)}%`, background: '#6366f1' }} />
                      </div>
                      <span className="text-[11px] font-mono w-16 text-right" style={{ color: '#64748b' }}>{ns.cpuCores} cores</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Firing Alerts */}
            {cluster.firingAlerts?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Firing Alerts</p>
                <div className="space-y-1.5">
                  {cluster.firingAlerts.slice(0, 5).map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#DC2626' }} />
                      <span className="text-xs flex-1" style={{ color: '#6366f1' }}>{a.name}</span>
                      <SeverityBadge severity={a.severity || 'warning'} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risks & Recommendations */}
            {cluster.risks?.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>AI-Detected Risks</p>
                <div className="space-y-2">
                  {cluster.risks.map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg"
                      style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
                      <SeverityBadge severity={r.severity} />
                      <div>
                        <p className="text-xs font-medium" style={{ color: '#0f172a' }}>{r.title}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{r.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Server Analysis */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
          <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <HardDrive className="w-4 h-4" style={{ color: '#a855f7' }} />
            Server / Node Metrics
          </span>
          {servers && (
            <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{servers.servers?.length || 0} servers</span>
          )}
        </div>
        {serverLoading ? <AgentLoadingState label="Loading server metrics..." /> :
         serverError || !servers ? <AgentErrorState label="Server metrics unavailable" /> : (
          <div className="p-5">
            {servers.servers?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {servers.servers.map((srv: any) => {
                  const borderColor = srv.status === 'critical' ? 'rgba(220,38,38,0.25)' : srv.status === 'warning' ? 'rgba(217,119,6,0.25)' : 'rgba(5,150,105,0.25)';
                  const bgColor = srv.status === 'critical' ? 'rgba(220,38,38,0.06)' : srv.status === 'warning' ? 'rgba(217,119,6,0.06)' : 'rgba(5,150,105,0.06)';
                  return (
                    <div key={srv.name} className="p-3 rounded-lg" style={{ border: `1px solid ${borderColor}`, background: bgColor }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold truncate" style={{ color: '#0f172a' }}>{srv.name}</span>
                        <SeverityBadge severity={srv.status === 'healthy' ? 'info' : srv.status} />
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-0.5">
                            <span className="flex items-center gap-1" style={{ color: '#94a3b8' }}><MemoryStick className="w-3 h-3" /> Memory</span>
                            <span className="font-mono" style={{ color: '#6366f1' }}>{parseFloat(srv.memory?.usedPct || '0').toFixed(0)}% of {srv.memory?.totalGB || '?'} GB</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.12)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${srv.memory?.usedPct || 0}%`, background: parseFloat(srv.memory?.usedPct || '0') > 90 ? '#DC2626' : parseFloat(srv.memory?.usedPct || '0') > 75 ? '#D97706' : '#059669' }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-0.5">
                            <span className="flex items-center gap-1" style={{ color: '#94a3b8' }}><HardDrive className="w-3 h-3" /> Disk</span>
                            <span className="font-mono" style={{ color: '#6366f1' }}>{parseFloat(srv.disk?.usedPct || '0').toFixed(0)}% of {srv.disk?.totalGB || '?'} GB</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.12)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${srv.disk?.usedPct || 0}%`, background: parseFloat(srv.disk?.usedPct || '0') > 90 ? '#DC2626' : parseFloat(srv.disk?.usedPct || '0') > 80 ? '#D97706' : '#059669' }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1" style={{ color: '#94a3b8' }}><Cpu className="w-3 h-3" /> Load (1m)</span>
                          <span className="font-mono font-semibold" style={{ color: srv.load > 8 ? '#DC2626' : srv.load > 4 ? '#D97706' : '#059669' }}>
                            {srv.load?.toFixed(2) || '0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: '#94a3b8' }}>No server metrics available</p>
            )}

            {servers.aiAnalysis && servers.aiAnalysis !== 'AI analysis unavailable' && (
              <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: '#6366f1' }}>
                  <Brain className="w-3 h-3" /> AI Analysis
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#6366f1' }}>{servers.aiAnalysis}</p>
              </div>
            )}

            {servers.tips?.length > 0 && (
              <div className="space-y-1.5">
                {servers.tips.map((tip: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#0f172a' }}>{tip.title}</p>
                      <p className="text-[11px]" style={{ color: '#64748b' }}>{tip.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DatabaseTab() {
  const { data: dbRes, isLoading, isError } = useDBAnalysis();
  const db = dbRes?.success ? dbRes.data : null;

  if (isLoading) return <AgentLoadingState label="Analyzing PostgreSQL..." />;
  if (isError || !db) return <AgentErrorState label="Database analysis unavailable" />;

  return (
    <div className="space-y-6">
      {/* DB Health Overview */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
          <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Database className="w-4 h-4" style={{ color: '#a855f7' }} />
            PostgreSQL Health
          </span>
          <SeverityBadge severity={db.health === 'healthy' ? 'info' : db.health} />
        </div>
        <div className="p-5">
          <div className="flex items-start gap-6 mb-5">
            <HealthScoreGauge score={db.score} />
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Active Conn', value: db.connections?.active ?? 'N/A' },
                { label: 'Cache Hit', value: `${db.connections?.cacheHitRatio ?? 'N/A'}%`, isGood: true },
                { label: 'DB Size', value: `${db.dbSizeMB} MB` },
                { label: 'TX Committed', value: (db.connections?.txCommitted || 0).toLocaleString() },
                { label: 'Deadlocks', value: db.connections?.deadlocks ?? 0, isDanger: (db.connections?.deadlocks || 0) > 0 },
                { label: 'Slow Queries', value: db.slowQueries?.length || 0, isWarn: (db.slowQueries?.length || 0) > 0 },
              ].map(item => (
                <div key={item.label} className="p-2.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <p className="text-[10px] font-mono uppercase" style={{ color: '#94a3b8' }}>{item.label}</p>
                  <p className="text-sm font-bold" style={{ color: item.isDanger ? '#DC2626' : item.isWarn ? '#D97706' : item.isGood ? '#059669' : '#0f172a' }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {db.aiAnalysis && db.aiAnalysis !== 'AI analysis unavailable' && (
            <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: '#6366f1' }}>
                <Brain className="w-3 h-3" /> AI Analysis
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#6366f1' }}>{db.aiAnalysis}</p>
            </div>
          )}

          {/* Connection States */}
          {db.connections?.states?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Connection States</p>
              <div className="flex flex-wrap gap-2">
                {db.connections.states.map((s: any) => (
                  <div key={s.state || 'null'} className="px-3 py-1.5 rounded-lg text-xs font-mono"
                    style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <span style={{ color: '#64748b' }}>{s.state || 'null'}:</span>{' '}
                    <span className="font-bold" style={{ color: '#0f172a' }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Stats */}
      {db.tables?.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <FileText className="w-4 h-4" style={{ color: '#6366f1' }} />
              Table Statistics
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                  {['Table', 'Rows', 'Dead Rows', 'Last Vacuum'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider uppercase"
                      style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {db.tables.slice(0, 12).map((t: any) => (
                  <tr key={t.table_name} className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-2 font-mono text-xs font-semibold" style={{ color: '#6366f1' }}>{t.table_name}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: '#6366f1' }}>{Number(t.row_count).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-mono" style={{ color: Number(t.dead_rows) > 10000 ? '#DC2626' : Number(t.dead_rows) > 1000 ? '#D97706' : '#64748b' }}>
                        {Number(t.dead_rows).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[11px] font-mono" style={{ color: '#94a3b8' }}>
                      {t.last_autovacuum ? new Date(t.last_autovacuum).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slow Queries */}
      {db.slowQueries?.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <Clock className="w-4 h-4" style={{ color: '#DC2626' }} />
              Slow Queries ({'>'}10s)
            </span>
          </div>
          <div>
            {db.slowQueries.map((q: any, idx: number) => (
              <div key={q.pid} className="px-5 py-3" style={{ borderBottom: idx < db.slowQueries.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>PID {q.pid}</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: '#DC2626' }}>{q.duration_seconds}s</span>
                  <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{q.state}</span>
                </div>
                <p className="text-xs font-mono break-all" style={{ color: '#6366f1' }}>{q.query}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Tips */}
      {db.configTips?.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <Lightbulb className="w-4 h-4" style={{ color: '#D97706' }} />
              AI Config Recommendations
            </span>
          </div>
          <div>
            {db.configTips.map((tip: any, i: number) => (
              <div key={i} className="px-5 py-3" style={{ borderBottom: i < db.configTips.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none' }}>
                <p className="text-xs font-medium mb-0.5" style={{ color: '#0f172a' }}>{tip.title}</p>
                <p className="text-[11px]" style={{ color: '#64748b' }}>{tip.action}</p>
                {tip.impact && <p className="text-[10px] font-mono mt-1" style={{ color: '#059669' }}>Impact: {tip.impact}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {db.issues?.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />
              Detected Issues
            </span>
          </div>
          <div>
            {db.issues.map((issue: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-start gap-2"
                style={{ borderBottom: i < db.issues.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none' }}>
                <SeverityBadge severity={issue.severity} />
                <div>
                  <p className="text-xs font-medium" style={{ color: '#0f172a' }}>{issue.title}</p>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>{issue.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LogsTab() {
  const { data: logRes, isLoading, isError } = useLogAnalysis();
  const logs = logRes?.success ? logRes.data : null;

  if (isLoading) return <AgentLoadingState label="Analyzing log patterns..." />;
  if (isError || !logs) return <AgentErrorState label="Log analysis unavailable" />;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Errors (1h)', value: logs.errorCount, color: '#DC2626', icon: AlertTriangle },
          { label: 'Warnings (1h)', value: logs.warnCount, color: '#D97706', icon: AlertTriangle },
          { label: 'Patterns', value: logs.patterns?.length || 0, color: '#6366f1', icon: FileText },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-4" style={{ background: '#ffffff', border: `1px solid ${item.color}30`, backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg" style={{ background: `${item.color}15` }}>
                <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
              </div>
              <span className="text-[10px] font-mono uppercase" style={{ color: '#94a3b8' }}>{item.label}</span>
            </div>
            <p className="text-2xl font-display font-bold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      {logs.aiAnalysis && logs.aiAnalysis !== 'AI analysis unavailable' && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: '#6366f1' }}>
            <Brain className="w-3 h-3" /> AI Log Analysis
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#6366f1' }}>{logs.aiAnalysis}</p>
        </div>
      )}

      {/* Error Patterns */}
      {logs.patterns?.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <TrendingUp className="w-4 h-4" style={{ color: '#DC2626' }} />
              Error Patterns
            </span>
          </div>
          <div>
            {logs.patterns.slice(0, 10).map((p: any, i: number) => (
              <div key={i} className="px-5 py-3" style={{ borderBottom: i < Math.min(logs.patterns.length, 10) - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <SeverityBadge severity={p.severity === 'error' ? 'critical' : 'warning'} />
                  <span className="text-xs font-mono font-bold" style={{ color: '#0f172a' }}>{p.count}x</span>
                </div>
                <p className="text-xs font-mono break-all leading-relaxed" style={{ color: '#6366f1' }}>{p.sample}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Issues */}
      {logs.issues?.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <Zap className="w-4 h-4" style={{ color: '#D97706' }} />
              AI-Detected Issues
            </span>
          </div>
          <div>
            {logs.issues.map((issue: any, i: number) => (
              <div key={i} className="px-5 py-3" style={{ borderBottom: i < logs.issues.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none' }}>
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={issue.severity} />
                  <span className="text-xs font-medium" style={{ color: '#0f172a' }}>{issue.title}</span>
                </div>
                <p className="text-[11px] mb-1" style={{ color: '#64748b' }}>{issue.description}</p>
                {issue.suggestedFix && (
                  <p className="text-[11px] font-mono" style={{ color: '#059669' }}>Fix: {issue.suggestedFix}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {logs.tips?.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <Lightbulb className="w-4 h-4" style={{ color: '#D97706' }} />
              Recommendations
            </span>
          </div>
          <div>
            {logs.tips.map((tip: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-start gap-2"
                style={{ borderBottom: i < logs.tips.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none' }}>
                <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: '#0f172a' }}>{tip.title}</p>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>{tip.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TipsTab() {
  const { data: tipsRes, isLoading, isError } = useAITips();
  const tips = tipsRes?.success ? tipsRes.data : null;

  if (isLoading) return <AgentLoadingState label="Correlating all data sources..." />;
  if (isError || !tips) return <AgentErrorState label="Tips analysis unavailable" />;

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
          <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Shield className="w-4 h-4" style={{ color: '#6366f1' }} />
            Overall Infrastructure Health
          </span>
          <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>
            Updated {new Date(tips.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-8 mb-5">
            <HealthScoreGauge score={tips.overallScore} size="lg" />
            <div className="flex-1">
              <p className="text-lg font-display font-bold mb-1"
                style={{ color: tips.status === 'healthy' ? '#059669' : tips.status === 'warning' ? '#D97706' : '#DC2626' }}>
                {tips.status === 'healthy' ? 'All Systems Healthy' : tips.status === 'warning' ? 'Some Issues Detected' : 'Critical Issues Found'}
              </p>

              {/* Data Sources */}
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(tips.sources || {}).map(([key, val]: [string, any]) => (
                  <div key={key} className="px-2.5 py-1 rounded-md text-[10px] font-mono"
                    style={val.available
                      ? { background: 'rgba(5,150,105,0.10)', border: '1px solid rgba(5,150,105,0.25)', color: '#059669' }
                      : { background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', color: '#94a3b8' }
                    }>
                    {key}: {val.available ? 'OK' : 'N/A'}
                    {val.count !== undefined && ` (${val.count})`}
                    {val.p1p2Count !== undefined && ` (${val.p1p2Count} P1/P2)`}
                  </div>
                ))}
              </div>

              {tips.correlations && (
                <div className="p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: '#6366f1' }}>
                    <Brain className="w-3 h-3" /> Cross-Source Correlations
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#6366f1' }}>{tips.correlations}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column: Issues + Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />
              Top Issues
            </span>
          </div>
          <div>
            {(tips.issues || []).length > 0 ? tips.issues.map((issue: any, i: number) => {
              const sourceColors: Record<string, { bg: string; color: string }> = {
                cluster:  { bg: 'rgba(99,102,241,0.10)', color: '#6366f1' },
                database: { bg: 'rgba(168,85,247,0.10)', color: '#a855f7' },
                logs:     { bg: 'rgba(217,119,6,0.10)',  color: '#D97706' },
              };
              const sc = sourceColors[issue.source] || { bg: 'rgba(99,102,241,0.04)', color: '#64748b' };
              return (
                <div key={i} className="px-5 py-3" style={{ borderBottom: i < tips.issues.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={issue.severity} />
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: sc.bg, color: sc.color }}>
                      {issue.source}
                    </span>
                  </div>
                  <p className="text-xs font-medium" style={{ color: '#0f172a' }}>{issue.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{issue.description}</p>
                </div>
              );
            }) : (
              <div className="p-5 text-center text-sm" style={{ color: '#94a3b8' }}>No issues detected</div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
            <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <Lightbulb className="w-4 h-4" style={{ color: '#D97706' }} />
              Actionable Tips
            </span>
          </div>
          <div>
            {(tips.tips || []).length > 0 ? tips.tips.map((tip: any, i: number) => (
              <div key={i} className="px-5 py-3" style={{ borderBottom: i < tips.tips.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none' }}>
                <div className="flex items-center gap-2 mb-1">
                  <PriorityBadge priority={tip.priority} />
                </div>
                <p className="text-xs font-medium" style={{ color: '#0f172a' }}>{tip.title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{tip.action}</p>
                {tip.impact && <p className="text-[10px] font-mono mt-1" style={{ color: '#059669' }}>Impact: {tip.impact}</p>}
              </div>
            )) : (
              <div className="p-5 text-center text-sm" style={{ color: '#94a3b8' }}>No tips at this time</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================
   MAIN COMPONENT
   ==================================================================== */

type AgentTab = 'infrastructure' | 'database' | 'logs' | 'tips';

export default function AIInsightsDashboard() {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'assistant'; text: string; timestamp: string }[]>([]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [agentTab, setAgentTab] = useState<AgentTab>('tips');

  // ── API Queries ──

  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['ai-stats'],
    queryFn: async () => {
      const { data } = await api.get('/ai/stats');
      return data;
    },
    retry: 1,
    staleTime: 60_000,
  });

  const { data: classificationsResponse, isLoading: classificationsLoading } = useQuery({
    queryKey: ['ai-classifications'],
    queryFn: async () => {
      const { data } = await api.get('/ai/classifications');
      return data;
    },
    retry: 1,
    staleTime: 60_000,
  });

  const { data: suggestionsResponse, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: async () => {
      const { data } = await api.get('/ai/suggestions');
      return data;
    },
    retry: 1,
    staleTime: 60_000,
  });

  // Resolve data
  const stats = statsResponse?.success ? statsResponse.data : { incidentsClassified: 0, avgConfidence: 0, resolutionsSuggested: 0, similarMatches: 0 };
  const classifications = classificationsResponse?.success ? classificationsResponse.data : [];
  const suggestions = suggestionsResponse?.success ? suggestionsResponse.data : [];

  const accuracy = statsResponse?.success && statsResponse.data?.accuracy
    ? statsResponse.data.accuracy
    : { accepted: 0, rejected: 0, pending: 0 };

  const topCategories = statsResponse?.success && statsResponse.data?.topCategories
    ? statsResponse.data.topCategories
    : [];

  const models = statsResponse?.success && statsResponse.data?.models
    ? statsResponse.data.models
    : [];

  const maxCategoryCount = Math.max(...topCategories.map((c: { count: number }) => c.count), 1);

  // ── Chat handler ──

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);

    try {
      const { data } = await api.post('/ai/chat', { message: text });
      const reply = data?.data?.reply || data?.data?.message || 'I analyzed the request but could not generate a detailed response. Please try rephrasing your question.';
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant' as const,
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant' as const,
          text: 'AI service is currently unavailable. The Ollama models may be loading or the AI backend is not connected. Please try again shortly.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  // ── Vote handler ──
  const [votes, setVotes] = useState<Record<string, 'up' | 'down' | null>>({});

  const handleVote = (suggestionId: string, direction: 'up' | 'down') => {
    setVotes((prev) => ({
      ...prev,
      [suggestionId]: prev[suggestionId] === direction ? null : direction,
    }));
  };

  const agentTabs: { key: AgentTab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
    { key: 'tips', label: 'Tips & Health', icon: Zap },
    { key: 'infrastructure', label: 'Infrastructure', icon: Server },
    { key: 'database', label: 'Database', icon: Database },
    { key: 'logs', label: 'Logs', icon: FileText },
  ];

  return (
    <div className="animate-fade-in relative -m-6 p-6 min-h-screen"
      style={{ background: '#F8FAFC' }}>

      <div className="relative space-y-0">

      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5"
        style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #9333EA, #A855F7, #C084FC, transparent)' }} />
        <div className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Ambient glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4"
          style={{ background: 'rgba(147,51,234,0.35)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full translate-y-1/3 -translate-x-1/4"
          style={{ background: 'rgba(126,34,206,0.25)', filter: 'blur(60px)' }} />
        <div className="relative px-6 pt-5 pb-14">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Brain size={16} style={{ color: '#C084FC' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>AIOps Insights</h1>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>AI</span>
              </div>
              <p className="text-sm ml-[42px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                AI-powered analysis and recommendations
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#6ee7b7' }}>
              <Activity className="w-3.5 h-3.5" />
              <span className="font-mono">AI Engine: Online</span>
            </div>
          </div>

          {/* KPI stat cards inside hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="backdrop-blur-sm rounded-xl p-4 animate-pulse h-20"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
              ))
            ) : (
              <>
                <div className="backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:shadow-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Classified</p>
                  <p className="font-display text-2xl font-extrabold" style={{ color: '#ffffff' }}>{stats.incidentsClassified?.toLocaleString() ?? '0'}</p>
                </div>
                <div className="backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:shadow-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Confidence</p>
                  <p className="font-display text-2xl font-extrabold" style={{ color: '#ffffff' }}>{stats.avgConfidence?.toFixed(1) ?? '0'}%</p>
                </div>
                <div className="backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:shadow-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Suggestions</p>
                  <p className="font-display text-2xl font-extrabold" style={{ color: '#ffffff' }}>{stats.resolutionsSuggested?.toLocaleString() ?? '0'}</p>
                </div>
                <div className="backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:shadow-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Matches</p>
                  <p className="font-display text-2xl font-extrabold" style={{ color: '#ffffff' }}>{stats.similarMatches?.toLocaleString() ?? '0'}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="h-0.5 -mt-5 mb-4" style={{ background: 'linear-gradient(90deg, #9333EA, #A855F7, #C084FC, transparent)' }} />

      {/* ── KPI Row (4 cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-xl" style={{ background: 'rgba(99,102,241,0.12)' }} />
              </div>
              <div className="h-7 w-20 rounded mt-1" style={{ background: 'rgba(99,102,241,0.12)' }} />
              <div className="h-4 w-28 rounded mt-2" style={{ background: 'rgba(99,102,241,0.06)' }} />
            </div>
          ))
        ) : (
          <>
            <StatsCard icon={CheckCircle} label="Incidents Classified" value={stats.incidentsClassified?.toLocaleString() ?? '0'} color="signal" />
            <StatsCard icon={Target} label="Avg Confidence" value={`${stats.avgConfidence?.toFixed(1) ?? '0'}%`} color="emerald" />
            <StatsCard icon={Lightbulb} label="Resolutions Suggested" value={stats.resolutionsSuggested?.toLocaleString() ?? '0'} color="violet" />
            <StatsCard icon={GitCompare} label="Similar Matches" value={stats.similarMatches?.toLocaleString() ?? '0'} color="amber" />
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          AI AGENT — Live Infrastructure Intelligence
          ══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl overflow-hidden mt-6" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.06)' }}>
          <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Zap className="w-4 h-4" style={{ color: '#6366f1' }} />
            AI Agent — Live Infrastructure Intelligence
          </span>
          <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: '#6366f1' }}>
            <RefreshCw className="w-3 h-3" />
            Auto-refresh
          </span>
        </div>

        {/* Agent Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.02)' }}>
          {agentTabs.map(({ key, label, icon: TabIcon }) => (
            <button
              key={key}
              onClick={() => setAgentTab(key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2"
              style={
                agentTab === key
                  ? { borderColor: '#6366f1', color: '#6366f1', background: 'rgba(99,102,241,0.06)' }
                  : { borderColor: 'transparent', color: '#94a3b8' }
              }
              onMouseEnter={e => { if (agentTab !== key) e.currentTarget.style.color = '#6366f1'; }}
              onMouseLeave={e => { if (agentTab !== key) e.currentTarget.style.color = '#94a3b8'; }}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {agentTab === 'infrastructure' && <InfrastructureTab />}
          {agentTab === 'database' && <DatabaseTab />}
          {agentTab === 'logs' && <LogsTab />}
          {agentTab === 'tips' && <TipsTab />}
        </div>
      </div>

      {/* ── Main Grid: LEFT (2/3) + RIGHT (1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mt-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* AI Classification Activity */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
                <Brain className="w-4 h-4" style={{ color: '#6366f1' }} />
                AI Classification Activity
              </span>
              <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                {classifications.length} recent
              </span>
            </div>

            {classificationsLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: '#6366f1' }} />
                <p className="font-medium text-sm" style={{ color: '#64748b' }}>Loading classifications...</p>
              </div>
            ) : classifications.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: '#94a3b8' }}>No data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                      {['Incident', 'Category', 'Confidence', 'Status'].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-wider uppercase"
                          style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classifications.map((item: any) => (
                      <tr key={item.id} className="transition-colors"
                        style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs font-semibold" style={{ color: '#6366f1' }}>
                            {item.incidentNumber}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div>
                            <span className="text-xs font-medium" style={{ color: '#0f172a' }}>{item.category}</span>
                            {item.subcategory && (
                              <span className="text-[10px] ml-1.5" style={{ color: '#94a3b8' }}>/ {item.subcategory}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <ConfidenceBar value={item.confidence} />
                        </td>
                        <td className="px-4 py-2.5">
                          <ClassificationStatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Resolution Suggestions */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
                <Lightbulb className="w-4 h-4" style={{ color: '#a855f7' }} />
                Resolution Suggestions
              </span>
              <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                AI-generated root cause analysis
              </span>
            </div>

            {suggestionsLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: '#6366f1' }} />
                <p className="font-medium text-sm" style={{ color: '#64748b' }}>Loading suggestions...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: '#94a3b8' }}>No data available</p>
            ) : (
              <div>
                {suggestions.map((item: any, idx: number) => (
                  <div key={item.id} className="px-5 py-4 transition-colors"
                    style={{ borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-mono text-xs font-semibold flex items-center gap-1" style={{ color: '#6366f1' }}>
                            <ExternalLink className="w-3 h-3" />
                            {item.incidentNumber}
                          </span>
                          <span className="text-xs font-medium truncate" style={{ color: '#0f172a' }}>
                            {item.title}
                          </span>
                        </div>

                        <div className="mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>
                            Root Cause
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#6366f1' }}>
                            {item.rootCause}
                          </p>
                        </div>

                        <div className="mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>
                            Suggested Action
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#6366f1' }}>
                            {item.suggestedAction}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          <ConfidenceBar value={item.confidence} />
                          <span className="text-[10px]" style={{ color: '#94a3b8' }}>confidence</span>
                        </div>
                      </div>

                      {/* Vote buttons */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
                        <button
                          onClick={() => handleVote(item.id, 'up')}
                          className="p-1.5 rounded-lg transition-all"
                          style={votes[item.id] === 'up'
                            ? { border: '1px solid rgba(5,150,105,0.30)', background: 'rgba(5,150,105,0.10)', color: '#059669' }
                            : { border: '1px solid rgba(99,102,241,0.12)', color: '#94a3b8' }
                          }
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                          {(item.votes?.up ?? 0) + (votes[item.id] === 'up' ? 1 : 0)}
                        </span>
                        <button
                          onClick={() => handleVote(item.id, 'down')}
                          className="p-1.5 rounded-lg transition-all"
                          style={votes[item.id] === 'down'
                            ? { border: '1px solid rgba(220,38,38,0.30)', background: 'rgba(220,38,38,0.10)', color: '#DC2626' }
                            : { border: '1px solid rgba(99,102,241,0.12)', color: '#94a3b8' }
                          }
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                          {(item.votes?.down ?? 0) + (votes[item.id] === 'down' ? 1 : 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* Classification Accuracy */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
                <Target className="w-4 h-4" style={{ color: '#059669' }} />
                Classification Accuracy
              </span>
            </div>
            <div className="px-5 py-5">
              <DonutStat accepted={accuracy.accepted} rejected={accuracy.rejected} pending={accuracy.pending} />
            </div>
          </div>

          {/* Top Categories */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
                <CheckCircle className="w-4 h-4" style={{ color: '#6366f1' }} />
                Top AI Categories
              </span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {topCategories.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: '#94a3b8' }}>No data available</p>
              ) : (
                topCategories.map((cat: any, idx: number) => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="w-3 text-[10px] font-mono text-right" style={{ color: '#94a3b8' }}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate" style={{ color: '#0f172a' }}>{cat.category}</span>
                        <span className="text-[11px] font-mono font-semibold" style={{ color: '#64748b' }}>{cat.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.12)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(cat.count / maxCategoryCount) * 100}%`, background: '#6366f1' }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Model Status */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
                <Bot className="w-4 h-4" style={{ color: '#a855f7' }} />
                AI Model Status
              </span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {models.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: '#94a3b8' }}>No data available</p>
              ) : (
                models.map((model: any) => {
                  const isOnline = model.status === 'online' || model.status === 'active';
                  return (
                  <div key={model.name} className="p-3 rounded-lg transition-all"
                    style={isOnline
                      ? { border: '1px solid rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.06)' }
                      : { border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.06)' }
                    }>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-display font-bold" style={{ color: '#0f172a' }}>{model.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={clsx('w-2 h-2 rounded-full', isOnline && 'animate-pulse')}
                          style={{ background: isOnline ? '#059669' : '#DC2626' }} />
                        <span className="text-[10px] font-mono font-semibold"
                          style={{ color: isOnline ? '#059669' : '#DC2626' }}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] mb-2" style={{ color: '#94a3b8' }}>{model.purpose}</p>
                    <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: '#64748b' }}>
                      <span>{model.gpu}</span>
                      <span style={{ color: '#94a3b8' }}>|</span>
                      <span>{model.vram}</span>
                      <span style={{ color: '#94a3b8' }}>|</span>
                      <span>{model.latency} avg</span>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: AI Chat ── */}
      <div className="rounded-2xl overflow-hidden mt-6" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
          <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Brain className="w-4 h-4" style={{ color: '#6366f1' }} />
            AI Assistant
          </span>
          <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: '#059669' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#059669' }} />
            Online
          </span>
        </div>

        {/* Chat messages */}
        <div className="px-5 py-4 max-h-[360px] overflow-y-auto space-y-3">
          {chatMessages.length === 0 && !isSending && (
            <p className="text-sm py-6 text-center" style={{ color: '#94a3b8' }}>No data available</p>
          )}
          {chatMessages.slice(-6).map((msg) => (
            <div key={msg.id} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <Brain className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
                  </div>
                </div>
              )}
              <div className="max-w-[80%] rounded-xl px-4 py-2.5"
                style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF' }
                  : { background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#6366f1' }
                }>
                <p className="text-xs leading-relaxed whitespace-pre-wrap"
                  style={{ color: msg.role === 'user' ? '#FFFFFF' : '#6366f1' }}>
                  {msg.text}
                </p>
                <p className="text-[9px] mt-1.5 font-mono"
                  style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>
                  {msg.timestamp}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <User className="w-3.5 h-3.5" style={{ color: '#64748b' }} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <Brain className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
                </div>
              </div>
              <div className="rounded-xl px-4 py-2.5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#6366f1' }} />
                  <span className="text-xs" style={{ color: '#94a3b8' }}>Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.02)' }}>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI about incidents..."
              disabled={isSending}
              className="flex-1 text-sm py-2 px-3 rounded-xl focus:outline-none disabled:opacity-50"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}
            />
            <button
              onClick={handleSendChat}
              disabled={isSending || !chatInput.trim()}
              className="px-4 py-2 text-sm rounded-xl flex items-center gap-2 font-semibold disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(99,102,241,0.5)' }}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-3 text-[11px]" style={{ color: '#94a3b8' }}>
        AI Insights powered by OpenAI GPT-4o — AI Agent correlates Prometheus, PostgreSQL, Loki & Service Desk data
        <br />
        <span className="font-mono text-[10px]">Models auto-classify incidents, suggest resolutions, and detect infrastructure patterns</span>
      </div>
      </div>{/* /relative space-y-0 */}
    </div>
  );
}
