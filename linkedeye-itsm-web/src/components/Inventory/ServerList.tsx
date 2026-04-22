import InventoryCategoryPage from './InventoryCategoryPage';
import { Server } from 'lucide-react';

export default function ServerList() {
  return (
    <InventoryCategoryPage
      title="Physical Servers"
      ciType="SERVER"
      icon={Server}
      accentColor="#4f46e5"
      description="Rack-mounted and tower servers, bare-metal infrastructure"
    />
  );
}
