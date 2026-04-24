import uuid

from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.organizations.models import Organization


class OrganizationContextMiddleware:
    """
    Resolves request.organization from the authenticated user record.

    Public paths are skipped.
    For authenticated requests:
    - X-Organization-Id is treated as a hint only
    - the hinted org must match the user's organization in the database
    - if no valid org can be resolved, return 403
    """

    EXEMPT_PREFIXES = (
        "/admin/",
        "/health/",
        "/api/schema/",
        "/api/docs/",
        "/api/v1/health",
    )
    EXEMPT_PATHS = {
        "/api/v1/auth",
        "/api/v1/auth/",
        "/api/v1/auth/login",
        "/api/v1/auth/login/",
        "/api/v1/auth/signup",
        "/api/v1/auth/signup/",
        "/api/v1/auth/register",
        "/api/v1/auth/register/",
        "/api/v1/auth/refresh",
        "/api/v1/auth/refresh/",
    }

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_authenticator = JWTAuthentication()

    def __call__(self, request):
        request.organization = None
        request.organization_id = None

        path = request.path or ""
        if path in self.EXEMPT_PATHS or any(path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES):
            return self.get_response(request)

        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            try:
                auth_result = self.jwt_authenticator.authenticate(request)
            except Exception:
                auth_result = None

            if auth_result is not None:
                user, _validated_token = auth_result
                request.user = user

        if not getattr(request, "user", None) or not request.user.is_authenticated:
            return self.get_response(request)

        hinted_org_id = request.headers.get("X-Organization-Id")
        validated_org_uuid = None

        if hinted_org_id:
            try:
                validated_org_uuid = uuid.UUID(str(hinted_org_id))
            except (ValueError, AttributeError):
                return JsonResponse({"detail": "Invalid organization ID"}, status=400)

        user_org_id = getattr(request.user, "organization_id", None)

        if validated_org_uuid is not None:
            if str(user_org_id) != str(validated_org_uuid):
                return JsonResponse({"detail": "Organization access denied"}, status=403)
            organization = Organization.objects.filter(
                id=validated_org_uuid,
                is_active=True,
            ).first()
        else:
            organization = Organization.objects.filter(
                id=user_org_id,
                is_active=True,
            ).first()

        if organization is None:
            return JsonResponse({"detail": "Organization access denied"}, status=403)

        request.organization = organization
        request.organization_id = organization.id
        return self.get_response(request)

