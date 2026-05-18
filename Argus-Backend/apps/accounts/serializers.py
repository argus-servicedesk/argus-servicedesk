from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.common.permissions import Roles
from apps.organizations.models import Organization
from apps.organizations.serializers import OrganizationSerializer
from .models import Permission, Role

User = get_user_model()


ROLE_TO_FRONTEND = {
    Roles.SUPER_ADMIN: "ADMIN",
    Roles.ORG_ADMIN: "ADMIN",
    Roles.MANAGER: "MANAGER",
    Roles.TEAM_LEAD: "MANAGER",
    Roles.NOC: "OPERATOR",
    Roles.ENGINEER: "ENGINEER",
    Roles.CLIENT_USER: "CLIENT",
    Roles.OPERATOR: "OPERATOR",
    Roles.VIEWER: "VIEWER",
}

CLIENT_ROLE_NAMES = {Roles.CLIENT_USER, Roles.VIEWER}
INTERNAL_ROLE_NAMES = {
    Roles.SUPER_ADMIN,
    Roles.ORG_ADMIN,
    Roles.MANAGER,
    Roles.TEAM_LEAD,
    Roles.NOC,
    Roles.ENGINEER,
    Roles.OPERATOR,
}

DEFAULT_ROLE_DESCRIPTIONS = {
    Roles.SUPER_ADMIN: "FinSpot admin with access to all clients and records.",
    Roles.CLIENT_USER: "Client portal user scoped to one organization.",
    Roles.ENGINEER: "Internal resolver who works assigned tickets.",
    Roles.TEAM_LEAD: "Internal lead who manages team queues and assignments.",
    Roles.NOC: "NOC/L1 triage user for new and unassigned incidents.",
    Roles.MANAGER: "Service desk manager.",
    Roles.OPERATOR: "Service desk operator.",
    Roles.VIEWER: "Read-only user.",
}


def ensure_role(role_name: str) -> Role:
    return Role.objects.get_or_create(
        name=role_name,
        defaults={
            "description": DEFAULT_ROLE_DESCRIPTIONS.get(role_name, ""),
            "is_system": role_name in DEFAULT_ROLE_DESCRIPTIONS,
        },
    )[0]


def primary_role_name(user) -> str:
    names = list(user.roles.values_list("name", flat=True))
    if names:
        return names[0]
    if getattr(user, "is_superuser", False):
        return Roles.SUPER_ADMIN
    return Roles.CLIENT_USER


def frontend_role(user) -> str:
    return ROLE_TO_FRONTEND.get(primary_role_name(user), "VIEWER")


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("id", "code", "description", "created_at")


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        required=False,
        queryset=Permission.objects.all(),
        source="permissions",
    )

    class Meta:
        model = Role
        fields = ("id", "name", "description", "permissions", "permission_ids", "is_system")


class UserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    role_names = serializers.SerializerMethodField()
    roleNames = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    role_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        required=False,
        queryset=Role.objects.all(),
        source="roles",
    )
    organization = OrganizationSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source="organization",
        write_only=True,
        required=False,
        allow_null=True,
    )
    organizationId = serializers.SerializerMethodField()
    firstName = serializers.CharField(source="first_name", read_only=True)
    lastName = serializers.CharField(source="last_name", read_only=True)
    mfaEnabled = serializers.BooleanField(source="mfa_enabled", read_only=True)
    mustChangePassword = serializers.BooleanField(source="must_change_password", read_only=True)
    isActiveMember = serializers.BooleanField(source="is_active_member", read_only=True)
    status = serializers.SerializerMethodField()
    avatar = serializers.CharField(source="avatar_url", read_only=True)
    lastLogin = serializers.DateTimeField(source="last_login", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "firstName",
            "last_name",
            "lastName",
            "phone",
            "timezone",
            "roles",
            "role_names",
            "roleNames",
            "role",
            "role_ids",
            "organization",
            "organization_id",
            "organizationId",
            "mfa_enabled",
            "mfaEnabled",
            "must_change_password",
            "mustChangePassword",
            "is_active",
            "is_active_member",
            "isActiveMember",
            "status",
            "avatar_url",
            "avatar",
            "last_login",
            "lastLogin",
            "created_at",
            "createdAt",
            "updated_at",
            "updatedAt",
        )
        read_only_fields = ("id", "created_at", "updated_at", "last_login")

    def get_role_names(self, obj):
        return obj.role_names or ([Roles.SUPER_ADMIN] if obj.is_superuser else [])

    def get_roleNames(self, obj):
        return self.get_role_names(obj)

    def get_role(self, obj):
        return frontend_role(obj)

    def get_organizationId(self, obj):
        return str(obj.organization_id) if obj.organization_id else None

    def get_status(self, obj):
        if not obj.is_active or not obj.is_active_member:
            return "INACTIVE"
        return "ACTIVE"


class ManagedUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    timezone = serializers.CharField(required=False, allow_blank=True)
    role_name = serializers.CharField(default=Roles.CLIENT_USER)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.filter(is_active=True),
        required=False,
        allow_null=True,
        source="organization",
    )
    must_change_password = serializers.BooleanField(default=True)
    is_active = serializers.BooleanField(default=True)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        attrs["email"] = email
        attrs["username"] = (attrs.get("username") or email).strip().lower()
        role_name = attrs.get("role_name") or Roles.CLIENT_USER
        attrs["role_name"] = role_name
        organization = attrs.get("organization")

        if role_name in CLIENT_ROLE_NAMES and organization is None:
            raise serializers.ValidationError(
                {"organization_id": "Client users must be linked to a client organization."}
            )

        if role_name == Roles.SUPER_ADMIN:
            attrs["organization"] = None
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        role_name = validated_data.pop("role_name")
        password = validated_data.pop("password")
        user = User(**validated_data)
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
        user.roles.add(ensure_role(role_name))
        return user


class ManagedUserUpdateSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(required=False)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.filter(is_active=True),
        source="organization",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "phone",
            "timezone",
            "email",
            "username",
            "role_name",
            "organization_id",
            "is_active",
            "is_active_member",
            "must_change_password",
        )

    def validate(self, attrs):
        role_name = attrs.get("role_name")
        organization = attrs.get("organization", self.instance.organization if self.instance else None)
        if role_name in CLIENT_ROLE_NAMES and organization is None:
            raise serializers.ValidationError(
                {"organization_id": "Client users must be linked to a client organization."}
            )
        return attrs

    def update(self, instance, validated_data):
        role_name = validated_data.pop("role_name", None)
        instance = super().update(instance, validated_data)
        if role_name:
            instance.roles.set([ensure_role(role_name)])
        return instance


class PasswordSetSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)
    must_change_password = serializers.BooleanField(default=True)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    oldPassword = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_password = serializers.CharField(write_only=True, required=False, min_length=8)
    newPassword = serializers.CharField(write_only=True, required=False, min_length=8)

    def validate(self, attrs):
        new_password = attrs.get("new_password") or attrs.get("newPassword")
        if not new_password:
            raise serializers.ValidationError({"new_password": "New password is required."})
        attrs["new_password"] = new_password
        attrs["current_password"] = attrs.get("current_password") or attrs.get("oldPassword") or ""
        return attrs


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "phone",
            "timezone",
            "avatar_url",
            "notification_prefs",
        )


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
        user.roles.add(ensure_role(Roles.CLIENT_USER))
        return user


class MeSerializer(UserSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ("organization_name",)
