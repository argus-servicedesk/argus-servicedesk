import InventoryCategoryPage from './InventoryCategoryPage';
import { Zap } from 'lucide-react';

export default function UPSList() {
  return (
    <InventoryCategoryPage
      title="UPS Devices"
      ciType="UPS"
      icon={Zap}
      accentColor="#ea580c"
      description="Uninterruptible power supplies and battery backup units"
    />
  );
}
