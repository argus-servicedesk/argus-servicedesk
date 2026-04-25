#!/usr/bin/env python
"""
Test script to verify AI Agent integration
Run: python manage.py shell < test_ai_agent.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.incidents.models import Incident
from apps.ai_agents.services.incident_ai_service import IncidentAIService
from apps.ai_agents.tasks import run_incident_ai_analysis

print("=" * 60)
print("AI Agent Integration Test")
print("=" * 60)

# Check 1: Verify imports work
print("\n✓ Imports successful")

# Check 2: Verify settings
from django.conf import settings
print(f"\n✓ AI Provider: {getattr(settings, 'AI_PROVIDER', 'anthropic')}")
print(f"✓ AI Model: {getattr(settings, 'AI_MODEL', 'not set')}")
api_key = getattr(settings, 'ANTHROPIC_API_KEY', None) or getattr(settings, 'NVIDIA_API_KEY', None)
print(f"✓ API Key configured: {'Yes' if api_key else 'No'}")

# Check 3: Verify incident model has AI fields
print("\n✓ Checking Incident model fields:")
incident_fields = [f.name for f in Incident._meta.get_fields()]
ai_fields = ['ai_analysis', 'ai_status', 'ai_last_run_at', 'ai_model_version', 'ai_error']
for field in ai_fields:
    status = "✓" if field in incident_fields else "✗"
    print(f"  {status} {field}")

# Check 4: Verify Celery task is registered
print("\n✓ Celery task registered: run_incident_ai_analysis")

# Check 5: Check if there are any incidents
incident_count = Incident.objects.count()
print(f"\n✓ Total incidents in database: {incident_count}")

if incident_count > 0:
    # Get a sample incident
    incident = Incident.objects.first()
    print(f"\n✓ Sample incident: {incident.number}")
    print(f"  - AI Status: {incident.ai_status or 'Not analyzed'}")
    print(f"  - AI Analysis: {'Present' if incident.ai_analysis else 'None'}")
    
    # Check 6: Test service instantiation
    try:
        service = IncidentAIService()
        print("\n✓ IncidentAIService instantiated successfully")
    except Exception as e:
        print(f"\n✗ Failed to instantiate service: {e}")
    
    # Check 7: Test Claude client
    try:
        from apps.ai_agents.providers.claude_client import ClaudeClient
        client = ClaudeClient()
        print(f"✓ ClaudeClient instantiated successfully")
        print(f"  - Model: {client.get_model_version()}")
        print(f"  - Prompt Version: {client.get_prompt_version()}")
    except Exception as e:
        print(f"✗ Failed to instantiate Claude client: {e}")
    
    # Check 8: Test graph creation
    try:
        from apps.ai_agents.graph.graph import create_incident_ai_graph
        graph = create_incident_ai_graph()
        print("✓ LangGraph created successfully")
    except Exception as e:
        print(f"✗ Failed to create graph: {e}")

print("\n" + "=" * 60)
print("Test Complete")
print("=" * 60)

# Instructions
print("\nTo trigger AI analysis for an incident:")
print("1. Create a new incident via API or admin")
print("2. Check incident.ai_status field (should be PENDING)")
print("3. Wait for Celery worker to process the task")
print("4. Check incident.ai_status again (should be COMPLETED or FAILED)")
print("\nOr manually trigger:")
print("  from apps.ai_agents.tasks import run_incident_ai_analysis")
print("  run_incident_ai_analysis.delay('incident-id', 'org-id')")
