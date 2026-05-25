import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

function normalizeIntegration(item: any) {
  const isActive = Boolean(item?.isActive ?? item?.is_active ?? item?.status === 'ACTIVE');
  return {
    ...item,
    organization: item?.organization,
    organizationId: item?.organizationId || item?.organization_id || item?.organization?.id || '',
    isActive,
    is_active: isActive,
    status: item?.status || (isActive ? 'ACTIVE' : 'INACTIVE'),
    lastSyncAt: item?.lastSyncAt || item?.last_sync_at || item?.updated_at || item?.updatedAt || '',
    createdAt: item?.createdAt || item?.created_at || '',
    updatedAt: item?.updatedAt || item?.updated_at || '',
  };
}

function normalizePayload(payload: any) {
  if (Array.isArray(payload)) return payload.map(normalizeIntegration);
  if (Array.isArray(payload?.data)) return { ...payload, data: payload.data.map(normalizeIntegration) };
  if (Array.isArray(payload?.results)) return { ...payload, results: payload.results.map(normalizeIntegration) };
  return normalizeIntegration(payload);
}

function toApiPayload(input: Record<string, any>) {
  const payload: Record<string, any> = {
    name: input.name,
    type: input.type,
    config: typeof input.config === 'string' ? safeJson(input.config) : (input.config || {}),
    is_active: input.isActive ?? input.is_active ?? input.status === 'ACTIVE',
    organization_id: input.organizationId || input.organization_id,
  };
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === '') delete payload[key];
  });
  return payload;
}

function safeJson(raw: string) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return { raw }; }
}

export function useIntegrations(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['integrations', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const query = params.toString();
      const { data } = await api.get(`/integrations/${query ? `?${query}` : ''}`);
      return normalizePayload(data);
    },
    staleTime: 30000,
  });
}

export function useIntegration(id: string) {
  return useQuery({
    queryKey: ['integrations', 'detail', id],
    queryFn: async () => { const { data } = await api.get(`/integrations/${id}/`); return normalizePayload(data); },
    staleTime: 60000,
    enabled: !!id,
  });
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; type: string; config?: unknown; isActive?: boolean; organizationId?: string }) => {
      const { data } = await api.post('/integrations/', toApiPayload(input));
      return normalizePayload(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useUpdateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, any> }) => {
      const { data } = await api.patch(`/integrations/${id}/`, toApiPayload(d));
      return normalizePayload(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useTestConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/integrations/${id}/test/`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}
