import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { KeyRound, Loader2, Search, UserPlus, Users } from 'lucide-react';
import api from '../../lib/api';

const ROLE_OPTIONS = [
  { value: 'Client User', label: 'Client User' },
  { value: 'Engineer', label: 'Engineer' },
  { value: 'Team Lead', label: 'Team Lead' },
  { value: 'NOC', label: 'NOC / L1' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Super Admin', label: 'Super Admin' },
];

interface AccountForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_name: string;
  organization_id: string;
}

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function displayName(user: any) {
  return [user.firstName ?? user.first_name, user.lastName ?? user.last_name].filter(Boolean).join(' ') || user.email;
}

function primaryRole(user: any) {
  return user.roleNames?.[0] ?? user.role_names?.[0] ?? user.role ?? 'User';
}

const initialForm: AccountForm = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role_name: 'Client User',
  organization_id: '',
};

export default function UserList() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AccountForm>(initialForm);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [resetPasswordFor, setResetPasswordFor] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const usersQuery = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get(`/auth/users/?${params.toString()}`);
      return extractList(data);
    },
    staleTime: 30000,
  });

  const clientsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get('/organizations/');
      return extractList(data);
    },
    staleTime: 60000,
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        ...form,
        username: form.email,
        must_change_password: true,
      };
      if (!form.organization_id) delete payload.organization_id;
      const { data } = await api.post('/auth/users/', payload);
      return data;
    },
    onSuccess: () => {
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Account created');
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.errors || error?.response?.data?.message;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create account');
    },
  });

  const disableUser = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/auth/users/${id}/`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Account disabled');
    },
  });

  const resetUserPassword = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/auth/users/${resetPasswordFor.id}/reset-password/`, {
        password: resetPassword,
        must_change_password: true,
      });
      return data;
    },
    onSuccess: () => {
      setResetPasswordFor(null);
      setResetPassword('');
      toast.success('Password reset');
    },
    onError: () => toast.error('Failed to reset password'),
  });

  const users = useMemo(() => {
    const items = usersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((user) => {
      const org = user.organization?.name ?? '';
      return `${displayName(user)} ${user.email} ${org}`.toLowerCase().includes(q);
    });
  }, [usersQuery.data, search]);

  const selectedRoleNeedsClient = form.role_name === 'Client User';

  return (
    <div className="min-h-full space-y-5 bg-slate-50 p-6">
      <div className="rounded-md border bg-white p-5" style={{ borderColor: '#d8dde6' }}>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" style={{ color: '#001d5b' }} />
          <h1 className="text-xl font-bold text-slate-900">Accounts</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Create client logins and internal engineer accounts with temporary passwords.</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            createUser.mutate();
          }}
          className="mt-5 grid gap-3 lg:grid-cols-6"
        >
          <input className="rounded-md border px-3 py-2 text-sm lg:col-span-2" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="First name" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Last name" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
          <select className="rounded-md border px-3 py-2 text-sm" value={form.role_name} onChange={(event) => setForm({ ...form, role_name: event.target.value })}>
            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <select className="rounded-md border px-3 py-2 text-sm" value={form.organization_id} onChange={(event) => setForm({ ...form, organization_id: event.target.value })} required={selectedRoleNeedsClient}>
            <option value="">{selectedRoleNeedsClient ? 'Select client' : 'No client'}</option>
            {(clientsQuery.data ?? []).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <input className="rounded-md border px-3 py-2 text-sm lg:col-span-2" type="password" placeholder="Temporary password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={8} />
          <button type="submit" disabled={createUser.isPending} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 lg:col-span-4">
            {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create Account
          </button>
        </form>
      </div>

      <div className="rounded-md border bg-white" style={{ borderColor: '#d8dde6' }}>
        <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center" style={{ borderColor: '#d8dde6' }}>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input className="w-full text-sm outline-none" placeholder="Search accounts" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className="rounded-md border px-3 py-2 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">All roles</option>
            <option value="CLIENT">Client users</option>
            <option value="ENGINEER">Engineers</option>
            <option value="MANAGER">Team leads / managers</option>
            <option value="OPERATOR">NOC / operators</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>

        {usersQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading accounts...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t" style={{ borderColor: '#eef2f7' }}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{displayName(user)}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">{primaryRole(user)}</td>
                    <td className="px-4 py-3 text-slate-500">{user.organization?.name ?? 'Internal'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {user.status ?? 'ACTIVE'}
                      </span>
                      {user.mustChangePassword || user.must_change_password ? <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Temp password</span> : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold" onClick={() => setResetPasswordFor(user)}>
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset
                        </button>
                        <button type="button" className="rounded-md border px-3 py-1.5 text-xs font-semibold text-red-700" onClick={() => disableUser.mutate(user.id)}>
                          Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">No accounts found.</div> : null}
          </div>
        )}
      </div>

      {resetPasswordFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              resetUserPassword.mutate();
            }}
            className="w-full max-w-sm rounded-md bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-slate-900">Reset password</h2>
            <p className="mt-1 text-sm text-slate-500">{resetPasswordFor.email}</p>
            <input className="mt-4 w-full rounded-md border px-3 py-2 text-sm" type="password" placeholder="New temporary password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} minLength={8} required />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-md border px-4 py-2 text-sm font-semibold" onClick={() => setResetPasswordFor(null)}>Cancel</button>
              <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Reset</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
