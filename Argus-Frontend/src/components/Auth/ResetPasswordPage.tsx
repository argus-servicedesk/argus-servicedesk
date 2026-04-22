import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface PasswordCheck {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_CHECKS: PasswordCheck[] = [
  { label: 'At least 12 characters', test: (pw) => pw.length >= 12 },
  { label: 'Uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordValid = useMemo(() => PASSWORD_CHECKS.every((c) => c.test(newPassword)), [newPassword]);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError('Missing reset token. Please use the link from your email.'); return; }
    if (!passwordValid) { setError('Password does not meet complexity requirements'); return; }
    if (!passwordsMatch) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      toast.success('Password reset successfully! Please log in with your new password.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#ffffff' }}>
        <div className="text-center max-w-sm">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(220,38,38,0.08)' }}
          >
            <Shield size={28} style={{ color: '#DC2626' }} />
          </div>
          <h2 className="font-display text-[20px] font-bold mb-2" style={{ color: '#0f172a' }}>Invalid Reset Link</h2>
          <p className="text-[13px] mb-6" style={{ color: '#64748b' }}>
            This link is missing a valid reset token. Please request a new password reset.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 text-[13px] font-semibold"
            style={{ color: '#6366f1' }}
          >
            <ArrowLeft size={14} />
            Request new reset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ backgroundColor: '#ffffff' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.04) 0%, transparent 60%)' }}
      />

      <div className="relative w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}
            >
              <Eye size={20} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1
            className="font-display text-2xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Argus Service Desk
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Enterprise Service Desk Platform</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(99,102,241,0.12)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(99,102,241,0.06)',
          }}
        >
          <div className="mb-7">
            <h2 className="font-display text-[22px] font-bold tracking-tight" style={{ color: '#0f172a' }}>
              Set new password
            </h2>
            <p className="text-[13px] mt-1" style={{ color: '#64748b' }}>
              Choose a strong password for your account.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="mb-5 flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
              aria-live="polite"
              style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}
            >
              <div
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                style={{ backgroundColor: 'rgba(220,38,38,0.10)' }}
              >
                <span className="block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#DC2626' }} />
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: '#DC2626' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all pr-10"
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid rgba(99,102,241,0.12)',
                    color: '#0f172a',
                  }}
                  autoFocus
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors"
                  style={{ color: '#94a3b8' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            {newPassword.length > 0 && (
              <div className="space-y-1.5 px-1">
                {PASSWORD_CHECKS.map((check) => {
                  const passed = check.test(newPassword);
                  return (
                    <div key={check.label} className="flex items-center gap-2">
                      <CheckCircle2 size={12} style={{ color: passed ? '#059669' : '#d1d5db' }} />
                      <span className="text-[11px]" style={{ color: passed ? '#059669' : '#94a3b8' }}>
                        {check.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirm password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all pr-10"
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid rgba(99,102,241,0.12)',
                    color: '#0f172a',
                  }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors"
                  style={{ color: '#94a3b8' }}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] mt-1" style={{ color: '#DC2626' }}>Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordValid || !passwordsMatch}
              className="w-full py-2.5 text-white font-semibold rounded-xl active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 text-[13px] mt-1"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
              }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={14} className="opacity-60" />
                  Reset password
                </>
              )}
            </button>
          </form>

          <div className="mt-7 pt-5 text-center" style={{ borderTop: '1px solid #e2e8f0' }}>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-[13px] font-semibold transition-colors"
              style={{ color: '#6366f1' }}
            >
              <ArrowLeft size={14} />
              Back to login
            </Link>
          </div>
        </div>

        <p className="text-center text-[10px] mt-6 font-mono" style={{ color: '#94a3b8' }}>
          Argus Service Desk &middot; FinSpot Technology Solutions Private Limited
        </p>
      </div>

      <style>{`
        input::placeholder { color: #94a3b8 !important; }
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
      `}</style>
    </div>
  );
}
