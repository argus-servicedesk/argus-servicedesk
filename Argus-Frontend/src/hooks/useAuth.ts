import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

type ManageResource =
  | 'incidents'
  | 'changes'
  | 'problems'
  | 'assets'
  | 'teams'
  | 'kb'
  | 'catalog'
  | 'learning'
  | 'vendors'
  | 'users'
  | 'settings';

const RESOURCE_PERMISSIONS: Record<ManageResource, string[]> = {
  incidents: ['incident:create', 'incident:update', 'incident:assign', 'incident:manage'],
  problems: ['problem:create', 'problem:update', 'problem:assign', 'problem:manage'],
  changes: ['change:create', 'change:update', 'change:assign', 'change:manage'],
  assets: ['asset:manage'],
  teams: ['team:manage'],
  kb: ['kb:manage', 'kb:create', 'kb:update'],
  catalog: ['catalog:manage', 'service_request:create'],
  learning: ['learning:manage', 'learning:assign'],
  vendors: ['vendor:manage', 'asset:manage'],
  users: ['user:manage'],
  settings: ['settings:manage'],
};

function normalizeRoleName(role: string): string {
  return role.replace(/_/g, ' ').trim().toLowerCase();
}

function normalizePermission(code: string): string {
  const value = String(code || '').trim().replace(/\s+/g, '_');
  if (!value) return '';
  if (!value.includes(':') && value.includes('.')) {
    const parts = value.split('.').filter(Boolean);
    if (parts.length >= 2) return `${parts.slice(0, -1).join('_')}:${parts[parts.length - 1]}`.toLowerCase();
  }
  return value.toLowerCase();
}

function permissionMatches(granted: Set<string>, requiredCode: string): boolean {
  const required = normalizePermission(requiredCode);
  if (!required) return true;
  if (granted.has('*') || granted.has('*:*') || granted.has(required)) return true;
  if (required.includes(':')) {
    const [resource] = required.split(':', 1);
    return granted.has(`${resource}:*`);
  }
  return false;
}

export function useAuth() {
  const store = useAuthStore();
  const roles = store.user?.roleNames ?? [];
  const permissions = store.user?.permissionCodes ?? store.user?.permission_codes ?? store.user?.permissions ?? [];

  const normalizedRoles = roles.map(normalizeRoleName);
  const normalizedPermissions = new Set(permissions.map(normalizePermission).filter(Boolean));
  const hasNormalizedRole = (...targetRoles: string[]) =>
    targetRoles.some((role) => normalizedRoles.includes(normalizeRoleName(role)));

  function hasPermission(...requiredPermissions: string[]): boolean {
    return requiredPermissions.some((code) => permissionMatches(normalizedPermissions, code));
  }

  const isAdmin =
    hasNormalizedRole('Super Admin', 'Org Admin') ||
    hasPermission('*:*', 'settings:manage', 'user:manage');
  const isManager =
    isAdmin ||
    hasNormalizedRole('Manager', 'Team Lead', 'NOC') ||
    hasPermission('team:manage', 'service_request:approve');
  const isEngineer =
    isManager ||
    hasNormalizedRole('Engineer', 'NOC') ||
    hasPermission('incident:update', 'problem:update', 'change:update', 'service_request:fulfill');
  const isClient =
    store.user?.role === 'CLIENT' ||
    hasNormalizedRole('Client User') ||
    (hasPermission('service_request:create', 'incident:create') && !isEngineer && !isManager);

  function hasRole(...targetRoles: string[]): boolean {
    return hasNormalizedRole(...targetRoles);
  }

  function canManage(resource: ManageResource): boolean {
    if (isAdmin) return true;
    if (hasPermission(...RESOURCE_PERMISSIONS[resource])) return true;

    // Compatibility fallback for local non-Keycloak development users.
    if (isManager) {
      if (resource === 'settings' || resource === 'users') return isAdmin;
      if (resource === 'learning') return hasPermission(...RESOURCE_PERMISSIONS.learning);
      return true;
    }
    if (hasNormalizedRole('Engineer')) {
      return ['incidents', 'problems', 'kb', 'catalog', 'assets', 'vendors'].includes(resource);
    }
    if (isClient) {
      return ['incidents', 'problems', 'changes', 'kb', 'catalog'].includes(resource);
    }
    return hasNormalizedRole('Operator') && (resource === 'incidents' || resource === 'kb');
  }

  return {
    ...store,
    roles,
    permissions,
    isAdmin,
    isManager,
    isEngineer,
    isClient,
    hasRole,
    hasPermission,
    canManage,
  };
}

interface ProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  timezone?: string;
}

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const { data } = await api.put('/auth/me', input);
      return data.data;
    },
    onSuccess: (user) => {
      setUser(user);
      toast.success('Profile updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Failed to update profile');
    },
  });
}

interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      const { data } = await api.post('/auth/change-password', input);
      return data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Failed to change password');
    },
  });
}
