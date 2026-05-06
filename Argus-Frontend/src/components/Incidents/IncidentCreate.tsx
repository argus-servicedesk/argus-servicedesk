import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateIncident } from '../../hooks/useIncidents';
import api from '../../lib/api';
import {
  SNCollapsibleSection,
  SNPage,
  SNPillBadge,
  SNReadOnly,
  SNRecordField,
  SNRecordGrid,
  SNRecordHeader,
  sn,
} from '../ITSMTemplates/ServiceNowUI';

type Impact = 'ENTERPRISE' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
type Urgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type Source = 'MANUAL' | 'API' | 'EMAIL' | 'VOICE' | 'SLACK';

interface IncidentFormData {
  shortDescription: string;
  description: string;
  impact: Impact;
  urgency: Urgency;
  category: string;
  subcategory: string;
  source: Source;
  assignmentGroupId: string;
  assignedToId: string;
  configItemId: string;
}

const PRIORITY_MATRIX: Record<Impact, Record<Urgency, Priority>> = {
  ENTERPRISE: { CRITICAL: 'P1', HIGH: 'P1', MEDIUM: 'P2', LOW: 'P3' },
  DEPARTMENT: { CRITICAL: 'P1', HIGH: 'P2', MEDIUM: 'P2', LOW: 'P3' },
  TEAM: { CRITICAL: 'P2', HIGH: 'P2', MEDIUM: 'P3', LOW: 'P4' },
  INDIVIDUAL: { CRITICAL: 'P2', HIGH: 'P3', MEDIUM: 'P4', LOW: 'P4' },
};

const PRIORITY_LABEL: Record<Priority, string> = {
  P1: '1 - CRITICAL',
  P2: '2 - HIGH',
  P3: '3 - MODERATE',
  P4: '4 - LOW',
};

const CATEGORIES = ['Hardware', 'Software', 'Network', 'Database', 'Security', 'Cloud Infrastructure', 'Application', 'Monitoring', 'Access Management', 'Other'];
const IMPACTS: Impact[] = ['ENTERPRISE', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'];
const URGENCIES: Urgency[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const SOURCES: Source[] = ['MANUAL', 'API', 'EMAIL', 'VOICE', 'SLACK'];

function labelize(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function personLabel(user: any): string {
  const firstName = user.firstName || user.first_name || '';
  const lastName = user.lastName || user.last_name || '';
  return [firstName, lastName].filter(Boolean).join(' ').trim() || user.email || user.username || 'Unknown user';
}

function nowForHeader(): string {
  return new Date().toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function IncidentCreate() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const configItems: { id: string; name: string; hostname?: string }[] = assetsData?.data || [];
  const users: any[] = usersData?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IncidentFormData>({
    defaultValues: {
      shortDescription: '',
      description: '',
      impact: 'TEAM',
      urgency: 'MEDIUM',
      category: '',
      subcategory: '',
      source: 'MANUAL',
      assignmentGroupId: '',
      assignedToId: '',
      configItemId: '',
    },
  });

  useEffect(() => {
    const clone = (location.state as { clone?: Partial<IncidentFormData> } | null)?.clone;
    if (!clone) return;
    (Object.entries(clone) as [keyof IncidentFormData, IncidentFormData[keyof IncidentFormData]][]).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0) setValue(key, value);
    });
  }, [location.state, setValue]);

  const impact = watch('impact');
  const urgency = watch('urgency');
  const priority = useMemo<Priority>(() => PRIORITY_MATRIX[impact][urgency], [impact, urgency]);

  const onSubmit = async (data: IncidentFormData) => {
    try {
      await createIncident.mutateAsync({
        ...data,
        priority,
        state: 'NEW',
        assignmentGroupId: data.assignmentGroupId || undefined,
        assignedToId: data.assignedToId || undefined,
        configItemId: data.configItemId || undefined,
        subcategory: data.subcategory || undefined,
      });
      toast.success('Incident created successfully');
      navigate('/incidents');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to create incident');
    }
  };

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', background: '#fff' }}>
      <SNRecordHeader
        number="NEW INCIDENT"
        priorityPill={<SNPillBadge label={PRIORITY_LABEL[priority]} tone={priority === 'P1' ? 'critical' : priority === 'P2' ? 'warn' : 'neutral'} dot />}
        statePill={<SNPillBadge label="NEW" tone="info" />}
        secondaryActions={(
          <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => navigate('/incidents')}>
            <ArrowLeft size={15} />
            Back
          </button>
        )}
        onUpdate={handleSubmit(onSubmit)}
        updateLoading={createIncident.isPending}
        updateLabel="Insert"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <SNCollapsibleSection title="Incident Details">
          <SNRecordGrid>
            <SNRecordField label="Number" required>
              <SNReadOnly>New</SNReadOnly>
            </SNRecordField>
            <SNRecordField label="Opened">
              <SNReadOnly>{nowForHeader()}</SNReadOnly>
            </SNRecordField>

            <SNRecordField label="Requested By" required>
              <SNReadOnly>Monitoring System</SNReadOnly>
            </SNRecordField>
            <SNRecordField label="Category">
              <select className="sn-field" {...register('category')}>
                <option value="">-- None --</option>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Subcategory">
              <input className="sn-field" placeholder="Optional subcategory" {...register('subcategory')} />
            </SNRecordField>
            <SNRecordField label="Source">
              <select className="sn-field" {...register('source')}>
                {SOURCES.map((source) => <option key={source} value={source}>{labelize(source)}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Impact">
              <select className="sn-field" {...register('impact')}>
                {IMPACTS.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Urgency">
              <select className="sn-field" {...register('urgency')}>
                {URGENCIES.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
              </select>
            </SNRecordField>
            
            <SNRecordField label="Assignment Group">
              <select className="sn-field" {...register('assignmentGroupId')}>
                <option value="">-- None --</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </SNRecordField>
            <SNRecordField label="Assigned To">
              <select className="sn-field" {...register('assignedToId')}>
                <option value="">-- None --</option>
                {users.map((user) => <option key={user.id} value={user.id}>{personLabel(user)}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Configuration Item">
              <select className="sn-field" {...register('configItemId')}>
                <option value="">-- None --</option>
                {configItems.map((ci) => <option key={ci.id} value={ci.id}>{ci.hostname || ci.name}</option>)}
              </select>
            </SNRecordField>
            
            <SNRecordField label="Short Description" required fullWidth>
              <div className="w-full">
                <input
                  className="sn-field"
                  placeholder="Brief summary of the incident"
                  style={errors.shortDescription ? { borderColor: sn.critical } : undefined}
                  {...register('shortDescription', { required: 'Short description is required', minLength: { value: 3, message: 'Minimum 3 characters' } })}
                />
                {errors.shortDescription && <div className="mt-2 text-sm font-bold" style={{ color: sn.critical }}>{errors.shortDescription.message}</div>}
              </div>
            </SNRecordField>

            <SNRecordField label="Description" fullWidth tall stack>
              <textarea className="sn-field" placeholder="Detailed incident description" {...register('description')} />
            </SNRecordField>
          </SNRecordGrid>
        </SNCollapsibleSection>

        <div className="flex justify-end border-x border-b px-6 py-4" style={{ borderColor: sn.border, background: '#fff' }}>
          <button type="submit" className="sn-primary-button inline-flex items-center gap-2" disabled={createIncident.isPending}>
            {createIncident.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Insert
          </button>
        </div>
      </form>
    </SNPage>
  );
}
