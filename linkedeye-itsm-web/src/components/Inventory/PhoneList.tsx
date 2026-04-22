import InventoryCategoryPage from './InventoryCategoryPage';
import { Smartphone } from 'lucide-react';

export default function PhoneList() {
  return (
    <InventoryCategoryPage
      title="Phones"
      ciType="PHONE"
      icon={Smartphone}
      accentColor="#06b6d4"
      description="IP phones, mobile devices, and communication equipment"
    />
  );
}
