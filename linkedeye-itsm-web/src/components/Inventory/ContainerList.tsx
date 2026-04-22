import InventoryCategoryPage from './InventoryCategoryPage';
import { Container } from 'lucide-react';

export default function ContainerList() {
  return (
    <InventoryCategoryPage
      title="Containers"
      ciType="CONTAINER"
      icon={Container}
      accentColor="#0891b2"
      description="Docker containers, pods, and containerized workloads"
    />
  );
}
