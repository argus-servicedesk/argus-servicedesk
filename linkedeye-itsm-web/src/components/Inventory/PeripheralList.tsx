import InventoryCategoryPage from './InventoryCategoryPage';
import { Usb } from 'lucide-react';

export default function PeripheralList() {
  return (
    <InventoryCategoryPage
      title="Peripherals"
      ciTypes={[
        { value: 'PERIPHERAL', label: 'Peripherals' },
        { value: 'SIMCARD', label: 'SIM Cards' },
      ]}
      icon={Usb}
      accentColor="#8b5cf6"
      description="External devices, accessories, and SIM cards"
      createType="PERIPHERAL"
    />
  );
}
