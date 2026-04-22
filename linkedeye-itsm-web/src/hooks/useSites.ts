import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Site {
  id: string;
  name: string;
  code: string;
  organizationId: string;
  location: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  serverIp: string;
  sshPort: number;
  sshUser: string;
  redisHost: string;
  redisPort: number;
  prometheusUrl: string;
  grafanaUrl: string;
  lokiUrl: string;
  isActive: boolean;
  isPrimary: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function useSites() {
  return useQuery({
    queryKey: ['sites', 'list'],
    queryFn: async () => { const { data } = await api.get('/sites'); return data; },
    staleTime: 60000,
  });
}

export function useSite(id: string) {
  return useQuery({
    queryKey: ['sites', 'detail', id],
    queryFn: async () => { const { data } = await api.get(`/sites/${id}`); return data; },
    staleTime: 60000,
    enabled: !!id,
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post('/sites', input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites', 'list'] }),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => { const { data } = await api.patch(`/sites/${id}`, d); return data; },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['sites', 'detail', v.id] }); qc.invalidateQueries({ queryKey: ['sites', 'list'] }); },
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { data } = await api.delete(`/sites/${id}`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites', 'list'] }),
  });
}

export function useTestSiteConnectivity(id: string) {
  return useMutation({
    mutationFn: async () => { const { data } = await api.post(`/sites/${id}/test-connectivity`); return data; },
  });
}
