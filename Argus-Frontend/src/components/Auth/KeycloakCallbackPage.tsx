import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircle, ShieldAlert } from 'lucide-react';
import api from '../../lib/api';
import { completeKeycloakLogin } from '../../lib/keycloak';
import { useAuthStore } from '../../stores/authStore';
import { type AuthErrorMessage, describeAuthError } from '../../utils/authErrors';

type KeycloakCallbackResult = {
  payload: any;
  redirectPath: string;
};

let activeCallbackCode: string | null = null;
let activeCallbackPromise: Promise<KeycloakCallbackResult> | null = null;

function getCallbackCode(search: string) {
  return new URLSearchParams(search).get('code') || search;
}

function runKeycloakCallback(search: string) {
  const callbackCode = getCallbackCode(search);

  if (activeCallbackCode !== callbackCode || !activeCallbackPromise) {
    activeCallbackCode = callbackCode;
    activeCallbackPromise = (async () => {
      const keycloak = await completeKeycloakLogin(search);
      const response = await api.post('/auth/keycloak-login', {
        accessToken: keycloak.accessToken,
        idToken: keycloak.idToken,
      });

      return {
        payload: response.data?.data || response.data || {},
        redirectPath: keycloak.redirectPath,
      };
    })();
  }

  return activeCallbackPromise;
}

export default function KeycloakCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<AuthErrorMessage | null>(null);

  useEffect(() => {
    let mounted = true;

    async function finishLogin() {
      try {
        const { payload, redirectPath } = await runKeycloakCallback(location.search);
        if (!mounted) return;

        setUser(payload.user, {
          access: payload.access ?? null,
          refresh: payload.refresh ?? null,
        });

        const role = payload.user?.role;
        const target = payload.user?.mustChangePassword
          ? '/change-password'
          : role === 'CLIENT'
            ? '/dashboard'
            : redirectPath;
        navigate(target || '/dashboard', { replace: true });
      } catch (err: any) {
        if (mounted) setError(describeAuthError(err, 'callback'));
      }
    }

    finishLogin();
    return () => {
      mounted = false;
    };
  }, [location.search, navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 text-red-600" size={34} />
          <h1 className="text-xl font-bold text-slate-950">{error.title}</h1>
          <p className="mt-2 text-sm text-red-700">{error.message}</p>
          {error.detail && <p className="mt-2 break-words text-xs text-red-600">{error.detail}</p>}
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <LoaderCircle className="animate-spin text-indigo-600" size={34} />
        <p className="text-sm font-medium">Completing Keycloak sign in...</p>
      </div>
    </div>
  );
}
