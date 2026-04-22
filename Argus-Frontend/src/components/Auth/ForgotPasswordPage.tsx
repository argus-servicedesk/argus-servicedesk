import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Shield, Lock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ backgroundColor: '#ffffff' }}>
      {/* Subtle background */}
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
          {submitted ? (
            /* Success state */
            <div className="text-center py-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(5,150,105,0.08)' }}
              >
                <CheckCircle2 size={28} style={{ color: '#059669' }} />
              </div>
              <h2 className="font-display text-[20px] font-bold tracking-tight mb-2" style={{ color: '#0f172a' }}>
                Check your email
              </h2>
              <p className="text-[13px] leading-relaxed mb-6" style={{ color: '#64748b' }}>
                If that email exists in our system, a reset link has been sent. The link expires in 1 hour.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-[13px] font-semibold transition-colors"
                style={{ color: '#6366f1' }}
              >
                <ArrowLeft size={14} />
                Back to login
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="mb-7">
                <h2 className="font-display text-[22px] font-bold tracking-tight" style={{ color: '#0f172a' }}>
                  Forgot your password?
                </h2>
                <p className="text-[13px] mt-1" style={{ color: '#64748b' }}>
                  Enter your email address and we'll send you a link to reset your password.
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
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@company.com"
                      className="w-full px-3.5 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all"
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid rgba(99,102,241,0.12)',
                        color: '#0f172a',
                      }}
                      autoFocus
                      autoComplete="email"
                      aria-label="Email address"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
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
                      <Mail size={14} className="opacity-60" />
                      Send reset link
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
            </>
          )}
        </div>

        {/* Footer */}
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
