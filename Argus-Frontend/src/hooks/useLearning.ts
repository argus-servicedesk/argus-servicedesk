import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import type { LearningEnrollment, LearningSummary, LearningTrack, User } from '../types';

type FilterParams = Record<string, string | number | boolean | undefined | null>;

function paramsFrom(filters: FilterParams = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

function unwrap<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function extractList<T = any>(payload: any): T[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalizeUser(user: any): User {
  return {
    ...user,
    firstName: user.firstName ?? user.first_name ?? '',
    lastName: user.lastName ?? user.last_name ?? '',
    organizationId: user.organizationId ?? user.organization_id ?? null,
    roleNames: user.roleNames ?? user.role_names ?? [],
  };
}

export interface LearningTrackInput {
  title: string;
  audience_role?: string;
  description?: string;
  team_id?: string | null;
  owner_id?: string | null;
  is_active?: boolean;
  modules?: Array<{
    id?: string;
    order: number;
    title: string;
    module_type: string;
    content?: string;
    external_url?: string;
    estimated_minutes?: number;
    is_required?: boolean;
  }>;
}

export interface LearningAssignInput {
  trackId: string;
  user_id: string;
  mentor_id?: string | null;
  due_date?: string | null;
}

export interface LearningModuleProgressInput {
  enrollmentId: string;
  moduleId: string;
  notes?: string;
}

export const learningKeys = {
  all: ['learning'] as const,
  tracks: (filters: FilterParams = {}) => [...learningKeys.all, 'tracks', filters] as const,
  track: (id?: string) => [...learningKeys.all, 'track', id] as const,
  mine: () => [...learningKeys.all, 'mine'] as const,
  enrollments: (filters: FilterParams = {}) => [...learningKeys.all, 'enrollments', filters] as const,
  summary: (filters: FilterParams = {}) => [...learningKeys.all, 'summary', filters] as const,
  users: () => [...learningKeys.all, 'users'] as const,
};

export function useLearningTracks(filters: FilterParams = {}) {
  return useQuery({
    queryKey: learningKeys.tracks(filters),
    queryFn: async () => {
      const query = paramsFrom(filters);
      const { data } = await api.get(`/learning/tracks/${query ? `?${query}` : ''}`);
      return extractList<LearningTrack>(data);
    },
    staleTime: 30000,
  });
}

export function useLearningTrack(id?: string) {
  return useQuery({
    queryKey: learningKeys.track(id),
    queryFn: async () => {
      const { data } = await api.get(`/learning/tracks/${id}/`);
      return unwrap<LearningTrack>(data);
    },
    enabled: Boolean(id),
    staleTime: 30000,
  });
}

export function useMyLearningTracks() {
  return useQuery({
    queryKey: learningKeys.mine(),
    queryFn: async () => {
      const { data } = await api.get('/learning/my-tracks/');
      return extractList<LearningEnrollment>(data);
    },
    staleTime: 15000,
  });
}

export function useLearningEnrollments(filters: FilterParams = {}, enabled = true) {
  return useQuery({
    queryKey: learningKeys.enrollments(filters),
    queryFn: async () => {
      const query = paramsFrom(filters);
      const { data } = await api.get(`/learning/enrollments/${query ? `?${query}` : ''}`);
      return extractList<LearningEnrollment>(data);
    },
    staleTime: 15000,
    enabled,
  });
}

export function useLearningSummary(filters: FilterParams = {}, enabled = true) {
  return useQuery({
    queryKey: learningKeys.summary(filters),
    queryFn: async () => {
      const query = paramsFrom(filters);
      const { data } = await api.get(`/learning/progress-summary/${query ? `?${query}` : ''}`);
      return unwrap<LearningSummary>(data);
    },
    staleTime: 15000,
    enabled,
  });
}

export function useLearningUsers(enabled = true) {
  return useQuery({
    queryKey: learningKeys.users(),
    queryFn: async () => {
      const { data } = await api.get('/auth/users/?limit=200');
      return extractList<any>(data)
        .map(normalizeUser)
        .filter((user) => {
          const roleText = [(user as any).role, ...(user.roleNames ?? [])].join(' ').toLowerCase();
          return !roleText.includes('client') && !roleText.includes('viewer');
        });
    },
    staleTime: 60000,
    enabled,
  });
}

export function useCreateLearningTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LearningTrackInput) => {
      const { data } = await api.post('/learning/tracks/', input);
      return unwrap<LearningTrack>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningKeys.all });
      toast.success('KT track created');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Failed to create KT track');
    },
  });
}

export function useUpdateLearningTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: input }: { id: string; data: LearningTrackInput }) => {
      const { data } = await api.patch(`/learning/tracks/${id}/`, input);
      return unwrap<LearningTrack>(data);
    },
    onSuccess: (track) => {
      qc.invalidateQueries({ queryKey: learningKeys.all });
      qc.invalidateQueries({ queryKey: learningKeys.track(track.id) });
      toast.success('KT track updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Failed to update KT track');
    },
  });
}

export function useAssignLearningTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ trackId, ...input }: LearningAssignInput) => {
      const { data } = await api.post(`/learning/tracks/${trackId}/assign/`, input);
      return unwrap<LearningEnrollment>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningKeys.all });
      toast.success('KT track assigned');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Failed to assign KT track');
    },
  });
}

export function useCompleteLearningModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId, moduleId, notes }: LearningModuleProgressInput) => {
      const { data } = await api.post(`/learning/enrollments/${enrollmentId}/modules/${moduleId}/complete/`, { notes });
      return unwrap(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningKeys.all });
      toast.success('Module completed');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Failed to complete module');
    },
  });
}

export function useReopenLearningModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId, moduleId }: LearningModuleProgressInput) => {
      const { data } = await api.delete(`/learning/enrollments/${enrollmentId}/modules/${moduleId}/complete/`);
      return unwrap(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningKeys.all });
      toast.success('Module marked incomplete');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Failed to update module');
    },
  });
}
