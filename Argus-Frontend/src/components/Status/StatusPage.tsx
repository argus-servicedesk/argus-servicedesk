import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, ExternalLink, Clock, Server, Database, Layers, Box } from 'lucide-react';
import { clsx } from 'clsx';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Component { id: string; name: string; type: string; status: string; firingCount: number; }
interface Incident { id: string; number: string; title: string; priority: string; state: string; createdAt: string; durationMinutes: number; }
interface DayHistory { date: string; status: string; criticalCount: number; warningCount: number; totalAlerts: number; }
interface StatusData {
  org: { name: string; slug: string; fqdn: string | null; environment: string };
  overallStatus: string;
  uptimePercent: string;
  components: Component[];
  activeIncidents: Incident[];
  dayHistory: DayHistory[];
  lastUpdated: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  operational:  { label: 'Operational',         color: '#10B981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)' },
  degraded:     { label: 'Partial Outage',       color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  down:         { label: 'Service Disruption',   color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)' },
  maintenance:  { label: 'Under Maintenance',    color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)' },
  outage:       { label: 'Outage',               color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)' },
};

const OVERALL_CONFIG = {
  operational: {
    label: 'All Systems Operational',
    sub: 'All services are running normally.',
    color: '#10B981',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdf4 100%)',
    pulse: '#10B981',
  },
  degraded: {
    label: 'Partial Service Disruption',
    sub: 'Some services are experiencing issues.',
    color: '#F59E0B',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)',
    pulse: '#F59E0B',
  },
  major_outage: {
    label: 'Major Service Outage',
    sub: 'Critical services are currently unavailable.',
    color: '#EF4444',
    bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fef2f2 100%)',
    pulse: '#EF4444',
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: '#EF4444', P2: '#F97316', P3: '#F59E0B', P4: '#6366f1',
};

const TYPE_ICON: Record<string, any> = {
  APPLICATION: Box, DATABASE: Database, K8S_CLUSTER: Layers, SERVER: Server,
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Uptime Bar Tooltip ────────────────────────────────────────────────────────
function UptimeBar({ day }: { day: DayHistory }) {
  const [hovered, setHovered] = useState(false);
  const cfg = STATUS_CONFIG[day.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.operational;
  const dateLabel = new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className="relative flex-1" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div
        className="h-8 rounded-sm cursor-default transition-opacity hover:opacity-80"
        style={{ backgroundColor: cfg.color }}
      />
      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none"
          style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
        >
          <div className="font-semibold">{dateLabel}</div>
          <div style={{ color: cfg.color }}>{cfg.label}</div>
          {day.totalAlerts > 0 && (
            <div style={{ color: '#64748b' }}>{day.criticalCount} critical · {day.warningCount} warning</div>
          )}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: '#e2e8f0' }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function StatusPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIn, setRefreshIn] = useState(60);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/v1/status/${orgSlug}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json.data);
      setRefreshIn(60);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshIn((prev) => {
        if (prev <= 1) { fetchStatus(); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#eef2ff' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1' }} />
        <p className="text-sm font-mono" style={{ color: '#94a3b8' }}>Loading status...</p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#eef2ff' }}>
      <div className="text-center">
        <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
        <h1 className="text-xl font-bold mb-2" style={{ color: '#0f172a' }}>Status Page Not Found</h1>
        <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>{error || `No status page for "${orgSlug}"`}</p>
        <Link to="/" className="text-sm hover:underline" style={{ color: '#6366f1' }}>← Back to Argus</Link>
      </div>
    </div>
  );

  const overall = OVERALL_CONFIG[data.overallStatus as keyof typeof OVERALL_CONFIG] || OVERALL_CONFIG.operational;

  return (
    <div className="min-h-screen" style={{ background: '#eef2ff', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Top nav ── */}
      <header style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#6366f1' }}>
              ◆
            </div>
            <div>
              <span className="font-bold text-sm" style={{ color: '#0f172a' }}>{data.org.name}</span>
              <span className="text-xs ml-2" style={{ color: '#94a3b8' }}>Status</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono hidden sm:block" style={{ color: '#94a3b8' }}>
              Refreshes in {refreshIn}s
            </span>
            <button
              onClick={fetchStatus}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: '#94a3b8' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <Link to="/login" className="text-xs hover:underline flex items-center gap-1" style={{ color: '#6366f1' }}>
              Sign in <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* ── Overall status hero ── */}
        <div className="rounded-2xl p-8 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
          {/* Dot grid */}
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px', opacity: 0.15 }} />
          {/* Glow blobs */}
          <div className="absolute top-0 right-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(16,185,129,0.3)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'rgba(52,211,153,0.25)', filter: 'blur(60px)' }} />
          <div className="relative">
            {/* Pulse dot */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="w-5 h-5 rounded-full" style={{ background: overall.pulse }} />
                {data.overallStatus === 'operational' && (
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: overall.pulse, opacity: 0.4 }} />
                )}
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>{overall.label}</h1>
            <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.6)' }}>{overall.sub}</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.12)' }}>
              {data.uptimePercent}% uptime · last 30 days
            </div>
          </div>
          {/* Accent divider */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #6ee7b7, #a7f3d0, #d1fae5, transparent)' }} />
        </div>

        {/* ── Active incidents (only if any) ── */}
        {(data.activeIncidents || []).length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#64748b' }}>
              <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
              Active Incidents
            </h2>
            <div className="space-y-3">
              {(data.activeIncidents || []).map((inc) => (
                <div key={inc.id} className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', borderLeft: `3px solid ${PRIORITY_COLORS[inc.priority] || '#6366f1'}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold font-mono" style={{ color: PRIORITY_COLORS[inc.priority] || '#6366f1' }}>
                          {inc.priority}
                        </span>
                        <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{inc.number}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                          style={{ background: 'rgba(245,158,11,0.08)', color: '#D97706', border: '1px solid rgba(245,158,11,0.15)' }}>
                          {inc.state.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{inc.title}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs" style={{ color: '#94a3b8' }}>
                        <Clock className="w-3 h-3" />
                        {formatDuration(inc.durationMinutes)}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: '#cbd5e1' }}>{relativeTime(inc.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Component status ── */}
        {(data.components || []).length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>
              Services &amp; Components
            </h2>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.12)' }}>
              {(data.components || []).map((comp, idx) => {
                const cfg = STATUS_CONFIG[comp.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.operational;
                const Icon = TYPE_ICON[comp.type] || Box;
                return (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between px-5 py-4"
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: idx < (data.components || []).length - 1 ? '1px solid #e2e8f0' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
                      <div>
                        <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{comp.name}</span>
                        <span className="text-[10px] ml-2" style={{ color: '#94a3b8' }}>{comp.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {comp.firingCount > 0 && (
                        <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{comp.firingCount} alert{comp.firingCount !== 1 ? 's' : ''}</span>
                      )}
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No components message */}
        {(data.components || []).length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
            <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#10B981' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>All systems healthy. No components configured for display.</p>
          </div>
        )}

        {/* ── 30-day uptime history ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>30-Day History</h2>
            <span className="text-xs font-semibold" style={{ color: '#10B981' }}>{data.uptimePercent}% uptime</span>
          </div>

          <div className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
            <div className="flex items-end gap-0.5">
              {(data.dayHistory || []).map((day) => (
                <UptimeBar key={day.date} day={day} />
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px]" style={{ color: '#94a3b8' }}>30 days ago</span>
              <div className="flex items-center gap-4 text-[10px]" style={{ color: '#94a3b8' }}>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#10B981' }} />Operational</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#F59E0B' }} />Degraded</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#EF4444' }} />Outage</span>
              </div>
              <span className="text-[10px]" style={{ color: '#94a3b8' }}>Today</span>
            </div>
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-8 px-6" style={{ borderTop: '1px solid #e2e8f0' }}>
        <p className="text-xs" style={{ color: '#94a3b8' }}>
          Last updated {relativeTime(data.lastUpdated)} &nbsp;·&nbsp;
          Powered by{' '}
          <Link to="/" className="hover:underline" style={{ color: '#6366f1' }}>Argus Service Desk</Link>
          {data.org.fqdn && (
            <>
              {' '}·{' '}
              <a href={`https://${data.org.fqdn}`} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#6366f1' }}>
                {data.org.fqdn}
              </a>
            </>
          )}
        </p>
      </footer>
    </div>
  );
}
