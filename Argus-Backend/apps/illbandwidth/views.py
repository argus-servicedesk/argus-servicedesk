from rest_framework import viewsets
from .models import ILLBandwidth
from .serializers import ILLBandwidthSerializer


class ILLBandwidthViewSet(viewsets.ModelViewSet):
    queryset = ILLBandwidth.objects.all()
    serializer_class = ILLBandwidthSerializer
