import InventoryCategoryPage from './InventoryCategoryPage';
import { Network } from 'lucide-react';

export default function SwitchList() {
  return (
    <InventoryCategoryPage
      title="Switches"
      ciType="SWITCH"
      icon={Network}
      accentColor="#0d9488"
      description="Layer 2/3 switches, managed and unmanaged network switches"
    />
  );
}
