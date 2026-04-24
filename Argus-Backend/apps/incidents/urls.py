from django.urls import path
from .views import IncidentChangeLinkView, IncidentDetailView, IncidentListCreateView, IncidentLiveContextView, IncidentProblemLinkView, IncidentStatsView, IncidentTimelineView, WorkNoteCreateView

urlpatterns = [
    path("", IncidentListCreateView.as_view(), name="incident-list-create"),
    path("<uuid:pk>/", IncidentDetailView.as_view(), name="incident-detail"),
    path("<uuid:pk>/changes/", IncidentChangeLinkView.as_view(), name="incident-link-change"),
    path("<uuid:pk>/problems/", IncidentProblemLinkView.as_view(), name="incident-link-problem"),
    path("<uuid:pk>/timeline/", IncidentTimelineView.as_view(), name="incident-timeline"),
    path("<uuid:pk>/live-context", IncidentLiveContextView.as_view(), name="incident-live-context"),
    path("<uuid:pk>/live-context/", IncidentLiveContextView.as_view(), name="incident-live-context-slash"),
    path("stats/", IncidentStatsView.as_view(), name="incident-stats"),
    path("<uuid:incident_id>/work-notes/", WorkNoteCreateView.as_view(), name="work-note-create"),
]
