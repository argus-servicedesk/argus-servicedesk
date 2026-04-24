from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from apps.common.mixins import OrgQuerysetMixin
from apps.common.responses import success
from .models import Change, Approval
from .serializers import ChangeSerializer, ChangeCreateSerializer, ChangeUpdateSerializer, ApprovalSerializer


class ChangeListCreateView(OrgQuerysetMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['state', 'type', 'risk_level', 'category']
    queryset = Change.objects.all()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(number__icontains=search) | 
                Q(short_description__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset.select_related('assigned_to', 'created_by', 'assignment_group').prefetch_related('approvals')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ChangeCreateSerializer
        return ChangeSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        change = serializer.save()
        return success(ChangeSerializer(change).data, "change created", 201)


class ChangeDetailView(OrgQuerysetMixin, generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Change.objects.all()
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ChangeUpdateSerializer
        return ChangeSerializer

    def get_queryset(self):
        return super().get_queryset().select_related('assigned_to', 'created_by', 'assignment_group').prefetch_related('approvals', 'affected_cis')


class ApprovalCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ApprovalSerializer
    
    def perform_create(self, serializer):
        change_id = self.kwargs.get('change_id')
        serializer.save(approver=self.request.user, change_id=change_id)
