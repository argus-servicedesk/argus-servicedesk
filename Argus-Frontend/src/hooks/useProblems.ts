import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type FilterParams = Record<string, string | number | boolean | undefined>;

const FIELD_TO_CAMEL: Record<string, string> = {
  short_description: 'shortDescription',
  assigned_to: 'assignedTo',
  assignment_group: 'assignmentGroup',
  created_by: 'createdBy',
  linked_incidents: 'linkedIncidents',
  work_notes: 'workNotes',
  related_change: 'relatedChange',
  related_change_info: 'relatedChangeInfo',
  old_value: 'oldValue',
  new_value: 'newValue',
  root_cause: 'rootCause',
  root_cause_analysis: 'rootCauseAnalysis',
  permanent_fix: 'permanentFix',
  fix_implemented: 'fixImplemented',
  is_known_error: 'isKnownError',
  known_error_id: 'knownErrorId',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  first_name: 'firstName',
  last_name: 'lastName',
  is_internal: 'isInternal',
  alert_name: 'alertName',
  link_type: 'linkType',
  available_transitions: 'availableTransitions',
  is_assigned_to_me: 'isAssignedToMe',
  can_edit: 'canEdit',
};

const FIELD_TO_SNAKE: Record<string, string> = {
  shortDescription: 'short_description',
  assignedToId: 'assigned_to',
  assignmentGroupId: 'assignment_group',
  relatedChangeId: 'related_change',
  rootCause: 'root_cause',
  rootCauseAnalysis: 'root_cause_analysis',
  permanentFix: 'permanent_fix',
  fixImplemented: 'fix_implemented',
  isKnownError: 'is_known_error',
  knownErrorId: 'known_error_id',
  isInternal: 'is_internal',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

  if (Array.isArray(mapped.linkedIncidents) && mapped.relatedIncidents === undefined) {
    mapped.relatedIncidents = mapped.linkedIncidents.length;
  }
  if (mapped.assignmentGroup && isPlainObject(mapped.assignmentGroup) && 'id' in mapped.assignmentGroup) {
    mapped.assignmentGroupId = mapped.assignmentGroup.id;
  }
  if (mapped.assignedTo && isPlainObject(mapped.assignedTo) && 'id' in mapped.assignedTo) {
    mapped.assignedToId = mapped.assignedTo.id;
  }
  if (mapped.relatedChangeInfo && isPlainObject(mapped.relatedChangeInfo) && 'id' in mapped.relatedChangeInfo) {
    mapped.relatedChangeId = mapped.relatedChangeInfo.id;
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

function normalizeListResponse(response: any, filters: FilterParams) {
  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 25);
  const total = Number(response?.pagination?.count ?? response?.pagination?.total ?? response?.data?.length ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  return {
    ...response,
    data: normalizePayload(response?.data ?? []),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      pages: totalPages,
      next: response?.pagination?.next ?? null,
      previous: response?.pagination?.previous ?? null,
    },
  };
}

const keys = {
  all: ['problems'] as const,
  list: (f: FilterParams) => [...keys.all, 'list', f] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export function useProblems(filters: FilterParams = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const { data } = await api.get(`/problems/${params.toString() ? `?${params}` : ''}`);
      return normalizeListResponse(data, filters);
    },
    staleTime: 30000,
  });
}

export function useProblem(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/problems/${id}/`);
      return { ...data, data: normalizePayload(data?.data) };
    },
    staleTime: 60000, enabled: !!id,
  });
}

export function useCreateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.post('/problems/', denormalizePayload(input));
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => {
      const { data } = await api.patch(`/problems/${id}/`, denormalizePayload(d));
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: keys.detail(v.id) }); qc.invalidateQueries({ queryKey: keys.all }); },
  });
}

export function useProblemStats() {
  return useQuery({
    queryKey: ['problems', 'stats'] as const,
    queryFn: async () => {
      const { data } = await api.get('/problems/stats/');
      return { ...data, data: normalizePayload(data?.data) };
    },
    staleTime: 30000,
  });
}

export function useAiRCA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (problemId: string) => {
      const { data } = await api.post(`/problems/${problemId}/ai-rca/`);
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: (_, problemId) => { qc.invalidateQueries({ queryKey: keys.detail(problemId) }); },
  });
}

export function useAlertKB() {
  return useQuery({
    queryKey: ['alerts', 'kb'] as const,
    queryFn: async () => {
      try {
        const { data } = await api.get('/alerts/kb/');
        return { ...data, data: normalizePayload(data?.data ?? []) };
      } catch (error: any) {
        if (error?.response?.status === 404) return { success: true, data: [] };
        throw error;
      }
    },
    staleTime: 300000,
  });
}

export function useKnowledgeBase() {
  return useQuery({
    queryKey: ['problems', 'kb'] as const,
    queryFn: async () => {
      const { data } = await api.get('/problems/?limit=100&state=KNOWN_ERROR');
      return normalizeListResponse(data, { page: 1, limit: 100 });
    },
    staleTime: 60000,
  });
}

export function useAddProblemWorkNote(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: { content: string; isInternal?: boolean }) => {
      const { data } = await api.post(`/problems/${problemId}/work-notes/`, denormalizePayload(note));
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.detail(problemId) }); },
  });
}

