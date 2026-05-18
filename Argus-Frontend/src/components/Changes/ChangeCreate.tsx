import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateChange } from '../../hooks/useChanges';
import { useAuth } from '../../hooks/useAuth';
import { useAssignmentPreview } from '../../hooks/useAssignments';
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

type ChangeType = 'NORMAL' | 'STANDARD' | 'EMERGENCY';
type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface ChangeFormData {
  shortDescription: string;
  description: string;
  type: ChangeType;
  riskLevel: RiskLevel;
  category: string;
  subcategory: string;
  assignmentGroupId: string;
  assignedToId: string;
  configItemId: string;
  justification: string;
  implementationPlan: string;
  rollbackPlan: string;
  testPlan: string;
  plannedStartDate: string;
  plannedEndDate: string;
  openedById: string;
}

const CHANGE_TYPES: ChangeType[] = ['NORMAL', 'STANDARD', 'EMERGENCY'];
const RISK_LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW'];
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Database', 'Security', 'Cloud Infrastructure', 'Application', 'Monitoring', 'Other'];
const SUBCATEGORIES = [
  { value: 'server', label: 'Server' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'switch', label: 'Switch' },
  { value: 'software', label: 'Software' },
  { value: 'database', label: 'Database' },
  { value: 'other', label: 'Other' },
];
const CI_TYPE_MAP: Record<string, string> = {
  server: 'SERVER',
  firewall: 'FIREWALL',
  switch: 'SWITCH',
  software: 'SOFTWARE',
  database: 'DATABASE',
};

function labelize(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function personLabel(user: any): string {
  const label = assignmentPersonLabel(user);
  return label === 'Unassigned' ? 'Unknown user' : label;
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

function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toISOString();
}

export default function ChangeCreate() {
  const navigate = useNavigate();
  const createChange = useCreateChange();
  const { user: currentUser, isClient } = useAuth();

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => { const { data } = await api.get('/teams'); return data; },
    staleTime: 60000,
    enabled: !isClient,
  });
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => { const { data } = await api.get('/assets'); return data; },
    staleTime: 60000,
    enabled: !isClient,
  });

  const teams = orderedAssignmentTeams((teamsData?.data || []) as AssignmentRosterTeam[]);
  const configItems: { id: string; name: string; hostname?: string; type: string }[] = assetsData?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ChangeFormData>({
    defaultValues: {
      shortDescription: '',
      description: '',
      type: 'NORMAL',
      riskLevel: 'LOW',
      category: '',
      subcategory: '',
      assignmentGroupId: '',
      assignedToId: '',
      configItemId: '',
      justification: '',
      implementationPlan: '',
      rollbackPlan: '',
      testPlan: '',
      plannedStartDate: '',
      plannedEndDate: '',
      openedById: currentUser?.id || '',
    },
  });

  // Ensure openedById is set when currentUser loads
  useEffect(() => {
    if (currentUser?.id) {
      setValue('openedById', currentUser.id);
    }
  }, [currentUser, setValue]);

  const changeType = watch('type');
  const riskLevel = watch('riskLevel');
  const category = watch('category');
  const subcategory = watch('subcategory');
  const assignmentGroupId = watch('assignmentGroupId');
  const teamMembers = assignableUsersForTeam(teams, assignmentGroupId);

  const { data: suggestion } = useAssignmentPreview({ category }, !isClient);

  const applySuggestion = () => {
    if (suggestion?.suggested_group) {
      setValue('assignmentGroupId', suggestion.suggested_group.id);
    }
    if (suggestion?.suggested_user) {
      setValue('assignedToId', suggestion.suggested_user.id);
    }
  };

  useEffect(() => {
    if (suggestion?.suggested_group) {
      applySuggestion();
    }
  }, [suggestion]);

  // Filter configuration items based on selected subcategory
  const filteredConfigItems = configItems.filter((ci: any) => {
    if (!subcategory || subcategory === 'other') return true;
    return ci.type === CI_TYPE_MAP[subcategory];
  });

  const onSubmit = async (data: any) => {
    const payload: Record<string, unknown> = {
      ...data,
      requested_by: data.openedById,
      state: 'NEW',
      assignment_group: isClient ? undefined : data.assignmentGroupId || undefined,
      assigned_to: isClient ? undefined : data.assignedToId || undefined,
      config_item: isClient ? undefined : data.configItemId || undefined,
      subcategory: isClient ? undefined : data.subcategory || undefined,
      planned_start_date: toIso(data.plannedStartDate),
      planned_end_date: toIso(data.plannedEndDate),
    };

    try {
      await createChange.mutateAsync(payload);
      toast.success('Change request submitted successfully');
      navigate('/changes');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to create change request');
    }
  };

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', background: '#fff' }}>
      <SNRecordHeader
        number="NEW CHANGE"
        priorityPill={<SNPillBadge label={riskLevel === 'HIGH' ? 'HIGH RISK' : `${riskLevel} RISK`} tone={riskLevel === 'HIGH' ? 'critical' : riskLevel === 'MEDIUM' ? 'warn' : 'success'} dot />}
        statePill={<SNPillBadge label="NEW" tone="info" />}
        secondaryActions={(
          <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => navigate('/changes')}>
            <ArrowLeft size={15} />
            Back
          </button>
        )}
        onUpdate={handleSubmit(onSubmit)}
        updateLoading={createChange.isPending}
        updateLabel="Insert"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <SNCollapsibleSection title="Change Request Details">
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
            <SNRecordField label="Change Type">
              <select className="sn-field" {...register('type')}>
                {CHANGE_TYPES.map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Risk Level">
              <select className="sn-field" {...register('riskLevel')}>
                {RISK_LEVELS.map((risk) => <option key={risk} value={risk}>{labelize(risk)}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Category">
              <select className="sn-field" {...register('category')}>
                <option value="">-- None --</option>
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </SNRecordField>

            {!isClient && (
              <SNRecordField label="Subcategory">
                <select className="sn-field" {...register('subcategory')}>
                  <option value="">-- None --</option>
                  {SUBCATEGORIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </SNRecordField>
            )}

            {!isClient && (
              <SNRecordField label="Configuration Item">
                <select className="sn-field" {...register('configItemId')}>
                  <option value="">-- None --</option>
                  {filteredConfigItems.map((ci) => (
                    <option key={ci.id} value={ci.id}>{ci.hostname || ci.name}</option>
                  ))}
                </select>
                {subcategory && subcategory !== 'other' && (
                  <div className="text-[10px] text-gray-400 mt-1">
                    Showing {labelize(subcategory)} items only
                  </div>
                )}
              </SNRecordField>
            )}

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
              <SNRecordField label="Performed by">
                <select className="sn-field" {...register('assignedToId')} disabled={!assignmentGroupId}>
                  <option value="">-- None --</option>
                  {teamMembers.map((user: any) => (
                    <option key={user.id} value={user.id} disabled={Boolean(user.disabled)}>{personLabel(user)}</option>
                  ))}
                </select>
                {!assignmentGroupId && <div className="text-[10px] text-gray-400 mt-1">Select group to filter members</div>}
              </SNRecordField>
            )}

            <SNRecordField label="Planned Start">
              <input type="datetime-local" className="sn-field" {...register('plannedStartDate')} />
            </SNRecordField>
            <SNRecordField label="Planned End">
              <input type="datetime-local" className="sn-field" {...register('plannedEndDate')} />
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
              <textarea className="sn-field" placeholder="Detailed description of the proposed change" {...register('description')} />
            </SNRecordField>
          </SNRecordGrid>
        </SNCollapsibleSection>

        <SNCollapsibleSection title="Planning">
          <SNRecordGrid>
            <SNRecordField label="Justification" fullWidth tall stack>
              <textarea className="sn-field" placeholder="Business reason for this change" {...register('justification')} />
            </SNRecordField>
            <SNRecordField label="Implementation Plan" fullWidth tall stack>
              <textarea className="sn-field" placeholder="Implementation steps" {...register('implementationPlan')} />
            </SNRecordField>
            <SNRecordField label="Rollback Plan" fullWidth tall stack>
              <textarea className="sn-field" placeholder="Rollback steps if the change fails" {...register('rollbackPlan')} />
            </SNRecordField>
            <SNRecordField label="Test Plan" fullWidth tall stack>
              <textarea className="sn-field" placeholder="Validation steps after implementation" {...register('testPlan')} />
            </SNRecordField>
          </SNRecordGrid>
        </SNCollapsibleSection>

        <div className="flex justify-between border-x border-b px-6 py-4" style={{ borderColor: sn.border, background: '#fff' }}>
          <SNReadOnly>Change type: {labelize(changeType)}</SNReadOnly>
          <button type="submit" className="sn-primary-button inline-flex items-center gap-2" disabled={createChange.isPending}>
            {createChange.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Insert
          </button>
        </div>
      </form>
    </SNPage>
  );
}
