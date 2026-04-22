import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, GitBranch, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useCreateChange } from '../../hooks/useChanges';
import api from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type ChangeType = 'NORMAL' | 'STANDARD' | 'EMERGENCY';
type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface ChangeFormData {
  shortDescription: string;
  description: string;
  type: ChangeType;
  riskLevel: RiskLevel;
  category: string;
  assignmentGroupId: string;
  justification: string;
  implementationPlan: string;
  rollbackPlan: string;
  testPlan: string;
  plannedStartDate: string;
  plannedEndDate: string;
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const CHANGE_TYPES: { value: ChangeType; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'EMERGENCY', label: 'Emergency' },
];

const RISK_LEVELS: { value: RiskLevel; label: string }[] = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
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

export default function ChangeCreate() {
  const navigate = useNavigate();
  const createChange = useCreateChange();

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
    formState: { errors, isSubmitting },
  } = useForm<ChangeFormData>({
    defaultValues: {
      shortDescription: '',
      description: '',
      type: 'NORMAL',
      riskLevel: 'MEDIUM',
      category: '',
      assignmentGroupId: '',
      justification: '',
      implementationPlan: '',
      rollbackPlan: '',
      testPlan: '',
      plannedStartDate: '',
      plannedEndDate: '',
    },
  });

  const onSubmit = async (data: ChangeFormData) => {
    const payload: Record<string, any> = {
      ...data,
      state: 'NEW',
    };

    // Convert datetime-local strings to ISO format if provided
    if (data.plannedStartDate) {
      payload.plannedStartDate = new Date(data.plannedStartDate).toISOString();
    } else {
      delete payload.plannedStartDate;
    }
    if (data.plannedEndDate) {
      payload.plannedEndDate = new Date(data.plannedEndDate).toISOString();
    } else {
      delete payload.plannedEndDate;
    }

    // Remove empty optional strings
    if (!data.assignmentGroupId) delete payload.assignmentGroupId;

    try {
      await createChange.mutateAsync(payload);
      toast.success('Change request submitted successfully');
      navigate('/changes');
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create change request';
      toast.error(message);
    }
  };

  return (
    <>
      <style>{`
        .chg-input {
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
        .chg-input::placeholder { color: #94a3b8; }
        .chg-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.10);
        }
        .chg-select {
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
        .chg-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.10);
        }
        .chg-select option { background: #ffffff; color: #0f172a; }
      `}</style>

      <div className="-m-6 animate-fade-in" style={{ background: '#eef2ff', minHeight: 'calc(100vh - 56px)' }}>

        {/* ── HERO BANNER ── */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' }}>
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          {/* Glow orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />

          <div className="relative px-8 py-6">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => navigate('/changes')} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
                <ArrowLeft size={14} /> Changes
              </button>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
              <span style={{ color: '#c4b5fd' }} className="text-sm">Create</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <GitBranch size={20} style={{ color: '#c4b5fd' }} />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold" style={{ color: '#ffffff' }}>Create New Change</h1>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Submit a change request for review and approval</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8, #c4b5fd, transparent)' }} />
        </div>

        {/* Form card */}
        <div className="max-w-3xl mx-auto px-8 py-8 pb-32">
          <div className="rounded-xl p-6 md:p-8" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Row 1: Short Description (full width) */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Short Description <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of the change request"
                  className={clsx('chg-input', errors.shortDescription && '!border-[#EF4444]/60')}
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

              {/* Row 2: Description (full width textarea) */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed description of the proposed change, affected systems, and scope..."
                  className="chg-input resize-y"
                  style={{ minHeight: 100 }}
                  {...register('description')}
                />
              </div>

              {/* Row 3: Type | Risk Level | Category (3-col grid) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Type
                  </label>
                  <select className="chg-select" {...register('type')}>
                    {CHANGE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Risk Level
                  </label>
                  <select className="chg-select" {...register('riskLevel')}>
                    {RISK_LEVELS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Category
                  </label>
                  <select className="chg-select" {...register('category')}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Assignment Group (full width) */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Assignment Group
                </label>
                <select className="chg-select" {...register('assignmentGroupId')}>
                  <option value="">Select team...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 5: Justification (full width textarea) */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Justification
                </label>
                <textarea
                  rows={3}
                  placeholder="Why is this change needed? Business impact, risk of not implementing..."
                  className="chg-input resize-y"
                  style={{ minHeight: 80 }}
                  {...register('justification')}
                />
              </div>

              {/* Row 6: Implementation Plan | Rollback Plan (2-col grid, textareas) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Implementation Plan
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Step-by-step implementation procedure..."
                    className="chg-input resize-y"
                    style={{ minHeight: 100 }}
                    {...register('implementationPlan')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Rollback Plan
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Steps to revert the change if issues arise..."
                    className="chg-input resize-y"
                    style={{ minHeight: 100 }}
                    {...register('rollbackPlan')}
                  />
                </div>
              </div>

              {/* Row 7: Test Plan (full width textarea) */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                  Test Plan
                </label>
                <textarea
                  rows={3}
                  placeholder="How will the change be validated? Test cases, acceptance criteria..."
                  className="chg-input resize-y"
                  style={{ minHeight: 80 }}
                  {...register('testPlan')}
                />
              </div>

              {/* Row 8: Planned Start Date | Planned End Date (2-col grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Planned Start Date
                  </label>
                  <input
                    type="datetime-local"
                    className="chg-input"
                    {...register('plannedStartDate')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#64748b' }}>
                    Planned End Date
                  </label>
                  <input
                    type="datetime-local"
                    className="chg-input"
                    {...register('plannedEndDate')}
                  />
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e2e8f0' }} />

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/changes')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.12)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createChange.isPending}
                  className={clsx(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95',
                    (isSubmitting || createChange.isPending) && 'opacity-60 cursor-not-allowed',
                  )}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
                  }}
                >
                  {(isSubmitting || createChange.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSubmitting || createChange.isPending ? 'Submitting...' : 'Submit Change Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
