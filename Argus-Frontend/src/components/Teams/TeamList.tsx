import type React from 'react';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Users, Shield, UserPlus, Mail, Hash, ChevronDown, ChevronUp,
  AlertTriangle, Clock, Loader2, Search, Building2, Phone,
  Plus, X, Wrench, Database, Network, Headphones, Code,
  ShieldCheck, BarChart3, Activity, Globe, Zap, Briefcase,
  MoreHorizontal, Pencil, Trash2, UserMinus, Crown,
  MessageSquare, Bell,
} from 'lucide-react';
import { useTeams, useCreateTeam } from '../../hooks/useTeams';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

// ── Team type definitions with icons and colors ──
const TEAM_TYPES: Record<string, { icon: any; label: string; hex: string; bg: string; border: string }> = {
  DEVOPS:    { icon: Code,         label: 'DevOps',           hex: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)' },
  NETWORK:   { icon: Network,      label: 'Network',          hex: '#38BDF8', bg: 'rgba(14,165,233,0.15)',  border: 'rgba(14,165,233,0.3)' },
  DATABASE:  { icon: Database,     label: 'Database',         hex: '#6EE7B7', bg: 'rgba(5,150,105,0.15)',   border: 'rgba(5,150,105,0.3)' },
  SUPPORT:   { icon: Headphones,   label: 'Support',          hex: '#FCD34D', bg: 'rgba(217,119,6,0.15)',   border: 'rgba(217,119,6,0.3)' },
  SECURITY:  { icon: ShieldCheck,  label: 'Security',         hex: '#FCA5A5', bg: 'rgba(220,38,38,0.15)',   border: 'rgba(220,38,38,0.3)' },
  INFRA:     { icon: Wrench,       label: 'Infrastructure',   hex: '#a855f7', bg: 'rgba(168,85,247,0.05)',  border: 'rgba(217,70,239,0.3)' },
  PLATFORM:  { icon: Globe,        label: 'Platform',         hex: '#5EEAD4', bg: 'rgba(20,184,166,0.15)',  border: 'rgba(20,184,166,0.3)' },
  SRE:       { icon: Activity,     label: 'SRE',              hex: '#F9A8D4', bg: 'rgba(236,72,153,0.15)',  border: 'rgba(236,72,153,0.3)' },
  MANAGEMENT:{ icon: Briefcase,    label: 'Management',       hex: '#94A3B8', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)' },
  OTHER:     { icon: Users,        label: 'General',          hex: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)' },
};

function detectTeamType(name: unknown): string {
  const n = String(name || '').toLowerCase();
  if (n.includes('devops') || n.includes('dev ops') || n.includes('cicd') || n.includes('deploy')) return 'DEVOPS';
  if (n.includes('network') || n.includes('noc') || n.includes('connectivity') || n.includes('wan') || n.includes('firewall')) return 'NETWORK';
  if (n.includes('database') || n.includes('dba') || n.includes('db ') || n.includes('mysql') || n.includes('postgres') || n.includes('redis')) return 'DATABASE';
  if (n.includes('support') || n.includes('helpdesk') || n.includes('service desk') || n.includes('l1') || n.includes('l2') || n.includes('l3') || n.includes('customer')) return 'SUPPORT';
  if (n.includes('security') || n.includes('soc') || n.includes('infosec') || n.includes('compliance')) return 'SECURITY';
  if (n.includes('infra') || n.includes('hardware') || n.includes('data center') || n.includes('dc ')) return 'INFRA';
  if (n.includes('platform') || n.includes('cloud') || n.includes('k8s') || n.includes('kubernetes') || n.includes('aws') || n.includes('azure')) return 'PLATFORM';
  if (n.includes('sre') || n.includes('reliability')) return 'SRE';
  if (n.includes('management') || n.includes('leadership') || n.includes('executive')) return 'MANAGEMENT';
  return 'OTHER';
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = (firstName || '').charAt(0).toUpperCase();
  const l = (lastName || '').charAt(0).toUpperCase();
  return f + l || '??';
}

function getFullName(user: any): string {
  if (!user) return 'Unknown';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown';
}

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function isResolverAccount(user: any): boolean {
  const roles = [...(user.roleNames || []), ...(user.role_names || []), user.role || '']
    .map((role) => String(role).toLowerCase());
  return !roles.some((role) => role.includes('client') || role.includes('viewer'));
}

const roleDarkStyles: Record<string, React.CSSProperties> = {
  LEAD:     { background: 'rgba(217,119,6,0.15)',  color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  MEMBER:   { background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
  OBSERVER: { background: 'rgba(100,116,139,0.15)',color: '#94A3B8', border: '1px solid rgba(100,116,139,0.3)' },
};

const avatarGradientPairs = [
  ['#6366f1', '#a855f7'],
  ['#a855f7', '#c4b5fd'],
  ['#10B981', '#6366f1'],
  ['#6366f1', '#EC4899'],
  ['#0EA5E9', '#6366f1'],
  ['#a855f7', '#6366f1'],
];

function avatarGradStyle(id: unknown): React.CSSProperties {
  const value = String(id || 'member');
  let h = 0;
  for (let i = 0; i < value.length; i++) h = value.charCodeAt(i) + ((h << 5) - h);
  const pair = avatarGradientPairs[Math.abs(h) % avatarGradientPairs.length];
  return { background: `linear-gradient(135deg, ${pair[0]}, ${pair[1]})` };
}

// ── Create Team Modal ──
function CreateTeamModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [teamType, setTeamType] = useState('DEVOPS');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const createTeam = useCreateTeam();

  const { data: usersData } = useQuery({
    queryKey: ['users', 'team-create-members'],
    queryFn: async () => { const { data } = await api.get('/auth/users/?limit=200'); return data; },
    staleTime: 60000,
    enabled: open,
  });
  const resolverUsers = extractList(usersData).filter(isResolverAccount);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTeam.mutateAsync({
      name,
      description: description || undefined,
      email: email || undefined,
      slackChannel: slackChannel || undefined,
      memberIds,
    });
    setName(''); setDescription(''); setEmail(''); setSlackChannel(''); setMemberIds([]);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-lg p-0 animate-slide-in" style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(99,102,241,0.25)' }} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#0f172a' }}>Create New Team</h2>
              <p className="text-xs" style={{ color: '#94a3b8' }}>Add a team to your organization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: '#94a3b8' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Team type pills */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>Team Type</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TEAM_TYPES).filter(([k]) => k !== 'OTHER').map(([key, def]) => {
                const Icon = def.icon;
                const isActive = teamType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTeamType(key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={isActive ? { background: def.bg, color: def.hex, border: `1px solid ${def.border}` } : { background: 'rgba(99,102,241,0.03)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.06)' }}
                  >
                    <Icon className="w-3 h-3" /> {def.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>Team Name *</label>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}
              placeholder={`e.g. ${TEAM_TYPES[teamType]?.label || ''} - Production`}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>Description</label>
            <textarea
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}
              rows={2}
              placeholder="Brief description of team responsibilities..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>Team Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                <input className="w-full pl-9 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }} placeholder="team@company.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>Slack Channel</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                <input className="w-full pl-9 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }} placeholder="team-channel" value={slackChannel} onChange={e => setSlackChannel(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#94a3b8' }}>Members</label>
            <select
              multiple
              className="w-full min-h-[92px] rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}
              value={memberIds}
              onChange={(event) => {
                const selected = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
                setMemberIds(selected);
              }}
            >
              {resolverUsers.map((user) => (
                <option key={user.id} value={user.id}>{getFullName(user)} - {user.email}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
            <button
              type="submit"
              disabled={!name.trim() || createTeam.isPending}
              className="flex items-center gap-2 flex-1 justify-center px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
            >
              {createTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {createTeam.isPending ? 'Creating...' : 'Create Team'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Team Card ──
function TeamCard({ team, expanded, onToggle }: { team: any; expanded: boolean; onToggle: () => void }) {
  const teamType = detectTeamType(team.name);
  const def = TEAM_TYPES[teamType] || TEAM_TYPES.OTHER;
  const TeamIcon = def.icon;
  const memberCount = team.members?.length || 0;
  const incidentCount = team._count?.assignedIncidents || 0;
  const changeCount = team._count?.assignedChanges || 0;
  const problemCount = team._count?.assignedProblems || 0;
  const totalWorkload = incidentCount + changeCount + problemCount;
  const managerName = team.manager ? getFullName(team.manager) : (team.lead ? getFullName(team.lead) : null);

  const members = (team.members || []).map((m: any) => {
    const u = m.user || m;
    return {
      id: u.id || m.id,
      name: getFullName(u),
      role: m.role || (team.manager && u.id === team.manager.id ? 'LEAD' : 'MEMBER'),
      avatar: getInitials(u.firstName, u.lastName),
      email: u.email,
      jobTitle: u.jobTitle,
      department: u.department,
      mfaEnabled: u.mfaEnabled,
      gradStyle: avatarGradStyle(u.id || m.id),
    };
  });

  // Sort: LEAD first, then MEMBER, then OBSERVER
  const roleOrder: Record<string, number> = { LEAD: 0, MEMBER: 1, OBSERVER: 2 };
  members.sort((a: any, b: any) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));

  const workloadColor = totalWorkload > 10 ? '#FCA5A5' : totalWorkload > 5 ? '#FCD34D' : '#6EE7B7';

  return (
    <div className="rounded-xl transition-all duration-200" style={{ background: '#ffffff', border: expanded ? `1px solid ${def.border}` : '1px solid rgba(99,102,241,0.06)', backdropFilter: 'blur(12px)' }}
      onMouseEnter={e => { if (!expanded) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)'; }}
      onMouseLeave={e => { if (!expanded) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.06)'; }}>
      {/* Card header */}
      <div className="flex items-center justify-between p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: def.bg }}>
            <TeamIcon className="w-5 h-5" style={{ color: def.hex }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold truncate" style={{ color: '#0f172a' }}>{team.name}</h3>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: def.bg, color: def.hex, border: `1px solid ${def.border}` }}>{def.label.toUpperCase()}</span>
              {!team.isActive && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(220,38,38,0.15)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}>INACTIVE</span>}
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#94a3b8' }}>{team.description || 'No description'}</p>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0 ml-4">
          {/* Member count */}
          <div className="text-center">
            <p className="text-lg font-bold font-display" style={{ color: '#0f172a' }}>{memberCount}</p>
            <p className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>Members</p>
          </div>

          {/* Workload indicator */}
          <div className="text-center">
            <p className="text-lg font-bold font-display" style={{ color: workloadColor }}>{totalWorkload}</p>
            <p className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>Workload</p>
          </div>

          {/* Contact icons */}
          <div className="flex items-center gap-1.5">
            {team.email && (
              <div className="p-1.5 rounded-md" style={{ background: 'rgba(99,102,241,0.06)' }} title={team.email}>
                <Mail className="w-3 h-3" style={{ color: '#94a3b8' }} />
              </div>
            )}
            {team.slackChannel && (
              <div className="p-1.5 rounded-md" style={{ background: 'rgba(99,102,241,0.06)' }} title={`#${team.slackChannel}`}>
                <MessageSquare className="w-3 h-3" style={{ color: '#94a3b8' }} />
              </div>
            )}
          </div>

          {/* Expand arrow */}
          {expanded
            ? <ChevronUp className="w-4 h-4" style={{ color: '#94a3b8' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: '#94a3b8' }} />
          }
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="animate-fade-in" style={{ borderTop: '1px solid rgba(99,102,241,0.06)' }}>
          {/* Stats bar */}
          <div className="flex items-center gap-6 px-5 py-3" style={{ background: 'rgba(99,102,241,0.03)' }}>
            {managerName && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
                <Crown className="w-3 h-3" style={{ color: '#D97706' }} /> Manager: <span className="font-medium" style={{ color: '#6366f1' }}>{managerName}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
              <AlertTriangle className="w-3 h-3" style={{ color: '#DC2626' }} /> <span className="font-medium" style={{ color: '#6366f1' }}>{incidentCount}</span> Incidents
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
              <Zap className="w-3 h-3" style={{ color: '#6366f1' }} /> <span className="font-medium" style={{ color: '#6366f1' }}>{changeCount}</span> Changes
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
              <Activity className="w-3 h-3" style={{ color: '#a855f7' }} /> <span className="font-medium" style={{ color: '#6366f1' }}>{problemCount}</span> Problems
            </span>
            <span className="flex items-center gap-1.5 text-xs ml-auto" style={{ color: '#94a3b8' }}>
              <Clock className="w-3 h-3" /> Created {team.createdAt || team.created_at ? new Date(team.createdAt || team.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}
            </span>
          </div>

          {/* Members grid */}
          <div className="p-5">
            {members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>No members yet</p>
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Add team members to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {members.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl transition-all" style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.06)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.06)')}>
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={member.gradStyle}>
                        {member.avatar}
                      </div>
                      {member.role === 'LEAD' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#D97706', border: '2px solid rgba(255,255,255,0.9)' }}>
                          <Crown className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#6366f1' }}>{member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={roleDarkStyles[member.role] || roleDarkStyles.MEMBER}>
                          {member.role}
                        </span>
                        {member.jobTitle && <span className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{member.jobTitle}</span>}
                      </div>
                    </div>
                    {member.mfaEnabled && <span title="MFA enabled"><Shield className="w-3 h-3 shrink-0" style={{ color: '#059669' }} /></span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──
export default function TeamList() {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: teamsData, isLoading, isError, refetch } = useTeams();
  const { canManage } = useAuth();
  const canModify = canManage('teams');
  const teams = extractList(teamsData);

  // Enrich teams with detected type
  const enrichedTeams = useMemo(() =>
    teams.map((t: any) => ({ ...t, detectedType: detectTeamType(t.name) })),
    [teams]
  );

  // Filter
  const filtered = useMemo(() => {
    let result = enrichedTeams;
    if (typeFilter !== 'ALL') result = result.filter((t: any) => t.detectedType === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t: any) =>
        String(t.name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.members || []).some((m: any) => {
          const u = m.user || m;
          return getFullName(u).toLowerCase().includes(q);
        })
      );
    }
    return result;
  }, [enrichedTeams, typeFilter, searchQuery]);

  // Stats
  const totalMembers = teams.reduce((acc: number, t: any) => acc + (t.members?.length || 0), 0);
  const totalWorkload = teams.reduce((acc: number, t: any) => acc + (t._count?.assignedIncidents || 0) + (t._count?.assignedChanges || 0) + (t._count?.assignedProblems || 0), 0);
  const activeTeams = teams.filter((t: any) => t.isActive !== false).length;

  // Type counts for filter
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    enrichedTeams.forEach((t: any) => { counts[t.detectedType] = (counts[t.detectedType] || 0) + 1; });
    return counts;
  }, [enrichedTeams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ background: '#eef2ff', minHeight: '100vh' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#6366f1' }} />
        <span className="ml-3 text-sm" style={{ color: '#64748b' }}>Loading teams...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64" style={{ background: '#eef2ff', minHeight: '100vh', color: '#DC2626' }}>
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-semibold">Failed to load teams</p>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '1.5rem' }}>
      {/* ── DARK HERO SECTION ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* Dot grid texture */}
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Ambient glow blobs — violet */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" style={{ background: 'rgba(124,58,237,0.35)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" style={{ background: 'rgba(124,58,237,0.2)' }} />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" style={{ background: 'rgba(167,139,250,0.1)' }} />

        <div className="relative px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)' }}>
                  <Users size={18} style={{ color: '#C4B5FD' }} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>Team Management</h1>
                  <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Manage teams, members, and on-call assignments across your organization</p>
                </div>
              </div>
            </div>
            {canModify && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', border: '1px solid rgba(167,139,250,0.4)', boxShadow: '0 4px 24px rgba(124,58,237,0.35)' }}
              >
                <Plus className="w-4 h-4" /> New Team
              </button>
            )}
          </div>

          {/* KPI pills */}
          <div className="flex items-center gap-4 mt-5">
            {[
              { label: 'Total Teams', value: teams.length },
              { label: 'Members', value: totalMembers },
              { label: 'Active Teams', value: activeTeams },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xl font-bold font-display" style={{ color: '#FFFFFF' }}>{s.value}</p>
                <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Gradient accent line */}
      <div className="h-[3px] -mt-5 mb-5 rounded-full" style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA, #C4B5FD, transparent)' }} />

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap p-3 rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search teams or members..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
            style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}
          />
        </div>

        <div className="h-5 w-px" style={{ background: 'rgba(99,102,241,0.08)' }} />

        {/* Type filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTypeFilter('ALL')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={typeFilter === 'ALL'
              ? { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }
              : { background: 'rgba(99,102,241,0.03)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.06)' }}
          >
            All <span className="text-[10px] opacity-60 ml-1">{teams.length}</span>
          </button>
          {Object.entries(TEAM_TYPES).filter(([k]) => k !== 'OTHER' && (typeCounts[k] || 0) > 0).map(([key, def]) => {
            const Icon = def.icon;
            const isActive = typeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={isActive
                  ? { background: def.bg, color: def.hex, border: `1px solid ${def.border}` }
                  : { background: 'rgba(99,102,241,0.03)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.06)' }}
              >
                <Icon className="w-3 h-3" /> {def.label} <span className="text-[10px] opacity-60">{typeCounts[key] || 0}</span>
              </button>
            );
          })}
        </div>

        <span className="text-xs ml-auto font-mono" style={{ color: '#94a3b8' }}>{filtered.length} team{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Team cards ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#94a3b8' }} />
          <p className="text-lg font-semibold" style={{ color: '#94a3b8' }}>No teams found</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            {searchQuery || typeFilter !== 'ALL' ? 'Try adjusting your filters' : 'Create your first team to get started'}
          </p>
          {canModify && !searchQuery && typeFilter === 'ALL' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
            >
              <Plus className="w-4 h-4" /> Create Team
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((team: any) => (
            <TeamCard
              key={team.id}
              team={team}
              expanded={expandedTeam === team.id}
              onToggle={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
            />
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      <CreateTeamModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}
