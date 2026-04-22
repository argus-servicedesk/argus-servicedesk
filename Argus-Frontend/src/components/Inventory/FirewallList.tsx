import InventoryCategoryPage from './InventoryCategoryPage';
import { Shield } from 'lucide-react';

export default function FirewallList() {
  return (
    <InventoryCategoryPage
      title="Firewalls"
      ciType="FIREWALL"
      icon={Shield}
      accentColor="#dc2626"
      description="Network firewalls, WAFs, and security appliances"
    />
  );
}
