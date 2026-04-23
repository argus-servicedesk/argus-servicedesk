from rest_framework import viewsets
from .models import EODTask
from .serializers import EODTaskSerializer


class EODTaskViewSet(viewsets.ModelViewSet):
    queryset = EODTask.objects.all()
    serializer_class = EODTaskSerializer
