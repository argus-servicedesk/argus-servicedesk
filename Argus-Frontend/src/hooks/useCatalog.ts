import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type F = Record<string, string | number | boolean | undefined>;

const keys = {
  all: ['catalog'] as const,
  categories: () => [...keys.all, 'categories'] as const,
  items: (f: F) => [...keys.all, 'items', f] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export function useCatalogCategories() {
  return useQuery({
    queryKey: keys.categories(),
    queryFn: async () => { const { data } = await api.get('/catalog/categories/'); return data; },
    staleTime: 60000,
  });
}

export function useCatalogItems(filters: F = {}) {
  return useQuery({
    queryKey: keys.items(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const query = params.toString();
      const { data } = await api.get(`/catalog/items/${query ? `?${query}` : ''}`);
      return data;
    },
    staleTime: 30000,
  });
}

export function useCatalogItem(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => { const { data } = await api.get(`/catalog/items/${id}/`); return data; },
    staleTime: 60000,
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post('/catalog/categories/', input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.categories() }),
  });
}

export function useCreateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post('/catalog/items/', input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => { const { data } = await api.patch(`/catalog/items/${id}/`, d); return data; },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: keys.detail(v.id) }); qc.invalidateQueries({ queryKey: keys.all }); },
  });
}
