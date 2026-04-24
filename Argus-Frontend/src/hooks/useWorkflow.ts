import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface ValidateTransitionRequest {
  module: 'INCIDENT' | 'PROBLEM' | 'CHANGE';
  record_id: string;
  from_state: string;
  to_state: string;
}

interface ValidateTransitionResponse {
  allowed: boolean;
  errors: string[];
  missing_fields: string[];
}

interface ExecuteTransitionRequest extends ValidateTransitionRequest {
  notes?: string;
  field_updates?: Record<string, any>;
}

interface ExecuteTransitionResponse {
  new_state: string;
  actions_executed: string[];
  log_id: string;
}

interface TransitionLog {
  id: string;
  org: string;
  module: string;
  record_id: string;
  record_number: string;
  from_state: string;
  to_state: string;
  transitioned_by: string | null;
  transitioned_at: string;
  notes: string;
  actions_executed: string[];
  success: boolean;
}

export const useValidateTransition = (
  module: string,
  recordId: string,
  fromState: string,
  toState: string
) => {
  return useQuery({
    queryKey: ['workflow', 'validate', module, recordId, fromState, toState],
    queryFn: async (): Promise<ValidateTransitionResponse> => {
      const response = await api.post('/workflow/validate/', {
        module,
        record_id: recordId,
        from_state: fromState,
        to_state: toState,
      });
      return response.data.data;
    },
    enabled: !!(module && recordId && fromState && toState),
  });
};

export const useExecuteTransition = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: ExecuteTransitionRequest): Promise<ExecuteTransitionResponse> => {
      const response = await api.post('/workflow/transition/', request);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries for the specific module
      queryClient.invalidateQueries({
        queryKey: [variables.module.toLowerCase()],
      });
      
      // Invalidate transition logs for this record
      queryClient.invalidateQueries({
        queryKey: ['workflow', 'logs', variables.module, variables.record_id],
      });
    },
  });
};

export const useTransitionLogs = (module: string, recordId: string) => {
  return useQuery({
    queryKey: ['workflow', 'logs', module, recordId],
    queryFn: async (): Promise<TransitionLog[]> => {
      const response = await api.get('/workflow/logs/', {
        params: {
          module,
          record_id: recordId,
        },
      });
      return response.data.data.results || response.data.data;
    },
    enabled: !!(module && recordId),
  });
};