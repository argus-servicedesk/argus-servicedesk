// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Hardware Monitoring Dashboard
// Multi-vendor fleet: Cisco, Huawei, Arista, Fortigate, Dell,
// HPE, Aruba, Barracuda, NetApp + iDRAC/iLO servers
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Cpu, Network, Server, Shield, Search, Loader2, Plus,
  Activity, AlertTriangle, CheckCircle, Wifi, WifiOff,
  Thermometer, Zap, HardDrive, Filter,
} from 'lucide-react';
import api from '../../lib/api';

// ── Types ──────────────────────────────────────────────────

interface HWDevice {
  id: string;
  name: string;
  type: string;
  status: string;
  manufacturer: string | null;
  model: string | null;
  ipAddress: string | null;
  hostname: string | null;
  location: string | null;
  monitoringEnabled: boolean;
  _count?: { alerts: number; incidents: number };
  updatedAt: string;
}

// ── Vendor config ──────────────────────────────────────────

const VENDORS = [
  { key: 'ALL', label: 'All Vendors', color: '#F59E0B' },
  { key: 'Cisco', label: 'Cisco', color: '#049FD9' },
  { key: 'Huawei', label: 'Huawei', color: '#CF0A2C' },
  { key: 'Fortigate', label: 'Fortigate', color: '#EE3124' },
  { key: 'Arista', label: 'Arista', color: '#74B943' },
  { key: 'Dell', label: 'Dell', color: '#007DB8' },
  { key: 'HPE', label: 'HPE', color: '#00B388' },
  { key: 'Aruba', label: 'Aruba', color: '#FF8300' },
  { key: 'Barracuda', label: 'Barracuda', color: '#E31837' },
  { key: 'NetApp', label: 'NetApp', color: '#0067C5' },
];

const VENDOR_COLORS: Record<string, string> = Object.fromEntries(
  VENDORS.map((v) => [v.key, v.color])
);

// Hardware-relevant CI types
const HW_TYPES = [
  'SERVER', 'NETWORK', 'FIREWALL', 'SWITCH', 'ROUTER',
  'STORAGE', 'LOAD_BALANCER', 'UPS', 'ENCLOSURE', 'PDU',
];

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  SERVER: Server, NETWORK: Network, FIREWALL: Shield,
  SWITCH: Network, ROUTER: Network, STORAGE: HardDrive,
  LOAD_BALANCER: Cpu, UPS: Zap, ENCLOSURE: Server, PDU: Zap,
};

const STATUS_CFG: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  LIVE:           { bg: 'rgba(16,185,129,0.12)', color: '#10B981', dot: '#10B981', label: 'Live' },
  MAINTENANCE:    { bg: 'rgba(217,119,6,0.15)',  color: '#D97706', dot: '#D97706', label: 'Maint.' },
  DECOMMISSIONED: { bg: 'rgba(100,116,139,0.12)', color: '#64748b', dot: '#64748b', label: 'Decomm.' },
  PLANNED:        { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', dot: '#818cf8', label: 'Planned' },
};

// ── Helpers ────────────────────────────────────────────────

function deviceHealth(d: HWDevice): 'critical' | 'warning' | 'ok' | 'unknown' {
  if (!d.monitoringEnabled) return 'unknown';
  const alerts = d._count?.alerts ?? 0;
  const incidents = d._count?.incidents ?? 0;
  if (incidents > 0) return 'critical';
  if (alerts > 0) return 'warning';
  return 'ok';
}

const HEALTH_CFG = {
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', glow: 'rgba(239,68,68,0.15)', icon: AlertTriangle, iconColor: '#ef4444', label: 'Critical' },
  warning:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.12)', icon: AlertTriangle, iconColor: '#F59E0B', label: 'Warning' },
  ok:       { bg: 'rgba(16,185,129,0.06)', border: 'rgba(99,102,241,0.1)', glow: 'transparent', icon: CheckCircle, iconColor: '#10B981', label: 'OK' },
  unknown:  { bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.15)', glow: 'transparent', icon: WifiOff, iconColor: '#64748b', label: 'Unmonitored' },
};

function vendorOf(d: HWDevice): string {
  const m = (d.manufacturer || '').toLowerCase();
  if (m.includes('cisco')) return 'Cisco';
  if (m.includes('huawei')) return 'Huawei';
  if (m.includes('fortinet') || m.includes('fortigate')) return 'Fortigate';
  if (m.includes('arista')) return 'Arista';
  if (m.includes('dell')) return 'Dell';
  if (m.includes('hpe') || m.includes('hewlett')) return 'HPE';
  if (m.includes('aruba')) return 'Aruba';
  if (m.includes('barracuda')) return 'Barracuda';
  if (m.includes('netapp')) return 'NetApp';
  return d.manufacturer || 'Other';
}

// ── Device Card ────────────────────────────────────────────

function DeviceCard({ device, onClick }: { device: HWDevice; onClick: () => void }) {
  const health = deviceHealth(device);
  const hcfg = HEALTH_CFG[health];
  const scfg = STATUS_CFG[device.status] || STATUS_CFG.LIVE;
  const Icon = TYPE_ICONS[device.type] || Server;
  const HealthIcon = hcfg.icon;
  const vendor = vendorOf(device);
  const accentColor = VENDOR_COLORS[vendor] || '#F59E0B';

  return (
    <div
      onClick={onClick}
      className="relative rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: hcfg.bg,
        border: `1px solid ${hcfg.border}`,
        boxShadow: health !== 'ok' && health !== 'unknown' ? `0 0 16px ${hcfg.glow}` : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor + '50';
        e.currentTarget.style.boxShadow = `0 4px 20px ${accentColor}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = hcfg.border;
        e.currentTarget.style.boxShadow = health !== 'ok' && health !== 'unknown'
          ? `0 0 16px ${hcfg.glow}` : 'none';
      }}
    >
      {/* Vendor accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
          >
            <Icon size={15} style={{ color: accentColor }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-display font-bold truncate" style={{ color: '#0f172a' }}>
              {device.name}
            </h3>
            <p className="text-[10px] font-mono truncate" style={{ color: '#94a3b8' }}>
              {device.model || device.type.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <HealthIcon size={14} style={{ color: hcfg.iconColor, flexShrink: 0 }} />
      </div>

      {/* IP / Hostname */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.06)', color: '#64748b', border: '1px solid rgba(99,102,241,0.08)' }}>
          {device.ipAddress || device.hostname || '—'}
        </span>
        {device.location && (
          <span className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{device.location}</span>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        {/* Monitoring status */}
        <span className="flex items-center gap-1.5">
          {device.monitoringEnabled ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#10B981' }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#10B981' }} />
              </span>
              <span className="text-[9px] font-mono" style={{ color: '#10B981' }}>SNMP</span>
            </>
          ) : (
            <>
              <span className="inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#94a3b8' }} />
              <span className="text-[9px] font-mono" style={{ color: '#94a3b8' }}>Unmon.</span>
            </>
          )}
        </span>

        {/* Alerts/incidents badges */}
        <div className="flex items-center gap-1">
          {(device._count?.incidents ?? 0) > 0 && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              {device._count!.incidents} INC
            </span>
          )}
          {(device._count?.alerts ?? 0) > 0 && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              {device._count!.alerts} ALT
            </span>
          )}
          {(device._count?.alerts ?? 0) === 0 && (device._count?.incidents ?? 0) === 0 && (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: scfg.bg, color: scfg.color }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: scfg.dot }} />
              {scfg.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vendor Section ─────────────────────────────────────────

function VendorSection({
  vendor, devices, accentColor, navigate,
}: {
  vendor: string; devices: HWDevice[]; accentColor: string; navigate: (path: string) => void;
}) {
  const critCount = devices.filter((d) => deviceHealth(d) === 'critical').length;
  const warnCount = devices.filter((d) => deviceHealth(d) === 'warning').length;

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="h-6 w-1 rounded-full"
          style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}40)` }}
        />
        <h2 className="text-base font-display font-bold" style={{ color: '#0f172a' }}>{vendor}</h2>
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono"
          style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
        >
          {devices.length}
        </span>
        {critCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
            {critCount} critical
          </span>
        )}
        {warnCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
            {warnCount} warning
          </span>
        )}
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${accentColor}20, transparent)` }} />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {devices.map((d) => (
          <DeviceCard key={d.id} device={d} onClick={() => navigate(`/assets/${d.id}`)} />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export default function HardwareMonitoring() {
  const navigate = useNavigate();
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Fetch all hardware-type assets with large page
  const { data: res, isLoading } = useQuery({
    queryKey: ['hardware', 'devices', search],
    queryFn: async () => {
      const results = await Promise.all(
        HW_TYPES.map(async (t) => {
          const params = new URLSearchParams({ type: t, pageSize: '500' });
          if (search.trim()) params.append('search', search.trim());
          const { data } = await api.get(`/assets?${params}`);
          return Array.isArray(data?.data) ? data.data : [];
        })
      );
      return results.flat() as HWDevice[];
    },
    staleTime: 30000,
  });

  const allDevices: HWDevice[] = res ?? [];

  // Fleet-wide stats
  const totalDevices = allDevices.length;
  const criticalCount = allDevices.filter((d) => deviceHealth(d) === 'critical').length;
  const warningCount = allDevices.filter((d) => deviceHealth(d) === 'warning').length;
  const monitoredCount = allDevices.filter((d) => d.monitoringEnabled).length;
  const activeAlerts = allDevices.reduce((s, d) => s + (d._count?.alerts ?? 0), 0);

  // Filter by vendor
  const filtered = useMemo(() => {
    if (vendorFilter === 'ALL') return allDevices;
    return allDevices.filter((d) => vendorOf(d) === vendorFilter);
  }, [allDevices, vendorFilter]);

  // Group by vendor
  const grouped = useMemo(() => {
    const map = new Map<string, HWDevice[]>();
    for (const d of filtered) {
      const v = vendorOf(d);
      const list = map.get(v) || [];
      list.push(d);
      map.set(v, list);
    }
    // Sort: vendors with critical alerts first
    return [...map.entries()].sort(([, a], [, b]) => {
      const aCrit = a.filter((x) => deviceHealth(x) === 'critical').length;
      const bCrit = b.filter((x) => deviceHealth(x) === 'critical').length;
      if (bCrit !== aCrit) return bCrit - aCrit;
      return b.length - a.length;
    });
  }, [filtered]);

  return (
    <div className="animate-fade-in" style={{ background: '#F8FAFC', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>

      {/* ── HERO ──────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-0" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #F59E0B, #FCD34D, #F59E0B80, transparent)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-1/3 w-[600px] h-[200px] rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full blur-[80px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />

        <div className="relative px-6 py-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <span>CMDB</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Hardware Monitoring</span>
              </div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <Thermometer size={20} style={{ color: '#F59E0B' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-white">Hardware Monitoring</h1>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono" style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)' }}>
                  SNMP + PROMETHEUS
                </span>
              </div>
              <p className="text-sm ml-[52px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Network devices, servers &amp; storage — multi-vendor fleet monitoring
              </p>
            </div>
            <button
              onClick={() => navigate('/assets/create')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#FCD34D' }}
            >
              <Plus size={14} /> Add Device
            </button>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Devices', value: totalDevices, color: '#F59E0B', icon: Server, sub: `${VENDORS.length - 1} vendors` },
              { label: 'Monitored', value: monitoredCount, color: '#10B981', icon: Wifi, sub: `${totalDevices > 0 ? Math.round(monitoredCount / totalDevices * 100) : 0}% coverage` },
              { label: 'Active Alerts', value: activeAlerts, color: activeAlerts > 0 ? '#F59E0B' : '#10B981', icon: Activity, sub: 'firing now' },
              { label: 'Critical', value: criticalCount, color: criticalCount > 0 ? '#ef4444' : '#10B981', icon: AlertTriangle, sub: 'with incidents' },
              { label: 'Warning', value: warningCount, color: warningCount > 0 ? '#F59E0B' : '#10B981', icon: AlertTriangle, sub: 'alert only' },
            ].map((s) => (
              <div key={s.label} className="backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={12} style={{ color: s.color }} />
                  <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
                </div>
                <div className="text-2xl font-display font-bold" style={{ color: s.color }}>{isLoading ? '—' : s.value}</div>
                <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-0.5 mb-5" style={{ background: 'linear-gradient(90deg, #F59E0B, #FCD34D50, transparent)' }} />

      {/* ── VENDOR FILTER TABS ─────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="flex items-center gap-1.5 mr-1" style={{ color: '#94a3b8' }}>
          <Filter size={12} />
          <span className="text-[9px] font-semibold uppercase tracking-widest">Vendor</span>
        </div>
        {VENDORS.map((v) => {
          const count = v.key === 'ALL' ? allDevices.length
            : allDevices.filter((d) => vendorOf(d) === v.key).length;
          if (v.key !== 'ALL' && count === 0) return null;
          const isActive = vendorFilter === v.key;
          return (
            <button
              key={v.key}
              onClick={() => setVendorFilter(v.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={isActive ? {
                background: `${v.color}18`,
                border: `1px solid ${v.color}50`,
                color: v.color,
              } : {
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#64748b',
              }}
            >
              {v.label}
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full" style={isActive ? { background: `${v.color}20`, color: v.color } : { background: 'rgba(99,102,241,0.06)', color: '#94a3b8' }}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Search */}
        <div className="relative flex-1 min-w-[220px] ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by name, IP, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, color: '#0F172A', fontSize: 13 }}
          />
        </div>
      </div>

      {/* ── LOADING ────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#F59E0B' }} />
          <span className="ml-3 text-sm" style={{ color: '#64748b' }}>Loading hardware fleet...</span>
        </div>
      )}

      {/* ── EMPTY ──────────────────────────────────────────── */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Server size={48} style={{ color: '#cbd5e1' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: '#64748b' }}>No hardware devices found</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
            Register devices in CMDB with type SERVER, NETWORK, FIREWALL, SWITCH, or ROUTER
          </p>
        </div>
      )}

      {/* ── VENDOR GROUPS ──────────────────────────────────── */}
      {!isLoading && grouped.map(([vendor, devices]) => (
        <VendorSection
          key={vendor}
          vendor={vendor}
          devices={devices}
          accentColor={VENDOR_COLORS[vendor] || '#F59E0B'}
          navigate={navigate}
        />
      ))}
    </div>
  );
}
