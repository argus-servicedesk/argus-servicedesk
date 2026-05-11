// ═══════════════════════════════════════════════════════════
// Argus Service Desk — useAuth Hook
// Ergonomic wrapper over authStore + TanStack Query mutations
// for profile update and password change.
// ═══════════════════════════════════════════════════════════

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

// ── Main selector hook ────────────────────────────────────

export function useAuth() {
  const store = useAuthStore();
  const roles = store.user?.roleNames ?? [];

  const isAdmin    = roles.includes('Super Admin') || roles.includes('Org Admin');
  const isManager  = roles.includes('Manager') || isAdmin;
  const isEngineer = roles.includes('Engineer') || isManager;

  function hasRole(...targetRoles: string[]): boolean {
    return targetRoles.some(r => roles.includes(r));
  }

  /**
   * Returns true if the current user may create/edit the given resource.
   * Viewers and operators are read-only.
   */
  function canManage(resource: 'incidents' | 'changes' | 'problems' | 'assets' | 'teams' | 'kb' | 'catalog' | 'vendors' | 'users' | 'settings'): boolean {
    if (isAdmin) return true;
    if (isManager) {
      if (resource === 'settings') return isAdmin; // Only Super/Org Admin for settings
      return true;
    }
    if (roles.includes('Engineer')) {
      if (['incidents', 'problems', 'kb', 'catalog', 'assets', 'vendors'].includes(resource)) return true;
    }
    if (roles.includes('Operator') && (resource === 'incidents' || resource === 'kb')) return true;
    return false;
  }

  return {
    ...store,
    roles,
    isAdmin,
    isManager,
    isEngineer,
    hasRole,
    canManage,
  };
}

// ── Profile update ────────────────────────────────────────

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

// ── Change password ───────────────────────────────────────

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
