import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type FilterParams = Record<string, string | number | boolean | undefined>;

const FIELD_TO_CAMEL: Record<string, string> = {
  short_description: 'shortDescription',
  risk_level: 'riskLevel',
  assigned_to: 'assignedTo',
  assignment_group: 'assignmentGroup',
  config_item: 'configItem',
  created_by: 'createdBy',
  implementation_plan: 'implementationPlan',
  rollback_plan: 'rollbackPlan',
  test_plan: 'testPlan',
  communication_plan: 'communicationPlan',
  planned_start_date: 'plannedStartDate',
  planned_end_date: 'plannedEndDate',
  actual_start_date: 'actualStartDate',
  actual_end_date: 'actualEndDate',
  affected_services: 'affectedServices',
  user_impact: 'userImpact',
  git_repo_url: 'gitRepoUrl',
  git_branch: 'gitBranch',
  git_commit_hash: 'gitCommitHash',
  pull_request_url: 'pullRequestUrl',
  review_notes: 'reviewNotes',
  closure_code: 'closureCode',
  affected_cis: 'affectedCis',
  impact_type: 'impactType',
  linked_incidents: 'linkedIncidents',
  work_notes: 'workNotes',
  old_value: 'oldValue',
  new_value: 'newValue',
  is_internal: 'isInternal',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  first_name: 'firstName',
  last_name: 'lastName',
  approved_at: 'approvedAt',
  available_transitions: 'availableTransitions',
  required_fields_for_state: 'requiredFieldsForState',
  is_assigned_to_me: 'isAssignedToMe',
  can_edit: 'canEdit',
};

const FIELD_TO_SNAKE: Record<string, string> = {
  shortDescription: 'short_description',
  riskLevel: 'risk_level',
  assignedToId: 'assigned_to',
  assignmentGroupId: 'assignment_group',
  implementationPlan: 'implementation_plan',
  rollbackPlan: 'rollback_plan',
  testPlan: 'test_plan',
  communicationPlan: 'communication_plan',
  plannedStartDate: 'planned_start_date',
  plannedEndDate: 'planned_end_date',
  actualStartDate: 'actual_start_date',
  actualEndDate: 'actual_end_date',
  affectedServices: 'affected_services',
  userImpact: 'user_impact',
  gitRepoUrl: 'git_repo_url',
  gitBranch: 'git_branch',
  gitCommitHash: 'git_commit_hash',
  pullRequestUrl: 'pull_request_url',
  reviewNotes: 'review_notes',
  closureCode: 'closure_code',
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

  if (mapped.riskLevel && mapped.risk === undefined) {
    mapped.risk = mapped.riskLevel;
  }
  if (mapped.number && mapped.changeNumber === undefined) {
    mapped.changeNumber = mapped.number;
  }
  if (mapped.shortDescription && mapped.title === undefined) {
    mapped.title = mapped.shortDescription;
  }
  if (mapped.plannedStartDate && mapped.scheduledStart === undefined) {
    mapped.scheduledStart = mapped.plannedStartDate;
  }
  if (mapped.plannedEndDate && mapped.scheduledEnd === undefined) {
    mapped.scheduledEnd = mapped.plannedEndDate;
  }
  if (mapped.assignedTo && mapped.assignee === undefined) {
    mapped.assignee = mapped.assignedTo;
  }
  if (mapped.assignmentGroup && isPlainObject(mapped.assignmentGroup) && 'id' in mapped.assignmentGroup) {
    mapped.assignmentGroupId = mapped.assignmentGroup.id;
  }
  if (mapped.assignedTo && isPlainObject(mapped.assignedTo) && 'id' in mapped.assignedTo) {
    mapped.assignedToId = mapped.assignedTo.id;
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
  all: ['changes'] as const,
  list: (f: FilterParams) => [...keys.all, 'list', f] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export function useChanges(filters: FilterParams = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)); });
      const { data } = await api.get(`/changes/${params.toString() ? `?${params}` : ''}`);
      return normalizeListResponse(data, filters);
    },
    staleTime: 30000,
  });
}

export function useChange(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/changes/${id}/`);
      return { ...data, data: normalizePayload(data?.data) };
    },
    staleTime: 60000, enabled: !!id,
  });
}

export function useCreateChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.post('/changes/', denormalizePayload(input));
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, unknown> }) => {
      const { data } = await api.patch(`/changes/${id}/`, denormalizePayload(d));
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: keys.detail(v.id) }); qc.invalidateQueries({ queryKey: keys.all }); },
  });
}

export function useApproveChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, state, comments }: { id: string; state: 'APPROVED' | 'REJECTED'; comments?: string }) => {
      const { data } = await api.post(`/changes/${id}/approvals/decision/`, { state, comments });
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: keys.detail(v.id) });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useAddChangeWorkNote(changeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: { content: string; isInternal?: boolean }) => {
      const { data } = await api.post(`/changes/${changeId}/work-notes/`, denormalizePayload(note));
      return { ...data, data: normalizePayload(data?.data) };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.detail(changeId) }); },
  });
}

