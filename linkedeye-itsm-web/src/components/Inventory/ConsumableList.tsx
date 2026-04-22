// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Consumables Inventory Page
// Fetches from /api/v1/consumables with stock management
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Search, Loader2, ChevronLeft, ChevronRight,
  AlertTriangle, DollarSign, Plus, Minus, X,
} from 'lucide-react';
import api from '../../lib/api';

interface Consumable {
  id: string;
  name: string;
  type: string | null;
  manufacturer: string | null;
  stockUsed: number;
  stockTotal: number;
  stockMin: number;
  location: string | null;
  updatedAt: string;
}

interface ConsumableStats {
  totalItems: number;
  lowStockAlerts: number;
  totalValue: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const ACCENT = '#059669';

export default function ConsumableList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modal state
  const [modal, setModal] = useState<{ type: 'add' | 'use'; item: Consumable } | null>(null);
  const [modalQty, setModalQty] = useState(1);

  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['consumables', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/consumables/stats');
      return data;
    },
    staleTime: 60000,
  });

  const { data: listResponse, isLoading: listLoading } = useQuery({
    queryKey: ['consumables', 'list', { search, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (search.trim()) params.append('search', search.trim());
      const { data } = await api.get(`/consumables?${params}`);
      return data;
    },
    staleTime: 30000,
  });

  const stockMutation = useMutation({
    mutationFn: async ({ id, action, quantity }: { id: string; action: 'add' | 'use'; quantity: number }) => {
      const endpoint = action === 'add' ? 'add-stock' : 'use';
      const { data } = await api.post(`/consumables/${id}/${endpoint}`, { quantity });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumables'] });
      setModal(null);
      setModalQty(1);
    },
  });

  const stats: ConsumableStats | undefined = statsResponse?.data;
  const consumables: Consumable[] = listResponse?.data ?? [];
  const pagination = listResponse?.pagination;
  const totalPages = pagination?.pages ?? 1;
  const total = pagination?.total ?? consumables.length;

  const isLoading = statsLoading || listLoading;

  function handleStockAction() {
    if (!modal) return;
    stockMutation.mutate({ id: modal.item.id, action: modal.type, quantity: modalQty });
  }

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${hexToRgba(ACCENT, 0.5)}, transparent)` }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" style={{ background: `radial-gradient(circle, ${hexToRgba(ACCENT, 0.4)} 0%, transparent 70%)` }} />

        <div className="relative px-6 py-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span>INVENTORY</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Consumables</span>
              </div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Package size={18} style={{ color: ACCENT }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Consumables</h1>
              </div>
              <p className="text-sm ml-12" style={{ color: 'rgba(255,255,255,0.6)' }}>Toner, cartridges, cables, and other consumable inventory items</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
              ))
            ) : (
              <>
                <div className="backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={13} style={{ color: ACCENT }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Items</span>
                  </div>
                  <div className="text-3xl font-display font-bold" style={{ color: '#ffffff' }}>{stats?.totalItems ?? total}</div>
                </div>
                <div className="backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={13} style={{ color: (stats?.lowStockAlerts ?? 0) > 0 ? '#f59e0b' : 'rgba(255,255,255,0.5)' }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Low Stock Alerts</span>
                  </div>
                  <div className="text-3xl font-display font-bold" style={{ color: (stats?.lowStockAlerts ?? 0) > 0 ? '#f59e0b' : '#ffffff' }}>{stats?.lowStockAlerts ?? 0}</div>
                </div>
                <div className="backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={13} style={{ color: '#10B981' }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Value</span>
                  </div>
                  <div className="text-3xl font-display font-bold" style={{ color: '#ffffff' }}>
                    ${(stats?.totalValue ?? 0).toLocaleString()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── FILTERS ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-5 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search consumables..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
            style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
          />
        </div>
      </div>

      {/* ── TABLE ──────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
        {listLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
            <span className="ml-3 text-sm" style={{ color: '#64748b' }}>Loading consumables...</span>
          </div>
        ) : consumables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} style={{ color: '#cbd5e1' }} />
            <p className="mt-4 text-sm font-medium" style={{ color: '#64748b' }}>No consumables found</p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Try adjusting your search</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Name</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Type</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#64748b' }}>Manufacturer</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Stock</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: '#64748b' }}>Min Threshold</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: '#64748b' }}>Location</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consumables.map((item) => {
                    const remaining = item.stockTotal - item.stockUsed;
                    const isLow = remaining <= item.stockMin;
                    const pct = item.stockTotal > 0 ? (remaining / item.stockTotal) * 100 : 0;
                    return (
                      <tr
                        key={item.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.03)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Package size={16} style={{ color: ACCENT }} />
                            <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: '#64748b' }}>{item.type || '--'}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs" style={{ color: '#64748b' }}>{item.manufacturer || '--'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: isLow ? '#ef4444' : '#10b981' }}
                              />
                            </div>
                            <span className="text-xs font-mono" style={{ color: isLow ? '#ef4444' : '#64748b' }}>
                              {remaining}/{item.stockTotal}
                            </span>
                            {isLow && <AlertTriangle size={12} style={{ color: '#ef4444' }} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs font-mono" style={{ color: '#64748b' }}>{item.stockMin}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs" style={{ color: '#64748b' }}>{item.location || '--'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => { setModal({ type: 'add', item }); setModalQty(1); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors"
                              style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}
                            >
                              <Plus size={10} /> Add
                            </button>
                            <button
                              onClick={() => { setModal({ type: 'use', item }); setModalQty(1); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                              <Minus size={10} /> Use
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                <span className="text-xs" style={{ color: '#64748b' }}>Page {page} of {totalPages} ({total} items)</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ border: '1px solid rgba(99,102,241,0.12)' }}>
                    <ChevronLeft size={16} style={{ color: '#64748b' }} />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ border: '1px solid rgba(99,102,241,0.12)' }}>
                    <ChevronRight size={16} style={{ color: '#64748b' }} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Stock Modal ──────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold" style={{ color: '#0f172a' }}>
                {modal.type === 'add' ? 'Add Stock' : 'Use Stock'} — {modal.item.name}
              </h3>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg" style={{ color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: '#64748b' }}>
              Current stock: {modal.item.stockTotal - modal.item.stockUsed} / {modal.item.stockTotal}
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
                onClick={handleStockAction}
                disabled={stockMutation.isPending}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: modal.type === 'add' ? '#059669' : '#dc2626' }}
              >
                {stockMutation.isPending ? 'Processing...' : modal.type === 'add' ? 'Add Stock' : 'Use Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
