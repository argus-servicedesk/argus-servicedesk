from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from apps.common.responses import success
from .models import Problem
from .serializers import ProblemSerializer, ProblemCreateSerializer, ProblemUpdateSerializer


class ProblemListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['state', 'priority', 'category']
    
    def get_queryset(self):
        queryset = Problem.objects.filter(organization_id=self.request.organization_id)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(number__icontains=search) | 
                Q(short_description__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset.select_related('assigned_to', 'created_by', 'assignment_group')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProblemCreateSerializer
        return ProblemSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        problem = serializer.save()
        return success(ProblemSerializer(problem).data, "problem created", 201)


class ProblemDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Problem.objects.select_related('assigned_to', 'created_by', 'assignment_group')
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProblemUpdateSerializer
        return ProblemSerializer
