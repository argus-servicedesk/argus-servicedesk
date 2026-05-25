import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { disconnectSocket } from '../lib/socket';
import { queryClient } from '../lib/queryClient';
import api from '../lib/api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  isActive?: boolean;
  environment?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  firstName?: string;
  last_name: string;
  lastName?: string;
  phone?: string | null;
  department?: string | null;
  timezone?: string | null;
  role_names: string[];
  roleNames?: string[];
  permission_codes?: string[];
  permissionCodes?: string[];
  permissions?: string[];
  role: string;
  organization: any;
  organizationId?: string | null;
  must_change_password?: boolean;
  mustChangePassword?: boolean;
  mfa_enabled: boolean;
  mfaEnabled?: boolean;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  selectedOrgId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (email: string, password: string, mfaToken?: string) => Promise<{ requiresMfa?: boolean; user?: User }>;
  logout: () => Promise<void>;
  setUser: (user: User, tokens?: { access?: string | null; refresh?: string | null }) => void;
  setSelectedOrg: (orgId: string | null) => void;
  setHasHydrated: (value: boolean) => void;
  checkAuth: () => Promise<void>;
}

function normalizeOrganization(org: any): Organization | null {
  if (org == null || org === '') return null;
  if (typeof org === 'string') {
    return {
      id: org,
      name: '',
      slug: '',
      is_active: true,
      isActive: true,
      environment: 'Production',
      created_at: '',
      updated_at: '',
      createdAt: '',
      updatedAt: '',
    };
  }
  return {
    ...org,
    isActive: org.isActive ?? org.is_active,
    environment: org.environment ?? 'Production',
    createdAt: org.createdAt ?? org.created_at,
    updatedAt: org.updatedAt ?? org.updated_at,
  };
}

function normalizeRoleName(role: string): string {
  return role.replace(/_/g, ' ').trim().toLowerCase();
}

function hasRoleName(roles: string[], ...targets: string[]): boolean {
  const normalized = roles.map(normalizeRoleName);
  return targets.some((target) => normalized.includes(normalizeRoleName(target)));
}

function normalizeUser(rawUser: any): User {
  if (rawUser == null || typeof rawUser !== 'object') {
    return {
      id: '',
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role_names: [],
      roleNames: [],
      role: '',
      organization: null,
      organizationId: null,
      mfa_enabled: false,
      must_change_password: false,
      mustChangePassword: false,
      created_at: '',
      updated_at: '',
    };
  }
  const organization = normalizeOrganization(rawUser.organization);
  const roleNames = rawUser.roleNames ?? rawUser.role_names ?? [];
  return {
    ...rawUser,
    organization,
    organizationId: rawUser.organizationId ?? organization?.id ?? null,
    firstName: rawUser.firstName ?? rawUser.first_name ?? '',
    lastName: rawUser.lastName ?? rawUser.last_name ?? '',
    phone: rawUser.phone ?? null,
    department: rawUser.department ?? null,
    timezone: rawUser.timezone ?? 'Asia/Kolkata',
    roleNames,
    role: rawUser.role ?? (
      hasRoleName(roleNames, 'Client User')
        ? 'CLIENT'
        : hasRoleName(roleNames, 'Engineer')
          ? 'ENGINEER'
          : hasRoleName(roleNames, 'Manager', 'Team Lead')
            ? 'MANAGER'
            : hasRoleName(roleNames, 'NOC', 'Operator')
              ? 'OPERATOR'
              : hasRoleName(roleNames, 'Super Admin', 'Org Admin')
                ? 'ADMIN'
                : 'VIEWER'
    ),
    mfaEnabled: rawUser.mfaEnabled ?? rawUser.mfa_enabled ?? false,
    mustChangePassword: rawUser.mustChangePassword ?? rawUser.must_change_password ?? false,
    createdAt: rawUser.createdAt ?? rawUser.created_at,
    updatedAt: rawUser.updatedAt ?? rawUser.updated_at,
  };
}

function defaultSelectedOrgId(user: User, orgId: string | null) {
  return user.role === 'CLIENT' ? orgId : null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, organization: null, selectedOrgId: null,
      accessToken: null, refreshToken: null,
      isAuthenticated: false, isLoading: false, hasHydrated: false,

      login: async (email, password, mfaToken?) => {
        set({ isLoading: true });
        try {
          const body: Record<string, string> = { username: email, password };
          if (mfaToken) body.mfaToken = mfaToken;

          const response = await api.post('/auth/login', body);
          const payload = response.data.data;
          if (payload?.mfa_required || payload?.requiresMfa) {
            set({ isLoading: false });
            return { requiresMfa: true };
          }
          const { user: rawUser, access, refresh } = payload;
          const user = normalizeUser(rawUser);

          // Resolve org — could be nested object or just an id
          const orgObj = user.organization || null;
          const orgId = user.organizationId || orgObj?.id || null;

          set({
            user,
            organization: orgObj,
            selectedOrgId: defaultSelectedOrgId(user, orgId),
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
            isLoading: false,
            hasHydrated: true,
          });
          return { user };
        } catch (err: any) {
          set({ isLoading: false });
          throw err;
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
          hasHydrated: true,
        });
      },

      setUser: (userRaw, tokens) =>
        set((state) => {
          const user = normalizeUser(userRaw);
          const orgObj = user.organization ?? null;
          const orgId = user.organizationId ?? orgObj?.id ?? null;
          return {
            user,
            organization: orgObj,
            selectedOrgId: defaultSelectedOrgId(user, orgId),
            accessToken:
              tokens?.access !== undefined ? tokens.access : state.accessToken,
            refreshToken:
              tokens?.refresh !== undefined ? tokens.refresh : state.refreshToken,
            isAuthenticated: true,
            hasHydrated: true,
          };
        }),
      setSelectedOrg: (orgId) => set({ selectedOrgId: orgId }),
      setHasHydrated: (value) => set({ hasHydrated: value }),

      checkAuth: async () => {
        const { accessToken } = useAuthStore.getState();
        // Skip if no token stored — user hasn't logged in
        if (!accessToken) {
          set({ isAuthenticated: false, isLoading: false, hasHydrated: true });
          return;
        }
        set({ isLoading: true });
        try {
          const response = await api.get('/auth/me');
          const user = normalizeUser(response.data.data);
          set({
            user,
            organization: user.organization || null,
            selectedOrgId: defaultSelectedOrgId(user, user.organization?.id || user.organizationId || null),
            isAuthenticated: true,
            isLoading: false,
            hasHydrated: true,
          });
        } catch {
          // Token expired — try refresh before giving up
          const { refreshToken } = useAuthStore.getState();
          if (refreshToken) {
            try {
              const refreshRes = await api.post('/auth/refresh', { refresh: refreshToken });
              const payload = refreshRes.data?.data || refreshRes.data || {};
              const { access, refresh } = payload;
              if (access) {
                set({ accessToken: access, refreshToken: refresh || refreshToken });
                // Retry /me with new token
                const retryRes = await api.get('/auth/me');
                const user = normalizeUser(retryRes.data.data);
                set({
                  user,
                  organization: user.organization || null,
                  selectedOrgId: defaultSelectedOrgId(user, user.organization?.id || user.organizationId || null),
                  isAuthenticated: true,
                  isLoading: false,
                  hasHydrated: true,
                });
                return;
              }
            } catch {}
          }
          // All attempts failed — clear auth
          set({
            user: null, organization: null, selectedOrgId: null,
            accessToken: null, refreshToken: null,
            isAuthenticated: false, isLoading: false, hasHydrated: true,
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
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
