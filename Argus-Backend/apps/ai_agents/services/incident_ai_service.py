import uuid
from apps.ai_agents.graph.graph import create_incident_ai_graph
from apps.ai_agents.graph.state import AgentState
from apps.incidents.models import Incident
import logging

logger = logging.getLogger(__name__)


class IncidentAIService:
    """Service for running AI analysis on incidents"""
    
    def run_for_incident(self, incident_id: str, organization_id: str):
        """Run AI analysis for an incident"""
        correlation_id = str(uuid.uuid4())
        
        logger.info(
            f"Starting AI analysis for incident {incident_id} "
            f"(correlation_id: {correlation_id})"
        )
        
        try:
            # Mark as pending
            incident = Incident.objects.get(id=incident_id)
            incident.ai_status = 'PENDING'
            incident.save()
            
            # Initialize state
            initial_state: AgentState = {
                "incident_id": incident_id,
                "organization_id": organization_id,
                "incident_payload": None,
                "alert_context": None,
                "ci_metrics": None,
                "similar_incidents": [],
                "kedb_matches": [],
                "hypotheses": [],
                "action_plan": [],
                "policy_result": None,
                "final_output": None,
                "errors": [],
                "degraded_context": False,
                "correlation_id": correlation_id,
                "node_latencies": {}
            }
            
            # Create and run graph
            graph = create_incident_ai_graph()
            final_state = graph.invoke(initial_state)
            
            logger.info(
                f"AI analysis completed for incident {incident_id}. "
                f"Errors: {len(final_state.get('errors', []))}"
            )
            
            return final_state
            
        except Exception as e:
            logger.error(f"Fatal error in AI analysis: {e}", exc_info=True)
            
            # Mark as failed
            try:
                incident = Incident.objects.get(id=incident_id)
                incident.ai_status = 'FAILED'
                incident.ai_error = str(e)
                incident.save()
            except:
                pass
            
            raise
