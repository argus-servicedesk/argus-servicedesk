"""Celery tasks for SLA maintenance (schedule via beat in production)."""

from celery import shared_task


@shared_task(name="sla.sweep_open_incident_sla")
def sweep_open_incident_sla() -> int:
    """
    Recompute SLA breach flags and milestone notifications for non-terminal incidents.
    Intended to run every 1–5 minutes behind Celery Beat.
    """
    from apps.incidents.models import Incident
    from apps.sla.engine import process_incident_slas

    qs = Incident.objects.filter(
        organization_id__isnull=False,
        state__in=["NEW", "IN_PROGRESS", "ESCALATED", "ON_HOLD"],
    )
    updated = 0
    for incident in qs.iterator(chunk_size=200):
        # The new engine handles state transitions, TaskSLA creation, 
        # and denormalizing breach status back to the incident.
        process_incident_slas(incident)
        updated += 1
    return updated
