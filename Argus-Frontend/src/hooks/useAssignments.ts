import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export const useAssignmentRules = () => {
  return useQuery({
    queryKey: ['assignment-rules'],
    queryFn: async () => {
      const { data } = await api.get('/assignments/rules/');
      return data;
    },
  });
};

export const useCreateAssignmentRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: any) => {
      const { data } = await api.post('/assignments/rules/', rule);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
    },
  });
};

export const useCategoryGroupMappings = () => {
  return useQuery({
    queryKey: ['category-mappings'],
    queryFn: async () => {
      const { data } = await api.get('/assignments/category-mappings/');
      return data;
    },
  });
};

export const useAssignmentPreview = (fields: any, enabled = true) => {
  return useQuery({
    queryKey: ['assignment-preview', fields],
    queryFn: async () => {
      if (!fields.category) return null;
      const { data } = await api.post('/assignments/preview/', fields);
      return data;
    },
    enabled: enabled && !!fields.category,
  });
};

export const useTeamMembers = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data } = await api.get(`/assignments/teams/${teamId}/members/`);
      return data;
    },
    enabled: !!teamId,
  });
};
