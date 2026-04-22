from django.urls import path
from .views import ConfigurationItemListCreateView, ConfigurationItemDetailView, ConfigurationItemStatsView

urlpatterns = [
    path("", ConfigurationItemListCreateView.as_view(), name="ci-list-create"),
    path("<uuid:pk>/", ConfigurationItemDetailView.as_view(), name="ci-detail"),
    path("stats/", ConfigurationItemStatsView.as_view(), name="ci-stats"),
]
