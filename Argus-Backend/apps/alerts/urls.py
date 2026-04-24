from django.urls import path
from .views import AlertKnowledgeBaseView, AlertListCreateView, AlertDetailView, AlertStatsView

urlpatterns = [
    path("", AlertListCreateView.as_view(), name="alert-list-create"),
    path("kb/", AlertKnowledgeBaseView.as_view(), name="alert-kb"),
    path("<uuid:pk>/", AlertDetailView.as_view(), name="alert-detail"),
    path("stats/", AlertStatsView.as_view(), name="alert-stats"),
]
