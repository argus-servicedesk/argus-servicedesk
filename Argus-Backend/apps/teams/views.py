from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from apps.common.responses import success
from .models import Team, TeamMember
from .serializers import TeamSerializer, TeamCreateSerializer, TeamUpdateSerializer, TeamMemberSerializer


class TeamListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active']
    
    def get_queryset(self):
        queryset = Team.objects.filter(organization_id=self.request.organization_id)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search)
            )
        return queryset.select_related('manager').prefetch_related('members')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TeamCreateSerializer
        return TeamSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        team = serializer.save()
        return success(TeamSerializer(team).data, "team created", 201)


class TeamDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Team.objects.select_related('manager').prefetch_related('members')
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TeamUpdateSerializer
        return TeamSerializer


class TeamMemberCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TeamMemberSerializer
    
    def perform_create(self, serializer):
        team_id = self.kwargs.get('team_id')
        serializer.save(team_id=team_id)
