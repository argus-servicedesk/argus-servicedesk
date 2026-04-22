import InventoryCategoryPage from './InventoryCategoryPage';
import { Cpu } from 'lucide-react';

export default function LoadBalancerList() {
  return (
    <InventoryCategoryPage
      title="Load Balancers"
      ciType="LOAD_BALANCER"
      icon={Cpu}
      accentColor="#0d9488"
      description="Application delivery controllers and load balancers"
    />
  );
}
