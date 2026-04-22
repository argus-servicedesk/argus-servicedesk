from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from apps.common.responses import success, failure
from .models import Incident, WorkNote, Activity, Attachment
from .serializers import IncidentSerializer, IncidentCreateSerializer, IncidentUpdateSerializer, WorkNoteSerializer


class IncidentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['state', 'priority', 'category', 'assigned_to']
    
    def get_queryset(self):
        queryset = Incident.objects.filter(organization_id=self.request.organization_id)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(number__icontains=search) | 
                Q(short_description__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset.select_related('assigned_to', 'created_by', 'assignment_group').prefetch_related('work_notes', 'linked_problems')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return IncidentCreateSerializer
        return IncidentSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        incident = serializer.save()
        return success(IncidentSerializer(incident).data, "incident created", 201)


class IncidentDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Incident.objects.select_related('assigned_to', 'created_by', 'assignment_group').prefetch_related('work_notes', 'activities', 'attachments', 'linked_problems')
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return IncidentUpdateSerializer
        return IncidentSerializer


class IncidentStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        queryset = Incident.objects.filter(organization_id=request.organization_id)
        
        stats = {
            'total': queryset.count(),
            'open': queryset.filter(state__in=['NEW', 'IN_PROGRESS', 'ON_HOLD', 'ESCALATED']).count(),
            'p1': queryset.filter(priority='P1').count(),
            'p2': queryset.filter(priority='P2').count(),
            'p3': queryset.filter(priority='P3').count(),
            'p4': queryset.filter(priority='P4').count(),
            'resolved': queryset.filter(state='RESOLVED').count(),
            'closed': queryset.filter(state='CLOSED').count(),
            'sla_breached': queryset.filter(sla_breached=True).count(),
        }
        
        return success(stats)


class WorkNoteCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkNoteSerializer
    
    def perform_create(self, serializer):
        incident_id = self.kwargs.get('incident_id')
        serializer.save(author=self.request.user, incident_id=incident_id)

