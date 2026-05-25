import { useState } from 'react';
import { clsx } from 'clsx';
import {
  User, Bell, Shield, Palette, Database, Save, Loader2, Settings,
  Building2, Globe, Clock, Mail, Phone, Key, Lock, CheckCircle,
  AlertTriangle, Monitor, Moon, Sun, Eye, ChevronRight, Plus, Server,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfile, useChangePassword } from '../../hooks/useAuth';
import { useOrganizations, useCreateOrganization, useUpdateOrganization } from '../../hooks/useOrganizations';

const TIMEZONES = [
  'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'Europe/London', 'Europe/Berlin',
  'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

const avatarGradients = [
  'from-[#6366f1] to-[#a855f7]', 'from-[#10B981] to-[#14B8A6]',
  'from-[#F59E0B] to-[#F97316]', 'from-[#EF4444] to-[#EC4899]',
  'from-[#0EA5E9] to-[#6366f1]',
];

function avatarGrad(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return avatarGradients[Math.abs(h) % avatarGradients.length];
}

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

// ── Section wrapper ──
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>{title}</h2>
        {description && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Field wrapper ──
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#64748b' }}>{label}</label>
      {children}
      {hint && <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const user = useAuthStore((s) => s.user);
  const initials = user ? `${(user.firstName?.[0] || '').toUpperCase()}${(user.lastName?.[0] || '').toUpperCase()}` : 'U';
  const grad = user ? avatarGrad(user.id) : avatarGradients[0];
  const { canManage } = useAuth();
  const isAdmin = canManage('settings');

  // ── Profile state ──
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Asia/Kolkata');
  const updateProfile = useUpdateProfile();

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate({ firstName, lastName, phone, department, timezone });
  }

  // ── Password state ──
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const changePassword = useChangePassword();

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    changePassword.mutate({ oldPassword, newPassword }, {
      onSuccess: () => { setOldPassword(''); setNewPassword(''); setConfirmPassword(''); },
    });
  }

  // ── Org data for admin ──
  const { data: orgData } = useOrganizations();
  const orgs: any[] = extractList(orgData);
  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();

  // ── Org modal state ──
  const [orgModal, setOrgModal] = useState<any | null>(null);
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', environment: 'PROD', serverIp: '', fqdn: '', description: '' });
  const [orgMsg, setOrgMsg] = useState<string | null>(null);

  function openOrgCreate() {
    setOrgForm({ name: '', slug: '', environment: 'PROD', serverIp: '', fqdn: '', description: '' });
    setOrgMsg(null);
    setOrgModal({});
  }

  function openOrgEdit(org: any) {
    setOrgForm({
      name: org.name || '',
      slug: org.slug || '',
      environment: org.environment || 'PROD',
      serverIp: org.serverIp || '',
      fqdn: org.fqdn || '',
      description: org.description || '',
    });
    setOrgMsg(null);
    setOrgModal(org);
  }

  function handleOrgNameChange(name: string) {
    setOrgForm(f => ({
      ...f,
      name,
      slug: orgModal?.id ? f.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  }

  function handleOrgSave() {
    setOrgMsg(null);
    if (!orgForm.name.trim() || !orgForm.slug.trim()) {
      setOrgMsg('Name and slug are required');
      return;
    }
    if (orgModal?.id) {
      updateOrg.mutate(
        { id: orgModal.id, data: { name: orgForm.name, environment: orgForm.environment, serverIp: orgForm.serverIp || null, fqdn: orgForm.fqdn || null, description: orgForm.description || null } },
        { onSuccess: () => { setOrgMsg('Organization updated'); setTimeout(() => setOrgModal(null), 800); }, onError: (err: any) => setOrgMsg(`Error: ${err?.response?.data?.error || err.message}`) },
      );
    } else {
      createOrg.mutate(
        { name: orgForm.name, slug: orgForm.slug, environment: orgForm.environment, serverIp: orgForm.serverIp || undefined, fqdn: orgForm.fqdn || undefined, description: orgForm.description || undefined },
        { onSuccess: () => { setOrgMsg('Organization created'); setTimeout(() => setOrgModal(null), 800); }, onError: (err: any) => setOrgMsg(`Error: ${err?.response?.data?.error || err.message}`) },
      );
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, desc: 'Personal information' },
    { id: 'security', label: 'Security', icon: Shield, desc: 'Password & MFA' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alert preferences' },
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme & display' },
    ...(isAdmin ? [{ id: 'organization', label: 'Organizations', icon: Building2, desc: 'Manage tenants' }] : []),
    { id: 'system', label: 'System', icon: Database, desc: 'Platform info' },
  ];

  const inputStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid rgba(99,102,241,0.10)',
    color: '#0f172a',
    borderRadius: '0.75rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  };

  const disabledInputStyle: React.CSSProperties = {
    ...inputStyle,
    background: 'rgba(241,245,249,0.9)',
    cursor: 'not-allowed',
    color: '#94a3b8',
  };

  return (
    <div className="animate-fade-in space-y-0">
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px', opacity: 0.15 }} />
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" style={{ background: 'rgba(99,102,241,0.25)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(59,130,246,0.2)', filter: 'blur(60px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Settings</h1>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>{user?.role}</span>
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{user?.email} &middot; {user?.timezone || 'Asia/Kolkata'}</p>
            </div>
          </div>
        </div>
        {/* Accent divider */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8, #a5b4fc, transparent)' }} />
      </div>

      <div className="flex gap-6">
        {/* ── Tab nav ── */}
        <div className="w-56 shrink-0 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                style={activeTab === tab.id
                  ? { background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.15)' }
                  : { background: 'transparent', border: '1px solid transparent' }
                }
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={activeTab === tab.id
                    ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff' }
                    : { background: 'rgba(99,102,241,0.05)', color: '#94a3b8' }
                  }>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: activeTab === tab.id ? '#0f172a' : '#64748b' }}>{tab.label}</p>
                  <p className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 rounded-xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>

          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-6">
              <Section title="Profile Information" description="Update your personal details and contact information">
                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }}>
                  <div className={clsx('w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-xl font-bold text-white shadow-md', grad)}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-base font-semibold" style={{ color: '#0f172a' }}>{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{user?.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded')}
                        style={
                          user?.role === 'ADMIN' ? { background: 'rgba(239,68,68,0.15)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' } :
                          user?.role === 'MANAGER' ? { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' } :
                          { background: 'rgba(99,102,241,0.10)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.18)' }
                        }>{user?.role}</span>
                      {user?.mfaEnabled && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}>
                          <Shield className="w-2.5 h-2.5" /> MFA
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Section>

              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name">
                  <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="First name" />
                </Field>
                <Field label="Last Name">
                  <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Last name" />
                </Field>
                <Field label="Email">
                  <input style={disabledInputStyle} value={user?.email ?? ''} disabled />
                </Field>
                <Field label="Phone">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                    <input style={{ ...inputStyle, paddingLeft: '2.25rem' }} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                </Field>
                <Field label="Department">
                  <input style={inputStyle} value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. DevOps, Network" />
                </Field>
                <Field label="Timezone">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                    <select style={{ ...inputStyle, paddingLeft: '2.25rem' }} value={timezone} onChange={e => setTimezone(e.target.value)}>
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                </Field>
              </div>

              <button type="submit" disabled={updateProfile.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                {updateProfile.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
              {updateProfile.isSuccess && <p className="text-xs flex items-center gap-1" style={{ color: '#059669' }}><CheckCircle className="w-3 h-3" /> Profile updated successfully</p>}
            </form>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              <Section title="Change Password" description="Update your account password regularly for security">
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <Field label="Current Password">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                      <input style={{ ...inputStyle, paddingLeft: '2.25rem' }} type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required autoComplete="current-password" />
                    </div>
                  </Field>
                  <Field label="New Password" hint="Minimum 8 characters with mixed case and numbers">
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                      <input style={{ ...inputStyle, paddingLeft: '2.25rem' }} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" />
                    </div>
                  </Field>
                  <Field label="Confirm Password">
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                      <input style={{ ...inputStyle, paddingLeft: '2.25rem' }} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
                    </div>
                  </Field>
                  {pwError && <p className="text-xs flex items-center gap-1" style={{ color: '#DC2626' }}><AlertTriangle className="w-3 h-3" /> {pwError}</p>}
                  {changePassword.isSuccess && <p className="text-xs flex items-center gap-1" style={{ color: '#059669' }}><CheckCircle className="w-3 h-3" /> Password updated successfully</p>}
                  <button type="submit" disabled={changePassword.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                    {changePassword.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Password'}
                  </button>
                </form>
              </Section>

              <div style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }} />

              <Section title="Two-Factor Authentication" description="Add an extra layer of security using TOTP authenticator">
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={user?.mfaEnabled
                        ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }
                        : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }
                      }>
                      <Shield className="w-5 h-5" style={{ color: user?.mfaEnabled ? '#6EE7B7' : '#FCA5A5' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                        {user?.mfaEnabled ? 'MFA is enabled' : 'MFA is disabled'}
                      </p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>
                        {user?.mfaEnabled ? 'Your account is protected with TOTP authentication' : 'Enable MFA to secure your account against unauthorized access'}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={user?.mfaEnabled
                      ? { background: '#DC2626' }
                      : { background: 'linear-gradient(135deg, #6366f1, #a855f7)' }
                    }>
                    {user?.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
                  </button>
                </div>
              </Section>

              {/* ── Organization MFA Policy (ADMIN only) ── */}
              {user?.role === 'ADMIN' && (
                <>
                  <div style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }} />
                  <Section title="Organization MFA Policy" description="Require all users in your organization to enable MFA before accessing the platform">
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                          <Building2 className="w-5 h-5" style={{ color: '#818cf8' }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Enforce MFA for Organization</p>
                          <p className="text-xs" style={{ color: '#94a3b8' }}>When enabled, all users must set up MFA before accessing any feature</p>
                        </div>
                      </div>
                      <button
                        className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
                        onClick={async () => {
                          try {
                            const { default: apiClient } = await import('../../lib/api');
                            const { data } = await apiClient.patch('/auth/mfa/org-policy', { mfaRequired: true });
                            if (data.success) {
                              alert('MFA is now required for all users in your organization.');
                            }
                          } catch { alert('Failed to update MFA policy'); }
                        }}
                      >
                        Enforce MFA
                      </button>
                    </div>
                  </Section>
                </>
              )}

              <div style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }} />

              <Section title="Active Sessions" description="Manage your active login sessions">
                <div className="space-y-2">
                  {[
                    { device: 'Chrome on Linux', ip: '103.231.79.231', current: true, time: 'Current session' },
                    { device: 'Firefox on Windows', ip: '49.249.139.196', current: false, time: '2 hours ago' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }}>
                      <div className="flex items-center gap-3">
                        <Monitor className="w-4 h-4" style={{ color: '#94a3b8' }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#0f172a' }}>
                            {s.device} {s.current && <span className="text-[9px] font-bold px-1 py-0.5 ml-1 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}>CURRENT</span>}
                          </p>
                          <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{s.ip} &middot; {s.time}</p>
                        </div>
                      </div>
                      {!s.current && (
                        <button className="text-xs px-2.5 py-1 rounded-lg transition-colors font-medium" style={{ color: '#DC2626' }}>Revoke</button>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Section title="Notification Preferences" description="Configure how and when you receive alerts">
                <div className="space-y-1">
                  {[
                    { label: 'P1 Critical Incidents', desc: 'SMS + Voice Call + Slack + Email', default: true, critical: true },
                    { label: 'P2 High Incidents', desc: 'SMS + Slack + Email', default: true, critical: false },
                    { label: 'P3/P4 Incidents', desc: 'Email + In-app notification', default: true, critical: false },
                    { label: 'Change Approvals', desc: 'Email + Slack when approval needed', default: true, critical: false },
                    { label: 'SLA Breach Warnings', desc: 'Alert at 80% of SLA threshold', default: true, critical: true },
                    { label: 'Asset Health Alerts', desc: 'When monitored assets go critical', default: true, critical: false },
                    { label: 'On-Call Reminders', desc: 'Notify before on-call shift starts', default: false, critical: false },
                    { label: 'Daily Digest', desc: 'Morning summary at 9:00 AM IST', default: false, critical: false },
                    { label: 'Weekly Report', desc: 'Team performance report every Monday', default: false, critical: false },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-3 px-4 rounded-lg transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="flex items-center gap-3">
                        {item.critical && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444' }} />}
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#0f172a' }}>{item.label}</p>
                          <p className="text-xs" style={{ color: '#94a3b8' }}>{item.desc}</p>
                        </div>
                      </div>
                      <div className="w-10 h-5 rounded-full transition-colors cursor-pointer flex items-center px-0.5"
                        style={{ background: item.default ? '#6366f1' : 'rgba(99,102,241,0.12)' }}>
                        <div className="w-4 h-4 rounded-full transition-transform bg-white shadow-sm"
                          style={{ transform: item.default ? 'translateX(20px)' : 'translateX(0)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <div style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }} />

              <Section title="Escalation Settings" description="Define your escalation chain preferences">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Escalation Timeout">
                    <select style={inputStyle}>
                      <option>5 minutes</option><option>10 minutes</option><option>15 minutes</option><option>30 minutes</option>
                    </select>
                  </Field>
                  <Field label="Preferred Channel">
                    <select style={inputStyle}>
                      <option>Slack DM</option><option>SMS</option><option>Voice Call</option><option>Email</option>
                    </select>
                  </Field>
                </div>
              </Section>
            </div>
          )}

          {/* ── APPEARANCE ── */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <Section title="Theme" description="Choose your preferred interface theme">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light', icon: Sun, desc: 'Clean white background' },
                    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
                    { id: 'auto', label: 'System', icon: Monitor, desc: 'Follows OS setting' },
                  ].map(theme => {
                    const Icon = theme.icon;
                    const isSelected = selectedTheme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        className="p-4 rounded-xl cursor-pointer transition-all"
                        onClick={() => setSelectedTheme(theme.id)}
                        style={isSelected
                          ? { border: '2px solid #6366f1', background: 'rgba(99,102,241,0.08)' }
                          : { border: '2px solid rgba(99,102,241,0.08)', background: 'transparent' }
                        }
                      >
                        <div className="w-full h-12 rounded-lg mb-3" style={
                          theme.id === 'light' ? { background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)' } :
                          theme.id === 'dark' ? { background: '#eef2ff', border: '1px solid rgba(99,102,241,0.12)' } :
                          { background: 'linear-gradient(to right, #ffffff, #f1f5f9)', border: '1px solid rgba(99,102,241,0.15)' }
                        } />
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: isSelected ? '#334155' : '#94a3b8' }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: isSelected ? '#0f172a' : '#64748b' }}>{theme.label}</p>
                            <p className="text-[10px]" style={{ color: '#94a3b8' }}>{theme.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <div style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }} />

              <Section title="Display" description="Adjust interface density and sizing">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Density">
                    <select style={inputStyle}><option>Comfortable</option><option>Compact</option><option>Spacious</option></select>
                  </Field>
                  <Field label="Sidebar">
                    <select style={inputStyle}><option>Expanded</option><option>Collapsed by default</option></select>
                  </Field>
                  <Field label="Date Format">
                    <select style={inputStyle}><option>DD/MM/YYYY (Indian)</option><option>MM/DD/YYYY (US)</option><option>YYYY-MM-DD (ISO)</option></select>
                  </Field>
                  <Field label="Time Format">
                    <select style={inputStyle}><option>12-hour (AM/PM)</option><option>24-hour</option></select>
                  </Field>
                </div>
              </Section>
            </div>
          )}

          {/* ── ORGANIZATIONS (Admin only) ── */}
          {activeTab === 'organization' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Section title="Organizations" description={`Managing ${orgs.length} client organizations across environments`}>
                  <></>
                </Section>
                <button onClick={openOrgCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                  <Plus className="w-4 h-4" /> Create Organization
                </button>
              </div>
              <div className="space-y-2">
                {orgs.map((org: any) => (
                  <div
                    key={org.id}
                    onClick={() => openOrgEdit(org)}
                    className="flex items-center justify-between p-3.5 rounded-xl transition-all group cursor-pointer"
                    style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.18)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.06)')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{org.name}</p>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                            style={
                              org.environment === 'PROD' ? { background: 'rgba(16,185,129,0.15)', color: '#059669' } :
                              org.environment === 'DR' ? { background: 'rgba(217,119,6,0.15)', color: '#D97706' } :
                              org.environment === 'UAT' ? { background: 'rgba(99,102,241,0.10)', color: '#6366f1' } :
                              { background: 'rgba(99,102,241,0.05)', color: '#64748b' }
                            }>{org.environment}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{org.slug}</span>
                          {org.serverIp && <span className="text-[10px]" style={{ color: '#94a3b8' }}>{org.serverIp}</span>}
                          {org.fqdn && <span className="text-[10px]" style={{ color: '#6366f1' }}>{org.fqdn}</span>}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  </div>
                ))}
                {orgs.length === 0 && (
                  <div className="text-center py-8">
                    <Building2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#cbd5e1' }} />
                    <p className="text-sm" style={{ color: '#94a3b8' }}>No organizations found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SYSTEM ── */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <Section title="Platform Information" description="Argus Service Desk system details and version info">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Eye,      label: 'Platform',     value: 'Argus Service Desk' },
                    { icon: Globe,    label: 'API',          value: '/api/v1' },
                    { icon: Database, label: 'Database',     value: 'PostgreSQL 16.2' },
                    { icon: Database, label: 'Cache',        value: 'Redis 7.2' },
                    { icon: Shield,   label: 'AI Backend',   value: 'Ollama (Qwen3-32B)' },
                    { icon: Mail,     label: 'Voice',        value: 'XTTS v2 + Whisper' },
                    { icon: Globe,    label: 'Runtime',      value: 'Node.js v20.20.0' },
                    { icon: Monitor,  label: 'Environment',  value: 'Production' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.06)' }}>
                          <Icon className="w-4 h-4" style={{ color: '#94a3b8' }} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#94a3b8' }}>{item.label}</p>
                          <p className="text-sm font-mono font-medium" style={{ color: '#0f172a' }}>{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <div style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }} />

              <Section title="Integrations Summary">
                <div className="flex items-center gap-4">
                  {[
                    { label: 'Monitoring', desc: 'Prometheus + Grafana + Loki' },
                    { label: 'Orchestration', desc: 'K8s + StackStorm + n8n' },
                    { label: 'Communications', desc: 'Slack + Twilio + MSG91 + Apprise' },
                    { label: 'Service Desk', desc: 'PagerDuty + Jira + ServiceNow' },
                  ].map(s => (
                    <div key={s.label} className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }}>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: '#0f172a' }}>{s.label}</p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ORG CREATE / EDIT MODAL                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {orgModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setOrgModal(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)' }} />
          <div className="relative rounded-2xl shadow-xl p-6 w-full max-w-lg animate-slide-in" onClick={e => e.stopPropagation()}
            style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(99,102,241,0.10)', backdropFilter: 'blur(16px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: '#0f172a' }}>{orgModal?.id ? 'Edit Organization' : 'Create Organization'}</h2>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>{orgModal?.id ? `Editing ${orgModal.name}` : 'Add a new client organization to the platform'}</p>
                </div>
              </div>
              <button onClick={() => setOrgModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: '#94a3b8' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Organization Name">
                  <input style={inputStyle} placeholder="e.g. IndMoney Production" value={orgForm.name} onChange={e => handleOrgNameChange(e.target.value)} required />
                </Field>
                <Field label="Slug" hint={orgModal?.id ? 'Cannot change slug after creation' : 'Auto-generated from name'}>
                  <input style={orgModal?.id ? disabledInputStyle : { ...inputStyle, fontFamily: 'monospace' }} placeholder="e.g. indmoney-prod" value={orgForm.slug} onChange={e => setOrgForm(f => ({ ...f, slug: e.target.value }))} disabled={!!orgModal?.id} required />
                </Field>
              </div>

              <Field label="Environment">
                <select style={inputStyle} value={orgForm.environment} onChange={e => setOrgForm(f => ({ ...f, environment: e.target.value }))}>
                  <option value="PROD">Production</option>
                  <option value="DR">Disaster Recovery</option>
                  <option value="UAT">UAT / Staging</option>
                  <option value="DEV">Development</option>
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Server IP" hint="Public IP for SSH access">
                  <div className="relative">
                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                    <input style={{ ...inputStyle, paddingLeft: '2.25rem' }} placeholder="154.210.170.126" value={orgForm.serverIp} onChange={e => setOrgForm(f => ({ ...f, serverIp: e.target.value }))} />
                  </div>
                </Field>
                <Field label="FQDN" hint="Ingress URL / domain">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                    <input style={{ ...inputStyle, paddingLeft: '2.25rem' }} placeholder="app.example.com" value={orgForm.fqdn} onChange={e => setOrgForm(f => ({ ...f, fqdn: e.target.value }))} />
                  </div>
                </Field>
              </div>

              <Field label="Description">
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'none' }} placeholder="Brief description of this organization..." value={orgForm.description} onChange={e => setOrgForm(f => ({ ...f, description: e.target.value }))} />
              </Field>
            </div>

            {/* Feedback */}
            {orgMsg && (
              <div className="mt-4 p-3 rounded-lg text-sm flex items-center gap-2"
                style={orgMsg.startsWith('Error')
                  ? { background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)' }
                  : { background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }
                }>
                {orgMsg.startsWith('Error') ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                {orgMsg}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                disabled={createOrg.isPending || updateOrg.isPending}
                onClick={handleOrgSave}
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              >
                {(createOrg.isPending || updateOrg.isPending) ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> {orgModal?.id ? 'Update Organization' : 'Create Organization'}</>
                )}
              </button>
              <button onClick={() => setOrgModal(null)} className="px-4 py-2.5 rounded-xl text-sm" style={{ color: '#64748b', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
