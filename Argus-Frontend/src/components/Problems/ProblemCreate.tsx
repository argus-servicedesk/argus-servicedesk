import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateProblem } from '../../hooks/useProblems';
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

type Priority = 'P1' | 'P2' | 'P3' | 'P4';

interface ProblemFormData {
  shortDescription: string;
  description: string;
  priority: Priority;
  category: string;
  assignmentGroupId: string;
  assignedToId: string;
  rootCause: string;
  workaround: string;
}

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];
const PRIORITY_LABEL: Record<Priority, string> = {
  P1: '1 - CRITICAL',
  P2: '2 - HIGH',
  P3: '3 - MODERATE',
  P4: '4 - LOW',
};
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Database', 'Security', 'Cloud Infrastructure', 'Application', 'Monitoring', 'Other'];

function priorityTone(priority: Priority) {
  if (priority === 'P1') return 'critical';
  if (priority === 'P2') return 'warn';
  if (priority === 'P4') return 'success';
  return 'neutral';
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

export default function ProblemCreate() {
  const navigate = useNavigate();
  const createProblem = useCreateProblem();
  const { user: currentUser, isClient } = useAuth();

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => { const { data } = await api.get('/teams/'); return data; },
    staleTime: 60000,
    enabled: !isClient,
  });
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => { const { data } = await api.get('/assets/'); return data; },
    staleTime: 60000,
    enabled: !isClient,
  });

  const teams = orderedAssignmentTeams((teamsData?.data || []) as AssignmentRosterTeam[]);
  const configItems: { id: string; name: string; hostname?: string; type?: string }[] = assetsData?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProblemFormData & { openedById: string; subcategory: string; configItemId: string }>({
    defaultValues: {
      shortDescription: '',
      description: '',
      priority: 'P3',
      category: '',
      assignmentGroupId: '',
      assignedToId: '',
      rootCause: '',
      workaround: '',
      subcategory: '',
      configItemId: '',
      openedById: currentUser?.id || '',
    },
  });

  const selectedPriority = watch('priority');
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

  const onSubmit = async (data: any) => {
    try {
      await createProblem.mutateAsync({
        ...data,
        requested_by: data.openedById,
        state: 'NEW',
        assignment_group: isClient ? undefined : data.assignmentGroupId || undefined,
        assigned_to: isClient ? undefined : data.assignedToId || undefined,
        rootCause: data.rootCause || undefined,
        workaround: data.workaround || undefined,
      });
      toast.success('Problem created successfully');
      navigate('/problems');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to create problem');
    }
  };

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', background: '#fff' }}>
      <SNRecordHeader
        number="NEW PROBLEM"
        priorityPill={<SNPillBadge label={PRIORITY_LABEL[selectedPriority]} tone={priorityTone(selectedPriority)} dot />}
        statePill={<SNPillBadge label="NEW" tone="info" />}
        secondaryActions={(
          <button type="button" className="sn-soft-button inline-flex items-center gap-2" onClick={() => navigate('/problems')}>
            <ArrowLeft size={15} />
            Back
          </button>
        )}
        onUpdate={handleSubmit(onSubmit)}
        updateLoading={createProblem.isPending}
        updateLabel="Insert"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <SNCollapsibleSection title="Problem Details">
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
              <SNRecordField label="Priority Level">
              <select className="sn-field" {...register('priority')}>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABEL[priority]}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Category">
              <select className="sn-field" {...register('category')}>
                <option value="">-- None --</option>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
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
            <SNRecordField label="Short Description" required>
              <input
                className="sn-field"
                placeholder="Brief summary"
                style={errors.shortDescription ? { borderColor: sn.critical } : undefined}
                {...register('shortDescription', { required: 'Short description is required' })}
              />
            </SNRecordField>

            <SNRecordField label="Description" fullWidth tall stack>
              <textarea className="sn-field" placeholder="Detailed problem description" {...register('description')} />
            </SNRecordField>
            {!isClient && (
              <SNRecordField label="Configuration Item">
                <select className="sn-field" {...register('configItemId')}>
                  <option value="">-- None --</option>
                  {configItems
                    .filter((ci: any) => {
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
                    .map((ci: any) => <option key={ci.id} value={ci.id}>{ci.hostname || ci.name}</option>)}
                </select>
              </SNRecordField>
            )}
    
            {!isClient && (
              <SNRecordField label="Assigned To">
                <select className="sn-field" {...register('assignedToId')} disabled={!assignmentGroupId}>
                  <option value="">-- None --</option>
                  {teamMembers.map((user: any) => (
                    <option key={user.id} value={user.id} disabled={Boolean(user.disabled)}>{personLabel(user)}</option>
                  ))}
                </select>
                {!assignmentGroupId && <div className="text-[10px] text-gray-400 mt-1">Select group to filter members</div>}
              </SNRecordField>
            )}

          </SNRecordGrid>
        </SNCollapsibleSection>

        <SNCollapsibleSection title="Root Cause Analysis">
          <SNRecordGrid>
            <SNRecordField label="Root Cause" fullWidth tall stack>
              <textarea className="sn-field" placeholder="Initial root cause hypothesis" {...register('rootCause')} />
            </SNRecordField>
            <SNRecordField label="Workaround" fullWidth tall stack>
              <textarea className="sn-field" placeholder="Known workaround, if available" {...register('workaround')} />
            </SNRecordField>
          </SNRecordGrid>
        </SNCollapsibleSection>

        <div className="flex justify-end border-x border-b px-6 py-4" style={{ borderColor: sn.border, background: '#fff' }}>
          <button type="submit" className="sn-primary-button inline-flex items-center gap-2" disabled={createProblem.isPending}>
            {createProblem.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Insert
          </button>
        </div>
      </form>
    </SNPage>
  );
}
