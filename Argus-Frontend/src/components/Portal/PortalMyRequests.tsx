import { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useMyServiceRequests } from '../../hooks/useServiceRequests';
import { useIncidents } from '../../hooks/useIncidents';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';

type Tab = 'service-requests' | 'incidents';

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
    approved: { bg: '#e0e7ff', text: '#4338ca' },
    resolved: { bg: '#d1fae5', text: '#065f46' },
    closed: { bg: '#f3f4f6', text: '#374151' },
    fulfilled: { bg: '#d1fae5', text: '#065f46' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
  };
  const c = colors[state?.toLowerCase()] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {(state ?? '').replace(/_/g, ' ')}
    </span>
  );
}

export default function PortalMyRequests() {
  const [tab, setTab] = useState<Tab>('service-requests');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  const { data: srData, isLoading: srLoading } = useMyServiceRequests();
  const { data: incData, isLoading: incLoading } = useIncidents({ callerId: user?.id } as Record<string, string>);

  const serviceRequests: any[] = srData?.data ?? [];
  const incidents: any[] = incData?.data ?? [];

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'service-requests', label: 'Service Requests', count: serviceRequests.length },
    { key: 'incidents', label: 'Incidents', count: incidents.length },
  ];

  const isLoading = tab === 'service-requests' ? srLoading : incLoading;
  const items = tab === 'service-requests' ? serviceRequests : incidents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>
          <ClipboardList size={24} className="mr-2 inline-block" style={{ color: '#6366f1' }} />
          My Requests
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
          Track the status of your service requests and incidents.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: '#e2e8f0', backgroundColor: '#F8FAFC' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setExpandedId(null); }}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === t.key ? '#ffffff' : 'transparent',
              color: tab === t.key ? '#6366f1' : '#64748b',
              boxShadow: tab === t.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {t.label}
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                backgroundColor: tab === t.key ? '#eef2ff' : '#f1f5f9',
                color: tab === t.key ? '#6366f1' : '#94a3b8',
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: '#e2e8f0', borderTopColor: '#6366f1' }}
          />
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl border px-6 py-14 text-center"
          style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
        >
          <ClipboardList size={40} className="mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>
            No {tab === 'service-requests' ? 'service requests' : 'incidents'} found.
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
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 font-medium" style={{ color: '#64748b' }}>Number</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell" style={{ color: '#64748b' }}>Description</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#64748b' }}>Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell" style={{ color: '#64748b' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const isExpanded = expandedId === item.id;
                return (
                  <ExpandableRow
                    key={item.id ?? idx}
                    item={item}
                    tab={tab}
                    isExpanded={isExpanded}
                    isLast={idx === items.length - 1}
                    onToggle={() => toggleExpand(item.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExpandableRow({
  item,
  tab,
  isExpanded,
  isLast,
  onToggle,
}: {
  item: any;
  tab: Tab;
  isExpanded: boolean;
  isLast: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();
  const desc = item.shortDescription ?? item.description ?? '-';
  const state = item.state ?? item.status ?? 'new';
  const normalizedState = String(state).toUpperCase();
  const canReopen = tab === 'incidents' && ['RESOLVED', 'CLOSED'].includes(normalizedState);

  const reopenIncident = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/incidents/${item.id}/reopen/`, {
        reason: 'Client reopened from self-service portal',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Ticket reopened');
    },
    onError: () => toast.error('Unable to reopen ticket'),
  });

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer transition-colors hover:bg-slate-50"
        style={{ borderBottom: !isExpanded && !isLast ? '1px solid #e2e8f0' : undefined }}
      >
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronUp size={14} style={{ color: '#94a3b8' }} />
          ) : (
            <ChevronDown size={14} style={{ color: '#94a3b8' }} />
          )}
        </td>
        <td className="px-4 py-3 font-medium" style={{ color: '#0f172a' }}>
          {item.number ?? '-'}
        </td>
        <td className="hidden max-w-xs truncate px-4 py-3 sm:table-cell" style={{ color: '#64748b' }}>
          {desc}
        </td>
        <td className="px-4 py-3">
          <StateBadge state={state} />
        </td>
        <td className="hidden px-4 py-3 md:table-cell" style={{ color: '#64748b' }}>
          {formatDate(item.createdAt)}
        </td>
      </tr>
      {isExpanded && (
        <tr style={{ borderBottom: !isLast ? '1px solid #e2e8f0' : undefined }}>
          <td colSpan={5}>
            <div
              className="px-6 py-4"
              style={{ backgroundColor: '#F8FAFC' }}
            >
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Number" value={item.number} />
                <Detail label="Status" value={state.replace(/_/g, ' ')} />
                {tab === 'service-requests' && (
                  <>
                    <Detail label="Catalog Item" value={item.catalogItem?.name ?? item.catalogItemName} />
                    <Detail label="Quantity" value={item.quantity} />
                    <Detail label="Notes" value={item.notes} />
                  </>
                )}
                {tab === 'incidents' && (
                  <>
                    <Detail label="Category" value={item.category} />
                    <Detail label="Priority" value={item.priority} />
                    <Detail label="Impact" value={item.impact} />
                    <Detail label="Urgency" value={item.urgency} />
                  </>
                )}
                <Detail label="Description" value={item.shortDescription ?? item.description} />
                <Detail label="Created" value={formatDate(item.createdAt)} />
                <Detail label="Updated" value={formatDate(item.updatedAt)} />
              </div>
              {canReopen ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      reopenIncident.mutate();
                    }}
                    disabled={reopenIncident.isPending}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {reopenIncident.isPending ? 'Reopening...' : 'Reopen Ticket'}
                  </button>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
        {label}
      </span>
      <p className="mt-0.5 capitalize" style={{ color: '#0f172a' }}>
        {String(value)}
      </p>
    </div>
  );
}
