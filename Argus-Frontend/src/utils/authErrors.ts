export type AuthErrorContext = 'password' | 'sso' | 'callback';

export type AuthErrorMessage = {
  title: string;
  message: string;
  detail?: string;
};

function responseData(error: any): any {
  return error?.response?.data || error?.data || null;
}

function firstString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return firstString(value[0]);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return (
      firstString(obj.message) ||
      firstString(obj.detail) ||
      firstString(obj.error_description) ||
      firstString(obj.error) ||
      firstString(Object.values(obj)[0])
    );
  }
  return String(value);
}

function serverMessage(error: any): string {
  const data = responseData(error);
  return (
    firstString(data?.message) ||
    firstString(data?.detail) ||
    firstString(data?.error_description) ||
    firstString(data?.error) ||
    firstString(data?.errors) ||
    firstString(error?.message)
  ).trim();
}

function isNetworkFailure(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return !error?.response && (
    error?.code === 'ERR_NETWORK' ||
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('load failed')
  );
}

export function authErrorFromMessage(title: string, message: string, detail?: string): AuthErrorMessage {
  return { title, message, detail };
}

export function describeAuthError(error: any, context: AuthErrorContext = 'password'): AuthErrorMessage {
  const status = error?.response?.status;
  const rawMessage = serverMessage(error);
  const normalized = rawMessage.toLowerCase();

  if (isNetworkFailure(error)) {
    return {
      title: context === 'password' ? 'Cannot reach Argus' : 'Cannot reach Keycloak',
      message:
        context === 'password'
          ? 'The login service is not reachable. Check that the backend is running and the API URL is correct.'
          : 'The SSO server is not reachable. Check that Keycloak is running and the realm URL is correct.',
      detail: rawMessage || undefined,
    };
  }

  if (normalized.includes('mfa') && (normalized.includes('invalid') || normalized.includes('code'))) {
    return {
      title: 'Invalid MFA code',
      message: 'The authenticator code is incorrect or expired. Enter the latest 6-digit code and try again.',
    };
  }

  if (status === 400) {
    return {
      title: 'Missing login details',
      message: rawMessage || 'Enter both email address and password to continue.',
    };
  }

  if (status === 401) {
    if (context === 'password') {
      return {
        title: 'Invalid email or password',
        message: 'The email address or password is incorrect. Check the account details and try again.',
      };
    }
    return {
      title: 'SSO login was rejected',
      message: 'Keycloak did not accept the login token. Sign in again or check the client and realm configuration.',
      detail: rawMessage || undefined,
    };
  }

  if (status === 403 || normalized.includes('disabled')) {
    return {
      title: normalized.includes('disabled') ? 'Account disabled' : 'Access denied',
      message:
        rawMessage ||
        'Your account is not allowed to sign in. Contact an administrator to check your role, organization, and active status.',
    };
  }

  if (status === 404) {
    return {
      title: 'Login endpoint not found',
      message: 'The frontend is pointing to an API route that does not exist. Check VITE_API_BASE_URL and backend routes.',
      detail: rawMessage || undefined,
    };
  }

  if (status === 423) {
    return {
      title: 'Account locked',
      message: rawMessage || 'Too many failed attempts. Wait for the lock to expire or ask an admin to unlock the account.',
    };
  }

  if (status === 429) {
    return {
      title: 'Too many login attempts',
      message: 'Please wait a minute before trying again.',
    };
  }

  if (status && status >= 500) {
    return {
      title: context === 'password' ? 'Login service error' : 'SSO service error',
      message:
        context === 'password'
          ? 'The backend hit an error while signing you in. Try again, then check backend logs if it continues.'
          : 'The backend hit an error while completing Keycloak login. Try again, then check backend logs if it continues.',
      detail: rawMessage || `HTTP ${status}`,
    };
  }

  return {
    title: context === 'password' ? 'Login failed' : 'SSO login failed',
    message: rawMessage || 'Something went wrong while signing in. Please try again.',
  };
}
