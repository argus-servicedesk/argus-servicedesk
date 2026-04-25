from django.urls import path
from .views import ChangeListCreateView, ChangeDetailView, ApprovalCreateView, ChangeApproveView, ChangeRejectView

urlpatterns = [
    path("", ChangeListCreateView.as_view(), name="change-list-create"),
    path("<uuid:pk>/", ChangeDetailView.as_view(), name="change-detail"),
    path("<uuid:change_id>/approvals/", ApprovalCreateView.as_view(), name="approval-create"),
    path("<uuid:pk>/approve/", ChangeApproveView.as_view(), name="change-approve"),
    path("<uuid:pk>/reject/", ChangeRejectView.as_view(), name="change-reject"),
]
