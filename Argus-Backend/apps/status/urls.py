from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.common.responses import success


class StatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return success(
            {
                "status": "ok",
                "service": "argus-servicedesk-api",
                "version": "v1",
            }
        )

urlpatterns = [
    path("", StatusView.as_view()),
]
