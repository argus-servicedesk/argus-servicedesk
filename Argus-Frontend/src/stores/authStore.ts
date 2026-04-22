import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { disconnectSocket } from '../lib/socket';
import { queryClient } from '../lib/queryClient';
import api from '../lib/api';

interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organization: any;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
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
  logout: () => Promise<void>;
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
          const body: Record<string, string> = { username: email, password };
          if (mfaToken) body.mfaToken = mfaToken;

          const response = await api.post('/auth/login', body);
          const { user, access, refresh } = response.data.data;

          set({
            user,
            organization: user.organization || null,
            selectedOrgId: user.organization?.id || null,
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
            isLoading: false,
          });
          return {};
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err?.response?.data?.message || err?.message || 'Invalid credentials');
        }
      },

      logout: async () => {
        const refreshToken = useAuthStore.getState().refreshToken;
        try {
          await api.post('/auth/logout', { refresh: refreshToken });
        } catch (error) {
          console.error('Logout error:', error);
        }
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
          const response = await api.get('/auth/me');
          const user = response.data.data;
          set({
            user,
            organization: user.organization || null,
            selectedOrgId: user.organization?.id || null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Token expired — try refresh before giving up
          const { refreshToken } = useAuthStore.getState();
          if (refreshToken) {
            try {
              const refreshRes = await api.post('/auth/refresh', { refresh: refreshToken });
              const { access, refresh } = refreshRes.data;
              if (access) {
                set({ accessToken: access, refreshToken: refresh });
                // Retry /me with new token
                const retryRes = await api.get('/auth/me');
                const user = retryRes.data.data;
                set({
                  user,
                  organization: user.organization || null,
                  selectedOrgId: user.organization?.id || null,
                  isAuthenticated: true,
                  isLoading: false,
                });
                return;
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
      name: 'argus-auth',
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
