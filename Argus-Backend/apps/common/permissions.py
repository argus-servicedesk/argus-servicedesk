"""Role-based permissions for ITSM record updates (production RBAC)."""

from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class DenyViewerMutations(BasePermission):
    """VIEWER may only use safe HTTP methods."""

    message = "Viewers have read-only access."

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        role = getattr(request.user, "role", None)
        return role != User.Role.VIEWER


class IncidentTransitionRBAC(BasePermission):
    """
    OPERATOR: triage only — no resolve/close/cancel/reopen.
    ENGINEER and above: full incident lifecycle.
    """

    message = "Your role cannot perform this incident transition."

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
        role = getattr(request.user, "role", None)
        if role in (User.Role.VIEWER,):
            return False
        if role in (User.Role.ADMIN, User.Role.MANAGER, User.Role.ENGINEER):
            return True
        if role != User.Role.OPERATOR:
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
        role = getattr(request.user, "role", None)
        if role in (User.Role.VIEWER,):
            return False
        if role in (User.Role.ADMIN, User.Role.MANAGER, User.Role.ENGINEER):
            return True
        if role != User.Role.OPERATOR:
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
        role = getattr(request.user, "role", None)
        if role in (User.Role.VIEWER,):
            return False
        if role in (User.Role.ADMIN, User.Role.MANAGER):
            return True

        new_state = request.data.get("state", obj.state)
        if new_state == obj.state:
            return True

        if role == User.Role.OPERATOR:
            if new_state in self._GOVERNANCE_STATES or new_state == "CANCELLED":
                return False
            return True

        if role == User.Role.ENGINEER:
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
        role = getattr(request.user, "role", None)
        return role in (User.Role.ADMIN, User.Role.MANAGER)


class IsAdminOrManager(BasePermission):
    """Only ADMIN or MANAGER roles allowed."""
    message = "Only admins and managers have permission to perform this action."

    def has_permission(self, request, view) -> bool:
        role = getattr(request.user, "role", None)
        return role in (User.Role.ADMIN, User.Role.MANAGER)


class IsOrgMember(BasePermission):
    """User must belong to the organization being accessed."""
    message = "You do not belong to this organization."

    def has_permission(self, request, view) -> bool:
        org_id = getattr(request, "organization_id", None)
        if not org_id:
            return False
        return str(request.user.organization_id) == str(org_id)
