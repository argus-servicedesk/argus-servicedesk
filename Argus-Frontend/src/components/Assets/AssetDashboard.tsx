// CMDB Configuration Items Dashboard — matches DashboardOverview design system

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server, Database, Globe, Network, Container, Monitor, Cpu,
  HardDrive, Search, Loader2, Plus, Activity, Shield, Layers, Eye,
} from 'lucide-react';
import { useAssets, useAssetStats } from '../../hooks/useAssets';
import { useAuth } from '../../hooks/useAuth';

/* ===================================================================
   DESIGN SYSTEM — matches DashboardOverview T constants
   =================================================================== */
const T = {
  pageBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  cardShadowHover: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
  panelBg: '#FFFFFF',
  panelBorder: '#E2E8F0',
  panelHeaderBg: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  divider: '#E2E8F0',
  heroBg: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)',
  // Accents
  indigo: '#4F46E5',
  violet: '#7C3AED',
  emerald: '#059669',
  amber: '#D97706',
  crimson: '#DC2626',
  blue: '#2563EB',
  cyan: '#0891B2',
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
} as const;

/* ===================================================================
   TYPES
   =================================================================== */
type AssetType =
  | 'SERVER' | 'KUBERNETES_CLUSTER' | 'DATABASE' | 'APPLICATION'
  | 'NETWORK' | 'STORAGE' | 'CONTAINER' | 'VM' | 'LOAD_BALANCER'
  | 'END_USER_DEVICE' | 'UPS' | 'FIREWALL' | 'SWITCH' | 'ROUTER'
  | 'PRINTER' | 'MONITOR' | 'PHONE' | 'PERIPHERAL' | 'RACK_UNIT'
  | 'PDU' | 'ENCLOSURE' | 'CABLE' | 'SIMCARD';

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  status: string;
  ipAddress: string | null;
  hostname: string | null;
  location: string | null;
  monitoringEnabled: boolean;
}

/* ===================================================================
   CONSTANTS
   =================================================================== */
const typeIcons: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  SERVER: Server, KUBERNETES_CLUSTER: Layers, DATABASE: Database,
  APPLICATION: Globe, NETWORK: Network, STORAGE: HardDrive,
  CONTAINER: Container, VM: Monitor, LOAD_BALANCER: Cpu,
  END_USER_DEVICE: Monitor, UPS: Shield, FIREWALL: Shield,
  SWITCH: Network, ROUTER: Network, PRINTER: HardDrive,
  MONITOR: Monitor, PHONE: Monitor, PERIPHERAL: HardDrive,
};

const TYPE_LABELS: Record<string, string> = {
  SERVER: 'Servers', KUBERNETES_CLUSTER: 'Kubernetes Clusters',
  DATABASE: 'Databases', APPLICATION: 'Applications',
  NETWORK: 'Network Devices', STORAGE: 'Storage',
  CONTAINER: 'Containers', VM: 'Virtual Machines',
  LOAD_BALANCER: 'Load Balancers', END_USER_DEVICE: 'Computers',
  UPS: 'UPS Devices', FIREWALL: 'Firewalls',
  SWITCH: 'Switches', ROUTER: 'Routers',
  PRINTER: 'Printers', MONITOR: 'Monitors',
  PHONE: 'Phones', PERIPHERAL: 'Peripherals',
};

const TYPE_IMAGES: Record<string, string> = {
  SERVER: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><defs><linearGradient id="s1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#374151"/><stop offset="100%" stop-color="#1F2937"/></linearGradient></defs><rect x="10" y="5" width="100" height="22" rx="3" fill="url(#s1)" stroke="#4B5563" stroke-width="1"/><rect x="10" y="30" width="100" height="22" rx="3" fill="url(#s1)" stroke="#4B5563" stroke-width="1"/><rect x="10" y="55" width="100" height="22" rx="3" fill="url(#s1)" stroke="#4B5563" stroke-width="1"/><circle cx="20" cy="16" r="2.5" fill="#10B981"/><circle cx="20" cy="41" r="2.5" fill="#10B981"/><circle cx="20" cy="66" r="2.5" fill="#F59E0B"/><rect x="30" y="12" width="40" height="2" rx="1" fill="#6B7280"/><rect x="30" y="15" width="30" height="2" rx="1" fill="#4B5563"/><rect x="30" y="37" width="40" height="2" rx="1" fill="#6B7280"/><rect x="30" y="40" width="30" height="2" rx="1" fill="#4B5563"/><rect x="30" y="62" width="40" height="2" rx="1" fill="#6B7280"/><rect x="30" y="65" width="30" height="2" rx="1" fill="#4B5563"/><rect x="90" y="10" width="14" height="12" rx="2" fill="#111827" stroke="#374151" stroke-width="0.5"/><rect x="90" y="35" width="14" height="12" rx="2" fill="#111827" stroke="#374151" stroke-width="0.5"/><rect x="90" y="60" width="14" height="12" rx="2" fill="#111827" stroke="#374151" stroke-width="0.5"/></svg>')}`,
  KUBERNETES_CLUSTER: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><defs><linearGradient id="k1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#326CE5"/><stop offset="100%" stop-color="#1D4ED8"/></linearGradient></defs><circle cx="60" cy="40" r="28" fill="url(#k1)" opacity="0.15"/><circle cx="60" cy="40" r="18" fill="url(#k1)" opacity="0.3"/><path d="M60 22 L60 58 M42 40 L78 40 M47 27 L73 53 M73 27 L47 53" stroke="#326CE5" stroke-width="1.5" opacity="0.6"/><circle cx="60" cy="22" r="5" fill="#326CE5"/><circle cx="60" cy="58" r="5" fill="#326CE5"/><circle cx="42" cy="40" r="5" fill="#326CE5"/><circle cx="78" cy="40" r="5" fill="#326CE5"/><circle cx="47" cy="27" r="4" fill="#60A5FA"/><circle cx="73" cy="53" r="4" fill="#60A5FA"/><circle cx="73" cy="27" r="4" fill="#60A5FA"/><circle cx="47" cy="53" r="4" fill="#60A5FA"/><circle cx="60" cy="40" r="7" fill="#326CE5"/></svg>')}`,
  DATABASE: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><defs><linearGradient id="d1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#D97706"/><stop offset="100%" stop-color="#B45309"/></linearGradient></defs><ellipse cx="60" cy="18" rx="35" ry="10" fill="url(#d1)" opacity="0.9"/><path d="M25 18 v44 c0 5.5 15.7 10 35 10s35-4.5 35-10V18" fill="none" stroke="#D97706" stroke-width="1.5"/><ellipse cx="60" cy="62" rx="35" ry="10" fill="url(#d1)" opacity="0.3"/><path d="M25 33 c0 5.5 15.7 10 35 10s35-4.5 35-10" fill="none" stroke="#D97706" stroke-width="1" opacity="0.5"/><path d="M25 48 c0 5.5 15.7 10 35 10s35-4.5 35-10" fill="none" stroke="#D97706" stroke-width="1" opacity="0.5"/></svg>')}`,
  APPLICATION: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect x="15" y="8" width="90" height="60" rx="6" fill="#111827" stroke="#374151" stroke-width="1.5"/><rect x="15" y="8" width="90" height="14" rx="6" fill="#1F2937"/><circle cx="26" cy="15" r="2.5" fill="#EF4444"/><circle cx="34" cy="15" r="2.5" fill="#F59E0B"/><circle cx="42" cy="15" r="2.5" fill="#10B981"/><rect x="22" y="28" width="30" height="2" rx="1" fill="#059669"/><rect x="22" y="33" width="50" height="2" rx="1" fill="#6366f1" opacity="0.6"/><rect x="22" y="38" width="40" height="2" rx="1" fill="#8B5CF6" opacity="0.4"/><rect x="22" y="43" width="55" height="2" rx="1" fill="#6366f1" opacity="0.6"/></svg>')}`,
  NETWORK: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><defs><linearGradient id="n1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#374151"/><stop offset="100%" stop-color="#1F2937"/></linearGradient></defs><rect x="10" y="25" width="100" height="30" rx="4" fill="url(#n1)" stroke="#4B5563" stroke-width="1"/><rect x="18" y="45" width="4" height="6" rx="1" fill="#10B981"/><rect x="25" y="45" width="4" height="6" rx="1" fill="#10B981"/><rect x="32" y="45" width="4" height="6" rx="1" fill="#10B981"/><rect x="39" y="45" width="4" height="6" rx="1" fill="#F59E0B"/><rect x="46" y="45" width="4" height="6" rx="1" fill="#10B981"/><circle cx="20" cy="35" r="2" fill="#10B981"/><circle cx="28" cy="35" r="2" fill="#10B981"/></svg>')}`,
  FIREWALL: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect x="10" y="25" width="100" height="30" rx="4" fill="#1F2937" stroke="#EF4444" stroke-width="1.5" opacity="0.9"/><path d="M55 15 L60 8 L65 15 L62 13 L65 20 L61 17 L58 20 L62 13Z" fill="#EF4444"/><rect x="18" y="45" width="4" height="6" rx="1" fill="#EF4444"/><rect x="25" y="45" width="4" height="6" rx="1" fill="#10B981"/><circle cx="20" cy="35" r="2.5" fill="#EF4444"/></svg>')}`,
};

const TYPE_COLORS: Record<string, string> = {
  SERVER: T.indigo, KUBERNETES_CLUSTER: T.violet, DATABASE: T.amber,
  APPLICATION: T.emerald, NETWORK: T.crimson, STORAGE: T.indigo,
  CONTAINER: T.violet, VM: T.blue, LOAD_BALANCER: '#DC2626',
  END_USER_DEVICE: T.blue, FIREWALL: T.crimson, SWITCH: T.crimson,
  ROUTER: T.crimson, PRINTER: T.textMuted,
};

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  LIVE: { color: T.emerald, bg: '#ECFDF5' },
  MAINTENANCE: { color: T.amber, bg: '#FFFBEB' },
  DECOMMISSIONED: { color: T.textMuted, bg: T.pageBg },
  PLANNED: { color: T.blue, bg: '#EFF6FF' },
  IN_STOCK: { color: T.violet, bg: '#F5F3FF' },
  DISPOSED: { color: T.textMuted, bg: T.pageBg },
  RESERVED: { color: T.violet, bg: '#F5F3FF' },
};

const TYPE_ORDER = [
  'SERVER', 'KUBERNETES_CLUSTER', 'DATABASE', 'APPLICATION', 'NETWORK',
  'FIREWALL', 'SWITCH', 'ROUTER', 'VM', 'LOAD_BALANCER', 'STORAGE',
  'CONTAINER', 'END_USER_DEVICE', 'UPS', 'PRINTER', 'MONITOR', 'PHONE', 'PERIPHERAL',
];

/* ===================================================================
   STATUS DOT
   =================================================================== */
function StatusDot({ color, size = 7 }: { color: string; size?: number }) {
  return (
    <span className="inline-block rounded-full flex-shrink-0" style={{ width: size, height: size, background: color }} />
  );
}

/* ===================================================================
   PANEL COMPONENT — matches DashboardOverview Panel
   =================================================================== */
function Panel({ title, titleIcon, titleExtra, actions, children, accentColor, noPad = false }: {
  title: React.ReactNode;
  titleIcon?: React.ReactNode;
  titleExtra?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  accentColor?: string;
  noPad?: boolean;
}) {
  return (
    <div className="rounded-xl overflow-hidden relative"
      style={{ background: T.panelBg, border: `1px solid ${T.panelBorder}`, boxShadow: T.cardShadow }}>
      {accentColor && <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ background: T.panelHeaderBg, borderBottom: `1px solid ${T.divider}` }}>
        <div className="flex items-center gap-2">
          {titleIcon}
          <span className="text-[13px] font-bold tracking-tight" style={{ color: T.text }}>{title}</span>
          {titleExtra}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className={noPad ? '' : 'px-5 py-4'}>{children}</div>
    </div>
  );
}

/* ===================================================================
   KPI CARD — matches DashboardOverview KPICard
   =================================================================== */
function KPICard({ label, value, accentColor }: { label: string; value: string | number; accentColor: string }) {
  return (
    <div className="rounded-xl px-4 py-4 relative overflow-hidden"
      style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: T.textMuted }}>{label}</div>
      <div className="text-[28px] font-black font-mono leading-none tracking-tight" style={{ color: T.text }}>{value}</div>
    </div>
  );
}

/* ===================================================================
   MAIN COMPONENT
   =================================================================== */
export default function AssetDashboard() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filters = useMemo(() => {
    const f: Record<string, string> = { pageSize: '2000' };
    if (typeFilter !== 'ALL') f.type = typeFilter;
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [typeFilter, statusFilter, searchQuery]);

  const { data: assetsResponse, isLoading } = useAssets(filters);
  const { data: statsResponse } = useAssetStats();

  const assets: Asset[] = assetsResponse?.data ?? [];
  const stats = statsResponse?.data;
  const totalCount = stats?.total ?? assets.length;
  const liveCount = stats?.liveCount ?? assets.filter((a) => a.status === 'LIVE').length;
  const maintCount = assets.filter((a) => a.status === 'MAINTENANCE').length;
  const monitoredCount = assets.filter((a) => a.monitoringEnabled).length;
  const monitoredPct = assets.length > 0 ? Math.round((monitoredCount / assets.length) * 100) : 0;

  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const asset of assets) {
      const list = map.get(asset.type) || [];
      list.push(asset);
      map.set(asset.type, list);
    }
    const sorted: Array<{ type: string; label: string; assets: Asset[] }> = [];
    for (const t of TYPE_ORDER) {
      if (map.has(t)) {
        sorted.push({ type: t, label: TYPE_LABELS[t] || t.replace(/_/g, ' '), assets: map.get(t)! });
        map.delete(t);
      }
    }
    for (const [t, list] of map) {
      sorted.push({ type: t, label: TYPE_LABELS[t] || t.replace(/_/g, ' '), assets: list });
    }
    return sorted;
  }, [assets]);

  return (
    <div className="space-y-5 animate-fade-in min-h-screen -m-4 p-5" style={{ background: T.pageBg }}>

      {/* ═══════════════════════════════════════════════
          HERO BANNER
          ═══════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: T.heroBg }}>
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
          style={{ background: 'rgba(79,70,229,0.2)' }} />
        <div className="absolute -bottom-16 right-8 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
          style={{ background: 'rgba(124,58,237,0.15)' }} />

        <div className="relative px-6 pt-5 pb-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: identity */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
                <Eye size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white">Configuration Items</h1>
                <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {totalCount} assets · {liveCount} live · {monitoredPct}% monitored
                </p>
              </div>
            </div>

            {/* Right: search + filters + new */}
            <div className="flex items-center gap-2 mt-0.5">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg text-[12px] w-48"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#FFFFFF',
                    outline: 'none',
                  }}
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-[11px] font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.8)',
                  outline: 'none',
                }}
              >
                <option value="ALL" style={{ background: '#1E293B' }}>All Types</option>
                {TYPE_ORDER.map((t) => (
                  <option key={t} value={t} style={{ background: '#1E293B' }}>{TYPE_LABELS[t] || t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-[11px] font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.8)',
                  outline: 'none',
                }}
              >
                <option value="ALL" style={{ background: '#1E293B' }}>All Statuses</option>
                <option value="LIVE" style={{ background: '#1E293B' }}>Live</option>
                <option value="MAINTENANCE" style={{ background: '#1E293B' }}>Maintenance</option>
                <option value="DECOMMISSIONED" style={{ background: '#1E293B' }}>Decommissioned</option>
                <option value="PLANNED" style={{ background: '#1E293B' }}>Planned</option>
              </select>
              {canManage('assets') && (
                <button
                  onClick={() => navigate('/assets/create')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <Plus size={13} /> New Asset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Total CIs" value={totalCount} accentColor={T.indigo} />
        <KPICard label="Live" value={liveCount} accentColor={T.emerald} />
        <KPICard label="In Maintenance" value={maintCount} accentColor={T.amber} />
        <KPICard label="Monitored" value={`${monitoredPct}%`} accentColor={T.cyan} />
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 rounded-xl"
          style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.indigo }} />
          <span className="ml-3 text-[13px]" style={{ color: T.textSecondary }}>Loading configuration items...</span>
        </div>
      )}

      {/* CATEGORY GRID (when typeFilter='ALL') */}
      {!isLoading && typeFilter === 'ALL' && (
        <Panel
          title="Browse by Category"
          titleIcon={<Activity size={14} style={{ color: T.indigo }} />}
          titleExtra={
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: '#EEF2FF', color: T.indigo }}>
              {TYPE_ORDER.filter(t => assets.some(a => a.type === t)).length} types
            </span>
          }
          accentColor={T.indigo}
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {TYPE_ORDER.map((t) => {
              const Icon = typeIcons[t] || Server;
              const accentColor = TYPE_COLORS[t] || T.indigo;
              const count = assets.filter((a) => a.type === t).length;
              return (
                <div
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="cursor-pointer rounded-xl overflow-hidden transition-all duration-150 hover:-translate-y-0.5"
                  style={{
                    background: T.cardBg,
                    border: `1px solid ${T.cardBorder}`,
                    boxShadow: T.cardShadow,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = accentColor;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = T.cardShadowHover;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = T.cardBorder;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = T.cardShadow;
                  }}
                >
                  {/* Accent top stripe */}
                  <div className="h-[3px]" style={{ background: accentColor }} />
                  {/* Image area */}
                  <div className="w-full flex items-center justify-center"
                    style={{ height: 52, background: `${accentColor}08` }}>
                    {TYPE_IMAGES[t] ? (
                      <img src={TYPE_IMAGES[t]} alt={TYPE_LABELS[t]} style={{ height: 38, objectFit: 'contain' }} />
                    ) : (
                      <Icon size={26} style={{ color: accentColor, opacity: 0.5 }} />
                    )}
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {TYPE_LABELS[t] || t.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 13, fontFamily: T.mono, fontWeight: 900, color: count > 0 ? accentColor : T.textMuted, marginTop: 2 }}>
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* EMPTY STATE */}
      {!isLoading && assets.length === 0 && typeFilter !== 'ALL' && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
          <Server size={36} style={{ color: T.textMuted, opacity: 0.3 }} />
          <p className="mt-3 text-[13px]" style={{ color: T.textSecondary }}>No {TYPE_LABELS[typeFilter] || typeFilter} found</p>
          <p className="text-[11px] mt-1" style={{ color: T.textMuted }}>
            {canManage('assets') && (
              <>
                <button onClick={() => navigate('/assets/create')} style={{ color: T.indigo, textDecoration: 'underline' }}>Add new</button>
                {' or '}
              </>
            )}
            <button onClick={() => setTypeFilter('ALL')} style={{ color: T.indigo, textDecoration: 'underline' }}>browse all</button>
          </p>
        </div>
      )}

      {/* GROUPED ASSET TABLES */}
      {!isLoading && grouped.map((group) => {
        const Icon = typeIcons[group.type] || Server;
        const accentColor = TYPE_COLORS[group.type] || T.indigo;

        return (
          <Panel
            key={group.type}
            title={group.label}
            titleIcon={<Icon size={14} style={{ color: accentColor }} />}
            titleExtra={
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: `${accentColor}12`, color: accentColor }}>
                {group.assets.length}
              </span>
            }
            accentColor={accentColor}
            noPad
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.panelHeaderBg }}>
                  {['', 'NAME', 'IP ADDRESS', 'HOSTNAME', 'STATUS', 'MONITORING'].map((h, i) => (
                    <th key={i} style={{
                      padding: '6px 12px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: T.textMuted,
                      borderBottom: `1px solid ${T.divider}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.assets.map((asset, idx) => {
                  const s = STATUS_STYLES[asset.status] || { color: T.textMuted, bg: T.pageBg };
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => navigate(`/assets/${asset.id}`)}
                      className="cursor-pointer"
                      style={{ background: idx % 2 === 1 ? T.pageBg : T.cardBg, borderBottom: `1px solid ${T.divider}` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#EFF6FF'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 1 ? T.pageBg : T.cardBg; }}
                    >
                      <td style={{ padding: '6px 12px', width: 32 }}>
                        <StatusDot color={s.color} />
                      </td>
                      <td style={{ padding: '6px 12px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{asset.name}</span>
                      </td>
                      <td style={{ padding: '6px 12px' }}>
                        <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textSecondary }}>
                           {asset.ipAddress || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 12px' }}>
                        <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textMuted }}>
                           {asset.hostname || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 12px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          color: s.color, background: s.bg,
                          padding: '2px 7px', borderRadius: 4,
                        }}>
                          {asset.status}
                        </span>
                      </td>
                      <td style={{ padding: '6px 12px' }}>
                        <span
                          className="inline-block rounded-full"
                          style={{
                            width: 7,
                            height: 7,
                            background: asset.monitoringEnabled ? T.emerald : T.divider,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        );
      })}
    </div>
  );
}
