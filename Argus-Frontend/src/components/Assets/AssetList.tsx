import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Server,
  Database,
  Globe,
  Cpu,
  HardDrive,
  Network,
  Container,
  Monitor,
  Grid3X3,
  List,
  Search,
  Filter,
  Loader2,
} from 'lucide-react';
import { useAssets } from '../../hooks/useAssets';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';

// ── Types ──

type AssetType =
  | 'SERVER'
  | 'KUBERNETES_CLUSTER'
  | 'DATABASE'
  | 'APPLICATION'
  | 'NETWORK'
  | 'STORAGE'
  | 'CONTAINER'
  | 'VM'
  | 'LOAD_BALANCER';

type AssetStatus = 'LIVE' | 'MAINTENANCE' | 'DECOMMISSIONED' | 'PLANNED';

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  ipAddress: string;
  location: string;
  datacenter: string;
  monitoringEnabled: boolean;
  description: string;
}

// ── Helpers ──

const typeIcons: Record<AssetType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  SERVER: Server,
  KUBERNETES_CLUSTER: Container,
  DATABASE: Database,
  APPLICATION: Globe,
  NETWORK: Network,
  STORAGE: HardDrive,
  CONTAINER: Container,
  VM: Monitor,
  LOAD_BALANCER: Cpu,
};

const typeColorStyles: Record<AssetType, { bg: string; color: string; border: string }> = {
  SERVER:             { bg: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
  KUBERNETES_CLUSTER: { bg: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' },
  DATABASE:           { bg: 'rgba(217,119,6,0.08)',   color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' },
  APPLICATION:        { bg: 'rgba(5,150,105,0.08)',   color: '#059669', border: '1px solid rgba(5,150,105,0.2)' },
  NETWORK:            { bg: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
  STORAGE:            { bg: 'rgba(217,119,6,0.08)',   color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' },
  CONTAINER:          { bg: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' },
  VM:                 { bg: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
  LOAD_BALANCER:      { bg: 'rgba(220,38,38,0.08)',  color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' },
};

const statusColorStyles: Record<AssetStatus, { bg: string; color: string; border: string; dot: string }> = {
  LIVE:             { bg: 'rgba(5,150,105,0.08)',   color: '#059669', border: '1px solid rgba(5,150,105,0.2)', dot: '#10B981' },
  MAINTENANCE:      { bg: 'rgba(217,119,6,0.08)',   color: '#d97706', border: '1px solid rgba(217,119,6,0.2)', dot: '#F59E0B' },
  DECOMMISSIONED:   { bg: 'rgba(100,116,139,0.06)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.15)', dot: '#94a3b8' },
  PLANNED:          { bg: 'rgba(168,85,247,0.08)',   color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)', dot: '#a855f7' },
};

// ── Subcomponents ──

function TypeBadge({ type }: { type: AssetType }) {
  const s = typeColorStyles[type];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: s.bg, color: s.color, border: s.border }}
    >
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: AssetStatus }) {
  const s = statusColorStyles[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: s.bg, color: s.color, border: s.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

function MonitoringDot({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#10B981' }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#10B981' }} />
        </span>
        <span className="text-[10px] font-mono" style={{ color: '#059669' }}>Active</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#94a3b8' }} />
      </span>
      <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>Disabled</span>
    </span>
  );
}

// ── Main Component ──

export default function AssetList() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const organization = useAuthStore((s) => s.organization);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'ALL'>('ALL');
  const [monitoringFilter, setMonitoringFilter] = useState<'ALL' | 'ON' | 'OFF'>('ALL');

  // Build filters for backend query
  const queryFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (typeFilter !== 'ALL') f.type = typeFilter;
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (monitoringFilter !== 'ALL') f.monitoringEnabled = monitoringFilter === 'ON' ? 'true' : 'false';
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [typeFilter, statusFilter, monitoringFilter, searchQuery]);

  // API hook
  const { data: assetsResponse, isLoading } = useAssets(queryFilters);

  // Extract assets array from backend response shape: { success, data, pagination }
  const assets: Asset[] = assetsResponse?.data ?? [];

  // Total count from pagination if available, otherwise use current array length
  const totalCount = assetsResponse?.pagination?.total ?? assets.length;

  const handleNavigate = (id: string) => {
    navigate(`/assets/${id}`);
  };

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#eef2ff', minHeight: '100vh', padding: '1.5rem' }}>
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Server size={16} style={{ color: '#a7f3d0' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Assets / CMDB</h1>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase" style={{ background: 'rgba(255,255,255,0.1)', color: '#a7f3d0', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {organization?.environment || 'DEV'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: '#ffffff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>{assets.length} shown</span>
              </div>
              <div className="flex items-center gap-2 text-sm ml-[42px]">
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Configuration Management Database &middot; <span className="font-mono" style={{ color: '#ffffff' }}>{totalCount}</span> items</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                <a href={window.location.origin} target="_blank" rel="noopener noreferrer" className="font-mono text-xs transition-colors" style={{ color: '#a7f3d0' }}>
                  {window.location.host}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {canManage('assets') && (
                <button
                  onClick={() => navigate('/assets/create')}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                >
                  <Server size={15} /> New Asset
                </button>
              )}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className="p-2 rounded-md transition-all duration-200"
                  style={viewMode === 'grid' ? { background: 'rgba(255,255,255,0.2)', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' } : { color: 'rgba(255,255,255,0.6)' }}
                  title="Grid view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="p-2 rounded-md transition-all duration-200"
                  style={viewMode === 'list' ? { background: 'rgba(255,255,255,0.2)', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' } : { color: 'rgba(255,255,255,0.6)' }}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Gradient divider */}
      <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #059669, #34d399, #a7f3d0, transparent)' }} />

      {/* ── FILTER BAR ── */}
      <div className="mt-3 relative z-10 rounded-xl p-3 mb-4" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
            <Filter size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Filters</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AssetType | 'ALL')}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none transition-all"
            style={{
              background: typeFilter !== 'ALL' ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
              color: typeFilter !== 'ALL' ? '#6366f1' : '#64748b',
              border: typeFilter !== 'ALL' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(99,102,241,0.12)',
            }}
          >
            <option value="ALL">All Types</option>
            <option value="SERVER">Server</option>
            <option value="KUBERNETES_CLUSTER">Kubernetes Cluster</option>
            <option value="DATABASE">Database</option>
            <option value="APPLICATION">Application</option>
            <option value="NETWORK">Network</option>
            <option value="STORAGE">Storage</option>
            <option value="CONTAINER">Container</option>
            <option value="VM">VM</option>
            <option value="LOAD_BALANCER">Load Balancer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AssetStatus | 'ALL')}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none transition-all"
            style={{
              background: statusFilter !== 'ALL' ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
              color: statusFilter !== 'ALL' ? '#6366f1' : '#64748b',
              border: statusFilter !== 'ALL' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(99,102,241,0.12)',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="LIVE">Live</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="DECOMMISSIONED">Decommissioned</option>
            <option value="PLANNED">Planned</option>
          </select>

          <select
            value={monitoringFilter}
            onChange={(e) => setMonitoringFilter(e.target.value as 'ALL' | 'ON' | 'OFF')}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none transition-all"
            style={{
              background: monitoringFilter !== 'ALL' ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
              color: monitoringFilter !== 'ALL' ? '#6366f1' : '#64748b',
              border: monitoringFilter !== 'ALL' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(99,102,241,0.12)',
            }}
          >
            <option value="ALL">All Monitoring</option>
            <option value="ON">Monitoring On</option>
            <option value="OFF">Monitoring Off</option>
          </select>

          <div className="w-px h-7 hidden sm:block" style={{ background: 'rgba(99,102,241,0.12)' }} />

          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, IP, datacenter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
              style={{
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.12)',
                color: '#0f172a',
              }}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 text-center rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: '#6366f1' }} />
          <p className="font-medium" style={{ color: '#64748b' }}>Loading assets...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && assets.length === 0 && (
        <div className="p-12 text-center rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <Server className="w-12 h-12 mx-auto mb-3" style={{ color: '#94a3b8' }} />
          <p className="font-medium" style={{ color: '#94a3b8' }}>No assets match your filters</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Adjust filters or search criteria</p>
        </div>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === 'grid' && assets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const Icon = typeIcons[asset.type] || Server;
            const tc = typeColorStyles[asset.type];
            return (
              <div
                key={asset.id}
                onClick={() => handleNavigate(asset.id)}
                className="p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] group rounded-xl"
                style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl"
                      style={{ background: tc.bg }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: tc.color }}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-bold transition-colors" style={{ color: '#0f172a' }}>
                        {asset.name}
                      </h3>
                      <p className="text-[11px] font-mono mt-0.5" style={{ color: '#94a3b8' }}>{asset.id}</p>
                    </div>
                  </div>
                  <MonitoringDot enabled={asset.monitoringEnabled} />
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <TypeBadge type={asset.type} />
                  <StatusBadge status={asset.status} />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span style={{ color: '#94a3b8' }}>IP</span>
                    <span className="font-mono" style={{ color: '#64748b' }}>{asset.ipAddress || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: '#94a3b8' }}>Location</span>
                    <span className="font-mono" style={{ color: '#64748b' }}>{asset.location || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: '#94a3b8' }}>Datacenter</span>
                    <span className="font-mono" style={{ color: '#64748b' }}>{asset.datacenter || 'N/A'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === 'list' && assets.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                  <th className="text-left text-[10px] font-mono font-medium uppercase tracking-wider px-4 py-3" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)' }}>
                    Name
                  </th>
                  <th className="text-left text-[10px] font-mono font-medium uppercase tracking-wider px-4 py-3" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)' }}>
                    Type
                  </th>
                  <th className="text-left text-[10px] font-mono font-medium uppercase tracking-wider px-4 py-3" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)' }}>
                    Status
                  </th>
                  <th className="text-left text-[10px] font-mono font-medium uppercase tracking-wider px-4 py-3" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)' }}>
                    IP
                  </th>
                  <th className="text-left text-[10px] font-mono font-medium uppercase tracking-wider px-4 py-3" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)' }}>
                    Location
                  </th>
                  <th className="text-left text-[10px] font-mono font-medium uppercase tracking-wider px-4 py-3" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)' }}>
                    Monitoring
                  </th>
                  <th className="text-left text-[10px] font-mono font-medium uppercase tracking-wider px-4 py-3" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.04)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const Icon = typeIcons[asset.type] || Server;
                  const tc = typeColorStyles[asset.type];
                  return (
                    <tr
                      key={asset.id}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
                      onClick={() => handleNavigate(asset.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className="w-4 h-4"
                            style={{ color: tc.color }}
                          />
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#0f172a' }}>{asset.name}</p>
                            <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{asset.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={asset.type} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono" style={{ color: '#64748b' }}>{asset.ipAddress || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-xs" style={{ color: '#64748b' }}>{asset.location || 'N/A'}</span>
                          <p className="text-[10px]" style={{ color: '#94a3b8' }}>{asset.datacenter || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <MonitoringDot enabled={asset.monitoringEnabled} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(asset.id);
                          }}
                          className="px-2.5 py-1 text-xs rounded-lg transition-all"
                          style={{ color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
