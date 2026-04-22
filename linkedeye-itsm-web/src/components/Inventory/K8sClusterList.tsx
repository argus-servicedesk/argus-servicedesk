import InventoryCategoryPage from './InventoryCategoryPage';
import { Layers } from 'lucide-react';

export default function K8sClusterList() {
  return (
    <InventoryCategoryPage
      title="Kubernetes Clusters"
      ciType="KUBERNETES_CLUSTER"
      icon={Layers}
      accentColor="#2563eb"
      description="Kubernetes clusters, control planes, and orchestration platforms"
    />
  );
}
