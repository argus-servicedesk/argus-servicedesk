from apps.ai_agents.graph.state import AgentState


def should_execute_actions(state: AgentState) -> str:
    """Decide if we should execute actions based on policy"""
    policy_result = state.get("policy_result")
    
    if policy_result and policy_result.allowed:
        return "execute_actions"
    else:
        return "skip_actions"


def should_continue_after_context(state: AgentState) -> str:
    """Continue even if context loading partially failed"""
    # Always continue with partial context
    return "continue"
