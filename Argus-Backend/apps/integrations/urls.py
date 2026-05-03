from django.urls import path
from .views import IntegrationListCreateView, IntegrationDetailView

urlpatterns = [
    path("", IntegrationListCreateView.as_view()),
    path("<uuid:pk>", IntegrationDetailView.as_view()),
]
