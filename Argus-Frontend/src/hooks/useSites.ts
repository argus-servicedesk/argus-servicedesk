import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Site {
  id: string;
  organization?: { id: string; name: string; slug?: string };
  organizationId?: string;
  name: string;
  code: string;
  slug?: string;
  environment?: string;
  location: string;
  state: string;
  country: string;
  entityHost?: string;
  entityPort?: number | string;
  entitySecure?: boolean;
  websocketHost?: string;
  websocketPort?: number | string;
  websocketSecure?: boolean;
  serverIp: string;
  sshPort: number;
  redisHost: string;
  prometheusUrl: string;
  grafanaUrl: string;
  redmineUrl?: string;
  incidentUrl?: string;
  status?: string;
  lokiUrl: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const SITE_ENDPOINT = '/assets/sites/';

function normalizeSite(site: any): Site {
  const status = site?.status || 'ACTIVE';
  return {
    ...site,
    id: String(site?.id || ''),
    organization: site?.organization,
    organizationId: site?.organizationId || site?.organization_id || site?.organization?.id || '',
    name: site?.name || '',
    slug: site?.slug || site?.code || '',
    code: site?.code || site?.slug || '',
    location: site?.location || '',
    state: site?.state || '',
    country: site?.country || '',
    entityHost: site?.entityHost || site?.entity_host || '',
    entityPort: site?.entityPort || site?.entity_port || '',
    entitySecure: Boolean(site?.entitySecure ?? site?.entity_secure ?? false),
    websocketHost: site?.websocketHost || site?.websocket_host || '',
    websocketPort: site?.websocketPort || site?.websocket_port || '',
    websocketSecure: Boolean(site?.websocketSecure ?? site?.websocket_secure ?? false),
    serverIp: site?.serverIp || site?.entity_host || '',
    sshPort: site?.sshPort || site?.entity_port || '',
    redisHost: site?.redisHost || site?.redis_url || '',
    prometheusUrl: site?.prometheusUrl || site?.prometheus_url || '',
    grafanaUrl: site?.grafanaUrl || site?.grafana_url || '',
    redmineUrl: site?.redmineUrl || site?.redmine_url || '',
    incidentUrl: site?.incidentUrl || site?.incident_url || '',
    lokiUrl: site?.lokiUrl || site?.metadata?.loki_url || '',
    status,
    isActive: status !== 'RETIRED' && status !== 'OFFLINE',
    metadata: site?.metadata || {},
    createdAt: site?.createdAt || site?.created_at || '',
    updatedAt: site?.updatedAt || site?.updated_at || '',
  };
}

function normalizeSitePayload(payload: any): any {
  if (Array.isArray(payload)) return payload.map(normalizeSite);
  if (Array.isArray(payload?.data)) return { ...payload, data: payload.data.map(normalizeSite) };
  if (Array.isArray(payload?.results)) return { ...payload, results: payload.results.map(normalizeSite) };
  if (Array.isArray(payload?.sites)) return { ...payload, sites: payload.sites.map(normalizeSite) };
  return normalizeSite(payload);
}

function denormalizeSite(input: Record<string, unknown>) {
  const output: Record<string, unknown> = {
    name: input.name,
    slug: input.slug || input.code,
    organization_id: input.organizationId || input.organization_id,
    environment: input.environment,
    location: input.location,
    state: input.state,
    country: input.country,
    entity_host: input.entityHost || input.serverIp,
    entity_port: input.entityPort || input.sshPort || null,
    entity_secure: input.entitySecure ?? false,
    websocket_host: input.websocketHost || null,
    websocket_port: input.websocketPort || null,
    websocket_secure: input.websocketSecure ?? false,
    redis_url: input.redisUrl || input.redisHost || null,
    prometheus_url: input.prometheusUrl || null,
    grafana_url: input.grafanaUrl || null,
    redmine_url: input.redmineUrl || null,
    incident_url: input.incidentUrl || null,
    status: input.status || 'ACTIVE',
  };
  Object.keys(output).forEach((key) => {
    if (output[key] === '' || output[key] === undefined) delete output[key];
  });
  return output;
}

export function useSites() {
  return useQuery({
    queryKey: ['sites', 'list'],
    queryFn: async () => { const { data } = await api.get(SITE_ENDPOINT); return normalizeSitePayload(data); },
    staleTime: 60000,
  });
}

export function useSite(id: string) {
  return useQuery({
    queryKey: ['sites', 'detail', id],
    queryFn: async () => { const { data } = await api.get(`${SITE_ENDPOINT}${id}/`); return normalizeSitePayload(data); },
    staleTime: 60000,
    enabled: !!id,
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => { const { data } = await api.post(SITE_ENDPOINT, denormalizeSite(input)); return normalizeSitePayload(data); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites', 'list'] }),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => { const { data } = await api.patch(`${SITE_ENDPOINT}${id}/`, denormalizeSite(d)); return normalizeSitePayload(data); },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['sites', 'detail', v.id] }); qc.invalidateQueries({ queryKey: ['sites', 'list'] }); },
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { data } = await api.delete(`${SITE_ENDPOINT}${id}/`); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites', 'list'] }),
  });
}
