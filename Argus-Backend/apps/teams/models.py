import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization

User = get_user_model()


class Team(models.Model):
    class MemberRole(models.TextChoices):
        LEAD = "LEAD", "Lead"
        MEMBER = "MEMBER", "Member"
        OBSERVER = "OBSERVER", "Observer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    slack_channel = models.CharField(max_length=255, blank=True, null=True)
    
    manager = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_teams')
    is_active = models.BooleanField(default=True, db_index=True)
    
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='teams')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "teams"
        ordering = ["name"]

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='team_memberships')
    role = models.CharField(max_length=20, choices=Team.MemberRole.choices, default=Team.MemberRole.MEMBER)
    
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "team_members"
        unique_together = ['team', 'user']
