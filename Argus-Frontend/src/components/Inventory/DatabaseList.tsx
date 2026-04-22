import InventoryCategoryPage from './InventoryCategoryPage';
import { Database } from 'lucide-react';

export default function DatabaseList() {
  return (
    <InventoryCategoryPage
      title="Databases"
      ciType="DATABASE"
      icon={Database}
      accentColor="#7c3aed"
      description="Database servers, clusters, and managed database instances"
    />
  );
}
