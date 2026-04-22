from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from apps.common.responses import success
from .models import ConfigurationItem
from .serializers import ConfigurationItemSerializer, ConfigurationItemCreateSerializer, ConfigurationItemUpdateSerializer


class ConfigurationItemListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type', 'status', 'category']
    
    def get_queryset(self):
        queryset = ConfigurationItem.objects.filter(organization_id=self.request.organization_id)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(hostname__icontains=search) |
                Q(ip_address__icontains=search) |
                Q(serial_number__icontains=search)
            )
        return queryset.select_related('owner', 'support_group')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ConfigurationItemCreateSerializer
        return ConfigurationItemSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ci = serializer.save()
        return success(ConfigurationItemSerializer(ci).data, "configuration item created", 201)


class ConfigurationItemDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ConfigurationItem.objects.select_related('owner', 'support_group')
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ConfigurationItemUpdateSerializer
        return ConfigurationItemSerializer


class ConfigurationItemStatsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        queryset = ConfigurationItem.objects.filter(organization_id=request.organization_id)
        
        stats = {
            'total': queryset.count(),
            'by_type': dict(queryset.values_list('type').annotate(count=models.Count('id'))),
            'by_status': dict(queryset.values_list('status').annotate(count=models.Count('id'))),
            'monitoring_enabled': queryset.filter(monitoring_enabled=True).count(),
        }
        
        return success(stats)
