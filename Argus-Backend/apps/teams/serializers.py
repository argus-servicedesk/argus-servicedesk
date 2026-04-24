from rest_framework import serializers
from .models import Team, TeamMember
from apps.accounts.serializers import UserSerializer
from apps.organizations.serializers import OrganizationSerializer


class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class TeamSerializer(serializers.ModelSerializer):
    manager = UserSerializer(read_only=True)
    organization = OrganizationSerializer(read_only=True)
    members = TeamMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'description', 'email', 'slack_channel', 'manager', 'is_active', 'organization', 'members', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TeamCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['name', 'description', 'email', 'slack_channel', 'manager', 'is_active']

    def create(self, validated_data):
        validated_data['organization'] = self.context['request'].organization
        return super().create(validated_data)


class TeamUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['name', 'description', 'email', 'slack_channel', 'manager', 'is_active']
