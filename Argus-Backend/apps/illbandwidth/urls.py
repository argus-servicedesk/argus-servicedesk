from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ILLBandwidthViewSet

router = DefaultRouter()
router.register(r'bandwidth', ILLBandwidthViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
