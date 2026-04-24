from django.urls import path
from .views import AuthIndexView, LoginView, LogoutView, MeView, RefreshView, SignupView, UserListView

urlpatterns = [
    path("", AuthIndexView.as_view()),
    path("signup", SignupView.as_view()),
    path("register", SignupView.as_view()),
    path("login", LoginView.as_view()),
    path("logout", LogoutView.as_view()),
    path("refresh", RefreshView.as_view()),
    path("me", MeView.as_view()),
    # Users list — used by IncidentCreate / assignment dropdowns
    path("users", UserListView.as_view()),
    path("users/", UserListView.as_view()),
]
