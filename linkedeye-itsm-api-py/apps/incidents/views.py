from rest_framework.views import APIView
from apps.common.responses import success


class IncidentListView(APIView):
    def get(self, request):
        return success({"items": [], "organizationId": request.organization_id})

    def post(self, request):
        return success({"created": request.data}, "incident created", 201)


class IncidentStatsView(APIView):
    def get(self, _request):
        return success({"open": 0, "p1": 0, "p2": 0})

