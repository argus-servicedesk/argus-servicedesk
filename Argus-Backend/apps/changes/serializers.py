from rest_framework import serializers
from .models import Change, Approval, ChangeCI
from apps.accounts.serializers import UserSerializer
from apps.organizations.serializers import OrganizationSerializer


class ApprovalSerializer(serializers.ModelSerializer):
    approver = UserSerializer(read_only=True)

    class Meta:
        model = Approval
        fields = ['id', 'approver', 'state', 'comments', 'approved_at', 'created_at']
        read_only_fields = ['id', 'approver', 'created_at']


class ChangeCISerializer(serializers.ModelSerializer):
    config_item = serializers.SerializerMethodField()

    class Meta:
        model = ChangeCI
        fields = ['id', 'config_item', 'impact_type']
        read_only_fields = ['id']

    def get_config_item(self, obj):
        if obj.config_item:
            return {'id': str(obj.config_item.id), 'name': obj.config_item.name}
        return None


class ChangeSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    assignment_group = serializers.SerializerMethodField()
    organization = OrganizationSerializer(read_only=True)
    approvals = ApprovalSerializer(many=True, read_only=True)
    affected_cis = ChangeCISerializer(many=True, read_only=True)

    class Meta:
        model = Change
        fields = [
            'id', 'number', 'short_description', 'description', 'type', 'state',
            'risk_level', 'category', 'assigned_to', 'assignment_group', 'created_by',
            'justification', 'implementation_plan', 'rollback_plan', 'test_plan',
            'communication_plan', 'planned_start_date', 'planned_end_date',
            'actual_start_date', 'actual_end_date', 'affected_services', 'downtime',
            'user_impact', 'git_repo_url', 'git_branch', 'git_commit_hash',
            'pull_request_url', 'review_notes', 'closure_code', 'organization',
            'approvals', 'affected_cis', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'number', 'created_by', 'created_at', 'updated_at']

    def get_assignment_group(self, obj):
        if obj.assignment_group:
            return {'id': str(obj.assignment_group.id), 'name': obj.assignment_group.name}
        return None


class ChangeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Change
        fields = [
            'short_description', 'description', 'type', 'risk_level', 'category',
            'assigned_to', 'assignment_group', 'justification', 'implementation_plan',
            'rollback_plan', 'test_plan', 'communication_plan', 'planned_start_date',
            'planned_end_date', 'affected_services', 'downtime', 'user_impact',
            'git_repo_url', 'git_branch', 'git_commit_hash', 'pull_request_url'
        ]

    def create(self, validated_data):
        from django.utils import timezone
        import random
        import string
        
        year = timezone.now().year
        random_str = ''.join(random.choices(string.digits, k=6))
        number = f"CHG{year}{random_str}"
        
        validated_data['number'] = number
        validated_data['created_by'] = self.context['request'].user
        validated_data['organization'] = self.context['request'].organization
        
        return super().create(validated_data)


class ChangeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Change
        fields = [
            'short_description', 'description', 'state', 'risk_level', 'category',
            'assigned_to', 'assignment_group', 'actual_start_date', 'actual_end_date',
            'review_notes', 'closure_code'
        ]
