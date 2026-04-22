import { useState, useMemo } from 'react';
import {
  Network, Activity, Wifi, ArrowDown, ArrowUp, Signal, Radio,
  Shield, Cloud, Server, Globe, Gauge, ChevronDown, ChevronRight,
} from 'lucide-react';

// ── Mock Data ──
interface ILLLink {
  port: string;
  name: string;
  category: string;
  priority: string;
  capacity: number;
  rxMbps: number;
  txMbps: number;
  status: string;
}

const MOCK_ILL_DATA: ILLLink[] = [
  { port: 'port1', name: 'ISP Primary Link', category: 'Internet', priority: 'P1', capacity: 1000, rxMbps: 342, txMbps: 218, status: 'up' },
  { port: 'port2', name: 'ISP Secondary Link', category: 'Internet', priority: 'P2', capacity: 500, rxMbps: 45, txMbps: 32, status: 'up' },
  { port: 'wan1', name: 'MPLS — DC Primary', category: 'MPLS', priority: 'P1', capacity: 1000, rxMbps: 567, txMbps: 423, status: 'up' },
  { port: 'wan2', name: 'MPLS — DC Secondary', category: 'MPLS', priority: 'P2', capacity: 1000, rxMbps: 12, txMbps: 8, status: 'standby' },
  { port: 'aws1', name: 'AWS Direct Connect', category: 'Cloud', priority: 'P1', capacity: 1000, rxMbps: 234, txMbps: 178, status: 'up' },
  { port: 'vpn1', name: 'IPsec Tunnel — DR Site', category: 'VPN', priority: 'P1', capacity: 100, rxMbps: 23, txMbps: 45, status: 'up' },
  { port: 'vpn2', name: 'SSL VPN — Remote Users', category: 'VPN', priority: 'P2', capacity: 200, rxMbps: 89, txMbps: 56, status: 'up' },
  { port: 'fw_wan', name: 'Firewall WAN Port', category: 'Firewall', priority: 'P1', capacity: 1000, rxMbps: 678, txMbps: 445, status: 'up' },
  { port: 'lb1', name: 'Load Balancer Uplink', category: 'Infrastructure', priority: 'P1', capacity: 10000, rxMbps: 2340, txMbps: 1890, status: 'up' },
  { port: 'mgmt', name: 'Management Network', category: 'Management', priority: 'P3', capacity: 100, rxMbps: 5, txMbps: 3, status: 'up' },
];

const CATEGORY_ICONS: Record<string, typeof Network> = {
  Internet: Globe, MPLS: Network, Cloud: Cloud, VPN: Shield,
  Firewall: Shield, Infrastructure: Server, Management: Radio,
};

const CATEGORY_COLORS: Record<string, string> = {
  Internet: '#6366f1', MPLS: '#8b5cf6', Cloud: '#06b6d4', VPN: '#f59e0b',
  Firewall: '#ef4444', Infrastructure: '#10b981', Management: '#64748b',
};

const PRIORITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  P1: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  P2: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  P3: { bg: 'rgba(148,163,184,0.08)', color: '#94a3b8', border: 'rgba(148,163,184,0.25)' },
};

function utilizationColor(pct: number): string {
  if (pct >= 85) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  return '#10b981';
}

function formatMbps(mbps: number): string {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`;
  return `${mbps} Mbps`;
}

export default function ILLBandwidthPanel() {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const map: Record<string, ILLLink[]> = {};
    for (const link of MOCK_ILL_DATA) {
      if (!map[link.category]) map[link.category] = [];
      map[link.category].push(link);
    }
    return Object.entries(map);
  }, []);

  const totalLinks = MOCK_ILL_DATA.length;
  const totalCapacity = MOCK_ILL_DATA.reduce((s, l) => s + l.capacity, 0);
  const avgUtil = MOCK_ILL_DATA.reduce((s, l) => {
    const maxBw = Math.max(l.rxMbps, l.txMbps);
    return s + (maxBw / l.capacity * 100);
  }, 0) / totalLinks;

  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid rgba(99,102,241,0.12)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          }}>
            <Network className="w-4 h-4" style={{ color: '#fff' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>ILL Bandwidth Monitor</h3>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Real-time WAN/Exchange/Cloud link utilization</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '16px 24px', borderBottom: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.02)' }}>
        {[
          { label: 'Total Links', value: String(totalLinks), icon: Wifi, color: '#6366f1' },
          { label: 'Total Bandwidth', value: formatMbps(totalCapacity), icon: Activity, color: '#8b5cf6' },
          { label: 'Avg. Utilization', value: `${avgUtil.toFixed(1)}%`, icon: Gauge, color: utilizationColor(avgUtil) },
        ].map(kpi => (
          <div key={kpi.label} style={{
            padding: '14px 16px', borderRadius: 10, background: '#fff',
            border: '1px solid rgba(99,102,241,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {grouped.map(([category, links]) => {
          const CatIcon = CATEGORY_ICONS[category] || Network;
          const catColor = CATEGORY_COLORS[category] || '#6366f1';
          const isCollapsed = collapsedCategories[category];

          return (
            <div key={category}>
              {/* Category header */}
              <div
                onClick={() => toggleCategory(category)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                  background: 'rgba(99,102,241,0.03)', borderBottom: '1px solid rgba(99,102,241,0.06)',
                  cursor: 'pointer', userSelect: 'none',
                }}
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />}
                <CatIcon className="w-3.5 h-3.5" style={{ color: catColor }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: catColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{category}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>({links.length})</span>
              </div>

              {/* Links */}
              {!isCollapsed && links.map(link => {
                const maxBw = Math.max(link.rxMbps, link.txMbps);
                const utilPct = (maxBw / link.capacity) * 100;
                const barColor = utilizationColor(utilPct);
                const priStyle = PRIORITY_COLORS[link.priority] || PRIORITY_COLORS.P3;

                return (
                  <div key={link.port} style={{
                    display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.6fr 1fr 1fr 1.5fr 0.6fr 0.8fr',
                    alignItems: 'center', gap: 8, padding: '10px 24px',
                    borderBottom: '1px solid rgba(99,102,241,0.04)',
                    borderLeft: `3px solid ${barColor}`,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Link Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{link.name}</span>
                      <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#94a3b8' }}>{link.port}</span>
                    </div>

                    {/* Category badge */}
                    <span style={{
                      display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: `${catColor}15`, color: catColor, textAlign: 'center',
                    }}>{category}</span>

                    {/* Priority badge */}
                    <span style={{
                      display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: priStyle.bg, color: priStyle.color, border: `1px solid ${priStyle.border}`, textAlign: 'center',
                    }}>{link.priority}</span>

                    {/* RX */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ArrowDown className="w-3 h-3" style={{ color: '#10b981' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>{formatMbps(link.rxMbps)}</span>
                    </div>

                    {/* TX */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ArrowUp className="w-3 h-3" style={{ color: '#6366f1' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#6366f1' }}>{formatMbps(link.txMbps)}</span>
                    </div>

                    {/* Utilization bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(99,102,241,0.08)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(utilPct, 100)}%`, height: '100%', borderRadius: 4,
                          background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: barColor, minWidth: 36, textAlign: 'right' }}>
                        {utilPct.toFixed(1)}%
                      </span>
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: link.status === 'up' ? '#10b981' : link.status === 'standby' ? '#f59e0b' : '#ef4444',
                        boxShadow: link.status === 'up' ? '0 0 6px rgba(16,185,129,0.5)' : undefined,
                      }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{link.status}</span>
                    </div>

                    {/* Capacity */}
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', textAlign: 'right' }}>
                      {formatMbps(link.capacity)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Column headers (sticky reference) */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.6fr 1fr 1fr 1.5fr 0.6fr 0.8fr',
        gap: 8, padding: '8px 24px', background: 'rgba(99,102,241,0.04)',
        borderTop: '1px solid rgba(99,102,241,0.08)',
      }}>
        {['Link Name', 'Category', 'Priority', 'RX', 'TX', 'Utilization', 'Status', 'Capacity'].map(h => (
          <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
        ))}
      </div>
    </div>
  );
}
