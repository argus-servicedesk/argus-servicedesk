from django.urls import path

from .views import (
    ChangeReportView,
    ExecutiveSummaryView,
    IncidentReportView,
    IncidentTrendView,
    TeamPerformanceView,
)

urlpatterns = [
    path("executive-summary", ExecutiveSummaryView.as_view(), name="reports-executive-summary"),
    path("executive-summary/", ExecutiveSummaryView.as_view(), name="reports-executive-summary-slash"),
    path("incidents", IncidentReportView.as_view(), name="reports-incidents"),
    path("incidents/", IncidentReportView.as_view(), name="reports-incidents-slash"),
    path("incident-trend", IncidentTrendView.as_view(), name="reports-incident-trend"),
    path("incident-trend/", IncidentTrendView.as_view(), name="reports-incident-trend-slash"),
    path("changes", ChangeReportView.as_view(), name="reports-changes"),
    path("changes/", ChangeReportView.as_view(), name="reports-changes-slash"),
    path("team-performance", TeamPerformanceView.as_view(), name="reports-team-performance"),
    path("team-performance/", TeamPerformanceView.as_view(), name="reports-team-performance-slash"),
]
