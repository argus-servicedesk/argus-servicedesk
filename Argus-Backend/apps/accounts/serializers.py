from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.organizations.models import Organization

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "organization",
            "mfa_enabled",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    organization = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "first_name", "last_name", "role", "organization")

    def create(self, validated_data):
        password = validated_data.pop("password")
        organization_id = validated_data.pop("organization", None)
        
        # Auto-create a default organization if none provided
        if not organization_id:
            org, created = Organization.objects.get_or_create(
                name="Default Organization",
                defaults={"slug": "default-org"}
            )
            organization_id = org.id
        
        user = User(**validated_data, organization_id=organization_id)
        user.set_password(password)
        user.save()
        return user


class MeSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "organization",
            "organization_name",
            "mfa_enabled",
        )

