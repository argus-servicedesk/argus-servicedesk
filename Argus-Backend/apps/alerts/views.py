from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from apps.common.responses import success
from .models import Alert
from .serializers import AlertSerializer, AlertUpdateSerializer


class AlertListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['severity', 'status', 'source']
    
    def get_queryset(self):
        queryset = Alert.objects.filter(organization_id=self.request.organization_id)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(alert_id__icontains=search) | 
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset.select_related('acknowledged_by', 'config_item', 'incident')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AlertSerializer
        return AlertSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        alert = serializer.save(organization=request.user.organization)
        return success(AlertSerializer(alert).data, "alert created", 201)


class AlertDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Alert.objects.select_related('acknowledged_by', 'config_item', 'incident')
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AlertUpdateSerializer
        return AlertSerializer


class AlertStatsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        queryset = Alert.objects.filter(organization_id=request.organization_id)
        
        stats = {
            'total': queryset.count(),
            'firing': queryset.filter(status='FIRING').count(),
            'resolved': queryset.filter(status='RESOLVED').count(),
            'acknowledged': queryset.filter(status='ACKNOWLEDGED').count(),
            'critical': queryset.filter(severity='CRITICAL').count(),
            'warning': queryset.filter(severity='WARNING').count(),
            'info': queryset.filter(severity='INFO').count(),
        }
        
        return success(stats)
