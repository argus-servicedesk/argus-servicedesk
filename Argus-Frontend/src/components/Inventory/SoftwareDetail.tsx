// ===============================================================
// Argus Service Desk -- Software Detail Page
// Fetches from /api/v1/software/:id with versions, licenses, installations
// ===============================================================

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Package, Loader2, ExternalLink, Globe,
  Key, Monitor, Calendar, CheckCircle, AlertTriangle, X, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

// -- Types -----------------------------------------------------------

interface SoftwareVersion {
  id: string;
  version: string;
  arch: string | null;
  releaseDate: string | null;
  endOfSupport: string | null;
}

interface SoftwareLicense {
  id: string;
  name: string;
  type: string;
  status: string;
  quantity: number;
  usedCount: number;
  expiryDate: string | null;
  cost: number | null;
}

interface SoftwareInstallation {
  id: string;
  asset: { id: string; name: string } | null;
  assetName?: string;
  version: string | null;
  installDate: string | null;
  uninstallDate: string | null;
  status: string;
}

interface SoftwareRecord {
  id: string;
  name: string;
  publisher: string | null;
  category: string | null;
  description: string | null;
  website: string | null;
  isOpenSource: boolean;
  versions: SoftwareVersion[];
  licenses: SoftwareLicense[];
  installations: SoftwareInstallation[];
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
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ACCENT = '#10b981';

type TabKey = 'overview' | 'licenses' | 'installations';

const glassCard: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(99,102,241,0.12)',
  borderRadius: '0.75rem',
};

// -- Component -------------------------------------------------------

export default function SoftwareDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('overview');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseForm, setLicenseForm] = useState({ name: '', type: 'COMMERCIAL', quantity: 1, cost: 0, expiryDate: '' });

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['software', id],
    queryFn: async () => {
      const { data } = await api.get(`/software/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const addLicenseMutation = useMutation({
    mutationFn: async (payload: typeof licenseForm) => {
      const { data } = await api.post(`/software/${id}/licenses`, {
        ...payload,
        quantity: Number(payload.quantity),
        cost: Number(payload.cost) || 0,
        expiryDate: payload.expiryDate || null,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software', id] });
      setShowLicenseModal(false);
      setLicenseForm({ name: '', type: 'COMMERCIAL', quantity: 1, cost: 0, expiryDate: '' });
      toast.success('License added');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to add license');
    },
  });

  const sw: SoftwareRecord | undefined = response?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
        <span className="ml-3 text-sm" style={{ color: '#64748b' }}>Loading software...</span>
      </div>
    );
  }

  if (isError || !sw) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle size={48} style={{ color: '#cbd5e1' }} />
        <p className="mt-4 text-sm font-medium" style={{ color: '#64748b' }}>Software not found</p>
        <button onClick={() => navigate('/inventory/software')} className="mt-3 text-sm font-medium" style={{ color: ACCENT }}>
          Back to Software
        </button>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'licenses', label: 'Licenses', count: sw.licenses?.length ?? 0 },
    { key: 'installations', label: 'Installations', count: sw.installations?.length ?? 0 },
  ];

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#eef2ff', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* -- HERO ---------------------------------------------------- */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, #0F172A 0%, #1e293b 40%, ${hexToRgba(ACCENT, 0.3)} 100%)` }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${hexToRgba(ACCENT, 0.5)}, transparent)` }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.1 }} />
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" style={{ background: `radial-gradient(circle, ${hexToRgba(ACCENT, 0.4)} 0%, transparent 70%)` }} />

        <div className="relative px-6 py-6">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate('/inventory/software')} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
              <ArrowLeft size={14} /> Software
            </button>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span className="text-sm" style={{ color: hexToRgba(ACCENT, 0.8) }}>{sw.name}</span>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Package size={20} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ffffff' }}>{sw.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                {sw.publisher && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{sw.publisher}</span>}
                {sw.category && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: hexToRgba(ACCENT, 0.2), color: ACCENT, border: `1px solid ${hexToRgba(ACCENT, 0.3)}` }}>
                    {sw.category}
                  </span>
                )}
                {sw.isOpenSource && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                    Open Source
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -- TABS ----------------------------------------------------- */}
      <div className="flex items-center gap-1 mt-5 mb-4 px-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? ACCENT : 'transparent',
              color: tab === t.key ? '#ffffff' : '#64748b',
              border: tab === t.key ? 'none' : '1px solid transparent',
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.1)', color: tab === t.key ? '#ffffff' : '#94a3b8' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* -- OVERVIEW TAB --------------------------------------------- */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Info card */}
          <div className="rounded-xl p-6" style={glassCard}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#64748b' }}>Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Name</span>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#0f172a' }}>{sw.name}</p>
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Publisher</span>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#0f172a' }}>{sw.publisher || '--'}</p>
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Category</span>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#0f172a' }}>{sw.category || '--'}</p>
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Open Source</span>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#0f172a' }}>{sw.isOpenSource ? 'Yes' : 'No'}</p>
              </div>
              {sw.website && (
                <div className="md:col-span-2">
                  <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Website</span>
                  <p className="text-sm font-medium mt-0.5">
                    <a href={sw.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ color: ACCENT }}>
                      <Globe size={13} /> {sw.website} <ExternalLink size={11} />
                    </a>
                  </p>
                </div>
              )}
              {sw.description && (
                <div className="md:col-span-2">
                  <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Description</span>
                  <p className="text-sm mt-0.5" style={{ color: '#334155' }}>{sw.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Versions card */}
          <div className="rounded-xl p-6" style={glassCard}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#64748b' }}>
              Versions ({sw.versions?.length ?? 0})
            </h3>
            {(!sw.versions || sw.versions.length === 0) ? (
              <p className="text-sm" style={{ color: '#94a3b8' }}>No versions recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                      <th className="text-left px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Version</th>
                      <th className="text-left px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Architecture</th>
                      <th className="text-left px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Release Date</th>
                      <th className="text-left px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>End of Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sw.versions.map(v => (
                      <tr key={v.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                        <td className="px-3 py-2 text-sm font-mono font-medium" style={{ color: '#0f172a' }}>{v.version}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: '#64748b' }}>{v.arch || '--'}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: '#64748b' }}>{formatDate(v.releaseDate)}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: v.endOfSupport && new Date(v.endOfSupport) < new Date() ? '#ef4444' : '#64748b' }}>
                          {formatDate(v.endOfSupport)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- LICENSES TAB --------------------------------------------- */}
      {tab === 'licenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Licenses</h3>
            <button
              onClick={() => setShowLicenseModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: ACCENT }}
            >
              <Plus size={14} /> Add License
            </button>
          </div>

          <div className="rounded-xl overflow-hidden" style={glassCard}>
            {(!sw.licenses || sw.licenses.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Key size={40} style={{ color: '#cbd5e1' }} />
                <p className="mt-3 text-sm" style={{ color: '#94a3b8' }}>No licenses found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                      <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Name</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Type</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Status</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Qty</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Used</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#64748b' }}>Expiry</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#64748b' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sw.licenses.map(lic => {
                      const isExpired = lic.expiryDate && new Date(lic.expiryDate) < new Date();
                      const statusColor = lic.status === 'ACTIVE' ? '#059669' : lic.status === 'EXPIRED' ? '#ef4444' : '#94a3b8';
                      return (
                        <tr key={lic.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: '#0f172a' }}>{lic.name}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>{lic.type}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold" style={{ color: statusColor }}>{lic.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: '#64748b' }}>{lic.quantity}</td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: lic.usedCount >= lic.quantity ? '#ef4444' : '#64748b' }}>{lic.usedCount}</td>
                          <td className="px-4 py-3 text-xs hidden md:table-cell" style={{ color: isExpired ? '#ef4444' : '#64748b' }}>{formatDate(lic.expiryDate)}</td>
                          <td className="px-4 py-3 text-xs font-mono hidden md:table-cell" style={{ color: '#64748b' }}>{lic.cost != null ? `$${lic.cost.toLocaleString()}` : '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- INSTALLATIONS TAB ---------------------------------------- */}
      {tab === 'installations' && (
        <div className="rounded-xl overflow-hidden" style={glassCard}>
          {(!sw.installations || sw.installations.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Monitor size={40} style={{ color: '#cbd5e1' }} />
              <p className="mt-3 text-sm" style={{ color: '#94a3b8' }}>No installations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Asset</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Version</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Install Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#64748b' }}>Uninstall Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sw.installations.map(inst => {
                    const statusColor = inst.status === 'INSTALLED' ? '#059669' : inst.status === 'UNINSTALLED' ? '#94a3b8' : '#d97706';
                    return (
                      <tr key={inst.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: '#0f172a' }}>{inst.asset?.name || inst.assetName || '--'}</td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: '#64748b' }}>{inst.version || '--'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>{formatDate(inst.installDate)}</td>
                        <td className="px-4 py-3 text-xs hidden md:table-cell" style={{ color: '#64748b' }}>{formatDate(inst.uninstallDate)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold" style={{ color: statusColor }}>{inst.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -- LICENSE MODAL --------------------------------------------- */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold" style={{ color: '#0f172a' }}>Add License</h3>
              <button onClick={() => setShowLicenseModal(false)} className="p-1 rounded-lg" style={{ color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Name</label>
                <input
                  type="text"
                  value={licenseForm.name}
                  onChange={e => setLicenseForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ background: '#f8fafc', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
                  placeholder="License name"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Type</label>
                <select
                  value={licenseForm.type}
                  onChange={e => setLicenseForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ background: '#f8fafc', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
                >
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="OPEN_SOURCE">Open Source</option>
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="TRIAL">Trial</option>
                  <option value="FREEWARE">Freeware</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={licenseForm.quantity}
                    onChange={e => setLicenseForm(f => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ background: '#f8fafc', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Cost ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={licenseForm.cost}
                    onChange={e => setLicenseForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ background: '#f8fafc', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Expiry Date</label>
                <input
                  type="date"
                  value={licenseForm.expiryDate}
                  onChange={e => setLicenseForm(f => ({ ...f, expiryDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ background: '#f8fafc', border: '1px solid rgba(99,102,241,0.12)', color: '#0f172a' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setShowLicenseModal(false)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: '#f1f5f9', color: '#64748b' }}
              >
                Cancel
              </button>
              <button
                onClick={() => addLicenseMutation.mutate(licenseForm)}
                disabled={!licenseForm.name || addLicenseMutation.isPending}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: ACCENT }}
              >
                {addLicenseMutation.isPending ? 'Adding...' : 'Add License'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
