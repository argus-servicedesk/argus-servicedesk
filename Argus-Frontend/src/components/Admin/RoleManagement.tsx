import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, Lock, Plus, Trash2, Save, ChevronRight, 
  CheckCircle, AlertTriangle, Loader2, Search, X
} from 'lucide-react';
import api from '../../lib/api';
import type { Role, APIResponse } from '../../types';

interface Permission {
  id: string;
  name?: string;
  code?: string;
  description?: string;
}

interface IRole {
  id: string;
  name: string;
  description: string;
  permissions?: Permission[];
  isCustom?: boolean;
  is_system?: boolean;
}

function humanizePermission(code?: string): string {
  const value = String(code || '').trim();
  if (!value) return 'Unnamed permission';
  return value
    .replace(/[:._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function permissionName(permission: Permission): string {
  return permission.name || humanizePermission(permission.code);
}

function permissionCode(permission: Permission): string {
  return permission.code || permission.name || 'unknown';
}

function rolePermissions(role?: IRole | null): Permission[] {
  return Array.isArray(role?.permissions) ? role.permissions : [];
}

function isSystemRole(role?: IRole | null): boolean {
  if (!role) return false;
  if (typeof role.is_system === 'boolean') return role.is_system;
  return role.isCustom === false;
}

export default function RoleManagement() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<IRole | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const { data: rolesRes, isLoading: rolesLoading } = useQuery<APIResponse<IRole[]>>({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/auth/roles')).data
  });

  const { data: permsRes, isLoading: permsLoading } = useQuery<APIResponse<Permission[]>>({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get('/auth/permissions')).data
  });

  const roles = rolesRes?.data ?? [];
  const allPermissions = permsRes?.data ?? [];

  // Mutations
  const saveRole = useMutation({
    mutationFn: async (role: Partial<IRole>) => {
      if (role.id) return api.patch(`/auth/roles/${role.id}`, role);
      return api.post('/auth/roles', role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreating(false);
    }
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => api.delete(`/auth/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRole(null);
    }
  });

  // Derived state
  const filteredPermissions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allPermissions;
    return allPermissions.filter((permission) => {
      const searchable = [
        permission.name,
        permission.code,
        permission.description,
      ].map((value) => String(value || '').toLowerCase()).join(' ');
      return searchable.includes(term);
    });
  }, [allPermissions, searchTerm]);

  if (rolesLoading || permsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in grid grid-cols-12 gap-6">
      {/* Role List */}
      <div className="col-span-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" /> Roles
          </h2>
          <button 
            onClick={() => {
              setSelectedRole({ id: '', name: '', description: '', permissions: [], isCustom: true, is_system: false });
              setIsCreating(true);
            }}
            className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {roles.map(role => (
            <div 
              key={role.id}
              onClick={() => { setSelectedRole(role); setIsCreating(false); }}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${
                selectedRole?.id === role.id 
                  ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                  : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">{role.name}</span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedRole?.id === role.id ? 'rotate-90 text-indigo-500' : ''}`} />
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{role.description}</p>
              <div className="flex gap-2 mt-3">
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                  {rolePermissions(role).length} perms
                </span>
                {isSystemRole(role) && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100">
                    System
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Editor */}
      <div className="col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {(selectedRole || isCreating) ? (
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {isCreating ? 'Create New Role' : `Editing Role: ${selectedRole?.name}`}
                </h3>
                <p className="text-sm text-slate-500">Configure permissions and access levels</p>
              </div>
              <div className="flex gap-2">
                {!isCreating && selectedRole && !isSystemRole(selectedRole) && (
                  <button 
                    onClick={() => { if(confirm('Delete role?')) deleteRole.mutate(selectedRole.id) }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => {
                    const name = (document.getElementById('role-name') as HTMLInputElement).value;
                    const desc = (document.getElementById('role-desc') as HTMLTextAreaElement).value;
                    saveRole.mutate({
                      id: selectedRole?.id,
                      name,
                      description: desc,
                      permission_ids: rolePermissions(selectedRole).map(p => p.id).filter(Boolean)
                    } as any);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role Name</label>
                  <input 
                    id="role-name"
                    defaultValue={selectedRole?.name}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. Incident Manager"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <input 
                    id="role-desc"
                    defaultValue={selectedRole?.description}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Brief description of responsibilities..."
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" /> Permissions 
                  <span className="text-xs font-normal text-slate-400">({rolePermissions(selectedRole).length} assigned)</span>
                </h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none w-64 focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Filter permissions..."
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                {filteredPermissions.map(perm => {
                  const currentPermissions = rolePermissions(selectedRole);
                  const isAssigned = currentPermissions.some(p => p.id === perm.id);
                  return (
                    <div 
                      key={perm.id}
                      onClick={() => {
                        if (!selectedRole) return;
                        const newPerms = isAssigned 
                          ? currentPermissions.filter(p => p.id !== perm.id)
                          : [...currentPermissions, perm];
                        setSelectedRole({ ...selectedRole, permissions: newPerms });
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                        isAssigned ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold font-mono">{permissionCode(perm)}</p>
                        <p className="text-xs opacity-70">{permissionName(perm)} &middot; {perm.description || 'No description'}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isAssigned ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'
                      }`}>
                        {isAssigned && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 opacity-20" />
            </div>
            <h3 className="text-lg font-bold text-slate-600">No Role Selected</h3>
            <p className="text-sm max-w-xs mt-2">
              Select a role from the list or create a new one to manage its permissions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
