import InventoryCategoryPage from './InventoryCategoryPage';
import { LayoutGrid } from 'lucide-react';

export default function RackInfraList() {
  return (
    <InventoryCategoryPage
      title="Rack Infrastructure"
      ciTypes={[
        { value: 'RACK_UNIT', label: 'Rack Units' },
        { value: 'PDU', label: 'PDUs' },
        { value: 'ENCLOSURE', label: 'Enclosures' },
        { value: 'CABLE', label: 'Cables' },
      ]}
      icon={LayoutGrid}
      accentColor="#64748b"
      description="Racks, PDUs, enclosures, and cabling infrastructure"
      createType="RACK_UNIT"
    />
  );
}
