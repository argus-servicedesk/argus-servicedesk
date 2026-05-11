import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowLeft,
  Server,
  Activity,
  Link2,
  ChevronRight,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Clock,
  MapPin,
  Shield,
  AlertTriangle,
  Loader2,
  Pencil,
  X,
  Save,
  Wifi,
  ArrowDownCircle,
  ArrowUpCircle,
  Info,
  RefreshCw,
  Zap,
  MonitorSpeaker,
  Database,
  Thermometer,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  GitFork,
  Users,
  Truck,
  Trash,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsset, useUpdateAsset, useAssetLiveMetrics, useAssetMetricsHistory } from '../../hooks/useAssets';
import { useAuth } from '../../hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import AssetFinancialPanel from '../CMDB/AssetFinancialPanel';
import AssetRelationshipsPanel from '../CMDB/AssetRelationshipsPanel';
import AssetAllocationPanel from '../CMDB/AssetAllocationPanel';
import AssetMovementPanel from '../CMDB/AssetMovementPanel';
import AssetDisposalPanel from '../CMDB/AssetDisposalPanel';
import DeviceDiagram from './DeviceDiagram';
import { useSvgTemplateList } from '../../hooks/useSvgTemplates';

// ─── Types ───────────────────────────────────────────────────────────────────

type AssetType = 'SERVER' | 'KUBERNETES_CLUSTER' | 'DATABASE' | 'APPLICATION' | 'NETWORK' | 'STORAGE' | 'CONTAINER' | 'VM' | 'LOAD_BALANCER';
type AssetStatus = 'LIVE' | 'MAINTENANCE' | 'DECOMMISSIONED' | 'PLANNED';

// ─── Purple-theme style maps ─────────────────────────────────────────────────

const statusStyle: Record<AssetStatus, React.CSSProperties> = {
  LIVE: { background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' },
  MAINTENANCE: { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  DECOMMISSIONED: { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.25)' },
  PLANNED: { background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
};

const typeStyle: Record<AssetType, React.CSSProperties> = {
  SERVER: { background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
  KUBERNETES_CLUSTER: { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
  DATABASE: { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  APPLICATION: { background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' },
  NETWORK: { background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
  STORAGE: { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  CONTAINER: { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
  VM: { background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
  LOAD_BALANCER: { background: 'rgba(239,68,68,0.15)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' },
};

const liveStatusHex: Record<string, string> = {
  healthy: '#10B981',
  warning: '#D97706',
  critical: '#EF4444',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const glassCard: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.12)',
  backdropFilter: 'blur(12px)',
  borderRadius: '0.75rem',
};

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.12)',
  color: '#0f172a',
  borderRadius: '0.75rem',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const subtleBg: React.CSSProperties = {
  background: 'rgba(99,102,241,0.06)',
  borderRadius: '0.5rem',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function UsageGauge({ label, value, icon: Icon, suffix = '%', subtext }: { label: string; value: number; icon: React.ElementType; suffix?: string; subtext?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct > 85 ? '#EF4444' : pct > 70 ? '#D97706' : '#10B981';
  return (
    <div style={glassCard} className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: '#64748b' }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>{label}</span>
        </div>
        <span className="text-lg font-display font-bold" style={{ color }}>{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.12)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      {subtext && <p className="text-[10px] mt-1.5" style={{ color: '#94a3b8' }}>{subtext}</p>}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const style: React.CSSProperties = severity === 'critical'
    ? { background: 'rgba(239,68,68,0.15)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' }
    : severity === 'warning'
    ? { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' }
    : { background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' };
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={style}>{severity}</span>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ASSET_TYPES = ['SERVER', 'KUBERNETES_CLUSTER', 'DATABASE', 'APPLICATION', 'NETWORK', 'STORAGE', 'CONTAINER', 'VM', 'LOAD_BALANCER'];
const ASSET_STATUSES = ['LIVE', 'MAINTENANCE', 'DECOMMISSIONED', 'PLANNED'];

// ─── Edit Modal ─────────────────────────────────────────────────────────────

function EditAssetModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const updateAsset = useUpdateAsset();
  const [form, setForm] = useState({
    name: asset.name || '',
    type: asset.type || 'SERVER',
    status: asset.status || 'LIVE',
    hostname: asset.hostname || '',
    ipAddress: asset.ipAddress || '',
    os: asset.os || '',
    description: asset.description || '',
    location: asset.location || '',
  });

  const handleSave = async () => {
    try {
      const data: any = {};
      if (form.name !== (asset.name || '')) data.name = form.name;
      if (form.type !== asset.type) data.type = form.type;
      if (form.status !== asset.status) data.status = form.status;
      if (form.hostname !== (asset.hostname || '')) data.hostname = form.hostname;
      if (form.ipAddress !== (asset.ipAddress || '')) data.ipAddress = form.ipAddress;
      if (form.os !== (asset.os || '')) data.os = form.os;
      if (form.description !== (asset.description || '')) data.description = form.description;
      if (form.location !== (asset.location || '')) data.location = form.location;
      if (Object.keys(data).length === 0) { onClose(); return; }
      await updateAsset.mutateAsync({ id: asset.id, data });
      toast.success('Asset updated');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="w-full max-w-lg p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto" style={{ ...glassCard, borderColor: 'rgba(99,102,241,0.15)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: '#0f172a' }}>Edit Asset</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: '#64748b' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                {ASSET_TYPES.map((v) => <option key={v} value={v} style={{ background: '#ffffff', color: '#0f172a' }}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                {ASSET_STATUSES.map((v) => <option key={v} value={v} style={{ background: '#ffffff', color: '#0f172a' }}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Hostname</label>
              <input value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>IP Address</label>
              <input value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>OS</label>
              <input value={form.os} onChange={(e) => setForm({ ...form, os: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>Cancel</button>
          <button onClick={handleSave} disabled={updateAsset.isPending || !form.name.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            {updateAsset.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── System Info Card ────────────────────────────────────────────────────────

function SystemInfoCard({ sysInfo, asset }: { sysInfo: any; asset: any }) {
  return (
    <div style={glassCard} className="p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#6366f1' }}>
        <MonitorSpeaker size={15} style={{ color: '#6366f1' }} /> System Information
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          ['Hostname', sysInfo.hostname || asset.hostname || 'N/A'],
          ['OS', `${sysInfo.os || '-'} ${sysInfo.architecture || ''}`],
          ['Kernel', sysInfo.kernel || '-'],
          ['Architecture', sysInfo.architecture || '-'],
          ['IP Address', asset.ipAddress || 'N/A'],
          ['Uptime', sysInfo.uptimeSeconds ? formatUptime(sysInfo.uptimeSeconds) : '-'],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg p-3" style={subtleBg}>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>{label}</p>
            <p className="text-sm font-mono truncate" style={{ color: '#0f172a' }} title={value as string}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Network Interfaces Table ────────────────────────────────────────────────

function NetworkInterfacesCard({ interfaces }: { interfaces: any[] }) {
  if (!interfaces || interfaces.length === 0) {
    return (
      <div style={glassCard} className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6366f1' }}>
          <Wifi size={15} style={{ color: '#6366f1' }} /> Network Interfaces
        </h3>
        <p className="text-xs text-center py-4" style={{ color: '#94a3b8' }}>No network interface data available</p>
      </div>
    );
  }

  return (
    <div style={glassCard} className="p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#6366f1' }}>
        <Wifi size={15} style={{ color: '#6366f1' }} /> Network Interfaces
        <span className="text-[10px] font-mono ml-auto" style={{ color: '#94a3b8' }}>{interfaces.length} interfaces</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <th className="text-left py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Interface</th>
              <th className="text-left py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>State</th>
              <th className="text-left py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>MAC</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#10B981' }}>RX Rate</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#6366f1' }}>TX Rate</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>RX Total</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>TX Total</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Errors</th>
            </tr>
          </thead>
          <tbody>
            {interfaces.map((iface: any) => (
              <tr key={iface.device} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2">
                    <Network size={12} style={{ color: '#6366f1' }} />
                    <span className="font-mono font-medium" style={{ color: '#0f172a' }}>{iface.device}</span>
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={iface.operstate === 'up' ? { background: 'rgba(16,185,129,0.15)', color: '#059669' } : { background: 'rgba(148,163,184,0.1)', color: '#94a3b8' }}>
                    {iface.operstate === 'up' ? <CheckCircle size={9} /> : <XCircle size={9} />}
                    {iface.operstate}
                  </span>
                </td>
                <td className="py-2.5 px-2 font-mono" style={{ color: '#64748b' }}>{iface.macAddress || '-'}</td>
                <td className="py-2.5 px-2 text-right font-mono" style={{ color: '#059669' }}>
                  <span className="inline-flex items-center gap-0.5"><ArrowDownCircle size={10} />{iface.rxRate}</span>
                </td>
                <td className="py-2.5 px-2 text-right font-mono" style={{ color: '#6366f1' }}>
                  <span className="inline-flex items-center gap-0.5"><ArrowUpCircle size={10} />{iface.txRate}</span>
                </td>
                <td className="py-2.5 px-2 text-right font-mono" style={{ color: '#6366f1' }}>{iface.rxTotal}</td>
                <td className="py-2.5 px-2 text-right font-mono" style={{ color: '#6366f1' }}>{iface.txTotal}</td>
                <td className="py-2.5 px-2 text-right">
                  {(iface.rxErrors > 0 || iface.txErrors > 0) ? (
                    <span className="font-mono" style={{ color: '#EF4444' }}>{iface.rxErrors + iface.txErrors}</span>
                  ) : (
                    <span className="font-mono" style={{ color: '#10B981' }}>0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Filesystem Table ────────────────────────────────────────────────────────

function FilesystemCard({ filesystems }: { filesystems: any[] }) {
  if (!filesystems || filesystems.length === 0) {
    return (
      <div style={glassCard} className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6366f1' }}>
          <HardDrive size={15} style={{ color: '#D97706' }} /> Filesystems
        </h3>
        <p className="text-xs text-center py-4" style={{ color: '#94a3b8' }}>No filesystem data available</p>
      </div>
    );
  }

  return (
    <div style={glassCard} className="p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#6366f1' }}>
        <HardDrive size={15} style={{ color: '#D97706' }} /> Filesystems
        <span className="text-[10px] font-mono ml-auto" style={{ color: '#94a3b8' }}>{filesystems.length} mountpoints</span>
      </h3>
      <div className="space-y-3">
        {filesystems.map((fs: any) => {
          const pct = parseFloat(fs.usedPct);
          const barColor = pct > 90 ? '#EF4444' : pct > 75 ? '#D97706' : '#10B981';
          const textColor = pct > 90 ? '#FCA5A5' : pct > 75 ? '#FCD34D' : '#6EE7B7';
          return (
            <div key={fs.mountpoint} className="rounded-lg p-3" style={subtleBg}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-mono text-xs truncate" style={{ color: '#0f172a' }}>{fs.mountpoint}</span>
                  <span className="text-[10px]" style={{ color: '#94a3b8' }}>({fs.device})</span>
                  <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{fs.fstype}</span>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span style={{ color: '#64748b' }}>{fs.usedGB} / {fs.totalGB} GB</span>
                  <span className="font-bold font-mono" style={{ color: textColor }}>{fs.usedPct}%</span>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.12)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px]" style={{ color: '#94a3b8' }}>
                <span>Used: {fs.usedGB} GB</span>
                <span>Free: {fs.availGB} GB</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Alerts Card ─────────────────────────────────────────────────────────────

function AlertsCard({ alerts }: { alerts: any[] }) {
  return (
    <div style={glassCard} className="p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#6366f1' }}>
        <AlertCircle size={15} style={{ color: '#EF4444' }} /> Firing Alerts
        {alerts.length > 0 && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#DC2626' }}>{alerts.length}</span>
        )}
      </h3>
      {alerts.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle size={28} style={{ color: '#10B981' }} className="mx-auto mb-2" />
          <p className="text-xs" style={{ color: '#94a3b8' }}>No active alerts for this node</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert: any, i: number) => (
            <div key={i} className="rounded-lg p-3" style={alert.severity === 'critical' ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' } : { background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>{alert.alertname}</span>
                <SeverityBadge severity={alert.severity} />
              </div>
              {alert.summary && <p className="text-[11px] leading-relaxed" style={{ color: '#6366f1' }}>{alert.summary}</p>}
              {alert.activeAt && <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>Since: {formatDate(alert.activeAt)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Network Summary Cards ──────────────────────────────────────────────────

function NetworkSummaryCards({ interfaces }: { interfaces: any[] }) {
  const wanLinks = interfaces.filter((i: any) => i.isWan && i.operstate === 'up');
  const bonds = interfaces.filter((i: any) => i.isBond);
  const activeInterfaces = interfaces.filter((i: any) => i.operstate === 'up');
  const totalRx = activeInterfaces.reduce((s: number, i: any) => s + (i.rxBytesPerSec || 0), 0);
  const totalTx = activeInterfaces.reduce((s: number, i: any) => s + (i.txBytesPerSec || 0), 0);
  const criticalLinks = interfaces.filter((i: any) => i.threshold === 'critical');
  const warningLinks = interfaces.filter((i: any) => i.threshold === 'warning');

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div style={glassCard} className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Network size={14} style={{ color: '#6366f1' }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>WAN Links</span>
        </div>
        <p className="text-lg font-display font-bold" style={{ color: '#0f172a' }}>{wanLinks.length}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{bonds.length > 0 ? `${bonds.length} bond(s)` : 'No bond interfaces'}</p>
      </div>
      <div style={glassCard} className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <ArrowDownCircle size={14} style={{ color: '#10B981' }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Total Inbound</span>
        </div>
        <p className="text-lg font-display font-bold font-mono" style={{ color: '#059669' }}>{formatBytesRate(totalRx)}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{activeInterfaces.length} active links</p>
      </div>
      <div style={glassCard} className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <ArrowUpCircle size={14} style={{ color: '#6366f1' }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Total Outbound</span>
        </div>
        <p className="text-lg font-display font-bold font-mono" style={{ color: '#6366f1' }}>{formatBytesRate(totalTx)}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>across all interfaces</p>
      </div>
      <div style={glassCard} className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle size={14} style={{ color: criticalLinks.length > 0 ? '#EF4444' : warningLinks.length > 0 ? '#D97706' : '#10B981' }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Link Health</span>
        </div>
        <p className="text-lg font-display font-bold" style={{ color: criticalLinks.length > 0 ? '#FCA5A5' : warningLinks.length > 0 ? '#FCD34D' : '#6EE7B7' }}>
          {criticalLinks.length > 0 ? `${criticalLinks.length} Critical` : warningLinks.length > 0 ? `${warningLinks.length} Warning` : 'All Healthy'}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{interfaces.filter((i: any) => i.rxErrors + i.txErrors > 0).length} with errors</p>
      </div>
    </div>
  );
}

function InterfaceThroughputBar({ iface }: { iface: any }) {
  const pct = Math.min(100, iface.utilizationPct || 0);
  const barColor = iface.threshold === 'critical' ? '#EF4444' : iface.threshold === 'warning' ? '#D97706' : '#10B981';
  const textColor = iface.threshold === 'critical' ? '#FCA5A5' : iface.threshold === 'warning' ? '#FCD34D' : '#6EE7B7';
  return (
    <div className="rounded-lg p-3" style={subtleBg}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Network size={12} style={{ color: '#6366f1' }} />
          <span className="font-mono text-xs font-medium" style={{ color: '#0f172a' }}>{iface.device}</span>
          {iface.isBond && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>BOND</span>}
          {iface.isWan && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>WAN</span>}
          <span className="inline-flex items-center gap-0.5 text-[10px]" style={{ color: iface.operstate === 'up' ? '#10B981' : '#94a3b8' }}>
            {iface.operstate === 'up' ? <CheckCircle size={9} /> : <XCircle size={9} />} {iface.operstate}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {iface.speedMbps > 0 && <span style={{ color: '#94a3b8' }}>{iface.speedMbps >= 1000 ? `${(iface.speedMbps / 1000).toFixed(0)} Gbps` : `${iface.speedMbps} Mbps`}</span>}
          <span className="font-mono font-bold" style={{ color: textColor }}>{pct.toFixed(1)}%</span>
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(99,102,241,0.12)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: '#94a3b8' }}>
        <span className="flex items-center gap-0.5"><ArrowDownCircle size={9} style={{ color: '#10B981' }} /> RX: {iface.rxRate}</span>
        <span className="flex items-center gap-0.5"><ArrowUpCircle size={9} style={{ color: '#6366f1' }} /> TX: {iface.txRate}</span>
        <span>Errors: {iface.rxErrors + iface.txErrors}</span>
      </div>
    </div>
  );
}

// ─── Disk IO Card ────────────────────────────────────────────────────────────

function DiskIOCard({ diskIO }: { diskIO: any[] }) {
  if (!diskIO || diskIO.length === 0) {
    return (
      <div style={glassCard} className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6366f1' }}>
          <Activity size={15} style={{ color: '#6366f1' }} /> Disk I/O
        </h3>
        <p className="text-xs text-center py-4" style={{ color: '#94a3b8' }}>No disk I/O data available</p>
      </div>
    );
  }

  const asNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return (
    <div style={glassCard} className="p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#6366f1' }}>
        <Activity size={15} style={{ color: '#6366f1' }} /> Disk I/O Performance
        <span className="text-[10px] font-mono ml-auto" style={{ color: '#94a3b8' }}>{diskIO.length} devices</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <th className="text-left py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Device</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>IOPS</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#10B981' }}>Reads/s</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#6366f1' }}>Writes/s</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Read Lat</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Write Lat</th>
              <th className="text-right py-2 px-2 font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Util %</th>
            </tr>
          </thead>
          <tbody>
            {diskIO.map((d: any) => {
              const readMBps = asNumber(d.readMBps);
              const writeMBps = asNumber(d.writeMBps);
              const readsPerSec = asNumber(d.readsPerSec, readMBps);
              const writesPerSec = asNumber(d.writesPerSec, writeMBps);
              const iops = asNumber(d.iops, readsPerSec + writesPerSec);
              const readLatencyMs = asNumber(d.readLatencyMs);
              const writeLatencyMs = asNumber(d.writeLatencyMs);
              const utilizationPct = Math.min(100, Math.max(0, asNumber(d.utilizationPct)));
              const threshold = d.threshold || (utilizationPct >= 90 ? 'critical' : utilizationPct >= 75 ? 'warning' : 'healthy');
              const utilColor = threshold === 'critical' ? '#FCA5A5' : threshold === 'warning' ? '#FCD34D' : '#6EE7B7';
              const latWarn = (ms: number) => ms > 20 ? '#FCA5A5' : ms > 10 ? '#FCD34D' : '#6366f1';
              return (
                <tr key={d.device} className="transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <HardDrive size={12} style={{ color: '#6366f1' }} />
                      <span className="font-mono font-medium" style={{ color: '#0f172a' }}>{d.device}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-medium" style={{ color: '#0f172a' }}>{iops.toFixed(0)}</td>
                  <td className="py-2.5 px-2 text-right font-mono" style={{ color: '#059669' }}>{readsPerSec.toFixed(1)}</td>
                  <td className="py-2.5 px-2 text-right font-mono" style={{ color: '#6366f1' }}>{writesPerSec.toFixed(1)}</td>
                  <td className="py-2.5 px-2 text-right font-mono" style={{ color: latWarn(readLatencyMs) }}>{readLatencyMs.toFixed(2)} ms</td>
                  <td className="py-2.5 px-2 text-right font-mono" style={{ color: latWarn(writeLatencyMs) }}>{writeLatencyMs.toFixed(2)} ms</td>
                  <td className="py-2.5 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.12)' }}>
                        <div className="h-full rounded-full" style={{ width: `${utilizationPct}%`, background: threshold === 'critical' ? '#EF4444' : threshold === 'warning' ? '#D97706' : '#10B981' }} />
                      </div>
                      <span className="font-mono font-bold" style={{ color: utilColor }}>{utilizationPct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Metrics History Charts ─────────────────────────────────────────────────

function MetricsHistorySection({ assetId }: { assetId: string }) {
  const [duration, setDuration] = useState('6h');
  const { data: histData, isLoading, isError } = useAssetMetricsHistory(assetId, duration);
  const series = histData?.data?.series;

  const durations = [
    { label: '1h', value: '1h' },
    { label: '6h', value: '6h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
  ];

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return duration === '7d'
      ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatBytesShort = (b: number) => {
    if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB/s`;
    if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB/s`;
    if (b >= 1024) return `${(b / 1024).toFixed(1)} KB/s`;
    return `${b.toFixed(0)} B/s`;
  };

  const charts = [
    { key: 'cpu', label: 'CPU Usage', color: '#6366f1', unit: '%', data: series?.cpu },
    { key: 'memory', label: 'Memory Usage', color: '#a855f7', unit: '%', data: series?.memory },
    { key: 'disk', label: 'Disk Usage (root)', color: '#D97706', unit: '%', data: series?.disk },
    { key: 'load', label: 'Load Average (1m)', color: '#EF4444', unit: '', data: series?.load },
    { key: 'networkIn', label: 'Network Inbound', color: '#10B981', unit: 'bytes', data: series?.networkIn, formatVal: formatBytesShort },
    { key: 'networkOut', label: 'Network Outbound', color: '#6366f1', unit: 'bytes', data: series?.networkOut, formatVal: formatBytesShort },
  ];

  if (isLoading) {
    return (
      <div style={glassCard} className="p-12 flex flex-col items-center gap-3">
        <Loader2 size={28} style={{ color: '#6366f1' }} className="animate-spin" />
        <p className="text-xs" style={{ color: '#94a3b8' }}>Loading metric history...</p>
      </div>
    );
  }

  if (isError || !series) {
    return (
      <div style={glassCard} className="p-8 text-center">
        <AlertTriangle size={28} style={{ color: '#D97706' }} className="mx-auto mb-2" />
        <p className="text-sm" style={{ color: '#64748b' }}>Unable to fetch metric history</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#6366f1' }}>
          <Clock size={15} style={{ color: '#6366f1' }} /> Metric Trends
        </h3>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)' }}>
          {durations.map(d => (
            <button key={d.value} onClick={() => setDuration(d.value)}
              className="px-3 py-1 text-xs font-medium rounded-md transition-all"
              style={duration === d.value ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff' } : { color: '#64748b' }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charts.map(chart => {
          if (!chart.data || chart.data.length === 0) return null;
          return (
            <div key={chart.key} style={glassCard} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: '#6366f1' }}>{chart.label}</span>
                <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
                  Current: <span style={{ color: chart.color }} className="font-bold">
                    {chart.formatVal ? chart.formatVal(chart.data[chart.data.length - 1]?.v || 0) : `${(chart.data[chart.data.length - 1]?.v || 0).toFixed(1)}${chart.unit}`}
                  </span>
                </span>
              </div>
              <div style={{ width: '100%', minWidth: 0, minHeight: 140 }}>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chart.data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`grad-${chart.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chart.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={chart.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
                  <XAxis dataKey="t" tickFormatter={formatTime} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis domain={chart.unit === '%' ? [0, 100] : [0, 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35}
                    tickFormatter={chart.formatVal ? (v) => formatBytesShort(v as number).replace('/s', '') : undefined} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', background: '#ffffff', color: '#0f172a' }}
                    labelFormatter={(ts) => new Date(ts as number).toLocaleString('en-IN')}
                    formatter={(v) => [chart.formatVal ? chart.formatVal(v as number) : `${(v as number).toFixed(1)}${chart.unit}`, chart.label]}
                  />
                  <Area type="monotone" dataKey="v" stroke={chart.color} strokeWidth={1.5} fill={`url(#grad-${chart.key})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatBytesRate(b: number): string {
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(2)} GB/s`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(2)} MB/s`;
  if (b >= 1024) return `${(b / 1024).toFixed(2)} KB/s`;
  return `${b.toFixed(0)} B/s`;
}

// ─── AI Analysis Card ────────────────────────────────────────────────────────

function AIAnalysisCard({ analysis, issues, recommendations }: { analysis: string; issues: any[]; recommendations: any[] }) {
  return (
    <div style={{ ...glassCard, borderLeft: '4px solid #6366f1' }} className="p-5">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6366f1' }}>
        <Zap size={15} style={{ color: '#6366f1' }} /> AI Analysis
      </h3>
      <p className="text-sm leading-relaxed mb-4" style={{ color: '#6366f1' }}>{analysis}</p>

      {issues.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>Issues Detected</h4>
          <div className="space-y-1.5">
            {issues.map((issue: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <SeverityBadge severity={issue.severity} />
                <div>
                  <span className="font-medium" style={{ color: '#0f172a' }}>{issue.title}</span>
                  <span className="ml-1" style={{ color: '#64748b' }}>{issue.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>Recommendations</h4>
          <div className="space-y-1.5">
            {recommendations.map((rec: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs rounded-lg p-2" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold" style={rec.priority === 'high' ? { background: 'rgba(239,68,68,0.15)', color: '#DC2626' } : rec.priority === 'medium' ? { background: 'rgba(217,119,6,0.15)', color: '#D97706' } : { background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>{rec.priority}</span>
                <div>
                  <span className="font-medium" style={{ color: '#0f172a' }}>{rec.title}: </span>
                  <span style={{ color: '#6366f1' }}>{rec.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'network' | 'storage' | 'alerts' | 'incidents' | 'history' | 'financials' | 'relationships' | 'allocations' | 'movements' | 'disposal' | 'diagram'>('live');
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: assetData, isLoading, isError } = useAsset(id || '');
  const asset = assetData?.data;

  // Live metrics from Prometheus
  const { data: liveData, isLoading: isLiveLoading, isError: isLiveError, dataUpdatedAt } = useAssetLiveMetrics(id || '');
  const live = liveData?.data;

  // SVG device diagram templates
  const { data: templateListData } = useSvgTemplateList();
  const svgTemplates = templateListData?.data || [];
  const matchedTemplate = asset?.model
    ? svgTemplates.find((t: { id: string; model: string }) => t.id.toLowerCase().includes(asset.model.toLowerCase()) || t.model.toLowerCase().includes(asset.model.toLowerCase()))
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => navigate('/assets')} className="flex items-center gap-1.5 -ml-2 px-3 py-1.5 rounded-lg text-sm transition-colors" style={{ color: '#64748b' }}>
          <ArrowLeft size={16} /> Back to Assets
        </button>
        <div style={glassCard} className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} style={{ color: '#6366f1' }} className="animate-spin" />
          <p className="text-sm" style={{ color: '#94a3b8' }}>Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => navigate('/assets')} className="flex items-center gap-1.5 -ml-2 px-3 py-1.5 rounded-lg text-sm transition-colors" style={{ color: '#64748b' }}>
          <ArrowLeft size={16} /> Back to Assets
        </button>
        <div style={glassCard} className="p-16 flex flex-col items-center justify-center gap-3">
          <AlertTriangle size={32} style={{ color: '#EF4444' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>Failed to load asset</p>
          <button onClick={() => navigate('/assets')} className="text-sm mt-2 px-3 py-1.5 rounded-lg" style={{ color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>Return to Assets</button>
        </div>
      </div>
    );
  }

  const rawIncidents = Array.isArray(asset?.incidents) ? asset.incidents : Array.isArray(live?.incidents) ? live.incidents : [];
  const relatedIncidents = rawIncidents.map((inc: any) => ({ id: inc.id, number: inc.number, title: inc.shortDescription || inc.title || '-', priority: inc.priority, state: inc.state, createdAt: inc.createdAt }));

  const tabs = [
    { key: 'live', label: 'Live Metrics', icon: Activity },
    { key: 'network', label: 'Network', icon: Wifi, count: live?.interfaces?.length || 0 },
    { key: 'storage', label: 'Storage', icon: HardDrive, count: live?.filesystems?.length || 0 },
    { key: 'alerts', label: 'Alerts', icon: AlertCircle, count: live?.alerts?.length || 0 },
    { key: 'incidents', label: 'Incidents', icon: AlertTriangle, count: relatedIncidents.length },
    { key: 'history', label: 'History', icon: Clock },
    { key: 'financials', label: 'Financials', icon: DollarSign },
    { key: 'relationships', label: 'Relationships', icon: GitFork },
    { key: 'allocations', label: 'Allocations', icon: Users },
    { key: 'movements', label: 'Movements', icon: Truck },
    { key: 'disposal', label: 'Disposal', icon: Trash },
    ...(matchedTemplate ? [{ key: 'diagram' as const, label: 'Device Diagram', icon: MonitorSpeaker }] : []),
  ] as const;

  return (
    <div className="animate-fade-in space-y-0">
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate('/assets')} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
              <ArrowLeft size={14} /> Assets
            </button>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span className="text-sm font-mono" style={{ color: '#a7f3d0' }}>{asset.ciNumber || asset.id?.slice(0, 8)}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                {asset.type && <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md" style={typeStyle[asset.type as AssetType] || { background: 'rgba(148,163,184,0.1)', color: '#94a3b8' }}>{(asset.type as string).replace(/_/g, ' ')}</span>}
                {asset.status && <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1.5" style={statusStyle[asset.status as AssetStatus] || { background: 'rgba(148,163,184,0.1)', color: '#94a3b8' }}>{asset.status}</span>}
                {live?.liveStatus && (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: liveStatusHex[live.liveStatus] }} />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: liveStatusHex[live.liveStatus] }} />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: live.liveStatus === 'healthy' ? '#6EE7B7' : live.liveStatus === 'warning' ? '#FCD34D' : '#FCA5A5' }}>
                      {live.liveStatus}
                    </span>
                  </span>
                )}
                {asset.monitoringEnabled && !live?.liveStatus && (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#10B981' }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#10B981' }} />
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: '#a7f3d0' }}>Monitored</span>
                  </span>
                )}
              </div>
              <h1 className="text-xl font-display font-bold" style={{ color: '#ffffff' }}>{asset.name || '-'}</h1>
              <div className="flex items-center gap-4 mt-3 text-sm flex-wrap" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span className="flex items-center gap-1.5"><Network size={14} /> {asset.ipAddress || 'N/A'}</span>
                {(live?.systemInfo?.hostname || asset.hostname) && (
                  <span className="flex items-center gap-1.5 font-mono text-xs"><Server size={14} /> {live?.systemInfo?.hostname || asset.hostname}</span>
                )}
                {live?.systemInfo?.os && (
                  <span className="flex items-center gap-1.5 text-xs"><MonitorSpeaker size={14} /> {live.systemInfo.os} {live.systemInfo.kernel}</span>
                )}
                <span className="flex items-center gap-1.5"><Shield size={14} /> {asset.supportGroup?.name || '-'}</span>
              </div>
              {live?.systemInfo?.uptimeSeconds > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Clock size={12} /> Uptime: <span className="font-mono" style={{ color: '#a7f3d0' }}>{formatUptime(live.systemInfo.uptimeSeconds)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dataUpdatedAt > 0 && (
                <span className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <RefreshCw size={10} /> {new Date(dataUpdatedAt).toLocaleTimeString()}
                </span>
              )}
              {canManage('assets') && (
                <button onClick={() => setShowEditModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="h-0.5 -mt-5 mb-4" style={{ background: 'linear-gradient(90deg, #059669, #34d399, #a7f3d0, transparent)' }} />

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 whitespace-nowrap" style={{ color: activeTab === tab.key ? '#6366f1' : '#94a3b8' }}>
            <tab.icon size={14} />
            {tab.label}
            {'count' in tab && tab.count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={activeTab === tab.key ? { background: 'rgba(99,102,241,0.2)', color: '#6366f1' } : { background: 'rgba(99,102,241,0.08)', color: '#94a3b8' }}>{tab.count}</span>}
            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />}
          </button>
        ))}
      </div>

      {/* ─── Live Metrics Tab ─── */}
      {activeTab === 'live' && (
        <div className="space-y-5 mt-4">
          {isLiveLoading && (
            <div style={glassCard} className="p-12 flex flex-col items-center gap-3">
              <Loader2 size={28} style={{ color: '#6366f1' }} className="animate-spin" />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Fetching live metrics from Prometheus...</p>
            </div>
          )}

          {isLiveError && !live && (
            <div style={glassCard} className="p-8 text-center">
              <AlertTriangle size={28} style={{ color: '#D97706' }} className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: '#64748b' }}>Unable to fetch live metrics</p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Prometheus may be unreachable or this asset has no IP address configured</p>
            </div>
          )}

          {live && (
            <>
              <SystemInfoCard sysInfo={live.systemInfo || {}} asset={asset} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <UsageGauge label="CPU Usage" value={live.cpu?.usagePct || 0} icon={Cpu} subtext={`${live.cpu?.cores || 0} cores`} />
                <UsageGauge label="Memory" value={parseFloat(live.memory?.usedPct || '0')} icon={MemoryStick} subtext={`${live.memory?.usedGB || 0} / ${live.memory?.totalGB || 0} GB`} />
                <UsageGauge
                  label="Disk (root)"
                  value={live.filesystems?.[0] ? parseFloat(live.filesystems.find((f: any) => f.mountpoint === '/')?.usedPct || live.filesystems[0].usedPct || '0') : 0}
                  icon={HardDrive}
                  subtext={live.filesystems?.[0] ? `${live.filesystems.find((f: any) => f.mountpoint === '/')?.usedGB || live.filesystems[0].usedGB} / ${live.filesystems.find((f: any) => f.mountpoint === '/')?.totalGB || live.filesystems[0].totalGB} GB` : ''}
                />
                <UsageGauge label="Swap" value={parseFloat(live.memory?.swapUsedPct || '0')} icon={Database} subtext={`${live.memory?.swapUsedGB || 0} / ${live.memory?.swapTotalGB || 0} GB`} />
              </div>

              {/* Load Averages + Memory Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={glassCard} className="p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6366f1' }}>
                    <Thermometer size={15} style={{ color: '#D97706' }} /> Load Averages
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['1 min', live.load?.load1],
                      ['5 min', live.load?.load5],
                      ['15 min', live.load?.load15],
                    ].map(([label, value]) => {
                      const v = value as number || 0;
                      const cores = live.cpu?.cores || 1;
                      const color = v > cores * 2 ? '#FCA5A5' : v > cores ? '#FCD34D' : '#6EE7B7';
                      return (
                        <div key={label as string} className="text-center rounded-lg p-3" style={subtleBg}>
                          <p className="text-2xl font-display font-bold" style={{ color }}>{v.toFixed(2)}</p>
                          <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>{label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] mt-2 text-center" style={{ color: '#94a3b8' }}>CPU Cores: {live.cpu?.cores || 0} -- Load above core count indicates saturation</p>
                </div>

                <div style={glassCard} className="p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6366f1' }}>
                    <MemoryStick size={15} style={{ color: '#6366f1' }} /> Memory Breakdown
                  </h3>
                  <div className="space-y-2">
                    {[
                      ['Total', `${live.memory?.totalGB} GB`, '#0f172a'],
                      ['Used', `${live.memory?.usedGB} GB (${live.memory?.usedPct}%)`, parseFloat(live.memory?.usedPct || '0') > 80 ? '#FCA5A5' : '#6366f1'],
                      ['Available', `${live.memory?.availableGB} GB`, '#6EE7B7'],
                      ['Buffers', `${live.memory?.buffersGB} GB`, '#64748b'],
                      ['Cached', `${live.memory?.cachedGB} GB`, '#64748b'],
                      ['Swap Used', `${live.memory?.swapUsedGB} / ${live.memory?.swapTotalGB} GB`, '#64748b'],
                    ].map(([label, value, cls]) => (
                      <div key={label as string} className="flex justify-between text-xs">
                        <span style={{ color: '#94a3b8' }}>{label}</span>
                        <span className="font-mono" style={{ color: cls as string }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {live.aiAnalysis && (
                <AIAnalysisCard analysis={live.aiAnalysis} issues={live.issues || []} recommendations={live.recommendations || []} />
              )}
            </>
          )}

          {!live && !isLiveLoading && (
            <div style={glassCard} className="p-5">
              <h3 className="text-sm font-medium mb-3" style={{ color: '#64748b' }}>Specifications (from CMDB)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['OS', asset.os],
                  ['CPU', asset.cpu],
                  ['Memory', asset.memory],
                  ['Storage', asset.storage],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-lg p-3" style={subtleBg}>
                    <p className="text-[10px] uppercase" style={{ color: '#94a3b8' }}>{label}</p>
                    <p className="text-sm font-mono" style={{ color: '#6366f1' }}>{value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Network Tab ─── */}
      {activeTab === 'network' && (
        <div className="space-y-5 mt-4">
          {isLiveLoading && (
            <div style={glassCard} className="p-12 flex flex-col items-center gap-3">
              <Loader2 size={28} style={{ color: '#6366f1' }} className="animate-spin" />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Loading network data...</p>
            </div>
          )}
          {live && (
            <>
              <NetworkSummaryCards interfaces={live.interfaces || []} />
              <div style={glassCard} className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#6366f1' }}>
                  <Wifi size={15} style={{ color: '#6366f1' }} /> Interface Throughput
                  <span className="text-[10px] font-mono ml-auto" style={{ color: '#94a3b8' }}>{(live.interfaces || []).length} interfaces</span>
                </h3>
                <div className="space-y-3">
                  {(live.interfaces || []).map((iface: any) => (
                    <InterfaceThroughputBar key={iface.device} iface={iface} />
                  ))}
                </div>
              </div>
              <NetworkInterfacesCard interfaces={live.interfaces || []} />
            </>
          )}
          {!live && !isLiveLoading && (
            <div style={glassCard} className="p-8 text-center">
              <Wifi size={32} style={{ color: '#94a3b8' }} className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: '#94a3b8' }}>Network interface data requires live Prometheus connection</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Storage Tab ─── */}
      {activeTab === 'storage' && (
        <div className="space-y-5 mt-4">
          {isLiveLoading && (
            <div style={glassCard} className="p-12 flex flex-col items-center gap-3">
              <Loader2 size={28} style={{ color: '#6366f1' }} className="animate-spin" />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Loading filesystem data...</p>
            </div>
          )}
          {live && (
            <>
              <FilesystemCard filesystems={live.filesystems || []} />
              <DiskIOCard diskIO={live.diskIO || []} />
            </>
          )}
          {!live && !isLiveLoading && (
            <div style={glassCard} className="p-8 text-center">
              <HardDrive size={32} style={{ color: '#94a3b8' }} className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: '#94a3b8' }}>Filesystem data requires live Prometheus connection</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Alerts Tab ─── */}
      {activeTab === 'alerts' && (
        <div className="space-y-5 mt-4">
          {isLiveLoading && (
            <div style={glassCard} className="p-12 flex flex-col items-center gap-3">
              <Loader2 size={28} style={{ color: '#6366f1' }} className="animate-spin" />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Loading alerts...</p>
            </div>
          )}
          {live && <AlertsCard alerts={live.alerts || []} />}
          {!live && !isLiveLoading && (
            <div style={glassCard} className="p-8 text-center">
              <AlertCircle size={32} style={{ color: '#94a3b8' }} className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: '#94a3b8' }}>Alert data requires live Prometheus connection</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Incidents Tab ─── */}
      {activeTab === 'incidents' && (
        <div style={glassCard} className="p-5 mt-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#6366f1' }}>
            <AlertTriangle size={15} style={{ color: '#D97706' }} /> Related Incidents
            {relatedIncidents.length > 0 && <span className="text-[10px] ml-auto" style={{ color: '#94a3b8' }}>{relatedIncidents.length} incidents</span>}
          </h3>
          {relatedIncidents.length > 0 ? (
            <div className="space-y-2">
              {relatedIncidents.map((inc: any) => (
                <button key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)} className="w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group" style={{ background: 'rgba(99,102,241,0.04)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs shrink-0" style={{ color: '#6366f1' }}>{inc.number}</span>
                    {inc.priority && <SeverityBadge severity={inc.priority === 'P1' ? 'critical' : inc.priority === 'P2' ? 'warning' : 'info'} />}
                    <p className="text-xs truncate" style={{ color: '#6366f1' }}>{inc.title}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: '#94a3b8' }} className="shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center py-6" style={{ color: '#94a3b8' }}>No incidents linked to this asset</p>
          )}
        </div>
      )}

      {/* ─── History Tab ─── */}
      {activeTab === 'history' && (
        <div className="space-y-5 mt-4">
          {id && <MetricsHistorySection assetId={id} />}
          <div style={glassCard} className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#6366f1' }}>
              <Clock size={15} style={{ color: '#94a3b8' }} /> Activity History
            </h3>
            {Array.isArray(asset.activities) && asset.activities.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: 'rgba(99,102,241,0.12)' }} />
                <div className="space-y-6">
                  {asset.activities.map((event: any, i: number) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                        <Clock size={14} />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm" style={{ color: '#6366f1' }}>{event.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#94a3b8' }}>
                          <span>{event.actor || 'System'}</span>
                          <span>{event.timestamp ? formatDate(event.timestamp) : event.createdAt ? formatDate(event.createdAt) : '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: 'rgba(99,102,241,0.12)' }} />
                <div className="space-y-6">
                  <div className="flex gap-4 relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                      <Clock size={14} />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm" style={{ color: '#6366f1' }}>Asset created in CMDB</p>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#94a3b8' }}>
                        <span>System</span>
                        <span>{asset.createdAt ? formatDate(asset.createdAt) : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Financials Tab ─── */}
      {activeTab === 'financials' && id && (
        <div style={glassCard} className="p-5 mt-4">
          <AssetFinancialPanel assetId={id} />
        </div>
      )}

      {/* ─── Relationships Tab ─── */}
      {activeTab === 'relationships' && id && (
        <div style={glassCard} className="p-5 mt-4">
          <AssetRelationshipsPanel assetId={id} />
        </div>
      )}

      {/* ─── Allocations Tab ─── */}
      {activeTab === 'allocations' && id && (
        <div style={glassCard} className="p-5 mt-4">
          <AssetAllocationPanel assetId={id} />
        </div>
      )}

      {/* ─── Movements Tab ─── */}
      {activeTab === 'movements' && id && (
        <div style={glassCard} className="p-5 mt-4">
          <AssetMovementPanel assetId={id} />
        </div>
      )}

      {/* ─── Disposal Tab ─── */}
      {activeTab === 'disposal' && id && (
        <div style={glassCard} className="p-5 mt-4">
          <AssetDisposalPanel assetId={id} />
        </div>
      )}

      {/* ─── Device Diagram Tab ─── */}
      {activeTab === 'diagram' && matchedTemplate && (
        <div className="mt-4">
          <DeviceDiagram
            templateId={matchedTemplate.id}
            ipAddress={asset.ipAddress}
            onPortClick={(port) => {
              console.log('Port clicked:', port);
            }}
          />
        </div>
      )}

      {/* Modals */}
      {showEditModal && <EditAssetModal asset={asset} onClose={() => setShowEditModal(false)} />}
    </div>
  );
}
