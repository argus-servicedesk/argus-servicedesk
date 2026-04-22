import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  action?: string;
  resourceType?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
      const { data } = await api.get(`/audit/logs?${params}`);
      return { logs: data.data, pagination: data.pagination };
    },
    placeholderData: (prev) => prev,
  });
}

export function useAuditAnomalies() {
  return useQuery({
    queryKey: ['audit-anomalies'],
    queryFn: async () => {
      const { data } = await api.get('/audit/anomalies');
      return data.data.alerts;
    },
    refetchInterval: 60000,
  });
}

export function useAuditResourceTypes() {
  return useQuery({
    queryKey: ['audit-resource-types'],
    queryFn: async () => {
      const { data } = await api.get('/audit/resource-types');
      return data.data;
    },
  });
}
