from django.urls import path
from .views import (
    AuthIndexView, LoginView, LogoutView, MeView, RefreshView, 
    SignupView, UserListView, ForgotPasswordView, ResetPasswordView,
    InviteUserView, AcceptInviteView, UserDetailView,
    MFASetupView, MFADisableView
)

urlpatterns = [
    path("", AuthIndexView.as_view()),
    path("signup", SignupView.as_view()),
    path("register", SignupView.as_view()),
    path("login", LoginView.as_view()),
    path("logout", LogoutView.as_view()),
    path("refresh", RefreshView.as_view()),
    path("me", MeView.as_view()),
    path("forgot-password", ForgotPasswordView.as_view()),
    path("reset-password", ResetPasswordView.as_view()),
    path("invite", InviteUserView.as_view()),
    path("accept-invite", AcceptInviteView.as_view()),
    path("mfa/setup", MFASetupView.as_view()),
    path("mfa/disable", MFADisableView.as_view()),
    # Users list — used by IncidentCreate / assignment dropdowns
    path("users", UserListView.as_view()),
    path("users/", UserListView.as_view()),
    path("users/<uuid:pk>", UserDetailView.as_view()),
    path("users/<uuid:pk>/", UserDetailView.as_view()),
]
