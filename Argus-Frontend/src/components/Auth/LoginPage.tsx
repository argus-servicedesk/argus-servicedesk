import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Eye, EyeOff, Shield, Zap, ArrowRight, Activity,
  Server, Bell, Brain, Lock, ChevronRight,
  CheckCircle2, Globe, Layers, BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { startKeycloakLogin } from '../../lib/keycloak';
import {
  type AuthErrorMessage,
  authErrorFromMessage,
  describeAuthError,
} from '../../utils/authErrors';

// ══════════════════════════════════════════════════════════════
// Feature bullet for left panel
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
// Stat pill for left panel
// ══════════════════════════════════════════════════════════════

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="px-3 py-2 rounded-xl text-center"
      style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}
    >
      <p className="text-lg font-display font-bold tracking-tight" style={{ color: '#0f172a' }}>{value}</p>
      <p className="text-[9px] font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Login Page — Clean White/Light Theme with Indigo Accents
// ══════════════════════════════════════════════════════════════

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuthStore();
  const redirectPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthErrorMessage | null>(null);
  const [shake, setShake] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate(redirectPath, { replace: true });
  }, [isAuthenticated, navigate, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(authErrorFromMessage('Missing login details', 'Enter both email address and password to continue.'));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (mfaStep && !mfaToken) {
      setError(authErrorFromMessage('MFA code required', 'Enter the 6-digit code from your authenticator app.'));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await login(email, password, mfaStep ? mfaToken : undefined);
      if (result?.requiresMfa) {
        setMfaStep(true);
        setLoading(false);
        return;
      }
      const target = result.user?.mustChangePassword
        ? '/change-password'
        : result.user?.role === 'CLIENT'
          ? '/portal'
          : redirectPath;
      navigate(target, { replace: true });
    } catch (err: any) {
      setError(describeAuthError(err, 'password'));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleKeycloakLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await startKeycloakLogin(redirectPath);
    } catch (err: any) {
      setLoading(false);
      setError(describeAuthError(err, 'sso'));
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ══════════════════════════════════════════════════════════
          LEFT PANEL — Light branded showcase with indigo accents
          ══════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[56%] relative overflow-hidden flex-col"
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
                ArgusService Desk
              </span>
            </div>
          </div>

          {/* Center — Hero + Features */}
          <div className="space-y-8 max-w-md">
            <div>
              <h2 className="font-display text-[32px] xl:text-[36px] font-bold leading-[1.15] tracking-tight">
                <span
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  ArgusService Desk
                </span>
              </h2>
              <p className="text-[14px] mt-3 leading-relaxed max-w-sm" style={{ color: '#64748b' }}>
                Monitor, detect, and resolve infrastructure incidents with AI-powered automation across your entire fleet.
              </p>
            </div>

            {/* Feature bullets */}
            <div className="space-y-4">
              <Feature icon={Activity} title="Real-Time Monitoring" desc="Prometheus, Grafana, SNMP, Windows — all in one pane of glass" iconColor="#6366f1" />
              <Feature icon={Brain} title="AI-Powered RCA" desc="Automated root cause analysis with remediation playbooks" iconColor="#a855f7" />
              <Feature icon={Globe} title="Multi-Tenant Architecture" desc="13+ client organizations with isolated monitoring" iconColor="#059669" />
              <Feature icon={Bell} title="Intelligent Alerting" desc="PagerDuty, Slack, SMS, Voice — bidirectional sync" iconColor="#d97706" />
            </div>
          </div>

          {/* Bottom — Stats + Trust */}
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              <StatPill value="13+" label="Clients" />
              <StatPill value="99.9%" label="Uptime" />
              <StatPill value="< 5m" label="P1 Response" />
              <StatPill value="24/7" label="Monitoring" />
            </div>

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
          RIGHT PANEL — Clean white form area
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

        <div className={`relative w-full max-w-[380px] ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>

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
              ArgusService Desk
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
            <div className="mb-7">
              <h2 className="font-display text-[22px] font-bold tracking-tight" style={{ color: '#0f172a' }}>Welcome back</h2>
              <p className="text-[13px] mt-1" style={{ color: '#64748b' }}>Sign in to your account to continue</p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                className="mb-5 flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
                role="alert"
                aria-live="assertive"
                style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}
              >
                <div
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: 'rgba(220,38,38,0.10)' }}
                >
                  <ShieldAlert size={13} style={{ color: '#DC2626' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold leading-relaxed" style={{ color: '#991b1b' }}>{error.title}</p>
                  <p className="text-[12px] leading-relaxed" style={{ color: '#DC2626' }}>{error.message}</p>
                  {error.detail && (
                    <p className="mt-1 break-words text-[11px] leading-relaxed" style={{ color: '#b91c1c' }}>
                      {error.detail}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* SSO Button */}
            <button
              type="button"
              onClick={handleKeycloakLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl transition-all text-[13px] font-medium mb-5 group"
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
              Sign in with Keycloak SSO
              <ChevronRight size={13} className="ml-auto" style={{ color: '#94a3b8' }} />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ backgroundColor: '#e2e8f0' }} />
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>or continue with email</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#e2e8f0' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
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

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Password</label>
                  <Link to="/forgot-password" className="text-[11px] font-medium transition-colors" style={{ color: '#6366f1' }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all pr-10"
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid rgba(99,102,241,0.12)',
                      color: '#0f172a',
                    }}
                    autoComplete="current-password"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors"
                    style={{ color: '#94a3b8' }}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* MFA Token (shown when MFA is required) */}
              {mfaStep && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#64748b' }}>MFA Code</label>
                  <input
                    type="text"
                    value={mfaToken}
                    onChange={(e) => { setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                    placeholder="Enter 6-digit code from authenticator"
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 text-[13px] rounded-xl focus:outline-none transition-all text-center tracking-[0.3em] font-mono"
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid rgba(99,102,241,0.12)',
                      color: '#0f172a',
                      fontSize: 18,
                    }}
                    autoFocus
                    autoComplete="one-time-code"
                    aria-label="MFA verification code"
                  />
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Open your authenticator app and enter the 6-digit code</p>
                </div>
              )}

              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: '#6366f1' }}
                />
                <span className="text-[12px] transition-colors" style={{ color: '#64748b' }}>Keep me signed in for 30 days</span>
              </label>

              {/* Submit */}
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
                    Sign in
                    <ArrowRight size={14} className="opacity-60" />
                  </>
                )}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-7 pt-5 text-center space-y-3" style={{ borderTop: '1px solid #e2e8f0' }}>
              <p className="text-[13px]" style={{ color: '#64748b' }}>
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold transition-colors" style={{ color: '#6366f1' }}>
                  Sign up free
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
                  <Zap size={8} /> OIDC SSO
                </span>
              </div>
            </div>
          </div>

          {/* Version footer */}
          <p className="text-center text-[10px] mt-6 font-mono" style={{ color: '#94a3b8' }}>
            ArgusService Desk &middot; FinSpot Technology Solutions Private Limited &middot; No.55B, First Main, Electronic City Phase – 1, Bengaluru – 560 100 &middot; 9176772077
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
