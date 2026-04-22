import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface BodEodSubItem {
  segment: string;
  isSuccess: boolean;
  status: number;
  detail: string;
}

export interface BodEodItem {
  key: string;
  name: string;
  status: 'UP' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' | 'EDITED';
  statusCode: number;
  message: string;
  type: string;
  executedOn: string;
  data: BodEodSubItem[] | null;
  lastUpdated: string;
}

export interface UrlHealthItem {
  url: string;
  httpStatus: number;
  status: string;
  statusCode: number;
  responseTime: number | null;
  lastChecked: string;
}

export interface BodEodOverview {
  success: boolean;
  data: {
    org: { name: string | null; slug: string | null };
    bod: BodEodItem[];
    eod: BodEodItem[];
    adp: BodEodItem[];
    urlHealth: UrlHealthItem[];
    simulated: boolean;
    needsSetup?: boolean;
    setupMessage?: string;
    lastUpdated: string;
    generatedAt: string;
  };
}

export function useBodEodOverview() {
  return useQuery({
    queryKey: ['bod-eod', 'overview'],
    queryFn: async () => {
      const { data } = await api.get<BodEodOverview>('/bod-eod/overview');
      return data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useBodChecklist() {
  return useQuery({
    queryKey: ['bod-eod', 'bod'],
    queryFn: async () => {
      const { data } = await api.get('/bod-eod/bod');
      return data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useEodChecklist() {
  return useQuery({
    queryKey: ['bod-eod', 'eod'],
    queryFn: async () => {
      const { data } = await api.get('/bod-eod/eod');
      return data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
