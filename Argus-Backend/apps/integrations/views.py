from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from apps.common.mixins import OrgQuerysetMixin
from apps.common.permissions import DenyViewerMutations, IsAdminOrManager
from apps.common.responses import success
from .models import Integration
from .serializers import IntegrationSerializer

class IntegrationListCreateView(OrgQuerysetMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, DenyViewerMutations]
    queryset = Integration.objects.all()
    serializer_class = IntegrationSerializer

    def perform_create(self, serializer):
        if not IsAdminOrManager().has_permission(self.request, self):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins and managers can create integrations.")
        serializer.save(organization=self.request.organization)

class IntegrationDetailView(OrgQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, DenyViewerMutations]
    queryset = Integration.objects.all()
    serializer_class = IntegrationSerializer

    def perform_update(self, serializer):
        if not IsAdminOrManager().has_permission(self.request, self):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins and managers can update integrations.")
        serializer.save()
