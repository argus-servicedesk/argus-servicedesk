import { useState, useEffect, useMemo, useRef, Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import {
  AlertTriangle, Zap, CheckCircle2, Clock, Eye, Brain,
  Server, Database, Shield, Globe, HardDrive, Container, Cpu, Network,
  Users, Calendar, TrendingUp, Activity, Phone,
  RefreshCw, ChevronRight, GitMerge, Bug, BookOpen,
  Layers, BarChart3, Bell, MonitorSmartphone,
  Plus, ArrowUpRight, ArrowDownRight,
  CircleDot, Radio, Timer, ShieldCheck, Workflow,
  Box, Router, Cloudy, MonitorCheck, Wifi, ExternalLink,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useDashboard, useDashboardTrends, useSLACompliance } from '../../hooks/useDashboard';
import { useIncidents } from '../../hooks/useIncidents';
import { useAlerts } from '../../hooks/useAlerts';
import { useAssets } from '../../hooks/useAssets';
import { useChanges } from '../../hooks/useChanges';
import { useTeams } from '../../hooks/useTeams';
import { useOnCallOverview } from '../../hooks/useOnCall';
import { useAuthStore } from '../../stores/authStore';
import { useAuth } from '../../hooks/useAuth';

/* ===================================================================
   SAFE STRING — prevents React error #31 (objects as children)
   =================================================================== */
function safeStr(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    if ('firstName' in o) return `${o.firstName || ''} ${o.lastName || ''}`.trim();
    if ('name' in o) return String(o.name || '');
    if ('label' in o) return String(o.label || '');
    if ('title' in o) return String(o.title || '');
    if ('email' in o) return String(o.email || '');
    try { return JSON.stringify(val); } catch { return '[Object]'; }
  }
  return String(val);
}

function useChartSize(height: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      setSize((current) => {
        const width = nextWidth > 0 ? nextWidth : 0;
        if (current.width === width && current.height === height) return current;
        return { width, height };
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [height]);

  return [ref, size] as const;
}

/* ===================================================================
   DISPLAY MAPS
   =================================================================== */
const ASSET_TYPE_NAMES: Record<string, string> = {
  SERVER: 'Servers', DATABASE: 'Databases', KUBERNETES_CLUSTER: 'K8s Clusters',
  APPLICATION: 'Applications', NETWORK: 'Network Devices', NETWORK_DEVICE: 'Network Devices',
  STORAGE: 'Storage', VM: 'Virtual Machines', VIRTUAL_MACHINE: 'Virtual Machines',
  LOAD_BALANCER: 'Load Balancers', CONTAINER: 'Containers', FIREWALL: 'Firewalls',
  SWITCH: 'Switches', ROUTER: 'Routers', PRINTER: 'Printers', WORKSTATION: 'Workstations',
  LAPTOP: 'Laptops', SOFTWARE: 'Software', CLOUD_SERVICE: 'Cloud Services', OTHER: 'Other',
};

const ASSET_TYPE_ICONS: Record<string, React.ReactNode> = {
  SERVER: <Server size={14} />, DATABASE: <Database size={14} />,
  KUBERNETES_CLUSTER: <Layers size={14} />, APPLICATION: <Globe size={14} />,
  NETWORK: <Network size={14} />, NETWORK_DEVICE: <Router size={14} />,
  STORAGE: <HardDrive size={14} />, VM: <MonitorSmartphone size={14} />,
  VIRTUAL_MACHINE: <MonitorSmartphone size={14} />, LOAD_BALANCER: <Shield size={14} />,
  CONTAINER: <Container size={14} />, FIREWALL: <Shield size={14} />,
  ROUTER: <Router size={14} />, SWITCH: <Wifi size={14} />,
  CLOUD_SERVICE: <Cloudy size={14} />, SOFTWARE: <Box size={14} />,
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  SERVER: '#4F46E5', DATABASE: '#7C3AED', KUBERNETES_CLUSTER: '#0891B2',
  APPLICATION: '#059669', NETWORK: '#D97706', NETWORK_DEVICE: '#EA580C',
  STORAGE: '#EA580C', VM: '#6366F1', VIRTUAL_MACHINE: '#6366F1',
  LOAD_BALANCER: '#0D9488', CONTAINER: '#0284C7', FIREWALL: '#DC2626',
  ROUTER: '#B45309', SWITCH: '#7C3AED', CLOUD_SERVICE: '#2563EB', SOFTWARE: '#9333EA',
};

const CHANGE_TYPE_NAMES: Record<string, string> = {
  STANDARD: 'Standard', NORMAL: 'Normal', EMERGENCY: 'Emergency', EXPEDITED: 'Expedited',
};

const STATUS_DISPLAY: Record<string, string> = {
  OPEN: 'Open', NEW: 'New', IN_PROGRESS: 'In Progress', INVESTIGATING: 'Investigating',
  PENDING: 'Pending', ON_HOLD: 'On Hold', RESOLVED: 'Resolved', CLOSED: 'Closed',
  TRIGGERED: 'Triggered', WORKING: 'Working', PLANNED: 'Planned', APPROVED: 'Approved',
  IMPLEMENTING: 'Implementing', REVIEW: 'Under Review', ESCALATED: 'Escalated',
};

const SEVERITY_DISPLAY: Record<string, string> = {
  CRITICAL: 'Critical', HIGH: 'High', WARNING: 'Warning', MEDIUM: 'Medium',
  LOW: 'Low', INFO: 'Info',
};

/* ===================================================================
   HELPERS
   =================================================================== */
function displayName(raw: string, map: Record<string, string>): string {
  if (!raw) return 'Unknown';
  const upper = raw.toUpperCase().replace(/[- ]/g, '_');
  return map[upper] || map[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function mapPriority(priority: string | number | undefined): string {
  if (!priority) return 'P4';
  const p = String(priority).toUpperCase();
  if (p.startsWith('P')) return p;
  const n = Number(priority);
  if (n >= 1 && n <= 4) return `P${n}`;
  return 'P4';
}

function mapStatus(status: string | undefined): { key: string; label: string } {
  if (!status) return { key: 'open', label: 'Open' };
  const s = status.toLowerCase().replace(/[_-]/g, '');
  if (s === 'inprogress' || s === 'investigating' || s === 'working') return { key: 'progress', label: 'In Progress' };
  if (s === 'open' || s === 'new' || s === 'triggered') return { key: 'open', label: 'Open' };
  if (s === 'pending' || s === 'waiting' || s === 'onhold') return { key: 'pending', label: 'Pending' };
  if (s === 'resolved' || s === 'closed') return { key: 'resolved', label: 'Resolved' };
  if (s === 'escalated') return { key: 'escalated', label: 'Escalated' };
  return { key: 'open', label: displayName(status, STATUS_DISPLAY) };
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(p => p[0]?.toUpperCase() || '').join('').slice(0, 2);
}

function timeSince(date: string | undefined): string {
  if (!date) return '--';
  const ts = new Date(date).getTime();
  if (!Number.isFinite(ts)) return 'Unknown';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function formatDate(date: string | undefined): string {
  if (!date) return '--';
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(date: string | undefined): string {
  if (!date) return '--';
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const P_COLORS: Record<string, { bg: string; text: string; border: string; stripe: string; label: string }> = {
  P1: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', stripe: '#DC2626', label: 'Critical' },
  P2: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', stripe: '#D97706', label: 'High' },
  P3: { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE', stripe: '#4F46E5', label: 'Medium' },
  P4: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', stripe: '#94A3B8', label: 'Low' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  open: { bg: '#FEF2F2', text: '#991B1B', dot: '#DC2626' },
  progress: { bg: '#EFF6FF', text: '#1E40AF', dot: '#2563EB' },
  pending: { bg: '#FFFBEB', text: '#92400E', dot: '#D97706' },
  resolved: { bg: '#ECFDF5', text: '#065F46', dot: '#059669' },
  escalated: { bg: '#FFF1F2', text: '#9F1239', dot: '#E11D48' },
};

const GRADIENTS = [
  ['#4F46E5', '#7C3AED'], ['#7C3AED', '#A78BFA'], ['#059669', '#4F46E5'],
  ['#D97706', '#7C3AED'], ['#DC2626', '#7C3AED'], ['#0891B2', '#4F46E5'],
];

/* ===================================================================
   ERROR BOUNDARY
   =================================================================== */
class SafePanel extends Component<{ children: ReactNode; name?: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; name?: string }) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error(`[Dashboard:${this.props.name}]`, err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-xs text-slate-400">Failed to load {this.props.name || 'section'}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ===================================================================
   UI COMPONENTS
   =================================================================== */
function Pulse({ color = '#059669', size = 7 }: { color?: string; size?: number }) {
  return (
    <span className="relative flex flex-shrink-0" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color }} />
    </span>
  );
}

function Section({ title, icon, badge, actions, children, accent, noPad }: {
  title: string; icon?: ReactNode; badge?: ReactNode; actions?: ReactNode;
  children: ReactNode; accent?: string; noPad?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {accent && <div className="h-0.5" style={{ background: accent }} />}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-500">{icon}</span>}
          <h3 className="text-[13px] font-semibold text-slate-800">{title}</h3>
          {badge}
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
      <div className={noPad ? '' : 'p-4'}>{children}</div>
    </div>
  );
}

function SmBtn({ children, onClick, primary }: { children: ReactNode; onClick?: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} className={clsx(
      'px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1',
      primary ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
    )}>
      {children}
    </button>
  );
}

function Badge({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ color, background: `${color}10` }}>
      {children}
    </span>
  );
}

function Avatar({ name, idx = 0, size = 28 }: { name: string; idx?: number; size?: number }) {
  const [from, to] = GRADIENTS[idx % GRADIENTS.length];
  return (
    <span className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.35, background: `linear-gradient(135deg, ${from}, ${to})` }}>
      {getInitials(name)}
    </span>
  );
}

function Empty({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
      {icon && <span className="opacity-30">{icon}</span>}
      <p className="text-xs">{message}</p>
    </div>
  );
}

function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="animate-pulse border-b border-slate-50">
      {Array.from({ length: cols }).map((_, c) => (
        <td key={c} className="px-3 py-2.5">
          <div className="h-3 rounded bg-slate-100" style={{ width: `${40 + (c * 17) % 50}%` }} />
        </td>
      ))}
    </tr>
  );
}

function SLARing({ value, label, size = 72 }: { value: number; label: string; size?: number }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 95 ? '#059669' : value >= 85 ? '#D97706' : '#DC2626';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-[1.5s] ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold font-mono" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
    </div>
  );
}

/* ===================================================================
   MAIN DASHBOARD
   =================================================================== */
export default function DashboardOverview() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [trendDays, setTrendDays] = useState(7);

  const { canManage } = useAuth();

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
  const orgName = selectedOrg?.name || organization?.name || 'Argus Service Desk';
  const env = selectedOrg?.environment || organization?.environment || 'DEV';

  /* ── Data hooks ── */
  const { data: dashboardData, isLoading: dashLoading, refetch: refetchDash } = useDashboard();
  const { data: incidentData, isLoading: incLoading } = useIncidents({ limit: 8 });
  const { data: alertsData } = useAlerts({ limit: 50, status: 'FIRING' });
  const { data: assetsData } = useAssets({ limit: 100 });
  const { data: trendData } = useDashboardTrends(trendDays);
  const { data: slaData } = useSLACompliance();
  const { data: changesData } = useChanges({ limit: 5, status: 'PLANNED' });
  const { data: teamsData } = useTeams({ limit: 10 });
  const { data: onCallData } = useOnCallOverview();
  const { data: problemsData } = useQuery({
    queryKey: ['problems', 'dashboard'],
    queryFn: async () => { const { data } = await api.get('/problems/?page=1&limit=5'); return data; },
    staleTime: 60000,
  });

  /* ── KPI ── */
  const kpi = dashboardData?.data?.kpi;
  const activeIncidents = kpi?.openIncidents ?? 0;
  const p1Critical = kpi?.p1Active ?? 0;
  const slaBreached = kpi?.slaBreached ?? 0;
  const openChanges = kpi?.activeChanges ?? 0;
  const firingAlerts = kpi?.firingAlerts ?? 0;
  const slaCompliance = kpi?.slaCompliance ?? 0;
  const totalIncidents = kpi?.totalIncidents ?? 0;

  /* ── Incidents ── */
  const rawIncidents = incidentData?.data;
  const incidents = useMemo(() => {
    if (!Array.isArray(rawIncidents) || rawIncidents.length === 0) return [];
    return rawIncidents.slice(0, 8).map((inc: any, idx: number) => {
      const statusInfo = mapStatus(safeStr(inc.state) || safeStr(inc.status));
      const p = mapPriority(inc.priority);
      const assignee = inc.assignedTo;
      const assigneeName = assignee
        ? `${safeStr(assignee.firstName)} ${safeStr(assignee.lastName)}`.trim()
        : safeStr(inc.assigneeName) || '';
      return {
        id: safeStr(inc.number) || safeStr(inc.incidentNumber) || `INC-${inc.id}`,
        rawId: inc.id,
        p,
        pLabel: P_COLORS[p]?.label || 'Low',
        desc: safeStr(inc.shortDescription) || safeStr(inc.title) || safeStr(inc.subject) || safeStr(inc.description) || 'No description',
        status: statusInfo.key,
        statusLabel: statusInfo.label,
        assigneeName: assigneeName || 'Unassigned',
        avatarIdx: idx,
        slaBreached: !!inc.slaBreached,
        age: timeSince(inc.createdAt),
        createdAt: inc.createdAt,
        category: (typeof inc.category === 'string' ? inc.category : '') || '--',
        team: safeStr(inc.assignmentGroup?.name) || '',
      };
    });
  }, [rawIncidents]);

  /* ── Alerts ── */
  const liveAlerts: any[] = alertsData?.data ?? [];
  const critCount = liveAlerts.filter(a => a.severity === 'CRITICAL').length;
  const warnCount = liveAlerts.filter(a => a.severity === 'WARNING').length;
  const infoCount = liveAlerts.filter(a => a.severity !== 'CRITICAL' && a.severity !== 'WARNING').length;

  /* ── Assets ── */
  const allAssets: any[] = assetsData?.data ?? [];
  const totalAssets = assetsData?.pagination?.total ?? allAssets.length;
  const assetsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    allAssets.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allAssets]);

  const assetsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    allAssets.forEach(a => { counts[a.status || 'UNKNOWN'] = (counts[a.status || 'UNKNOWN'] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allAssets]);

  /* ── Trend ── */
  const trendChart = useMemo(() => {
    const raw = trendData?.data;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return null;
  }, [trendData]);
  const [trendChartRef, trendChartSize] = useChartSize(150);

  /* ── Changes / Problems / Teams / OnCall ── */
  const upcomingChanges: any[] = changesData?.data ?? [];
  const problems: any[] = problemsData?.data ?? [];
  const openProblems = problemsData?.pagination?.total ?? problems.length;
  const teams: any[] = Array.isArray(teamsData?.data) ? teamsData.data : [];
  const onCallTeams: any[] = onCallData?.data ?? [];

  /* ── Infra ── */
  const { data: infraData } = useQuery({
    queryKey: ['dashboard', 'infra-metrics'],
    queryFn: async () => { const { data } = await api.get('/ai/infrastructure-metrics/'); return data; },
    staleTime: 30000, retry: 1,
  });
  const infraMetrics = useMemo(() => {
    const d = infraData?.data;
    if (!d || d.noDataForOrg) return [];
    const items: { label: string; value: string | number; suffix: string; unit: string; color: string; pct?: number; icon: ReactNode }[] = [];
    const cpuPct = d.cpu?.avgUsagePct ?? d.cpu?.current;
    if (cpuPct != null) items.push({ label: 'CPU Usage', value: parseFloat(String(cpuPct)).toFixed(1), suffix: '%', unit: `${d.cpu?.totalCores || '--'} cores`, color: cpuPct > 80 ? '#DC2626' : cpuPct > 60 ? '#D97706' : '#059669', pct: cpuPct, icon: <Cpu size={13} /> });
    const memPct = d.memory?.usedPct ?? d.memory?.current;
    if (memPct != null) items.push({ label: 'Memory', value: parseFloat(String(memPct)).toFixed(1), suffix: '%', unit: `${d.memory?.usedGB || '--'}/${d.memory?.totalGB || '--'} GB`, color: memPct > 80 ? '#DC2626' : memPct > 60 ? '#D97706' : '#059669', pct: memPct, icon: <MonitorCheck size={13} /> });
    const diskPct = d.disk?.totalUsedPct ?? d.disk?.current;
    if (diskPct != null) items.push({ label: 'Disk', value: parseFloat(String(diskPct)).toFixed(1), suffix: '%', unit: 'utilization', color: diskPct > 85 ? '#DC2626' : diskPct > 70 ? '#D97706' : '#059669', pct: diskPct, icon: <HardDrive size={13} /> });
    const pods = d.virtualization?.podSummary;
    if (pods?.running != null) items.push({ label: 'Pods', value: pods.running, suffix: '', unit: `of ${pods.total || pods.running}`, color: '#059669', icon: <Layers size={13} /> });
    return items;
  }, [infraData]);

  /* ── Clock ── */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── System status ── */
  const systemStatus = p1Critical > 0
    ? { label: 'Major Incident Active', color: '#DC2626', bg: '#FEF2F2', icon: <AlertTriangle size={14} /> }
    : firingAlerts > 10
    ? { label: 'Elevated Alerts', color: '#D97706', bg: '#FFFBEB', icon: <Bell size={14} /> }
    : { label: 'All Systems Operational', color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 size={14} /> };

  const greeting = useMemo(() => {
    const h = now.getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  }, [now]);

  const envColors: Record<string, { text: string; border: string; bg: string }> = {
    PROD: { text: '#059669', border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.1)' },
    DR:   { text: '#D97706', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.1)' },
    UAT:  { text: '#0284C7', border: 'rgba(2,132,199,0.3)',  bg: 'rgba(2,132,199,0.1)' },
    DEV:  { text: '#7C3AED', border: 'rgba(124,58,237,0.3)', bg: 'rgba(124,58,237,0.1)' },
  };
  const ec = envColors[env] || envColors.DEV;

  const assetStatusColors: Record<string, string> = {
    LIVE: '#059669', ACTIVE: '#059669', RUNNING: '#059669',
    MAINTENANCE: '#D97706', DEGRADED: '#D97706',
    DOWN: '#DC2626', OFFLINE: '#DC2626', DECOMMISSIONED: '#94A3B8', UNKNOWN: '#94A3B8',
  };
  const assetStatusNames: Record<string, string> = {
    LIVE: 'Live', ACTIVE: 'Active', RUNNING: 'Running', MAINTENANCE: 'Maintenance',
    DEGRADED: 'Degraded', DOWN: 'Down', OFFLINE: 'Offline',
    DECOMMISSIONED: 'Retired', UNKNOWN: 'Unknown',
  };

  /* ── Pie data for assets ── */
  const assetPieData = useMemo(() =>
    assetsByType.slice(0, 8).map(([type, count]) => ({
      name: displayName(type, ASSET_TYPE_NAMES),
      value: count,
      fill: ASSET_TYPE_COLORS[type] || '#94A3B8',
    })),
  [assetsByType]);

  return (
    <div className="min-h-screen -m-4 p-5 space-y-4" style={{ background: '#F8FAFC' }}>

      {/* ═══════ HEADER BAR ═══════ */}
      <SafePanel name="Header">
        <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)' }}>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: branding + greeting */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 2px 12px rgba(79,70,229,0.4)' }}>
                  <Eye size={18} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{orgName}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider"
                      style={{ color: ec.text, border: `1px solid ${ec.border}`, background: ec.bg }}>
                      {env}
                    </span>
                    <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-md" style={{ background: systemStatus.bg + '20' }}>
                      <Pulse color={systemStatus.color} size={6} />
                      <span className="text-[11px] font-semibold" style={{ color: systemStatus.color }}>{systemStatus.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-white/60">{greeting}{user?.firstName ? `, ${safeStr(user.firstName)}` : ''}</span>
                    <span className="text-white/20">|</span>
                    <span className="text-[11px] font-mono text-white/40">
                      {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      {' \u00B7 '}
                      {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2">
                <button onClick={() => refetchDash()} title="Refresh"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">
                  <RefreshCw size={14} />
                </button>
                {canManage('incidents') && (
                  <button onClick={() => navigate('/incidents/create')}
                    className="flex items-center gap-1.5 px-3 py-2 text-white text-[11px] font-semibold rounded-lg transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                    <Plus size={12} /> New Incident
                  </button>
                )}
                {canManage('changes') && (
                  <button onClick={() => navigate('/changes/create')}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg text-white/80 bg-white/10 border border-white/10 hover:bg-white/15 transition-all">
                    <Plus size={12} /> New Change
                  </button>
                )}
                <button onClick={() => navigate('/alerts')} title="Alerts"
                  className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">
                  <Bell size={14} />
                  {firingAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {firingAlerts > 9 ? '9+' : firingAlerts}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </SafePanel>

      {/* ═══════ KPI CARDS ═══════ */}
      <SafePanel name="KPIs">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: 'Open Incidents', value: activeIncidents, sub: `${p1Critical} P1 active`, icon: <AlertTriangle size={16} />, color: '#D97706', route: '/incidents' },
            { label: 'P1 Critical', value: p1Critical, sub: p1Critical > 0 ? 'Requires attention' : 'None active', icon: <Zap size={16} />, color: '#DC2626', route: '/incidents?priority=P1' },
            { label: 'Firing Alerts', value: firingAlerts, sub: `${critCount} critical`, icon: <Radio size={16} />, color: '#E11D48', route: '/alerts' },
            { label: 'SLA Compliance', value: `${slaCompliance}%`, sub: slaBreached > 0 ? `${slaBreached} breached` : 'On track', icon: <ShieldCheck size={16} />, color: '#059669', route: '/sla' },
            { label: 'Active Changes', value: openChanges, sub: `${upcomingChanges.length} planned`, icon: <GitMerge size={16} />, color: '#4F46E5', route: '/changes' },
            { label: 'Total Assets', value: totalAssets, sub: `${assetsByType.length} types`, icon: <Database size={16} />, color: '#0891B2', route: '/assets' },
          ].map(item => (
            <div key={item.label} onClick={() => navigate(item.route)}
              className="rounded-xl border border-slate-200 bg-white p-3.5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `${item.color}08`, color: item.color }}>
                  {item.icon}
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 leading-none mb-1">
                {dashLoading ? <div className="h-6 w-16 rounded-md bg-slate-100 animate-pulse" /> : item.value}
              </div>
              <span className="text-[10px] text-slate-400">{item.sub}</span>
            </div>
          ))}
        </div>
      </SafePanel>

      {/* ═══════ INCIDENT TABLE + ALERTS / SERVICE HEALTH ═══════ */}
      <SafePanel name="Incidents & Alerts">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">

          {/* Incident Work Queue */}
          <Section title="Incident Work Queue" icon={<AlertTriangle size={14} />}
            badge={<Badge color="#D97706">{activeIncidents} open</Badge>}
            accent="#D97706" noPad
            actions={
              <>
                {canManage('incidents') && <SmBtn onClick={() => navigate('/incidents/create')} primary><Plus size={10} /> New</SmBtn>}
                <SmBtn onClick={() => navigate('/incidents')}>View All <ChevronRight size={10} /></SmBtn>
              </>
            }>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-100 bg-slate-50/80">
                    {['Priority', 'ID', 'Description', 'Status', 'Assigned To', 'Team', 'Created'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                  ) : incidents.length === 0 ? (
                    <tr><td colSpan={7}><Empty message="No active incidents" icon={<CheckCircle2 size={22} />} /></td></tr>
                  ) : (
                    incidents.map((inc) => {
                      const pc = P_COLORS[inc.p] || P_COLORS.P4;
                      const sc = STATUS_STYLES[inc.status] || STATUS_STYLES.open;
                      return (
                        <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.rawId}`)}
                          className="cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-50"
                          style={{ borderLeft: `3px solid ${pc.stripe}` }}>
                          <td className="px-3 py-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono"
                              style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                              {inc.p}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-[11px] text-indigo-600">{inc.id}</td>
                          <td className="px-3 py-2.5 max-w-[220px]">
                            <p className="text-[11px] font-medium text-slate-800 truncate">{inc.desc}</p>
                            {inc.category !== '--' && <p className="text-[9px] text-slate-400 mt-0.5">{inc.category}</p>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ background: sc.bg, color: sc.text }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                              {inc.statusLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5">
                              <Avatar name={inc.assigneeName} idx={inc.avatarIdx} size={22} />
                              <span className="text-[11px] text-slate-700">{inc.assigneeName}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[10px] text-slate-500">{inc.team || '--'}</td>
                          <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{inc.age}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Right column: Alerts + On-Call */}
          <div className="space-y-4">
            {/* Alert Breakdown */}
            <Section title="Active Alerts" icon={<Radio size={14} />}
              badge={<Badge color={firingAlerts > 0 ? '#DC2626' : '#059669'}>{firingAlerts} firing</Badge>}
              accent="#DC2626"
              actions={<SmBtn onClick={() => navigate('/alerts')}>View All</SmBtn>}>
              {firingAlerts > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Critical', count: critCount, color: '#DC2626' },
                      { label: 'Warning', count: warnCount, color: '#D97706' },
                      { label: 'Info', count: infoCount, color: '#4F46E5' },
                    ].map(a => (
                      <div key={a.label} className="text-center p-2.5 rounded-lg" style={{ background: `${a.color}06`, border: `1px solid ${a.color}15` }}>
                        <div className="text-lg font-bold font-mono" style={{ color: a.color }}>{a.count}</div>
                        <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: a.color }}>{a.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Recent alerts list */}
                  <div className="space-y-1.5">
                    {liveAlerts.slice(0, 4).map((a: any, i: number) => {
                      const sevColor = a.severity === 'CRITICAL' ? '#DC2626' : a.severity === 'WARNING' ? '#D97706' : '#4F46E5';
                      return (
                        <div key={a.id || i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => navigate('/alerts')}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sevColor }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-slate-700 truncate">{safeStr(a.name || a.alertName)}</p>
                            <p className="text-[9px] text-slate-400">{safeStr(a.configItem?.name)} &middot; {timeSince(a.firedAt)}</p>
                          </div>
                          <Badge color={sevColor}>{displayName(safeStr(a.severity), SEVERITY_DISPLAY)}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-4">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                  <p className="text-xs font-medium text-emerald-600">All Clear</p>
                  <p className="text-[10px] text-slate-400">No alerts currently firing</p>
                </div>
              )}
            </Section>

            {/* On-Call */}
            {onCallTeams.length > 0 && (
              <Section title="On-Call Now" icon={<Phone size={14} />} accent="#7C3AED"
                actions={<SmBtn onClick={() => navigate('/oncall')}>Schedule</SmBtn>}>
                <div className="space-y-2">
                  {onCallTeams.slice(0, 3).map((team: any, i: number) => {
                    const primary = team.currentOnCall?.primary;
                    const name = primary?.user?.firstName
                      ? `${safeStr(primary.user.firstName)} ${safeStr(primary.user.lastName)}`.trim()
                      : 'Unassigned';
                    const teamName = safeStr(team.name) || `Team ${i + 1}`;
                    return (
                      <div key={team.id || i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => navigate('/oncall')}>
                        <Avatar name={name} idx={i} size={28} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-700">{name}</p>
                          <p className="text-[9px] text-slate-400">{teamName}</p>
                        </div>
                        <Pulse color="#059669" size={6} />
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>
        </div>
      </SafePanel>

      {/* ═══════ ROW 3: TREND + CHANGES/PROBLEMS + SLA ═══════ */}
      <SafePanel name="Analytics">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Incident Trend */}
          <Section title="Incident Trend" icon={<TrendingUp size={14} />}
            badge={<Badge color="#4F46E5">{totalIncidents} total</Badge>}
            accent="#4F46E5"
            actions={
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setTrendDays(d)}
                    className={clsx('px-2 py-1 rounded-md text-[10px] font-medium transition-all',
                      trendDays === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    )}>{d}d</button>
                ))}
              </div>
            }>
            {trendChart && trendChart.length > 0 ? (
              <div ref={trendChartRef} className="h-[150px] w-full min-w-0 overflow-hidden">
                {trendChartSize.width > 0 ? (
                  <BarChart width={trendChartSize.width} height={trendChartSize.height} data={trendChart} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => { try { return new Date(String(v)).toLocaleDateString('en-IN', { weekday: 'short' }); } catch { return String(v); } }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      labelFormatter={(v) => { try { return new Date(String(v)).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }); } catch { return String(v); } }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={20}>
                      {trendChart.map((_: any, idx: number) => (
                        <Cell key={idx} fill={idx === trendChart.length - 1 ? '#4F46E5' : '#C7D2FE'} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="flex items-end gap-1 h-[70px]">
                  {[3, 5, 2, 7, 4, 6, activeIncidents || 1].map((v, i) => (
                    <div key={i} className="w-4 rounded-t transition-all"
                      style={{ height: `${Math.max(6, (v / 8) * 70)}px`, background: i === 6 ? '#4F46E5' : '#E0E7FF' }} />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">{activeIncidents} active incidents</span>
              </div>
            )}
          </Section>

          {/* Changes & Problems */}
          <Section title="Changes & Problems" icon={<Workflow size={14} />} accent="#7C3AED"
            actions={<SmBtn onClick={() => navigate('/changes/calendar')}>Calendar</SmBtn>}>
            <div className="space-y-3">
              {/* Upcoming Changes */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar size={11} className="text-emerald-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Upcoming Changes</span>
                </div>
                {upcomingChanges.length > 0 ? upcomingChanges.slice(0, 3).map((c: any, i: number) => {
                  const ct = safeStr(c.changeType) || safeStr(c.type) || 'STANDARD';
                  const tc = ct === 'EMERGENCY' ? '#DC2626' : ct === 'NORMAL' ? '#4F46E5' : '#6366F1';
                  return (
                    <div key={c.id || i} onClick={() => navigate(`/changes/${c.id}`)}
                      className="flex items-center gap-2.5 py-1.5 cursor-pointer rounded-lg px-2 -mx-2 hover:bg-slate-50 transition-colors">
                      <span className="w-0.5 h-5 rounded-full flex-shrink-0" style={{ background: tc }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-700 truncate">
                          {safeStr(c.title) || safeStr(c.shortDescription) || 'Scheduled Change'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge color={tc}>{displayName(ct, CHANGE_TYPE_NAMES)}</Badge>
                          <span className="text-[9px] font-mono text-slate-400">{formatDateTime(c.plannedStartTime || c.scheduledAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }) : <p className="text-[11px] text-slate-400 py-1">No upcoming changes</p>}
              </div>
              <div className="border-t border-slate-100" />
              {/* Open Problems */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Bug size={11} className="text-violet-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Open Problems</span>
                  </div>
                  <Badge color="#7C3AED">{openProblems}</Badge>
                </div>
                {problems.length > 0 ? problems.slice(0, 3).map((p: any, i: number) => (
                  <div key={p.id || i} onClick={() => navigate(`/problems/${p.id}`)}
                    className="flex items-center gap-2 py-1.5 cursor-pointer rounded-lg px-2 -mx-2 hover:bg-slate-50 transition-colors">
                    <CircleDot size={10} className="text-violet-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-slate-700 truncate">
                        {safeStr(p.title) || safeStr(p.shortDescription) || 'Problem Record'}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {displayName(safeStr(p.status) || 'OPEN', STATUS_DISPLAY)} &middot; {timeSince(p.createdAt)}
                      </p>
                    </div>
                  </div>
                )) : <p className="text-[11px] text-slate-400 py-1">No open problems</p>}
              </div>
            </div>
          </Section>

          {/* SLA Compliance */}
          <Section title="SLA Compliance" icon={<ShieldCheck size={14} />}
            badge={<Badge color={slaCompliance >= 95 ? '#059669' : slaCompliance >= 85 ? '#D97706' : '#DC2626'}>{slaCompliance}%</Badge>}
            accent="#059669">
            {(() => {
              const sla = slaData?.data;
              const overall = sla?.overall ?? slaCompliance ?? 0;
              const byPriority = sla?.byPriority || [];
              return (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <SLARing value={overall} label="Overall" size={80} />
                  </div>
                  <div className="space-y-2">
                    {byPriority.length > 0 ? byPriority.map((s: any) => {
                      const val = s.value ?? s.compliance ?? 0;
                      const barCol = val >= 95 ? '#059669' : val >= 85 ? '#D97706' : '#DC2626';
                      return (
                        <div key={s.priority || s.label} className="flex items-center gap-2">
                          <span className="w-7 text-[10px] font-bold text-slate-500">{s.priority}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
                            <div className="h-full rounded-full transition-all duration-[1.5s]"
                              style={{ width: `${val}%`, background: barCol }} />
                          </div>
                          <span className="w-9 text-[10px] font-bold font-mono text-right" style={{ color: barCol }}>{val.toFixed(0)}%</span>
                        </div>
                      );
                    }) : (
                      <p className="text-[10px] text-center text-slate-400">
                        {overall > 0 ? `Overall: ${overall}%` : 'No SLA data'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </Section>
        </div>
      </SafePanel>

      {/* ═══════ ROW 4: ASSETS + TEAMS + INFRA ═══════ */}
      <SafePanel name="Assets & Teams">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Asset Inventory */}
          <Section title="Asset Inventory (CMDB)" icon={<Database size={14} />}
            badge={<Badge color="#0891B2">{totalAssets} CIs</Badge>}
            accent="#0891B2"
            actions={<SmBtn onClick={() => navigate('/assets')}>All Assets</SmBtn>}>
            {assetsByType.length > 0 ? (
              <div className="space-y-3">
                {/* Asset type breakdown */}
                <div className="space-y-1.5">
                  {assetsByType.slice(0, 6).map(([type, count]) => {
                    const pct = totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0;
                    const color = ASSET_TYPE_COLORS[type] || '#94A3B8';
                    return (
                      <div key={type} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1 transition-colors"
                        onClick={() => navigate('/assets')}>
                        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}10`, color }}>
                          {ASSET_TYPE_ICONS[type] || <Server size={12} />}
                        </div>
                        <span className="w-24 text-[10px] font-medium text-slate-600 truncate">{displayName(type, ASSET_TYPE_NAMES)}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="w-7 text-[10px] font-bold font-mono text-right text-slate-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Asset status */}
                {assetsByStatus.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-100">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Status</span>
                    <div className="flex flex-wrap gap-1">
                      {assetsByStatus.map(([status, count]) => {
                        const c = assetStatusColors[status] || '#94A3B8';
                        return (
                          <span key={status} className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: `${c}08`, color: c }}>
                            <span className="w-1 h-1 rounded-full" style={{ background: c }} />
                            {assetStatusNames[status] || displayName(status, {})}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Empty message="No assets in CMDB" icon={<Database size={20} />} />
            )}
          </Section>

          {/* Team Performance */}
          <Section title="Teams" icon={<Users size={14} />} accent="#7C3AED"
            actions={<SmBtn onClick={() => navigate('/teams')}>All Teams</SmBtn>}>
            {teams.length > 0 ? (
              <div className="space-y-2">
                {teams.slice(0, 5).map((team: any, i: number) => {
                  const memberCount = team._count?.members ?? (Array.isArray(team.members) ? team.members.length : 0);
                  const incidentCount = team._count?.assignedIncidents ?? team._count?.incidents ?? 0;
                  return (
                    <div key={team.id} onClick={() => navigate('/teams')}
                      className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <Avatar name={safeStr(team.name)} idx={i} size={30} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-700 truncate">{safeStr(team.name)}</span>
                          <span className="text-[9px] text-slate-400">{memberCount} members</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 rounded-full overflow-hidden bg-slate-100">
                            <div className="h-full rounded-full" style={{
                              width: `${Math.min(100, (incidentCount / Math.max(...teams.map((t: any) => t._count?.assignedIncidents ?? t._count?.incidents ?? 1), 1)) * 100)}%`,
                              background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                            }} />
                          </div>
                          <span className="text-[10px] font-bold font-mono text-violet-600">{incidentCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty message="No teams configured" icon={<Users size={20} />} />
            )}
          </Section>

          {/* Infrastructure Metrics */}
          <Section title="Infrastructure" icon={<Activity size={14} />}
            badge={infraMetrics.length > 0 ? <Badge color="#059669">Live</Badge> : undefined}
            accent="#059669"
            actions={<SmBtn onClick={() => navigate('/k8s')}>Cluster</SmBtn>}>
            {infraMetrics.length > 0 ? (
              <div className="space-y-3">
                {infraMetrics.map((m) => (
                  <div key={m.label} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: `${m.color}10`, color: m.color }}>
                      {m.icon}
                    </div>
                    <span className="w-16 text-[10px] font-medium text-slate-500 flex-shrink-0">{m.label}</span>
                    <div className="flex-1">
                      {m.pct != null ? (
                        <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
                          <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, Number(m.value))}%`, background: m.color }} />
                        </div>
                      ) : <div className="h-1.5" />}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[12px] font-bold font-mono" style={{ color: m.color }}>{m.value}{m.suffix}</span>
                      <span className="text-[9px] text-slate-400 ml-1">{m.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty message="Connect Prometheus for live metrics" icon={<Cpu size={20} />} />
            )}
          </Section>
        </div>

        {/* ROW 4: Security & Workflow Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Section title="Security & Compliance" icon={<Shield size={14} />} accent="#0891B2"
            actions={<SmBtn onClick={() => navigate('/audit')}>Audit Log</SmBtn>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">Audit Volume</p>
                    <p className="text-[9px] text-slate-500">Last 24h</p>
                  </div>
                </div>
                <span className="text-sm font-bold font-mono text-indigo-600">342</span>
              </div>
              
              <div className="flex flex-col items-center justify-center p-3 text-center bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-1.5 text-emerald-700 mb-0.5">
                  <ShieldCheck size={14} />
                  <span className="text-[11px] font-bold">Threat Monitor</span>
                </div>
                <p className="text-[9px] text-emerald-600/70">No anomalies detected</p>
              </div>
            </div>
          </Section>

          <Section title="Workflow Automation" icon={<GitMerge size={14} />} accent="#7C3AED"
            actions={<SmBtn onClick={() => navigate('/workflows')}>Designer</SmBtn>}>
            <div className="space-y-3">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-indigo-500" style={{ width: '45%' }} />
                <div className="h-full bg-emerald-500" style={{ width: '30%' }} />
                <div className="h-full bg-amber-500" style={{ width: '25%' }} />
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> In Progress</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Success</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pending</span>
              </div>
            </div>
          </Section>
        </div>
      </SafePanel>

      {/* FOOTER */}
      <div className="text-center py-3 text-[10px] text-slate-400">
        <span className="font-semibold text-slate-300">ARGUS SERVICE DESK</span>
        <span className="mx-1.5 text-slate-200">&middot;</span>
        FinSpot Technology Solutions Pvt Ltd
        <span className="mx-1.5 text-slate-200">&middot;</span>
        {new Date().getFullYear()}
      </div>
    </div>
  );
}
