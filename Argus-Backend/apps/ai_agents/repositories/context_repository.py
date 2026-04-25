from typing import List, Optional
from django.db.models import Q
from apps.incidents.models import Incident
from apps.ai_agents.schemas import (
    IncidentContext,
    AlertContext,
    CIMetrics,
    SimilarIncident,
    KEDBMatch
)
import logging

logger = logging.getLogger(__name__)


class ContextRepository:
    """Repository for fetching context data for AI analysis"""
    
    def get_incident_context(self, incident_id: str, org_id: str) -> Optional[IncidentContext]:
        """Fetch incident details"""
        try:
            incident = Incident.objects.filter(
                id=incident_id,
                organization_id=org_id
            ).first()
            
            if not incident:
                return None
            
            return IncidentContext(
                incident_id=str(incident.id),
                number=incident.number,
                short_description=incident.short_description,
                description=incident.description,
                priority=incident.priority,
                state=incident.state,
                category=incident.category,
                subcategory=incident.subcategory
            )
        except Exception as e:
            logger.error(f"Failed to fetch incident context: {e}")
            return None
    
    def get_alert_context(self, incident: Incident) -> Optional[AlertContext]:
        """Fetch alert context if incident was created from alert"""
        try:
            if not incident.source_alert_id:
                return None
            
            return AlertContext(
                alert_name=incident.source_alert_name,
                alert_id=incident.source_alert_id,
                source=incident.source,
                raw_payload=None  # Could fetch from alerts app if needed
            )
        except Exception as e:
            logger.error(f"Failed to fetch alert context: {e}")
            return None
    
    def get_ci_metrics(self, incident: Incident) -> Optional[CIMetrics]:
        """Fetch CI metrics if incident is linked to a CI"""
        try:
            if not incident.config_item:
                return None
            
            ci = incident.config_item
            # Check if CI is tagged as critical
            is_critical = hasattr(ci, 'criticality') and ci.criticality == 'CRITICAL'
            
            return CIMetrics(
                ci_name=ci.name,
                ci_id=str(ci.id),
                metrics={},  # Could fetch from monitoring system
                is_critical=is_critical
            )
        except Exception as e:
            logger.error(f"Failed to fetch CI metrics: {e}")
            return None
    
    def get_similar_incidents(
        self,
        incident: Incident,
        limit: int = 5
    ) -> List[SimilarIncident]:
        """Fetch last 5 similar resolved incidents"""
        try:
            similar = Incident.objects.filter(
                organization=incident.organization,
                state__in=['RESOLVED', 'CLOSED'],
            ).exclude(
                id=incident.id
            )
            
            # Filter by category if available
            if incident.category:
                similar = similar.filter(category=incident.category)
            
            similar = similar.order_by('-resolved_at')[:limit]
            
            return [
                SimilarIncident(
                    number=inc.number,
                    short_description=inc.short_description,
                    resolution_notes=inc.resolution_notes,
                    resolution_code=inc.resolution_code,
                    similarity_score=0.8  # Placeholder
                )
                for inc in similar
            ]
        except Exception as e:
            logger.error(f"Failed to fetch similar incidents: {e}")
            return []
    
    def get_kedb_matches(
        self,
        incident: Incident,
        limit: int = 3
    ) -> List[KEDBMatch]:
        """Fetch KEDB article matches"""
        try:
            # Placeholder - would integrate with knowledge base
            # For now, return empty list
            return []
        except Exception as e:
            logger.error(f"Failed to fetch KEDB matches: {e}")
            return []
