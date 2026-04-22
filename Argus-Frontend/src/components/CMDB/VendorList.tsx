import { useState } from 'react';
import {
  Building2, Search, Plus, Pencil, Trash2, Loader2, X, Save,
  Phone, Mail, FileText, CheckCircle, XCircle, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '../../hooks/useCMDB';

// ─── Styles ─────────────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(5,150,105,0.12)',
  borderRadius: '0.75rem',
};

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(5,150,105,0.15)',
  color: '#0f172a',
  borderRadius: '0.75rem',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function VendorModal({ vendor, onClose }: { vendor?: any; onClose: () => void }) {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const isEdit = !!vendor;

  const [form, setForm] = useState({
    name: vendor?.name || '',
    contactPerson: vendor?.contactPerson || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    address: vendor?.address || '',
    website: vendor?.website || '',
    contractNumber: vendor?.contractNumber || '',
    amcStartDate: vendor?.amcStartDate ? vendor.amcStartDate.slice(0, 10) : '',
    amcEndDate: vendor?.amcEndDate ? vendor.amcEndDate.slice(0, 10) : '',
    isActive: vendor?.isActive ?? true,
    notes: vendor?.notes || '',
  });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vendor name is required'); return; }
    try {
      const payload: Record<string, unknown> = { ...form };
      if (payload.amcStartDate === '') delete payload.amcStartDate;
      if (payload.amcEndDate === '') delete payload.amcEndDate;
      if (isEdit) {
        await updateVendor.mutateAsync({ id: vendor.id, data: payload });
        toast.success('Vendor updated');
      } else {
        await createVendor.mutateAsync(payload);
        toast.success('Vendor created');
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Operation failed');
    }
  };

  const isPending = createVendor.isPending || updateVendor.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="w-full max-w-lg p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto" style={{ ...glassCard, borderColor: 'rgba(5,150,105,0.18)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: '#0f172a' }}>{isEdit ? 'Edit Vendor' : 'Add Vendor'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: '#64748b' }}><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Vendor name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Contact Person</label>
              <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} type="email" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inputStyle} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Contract #</label>
              <input value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>AMC Start</label>
              <input type="date" value={form.amcStartDate} onChange={(e) => setForm({ ...form, amcStartDate: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>AMC End</label>
              <input type="date" value={form.amcEndDate} onChange={(e) => setForm({ ...form, amcEndDate: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} id="vendor-active" className="rounded" />
            <label htmlFor="vendor-active" className="text-sm" style={{ color: '#64748b' }}>Active</label>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ color: '#64748b', border: '1px solid rgba(5,150,105,0.15)' }}>Cancel</button>
          <button onClick={handleSave} disabled={isPending || !form.name.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function VendorList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);

  const { data: vendorData, isLoading } = useVendors({ search, isActive: statusFilter || undefined, page, pageSize: 20 });
  const deleteVendor = useDeleteVendor();

  const vendors = vendorData?.data || [];
  const pagination = vendorData?.pagination;

  const stats = {
    total: pagination?.total || vendors.length,
    active: vendors.filter((v: any) => v.isActive).length,
    withAmc: vendors.filter((v: any) => v.amcEndDate).length,
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete vendor "${name}"?`)) return;
    try {
      await deleteVendor.mutateAsync(id);
      toast.success('Vendor deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="animate-fade-in space-y-0" style={{ background: '#F8FAFC' }}>
      {/* ── HERO ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* dot-grid texture */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* ambient glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" style={{ background: 'rgba(5,150,105,0.25)', filter: 'blur(70px)' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(16,185,129,0.2)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full -translate-x-1/4 pointer-events-none" style={{ background: 'rgba(5,150,105,0.15)', filter: 'blur(80px)' }} />
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.2)', border: '1px solid rgba(5,150,105,0.3)' }}>
                  <Building2 size={20} style={{ color: '#A7F3D0' }} />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold tracking-tight" style={{ color: '#ffffff' }}>Vendor Management</h1>
                  <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Manage suppliers, contracts, and AMC records</p>
                </div>
              </div>
            </div>
            <button onClick={() => { setEditVendor(null); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Plus size={16} /> Add Vendor
            </button>
          </div>
        </div>
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #059669, #34D399, #A7F3D0, transparent)' }} />
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Vendors', value: stats.total, icon: Building2, color: '#059669' },
          { label: 'Active', value: stats.active, icon: CheckCircle, color: '#10b981' },
          { label: 'With AMC', value: stats.withAmc, icon: FileText, color: '#0d9488' },
        ].map((s) => (
          <div key={s.label} style={glassCard} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={14} style={{ color: s.color }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>{s.label}</span>
            </div>
            <p className="text-2xl font-display font-bold" style={{ color: '#0f172a' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search vendors..."
            className="pl-9 pr-3 py-2 text-sm rounded-xl w-full"
            style={inputStyle}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm rounded-xl px-3 py-2"
          style={inputStyle}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div style={glassCard} className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <Loader2 size={28} style={{ color: '#059669' }} className="animate-spin" />
            <p className="text-xs" style={{ color: '#94a3b8' }}>Loading vendors...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={32} style={{ color: '#94a3b8' }} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: '#94a3b8' }}>No vendors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(5,150,105,0.12)' }}>
                  {['Name', 'Contact', 'Email', 'Phone', 'Contract #', 'AMC End', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map((v: any) => (
                  <tr
                    key={v.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(5,150,105,0.06)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(5,150,105,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} style={{ color: '#059669' }} />
                        <span className="font-medium" style={{ color: '#0f172a' }}>{v.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4" style={{ color: '#64748b' }}>
                      <div className="flex items-center gap-1.5">
                        <Users size={12} style={{ color: '#94a3b8' }} />
                        {v.contactPerson || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4" style={{ color: '#64748b' }}>
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} style={{ color: '#94a3b8' }} />
                        {v.email || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4" style={{ color: '#64748b' }}>
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} style={{ color: '#94a3b8' }} />
                        {v.phone || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs" style={{ color: '#64748b' }}>{v.contractNumber || '-'}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#64748b' }}>{v.amcEndDate ? formatDate(v.amcEndDate) : '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={v.isActive
                          ? { background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }
                          : { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.25)' }
                        }
                      >
                        {v.isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {v.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditVendor(v); setShowModal(true); }}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#64748b' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(5,150,105,0.1)'; e.currentTarget.style.color = '#059669'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id, v.name)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#64748b' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#DC2626'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(5,150,105,0.08)' }}>
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-xs rounded-lg transition-colors disabled:opacity-40" style={{ color: '#059669', border: '1px solid rgba(5,150,105,0.15)' }}>Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-xs rounded-lg transition-colors disabled:opacity-40" style={{ color: '#059669', border: '1px solid rgba(5,150,105,0.15)' }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && <VendorModal vendor={editVendor} onClose={() => setShowModal(false)} />}
    </div>
  );
}
