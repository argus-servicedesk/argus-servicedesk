from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.incidents.models import Incident
from apps.sla.engine import process_incident_slas

@receiver(post_save, sender=Incident)
def trigger_sla_evaluation(sender, instance, created, **kwargs):
    """
    Triggers the SLA Engine whenever an Incident is created or updated.
    """
    process_incident_slas(instance)
