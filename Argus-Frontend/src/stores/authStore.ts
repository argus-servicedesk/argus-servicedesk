import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { disconnectSocket } from '../lib/socket';
import { queryClient } from '../lib/queryClient';

interface Organization {
  id: string;
  name: string;
  slug: string;
  environment: string;
  fqdn: string | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  status: string | null;
  department: string | null;
  jobTitle: string | null;
  timezone: string | null;
  mfaEnabled: boolean;
  organizationId: string | null;
  lastLogin: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  selectedOrgId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, mfaToken?: string) => Promise<{ requiresMfa?: boolean }>;
  logout: () => void;
  setUser: (user: User) => void;
  setSelectedOrg: (orgId: string | null) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, organization: null, selectedOrgId: null,
      accessToken: null, refreshToken: null,
      isAuthenticated: false, isLoading: false,

      login: async (email, password, mfaToken?) => {
        set({ isLoading: true });
        try {
          const body: Record<string, string> = { email, password };
          if (mfaToken) body.mfaToken = mfaToken;

          const res = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Login failed');

          // MFA challenge — user has MFA enabled but hasn't provided token yet
          if (data.data?.requiresMfa) {
            set({ isLoading: false });
            return { requiresMfa: true };
          }

          set({
            user: data.data.user,
            organization: data.data.organization || null,
            selectedOrgId: data.data.user?.organizationId || null,
            accessToken: data.data.accessToken || null,
            refreshToken: data.data.refreshToken || null,
            isAuthenticated: true,
            isLoading: false,
          });
          return {};
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err?.message || 'Invalid credentials');
        }
      },

      logout: () => {
        const token = useAuthStore.getState().accessToken;
        fetch('/api/v1/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }).catch(() => {});
        disconnectSocket();
        queryClient.clear();
        set({
          user: null, organization: null, selectedOrgId: null,
          accessToken: null, refreshToken: null,
          isAuthenticated: false,
        });
      },

      setUser: (user) => set({ user, isAuthenticated: true }),
      setSelectedOrg: (orgId) => set({ selectedOrgId: orgId }),

      checkAuth: async () => {
        const { accessToken } = useAuthStore.getState();
        // Skip if no token stored — user hasn't logged in
        if (!accessToken) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }
        set({ isLoading: true });
        try {
          const res = await fetch('/api/v1/auth/me', {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          set({
            user: data.data,
            organization: data.data.organization || null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Token expired — try refresh before giving up
          const { refreshToken } = useAuthStore.getState();
          if (refreshToken) {
            try {
              const refreshRes = await fetch('/api/v1/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${refreshToken}`,
                },
              });
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const newToken = refreshData.data?.accessToken;
                const newRefresh = refreshData.data?.refreshToken;
                if (newToken) {
                  set({ accessToken: newToken, ...(newRefresh ? { refreshToken: newRefresh } : {}) });
                  // Retry /me with new token
                  const retryRes = await fetch('/api/v1/auth/me', {
                    credentials: 'include',
                    headers: { 'Authorization': `Bearer ${newToken}` },
                  });
                  if (retryRes.ok) {
                    const retryData = await retryRes.json();
                    set({
                      user: retryData.data,
                      organization: retryData.data.organization || null,
                      isAuthenticated: true,
                      isLoading: false,
                    });
                    return;
                  }
                }
              }
            } catch {}
          }
          // All attempts failed — clear auth
          set({
            user: null, organization: null, selectedOrgId: null,
            accessToken: null, refreshToken: null,
            isAuthenticated: false, isLoading: false,
          });
        }
      },
    }),
    {
      name: 'linkedeye-auth',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        selectedOrgId: state.selectedOrgId,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
