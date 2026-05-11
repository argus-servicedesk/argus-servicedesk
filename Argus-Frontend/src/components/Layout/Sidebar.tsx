import { useState, type CSSProperties, type ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Bug,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Eye,
  GitBranch,
  GitMerge,
  Globe,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  Monitor,
  Package,
  Phone,
  Plug,
  Radio,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Terminal,
  UserCircle,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import OrgSwitcher from './OrgSwitcher';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
  roles?: string[];
  badge?: string;
  superAdminOnly?: boolean;
}

interface NavGroup {
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Service Management',
    icon: LifeBuoy,
    items: [
      { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
      { to: '/problems', icon: Bug, label: 'Problems' },
      { to: '/changes', icon: GitBranch, label: 'Changes' },
      { to: '/changes/calendar', icon: CalendarDays, label: 'Change Calendar' },
    ],
  },
  {
    label: 'Operations',
    icon: Activity,
    items: [
      { to: '/alerts', icon: Bell, label: 'Alerts & Events' },
      { to: '/oncall', icon: Phone, label: 'On-Call' },
      { to: '/escalations', icon: GitMerge, label: 'Escalations' },
      { to: '/sla-policies', icon: Clock, label: 'SLA Policies' },
      { to: '/maintenance', icon: CalendarClock, label: 'Maintenance' },
      { to: '/noc', icon: Monitor, label: 'NOC View', badge: 'LIVE', superAdminOnly: true },
    ],
  },
  {
    label: 'Monitoring',
    icon: Monitor,
    items: [
      { to: '/metrics', icon: Activity, label: 'Metrics', superAdminOnly: true },
      { to: '/apm', icon: Eye, label: 'Service Map', badge: 'LIVE', superAdminOnly: true },
      { to: '/domain', icon: Globe, label: 'Domain Ops', badge: 'LIVE', roles: ['ADMIN', 'MANAGER'] },
      { to: '/ill-bandwidth', icon: Radio, label: 'ILL Bandwidth', badge: 'LIVE', superAdminOnly: true },
      { to: '/k8s', icon: Layers, label: 'Infrastructure', superAdminOnly: true },
      { to: '/logs', icon: Terminal, label: 'Logs', superAdminOnly: true },
    ],
  },
  {
    label: 'AI & Automation',
    icon: Sparkles,
    items: [
      { to: '/aiops', icon: Sparkles, label: 'AIOps', badge: 'AI' },
      { to: '/runbooks', icon: Zap, label: 'Runbooks', roles: ['ADMIN', 'MANAGER'] },
      { to: '/kb', icon: BookOpen, label: 'Knowledge Base' },
      { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    items: [
      { to: '/teams', icon: Users, label: 'Teams' },
      { to: '/users', icon: Shield, label: 'Users', roles: ['ADMIN', 'MANAGER'] },
      { to: '/roles', icon: Lock, label: 'Roles & Permissions', roles: ['ADMIN'] },
      { to: '/vendors', icon: Package, label: 'Vendors', roles: ['ADMIN', 'MANAGER'] },
      { to: '/integrations', icon: Plug, label: 'Integrations', roles: ['ADMIN'] },
      { to: '/workflows', icon: GitBranch, label: 'Workflows', roles: ['ADMIN'] },
      { to: '/automations', icon: Zap, label: 'Automations', roles: ['ADMIN'] },
      { to: '/assignment-rules', icon: GitMerge, label: 'Assignment Rules', roles: ['ADMIN', 'MANAGER'] },
      { to: '/settings/sites', icon: MapPin, label: 'Sites', superAdminOnly: true },
      { to: '/audit', icon: ScrollText, label: 'Audit Log', roles: ['ADMIN', 'MANAGER'] },
      { to: '/profile', icon: UserCircle, label: 'Profile' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

function badgeStyle(badge: string): CSSProperties {
  if (badge === 'LIVE') return { color: '#b42318', background: '#fff6f6', border: '1px solid #fca5a5' };
  if (badge === 'AI') return { color: '#075985', background: '#eff6ff', border: '1px solid #bfdbfe' };
  return { color: '#475467', background: '#f5f6f7', border: '1px solid #d8dde6' };
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const userRole = user?.role || 'VIEWER';
  const isSuperAdmin = userRole === 'ADMIN' && !user?.organization;
  const initials = user
    ? `${(user.first_name?.[0] || '').toUpperCase()}${(user.last_name?.[0] || '').toUpperCase()}`
    : 'U';
  const showLabels = mobileOpen || !collapsed;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Overview', 'Service Management', 'Operations']));

  const toggleGroup = (label: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(15,23,42,0.35)' }}
          onClick={onMobileClose}
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-screen flex-col transition-all duration-300 lg:translate-x-0',
          collapsed ? 'lg:w-[68px]' : 'lg:w-[240px]',
          mobileOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px] lg:w-auto',
        )}
        style={{
          background: '#f4f6f8',
          borderRight: '1px solid #c6ccd5',
          color: '#1f2937',
        }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4" style={{ background: '#fff', borderColor: '#c6ccd5' }}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm" style={{ background: '#001d5b', color: '#fff' }}>
              <Eye className="h-4 w-4" strokeWidth={2.4} />
            </div>
            {showLabels && (
              <span className="truncate text-[15px] font-bold" style={{ color: '#001d5b' }}>
                Argus Service Desk
              </span>
            )}
          </div>
          {mobileOpen && (
            <button type="button" onClick={onMobileClose} className="lg:hidden p-1" aria-label="Close sidebar" style={{ color: '#475467' }}>
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {showLabels && <OrgSwitcher />}

        <nav role="navigation" aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.superAdminOnly && !isSuperAdmin) return false;
              return !item.roles || item.roles.includes(userRole);
            });
            if (visibleItems.length === 0) return null;
            const groupOpen = showLabels ? expandedGroups.has(group.label) : true;

            return (
              <div key={group.label} className="mb-3">
                {showLabels ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
                    style={{ color: '#475467' }}
                  >
                    <group.icon className="h-3.5 w-3.5" />
                    <span className="flex-1 truncate text-[11px] font-bold uppercase tracking-[0.08em]">{group.label}</span>
                    {groupOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                ) : (
                  <div className="my-2 h-px" style={{ background: '#d8dde6' }} />
                )}

                {groupOpen && (
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavLink key={item.to} to={item.to} end={item.end} className="block" onClick={() => onMobileClose?.()}>
                        {({ isActive }) => (
                          <div
                            className={clsx(
                              'flex min-h-[34px] items-center gap-2.5 rounded-sm border px-2.5 text-[13px] font-semibold transition-colors',
                              !showLabels && 'justify-center',
                            )}
                            title={!showLabels ? item.label : undefined}
                            style={
                              isActive
                                ? {
                                    background: '#e8eef5',
                                    borderColor: '#c6ccd5',
                                    color: '#001d5b',
                                    boxShadow: 'inset 3px 0 0 #001d5b',
                                  }
                                : {
                                    background: 'transparent',
                                    borderColor: 'transparent',
                                    color: '#344054',
                                  }
                            }
                          >
                            <item.icon className="h-[17px] w-[17px] shrink-0" />
                            {showLabels && (
                              <>
                                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                {item.badge && (
                                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={badgeStyle(item.badge)}>
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t p-2" style={{ borderColor: '#c6ccd5', background: '#fff' }}>
          {user && showLabels && (
            <button
              type="button"
              className="mb-1 flex w-full items-center gap-2 rounded-sm border px-2 py-2 text-left"
              style={{ borderColor: '#d8dde6', background: '#f7f8fa', color: '#1f2937' }}
              onClick={() => { navigate('/profile'); onMobileClose?.(); }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[11px] font-bold" style={{ background: '#e8eef5', color: '#001d5b' }}>
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold">{user.first_name} {user.last_name}</span>
                <span className="block truncate text-[10px] uppercase" style={{ color: '#667085' }}>{user.role}</span>
              </span>
              <span
                role="button"
                tabIndex={0}
                className="rounded-sm p-1"
                title="Logout"
                aria-label="Logout"
                style={{ color: '#667085' }}
                onClick={(event) => { event.stopPropagation(); logout(); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    logout();
                  }
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            aria-label="Toggle sidebar"
            className="hidden min-h-[32px] w-full items-center justify-center gap-2 rounded-sm border text-[12px] font-semibold lg:flex"
            style={{ borderColor: '#d8dde6', color: '#344054', background: '#fff' }}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
