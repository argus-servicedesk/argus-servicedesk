import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import {
  Activity, MessageSquare, Database, BarChart3, FileText,
  Phone, Mail, Globe, Webhook, Workflow, CheckCircle,
  XCircle, AlertCircle, Settings, ExternalLink, RefreshCw,
  Loader2, Zap, Layers, Box, Bell, Shield, Eye, Bug,
  Radio, Server, Cloud, GitBranch, Terminal, Search,
} from 'lucide-react';
import { useIntegrations, useCreateIntegration, useUpdateIntegration, useTestConnection } from '../../hooks/useIntegrations';
import { useOrganizations } from '../../hooks/useOrganizations';

interface IntegrationDef {
  type: string;
  name: string;
  icon: any;
  description: string;
  color: string;
  category: 'monitoring' | 'service_desk' | 'communication' | 'automation' | 'cloud';
  dashboardRoute?: string;
}

const INTEGRATION_DEFS: IntegrationDef[] = [
  // ── Monitoring & Observability ──
  { type: 'PROMETHEUS', name: 'Prometheus', icon: Activity, description: 'Metrics collection & alerting', color: 'violet', category: 'monitoring' },
  { type: 'GRAFANA', name: 'Grafana', icon: BarChart3, description: 'Dashboard visualization & panels', color: 'emerald', category: 'monitoring' },
  { type: 'LOKI', name: 'Loki', icon: FileText, description: 'Log aggregation & querying', color: 'fuchsia', category: 'monitoring' },
  { type: 'KUBERNETES_CLUSTER', name: 'Kubernetes', icon: Layers, description: 'Container orchestration & pod management', color: 'violet', category: 'monitoring', dashboardRoute: '/k8s' },
  { type: 'STACKSTORM', name: 'StackStorm', icon: Zap, description: 'Event-driven automation & remediation', color: 'amber', category: 'automation' },
  { type: 'DATADOG', name: 'Datadog', icon: Eye, description: 'Infrastructure & APM monitoring', color: 'fuchsia', category: 'monitoring' },
  { type: 'NEW_RELIC', name: 'New Relic', icon: Search, description: 'Full-stack observability platform', color: 'emerald', category: 'monitoring' },
  { type: 'ELASTICSEARCH', name: 'Elasticsearch', icon: Database, description: 'Search & log analytics engine', color: 'amber', category: 'monitoring' },
  // ── Service Desk & Incident Management ──
  { type: 'PAGERDUTY', name: 'PagerDuty', icon: Bell, description: 'Incident response & on-call management', color: 'emerald', category: 'service_desk', dashboardRoute: '/pagerduty' },
  { type: 'SERVICENOW', name: 'ServiceNow', icon: Globe, description: 'Service Desk sync & ticket mirroring', color: 'violet', category: 'service_desk' },
  { type: 'JIRA', name: 'Jira', icon: Bug, description: 'Issue tracking & project management', color: 'violet', category: 'service_desk' },
  { type: 'OPSGENIE', name: 'OpsGenie', icon: Shield, description: 'Alert routing & escalation policies', color: 'crimson', category: 'service_desk' },
  { type: 'REDMINE', name: 'Redmine', icon: GitBranch, description: 'Project management & bug tracking', color: 'crimson', category: 'service_desk' },
  // ── Communication & Notifications ──
  { type: 'SLACK', name: 'Slack', icon: MessageSquare, description: 'Team notifications & incident channels', color: 'amber', category: 'communication' },
  { type: 'APPRISE', name: 'Apprise', icon: Radio, description: 'Multi-channel push notifications', color: 'fuchsia', category: 'communication' },
  { type: 'TWILIO', name: 'Twilio', icon: Phone, description: 'SMS & voice call escalations', color: 'crimson', category: 'communication' },
  { type: 'MSG91', name: 'MSG91', icon: Phone, description: 'India bulk SMS notifications', color: 'emerald', category: 'communication' },
  { type: 'EMAIL', name: 'Email (SMTP)', icon: Mail, description: 'Email notifications & digests', color: 'violet', category: 'communication' },
  // ── Automation & DevOps ──
  { type: 'N8N', name: 'n8n', icon: Workflow, description: 'Workflow automation engine', color: 'fuchsia', category: 'automation' },
  { type: 'ANSIBLE', name: 'Ansible', icon: Terminal, description: 'Configuration management & playbooks', color: 'crimson', category: 'automation' },
  { type: 'TERRAFORM', name: 'Terraform', icon: Cloud, description: 'Infrastructure as Code provisioning', color: 'fuchsia', category: 'cloud' },
  { type: 'WEBHOOK', name: 'Webhooks', icon: Webhook, description: 'Custom webhook receivers', color: 'amber', category: 'automation' },
  { type: 'VAULT', name: 'HashiCorp Vault', icon: Shield, description: 'Secrets management & encryption', color: 'amber', category: 'cloud' },
  { type: 'AWS', name: 'AWS CloudWatch', icon: Cloud, description: 'AWS infrastructure monitoring', color: 'amber', category: 'cloud' },
  { type: 'AZURE', name: 'Azure Monitor', icon: Cloud, description: 'Azure infrastructure monitoring', color: 'violet', category: 'cloud' },
];

// Config field definitions per integration type
const CONFIG_FIELDS: Record<string, { key: string; label: string; placeholder: string; type?: string }[]> = {
  SLACK: [
    { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-...', type: 'password' },
    { key: 'channel', label: 'Channel', placeholder: '#alerts' },
    { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/...' },
  ],
  PAGERDUTY: [
    { key: 'routingKey', label: 'Routing Key', placeholder: 'R0...', type: 'password' },
    { key: 'serviceId', label: 'Service ID', placeholder: 'P...' },
    { key: 'apiKey', label: 'API Key', placeholder: 'u+...', type: 'password' },
  ],
  LOKI: [
    { key: 'serverIp', label: 'Server IP', placeholder: '10.0.0.1' },
    { key: 'lokiPort', label: 'Loki Port', placeholder: '3100' },
    { key: 'sshPort', label: 'SSH Port', placeholder: '4422' },
    { key: 'sshUser', label: 'SSH User', placeholder: 'finadmin' },
  ],
  STACKSTORM: [
    { key: 'serverIp', label: 'Server IP', placeholder: '10.0.0.1' },
    { key: 'apiPort', label: 'API Port', placeholder: '9101' },
    { key: 'apiKey', label: 'API Key', placeholder: 'st2_...', type: 'password' },
  ],
  TWILIO: [
    { key: 'accountSid', label: 'Account SID', placeholder: 'AC...' },
    { key: 'authToken', label: 'Auth Token', placeholder: '...', type: 'password' },
    { key: 'fromNumber', label: 'From Number', placeholder: '+1...' },
  ],
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function safeParseConfig(config: any): Record<string, any> {
  if (!config) return {};
  if (typeof config === 'object') return config;
  try { return JSON.parse(config); } catch { return {}; }
}

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

const statusConfig: Record<string, { icon: any; label: string; color: string; bg: string; border: string }> = {
  ACTIVE: { icon: CheckCircle, label: 'Active', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  INACTIVE: { icon: XCircle, label: 'Inactive', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
  ERROR: { icon: AlertCircle, label: 'Error', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
};

const CATEGORIES = [
  { key: 'all', label: 'All Integrations' },
  { key: 'monitoring', label: 'Monitoring' },
  { key: 'service_desk', label: 'Service Desk' },
  { key: 'communication', label: 'Communication' },
  { key: 'automation', label: 'Automation' },
  { key: 'cloud', label: 'Cloud & Infra' },
];

const iconBgMap: Record<string, React.CSSProperties> = {
  violet: { background: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  emerald: { background: 'rgba(16,185,129,0.1)', color: '#059669' },
  amber: { background: 'rgba(217,119,6,0.1)', color: '#D97706' },
  crimson: { background: 'rgba(239,68,68,0.1)', color: '#DC2626' },
  fuchsia: { background: 'rgba(168,85,247,0.1)', color: '#a855f7' },
};

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.1)',
  color: '#0f172a',
  borderRadius: '0.75rem',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const glassCard: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.15)',
  boxShadow: '0 1px 3px rgba(99,102,241,0.08), 0 4px 12px rgba(99,102,241,0.04)',
  borderRadius: '0.75rem',
};

export default function IntegrationHub() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [configModal, setConfigModal] = useState<string | null>(null);

  // ── Form state for modal ──
  const [formName, setFormName] = useState('');
  const [formOrganizationId, setFormOrganizationId] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const { data: intgData, isLoading } = useIntegrations();
  const { data: organizationsData } = useOrganizations();
  const createIntegration = useCreateIntegration();
  const updateIntegration = useUpdateIntegration();
  const testConnection = useTestConnection();

  const apiIntegrations: any[] = extractList(intgData);
  const organizations = extractList(organizationsData);

  const integrations = INTEGRATION_DEFS.map((def, idx) => {
    const apiMatch = apiIntegrations.find((a: any) => a.type === def.type);
    return {
      id: apiMatch?.id || `def-${idx}`,
      ...def,
      status: apiMatch?.status || 'INACTIVE',
      lastSync: apiMatch?.lastSyncAt ? relativeTime(apiMatch.lastSyncAt) : 'Never',
      config: apiMatch?.config || {},
      organizationId: apiMatch?.organizationId || apiMatch?.organization?.id || '',
      connected: !!apiMatch,
      apiId: apiMatch?.id || null,
    };
  });

  const activeCount = integrations.filter(i => i.status === 'ACTIVE').length;

  const filtered = integrations
    .filter(i => statusFilter === 'all' || i.status === statusFilter)
    .filter(i => categoryFilter === 'all' || i.category === categoryFilter);

  // Populate form when modal opens
  useEffect(() => {
    if (!configModal) return;
    const intg = integrations.find(i => i.id === configModal);
    if (!intg) return;
    setFormName(intg.connected ? intg.name : '');
    setFormOrganizationId(intg.organizationId || (organizations.length === 1 ? organizations[0].id : ''));
    setFormEnabled(intg.status === 'ACTIVE');
    const parsed = safeParseConfig(intg.config);
    setFormConfig(parsed);
    setTestResult(null);
    setSaveMsg(null);
  }, [configModal, organizations.length]);

  const handleCardClick = (integration: typeof integrations[0]) => {
    if (integration.dashboardRoute && integration.connected) {
      navigate(integration.dashboardRoute);
    } else {
      setConfigModal(integration.id);
    }
  };

  function handleSave(intg: typeof integrations[0]) {
    setSaveMsg(null);
    setTestResult(null);
    const name = formName || intg.name;
    const payload = {
      name,
      config: formConfig,
      isActive: formEnabled,
      organizationId: formOrganizationId,
    };

    if (intg.apiId) {
      updateIntegration.mutate(
        { id: intg.apiId, data: payload },
        {
          onSuccess: () => { setSaveMsg('Integration updated successfully'); },
          onError: (err: any) => { setSaveMsg(`Error: ${err?.response?.data?.error || err.message}`); },
        },
      );
    } else {
      createIntegration.mutate(
        { ...payload, type: intg.type },
        {
          onSuccess: () => { setSaveMsg('Integration created successfully'); },
          onError: (err: any) => { setSaveMsg(`Error: ${err?.response?.data?.error || err.message}`); },
        },
      );
    }
  }

  function handleTest(intg: typeof integrations[0]) {
    setTestResult(null);
    setSaveMsg(null);
    if (!intg.apiId) {
      setTestResult({ ok: false, msg: 'Save the integration first before testing' });
      return;
    }
    testConnection.mutate(intg.apiId, {
      onSuccess: (data: any) => {
        const d = data?.data || data;
        setTestResult({ ok: d.connected, msg: d.message || (d.connected ? 'Connection successful' : 'Connection failed') });
      },
      onError: (err: any) => {
        setTestResult({ ok: false, msg: err?.response?.data?.error || err.message || 'Test failed' });
      },
    });
  }

  function updateConfigField(key: string, value: string) {
    setFormConfig(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="animate-fade-in space-y-0">
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px', opacity: 0.15 }} />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" style={{ background: 'rgba(99,102,241,0.4)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" style={{ background: 'rgba(168,85,247,0.3)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Webhook size={16} style={{ color: '#c4b5fd' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Integration Hub</h1>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>{integrations.length} TOOLS</span>
              </div>
              <p className="text-sm ml-[42px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Connect, configure, and manage all external services and platforms</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}><span className="font-bold" style={{ color: '#ffffff' }}>{activeCount}</span> Active</span>
              </div>
            </div>
          </div>
          {/* ── Summary pills ── */}
          <div className="flex items-center gap-2 mt-3 ml-[42px]">
            {[
              { label: 'Monitoring', count: integrations.filter(i => i.category === 'monitoring').length, active: integrations.filter(i => i.category === 'monitoring' && i.status === 'ACTIVE').length },
              { label: 'Service Desk', count: integrations.filter(i => i.category === 'service_desk').length, active: integrations.filter(i => i.category === 'service_desk' && i.status === 'ACTIVE').length },
              { label: 'Comms', count: integrations.filter(i => i.category === 'communication').length, active: integrations.filter(i => i.category === 'communication' && i.status === 'ACTIVE').length },
              { label: 'Automation', count: integrations.filter(i => i.category === 'automation').length, active: integrations.filter(i => i.category === 'automation' && i.status === 'ACTIVE').length },
              { label: 'Cloud', count: integrations.filter(i => i.category === 'cloud').length, active: integrations.filter(i => i.category === 'cloud' && i.status === 'ACTIVE').length },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.label}</span>
                <span className="text-[10px] font-bold" style={{ color: '#ffffff' }}>{p.active}/{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-0.5 -mt-5 mb-4" style={{ background: 'linear-gradient(90deg, #a5b4fc, #c4b5fd, #ddd6fe, transparent)' }} />

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-lg p-1" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={categoryFilter === cat.key
                ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff' }
                : { color: '#94a3b8' }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="h-5 w-px" style={{ background: 'rgba(99,102,241,0.08)' }} />
        {['all', 'ACTIVE', 'INACTIVE'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={statusFilter === f
              ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', border: '1px solid transparent' }
              : { color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)' }}
          >
            {f === 'all' ? 'All Status' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <span className="text-xs ml-auto font-mono" style={{ color: '#94a3b8' }}>{filtered.length} integration{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#6366f1' }} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(integration => {
          const st = statusConfig[integration.status] || statusConfig.INACTIVE;
          const StatusIcon = st.icon;
          const hasDashboard = !!integration.dashboardRoute;
          const iconSt = iconBgMap[integration.color] || iconBgMap.violet;
          return (
            <div
              key={integration.id}
              className="p-5 group cursor-pointer relative transition-all duration-300 hover:scale-[1.02]"
              style={{ ...glassCard, transition: 'border-color 0.3s, transform 0.3s' }}
              onClick={() => handleCardClick(integration)}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.08)')}
            >
              {hasDashboard && integration.connected && (
                <div className="absolute top-3 right-3">
                  <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <ExternalLink className="w-2.5 h-2.5" /> Dashboard
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl" style={iconSt}>
                  <integration.icon className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {st.label}
                </span>
              </div>

              <h3 className="text-base font-semibold mb-1" style={{ color: '#0f172a' }}>{integration.name}</h3>
              <p className="text-xs mb-4 line-clamp-2" style={{ color: '#94a3b8' }}>{integration.description}</p>

              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                <span className="text-[10px] font-mono" style={{ color: '#cbd5e1' }}>
                  {integration.connected ? `Last sync: ${integration.lastSync}` : 'Not configured'}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {hasDashboard && integration.connected && (
                    <button
                      className="p-1 rounded transition-colors"
                      title="Open Dashboard"
                      style={{ color: '#94a3b8' }}
                      onClick={(e) => { e.stopPropagation(); navigate(integration.dashboardRoute!); }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    className="p-1 rounded transition-colors"
                    title="Configure"
                    style={{ color: '#94a3b8' }}
                    onClick={(e) => { e.stopPropagation(); setConfigModal(integration.id); }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CONFIG MODAL                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {configModal && (() => {
        const intg = integrations.find(i => i.id === configModal);
        if (!intg) return null;
        const isEdit = !!intg.apiId;
        const fields = CONFIG_FIELDS[intg.type];
        const isSaving = createIntegration.isPending || updateIntegration.isPending;
        const isTesting = testConnection.isPending;
        const iconSt = iconBgMap[intg.color] || iconBgMap.violet;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setConfigModal(null)}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} />
            <div className="relative p-6 w-full max-w-lg animate-slide-in max-h-[90vh] overflow-y-auto" style={{ ...glassCard, borderColor: 'rgba(99,102,241,0.12)' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={iconSt}>
                    <intg.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold" style={{ color: '#0f172a' }}>{intg.name}</h2>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={isEdit ? { background: 'rgba(99,102,241,0.1)', color: '#6366f1' } : { background: 'rgba(217,119,6,0.15)', color: '#D97706' }}>
                        {isEdit ? 'EDIT' : 'NEW'}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{intg.description}</p>
                  </div>
                </div>
                <button onClick={() => setConfigModal(null)} className="text-xl transition-colors" style={{ color: '#94a3b8' }} onMouseEnter={e => (e.currentTarget.style.color = '#0f172a')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>&times;</button>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Integration Name</label>
                  <input style={inputStyle} placeholder={intg.name} value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Client Organization</label>
                  <select style={inputStyle} value={formOrganizationId} onChange={e => setFormOrganizationId(e.target.value)}>
                    <option value="">Select client</option>
                    {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                </div>

                {/* Type-specific fields */}
                {intg.type === 'PROMETHEUS' ? (
                  <>
                    <div className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: '#94a3b8' }}>Prometheus Configuration</div>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: '#64748b' }}>Access Method</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'ssh', label: 'SSH (key-based)', desc: 'SSH tunnel to server' },
                          { value: 'direct', label: 'Direct URL', desc: 'HTTP access with credentials' },
                        ].map(opt => (
                          <button key={opt.value} type="button" onClick={() => updateConfigField('accessMethod', opt.value)} className="flex-1 p-2.5 rounded-lg text-left transition-all" style={(formConfig.accessMethod || 'ssh') === opt.value ? { border: '1px solid #6366f1', background: 'rgba(99,102,241,0.06)', color: '#6366f1' } : { border: '1px solid rgba(99,102,241,0.15)', color: '#94a3b8' }}>
                            <div className="text-xs font-semibold">{opt.label}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {(formConfig.accessMethod || 'ssh') === 'ssh' && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {[
                          { key: 'serverIp', label: 'Server IP', placeholder: '154.210.170.126' },
                          { key: 'sshPort', label: 'SSH Port', placeholder: '4422' },
                          { key: 'sshUser', label: 'SSH User', placeholder: 'finadmin' },
                          { key: 'promPort', label: 'Prometheus Port', placeholder: '30000' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>{f.label}</label>
                            <input style={inputStyle} placeholder={f.placeholder} value={formConfig[f.key] || ''} onChange={e => updateConfigField(f.key, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    )}
                    {formConfig.accessMethod === 'direct' && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Prometheus URL <span style={{ color: '#EF4444' }}>*</span></label>
                          <input style={inputStyle} placeholder="http://prometheus.acme.com:9090" value={formConfig.prometheusUrl || ''} onChange={e => updateConfigField('prometheusUrl', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Username <span style={{ color: '#94a3b8' }}>(optional)</span></label>
                            <input style={inputStyle} placeholder="admin" value={formConfig.prometheusUsername || ''} onChange={e => updateConfigField('prometheusUsername', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Password <span style={{ color: '#94a3b8' }}>(optional)</span></label>
                            <input style={inputStyle} type="password" placeholder="..." value={formConfig.prometheusPassword || ''} onChange={e => updateConfigField('prometheusPassword', e.target.value)} />
                          </div>
                        </div>
                        <p className="text-[10px] font-mono p-2 rounded" style={{ color: '#94a3b8', background: 'rgba(99,102,241,0.03)' }}>
                          Leave username/password blank for unauthenticated Prometheus. Use API Key below for Bearer token auth.
                        </p>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Bearer API Key <span style={{ color: '#94a3b8' }}>(optional)</span></label>
                          <input style={inputStyle} type="password" placeholder="Bearer token" value={formConfig.apiKey || ''} onChange={e => updateConfigField('apiKey', e.target.value)} />
                        </div>
                      </div>
                    )}
                  </>
                ) : intg.type === 'GRAFANA' ? (
                  <>
                    <div className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: '#94a3b8' }}>Grafana Configuration</div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Grafana URL <span style={{ color: '#EF4444' }}>*</span></label>
                        <input style={inputStyle} placeholder="http://grafana.acme.com:3000" value={formConfig.grafanaExternalUrl || ''} onChange={e => updateConfigField('grafanaExternalUrl', e.target.value)} />
                        <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>Public-accessible URL used for panel iframes and API calls.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>API Key <span style={{ color: '#EF4444' }}>*</span></label>
                        <input style={inputStyle} type="password" placeholder="glsa_..." value={formConfig.apiKey || ''} onChange={e => updateConfigField('apiKey', e.target.value)} />
                        <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>Create in Grafana -- Administration -- Service Accounts -- New token (Editor role).</p>
                      </div>
                      <div className="p-2.5 rounded-lg text-[10px]" style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.06)', color: '#64748b' }}>
                        <span className="font-semibold">SSH fields optional:</span> only needed if Grafana is not directly reachable.
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'serverIp', label: 'Server IP (SSH only)', placeholder: '154.210.170.126' },
                          { key: 'sshPort', label: 'SSH Port', placeholder: '4422' },
                          { key: 'sshUser', label: 'SSH User', placeholder: 'finadmin' },
                          { key: 'grafanaPort', label: 'Internal Grafana Port', placeholder: '30010' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>{f.label}</label>
                            <input style={inputStyle} placeholder={f.placeholder} value={formConfig[f.key] || ''} onChange={e => updateConfigField(f.key, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : intg.type === 'KUBERNETES_CLUSTER' ? (
                  <>
                    <div className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: '#94a3b8' }}>Kubernetes Configuration</div>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: '#64748b' }}>Access Method</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'ssh', label: 'SSH (key-based)', desc: 'SSH tunnel via pre-shared key' },
                          { value: 'direct', label: 'Direct API URL', desc: 'HTTPS to K8s API server' },
                        ].map(opt => (
                          <button key={opt.value} type="button" onClick={() => updateConfigField('accessMethod', opt.value)} className="flex-1 p-2.5 rounded-lg text-left transition-all" style={(formConfig.accessMethod || 'ssh') === opt.value ? { border: '1px solid #6366f1', background: 'rgba(99,102,241,0.06)', color: '#6366f1' } : { border: '1px solid rgba(99,102,241,0.15)', color: '#94a3b8' }}>
                            <div className="text-xs font-semibold">{opt.label}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {(formConfig.accessMethod || 'ssh') === 'ssh' && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {[
                          { key: 'serverIp', label: 'Server IP', placeholder: '154.210.170.126' },
                          { key: 'sshPort', label: 'SSH Port', placeholder: '4422' },
                          { key: 'sshUser', label: 'SSH User', placeholder: 'finadmin' },
                          { key: 'clusterName', label: 'Cluster Name', placeholder: 'prod-k8s' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>{f.label}</label>
                            <input style={inputStyle} placeholder={f.placeholder} value={formConfig[f.key] || ''} onChange={e => updateConfigField(f.key, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    )}
                    {formConfig.accessMethod === 'direct' && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>K8s API Server URL <span style={{ color: '#EF4444' }}>*</span></label>
                          <input style={inputStyle} placeholder="https://203.0.113.10:6443" value={formConfig.k8sApiUrl || ''} onChange={e => updateConfigField('k8sApiUrl', e.target.value)} />
                          <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>The public API server address (port 6443 is standard).</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Service Account Token <span style={{ color: '#94a3b8' }}>(recommended)</span></label>
                          <input style={inputStyle} type="password" placeholder="eyJhbGciOiJSUzI1NiIs..." value={formConfig.k8sToken || ''} onChange={e => updateConfigField('k8sToken', e.target.value)} />
                        </div>
                        <div className="p-3 rounded-lg font-mono text-[9px] space-y-1 leading-relaxed" style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.06)', color: '#94a3b8' }}>
                          <div className="text-[10px] font-semibold font-sans mb-1.5" style={{ color: '#64748b' }}>How to create a read-only service account token:</div>
                          <div>kubectl create serviceaccount argus-reader -n kube-system</div>
                          <div>kubectl create clusterrolebinding argus-reader \</div>
                          <div className="pl-4">--clusterrole=view \</div>
                          <div className="pl-4">--serviceaccount=kube-system:argus-reader</div>
                          <div>kubectl -n kube-system create token argus-reader</div>
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Or use Basic Auth (fallback)</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Username</label>
                            <input style={inputStyle} placeholder="admin" value={formConfig.k8sUsername || ''} onChange={e => updateConfigField('k8sUsername', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Password</label>
                            <input style={inputStyle} type="password" placeholder="..." value={formConfig.k8sPassword || ''} onChange={e => updateConfigField('k8sPassword', e.target.value)} />
                          </div>
                        </div>
                        <p className="text-[10px] p-2 rounded" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.15)', color: '#D97706' }}>
                          Service account token takes priority over username/password when both are provided.
                        </p>
                      </div>
                    )}
                  </>
                ) : fields ? (
                  <>
                    <div className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: '#94a3b8' }}>{intg.name} Configuration</div>
                    <div className="grid grid-cols-2 gap-3">
                      {fields.map(f => (
                        <div key={f.key} className={f.key === 'grafanaExternalUrl' || f.key === 'webhookUrl' ? 'col-span-2' : ''}>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>{f.label}</label>
                          <input style={inputStyle} type={f.type || 'text'} placeholder={f.placeholder} value={formConfig[f.key] || ''} onChange={e => updateConfigField(f.key, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Endpoint URL</label>
                      <input style={inputStyle} placeholder={`https://${intg.name.toLowerCase().replace(/\s+/g, '-')}.example.com`} value={formConfig.url || ''} onChange={e => updateConfigField('url', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>API Key / Token</label>
                      <input style={inputStyle} type="password" placeholder="Enter API key" value={formConfig.apiKey || ''} onChange={e => updateConfigField('apiKey', e.target.value)} />
                    </div>
                  </>
                )}

                {/* Enabled toggle */}
                <div className="flex items-center justify-between pt-2">
                  <label className="text-sm" style={{ color: '#6366f1' }}>Enabled</label>
                  <button
                    type="button"
                    onClick={() => setFormEnabled(v => !v)}
                    className="w-10 h-5 rounded-full transition-colors flex items-center px-0.5"
                    style={{ background: formEnabled ? '#6366f1' : '#e2e8f0' }}
                  >
                    <div className="w-4 h-4 rounded-full transition-transform" style={{ background: '#ffffff', transform: formEnabled ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </div>
              </div>

              {/* Feedback messages */}
              {testResult && (
                <div className="mt-4 p-3 rounded-lg text-sm flex items-center gap-2" style={testResult.ok ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' } : { background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)' }}>
                  {testResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {testResult.msg}
                </div>
              )}
              {saveMsg && (
                <div className="mt-3 p-3 rounded-lg text-sm flex items-center gap-2" style={saveMsg.startsWith('Error') ? { background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)' } : { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}>
                  {saveMsg.startsWith('Error') ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                  {saveMsg}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
                  disabled={isTesting}
                  onClick={() => handleTest(intg)}
                >
                  {isTesting ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</> : <><RefreshCw className="w-3.5 h-3.5" /> Test Connection</>}
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
                  disabled={isSaving}
                  onClick={() => handleSave(intg)}
                >
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save'}
                </button>
                {intg.dashboardRoute && intg.connected && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.12)' }}
                    onClick={() => { setConfigModal(null); navigate(intg.dashboardRoute!); }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Dashboard
                  </button>
                )}
                <button onClick={() => setConfigModal(null)} className="px-3 py-2 rounded-xl text-sm font-medium transition-colors" style={{ color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)' }}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
