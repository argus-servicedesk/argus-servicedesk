import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useGrafanaDashboards, useInfrastructureMetrics } from '../../hooks/useAIAgent';
import {
  Cpu, MemoryStick, HardDrive, Network, Server, Container,
  RefreshCw, Clock, ExternalLink, Loader2, AlertTriangle,
  CheckCircle2, XCircle, ArrowUpDown, Database, Activity,
  Gauge, Layers, MonitorDot, Unplug, Cable, RotateCcw,
} from 'lucide-react';

// ── Types ──
interface GrafanaPanel { id: number; title: string; type: string; gridPos: { x: number; y: number; w: number; h: number } }
interface GrafanaDashboard { uid: string; title: string; url: string; panels: GrafanaPanel[] }

const TABS = ['Overview', 'CPU & Memory', 'Virtualization', 'Storage & Volumes', 'Grafana Panels'] as const;
type Tab = typeof TABS[number];

const TIME_RANGES = [
  { label: '1h', value: 'now-1h' },
  { label: '6h', value: 'now-6h' },
  { label: '12h', value: 'now-12h' },
  { label: '24h', value: 'now-24h' },
  { label: '7d', value: 'now-7d' },
];

// ── Radial Gauge ──
function RadialGauge({ value, max = 100, label, sublabel, color, size = 120 }: {
  value: number; max?: number; label: string; sublabel?: string; color: string; size?: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const danger = pct > 85;
  const warn = pct > 70;
  const ringColor = danger ? '#EF4444' : warn ? '#F59E0B' : color;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(99,102,241,0.10)" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={ringColor} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold" style={{ color: '#0f172a' }}>{pct.toFixed(1)}%</span>
        {sublabel && <span className="text-[10px] font-mono mt-0.5" style={{ color: '#94a3b8' }}>{sublabel}</span>}
      </div>
      <span className="text-xs font-medium mt-2" style={{ color: '#64748b' }}>{label}</span>
    </div>
  );
}

// ── Status Pill ──
function StatusPill({ status }: { status: string }) {
  const getStyle = (s: string): React.CSSProperties => {
    if (['healthy', 'ready', 'Bound', 'Available', 'Running'].includes(s))
      return { background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' };
    if (['degraded', 'Pending'].includes(s))
      return { background: 'rgba(245,158,11,0.12)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' };
    if (['Released'].includes(s))
      return { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' };
    if (['down', 'Failed', 'critical'].includes(s))
      return { background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' };
    return { background: 'rgba(99,102,241,0.08)', color: '#64748b', border: '1px solid rgba(99,102,241,0.2)' };
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={getStyle(status)}>
      {status}
    </span>
  );
}

// ── Stat Card ──
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<any>; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-3.5 transition-all" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color }}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</p>
        <p className="text-xl font-bold mt-0.5 truncate" style={{ color: '#0f172a' }}>{value}</p>
        {sub && <p className="text-[11px] mt-0.5 truncate" style={{ color: '#64748b' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Section Card ──
function Section({ title, icon: Icon, children, className = '' }: {
  title: string; icon: React.ComponentType<any>; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl overflow-hidden ${className}`} style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.04)' }}>
        <Icon className="w-4 h-4" style={{ color: '#818cf8' }} />
        <h3 className="text-sm font-semibold" style={{ color: '#0f172a' }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Progress Bar ──
function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const color = value > 85 ? '#EF4444' : value > 70 ? '#F59E0B' : '#6366f1';
  return (
    <div className={`h-2 rounded-full overflow-hidden ${className}`} style={{ background: 'rgba(99,102,241,0.10)' }}>
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  );
}

// ── Grafana Panel Iframe (lazy-loaded via IntersectionObserver) ──
function PanelIframe({ grafanaUrl, dashboardUid, panelId, from, title, panelType, gridH }: {
  grafanaUrl: string; dashboardUid: string; panelId: number; from: string; title: string; panelType?: string; gridH?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const src = `${grafanaUrl}/d-solo/${dashboardUid}/?orgId=1&panelId=${panelId}&from=${from}&to=now&theme=dark`;
  const compactTypes = ['stat', 'gauge', 'bargauge', 'singlestat'];
  const isCompact = panelType ? compactTypes.includes(panelType) : (gridH != null && gridH <= 6);
  const iframeHeight = isCompact ? '200px' : '500px';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative rounded-xl group" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', minHeight: `calc(${iframeHeight} + 41px)` }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.04)' }}>
        <h3 className="text-sm font-medium truncate" style={{ color: '#6366f1' }}>{title}</h3>
        <a href={src} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#94a3b8' }}>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      {!loaded && (
        <div className="absolute inset-0 top-[41px] flex items-center justify-center rounded-b-xl" style={{ background: '#ffffff' }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#6366f1' }} />
        </div>
      )}
      {visible && (
        <iframe src={src} className="w-full border-0" style={{ height: iframeHeight }} onLoad={() => setLoaded(true)} title={title} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════
export default function MetricsDashboard() {
  const infra = useInfrastructureMetrics();
  const grafana = useGrafanaDashboards();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [grafanaTab, setGrafanaTab] = useState(0);
  const [timeRange, setTimeRange] = useState('now-6h');
  const [refreshKey, setRefreshKey] = useState(0);

  const organization = useAuthStore((s) => s.organization);
  const selectedOrgId = useAuthStore((s) => s.selectedOrgId);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'ADMIN' && !user?.organizationId;
  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => { const { data } = await api.get('/organizations?limit=50'); return data; },
    staleTime: 120000,
    enabled: isSuperAdmin,
  });
  const orgs: { id: string; name: string; environment: string }[] = orgsData?.data || [];
  const selectedOrg = selectedOrgId ? orgs.find((o) => o.id === selectedOrgId) : null;
  const heroOrgName = selectedOrg?.name || organization?.name || null;
  const heroEnv = selectedOrg?.environment || organization?.environment || 'DEV';

  const m = infra.data?.data;
  const noDataForOrg: boolean = m?.noDataForOrg || false;
  const orgServerIp: string | null = m?.orgServerIp || null;
  const dashboards: GrafanaDashboard[] = grafana.data?.data?.dashboards || [];
  const grafanaUrl = (grafana.data?.data?.grafanaUrl || '').replace(/\/+$/, '');

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    infra.refetch();
    grafana.refetch();
  }, [infra, grafana]);

  useEffect(() => {
    if (dashboards.length > 0 && grafanaTab >= dashboards.length) setGrafanaTab(0);
  }, [dashboards.length, grafanaTab]);

  if (infra.isLoading && !m) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#6366f1' }} />
          <span className="text-sm font-mono" style={{ color: '#64748b' }}>Loading infrastructure metrics...</span>
        </div>
      </div>
    );
  }

  const cpu = m?.cpu || { avgUsagePct: 0, totalCores: 0, perNode: [], load: { load1: 0, load5: 0, load15: 0 } };
  const mem = m?.memory || { totalGB: '0', usedGB: '0', availableGB: '0', usedPct: 0, buffersGB: '0', cachedGB: '0', swapTotalGB: '0', swapFreeGB: '0' };
  const disk = m?.disk || { avgUsedPct: 0, perNode: [] };
  const net = m?.network || { perNode: [], totalRx: '0 B/s', totalTx: '0 B/s' };
  const virt = m?.virtualization || { nodes: [], podCounts: {}, totalPods: 0, deployments: [], resourceAllocation: {} };
  const health = m?.containerHealth || { restartPods: [], oomKilled: [], crashLoopBackOff: [] };
  const store = m?.storage || { pvcs: [], pvCounts: {}, volumeUsage: [] };
  const alerts = m?.alerts || [];

  return (
    <div className="space-y-4">
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-1" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* Dot-grid texture */}
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Ambient glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/3 translate-x-1/4" style={{ background: 'rgba(5,150,105,0.30)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full translate-y-1/2 -translate-x-1/4" style={{ background: 'rgba(5,150,105,0.20)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full" style={{ background: 'rgba(5,150,105,0.12)', filter: 'blur(80px)' }} />

        <div className="relative px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Activity size={17} style={{ color: '#6EE7B7' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="font-display text-2xl font-bold tracking-tight leading-none" style={{ color: '#ffffff' }}>Metrics Explorer</h1>
                    {heroOrgName && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        {heroOrgName}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}>{heroEnv}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Real-time Prometheus metrics across CPU, virtualization, storage & Grafana panels</p>
                    {orgServerIp && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#6EE7B7' }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#6EE7B7' }} />
                        {orgServerIp}
                      </span>
                    )}
                    {noDataForOrg && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)', color: '#FCD34D' }}>
                        No server IP configured for this org
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Clock className="w-3.5 h-3.5 ml-2" style={{ color: 'rgba(255,255,255,0.5)' }} />
                {TIME_RANGES.map((tr) => (
                  <button key={tr.value} onClick={() => { setTimeRange(tr.value); setRefreshKey((k) => k + 1); }}
                    className="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                    style={timeRange === tr.value ? { background: 'rgba(255,255,255,0.2)', color: '#ffffff' } : { color: 'rgba(255,255,255,0.5)' }}
                  >{tr.label}</button>
                ))}
              </div>
              <button onClick={handleRefresh} className="p-1.5 rounded-lg transition-all" style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)' }} title="Refresh">
                <RefreshCw className={`w-4 h-4 ${infra.isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* KPI stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="rounded-xl p-3 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>CPU Usage</p>
              <p className="font-display text-2xl font-extrabold tabular-nums" style={{ color: '#6EE7B7' }}>{cpu.avgUsagePct}%</p>
            </div>
            <div className="rounded-xl p-3 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Memory</p>
              <p className="font-display text-2xl font-extrabold tabular-nums" style={{ color: '#93c5fd' }}>{mem.usedPct}%</p>
            </div>
            <div className="rounded-xl p-3 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Disk</p>
              <p className="font-display text-2xl font-extrabold tabular-nums" style={{ color: '#FCD34D' }}>{disk.avgUsedPct}%</p>
            </div>
            <div className="rounded-xl p-3 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Alerts</p>
              <p className="font-display text-2xl font-extrabold tabular-nums" style={{ color: alerts.length > 0 ? '#FCA5A5' : '#6EE7B7' }}>{alerts.length}</p>
            </div>
          </div>
        </div>
      </div>
      {/* Emerald accent line */}
      <div className="h-0.5 -mt-1 mb-3" style={{ background: 'linear-gradient(90deg, #059669, #6EE7B7, #D1FAE5, transparent)' }} />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap"
            style={activeTab === tab ? { borderColor: '#6366f1', color: '#6366f1' } : { borderColor: 'transparent', color: '#94a3b8' }}
          >{tab}</button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'Overview' && (
        <div className="space-y-5">
          {/* No-data banner for org with no matching Prometheus target */}
          {heroOrgName && cpu.avgUsagePct === 0 && mem.usedPct === 0 && disk.avgUsedPct === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#D97706' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#F59E0B' }} />
              <span>
                <strong>{heroOrgName}</strong> has no Prometheus targets reporting data.
                {orgServerIp ? ` Monitoring server: ${orgServerIp} — verify node_exporter is running.` : ' No server IP is configured for this org.'}
              </span>
            </div>
          )}
          {/* Hero KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Cpu} label="CPU Usage" value={`${cpu.avgUsagePct}%`} sub={`${cpu.totalCores} cores total`} color="#6366f1" />
            <StatCard icon={MemoryStick} label="Memory" value={`${mem.usedPct}%`} sub={`${mem.usedGB} / ${mem.totalGB} GB`} color="#818cf8" />
            <StatCard icon={HardDrive} label="Disk" value={`${disk.avgUsedPct}%`} sub={`${disk.perNode.length} mount(s)`} color="#F59E0B" />
            <StatCard icon={Network} label="Network" value={net.totalRx} sub={`TX: ${net.totalTx}`} color="#10B981" />
          </div>

          {/* Gauges Row */}
          <div className="rounded-xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-around flex-wrap gap-6">
              <div className="relative">
                <RadialGauge value={cpu.avgUsagePct} label="CPU" sublabel={`${cpu.totalCores} cores`} color="#6366f1" />
              </div>
              <div className="relative">
                <RadialGauge value={mem.usedPct} label="Memory" sublabel={`${mem.usedGB} GB`} color="#818cf8" />
              </div>
              <div className="relative">
                <RadialGauge value={disk.avgUsedPct} label="Disk" sublabel="root /" color="#F59E0B" />
              </div>
              <div className="relative">
                <RadialGauge value={virt.totalPods > 0 ? ((virt.podCounts?.Running || 0) / virt.totalPods) * 100 : 0} label="Pods Running" sublabel={`${virt.podCounts?.Running || 0} / ${virt.totalPods}`} color="#10B981" />
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={Server} label="Nodes" value={virt.nodes.length} sub={`${virt.nodes.filter((n: any) => n.ready).length} ready`} color="#6366f1" />
            <StatCard icon={Container} label="Pods" value={virt.totalPods} sub={`${virt.podCounts?.Running || 0} running`} color="#a855f7" />
            <StatCard icon={Layers} label="Deployments" value={virt.deployments.length} sub={`${virt.deployments.filter((d: any) => d.status === 'healthy').length} healthy`} color="#818cf8" />
            <StatCard icon={Database} label="PVCs" value={store.pvcs.length} sub={`${store.pvcs.filter((p: any) => p.phase === 'Bound').length} bound`} color="#F59E0B" />
            <StatCard icon={AlertTriangle} label="Alerts" value={alerts.length} sub={`${alerts.filter((a: any) => a.severity === 'critical').length} critical`} color={alerts.length > 0 ? '#EF4444' : '#94a3b8'} />
          </div>

          {/* Alerts Strip */}
          {alerts.length > 0 && (
            <Section title={`Firing Alerts (${alerts.length})`} icon={AlertTriangle}>
              <div className="space-y-2">
                {alerts.slice(0, 8).map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={a.severity === 'critical' ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' } : { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: a.severity === 'critical' ? '#EF4444' : '#F59E0B' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#0f172a' }}>{a.name}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#64748b' }}>{a.summary || `${a.namespace} / ${a.instance}`}</p>
                    </div>
                    <StatusPill status={a.severity} />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ═══ CPU & MEMORY TAB ═══ */}
      {activeTab === 'CPU & Memory' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* CPU */}
            <Section title="CPU Utilization" icon={Cpu}>
              <div className="flex items-center gap-8 mb-5">
                <div className="relative">
                  <RadialGauge value={cpu.avgUsagePct} label="Avg CPU" sublabel={`${cpu.totalCores} cores`} color="#6366f1" size={140} />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <p className="text-lg font-bold" style={{ color: '#0f172a' }}>{cpu.load.load1.toFixed(2)}</p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>Load 1m</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <p className="text-lg font-bold" style={{ color: '#0f172a' }}>{cpu.load.load5.toFixed(2)}</p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>Load 5m</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <p className="text-lg font-bold" style={{ color: '#0f172a' }}>{cpu.load.load15.toFixed(2)}</p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>Load 15m</p>
                    </div>
                  </div>
                </div>
              </div>
              {cpu.perNode.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-medium" style={{ color: '#64748b' }}>Per Node</p>
                  {cpu.perNode.map((n: any) => (
                    <div key={n.instance} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-40 truncate" style={{ color: '#64748b' }}>{n.instance}</span>
                      <ProgressBar value={n.usagePct} className="flex-1" />
                      <span className="text-xs font-semibold w-14 text-right" style={{ color: '#6366f1' }}>{n.usagePct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Memory */}
            <Section title="Memory Utilization" icon={MemoryStick}>
              <div className="flex items-center gap-8 mb-5">
                <div className="relative">
                  <RadialGauge value={mem.usedPct} label="Memory" sublabel={`${mem.usedGB} GB used`} color="#818cf8" size={140} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Total', val: `${mem.totalGB} GB` },
                      { label: 'Used', val: `${mem.usedGB} GB` },
                      { label: 'Available', val: `${mem.availableGB} GB` },
                      { label: 'Cached', val: `${mem.cachedGB} GB` },
                      { label: 'Buffers', val: `${mem.buffersGB} GB` },
                      { label: 'Swap', val: `${parseFloat(mem.swapTotalGB) - parseFloat(mem.swapFreeGB)}/${mem.swapTotalGB} GB` },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between p-1.5 rounded text-xs" style={{ background: 'rgba(99,102,241,0.06)' }}>
                        <span style={{ color: '#94a3b8' }}>{item.label}</span>
                        <span className="font-semibold" style={{ color: '#6366f1' }}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Disk */}
            <Section title="Disk Usage" icon={HardDrive}>
              {disk.perNode.length > 0 ? (
                <div className="space-y-3">
                  {disk.perNode.map((d: any) => (
                    <div key={d.instance} className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(99,102,241,0.04)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono truncate" style={{ color: '#64748b' }}>{d.instance}</span>
                        <span className="text-xs font-bold" style={{ color: '#0f172a' }}>{d.usedPct}%</span>
                      </div>
                      <ProgressBar value={d.usedPct} />
                      <div className="flex gap-4 text-[10px]" style={{ color: '#94a3b8' }}>
                        <span>Total: {d.total}</span>
                        <span>Used: {d.used}</span>
                        <span>Read: {d.readRate}</span>
                        <span>Write: {d.writeRate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm" style={{ color: '#94a3b8' }}>No disk metrics available</p>}
            </Section>

            {/* Network */}
            <Section title="Network Throughput" icon={Network}>
              <div className="flex gap-6 mb-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <ArrowUpDown className="w-4 h-4" style={{ color: '#10B981' }} />
                  <div>
                    <p className="text-[10px]" style={{ color: '#10B981' }}>Total RX</p>
                    <p className="text-sm font-bold" style={{ color: '#059669' }}>{net.totalRx}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <ArrowUpDown className="w-4 h-4" style={{ color: '#818cf8' }} />
                  <div>
                    <p className="text-[10px]" style={{ color: '#818cf8' }}>Total TX</p>
                    <p className="text-sm font-bold" style={{ color: '#6366f1' }}>{net.totalTx}</p>
                  </div>
                </div>
              </div>
              {net.perNode.length > 0 ? (
                <div className="space-y-2">
                  {net.perNode.map((n: any) => (
                    <div key={n.instance} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)' }}>
                      <span className="text-xs font-mono truncate flex-1" style={{ color: '#64748b' }}>{n.instance}</span>
                      <span className="text-xs font-medium w-28 text-right" style={{ color: '#10B981' }}>RX: {n.rxRate}</span>
                      <span className="text-xs font-medium w-28 text-right" style={{ color: '#818cf8' }}>TX: {n.txRate}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm" style={{ color: '#94a3b8' }}>No network metrics available</p>}
            </Section>
          </div>
        </div>
      )}

      {/* ═══ VIRTUALIZATION TAB ═══ */}
      {activeTab === 'Virtualization' && (
        <div className="space-y-5">
          {virt.nodes.length === 0 && virt.totalPods === 0 && virt.deployments.length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
              <Server className="w-4 h-4 shrink-0" style={{ color: '#818cf8' }} />
              <span>
                <strong>kube-state-metrics</strong> is not deployed on this cluster. Deploy it to see Kubernetes nodes, pods, deployments, and resource allocation.
              </span>
            </div>
          )}
          {/* Nodes */}
          <Section title={`Nodes (${virt.nodes.length})`} icon={Server}>
            {virt.nodes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Node</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Status</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Kubelet</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Runtime</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>OS / Kernel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {virt.nodes.map((n: any) => (
                      <tr key={n.name} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="py-2.5 px-3 font-mono text-xs" style={{ color: '#0f172a' }}>{n.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: n.ready ? '#10B981' : '#EF4444' }}>
                            {n.ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {n.ready ? 'Ready' : 'NotReady'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs" style={{ color: '#64748b' }}>{n.kubeletVersion}</td>
                        <td className="py-2.5 px-3 text-xs" style={{ color: '#64748b' }}>{n.containerRuntime}</td>
                        <td className="py-2.5 px-3 text-xs truncate max-w-[200px]" style={{ color: '#64748b' }}>{n.osImage} / {n.kernel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm" style={{ color: '#94a3b8' }}>No node metrics available</p>}
          </Section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Pod Phases */}
            <Section title="Pod Status Distribution" icon={Container}>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(virt.podCounts).map(([phase, count]: [string, any]) => (
                  <div key={phase} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)' }}>
                    <div className="flex items-center gap-2">
                      <StatusPill status={phase} />
                    </div>
                    <span className="text-lg font-bold" style={{ color: '#0f172a' }}>{count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="flex justify-between">
                  <span className="text-xs font-medium" style={{ color: '#818cf8' }}>Total Pods</span>
                  <span className="text-sm font-bold" style={{ color: '#6366f1' }}>{virt.totalPods}</span>
                </div>
              </div>
            </Section>

            {/* Resource Allocation */}
            <Section title="Resource Allocation" icon={Gauge}>
              <div className="space-y-3">
                {[
                  { label: 'CPU Requests', val: `${virt.resourceAllocation.cpuRequests} cores` },
                  { label: 'CPU Limits', val: `${virt.resourceAllocation.cpuLimits} cores` },
                  { label: 'Memory Requests', val: `${virt.resourceAllocation.memRequestsGB} GB` },
                  { label: 'Memory Limits', val: `${virt.resourceAllocation.memLimitsGB} GB` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)' }}>
                    <span className="text-xs font-medium" style={{ color: '#64748b' }}>{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{item.val}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Deployments */}
          <Section title={`Deployments (${virt.deployments.length})`} icon={Layers}>
            {virt.deployments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Namespace</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Deployment</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Replicas</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {virt.deployments.map((d: any) => (
                      <tr key={`${d.namespace}/${d.name}`} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="py-2 px-3 text-xs font-mono" style={{ color: '#64748b' }}>{d.namespace}</td>
                        <td className="py-2 px-3 text-xs font-medium" style={{ color: '#0f172a' }}>{d.name}</td>
                        <td className="py-2 px-3 text-xs" style={{ color: '#6366f1' }}>{d.available} / {d.desired}</td>
                        <td className="py-2 px-3"><StatusPill status={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm" style={{ color: '#94a3b8' }}>No deployment metrics available</p>}
          </Section>

          {/* Container Health */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <Section title={`Restarts (${health.restartPods.length})`} icon={RotateCcw}>
              {health.restartPods.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {health.restartPods.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded text-xs" style={{ background: 'rgba(99,102,241,0.04)' }}>
                      <span className="truncate flex-1 font-mono" style={{ color: '#64748b' }}>{p.namespace}/{p.pod}</span>
                      <span className="font-bold ml-2" style={{ color: '#F59E0B' }}>{p.restarts}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}><CheckCircle2 className="w-3.5 h-3.5" /> No pod restarts</p>}
            </Section>

            <Section title={`OOMKilled (${health.oomKilled.length})`} icon={MonitorDot}>
              {health.oomKilled.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {health.oomKilled.map((p: any, i: number) => (
                    <div key={i} className="p-2 rounded text-xs" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span className="font-mono" style={{ color: '#DC2626' }}>{p.namespace}/{p.pod}</span>
                      <span className="ml-1" style={{ color: '#EF4444' }}>({p.container})</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}><CheckCircle2 className="w-3.5 h-3.5" /> No OOMKilled</p>}
            </Section>

            <Section title={`CrashLoopBackOff (${health.crashLoopBackOff.length})`} icon={Unplug}>
              {health.crashLoopBackOff.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {health.crashLoopBackOff.map((p: any, i: number) => (
                    <div key={i} className="p-2 rounded text-xs" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span className="font-mono" style={{ color: '#DC2626' }}>{p.namespace}/{p.pod}</span>
                      <span className="ml-1" style={{ color: '#EF4444' }}>({p.container})</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}><CheckCircle2 className="w-3.5 h-3.5" /> No CrashLoopBackOff</p>}
            </Section>
          </div>
        </div>
      )}

      {/* ═══ STORAGE & VOLUMES TAB ═══ */}
      {activeTab === 'Storage & Volumes' && (
        <div className="space-y-5">
          {store.pvcs.length === 0 && store.volumeUsage.length === 0 && Object.keys(store.pvCounts).length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
              <Database className="w-4 h-4 shrink-0" style={{ color: '#818cf8' }} />
              <span>
                <strong>kube-state-metrics</strong> is not deployed on this cluster. Deploy it to see PersistentVolumes, PVCs, and volume utilization data.
              </span>
            </div>
          )}
          {/* PV Phase Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {['Bound', 'Available', 'Released', 'Failed'].map((phase) => (
              <StatCard
                key={phase}
                icon={phase === 'Bound' ? Cable : phase === 'Available' ? Database : phase === 'Released' ? Unplug : XCircle}
                label={`PV ${phase}`}
                value={store.pvCounts[phase] || 0}
                color={phase === 'Bound' ? '#10B981' : phase === 'Available' ? '#6366f1' : phase === 'Released' ? '#F59E0B' : '#EF4444'}
              />
            ))}
          </div>

          {/* PVCs */}
          <Section title={`Persistent Volume Claims (${store.pvcs.length})`} icon={Database}>
            {store.pvcs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Namespace</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>PVC Name</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Phase</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {store.pvcs.map((p: any, i: number) => (
                      <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="py-2 px-3 text-xs font-mono" style={{ color: '#64748b' }}>{p.namespace}</td>
                        <td className="py-2 px-3 text-xs font-medium" style={{ color: '#0f172a' }}>{p.name}</td>
                        <td className="py-2 px-3"><StatusPill status={p.phase} /></td>
                        <td className="py-2 px-3 text-xs font-mono" style={{ color: '#6366f1' }}>{p.requested}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm" style={{ color: '#94a3b8' }}>No PVCs found</p>}
          </Section>

          {/* Volume Usage */}
          <Section title={`Volume Utilization (${store.volumeUsage.length})`} icon={HardDrive}>
            {store.volumeUsage.length > 0 ? (
              <div className="space-y-3">
                {store.volumeUsage.map((v: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(99,102,241,0.04)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono" style={{ color: '#64748b' }}>{v.namespace}/{v.pvc}</span>
                      <span className="text-xs font-bold" style={{ color: '#0f172a' }}>{v.usedPct}%</span>
                    </div>
                    <ProgressBar value={v.usedPct} />
                    <div className="flex gap-4 text-[10px]" style={{ color: '#94a3b8' }}>
                      <span>Capacity: {v.capacity}</span>
                      <span>Used: {v.used}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm" style={{ color: '#94a3b8' }}>No volume usage data available</p>}
          </Section>
        </div>
      )}

      {/* ═══ GRAFANA PANELS TAB ═══ */}
      {activeTab === 'Grafana Panels' && (
        <div className="space-y-4">
          {dashboards.length > 0 ? (
            <>
              <div className="flex items-center gap-1" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                {dashboards.map((db, idx) => (
                  <button key={db.uid} onClick={() => setGrafanaTab(idx)}
                    className="px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px"
                    style={grafanaTab === idx ? { borderColor: '#6366f1', color: '#6366f1' } : { borderColor: 'transparent', color: '#94a3b8' }}
                  >{db.title} <span className="ml-1 text-xs" style={{ color: '#94a3b8' }}>({db.panels.length})</span></button>
                ))}
              </div>
              {dashboards[grafanaTab] && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" key={`${dashboards[grafanaTab].uid}-${refreshKey}`}>
                  {dashboards[grafanaTab].panels.map((panel) => {
                    const isChart = ['timeseries', 'graph', 'piechart', 'table', 'barchart'].includes(panel.type);
                    const span = isChart ? 'md:col-span-2 xl:col-span-3' : panel.gridPos.w >= 18 ? 'md:col-span-2 xl:col-span-3' : panel.gridPos.w >= 12 ? 'md:col-span-2' : '';
                    return (
                    <div key={panel.id} className={span}>
                      <PanelIframe grafanaUrl={grafanaUrl} dashboardUid={dashboards[grafanaTab].uid} panelId={panel.id} from={timeRange} title={panel.title} panelType={panel.type} gridH={panel.gridPos.h} />
                    </div>);
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
              <Loader2 className={`w-6 h-6 mb-2 ${grafana.isLoading ? 'animate-spin' : ''}`} />
              <p className="text-sm">{grafana.isLoading ? 'Loading Grafana dashboards...' : 'No Grafana dashboards found'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
