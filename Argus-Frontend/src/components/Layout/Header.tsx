import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Bell, LogOut, User, ChevronRight, CheckCheck, Menu, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useUnreadCount, useNotifications, useMarkAsRead, useMarkAllAsRead } from '../../hooks/useNotifications';
import api from '../../lib/api';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/incidents': 'Incident Management',
  '/incidents/create': 'Create Incident',
  '/changes': 'Change Management',
  '/changes/calendar': 'Change Calendar',
  '/changes/create': 'Create Change',
  '/problems': 'Problem Management',
  '/alerts': 'Event Management',
  '/assets': 'Configuration Items',
  '/hardware': 'Hardware Monitoring',
  '/integrations': 'Integrations',
  '/teams': 'Team Management',
  '/users': 'User Management',
  '/reports': 'Reports & Analytics',
  '/settings': 'System Settings',
  '/settings/sites': 'Site Management',
  '/settings/mfa': 'Multi-Factor Authentication',
  '/profile': 'My Profile',
  '/oncall': 'On-Call Schedule',
  '/escalation': 'Escalation Policies',
  '/escalations': 'Escalation Policies',
  '/sla': 'SLA Management',
  '/sla-policies': 'SLA Management',
  '/maintenance': 'Maintenance Windows',
  '/bod-eod': 'Daily Operations Checklist',
  '/noc': 'NOC Dashboard',
  '/metrics': 'Metrics Explorer',
  '/apm': 'Service Map',
  '/k8s': 'Infrastructure',
  '/logs': 'Log Explorer',
  '/ai-insights': 'AIOps Insights',
  '/aiops': 'AIOps Insights',
  '/automation': 'Runbook Automation',
  '/runbooks': 'Runbook Automation',
  '/knowledge-base': 'Knowledge Base',
  '/audit': 'Audit Logs',
  '/notifications': 'Notifications',
  '/ill-bandwidth': 'ILL Bandwidth',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Light-themed notification styles
const notifStyles: Record<string, { bg: string; border: string; titleColor: string; textColor: string }> = {
  INCIDENT: {
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.15)',
    titleColor: '#DC2626',
    textColor: '#64748b',
  },
  SLA: {
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.15)',
    titleColor: '#D97706',
    textColor: '#64748b',
  },
  CHANGE: {
    bg: 'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.15)',
    titleColor: '#6366f1',
    textColor: '#64748b',
  },
  ALERT: {
    bg: 'rgba(234,88,12,0.06)',
    border: 'rgba(234,88,12,0.15)',
    titleColor: '#EA580C',
    textColor: '#64748b',
  },
  DEFAULT: {
    bg: 'rgba(99,102,241,0.04)',
    border: 'rgba(99,102,241,0.1)',
    titleColor: '#6366f1',
    textColor: '#64748b',
  },
};

function buildDisplayName(user: any): string {
  const first = user?.first_name ?? user?.firstName ?? '';
  const last = user?.last_name ?? user?.lastName ?? '';
  const fullName = `${first} ${last}`.trim();
  if (fullName) return fullName;
  if (user?.username) return user.username;
  if (user?.email) return String(user.email).split('@')[0];
  return 'User';
}

function buildInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
  return initials || 'U';
}

interface NotifItemProps {
  notification: import('../../hooks/useNotifications').Notification;
  onRead: (id: string) => void;
  onNavigate: () => void;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  url: string;
}

function NotifItem({ notification: n, onRead, onNavigate }: NotifItemProps) {
  const style = notifStyles[n.type] ?? notifStyles.DEFAULT;

  const inner = (
    <div
      className="mx-3 my-1.5 p-2.5 rounded-lg text-xs transition-opacity cursor-pointer"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        opacity: n.isRead ? 0.5 : 1,
      }}
      onClick={() => { if (!n.isRead) onRead(n.id); }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-semibold" style={{ color: style.titleColor }}>{n.title}</span>
          <p className="mt-0.5 truncate" style={{ color: style.textColor }}>{n.message}</p>
        </div>
        {!n.isRead && (
          <span
            className="w-1.5 h-1.5 mt-1 rounded-full shrink-0"
            style={{ background: '#6366f1' }}
          />
        )}
      </div>
      <span className="text-[10px] mt-1 block" style={{ color: '#94a3b8' }}>{timeAgo(n.createdAt)}</span>
    </div>
  );

  if (n.link) {
    return <Link to={n.link} onClick={onNavigate}>{inner}</Link>;
  }
  return <div>{inner}</div>;
}

export default function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const displayName = buildDisplayName(user);
  const initials = buildInitials(displayName);
  const displayRole = user?.role || 'User';
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search functionality
  const { data: searchResultsResponse, isFetching: isSearchFetching } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data } = await api.get(`/search/?q=${encodeURIComponent(searchQuery)}`);
      return data?.data?.results ?? [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });
  const searchResults: SearchResult[] = Array.isArray(searchResultsResponse) ? searchResultsResponse : [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for 300ms debounce
    searchTimeoutRef.current = setTimeout(() => {
      setSearchOpen(value.length >= 2);
    }, 300);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(result.url || '/');
  };

  const getTypeBadgeStyle = (type: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      'incident': { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
      'problem': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
      'change': { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
      'asset': { bg: 'rgba(34,197,94,0.1)', color: '#059669' },
    };
    return styles[type.toLowerCase()] || { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' };
  };

  // Notifications
  const { data: unreadData }   = useUnreadCount();
  const { data: notifData }    = useNotifications();
  const markAsRead             = useMarkAsRead();
  const markAllAsRead          = useMarkAllAsRead();
  const unreadCount            = unreadData ?? 0;
  const notifications          = notifData?.data?.notifications ?? [];

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const incidentIdFromPath =
    pathSegments[0] === 'incidents' && pathSegments[1] && pathSegments[1] !== 'create'
      ? pathSegments[1]
      : '';

  const isIncidentDetailPath = UUID_RE.test(incidentIdFromPath);
  const { data: incidentNumberCrumb } = useQuery({
    queryKey: ['header-incident-number', incidentIdFromPath],
    queryFn: async () => {
      const { data } = await api.get(`/incidents/${incidentIdFromPath}/`);
      return data?.data?.number || incidentIdFromPath;
    },
    enabled: isIncidentDetailPath,
    staleTime: 60000,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <header
      className="h-14 flex items-center justify-between px-5 sticky top-0 z-30"
      style={{
        background: '#ffffff',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
      }}
    >
      {/* Left: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <nav className="flex items-center gap-1 text-[13px]">
          {pathSegments.length === 0 ? (
            <span className="font-semibold" style={{ color: '#0f172a' }}>Dashboard</span>
          ) : (
            pathSegments.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="w-3 h-3" style={{ color: '#cbd5e1' }} />
                )}
                <span
                  className={clsx(i === pathSegments.length - 1 ? 'font-semibold' : 'font-normal')}
                  style={{ color: i === pathSegments.length - 1 ? '#0f172a' : '#64748b' }}
                >
                  {pathSegments[0] === 'incidents' && i === 1 && isIncidentDetailPath
                    ? incidentNumberCrumb ?? 'Incident'
                    : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')}
                </span>
              </span>
            ))
          )}
        </nav>
      </div>

      {/* Right: Search + Notifications + Profile */}
      <div className="flex items-center gap-1.5">
        {/* Search */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search incidents, changes..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-64 pl-10 pr-4 py-2 text-sm rounded-lg transition-all focus:outline-none"
              style={{
                background: '#f8fafc',
                border: '1px solid rgba(99,102,241,0.12)',
                color: '#0f172a'
              }}
              onFocus={() => {
                if (searchQuery.length >= 2) setSearchOpen(true);
              }}
            />
          </div>

          {searchOpen && searchQuery.length >= 2 && (
            <div
              className="absolute top-12 left-0 w-full rounded-xl overflow-hidden animate-fade-in z-50"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(99,102,241,0.12)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div className="max-h-80 overflow-y-auto">
                {isSearchFetching && (
                  <div className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>
                    Searching...
                  </div>
                )}
                {!isSearchFetching && searchResults.length === 0 && (
                  <div className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>
                    No results found
                  </div>
                )}
                {!isSearchFetching && searchResults.slice(0, 10).map((result) => {
                  const badgeStyle = getTypeBadgeStyle(result.type);
                  return (
                    <div
                      key={`${result.type}-${result.id}`}
                      className="px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            background: badgeStyle.bg,
                            color: badgeStyle.color
                          }}
                        >
                          {result.type.toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm" style={{ color: '#0f172a' }}>
                              {result.title}
                            </span>
                          </div>
                          <p className="text-sm mt-1 truncate" style={{ color: '#64748b' }}>
                            {result.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative p-2 rounded-lg transition-all"
            style={{ color: '#64748b' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none"
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #a855f7)',
                  boxShadow: '0 0 0 2px #ffffff',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-12 w-80 rounded-xl overflow-hidden animate-fade-in"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(99,102,241,0.12)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #e2e8f0' }}
              >
                <h3 className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span
                      className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        color: '#DC2626',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.15)',
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead.mutate()}
                    className="flex items-center gap-1 text-[11px] font-medium transition-colors"
                    style={{ color: '#6366f1' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#4f46e5'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#6366f1'; }}
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs" style={{ color: '#94a3b8' }}>
                    <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: '#cbd5e1' }} />
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n: any) => (
                    <NotifItem
                      key={n.id}
                      notification={n}
                      onRead={(id) => { markAsRead.mutate(id); }}
                      onNavigate={() => setNotifOpen(false)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 p-1 rounded-lg transition-all"
            style={{ background: profileOpen ? '#f1f5f9' : 'transparent' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                boxShadow: '0 1px 3px rgba(99,102,241,0.3)',
              }}
            >
              {initials}
            </div>
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 top-12 w-56 rounded-xl p-2 animate-fade-in"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(99,102,241,0.12)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                className="px-3 py-2 mb-1"
                style={{ borderBottom: '1px solid #e2e8f0' }}
              >
                <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{displayName}</p>
                <p className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>{displayRole}</p>
              </div>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all text-left"
                style={{ color: '#64748b' }}
                onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#0f172a';
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <User className="w-4 h-4" /> Profile
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all text-left"
                style={{ color: '#DC2626' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

    </header>
  );
}
