import InventoryCategoryPage from './InventoryCategoryPage';
import { HardDrive } from 'lucide-react';

export default function ComputerList() {
  return (
    <InventoryCategoryPage
      title="Computers"
      ciType="END_USER_DEVICE"
      icon={HardDrive}
      accentColor="#6366f1"
      description="Desktops, laptops, and workstations"
    />
  );
}
