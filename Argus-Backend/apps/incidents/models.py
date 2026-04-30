import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization
from apps.accounts.models import User as CustomUser

User = get_user_model()


class Incident(models.Model):
    class State(models.TextChoices):
        NEW = "NEW", "New"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        ON_HOLD = "ON_HOLD", "On Hold"
        ESCALATED = "ESCALATED", "Escalated"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"
        CANCELLED = "CANCELLED", "Cancelled"

    class Impact(models.TextChoices):
        ENTERPRISE = "ENTERPRISE", "Enterprise"
        DEPARTMENT = "DEPARTMENT", "Department"
        TEAM = "TEAM", "Team"
        INDIVIDUAL = "INDIVIDUAL", "Individual"

    class Urgency(models.TextChoices):
        CRITICAL = "CRITICAL", "Critical"
        HIGH = "HIGH", "High"
        MEDIUM = "MEDIUM", "Medium"
        LOW = "LOW", "Low"

    class Priority(models.TextChoices):
        P1 = "P1", "P1 - Critical"
        P2 = "P2", "P2 - High"
        P3 = "P3", "P3 - Medium"
        P4 = "P4", "P4 - Low"

    class Source(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        PROMETHEUS = "PROMETHEUS", "Prometheus"
        GRAFANA = "GRAFANA", "Grafana"
        API = "API", "API"
        EMAIL = "EMAIL", "Email"
        VOICE = "VOICE", "Voice"
        SLACK = "SLACK", "Slack"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=50, unique=True, db_index=True)
    short_description = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    state = models.CharField(max_length=20, choices=State.choices, default=State.NEW, db_index=True)
    impact = models.CharField(max_length=20, choices=Impact.choices, default=Impact.TEAM)
    urgency = models.CharField(max_length=20, choices=Urgency.choices, default=Urgency.MEDIUM)
    priority = models.CharField(max_length=2, choices=Priority.choices, default=Priority.P3, db_index=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    
    assigned_to = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    assignment_group = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    config_item = models.ForeignKey(
        'assets.ConfigurationItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents',
    )
    created_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='created_incidents')
        
    sla_breached = models.BooleanField(default=False, db_index=True)
    response_time = models.DurationField(blank=True, null=True)
    resolution_time = models.DurationField(blank=True, null=True)
    sla_target_response = models.DurationField(blank=True, null=True)
    sla_target_resolution = models.DurationField(blank=True, null=True)
    
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    source_alert_id = models.CharField(max_length=255, blank=True, null=True)
    source_alert_name = models.CharField(max_length=255, blank=True, null=True)
    
    resolved_at = models.DateTimeField(blank=True, null=True)
    closed_at = models.DateTimeField(blank=True, null=True)
    resolution_code = models.CharField(max_length=100, blank=True, null=True)
    resolution_notes = models.TextField(blank=True, null=True)
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='incidents')
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "incidents"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["state", "priority"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.number} - {self.short_description}"


class WorkNote(models.Model):
    class Source(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AI = "AI", "AI"
        SYSTEM = "SYSTEM", "System"
        SLACK = "SLACK", "Slack"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.TextField()
    is_internal = models.BooleanField(default=False)
    author = models.ForeignKey(User, on_delete=models.PROTECT, related_name='work_notes')
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='work_notes', null=True, blank=True)
    change = models.ForeignKey('changes.Change', on_delete=models.CASCADE, related_name='work_notes', null=True, blank=True)
    problem = models.ForeignKey('problems.Problem', on_delete=models.CASCADE, related_name='work_notes', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "work_notes"
        ordering = ["-created_at"]


class Activity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='activities')
    incident = models.ForeignKey('incidents.Incident', on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    change = models.ForeignKey('changes.Change', on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    problem = models.ForeignKey('problems.Problem', on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    config_item = models.ForeignKey(
        'assets.ConfigurationItem',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activities',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "activities"
        ordering = ["-created_at"]


class Attachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=255)
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    size = models.BigIntegerField()
    path = models.CharField(max_length=500)
    
    incident = models.ForeignKey('incidents.Incident', on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    change = models.ForeignKey('changes.Change', on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    problem = models.ForeignKey('problems.Problem', on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='uploaded_attachments')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attachments"
        ordering = ["-created_at"]


class IncidentProblem(models.Model):
    class LinkType(models.TextChoices):
        CAUSED_BY = "CAUSED_BY", "Caused By"
        RELATED = "RELATED", "Related"
        SYMPTOM_OF = "SYMPTOM_OF", "Symptom Of"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey('incidents.Incident', on_delete=models.CASCADE, related_name='linked_problems')
    problem = models.ForeignKey('problems.Problem', on_delete=models.CASCADE, related_name='linked_incidents')
    link_type = models.CharField(max_length=20, choices=LinkType.choices, default=LinkType.RELATED)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "incident_problems"


class IncidentChange(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        'incidents.Incident',
        on_delete=models.CASCADE,
        related_name='linked_changes',
    )
    change = models.ForeignKey(
        'changes.Change',
        on_delete=models.CASCADE,
        related_name='linked_incidents',
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "incident_changes"
        constraints = [
            models.UniqueConstraint(
                fields=["incident", "change"],
                name="uniq_incident_change_link",
            )
        ]


class UnmatchedAlert(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    raw_payload = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)
    alert_name = models.CharField(max_length=255)
    reason = models.CharField(max_length=255)

    class Meta:
        db_table = "unmatched_alerts"
        ordering = ["-received_at"]
