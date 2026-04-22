import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Bug, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useCreateProblem } from '../../hooks/useProblems';
import api from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'P1' | 'P2' | 'P3' | 'P4';

interface FormData {
  shortDescription: string;
  description: string;
  priority: Priority;
  category: string;
  assignmentGroupId: string;
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const PRIORITIES: { value: Priority; label: string; color: string; bg: string; border: string }[] = [
  { value: 'P1', label: 'P1 - Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.30)' },
  { value: 'P2', label: 'P2 - High', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)' },
  { value: 'P3', label: 'P3 - Medium', color: '#6366f1', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.30)' },
  { value: 'P4', label: 'P4 - Low', color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)' },
];

const CATEGORIES = [
  'Hardware',
  'Software',
  'Network',
  'Database',
  'Security',
  'Cloud Infrastructure',
  'Application',
  'Monitoring',
  'Other',
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProblemCreate() {
  const navigate = useNavigate();
  const createProblem = useCreateProblem();

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
      shortDescription: '',
      description: '',
      priority: 'P3',
      category: '',
      assignmentGroupId: '',
    },
  });

  const selectedPriority = watch('priority');
  const priMeta = PRIORITIES.find(p => p.value === selectedPriority) || PRIORITIES[2];

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      state: 'NEW',
    };
    try {
      await createProblem.mutateAsync(payload);
      toast.success('Problem created successfully');
      navigate('/problems');
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create problem';
      toast.error(message);
    }
  };

  return (
    <>
      <style>{`
        .prb-input {
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
        .prb-input::placeholder { color: #94a3b8; }
        .prb-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.10);
        }
        .prb-select {
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
        .prb-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.10);
        }
        .prb-select option { background: #ffffff; color: #0f172a; }
      `}</style>

      <div className="-m-6 animate-fade-in" style={{ background: '#eef2ff', minHeight: 'calc(100vh - 56px)' }}>

        {/* ── HERO BANNER ── */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #6d28d9 100%)' }}>
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          {/* Glow orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />

          <div className="relative px-8 py-6">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => navigate('/problems')} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
                <ArrowLeft size={14} /> Problems
              </button>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
              <span style={{ color: '#ddd6fe' }} className="text-sm">Create</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Bug size={20} style={{ color: '#ddd6fe' }} />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold" style={{ color: '#ffffff' }}>Create New Problem</h1>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Document and track a root cause investigation</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #ddd6fe, transparent)' }} />
        </div>

        {/* Form card */}
        <div className="max-w-3xl mx-auto px-8 py-8 pb-32">
          <div className="rounded-xl p-6 md:p-8" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Short Description <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of the problem"
                  className={clsx('prb-input', errors.shortDescription && '!border-[#EF4444]/60')}
                  {...register('shortDescription', {
                    required: 'Short description is required',
                    minLength: { value: 3, message: 'Minimum 3 characters' },
                  })}
                />
                {errors.shortDescription && (
                  <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>
                    {errors.shortDescription.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed description of the problem, root cause hypothesis, affected services..."
                  className="prb-input resize-y"
                  style={{ minHeight: 100 }}
                  {...register('description')}
                />
              </div>

              {/* Priority + Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Priority
                  </label>
                  <select className="prb-select" {...register('priority')}>
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg"
                      style={{ background: priMeta.bg, color: priMeta.color, border: `1px solid ${priMeta.border}` }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: priMeta.color }} />
                      {priMeta.label}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Category
                  </label>
                  <select className="prb-select" {...register('category')}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignment Group */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Assignment Group
                </label>
                <select className="prb-select" {...register('assignmentGroupId')}>
                  <option value="">Select team...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e2e8f0' }} />

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/problems')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.12)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createProblem.isPending}
                  className={clsx(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95',
                    (isSubmitting || createProblem.isPending) && 'opacity-60 cursor-not-allowed',
                  )}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
                  }}
                >
                  {(isSubmitting || createProblem.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSubmitting || createProblem.isPending ? 'Creating...' : 'Create Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
