import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateChange } from '../../hooks/useChanges';
import { useAuth } from '../../hooks/useAuth';
import { useTeamMembers, useAssignmentPreview } from '../../hooks/useAssignments';
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

type ChangeType = 'NORMAL' | 'STANDARD' | 'EMERGENCY';
type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface ChangeFormData {
  shortDescription: string;
  description: string;
  type: ChangeType;
  riskLevel: RiskLevel;
  category: string;
  assignmentGroupId: string;
  assignedToId: string;
  justification: string;
  implementationPlan: string;
  rollbackPlan: string;
  testPlan: string;
  plannedStartDate: string;
  plannedEndDate: string;
}

const CHANGE_TYPES: ChangeType[] = ['NORMAL', 'STANDARD', 'EMERGENCY'];
const RISK_LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW'];
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Database', 'Security', 'Cloud Infrastructure', 'Application', 'Monitoring', 'Other'];

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

function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toISOString();
}

export default function ChangeCreate() {
  const navigate = useNavigate();
  const createChange = useCreateChange();
  const { user: currentUser } = useAuth();

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => { const { data } = await api.get('/teams'); return data; },
    staleTime: 60000,
  });
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => { const { data } = await api.get('/auth/users?limit=200'); return data; },
    staleTime: 60000,
  });

  const teams: { id: string; name: string }[] = teamsData?.data || [];
  const users: any[] = usersData?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ChangeFormData & { requestedById: string }>({
    defaultValues: {
      shortDescription: '',
      description: '',
      type: 'NORMAL',
      riskLevel: 'LOW',
      category: '',
      assignmentGroupId: '',
      assignedToId: '',
      justification: '',
      implementationPlan: '',
      rollbackPlan: '',
      testPlan: '',
      plannedStartDate: '',
      plannedEndDate: '',
      requestedById: currentUser?.id || '',
    },
  });

  const changeType = watch('type');
  const riskLevel = watch('riskLevel');
  const category = watch('category');
  const assignmentGroupId = watch('assignmentGroupId');
  const { data: teamMembersResponse } = useTeamMembers(assignmentGroupId);
  const teamMembers = teamMembersResponse?.data || [];

  const { data: suggestion } = useAssignmentPreview({ category });

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

  const onSubmit = async (data: any) => {
    const payload: Record<string, unknown> = {
      ...data,
      requested_by: data.requestedById,
      state: 'NEW',
      assignment_group: data.assignmentGroupId || undefined,
      assigned_to: data.assignedToId || undefined,
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

  function personLabel(user: any): string {
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    return [firstName, lastName].filter(Boolean).join(' ').trim() || user.email || user.username || 'Unknown user';
  }

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

            <SNRecordField label="Requested By" required>
              <select className="sn-field" {...register('requestedById', { required: 'Requested by is required' })}>
                <option value="">-- None --</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{personLabel(u)}</option>)}
              </select>
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
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </SNRecordField>
            <SNRecordField label="Assignment Group">
              <select className="sn-field" {...register('assignmentGroupId')}>
                <option value="">-- None --</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
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
              <textarea className="sn-field" placeholder="Detailed description of the proposed change" {...register('description')} />
            </SNRecordField>
            <SNRecordField label="Assigned To">
              <select className="sn-field" {...register('assignedToId')} disabled={!assignmentGroupId}>
                <option value="">-- None --</option>
                {teamMembers.map((user: any) => (
                  <option key={user.id} value={user.id}>{personLabel(user)}</option>
                ))}
              </select>
            </SNRecordField>

            <SNRecordField label="Planned Start">
              <input type="datetime-local" className="sn-field" {...register('plannedStartDate')} />
            </SNRecordField>
            <SNRecordField label="Planned End">
              <input type="datetime-local" className="sn-field" {...register('plannedEndDate')} />
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
