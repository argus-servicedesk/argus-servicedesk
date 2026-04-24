import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization

User = get_user_model()


class TransitionLog(models.Model):
    MODULE_CHOICES = [
        ('INCIDENT', 'Incident'),
        ('PROBLEM', 'Problem'),
        ('CHANGE', 'Change'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.CASCADE)
    module = models.CharField(max_length=20, choices=MODULE_CHOICES)
    record_id = models.UUIDField()
    record_number = models.CharField(max_length=50)
    from_state = models.CharField(max_length=50)
    to_state = models.CharField(max_length=50)
    transitioned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    transitioned_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    actions_executed = models.JSONField(default=list)
    success = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-transitioned_at']