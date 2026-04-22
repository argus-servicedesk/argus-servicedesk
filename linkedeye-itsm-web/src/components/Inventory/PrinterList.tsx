import InventoryCategoryPage from './InventoryCategoryPage';
import { Printer } from 'lucide-react';

export default function PrinterList() {
  return (
    <InventoryCategoryPage
      title="Printers"
      ciType="PRINTER"
      icon={Printer}
      accentColor="#f59e0b"
      description="Printers, copiers, and multifunction devices"
    />
  );
}
