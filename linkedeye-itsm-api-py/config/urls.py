from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/organizations/", include("apps.organizations.urls")),
    path("api/v1/incidents/", include("apps.incidents.urls")),
    path("api/v1/changes/", include("apps.changes.urls")),
    path("api/v1/problems/", include("apps.problems.urls")),
    path("api/v1/alerts/", include("apps.alerts.urls")),
    path("api/v1/assets/", include("apps.assets.urls")),
    path("api/v1/teams/", include("apps.teams.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),
    path("api/v1/integrations/", include("apps.integrations.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/search/", include("apps.search.urls")),
    path("api/v1/webhooks/", include("apps.webhooks.urls")),
    path("api/v1/status/", include("apps.status.urls")),
]

