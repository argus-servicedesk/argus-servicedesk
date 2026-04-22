import InventoryCategoryPage from './InventoryCategoryPage';
import { Globe } from 'lucide-react';

export default function ApplicationList() {
  return (
    <InventoryCategoryPage
      title="Applications"
      ciType="APPLICATION"
      icon={Globe}
      accentColor="#059669"
      description="Business applications, web services, and microservices"
    />
  );
}
