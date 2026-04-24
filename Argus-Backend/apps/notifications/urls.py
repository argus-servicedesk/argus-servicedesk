from django.urls import path

from .views import (
    MarkAllReadView,
    MarkNotificationReadView,
    NotificationDetailView,
    NotificationListView,
    UnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count", UnreadCountView.as_view(), name="notification-unread-count"),
    path("unread-count/", UnreadCountView.as_view(), name="notification-unread-count-slash"),
    path("read-all", MarkAllReadView.as_view(), name="notification-read-all"),
    path("read-all/", MarkAllReadView.as_view(), name="notification-read-all-slash"),
    path("<uuid:pk>/read", MarkNotificationReadView.as_view(), name="notification-mark-read"),
    path("<uuid:pk>/read/", MarkNotificationReadView.as_view(), name="notification-mark-read-slash"),
    path("<uuid:pk>/", NotificationDetailView.as_view(), name="notification-detail"),
    path("mark-all-read/", MarkAllReadView.as_view(), name="mark-all-read"),
]
