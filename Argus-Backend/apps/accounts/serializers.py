from django.contrib.auth import get_user_model
from .models import Role, Permission
from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.organizations.models import Organization
from apps.organizations.serializers import OrganizationSerializer

User = get_user_model()


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("id", "name", "code", "description")

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=Permission.objects.all(), source="permissions"
    )

    class Meta:
        model = Role
        fields = ("id", "name", "description", "permissions", "permission_ids", "is_system")

class UserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    role_names = serializers.SerializerMethodField()
    role_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=Role.objects.all(), source="roles"
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "roles",
            "role_names",
            "role_ids",
            "organization",
            "mfa_enabled",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_role_names(self, obj):
        return obj.role_names


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=12)
    organization = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ("username", "email", "password", "first_name", "last_name", "organization")

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        attrs["email"] = email
        username = (attrs.get("username") or email).strip().lower()
        attrs["username"] = username
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        organization_id = validated_data.pop("organization", None)

        if not organization_id:
            org, _created = Organization.objects.get_or_create(
                name="Default Organization",
                defaults={"slug": "default-org"},
            )
            organization_id = org.id

        user = User(**validated_data, organization_id=organization_id)
        user.set_password(password)
        try:
            user.save()
        except IntegrityError:
            raise serializers.ValidationError(
                {
                    "email": "An account with this email already exists.",
                    "username": "This username or email is already registered.",
                }
            )
        return user


class MeSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    role_names = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "roles",
            "role_names",
            "organization",
            "organization_name",
            "mfa_enabled",
        )

    def get_role_names(self, obj):
        return obj.role_names

