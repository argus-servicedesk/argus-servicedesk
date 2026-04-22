import InventoryCategoryPage from './InventoryCategoryPage';
import { HardDrive } from 'lucide-react';

export default function StorageList() {
  return (
    <InventoryCategoryPage
      title="Storage"
      ciType="STORAGE"
      icon={HardDrive}
      accentColor="#6366f1"
      description="SAN, NAS, and direct-attached storage arrays"
    />
  );
}
