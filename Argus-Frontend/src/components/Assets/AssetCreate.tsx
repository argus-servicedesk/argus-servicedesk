import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Server } from 'lucide-react';
import clsx from 'clsx';
import { useCreateAsset } from '../../hooks/useAssets';
import api from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface FormData {
  name: string;
  type: CIType;
  status: CIStatus;
  category: string;
  template: string;
  networkType: string;
  switchType: string;
  firewallType: string;
  routerType: string;
  description: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  location: string;
  ipAddress: string;
  physicalIpAddress: string;
  hostname: string;
  os: string;
  osVersion: string;
  cpu: string;
  memory: string;
  storage: string;
  supportGroupId: string;
  environment: string;
  monitoringEnabled: boolean;
  metricsManagementInterfaces: boolean;
  ilo: boolean;
  iloUsername: string;
  iloPassword: string;
  iloIp: string;
  idrac: boolean;
  idracPort: string;
  nodeExporter: boolean;
  nodeExporterPort: string;
  windowsExporter: boolean;
  windowsExporterPort: string;
  snmp: boolean;
  snmpVersion: string;
  snmpCommunityString: string;
  snmpUsername: string;
  snmpSecurityLevel: string;
  snmpAuthMethod: string;
  snmpAuthPassword: string;
  snmpPrivacyMethod: string;
  snmpPrivacyPassword: string;
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const CI_TYPES: { value: CIType; label: string }[] = [
  { value: 'SERVER', label: 'Physical Server' },
  { value: 'KUBERNETES_CLUSTER', label: 'Kubernetes Cluster' },
  { value: 'DATABASE', label: 'Database' },
  { value: 'APPLICATION', label: 'Application' },
  { value: 'NETWORK', label: 'Network' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'CONTAINER', label: 'Container' },
  { value: 'VM', label: 'VM' },
  { value: 'LOAD_BALANCER', label: 'Load Balancer' },
];

const CI_STATUSES: { value: CIStatus; label: string }[] = [
  { value: 'LIVE', label: 'Live' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'DECOMMISSIONED', label: 'Decommissioned' },
  { value: 'PLANNED', label: 'Planned' },
];

const TEMPLATES: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'cisco', label: 'Cisco' },
  { value: 'huawei', label: 'Huawei' },
  { value: 'fortigate', label: 'Fortigate' },
  { value: 'physical_server', label: 'Physical Server' },
  { value: 'vm', label: 'VM' },
];

const NETWORK_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Select type...' },
  { value: 'switch', label: 'Switch' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'router', label: 'Router' },
];

const SWITCH_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Select type...' },
  { value: 'gateway_switch', label: 'Gateway Switch' },
  { value: 'public_switch', label: 'Public Switch' },
  { value: 'exchange_switch', label: 'Exchange Switch' },
];

const FIREWALL_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Select type...' },
  { value: 'fortigate', label: 'Fortigate' },
];

const ROUTER_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Select type...' },
  { value: 'router', label: 'Router' },
];

// ─── Inline style constant ──────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.12)',
  color: '#0f172a',
  borderRadius: '0.75rem',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.2s',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AssetCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledType = searchParams.get('type') || '';
  const createAsset = useCreateAsset();

  // Fetch teams from API
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await api.get('/teams');
      return data;
    },
    staleTime: 60000,
  });

  const teams: { id: string; name: string }[] = teamsData?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      type: (CI_TYPES.some(t => t.value === prefilledType) ? prefilledType : 'SERVER') as CIType,
      status: 'PLANNED',
      category: '',
      template: '',
      networkType: '',
      switchType: '',
      firewallType: '',
      routerType: '',
      description: '',
      serialNumber: '',
      manufacturer: '',
      model: '',
      location: '',
      ipAddress: '',
      physicalIpAddress: '',
      hostname: '',
      os: '',
      osVersion: '',
      cpu: '',
      memory: '',
      storage: '',
      supportGroupId: '',
      environment: 'DEV',
      monitoringEnabled: false,
      metricsManagementInterfaces: false,
      ilo: false,
      iloUsername: '',
      iloPassword: '',
      iloIp: '',
      idrac: false,
      idracPort: '',
      nodeExporter: false,
      nodeExporterPort: '',
      windowsExporter: false,
      windowsExporterPort: '',
      snmp: false,
      snmpVersion: 'v2c',
      snmpCommunityString: '',
      snmpUsername: '',
      snmpSecurityLevel: '',
      snmpAuthMethod: '',
      snmpAuthPassword: '',
      snmpPrivacyMethod: '',
      snmpPrivacyPassword: '',
    },
  });

  const selectedType = watch('type');
  const networkType = watch('networkType');
  const metricsEnabled = watch('metricsManagementInterfaces');
  const iloEnabled = watch('ilo');
  const idracEnabled = watch('idrac');
  const nodeExporterEnabled = watch('nodeExporter');
  const windowsExporterEnabled = watch('windowsExporter');
  const snmpEnabled = watch('snmp');
  const snmpVersion = watch('snmpVersion');

  // Helper: wraps register() to merge purple focus/blur styling with RHF validation.
  // Returns all register props + style + merged onFocus/onBlur in a single spread.
  const styledRegister = (name: keyof FormData, options?: Parameters<typeof register>[1]) => {
    const reg = register(name, options);
    return {
      ...reg,
      style: inputStyle,
      onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = '#6366f1';
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)';
        reg.onBlur(e);
      },
    };
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      supportGroupId: data.supportGroupId || undefined,
    };
    try {
      await createAsset.mutateAsync(payload);
      toast.success('Asset registered successfully');
      navigate('/assets');
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to register asset';
      toast.error(message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-0">
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }}
        />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate('/assets')} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
              <ArrowLeft size={14} /> Assets
            </button>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span className="text-sm" style={{ color: '#a7f3d0' }}>Register</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Server size={20} style={{ color: '#a7f3d0' }} />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold" style={{ color: '#ffffff' }}>Register New Asset</h1>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Add a configuration item to the CMDB</p>
            </div>
          </div>
        </div>
      </div>
      <div className="h-0.5 -mt-5 mb-5" style={{ background: 'linear-gradient(90deg, #059669, #34d399, #a7f3d0, transparent)' }} />

      {/* Form card */}
      <div className="rounded-xl p-6 md:p-8" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Section: Basic Information ─────────────────────────────── */}
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>
            Basic Information
          </h3>

          {/* Name (full width) */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
              Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Asset name (e.g. prod-api-server-01)"
              {...styledRegister('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Minimum 2 characters' },
              })}
              style={{
                ...inputStyle,
                ...(errors.name ? { borderColor: 'rgba(239,68,68,0.6)' } : {}),
              }}
            />
            {errors.name && (
              <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Type | Status | Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Type
              </label>
              <select {...styledRegister('type')}>
                {CI_TYPES.map((t) => (
                  <option key={t.value} value={t.value} style={{ background: '#ffffff', color: '#0f172a' }}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Status
              </label>
              <select {...styledRegister('status')}>
                {CI_STATUSES.map((s) => (
                  <option key={s.value} value={s.value} style={{ background: '#ffffff', color: '#0f172a' }}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Production, Staging"
                {...styledRegister('category')}
              />
            </div>
          </div>

          {/* Network Type - only show for NETWORK asset type */}
          {selectedType === 'NETWORK' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Network Type
                </label>
                <select {...styledRegister('networkType')}>
                  {NETWORK_TYPES.map((t) => (
                    <option key={t.value} value={t.value} style={{ background: '#ffffff', color: '#0f172a' }}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Switch Type */}
              {networkType === 'switch' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Switch Type
                  </label>
                  <select {...styledRegister('switchType')}>
                    {SWITCH_TYPES.map((t) => (
                      <option key={t.value} value={t.value} style={{ background: '#ffffff', color: '#0f172a' }}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Firewall Type */}
              {networkType === 'firewall' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Firewall Type
                  </label>
                  <select {...styledRegister('firewallType')}>
                    {FIREWALL_TYPES.map((t) => (
                      <option key={t.value} value={t.value} style={{ background: '#ffffff', color: '#0f172a' }}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Router Type */}
              {networkType === 'router' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Router Type
                  </label>
                  <select {...styledRegister('routerType')}>
                    {ROUTER_TYPES.map((t) => (
                      <option key={t.value} value={t.value} style={{ background: '#ffffff', color: '#0f172a' }}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Description (full width textarea) */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Detailed description of the asset, its purpose, and any relevant notes..."
              {...(styledRegister('description') as any)}
              style={{ ...inputStyle, resize: 'vertical' as const, minHeight: '100px' }}
            />
          </div>

          {/* ── Section: Hardware Details ──────────────────────────────── */}
          <div style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>
            Hardware Details
          </h3>

          {/* Manufacturer | Model | Serial Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Manufacturer
              </label>
              <input type="text" placeholder="e.g. Dell, HP, Lenovo" {...styledRegister('manufacturer')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Model
              </label>
              <input type="text" placeholder="e.g. PowerEdge R740" {...styledRegister('model')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Serial Number
              </label>
              <input type="text" placeholder="e.g. SN-2026-00001" {...styledRegister('serialNumber')} />
            </div>
          </div>

          {/* CPU | Memory | Storage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                CPU
              </label>
              <input type="text" placeholder="e.g. Intel Xeon E5-2680 v4" {...styledRegister('cpu')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Memory
              </label>
              <input type="text" placeholder="e.g. 64 GB DDR4" {...styledRegister('memory')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Storage
              </label>
              <input type="text" placeholder="e.g. 2x 1TB SSD RAID 1" {...styledRegister('storage')} />
            </div>
          </div>

          {/* ── Section: Network & Location ────────────────────────────── */}
          <div style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>
            Network & Location
          </h3>

          {/* Location | IP Address | Hostname */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Location
              </label>
              <input type="text" placeholder="e.g. DC1-Rack-A3" {...styledRegister('location')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                IP Address
              </label>
              <input type="text" placeholder="e.g. 10.0.1.25" {...styledRegister('ipAddress')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Hostname
              </label>
              <input type="text" placeholder="e.g. prod-api-01.argus.local" {...styledRegister('hostname')} />
            </div>
          </div>

          {/* Physical server IPAddress - only for VM */}
          {selectedType === 'VM' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Physical server IPAddress
                </label>
                <input type="text" placeholder="e.g. 192.168.1.100" {...styledRegister('physicalIpAddress')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  OS
                </label>
                <input type="text" placeholder="e.g. Ubuntu, RHEL, Windows Server" {...styledRegister('os')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  OS Version
                </label>
                <input type="text" placeholder="e.g. 22.04 LTS" {...styledRegister('osVersion')} />
              </div>
            </div>
          )}

          {/* OS | OS Version - for non-VM types */}
          {selectedType !== 'VM' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  OS
                </label>
                <input type="text" placeholder="e.g. Ubuntu, RHEL, Windows Server" {...styledRegister('os')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  OS Version
                </label>
                <input type="text" placeholder="e.g. 22.04 LTS" {...styledRegister('osVersion')} />
              </div>
            </div>
          )}

          {/* ── Section: Support & Monitoring ──────────────────────────── */}
          <div style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>
            Support & Monitoring
          </h3>

          {/* Support Group | Environment | Template */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Support Group
              </label>
              <select {...styledRegister('supportGroupId')}>
                <option value="" style={{ background: '#ffffff', color: '#94a3b8' }}>Select team...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: '#ffffff', color: '#0f172a' }}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Environment
              </label>
              <select {...styledRegister('environment')}>
                <option value="DEV" style={{ background: '#ffffff', color: '#0f172a' }}>DEV</option>
                <option value="UAT" style={{ background: '#ffffff', color: '#0f172a' }}>UAT</option>
                <option value="PROD" style={{ background: '#ffffff', color: '#0f172a' }}>PROD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                Template
              </label>
              <select {...styledRegister('template')}>
                {TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value} style={{ background: '#ffffff', color: '#0f172a' }}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Monitoring Enabled | Metrics & Management Interfaces */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monitoring Enabled (toggle-style checkbox) */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    {...register('monitoringEnabled')}
                  />
                  <div
                    className="w-10 h-5 rounded-full transition-colors bg-slate-300 peer-checked:bg-indigo-500"
                  />
                  <div
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow-sm"
                  />
                </div>
                <span className="text-sm font-medium transition-colors" style={{ color: '#6366f1' }}>
                  Monitoring Enabled
                </span>
              </label>
              <p className="text-xs mt-1 ml-[52px]" style={{ color: '#94a3b8' }}>
                Enable Prometheus/Grafana monitoring for this asset
              </p>
            </div>

            {/* Metrics & Management Interfaces (toggle-style checkbox) - only show for SERVER, VM, NETWORK */}
            {(selectedType === 'SERVER' || selectedType === 'VM' || selectedType === 'NETWORK') && (
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      {...register('metricsManagementInterfaces')}
                    />
                    <div
                      className="w-10 h-5 rounded-full transition-colors bg-slate-300 peer-checked:bg-indigo-500"
                    />
                    <div
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow-sm"
                    />
                  </div>
                  <span className="text-sm font-medium transition-colors" style={{ color: '#6366f1' }}>
                    Metrics & Management Interfaces
                  </span>
                </label>
                <p className="text-xs mt-1 ml-[52px]" style={{ color: '#94a3b8' }}>
                  Enable metrics collection and management interfaces for this asset
                </p>
              </div>
            )}
          </div>

          {/* Metrics Options - only show when Metrics & Management Interfaces is enabled */}
          {metricsEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ILO - only for SERVER */}
              {selectedType === 'SERVER' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('ilo')} className="w-4 h-4 rounded" style={{ accentColor: '#6366f1' }} />
                  <span className="text-sm" style={{ color: '#64748b' }}>ILO</span>
                </label>
              )}
              {/* IDRAC - only for SERVER */}
              {selectedType === 'SERVER' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('idrac')} className="w-4 h-4 rounded" style={{ accentColor: '#6366f1' }} />
                  <span className="text-sm" style={{ color: '#64748b' }}>IDRAC</span>
                </label>
              )}
              {/* Node-Exporter - for SERVER and VM */}
              {(selectedType === 'SERVER' || selectedType === 'VM') && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('nodeExporter')} className="w-4 h-4 rounded" style={{ accentColor: '#6366f1' }} />
                  <span className="text-sm" style={{ color: '#64748b' }}>Node-Exporter</span>
                </label>
              )}
              {/* Windows-Exporter - for SERVER and VM */}
              {(selectedType === 'SERVER' || selectedType === 'VM') && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('windowsExporter')} className="w-4 h-4 rounded" style={{ accentColor: '#6366f1' }} />
                  <span className="text-sm" style={{ color: '#64748b' }}>Windows-Exporter</span>
                </label>
              )}
              {/* SNMP - only for NETWORK */}
              {selectedType === 'NETWORK' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('snmp')} className="w-4 h-4 rounded" style={{ accentColor: '#6366f1' }} />
                  <span className="text-sm" style={{ color: '#64748b' }}>SNMP</span>
                </label>
              )}
            </div>
          )}

          {/* ILO Configuration - only show when ILO is enabled */}
          {iloEnabled && (
            <div className="rounded-lg p-4" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold" style={{ color: '#6366f1' }}>ILO Configuration</h4>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                >
                  Validate
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    ILO Username
                  </label>
                  <input type="text" placeholder="Enter ILO username" {...styledRegister('iloUsername')} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    ILO Password
                  </label>
                  <input type="password" placeholder="Enter ILO password" {...styledRegister('iloPassword')} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    ILO IP
                  </label>
                  <input type="text" placeholder="e.g. 192.168.1.100" {...styledRegister('iloIp')} />
                </div>
              </div>
            </div>
          )}

          {/* IDRAC Configuration - only show when IDRAC is enabled */}
          {idracEnabled && (
            <div className="rounded-lg p-4" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold" style={{ color: '#6366f1' }}>IDRAC Configuration</h4>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                >
                  Validate
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  IDRAC Port
                </label>
                <input type="text" placeholder="e.g. 9137" {...styledRegister('idracPort')} />
              </div>
            </div>
          )}

          {/* Node-Exporter Configuration - only show when Node-Exporter is enabled */}
          {nodeExporterEnabled && (
            <div className="rounded-lg p-4" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold" style={{ color: '#6366f1' }}>Node-Exporter Configuration</h4>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                >
                  Validate
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Node-Exporter Port
                </label>
                <input type="text" placeholder="e.g. 9100" {...styledRegister('nodeExporterPort')} />
              </div>
            </div>
          )}

          {/* Windows-Exporter Configuration - only show when Windows-Exporter is enabled */}
          {windowsExporterEnabled && (
            <div className="rounded-lg p-4" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold" style={{ color: '#6366f1' }}>Windows-Exporter Configuration</h4>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                >
                  Validate
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Windows-Exporter Port
                </label>
                <input type="text" placeholder="e.g. 9182" {...styledRegister('windowsExporterPort')} />
              </div>
            </div>
          )}

          {/* SNMP Configuration - only show when SNMP is enabled */}
          {snmpEnabled && (
            <div className="rounded-lg p-4" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold" style={{ color: '#6366f1' }}>SNMP Configuration</h4>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                >
                  Validate
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  SNMP Version
                </label>
                <select {...styledRegister('snmpVersion')}>
                  <option value="v2c" style={{ background: '#ffffff', color: '#0f172a' }}>v2c</option>
                  <option value="v3" style={{ background: '#ffffff', color: '#0f172a' }}>v3</option>
                </select>
              </div>
              {snmpVersion === 'v2c' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Community String
                  </label>
                  <input type="text" placeholder="e.g. public" {...styledRegister('snmpCommunityString')} />
                </div>
              )}
              {snmpVersion === 'v3' && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                        Username
                      </label>
                      <input type="text" placeholder="Enter username" {...styledRegister('snmpUsername')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                        Security Level
                      </label>
                      <select {...styledRegister('snmpSecurityLevel')}>
                        <option value="" style={{ background: '#ffffff', color: '#94a3b8' }}>Select...</option>
                        <option value="noAuthNoPriv" style={{ background: '#ffffff', color: '#0f172a' }}>noAuthNoPriv</option>
                        <option value="authNoPriv" style={{ background: '#ffffff', color: '#0f172a' }}>authNoPriv</option>
                        <option value="authPriv" style={{ background: '#ffffff', color: '#0f172a' }}>authPriv</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                        Authentication Method
                      </label>
                      <select {...styledRegister('snmpAuthMethod')}>
                        <option value="" style={{ background: '#ffffff', color: '#94a3b8' }}>Select...</option>
                        <option value="MD5" style={{ background: '#ffffff', color: '#0f172a' }}>MD5</option>
                        <option value="SHA" style={{ background: '#ffffff', color: '#0f172a' }}>SHA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                        Authentication Password
                      </label>
                      <input type="password" placeholder="Enter auth password" {...styledRegister('snmpAuthPassword')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                        Privacy Method
                      </label>
                      <select {...styledRegister('snmpPrivacyMethod')}>
                        <option value="" style={{ background: '#ffffff', color: '#94a3b8' }}>Select...</option>
                        <option value="DES" style={{ background: '#ffffff', color: '#0f172a' }}>DES</option>
                        <option value="AES" style={{ background: '#ffffff', color: '#0f172a' }}>AES</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                        Privacy Password
                      </label>
                      <input type="password" placeholder="Enter privacy password" {...styledRegister('snmpPrivacyPassword')} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }} />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/assets')}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createAsset.isPending}
              className={clsx(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all',
                (isSubmitting || createAsset.isPending) && 'opacity-60 cursor-not-allowed',
              )}
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
            >
              <Save size={16} />
              {isSubmitting || createAsset.isPending ? 'Registering...' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
