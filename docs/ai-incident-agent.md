# AI Incident Agent

## Architecture

The AI Incident Agent is a semi-autonomous system that analyzes incidents and provides intelligent recommendations using LangGraph and Claude AI.

### Components

1. **LangGraph Workflow** (`apps/ai_agents/graph/`)
   - State management for incident analysis
   - 10 nodes for context loading, analysis, and action execution
   - Conditional edges based on policy decisions

2. **Claude Provider** (`apps/ai_agents/providers/claude_client.py`)
   - Wrapper for Anthropic Claude API
   - Retry logic and timeout handling
   - Structured JSON output parsing

3. **Context Repository** (`apps/ai_agents/repositories/context_repository.py`)
   - Fetches incident context, CI metrics, similar incidents, KEDB matches
   - Handles partial context gracefully

4. **Policy Engine** (`apps/ai_agents/policy/policy_engine.py`)
   - Evaluates if actions can be auto-executed
   - Rules: severity, CI criticality, confidence threshold

5. **Service Layer** (`apps/ai_agents/services/incident_ai_service.py`)
   - Orchestrates the analysis workflow
   - Handles errors and state management

6. **Celery Task** (`apps/ai_agents/tasks.py`)
   - Async execution triggered on incident creation
   - Non-blocking for incident API

### Data Model

AI fields added to `Incident` model:
- `ai_analysis` (JSONField): Structured analysis output
- `ai_status` (CharField): PENDING | COMPLETED | FAILED
- `ai_last_run_at` (DateTimeField)
- `ai_model_version` (CharField)
- `ai_error` (TextField)

### AI Analysis Output Schema

```json
{
  "summary": "string",
  "hypotheses": [
    {
      "cause": "string",
      "confidence": 0.8,
      "evidence_refs": ["incident:INC-101", "kedb:123"]
    }
  ],
  "suggested_workaround": "string",
  "suggested_next_actions": [
    {
      "action": "string",
      "risk": "low|medium|high",
      "auto_executable": true,
      "reason": "string"
    }
  ],
  "policy_decision": {
    "allowed": true,
    "blocked_reasons": []
  },
  "confidence_score": 0.85,
  "blast_radius_score": 0.1,
  "generated_at": "2026-04-25T10:00:00Z",
  "model": "claude-3-5-sonnet-20241022",
  "prompt_version": "v1.0.0"
}
```

## Workflow

1. **Incident Created** → Celery task enqueued
2. **Load Context** → Fetch incident, CI, similar incidents, KEDB
3. **Synthesize Hypotheses** → LLM analyzes context
4. **Generate Actions** → LLM suggests next steps
5. **Policy Check** → Evaluate if auto-execution allowed
6. **Persist Results** → Save to incident.ai_analysis
7. **Execute Actions** (if allowed) → Add timeline notes
8. **Finalize** → Set ai_status to COMPLETED/FAILED

## Policy Rules

Auto-execution allowed only when ALL true:
- Incident priority in [P3, P4]
- CI not tagged critical
- No high-risk change collision
- Action risk == "low"
- Confidence score >= 0.75

Otherwise: recommendation only.

## API Endpoints

### Get Incident (includes AI fields)
```
GET /api/v1/incidents/<id>/
```

Response includes:
```json
{
  "ai_analysis": {...},
  "ai_status": "COMPLETED",
  "ai_last_run_at": "2026-04-25T10:00:00Z",
  "ai_model_version": "claude-3-5-sonnet-20241022",
  "ai_error": null
}
```

### Reanalyze Incident
```
POST /api/v1/incidents/<id>/ai/reanalyze/
```

Triggers new AI analysis asynchronously.

## Configuration

Add to Django settings:

```python
# AI Agent Configuration
ANTHROPIC_API_KEY = env('ANTHROPIC_API_KEY')
AI_MODEL = 'claude-3-5-sonnet-20241022'
AI_TIMEOUT = 60  # seconds

# Celery
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
```

## Running

1. **Migrations**:
```bash
python manage.py makemigrations
python manage.py migrate
```

2. **Celery Worker**:
```bash
celery -A config worker -l info
```

3. **Create Incident**:
```bash
curl -X POST http://localhost:8000/api/v1/incidents/ \
  -H "Authorization: Bearer <token>" \
  -d '{"short_description": "Test", "impact": "TEAM", "urgency": "MEDIUM"}'
```

AI analysis runs asynchronously. Check `ai_status` field.

## Safety Features

- Never blocks incident creation
- Graceful degradation with partial context
- Policy engine prevents destructive actions
- PII redaction before LLM calls (TODO)
- Correlation IDs for tracing
- Node latency tracking

## Testing

Run tests:
```bash
python manage.py test apps.ai_agents
```

## Monitoring

- Check Celery logs for task execution
- Monitor `ai_status` field distribution
- Track `node_latencies` in logs
- Alert on high failure rates

## Future Enhancements

- Phase 3: More autonomous actions with approval workflows
- Integration with external knowledge bases
- Multi-model support (fallback models)
- Real-time streaming analysis
- Custom policy rules per organization
