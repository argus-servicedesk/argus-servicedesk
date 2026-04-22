import InventoryCategoryPage from './InventoryCategoryPage';
import { MonitorSmartphone } from 'lucide-react';

export default function MonitorList() {
  return (
    <InventoryCategoryPage
      title="Monitors"
      ciType="MONITOR"
      icon={MonitorSmartphone}
      accentColor="#8b5cf6"
      description="Display screens and visual output devices"
    />
  );
}
