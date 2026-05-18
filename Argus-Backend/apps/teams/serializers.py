from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Team, TeamMember
from apps.accounts.serializers import UserSerializer
from apps.organizations.models import Organization
from apps.organizations.serializers import OrganizationSerializer

User = get_user_model()


class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source='user',
        queryset=User.objects.all(),
        write_only=True,
        required=False,
    )
    team_id = serializers.UUIDField(source='team.id', read_only=True)
    joinedAt = serializers.DateTimeField(source='joined_at', read_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'user_id', 'team_id', 'role', 'joined_at', 'joinedAt']
        read_only_fields = ['id', 'joined_at']


class TeamSerializer(serializers.ModelSerializer):
    manager = UserSerializer(read_only=True)
    manager_id = serializers.PrimaryKeyRelatedField(
        source='manager',
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    organization = OrganizationSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        source='organization',
        queryset=Organization.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    members = TeamMemberSerializer(many=True, read_only=True)
    member_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )
    slackChannel = serializers.CharField(source='slack_channel', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Team
        fields = [
            'id', 'name', 'description', 'email', 'slack_channel', 'slackChannel',
            'manager', 'manager_id', 'is_active', 'isActive', 'organization',
            'organization_id', 'members', 'member_ids', 'created_at', 'createdAt',
            'updated_at', 'updatedAt'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TeamCreateSerializer(TeamSerializer):
    class Meta(TeamSerializer.Meta):
        pass

    def create(self, validated_data):
        member_ids = validated_data.pop('member_ids', [])
        request = self.context['request']
        if 'organization' not in validated_data:
            validated_data['organization'] = getattr(request, 'organization', None)
        team = Team.objects.create(**validated_data)
        for user_id in member_ids:
            TeamMember.objects.get_or_create(team=team, user_id=user_id)
        return team


class TeamUpdateSerializer(TeamSerializer):
    class Meta(TeamSerializer.Meta):
        pass

    def update(self, instance, validated_data):
        member_ids = validated_data.pop('member_ids', None)
        team = super().update(instance, validated_data)
        if member_ids is not None:
            TeamMember.objects.filter(team=team).delete()
            for user_id in member_ids:
                TeamMember.objects.get_or_create(team=team, user_id=user_id)
        return team
