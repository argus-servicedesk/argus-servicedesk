import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface SvgTemplate {
  id: string;
  manufacturer: string;
  model: string;
  isStack: boolean;
  category: string;
}

const svgTemplateKeys = {
  all: ['svg-templates'] as const,
  list: () => [...svgTemplateKeys.all, 'list'] as const,
  detail: (id: string) => [...svgTemplateKeys.all, 'detail', id] as const,
};

export function useSvgTemplateList() {
  return useQuery<{ data: SvgTemplate[] }>({
    queryKey: svgTemplateKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/svg-templates');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 min - templates rarely change
  });
}

export function useSvgTemplate(templateId: string | undefined, ip?: string) {
  return useQuery<{ data: { svgContent: string; templateId: string; portStates?: Record<string, unknown> } }>({
    queryKey: svgTemplateKeys.detail(templateId || ''),
    queryFn: async () => {
      const params = ip ? `?ip=${encodeURIComponent(ip)}` : '';
      const { data } = await api.get(`/svg-templates/${templateId}${params}`);
      return data;
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
}
