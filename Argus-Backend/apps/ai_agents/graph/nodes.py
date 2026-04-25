import time
import json
from datetime import datetime
from typing import Dict, Any
from apps.ai_agents.graph.state import AgentState
from apps.ai_agents.repositories.context_repository import ContextRepository
from apps.ai_agents.providers.claude_client import ClaudeClient
from apps.ai_agents.policy.policy_engine import PolicyEngine
from apps.ai_agents.schemas import (
    Hypothesis,
    SuggestedAction,
    AIAnalysisOutput
)
from apps.incidents.models import Incident, Activity
import logging

logger = logging.getLogger(__name__)


def load_incident_context(state: AgentState) -> Dict[str, Any]:
    """Node 1: Load incident context"""
    start_time = time.time()
    
    try:
        repo = ContextRepository()
        incident_context = repo.get_incident_context(
            state["incident_id"],
            state["organization_id"]
        )
        
        if not incident_context:
            state["errors"].append("Failed to load incident context")
            state["degraded_context"] = True
        
        state["incident_payload"] = incident_context
        
        # Also fetch alert context if incident was created from alert
        try:
            incident = Incident.objects.get(id=state["incident_id"])
            alert_context = repo.get_alert_context(incident)
            state["alert_context"] = alert_context
        except Exception as e:
            logger.warning(f"Failed to fetch alert context: {e}")
            state["alert_context"] = None
        
    except Exception as e:
        logger.error(f"Error in load_incident_context: {e}")
        state["errors"].append(f"load_incident_context: {str(e)}")
        state["degraded_context"] = True
    
    state["node_latencies"]["load_incident_context"] = time.time() - start_time
    return state


def fetch_ci_metrics(state: AgentState) -> Dict[str, Any]:
    """Node 2: Fetch CI metrics"""
    start_time = time.time()
    
    try:
        incident = Incident.objects.get(id=state["incident_id"])
        repo = ContextRepository()
        ci_metrics = repo.get_ci_metrics(incident)
        state["ci_metrics"] = ci_metrics
        
    except Exception as e:
        logger.error(f"Error in fetch_ci_metrics: {e}")
        state["errors"].append(f"fetch_ci_metrics: {str(e)}")
        state["degraded_context"] = True
    
    state["node_latencies"]["fetch_ci_metrics"] = time.time() - start_time
    return state


def fetch_similar_incidents(state: AgentState) -> Dict[str, Any]:
    """Node 3: Fetch similar incidents"""
    start_time = time.time()
    
    try:
        incident = Incident.objects.get(id=state["incident_id"])
        repo = ContextRepository()
        similar = repo.get_similar_incidents(incident)
        state["similar_incidents"] = similar
        
    except Exception as e:
        logger.error(f"Error in fetch_similar_incidents: {e}")
        state["errors"].append(f"fetch_similar_incidents: {str(e)}")
        state["degraded_context"] = True
    
    state["node_latencies"]["fetch_similar_incidents"] = time.time() - start_time
    return state


def fetch_kedb_matches(state: AgentState) -> Dict[str, Any]:
    """Node 4: Fetch KEDB matches"""
    start_time = time.time()
    
    try:
        incident = Incident.objects.get(id=state["incident_id"])
        repo = ContextRepository()
        kedb = repo.get_kedb_matches(incident)
        state["kedb_matches"] = kedb
        
    except Exception as e:
        logger.error(f"Error in fetch_kedb_matches: {e}")
        state["errors"].append(f"fetch_kedb_matches: {str(e)}")
        state["degraded_context"] = True
    
    state["node_latencies"]["fetch_kedb_matches"] = time.time() - start_time
    return state


def synthesize_hypotheses(state: AgentState) -> Dict[str, Any]:
    """Node 5: Synthesize hypotheses using LLM"""
    start_time = time.time()
    
    try:
        client = ClaudeClient()
        
        # Build context for LLM
        context_parts = []
        
        if state.get("incident_payload"):
            inc = state["incident_payload"]
            context_parts.append(f"Incident: {inc.number} - {inc.short_description}")
            if inc.description:
                context_parts.append(f"Description: {inc.description}")
            context_parts.append(f"Priority: {inc.priority}, Category: {inc.category}")
        
        if state.get("alert_context"):
            alert = state["alert_context"]
            context_parts.append(f"Alert: {alert.alert_name} from {alert.source}")
        
        if state.get("ci_metrics"):
            ci = state["ci_metrics"]
            context_parts.append(f"CI: {ci.ci_name} (Critical: {ci.is_critical})")
        
        if state.get("similar_incidents"):
            context_parts.append(f"\nSimilar resolved incidents:")
            for sim in state["similar_incidents"][:3]:
                context_parts.append(f"- {sim.number}: {sim.short_description}")
                if sim.resolution_notes:
                    context_parts.append(f"  Resolution: {sim.resolution_notes[:200]}")
        
        context_text = "\n".join(context_parts)
        
        system_prompt = """You are an expert incident analyst. Analyze the incident and provide:
1. Root cause hypotheses with confidence scores (0.0-1.0)
2. Evidence references (format: kedb:123, incident:INC-101, metric:cpu_spike)

CRITICAL: Do not fabricate facts. Only use provided context. If uncertain, lower confidence score.
Output must be valid JSON."""
        
        user_prompt = f"""Analyze this incident and provide hypotheses:

{context_text}

Output JSON format:
{{
  "hypotheses": [
    {{
      "cause": "description",
      "confidence": 0.8,
      "evidence_refs": ["incident:INC-101"]
    }}
  ]
}}"""
        
        result = client.generate_structured_output(system_prompt, user_prompt)
        
        # Parse hypotheses
        hypotheses = [
            Hypothesis(**h) for h in result.get("hypotheses", [])
        ]
        state["hypotheses"] = hypotheses
        
    except Exception as e:
        logger.error(f"Error in synthesize_hypotheses: {e}")
        state["errors"].append(f"synthesize_hypotheses: {str(e)}")
        state["hypotheses"] = []
    
    state["node_latencies"]["synthesize_hypotheses"] = time.time() - start_time
    return state


def generate_action_plan(state: AgentState) -> Dict[str, Any]:
    """Node 6: Generate action plan using LLM"""
    start_time = time.time()
    
    try:
        client = ClaudeClient()
        
        # Build context
        hypotheses_text = "\n".join([
            f"- {h.cause} (confidence: {h.confidence})"
            for h in state.get("hypotheses", [])
        ])
        
        system_prompt = """You are an incident response expert. Based on hypotheses, suggest:
1. Immediate workaround
2. Next actions with risk levels (low/medium/high)
3. Mark if action is safe for auto-execution

CRITICAL: Only suggest low-risk actions for auto-execution. No destructive operations.
Output must be valid JSON."""
        
        user_prompt = f"""Based on these hypotheses, suggest actions:

{hypotheses_text}

Output JSON format:
{{
  "workaround": "description",
  "actions": [
    {{
      "action": "description",
      "risk": "low",
      "auto_executable": true,
      "reason": "explanation"
    }}
  ]
}}"""
        
        result = client.generate_structured_output(system_prompt, user_prompt)
        
        # Parse actions
        actions = [
            SuggestedAction(**a) for a in result.get("actions", [])
        ]
        state["action_plan"] = actions
        
    except Exception as e:
        logger.error(f"Error in generate_action_plan: {e}")
        state["errors"].append(f"generate_action_plan: {str(e)}")
        state["action_plan"] = []
    
    state["node_latencies"]["generate_action_plan"] = time.time() - start_time
    return state


def run_policy_checks(state: AgentState) -> Dict[str, Any]:
    """Node 7: Run policy checks"""
    start_time = time.time()
    
    try:
        incident = Incident.objects.get(id=state["incident_id"])
        engine = PolicyEngine()
        
        # Calculate confidence score from hypotheses
        hypotheses = state.get("hypotheses", [])
        confidence_score = max([h.confidence for h in hypotheses]) if hypotheses else 0.0
        
        policy_result = engine.evaluate(
            incident=incident,
            actions=state.get("action_plan", []),
            ci_metrics=state.get("ci_metrics"),
            confidence_score=confidence_score
        )
        
        state["policy_result"] = policy_result
        
    except Exception as e:
        logger.error(f"Error in run_policy_checks: {e}")
        state["errors"].append(f"run_policy_checks: {str(e)}")
        state["policy_result"] = None
    
    state["node_latencies"]["run_policy_checks"] = time.time() - start_time
    return state


def persist_results(state: AgentState) -> Dict[str, Any]:
    """Node 8: Persist results to incident"""
    start_time = time.time()
    
    try:
        incident = Incident.objects.get(id=state["incident_id"])
        client = ClaudeClient()
        
        # Calculate scores
        hypotheses = state.get("hypotheses", [])
        confidence_score = max([h.confidence for h in hypotheses]) if hypotheses else 0.0
        blast_radius_score = 0.3 if state.get("ci_metrics") and state["ci_metrics"].is_critical else 0.1
        
        # Build final output
        final_output = AIAnalysisOutput(
            summary=f"Analyzed incident with {len(hypotheses)} hypotheses",
            hypotheses=hypotheses,
            suggested_workaround="See action plan",
            suggested_next_actions=state.get("action_plan", []),
            policy_decision=state.get("policy_result"),
            confidence_score=confidence_score,
            blast_radius_score=blast_radius_score,
            generated_at=datetime.utcnow().isoformat(),
            model=client.get_model_version(),
            prompt_version=client.get_prompt_version()
        )
        
        # Save to incident
        # Use model_dump() for Pydantic v2, fallback to dict() for v1
        incident.ai_analysis = final_output.model_dump() if hasattr(final_output, 'model_dump') else final_output.dict()
        incident.ai_status = 'COMPLETED'
        incident.ai_last_run_at = datetime.utcnow()
        incident.ai_model_version = client.get_model_version()
        incident.ai_error = None
        incident.save()
        
        state["final_output"] = final_output
        
    except Exception as e:
        logger.error(f"Error in persist_results: {e}")
        state["errors"].append(f"persist_results: {str(e)}")
        
        # Mark as failed
        try:
            incident = Incident.objects.get(id=state["incident_id"])
            incident.ai_status = 'FAILED'
            incident.ai_error = str(e)
            incident.save()
        except:
            pass
    
    state["node_latencies"]["persist_results"] = time.time() - start_time
    return state


def execute_low_risk_actions(state: AgentState) -> Dict[str, Any]:
    """Node 9: Execute low-risk actions if policy allows"""
    start_time = time.time()
    
    try:
        policy_result = state.get("policy_result")
        if not policy_result or not policy_result.allowed:
            logger.info("Policy blocked auto-execution")
            state["node_latencies"]["execute_low_risk_actions"] = time.time() - start_time
            return state
        
        incident = Incident.objects.get(id=state["incident_id"])
        actions = state.get("action_plan", [])
        
        # Execute only low-risk, auto-executable actions
        for action in actions:
            if action.risk == "low" and action.auto_executable:
                # Create timeline enrichment note
                Activity.objects.create(
                    incident=incident,
                    action="AI_SUGGESTION",
                    description=f"AI Agent: {action.action}",
                    user=None
                )
                logger.info(f"Executed action: {action.action}")
        
    except Exception as e:
        logger.error(f"Error in execute_low_risk_actions: {e}")
        state["errors"].append(f"execute_low_risk_actions: {str(e)}")
    
    state["node_latencies"]["execute_low_risk_actions"] = time.time() - start_time
    return state


def finalize_status(state: AgentState) -> Dict[str, Any]:
    """Node 10: Finalize status"""
    start_time = time.time()
    
    try:
        incident = Incident.objects.get(id=state["incident_id"])
        
        if state.get("errors"):
            incident.ai_status = 'FAILED'
            incident.ai_error = "; ".join(state["errors"])
        else:
            incident.ai_status = 'COMPLETED'
            incident.ai_error = None
        
        incident.save()
        
        # Log completion
        logger.info(
            f"AI analysis completed for {incident.number}. "
            f"Status: {incident.ai_status}, "
            f"Latencies: {state.get('node_latencies', {})}"
        )
        
    except Exception as e:
        logger.error(f"Error in finalize_status: {e}")
        state["errors"].append(f"finalize_status: {str(e)}")
    
    state["node_latencies"]["finalize_status"] = time.time() - start_time
    return state
