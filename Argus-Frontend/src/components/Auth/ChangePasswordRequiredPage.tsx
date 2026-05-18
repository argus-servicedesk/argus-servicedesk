import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export default function ChangePasswordRequiredPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error('Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/auth/change-password', { newPassword: password });
      const updatedUser = data.data;
      setUser(updatedUser);
      toast.success('Password changed');
      navigate(updatedUser?.role === 'CLIENT' || user?.role === 'CLIENT' ? '/portal' : '/dashboard', { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-lg border bg-white p-6 shadow-sm"
        style={{ borderColor: '#d8dde6' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ background: '#e8eef5', color: '#001d5b' }}>
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Change temporary password</h1>
            <p className="text-sm text-slate-500">Your admin created this account with a temporary password.</p>
          </div>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-indigo-500"
            autoComplete="new-password"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-indigo-500"
            autoComplete="new-password"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save password
        </button>
      </form>
    </div>
  );
}
