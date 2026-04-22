import InventoryCategoryPage from './InventoryCategoryPage';
import { Network } from 'lucide-react';

export default function NetworkDeviceList() {
  return (
    <InventoryCategoryPage
      title="Network Devices"
      ciTypes={[
        { value: 'ROUTER', label: 'Routers' },
        { value: 'SWITCH', label: 'Switches' },
        { value: 'FIREWALL', label: 'Firewalls' },
        { value: 'NETWORK', label: 'Other Network' },
      ]}
      icon={Network}
      accentColor="#D97706"
      description="Routers, switches, firewalls, and network infrastructure"
      createType="NETWORK"
    />
  );
}
