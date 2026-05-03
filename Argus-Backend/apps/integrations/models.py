import uuid
from django.db import models

class IntegrationType(models.TextChoices):
    SLACK = "SLACK", "Slack"
    TEAMS = "TEAMS", "Microsoft Teams"
    WEBHOOK = "WEBHOOK", "Generic Webhook"
    EMAIL = "EMAIL", "Email Inbound"

class Integration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", 
        on_delete=models.CASCADE, 
        related_name="integrations"
    )
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=IntegrationType.choices)
    config = models.JSONField(default=dict) # e.g., {"webhook_url": "...", "channel": "#alerts"}
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "integrations"
        ordering = ["-created_at"]
