import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Clock, AlertTriangle,
  GitBranch, Bug, Server, Info, Zap, Filter, X,
} from 'lucide-react';
import api from '../../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  channel: string;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  INCIDENT: AlertTriangle,
  CHANGE: GitBranch,
  PROBLEM: Bug,
  ALERT: Bell,
  ASSET: Server,
  SYSTEM: Zap,
};

const TYPE_COLORS: Record<string, string> = {
  INCIDENT: '#d97706',
  CHANGE: '#6366f1',
  PROBLEM: '#7c3aed',
  ALERT: '#dc2626',
  ASSET: '#059669',
  SYSTEM: '#6366f1',
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function NotificationCenter() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page, filterRead],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (filterRead === 'unread') params.isRead = 'false';
      if (filterRead === 'read') params.isRead = 'true';
      const res = await api.get('/notifications', { params });
      return res.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications: Notification[] = data?.data?.notifications || [];
  const unreadCount: number = data?.data?.unreadCount || 0;
  const pagination = data?.pagination;

  const handleNotificationClick = useCallback((notif: Notification) => {
    if (!notif.isRead) markReadMutation.mutate(notif.id);
    if (notif.link) navigate(notif.link);
  }, [markReadMutation, navigate]);

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px]" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }} />

        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                <Bell size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-white">Notifications</h1>
                <p className="text-[12px]" style={{ color: '#94a3b8' }}>
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#a5b4fc',
                }}
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            {(['all', 'unread', 'read'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilterRead(f); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all capitalize"
                style={{
                  backgroundColor: filterRead === f ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${filterRead === f ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: filterRead === f ? '#a5b4fc' : '#94a3b8',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #6366f1)' }} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-signal/30 border-t-signal rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-16">
          <Bell size={40} style={{ color: '#d1d5db' }} className="mx-auto mb-3" />
          <p className="text-[14px] font-semibold" style={{ color: '#64748b' }}>No notifications</p>
          <p className="text-[12px] mt-1" style={{ color: '#94a3b8' }}>
            {filterRead === 'unread' ? 'All notifications have been read' : 'Nothing here yet'}
          </p>
        </div>
      )}

      {/* Notification list */}
      {!isLoading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] || Info;
            const color = TYPE_COLORS[notif.type] || '#6b7280';

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all group"
                style={{
                  backgroundColor: notif.isRead ? '#ffffff' : '#f8fafc',
                  border: `1px solid ${notif.isRead ? '#e7e5e4' : 'rgba(99,102,241,0.15)'}`,
                  cursor: notif.link ? 'pointer' : 'default',
                }}
              >
                {/* Unread dot */}
                <div className="shrink-0 mt-1 w-2 flex justify-center">
                  {!notif.isRead && (
                    <span className="block w-2 h-2 rounded-full" style={{ backgroundColor: '#6366f1' }} />
                  )}
                </div>

                {/* Icon */}
                <div
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${color}10` }}
                >
                  <Icon size={14} style={{ color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className="text-[13px] truncate"
                        style={{ color: '#0f172a', fontWeight: notif.isRead ? 400 : 600 }}
                      >
                        {notif.title}
                      </p>
                      <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: '#64748b' }}>
                        {notif.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: '#94a3b8' }}>
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                      {!notif.isRead && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notif.id); }}
                          className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: '#94a3b8' }}
                          title="Mark as read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Type badge */}
                  <div className="mt-1.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase"
                      style={{ backgroundColor: `${color}10`, color, border: `1px solid ${color}20` }}
                    >
                      {notif.type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-40 transition-all"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e7e5e4', color: '#64748b' }}
          >
            Previous
          </button>
          <span className="text-[12px] font-mono" style={{ color: '#94a3b8' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-40 transition-all"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e7e5e4', color: '#64748b' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
