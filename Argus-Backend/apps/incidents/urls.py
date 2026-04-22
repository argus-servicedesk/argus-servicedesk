from django.urls import path
from .views import IncidentListView, IncidentStatsView

urlpatterns = [
    path("", IncidentListView.as_view()),
    path("stats", IncidentStatsView.as_view()),
]

