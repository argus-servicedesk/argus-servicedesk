from celery import shared_task
from apps.ai_agents.services.incident_ai_service import IncidentAIService
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0)
def run_incident_ai_analysis(self, incident_id: str, organization_id: str):
    """
    Celery task to run AI analysis on an incident
    
    Args:
        incident_id: UUID of the incident
        organization_id: UUID of the organization
    """
    logger.info(f"Starting AI analysis task for incident {incident_id}")
    
    try:
        service = IncidentAIService()
        service.run_for_incident(incident_id, organization_id)
        logger.info(f"AI analysis task completed for incident {incident_id}")
        
    except Exception as e:
        logger.error(f"AI analysis task failed for incident {incident_id}: {e}")
        # Don't retry - mark as failed and move on
        raise
