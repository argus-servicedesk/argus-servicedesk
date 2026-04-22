import { useState } from 'react';
import {
  Shield, ShieldCheck, ShieldOff, Copy, CheckCircle, Loader2,
  KeyRound, QrCode, AlertTriangle, ArrowLeft, Lock,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMfaStatus, useMfaSetup, useMfaConfirm, useMfaDisable } from '../../hooks/useMfa';

// ── Steps ─────────────────────────────────────────────────────────────────────
type Step = 'status' | 'qr' | 'verify' | 'done';

export default function MFASetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mfaRequired = searchParams.get('required') === 'true';
  const { data: mfaStatus, isLoading: statusLoading } = useMfaStatus();
  const setupMutation = useMfaSetup();
  const confirmMutation = useMfaConfirm();
  const disableMutation = useMfaDisable();

  const [step, setStep] = useState<Step>('status');
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  const isEnabled = mfaStatus?.enabled === true;

  // ── Start setup ──
  async function handleStartSetup() {
    try {
      const data = await setupMutation.mutateAsync();
      setSetupData(data);
      setStep('qr');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to initialize MFA setup');
    }
  }

  // ── Confirm TOTP ──
  async function handleConfirm() {
    if (!setupData) return;
    if (token.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    try {
      await confirmMutation.mutateAsync({
        token,
        secret: setupData.secret,
        backupCodes: setupData.backupCodes,
      });
      toast.success('MFA enabled successfully');
      setStep('done');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Invalid verification code');
    }
  }

  // ── Disable MFA ──
  async function handleDisable() {
    if (!disablePassword) {
      toast.error('Password is required');
      return;
    }
    try {
      await disableMutation.mutateAsync(disablePassword);
      toast.success('MFA has been disabled');
      setShowDisableDialog(false);
      setDisablePassword('');
      setStep('status');
      setSetupData(null);
      setToken('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to disable MFA');
    }
  }

  // ── Copy backup codes ──
  function copyBackupCodes() {
    if (!setupData?.backupCodes) return;
    navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
    setCopied(true);
    toast.success('Backup codes copied to clipboard');
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="animate-fade-in" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f3f0ff 50%, #ede9fe 100%)', minHeight: '100vh' }}>

      {/* ── MFA Required Banner ── */}
      {mfaRequired && !isEnabled && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '1px solid #fca5a5' }}>
          <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div>
            <p style={{ color: '#991b1b', fontWeight: 600, fontSize: 14 }}>MFA Required by Your Organization</p>
            <p style={{ color: '#b91c1c', fontSize: 13 }}>Your organization requires multi-factor authentication. Please set up MFA to continue using the platform.</p>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl mx-4 mt-4" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #5b21b6 100%)' }}>
        {/* 3px accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #a78bfa, #c4b5fd, #ddd6fe, transparent)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)' }} />

        <div className="relative px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
              <Shield className="w-5 h-5" style={{ color: '#c4b5fd' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#a78bfa' }}>Settings</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>Security</span>
              </div>
              <h1 className="text-[22px] font-display font-bold tracking-tight" style={{ color: '#ffffff' }}>Multi-Factor Authentication</h1>
              <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Add an extra layer of security to your account with TOTP-based MFA
              </p>
            </div>
          </div>
        </div>
        {/* Divider */}
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #a78bfa, #c4b5fd, #ddd6fe, transparent)' }} />
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-6 pb-8 max-w-2xl mx-auto space-y-6">

        {/* Loading state */}
        {statusLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7c3aed' }} />
          </div>
        )}

        {/* ── Status Card ── */}
        {!statusLoading && (step === 'status' || (step !== 'qr' && step !== 'verify' && step !== 'done')) && (
          <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(139,92,246,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: isEnabled ? 'rgba(5,150,105,0.1)' : 'rgba(139,92,246,0.1)',
                  border: `1px solid ${isEnabled ? 'rgba(5,150,105,0.2)' : 'rgba(139,92,246,0.2)'}`,
                }}>
                {isEnabled
                  ? <ShieldCheck className="w-6 h-6" style={{ color: '#059669' }} />
                  : <ShieldOff className="w-6 h-6" style={{ color: '#7c3aed' }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>
                  {isEnabled ? 'MFA is Enabled' : 'MFA is Disabled'}
                </h2>
                <p className="text-[12px] mt-1" style={{ color: '#64748b' }}>
                  {isEnabled
                    ? `Your account is protected with two-factor authentication. Enabled ${mfaStatus?.enabledAt ? new Date(mfaStatus.enabledAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'recently'}.`
                    : 'Your account is not protected with two-factor authentication. Enable MFA to add an extra layer of security.'
                  }
                </p>
                <div className="mt-4">
                  {isEnabled ? (
                    <button
                      onClick={() => setShowDisableDialog(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                      style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; }}
                    >
                      <ShieldOff className="w-4 h-4" />
                      Disable MFA
                    </button>
                  ) : (
                    <button
                      onClick={handleStartSetup}
                      disabled={setupMutation.isPending}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,58,237,0.5)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.3)'; }}
                    >
                      {setupMutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Shield className="w-4 h-4" />
                      }
                      Enable MFA
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── QR Code Step ── */}
        {step === 'qr' && setupData && (
          <>
            {/* QR Card */}
            <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(139,92,246,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <QrCode className="w-4 h-4" style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Step 1: Scan QR Code</h3>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 py-4">
                <div className="p-4 rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(139,92,246,0.1)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                  <img src={setupData.qrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: '#94a3b8' }}>Manual Entry Key</p>
                  <code className="text-[12px] font-mono px-3 py-1.5 rounded-lg select-all"
                    style={{ background: 'rgba(139,92,246,0.06)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.15)' }}>
                    {setupData.secret}
                  </code>
                </div>
              </div>
            </div>

            {/* Backup Codes Card */}
            <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(217,119,6,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
                  <KeyRound className="w-4 h-4" style={{ color: '#D97706' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Backup Codes</h3>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>Save these codes somewhere safe. Each can be used once if you lose access to your authenticator.</p>
                </div>
                <button
                  onClick={copyBackupCodes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: copied ? 'rgba(5,150,105,0.1)' : 'rgba(139,92,246,0.08)', color: copied ? '#059669' : '#7c3aed', border: `1px solid ${copied ? 'rgba(5,150,105,0.2)' : 'rgba(139,92,246,0.2)'}` }}
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {setupData.backupCodes.map((code, i) => (
                  <div key={i} className="text-center py-2 px-3 rounded-lg font-mono text-[12px] font-semibold select-all"
                    style={{ background: 'rgba(217,119,6,0.05)', color: '#92400e', border: '1px solid rgba(217,119,6,0.12)' }}>
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 mt-4 p-3 rounded-lg" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.12)' }}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                <p className="text-[11px]" style={{ color: '#92400e' }}>
                  Store these backup codes in a secure location. You will not be able to view them again after completing setup.
                </p>
              </div>
            </div>

            {/* Verify Token */}
            <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(139,92,246,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Lock className="w-4 h-4" style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Step 2: Verify Code</h3>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>Enter the 6-digit code from your authenticator app to complete setup</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={token}
                  onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-40 text-center text-lg font-mono font-bold tracking-[0.3em] py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2"
                  style={{
                    background: 'rgba(139,92,246,0.04)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    color: '#0f172a',
                    // @ts-expect-error ring color
                    '--tw-ring-color': 'rgba(139,92,246,0.4)',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && token.length === 6) handleConfirm(); }}
                />
                <button
                  onClick={handleConfirm}
                  disabled={token.length !== 6 || confirmMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}
                >
                  {confirmMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />
                  }
                  Confirm & Enable
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Done Step ── */}
        {step === 'done' && (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#ffffff', border: '1px solid rgba(5,150,105,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
              <ShieldCheck className="w-8 h-8" style={{ color: '#059669' }} />
            </div>
            <h2 className="text-lg font-display font-bold mb-2" style={{ color: '#0f172a' }}>MFA Successfully Enabled</h2>
            <p className="text-[13px] mb-6 max-w-sm mx-auto" style={{ color: '#64748b' }}>
              Your account is now protected with two-factor authentication. You will need to enter a code from your authenticator app each time you sign in.
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}
            >
              Back to Settings
            </button>
          </div>
        )}

        {/* ── Info Card ── */}
        {(step === 'status' && !isEnabled) && (
          <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(139,92,246,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#0f172a' }}>How does MFA work?</h3>
            <div className="space-y-3">
              {[
                { num: '1', title: 'Install an authenticator app', desc: 'Use Google Authenticator, Authy, 1Password, or any TOTP-compatible app.' },
                { num: '2', title: 'Scan the QR code', desc: 'Click "Enable MFA" and scan the QR code shown with your authenticator app.' },
                { num: '3', title: 'Save backup codes', desc: 'Store the one-time backup codes in a safe place for account recovery.' },
                { num: '4', title: 'Verify and activate', desc: 'Enter the 6-digit code from your app to complete the setup.' },
              ].map(item => (
                <div key={item.num} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                    {item.num}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: '#0f172a' }}>{item.title}</p>
                    <p className="text-[11px]" style={{ color: '#64748b' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Disable MFA Dialog ── */}
      {showDisableDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: '#ffffff', boxShadow: '0 24px 48px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <ShieldOff className="w-5 h-5" style={{ color: '#DC2626' }} />
                </div>
                <h3 className="text-base font-semibold" style={{ color: '#0f172a' }}>Disable MFA</h3>
              </div>
              <button onClick={() => { setShowDisableDialog(false); setDisablePassword(''); }}
                className="p-1.5 rounded-lg transition-colors" style={{ color: '#94a3b8' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[12px] mb-4" style={{ color: '#64748b' }}>
              This will remove two-factor authentication from your account. Enter your password to confirm.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
                Current Password
              </label>
              <input
                type="password"
                value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2.5 rounded-xl text-[13px] focus:outline-none focus:ring-2"
                style={{
                  background: 'rgba(220,38,38,0.03)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  color: '#0f172a',
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleDisable(); }}
              />
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setShowDisableDialog(false); setDisablePassword(''); }}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors"
                style={{ color: '#64748b', border: '1px solid rgba(0,0,0,0.1)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                disabled={!disablePassword || disableMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: '#DC2626' }}
              >
                {disableMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <ShieldOff className="w-3.5 h-3.5" />
                }
                Disable MFA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
