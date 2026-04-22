from django.urls import path
from .views import AlertListCreateView, AlertDetailView, AlertStatsView

urlpatterns = [
    path("", AlertListCreateView.as_view(), name="alert-list-create"),
    path("<uuid:pk>/", AlertDetailView.as_view(), name="alert-detail"),
    path("stats/", AlertStatsView.as_view(), name="alert-stats"),
]
