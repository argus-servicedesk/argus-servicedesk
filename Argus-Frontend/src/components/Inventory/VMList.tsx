import InventoryCategoryPage from './InventoryCategoryPage';
import { Layers } from 'lucide-react';

export default function VMList() {
  return (
    <InventoryCategoryPage
      title="Virtual Machines"
      ciType="VM"
      icon={Layers}
      accentColor="#7c3aed"
      description="Virtual machines, hypervisor guests, and cloud instances"
    />
  );
}
