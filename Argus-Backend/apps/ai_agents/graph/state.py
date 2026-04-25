from typing import TypedDict, List, Optional, Dict, Any
from apps.ai_agents.schemas import (
    IncidentContext,
    AlertContext,
    CIMetrics,
    SimilarIncident,
    KEDBMatch,
    Hypothesis,
    SuggestedAction,
    PolicyDecision,
    AIAnalysisOutput
)


class AgentState(TypedDict):
    """State for the incident AI agent graph"""
    # Input
    incident_id: str
    organization_id: str
    
    # Context data
    incident_payload: Optional[IncidentContext]
    alert_context: Optional[AlertContext]
    ci_metrics: Optional[CIMetrics]
    similar_incidents: List[SimilarIncident]
    kedb_matches: List[KEDBMatch]
    
    # Analysis results
    hypotheses: List[Hypothesis]
    action_plan: List[SuggestedAction]
    policy_result: Optional[PolicyDecision]
    
    # Final output
    final_output: Optional[AIAnalysisOutput]
    
    # Error tracking
    errors: List[str]
    degraded_context: bool
    
    # Metadata
    correlation_id: str
    node_latencies: Dict[str, float]
