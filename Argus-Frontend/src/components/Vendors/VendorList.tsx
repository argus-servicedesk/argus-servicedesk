import { useState } from 'react';
import { Building2, Plus, Search, Mail, Phone, Globe, Loader2, X, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '../../hooks/useVendors';
import { useAuth } from '../../hooks/useAuth';

interface Vendor {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contractNumber: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: string;
}

interface VendorForm {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  contractNumber?: string;
  website?: string;
}

export default function VendorList() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const { canManage } = useAuth();
  const canModify = canManage('vendors');

  const { data, isLoading } = useVendors({ search: search || undefined });
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const vendors: Vendor[] = data?.data || [];
  const total = data?.pagination?.total ?? vendors.length;
  const activeCount = vendors.filter(v => v.isActive).length;

  const form = useForm<VendorForm>();

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', contactPerson: '', email: '', phone: '', address: '', contractNumber: '', website: '' });
    setShowModal(true);
  };

  const openEdit = (v: Vendor) => {
    setEditing(v);
    form.reset({
      name: v.name,
      contactPerson: v.contactPerson || '',
      email: v.email || '',
      phone: v.phone || '',
      address: v.address || '',
      contractNumber: v.contractNumber || '',
      website: v.website || '',
    });
    setShowModal(true);
  };

  const onSubmit = async (values: VendorForm) => {
    try {
      if (editing) {
        await updateVendor.mutateAsync({ id: editing.id, data: values as unknown as Record<string, unknown> });
        toast.success('Vendor updated');
      } else {
        await createVendor.mutateAsync(values as unknown as Record<string, unknown>);
        toast.success('Vendor created');
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save vendor');
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this vendor?')) return;
    try {
      await deleteVendor.mutateAsync(id);
      toast.success('Vendor deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="animate-fade-in" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mx-4 mt-4 mb-4" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #4F46E5, #818CF8, #A5B4FC, transparent)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.15 }} />
        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.20)' }}>
                <Building2 size={20} style={{ color: '#A5B4FC' }} />
              </div>
              <div>
                <h1 className="text-[22px] font-bold tracking-tight" style={{ color: '#ffffff' }}>Vendor Management</h1>
                <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Manage IT vendors, contracts, and supplier information</p>
              </div>
            </div>
            {canModify && (
              <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)' }}>
                <Plus size={16} /> New Vendor
              </button>
            )}
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Vendors</div>
              <div className="text-2xl font-bold mt-1" style={{ color: '#fff' }}>{total}</div>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.25)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(110,231,183,0.8)' }}>Active</div>
              <div className="text-2xl font-bold mt-1" style={{ color: '#6EE7B7' }}>{activeCount}</div>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.25)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(252,211,77,0.8)' }}>Inactive</div>
              <div className="text-2xl font-bold mt-1" style={{ color: '#FCD34D' }}>{total - activeCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg outline-none"
            style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Vendor list */}
      <div className="px-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#6366f1' }} /></div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Building2 size={28} style={{ color: '#6366f1' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0f172a' }}>No Vendors Yet</h3>
            <p className="text-sm mb-4 max-w-md" style={{ color: '#64748b' }}>Add your first vendor to start tracking IT suppliers, contracts, and service providers.</p>
            {canModify && (
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6366f1' }}>
                <Plus size={16} /> Add First Vendor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map(v => (
              <div key={v.id} className="rounded-xl p-4 transition-all hover:shadow-md" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <Building2 size={18} style={{ color: '#6366f1' }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: '#0f172a' }}>{v.name}</h3>
                      {v.contactPerson && <p className="text-[11px]" style={{ color: '#94a3b8' }}>{v.contactPerson}</p>}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={v.isActive ? { background: 'rgba(5,150,105,0.12)', color: '#059669' } : { background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }}>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-1.5 text-[12px]" style={{ color: '#64748b' }}>
                  {v.email && <div className="flex items-center gap-2"><Mail size={12} /> {v.email}</div>}
                  {v.phone && <div className="flex items-center gap-2"><Phone size={12} /> {v.phone}</div>}
                  {v.website && <div className="flex items-center gap-2"><Globe size={12} /> {v.website}</div>}
                  {v.contractNumber && <div className="text-[10px] mt-1 font-mono" style={{ color: '#94a3b8' }}>Contract: {v.contractNumber}</div>}
                </div>
                {canModify && (
                  <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={() => openEdit(v)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[11px] font-semibold" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={() => onDelete(v.id)} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded text-[11px] font-semibold" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl w-full max-w-lg" style={{ background: '#ffffff' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>{editing ? 'Edit Vendor' : 'New Vendor'}</h2>
              <button onClick={() => setShowModal(false)}><X size={18} style={{ color: '#94a3b8' }} /></button>
            </div>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>Vendor Name *</label>
                <input {...form.register('name', { required: true })} className="w-full px-3 py-2 rounded-lg outline-none text-sm" style={{ border: '1px solid #e2e8f0' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>Contact Person</label>
                  <input {...form.register('contactPerson')} className="w-full px-3 py-2 rounded-lg outline-none text-sm" style={{ border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>Contract Number</label>
                  <input {...form.register('contractNumber')} className="w-full px-3 py-2 rounded-lg outline-none text-sm" style={{ border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>Email</label>
                  <input type="email" {...form.register('email')} className="w-full px-3 py-2 rounded-lg outline-none text-sm" style={{ border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>Phone</label>
                  <input {...form.register('phone')} className="w-full px-3 py-2 rounded-lg outline-none text-sm" style={{ border: '1px solid #e2e8f0' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>Website</label>
                <input {...form.register('website')} placeholder="https://" className="w-full px-3 py-2 rounded-lg outline-none text-sm" style={{ border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b' }}>Address</label>
                <textarea {...form.register('address')} rows={2} className="w-full px-3 py-2 rounded-lg outline-none text-sm" style={{ border: '1px solid #e2e8f0' }} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={form.formState.isSubmitting} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6366f1' }}>
                  {form.formState.isSubmitting ? 'Saving...' : (editing ? 'Update' : 'Create')}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#f1f5f9', color: '#64748b' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
