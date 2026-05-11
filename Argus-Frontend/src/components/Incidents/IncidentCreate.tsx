import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateIncident } from '../../hooks/useIncidents';
import { useTeamMembers, useAssignmentPreview } from '../../hooks/useAssignments';
import { useAuth } from '../../hooks/useAuth';
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
  const { user: currentUser } = useAuth();

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
  } = useForm<IncidentFormData & { requestedById: string }>({
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
      requestedById: currentUser?.id || '',
    },
  });

  useEffect(() => {
    if (currentUser?.id && !watch('requestedById')) {
      setValue('requestedById', currentUser.id);
    }
  }, [currentUser, setValue, watch]);

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

  const category = watch('category');
  const subcategory = watch('subcategory');
  const assignmentGroupId = watch('assignmentGroupId');
  const configItemId = watch('configItemId');

  const { data: teamMembersResponse } = useTeamMembers(assignmentGroupId);
  const teamMembers = teamMembersResponse?.data || [];

  const { data: suggestion } = useAssignmentPreview({
    category,
    subcategory,
    config_item_id: configItemId
  });

  const onSubmit = async (data: any) => {
    try {
      await createIncident.mutateAsync({
        ...data,
        requested_by: data.requestedById,
        priority,
        state: 'NEW',
        assignment_group: data.assignmentGroupId || undefined,
        assigned_to: data.assignedToId || undefined,
        config_item: data.configItemId || undefined,
        subcategory: data.subcategory || undefined,
      });
      toast.success('Incident created successfully');
      navigate('/incidents');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to create incident');
    }
  };

  const applySuggestion = () => {
    if (suggestion?.suggested_group) {
      setValue('assignmentGroupId', suggestion.suggested_group.id);
    }
    if (suggestion?.suggested_user) {
      setValue('assignedToId', suggestion.suggested_user.id);
    }
  };

  // Auto-apply suggestion when category changes
  useEffect(() => {
    if (suggestion?.suggested_group) {
      applySuggestion();
    }
  }, [suggestion]);

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', background: '#fff' }}>
      <SNRecordHeader
        number="NEW INCIDENT"
        priorityPill={<SNPillBadge label={PRIORITY_LABEL[priority]} tone={priority === 'P1' ? 'critical' : priority === 'P2' ? 'warn' : 'neutral'} dot />}
        statePill={<SNPillBadge label="NEW" tone="info" />}
        secondaryActions={(
          <div className="flex gap-2">
            {suggestion?.suggested_group && (
              <button 
                type="button" 
                className="sn-soft-button inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border-indigo-200"
                onClick={applySuggestion}
              >
                💡 Suggest Assignment
              </button>
            )}
            <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => navigate('/incidents')}>
              <ArrowLeft size={15} />
              Back
            </button>
          </div>
        )}
        onUpdate={handleSubmit(onSubmit)}
        updateLoading={createIncident.isPending}
        updateLabel="Insert"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        {suggestion?.suggested_group && (
          <div className="px-6 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-700">
              💡 Assignment Engine suggests: <b>{suggestion.suggested_group.name}</b> 
              {suggestion.suggested_user ? ` → ${suggestion.suggested_user.name}` : ''}
            </span>
            <button type="button" className="text-xs font-bold text-indigo-800 hover:underline" onClick={applySuggestion}>
              Apply Suggestion
            </button>
          </div>
        )}
        <SNCollapsibleSection title="Incident Details">
          <SNRecordGrid>
            <SNRecordField label="Number" required>
              <SNReadOnly>New</SNReadOnly>
            </SNRecordField>
            <SNRecordField label="Opened">
              <SNReadOnly>{nowForHeader()}</SNReadOnly>
            </SNRecordField>

            <SNRecordField label="Requested By" required>
              <select className="sn-field" {...register('requestedById', { required: 'Requested by is required' })}>
                <option value="">-- None --</option>
                {users.map((u) => <option key={u.id} value={u.id}>{personLabel(u)}</option>)}
              </select>
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
              <select className="sn-field" {...register('assignedToId')} disabled={!assignmentGroupId}>
                <option value="">-- None --</option>
                {teamMembers.map((user: any) => (
                  <option key={user.id} value={user.id}>{personLabel(user)}</option>
                ))}
              </select>
              {!assignmentGroupId && <div className="text-[10px] text-gray-400 mt-1">Select group to filter members</div>}
            </SNRecordField>

            <SNRecordField label="Configuration Item">
              <select className="sn-field" {...register('configItemId')}>
                <option value="">-- None --</option>
                {configItems.map((ci) => <option key={ci.id} value={ci.id}>{ci.hostname || ci.name}</option>)}
              </select>
            </SNRecordField>
            <SNRecordField label="Short Description" required>
              <input
                className="sn-field"
                placeholder="Brief summary"
                style={errors.shortDescription ? { borderColor: sn.critical } : undefined}
                {...register('shortDescription', { required: 'Short description is required' })}
              />
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
