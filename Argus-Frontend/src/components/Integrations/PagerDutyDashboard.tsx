import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink, Users,
  Zap, Shield, Bell, Settings, Activity, ChevronRight,
  Server, GitBranch, RefreshCw, Loader2, XCircle,
  Phone, Mail, ArrowRight, Eye, Link2, Lock,
  ToggleLeft, ToggleRight, Copy, Trash2, Plus,
  Building2, Globe, User, List, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import {
  usePdStatus, usePdOverview, usePdIncidents, usePdOnCalls,
  usePdServices, usePdEscalationPolicies, usePdStats,
  useConnectPagerDuty, useDisconnectPagerDuty, useValidatePdKey,
} from '../../hooks/usePagerDuty';

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

type Tab = 'overview' | 'incidents' | 'services' | 'oncall' | 'policies' | 'settings';

interface PdIncident {
  id: string;
  incidentNumber: number;
  title: string;
  status: 'triggered' | 'acknowledged' | 'resolved';
  urgency: 'high' | 'low';
  priority?: string | null;
  service?: { id: string; name: string } | null;
  assignees: { id: string; name: string; htmlUrl?: string }[];
  createdAt: string;
  resolvedAt?: string | null;
  htmlUrl: string;
}

interface PdService {
  id: string;
  name: string;
  description: string;
  status: string;
  htmlUrl: string;
  escalationPolicy?: { id: string; name: string } | null;
  integrationsCount: number;
}

interface PdOnCallLayer {
  level: number;
  user: { id: string; name: string; htmlUrl?: string };
  schedule?: { id: string; name: string } | null;
  start?: string;
  end?: string;
}

interface PdOnCallGroup {
  escalationPolicy: { id: string; name: string };
  layers: PdOnCallLayer[];
}

// ══════════════════════════════════════════════════════════════
// Helpers & Styles
// ══════════════════════════════════════════════════════════════

const glassCard: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.15)',
  backdropFilter: 'blur(12px)',
  borderRadius: '1rem',
};

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.1)',
  color: '#0f172a',
  borderRadius: '0.75rem',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  fontFamily: 'monospace',
};

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  triggered:    { bg: 'rgba(239,68,68,0.12)', text: '#FCA5A5', dot: '#EF4444', label: 'Triggered' },
  acknowledged: { bg: 'rgba(217,119,6,0.12)', text: '#FCD34D', dot: '#D97706', label: 'Acknowledged' },
  resolved:     { bg: 'rgba(16,185,129,0.12)', text: '#6EE7B7', dot: '#10B981', label: 'Resolved' },
};

const SERVICE_STATUS_STYLE: Record<string, { color: string; dot: string; label: string }> = {
  active:       { color: '#059669', dot: '#10B981', label: 'Active' },
  warning:      { color: '#D97706', dot: '#D97706', label: 'Warning' },
  critical:     { color: '#DC2626', dot: '#EF4444', label: 'Critical' },
  maintenance:  { color: '#6366f1', dot: '#6366f1', label: 'Maintenance' },
  disabled:     { color: '#94a3b8', dot: '#94a3b8', label: 'Disabled' },
};

// ══════════════════════════════════════════════════════════════
// Setup Wizard (not connected)
// ══════════════════════════════════════════════════════════════

function SetupWizard({ onConnect }: { onConnect: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [routingKey, setRoutingKey] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [autoCreate, setAutoCreate] = useState(true);
  const [step, setStep] = useState<'form' | 'validating' | 'success'>('form');
  const [validationResult, setValidationResult] = useState<{ name?: string; email?: string } | null>(null);

  const validateKey = useValidatePdKey();
  const connectPd = useConnectPagerDuty();

  const handleValidate = async () => {
    if (!apiKey.trim()) { toast.error('Enter your PagerDuty API key'); return; }
    setStep('validating');
    validateKey.mutate(apiKey.trim(), {
      onSuccess: (data) => {
        if (data.valid) {
          setValidationResult(data.account);
          setStep('success');
        } else {
          toast.error(data.error || 'Invalid API key');
          setStep('form');
        }
      },
      onError: () => { toast.error('Validation failed -- check your key'); setStep('form'); },
    });
  };

  const handleConnect = () => {
    connectPd.mutate({ apiKey: apiKey.trim(), routingKey: routingKey.trim(), autoSync, autoCreateIncidents: autoCreate }, {
      onSuccess: () => { toast.success('PagerDuty connected!'); onConnect(); },
      onError: () => toast.error('Connection failed'),
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 8px 24px rgba(99,102,241,0.2)' }}>
          <Zap size={28} style={{ color: '#fff' }} />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2" style={{ color: '#0f172a' }}>Connect PagerDuty</h1>
        <p className="text-sm max-w-sm mx-auto" style={{ color: '#64748b' }}>Enter your PagerDuty API key to sync services, incidents, and on-call schedules with Argus.</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {['Get API Key', 'Validate', 'Configure', 'Connect'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={i === 0 || (i === 1 && step !== 'form') || (i === 2 && step === 'success') ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff' } : { background: 'rgba(99,102,241,0.06)', color: '#94a3b8' }}>
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-px" style={{ background: 'rgba(99,102,241,0.1)' }} />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ ...glassCard, borderColor: 'rgba(99,102,241,0.1)' }}>
        {/* Step 1 + 2: Enter and validate key */}
        <div className="p-6" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Lock size={14} style={{ color: '#64748b' }} /> API Key (REST API v2)
          </h3>
          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setStep('form'); setValidationResult(null); }}
              placeholder="u+xxxxxxxxxxxxxxxxxxxx"
              style={{ ...inputStyle, paddingRight: '8rem' }}
            />
            <button
              onClick={handleValidate}
              disabled={!apiKey.trim() || step === 'validating'}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={step === 'success' ? { background: 'rgba(16,185,129,0.15)', color: '#059669' } : { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff' }}
            >
              {step === 'validating' ? <Loader2 size={12} className="animate-spin" /> : step === 'success' ? <span className="flex items-center gap-1"><CheckCircle2 size={12} />Valid</span> : 'Validate'}
            </button>
          </div>
          {validationResult && (
            <div className="mt-3 p-3 rounded-lg flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <User size={14} style={{ color: '#059669' }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#059669' }}>{validationResult.name}</p>
                <p className="text-[10px]" style={{ color: '#059669' }}>{validationResult.email}</p>
              </div>
              <CheckCircle2 size={16} style={{ color: '#10B981' }} className="ml-auto" />
            </div>
          )}
          <p className="text-[11px] mt-2" style={{ color: '#94a3b8' }}>
            Get your key at <span className="font-mono" style={{ color: '#64748b' }}>app.pagerduty.com -- My Profile -- API Access -- Create API User Token</span>
          </p>
        </div>

        {/* Step 3: Routing Key */}
        <div className="p-6" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
          <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Zap size={14} style={{ color: '#64748b' }} /> Events API Routing Key <span className="text-[10px] font-normal ml-1" style={{ color: '#94a3b8' }}>(for sending alerts to PagerDuty)</span>
          </h3>
          <input
            type="text"
            value={routingKey}
            onChange={(e) => setRoutingKey(e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="mt-2"
            style={inputStyle}
          />
          <p className="text-[11px] mt-2" style={{ color: '#94a3b8' }}>
            Get this from <span className="font-mono" style={{ color: '#64748b' }}>Services -- Integrations -- Events API v2 -- Routing Key</span>
          </p>
        </div>

        {/* Step 4: Options */}
        <div className="p-6 space-y-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
          <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Sync Options</h3>
          {[
            { label: 'Auto-sync every 5 minutes', sub: 'Keep incidents, services, and on-call schedules updated', value: autoSync, toggle: setAutoSync },
            { label: 'Auto-create Argus incidents', sub: 'Triggered PagerDuty incidents create Argus incidents automatically', value: autoCreate, toggle: setAutoCreate },
          ].map((opt) => (
            <div key={opt.label} className="flex items-start gap-3">
              <button onClick={() => opt.toggle(!opt.value)} className="shrink-0 w-10 h-6 rounded-full transition-colors mt-0.5" style={{ background: opt.value ? '#6366f1' : '#e2e8f0' }}>
                <span className="block rounded-full shadow-sm transition-transform" style={{ width: 18, height: 18, background: '#ffffff', marginTop: 3, marginLeft: opt.value ? 8 : 3 }} />
              </button>
              <div>
                <p className="text-sm font-medium" style={{ color: '#0f172a' }}>{opt.label}</p>
                <p className="text-[11px]" style={{ color: '#94a3b8' }}>{opt.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Connect button */}
        <div className="p-6" style={{ background: 'rgba(99,102,241,0.03)' }}>
          <button
            onClick={handleConnect}
            disabled={step !== 'success' || connectPd.isPending}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            style={step === 'success' ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', boxShadow: '0 8px 24px rgba(99,102,241,0.2)' } : { background: '#e2e8f0', color: '#94a3b8' }}
          >
            {connectPd.isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {connectPd.isPending ? 'Connecting...' : 'Connect PagerDuty'}
          </button>
          <p className="text-center text-[11px] mt-2" style={{ color: '#94a3b8' }}>Validate your API key above before connecting</p>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        {[
          { icon: Zap, title: 'Instant Sync', desc: 'Services, incidents, and on-call pulled immediately', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
          { icon: Bell, title: 'Live Alerts', desc: 'Argus sends alerts to PagerDuty via Events API', color: '#DC2626', bg: 'rgba(239,68,68,0.1)' },
          { icon: CheckCircle2, title: 'Bidirectional', desc: 'Resolve in PD -- auto-resolve in Argus', color: '#059669', bg: 'rgba(16,185,129,0.1)' },
        ].map((f) => (
          <div key={f.title} className="p-4 rounded-xl text-center" style={glassCard}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: f.bg }}>
              <f.icon size={18} style={{ color: f.color }} />
            </div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#0f172a' }}>{f.title}</p>
            <p className="text-[10px] leading-relaxed" style={{ color: '#94a3b8' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Stat Card
// ══════════════════════════════════════════════════════════════

function StatCard({ label, value, icon: Icon, color, bg, border, sub }: {
  label: string; value: string | number; icon: React.ElementType;
  color: string; bg: string; border: string; sub?: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ ...glassCard, borderColor: border }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: bg }}>
        <Icon size={17} style={{ color }} />
      </div>
      <p className="text-2xl font-display font-bold tracking-tight" style={{ color: '#0f172a' }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{label}</p>
      {sub && <p className="text-[9px] mt-0.5" style={{ color: '#cbd5e1' }}>{sub}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Incident Row
// ══════════════════════════════════════════════════════════════

function IncidentRow({ incident }: { incident: PdIncident }) {
  const statusStyle = STATUS_STYLE[incident.status] || STATUS_STYLE.triggered;
  return (
    <div className="px-5 py-3.5 transition-all group" onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.03)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 w-2 h-2 rounded-full ring-2 ring-offset-2" style={{ background: statusStyle.dot, borderColor: statusStyle.dot, boxShadow: `0 0 0 2px rgba(255,255,255,0.9), 0 0 0 4px ${statusStyle.bg}`, ...(incident.status === 'triggered' ? { animation: 'pulse 2s infinite' } : {}) }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>#{incident.incidentNumber}</span>
            <a href={incident.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium transition-colors truncate max-w-[380px]" style={{ color: '#0f172a' }} onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')} onMouseLeave={e => (e.currentTarget.style.color = '#0f172a')}>
              {incident.title}
            </a>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono flex-wrap" style={{ color: '#94a3b8' }}>
            {incident.service?.name && (
              <span className="inline-flex items-center gap-1"><Server size={9} />{incident.service.name}</span>
            )}
            {incident.assignees.length > 0 && (
              <span className="inline-flex items-center gap-1"><User size={9} />{incident.assignees[0].name}</span>
            )}
            <span className="inline-flex items-center gap-1"><Clock size={9} />{relativeTime(incident.createdAt)}</span>
            {incident.urgency === 'high' && <span className="font-semibold" style={{ color: '#DC2626' }}>HIGH</span>}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold rounded-md" style={{ background: statusStyle.bg, color: statusStyle.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyle.dot }} />
            {statusStyle.label}
          </span>
          <a href={incident.htmlUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded transition-colors" style={{ color: '#cbd5e1' }} onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Service Card
// ══════════════════════════════════════════════════════════════

function ServiceCard({ service }: { service: PdService }) {
  const statusStyle = SERVICE_STATUS_STYLE[service.status] || SERVICE_STATUS_STYLE.active;
  return (
    <div className="rounded-xl p-4 transition-all" style={glassCard} onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.08)')}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Server size={14} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h4 className="text-sm font-semibold leading-tight" style={{ color: '#0f172a' }}>{service.name}</h4>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold" style={{ color: statusStyle.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyle.dot, ...(service.status === 'critical' ? { animation: 'pulse 2s infinite' } : {}) }} />
          {statusStyle.label}
        </span>
      </div>
      {service.description && <p className="text-[10px] mb-2 line-clamp-1" style={{ color: '#94a3b8' }}>{service.description}</p>}
      <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: '#94a3b8' }}>
        {service.escalationPolicy && <span className="inline-flex items-center gap-1"><Users size={9} />{service.escalationPolicy.name}</span>}
        <span className="inline-flex items-center gap-1"><Link2 size={9} />{service.integrationsCount} integrations</span>
      </div>
      {service.htmlUrl && (
        <a href={service.htmlUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] transition-colors" style={{ color: '#94a3b8' }} onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
          <ExternalLink size={9} /> Open in PagerDuty
        </a>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Dashboard Component
// ══════════════════════════════════════════════════════════════

export default function PagerDutyDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = usePdStatus();
  const isConnected = statusData?.connected === true;

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = usePdOverview();
  const { data: incidents, isLoading: incidentsLoading } = usePdIncidents();
  const { data: services, isLoading: servicesLoading } = usePdServices();
  const { data: onCalls, isLoading: onCallsLoading } = usePdOnCalls();
  const { data: policies, isLoading: policiesLoading } = usePdEscalationPolicies();
  const { data: stats } = usePdStats();

  const disconnectPd = useDisconnectPagerDuty();

  const servicesList = (services || overview?.services || []) as PdService[];
  const incidentsList = ((incidents as any)?.incidents || overview?.activeIncidents || []) as PdIncident[];
  const onCallGroups = (onCalls || overview?.onCalls || []) as PdOnCallGroup[];
  const policiesList = (policies || []) as any[];

  const triggeredCount = incidentsList.filter(i => i.status === 'triggered').length;
  const ackedCount = incidentsList.filter(i => i.status === 'acknowledged').length;

  const TABS = [
    { id: 'overview' as Tab, label: 'Overview', icon: Activity },
    { id: 'incidents' as Tab, label: 'Incidents', icon: AlertTriangle, count: triggeredCount },
    { id: 'services' as Tab, label: 'Services', icon: Server, count: servicesList.length },
    { id: 'oncall' as Tab, label: 'On-Call', icon: Phone, count: onCallGroups.length },
    { id: 'policies' as Tab, label: 'Escalation', icon: GitBranch },
    ...(canManage ? [{ id: 'settings' as Tab, label: 'Settings', icon: Settings }] : []),
  ];

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: '#6366f1' }} />
      </div>
    );
  }

  if (!isConnected) {
    return <SetupWizard onConnect={() => refetchStatus()} />;
  }

  return (
    <div className="animate-fade-in space-y-0">

      {/* ══ HERO BANNER ══ */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Zap size={20} style={{ color: '#a7f3d0' }} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>PagerDuty</h1>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.4)', color: '#a7f3d0' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} /> Connected
                    </span>
                    {statusData?.accountName && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                        <Building2 size={9} /> {statusData.accountName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Incidents -- Services -- On-Call -- Escalation Policies</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => refetchOverview()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              <RefreshCw size={12} className={overviewLoading ? 'animate-spin' : ''} /> Sync Now
            </button>
          </div>

          {/* Stats pills */}
          <div className="mt-4 ml-[52px] flex items-center gap-3 flex-wrap">
            {[
              { icon: AlertTriangle, label: `${triggeredCount} Triggered`, color: '#fca5a5', hide: !triggeredCount },
              { icon: Clock, label: `${ackedCount} Acknowledged`, color: '#fde68a', hide: !ackedCount },
              { icon: Server, label: `${servicesList.length} Services`, color: '#a7f3d0' },
              { icon: Users, label: `${(overview?.users || []).length} Users`, color: '#c4b5fd' },
              { icon: Phone, label: `${onCallGroups.length} On-Call Groups`, color: '#a7f3d0' },
            ].filter(p => !p.hide).map((pill) => (
              <div key={pill.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <pill.icon size={12} style={{ color: pill.color }} />
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{pill.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-0.5 -mt-5 mb-4" style={{ background: 'linear-gradient(90deg, #059669, #34d399, #a7f3d0, transparent)' }} />

      {/* ══ TABS ══ */}
      <div className="flex items-center gap-2 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={activeTab === tab.id ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(217,70,239,0.1))', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' } : { color: '#94a3b8', border: '1px solid rgba(99,102,241,0.06)' }}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={activeTab === tab.id ? { background: 'rgba(99,102,241,0.12)', color: '#6366f1' } : { background: 'rgba(99,102,241,0.06)', color: '#94a3b8' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════ OVERVIEW TAB ══════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Triggered" value={stats?.triggered ?? triggeredCount} icon={AlertTriangle} color="#EF4444" bg="rgba(239,68,68,0.12)" border="rgba(239,68,68,0.2)" sub="Active incidents" />
            <StatCard label="Acknowledged" value={stats?.acknowledged ?? ackedCount} icon={Clock} color="#D97706" bg="rgba(217,119,6,0.12)" border="rgba(217,119,6,0.2)" sub="Being worked" />
            <StatCard label="Resolved (7d)" value={stats?.resolved ?? 0} icon={CheckCircle2} color="#10B981" bg="rgba(16,185,129,0.12)" border="rgba(16,185,129,0.2)" sub="Last 7 days" />
            <StatCard label="Services" value={servicesList.length} icon={Server} color="#6366f1" bg="rgba(99,102,241,0.08)" border="rgba(99,102,241,0.12)" />
            <StatCard label="On-Call Groups" value={onCallGroups.length} icon={Phone} color="#a855f7" bg="rgba(168,85,247,0.06)" border="rgba(217,70,239,0.2)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={glassCard}>
              <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                <AlertTriangle size={14} style={{ color: '#EF4444' }} />
                <h3 className="text-sm font-display font-bold" style={{ color: '#0f172a' }}>Active Incidents</h3>
                <span className="text-[10px] font-mono ml-auto" style={{ color: '#cbd5e1' }}>from PagerDuty -- live</span>
              </div>
              {overviewLoading ? (
                <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(99,102,241,0.04)' }} />)}</div>
              ) : incidentsList.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 size={36} style={{ color: '#10B981' }} className="mx-auto mb-2" />
                  <p className="text-sm" style={{ color: '#94a3b8' }}>No active incidents</p>
                </div>
              ) : (
                <div>{incidentsList.map((inc) => <div key={inc.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}><IncidentRow incident={inc} /></div>)}</div>
              )}
            </div>

            <div className="rounded-2xl overflow-hidden" style={glassCard}>
              <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                <Phone size={14} style={{ color: '#10B981' }} />
                <h3 className="text-sm font-display font-bold" style={{ color: '#0f172a' }}>On-Call Now</h3>
              </div>
              {onCallsLoading ? (
                <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(99,102,241,0.04)' }} />)}</div>
              ) : onCallGroups.length === 0 ? (
                <div className="text-center py-10 text-sm" style={{ color: '#94a3b8' }}>No on-call data</div>
              ) : (
                <div>{onCallGroups.slice(0, 6).map((group) => {
                  const primary = group.layers.find(l => l.level === 1) || group.layers[0];
                  return (
                    <div key={group.escalationPolicy.id} className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff' }}>
                        {primary?.user?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>{primary?.user?.name || 'Unknown'}</p>
                        <p className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{group.escalationPolicy.name}</p>
                      </div>
                      <span className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>L{primary?.level}</span>
                    </div>
                  );
                })}</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl" style={glassCard}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
              <Server size={14} style={{ color: '#6366f1' }} />
              <h3 className="text-sm font-display font-bold" style={{ color: '#0f172a' }}>Services Health</h3>
              <span className="text-[10px] font-mono ml-auto" style={{ color: '#cbd5e1' }}>{servicesList.length} services</span>
            </div>
            {servicesLoading ? (
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'rgba(99,102,241,0.04)' }} />)}
              </div>
            ) : (
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {servicesList.slice(0, 8).map((svc) => <ServiceCard key={svc.id} service={svc} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ INCIDENTS TAB ══════════ */}
      {activeTab === 'incidents' && (
        <div className="rounded-2xl overflow-hidden" style={glassCard}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
            <AlertTriangle size={14} style={{ color: '#EF4444' }} />
            <h3 className="text-sm font-display font-bold" style={{ color: '#0f172a' }}>All Active Incidents</h3>
            <span className="text-[10px] font-mono ml-auto" style={{ color: '#cbd5e1' }}>Live from PagerDuty -- 30s refresh</span>
          </div>
          {incidentsLoading ? (
            <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(99,102,241,0.04)' }} />)}</div>
          ) : incidentsList.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle2 size={48} style={{ color: '#10B981' }} className="mx-auto mb-3" />
              <p className="text-sm font-medium" style={{ color: '#64748b' }}>All clear -- no active incidents</p>
            </div>
          ) : (
            <div>{incidentsList.map((inc) => <div key={inc.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}><IncidentRow incident={inc} /></div>)}</div>
          )}
        </div>
      )}

      {/* ══════════ SERVICES TAB ══════════ */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {servicesLoading
              ? [...Array(8)].map((_, i) => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'rgba(99,102,241,0.04)' }} />)
              : servicesList.map((svc) => <ServiceCard key={svc.id} service={svc} />)
            }
          </div>
        </div>
      )}

      {/* ══════════ ON-CALL TAB ══════════ */}
      {activeTab === 'oncall' && (
        <div className="rounded-2xl overflow-hidden" style={glassCard}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
            <Phone size={14} style={{ color: '#10B981' }} />
            <h3 className="text-sm font-display font-bold" style={{ color: '#0f172a' }}>On-Call Schedule</h3>
            <span className="text-[10px] font-mono ml-auto" style={{ color: '#cbd5e1' }}>{onCallGroups.length} escalation groups</span>
          </div>
          {onCallsLoading ? (
            <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(99,102,241,0.04)' }} />)}</div>
          ) : onCallGroups.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No on-call data available</div>
          ) : (
            <div>{onCallGroups.map((group) => (
              <div key={group.escalationPolicy.id} className="px-5 py-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={13} style={{ color: '#6366f1' }} />
                  <h4 className="text-sm font-semibold" style={{ color: '#0f172a' }}>{group.escalationPolicy.name}</h4>
                </div>
                <div className="space-y-2 ml-5">
                  {group.layers.sort((a, b) => a.level - b.level).map((layer, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1' }}>L{layer.level}</span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff' }}>
                        {layer.user?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: '#0f172a' }}>{layer.user?.name}</p>
                        {layer.schedule && <p className="text-[10px]" style={{ color: '#94a3b8' }}>{layer.schedule.name}</p>}
                      </div>
                      {layer.end && (
                        <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>until {relativeTime(layer.end)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* ══════════ POLICIES TAB ══════════ */}
      {activeTab === 'policies' && (
        <div className="rounded-2xl overflow-hidden" style={glassCard}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
            <GitBranch size={14} style={{ color: '#6366f1' }} />
            <h3 className="text-sm font-display font-bold" style={{ color: '#0f172a' }}>Escalation Policies</h3>
          </div>
          {policiesLoading ? (
            <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(99,102,241,0.04)' }} />)}</div>
          ) : policiesList.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No escalation policies</div>
          ) : (
            <div>{policiesList.map((policy: any) => (
              <div key={policy.id} className="px-5 py-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: '#0f172a' }}>{policy.name}</h4>
                    {policy.description && <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>{policy.description}</p>}
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                    {policy.numLoops > 0 ? `Loops ${policy.numLoops}x` : 'No loop'}
                  </span>
                </div>
                <div className="space-y-1.5 ml-2">
                  {policy.rules?.map((rule: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]" style={{ color: '#64748b' }}>
                      <ArrowRight size={9} style={{ color: '#cbd5e1' }} className="shrink-0" />
                      <span>after {rule.escalationDelayMinutes}min --</span>
                      <span style={{ color: '#6366f1' }}>{rule.targets?.map((t: any) => t.name).join(', ')}</span>
                    </div>
                  ))}
                </div>
                {policy.services?.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px]" style={{ color: '#94a3b8' }}>Services:</span>
                    {policy.services.map((s: any) => (
                      <span key={s.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.06)', color: '#64748b' }}>{s.name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* ══════════ SETTINGS TAB ══════════ */}
      {activeTab === 'settings' && canManage && (
        <div className="space-y-4 max-w-xl">
          <div className="rounded-2xl p-5" style={glassCard}>
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#0f172a' }}>
              <Zap size={14} style={{ color: '#6366f1' }} /> Connection Details
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Account', value: statusData?.accountName || '--' },
                { label: 'Email', value: statusData?.accountEmail || '--' },
                { label: 'Connected', value: statusData?.connectedAt ? new Date(statusData.connectedAt).toLocaleDateString() : '--' },
                { label: 'Auto Sync', value: statusData?.autoSync ? 'Enabled' : 'Disabled' },
                { label: 'Auto-create Incidents', value: statusData?.autoCreateIncidents ? 'Enabled' : 'Disabled' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}>
                  <span className="text-xs" style={{ color: '#64748b' }}>{row.label}</span>
                  <span className="text-xs font-mono" style={{ color: '#6366f1' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={glassCard}>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#0f172a' }}>
              <Link2 size={14} style={{ color: '#6366f1' }} /> Incoming Webhook URL
            </h3>
            <p className="text-[11px] mb-3" style={{ color: '#94a3b8' }}>Add this URL in PagerDuty -- Integrations -- Generic Webhooks (V3) to receive incident events.</p>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <code className="flex-1 text-[10px] font-mono truncate" style={{ color: '#64748b' }}>
                {`${window.location.origin}/api/v1/pagerduty/webhook`}
              </code>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/v1/pagerduty/webhook`); toast.success('Copied'); }} className="shrink-0 p-1 rounded transition-colors" style={{ color: '#94a3b8' }} onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                <Copy size={11} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ ...glassCard, borderColor: 'rgba(239,68,68,0.2)' }}>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#DC2626' }}>
              <AlertTriangle size={14} /> Danger Zone
            </h3>
            <p className="text-[11px] mb-4" style={{ color: '#94a3b8' }}>Disconnecting will stop all syncs and remove PagerDuty data from Argus. This cannot be undone.</p>
            <button
              onClick={() => {
                if (confirm('Disconnect PagerDuty? This will stop all syncs.')) {
                  disconnectPd.mutate(undefined, {
                    onSuccess: () => toast.success('PagerDuty disconnected'),
                    onError: () => toast.error('Failed to disconnect'),
                  });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
            >
              <Trash2 size={13} /> Disconnect PagerDuty
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[10px] font-mono" style={{ color: '#cbd5e1' }}>
          PagerDuty Integration -- REST API v2 + Events API v2 -- Bidirectional Sync -- {servicesList.length} services connected
        </p>
      </div>
    </div>
  );
}
