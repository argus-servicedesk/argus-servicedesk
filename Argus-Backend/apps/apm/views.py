from rest_framework import viewsets
from .models import APMMetric
from .serializers import APMMetricSerializer


class APMMetricViewSet(viewsets.ModelViewSet):
    queryset = APMMetric.objects.all()
    serializer_class = APMMetricSerializer
