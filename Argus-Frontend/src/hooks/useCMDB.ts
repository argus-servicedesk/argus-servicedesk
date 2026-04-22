import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type FilterParams = Record<string, string | number | boolean | undefined>;

// ─── Asset Relationships ────────────────────────────────────────────────────

export function useAssetRelationships(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'relationships'],
    queryFn: async () => { const { data } = await api.get(`/assets/${assetId}/relationships`); return data; },
    staleTime: 30000,
    enabled: !!assetId,
  });
}

export function useCreateRelationship(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post(`/assets/${assetId}/relationships`, input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', assetId, 'relationships'] }),
  });
}

export function useDeleteRelationship(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (relId: string) => { const { data } = await api.delete(`/assets/${assetId}/relationships/${relId}`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', assetId, 'relationships'] }),
  });
}

export function useDependencyMap(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'dependency-map'],
    queryFn: async () => { const { data } = await api.get(`/assets/${assetId}/dependency-map`); return data; },
    staleTime: 60000,
    enabled: !!assetId,
  });
}

// ─── Asset Financials ───────────────────────────────────────────────────────

export function useAssetFinancials(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'financials'],
    queryFn: async () => { const { data } = await api.get(`/assets/${assetId}/financials`); return data; },
    staleTime: 60000,
    enabled: !!assetId,
  });
}

export function useUpsertFinancials(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.put(`/assets/${assetId}/financials`, input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', assetId, 'financials'] }),
  });
}

// ─── Asset Allocations ──────────────────────────────────────────────────────

export function useAssetAllocations(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'allocations'],
    queryFn: async () => { const { data } = await api.get(`/assets/${assetId}/allocations`); return data; },
    staleTime: 30000,
    enabled: !!assetId,
  });
}

export function useCreateAllocation(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post(`/assets/${assetId}/allocations`, input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', assetId, 'allocations'] }),
  });
}

export function useReturnAllocation(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (allocId: string) => { const { data } = await api.post(`/assets/${assetId}/allocations/${allocId}/return`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', assetId, 'allocations'] }),
  });
}

// ─── Asset Disposal ─────────────────────────────────────────────────────────

export function useAssetDisposal(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'disposal'],
    queryFn: async () => { const { data } = await api.get(`/assets/${assetId}/disposal`); return data; },
    staleTime: 60000,
    enabled: !!assetId,
  });
}

export function useCreateDisposal(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post(`/assets/${assetId}/disposal`, input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', assetId, 'disposal'] }),
  });
}

// ─── Asset Movements ────────────────────────────────────────────────────────

export function useAssetMovements(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'movements'],
    queryFn: async () => { const { data } = await api.get(`/assets/${assetId}/movements`); return data; },
    staleTime: 30000,
    enabled: !!assetId,
  });
}

export function useCreateMovement(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post(`/assets/${assetId}/movements`, input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', assetId, 'movements'] }),
  });
}

// ─── Asset Connections ──────────────────────────────────────────────────────

export function useAssetConnections(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'connections'],
    queryFn: async () => { const { data } = await api.get(`/assets/${assetId}/connections`); return data; },
    staleTime: 30000,
    enabled: !!assetId,
  });
}

export function useCreateConnection(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post(`/assets/${assetId}/connections`, input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', assetId, 'connections'] }),
  });
}

// ─── Asset IP Addresses ─────────────────────────────────────────────────────

export function useAssetIPAddresses(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'ip-addresses'],
    queryFn: async () => { const { data } = await api.get(`/assets/${assetId}/ip-addresses`); return data; },
    staleTime: 30000,
    enabled: !!assetId,
  });
}

// ─── Vendors ────────────────────────────────────────────────────────────────

export function useVendors(filters: Record<string, string | number | boolean | undefined> = {}) {
  return useQuery({
    queryKey: ['vendors', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const { data } = await api.get(`/assets/vendors?${params}`);
      return data;
    },
    staleTime: 30000,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post('/assets/vendors', input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => { const { data } = await api.patch(`/assets/vendors/${id}`, d); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { data } = await api.delete(`/assets/vendors/${id}`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}
