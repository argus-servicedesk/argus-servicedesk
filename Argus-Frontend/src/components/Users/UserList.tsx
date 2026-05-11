import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Users, UserPlus, Search, X, ChevronLeft, ChevronRight, Shield,
  ShieldOff, Pencil, Lock, Unlock, MoreHorizontal, Trash2, KeyRound,
  AlertTriangle, Loader2, Filter, Building2, Clock, Activity,
  Mail, Phone, Globe, Crown, CheckCircle, XCircle, Ban,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useAuth } from '../../hooks/useAuth';
import type { User, Role, UserStatus } from '../../types';

// ── Constants ──
const ALL_ROLES: Role[] = ['ADMIN', 'MANAGER', 'ENGINEER', 'OPERATOR', 'VIEWER'];
const ALL_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'LOCKED'];

const roleBadgeStyles: Record<Role, { bg: string; color: string; border: string; icon: any; label: string }> = {
  ADMIN:    { bg: 'rgba(220,38,38,0.12)',  color: '#DC2626', border: '1px solid rgba(220,38,38,0.25)', icon: Crown,    label: 'Admin' },
  MANAGER:  { bg: 'rgba(217,119,6,0.12)',  color: '#D97706', border: '1px solid rgba(217,119,6,0.25)', icon: Shield,   label: 'Manager' },
  ENGINEER: { bg: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)', icon: Activity, label: 'Engineer' },
  OPERATOR: { bg: 'rgba(5,150,105,0.12)',  color: '#059669', border: '1px solid rgba(5,150,105,0.25)', icon: Globe,    label: 'Operator' },
  VIEWER:   { bg: 'rgba(100,116,139,0.12)',color: '#94A3B8', border: '1px solid rgba(100,116,139,0.25)', icon: Users,    label: 'Viewer' },
};

const statusConfig: Record<UserStatus, { dot: string; icon: any; label: string; color: string }> = {
  ACTIVE:   { dot: '#10B981', icon: CheckCircle, label: 'Active',   color: '#059669' },
  INACTIVE: { dot: '#94a3b8', icon: XCircle,     label: 'Inactive', color: '#94a3b8' },
  LOCKED:   { dot: '#EF4444', icon: Ban,         label: 'Locked',   color: '#DC2626' },
};

const fallbackRoleBadge = {
  bg: 'rgba(100,116,139,0.12)',
  color: '#64748b',
  border: '1px solid rgba(100,116,139,0.25)',
  icon: Users,
  label: 'User',
};

const fallbackStatus = {
  dot: '#94a3b8',
  icon: AlertTriangle,
  label: 'Unknown',
  color: '#64748b',
};

// ── Helpers ──
function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase() || '??';
}

function getFullName(user: User): string {
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'Unknown';
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const avatarGradientPairs = [
  ['#6366f1', '#a855f7'],
  ['#a855f7', '#c4b5fd'],
  ['#10B981', '#6366f1'],
  ['#6366f1', '#EC4899'],
  ['#0EA5E9', '#6366f1'],
  ['#a855f7', '#6366f1'],
];

function avatarGradStyle(id: string): React.CSSProperties {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  const pair = avatarGradientPairs[Math.abs(h) % avatarGradientPairs.length];
  return { background: `linear-gradient(135deg, ${pair[0]}, ${pair[1]})` };
}

// ── Debounce ──
function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return dv;
}

// ── Skeleton Row ──
function SkeletonRow() {
  return (
    <tr className="animate-pulse" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
      <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full" style={{ background: 'rgba(99,102,241,0.08)' }} /><div className="space-y-1.5"><div className="h-3.5 rounded w-28" style={{ background: 'rgba(99,102,241,0.08)' }} /><div className="h-3 rounded w-36" style={{ background: 'rgba(99,102,241,0.04)' }} /></div></div></td>
      <td className="px-5 py-3.5"><div className="h-5 rounded w-20" style={{ background: 'rgba(99,102,241,0.08)' }} /></td>
      <td className="px-5 py-3.5"><div className="h-4 rounded w-16" style={{ background: 'rgba(99,102,241,0.08)' }} /></td>
      <td className="px-5 py-3.5"><div className="h-4 rounded w-24" style={{ background: 'rgba(99,102,241,0.08)' }} /></td>
      <td className="px-5 py-3.5"><div className="h-4 rounded w-20" style={{ background: 'rgba(99,102,241,0.08)' }} /></td>
      <td className="px-5 py-3.5"><div className="h-4 rounded w-6 mx-auto" style={{ background: 'rgba(99,102,241,0.08)' }} /></td>
      <td className="px-5 py-3.5"><div className="h-4 rounded w-16" style={{ background: 'rgba(99,102,241,0.08)' }} /></td>
    </tr>
  );
}

// ── Actions Dropdown ──
function ActionsDropdown({ user, onEdit, onToggleLock }: { user: User; onEdit: (u: User) => void; onToggleLock: (u: User) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback((e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }, []);
  useEffect(() => { if (open) document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, [open, close]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#94a3b8' }} title="More actions">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1 shadow-xl z-30 animate-fade-in" style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(99,102,241,0.12)' }}>
          <button onClick={() => { onEdit(user); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors" style={{ color: '#6366f1' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Pencil className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} /> Edit User
          </button>
          <button onClick={() => { onToggleLock(user); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors" style={{ color: '#6366f1' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            {user.status === 'LOCKED' ? <><Unlock className="w-3.5 h-3.5" style={{ color: '#059669' }} /> Unlock Account</> : <><Lock className="w-3.5 h-3.5" style={{ color: '#D97706' }} /> Lock Account</>}
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors" style={{ color: '#6366f1' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Mail className="w-3.5 h-3.5" style={{ color: '#6366f1' }} /> Send Invite
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors" style={{ color: '#6366f1' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <KeyRound className="w-3.5 h-3.5" style={{ color: '#38BDF8' }} /> Reset Password
          </button>
          <div style={{ borderTop: '1px solid rgba(99,102,241,0.06)', margin: '4px 0' }} />
          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors" style={{ color: '#DC2626' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Trash2 className="w-3.5 h-3.5" /> Deactivate
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──
export default function UserList() {
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const debouncedSearch = useDebounce(searchInput, 350);
  const currentUser = useAuthStore(s => s.user);
  const { canManage } = useAuth();
  const canModify = canManage('users');

  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter, statusFilter]);

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, limit: pageSize };
    if (debouncedSearch.trim()) p.search = debouncedSearch.trim();
    if (roleFilter !== 'ALL') p.role = roleFilter;
    if (statusFilter !== 'ALL') p.status = statusFilter;
    return p;
  }, [page, pageSize, debouncedSearch, roleFilter, statusFilter]);

  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: async () => {
      const sp = new URLSearchParams();
      Object.entries(queryParams).forEach(([k, v]) => { if (v != null && v !== '') sp.append(k, String(v)); });
      const { data } = await api.get(`/auth/users?${sp}`);
      return data;
    },
    staleTime: 30000,
  });

  const users: User[] = response?.data ?? [];
  const pagination = response?.pagination ?? { total: 0, page: 1, limit: pageSize, totalPages: 1 };
  const totalCount = pagination.total ?? 0;
  const totalPages = Math.max(1, pagination.totalPages ?? Math.ceil(totalCount / pageSize));
  const hasFilters = searchInput.trim() !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  const clearFilters = () => { setSearchInput(''); setRoleFilter('ALL'); setStatusFilter('ALL'); setPage(1); };
  const handleEdit = (_u: User) => {};
  const handleToggleLock = (_u: User) => {};

  // Compute role distribution for hero stats
  const roleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    ALL_ROLES.forEach(r => { c[r] = 0; });
    users.forEach(u => { c[u.role] = (c[u.role] || 0) + 1; });
    return c;
  }, [users]);

  if (isError) {
    return (
      <div className="animate-fade-in space-y-6" style={{ background: '#eef2ff', minHeight: '100vh', padding: '1.5rem' }}>
        <div className="relative rounded-2xl overflow-hidden p-6" style={{ background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #7c3aed 100%)' }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px', opacity: 0.15 }} />
          <h1 className="relative font-display text-2xl font-bold flex items-center gap-3" style={{ color: '#ffffff' }}><Shield className="w-6 h-6" style={{ color: '#ddd6fe' }} /> User Management</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-64" style={{ color: '#DC2626' }}>
          <AlertTriangle className="w-10 h-10 mb-3" />
          <p className="text-lg font-semibold">Failed to load users</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>{(error as any)?.response?.data?.error || 'Check your connection.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#eef2ff', minHeight: '100vh', padding: '1.5rem' }}>
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #7c3aed 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px', opacity: 0.15 }} />
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" style={{ background: 'rgba(124,58,237,0.3)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none translate-y-1/3 -translate-x-1/4" style={{ background: 'rgba(168,85,247,0.25)', filter: 'blur(60px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Shield size={16} style={{ color: '#ddd6fe' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>User Management</h1>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>IAM</span>
              </div>
              <p className="text-sm ml-[42px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {isLoading ? 'Loading users...' : <>Manage accounts, roles & permissions across your organization &middot; <span className="font-mono font-bold" style={{ color: '#ffffff' }}>{totalCount}</span> users</>}
              </p>
            </div>
            {canModify && (
              <button
                className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <UserPlus className="w-4 h-4" /> Invite User
              </button>
            )}
          </div>

          {/* Role distribution pills */}
          <div className="flex items-center gap-3 mt-4 ml-[42px]">
            {ALL_ROLES.map(role => {
              const cfg = roleBadgeStyles[role];
              const RoleIcon = cfg.icon;
              return (
                <div key={role} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <RoleIcon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <div>
                    <p className="text-sm font-bold font-display" style={{ color: '#ffffff' }}>{roleCounts[role] || 0}</p>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{cfg.label}</p>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Shield className="w-3.5 h-3.5" style={{ color: '#a7f3d0' }} />
              <div>
                <p className="text-sm font-bold font-display" style={{ color: '#ffffff' }}>{users.filter(u => u.mfaEnabled).length}</p>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>MFA On</p>
              </div>
            </div>
          </div>
        </div>
        {/* Accent divider */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #a78bfa, #c4b5fd, #ddd6fe, transparent)' }} />
      </div>

      {/* ── FILTER BAR ── */}
      <div className="mt-3 relative z-10 rounded-xl p-3 mb-4" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}
            />
          </div>

          <div className="w-px h-7 hidden sm:block" style={{ background: 'rgba(99,102,241,0.08)' }} />
          <div className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
            <Filter size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Filters</span>
          </div>

          {/* Role filter pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRoleFilter('ALL')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={roleFilter === 'ALL'
                ? { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }
                : { background: 'rgba(99,102,241,0.03)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.06)' }}
            >
              All Roles
            </button>
            {ALL_ROLES.map(role => {
              const cfg = roleBadgeStyles[role];
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={roleFilter === role
                    ? { background: cfg.bg, color: cfg.color, border: cfg.border }
                    : { background: 'rgba(99,102,241,0.03)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.06)' }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="w-px h-7 hidden sm:block" style={{ background: 'rgba(99,102,241,0.08)' }} />

          {/* Status pills */}
          {ALL_STATUSES.map(s => {
            const sc = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={statusFilter === s
                  ? { background: 'rgba(99,102,241,0.08)', color: sc.color, border: `1px solid ${sc.dot}` }
                  : { background: 'rgba(99,102,241,0.03)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.06)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} /> {sc.label}
              </button>
            );
          })}

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all" style={{ color: '#94a3b8', border: '1px solid transparent' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FCA5A5'; e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.03)' }}>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>User</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Role</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Organization</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Department</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Last Login</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>MFA</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-10 h-10" style={{ color: '#94a3b8' }} />
                      <p className="text-lg font-medium" style={{ color: '#94a3b8' }}>No users found</p>
                      <p className="text-sm" style={{ color: '#94a3b8' }}>{hasFilters ? 'Try adjusting your filters.' : 'No users have been created yet.'}</p>
                      {hasFilters && <button onClick={clearFilters} className="text-sm mt-1 px-3 py-1.5 rounded-lg" style={{ color: '#6366f1', border: '1px solid rgba(99,102,241,0.12)' }}>Clear all filters</button>}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const initials = getInitials(user.firstName, user.lastName);
                  const fullName = getFullName(user);
                  const grad = avatarGradStyle(user.id);
                  const roleCfg = roleBadgeStyles[user.role as Role] ?? fallbackRoleBadge;
                  const statusCfg = statusConfig[user.status as UserStatus] ?? fallbackStatus;
                  const StatusIcon = statusCfg.icon;
                  const org = (user as any).organization;
                  const isCurrentUser = currentUser?.id === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors group"
                      style={{
                        borderBottom: '1px solid rgba(99,102,241,0.06)',
                        background: isCurrentUser ? 'rgba(99,102,241,0.04)' : 'transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = isCurrentUser ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = isCurrentUser ? 'rgba(99,102,241,0.04)' : 'transparent')}
                    >
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={grad}>
                              {user.avatar ? <img src={user.avatar} alt={fullName} className="w-9 h-9 rounded-full object-cover" /> : initials}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: statusCfg.dot, border: '2px solid rgba(255,255,255,0.9)' }} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{fullName}</p>
                              {isCurrentUser && <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>YOU</span>}
                            </div>
                            <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md" style={{ background: roleCfg.bg, color: roleCfg.color, border: roleCfg.border }}>
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className="w-3.5 h-3.5" style={{ color: statusCfg.color }} />
                          <span className="text-xs font-medium" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="px-5 py-3.5">
                        {org ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3" style={{ color: '#94a3b8' }} />
                            <span className="text-xs font-medium truncate max-w-[120px]" style={{ color: '#6366f1' }}>{org.name}</span>
                            {org.environment && (
                              <span className="text-[8px] font-bold px-1 py-0.5 rounded"
                                style={
                                  org.environment === 'PROD' ? { background: 'rgba(5,150,105,0.12)', color: '#059669' } :
                                  org.environment === 'DR' ? { background: 'rgba(217,119,6,0.12)', color: '#D97706' } :
                                  org.environment === 'UAT' ? { background: 'rgba(99,102,241,0.08)', color: '#6366f1' } :
                                  { background: 'rgba(99,102,241,0.04)', color: '#94a3b8' }
                                }>
                                {org.environment}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#94a3b8' }}>Global</span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5">
                        {user.department
                          ? <span className="text-xs" style={{ color: '#6366f1' }}>{user.department}</span>
                          : <span style={{ color: '#94a3b8' }}>&mdash;</span>
                        }
                      </td>

                      {/* Last Login */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" style={{ color: '#94a3b8' }} />
                          <span className="text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{relativeTime(user.lastLogin)}</span>
                        </div>
                      </td>

                      {/* MFA */}
                      <td className="px-5 py-3.5 text-center">
                        {user.mfaEnabled
                          ? <span title="MFA enabled"><Shield className="w-4 h-4 mx-auto" style={{ color: '#10B981' }} /></span>
                          : <span title="MFA disabled"><ShieldOff className="w-4 h-4 mx-auto" style={{ color: '#94a3b8' }} /></span>
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        {canModify && (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEdit(user)} className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100" style={{ color: '#94a3b8' }} title="Edit"
                              onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleLock(user)}
                              className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              style={{ color: '#94a3b8' }}
                              title={user.status === 'LOCKED' ? 'Unlock' : 'Lock'}
                              onMouseEnter={e => { e.currentTarget.style.color = user.status === 'LOCKED' ? '#10B981' : '#F59E0B'; e.currentTarget.style.background = user.status === 'LOCKED' ? 'rgba(5,150,105,0.12)' : 'rgba(217,119,6,0.12)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                            >
                              {user.status === 'LOCKED' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                            <ActionsDropdown user={user} onEdit={handleEdit} onToggleLock={handleToggleLock} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && users.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.03)' }}>
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              Showing <span className="font-medium" style={{ color: '#0f172a' }}>{(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, totalCount)}</span> of <span className="font-medium" style={{ color: '#0f172a' }}>{totalCount}</span>
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: page === 1 ? '#94a3b8' : '#6366f1', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                    style={page === p
                      ? { background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', boxShadow: '0 2px 10px rgba(99,102,241,0.25)' }
                      : { color: '#64748b' }
                    }
                    onMouseEnter={e => { if (page !== p) e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                    onMouseLeave={e => { if (page !== p) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-xs px-1" style={{ color: '#94a3b8' }}>...</span>}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: page >= totalPages ? '#94a3b8' : '#6366f1', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
