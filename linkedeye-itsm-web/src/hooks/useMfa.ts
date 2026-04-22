import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useMfaStatus() {
  return useQuery({
    queryKey: ['mfa-status'],
    queryFn: async () => {
      const { data } = await api.get('/auth/mfa/status');
      return data.data;
    },
  });
}

export function useMfaSetup() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/mfa/setup');
      return data.data;
    },
  });
}

export function useMfaConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { token: string; secret: string; backupCodes: string[] }) => {
      const { data } = await api.post('/auth/mfa/confirm', body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
    },
  });
}

export function useMfaDisable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      const { data } = await api.delete('/auth/mfa', { data: { password } });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
    },
  });
}
