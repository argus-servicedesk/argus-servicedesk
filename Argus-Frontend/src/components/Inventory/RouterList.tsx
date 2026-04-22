import InventoryCategoryPage from './InventoryCategoryPage';
import { Network } from 'lucide-react';

export default function RouterList() {
  return (
    <InventoryCategoryPage
      title="Routers"
      ciType="ROUTER"
      icon={Network}
      accentColor="#0891b2"
      description="Core routers, edge routers, and routing appliances"
    />
  );
}
