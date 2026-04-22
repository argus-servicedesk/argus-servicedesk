import { useState } from 'react';
import {
  Trash, Loader2, Save, Calendar, DollarSign,
  Package, FileText, User, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAssetDisposal, useCreateDisposal } from '../../hooks/useCMDB';

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

const subtleBg: React.CSSProperties = {
  background: 'rgba(5,150,105,0.06)',
  borderRadius: '0.5rem',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const DISPOSAL_METHODS = ['SOLD', 'RECYCLED', 'DONATED', 'SCRAPPED', 'RETURNED_TO_VENDOR', 'OTHER'];

const methodStyle: Record<string, React.CSSProperties> = {
  SOLD: { background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' },
  RECYCLED: { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' },
  DONATED: { background: 'rgba(124,58,237,0.12)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.25)' },
  SCRAPPED: { background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)' },
  RETURNED_TO_VENDOR: { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  OTHER: { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.25)' },
};

interface AssetDisposalPanelProps {
  assetId: string;
}

export default function AssetDisposalPanel({ assetId }: AssetDisposalPanelProps) {
  const { data: disposalData, isLoading, isError } = useAssetDisposal(assetId);
  const createDisposal = useCreateDisposal(assetId);

  const disposal = disposalData?.data;

  const [form, setForm] = useState({
    disposalDate: '',
    quantity: 1,
    disposalValue: 0,
    method: 'SCRAPPED',
    remarks: '',
    approvedBy: '',
  });

  const handleCreate = async () => {
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.disposalDate) delete payload.disposalDate;
      await createDisposal.mutateAsync(payload);
      toast.success('Disposal recorded');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to record');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center gap-3">
        <Loader2 size={24} style={{ color: '#059669' }} className="animate-spin" />
        <p className="text-xs" style={{ color: '#94a3b8' }}>Loading disposal data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle size={28} style={{ color: '#D97706' }} className="mx-auto mb-2" />
        <p className="text-sm" style={{ color: '#64748b' }}>Unable to load disposal data</p>
      </div>
    );
  }

  // View existing disposal
  if (disposal) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#059669' }}>
          <Trash size={15} /> Disposal Record
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ['Disposal Date', disposal.disposalDate ? formatDate(disposal.disposalDate) : '-', Calendar],
            ['Quantity', String(disposal.quantity || '-'), Package],
            ['Value', disposal.disposalValue != null ? `$${disposal.disposalValue}` : '-', DollarSign],
            ['Approved By', disposal.approvedBy || '-', User],
          ].map(([label, value, Icon]) => {
            const IconComp = Icon as React.ElementType;
            return (
              <div key={label as string} className="rounded-lg p-3" style={subtleBg}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <IconComp size={11} style={{ color: '#94a3b8' }} />
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</p>
                </div>
                <p className="text-sm font-mono" style={{ color: '#0f172a' }}>{value}</p>
              </div>
            );
          })}
        </div>

        {/* Method badge */}
        <div className="rounded-lg p-3" style={subtleBg}>
          <div className="flex items-center gap-1.5 mb-1">
            <FileText size={11} style={{ color: '#94a3b8' }} />
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Method</p>
          </div>
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={methodStyle[disposal.method] || methodStyle.OTHER}
          >
            {(disposal.method || 'UNKNOWN').replace(/_/g, ' ')}
          </span>
        </div>

        {disposal.remarks && (
          <div className="rounded-lg p-3" style={subtleBg}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Remarks</p>
            <p className="text-sm" style={{ color: '#64748b' }}>{disposal.remarks}</p>
          </div>
        )}
      </div>
    );
  }

  // Create form
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#059669' }}>
        <Trash size={15} /> Record Disposal
      </h3>
      <p className="text-xs" style={{ color: '#94a3b8' }}>No disposal record exists. Fill out the form below to record asset disposal.</p>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Disposal Date</label>
            <input type="date" value={form.disposalDate} onChange={(e) => setForm({ ...form, disposalDate: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Quantity</label>
            <input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Disposal Value</label>
            <input type="number" min={0} step={0.01} value={form.disposalValue} onChange={(e) => setForm({ ...form, disposalValue: parseFloat(e.target.value) || 0 })} style={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Method</label>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} style={inputStyle}>
              {DISPOSAL_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Approved By</label>
            <input value={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} style={inputStyle} placeholder="Approver name" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Remarks</label>
          <textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleCreate} disabled={createDisposal.isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
          {createDisposal.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Record Disposal
        </button>
      </div>
    </div>
  );
}
