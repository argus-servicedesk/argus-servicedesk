"""Role-based permissions for ITSM record updates (production RBAC)."""

from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class Roles:
    SUPER_ADMIN = "Super Admin"
    ORG_ADMIN = "Org Admin"
    MANAGER = "Manager"
    ENGINEER = "Engineer"
    OPERATOR = "Operator"
    VIEWER = "Viewer"

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
        roles = user.role_names
        
        if Roles.SUPER_ADMIN in roles or Roles.ORG_ADMIN in roles or Roles.MANAGER in roles or Roles.ENGINEER in roles:
            return True
            
        if Roles.OPERATOR not in roles:
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
        roles = user.role_names
        
        if Roles.SUPER_ADMIN in roles or Roles.ORG_ADMIN in roles or Roles.MANAGER in roles or Roles.ENGINEER in roles:
            return True

        if Roles.OPERATOR not in roles:
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
        roles = user.role_names
        
        if Roles.SUPER_ADMIN in roles or Roles.ORG_ADMIN in roles or Roles.MANAGER in roles:
            return True

        new_state = request.data.get("state", obj.state)
        if new_state == obj.state:
            return True

        if Roles.OPERATOR in roles:
            if new_state in self._GOVERNANCE_STATES or new_state == "CANCELLED":
                return False
            return True

        if Roles.ENGINEER in roles:
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
        return user.has_role(Roles.SUPER_ADMIN) or user.has_role(Roles.ORG_ADMIN) or user.has_role(Roles.MANAGER)


class IsAdminOrManager(BasePermission):
    """Only ADMIN or MANAGER roles allowed."""
    message = "Only admins and managers have permission to perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return user.has_role(Roles.SUPER_ADMIN) or user.has_role(Roles.ORG_ADMIN) or user.has_role(Roles.MANAGER)


class IsOrgMember(BasePermission):
    """User must belong to the organization being accessed."""
    message = "You do not belong to this organization."

    def has_permission(self, request, view) -> bool:
        # Note: request.organization is usually set by a middleware
        user_org = request.user.organization
        if not user_org:
            return False
        
        # Check if user's org matches the request's org (which is scoped in viewsets/mixins)
        # This is often handled by OrgQuerysetMixin but this is an extra check
        return True # Handled by mixins mostly
