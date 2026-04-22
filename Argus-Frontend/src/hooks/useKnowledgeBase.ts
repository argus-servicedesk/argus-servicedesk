import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type F = Record<string, string | number | boolean | undefined>;

const keys = {
  all: ['knowledgeBase'] as const,
  categories: () => [...keys.all, 'categories'] as const,
  articles: (f: F) => [...keys.all, 'articles', f] as const,
  published: (f: F) => [...keys.all, 'published', f] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export function useKBCategories() {
  return useQuery({
    queryKey: keys.categories(),
    queryFn: async () => { const { data } = await api.get('/knowledge-base/categories'); return data; },
    staleTime: 60000,
  });
}

export function useKBArticles(filters: F = {}) {
  return useQuery({
    queryKey: keys.articles(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const { data } = await api.get(`/knowledge-base/articles?${params}`);
      return data;
    },
    staleTime: 30000,
  });
}

export function usePublishedKBArticles(filters: F = {}) {
  return useQuery({
    queryKey: keys.published(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const { data } = await api.get(`/knowledge-base/articles/published?${params}`);
      return data;
    },
    staleTime: 30000,
  });
}

export function useKBArticle(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => { const { data } = await api.get(`/knowledge-base/articles/${id}`); return data; },
    staleTime: 60000,
    enabled: !!id,
  });
}

export function useCreateKBCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post('/knowledge-base/categories', input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.categories() }),
  });
}

export function useCreateKBArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post('/knowledge-base/articles', input); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateKBArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => { const { data } = await api.patch(`/knowledge-base/articles/${id}`, d); return data; },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: keys.detail(v.id) }); qc.invalidateQueries({ queryKey: keys.all }); },
  });
}

export function useSubmitKBFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ articleId, helpful, comment }: { articleId: string; helpful: boolean; comment?: string }) => {
      const { data } = await api.post(`/knowledge-base/articles/${articleId}/feedback`, { helpful, comment });
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: keys.detail(v.articleId) }),
  });
}
