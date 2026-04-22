from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from apps.common.responses import success
from .models import Notification
from .serializers import NotificationSerializer, NotificationUpdateSerializer
from django.utils import timezone


class NotificationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type', 'is_read', 'channel']
    
    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user, organization_id=self.request.organization_id)
        return queryset.select_related('user')
    
    def get_serializer_class(self):
        return NotificationSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class NotificationDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Notification.objects.select_related('user')
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return NotificationUpdateSerializer
        return NotificationSerializer
    
    def perform_update(self, serializer):
        if serializer.validated_data.get('is_read') and not self.object.is_read:
            serializer.validated_data['read_at'] = timezone.now()
        serializer.save()


class MarkAllReadView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        Notification.objects.filter(
            user=request.user, 
            organization_id=request.organization_id,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return success(message="all notifications marked as read")
