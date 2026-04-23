// ═══════════════════════════════════════════════════════════
// Argus Service Desk — Reusable Inventory Category Page
// Handles single-type AND multi-type (combined) views
// ═══════════════════════════════════════════════════════════

import type React from 'react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, Loader2, Package, Activity, CheckCircle, Wrench,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../lib/api';
import { normalizeAssetResponse } from '../../hooks/useAssets';

// ── Types ──────────────────────────────────────────────────

interface InventoryCategoryPageProps {
  title: string;
  /** Single CI type — used when ciTypes is not provided */
  ciType?: string;
  /** Multiple CI types — enables type sub-filter column & dropdown */
  ciTypes?: { value: string; label: string }[];
  icon: React.ComponentType<any>;
  accentColor: string;
  description: string;
  /** Default type for creating new assets (falls back to ciType or first ciTypes entry) */
  createType?: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  hostname: string | null;
  ipAddress: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  owner: string | { id: string; firstName: string; lastName: string; email: string } | null;
  monitoringEnabled: boolean;
  updatedAt: string;
  assignedUser?: { firstName: string; lastName: string } | null;
}

// ── Helpers ────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function resolveOwner(asset: Asset): string {
  if (asset.assignedUser) {
    return `${asset.assignedUser.firstName} ${asset.assignedUser.lastName}`.trim() || 'N/A';
  }
  if (asset.owner && typeof asset.owner === 'object') {
    return `${(asset.owner as any).firstName ?? ''} ${(asset.owner as any).lastName ?? ''}`.trim() || 'N/A';
  }
  return (asset.owner as string) || 'N/A';
}

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  LIVE: { bg: 'rgba(16,185,129,0.15)', color: '#059669', dot: '#10B981' },
  MAINTENANCE: { bg: 'rgba(217,119,6,0.15)', color: '#D97706', dot: '#D97706' },
  DECOMMISSIONED: { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', dot: '#94a3b8' },
  PLANNED: { bg: 'rgba(99,102,241,0.08)', color: '#6366f1', dot: '#6366f1' },
  IN_STOCK: { bg: 'rgba(99,102,241,0.06)', color: '#6366f1', dot: '#818cf8' },
  DISPOSED: { bg: 'rgba(148,163,184,0.08)', color: '#94a3b8', dot: '#94a3b8' },
  RESERVED: { bg: 'rgba(124,58,237,0.1)', color: '#7c3aed', dot: '#7c3aed' },
};

// ── Component ──────────────────────────────────────────────

export default function InventoryCategoryPage({
  title,
  ciType,
  ciTypes,
  icon: Icon,
  accentColor,
  description,
  createType,
}: InventoryCategoryPageProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Determine whether this is multi-type mode
  const isMultiType = Array.isArray(ciTypes) && ciTypes.length > 0;
  const allTypes = isMultiType ? ciTypes!.map(t => t.value) : ciType ? [ciType] : [];
  const activeType = typeFilter !== 'ALL' ? typeFilter : null;
  const typeLabelMap = useMemo(() => {
    const m: Record<string, string> = {};
    if (isMultiType) ciTypes!.forEach(t => { m[t.value] = t.label; });
    return m;
  }, [isMultiType, ciTypes]);

  // Fetching: multi-type fetches all types in parallel, single-type uses one call
  const { data: response, isLoading } = useQuery({
    queryKey: ['inventory', allTypes, statusFilter, activeType, search, page],
    queryFn: async () => {
      const typesToFetch = activeType ? [activeType] : allTypes;

      if (typesToFetch.length === 1) {
        const params = new URLSearchParams({ type: typesToFetch[0], page: String(page), pageSize: String(pageSize) });
        if (statusFilter !== 'ALL') params.append('status', statusFilter);
        if (search.trim()) params.append('search', search.trim());
        const { data } = await api.get(`/assets/?${params}`);
        return normalizeAssetResponse(data);
      }

      // Multi-type: fetch each type and merge
      const results = await Promise.all(
        typesToFetch.map(async (t) => {
          const params = new URLSearchParams({ type: t, page: String(page), pageSize: String(pageSize) });
          if (statusFilter !== 'ALL') params.append('status', statusFilter);
          if (search.trim()) params.append('search', search.trim());
          const { data } = await api.get(`/assets/?${params}`);
          return normalizeAssetResponse(data);
        })
      );
      const merged = results.flatMap(r => Array.isArray(r?.data) ? r.data : []);
      const totalSum = results.reduce((s, r) => s + (r?.pagination?.total ?? 0), 0);
      const pagesMax = Math.max(...results.map(r => r?.pagination?.pages ?? 1));
      return { data: merged, pagination: { total: totalSum, pages: pagesMax, page } };
    },
    staleTime: 30000,
  });

  const assets: Asset[] = response?.data ?? [];
  const pagination = response?.pagination;
  const total = pagination?.total ?? assets.length;
  const totalPages = pagination?.pages ?? 1;

  const liveCount = assets.filter(a => a.status === 'LIVE').length;
  const monitoredCount = assets.filter(a => a.monitoringEnabled).length;
  const maintenanceCount = assets.filter(a => a.status === 'MAINTENANCE').length;

  const lighterAccent = hexToRgba(accentColor, 0.7);
  const defaultCreateType = createType || ciType || (isMultiType ? ciTypes![0].value : 'SERVER');

  // Table columns: add "Type" column in multi-type mode
  const columns = isMultiType
    ? ['Name', 'Type', 'Status', 'Hostname / IP', 'Location', 'Manufacturer / Model', 'Owner', 'Updated']
    : ['Name', 'Status', 'Hostname / IP', 'Location', 'Manufacturer / Model', 'Owner', 'Updated'];

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accentColor}, ${lighterAccent}, transparent)` }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" style={{ background: `radial-gradient(circle, ${hexToRgba(accentColor, 0.4)} 0%, transparent 70%)` }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-[60px] translate-y-1/2 translate-x-1/4 pointer-events-none" style={{ background: `radial-gradient(circle, ${hexToRgba(accentColor, 0.25)} 0%, transparent 70%)` }} />

        <div className="relative px-6 py-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span>CMDB</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{title}</span>
              </div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Icon size={18} style={{ color: accentColor }} />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>{title}</h1>
              </div>
              <p className="text-sm ml-12" style={{ color: 'rgba(255,255,255,0.6)' }}>{description}</p>
            </div>
            <button
              onClick={() => navigate(`/assets/create?type=${defaultCreateType}`)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}
            >
              <Plus size={15} /> New Asset
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
              ))
            ) : (
              [
                { label: 'Total', value: total, icon: Package, color: accentColor },
                { label: 'Live', value: liveCount, icon: Activity, color: '#10B981' },
                { label: 'Monitored', value: monitoredCount, icon: CheckCircle, color: accentColor },
                { label: 'Maintenance', value: maintenanceCount, icon: Wrench, color: '#D97706' },
              ].map(s => (
                <div key={s.label} className="backdrop-blur-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon size={13} style={{ color: s.color }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                  </div>
                  <div className="text-3xl font-display font-bold" style={{ color: '#ffffff' }}>{s.value}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── FILTERS ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-5 mb-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
            style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' } as React.CSSProperties}
          />
        </div>
        {/* Type sub-filter — only in multi-type mode */}
        {isMultiType && (
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl text-sm focus:outline-none"
            style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
          >
            <option value="ALL">All Types</option>
            {ciTypes!.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none"
          style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="LIVE">Live</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="DECOMMISSIONED">Decommissioned</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="RESERVED">Reserved</option>
        </select>
      </div>

      {/* ── TABLE ──────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
            <span className="ml-3 text-sm" style={{ color: '#64748b' }}>Loading {title.toLowerCase()}...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Icon size={48} style={{ color: '#cbd5e1' }} />
            <p className="mt-4 text-sm font-medium" style={{ color: '#64748b' }}>No {title.toLowerCase()} found</p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Try adjusting your filters or create a new item</p>
            <button
              onClick={() => navigate(`/assets/create?type=${defaultCreateType}`)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: accentColor }}
            >
              <Plus size={15} /> New Asset
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                    {columns.map(h => (
                      <th
                        key={h}
                        className={`text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider ${
                          ['Location', 'Manufacturer / Model'].includes(h) ? 'hidden lg:table-cell' :
                          h === 'Hostname / IP' ? 'hidden md:table-cell' :
                          h === 'Owner' ? 'hidden xl:table-cell' : ''
                        }`}
                        style={{ color: '#64748b' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const s = STATUS_STYLES[asset.status] || STATUS_STYLES.PLANNED;
                    const ownerName = resolveOwner(asset);
                    return (
                      <tr
                        key={asset.id}
                        onClick={() => navigate(`/assets/${asset.id}`)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.03)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Icon size={16} style={{ color: accentColor }} />
                            <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{asset.name}</span>
                          </div>
                        </td>
                        {isMultiType && (
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ background: `${accentColor}10`, color: accentColor }}>
                              {typeLabelMap[asset.type] || asset.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded-md"
                            style={{ background: s.bg, color: s.color, border: `1px solid ${hexToRgba(s.color, 0.3)}` }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs font-mono" style={{ color: '#64748b' }}>
                            {asset.hostname || asset.ipAddress || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs" style={{ color: '#64748b' }}>{asset.location || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs" style={{ color: '#64748b' }}>
                            {[asset.manufacturer, asset.model].filter(Boolean).join(' / ') || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-xs" style={{ color: '#64748b' }}>{ownerName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{formatDate(asset.updatedAt)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                <span className="text-xs" style={{ color: '#64748b' }}>
                  Page {page} of {totalPages} ({total} items)
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ border: '1px solid rgba(99,102,241,0.12)' }}>
                    <ChevronLeft size={16} style={{ color: '#64748b' }} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ border: '1px solid rgba(99,102,241,0.12)' }}>
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
