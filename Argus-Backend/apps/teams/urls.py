from django.urls import path
from .views import TeamListCreateView, TeamDetailView, TeamMemberCreateView

urlpatterns = [
    path("", TeamListCreateView.as_view(), name="team-list-create"),
    path("<uuid:pk>/", TeamDetailView.as_view(), name="team-detail"),
    path("<uuid:team_id>/members/", TeamMemberCreateView.as_view(), name="team-member-create"),
]
