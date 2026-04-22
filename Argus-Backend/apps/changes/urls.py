from django.urls import path
from .views import ChangeListCreateView, ChangeDetailView, ApprovalCreateView

urlpatterns = [
    path("", ChangeListCreateView.as_view(), name="change-list-create"),
    path("<uuid:pk>/", ChangeDetailView.as_view(), name="change-detail"),
    path("<uuid:change_id>/approvals/", ApprovalCreateView.as_view(), name="approval-create"),
]
