from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class Hypothesis(BaseModel):
    cause: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_refs: List[str] = Field(default_factory=list)


class SuggestedAction(BaseModel):
    action: str
    risk: Literal["low", "medium", "high"]
    auto_executable: bool
    reason: str


class PolicyDecision(BaseModel):
    allowed: bool
    blocked_reasons: List[str] = Field(default_factory=list)


class AIAnalysisOutput(BaseModel):
    summary: str
    hypotheses: List[Hypothesis]
    suggested_workaround: str
    suggested_next_actions: List[SuggestedAction]
    policy_decision: PolicyDecision
    confidence_score: float = Field(ge=0.0, le=1.0)
    blast_radius_score: float = Field(ge=0.0, le=1.0)
    generated_at: str
    model: str
    prompt_version: str


class IncidentContext(BaseModel):
    incident_id: str
    number: str
    short_description: str
    description: Optional[str]
    priority: str
    state: str
    category: Optional[str]
    subcategory: Optional[str]


class AlertContext(BaseModel):
    alert_name: Optional[str]
    alert_id: Optional[str]
    source: str
    raw_payload: Optional[dict]


class CIMetrics(BaseModel):
    ci_name: Optional[str]
    ci_id: Optional[str]
    metrics: dict = Field(default_factory=dict)
    is_critical: bool = False


class SimilarIncident(BaseModel):
    number: str
    short_description: str
    resolution_notes: Optional[str]
    resolution_code: Optional[str]
    similarity_score: float


class KEDBMatch(BaseModel):
    article_id: str
    title: str
    content: str
    relevance_score: float
