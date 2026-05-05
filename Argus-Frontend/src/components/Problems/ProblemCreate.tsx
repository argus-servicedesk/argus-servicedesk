import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateProblem } from '../../hooks/useProblems';
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

type Priority = 'P1' | 'P2' | 'P3' | 'P4';

interface ProblemFormData {
  shortDescription: string;
  description: string;
  priority: Priority;
  category: string;
  assignmentGroupId: string;
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

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => { const { data } = await api.get('/teams'); return data; },
    staleTime: 60000,
  });

  const teams: { id: string; name: string }[] = teamsData?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProblemFormData>({
    defaultValues: {
      shortDescription: '',
      description: '',
      priority: 'P3',
      category: '',
      assignmentGroupId: '',
      rootCause: '',
      workaround: '',
    },
  });

  const selectedPriority = watch('priority');

  const onSubmit = async (data: ProblemFormData) => {
    try {
      await createProblem.mutateAsync({
        ...data,
        state: 'NEW',
        assignmentGroupId: data.assignmentGroupId || undefined,
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

            <SNRecordField label="Requested By" required>
              <SNReadOnly>Current User</SNReadOnly>
            </SNRecordField>
            <SNRecordField label="Category">
              <select className="sn-field" {...register('category')}>
                <option value="">-- None --</option>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Priority Level">
              <select className="sn-field" {...register('priority')}>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABEL[priority]}</option>)}
              </select>
            </SNRecordField>

            <SNRecordField label="Assignment Group">
              <select className="sn-field" {...register('assignmentGroupId')}>
                <option value="">-- None --</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </SNRecordField>
            <SNRecordField label="Known Error">
              <SNReadOnly>No</SNReadOnly>
            </SNRecordField>

            <SNRecordField label="Short Description" required fullWidth>
              <div className="w-full">
                <input
                  className="sn-field"
                  placeholder="Brief summary of the problem"
                  style={errors.shortDescription ? { borderColor: sn.critical } : undefined}
                  {...register('shortDescription', { required: 'Short description is required', minLength: { value: 3, message: 'Minimum 3 characters' } })}
                />
                {errors.shortDescription && <div className="mt-2 text-sm font-bold" style={{ color: sn.critical }}>{errors.shortDescription.message}</div>}
              </div>
            </SNRecordField>

            <SNRecordField label="Description" fullWidth tall stack>
              <textarea className="sn-field" placeholder="Detailed problem description" {...register('description')} />
            </SNRecordField>
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
