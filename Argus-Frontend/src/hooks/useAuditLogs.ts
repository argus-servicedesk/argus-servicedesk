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

function normalizeAuditLog(entry: any) {
  return {
    ...entry,
    resourceType: entry?.resourceType || entry?.resource_type || entry?.entityType || entry?.entity_type,
    entityType: entry?.entityType || entry?.entity_type || entry?.resource_type,
    entityId: entry?.entityId || entry?.entity_id || entry?.resource_id,
    ipAddress: entry?.ipAddress || entry?.ip_address,
    userAgent: entry?.userAgent || entry?.user_agent,
    createdAt: entry?.createdAt || entry?.created_at,
    changes: entry?.changes || entry?.request_payload,
    newData: entry?.newData || entry?.response_payload,
  };
}

function normalizeAnomaly(entry: any, index: number) {
  return {
    id: entry?.id || `${entry?.type || 'anomaly'}-${index}`,
    type: entry?.type || 'ANOMALY',
    severity: entry?.severity || 'WARNING',
    message: entry?.message || entry?.description || 'Suspicious activity detected',
    detectedAt: entry?.detectedAt || entry?.detected_at || new Date().toISOString(),
  };
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (!value) return;
        params.append(key === 'pageSize' ? 'limit' : key, String(value));
      });
      const query = params.toString();
      const { data } = await api.get(`/audit/logs/${query ? `?${query}` : ''}`);
      return { logs: (data.data || []).map(normalizeAuditLog), pagination: data.pagination };
    },
    placeholderData: (prev) => prev,
  });
}

export function useAuditAnomalies() {
  return useQuery({
    queryKey: ['audit-anomalies'],
    queryFn: async () => {
      const { data } = await api.get('/audit/anomalies/');
      return (data.data?.alerts || []).map(normalizeAnomaly);
    },
    refetchInterval: 60000,
  });
}

export function useAuditResourceTypes() {
  return useQuery({
    queryKey: ['audit-resource-types'],
    queryFn: async () => {
      const { data } = await api.get('/audit/resource-types/');
      return data.data;
    },
  });
}
