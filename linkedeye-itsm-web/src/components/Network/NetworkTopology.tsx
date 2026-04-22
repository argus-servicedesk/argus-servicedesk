import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Server,
  Database,
  Globe,
  Network,
  HardDrive,
  Container,
  Monitor,
  Box,
  GitBranch,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ListTree,
  Wifi,
  WifiOff,
  GitFork,
} from 'lucide-react';
import { useAssets } from '../../hooks/useAssets';
import TopologyView from './TopologyView';

// -- Types --

type CIType =
  | 'SERVER'
  | 'KUBERNETES_CLUSTER'
  | 'DATABASE'
  | 'APPLICATION'
  | 'NETWORK'
  | 'STORAGE'
  | 'CONTAINER'
  | 'VM'
  | 'LOAD_BALANCER';

type CIStatus = 'LIVE' | 'MAINTENANCE' | 'DECOMMISSIONED' | 'PLANNED';

interface ConfigItem {
  id: string;
  name: string;
  type: CIType;
  status: CIStatus;
  ipAddress: string | null;
  hostname: string | null;
  location: string | null;
  dataCenter: string | null;
  monitoringEnabled: boolean;
  description: string | null;
}

// -- Constants --

const CI_TYPES: CIType[] = [
  'SERVER',
  'KUBERNETES_CLUSTER',
  'DATABASE',
  'APPLICATION',
  'NETWORK',
  'STORAGE',
  'CONTAINER',
  'VM',
  'LOAD_BALANCER',
];

const CI_STATUSES: CIStatus[] = ['LIVE', 'MAINTENANCE', 'DECOMMISSIONED', 'PLANNED'];

const typeIcons: Record<CIType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  SERVER: Server,
  KUBERNETES_CLUSTER: Container,
  DATABASE: Database,
  APPLICATION: Globe,
  NETWORK: Network,
  STORAGE: HardDrive,
  CONTAINER: Box,
  VM: Monitor,
  LOAD_BALANCER: GitBranch,
};

const typeLabels: Record<CIType, string> = {
  SERVER: 'Servers',
  KUBERNETES_CLUSTER: 'Kubernetes Clusters',
  DATABASE: 'Databases',
  APPLICATION: 'Applications',
  NETWORK: 'Network Devices',
  STORAGE: 'Storage',
  CONTAINER: 'Containers',
  VM: 'Virtual Machines',
  LOAD_BALANCER: 'Load Balancers',
};

/* -- Purple-dark type color tokens using inline styles -- */
const typeColorTokens: Record<CIType, { bg: string; text: string; border: string; iconBg: string }> = {
  SERVER:             { bg: 'rgba(99,102,241,0.06)',  text: '#64748b', border: 'rgba(99,102,241,0.15)', iconBg: 'rgba(99,102,241,0.10)' },
  KUBERNETES_CLUSTER: { bg: 'rgba(99,102,241,0.06)',  text: '#334155', border: 'rgba(99,102,241,0.15)', iconBg: 'rgba(99,102,241,0.10)' },
  DATABASE:           { bg: 'rgba(217,119,6,0.10)',   text: '#FBBF24', border: 'rgba(217,119,6,0.25)',  iconBg: 'rgba(217,119,6,0.15)' },
  APPLICATION:        { bg: 'rgba(5,150,105,0.10)',   text: '#34D399', border: 'rgba(5,150,105,0.25)',  iconBg: 'rgba(5,150,105,0.15)' },
  NETWORK:            { bg: 'rgba(217,70,239,0.10)',  text: '#E879F9', border: 'rgba(217,70,239,0.25)', iconBg: 'rgba(168,85,247,0.08)' },
  STORAGE:            { bg: 'rgba(234,88,12,0.10)',   text: '#FB923C', border: 'rgba(234,88,12,0.25)',  iconBg: 'rgba(234,88,12,0.15)' },
  CONTAINER:          { bg: 'rgba(168,85,247,0.10)',  text: '#334155', border: 'rgba(168,85,247,0.25)', iconBg: 'rgba(168,85,247,0.15)' },
  VM:                 { bg: 'rgba(99,102,241,0.06)',  text: '#64748b', border: 'rgba(99,102,241,0.15)', iconBg: 'rgba(99,102,241,0.10)' },
  LOAD_BALANCER:      { bg: 'rgba(244,63,94,0.10)',   text: '#FB7185', border: 'rgba(244,63,94,0.25)',  iconBg: 'rgba(244,63,94,0.15)' },
};

const statusTokens: Record<CIStatus, { bg: string; text: string; border: string; dot: string }> = {
  LIVE:             { bg: 'rgba(5,150,105,0.10)',   text: '#34D399', border: 'rgba(5,150,105,0.25)',  dot: '#34D399' },
  MAINTENANCE:      { bg: 'rgba(217,119,6,0.10)',   text: '#FBBF24', border: 'rgba(217,119,6,0.25)',  dot: '#FBBF24' },
  DECOMMISSIONED:   { bg: 'rgba(109,90,138,0.10)',  text: '#94a3b8', border: 'rgba(109,90,138,0.25)', dot: '#94a3b8' },
  PLANNED:          { bg: 'rgba(99,102,241,0.06)',   text: '#64748b', border: 'rgba(99,102,241,0.15)', dot: '#64748b' },
};

/* -- Shared inline style helpers -- */
const inputStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  color: '#0F172A',
  borderRadius: 10,
  padding: '6px 12px',
  fontSize: 14,
  outline: 'none',
};

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

// -- Subcomponents --

function StatusBadge({ status }: { status: CIStatus }) {
  const t = statusTokens[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: t.bg, color: t.text, border: `1px solid ${t.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: CIType }) {
  const t = typeColorTokens[type];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: t.bg, color: t.text, border: `1px solid ${t.border}` }}
    >
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function HealthIndicator({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#34D399' }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#34D399' }} />
        </span>
        <span className="text-[10px] font-mono" style={{ color: '#34D399' }}>Monitored</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#94a3b8' }} />
      </span>
      <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>Unmonitored</span>
    </span>
  );
}

function TreeNode({ ci, onClick }: { ci: ConfigItem; onClick: () => void }) {
  const Icon = typeIcons[ci.type] || Server;
  const t = typeColorTokens[ci.type];
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors rounded-lg group"
      style={{ borderRadius: 8 }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.04)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <div className="w-6 h-6 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full" style={{ border: '2px solid rgba(99,102,241,0.18)' }} />
      </div>
      <div className="p-1.5 rounded-lg" style={{ background: t.iconBg }}>
        <Icon className="w-3.5 h-3.5" style={{ color: t.text }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium transition-colors truncate" style={{ color: '#0f172a' }}>
          {ci.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {ci.hostname && (
            <span className="text-[10px] font-mono truncate" style={{ color: '#94a3b8' }}>{ci.hostname}</span>
          )}
          {ci.ipAddress && (
            <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{ci.ipAddress}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <HealthIndicator enabled={ci.monitoringEnabled} />
        <StatusBadge status={ci.status} />
      </div>
    </div>
  );
}

function TreeGroup({
  type,
  items,
  onClickItem,
}: {
  type: CIType;
  items: ConfigItem[];
  onClickItem: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const Icon = typeIcons[type] || Server;
  const t = typeColorTokens[type];

  return (
    <div className="overflow-hidden" style={cardStyle}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 transition-colors"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.04)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" style={{ color: '#64748b' }} />
        ) : (
          <ChevronRight className="w-4 h-4" style={{ color: '#64748b' }} />
        )}
        <div className="p-2 rounded-xl" style={{ background: t.iconBg }}>
          <Icon className="w-5 h-5" style={{ color: t.text }} />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-display font-bold" style={{ color: '#0f172a' }}>
            {typeLabels[type]}
          </span>
        </div>
        <span
          className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-mono font-medium"
          style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.10)', color: '#6366f1' }}
        >
          {items.length}
        </span>
      </button>
      {expanded && items.length > 0 && (
        <div className="px-2 py-1" style={{ borderTop: '1px solid rgba(99,102,241,0.05)' }}>
          {items.map((ci) => (
            <TreeNode key={ci.id} ci={ci} onClick={() => onClickItem(ci.id)} />
          ))}
        </div>
      )}
      {expanded && items.length === 0 && (
        <div className="px-5 py-4 text-center" style={{ borderTop: '1px solid rgba(99,102,241,0.05)' }}>
          <p className="text-xs" style={{ color: '#94a3b8' }}>No configuration items in this category</p>
        </div>
      )}
    </div>
  );
}

function GridCard({
  ci,
  onClick,
}: {
  ci: ConfigItem;
  onClick: () => void;
}) {
  const Icon = typeIcons[ci.type] || Server;
  const t = typeColorTokens[ci.type];
  return (
    <div
      onClick={onClick}
      className="p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] group"
      style={{
        ...cardStyle,
        borderColor: 'rgba(99,102,241,0.08)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.18)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.08)'; }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: t.iconBg }}>
            <Icon className="w-5 h-5" style={{ color: t.text }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-display font-bold transition-colors truncate" style={{ color: '#0f172a' }}>
              {ci.name}
            </h3>
            {ci.hostname && (
              <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: '#94a3b8' }}>
                {ci.hostname}
              </p>
            )}
          </div>
        </div>
        <HealthIndicator enabled={ci.monitoringEnabled} />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <TypeBadge type={ci.type} />
        <StatusBadge status={ci.status} />
      </div>

      <div className="space-y-1.5 text-xs" style={{ color: '#64748b' }}>
        <div className="flex items-center justify-between">
          <span style={{ color: '#94a3b8' }}>IP</span>
          <span className="font-mono">{ci.ipAddress ?? '--'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: '#94a3b8' }}>Location</span>
          <span className="font-mono">{ci.location ?? '--'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: '#94a3b8' }}>Data Center</span>
          <span className="font-mono">{ci.dataCenter ?? '--'}</span>
        </div>
      </div>
    </div>
  );
}

function GridGroup({
  type,
  items,
  onClickItem,
}: {
  type: CIType;
  items: ConfigItem[];
  onClickItem: (id: string) => void;
}) {
  const Icon = typeIcons[type] || Server;
  const t = typeColorTokens[type];

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-xl" style={{ background: t.iconBg }}>
          <Icon className="w-5 h-5" style={{ color: t.text }} />
        </div>
        <h2 className="text-base font-display font-bold" style={{ color: '#0f172a' }}>{typeLabels[type]}</h2>
        <span
          className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-mono font-medium"
          style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.10)', color: '#6366f1' }}
        >
          {items.length}
        </span>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((ci) => (
            <GridCard key={ci.id} ci={ci} onClick={() => onClickItem(ci.id)} />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center" style={cardStyle}>
          <p className="text-xs" style={{ color: '#94a3b8' }}>No configuration items</p>
        </div>
      )}
    </div>
  );
}

// -- Main Component --

export default function NetworkTopology() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'tree' | 'grid' | 'topology'>('topology');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CIType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<CIStatus | 'ALL'>('ALL');

  // Build query filters for the API — fetch up to 100 to show all CIs in topology
  const queryFilters = useMemo(() => {
    const f: Record<string, string> = { limit: '100' };
    if (typeFilter !== 'ALL') f.type = typeFilter;
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [typeFilter, statusFilter, searchQuery]);

  // Fetch assets via TanStack Query
  const { data: assetsResponse, isLoading, isError, error } = useAssets(queryFilters);

  // Extract assets from API response shape: { success, data, pagination }
  const assets: ConfigItem[] = assetsResponse?.data ?? [];
  const totalCount: number = assetsResponse?.pagination?.total ?? assets.length;

  // Group CIs by type
  const groupedAssets = useMemo(() => {
    const groups: Record<CIType, ConfigItem[]> = {
      SERVER: [],
      KUBERNETES_CLUSTER: [],
      DATABASE: [],
      APPLICATION: [],
      NETWORK: [],
      STORAGE: [],
      CONTAINER: [],
      VM: [],
      LOAD_BALANCER: [],
    };

    assets.forEach((ci) => {
      if (groups[ci.type]) {
        groups[ci.type].push(ci);
      }
    });

    return groups;
  }, [assets]);

  // Filter type groups to only show the selected type, or all
  const visibleTypes = useMemo(() => {
    if (typeFilter !== 'ALL') {
      return CI_TYPES.filter((t) => t === typeFilter);
    }
    return CI_TYPES;
  }, [typeFilter]);

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<CIStatus, number> = {
      LIVE: 0,
      MAINTENANCE: 0,
      DECOMMISSIONED: 0,
      PLANNED: 0,
    };
    assets.forEach((ci) => {
      if (counts[ci.status] !== undefined) {
        counts[ci.status]++;
      }
    });
    return counts;
  }, [assets]);

  const handleNavigate = (id: string) => {
    navigate(`/assets/${id}`);
  };

  const selectStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    color: '#0F172A',
    fontSize: 13,
    minWidth: 170,
    padding: '6px 12px',
    outline: 'none',
    appearance: 'auto' as React.CSSProperties['appearance'],
  };

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh', margin: '-1rem', padding: '1.25rem' }}>
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* dot-grid texture */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4" style={{ background: 'rgba(217,119,6,0.25)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full translate-y-1/2 -translate-x-1/4" style={{ background: 'rgba(217,119,6,0.2)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full" style={{ background: 'rgba(217,119,6,0.15)', filter: 'blur(80px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Network size={16} style={{ color: '#FCD34D' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Network Topology</h1>
              </div>
              <p className="text-sm ml-[42px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                CMDB Configuration Items &middot; <span className="font-mono" style={{ color: '#FCD34D' }}>{totalCount}</span> total CIs
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#6ee7b7' }}
                >
                  <Wifi className="w-3 h-3" />
                  {statusCounts.LIVE} Live
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fbbf24' }}
                >
                  <WifiOff className="w-3 h-3" />
                  {statusCounts.MAINTENANCE} Maint.
                </span>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <button
                  onClick={() => setViewMode('topology')}
                  className="p-2 rounded-md transition-all duration-200"
                  style={viewMode === 'topology' ? { background: 'rgba(255,255,255,0.2)', color: '#ffffff' } : { color: 'rgba(255,255,255,0.5)' }}
                  title="Topology view"
                >
                  <GitFork className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className="p-2 rounded-md transition-all duration-200"
                  style={viewMode === 'tree' ? { background: 'rgba(255,255,255,0.2)', color: '#ffffff' } : { color: 'rgba(255,255,255,0.5)' }}
                  title="Tree view"
                >
                  <ListTree className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className="p-2 rounded-md transition-all duration-200"
                  style={viewMode === 'grid' ? { background: 'rgba(255,255,255,0.2)', color: '#ffffff' } : { color: 'rgba(255,255,255,0.5)' }}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* gradient accent divider */}
      <div className="-mt-5 mb-4" style={{ height: 3, background: 'linear-gradient(90deg, #D97706, #F59E0B, #FCD34D, transparent)' }} />

      {/* Topology View — uses its own data source, so filter bar / loading / error are hidden */}
      {viewMode === 'topology' && (
        <TopologyView />
      )}

      {/* Filter Bar — only for tree/grid views */}
      {viewMode !== 'topology' && (
        <div className="p-4" style={cardStyle}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2" style={{ color: '#64748b' }}>
              <Filter className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Filters</span>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CIType | 'ALL')}
              style={selectStyle}
            >
              <option value="ALL">All Types</option>
              {CI_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabels[t]}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CIStatus | 'ALL')}
              style={selectStyle}
            >
              <option value="ALL">All Statuses</option>
              {CI_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by name, IP, hostname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 36, width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {viewMode !== 'topology' && isLoading && (
        <div className="p-12 text-center" style={cardStyle}>
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: '#6366f1' }} />
          <p className="font-medium" style={{ color: '#6366f1' }}>Loading network topology...</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Fetching configuration items from CMDB</p>
        </div>
      )}

      {/* Error State */}
      {viewMode !== 'topology' && !isLoading && isError && (
        <div className="p-12 text-center" style={cardStyle}>
          <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: '#D97706' }} />
          <p className="font-medium" style={{ color: '#6366f1' }}>Failed to load network topology</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm px-5 py-2 rounded-lg font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {viewMode !== 'topology' && !isLoading && !isError && assets.length === 0 && (
        <div className="p-12 text-center" style={cardStyle}>
          <Network className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="font-medium" style={{ color: '#6366f1' }}>No configuration items found</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Adjust filters or search criteria to see results'
              : 'Add assets to the CMDB to populate the network topology'}
          </p>
        </div>
      )}

      {/* Tree View */}
      {!isLoading && !isError && viewMode === 'tree' && assets.length > 0 && (
        <div className="space-y-3">
          {visibleTypes.map((type) => (
            <TreeGroup
              key={type}
              type={type}
              items={groupedAssets[type]}
              onClickItem={handleNavigate}
            />
          ))}
        </div>
      )}

      {/* Grid View */}
      {!isLoading && !isError && viewMode === 'grid' && assets.length > 0 && (
        <div className="space-y-8">
          {visibleTypes.map((type) => {
            const items = groupedAssets[type];
            if (typeFilter === 'ALL' && items.length === 0) return null;
            return (
              <GridGroup
                key={type}
                type={type}
                items={items}
                onClickItem={handleNavigate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
