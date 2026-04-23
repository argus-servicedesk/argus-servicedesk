from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import APMMetricViewSet

router = DefaultRouter()
router.register(r'metrics', APMMetricViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
