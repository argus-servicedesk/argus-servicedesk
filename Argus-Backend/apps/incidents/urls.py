from django.urls import path
from .views import IncidentListCreateView, IncidentDetailView, IncidentStatsView, WorkNoteCreateView

urlpatterns = [
    path("", IncidentListCreateView.as_view(), name="incident-list-create"),
    path("<uuid:pk>/", IncidentDetailView.as_view(), name="incident-detail"),
    path("stats/", IncidentStatsView.as_view(), name="incident-stats"),
    path("<uuid:incident_id>/work-notes/", WorkNoteCreateView.as_view(), name="work-note-create"),
]
