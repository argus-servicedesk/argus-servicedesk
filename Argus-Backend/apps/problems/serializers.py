from rest_framework import serializers
from .models import Problem
from apps.accounts.serializers import UserSerializer
from apps.organizations.serializers import OrganizationSerializer


class ProblemSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    assignment_group = serializers.SerializerMethodField()
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = Problem
        fields = [
            'id', 'number', 'short_description', 'description', 'state', 'priority',
            'category', 'assigned_to', 'assignment_group', 'created_by',
            'root_cause', 'root_cause_analysis', 'workaround', 'workaround_effective',
            'permanent_fix', 'fix_implemented', 'related_change', 'is_known_error',
            'known_error_id', 'organization', 'linked_incidents', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'number', 'created_by', 'created_at', 'updated_at']

    def get_assignment_group(self, obj):
        if obj.assignment_group:
            return {'id': str(obj.assignment_group.id), 'name': obj.assignment_group.name}
        return None


class ProblemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Problem
        fields = [
            'short_description', 'description', 'priority', 'category',
            'assigned_to', 'assignment_group', 'related_change'
        ]

    def create(self, validated_data):
        from django.utils import timezone
        import random
        import string
        
        year = timezone.now().year
        random_str = ''.join(random.choices(string.digits, k=6))
        number = f"PRB{year}{random_str}"
        
        validated_data['number'] = number
        validated_data['created_by'] = self.context['request'].user
        validated_data['organization'] = self.context['request'].user.organization
        
        return super().create(validated_data)


class ProblemUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Problem
        fields = [
            'short_description', 'description', 'state', 'priority', 'category',
            'assigned_to', 'assignment_group', 'root_cause', 'root_cause_analysis',
            'workaround', 'workaround_effective', 'permanent_fix', 'fix_implemented',
            'is_known_error'
        ]
