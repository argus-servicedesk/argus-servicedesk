from django.urls import path
from .views import NotificationListView, NotificationDetailView, MarkAllReadView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("<uuid:pk>/", NotificationDetailView.as_view(), name="notification-detail"),
    path("mark-all-read/", MarkAllReadView.as_view(), name="mark-all-read"),
]
