import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type FilterParams = Record<string, string | number | boolean | undefined>;

function denormalizeTeam(input: Record<string, unknown>) {
  const output: Record<string, unknown> = { ...input };
  if ('slackChannel' in output) {
    output.slack_channel = output.slackChannel;
    delete output.slackChannel;
  }
  if ('managerId' in output) {
    output.manager_id = output.managerId;
    delete output.managerId;
  }
  if ('memberIds' in output) {
    output.member_ids = output.memberIds;
    delete output.memberIds;
  }
  if ('organizationId' in output) {
    output.organization_id = output.organizationId;
    delete output.organizationId;
  }
  return output;
}

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
      const { data } = await api.get(`/teams/?${params}`);
      return data;
    },
    staleTime: 30000,
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => { const { data } = await api.get(`/teams/${id}/`); return data; },
    staleTime: 60000, enabled: !!id,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post('/teams/', denormalizeTeam(input)); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => { const { data } = await api.patch(`/teams/${id}/`, denormalizeTeam(d)); return data; },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: keys.detail(v.id) }); qc.invalidateQueries({ queryKey: keys.all }); },
  });
}
