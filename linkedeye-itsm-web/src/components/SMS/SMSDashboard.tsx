import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Send,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
} from 'lucide-react';
import { useSMSLogs, useSMSStats, useSMSProviders, useSendSMS } from '../../hooks/useSMS';
import type { SMSLog, SMSProvider } from '../../types';

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

// ── Subcomponents ──

function StatsCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl transition-all duration-300" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', color }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-display font-bold tracking-tight" style={{ color: '#0f172a' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{label}</p>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: SMSProvider }) {
  const styles: Record<SMSProvider, { bg: string; color: string; border: string }> = {
    TWILIO: { bg: 'rgba(99,102,241,0.08)', color: '#6366f1', border: 'rgba(99,102,241,0.15)' },
    MSG91: { bg: 'rgba(99,102,241,0.08)', color: '#334155', border: 'rgba(99,102,241,0.15)' },
    KALEYRA: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', border: 'rgba(245,158,11,0.25)' },
  };
  const s = styles[provider];
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {provider}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const style =
    s === 'SENT' || s === 'DELIVERED' ? { bg: 'rgba(16,185,129,0.12)', color: '#059669', border: 'rgba(16,185,129,0.25)' } :
    s === 'FAILED' ? { bg: 'rgba(239,68,68,0.12)', color: '#DC2626', border: 'rgba(239,68,68,0.25)' } :
    s === 'RECEIVED' ? { bg: 'rgba(99,102,241,0.08)', color: '#6366f1', border: 'rgba(99,102,241,0.15)' } :
    { bg: 'rgba(99,102,241,0.04)', color: '#64748b', border: 'rgba(99,102,241,0.08)' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
      {s}
    </span>
  );
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === 'INBOUND') return <ArrowDownLeft className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />;
  return <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#D97706' }} />;
}

// ── Main Component ──

export default function SMSDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const [showSendForm, setShowSendForm] = useState(false);
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendProvider, setSendProvider] = useState<string>('');

  const queryFilters = useMemo(() => {
    const f: Record<string, string | number> = { page, limit: 20 };
    if (directionFilter !== 'ALL') f.direction = directionFilter;
    if (providerFilter !== 'ALL') f.provider = providerFilter;
    return f;
  }, [directionFilter, providerFilter, page]);

  const { data: logsResponse, isLoading: logsLoading } = useSMSLogs(queryFilters);
  const { data: statsResponse } = useSMSStats();
  const { data: providersResponse } = useSMSProviders();
  const sendSMS = useSendSMS();

  const logs: SMSLog[] = logsResponse?.data ?? [];
  const pagination = logsResponse?.pagination;
  const stats = statsResponse?.data;
  const providers = providersResponse?.data?.providers ?? [];

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.recipient.toLowerCase().includes(q) ||
        l.message.toLowerCase().includes(q) ||
        l.incident?.number?.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const handleSend = async () => {
    if (!sendRecipient || !sendMessage) {
      toast.error('Recipient and message are required');
      return;
    }
    try {
      await sendSMS.mutateAsync({
        recipient: sendRecipient,
        message: sendMessage,
        provider: sendProvider || undefined,
      });
      toast.success('SMS sent successfully');
      setSendRecipient('');
      setSendMessage('');
      setShowSendForm(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to send SMS');
    }
  };

  return (
    <div className="animate-fade-in space-y-0">
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' }}>
        {/* dot-grid texture */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px', opacity: 0.15 }} />
        {/* glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4" style={{ background: 'rgba(99,102,241,0.3)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full" style={{ background: 'rgba(129,140,248,0.25)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full -translate-x-1/4" style={{ background: 'rgba(99,102,241,0.2)', filter: 'blur(80px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <MessageSquare size={16} style={{ color: '#c4b5fd' }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>SMS Gateway</h1>
              </div>
              <p className="text-sm ml-[42px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Multi-provider SMS management &middot; <span className="font-mono" style={{ color: '#c4b5fd' }}>{stats?.total ?? 0}</span> total messages
              </p>
            </div>
            <button onClick={() => setShowSendForm(!showSendForm)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
              <Send className="w-4 h-4" /> Send SMS
            </button>
          </div>
        </div>
      </div>
      <div className="h-0.5 -mt-5 mb-4" style={{ background: 'linear-gradient(90deg, #a5b4fc, #c4b5fd, #ddd6fe, transparent)' }} />

      {/* Send SMS Form */}
      {showSendForm && (
        <div className="p-5 rounded-xl space-y-4 animate-fade-in" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
          <h3 className="text-sm font-display font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Send className="w-4 h-4" style={{ color: '#6366f1' }} />
            Compose Message
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Recipient</label>
              <input
                type="tel"
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                placeholder="+919876543210"
                className="focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Provider (optional)</label>
              <select
                value={sendProvider}
                onChange={(e) => setSendProvider(e.target.value)}
                className="focus:outline-none"
                style={inputStyle}
              >
                <option value="">Auto-select</option>
                <option value="TWILIO">Twilio</option>
                <option value="MSG91">MSG91</option>
                <option value="KALEYRA">Kaleyra</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSend}
                disabled={sendSMS.isPending}
                className="px-4 py-2 text-sm flex items-center gap-2 w-full justify-center disabled:opacity-50 rounded-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              >
                {sendSMS.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Message</label>
            <textarea
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              maxLength={160}
              className="w-full text-sm resize-none focus:outline-none"
              style={inputStyle}
            />
            <p className="text-[10px] mt-1 font-mono" style={{ color: '#cbd5e1' }}>{sendMessage.length}/160 characters</p>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard icon={MessageSquare} label="Total Messages" value={stats?.total ?? 0} color="#334155" />
        <StatsCard icon={CheckCircle} label="Sent" value={stats?.sent ?? 0} color="#6EE7B7" />
        <StatsCard icon={XCircle} label="Failed" value={stats?.failed ?? 0} color="#FCA5A5" />
        <StatsCard icon={ArrowDownLeft} label="Inbound" value={stats?.inbound ?? 0} color="#334155" />
        <StatsCard icon={Activity} label="Success Rate" value={`${stats?.successRate ?? 0}%`} color="#FCD34D" />
      </div>

      {/* Provider Status */}
      {providers.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
          <h3 className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: '#94a3b8' }}>Provider Status</h3>
          <div className="flex flex-wrap gap-3">
            {providers.map((p: { name: SMSProvider; healthy: boolean; message: string }) => (
              <div
                key={p.name}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={p.healthy
                  ? { border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)' }
                  : { border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }
                }
              >
                <span className="w-2 h-2 rounded-full" style={{ background: p.healthy ? '#6EE7B7' : '#FCA5A5' }} />
                <span className="font-mono text-xs" style={{ color: '#0f172a' }}>{p.name}</span>
                <span className="text-[10px]" style={{ color: '#94a3b8' }}>{p.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-xl p-3" style={{ background: '#ffffff', backdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
            <Filter size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Filters</span>
          </div>

          <select
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg text-sm focus:outline-none"
            style={inputStyle}
          >
            <option value="ALL">All Directions</option>
            <option value="OUTBOUND">Outbound</option>
            <option value="INBOUND">Inbound</option>
          </select>

          <select
            value={providerFilter}
            onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg text-sm focus:outline-none"
            style={inputStyle}
          >
            <option value="ALL">All Providers</option>
            <option value="TWILIO">Twilio</option>
            <option value="MSG91">MSG91</option>
            <option value="KALEYRA">Kaleyra</option>
          </select>

          <div className="w-px h-7 hidden sm:block" style={{ background: 'rgba(99,102,241,0.08)' }} />

          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by recipient, message, or incident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
              style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a' }}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {logsLoading && (
        <div className="p-12 text-center rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)' }}>
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: '#6366f1' }} />
          <p className="font-medium" style={{ color: '#64748b' }}>Loading SMS logs...</p>
        </div>
      )}

      {/* SMS Logs Table */}
      {!logsLoading && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
              <p className="font-medium" style={{ color: '#64748b' }}>No SMS logs found</p>
              <p className="text-sm mt-1" style={{ color: '#cbd5e1' }}>Send your first message or adjust filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#94a3b8' }}>Direction</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#94a3b8' }}>Recipient</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#94a3b8' }}>Message</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#94a3b8' }}>Provider</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#94a3b8' }}>Status</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#94a3b8' }}>Incident</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#94a3b8' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}
                    >
                      <td className="px-4 py-3">
                        <DirectionIcon direction={log.direction} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: '#0f172a' }}>{log.recipient}</td>
                      <td className="px-4 py-3 text-xs max-w-[300px] truncate" style={{ color: '#64748b' }}>{log.message}</td>
                      <td className="px-4 py-3"><ProviderBadge provider={log.provider} /></td>
                      <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                      <td className="px-4 py-3">
                        {log.incident ? (
                          <span className="text-[10px] font-mono" style={{ color: '#6366f1' }}>{log.incident.number}</span>
                        ) : (
                          <span className="text-[10px]" style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono" style={{ color: '#94a3b8' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(99,102,241,0.06)' }}>
              <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30"
                  style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#64748b' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30"
                  style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#64748b' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
