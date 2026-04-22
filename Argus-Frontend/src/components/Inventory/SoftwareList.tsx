// ═══════════════════════════════════════════════════════════
// Argus Service Desk — Software Inventory Page
// Fetches from /api/v1/software with license statistics
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package, Search, Loader2, ChevronLeft, ChevronRight,
  Key, CheckCircle, AlertTriangle, Plus,
} from 'lucide-react';
import api from '../../lib/api';

interface Software {
  id: string;
  name: string;
  publisher: string | null;
  category: string | null;
  versionsCount?: number;
  installationsCount?: number;
  licensesCount?: number;
  updatedAt: string;
}

interface LicenseStats {
  totalSoftware: number;
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const ACCENT = '#0891B2';

export default function SoftwareList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['software', 'license-stats'],
    queryFn: async () => {
      const { data } = await api.get('/software/license-stats');
      return data;
    },
    staleTime: 60000,
  });

  const { data: listResponse, isLoading: listLoading } = useQuery({
    queryKey: ['software', 'list', { search, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (search.trim()) params.append('search', search.trim());
      const { data } = await api.get(`/software?${params}`);
      return data;
    },
    staleTime: 30000,
  });

  const stats: LicenseStats | undefined = statsResponse?.data;
  const software: Software[] = listResponse?.data ?? [];
  const pagination = listResponse?.pagination;
  const totalPages = pagination?.pages ?? 1;
  const total = pagination?.total ?? software.length;

  const isLoading = statsLoading || listLoading;

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
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Software</span>
              </div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Package size={18} style={{ color: ACCENT }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Software Assets</h1>
              </div>
              <p className="text-sm ml-12" style={{ color: 'rgba(255,255,255,0.6)' }}>Software catalog, versions, installations, and license management</p>
            </div>
            <button
              onClick={() => navigate('/inventory/software/create')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all self-start"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #34d399)` }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <Plus size={16} />
              Create Software
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
              ))
            ) : (
              <>
                <div className="backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={13} style={{ color: ACCENT }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Software</span>
                  </div>
                  <div className="text-3xl font-display font-bold" style={{ color: '#ffffff' }}>{stats?.totalSoftware ?? total}</div>
                </div>
                <div className="backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Key size={13} style={{ color: '#6366f1' }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Licenses</span>
                  </div>
                  <div className="text-3xl font-display font-bold" style={{ color: '#ffffff' }}>{stats?.totalLicenses ?? 0}</div>
                </div>
                <div className="backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={13} style={{ color: '#10B981' }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Active Licenses</span>
                  </div>
                  <div className="text-3xl font-display font-bold" style={{ color: '#ffffff' }}>{stats?.activeLicenses ?? 0}</div>
                </div>
                <div className="backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Expired Licenses</span>
                  </div>
                  <div className="text-3xl font-display font-bold" style={{ color: (stats?.expiredLicenses ?? 0) > 0 ? '#f59e0b' : '#ffffff' }}>{stats?.expiredLicenses ?? 0}</div>
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
            placeholder="Search software..."
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
            <span className="ml-3 text-sm" style={{ color: '#64748b' }}>Loading software...</span>
          </div>
        ) : software.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} style={{ color: '#cbd5e1' }} />
            <p className="mt-4 text-sm font-medium" style={{ color: '#64748b' }}>No software found</p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Try adjusting your search</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Name</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Publisher</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#64748b' }}>Category</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: '#64748b' }}>Versions</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: '#64748b' }}>Installations</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Licenses</th>
                  </tr>
                </thead>
                <tbody>
                  {software.map((sw) => (
                    <tr
                      key={sw.id}
                      onClick={() => navigate('/inventory/software/' + sw.id)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.03)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Package size={16} style={{ color: ACCENT }} />
                          <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{sw.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: '#64748b' }}>{sw.publisher || '--'}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs" style={{ color: '#64748b' }}>{sw.category || '--'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-mono" style={{ color: '#64748b' }}>{sw.versionsCount ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-mono" style={{ color: '#64748b' }}>{sw.installationsCount ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono" style={{ color: '#64748b' }}>{sw.licensesCount ?? 0}</span>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
