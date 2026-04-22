import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type FilterParams = Record<string, string | number | boolean | undefined>;

const keys = {
  all: ['teams'] as const,
  list: (f: FilterParams) => [...keys.all, 'list', f] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export function useTeams(filters: FilterParams = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const { data } = await api.get(`/teams?${params}`);
      return data;
    },
    staleTime: 30000,
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => { const { data } = await api.get(`/teams/${id}`); return data; },
    staleTime: 60000, enabled: !!id,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post('/teams', input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => { const { data } = await api.patch(`/teams/${id}`, d); return data; },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: keys.detail(v.id) }); qc.invalidateQueries({ queryKey: keys.all }); },
  });
}
