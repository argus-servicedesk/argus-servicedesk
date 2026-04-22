import { useState } from 'react';
import {
  Users, Loader2, Plus, X, Save, RotateCcw,
  Calendar, User, CheckCircle, Clock, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAssetAllocations, useCreateAllocation, useReturnAllocation } from '../../hooks/useCMDB';

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

interface AssetAllocationPanelProps {
  assetId: string;
}

export default function AssetAllocationPanel({ assetId }: AssetAllocationPanelProps) {
  const { data: allocData, isLoading } = useAssetAllocations(assetId);
  const createAllocation = useCreateAllocation(assetId);
  const returnAllocation = useReturnAllocation(assetId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerName: '', assignedTo: '', assignedDate: '', notes: '' });

  const allocations = Array.isArray(allocData?.data) ? allocData.data : [];

  const handleCreate = async () => {
    if (!form.customerName.trim()) { toast.error('Customer name is required'); return; }
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.assignedDate) delete payload.assignedDate;
      await createAllocation.mutateAsync(payload);
      toast.success('Allocation created');
      setShowForm(false);
      setForm({ customerName: '', assignedTo: '', assignedDate: '', notes: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create');
    }
  };

  const handleReturn = async (allocId: string) => {
    try {
      await returnAllocation.mutateAsync(allocId);
      toast.success('Asset returned');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to return');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center gap-3">
        <Loader2 size={24} style={{ color: '#059669' }} className="animate-spin" />
        <p className="text-xs" style={{ color: '#94a3b8' }}>Loading allocations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#059669' }}>
          <Users size={15} /> Allocations
          {allocations.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(5,150,105,0.15)', color: '#059669' }}>{allocations.length}</span>
          )}
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.12)' }}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Customer *</label>
                <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} style={inputStyle} placeholder="Customer name" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Assigned To</label>
                <input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} style={inputStyle} placeholder="User name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Date</label>
                <input type="date" value={form.assignedDate} onChange={(e) => setForm({ ...form, assignedDate: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Notes</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleCreate} disabled={createAllocation.isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                {createAllocation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {allocations.length === 0 ? (
        <div className="text-center py-6">
          <Users size={28} style={{ color: '#94a3b8' }} className="mx-auto mb-2" />
          <p className="text-xs" style={{ color: '#94a3b8' }}>No allocations recorded</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(5,150,105,0.12)' }}>
                {['Customer', 'Assigned To', 'Assigned Date', 'Return Date', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc: any) => {
                const isActive = !alloc.returnDate && !alloc.returnedAt;
                return (
                  <tr
                    key={alloc.id}
                    style={{ borderBottom: '1px solid rgba(5,150,105,0.06)' }}
                    className="transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(5,150,105,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <User size={12} style={{ color: '#059669' }} />
                        <span style={{ color: '#0f172a' }}>{alloc.customerName || '-'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3" style={{ color: '#64748b' }}>{alloc.assignedTo || alloc.assignedUser?.name || '-'}</td>
                    <td className="py-2.5 px-3 text-xs" style={{ color: '#64748b' }}>
                      <div className="flex items-center gap-1">
                        <Calendar size={11} style={{ color: '#94a3b8' }} />
                        {alloc.assignedDate ? formatDate(alloc.assignedDate) : alloc.createdAt ? formatDate(alloc.createdAt) : '-'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs" style={{ color: '#64748b' }}>
                      {alloc.returnDate ? formatDate(alloc.returnDate) : alloc.returnedAt ? formatDate(alloc.returnedAt) : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={isActive
                          ? { background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }
                          : { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.25)' }
                        }
                      >
                        {isActive ? <Clock size={10} /> : <CheckCircle size={10} />}
                        {isActive ? 'Active' : 'Returned'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isActive && (
                        <button
                          onClick={() => handleReturn(alloc.id)}
                          disabled={returnAllocation.isPending}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors"
                          style={{ color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' }}
                        >
                          <RotateCcw size={12} /> Return
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
