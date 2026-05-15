import { ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Incident } from '../../types';

interface IncidentBreadcrumbProps {
  incident: Incident;
}

export default function IncidentBreadcrumb({ incident }: IncidentBreadcrumbProps) {
  const navigate = useNavigate();

  // Build hierarchy path from current incident up to root
  const buildHierarchyPath = (current: Incident): Incident[] => {
    const path: Incident[] = [];
    let currentIncident: Incident | null = current;
    
    while (currentIncident && path.length < 10) { // Prevent infinite loops
      path.unshift(currentIncident);
      currentIncident = currentIncident.parent || null;
    }
    
    return path;
  };

  const hierarchyPath = buildHierarchyPath(incident);

  // Don't show breadcrumb if there's no hierarchy
  if (hierarchyPath.length <= 1 && !incident.parent) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm mb-4 p-3 bg-slate-50 rounded-md border">
      <button
        type="button"
        onClick={() => navigate('/incidents')}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
      >
        <Home size={14} />
        Incidents
      </button>
      
      {hierarchyPath.map((pathIncident, index) => (
        <div key={pathIncident.id} className="flex items-center">
          <ChevronRight size={14} className="text-gray-400 mx-1" />
          
          {index === hierarchyPath.length - 1 ? (
            // Current incident (not clickable)
            <span className="font-medium text-gray-900">
              {pathIncident.number}
            </span>
          ) : (
            // Parent incidents (clickable)
            <button
              type="button"
              onClick={() => navigate(`/incidents/${pathIncident.id}`)}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {pathIncident.number}
            </button>
          )}
          
          {index < hierarchyPath.length - 1 && (
            <span className="text-xs text-gray-500 ml-1">
              (Parent)
            </span>
          )}
        </div>
      ))}
      
      {incident.childIncidents && incident.childIncidents.length > 0 && (
        <div className="flex items-center ml-2 px-2 py-1 bg-blue-100 rounded text-xs text-blue-800">
          <span>{incident.childIncidents.length} child incident{incident.childIncidents.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </nav>
  );
}