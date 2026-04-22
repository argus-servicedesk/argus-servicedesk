// ===============================================================
// Argus Service Desk -- Consumable Detail Page
// Fetches from /api/v1/consumables/:id with usage logs
// ===============================================================

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Package, Loader2, AlertTriangle, X, Plus, Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

// -- Types -----------------------------------------------------------

interface UsageLog {
  id: string;
  action: string;
  quantity: number;
  performedBy: string | null;
  notes: string | null;
  createdAt: string;
}

interface ConsumableRecord {
  id: string;
  name: string;
  type: string | null;
  manufacturer: string | null;
  description: string | null;
  stockUsed: number;
  stockTotal: number;
  stockMin: number;
  location: string | null;
  unitCost: number | null;
  usageLogs: UsageLog[];
  createdAt: string;
  updatedAt: string;
}

// -- Helpers ---------------------------------------------------------

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

const ACCENT = '#f97316';

const glassCard: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.12)',
  borderRadius: '0.75rem',
};

// -- Component -------------------------------------------------------

export default function ConsumableDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<'add' | 'use' | null>(null);
  const [modalQty, setModalQty] = useState(1);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['consumables', id],
    queryFn: async () => {
      const { data } = await api.get(`/consumables/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const stockMutation = useMutation({
    mutationFn: async ({ action, quantity }: { action: 'add' | 'use'; quantity: number }) => {
      const endpoint = action === 'add' ? 'add-stock' : 'use';
      const { data } = await api.post(`/consumables/${id}/${endpoint}`, { quantity });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumables', id] });
      queryClient.invalidateQueries({ queryKey: ['consumables'] });
      setModal(null);
      setModalQty(1);
      toast.success('Stock updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update stock');
    },
  });

  const item: ConsumableRecord | undefined = response?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
        <span className="ml-3 text-sm" style={{ color: '#64748b' }}>Loading consumable...</span>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle size={48} style={{ color: '#cbd5e1' }} />
        <p className="mt-4 text-sm font-medium" style={{ color: '#64748b' }}>Consumable not found</p>
        <button onClick={() => navigate('/inventory/consumables')} className="mt-3 text-sm font-medium" style={{ color: ACCENT }}>
          Back to Consumables
        </button>
      </div>
    );
  }

  const remaining = item.stockTotal - item.stockUsed;
  const isLow = remaining <= item.stockMin;
  const pct = item.stockTotal > 0 ? (remaining / item.stockTotal) * 100 : 0;

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#eef2ff', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* -- HERO ---------------------------------------------------- */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, #0F172A 0%, #1e293b 40%, ${hexToRgba(ACCENT, 0.3)} 100%)` }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${hexToRgba(ACCENT, 0.5)}, transparent)` }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.1 }} />
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" style={{ background: `radial-gradient(circle, ${hexToRgba(ACCENT, 0.4)} 0%, transparent 70%)` }} />

        <div className="relative px-6 py-6">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate('/inventory/consumables')} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
              <ArrowLeft size={14} /> Consumables
            </button>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span className="text-sm" style={{ color: hexToRgba(ACCENT, 0.8) }}>{item.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Package size={20} style={{ color: ACCENT }} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>{item.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {item.type && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: hexToRgba(ACCENT, 0.2), color: ACCENT, border: `1px solid ${hexToRgba(ACCENT, 0.3)}` }}>
                      {item.type}
                    </span>
                  )}
                  {item.manufacturer && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.manufacturer}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setModal('add'); setModalQty(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                style={{ background: '#059669' }}
              >
                <Plus size={14} /> Add Stock
              </button>
              <button
                onClick={() => { setModal('use'); setModalQty(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                style={{ background: '#dc2626' }}
              >
                <Minus size={14} /> Use Stock
              </button>
            </div>
          </div>

          {/* Stock bar */}
          <div className="mt-4 backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Stock Level</span>
              <span className="text-sm font-mono font-bold" style={{ color: isLow ? '#ef4444' : '#ffffff' }}>
                {remaining} / {item.stockTotal}
                {isLow && <AlertTriangle size={12} className="inline ml-1.5" style={{ color: '#ef4444' }} />}
              </span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, pct)}%`,
                  background: isLow ? 'linear-gradient(90deg, #ef4444, #f87171)' : `linear-gradient(90deg, ${ACCENT}, #fb923c)`,
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Min threshold: {item.stockMin}</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{Math.round(pct)}% remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* -- DETAILS CARD -------------------------------------------- */}
      <div className="rounded-xl p-6 mt-5" style={glassCard}>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#64748b' }}>Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Location</span>
            <p className="text-sm font-medium mt-0.5" style={{ color: '#0f172a' }}>{item.location || '--'}</p>
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Unit Cost</span>
            <p className="text-sm font-medium mt-0.5" style={{ color: '#0f172a' }}>{item.unitCost != null ? `$${item.unitCost.toLocaleString()}` : '--'}</p>
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Last Updated</span>
            <p className="text-sm font-medium mt-0.5" style={{ color: '#0f172a' }}>{formatDate(item.updatedAt)}</p>
          </div>
          {item.description && (
            <div className="md:col-span-3">
              <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Description</span>
              <p className="text-sm mt-0.5" style={{ color: '#334155' }}>{item.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* -- USAGE LOG ----------------------------------------------- */}
      <div className="rounded-xl overflow-hidden mt-4" style={glassCard}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
            Usage Log ({item.usageLogs?.length ?? 0})
          </h3>
        </div>
        {(!item.usageLogs || item.usageLogs.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package size={40} style={{ color: '#cbd5e1' }} />
            <p className="mt-3 text-sm" style={{ color: '#94a3b8' }}>No usage logs yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Date</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Action</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Quantity</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#64748b' }}>Performed By</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: '#64748b' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {item.usageLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: log.action === 'ADD' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: log.action === 'ADD' ? '#059669' : '#dc2626',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: '#0f172a' }}>{log.quantity}</td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell" style={{ color: '#64748b' }}>{log.performedBy || '--'}</td>
                    <td className="px-4 py-3 text-xs hidden lg:table-cell" style={{ color: '#94a3b8' }}>{log.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -- STOCK MODAL --------------------------------------------- */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold" style={{ color: '#0f172a' }}>
                {modal === 'add' ? 'Add Stock' : 'Use Stock'} -- {item.name}
              </h3>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg" style={{ color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: '#64748b' }}>
              Current stock: {remaining} / {item.stockTotal}
            </p>
            <div className="mb-4">
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Quantity</label>
              <input
                type="number"
                min={1}
                value={modalQty}
                onChange={(e) => setModalQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ background: '#f8fafc', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: '#f1f5f9', color: '#64748b' }}
              >
                Cancel
              </button>
              <button
                onClick={() => stockMutation.mutate({ action: modal, quantity: modalQty })}
                disabled={stockMutation.isPending}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: modal === 'add' ? '#059669' : '#dc2626' }}
              >
                {stockMutation.isPending ? 'Processing...' : modal === 'add' ? 'Add Stock' : 'Use Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
