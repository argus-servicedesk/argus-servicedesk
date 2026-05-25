import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateIncident } from '../../hooks/useIncidents';
import { useAssignmentPreview } from '../../hooks/useAssignments';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import {
  assignableUsersForTeam,
  assignmentPersonLabel,
  orderedAssignmentTeams,
  type AssignmentRosterTeam,
} from '../../utils/assignmentRoster';
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
  parentId: string;
  organizationId: string;
}

type IncidentFormValues = IncidentFormData & {
  openedById: string;
  siteId: string;
  location: string;
};

type ConfigItemOption = {
  id: string;
  name: string;
  hostname?: string;
  type?: string;
};

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
const LOCATIONS = ['Bangalore', 'Mumbai', 'Navi Mumbai', 'Chennai', 'GIFT City', 'Kolkata'];

function labelize(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function personLabel(user: unknown): string {
  const label = assignmentPersonLabel(user);
  return label === 'Unassigned' ? 'Unknown user' : label;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: string;
      response?: { data?: { error?: string; message?: string } };
    };
    return candidate.response?.data?.error || candidate.response?.data?.message || candidate.message || fallback;
  }
  return fallback;
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
  const { user: currentUser, isClient } = useAuth();

  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => { const { data } = await api.get('/assets'); return data; },
    staleTime: 60000,
    enabled: Boolean(currentUser),
  });
  const { data: organizationsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => { const { data } = await api.get('/organizations/'); return data; },
    staleTime: 60000,
    enabled: Boolean(currentUser),
  });

  const configItems: ConfigItemOption[] = assetsData?.data || [];
  const organizationsFromApi: { id: string; name: string }[] = Array.isArray(organizationsData)
    ? organizationsData
    : organizationsData?.data || [];
  const currentOrganization =
    currentUser?.organization && typeof currentUser.organization === 'object' && currentUser.organization.id
      ? { id: currentUser.organization.id, name: currentUser.organization.name || 'Current client' }
      : null;
  const organizations = organizationsFromApi.length > 0
    ? organizationsFromApi
    : currentOrganization
      ? [currentOrganization]
      : [];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<IncidentFormValues>({
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
      openedById: currentUser?.id || '',
      siteId: '',
      location: '',
      parentId: '',
      organizationId: currentUser?.organizationId || '',
    },
  });

  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => { const { data } = await api.get('/assets/sites'); return data; },
    staleTime: 60000,
    enabled: Boolean(currentUser),
  });
  const sites: { id: string; name: string }[] = sitesData?.data || [];

  useEffect(() => {
    if (currentUser?.id) {
      setValue('openedById', currentUser.id);
    }
  }, [currentUser?.id, setValue]);

  useEffect(() => {
    const clone = (location.state as { clone?: Partial<IncidentFormData> } | null)?.clone;
    if (!clone) return;
    (Object.entries(clone) as [keyof IncidentFormData, IncidentFormData[keyof IncidentFormData]][]).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0) setValue(key, value);
    });
  }, [location.state, setValue]);

  const impact = useWatch({ control, name: 'impact' }) ?? 'TEAM';
  const urgency = useWatch({ control, name: 'urgency' }) ?? 'MEDIUM';
  const priority = useMemo<Priority>(() => PRIORITY_MATRIX[impact][urgency], [impact, urgency]);

  const category = useWatch({ control, name: 'category' }) ?? '';
  const subcategory = useWatch({ control, name: 'subcategory' }) ?? '';
  const assignmentGroupId = useWatch({ control, name: 'assignmentGroupId' }) ?? '';
  const selectedOrganizationId = useWatch({ control, name: 'organizationId' }) ?? currentUser?.organizationId ?? '';
  const configItemId = useWatch({ control, name: 'configItemId' }) ?? '';

  const { data: teamsData } = useQuery({
    queryKey: ['teams', 'incident-create-assignment', selectedOrganizationId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200', is_active: 'true' });
      if (selectedOrganizationId) params.set('organization', selectedOrganizationId);
      const { data } = await api.get(`/teams/?${params}`);
      return data;
    },
    staleTime: 60000,
    enabled: Boolean(currentUser) && !isClient,
  });

  const teams = orderedAssignmentTeams((teamsData?.data || []) as AssignmentRosterTeam[]);
  const teamMembers = assignableUsersForTeam(teams, assignmentGroupId);

  const { data: suggestion } = useAssignmentPreview({
    category,
    subcategory,
    config_item_id: configItemId || undefined
  }, true);

  const parentId = useWatch({ control, name: 'parentId' }) ?? '';

  const onSubmit = async (data: IncidentFormValues) => {
    try {
      await createIncident.mutateAsync({
        ...data,
        assignmentGroupId: isClient ? undefined : data.assignmentGroupId || undefined,
        assignedToId: isClient ? undefined : data.assignedToId || undefined,
        source: data.source,
        requested_by: data.openedById,
        priority,
        state: 'NEW',
        assignment_group: isClient ? undefined : data.assignmentGroupId || undefined,
        assigned_to: isClient ? undefined : data.assignedToId || undefined,
        config_item: data.configItemId || undefined,
        subcategory: data.subcategory || undefined,
        site: data.siteId || undefined,
        location: data.location || undefined,
        parent: data.parentId || undefined,
        organizationId: data.organizationId || undefined,
      });
      toast.success('Incident created successfully');
      navigate('/incidents');
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to create incident'));
    }
  };

  const applySuggestion = () => {
    if (suggestion?.suggested_group) {
      setValue('assignmentGroupId', suggestion.suggested_group.id);
    }
    if (!isClient && suggestion?.suggested_user) {
      setValue('assignedToId', suggestion.suggested_user.id);
    }
  };

  // Auto-apply suggestion when category changes
  useEffect(() => {
    if (suggestion?.suggested_group) {
      setValue('assignmentGroupId', suggestion.suggested_group.id);
    }
    if (!isClient && suggestion?.suggested_user) {
      setValue('assignedToId', suggestion.suggested_user.id);
    }
    if (isClient) {
      setValue('assignedToId', '');
    }
  }, [isClient, suggestion, setValue]);

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
        {parentId && (
          <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-700">
              ↳ Creating child incident under parent: <strong>{parentId}</strong>
            </span>
            <input type="hidden" {...register('parentId')} />
          </div>
        )}
        {suggestion?.suggested_group && (
          <div className="px-6 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-700">
              💡 Assignment Engine suggests: <b>{suggestion.suggested_group.name}</b> 
              {!isClient && suggestion.suggested_user ? ` → ${suggestion.suggested_user.name}` : ''}
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

            <SNRecordField label="Opened By">
              <SNReadOnly>{personLabel(currentUser)}</SNReadOnly>
              <input type="hidden" {...register('openedById')} />
            </SNRecordField>
            <SNRecordField label="Client" required>
              <select className="sn-field" {...register('organizationId', { required: 'Client is required' })}>
                <option value="">-- Select client --</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </SNRecordField>
            <SNRecordField label="Category">
              <select className="sn-field" {...register('category')}>
                <option value="">-- None --</option>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Subcategory">
              <select className="sn-field" {...register('subcategory')}>
                <option value="">-- None --</option>
                <option value="server">Server</option>
                <option value="firewall">Firewall</option>
                <option value="switch">Switch</option>
                <option value="software">Software</option>
                <option value="database">Database</option>
                <option value="other">Other</option>
              </select>
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
            
            {!isClient && (
              <SNRecordField label="Assignment Group">
                <select
                  className="sn-field"
                  {...register('assignmentGroupId', {
                    onChange: () => setValue('assignedToId', ''),
                  })}
                >
                  <option value="">-- None --</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </SNRecordField>
            )}
            {!isClient && (
              <SNRecordField label="Assigned To">
                <select className="sn-field" {...register('assignedToId')} disabled={!assignmentGroupId}>
                  <option value="">-- None --</option>
                  {teamMembers.map((user) => (
                    <option key={user.id} value={user.id} disabled={Boolean(user.disabled)}>{personLabel(user)}</option>
                  ))}
                </select>
                {!assignmentGroupId && <div className="text-[10px] text-gray-400 mt-1">Select group to filter members</div>}
              </SNRecordField>
            )}

            <SNRecordField label="Site">
              <select className="sn-field" {...register('siteId')}>
                <option value="">-- None --</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </SNRecordField>
            <SNRecordField label="Location">
              <select className="sn-field" {...register('location')}>
                <option value="">-- None --</option>
                {LOCATIONS.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </SNRecordField>

            <SNRecordField label="Configuration Item">
              <select className="sn-field" {...register('configItemId')}>
                <option value="">-- None --</option>
                {configItems
                  .filter((ci) => {
                    if (!subcategory || subcategory === 'other') return true;
                    const typeMap: Record<string, string> = {
                      'server': 'SERVER',
                      'firewall': 'FIREWALL',
                      'switch': 'SWITCH',
                      'software': 'SOFTWARE',
                      'database': 'DATABASE'
                    };
                    return ci.type === typeMap[subcategory];
                  })
                  .map((ci) => <option key={ci.id} value={ci.id}>{ci.hostname || ci.name}</option>)}
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
