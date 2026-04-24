from django.urls import path
from .views import ValidateTransitionView, ExecuteTransitionView, TransitionLogListView

urlpatterns = [
    path("validate/", ValidateTransitionView.as_view(), name="validate-transition"),
    path("transition/", ExecuteTransitionView.as_view(), name="execute-transition"),
    path("logs/", TransitionLogListView.as_view(), name="transition-logs"),
]