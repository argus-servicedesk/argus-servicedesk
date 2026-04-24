from rest_framework import serializers
from .models import Incident, WorkNote, Activity, Attachment, IncidentProblem, IncidentChange
from apps.accounts.serializers import UserSerializer
from apps.organizations.serializers import OrganizationSerializer


class IncidentProblemSerializer(serializers.ModelSerializer):
    problem = serializers.SerializerMethodField()

    class Meta:
        model = IncidentProblem
        fields = ['id', 'problem', 'link_type', 'notes']
        read_only_fields = ['id']

    def get_problem(self, obj):
        if obj.problem:
            return {
                'id': str(obj.problem.id),
                'number': obj.problem.number,
                'short_description': obj.problem.short_description,
                'state': obj.problem.state,
            }
        return None


class IncidentChangeSerializer(serializers.ModelSerializer):
    change = serializers.SerializerMethodField()

    class Meta:
        model = IncidentChange
        fields = ['id', 'change', 'notes']
        read_only_fields = ['id']

    def get_change(self, obj):
        if obj.change:
            return {
                'id': str(obj.change.id),
                'number': obj.change.number,
                'short_description': obj.change.short_description,
                'state': obj.change.state,
            }
        return None


class WorkNoteSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = WorkNote
        fields = ['id', 'content', 'is_internal', 'author', 'source', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']


class ActivitySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Activity
        fields = ['id', 'action', 'description', 'old_value', 'new_value', 'user', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = Attachment
        fields = ['id', 'filename', 'original_name', 'mime_type', 'size', 'path', 'uploaded_by', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']


class IncidentSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    assignment_group = serializers.SerializerMethodField()
    config_item = serializers.SerializerMethodField()
    organization = OrganizationSerializer(read_only=True)
    work_notes = WorkNoteSerializer(many=True, read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    linked_problems = IncidentProblemSerializer(many=True, read_only=True)
    linked_changes = IncidentChangeSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'number', 'short_description', 'description', 'state', 
            'impact', 'urgency', 'priority', 'category', 'subcategory',
            'assigned_to', 'assignment_group', 'created_by', 'config_item',
            'sla_breached', 'response_time', 'resolution_time',
            'sla_target_response', 'sla_target_resolution', 'source',
            'source_alert_id', 'source_alert_name', 'resolved_at', 'closed_at',
            'resolution_code', 'resolution_notes', 'organization',
            'work_notes', 'activities', 'attachments', 'linked_problems', 'linked_changes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'number', 'created_by', 'created_at', 'updated_at']

    def get_assignment_group(self, obj):
        if obj.assignment_group:
            return {'id': str(obj.assignment_group.id), 'name': obj.assignment_group.name}
        return None

    def get_config_item(self, obj):
        if obj.config_item:
            return {'id': str(obj.config_item.id), 'name': obj.config_item.name}
        return None


class IncidentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = [
            'short_description', 'description', 'impact', 'urgency',
            'category', 'subcategory', 'assigned_to', 'assignment_group',
            'config_item', 'source'
        ]

    def create(self, validated_data):
        from django.utils import timezone
        import random
        import string

        priority_matrix = {
            "ENTERPRISE": {"CRITICAL": "P1", "HIGH": "P1", "MEDIUM": "P2", "LOW": "P3"},
            "DEPARTMENT": {"CRITICAL": "P1", "HIGH": "P2", "MEDIUM": "P2", "LOW": "P3"},
            "TEAM": {"CRITICAL": "P2", "HIGH": "P2", "MEDIUM": "P3", "LOW": "P4"},
            "INDIVIDUAL": {"CRITICAL": "P2", "HIGH": "P3", "MEDIUM": "P4", "LOW": "P4"},
        }
        
        # Generate incident number
        year = timezone.now().year
        random_str = ''.join(random.choices(string.digits, k=6))
        number = f"INC{year}{random_str}"
        
        validated_data['number'] = number
        validated_data['created_by'] = self.context['request'].user
        validated_data['organization'] = getattr(self.context['request'], "organization", None) or self.context['request'].user.organization
        impact = validated_data.get("impact", Incident.Impact.TEAM)
        urgency = validated_data.get("urgency", Incident.Urgency.MEDIUM)
        validated_data["priority"] = priority_matrix.get(impact, priority_matrix["TEAM"]).get(urgency, "P3")
        
        return super().create(validated_data)


class IncidentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = [
            'short_description', 'description', 'state', 'impact', 'urgency',
            'priority', 'category', 'subcategory', 'assigned_to', 
            'assignment_group', 'resolution_code', 'resolution_notes'
        ]
