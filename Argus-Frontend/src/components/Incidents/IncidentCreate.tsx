import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft, AlertTriangle, Zap, ChevronRight, Shield,
  Clock, Users, Hash, Flame, BarChart3, Mail, Mic, Globe,
  FileText, Tag, Loader2, Info, CheckCircle2, Plus,
  Monitor, Database, Lock, Settings, Wifi, Cloud,
  Activity, Layers,
} from 'lucide-react';
import clsx from 'clsx';
import { useCreateIncident } from '../../hooks/useIncidents';
import api from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type Impact   = 'ENTERPRISE' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
type Urgency  = 'CRITICAL'   | 'HIGH'       | 'MEDIUM' | 'LOW';
type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type Source   = 'MANUAL' | 'PROMETHEUS' | 'GRAFANA' | 'API' | 'EMAIL' | 'VOICE' | 'SLACK';

interface IncidentFormData {
  shortDescription: string;
  description: string;
  impact: Impact;
  urgency: Urgency;
  category: string;
  source: Source;
  assignmentGroupId: string;
  assignedToId: string;
  configItemId: string;
}

// ─── Design tokens (light theme with indigo accents) ──────────────────────────
const SURFACE = 'rgba(255,255,255,0.95)';
const SURFACE2 = 'rgba(255,255,255,0.85)';
const BORDER  = 'rgba(99,102,241,0.08)';
const BORDER_LT = 'rgba(99,102,241,0.12)';
const TEXT    = '#0f172a';
const TEXT2   = '#94a3b8';

// ─── Priority matrix ─────────────────────────────────────────────────────────
const PRIORITY_MATRIX: Record<Impact, Record<Urgency, Priority>> = {
  ENTERPRISE: { CRITICAL: 'P1', HIGH: 'P1', MEDIUM: 'P2', LOW: 'P3' },
  DEPARTMENT: { CRITICAL: 'P1', HIGH: 'P2', MEDIUM: 'P2', LOW: 'P3' },
  TEAM:       { CRITICAL: 'P2', HIGH: 'P2', MEDIUM: 'P3', LOW: 'P4' },
  INDIVIDUAL: { CRITICAL: 'P2', HIGH: 'P3', MEDIUM: 'P4', LOW: 'P4' },
};

const PRIORITY_META: Record<Priority, {
  label: string; color: string; glow: string; ring: string;
  bg: string; gradFrom: string; gradTo: string;
  slaResponse: string; slaResolution: string; slaFull: string;
}> = {
  P1: { label: 'Critical',  color: '#FF4D6A', glow: 'rgba(255,77,106,0.35)',  ring: 'rgba(255,77,106,0.4)',  bg: 'rgba(255,77,106,0.08)',  gradFrom: '#FF4D6A', gradTo: '#DC2626', slaResponse: '5 min',  slaResolution: '1 hr',  slaFull: 'Resp 5m | Res 1h'  },
  P2: { label: 'High',      color: '#FFA726', glow: 'rgba(255,167,38,0.30)',  ring: 'rgba(255,167,38,0.4)',  bg: 'rgba(255,167,38,0.08)',  gradFrom: '#FFA726', gradTo: '#F59E0B', slaResponse: '15 min', slaResolution: '4 hr',  slaFull: 'Resp 15m | Res 4h' },
  P3: { label: 'Medium',    color: '#6366f1', glow: 'rgba(99,102,241,0.15)',  ring: 'rgba(99,102,241,0.2)',  bg: 'rgba(99,102,241,0.06)',  gradFrom: '#818cf8', gradTo: '#6366f1', slaResponse: '1 hr',   slaResolution: '24 hr', slaFull: 'Resp 1h | Res 24h' },
  P4: { label: 'Low',       color: '#34D399', glow: 'rgba(52,211,153,0.25)',  ring: 'rgba(52,211,153,0.4)',  bg: 'rgba(52,211,153,0.07)',  gradFrom: '#34D399', gradTo: '#059669', slaResponse: '4 hr',   slaResolution: '72 hr', slaFull: 'Resp 4h | Res 72h' },
};

// ─── Impact / Urgency options ─────────────────────────────────────────────────
const IMPACTS: { value: Impact; label: string; desc: string; color: string; glow: string }[] = [
  { value: 'ENTERPRISE', label: 'Enterprise', desc: 'Organization-wide',  color: '#FF4D6A', glow: 'rgba(255,77,106,0.25)' },
  { value: 'DEPARTMENT', label: 'Department', desc: 'Department scope',   color: '#FFA726', glow: 'rgba(255,167,38,0.22)' },
  { value: 'TEAM',       label: 'Team',       desc: 'Team scope',         color: '#6366f1', glow: 'rgba(99,102,241,0.22)' },
  { value: 'INDIVIDUAL', label: 'Individual', desc: 'Single user',        color: '#34D399', glow: 'rgba(52,211,153,0.20)' },
];

const URGENCIES: { value: Urgency; label: string; desc: string; color: string; glow: string }[] = [
  { value: 'CRITICAL', label: 'Critical', desc: 'Immediate action required', color: '#FF4D6A', glow: 'rgba(255,77,106,0.25)' },
  { value: 'HIGH',     label: 'High',     desc: 'Urgent resolution needed',  color: '#FFA726', glow: 'rgba(255,167,38,0.22)' },
  { value: 'MEDIUM',   label: 'Medium',   desc: 'Standard response time',    color: '#6366f1', glow: 'rgba(99,102,241,0.22)' },
  { value: 'LOW',      label: 'Low',      desc: 'Can be scheduled',          color: '#34D399', glow: 'rgba(52,211,153,0.20)' },
];

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES: { value: string; icon: React.ElementType; color: string }[] = [
  { value: 'Hardware',          icon: Monitor,   color: '#60A5FA' },
  { value: 'Software',          icon: FileText,  color: '#64748b' },
  { value: 'Network',           icon: Wifi,      color: '#34D399' },
  { value: 'Database',          icon: Database,  color: '#FFA726' },
  { value: 'Security',          icon: Lock,      color: '#FF4D6A' },
  { value: 'Cloud Infrastructure', icon: Cloud,  color: '#38BDF8' },
  { value: 'Application',       icon: Layers,    color: '#818CF8' },
  { value: 'Monitoring',        icon: Activity,  color: '#FB923C' },
  { value: 'Access Management', icon: Users,     color: '#F472B6' },
  { value: 'Other',             icon: Settings,  color: '#94A3B8' },
];

const SOURCES: { value: Source; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'MANUAL',     label: 'Manual',     icon: Users,     color: '#94A3B8' },
  { value: 'PROMETHEUS', label: 'Prometheus', icon: Flame,     color: '#FB923C' },
  { value: 'GRAFANA',    label: 'Grafana',    icon: BarChart3, color: '#60A5FA' },
  { value: 'API',        label: 'API',        icon: Globe,     color: '#38BDF8' },
  { value: 'EMAIL',      label: 'Email',      icon: Mail,      color: '#FF4D6A' },
  { value: 'VOICE',      label: 'Voice',      icon: Mic,       color: '#34D399' },
  { value: 'SLACK',      label: 'Slack',      icon: Hash,      color: '#64748b' },
];

const STEPS = [
  { key: 'details',        label: 'Details',        icon: FileText },
  { key: 'severity',       label: 'Severity',       icon: Shield   },
  { key: 'classification', label: 'Classification', icon: Tag      },
  { key: 'assignment',     label: 'Assignment',     icon: Users    },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepRail({ active }: { active: number }) {
  return (
    <div className="flex items-center justify-between mb-8 px-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done    = i < active;
        const current = i === active;
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border')}
                  style={{
                    background: done ? 'linear-gradient(135deg, #6366f1, #a855f7)' : current ? 'rgba(99,102,241,0.08)' : SURFACE2,
                    borderColor: done ? '#6366f1' : current ? 'rgba(99,102,241,0.25)' : BORDER,
                    boxShadow: current ? '0 0 16px rgba(99,102,241,0.12), 0 0 4px rgba(99,102,241,0.08)' : 'none',
                  }}>
                  {done
                    ? <CheckCircle2 size={16} style={{ color: '#fff' }} />
                    : <Icon size={15} style={{ color: current ? '#6366f1' : TEXT2 }} />}
                </div>
                {current && (
                  <div className="absolute -inset-1 rounded-2xl animate-pulse pointer-events-none" style={{ border: '1px solid rgba(99,102,241,0.15)' }} />
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap"
                style={{ color: done ? '#6366f1' : current ? '#0f172a' : TEXT2 }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-2 h-px relative top-[-10px]"
                style={{ background: i < active ? 'linear-gradient(90deg, #6366f1, #a855f7)' : BORDER_LT,
                  boxShadow: i < active ? '0 0 4px rgba(99,102,241,0.15)' : 'none' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({ icon: Icon, title, step, children }: {
  icon: React.ElementType; title: string; step: number; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
      {/* Card header */}
      <div className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: '1px solid #e2e8f0', background: 'rgba(99,102,241,0.03)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 0 12px rgba(99,102,241,0.15)' }}>
          <Icon size={16} style={{ color: '#fff' }} />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: '#94a3b8' }}>
            Step {step} of 4
          </p>
          <h3 className="text-[13px] font-bold" style={{ color: TEXT }}>{title}</h3>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FieldLabel({ children, required, hint }: { children: string; required?: boolean; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2.5">
      <label className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#64748b' }}>
        {children}{required && <span style={{ color: '#FF4D6A' }} className="ml-0.5">*</span>}
      </label>
      {hint && <span className="text-[10px] font-mono" style={{ color: TEXT2 }}>{hint}</span>}
    </div>
  );
}

function SevCard({
  label, desc, isActive, color, glow, onClick,
}: { label: string; desc: string; isActive: boolean; color: string; glow: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-250"
      style={{
        background: isActive ? `${glow}` : SURFACE2,
        border: `1px solid ${isActive ? color : BORDER}`,
        boxShadow: isActive ? `0 0 14px ${glow}, inset 0 0 0 1px ${color}40` : 'none',
        transform: isActive ? 'translateY(-1px)' : 'none',
      }}>
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color, boxShadow: isActive ? `0 0 6px ${color}` : 'none' }} />
        <span className="text-[12px] font-bold" style={{ color: isActive ? color : TEXT }}>{label}</span>
      </div>
      <p className="text-[10px] mt-0.5 ml-4.5 pl-[18px]" style={{ color: isActive ? `${color}CC` : TEXT2 }}>{desc}</p>
    </button>
  );
}

function PriorityMatrix({ impact, urgency }: { impact: Impact; urgency: Urgency }) {
  const impacts: Impact[]  = ['ENTERPRISE', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'];
  const urgencies: Urgency[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const iL: Record<Impact, string>   = { ENTERPRISE: 'ENTE', DEPARTMENT: 'DEPT', TEAM: 'TEAM', INDIVIDUAL: 'INDI' };
  const uL: Record<Urgency, string>  = { CRITICAL: 'CRIT', HIGH: 'HIGH', MEDIUM: 'MED', LOW: 'LOW' };
  const pColor: Record<Priority, string> = { P1: '#FF4D6A', P2: '#FFA726', P3: '#6366f1', P4: '#34D399' };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr style={{ background: SURFACE2, borderBottom: `1px solid ${BORDER}` }}>
            <th className="py-1.5 px-2" style={{ color: TEXT2 }} />
            {urgencies.map(u => (
              <th key={u} className="py-1.5 px-1 text-center font-black"
                style={{ color: urgency === u ? '#6366f1' : TEXT2 }}>
                {uL[u]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {impacts.map(imp => (
            <tr key={imp} style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td className="px-2 py-1 font-black" style={{ background: SURFACE2, color: impact === imp ? '#6366f1' : TEXT2 }}>
                {iL[imp]}
              </td>
              {urgencies.map(urg => {
                const pri = PRIORITY_MATRIX[imp][urg];
                const isActive = imp === impact && urg === urgency;
                return (
                  <td key={urg} className="p-0.5" style={{ background: '#eef2ff' }}>
                    <div className="text-center py-1.5 rounded font-black transition-all duration-300"
                      style={{
                        color: isActive ? '#fff' : pColor[pri],
                        background: isActive ? pColor[pri] : `${pColor[pri]}18`,
                        border: `1px solid ${isActive ? pColor[pri] : `${pColor[pri]}30`}`,
                        boxShadow: isActive ? `0 0 8px ${pColor[pri]}60` : 'none',
                        transform: isActive ? 'scale(1.08)' : 'none',
                      }}>
                      {pri}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IncidentCreate() {
  const navigate = useNavigate();
  const createIncident = useCreateIncident();

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => { const { data } = await api.get('/teams'); return data; },
    staleTime: 60000,
  });
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => { const { data } = await api.get('/assets'); return data; },
    staleTime: 60000,
  });
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => { const { data } = await api.get('/auth/users?limit=200'); return data; },
    staleTime: 60000,
  });

  const teams: { id: string; name: string }[] = teamsData?.data || [];
  const configItems: { id: string; name: string }[] = assetsData?.data || [];
  const users = ((usersData?.data || []) as any[]).map((user) => {
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    const displayName =
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      user.email ||
      user.username ||
      'Unknown user';
    return {
      id: user.id,
      firstName,
      lastName,
      displayName,
    };
  });

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<IncidentFormData>({
    defaultValues: {
      shortDescription: '', description: '',
      impact: 'TEAM', urgency: 'MEDIUM',
      category: '', source: 'MANUAL',
      assignmentGroupId: '', assignedToId: '', configItemId: '',
    },
  });

  const impact   = watch('impact');
  const urgency  = watch('urgency');
  const source   = watch('source');
  const category = watch('category');

  const priority = useMemo<Priority>(() => PRIORITY_MATRIX[impact][urgency], [impact, urgency]);
  const pri = PRIORITY_META[priority];

  const activeStep = useMemo(() => {
    if (dirtyFields.category || dirtyFields.source) return 3;
    if (dirtyFields.impact || dirtyFields.urgency) return 2;
    if (dirtyFields.shortDescription) return 1;
    return 0;
  }, [dirtyFields.shortDescription, dirtyFields.impact, dirtyFields.urgency, dirtyFields.category, dirtyFields.source]);

  const onSubmit = async (data: IncidentFormData) => {
    try {
      await createIncident.mutateAsync({ ...data });
      toast.success('Incident created successfully');
      navigate('/incidents');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to create incident');
    }
  };

  return (
    <>
      <style>{`
        .inc-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 14px;
          color: #0f172a;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .inc-input::placeholder { color: #94a3b8; }
        .inc-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.10);
        }
        .inc-select {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 14px;
          color: #0f172a;
          font-size: 13px;
          outline: none;
          appearance: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .inc-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.10);
        }
        .inc-select option { background: #ffffff; color: #0f172a; }
      `}</style>

      {/* Full-bleed light page -- escape Layout p-6 padding */}
      <div className="-m-6 animate-fade-in" style={{ background: '#eef2ff', minHeight: 'calc(100vh - 56px)' }}>

        {/* ── HERO ── */}
        <div className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)' }}>
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          {/* Glow orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)', filter: 'blur(70px)' }} />

          <div className="relative px-8 py-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-[11px] mb-5">
              <button type="button" onClick={() => navigate('/dashboard')} className="transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>Argus</button>
              <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <button type="button" onClick={() => navigate('/incidents')} className="transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>Incidents</button>
              <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ color: '#fde68a' }} className="font-semibold">Create</span>
            </nav>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => navigate('/incidents')}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <ArrowLeft size={18} style={{ color: '#fde68a' }} />
                </button>
                <div>
                  <h1 className="text-2xl font-black tracking-tight font-display" style={{ color: '#ffffff' }}>
                    New Incident
                  </h1>
                  <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Report a service disruption or issue</p>
                </div>
              </div>

              {/* Live priority badge */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 0 20px rgba(0,0,0,0.15)' }}>
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: pri.color, boxShadow: `0 0 8px ${pri.color}` }} />
                <div>
                  <span className="text-xl font-black font-mono" style={{ color: '#ffffff' }}>{priority}</span>
                  <span className="text-[11px] font-semibold ml-2" style={{ color: 'rgba(255,255,255,0.7)' }}>{pri.label}</span>
                </div>
                <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <div className="flex items-center gap-1"><Clock size={9} /> {pri.slaResponse}</div>
                  <div className="flex items-center gap-1 mt-0.5"><Zap size={9} /> {pri.slaResolution}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Accent divider */}
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #fde68a, transparent)' }} />
        </div>

        {/* ── BODY ── */}
        <div className="max-w-5xl mx-auto px-8 py-8 pb-32 space-y-6">

          {/* Step rail */}
          <StepRail active={activeStep} />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* ── Step 1: Details ── */}
            <SectionCard icon={FileText} title="Incident Details" step={1}>
              <div className="space-y-4">
                <div>
                  <FieldLabel required hint="min 3 chars">Short Description</FieldLabel>
                  <input type="text" placeholder="Brief summary of the incident" className="inc-input"
                    {...register('shortDescription', { required: 'Required', minLength: { value: 3, message: 'Min 3 characters' } })} />
                  {errors.shortDescription && (
                    <p className="mt-1.5 text-[11px] flex items-center gap-1" style={{ color: '#FF4D6A' }}>
                      <AlertTriangle size={11} /> {errors.shortDescription.message}
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel hint="optional">Description</FieldLabel>
                  <textarea rows={4} placeholder="Detailed description, steps to reproduce, affected services..."
                    className="inc-input resize-y" style={{ minHeight: 96 }}
                    {...register('description')} />
                </div>
              </div>
            </SectionCard>

            {/* ── Step 2: Severity ── */}
            <SectionCard icon={Shield} title="Severity Assessment" step={2}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Impact */}
                <div>
                  <FieldLabel>Impact</FieldLabel>
                  <div className="space-y-2">
                    {IMPACTS.map(imp => (
                      <SevCard key={imp.value} label={imp.label} desc={imp.desc}
                        isActive={impact === imp.value} color={imp.color} glow={imp.glow}
                        onClick={() => setValue('impact', imp.value, { shouldDirty: true })} />
                    ))}
                  </div>
                </div>

                {/* Urgency */}
                <div>
                  <FieldLabel>Urgency</FieldLabel>
                  <div className="space-y-2">
                    {URGENCIES.map(urg => (
                      <SevCard key={urg.value} label={urg.label} desc={urg.desc}
                        isActive={urgency === urg.value} color={urg.color} glow={urg.glow}
                        onClick={() => setValue('urgency', urg.value, { shouldDirty: true })} />
                    ))}
                  </div>
                </div>

                {/* Calculated priority + matrix */}
                <div className="space-y-4">
                  <FieldLabel>Calculated Priority</FieldLabel>

                  {/* Priority circle */}
                  <div className="rounded-2xl p-5 text-center transition-all duration-500"
                    style={{ background: pri.bg, border: `1px solid ${pri.color}40`, boxShadow: `0 0 24px ${pri.glow}` }}>
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg,${pri.gradFrom},${pri.gradTo})`, boxShadow: `0 0 20px ${pri.glow}` }}>
                        <span className="text-xl font-black text-white">{priority}</span>
                      </div>
                    </div>
                    <p className="font-bold text-sm" style={{ color: pri.color }}>{pri.label}</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <Clock size={10} style={{ color: pri.color, opacity: 0.7 }} />
                        <span className="text-[10px] font-mono" style={{ color: `${pri.color}BB` }}>Response: {pri.slaResponse}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5">
                        <Zap size={10} style={{ color: pri.color, opacity: 0.7 }} />
                        <span className="text-[10px] font-mono" style={{ color: `${pri.color}BB` }}>Resolution: {pri.slaResolution}</span>
                      </div>
                    </div>
                  </div>

                  {/* Matrix */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-center mb-2" style={{ color: TEXT2 }}>Priority Matrix</p>
                    <PriorityMatrix impact={impact} urgency={urgency} />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ── Step 3: Classification ── */}
            <SectionCard icon={Tag} title="Classification" step={3}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category */}
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => {
                      const CatIcon = cat.icon;
                      const isActive = category === cat.value;
                      return (
                        <button key={cat.value} type="button"
                          onClick={() => setValue('category', isActive ? '' : cat.value, { shouldDirty: true })}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-[11px] font-medium transition-all duration-200"
                          style={{
                            background: isActive ? `${cat.color}15` : SURFACE2,
                            border: `1px solid ${isActive ? cat.color : BORDER}`,
                            boxShadow: isActive ? `0 0 10px ${cat.color}30` : 'none',
                            color: isActive ? cat.color : TEXT2,
                          }}>
                          <CatIcon size={13} style={{ color: isActive ? cat.color : TEXT2, flexShrink: 0 }} />
                          <span className="truncate">{cat.value}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Source */}
                <div>
                  <FieldLabel>Source</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {SOURCES.map(src => {
                      const SrcIcon = src.icon;
                      const isActive = source === src.value;
                      return (
                        <button key={src.value} type="button"
                          onClick={() => setValue('source', src.value, { shouldDirty: true })}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-[11px] font-medium transition-all duration-200"
                          style={{
                            background: isActive ? `${src.color}15` : SURFACE2,
                            border: `1px solid ${isActive ? src.color : BORDER}`,
                            boxShadow: isActive ? `0 0 10px ${src.color}30` : 'none',
                            color: isActive ? src.color : TEXT2,
                          }}>
                          <SrcIcon size={13} style={{ color: isActive ? src.color : TEXT2, flexShrink: 0 }} />
                          <span className="truncate">{src.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ── Step 4: Assignment ── */}
            <SectionCard icon={Users} title="Assignment" step={4}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div>
                  <FieldLabel>Assignment Group</FieldLabel>
                  <select className="inc-select" {...register('assignmentGroupId')}>
                    <option value="">Select a team...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {teams.length === 0 && (
                    <p className="mt-1.5 text-[10px] flex items-center gap-1" style={{ color: TEXT2 }}>
                      <Info size={10} /> No teams available
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel>Assigned To</FieldLabel>
                  <select className="inc-select" {...register('assignedToId')}>
                    <option value="">Select a user...</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                  </select>
                  {users.length === 0 && (
                    <p className="mt-1.5 text-[10px] flex items-center gap-1" style={{ color: TEXT2 }}>
                      <Info size={10} /> No users available
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel>Configuration Item</FieldLabel>
                  <select className="inc-select" {...register('configItemId')}>
                    <option value="">Select a CI / asset...</option>
                    {configItems.map(ci => <option key={ci.id} value={ci.id}>{ci.name}</option>)}
                  </select>
                  {configItems.length === 0 && (
                    <p className="mt-1.5 text-[10px] flex items-center gap-1" style={{ color: TEXT2 }}>
                      <Info size={10} /> No CIs available
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          </form>
        </div>

        {/* ── FLOATING SUBMIT BAR ── */}
        <div className="fixed bottom-0 left-0 right-0 z-50"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e2e8f0' }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-4">
            <button type="button" onClick={() => navigate('/incidents')}
              className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
              style={{ color: '#64748b' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0f172a')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
              <ArrowLeft size={14} /> Cancel
            </button>

            {/* Center priority pill */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl"
              style={{ background: pri.bg, border: `1px solid ${pri.color}30` }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: pri.color, boxShadow: `0 0 6px ${pri.color}` }} />
              <span className="text-[12px] font-bold" style={{ color: pri.color }}>{priority} — {pri.label}</span>
              <div className="w-px h-4" style={{ background: `${pri.color}30` }} />
              <span className="text-[10px] font-mono" style={{ color: `${pri.color}80` }}>{pri.slaResponse} / {pri.slaResolution}</span>
            </div>

            <button type="button" onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || createIncident.isPending}
              className="flex items-center gap-2.5 px-7 py-3 rounded-xl text-[13px] font-bold transition-all duration-200 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#FFFFFF',
                boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
                opacity: (isSubmitting || createIncident.isPending) ? 0.6 : 1,
                cursor: (isSubmitting || createIncident.isPending) ? 'not-allowed' : 'pointer',
              }}>
              {(isSubmitting || createIncident.isPending)
                ? <><Loader2 size={15} className="animate-spin" /> Creating...</>
                : <><Plus size={15} /> Create Incident</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
