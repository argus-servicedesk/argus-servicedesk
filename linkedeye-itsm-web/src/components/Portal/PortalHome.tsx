import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShoppingCart, BookOpen, Search, Clock, ArrowRight } from 'lucide-react';
import { useMyServiceRequests } from '../../hooks/useServiceRequests';
import { useIncidents } from '../../hooks/useIncidents';
import { useAuthStore } from '../../stores/authStore';

const quickActions = [
  {
    to: '/portal/report-issue',
    icon: AlertTriangle,
    title: 'Report an Issue',
    description: 'Submit a new incident for hardware, software, network, or access problems.',
    color: '#ef4444',
    bg: '#fef2f2',
  },
  {
    to: '/portal/catalog',
    icon: ShoppingCart,
    title: 'Request a Service',
    description: 'Browse the service catalog and submit a new service request.',
    color: '#6366f1',
    bg: '#eef2ff',
  },
  {
    to: '/portal/knowledge-base',
    icon: BookOpen,
    title: 'Browse Knowledge Base',
    description: 'Find answers, guides, and troubleshooting articles.',
    color: '#059669',
    bg: '#ecfdf5',
  },
];

function formatDate(d: string | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StateBadge({ state }: { state: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    new: { bg: '#dbeafe', text: '#1d4ed8' },
    open: { bg: '#dbeafe', text: '#1d4ed8' },
    in_progress: { bg: '#fef3c7', text: '#92400e' },
    pending: { bg: '#fef3c7', text: '#92400e' },
    resolved: { bg: '#d1fae5', text: '#065f46' },
    closed: { bg: '#f3f4f6', text: '#374151' },
    fulfilled: { bg: '#d1fae5', text: '#065f46' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
  };
  const c = colors[state?.toLowerCase()] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {(state ?? '').replace(/_/g, ' ')}
    </span>
  );
}

export default function PortalHome() {
  const [search, setSearch] = useState('');
  const user = useAuthStore((s) => s.user);

  const { data: srData } = useMyServiceRequests({ limit: '5' });
  const { data: incData } = useIncidents({ callerId: user?.id, limit: '5' } as Record<string, string>);

  const serviceRequests = srData?.data ?? [];
  const incidents = incData?.data ?? [];
  const recentItems = [
    ...serviceRequests.map((r: any) => ({ ...r, _type: 'SR' })),
    ...incidents.map((r: any) => ({ ...r, _type: 'INC' })),
  ]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section
        className="rounded-2xl px-6 py-14 text-center"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #a5b4fc 100%)',
        }}
      >
        <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">
          How can we help you?
        </h1>
        <p className="mb-6 text-indigo-100">
          Search for answers or browse our services below
        </p>
        <div className="mx-auto flex max-w-xl items-center overflow-hidden rounded-xl bg-white shadow-lg">
          <div className="pl-4" style={{ color: '#94a3b8' }}>
            <Search size={20} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for help articles, services, FAQs..."
            className="w-full border-0 bg-transparent px-3 py-3.5 text-sm outline-none placeholder:text-slate-400"
            style={{ color: '#0f172a' }}
          />
          {search && (
            <Link
              to={`/portal/knowledge-base?search=${encodeURIComponent(search)}`}
              className="mr-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#6366f1' }}
            >
              Search
            </Link>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: '#0f172a' }}>
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex flex-col rounded-xl border p-6 transition-shadow hover:shadow-md"
                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
              >
                <div
                  className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: action.bg }}
                >
                  <Icon size={22} style={{ color: action.color }} />
                </div>
                <h3 className="mb-1 text-base font-semibold" style={{ color: '#0f172a' }}>
                  {action.title}
                </h3>
                <p className="mb-4 flex-1 text-sm" style={{ color: '#64748b' }}>
                  {action.description}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-sm font-medium transition-colors group-hover:gap-2"
                  style={{ color: '#6366f1' }}
                >
                  Get started <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Requests */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: '#0f172a' }}>
            <Clock size={18} className="mr-2 inline-block" style={{ color: '#6366f1' }} />
            Your Recent Requests
          </h2>
          <Link
            to="/portal/my-requests"
            className="text-sm font-medium hover:underline"
            style={{ color: '#6366f1' }}
          >
            View all
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div
            className="rounded-xl border px-6 py-10 text-center"
            style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
          >
            <p className="text-sm" style={{ color: '#64748b' }}>
              You have no recent requests. Use the quick actions above to get started.
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl border"
            style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #e2e8f0' }}>
                  <th className="px-4 py-3 font-medium" style={{ color: '#64748b' }}>Type</th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#64748b' }}>Number</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell" style={{ color: '#64748b' }}>Description</th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#64748b' }}>Status</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" style={{ color: '#64748b' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map((item: any, idx: number) => (
                  <tr
                    key={item.id ?? idx}
                    style={{ borderBottom: idx < recentItems.length - 1 ? '1px solid #e2e8f0' : undefined }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: item._type === 'INC' ? '#fef2f2' : '#eef2ff',
                          color: item._type === 'INC' ? '#dc2626' : '#6366f1',
                        }}
                      >
                        {item._type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#0f172a' }}>
                      {item.number ?? '-'}
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-3 sm:table-cell" style={{ color: '#64748b' }}>
                      {item.shortDescription ?? item.description ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StateBadge state={item.state ?? item.status ?? 'new'} />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell" style={{ color: '#64748b' }}>
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
