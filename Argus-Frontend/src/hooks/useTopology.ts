import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface TopologyNode {
  id: string;
  name: string;
  type: string;
  status: string;
  ipAddress: string | null;
  hostname: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  monitoringEnabled: boolean;
}

export interface TopologyConnection {
  id: string;
  sourceDeviceId: string;
  destinationDeviceId: string;
  sourcePort: string | null;
  destPort: string | null;
  connectionType: string | null;
  bandwidth: string | null;
  vlan: string | null;
  status: string | null;
  description: string | null;
}

export interface TopologyRelationship {
  id: string;
  parentId: string;
  childId: string;
  type: string;
  description: string | null;
}

export function useTopologyData() {
  return useQuery({
    queryKey: ['topology'],
    queryFn: async () => {
      const { data } = await api.get('/assets/topology');
      return data as { success: boolean; data: { nodes: TopologyNode[]; connections: TopologyConnection[]; relationships: TopologyRelationship[] } };
    },
    staleTime: 30000,
  });
}
