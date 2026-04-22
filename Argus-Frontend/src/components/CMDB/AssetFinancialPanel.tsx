import { useState, useEffect } from 'react';
import {
  DollarSign, Loader2, Save, Calendar, FileText,
  ShieldCheck, Package, Building2, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAssetFinancials, useUpsertFinancials, useVendors } from '../../hooks/useCMDB';

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

const subtleBg: React.CSSProperties = {
  background: 'rgba(5,150,105,0.06)',
  borderRadius: '0.5rem',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
}

interface AssetFinancialPanelProps {
  assetId: string;
}

export default function AssetFinancialPanel({ assetId }: AssetFinancialPanelProps) {
  const { data: financialData, isLoading, isError } = useAssetFinancials(assetId);
  const { data: vendorData } = useVendors({ isActive: 'true', pageSize: 100 });
  const upsertFinancials = useUpsertFinancials(assetId);
  const [editing, setEditing] = useState(false);

  const fin = financialData?.data;
  const vendors = vendorData?.data || [];

  const [form, setForm] = useState({
    purchaseDate: '',
    invoiceNumber: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    vendorId: '',
    warrantyStartDate: '',
    warrantyEndDate: '',
    amcStartDate: '',
    amcEndDate: '',
    currency: 'INR',
    purchaseOrderNumber: '',
  });

  useEffect(() => {
    if (fin) {
      setForm({
        purchaseDate: fin.purchaseDate ? fin.purchaseDate.slice(0, 10) : '',
        invoiceNumber: fin.invoiceNumber || '',
        quantity: fin.quantity || 1,
        unitPrice: fin.unitPrice || 0,
        totalPrice: fin.totalPrice || 0,
        vendorId: fin.vendorId || '',
        warrantyStartDate: fin.warrantyStartDate ? fin.warrantyStartDate.slice(0, 10) : '',
        warrantyEndDate: fin.warrantyEndDate ? fin.warrantyEndDate.slice(0, 10) : '',
        amcStartDate: fin.amcStartDate ? fin.amcStartDate.slice(0, 10) : '',
        amcEndDate: fin.amcEndDate ? fin.amcEndDate.slice(0, 10) : '',
        currency: fin.currency || 'INR',
        purchaseOrderNumber: fin.purchaseOrderNumber || '',
      });
    }
  }, [fin]);

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = { ...form };
      // Remove empty date fields
      for (const key of ['purchaseDate', 'warrantyStartDate', 'warrantyEndDate', 'amcStartDate', 'amcEndDate']) {
        if (!payload[key]) delete payload[key];
      }
      if (!payload.vendorId) delete payload.vendorId;
      await upsertFinancials.mutateAsync(payload);
      toast.success('Financial data saved');
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save');
    }
  };

  if (isLoading) {
    return (
      <div style={glassCard} className="p-12 flex flex-col items-center gap-3">
        <Loader2 size={24} style={{ color: '#059669' }} className="animate-spin" />
        <p className="text-xs" style={{ color: '#94a3b8' }}>Loading financial data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={glassCard} className="p-8 text-center">
        <AlertTriangle size={28} style={{ color: '#D97706' }} className="mx-auto mb-2" />
        <p className="text-sm" style={{ color: '#64748b' }}>Unable to load financial data</p>
      </div>
    );
  }

  // View mode
  if (!editing && fin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#059669' }}>
            <DollarSign size={15} /> Financial Information
          </h3>
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}
          >
            Edit
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ['Purchase Date', fin.purchaseDate ? formatDate(fin.purchaseDate) : '-', Calendar],
            ['Invoice #', fin.invoiceNumber || '-', FileText],
            ['Quantity', String(fin.quantity || '-'), Package],
            ['Unit Price', fin.unitPrice ? formatCurrency(fin.unitPrice, fin.currency) : '-', DollarSign],
            ['Total Price', fin.totalPrice ? formatCurrency(fin.totalPrice, fin.currency) : '-', DollarSign],
            ['PO Number', fin.purchaseOrderNumber || '-', FileText],
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

        {/* Vendor */}
        {fin.vendor && (
          <div className="rounded-lg p-3" style={subtleBg}>
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 size={11} style={{ color: '#94a3b8' }} />
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Vendor</p>
            </div>
            <p className="text-sm font-medium" style={{ color: '#0f172a' }}>{fin.vendor.name}</p>
          </div>
        )}

        {/* Warranty & AMC */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3" style={subtleBg}>
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck size={11} style={{ color: '#94a3b8' }} />
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>Warranty</p>
            </div>
            <p className="text-xs" style={{ color: '#0f172a' }}>
              {fin.warrantyStartDate ? formatDate(fin.warrantyStartDate) : '-'} to {fin.warrantyEndDate ? formatDate(fin.warrantyEndDate) : '-'}
            </p>
          </div>
          <div className="rounded-lg p-3" style={subtleBg}>
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck size={11} style={{ color: '#94a3b8' }} />
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>AMC Period</p>
            </div>
            <p className="text-xs" style={{ color: '#0f172a' }}>
              {fin.amcStartDate ? formatDate(fin.amcStartDate) : '-'} to {fin.amcEndDate ? formatDate(fin.amcEndDate) : '-'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Edit/Create mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#059669' }}>
          <DollarSign size={15} /> {fin ? 'Edit Financial Data' : 'Add Financial Data'}
        </h3>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Purchase Date</label>
            <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Invoice Number</label>
            <input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} style={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Quantity</label>
            <input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Unit Price</label>
            <input type="number" min={0} step={0.01} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Total Price</label>
            <input type="number" min={0} step={0.01} value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: parseFloat(e.target.value) || 0 })} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Currency</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inputStyle}>
              {['INR', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Vendor</label>
            <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} style={inputStyle}>
              <option value="">-- Select --</option>
              {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>PO Number</label>
            <input value={form.purchaseOrderNumber} onChange={(e) => setForm({ ...form, purchaseOrderNumber: e.target.value })} style={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Warranty Start</label>
            <input type="date" value={form.warrantyStartDate} onChange={(e) => setForm({ ...form, warrantyStartDate: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Warranty End</label>
            <input type="date" value={form.warrantyEndDate} onChange={(e) => setForm({ ...form, warrantyEndDate: e.target.value })} style={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>AMC Start</label>
            <input type="date" value={form.amcStartDate} onChange={(e) => setForm({ ...form, amcStartDate: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>AMC End</label>
            <input type="date" value={form.amcEndDate} onChange={(e) => setForm({ ...form, amcEndDate: e.target.value })} style={inputStyle} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {fin && (
          <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ color: '#64748b', border: '1px solid rgba(5,150,105,0.15)' }}>Cancel</button>
        )}
        <button onClick={handleSave} disabled={upsertFinancials.isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
          {upsertFinancials.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>
    </div>
  );
}
