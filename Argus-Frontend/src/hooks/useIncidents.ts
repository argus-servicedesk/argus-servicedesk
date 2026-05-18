import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type FilterParams = Record<string, string | number | boolean | undefined>;

const FIELD_TO_CAMEL: Record<string, string> = {
  short_description: 'shortDescription',
  assigned_to: 'assignedTo',
  assignment_group: 'assignmentGroup',
  created_by: 'createdBy',
  config_item: 'configItem',
  sla_breached: 'slaBreached',
  response_time: 'responseTime',
  resolution_time: 'resolutionTime',
  sla_target_response: 'slaTargetResponse',
  sla_target_resolution: 'slaTargetResolution',
  source_alert_id: 'sourceAlertId',
  source_alert_name: 'sourceAlertName',
  resolved_at: 'resolvedAt',
  closed_at: 'closedAt',
  resolution_code: 'resolutionCode',
  resolution_notes: 'resolutionNotes',
  hold_reason: 'holdReason',
  work_notes: 'workNotes',
  linked_problems: 'linkedProblems',
  linked_changes: 'linkedChanges',
  available_transitions: 'availableTransitions',
  is_assigned_to_me: 'isAssignedToMe',
  can_edit: 'canEdit',
  old_value: 'oldValue',
  new_value: 'newValue',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  first_name: 'firstName',
  last_name: 'lastName',
  is_internal: 'isInternal',
  child_incidents: 'childIncidents',
  child_status_summary: 'childStatusSummary',
  hierarchy_level: 'hierarchyLevel',
  root_parent: 'rootParent',
  requested_by: 'requestedBy',
  in_progress: 'inProgress',
  on_hold: 'onHold',
  completion_percentage: 'completionPercentage',
};

const FIELD_TO_SNAKE: Record<string, string> = {
  shortDescription: 'short_description',
  assignedToId: 'assigned_to',
  assignmentGroupId: 'assignment_group',
  configItemId: 'config_item',
  slaBreached: 'sla_breached',
  resolutionCode: 'resolution_code',
  resolutionNotes: 'resolution_notes',
  holdReason: 'hold_reason',
  isInternal: 'is_internal',
  parentId: 'parent',
  organizationId: 'organization_id',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasResponseStatus(error: unknown, status: number) {
  if (!isPlainObject(error) || !isPlainObject(error.response)) {
    return false;
  }
  return error.response.status === status;
}

function normalizePayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizePayload(item)) as T;
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const mapped = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      FIELD_TO_CAMEL[key] ?? key,
      normalizePayload(entry),
    ]),
  ) as Record<string, unknown>;

  if (mapped.assignmentGroup && isPlainObject(mapped.assignmentGroup) && 'id' in mapped.assignmentGroup) {
    mapped.assignmentGroupId = mapped.assignmentGroup.id;
  }
  if (mapped.assignedTo && isPlainObject(mapped.assignedTo) && 'id' in mapped.assignedTo) {
    mapped.assignedToId = mapped.assignedTo.id;
  }
  if (mapped.configItem && isPlainObject(mapped.configItem) && 'id' in mapped.configItem) {
    mapped.configItemId = mapped.configItem.id;
  }

  return mapped as T;
}

function denormalizePayload(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [FIELD_TO_SNAKE[key] ?? key, value]),
  );
}

function normalizeListResponse(response: unknown, filters: FilterParams) {
  const payload = isPlainObject(response) ? response : {};
  const data = Array.isArray(payload.data) ? payload.data : [];
  const pagination = isPlainObject(payload.pagination) ? payload.pagination : {};
  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 25);
  const total = Number(pagination.count ?? pagination.total ?? data.length ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  return {
    ...payload,
    data: normalizePayload(data),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      pages: totalPages,
      next: pagination.next ?? null,
      previous: pagination.previous ?? null,
    },
  };
}

const keys = {
  all: ['incidents'] as const,
  list: (f: FilterParams) => [...keys.all, 'list', f] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
  timeline: (id: string) => [...keys.all, 'timeline', id] as const,
  liveContext: (id: string) => [...keys.all, 'live-context', id] as const,
  escalationLogs: (id: string) => [...keys.all, 'escalation-logs', id] as const,
};

export function useIncidents(filters: FilterParams = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const { data } = await api.get(`/incidents/${params.toString() ? `?${params}` : ''}`);
      return normalizeListResponse(data, filters);
    },
    staleTime: 30000,
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/incidents/${id}/`);
      return { ...data, data: normalizePayload(data?.data) };
    },
    staleTime: 60000,
    enabled: !!id,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.post('/incidents/', denormalizePayload(input));
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => {
      const { data } = await api.patch(`/incidents/${id}/`, denormalizePayload(d));
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: keys.detail(v.id) }); qc.invalidateQueries({ queryKey: keys.all }); },
  });
}

export function useAddWorkNote(incidentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: { content: string; isInternal?: boolean }) => {
      const { data } = await api.post(`/incidents/${incidentId}/work-notes/`, denormalizePayload(note));
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.detail(incidentId) }); qc.invalidateQueries({ queryKey: keys.timeline(incidentId) }); },
  });
}

export function useIncidentTimeline(id: string) {
  return useQuery({
    queryKey: keys.timeline(id),
    queryFn: async () => {
      try {
        const { data } = await api.get(`/incidents/${id}/timeline/`);
        return { ...data, data: normalizePayload(data?.data ?? []) };
      } catch (error: unknown) {
        if (hasResponseStatus(error, 404)) return { success: true, data: [] };
        throw error;
      }
    },
    staleTime: 30000,
    enabled: !!id,
  });
}

export function useIncidentLiveContext(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: keys.liveContext(id),
    queryFn: async () => {
      try {
        const { data } = await api.get(`/incidents/${id}/live-context`);
        return data.data;
      } catch (error: unknown) {
        if (hasResponseStatus(error, 404)) return null;
        throw error;
      }
    },
    staleTime: 15000,
    refetchInterval: 30000,
    enabled: !!id && enabled,
    retry: 1,
  });
}

export function useEscalationLogs(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: keys.escalationLogs(id),
    queryFn: async () => {
      try {
        const { data } = await api.get(`/incidents/${id}/escalation-logs`);
        return data.data;
      } catch (error: unknown) {
        if (hasResponseStatus(error, 404)) return { logs: [] };
        throw error;
      }
    },
    staleTime: 15000,
    refetchInterval: 30000,
    enabled: !!id && enabled,
    retry: 1,
  });
}

// ── Lifecycle Action Mutations ──────────────────────────────────────────────

export function useEscalateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.post(`/incidents/${id}/escalate/`, { reason: reason || 'Manual escalation' });
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: keys.detail(v.id) });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useResolveIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolutionCode, resolutionNotes }: { id: string; resolutionCode: string; resolutionNotes: string }) => {
      const { data } = await api.post(`/incidents/${id}/resolve/`, {
        resolution_code: resolutionCode,
        resolution_notes: resolutionNotes,
      });
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: keys.detail(v.id) });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useCloseIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data } = await api.post(`/incidents/${id}/close/`, {});
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: keys.detail(v.id) });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useReopenIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.post(`/incidents/${id}/reopen/`, { reason: reason || 'Reopened by user' });
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: keys.detail(v.id) });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function usePromoteIncidentToProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data } = await api.post(`/incidents/${id}/promote-to-problem/`, {});
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: keys.detail(v.id) });
      qc.invalidateQueries({ queryKey: ['problems'] });
    },
  });
}

export function useChildBulkOperations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      parentId, 
      action, 
      childIds, 
      updates 
    }: { 
      parentId: string; 
      action: 'resolve' | 'close' | 'update'; 
      childIds?: string[]; 
      updates?: Record<string, unknown> 
    }) => {
      const { data } = await api.post(`/incidents/${parentId}/child-bulk-operations/`, {
        action,
        child_ids: childIds,
        updates: updates ? denormalizePayload(updates) : undefined,
      });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: keys.detail(v.parentId) });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

