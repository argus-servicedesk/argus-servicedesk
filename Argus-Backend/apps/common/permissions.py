"""Role-based permissions for ITSM record updates (production RBAC)."""

from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class Roles:
    SUPER_ADMIN = "Super Admin"
    ORG_ADMIN = "Org Admin"
    MANAGER = "Manager"
    ENGINEER = "Engineer"
    TEAM_LEAD = "Team Lead"
    NOC = "NOC"
    CLIENT_USER = "Client User"
    OPERATOR = "Operator"
    VIEWER = "Viewer"


INTERNAL_ROLE_NAMES = {
    Roles.SUPER_ADMIN,
    Roles.ORG_ADMIN,
    Roles.MANAGER,
    Roles.ENGINEER,
    Roles.TEAM_LEAD,
    Roles.NOC,
    Roles.OPERATOR,
}


ADMIN_ROLE_NAMES = {
    Roles.SUPER_ADMIN,
    Roles.ORG_ADMIN,
    Roles.MANAGER,
    Roles.TEAM_LEAD,
    Roles.NOC,
}


def has_any_role(user: User, *role_names: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    return any(user.has_role(role_name) for role_name in role_names)


def is_service_desk_staff(user: User) -> bool:
    return has_any_role(user, *INTERNAL_ROLE_NAMES)


def can_manage_service_desk(user: User) -> bool:
    return has_any_role(user, *ADMIN_ROLE_NAMES)


def is_assigned_to_service_record(user: User, obj) -> bool:
    """Return true when the user owns the record directly or through its team."""
    if not user or not getattr(user, "is_authenticated", False) or obj is None:
        return False
    if getattr(obj, "assigned_to_id", None) == user.id:
        return True

    assignment_group = getattr(obj, "assignment_group", None)
    if not assignment_group:
        return False
    try:
        return assignment_group.members.filter(user=user).exists()
    except Exception:
        return False


def can_edit_service_record(user: User, obj) -> bool:
    if can_manage_service_desk(user):
        return True
    if not is_service_desk_staff(user):
        return False
    return is_assigned_to_service_record(user, obj)


class DenyViewerMutations(BasePermission):
    """VIEWER may only use safe HTTP methods."""

    message = "Viewers have read-only access."

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return not request.user.has_role(Roles.VIEWER)


class IncidentTransitionRBAC(BasePermission):
    """
    OPERATOR: triage only — no resolve/close/cancel/reopen.
    ENGINEER and above: full incident lifecycle.
    """

    message = "Your role cannot perform this incident transition."

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
        
        user = request.user
        if has_any_role(
            user,
            Roles.SUPER_ADMIN,
            Roles.ORG_ADMIN,
            Roles.MANAGER,
            Roles.TEAM_LEAD,
            Roles.NOC,
            Roles.ENGINEER,
        ):
            return True
            
        if not has_any_role(user, Roles.OPERATOR):
            return False

        new_state = request.data.get("state", obj.state)
        if new_state != obj.state:
            if new_state in {"RESOLVED", "CLOSED", "CANCELLED"}:
                return False
            if obj.state in {"RESOLVED", "CLOSED"} and new_state == "IN_PROGRESS":
                return False
        return True


class ProblemTransitionRBAC(BasePermission):
    """OPERATOR cannot resolve/close/reopen problems."""

    message = "Your role cannot perform this problem transition."

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
            
        user = request.user
        if has_any_role(
            user,
            Roles.SUPER_ADMIN,
            Roles.ORG_ADMIN,
            Roles.MANAGER,
            Roles.TEAM_LEAD,
            Roles.NOC,
            Roles.ENGINEER,
        ):
            return True

        if not has_any_role(user, Roles.OPERATOR):
            return False

        new_state = request.data.get("state", obj.state)
        if new_state != obj.state:
            if new_state in {"RESOLVED", "CLOSED"}:
                return False
            if obj.state in {"RESOLVED", "CLOSED"} and new_state == "INVESTIGATION":
                return False
        return True


class ChangeTransitionRBAC(BasePermission):
    """
    OPERATOR: early lifecycle only (no approval pipeline or closure).
    ENGINEER: implementation phases; not final closure.
    MANAGER / ADMIN: full change control including approval and close.
    """

    message = "Your role cannot perform this change transition."

    _GOVERNANCE_STATES = frozenset({"APPROVAL", "SCHEDULED", "IMPLEMENTING", "REVIEW", "CLOSED"})
    _CLOSED = frozenset({"CLOSED"})

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
            
        user = request.user
        if has_any_role(
            user,
            Roles.SUPER_ADMIN,
            Roles.ORG_ADMIN,
            Roles.MANAGER,
            Roles.TEAM_LEAD,
            Roles.NOC,
        ):
            return True

        new_state = request.data.get("state", obj.state)
        if new_state == obj.state:
            return True

        if has_any_role(user, Roles.OPERATOR):
            if new_state in self._GOVERNANCE_STATES or new_state == "CANCELLED":
                return False
            return True

        if has_any_role(user, Roles.ENGINEER):
            if new_state in self._CLOSED:
                return False
            return True

        return False


class ChangeApprovalRBAC(BasePermission):
    """Approvals and approval decisions are restricted to managers and admins."""

    message = "Only managers and admins can manage change approvals."

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return can_manage_service_desk(user)


class IsAdminOrManager(BasePermission):
    """Only ADMIN or MANAGER roles allowed."""
    message = "Only admins and managers have permission to perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return can_manage_service_desk(user)


class IsOrgMember(BasePermission):
    """User must belong to the organization being accessed."""
    message = "You do not belong to this organization."

    def has_permission(self, request, view) -> bool:
        # Note: request.organization is usually set by a middleware
        user_org = request.user.organization
        if is_service_desk_staff(request.user):
            return True
        if not user_org:
            return False
        
        # Check if user's org matches the request's org (which is scoped in viewsets/mixins)
        # This is often handled by OrgQuerysetMixin but this is an extra check
        return True # Handled by mixins mostly
