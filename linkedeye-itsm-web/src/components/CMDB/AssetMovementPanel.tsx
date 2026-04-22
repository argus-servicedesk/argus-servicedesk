import { useState } from 'react';
import {
  Truck, Loader2, Plus, X, Save, MapPin, Calendar,
  User, ArrowRight, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAssetMovements, useCreateMovement } from '../../hooks/useCMDB';

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
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

interface AssetMovementPanelProps {
  assetId: string;
}

export default function AssetMovementPanel({ assetId }: AssetMovementPanelProps) {
  const { data: movData, isLoading } = useAssetMovements(assetId);
  const createMovement = useCreateMovement(assetId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fromLocation: '', toLocation: '', movedBy: '', reason: '', movedAt: '' });

  const movements = Array.isArray(movData?.data) ? movData.data : [];

  const handleCreate = async () => {
    if (!form.toLocation.trim()) { toast.error('Destination location is required'); return; }
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.movedAt) delete payload.movedAt;
      await createMovement.mutateAsync(payload);
      toast.success('Movement recorded');
      setShowForm(false);
      setForm({ fromLocation: '', toLocation: '', movedBy: '', reason: '', movedAt: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to record');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center gap-3">
        <Loader2 size={24} style={{ color: '#059669' }} className="animate-spin" />
        <p className="text-xs" style={{ color: '#94a3b8' }}>Loading movements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#059669' }}>
          <Truck size={15} /> Movement History
          {movements.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(5,150,105,0.15)', color: '#059669' }}>{movements.length}</span>
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
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>From Location</label>
                <input value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })} style={inputStyle} placeholder="Current location" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>To Location *</label>
                <input value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })} style={inputStyle} placeholder="New location" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Moved By</label>
                <input value={form.movedBy} onChange={(e) => setForm({ ...form, movedBy: e.target.value })} style={inputStyle} placeholder="Name" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Date</label>
                <input type="datetime-local" value={form.movedAt} onChange={(e) => setForm({ ...form, movedAt: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Reason</label>
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleCreate} disabled={createMovement.isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                {createMovement.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {movements.length === 0 ? (
        <div className="text-center py-6">
          <Truck size={28} style={{ color: '#94a3b8' }} className="mx-auto mb-2" />
          <p className="text-xs" style={{ color: '#94a3b8' }}>No movement history</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: 'rgba(5,150,105,0.15)' }} />
          <div className="space-y-5">
            {movements.map((mov: any, i: number) => (
              <div key={mov.id || i} className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0" style={{ background: 'rgba(5,150,105,0.12)', color: '#059669' }}>
                  <Truck size={14} />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin size={12} style={{ color: '#94a3b8' }} />
                      <span style={{ color: '#64748b' }}>{mov.fromLocation || 'Unknown'}</span>
                      <ArrowRight size={12} style={{ color: '#059669' }} />
                      <span className="font-medium" style={{ color: '#0f172a' }}>{mov.toLocation || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#94a3b8' }}>
                    {mov.movedBy && (
                      <span className="flex items-center gap-1">
                        <User size={10} /> {mov.movedBy}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {mov.movedAt ? formatDate(mov.movedAt) : mov.createdAt ? formatDate(mov.createdAt) : '-'}
                    </span>
                  </div>
                  {mov.reason && <p className="text-xs mt-1" style={{ color: '#64748b' }}>{mov.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
