import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type FilterParams = Record<string, string | number | boolean | undefined>;

export function useAlerts(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ['alerts', 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const { data } = await api.get(`/alerts?${params}`);
      return data;
    },
    staleTime: 15000,
    refetchInterval: 30000, // Poll every 30s — alerts must stay live even if Socket.IO drops
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { data } = await api.post(`/alerts/${id}/acknowledge`); return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); },
  });
}

export function useSilenceAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { data } = await api.post(`/alerts/${id}/silence`, { duration: 60 }); return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); },
  });
}

export function useCreateIncidentFromAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { data } = await api.post(`/alerts/${id}/create-incident`); return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); qc.invalidateQueries({ queryKey: ['incidents'] }); },
  });
}

export function useAlertStats() {
  return useQuery({
    queryKey: ['alerts', 'stats'],
    queryFn: async () => { const { data } = await api.get('/alerts/stats'); return data; },
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

export function useAlert(id: string | undefined) {
  return useQuery({
    queryKey: ['alerts', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/alerts/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

export function useAlertKB(name: string | undefined) {
  return useQuery({
    queryKey: ['alerts', 'kb', name],
    queryFn: async () => {
      const { data } = await api.get(`/alerts/kb`, { params: { name } });
      return data;
    },
    enabled: !!name,
    staleTime: 60000,
    retry: 1,
  });
}
