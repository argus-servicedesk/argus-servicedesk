import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Package, Loader2, Tag, FileText, Edit3, Save, X,
  DollarSign, Clock, ShieldCheck, Users, Layers, Calendar,
  Monitor, KeyRound, Settings, Boxes, CheckCircle, Send,
} from 'lucide-react';
import type { CatalogItem, CatalogItemType } from '../../types/index';
import { useCatalogItem, useUpdateCatalogItem } from '../../hooks/useCatalog';
import { useAuth } from '../../hooks/useAuth';

// ─── Design tokens ───────────────────────────────────────────────────────────
const PRIMARY = '#6366f1';
const SURFACE = '#ffffff';
const BG = '#F8FAFC';
const BORDER = '#e2e8f0';
const TEXT = '#0f172a';
const TEXT_SECONDARY = '#64748b';

const HERO_GRADIENT = 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)';

const TYPE_CONFIG: Record<CatalogItemType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  HARDWARE: { label: 'Hardware', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: Monitor },
  SOFTWARE: { label: 'Software', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', icon: Layers },
  ACCESS:   { label: 'Access',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: KeyRound },
  SERVICE:  { label: 'Service',  color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: Settings },
  GENERAL:  { label: 'General',  color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: Boxes },
};

const CATALOG_ITEM_TYPES: { value: CatalogItemType; label: string }[] = [
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'ACCESS', label: 'Access' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'GENERAL', label: 'General' },
];

interface EditFormData {
  name: string;
  shortDescription: string;
  description: string;
  type: CatalogItemType;
  price: string;
  currency: string;
  approvalRequired: boolean;
  estimatedDays: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: `1px solid ${BORDER}`, fontSize: 14, color: TEXT,
  outline: 'none', boxSizing: 'border-box', background: SURFACE,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: TEXT_SECONDARY, marginBottom: 6,
};

function CatalogItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManage, isClient } = useAuth();
  const canConfigureCatalog = canManage('catalog') && !isClient;
  const [editing, setEditing] = useState(false);

  const { data: itemRes, isLoading } = useCatalogItem(id ?? '');
  const item: CatalogItem | undefined = itemRes?.data;
  const updateItem = useUpdateCatalogItem();

  const form = useForm<EditFormData>();

  const startEditing = () => {
    if (!item) return;
    form.reset({
      name: item.name,
      shortDescription: item.shortDescription,
      description: item.description ?? '',
      type: item.type,
      price: item.price != null ? String(item.price) : '',
      currency: item.currency,
      approvalRequired: item.approvalRequired,
      estimatedDays: item.estimatedDays != null ? String(item.estimatedDays) : '',
    });
    setEditing(true);
  };

  const onSave = form.handleSubmit(async (values) => {
    if (!id) return;
    try {
      await updateItem.mutateAsync({
        id,
        data: {
          name: values.name,
          shortDescription: values.shortDescription,
          description: values.description || null,
          type: values.type,
          price: values.price ? parseFloat(values.price) : null,
          currency: values.currency,
          approvalRequired: values.approvalRequired,
          estimatedDays: values.estimatedDays ? parseInt(values.estimatedDays, 10) : null,
        },
      });
      toast.success('Item updated successfully');
      setEditing(false);
    } catch {
      toast.error('Failed to update item');
    }
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={36} color={PRIMARY} className="animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Package size={48} color={TEXT_SECONDARY} style={{ marginBottom: 16 }} />
          <p style={{ color: TEXT_SECONDARY, fontSize: 16 }}>Item not found</p>
          <button
            onClick={() => navigate('/catalog')}
            style={{
              marginTop: 16, padding: '10px 20px', borderRadius: 10,
              border: 'none', background: PRIMARY, color: '#ffffff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  const tc = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.GENERAL;
  const TypeIcon = tc.icon;

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      {/* Hero Banner */}
      <div
        style={{
          background: HERO_GRADIENT,
          padding: '36px 32px 32px',
          borderRadius: '0 0 24px 24px',
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <button
            onClick={() => navigate('/catalog')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none',
              color: '#94a3b8', fontSize: 14, cursor: 'pointer',
              marginBottom: 16, padding: 0,
            }}
          >
            <ArrowLeft size={16} />
            Back to Catalog
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: tc.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <TypeIcon size={24} color={tc.color} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  {item.name}
                </h1>
                <p style={{ color: '#94a3b8', fontSize: 14, margin: '4px 0 0' }}>
                  {item.shortDescription}
                </p>
              </div>
            </div>
            {!editing && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => navigate(`/service-requests/create?item=${item.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 18px', borderRadius: 10,
                    border: 'none',
                    background: PRIMARY,
                    color: '#ffffff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  }}
                >
                  <Send size={15} />
                  Request
                </button>
                {canConfigureCatalog && (
                  <button
                    onClick={startEditing}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 18px', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#ffffff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 32px 64px' }}>
        {editing ? (
          /* ── Edit Mode ────────────────────────────────────────────────── */
          <form onSubmit={onSave}>
            <div
              style={{
                background: SURFACE, borderRadius: 16,
                border: `1px solid ${BORDER}`, padding: 28,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: TEXT, margin: 0 }}>
                  Edit Catalog Item
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  }}
                >
                  <X size={20} color={TEXT_SECONDARY} />
                </button>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Name</label>
                <input
                  {...form.register('name', { required: true })}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Short Description</label>
                <input
                  {...form.register('shortDescription', { required: true })}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  {...form.register('description')}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select {...form.register('type')} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {CATALOG_ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Currency</label>
                  <select {...form.register('currency')} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={labelStyle}>Price</label>
                  <input
                    {...form.register('price')}
                    type="number" step="0.01" min="0"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                    onBlur={(e) => (e.target.style.borderColor = BORDER)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Estimated Days</label>
                  <input
                    {...form.register('estimatedDays')}
                    type="number" min="1"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                    onBlur={(e) => (e.target.style.borderColor = BORDER)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: TEXT }}>
                  <input
                    type="checkbox"
                    {...form.register('approvalRequired')}
                    style={{ width: 18, height: 18, accentColor: PRIMARY, cursor: 'pointer' }}
                  />
                  <ShieldCheck size={16} color={PRIMARY} />
                  <span style={{ fontWeight: 500 }}>Approval Required</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    border: `1px solid ${BORDER}`, background: SURFACE,
                    fontSize: 14, color: TEXT, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateItem.isPending}
                  style={{
                    padding: '10px 24px', borderRadius: 10,
                    border: 'none', background: PRIMARY,
                    fontSize: 14, fontWeight: 600, color: '#ffffff',
                    cursor: updateItem.isPending ? 'not-allowed' : 'pointer',
                    opacity: updateItem.isPending ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                  }}
                >
                  {updateItem.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ── Detail View ──────────────────────────────────────────────── */
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Main content */}
            <div
              style={{
                background: SURFACE, borderRadius: 16,
                border: `1px solid ${BORDER}`, padding: 28,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginTop: 0, marginBottom: 20 }}>
                Details
              </h2>

              {/* Description */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>
                  <FileText size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Description
                </label>
                <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.7, margin: 0 }}>
                  {item.description || 'No description provided.'}
                </p>
              </div>

              {/* Category */}
              {item.category && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    <Layers size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Category
                  </label>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 13, fontWeight: 500, color: PRIMARY,
                      background: 'rgba(99,102,241,0.08)',
                      padding: '5px 12px', borderRadius: 8,
                    }}
                  >
                    <Layers size={14} />
                    {item.category.name}
                  </span>
                </div>
              )}

              {/* Type */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  <Tag size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Type
                </label>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600, color: tc.color,
                    background: tc.bg,
                    padding: '5px 12px', borderRadius: 8,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}
                >
                  <TypeIcon size={14} />
                  {tc.label}
                </span>
              </div>

              {/* Fulfillment Group */}
              {item.fulfillmentGroup && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    <Users size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Fulfillment Group
                  </label>
                  <p style={{ fontSize: 14, color: TEXT, margin: 0 }}>
                    {item.fulfillmentGroup.name}
                  </p>
                </div>
              )}

              {/* Form Schema Preview */}
              {item.formSchema && Object.keys(item.formSchema).length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <label style={{ ...labelStyle, marginBottom: 12 }}>
                    <FileText size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Form Schema
                  </label>
                  <pre
                    style={{
                      background: '#F1F5F9', borderRadius: 10,
                      padding: 16, fontSize: 12, color: TEXT,
                      overflow: 'auto', maxHeight: 240,
                      border: `1px solid ${BORDER}`,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    }}
                  >
                    {JSON.stringify(item.formSchema, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Quick Info */}
              <div
                style={{
                  background: SURFACE, borderRadius: 16,
                  border: `1px solid ${BORDER}`, padding: 24,
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginTop: 0, marginBottom: 18 }}>
                  Quick Info
                </h3>

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(16,185,129,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <DollarSign size={18} color="#059669" />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>Price</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: TEXT, margin: 0 }}>
                      {item.price != null && item.price > 0
                        ? `${item.price.toLocaleString()} ${item.currency}`
                        : 'Free'}
                    </p>
                  </div>
                </div>

                {/* Estimated Delivery */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(99,102,241,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Clock size={18} color={PRIMARY} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>Estimated Delivery</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: TEXT, margin: 0 }}>
                      {item.estimatedDays != null
                        ? `${item.estimatedDays} day${item.estimatedDays !== 1 ? 's' : ''}`
                        : 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Approval */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: item.approvalRequired
                        ? 'rgba(245,158,11,0.08)'
                        : 'rgba(16,185,129,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {item.approvalRequired
                      ? <ShieldCheck size={18} color="#D97706" />
                      : <CheckCircle size={18} color="#059669" />}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>Approval</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: TEXT, margin: 0 }}>
                      {item.approvalRequired ? 'Required' : 'Not required'}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: item.isActive
                        ? 'rgba(16,185,129,0.08)'
                        : 'rgba(239,68,68,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Package size={18} color={item.isActive ? '#059669' : '#EF4444'} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>Status</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: item.isActive ? '#059669' : '#EF4444', margin: 0 }}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div
                style={{
                  background: SURFACE, borderRadius: 16,
                  border: `1px solid ${BORDER}`, padding: 24,
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginTop: 0, marginBottom: 14 }}>
                  Timestamps
                </h3>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Calendar size={13} color={TEXT_SECONDARY} />
                    <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>Created</span>
                  </div>
                  <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Calendar size={13} color={TEXT_SECONDARY} />
                    <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>Last Updated</span>
                  </div>
                  <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>
                    {new Date(item.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CatalogItemDetail;
