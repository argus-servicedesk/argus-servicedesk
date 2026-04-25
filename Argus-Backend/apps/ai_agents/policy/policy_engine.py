from typing import List
from apps.ai_agents.schemas import PolicyDecision, SuggestedAction, CIMetrics
from apps.incidents.models import Incident
import logging

logger = logging.getLogger(__name__)

# Policy configuration
ALLOWED_SEVERITIES = ['P3', 'P4']
CONFIDENCE_THRESHOLD = 0.75


class PolicyEngine:
    """Policy engine to determine if low-risk actions can be auto-executed"""
    
    def evaluate(
        self,
        incident: Incident,
        actions: List[SuggestedAction],
        ci_metrics: CIMetrics,
        confidence_score: float
    ) -> PolicyDecision:
        """
        Evaluate if actions can be auto-executed based on policy rules
        
        Rules:
        - Incident severity must be in allowed set (P3/P4)
        - CI not tagged critical
        - No active high-risk change collision (placeholder)
        - Action risk == low
        - Confidence score >= threshold
        """
        blocked_reasons = []
        
        # Check incident severity
        if incident.priority not in ALLOWED_SEVERITIES:
            blocked_reasons.append(
                f"Incident priority {incident.priority} not in allowed set {ALLOWED_SEVERITIES}"
            )
        
        # Check CI criticality
        if ci_metrics and ci_metrics.is_critical:
            blocked_reasons.append("CI is tagged as critical")
        
        # Check for high-risk change collision (placeholder)
        # In production, would check active changes affecting same CI
        
        # Check action risks
        high_risk_actions = [a for a in actions if a.risk != "low"]
        if high_risk_actions:
            blocked_reasons.append(
                f"{len(high_risk_actions)} actions have medium/high risk"
            )
        
        # Check confidence score
        if confidence_score < CONFIDENCE_THRESHOLD:
            blocked_reasons.append(
                f"Confidence score {confidence_score:.2f} below threshold {CONFIDENCE_THRESHOLD}"
            )
        
        allowed = len(blocked_reasons) == 0
        
        return PolicyDecision(
            allowed=allowed,
            blocked_reasons=blocked_reasons
        )
