import { useState, useMemo } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import {
  Bell,
  Zap,
  AlertTriangle,
  Shield,
  CheckCircle,
  VolumeX,
  Plus,
  Search,
  Filter,
  Loader2,
  LayoutDashboard,
} from 'lucide-react';
import { useAlerts, useAcknowledgeAlert, useSilenceAlert, useCreateIncidentFromAlert, useAlertStats } from '../../hooks/useAlerts';

// ── Types ──

type Severity = 'CRITICAL' | 'WARNING' | 'INFO';
type AlertStatus = 'FIRING' | 'RESOLVED' | 'ACKNOWLEDGED' | 'SILENCED';
type AlertSource = 'PROMETHEUS' | 'GRAFANA' | 'CUSTOM';

interface Alert {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  source: AlertSource;
  ciName: string;
  firedAt: string;
  firedAtTs: number;
  resolvedAt?: string;
}

// ── Subcomponents ──

function LivePulse({ color = 'violet' }: { color?: string }) {
  const colorMap: Record<string, string> = {
    violet: '#6366f1',
    crimson: '#EF4444',
    amber: '#F59E0B',
    emerald: '#059669',
  };
  const c = colorMap[color] || colorMap.violet;
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: c }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: c }}
      />
    </span>
  );
}

function SeverityIndicator({ severity }: { severity: Severity }) {
  if (severity === 'CRITICAL') return <LivePulse color="crimson" />;
  if (severity === 'WARNING') {
    return (
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#F59E0B' }} />
      </span>
    );
  }
  return (
    <span className="relative flex h-2 w-2">
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#6366f1' }} />
    </span>
  );
}

function SourceBadge({ source }: { source: AlertSource }) {
  const styles: Record<AlertSource, React.CSSProperties> = {
    PROMETHEUS: { background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
    GRAFANA: { background: 'rgba(245,158,11,0.15)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' },
    CUSTOM: { background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' },
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md" style={styles[source]}>
      {source}
    </span>
  );
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const styles: Record<AlertStatus, React.CSSProperties> = {
    FIRING: { background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' },
    RESOLVED: { background: 'rgba(5,150,105,0.15)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)' },
    ACKNOWLEDGED: { background: 'rgba(245,158,11,0.12)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' },
    SILENCED: { background: 'rgba(99,102,241,0.06)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)' },
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md" style={styles[status]}>
      {status}
    </span>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  color,
  pulse,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  pulse?: boolean;
}) {
  const iconColors: Record<string, string> = {
    violet: '#6366f1',
    crimson: '#FCA5A5',
    amber: '#FCD34D',
    emerald: '#6EE7B7',
  };
  const borderColors: Record<string, string> = {
    violet: 'rgba(99,102,241,0.2)',
    crimson: 'rgba(239,68,68,0.3)',
    amber: 'rgba(245,158,11,0.3)',
    emerald: 'rgba(5,150,105,0.3)',
  };
  const iconColor = iconColors[color] || iconColors.violet;
  const borderColor = borderColors[color] || borderColors.violet;

  return (
    <div className="p-4 rounded-xl transition-all duration-300" style={{ background: 'rgba(99,102,241,0.04)', border: `1px solid ${borderColor}` }}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)' }}>
          <span style={{ color: iconColor }}><Icon className="w-4 h-4" /></span>
        </div>
        {pulse && <LivePulse color={color} />}
      </div>
      <p className="text-2xl font-display font-bold tracking-tight" style={{ color: '#0f172a' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{label}</p>
    </div>
  );
}

// ── Main Component ──

export default function AlertList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<AlertSource | 'ALL'>('ALL');

  // Build filters for backend query
  const queryFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (severityFilter !== 'ALL') f.severity = severityFilter;
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (sourceFilter !== 'ALL') f.source = sourceFilter;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [severityFilter, statusFilter, sourceFilter, searchQuery]);

  // API hooks
  const { data: alertsResponse, isLoading: alertsLoading } = useAlerts(queryFilters);
  const { data: statsResponse } = useAlertStats();
  const acknowledgeAlert = useAcknowledgeAlert();
  const silenceAlert = useSilenceAlert();
  const createIncident = useCreateIncidentFromAlert();
  const navigate = useNavigate();

  // Extract alerts array from backend response shape: { success, data, pagination }
  const alerts: Alert[] = alertsResponse?.data ?? [];

  // Stats from dedicated endpoint, with safe fallbacks
  const stats = {
    criticalFiring: statsResponse?.data?.criticalFiring ?? 0,
    warningFiring: statsResponse?.data?.warningFiring ?? 0,
    resolved24h: statsResponse?.data?.resolved24h ?? 0,
    totalActive: statsResponse?.data?.totalActive ?? 0,
  };

  // Client-side sort: severity rank (CRITICAL first), then firedAt descending
  const sortedAlerts = useMemo(() => {
    const sorted = [...alerts];
    const sevRank: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    sorted.sort((a, b) => {
      const sevDiff = (sevRank[a.severity] ?? 2) - (sevRank[b.severity] ?? 2);
      if (sevDiff !== 0) return sevDiff;
      return (b.firedAtTs ?? 0) - (a.firedAtTs ?? 0);
    });
    return sorted;
  }, [alerts]);

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert.mutateAsync(id);
      toast.success('Alert acknowledged');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to acknowledge alert');
    }
  };

  const handleSilence = async (id: string) => {
    try {
      await silenceAlert.mutateAsync(id);
      toast.success('Alert silenced for 60 minutes');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to silence alert');
    }
  };

  const handleCreateIncident = async (id: string) => {
    try {
      const res = await createIncident.mutateAsync(id);
      toast.success('Incident created');
      navigate(`/incidents/${res.data?.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to create incident');
    }
  };

  // Compute KPI counts from alerts data
  const totalAlerts = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;
  const infoCount = alerts.filter((a) => a.severity === 'INFO').length;
  const firingCount = alerts.filter((a) => a.status === 'FIRING').length;

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* ── DARK HERO SECTION ── */}
      <div className="relative rounded-2xl overflow-hidden mb-0" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* Dot-grid texture overlay */}
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Ambient glow blobs — crimson/red */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/6 w-[400px] h-[250px] rounded-full blur-[80px] translate-y-1/3 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.20) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] rounded-full blur-[90px] translate-x-1/3 -translate-y-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(252,165,165,0.15) 0%, transparent 70%)' }} />

        <div className="relative px-6 pt-6 pb-8">
          {/* Top row: title + quick action */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.20)', border: '1px solid rgba(220,38,38,0.35)' }}>
                  <Zap size={20} style={{ color: '#DC2626' }} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>Event Management</h1>
                  <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Real-time alert monitoring, triage, and escalation
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#E2E8F0' }}
            >
              <LayoutDashboard size={15} />
              View Dashboard
            </button>
          </div>

          {/* KPI pills */}
          <div className="flex flex-wrap items-center gap-2.5 mt-6">
            {[
              { label: 'Total Alerts', value: totalAlerts, bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', color: '#FFFFFF' },
              { label: 'Critical', value: criticalCount, bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.35)', color: '#FCA5A5' },
              { label: 'Warning', value: warningCount, bg: 'rgba(217,119,6,0.15)', border: 'rgba(217,119,6,0.35)', color: '#FCD34D' },
              { label: 'Info', value: infoCount, bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.35)', color: '#A5B4FC' },
              { label: 'Firing', value: firingCount, bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.40)', color: '#FCA5A5' },
            ].map((pill) => (
              <div
                key={pill.label}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg backdrop-blur-sm"
                style={{ background: pill.bg, border: `1px solid ${pill.border}` }}
              >
                <span className="text-[11px] font-body font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>{pill.label}</span>
                <span className="font-display text-lg font-extrabold" style={{ color: pill.color }}>{pill.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient accent line separator */}
      <div className="h-[3px] rounded-b-2xl" style={{ background: 'linear-gradient(90deg, #DC2626, #EF4444, #FCA5A5, transparent)' }} />

      {/* ── FILTER BAR ── */}
      <div className="-mt-3 relative z-10 rounded-xl p-3 mb-4" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(8px)' }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
            <Filter size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Filters</span>
          </div>

          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as Severity | 'ALL')} className="rounded-lg text-sm px-3 py-1.5 focus:outline-none" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}>
            <option value="ALL" style={{ background: '#ffffff' }}>All Severities</option>
            <option value="CRITICAL" style={{ background: '#ffffff' }}>Critical</option>
            <option value="WARNING" style={{ background: '#ffffff' }}>Warning</option>
            <option value="INFO" style={{ background: '#ffffff' }}>Info</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'ALL')} className="rounded-lg text-sm px-3 py-1.5 focus:outline-none" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}>
            <option value="ALL" style={{ background: '#ffffff' }}>All Statuses</option>
            <option value="FIRING" style={{ background: '#ffffff' }}>Firing</option>
            <option value="RESOLVED" style={{ background: '#ffffff' }}>Resolved</option>
            <option value="ACKNOWLEDGED" style={{ background: '#ffffff' }}>Acknowledged</option>
            <option value="SILENCED" style={{ background: '#ffffff' }}>Silenced</option>
          </select>

          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as AlertSource | 'ALL')} className="rounded-lg text-sm px-3 py-1.5 focus:outline-none" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}>
            <option value="ALL" style={{ background: '#ffffff' }}>All Sources</option>
            <option value="PROMETHEUS" style={{ background: '#ffffff' }}>Prometheus</option>
            <option value="GRAFANA" style={{ background: '#ffffff' }}>Grafana</option>
            <option value="CUSTOM" style={{ background: '#ffffff' }}>Custom</option>
          </select>

          <div className="w-px h-7 hidden sm:block" style={{ background: 'rgba(99,102,241,0.08)' }} />

          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search alerts by name, description, or CI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {alertsLoading && (
        <div className="rounded-xl p-12 text-center mt-4" style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: '#6366f1' }} />
          <p className="font-medium" style={{ color: '#64748b' }}>Loading alerts...</p>
        </div>
      )}

      {/* Alert Cards */}
      {!alertsLoading && (
        <div className="space-y-3 mt-4">
          {sortedAlerts.length === 0 && (
            <div className="rounded-xl p-12 text-center" style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
              <p className="font-medium" style={{ color: '#64748b' }}>No alerts match your filters</p>
              <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Adjust filters or search criteria</p>
            </div>
          )}

          {sortedAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';
            const isResolved = alert.status === 'RESOLVED';
            const cardBorder = isCritical ? 'rgba(239,68,68,0.3)' : isWarning ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.08)';
            const cardBg = isCritical ? 'rgba(239,68,68,0.08)' : isWarning ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.03)';

            return (
              <div
                key={alert.id}
                className="p-5 rounded-xl transition-all duration-300 group cursor-pointer hover:shadow-md"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, opacity: isResolved ? 0.7 : 1 }}
                onClick={() => navigate(`/alerts/${alert.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1.5 flex-shrink-0">
                    <SeverityIndicator severity={alert.severity} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-display font-bold truncate" style={{ color: '#0f172a' }}>
                            {alert.name}
                          </h3>
                          <StatusBadge status={alert.status} />
                        </div>
                        <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: '#64748b' }}>
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <SourceBadge source={alert.source} />
                          <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: '#94a3b8' }}>
                            <span style={{ color: '#cbd5e1' }}>CI:</span> {alert.ciName}
                          </span>
                          <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: '#94a3b8' }}>
                            <span style={{ color: '#cbd5e1' }}>Fired:</span> {alert.firedAt}
                          </span>
                          {alert.resolvedAt && (
                            <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: '#059669' }}>
                              <span style={{ color: '#cbd5e1' }}>Resolved:</span> {alert.resolvedAt}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isResolved && (
                        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledgeAlert.isPending}
                            className="px-2.5 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50 rounded-lg transition-colors"
                            style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}
                            title="Acknowledge"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Acknowledge</span>
                          </button>
                          <button
                            onClick={() => handleSilence(alert.id)}
                            disabled={silenceAlert.isPending}
                            className="px-2.5 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50 rounded-lg transition-colors"
                            style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}
                            title="Silence"
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Silence</span>
                          </button>
                          <button
                            onClick={() => handleCreateIncident(alert.id)}
                            disabled={createIncident.isPending}
                            className="px-2.5 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50 rounded-lg font-semibold transition-colors"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#0f172a' }}
                            title="Create Incident"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Incident</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
