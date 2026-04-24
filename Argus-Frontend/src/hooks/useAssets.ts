import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type FilterParams = Record<string, string | number | boolean | undefined>;
const FIELD_TO_CAMEL: Record<string, string> = {
  serial_number: 'serialNumber',
  asset_tag: 'assetTag',
  rack_position: 'rackPosition',
  data_center: 'dataCenter',
  ip_address: 'ipAddress',
  mac_address: 'macAddress',
  os_version: 'osVersion',
  service_name: 'serviceName',
  management_ip_address: 'managementIpAddress',
  purchase_date: 'purchaseDate',
  warranty_expiry: 'warrantyExpiry',
  end_of_life: 'endOfLife',
  end_of_support: 'endOfSupport',
  purchase_cost: 'purchaseCost',
  monthly_cost: 'monthlyCost',
  cost_center: 'costCenter',
  monitoring_enabled: 'monitoringEnabled',
  prometheus_job: 'prometheusJob',
  grafana_dashboard: 'grafanaDashboard',
  loki_labels: 'lokiLabels',
  health_score: 'healthScore',
  last_seen_at: 'lastSeenAt',
  external_id: 'externalId',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  support_group: 'supportGroup',
  first_name: 'firstName',
  last_name: 'lastName',
  mfa_enabled: 'mfaEnabled',
  is_active: 'isActive',
};

const FIELD_TO_SNAKE: Record<string, string> = {
  serialNumber: 'serial_number',
  assetTag: 'asset_tag',
  rackPosition: 'rack_position',
  dataCenter: 'data_center',
  ipAddress: 'ip_address',
  macAddress: 'mac_address',
  osVersion: 'os_version',
  serviceName: 'service_name',
  managementIpAddress: 'management_ip_address',
  ownerId: 'owner',
  supportGroupId: 'support_group',
  siteId: 'site',
  purchaseDate: 'purchase_date',
  warrantyExpiry: 'warranty_expiry',
  endOfLife: 'end_of_life',
  endOfSupport: 'end_of_support',
  purchaseCost: 'purchase_cost',
  monthlyCost: 'monthly_cost',
  costCenter: 'cost_center',
  monitoringEnabled: 'monitoring_enabled',
  prometheusJob: 'prometheus_job',
  grafanaDashboard: 'grafana_dashboard',
  lokiLabels: 'loki_labels',
  healthScore: 'health_score',
  lastSeenAt: 'last_seen_at',
  externalId: 'external_id',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAssetPayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => normalizeAssetPayload(item)) as T;
  }
  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      FIELD_TO_CAMEL[key] ?? key,
      normalizeAssetPayload(entry),
    ]),
  ) as T;
}

export function denormalizeAssetPayload(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [FIELD_TO_SNAKE[key] ?? key, value]),
  );
}

export function normalizeAssetResponse(response: any): any {
  if ('data' in response) {
    return { ...response, data: normalizeAssetPayload(response.data) };
  }
  return normalizeAssetPayload(response);
}

function buildAssetParams(filters: FilterParams) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.append(key === 'pageSize' ? 'limit' : key, String(value));
    }
  });
  return params;
}

export function useAssets(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ['assets', 'list', filters],
    queryFn: async () => {
      const params = buildAssetParams(filters);
      const { data } = await api.get(`/assets/${params.toString() ? `?${params}` : ''}`);
      return normalizeAssetResponse(data);
    },
    staleTime: 30000,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/assets/${id}/`);
      const normalized = normalizeAssetResponse(data);
      return normalized && 'data' in normalized ? normalized : { data: normalized };
    },
    staleTime: 60000,
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.post('/assets/', denormalizeAssetPayload(input));
      return normalizeAssetResponse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', 'list'] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: input }: { id: string; data: Record<string, unknown> }) => {
      const { data } = await api.patch(`/assets/${id}/`, denormalizeAssetPayload(input));
      return normalizeAssetResponse(data);
    },
    onSuccess: (_, value) => {
      qc.invalidateQueries({ queryKey: ['assets', 'detail', value.id] });
      qc.invalidateQueries({ queryKey: ['assets', 'list'] });
    },
  });
}

export function useAssetLiveMetrics(id: string) {
  return useQuery({
    queryKey: ['assets', 'live-metrics', id],
    queryFn: async () => {
      const { data } = await api.get(`/assets/${id}/live-metrics/`);
      return data;
    },
    staleTime: 15000,
    refetchInterval: 15000,
    enabled: !!id,
  });
}

export function useAssetMetricsHistory(id: string, duration = '6h') {
  return useQuery({
    queryKey: ['assets', 'metrics-history', id, duration],
    queryFn: async () => {
      const { data } = await api.get(`/assets/${id}/metrics-history/`, { params: { duration } });
      return data;
    },
    staleTime: 60000,
    enabled: !!id,
  });
}

export function useAssetStats() {
  return useQuery({
    queryKey: ['assets', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/assets/stats/');
      return normalizeAssetResponse(data);
    },
    staleTime: 60000,
  });
}
