import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useState } from 'react';
import {
  LayoutDashboard, AlertTriangle, GitBranch, Bug, Bell,
  Server, Network, Brain, Zap, BarChart3, Plug, Users, Cpu,
  Settings, ChevronLeft, ChevronRight, Shield, Eye,
  MessageSquare, Mic, Activity, LogOut, Phone, Layers,
  Monitor, CalendarDays, CalendarClock, GitMerge, Terminal, Radio,
  BookOpen, Clock, FileSearch, UserCircle, X, ScrollText, ShieldCheck,
  Printer, Smartphone, HardDrive, Package, MonitorSmartphone,
  ClipboardCheck, MapPin, ShoppingCart, ClipboardList, Globe,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  icon: React.ComponentType<any>;
  label: string;
  end?: boolean;
  roles?: string[];
  badge?: string;
  superAdminOnly?: boolean;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'SERVICE MANAGEMENT',
    items: [
      { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
      { to: '/problems', icon: Bug, label: 'Problems' },
      { to: '/changes', icon: GitBranch, label: 'Changes' },
      { to: '/changes/calendar', icon: CalendarDays, label: 'Change Calendar' },
    ],
  },
  {
    label: 'CMDB & ASSETS',
    items: [
      { to: '/assets', icon: Server, label: 'All Assets' },
      { to: '/inventory/servers', icon: Server, label: 'Servers' },
      { to: '/inventory/virtual-machines', icon: Layers, label: 'Virtual Machines' },
      { to: '/inventory/network-devices', icon: Network, label: 'Network Devices' },
      { to: '/inventory/software', icon: Package, label: 'Software' },
      { to: '/hardware', icon: Cpu, label: 'Hardware Monitor', superAdminOnly: true },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { to: '/alerts', icon: Bell, label: 'Alerts & Events' },
      { to: '/oncall', icon: Phone, label: 'On-Call' },
      { to: '/escalations', icon: GitMerge, label: 'Escalations' },
      { to: '/sla-policies', icon: Clock, label: 'SLA Policies' },
      { to: '/maintenance', icon: CalendarClock, label: 'Maintenance' },
      { to: '/bod-eod', icon: ClipboardCheck, label: 'BOD / EOD' },
      { to: '/eod', icon: ClipboardList, label: 'EOD Operations', roles: ['ADMIN', 'MANAGER'] },
      { to: '/oms', icon: ShoppingCart, label: 'OMS', roles: ['ADMIN', 'MANAGER'] },
      { to: '/noc', icon: Monitor, label: 'NOC View', badge: 'LIVE', superAdminOnly: true },
    ],
  },
  {
    label: 'MONITORING',
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
    label: 'AI & AUTOMATION',
    items: [
      { to: '/aiops', icon: Brain, label: 'AIOps', badge: 'AI' },
      { to: '/runbooks', icon: Zap, label: 'Runbooks', roles: ['ADMIN', 'MANAGER'] },
      { to: '/kb', icon: BookOpen, label: 'Knowledge Base' },
      { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { to: '/teams', icon: Users, label: 'Teams' },
      { to: '/users', icon: Shield, label: 'Users', roles: ['ADMIN', 'MANAGER'] },
      { to: '/vendors', icon: Package, label: 'Vendors', roles: ['ADMIN', 'MANAGER'] },
      { to: '/integrations', icon: Plug, label: 'Integrations', roles: ['ADMIN'] },
      { to: '/settings/sites', icon: MapPin, label: 'Sites', superAdminOnly: true },
      { to: '/audit', icon: ScrollText, label: 'Audit Log', roles: ['ADMIN', 'MANAGER'] },
      { to: '/profile', icon: UserCircle, label: 'Profile' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

function getBadgeStyle(badge: string): React.CSSProperties {
  if (badge === 'LIVE') return {
    color: '#f87171',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.25)',
  };
  if (badge === 'AI') return {
    color: '#c084fc',
    background: 'rgba(192,132,252,0.12)',
    border: '1px solid rgba(192,132,252,0.25)',
  };
  if (badge === 'NEW') return {
    color: '#4ade80',
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.25)',
  };
  return {
    color: 'rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
  };
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const userRole = user?.role || 'VIEWER';
  const isSuperAdmin = userRole === 'ADMIN' && !user?.organization;
  const initials = user
    ? `${(user.first_name?.[0] || '').toUpperCase()}${(user.last_name?.[0] || '').toUpperCase()}`
    : 'U';

  // On mobile, sidebar is always expanded (not collapsed)
  const showLabels = mobileOpen || !collapsed;

  // State for expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['OVERVIEW', 'SERVICE MANAGEMENT']));

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onMobileClose}
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300',
          // Desktop: always visible, width based on collapsed state
          'lg:translate-x-0',
          collapsed ? 'lg:w-[68px]' : 'lg:w-[240px]',
          // Mobile: slide in/out, always full width (240px)
          mobileOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px] lg:w-auto',
        )}
        style={{
          background: '#0c0a1d',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* ── Brand ── */}
        <div
          className="flex items-center justify-between px-4 h-14 shrink-0 relative z-10"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #c084fc)',
                boxShadow: '0 0 20px rgba(124,58,237,0.4)',
              }}
            >
              <Eye className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            {showLabels && (
              <span
                className="font-display font-bold text-[15px] tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #c084fc, #f0abfc)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Argus Service Desk
              </span>
            )}
          </div>
          {/* Mobile close button */}
          {mobileOpen && (
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ── Org Switcher (Admin only) ── */}
        {showLabels && <OrgSwitcher />}

        {/* ── Navigation ── */}
        <nav role="navigation" aria-label="Main navigation" className="flex-1 py-3 px-2.5 space-y-4 relative z-10" style={{ overflowY: 'auto', minHeight: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => {
                if (item.superAdminOnly && !isSuperAdmin) return false;
                return !item.roles || item.roles.includes(userRole);
              }
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label}>
                {showLabels ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center gap-2 px-3 mb-1.5 w-full cursor-pointer group"
                  >
                    <span
                      className="text-[11px] font-black tracking-[0.18em] uppercase whitespace-nowrap"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      {group.label}
                    </span>
                    <div
                      className="flex-1 h-px"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    />
                    {expandedGroups.has(group.label) ? (
                      <ChevronUp className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    ) : (
                      <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    )}
                  </button>
                ) : (
                  <div
                    className="h-px mx-2 mb-2"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                )}

                {expandedGroups.has(group.label) && (
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className="block relative"
                        onClick={() => onMobileClose?.()}
                      >
                        {({ isActive }) => (
                          <div
                            className={clsx(
                              'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer group relative overflow-hidden',
                              !showLabels && 'justify-center'
                            )}
                            style={
                              isActive
                                ? {
                                    background: 'rgba(124,58,237,0.15)',
                                    color: '#c084fc',
                                  }
                                : {
                                    color: 'rgba(255,255,255,0.45)',
                                  }
                            }
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                              }
                            }}
                          >
                            {/* Active left accent bar */}
                            {isActive && (
                              <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                style={{
                                  background: 'linear-gradient(180deg, #7c3aed, #c084fc)',
                                  boxShadow: '0 0 8px rgba(124,58,237,0.5)',
                                }}
                              />
                            )}

                            <item.icon
                              className="w-[18px] h-[18px] shrink-0 transition-colors"
                              style={{ color: isActive ? '#c084fc' : 'rgba(255,255,255,0.35)' }}
                            />

                            {showLabels && (
                              <>
                                <span className="truncate flex-1">{item.label}</span>
                                {item.badge && (
                                  <span
                                    className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded"
                                    style={getBadgeStyle(item.badge)}
                                  >
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

        {/* ── User + Collapse ── */}
        <div
          className="p-2.5 shrink-0 space-y-1 relative z-10"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {user && showLabels && (
            <div
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer transition-all"
              onClick={() => { navigate('/profile'); onMobileClose?.(); }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #c084fc)',
                  boxShadow: '0 0 12px rgba(124,58,237,0.4)',
                }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[12px] font-semibold truncate"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {user.role}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); logout(); }}
                className="p-1.5 rounded-md transition-colors"
                title="Logout"
                aria-label="Logout"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#f87171';
                  e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Collapse button — desktop only */}
          <button
            onClick={onToggle}
            aria-label="Toggle sidebar"
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-xs">Collapse</span>
                </>
              )
            }
          </button>
        </div>
      </aside>
    </>
  );
}
