from django.contrib.auth import authenticate, get_user_model
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.common.responses import failure, success
from .serializers import MeSerializer, SignupSerializer

User = get_user_model()


def _token_payload(user):
    refresh = RefreshToken.for_user(user)
    return {"accessToken": str(refresh.access_token), "refreshToken": str(refresh)}


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success(MeSerializer(user).data, "user created", 201)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username") or request.data.get("email")
        password = request.data.get("password")
        if not username or not password:
            return failure("username/email and password are required", status_code=400)

        user = authenticate(request, username=username, password=password)
        if not user and "@" in username:
            try:
                user_obj = User.objects.get(email__iexact=username)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass

        if not user:
            return failure("invalid credentials", status_code=401)

        payload = _token_payload(user)
        return success({"user": MeSerializer(user).data, **payload}, "login successful")


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refreshToken")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                pass
        return success(message="logout successful")


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = MeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success(serializer.data, "profile updated")


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

