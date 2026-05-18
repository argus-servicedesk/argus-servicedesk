import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface IncidentFormData {
  shortDescription: string;
  description: string;
  category: string;
  impact: string;
  urgency: string;
}

const categories = [
  { value: '', label: 'Select a category' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
  { value: 'network', label: 'Network' },
  { value: 'access', label: 'Access' },
  { value: 'other', label: 'Other' },
];

const impactOptions = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'TEAM', label: 'Team' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

const urgencyOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export default function PortalIncidentCreate() {
  const [createdNumber, setCreatedNumber] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IncidentFormData>({
    defaultValues: {
      shortDescription: '',
      description: '',
      category: '',
      impact: 'INDIVIDUAL',
      urgency: 'MEDIUM',
    },
  });

  const createIncident = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const res = await api.post('/incidents/', {
        short_description: data.shortDescription,
        description: data.description,
        category: data.category,
        impact: data.impact,
        urgency: data.urgency,
        source: 'MANUAL',
      });
      return res.data;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      const num = res?.data?.number ?? res?.number ?? 'N/A';
      setCreatedNumber(num);
      toast.success('Issue reported successfully!');
      reset();
    },
    onError: () => {
      toast.error('Failed to report issue. Please try again.');
    },
  });

  const onSubmit = (data: IncidentFormData) => {
    createIncident.mutate(data);
  };

  const selectStyle = {
    borderColor: '#e2e8f0',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  };

  // Success state
  if (createdNumber) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-10 text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: '#d1fae5' }}
        >
          <CheckCircle size={32} style={{ color: '#059669' }} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>
          Issue Reported Successfully!
        </h1>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Your incident has been created with number:
        </p>
        <p
          className="text-lg font-bold"
          style={{ color: '#6366f1' }}
        >
          {createdNumber}
        </p>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Our team will review your issue and get back to you shortly.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/portal"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#6366f1' }}
          >
            <ArrowLeft size={16} />
            Back to Portal
          </Link>
          <button
            onClick={() => setCreatedNumber(null)}
            className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50"
            style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
          >
            Report Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/portal"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          style={{ color: '#6366f1' }}
        >
          <ArrowLeft size={14} />
          Back to Portal
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>
          <AlertTriangle size={24} className="mr-2 inline-block" style={{ color: '#ef4444' }} />
          Report an Issue
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
          Describe the problem you are experiencing and we will get it resolved.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-xl border p-6"
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
      >
        {/* Short Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: '#0f172a' }}>
            Short Description <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="Brief summary of the issue"
            {...register('shortDescription', { required: 'Short description is required' })}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 placeholder:text-slate-400"
            style={selectStyle}
          />
          {errors.shortDescription && (
            <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>
              {errors.shortDescription.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: '#0f172a' }}>
            Description
          </label>
          <textarea
            rows={5}
            placeholder="Provide detailed information about the issue, including steps to reproduce if applicable..."
            {...register('description')}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 placeholder:text-slate-400"
            style={selectStyle}
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: '#0f172a' }}>
            Category
          </label>
          <select
            {...register('category')}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
            style={selectStyle}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Impact + Urgency row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: '#0f172a' }}>
              Impact
            </label>
            <select
              {...register('impact')}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={selectStyle}
            >
              {impactOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: '#0f172a' }}>
              Urgency
            </label>
            <select
              {...register('urgency')}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={selectStyle}
            >
              {urgencyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={createIncident.isPending}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#6366f1' }}
          >
            {createIncident.isPending ? 'Submitting...' : 'Submit Issue'}
          </button>
          <Link
            to="/portal"
            className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50"
            style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
