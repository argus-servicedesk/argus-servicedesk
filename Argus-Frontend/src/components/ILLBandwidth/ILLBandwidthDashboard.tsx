// ILL Bandwidth Monitor Dashboard — matches DashboardOverview design system

import { useState, useEffect, useMemo } from 'react';
import {
  Globe, Cloud, Shield, Lock, TrendingUp, Activity, Wifi,
  ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, Radio, Eye,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

/* ===================================================================
   DESIGN SYSTEM — matches DashboardOverview T constants
   =================================================================== */
const T = {
  pageBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
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
  cyan: '#0891B2',
  emerald: '#059669',
  amber: '#D97706',
  crimson: '#DC2626',
  blue: '#2563EB',
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
} as const;

/* ===================================================================
   TYPES
   =================================================================== */
interface ILLLink {
  id: string;
  name: string;
  category: string;
  priority: 'P1' | 'P2' | 'P3';
  capacity: number;
  rx: number;
  tx: number;
  uptime: number;
}

/* ===================================================================
   MOCK DATA
   =================================================================== */
const INITIAL_LINKS: ILLLink[] = [
  { id: 'isp1', name: 'ISP Primary -- Airtel', category: 'Internet', priority: 'P1', capacity: 1000, rx: 342, tx: 218, uptime: 99.97 },
  { id: 'isp2', name: 'ISP Secondary -- Jio', category: 'Internet', priority: 'P2', capacity: 500, rx: 45, tx: 32, uptime: 99.91 },
  { id: 'mpls1', name: 'MPLS -- Mumbai DC Primary', category: 'MPLS', priority: 'P1', capacity: 1000, rx: 567, tx: 423, uptime: 100 },
  { id: 'mpls2', name: 'MPLS -- Mumbai DC Secondary', category: 'MPLS', priority: 'P2', capacity: 1000, rx: 12, tx: 8, uptime: 99.99 },
  { id: 'aws1', name: 'AWS Direct Connect', category: 'Cloud', priority: 'P1', capacity: 1000, rx: 234, tx: 178, uptime: 99.95 },
  { id: 'azure1', name: 'Azure ExpressRoute', category: 'Cloud', priority: 'P2', capacity: 500, rx: 156, tx: 89, uptime: 99.88 },
  { id: 'vpn1', name: 'IPsec -- DR Site Chennai', category: 'VPN', priority: 'P1', capacity: 100, rx: 23, tx: 45, uptime: 99.92 },
  { id: 'vpn2', name: 'SSL VPN -- Remote Users', category: 'VPN', priority: 'P2', capacity: 200, rx: 89, tx: 56, uptime: 99.85 },
  { id: 'nse1', name: 'NSE Primary Exchange', category: 'Exchange', priority: 'P1', capacity: 1000, rx: 678, tx: 445, uptime: 100 },
  { id: 'bse1', name: 'BSE Primary Exchange', category: 'Exchange', priority: 'P1', capacity: 1000, rx: 432, tx: 298, uptime: 100 },
  { id: 'fw1', name: 'FortiGate WAN1', category: 'Firewall', priority: 'P1', capacity: 10000, rx: 2340, tx: 1890, uptime: 100 },
  { id: 'lb1', name: 'F5 Uplink', category: 'Load Balancer', priority: 'P1', capacity: 10000, rx: 3450, tx: 2100, uptime: 99.99 },
];

const CATEGORY_COLORS: Record<string, string> = {
  Internet: T.blue,
  MPLS: T.violet,
  Cloud: T.cyan,
  VPN: T.amber,
  Exchange: T.crimson,
  Firewall: '#EA580C',
  'Load Balancer': T.emerald,
};

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  Internet: Globe,
  MPLS: Wifi,
  Cloud: Cloud,
  VPN: Lock,
  Exchange: TrendingUp,
  Firewall: Shield,
  'Load Balancer': ArrowUpDown,
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string; stripe: string }> = {
  P1: { bg: '#FEF2F2', text: '#991B1B', stripe: T.crimson },
  P2: { bg: '#FFFBEB', text: '#92400E', stripe: T.amber },
  P3: { bg: '#EEF2FF', text: '#3730A3', stripe: T.indigo },
};

/* ===================================================================
   HELPERS
   =================================================================== */
function utilizationColor(pct: number): string {
  if (pct < 60) return T.emerald;
  if (pct < 85) return T.amber;
  return T.crimson;
}

function formatMbps(mbps: number): string {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`;
  return `${mbps.toFixed(0)} Mbps`;
}

function jitter(val: number, pct = 0.03): number {
  return Math.max(0, val + val * (Math.random() - 0.5) * 2 * pct);
}

/* ===================================================================
   LIVE PULSE INDICATOR
   =================================================================== */
function LivePulse({ color = T.emerald, size = 7 }: { color?: string; size?: number }) {
  return (
    <span className="relative flex flex-shrink-0" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color }} />
    </span>
  );
}

/* ===================================================================
   STATUS DOT
   =================================================================== */
function StatusDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: color }}
    />
  );
}

/* ===================================================================
   SPARKLINE
   =================================================================== */
function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
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
   KPI CARD — matches DashboardOverview KPICard pattern
   =================================================================== */
function KPICard({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <div className="rounded-xl px-4 py-4 relative overflow-hidden"
      style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: T.textMuted }}>{label}</div>
      <div className="text-[26px] font-black font-mono leading-none tracking-tight" style={{ color: T.text }}>{value}</div>
    </div>
  );
}

/* ===================================================================
   MAIN COMPONENT
   =================================================================== */
export default function ILLBandwidthDashboard() {
  const [links, setLinks] = useState<ILLLink[]>(INITIAL_LINKS);
  const [now, setNow] = useState(new Date());
  const [timeRange, setTimeRange] = useState('1h');
  const [history, setHistory] = useState<Record<string, number[]>>(() => {
    const h: Record<string, number[]> = {};
    INITIAL_LINKS.forEach(l => {
      h[l.id] = Array.from({ length: 20 }, () => Math.round(jitter(l.rx + l.tx, 0.1)));
    });
    return h;
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setLinks(prev => prev.map(l => ({
        ...l,
        rx: Math.round(jitter(l.rx)),
        tx: Math.round(jitter(l.tx)),
      })));
      setHistory(prev => {
        const next = { ...prev };
        INITIAL_LINKS.forEach(l => {
          const arr = [...(next[l.id] || [])];
          arr.push(Math.round(jitter(l.rx + l.tx, 0.08)));
          if (arr.length > 20) arr.shift();
          next[l.id] = arr;
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const totalCapacity = useMemo(() => links.reduce((s, l) => s + l.capacity, 0), [links]);
  const currentThroughput = useMemo(() => links.reduce((s, l) => s + l.rx + l.tx, 0), [links]);
  const avgUtil = useMemo(() => {
    const utils = links.map(l => ((l.rx + l.tx) / l.capacity) * 100);
    return utils.reduce((s, u) => s + u, 0) / utils.length;
  }, [links]);

  const grouped = useMemo(() => {
    const cats: Record<string, ILLLink[]> = {};
    links.forEach(l => { (cats[l.category] = cats[l.category] || []).push(l); });
    return Object.entries(cats);
  }, [links]);

  const timeRanges = ['1h', '6h', '24h', '7d'];

  return (
    <div className="space-y-5 animate-fade-in min-h-screen -m-4 p-5" style={{ background: T.pageBg }}>

      {/* ═══════════════════════════════════════════════
          HERO BANNER
          ═══════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: T.heroBg }}>
        {/* Dot texture */}
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Ambient glows */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
          style={{ background: 'rgba(8,145,178,0.25)' }} />
        <div className="absolute -bottom-16 right-8 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
          style={{ background: 'rgba(79,70,229,0.15)' }} />

        <div className="relative px-6 pt-5 pb-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: identity */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0891B2, #4F46E5)', boxShadow: '0 4px 20px rgba(8,145,178,0.4)' }}>
                <Eye size={20} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-extrabold tracking-tight text-white">ILL Bandwidth Monitor</h1>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded"
                    style={{ background: 'rgba(5,150,105,0.2)', border: '1px solid rgba(5,150,105,0.4)' }}>
                    <LivePulse color="#6EE7B7" />
                    <span className="text-[10px] font-bold" style={{ color: '#6EE7B7' }}>LIVE</span>
                  </span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {links.length} WAN links · 30s refresh
                </p>
              </div>
            </div>

            {/* Right: time range + clock */}
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
                {timeRanges.map(tr => (
                  <button
                    key={tr}
                    onClick={() => setTimeRange(tr)}
                    className="px-3 py-1 rounded-md transition-all text-[11px] font-semibold"
                    style={{
                      color: timeRange === tr ? '#0F172A' : 'rgba(255,255,255,0.6)',
                      background: timeRange === tr ? '#FFFFFF' : 'transparent',
                    }}
                  >
                    {tr}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '3s' }} />
                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Total Capacity" value={formatMbps(totalCapacity)} accentColor={T.blue} />
        <KPICard label="Current Throughput" value={formatMbps(Math.round(currentThroughput))} accentColor={T.violet} />
        <KPICard label="Avg Utilization" value={`${avgUtil.toFixed(1)}%`} accentColor={utilizationColor(avgUtil)} />
        <KPICard label="Active Links" value={`${links.length}`} accentColor={T.cyan} />
      </div>

      {/* LINK MONITOR TABLE */}
      <Panel
        title="Link Monitor"
        titleIcon={<Activity size={14} style={{ color: T.blue }} />}
        titleExtra={
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: '#EEF2FF', color: T.indigo }}>
            {links.length} links
          </span>
        }
        noPad
        accentColor={T.blue}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.panelHeaderBg }}>
              {['', 'LINK', 'CATEGORY', 'PRIORITY', 'RX', 'TX', 'UTILIZATION', 'CAPACITY', 'UPTIME'].map((h, i) => (
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
            {grouped.map(([category, catLinks]) => {
              const catColor = CATEGORY_COLORS[category] || T.textMuted;
              const CatIcon = CATEGORY_ICONS[category] || Globe;
              return (
                <>
                  <tr key={`cat-${category}`}>
                    <td colSpan={9} style={{
                      padding: '5px 12px',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: catColor,
                      background: `${catColor}08`,
                      borderBottom: `1px solid ${T.divider}`,
                    }}>
                      <span className="flex items-center gap-1.5">
                        <CatIcon size={11} />
                        {category} ({catLinks.length})
                      </span>
                    </td>
                  </tr>
                  {catLinks.map((link, idx) => {
                    const util = ((link.rx + link.tx) / link.capacity) * 100;
                    const barColor = utilizationColor(util);
                    const pStyle = PRIORITY_COLORS[link.priority] || PRIORITY_COLORS.P3;

                    return (
                      <tr
                        key={link.id}
                        style={{ background: idx % 2 === 1 ? T.pageBg : T.cardBg, borderBottom: `1px solid ${T.divider}` }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#EFF6FF'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 1 ? T.pageBg : T.cardBg; }}
                      >
                        <td style={{ padding: '6px 12px', width: 32 }}>
                          <StatusDot color={barColor} />
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{link.name}</span>
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 600, color: catColor,
                            background: `${catColor}10`, padding: '2px 6px', borderRadius: 4,
                          }}>{category}</span>
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: pStyle.text,
                            background: pStyle.bg, padding: '2px 6px', borderRadius: 4,
                          }}>{link.priority}</span>
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <span className="flex items-center gap-1">
                            <ArrowDown size={10} style={{ color: T.emerald }} />
                            <span style={{ fontSize: 11, fontFamily: T.mono, fontWeight: 600, color: T.text }}>
                              {formatMbps(link.rx)}
                            </span>
                          </span>
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <span className="flex items-center gap-1">
                            <ArrowUp size={10} style={{ color: T.blue }} />
                            <span style={{ fontSize: 11, fontFamily: T.mono, fontWeight: 600, color: T.text }}>
                              {formatMbps(link.tx)}
                            </span>
                          </span>
                        </td>
                        <td style={{ padding: '6px 12px', minWidth: 150 }}>
                          <div className="flex items-center gap-2">
                            <div style={{ flex: 1, height: 5, background: T.divider, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(util, 100)}%`,
                                background: barColor,
                                borderRadius: 3,
                                transition: 'width 0.5s ease',
                              }} />
                            </div>
                            <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 700, color: barColor, minWidth: 38, textAlign: 'right' }}>
                              {util.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textMuted }}>
                            {formatMbps(link.capacity)}
                          </span>
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <span style={{
                            fontSize: 11, fontFamily: T.mono, fontWeight: 700,
                            color: link.uptime >= 99.9 ? T.emerald : T.amber,
                          }}>
                            {link.uptime.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </Panel>

      {/* TRAFFIC TRENDS */}
      <Panel
        title={`Traffic Trends (${timeRange})`}
        titleIcon={<Radio size={14} style={{ color: T.violet }} />}
        accentColor={T.violet}
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {links.map(link => {
            const util = ((link.rx + link.tx) / link.capacity) * 100;
            const color = utilizationColor(util);
            const sparkData = history[link.id] || [];
            return (
              <div
                key={link.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ border: `1px solid ${T.cardBorder}`, background: T.pageBg }}
              >
                <div style={{ minWidth: 80 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {link.name.split(' -- ')[0] || link.name.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: T.mono, fontWeight: 700, color }}>
                    {util.toFixed(0)}%
                  </div>
                </div>
                <div style={{ flex: 1, height: 32 }}>
                  <Sparkline data={sparkData} color={color} height={32} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
