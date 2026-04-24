import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Zap, CheckCircle2, Clock, Loader2, AlertTriangle, Terminal,
  Server, ChevronDown, ChevronRight, Shield, Brain, Bell,
  HardDrive, Activity, Timer, Eye,
  Bot, Wrench, FileText, GitBranch,
  Search, Settings, ChevronUp,
  XCircle, Copy,
  RefreshCw, Link2,
  ArrowRight, Gauge, Target, History,
  Power, ToggleLeft, ToggleRight, Hash, Cpu,
  Lock, MessageSquare, Building2, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { onEvent } from '../../lib/socket';
import api from '../../lib/api';
import {
  usePipelineStatus,
  usePipelineActions,
  usePipelineNotifications,
  usePipelineExecutions,
  useTogglePipeline,
  useToggleAction,
  useToggleNotification,
} from '../../hooks/useAgentPipeline';

// ══════════════════════════════════════════════════════════════════════════════
// Design Tokens — Datadog-inspired purple gradient theme
// ══════════════════════════════════════════════════════════════════════════════

const D = {
  bg:       '#f8fafc',
  surface:  'rgba(255,255,255,0.8)',
  surface2: 'rgba(99,102,241,0.08)',
  surface3: 'rgba(248,250,252,0.9)',
  border:   'rgba(99,102,241,0.12)',
  border2:  'rgba(99,102,241,0.08)',
  shadow:   '0 2px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(99,102,241,0.12)',
  text:     '#0f172a',
  text2:    '#64748b',
  text3:    '#94a3b8',
  text4:    '#cbd5e1',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// Types (matching backend API shapes)
// ══════════════════════════════════════════════════════════════════════════════

interface PipelineStep {
  stage: string;
  status: string;
  detail: string;
  ts: number;
}

interface PipelineExecution {
  id: string;
  alertId?: string;
  alertName: string;
  severity: string;
  organizationId?: string;
  orgName?: string;
  orgEnvironment?: string;
  matchedAction: string | null;
  actionResult: boolean | null;
  steps: PipelineStep[];
  duration: number;
  timestamp: string;
  error?: string;
}

interface RemediationAction {
  id: string;
  name: string;
  description: string;
  category: string;
  targetSeverity: string[];
  matchAlerts: string[];
  enabled: boolean;
  commandCount: number;
  hasVerification: boolean;
}

interface NotificationRule {
  id: string;
  name: string;
  severity?: string[];
  event?: string | null;
  channel: string;
  enabled: boolean;
}

interface PipelineStatusData {
  enabled: boolean;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: string;
  lastExecutionAt: string | null;
  startedAt: string;
  uptime: number;
  remediationActions: RemediationAction[];
  notificationRules: NotificationRule[];
  recentExecutions: PipelineExecution[];
}

type MainTab = 'overview' | 'executions' | 'config';

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h < 24) return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// Purple-theme category colors
const CATEGORY_COLORS: Record<string, { iconBg: string; iconColor: string; badgeBg: string; badgeColor: string; badgeBorder: string }> = {
  Storage:        { iconBg: 'rgba(217,119,6,0.12)',   iconColor: '#D97706', badgeBg: 'rgba(217,119,6,0.10)',   badgeColor: '#D97706', badgeBorder: 'rgba(217,119,6,0.22)'   },
  Kubernetes:     { iconBg: 'rgba(99,102,241,0.12)',   iconColor: '#818cf8', badgeBg: 'rgba(99,102,241,0.10)',   badgeColor: '#818cf8', badgeBorder: 'rgba(99,102,241,0.22)'   },
  Infrastructure: { iconBg: 'rgba(99,102,241,0.12)',   iconColor: '#6366f1', badgeBg: 'rgba(99,102,241,0.10)',   badgeColor: '#6366f1', badgeBorder: 'rgba(99,102,241,0.22)'   },
  Compute:        { iconBg: 'rgba(196,181,253,0.12)',  iconColor: '#6366f1', badgeBg: 'rgba(196,181,253,0.10)',  badgeColor: '#6366f1', badgeBorder: 'rgba(196,181,253,0.22)'  },
  Security:       { iconBg: 'rgba(220,38,38,0.12)',    iconColor: '#DC2626', badgeBg: 'rgba(220,38,38,0.10)',    badgeColor: '#DC2626', badgeBorder: 'rgba(220,38,38,0.22)'    },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Storage: HardDrive,
  Kubernetes: Server,
  Infrastructure: Wrench,
  Compute: Cpu,
  Security: Shield,
};

// Severity badge styles
const SEVERITY_BADGE: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  CRITICAL: { bg: 'rgba(220,38,38,0.12)',  color: '#DC2626', border: 'rgba(220,38,38,0.25)',  dot: '#DC2626' },
  WARNING:  { bg: 'rgba(217,119,6,0.12)',  color: '#D97706', border: 'rgba(217,119,6,0.25)',  dot: '#D97706' },
  INFO:     { bg: 'rgba(99,102,241,0.10)', color: '#818cf8', border: 'rgba(99,102,241,0.20)', dot: '#818cf8' },
};

const STAGE_ORDER = ['detect', 'triage', 'enrich', 'action', 'notify', 'verify'];
const STAGE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  detect: { icon: Activity,     color: '#DC2626' },
  triage: { icon: Brain,        color: '#6366f1' },
  enrich: { icon: Eye,          color: '#D97706' },
  action: { icon: Wrench,       color: '#6366f1' },
  notify: { icon: Bell,         color: '#059669' },
  verify: { icon: CheckCircle2, color: '#059669' },
};

// ══════════════════════════════════════════════════════════════════════════════
// Loading Skeleton
// ══════════════════════════════════════════════════════════════════════════════

function StatSkeleton() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
      <div className="w-8 h-8 rounded-xl mb-2" style={{ background: D.surface2 }} />
      <div className="h-7 w-16 rounded mb-1" style={{ background: D.surface2 }} />
      <div className="h-3 w-24 rounded" style={{ background: D.surface2 }} />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
      <div className="h-5 w-40 rounded mb-3" style={{ background: D.surface2 }} />
      <div className="h-3 w-full rounded mb-2" style={{ background: D.surface2 }} />
      <div className="h-3 w-3/4 rounded" style={{ background: D.surface2 }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Execution Status Badge
// ══════════════════════════════════════════════════════════════════════════════

function ExecutionStatusBadge({ actionResult, error }: { actionResult: boolean | null; error?: string }) {
  if (error) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md uppercase"
      style={{ background: 'rgba(220,38,38,0.12)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.25)' }}>
      <XCircle size={10} /> ERROR
    </span>
  );
  if (actionResult === true) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md uppercase"
      style={{ background: 'rgba(5,150,105,0.12)', color: '#059669', border: '1px solid rgba(5,150,105,0.25)' }}>
      <CheckCircle2 size={10} /> SUCCESS
    </span>
  );
  if (actionResult === false) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md uppercase"
      style={{ background: 'rgba(220,38,38,0.12)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.25)' }}>
      <XCircle size={10} /> FAILED
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md uppercase"
      style={{ background: 'rgba(99,102,241,0.10)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.20)' }}>
      <Bell size={10} /> NOTIFY-ONLY
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_BADGE[severity] || SEVERITY_BADGE.INFO;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md uppercase"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {severity}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Toggle Switch
// ══════════════════════════════════════════════════════════════════════════════

function ToggleSwitch({ enabled, onToggle, disabled, size = 'md' }: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const w = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const translate = size === 'sm' ? (enabled ? 'translate-x-4' : 'translate-x-0.5') : (enabled ? 'translate-x-5' : 'translate-x-0.5');

  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(); }}
      disabled={disabled}
      className={clsx('relative inline-flex items-center rounded-full transition-colors', w, disabled && 'opacity-50 cursor-not-allowed')}
      style={{ background: enabled ? '#059669' : D.surface2 }}
    >
      <span
        className={clsx('inline-block rounded-full bg-white shadow-sm transition-transform', translate)}
        style={{ width: size === 'sm' ? 14 : 18, height: size === 'sm' ? 14 : 18 }}
      />
      {disabled && <Lock size={8} className="absolute right-1" style={{ color: 'rgba(255,255,255,0.4)' }} />}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Pipeline Step Timeline (for execution detail)
// ══════════════════════════════════════════════════════════════════════════════

function StepTimeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="space-y-1 mt-3">
      {steps.map((step, idx) => {
        const stageInfo = STAGE_ICONS[step.stage] || { icon: Activity, color: D.text2 };
        const StIcon = stageInfo.icon;
        const isComplete = step.status === 'complete';
        const isFailed = step.status === 'failed';
        const isWarning = step.status === 'warning';
        const isSkipped = step.status === 'skipped';

        const iconBg = isComplete ? 'rgba(5,150,105,0.12)' :
                       isFailed   ? 'rgba(220,38,38,0.12)' :
                       isWarning  ? 'rgba(217,119,6,0.12)' :
                       isSkipped  ? D.surface2 :
                                    'rgba(99,102,241,0.12)';
        const connectorColor = isComplete ? 'rgba(5,150,105,0.3)' :
                               isFailed   ? 'rgba(220,38,38,0.3)' :
                               isWarning  ? 'rgba(217,119,6,0.3)' :
                                            D.border;
        const statusBg    = isComplete ? 'rgba(5,150,105,0.10)' :
                            isFailed   ? 'rgba(220,38,38,0.10)' :
                            isWarning  ? 'rgba(217,119,6,0.10)' :
                            isSkipped  ? D.surface2 :
                                         'rgba(99,102,241,0.10)';
        const statusColor = isComplete ? '#059669' :
                            isFailed   ? '#DC2626' :
                            isWarning  ? '#D97706' :
                            isSkipped  ? D.text3 :
                                         '#6366f1';

        return (
          <div key={idx} className="relative flex gap-3 items-start">
            {idx < steps.length - 1 && (
              <div className="absolute left-[15px] top-[28px] w-[2px] bottom-0" style={{ background: connectorColor }} />
            )}
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
              {isComplete ? <CheckCircle2 size={14} style={{ color: '#059669' }} /> :
               isFailed   ? <XCircle size={14} style={{ color: '#DC2626' }} /> :
               isWarning  ? <AlertTriangle size={14} style={{ color: '#D97706' }} /> :
               isSkipped  ? <ArrowRight size={14} style={{ color: D.text3 }} /> :
               <StIcon size={14} style={{ color: stageInfo.color }} />}
            </div>
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase" style={{ color: D.text2 }}>{step.stage}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: statusBg, color: statusColor }}>
                  {step.status}
                </span>
              </div>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: D.text2 }}>{step.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Pipeline Flow Visualization
// ══════════════════════════════════════════════════════════════════════════════

const PIPELINE_STEPS = [
  { num: 1, label: 'Detect', sub: 'Alert classified', icon: Activity,     gradient: 'linear-gradient(135deg, #DC2626, #B91C1C)' },
  { num: 2, label: 'Triage', sub: 'Match action',     icon: Brain,        gradient: 'linear-gradient(135deg, #6366f1, #6D28D9)' },
  { num: 3, label: 'Enrich', sub: 'Context + CMDB',  icon: Eye,          gradient: 'linear-gradient(135deg, #D97706, #B45309)' },
  { num: 4, label: 'Act',    sub: 'SSH remediate',    icon: Wrench,       gradient: 'linear-gradient(135deg, #818cf8, #6366f1)' },
  { num: 5, label: 'Notify', sub: 'Slack / PagerDuty',icon: Bell,         gradient: 'linear-gradient(135deg, #059669, #047857)' },
  { num: 6, label: 'Verify', sub: 'Health check',     icon: CheckCircle2, gradient: 'linear-gradient(135deg, #059669, #10B981)' },
];

function PipelineFlow() {
  return (
    <div className="rounded-2xl p-6" style={{ background: D.surface, border: `1px solid ${D.border}`, backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-2 mb-5">
        <Target size={15} style={{ color: '#6366f1' }} />
        <h3 className="text-sm font-display font-bold" style={{ color: D.text }}>6-Stage Pipeline Flow</h3>
        <span className="text-[10px] font-mono ml-auto" style={{ color: D.text4 }}>Detect → Triage → Enrich → Act → Notify → Verify</span>
      </div>
      <div className="flex items-center justify-between gap-0 overflow-x-auto pb-2">
        {PIPELINE_STEPS.map((step, idx) => (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center min-w-[90px]">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: step.gradient }}>
                <step.icon size={20} className="text-white" />
              </div>
              <div className="mt-2 text-center">
                <span className="text-[10px] font-mono font-bold block" style={{ color: D.text3 }}>{step.num}</span>
                <p className="text-xs font-semibold" style={{ color: D.text }}>{step.label}</p>
                <p className="text-[10px]" style={{ color: D.text2 }}>{step.sub}</p>
              </div>
            </div>
            {idx < PIPELINE_STEPS.length - 1 && (
              <div className="flex items-center mx-1 -mt-6">
                <ArrowRight size={16} style={{ color: D.text3 }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════

export default function AutomationDashboard() {
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [expandedExecId, setExpandedExecId] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const selectedOrgId = useAuthStore((s) => s.selectedOrgId);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const qc = useQueryClient();

  // ── Org context (for hero banner) ──
  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => { const { data } = await api.get('/organizations?limit=50'); return data; },
    staleTime: 300000,
    enabled: user?.role === 'ADMIN',
  });
  const orgsList: { id: string; name: string; environment: string }[] = orgsData?.data || [];

  const selectedOrg = useMemo(() => {
    if (!selectedOrgId || !orgsList.length) return null;
    return orgsList.find((o) => o.id === selectedOrgId) || null;
  }, [selectedOrgId, orgsList]);

  const heroOrgName = selectedOrg?.name || (selectedOrgId ? 'Organization' : null);
  const heroEnv = selectedOrg?.environment || null;
  const isGlobalView = !selectedOrgId && user?.role === 'ADMIN';

  // ── Data hooks ──
  const { data: status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = usePipelineStatus();
  const { data: actions, isLoading: actionsLoading } = usePipelineActions();
  const { data: notifications, isLoading: notifsLoading } = usePipelineNotifications();
  const { data: execData, isLoading: execsLoading } = usePipelineExecutions(50);

  const pipelineStatus = status as PipelineStatusData | undefined;
  const actionsList = (actions || []) as RemediationAction[];
  const notifsList = (notifications || []) as NotificationRule[];
  const executions = (execData?.executions || []) as PipelineExecution[];
  const totalExecs = execData?.total || 0;
  const pipelineApiUnavailable = Boolean(statusError);

  // ── Mutations ──
  const togglePipeline = useTogglePipeline();
  const toggleAction = useToggleAction();
  const toggleNotification = useToggleNotification();

  // ── Socket.IO: real-time execution updates ──
  useEffect(() => {
    const unsub = onEvent<PipelineExecution>('pipeline:execution', (exec) => {
      toast.success(`Pipeline: ${exec.alertName} → ${exec.matchedAction || 'notify-only'}`, { duration: 4000 });
      qc.invalidateQueries({ queryKey: ['agent-pipeline'] });
    });
    return unsub;
  }, [qc]);

  // ── Filtered executions ──
  const filteredExecs = useMemo(() => {
    return executions.filter((exec) => {
      if (statusFilter === 'success' && exec.actionResult !== true && !exec.matchedAction) return false;
      if (statusFilter === 'failed' && exec.actionResult !== false && !exec.error) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return exec.alertName.toLowerCase().includes(q) ||
               (exec.severity || '').toLowerCase().includes(q) ||
               (exec.matchedAction || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [executions, statusFilter, searchQuery]);

  return (
    <div className="animate-fade-in relative -m-6 p-6 min-h-screen"
      style={{ background: '#F8FAFC' }}>
      {/* ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[120px] opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.20) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
      </div>
      <div className="relative space-y-0">
      {/* ══ HERO BANNER ══ */}
      <HeroBanner
        pipelineEnabled={pipelineStatus?.enabled ?? false}
        canManage={canManage}
        onToggle={() => {
          if (!pipelineStatus) return;
          togglePipeline.mutate(!pipelineStatus.enabled, {
            onSuccess: () => toast.success(pipelineStatus.enabled ? 'Pipeline disabled' : 'Pipeline enabled'),
            onError: () => toast.error('Failed to toggle pipeline'),
          });
        }}
        toggling={togglePipeline.isPending}
        uptime={pipelineStatus?.uptime ?? 0}
        loading={statusLoading}
        orgName={heroOrgName}
        orgEnv={heroEnv}
        isGlobalView={isGlobalView}
      />
      <div className="h-0.5 -mt-5 mb-4" style={{ background: 'linear-gradient(90deg, #7C3AED, #8B5CF6, #A78BFA, transparent)' }} />

      {pipelineApiUnavailable && (
        <div className="mb-4 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
          style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(217,119,6,0.12)' }}>
              <AlertTriangle size={16} style={{ color: '#D97706' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: D.text }}>Pipeline API not configured</p>
              <p className="text-xs mt-0.5" style={{ color: D.text2 }}>
                Runbook automation is available in the UI, but the backend agent endpoints are not responding yet.
              </p>
            </div>
          </div>
          <button onClick={() => refetchStatus()} className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }}>
            <RefreshCw size={14} className="inline mr-1.5" /> Retry
          </button>
        </div>
      )}

      {/* ══ MAIN TABS ══ */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { id: 'overview' as MainTab, label: 'Overview', icon: Gauge },
          { id: 'executions' as MainTab, label: 'Execution History', icon: History, count: totalExecs },
          ...(canManage ? [{ id: 'config' as MainTab, label: 'Configuration', icon: Settings }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={
              activeTab === tab.id
                ? { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }
                : { background: 'transparent', color: D.text2, border: `1px solid ${D.border}` }
            }
            onMouseEnter={(e) => { if (activeTab !== tab.id) { e.currentTarget.style.color = D.text; e.currentTarget.style.background = D.surface; } }}
            onMouseLeave={(e) => { if (activeTab !== tab.id) { e.currentTarget.style.color = D.text2; e.currentTarget.style.background = 'transparent'; } }}
          >
            <tab.icon size={15} />
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: D.surface2, color: D.text2 }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════ OVERVIEW TAB ══════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Stats grid */}
          {statusLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)}
            </div>
          ) : pipelineStatus && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Executions', value: pipelineStatus.totalExecutions,         icon: Zap,          iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1', accent: 'rgba(99,102,241,0.20)' },
                { label: 'Successful',        value: pipelineStatus.successfulExecutions,    icon: CheckCircle2, iconBg: 'rgba(5,150,105,0.12)',  iconColor: '#059669', accent: 'rgba(5,150,105,0.20)'  },
                { label: 'Failed',            value: pipelineStatus.failedExecutions,        icon: XCircle,      iconBg: 'rgba(220,38,38,0.12)',  iconColor: '#DC2626', accent: 'rgba(220,38,38,0.20)'   },
                { label: 'Success Rate',      value: `${pipelineStatus.successRate}%`,       icon: Target,       iconBg: 'rgba(99,102,241,0.12)', iconColor: '#818cf8', accent: 'rgba(99,102,241,0.20)' },
                { label: 'Pipeline Uptime',   value: formatUptime(pipelineStatus.uptime),   icon: Timer,        iconBg: 'rgba(217,119,6,0.12)',  iconColor: '#D97706', accent: 'rgba(217,119,6,0.20)'  },
                { label: 'Last Execution',    value: relativeTime(pipelineStatus.lastExecutionAt), icon: Clock, iconBg: 'rgba(99,102,241,0.10)',  iconColor: '#818cf8', accent: 'rgba(99,102,241,0.20)'  },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl p-4"
                  style={{ background: D.surface, border: `1px solid ${stat.accent}`, boxShadow: D.shadow, backdropFilter: 'blur(12px)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: stat.iconBg }}>
                    <stat.icon size={16} style={{ color: stat.iconColor }} />
                  </div>
                  <p className="text-2xl font-display font-bold tracking-tight" style={{ color: D.text }}>{stat.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: D.text2 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Remediation Actions Grid */}
          <div className="rounded-2xl" style={{ background: D.surface, border: `1px solid ${D.border}`, backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${D.border}` }}>
              <Wrench size={15} style={{ color: '#6366f1' }} />
              <h3 className="text-sm font-display font-bold" style={{ color: D.text }}>Remediation Actions</h3>
              <span className="text-[10px] font-mono ml-auto" style={{ color: D.text3 }}>{actionsList.length} actions configured</span>
            </div>
            {actionsLoading ? (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {actionsList.map((action) => {
                  const cat = CATEGORY_COLORS[action.category] || CATEGORY_COLORS.Infrastructure;
                  const CatIcon = CATEGORY_ICONS[action.category] || Wrench;
                  return (
                    <div key={action.id} className="rounded-xl p-4 transition-all"
                      style={{
                        background: action.enabled ? D.surface2 : D.surface3,
                        border: `1px solid ${D.border}`,
                        opacity: action.enabled ? 1 : 0.55,
                      }}>
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cat.iconBg }}>
                          <CatIcon size={14} style={{ color: cat.iconColor }} />
                        </div>
                        <ToggleSwitch
                          enabled={action.enabled}
                          disabled={!canManage || toggleAction.isPending}
                          size="sm"
                          onToggle={() => {
                            toggleAction.mutate({ id: action.id, enabled: !action.enabled }, {
                              onSuccess: () => toast.success(`${action.name} ${action.enabled ? 'disabled' : 'enabled'}`),
                              onError: () => toast.error('Toggle failed'),
                            });
                          }}
                        />
                      </div>
                      <h4 className="text-sm font-semibold mb-1" style={{ color: D.text }}>{action.name}</h4>
                      <p className="text-[11px] leading-relaxed mb-3 line-clamp-2" style={{ color: D.text2 }}>{action.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md uppercase"
                          style={{ background: cat.badgeBg, color: cat.badgeColor, border: `1px solid ${cat.badgeBorder}` }}>
                          {action.category}
                        </span>
                        {action.targetSeverity.map((s) => {
                          const sv = SEVERITY_BADGE[s] || SEVERITY_BADGE.INFO;
                          return (
                            <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: sv.bg, color: sv.color }}>
                              {s}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-2.5 text-[10px]" style={{ color: D.text2 }}>
                        <span className="inline-flex items-center gap-1"><Terminal size={10} />{action.commandCount} cmd{action.commandCount !== 1 ? 's' : ''}</span>
                        {action.hasVerification && (
                          <span className="inline-flex items-center gap-1" style={{ color: '#059669' }}>
                            <CheckCircle2 size={10} />Verified
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notification Rules */}
          <div className="rounded-2xl" style={{ background: D.surface, border: `1px solid ${D.border}`, backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${D.border}` }}>
              <Bell size={15} style={{ color: '#6366f1' }} />
              <h3 className="text-sm font-display font-bold" style={{ color: D.text }}>Notification Rules</h3>
              <span className="text-[10px] font-mono ml-auto" style={{ color: D.text3 }}>{notifsList.length} rules</span>
            </div>
            {notifsLoading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: D.surface2 }} />
                ))}
              </div>
            ) : (
              <div>
                {notifsList.map((rule, idx) => (
                  <div key={rule.id} className="px-5 py-3.5 flex items-center gap-4"
                    style={{ borderBottom: idx < notifsList.length - 1 ? `1px solid ${D.border}` : 'none' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: rule.channel === 'slack' ? 'rgba(99,102,241,0.12)' : 'rgba(5,150,105,0.12)' }}>
                      {rule.channel === 'slack'
                        ? <MessageSquare size={14} style={{ color: '#818cf8' }} />
                        : <Bell size={14} style={{ color: '#059669' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium" style={{ color: D.text }}>{rule.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono uppercase" style={{ color: D.text2 }}>{rule.channel}</span>
                        {rule.severity?.map((s) => {
                          const sv = SEVERITY_BADGE[s] || SEVERITY_BADGE.INFO;
                          return (
                            <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: sv.bg, color: sv.color }}>
                              {s}
                            </span>
                          );
                        })}
                        {rule.event && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>
                            {rule.event}
                          </span>
                        )}
                      </div>
                    </div>
                    <ToggleSwitch
                      enabled={rule.enabled}
                      disabled={!canManage || toggleNotification.isPending}
                      size="sm"
                      onToggle={() => {
                        toggleNotification.mutate({ id: rule.id, enabled: !rule.enabled }, {
                          onSuccess: () => toast.success(`${rule.name} ${rule.enabled ? 'disabled' : 'enabled'}`),
                          onError: () => toast.error('Toggle failed'),
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline + Integration Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <PipelineFlow />
            </div>
            <div className="rounded-2xl p-5" style={{ background: D.surface, border: `1px solid ${D.border}`, backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Link2 size={15} style={{ color: '#6366f1' }} />
                <h3 className="text-sm font-display font-bold" style={{ color: D.text }}>Integration Status</h3>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'AI Agent Pipeline', status: pipelineStatus?.enabled ? 'Active' : 'Disabled', color: pipelineStatus?.enabled ? '#059669' : '#D97706', dot: pipelineStatus?.enabled ? '#059669' : '#D97706' },
                  { name: 'Argus API',  status: 'Ready', color: '#059669', dot: '#059669' },
                  { name: 'Kubernetes', status: 'Ready', color: '#059669', dot: '#059669' },
                  { name: 'Prometheus', status: 'Ready', color: '#059669', dot: '#059669' },
                  { name: 'Grafana',    status: 'Ready', color: '#059669', dot: '#059669' },
                  { name: 'Slack',      status: 'Ready', color: '#059669', dot: '#059669' },
                ].map((int) => (
                  <div key={int.name} className="flex items-center justify-between py-2 px-3 rounded-lg"
                    style={{ background: D.surface2, border: `1px solid ${D.border}` }}>
                    <span className="text-xs font-medium" style={{ color: D.text }}>{int.name}</span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium" style={{ color: int.color }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: int.dot }} />
                      {int.status}
                    </span>
                  </div>
                ))}
                <div className="pt-2" style={{ borderTop: `1px solid ${D.border}` }}>
                  <span className="text-[10px] font-mono" style={{ color: D.text4 }}>Uptime: {formatUptime(pipelineStatus?.uptime ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ EXECUTIONS TAB ══════════ */}
      {activeTab === 'executions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap"
            style={{ background: D.surface, border: `1px solid ${D.border}`, backdropFilter: 'blur(12px)' }}>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: D.text3 }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by alert name, severity, action..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2"
                style={{ background: D.surface2, color: D.text, border: `1px solid ${D.border}` }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'failed')}
              className="text-xs rounded-lg px-2.5 py-2 focus:outline-none"
              style={{ background: D.surface2, color: D.text2, border: `1px solid ${D.border}` }}
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <span className="text-[10px] font-mono" style={{ color: D.text3 }}>{filteredExecs.length} of {totalExecs} executions</span>
          </div>

          {/* Execution list */}
          <div className="rounded-2xl overflow-hidden" style={{ background: D.surface, border: `1px solid ${D.border}`, backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${D.border}` }}>
              <GitBranch size={15} style={{ color: '#6366f1' }} />
              <h3 className="text-sm font-display font-bold" style={{ color: D.text }}>Pipeline Executions</h3>
              <span className="text-[10px] font-mono ml-auto" style={{ color: D.text3 }}>Live feed — 15s refresh</span>
            </div>

            {execsLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: D.surface2 }} />
                ))}
              </div>
            ) : filteredExecs.length === 0 ? (
              <div className="text-center py-16">
                <Bot size={40} className="mx-auto mb-3" style={{ color: D.text4 }} />
                <p className="text-sm font-medium mb-1" style={{ color: D.text2 }}>
                  {executions.length === 0 ? 'No pipeline executions yet' : 'No executions match your filters'}
                </p>
                <p className="text-xs" style={{ color: D.text3 }}>
                  {executions.length === 0 ? 'Executions will appear here as alerts trigger the pipeline' : 'Try adjusting your search or filter'}
                </p>
              </div>
            ) : (
              <div>
                {filteredExecs.map((exec, idx) => {
                  const isExpanded = expandedExecId === exec.id;
                  const resultBg    = exec.error || exec.actionResult === false ? 'rgba(220,38,38,0.10)' :
                                      exec.actionResult === true                ? 'rgba(5,150,105,0.10)' :
                                                                                  'rgba(99,102,241,0.10)';
                  const resultBorder = exec.error || exec.actionResult === false ? 'rgba(220,38,38,0.25)' :
                                       exec.actionResult === true                ? 'rgba(5,150,105,0.25)' :
                                                                                   'rgba(99,102,241,0.20)';
                  const resultIcon = exec.error || exec.actionResult === false
                    ? <XCircle size={18} style={{ color: '#DC2626' }} />
                    : exec.actionResult === true
                    ? <CheckCircle2 size={18} style={{ color: '#059669' }} />
                    : <Bell size={18} style={{ color: '#818cf8' }} />;

                  return (
                    <div key={exec.id} style={{ borderBottom: idx < filteredExecs.length - 1 ? `1px solid ${D.border}` : 'none' }}>
                      <button
                        onClick={() => setExpandedExecId(isExpanded ? null : exec.id)}
                        className="w-full text-left px-5 py-4 transition-all group"
                        onMouseEnter={(e) => { e.currentTarget.style.background = D.surface2; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
                            style={{ background: resultBg, border: `2px solid ${resultBorder}` }}>
                            {resultIcon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold" style={{ color: D.text }}>{exec.alertName}</span>
                              <SeverityBadge severity={exec.severity} />
                              <ExecutionStatusBadge actionResult={exec.actionResult} error={exec.error} />
                            </div>
                            <div className="flex items-center gap-3 flex-wrap text-[11px] font-mono" style={{ color: D.text2 }}>
                              {exec.orgName && (
                                <span className="inline-flex items-center gap-1">
                                  <Building2 size={10} style={{ color: '#818cf8' }} />{exec.orgName}{exec.orgEnvironment ? ` (${exec.orgEnvironment})` : ''}
                                </span>
                              )}
                              {exec.matchedAction && (
                                <span className="inline-flex items-center gap-1">
                                  <Wrench size={10} style={{ color: '#6366f1' }} />{exec.matchedAction}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1">
                                <Timer size={10} style={{ color: D.text3 }} />{formatDuration(exec.duration)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Hash size={10} style={{ color: D.text3 }} />{exec.steps.length} stages
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right hidden sm:block">
                            <span className="text-[11px] font-mono" style={{ color: D.text2 }}>{relativeTime(exec.timestamp)}</span>
                            <div className="mt-1">
                              {isExpanded
                                ? <ChevronUp size={14} className="ml-auto" style={{ color: D.text3 }} />
                                : <ChevronDown size={14} className="ml-auto" style={{ color: D.text3 }} />}
                            </div>
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-5" style={{ borderTop: `1px solid ${D.border}`, background: D.surface3 }}>
                          <div className="flex items-center gap-2 py-3">
                            <span className="text-[10px] font-mono" style={{ color: D.text2 }}>
                              Execution ID: <span style={{ color: '#6366f1' }}>{exec.id}</span>
                            </span>
                            <button onClick={() => { navigator.clipboard.writeText(exec.id); toast.success('Copied'); }}
                              className="p-1 rounded" style={{ color: D.text3 }}>
                              <Copy size={10} />
                            </button>
                          </div>
                          <StepTimeline steps={exec.steps} />
                          {exec.error && (
                            <div className="mt-3 p-3 rounded-lg"
                              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.20)' }}>
                              <p className="text-xs font-medium" style={{ color: '#DC2626' }}>Error: {exec.error}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ CONFIG TAB (admin/manager only) ══════════ */}
      {activeTab === 'config' && canManage && (
        <div className="space-y-5">
          {/* Actions detail */}
          <div className="rounded-2xl" style={{ background: D.surface, border: `1px solid ${D.border}`, backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${D.border}` }}>
              <Wrench size={15} style={{ color: '#6366f1' }} />
              <h3 className="text-sm font-display font-bold" style={{ color: D.text }}>Remediation Actions Reference</h3>
            </div>
            <div>
              {actionsList.map((action, idx) => {
                const cat = CATEGORY_COLORS[action.category] || CATEGORY_COLORS.Infrastructure;
                return (
                  <div key={action.id} className="px-5 py-4"
                    style={{ borderBottom: idx < actionsList.length - 1 ? `1px solid ${D.border}` : 'none' }}>
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5" style={{ background: cat.iconBg }}>
                        {(() => { const I = CATEGORY_ICONS[action.category] || Wrench; return <I size={14} style={{ color: cat.iconColor }} />; })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold" style={{ color: D.text }}>{action.name}</h4>
                          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md uppercase"
                            style={{ background: cat.badgeBg, color: cat.badgeColor, border: `1px solid ${cat.badgeBorder}` }}>
                            {action.category}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                            style={action.enabled
                              ? { background: 'rgba(5,150,105,0.10)', color: '#059669' }
                              : { background: D.surface2, color: D.text3 }}>
                            {action.enabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </div>
                        <p className="text-xs mb-2" style={{ color: D.text2 }}>{action.description}</p>
                        <div className="flex items-center gap-4 flex-wrap text-[10px] font-mono">
                          <span style={{ color: D.text2 }}>ID: <span style={{ color: '#6366f1' }}>{action.id}</span></span>
                          <span style={{ color: D.text2 }}>Commands: <span style={{ color: D.text }}>{action.commandCount}</span></span>
                          <span style={{ color: D.text2 }}>Verification: <span style={{ color: action.hasVerification ? '#059669' : D.text3 }}>{action.hasVerification ? 'Yes' : 'No'}</span></span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] mr-1" style={{ color: D.text2 }}>Matches:</span>
                          {action.matchAlerts.map((alert) => (
                            <span key={alert} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: D.surface2, color: D.text2, border: `1px solid ${D.border}` }}>{alert}</span>
                          ))}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] mr-1" style={{ color: D.text2 }}>Severity:</span>
                          {action.targetSeverity.map((s) => {
                            const sv = SEVERITY_BADGE[s] || SEVERITY_BADGE.INFO;
                            return (
                              <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                                style={{ background: sv.bg, color: sv.color, border: `1px solid ${sv.border}` }}>{s}</span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notification rules detail */}
          <div className="rounded-2xl" style={{ background: D.surface, border: `1px solid ${D.border}`, backdropFilter: 'blur(12px)' }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${D.border}` }}>
              <Bell size={15} style={{ color: '#6366f1' }} />
              <h3 className="text-sm font-display font-bold" style={{ color: D.text }}>Notification Rules Reference</h3>
            </div>
            <div>
              {notifsList.map((rule, idx) => (
                <div key={rule.id} className="px-5 py-4 flex items-center gap-4"
                  style={{ borderBottom: idx < notifsList.length - 1 ? `1px solid ${D.border}` : 'none' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: rule.channel === 'slack' ? 'rgba(99,102,241,0.12)' : 'rgba(5,150,105,0.12)' }}>
                    {rule.channel === 'slack'
                      ? <MessageSquare size={14} style={{ color: '#818cf8' }} />
                      : <Bell size={14} style={{ color: '#059669' }} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium" style={{ color: D.text }}>{rule.name}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-mono mt-0.5" style={{ color: D.text2 }}>
                      <span>ID: <span style={{ color: '#6366f1' }}>{rule.id}</span></span>
                      <span>Channel: <span style={{ color: D.text }}>{rule.channel}</span></span>
                      {rule.severity && <span>Severity: {rule.severity.join(', ')}</span>}
                      {rule.event && <span>Event: <span style={{ color: '#6366f1' }}>{rule.event}</span></span>}
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={rule.enabled
                      ? { background: 'rgba(5,150,105,0.10)', color: '#059669' }
                      : { background: D.surface2, color: D.text3 }}>
                    {rule.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* API Endpoints */}
          <div className="rounded-2xl p-5" style={{ background: D.surface, border: `1px solid ${D.border}`, backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={15} style={{ color: '#6366f1' }} />
              <h3 className="text-sm font-display font-bold" style={{ color: D.text }}>Agent Pipeline API Endpoints</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { method: 'GET',  path: '/api/v1/agent/status',                  desc: 'Pipeline status + config' },
                { method: 'POST', path: '/api/v1/agent/toggle',                  desc: 'Enable/disable pipeline' },
                { method: 'GET',  path: '/api/v1/agent/actions',                 desc: 'List remediation actions' },
                { method: 'POST', path: '/api/v1/agent/actions/:id/toggle',      desc: 'Toggle action' },
                { method: 'GET',  path: '/api/v1/agent/notifications',           desc: 'List notification rules' },
                { method: 'POST', path: '/api/v1/agent/notifications/:id/toggle',desc: 'Toggle notification' },
                { method: 'GET',  path: '/api/v1/agent/executions',              desc: 'Execution log' },
                { method: 'GET',  path: '/api/v1/agent/executions/:id',          desc: 'Execution detail' },
              ].map((ep) => (
                <div key={ep.path} className="p-3 rounded-xl" style={{ background: D.surface2, border: `1px solid ${D.border}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={ep.method === 'GET'
                        ? { background: 'rgba(5,150,105,0.12)', color: '#059669' }
                        : { background: 'rgba(217,119,6,0.12)', color: '#D97706' }}>
                      {ep.method}
                    </span>
                    <code className="text-[10px] font-mono" style={{ color: D.text }}>{ep.path}</code>
                  </div>
                  <p className="text-[10px]" style={{ color: D.text2 }}>{ep.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[10px] font-mono" style={{ color: D.text4 }}>
          Powered by AI Agent Pipeline — {actionsList.length} remediation actions, {notifsList.length} notification rules, 13 client organizations
        </p>
      </div>
      </div>{/* /relative space-y-0 */}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Hero Banner (extracted for reuse in error state)
// ══════════════════════════════════════════════════════════════════════════════

function HeroBanner({ pipelineEnabled, canManage, onToggle, toggling, uptime, loading, orgName, orgEnv, isGlobalView }: {
  pipelineEnabled: boolean;
  canManage: boolean;
  onToggle: () => void;
  toggling: boolean;
  uptime: number;
  loading?: boolean;
  orgName?: string | null;
  orgEnv?: string | null;
  isGlobalView?: boolean;
}) {
  const ENV_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    PROD: { bg: 'rgba(5,150,105,0.12)',   color: '#059669', border: 'rgba(5,150,105,0.25)'   },
    DR:   { bg: 'rgba(217,119,6,0.12)',   color: '#D97706', border: 'rgba(217,119,6,0.25)'   },
    UAT:  { bg: 'rgba(99,102,241,0.10)',  color: '#818cf8', border: 'rgba(99,102,241,0.20)'  },
    DEV:  { bg: 'rgba(99,102,241,0.12)',  color: '#6366f1', border: 'rgba(99,102,241,0.25)'  },
  };

  return (
    <div className="relative rounded-2xl overflow-hidden mb-5"
      style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #7C3AED, #8B5CF6, #A78BFA, transparent)' }} />
      {/* Dot-grid texture */}
      <div className="absolute inset-0 opacity-[0.15]"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      {/* Ambient glow blobs */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4"
        style={{ background: 'rgba(124,58,237,0.35)', filter: 'blur(70px)' }} />
      <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full translate-y-1/2 -translate-x-1/4"
        style={{ background: 'rgba(139,92,246,0.25)', filter: 'blur(60px)' }} />
      <div className="absolute top-1/2 left-1/2 w-40 h-40 rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'rgba(124,58,237,0.15)', filter: 'blur(80px)' }} />
      <div className="relative px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Zap size={18} style={{ color: '#A78BFA' }} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Runbook Automation</h1>
                  {isGlobalView && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono"
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                      <Globe size={10} /> All Organizations
                    </span>
                  )}
                  {orgName && !isGlobalView && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#A78BFA' }}>
                      <Building2 size={10} /> {orgName}
                    </span>
                  )}
                  {orgEnv && !isGlobalView && (() => {
                    const ec = ENV_COLORS[orgEnv] || ENV_COLORS.DEV;
                    return (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase"
                        style={{ background: 'rgba(255,255,255,0.1)', color: '#A78BFA', border: '1px solid rgba(255,255,255,0.15)' }}>
                        {orgEnv}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Detect → Triage → Enrich → Act → Notify → Verify</p>
              </div>
            </div>
          </div>
          {/* Master toggle */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
            ) : (
              <button
                onClick={onToggle}
                disabled={!canManage || toggling}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={pipelineEnabled
                  ? { background: 'rgba(167,139,250,0.2)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.35)' }
                  : { background: 'rgba(252,165,165,0.2)', color: '#fca5a5', border: '1px solid rgba(252,165,165,0.35)' }}
              >
                {toggling ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                {pipelineEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            )}
          </div>
        </div>

        {/* Feature pills */}
        <div className="mt-4 ml-[50px] flex items-center gap-3 flex-wrap">
          {[
            { icon: Zap,    label: 'Auto-Remediation', sub: 'SSH-based actions',       color: '#fde68a' },
            { icon: Brain,  label: 'Smart Triage',     sub: 'Alert pattern matching',   color: '#A78BFA' },
            { icon: Target, label: 'Verify',           sub: 'Post-action health check', color: '#6ee7b7' },
          ].map((feat) => (
            <div key={feat.label} className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <feat.icon size={16} style={{ color: feat.color }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#ffffff' }}>{feat.label}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{feat.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div className="mt-4 ml-[50px] flex items-center gap-2 text-[10px] font-mono">
          <span className="inline-flex items-center gap-1.5" style={{ color: pipelineEnabled ? '#A78BFA' : '#fca5a5' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: pipelineEnabled ? '#A78BFA' : '#fca5a5' }} />
            Pipeline {pipelineEnabled ? 'Active' : 'Disabled'}
          </span>
          <span className="mx-1" style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Uptime: {formatUptime(uptime)}</span>
          {!canManage && (
            <>
              <span className="mx-1" style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <span className="inline-flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <Lock size={9} />Admin/Manager required to toggle
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
