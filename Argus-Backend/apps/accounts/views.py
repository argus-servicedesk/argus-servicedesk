from django.contrib.auth import authenticate, get_user_model
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.common.responses import failure, success
from apps.common.audit import create_audit_log
from .serializers import MeSerializer, SignupSerializer, UserSerializer

User = get_user_model()


def _token_payload(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def _ensure_user_organization(user):
    return getattr(user, "organization_id", None) is not None


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"Signup validation errors: {serializer.errors}")
            return failure(
                "Validation failed.",
                errors=serializer.errors,
                status_code=400,
            )
        user = serializer.save()
        if not _ensure_user_organization(user):
            return failure("user must belong to an organization", status_code=400)
        tokens = _token_payload(user)
        return success(
            {"user": MeSerializer(user).data, **tokens},
            "user created",
            201,
        )


class AuthIndexView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return success(
            {
                "endpoints": {
                    "signup": "/api/v1/auth/signup",
                    "login": "/api/v1/auth/login",
                    "logout": "/api/v1/auth/logout",
                    "refresh": "/api/v1/auth/refresh",
                    "me": "/api/v1/auth/me",
                    "users": "/api/v1/auth/users/",
                }
            }
        )


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
            create_audit_log(
                request, "LOGIN_FAILED", "USER", 
                description=f"Failed login attempt for {username}"
            )
            return failure("invalid credentials", status_code=401)

        if not _ensure_user_organization(user):
            return failure("user does not have organization access", status_code=403)

        if user.mfa_enabled:
            code = request.data.get("code")
            if not code:
                return success(
                    {"mfa_required": True, "userId": str(user.id)}, 
                    "MFA verification required"
                )
            
            if not verify_totp(user.mfa_secret, code):
                create_audit_log(
                    request, "MFA_FAILED", "USER", 
                    resource_id=user.id, 
                    description=f"Invalid MFA code for user {user.username}",
                    organization=user.organization
                )
                return failure("invalid MFA code", status_code=401)

        create_audit_log(
            request, "LOGIN_SUCCESS", "USER", 
            resource_id=user.id, 
            description=f"User {user.username} logged in successfully",
            organization=user.organization
        )
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


import secrets
from datetime import timedelta
from django.utils import timezone
from .models import PasswordResetToken, UserInvitation
from apps.notifications.tasks import send_email_task

class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return failure("Email is required.", status_code=400)

        user = User.objects.filter(email__iexact=email).first()
        if user:
            # Create token
            token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=timezone.now() + timedelta(hours=1)
            )
            
            # Send email
            base_url = request.headers.get('Origin') or 'http://localhost:3000'
            create_audit_log(
                request, "PASSWORD_RESET_REQUESTED", "USER", 
                resource_id=user.id, 
                description=f"Password reset link sent to {user.email}"
            )
            send_email_task.delay(
                recipient_email=user.email,
                subject="Reset Your Argus Password",
                template_name='email/password_reset.html',
                context={
                    'username': user.username,
                    'reset_link': f"{base_url}/reset-password?token={token}",
                }
            )

        # Success message even if user not found (security)
        return success(message="If an account exists with this email, you will receive a reset link shortly.")


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get("token")
        new_password = request.data.get("password")
        
        if not token_str or not new_password:
            return failure("Token and password are required.", status_code=400)

        reset_token = PasswordResetToken.objects.filter(
            token=token_str, 
            used=False, 
            expires_at__gt=timezone.now()
        ).first()

        if not reset_token:
            return failure("Invalid or expired reset token.", status_code=400)

        user = reset_token.user
        user.set_password(new_password)
        user.save()

        create_audit_log(
            request, "PASSWORD_RESET_SUCCESS", "USER", 
            resource_id=user.id, 
            description=f"User {user.username} reset their password"
        )

        reset_token.used = True
        reset_token.save()

        return success(message="Password reset successful. You can now log in with your new password.")


class InviteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in {User.Role.ADMIN, User.Role.MANAGER}:
            return failure("Only admins and managers can invite users.", status_code=403)

        organization = getattr(request, "organization", None)
        if organization is None:
            return failure("Organization context required.", status_code=400)

        email = request.data.get("email")
        role = request.data.get("role", User.Role.ENGINEER)
        
        if not email:
            return failure("Email is required.", status_code=400)

        # Check if user already exists
        if User.objects.filter(email__iexact=email).exists():
            return failure("A user with this email already exists.", status_code=400)

        # Create invitation
        token = secrets.token_urlsafe(32)
        UserInvitation.objects.create(
            email=email,
            role=role,
            organization=organization,
            invited_by=request.user,
            token=token,
            expires_at=timezone.now() + timedelta(days=2)
        )
        
        create_audit_log(
            request, "USER_INVITED", "USER_INVITATION", 
            description=f"Invited {email} with role {role}"
        )
        
        # Send email
        base_url = request.headers.get('Origin') or 'http://localhost:3000'
        send_email_task.delay(
            recipient_email=email,
            subject=f"Invitation to join {organization.name} on Argus",
            template_name='email/user_invite.html',
            context={
                'inviter_name': request.user.get_full_name() or request.user.username,
                'organization_name': organization.name,
                'role': role,
                'invite_link': f"{base_url}/accept-invite?token={token}",
            }
        )

        return success(message=f"Invitation sent to {email}.")


class AcceptInviteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get("token")
        username = request.data.get("username")
        password = request.data.get("password")
        first_name = request.data.get("firstName")
        last_name = request.data.get("lastName")

        if not token_str or not username or not password:
            return failure("Token, username, and password are required.", status_code=400)

        invitation = UserInvitation.objects.filter(
            token=token_str, 
            accepted=False, 
            expires_at__gt=timezone.now()
        ).first()

        if not invitation:
            return failure("Invalid or expired invitation token.", status_code=400)

        # Create user
        user = User.objects.create_user(
            username=username,
            email=invitation.email,
            password=password,
            first_name=first_name or "",
            last_name=last_name or "",
            role=invitation.role,
            organization=invitation.organization
        )

        invitation.accepted = True
        invitation.save()

        create_audit_log(
            request, "INVITE_ACCEPTED", "USER", 
            resource_id=user.id, 
            description=f"User {user.username} joined the organization via invitation"
        )

        tokens = _token_payload(user)
        return success(
            {"user": MeSerializer(user).data, **tokens},
            "Invitation accepted. Welcome to Argus!",
            201
        )


from .mfa import generate_mfa_secret, get_totp_uri, generate_qr_code_base64, verify_totp

class MFASetupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.mfa_enabled:
            return failure("MFA is already enabled.", status_code=400)

        # Generate or reuse secret
        if not user.mfa_secret:
            user.mfa_secret = generate_mfa_secret()
            user.save(update_fields=["mfa_secret", "updated_at"])

        uri = get_totp_uri(user, user.mfa_secret)
        qr_code = generate_qr_code_base64(uri)

        return success({
            "secret": user.mfa_secret,
            "qrCode": f"data:image/png;base64,{qr_code}",
            "uri": uri
        })

    def post(self, request):
        user = request.user
        code = request.data.get("code")
        if not code:
            return failure("Verification code is required.", status_code=400)

        if not user.mfa_secret:
            return failure("MFA setup not initialized. Call GET first.", status_code=400)

        if verify_totp(user.mfa_secret, code):
            user.mfa_enabled = True
            user.save(update_fields=["mfa_enabled", "updated_at"])
            
            create_audit_log(
                request, "MFA_ENABLED", "USER", 
                resource_id=user.id, 
                description=f"User {user.username} enabled MFA"
            )
            
            return success(message="MFA enabled successfully.")
        else:
            return failure("Invalid verification code.", status_code=400)


class MFADisableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        code = request.data.get("code")
        if not code:
            return failure("Verification code is required to disable MFA.", status_code=400)

        if verify_totp(user.mfa_secret, code):
            user.mfa_enabled = False
            user.mfa_secret = None
            user.save(update_fields=["mfa_enabled", "mfa_secret", "updated_at"])
            
            create_audit_log(
                request, "MFA_DISABLED", "USER", 
                resource_id=user.id, 
                description=f"User {user.username} disabled MFA"
            )
            
            return success(message="MFA disabled successfully.")
        else:
            return failure("Invalid verification code.", status_code=400)


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = getattr(request, "organization", None)
        if organization is None:
            return failure("organization access denied", status_code=403)

        users = User.objects.filter(organization=organization).order_by(
            "first_name", "last_name"
        )
        return success(UserSerializer(users, many=True).data)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.role not in {User.Role.ADMIN, User.Role.MANAGER} and str(request.user.id) != str(pk):
            return failure("Access denied.", status_code=403)
        
        user = User.objects.filter(pk=pk, organization=request.organization).first()
        if not user:
            return failure("User not found.", status_code=404)
        
        return success(UserSerializer(user).data)

    def patch(self, request, pk):
        if request.user.role not in {User.Role.ADMIN, User.Role.MANAGER}:
            return failure("Only admins and managers can update users.", status_code=403)
        
        user = User.objects.filter(pk=pk, organization=request.organization).first()
        if not user:
            return failure("User not found.", status_code=404)

        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success(serializer.data, "User updated successfully.")

    def delete(self, request, pk):
        if request.user.role != User.Role.ADMIN:
            return failure("Only admins can deactivate users.", status_code=403)
        
        user = User.objects.filter(pk=pk, organization=request.organization).first()
        if not user:
            return failure("User not found.", status_code=404)

        # Soft delete
        user.is_active_member = False
        user.is_active = False # Also disable Django login
        user.save()
        return success(message="User deactivated successfully.")
