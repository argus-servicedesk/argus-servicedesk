import type React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Box, Server, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Layers, ChevronRight, Shield, Database, Loader2,
  ExternalLink, Terminal, Search, ArrowDown, Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const DEFAULT_NAMESPACES = ['argus', 'kube-system', 'default'];
const TABS = ['Overview', 'Pods', 'Deployments', 'Events', 'Services', 'Logs', 'Assets'] as const;
type Tab = typeof TABS[number];

// ── Status Badge (dark theme) ───────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isOk = status === 'Running' || status === 'Ready' || status === 'True' || status === 'Healthy';
  const isWarn = status === 'Pending';
  const style: React.CSSProperties = isOk
    ? { background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }
    : isWarn
    ? { background: 'rgba(245,158,11,0.12)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' }
    : { background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={style}>
      {isOk ? <CheckCircle className="w-3 h-3" /> : isWarn ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status}
    </span>
  );
}

// ── Stat Card (glassmorphic, inside dark hero) ──────────────────────────────
function StatCard({
  label, value, icon: Icon, iconColor, pulse, delay,
}: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string; size?: number }>;
  iconColor: string; pulse?: boolean; delay: number;
}) {
  return (
    <div
      className="backdrop-blur-sm rounded-xl p-4 hover:shadow-xl transition-all duration-300 group animate-fade-in"
      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', animationDelay: `${delay}ms`, backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
          <p className="font-display text-2xl font-extrabold" style={{ color: '#ffffff' }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <Icon className={iconColor} size={18} />
          {pulse && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────────
function SkeletonTable() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
      <div className="px-4 py-3" style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="flex items-center gap-6">
          {[100, 60, 80, 200, 80, 60].map((w, i) => (
            <div key={i} className="h-3 rounded animate-pulse" style={{ width: `${w}px`, background: 'rgba(99,102,241,0.12)' }} />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-4 flex items-center gap-6" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
          <div className="w-32 h-4 rounded animate-pulse" style={{ background: 'rgba(99,102,241,0.08)' }} />
          <div className="w-20 h-6 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,0.08)' }} />
          <div className="flex-1 h-4 rounded animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
          <div className="w-16 h-3 rounded animate-pulse" style={{ background: 'rgba(99,102,241,0.08)' }} />
        </div>
      ))}
    </div>
  );
}

// ── Highlight search matches ────────────────────────────────────────────────
function highlightSearch(text: string, search: string) {
  if (!search) return text;
  const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>{parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase()
        ? <mark key={i} style={{ background: 'rgba(168,85,247,0.3)', color: '#a855f7', borderRadius: '2px', padding: '0 2px' }}>{part}</mark>
        : part
    )}</>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════
export default function K8sClusterDashboard() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [namespace, setNamespace] = useState('argus');
  const { selectedOrgId, user } = useAuthStore();
  const isSuperAdmin = user?.role === 'ADMIN' && !user?.organizationId;

  // Fetch org list so we can display the selected org name
  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations?limit=50').then(r => r.data),
    staleTime: 120000,
    enabled: isSuperAdmin,
  });
  const orgs: { id: string; name: string; serverIp?: string }[] = orgsData?.data || [];
  const selectedOrg = selectedOrgId ? orgs.find(o => o.id === selectedOrgId) : null;

  const headers = selectedOrgId ? { 'X-Organization-Id': selectedOrgId } : {};

  const { data: overviewData, isLoading: ovLoading, refetch: refetchOv, error: ovErr } = useQuery({
    queryKey: ['k8s-overview', selectedOrgId],
    queryFn: () => api.get('/k8s/overview', { headers }).then(r => r.data.data),
    retry: 1,
    refetchInterval: 30000,
  });

  // Derive namespace list dynamically from cluster overview (fallback to defaults)
  const discoveredNamespaces = overviewData?.namespaces
    ? Object.keys(overviewData.namespaces).sort((a, b) => {
        // Pin argus first, then kube-system, then alphabetical
        const priority = ['argus', 'kube-system', 'default'];
        const ai = priority.indexOf(a), bi = priority.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
      })
    : DEFAULT_NAMESPACES;

  const { data: podsData, isLoading: podsLoading } = useQuery({
    queryKey: ['k8s-pods', selectedOrgId, namespace],
    queryFn: () => api.get(`/k8s/pods?namespace=${namespace}`, { headers }).then(r => r.data.data),
    enabled: tab === 'Pods',
    retry: 1,
  });

  const { data: deploymentsData, isLoading: deplLoading } = useQuery({
    queryKey: ['k8s-deployments', selectedOrgId, namespace],
    queryFn: () => api.get(`/k8s/deployments?namespace=${namespace}`, { headers }).then(r => r.data.data),
    enabled: tab === 'Deployments',
    retry: 1,
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['k8s-events', selectedOrgId, namespace],
    queryFn: () => api.get(`/k8s/events?namespace=${namespace}`, { headers }).then(r => r.data.data),
    enabled: tab === 'Events',
    retry: 1,
  });

  const { data: servicesData, isLoading: svcLoading } = useQuery({
    queryKey: ['k8s-services', selectedOrgId, namespace],
    queryFn: () => api.get(`/k8s/services?namespace=${namespace}`, { headers }).then(r => r.data.data),
    enabled: tab === 'Services',
    retry: 1,
  });

  // Assets tab — fetch CMDB assets for this org (SERVER + KUBERNETES_CLUSTER types)
  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['k8s-assets', selectedOrgId],
    queryFn: () => api.get('/assets?limit=100', { headers }).then(r => r.data),
    enabled: tab === 'Assets',
    staleTime: 30000,
  });

  // Sync mutation: POST /k8s/sync-assets
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const syncAssets = useMutation({
    mutationFn: () => api.post('/k8s/sync-assets', {}, { headers }).then(r => r.data),
    onSuccess: (data: any) => {
      const d = data?.data || data;
      qc.invalidateQueries({ queryKey: ['k8s-assets'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      setSyncMsg({ ok: true, text: `Synced ${d.total || 0} assets (${d.created || 0} created, ${d.updated || 0} updated)` });
    },
    onError: (err: any) => {
      setSyncMsg({ ok: false, text: err?.response?.data?.error || err.message || 'Sync failed' });
    },
  });

  // ── Logs Tab State ──
  const [logPod, setLogPod] = useState('');
  const [logTail, setLogTail] = useState(200);
  const [logSince, setLogSince] = useState('3600');
  const [logSearch, setLogSearch] = useState('');

  // Fetch pod list for the Logs tab pod selector
  const { data: logPodsData } = useQuery({
    queryKey: ['k8s-pods-for-logs', selectedOrgId, namespace],
    queryFn: () => api.get(`/k8s/pods?namespace=${namespace}`, { headers }).then(r => r.data.data),
    enabled: tab === 'Logs',
    staleTime: 30000,
  });

  const { data: logData, isLoading: logLoading, refetch: refetchLogs, error: logError } = useQuery({
    queryKey: ['k8s-pod-logs', selectedOrgId, namespace, logPod, logTail, logSince],
    queryFn: () => api.get(`/k8s/pods/${logPod}/logs?namespace=${namespace}&tail=${logTail}&since=${logSince}`, { headers }).then(r => r.data.data),
    enabled: tab === 'Logs' && !!logPod,
    retry: 1,
    refetchInterval: 10000,
  });

  const filteredLogs = logData?.logs?.filter((l: any) =>
    !logSearch || l.message?.toLowerCase().includes(logSearch.toLowerCase())
  ) || [];

  const ov = overviewData;

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO BANNER                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #0891B2, #22D3EE, #67E8F9, transparent)' }} />
        {/* Dot grid texture */}
        <div className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Ambient glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4" style={{ background: 'rgba(8,145,178,0.35)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full translate-y-1/2 -translate-x-1/4" style={{ background: 'rgba(6,182,212,0.25)', filter: 'blur(60px)' }} />

        <div className="relative px-6 pt-6 pb-14">
          <div className="flex items-start justify-between">
            {/* Left: title */}
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Layers size={16} style={{ color: '#22D3EE' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Infrastructure</h1>
              </div>
              <p className="text-sm ml-[42px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {ov?.serverIp || selectedOrg?.serverIp || '--'} · {ov?.org || selectedOrg?.name || 'Select an organization'} · {ov?.nodes?.[0]?.kubeletVersion || '--'}
              </p>
            </div>

            {/* Right: refresh */}
            <button
              onClick={() => refetchOv()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {/* Stat Cards */}
          <div className="relative mt-6">
            {ovLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="backdrop-blur-sm rounded-xl p-4 animate-pulse h-20" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
                ))}
              </div>
            ) : ovErr ? (
              <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {!selectedOrgId && isSuperAdmin ? (
                  <p style={{ color: '#D97706' }}>Please select an organization from the sidebar to view its K8s cluster.</p>
                ) : (
                  <p style={{ color: '#DC2626' }}>
                    Unable to connect to K8s cluster{selectedOrg ? ` (${selectedOrg.name})` : ''}.
                    {' '}Ensure SSH key is configured and server is reachable.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="Nodes Ready" value={`${ov?.nodesReady ?? 0}/${ov?.nodeCount ?? 0}`} icon={Server} iconColor="text-[#6366f1]" delay={0} />
                <StatCard label="Pods Running" value={ov?.pods?.running ?? 0} icon={Box} iconColor="text-[#6EE7B7]" delay={100} />
                <StatCard label="Pods Pending" value={ov?.pods?.pending ?? 0} icon={Activity} iconColor="text-[#FCD34D]" delay={200} />
                <StatCard label="Pods Failed" value={ov?.pods?.failed ?? 0} icon={XCircle} iconColor="text-[#FCA5A5]" pulse={Number(ov?.pods?.failed ?? 0) > 0} delay={300} />
                <StatCard label="Total Pods" value={ov?.pods?.total ?? 0} icon={Layers} iconColor="text-[#a855f7]" delay={400} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cyan accent line */}
      <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #0891B2, #22D3EE, #67E8F9, transparent)' }} />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FLOATING TAB BAR                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="-mt-3 relative z-10 rounded-xl p-3 mb-4" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab buttons */}
          <div className="flex items-center rounded-lg p-0.5" style={{ background: 'rgba(99,102,241,0.06)' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200"
                style={tab === t ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', boxShadow: '0 4px 20px rgba(99,102,241,0.5)' } : { color: '#94a3b8' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 hidden sm:block" style={{ background: 'rgba(99,102,241,0.12)' }} />

          {/* Namespace selector */}
          {tab !== 'Overview' && tab !== 'Assets' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#94a3b8' }}>Namespace</span>
              <select
                value={namespace}
                onChange={e => setNamespace(e.target.value)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all appearance-none cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                  border: '1px solid rgba(99,102,241,0.5)',
                  outline: 'none',
                  minWidth: '140px',
                }}
              >
                {discoveredNamespaces.map(ns => (
                  <option key={ns} value={ns} style={{ background: '#1e1b4b', color: '#fff' }}>{ns}</option>
                ))}
              </select>
              <span className="text-[10px] font-medium" style={{ color: '#64748b' }}>
                {discoveredNamespaces.length} namespaces
              </span>
            </div>
          )}

          {/* Live indicator */}
          <div className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />
            Live · 30s
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CONTENT AREA                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Overview ── */}
      {tab === 'Overview' && !ovLoading && !ovErr && ov && (
        <div className="space-y-4">
          {/* Nodes Table */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.04)' }}>
              <Server size={15} style={{ color: '#6366f1' }} />
              <span className="font-display text-sm font-semibold" style={{ color: '#0f172a' }}>Nodes</span>
              <span className="text-[10px] font-mono font-bold rounded-full px-2 py-0.5 ml-1" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.12)' }}>{ov.nodes?.length || 0}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.04)' }}>
                  {['Name', 'Status', 'Roles', 'Version', 'CPU', 'Memory'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ov.nodes?.map((n: any) => (
                  <tr key={n.name} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3 font-mono text-xs font-medium" style={{ color: '#6366f1' }}>{n.name}</td>
                    <td className="px-5 py-3"><StatusBadge status={n.status} /></td>
                    <td className="px-5 py-3 capitalize text-xs" style={{ color: '#64748b' }}>{n.roles}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{n.kubeletVersion}</td>
                    <td className="px-5 py-3">
                      {n.cpu ? <span className="font-mono text-xs font-medium" style={{ color: '#a855f7' }}>{n.cpu} <span style={{ color: '#94a3b8' }}>({n.cpuPct})</span></span> : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {n.mem ? <span className="font-mono text-xs font-medium" style={{ color: '#6366f1' }}>{n.mem} <span style={{ color: '#94a3b8' }}>({n.memPct})</span></span> : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Namespace Summary */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.04)' }}>
              <Layers size={15} style={{ color: '#a855f7' }} />
              <span className="font-display text-sm font-semibold" style={{ color: '#0f172a' }}>Namespaces</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '1px', background: 'rgba(99,102,241,0.08)' }}>
              {Object.entries(ov.namespaces || {}).map(([ns, data]: [string, any]) => (
                <div key={ns} className="p-4 transition-colors" style={{ background: '#ffffff' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.8)')}>
                  <div className="text-sm font-semibold mb-2 truncate" style={{ color: '#6366f1' }}>{ns}</div>
                  <div className="flex gap-3 text-xs">
                    <span className="font-medium" style={{ color: '#059669' }}>{data.running} running</span>
                    {data.pending > 0 && <span className="font-medium" style={{ color: '#D97706' }}>{data.pending} pending</span>}
                    {data.failed > 0 && <span className="font-medium" style={{ color: '#DC2626' }}>{data.failed} failed</span>}
                  </div>
                  <div className="text-[10px] mt-1 font-mono" style={{ color: '#94a3b8' }}>{data.total} total</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Overview' && ovLoading && <SkeletonTable />}

      {/* ── Pods ── */}
      {tab === 'Pods' && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.04)' }}>
            <Box size={15} style={{ color: '#6366f1' }} />
            <span className="font-display text-sm font-semibold" style={{ color: '#0f172a' }}>Pods</span>
            <span className="text-xs font-normal" style={{ color: '#94a3b8' }}>— {namespace}</span>
            {podsData && <span className="text-[10px] font-mono font-bold rounded-full px-2 py-0.5 ml-1" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.12)' }}>{podsData.total}</span>}
          </div>
          {podsLoading ? (
            <div className="p-12 text-center text-sm" style={{ color: '#94a3b8' }}>Loading pods...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.04)' }}>
                    {['Pod Name', 'Phase', 'Ready', 'Restarts', 'CPU', 'Memory', 'IP'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {podsData?.pods?.map((p: any) => (
                    <tr key={p.name} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium" style={{ color: '#6366f1' }}>{p.name}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={p.phase} /></td>
                      <td className="px-4 py-2.5">
                        {p.ready ? <CheckCircle size={15} style={{ color: '#10B981' }} /> : <XCircle size={15} style={{ color: '#EF4444' }} />}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#64748b' }}>{p.restarts}</td>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium" style={{ color: '#a855f7' }}>{p.cpu || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium" style={{ color: '#6366f1' }}>{p.mem || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#94a3b8' }}>{p.podIp || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Deployments ── */}
      {tab === 'Deployments' && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.04)' }}>
            <Layers size={15} style={{ color: '#a855f7' }} />
            <span className="font-display text-sm font-semibold" style={{ color: '#0f172a' }}>Deployments</span>
            <span className="text-xs font-normal" style={{ color: '#94a3b8' }}>— {namespace}</span>
            {deploymentsData && (
              <span className="text-[10px] font-mono font-bold rounded-full px-2 py-0.5 ml-1" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.12)' }}>
                {deploymentsData.healthy}/{deploymentsData.total} healthy
              </span>
            )}
          </div>
          {deplLoading ? (
            <div className="p-12 text-center text-sm" style={{ color: '#94a3b8' }}>Loading deployments...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.04)' }}>
                  {['Name', 'Desired', 'Ready', 'Available', 'Health'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deploymentsData?.deployments?.map((d: any) => (
                  <tr key={d.name} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3 font-mono text-xs font-medium" style={{ color: '#6366f1' }}>{d.name}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{d.replicas}</td>
                    <td className="px-5 py-3 font-mono text-xs font-medium" style={{ color: '#059669' }}>{d.readyReplicas}</td>
                    <td className="px-5 py-3 font-mono text-xs font-medium" style={{ color: '#a855f7' }}>{d.availableReplicas}</td>
                    <td className="px-5 py-3"><StatusBadge status={d.healthy ? 'Healthy' : 'Degraded'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Events ── */}
      {tab === 'Events' && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.04)' }}>
            <AlertTriangle size={15} style={{ color: '#D97706' }} />
            <span className="font-display text-sm font-semibold" style={{ color: '#0f172a' }}>Warning Events</span>
            <span className="text-xs font-normal" style={{ color: '#94a3b8' }}>— {namespace}</span>
          </div>
          {eventsLoading ? (
            <div className="p-12 text-center text-sm" style={{ color: '#94a3b8' }}>Loading events...</div>
          ) : eventsData?.events?.length === 0 ? (
            <div className="py-16 px-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <Shield size={28} style={{ color: '#10B981' }} />
              </div>
              <h3 className="font-display text-lg font-bold mb-1" style={{ color: '#0f172a' }}>All Clear</h3>
              <p className="text-sm" style={{ color: '#94a3b8' }}>No warning events in {namespace}</p>
            </div>
          ) : (
            <div>
              {eventsData?.events?.map((e: any, i: number) => (
                <div key={i} className="px-5 py-4 transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                  onMouseEnter={el => (el.currentTarget.style.background = 'rgba(245,158,11,0.06)')}
                  onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: '#D97706' }}>{e.reason}</span>
                        <span className="text-xs" style={{ color: '#e2e8f0' }}>·</span>
                        <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{e.kind}/{e.name}</span>
                      </div>
                      <p className="text-sm" style={{ color: '#64748b' }}>{e.message}</p>
                    </div>
                    <span className="text-[10px] whitespace-nowrap font-mono font-bold rounded-full px-2 py-0.5" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.12)' }}>{e.count}x</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Services ── */}
      {tab === 'Services' && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.04)' }}>
            <Activity size={15} style={{ color: '#10B981' }} />
            <span className="font-display text-sm font-semibold" style={{ color: '#0f172a' }}>Services</span>
            <span className="text-xs font-normal" style={{ color: '#94a3b8' }}>— {namespace}</span>
            {servicesData && <span className="text-[10px] font-mono font-bold rounded-full px-2 py-0.5 ml-1" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.12)' }}>{servicesData.total}</span>}
          </div>
          {svcLoading ? (
            <div className="p-12 text-center text-sm" style={{ color: '#94a3b8' }}>Loading services...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.04)' }}>
                  {['Name', 'Type', 'Cluster IP', 'Ports'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {servicesData?.services?.map((s: any) => (
                  <tr key={s.name} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3 font-mono text-xs font-medium" style={{ color: '#6366f1' }}>{s.name}</td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={
                        s.type === 'NodePort' ? { background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' } :
                        s.type === 'ClusterIP' ? { background: 'rgba(99,102,241,0.12)', color: '#64748b', border: '1px solid rgba(99,102,241,0.2)' } :
                        { background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' }
                      }>
                        {s.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{s.clusterIp}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{s.ports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Logs ── */}
      {tab === 'Logs' && (
        <div className="space-y-3">
          {/* Controls bar */}
          <div className="rounded-xl p-3" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="flex flex-wrap items-center gap-2">
              {/* Pod selector */}
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <Terminal size={13} style={{ color: '#6366f1' }} className="shrink-0" />
                <select
                  value={logPod}
                  onChange={e => setLogPod(e.target.value)}
                  className="flex-1 text-[12px] rounded-lg px-3 py-1.5 font-mono focus:outline-none"
                  style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
                >
                  <option value="" style={{ background: '#eef2ff' }}>Select a pod...</option>
                  {logPodsData?.pods?.map((p: any) => (
                    <option key={p.name} value={p.name} style={{ background: '#eef2ff' }}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Since */}
              <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'rgba(99,102,241,0.06)' }}>
                {[{ label: '15m', value: '900' }, { label: '1h', value: '3600' }, { label: '6h', value: '21600' }, { label: '24h', value: '86400' }].map(opt => (
                  <button key={opt.value} onClick={() => setLogSince(opt.value)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
                    style={logSince === opt.value ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff' } : { color: '#94a3b8' }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Tail */}
              <select value={logTail} onChange={e => setLogTail(Number(e.target.value))}
                className="text-[11px] rounded-lg px-2 py-1.5 font-mono focus:outline-none"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}>
                {[100, 200, 500, 1000].map(n => <option key={n} value={n} style={{ background: '#eef2ff' }}>{n} lines</option>)}
              </select>

              {/* Search */}
              <div className="relative flex-1 min-w-[140px]">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                <input type="text" value={logSearch} onChange={e => setLogSearch(e.target.value)}
                  placeholder="Filter logs..."
                  className="w-full pl-7 pr-3 py-1.5 text-[12px] rounded-lg font-mono focus:outline-none"
                  style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
                />
              </div>

              {/* Refresh */}
              <button onClick={() => refetchLogs()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'rgba(99,102,241,0.06)', color: '#64748b', border: '1px solid rgba(99,102,241,0.12)' }}>
                <RefreshCw size={12} className={logLoading ? 'animate-spin' : ''} /> Refresh
              </button>

              <div className="flex items-center gap-1 text-[10px]" style={{ color: '#94a3b8' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                10s
              </div>
            </div>
          </div>

          {/* Terminal output */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 0 40px rgba(99,102,241,0.1)' }}>
            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: '#ffffff' }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.6)' }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(245,158,11,0.6)' }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(16,185,129,0.6)' }} />
                </div>
                <div className="w-px h-4" style={{ background: 'rgba(99,102,241,0.15)' }} />
                <Terminal size={12} style={{ color: '#a855f7' }} />
                <span className="text-[12px] font-mono" style={{ color: '#94a3b8' }}>
                  kubectl logs {logPod || '<pod>'} -n {namespace}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: '#cbd5e1' }}>
                {logPod && <span>{filteredLogs.length} lines</span>}
                {logSearch && (
                  <span style={{ color: '#a855f7', background: 'rgba(168,85,247,0.12)', padding: '2px 8px', borderRadius: '9999px' }}>
                    "{logSearch}" · {filteredLogs.length}
                  </span>
                )}
                {logLoading && <Loader2 size={12} className="animate-spin" style={{ color: '#a855f7' }} />}
              </div>
            </div>

            {/* Log lines */}
            <div className="overflow-auto max-h-[600px]">
              {!logPod ? (
                <div className="py-20 text-center">
                  <Terminal size={32} style={{ color: '#e2e8f0' }} className="mx-auto mb-3" />
                  <p className="text-sm" style={{ color: '#94a3b8' }}>Select a pod to view its logs</p>
                  <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>Choose a pod from the dropdown above</p>
                </div>
              ) : logLoading ? (
                <div className="py-16 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: '#a855f7' }} />
                  <p className="text-xs font-mono" style={{ color: '#94a3b8' }}>Fetching pod logs...</p>
                </div>
              ) : logError ? (
                <div className="py-16 text-center px-8">
                  <AlertTriangle size={24} className="mx-auto mb-2" style={{ color: '#EF4444' }} />
                  <p className="text-sm font-semibold mb-1" style={{ color: '#64748b' }}>Failed to fetch logs</p>
                  <p className="text-xs font-mono" style={{ color: '#94a3b8' }}>
                    {(logError as any)?.response?.data?.error || (logError as any)?.message || 'SSH or kubectl error'}
                  </p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm" style={{ color: '#94a3b8' }}>No log entries found</p>
                  <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>The pod may have no recent output in the selected time range</p>
                </div>
              ) : (
                <table className="w-full text-[12px] font-mono border-collapse">
                  <tbody>
                    {filteredLogs.map((l: any, i: number) => {
                      const isErr  = /error|err|fatal|panic|exception/i.test(l.message);
                      const isWarn = !isErr && /warn|warning/i.test(l.message);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)', background: isErr ? 'rgba(239,68,68,0.06)' : isWarn ? 'rgba(245,158,11,0.04)' : 'transparent' }}
                          onMouseEnter={e => { if (!isErr && !isWarn) e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                          onMouseLeave={e => { if (!isErr && !isWarn) e.currentTarget.style.background = 'transparent'; }}>
                          <td className="px-2 py-0.5 select-none text-right w-10 align-top tabular-nums" style={{ color: '#cbd5e1' }}>{i + 1}</td>
                          <td className="px-2 py-0.5 whitespace-nowrap w-[110px] align-top tabular-nums" style={{ color: '#94a3b8' }}>
                            {l.timestamp ? (() => {
                              try {
                                const d = new Date(l.timestamp);
                                return d.toLocaleTimeString('en-IN', { hour12: false });
                              } catch { return l.timestamp?.slice(0, 19) || ''; }
                            })() : ''}
                          </td>
                          <td className="px-2 py-0.5 break-all align-top" style={{ color: isErr ? '#FCA5A5' : isWarn ? '#FCD34D' : '#6366f1' }}>
                            {logSearch ? highlightSearch(l.message, logSearch) : l.message}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Assets (CMDB) ── */}
      {tab === 'Assets' && (
        <div className="space-y-4">
          {/* Sync bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={15} style={{ color: '#10B981' }} />
              <span className="font-display text-sm font-semibold" style={{ color: '#0f172a' }}>CMDB Assets</span>
              {assetsData && (
                <span className="text-[10px] font-mono font-bold rounded-full px-2 py-0.5 ml-1" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.12)' }}>
                  {assetsData?.pagination?.total ?? assetsData?.data?.length ?? 0} assets
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {syncMsg && (
                <span className="text-xs font-medium" style={{ color: syncMsg.ok ? '#6EE7B7' : '#FCA5A5' }}>
                  {syncMsg.text}
                </span>
              )}
              <button
                onClick={() => { setSyncMsg(null); syncAssets.mutate(); }}
                disabled={syncAssets.isPending}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 4px 20px rgba(99,102,241,0.5)' }}
              >
                {syncAssets.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Syncing...</>
                ) : (
                  <><RefreshCw size={14} /> Sync from Cluster</>
                )}
              </button>
            </div>
          </div>

          {/* Assets table */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            {assetsLoading ? (
              <div className="p-12 text-center text-sm" style={{ color: '#94a3b8' }}>Loading assets...</div>
            ) : !assetsData?.data?.length ? (
              <div className="py-16 px-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <Database size={28} style={{ color: '#94a3b8' }} />
                </div>
                <h3 className="font-display text-lg font-bold mb-1" style={{ color: '#0f172a' }}>No CMDB Assets</h3>
                <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>This organization has no assets in the CMDB yet.</p>
                <button
                  onClick={() => { setSyncMsg(null); syncAssets.mutate(); }}
                  disabled={syncAssets.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 4px 20px rgba(99,102,241,0.5)' }}
                >
                  {syncAssets.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Syncing...</>
                  ) : (
                    <><RefreshCw size={14} /> Sync Assets from K8s Cluster</>
                  )}
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.04)' }}>
                    {['Name', 'Type', 'Status', 'IP Address', 'Hostname', 'Updated'].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                    <th className="px-5 py-2.5 text-left w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(assetsData.data) ? assetsData.data : []).map((a: any) => (
                    <tr
                      key={a.id}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                      onClick={() => navigate(`/assets/${a.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-5 py-3 font-mono text-xs font-medium" style={{ color: '#6366f1' }}>{a.name}</td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={
                          a.type === 'KUBERNETES_CLUSTER' ? { background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' } :
                          a.type === 'SERVER' ? { background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' } :
                          { background: 'rgba(99,102,241,0.12)', color: '#64748b', border: '1px solid rgba(99,102,241,0.2)' }
                        }>
                          {a.type}
                        </span>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={a.status === 'LIVE' ? 'Ready' : a.status === 'MAINTENANCE' ? 'Pending' : a.status} /></td>
                      <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{a.ipAddress || '—'}</td>
                      <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{a.hostname || '—'}</td>
                      <td className="px-5 py-3 text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                        {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <ExternalLink size={13} style={{ color: '#cbd5e1' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
