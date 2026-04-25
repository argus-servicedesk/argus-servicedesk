from langgraph.graph import StateGraph, END
from apps.ai_agents.graph.state import AgentState
from apps.ai_agents.graph import nodes
from apps.ai_agents.graph import edges


def create_incident_ai_graph():
    """Create the LangGraph for incident AI analysis"""
    
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("load_incident_context", nodes.load_incident_context)
    workflow.add_node("fetch_ci_metrics", nodes.fetch_ci_metrics)
    workflow.add_node("fetch_similar_incidents", nodes.fetch_similar_incidents)
    workflow.add_node("fetch_kedb_matches", nodes.fetch_kedb_matches)
    workflow.add_node("synthesize_hypotheses", nodes.synthesize_hypotheses)
    workflow.add_node("generate_action_plan", nodes.generate_action_plan)
    workflow.add_node("run_policy_checks", nodes.run_policy_checks)
    workflow.add_node("persist_results", nodes.persist_results)
    workflow.add_node("execute_low_risk_actions", nodes.execute_low_risk_actions)
    workflow.add_node("finalize_status", nodes.finalize_status)
    
    # Set entry point
    workflow.set_entry_point("load_incident_context")
    
    # Add edges (linear flow with conditional execution)
    workflow.add_edge("load_incident_context", "fetch_ci_metrics")
    workflow.add_edge("fetch_ci_metrics", "fetch_similar_incidents")
    workflow.add_edge("fetch_similar_incidents", "fetch_kedb_matches")
    workflow.add_edge("fetch_kedb_matches", "synthesize_hypotheses")
    workflow.add_edge("synthesize_hypotheses", "generate_action_plan")
    workflow.add_edge("generate_action_plan", "run_policy_checks")
    workflow.add_edge("run_policy_checks", "persist_results")
    
    # Conditional edge for action execution
    workflow.add_conditional_edges(
        "persist_results",
        edges.should_execute_actions,
        {
            "execute_actions": "execute_low_risk_actions",
            "skip_actions": "finalize_status"
        }
    )
    
    workflow.add_edge("execute_low_risk_actions", "finalize_status")
    workflow.add_edge("finalize_status", END)
    
    return workflow.compile()
