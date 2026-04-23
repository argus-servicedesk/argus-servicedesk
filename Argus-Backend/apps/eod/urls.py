from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EODTaskViewSet

router = DefaultRouter()
router.register(r'tasks', EODTaskViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
