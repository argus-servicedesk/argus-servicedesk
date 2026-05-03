import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, Shield, Zap, ArrowRight,
  Server, Bell, Brain, Lock, ChevronRight,
  CheckCircle2, Globe, User as UserIcon, Mail, KeyRound,
} from 'lucide-react';
import { useAuthStore, type User } from '../../stores/authStore';

// ══════════════════════════════════════════════════════════════
// Feature bullet for left panel (shared with LoginPage design)
// ══════════════════════════════════════════════════════════════

function Feature({ icon: Icon, title, desc, iconColor }: {
  icon: React.ElementType; title: string; desc: string; iconColor: string;
}) {
  return (
    <div className="flex items-start gap-3 group">
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}
      >
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: '#0f172a' }}>{title}</p>
        <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: '#94a3b8' }}>{desc}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Password strength indicator
// ══════════════════════════════════════════════════════════════

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '12+ characters', pass: password.length >= 12 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special char (@$!%*?&)', pass: /[@$!%*?&]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  if (!password) return null;

  const barColors = ['', '#DC2626', '#DC2626', '#D97706', '#6366f1', '#059669'];
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const labelColors = ['', '#DC2626', '#DC2626', '#D97706', '#6366f1', '#059669'];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              backgroundColor: i <= score ? barColors[score] : '#e2e8f0',
            }}
          />
        ))}
      </div>
      <p
        className="text-[10px] font-mono"
        style={{ color: labelColors[score] }}
      >
        {labels[score]}
      </p>
      {score < 5 && (
        <div className="space-y-0.5 mt-1">
          {checks.filter(c => !c.pass).map(c => (
            <p key={c.label} className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>✕ {c.label}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Signup Page — Clean White/Light Theme with Indigo Accents
// ══════════════════════════════════════════════════════════════

export default function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName || !email || !password) {
      setError('All fields are required');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[@$!%*?&]/.test(password)) {
      setError('Password must include uppercase, lowercase, number, and special character (@$!%*?&)');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Receive httpOnly cookies
        body: JSON.stringify({
          username: email,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          role: 'ENGINEER',
        }),
      });
      const envelope = await res.json();

      function formatApiFailure(body: Record<string, unknown>): string {
        const flattenErrors = (
          errObj: Record<string, unknown> | null
        ): string | null => {
          if (!errObj) return null;
          const parts = Object.entries(errObj).flatMap(([k, v]) => {
            const s = Array.isArray(v)
              ? (v as unknown[]).map((x: unknown) => String(x)).join(', ')
              : typeof v === 'object' && v !== null
                ? JSON.stringify(v)
                : String(v ?? '');
            return s ? `${k}: ${s}` : [];
          });
          return parts.length ? parts.join('\n') : null;
        };

        const msg = body.message;
        const errObj =
          typeof body.errors === 'object' &&
          body.errors !== null &&
          Object.keys(body.errors as object).length > 0
            ? (body.errors as Record<string, unknown>)
            : typeof body.message === 'object' && body.message !== null
              ? (body.message as Record<string, unknown>)
              : null;

        const fieldLines = flattenErrors(errObj);
        if (fieldLines) return fieldLines;

        if (typeof msg === 'string' && msg.trim()) return msg.trim();
        const errSingle =
          typeof (body as Record<string, unknown>).error === 'string'
            ? ((body as Record<string, unknown>).error as string)
            : '';
        return errSingle || 'Signup failed';
      }

      if (!res.ok || envelope.success === false) {
        if (typeof envelope.details !== 'undefined' && Array.isArray((envelope as any).details)) {
          throw new Error(
            ((envelope as any).details as { msg?: string }[]).map((d) => d.msg).join('\n')
          );
        }
        throw new Error(formatApiFailure(envelope as Record<string, unknown>));
      }

      const bundle = envelope.data ?? {};
      const rawUser = (bundle as { user?: unknown }).user ?? bundle;
      const { access, refresh } = bundle as {
        access?: string;
        refresh?: string;
      };

      const { setUser } = useAuthStore.getState();
      setUser(rawUser as User, {
        access: access ?? null,
        refresh: refresh ?? null,
      });

      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ══════════════════════════════════════════════════════════
          LEFT PANEL — Light branded showcase with indigo accents
          ══════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[48%] xl:w-[52%] relative overflow-hidden flex-col"
        style={{ backgroundColor: '#eef2ff' }}
      >
        {/* Dot grid texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.07) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient glows */}
        <div
          className="absolute rounded-full blur-[120px]"
          style={{ top: '-10%', right: '-5%', width: 500, height: 500, backgroundColor: 'rgba(99,102,241,0.12)' }}
        />
        <div
          className="absolute rounded-full blur-[100px]"
          style={{ bottom: '-15%', left: '-10%', width: 400, height: 400, backgroundColor: 'rgba(168,85,247,0.10)' }}
        />
        <div
          className="absolute rounded-full blur-[80px]"
          style={{ top: '40%', left: '30%', width: 200, height: 200, backgroundColor: 'rgba(99,102,241,0.08)' }}
        />

        {/* Content */}
        <div className="relative flex-1 flex flex-col justify-between px-10 xl:px-14 py-10">

          {/* Top — Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}
              >
                <Eye size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <span
                  className="font-display font-bold text-[17px] tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Argus Service Desk
                </span>
              </div>
            </Link>
          </div>

          {/* Center — Hero + Features */}
          <div className="space-y-8 max-w-md">
            <div>
              <h2 className="font-display text-[32px] xl:text-[36px] font-bold leading-[1.15] tracking-tight" style={{ color: '#0f172a' }}>
                Start Managing
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Your IT Services
                </span>
              </h2>
              <p className="text-[14px] mt-3 leading-relaxed max-w-sm" style={{ color: '#64748b' }}>
                Create your free account and experience enterprise IT service management in minutes.
              </p>
            </div>

            {/* Feature bullets */}
            <div className="space-y-4">
              <Feature icon={Zap} title="Free to Start" desc="Full access to incident management, alerting, and basic monitoring" iconColor="#6366f1" />
              <Feature icon={Brain} title="AI-Powered Triage" desc="Automated incident classification and root cause analysis" iconColor="#a855f7" />
              <Feature icon={Globe} title="Multi-Cloud Ready" desc="Monitor Kubernetes, VMs, databases, and applications in one pane" iconColor="#059669" />
              <Feature icon={Bell} title="Smart Notifications" desc="PagerDuty, Slack, SMS, and Voice — never miss a critical alert" iconColor="#d97706" />
            </div>
          </div>

          {/* Bottom — Trust badges */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                <Lock size={9} /> SOC 2 Type II
              </div>
              <div className="w-px h-3" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }} />
              <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                <Shield size={9} /> ISO 27001
              </div>
              <div className="w-px h-3" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }} />
              <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                <CheckCircle2 size={9} /> ITIL v4 Certified
              </div>
            </div>

            <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>
              FinSpot Technology Solutions Private Limited
            </p>
          </div>
        </div>

        {/* Accent stripe */}
        <div
          className="absolute right-0 top-0 bottom-0 w-[3px]"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(99,102,241,0.3), rgba(168,85,247,0.3), transparent)' }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════
          RIGHT PANEL — Clean white signup form
          ══════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center relative px-6 py-10"
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Subtle background texture */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.04) 0%, transparent 60%)' }}
        />

        <div className={`relative w-full max-w-[400px] ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>

          {/* Mobile logo (hidden on lg+) */}
          <div className="lg:hidden text-center mb-8">
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

          {/* Form card */}
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(99,102,241,0.12)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(99,102,241,0.06)',
            }}
          >
            {/* Form header */}
            <div className="mb-6">
              <h2 className="font-display text-[22px] font-bold tracking-tight" style={{ color: '#0f172a' }}>Create your account</h2>
              <p className="text-[13px] mt-1" style={{ color: '#64748b' }}>Get started with Argus Service Desk in under a minute</p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                className="mb-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
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

            {/* SSO Button */}
            <button
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl transition-all text-[13px] font-medium mb-4 group"
              style={{
                backgroundColor: 'rgba(99,102,241,0.04)',
                border: '1px solid rgba(99,102,241,0.15)',
                color: '#6366f1',
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              >
                <Zap size={11} className="text-white" />
              </div>
              Sign up with Keycloak SSO
              <ChevronRight size={13} className="ml-auto" style={{ color: '#94a3b8' }} />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ backgroundColor: '#e2e8f0' }} />
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>or sign up with email</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#e2e8f0' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>First name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); setError(''); }}
                      placeholder="John"
                      className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all"
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid rgba(99,102,241,0.12)',
                        color: '#0f172a',
                      }}
                      autoFocus
                    />
                    <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setError(''); }}
                    placeholder="Doe"
                    className="w-full px-3 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all"
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid rgba(99,102,241,0.12)',
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Email address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@company.com"
                    className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all"
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid rgba(99,102,241,0.12)',
                      color: '#0f172a',
                    }}
                    autoComplete="email"
                  />
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Min. 12 characters"
                    className="w-full pl-9 pr-10 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all"
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid rgba(99,102,241,0.12)',
                      color: '#0f172a',
                    }}
                    autoComplete="new-password"
                  />
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
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
                <PasswordStrength password={password} />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Confirm password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Re-enter your password"
                    className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all"
                    style={{
                      backgroundColor: '#f8fafc',
                      border: confirmPassword && confirmPassword !== password
                        ? '1px solid rgba(220,38,38,0.5)'
                        : '1px solid #e2e8f0',
                      color: '#0f172a',
                    }}
                    autoComplete="new-password"
                  />
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[10px] mt-1 font-mono" style={{ color: '#DC2626' }}>Passwords don't match</p>
                )}
              </div>

              {/* Terms */}
              <p className="text-[11px] leading-relaxed" style={{ color: '#64748b' }}>
                By creating an account, you agree to our{' '}
                <span className="cursor-pointer font-medium" style={{ color: '#6366f1' }}>Terms of Service</span>
                {' '}and{' '}
                <span className="cursor-pointer font-medium" style={{ color: '#6366f1' }}>Privacy Policy</span>
              </p>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-white font-semibold rounded-xl active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 text-[13px]"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
                }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={14} className="opacity-60" />
                  </>
                )}
              </button>
            </form>

            {/* Footer — login link */}
            <div className="mt-6 pt-5 text-center space-y-3" style={{ borderTop: '1px solid #e2e8f0' }}>
              <p className="text-[13px]" style={{ color: '#64748b' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold transition-colors" style={{ color: '#6366f1' }}>
                  Sign in
                </Link>
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                  <Lock size={8} /> 256-bit TLS
                </span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                  <Shield size={8} /> RBAC
                </span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                  <Server size={8} /> Enterprise
                </span>
              </div>
            </div>
          </div>

          {/* Version footer */}
          <p className="text-center text-[10px] mt-5 font-mono" style={{ color: '#94a3b8' }}>
            Argus Service Desk &middot; FinSpot Technology Solutions Private Limited &middot; No.55B, First Main, Electronic City Phase – 1, Bengaluru – 560 100 &middot; 9176772077
          </p>
        </div>
      </div>

      {/* Shake animation keyframes + focus styles + placeholder colors */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        input::placeholder {
          color: #94a3b8 !important;
        }
        input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
      `}</style>
    </div>
  );
}
