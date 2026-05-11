import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: async () => {
      const { data } = await api.get('/approvals/requests/my_pending/');
      return data.data || data;
    },
  });
}

export function useApprovalActions() {
  const queryClient = useQueryClient();
  
  const approve = useMutation({
    mutationFn: async ({ approverId, comments }: { approverId: string; comments?: string }) => {
      await api.post(`/approvals/approvers/${approverId}/approve/`, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  const reject = useMutation({
    mutationFn: async ({ approverId, comments }: { approverId: string; comments?: string }) => {
      await api.post(`/approvals/approvers/${approverId}/reject/`, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  return { approve, reject };
}
