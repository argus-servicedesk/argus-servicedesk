const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8082').replace(/\/$/, '');
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'ArgusService Desk';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'Argus-Frontend';
const FORCE_KEYCLOAK_LOGIN = (import.meta.env.VITE_KEYCLOAK_FORCE_LOGIN || 'true') !== 'false';
const CALLBACK_PATH = '/auth/keycloak/callback';
const STORAGE_KEY = 'argus-keycloak-login';

type StoredLogin = {
  state: string;
  verifier: string;
  redirectPath: string;
};

function realmPath() {
  return encodeURIComponent(KEYCLOAK_REALM);
}

function randomString(length = 64) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

function base64UrlEncode(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  return crypto.subtle.digest('SHA-256', bytes);
}

export function keycloakRedirectUri() {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

export async function startKeycloakLogin(redirectPath = '/dashboard') {
  const state = randomString(40);
  const verifier = randomString(96);
  const challenge = base64UrlEncode(await sha256(verifier));

  const stored: StoredLogin = { state, verifier, redirectPath };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: keycloakRedirectUri(),
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  if (FORCE_KEYCLOAK_LOGIN) {
    params.set('prompt', 'login');
  }

  window.location.assign(`${KEYCLOAK_URL}/realms/${realmPath()}/protocol/openid-connect/auth?${params}`);
}

export async function completeKeycloakLogin(search: string) {
  const params = new URLSearchParams(search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const error = params.get('error_description') || params.get('error');

  if (error) throw new Error(error);
  if (!code || !returnedState) throw new Error('Keycloak did not return a login code.');

  const storedRaw = sessionStorage.getItem(STORAGE_KEY);
  if (!storedRaw) throw new Error('Keycloak login session expired. Please try again.');

  const stored = JSON.parse(storedRaw) as StoredLogin;
  if (stored.state !== returnedState) throw new Error('Keycloak login state did not match.');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: KEYCLOAK_CLIENT_ID,
    code,
    redirect_uri: keycloakRedirectUri(),
    code_verifier: stored.verifier,
  });

  let response: Response;
  try {
    response = await fetch(`${KEYCLOAK_URL}/realms/${realmPath()}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (error: any) {
    throw new Error(
      `Failed to reach Keycloak token endpoint. Check Keycloak URL, realm, and Web Origins. ${error?.message || ''}`.trim(),
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Keycloak token exchange failed.');
  }

  sessionStorage.removeItem(STORAGE_KEY);
  return {
    accessToken: payload.access_token as string,
    idToken: payload.id_token as string | undefined,
    redirectPath: stored.redirectPath || '/dashboard',
  };
}
