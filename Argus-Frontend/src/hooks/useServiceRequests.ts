import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type F = Record<string, string | number | boolean | undefined>;

const keys = {
  all: ['serviceRequests'] as const,
  list: (f: F) => [...keys.all, 'list', f] as const,
  my: (f: F) => [...keys.all, 'my', f] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export function useServiceRequests(filters: F = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const query = params.toString();
      const { data } = await api.get(`/service-requests/${query ? `?${query}` : ''}`);
      return data;
    },
    staleTime: 30000,
  });
}

export function useMyServiceRequests(filters: F = {}) {
  return useQuery({
    queryKey: keys.my(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const query = params.toString();
      const { data } = await api.get(`/service-requests/my/${query ? `?${query}` : ''}`);
      return data;
    },
    staleTime: 30000,
  });
}

export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => { const { data } = await api.get(`/service-requests/${id}/`); return data; },
    staleTime: 60000,
    enabled: !!id,
  });
}

export function useCreateServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post('/service-requests/', input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => { const { data } = await api.patch(`/service-requests/${id}/`, d); return data; },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: keys.detail(v.id) }); qc.invalidateQueries({ queryKey: keys.all }); },
  });
}

export function useApproveServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { data } = await api.post(`/service-requests/${id}/approve/`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRejectServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => { const { data } = await api.post(`/service-requests/${id}/reject/`, { reason }); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
