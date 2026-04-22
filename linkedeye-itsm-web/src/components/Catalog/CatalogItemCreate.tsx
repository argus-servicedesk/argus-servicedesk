import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Package, Loader2, Tag, FileText,
  DollarSign, Clock, ShieldCheck, Users, Layers,
} from 'lucide-react';
import type { CatalogItemType, ServiceCategory } from '../../types/index';
import { useCatalogCategories, useCreateCatalogItem } from '../../hooks/useCatalog';
import api from '../../lib/api';

// ─── Design tokens ───────────────────────────────────────────────────────────
const PRIMARY = '#6366f1';
const SURFACE = '#ffffff';
const BG = '#F8FAFC';
const BORDER = '#e2e8f0';
const TEXT = '#0f172a';
const TEXT_SECONDARY = '#64748b';

const HERO_GRADIENT = 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)';

const CATALOG_ITEM_TYPES: { value: CatalogItemType; label: string }[] = [
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'ACCESS', label: 'Access' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'GENERAL', label: 'General' },
];

interface CatalogItemFormData {
  name: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  type: CatalogItemType;
  price: string;
  currency: string;
  approvalRequired: boolean;
  fulfillmentGroupId: string;
  estimatedDays: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: `1px solid ${BORDER}`, fontSize: 14, color: TEXT,
  outline: 'none', boxSizing: 'border-box', background: SURFACE,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: TEXT, marginBottom: 6,
};

function CatalogItemCreate() {
  const navigate = useNavigate();
  const createItem = useCreateCatalogItem();

  const { data: categoriesRes, isLoading: catLoading } = useCatalogCategories();
  const categories: ServiceCategory[] = categoriesRes?.data ?? [];

  const { data: teamsRes, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => { const { data } = await api.get('/teams'); return data; },
    staleTime: 60000,
  });
  const teams: { id: string; name: string }[] = teamsRes?.data ?? [];

  const {
    register, handleSubmit, formState: { errors },
  } = useForm<CatalogItemFormData>({
    defaultValues: {
      name: '', shortDescription: '', description: '',
      categoryId: '', type: 'GENERAL',
      price: '', currency: 'USD', approvalRequired: false,
      fulfillmentGroupId: '', estimatedDays: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        shortDescription: values.shortDescription,
        description: values.description || null,
        categoryId: values.categoryId,
        type: values.type,
        currency: values.currency || 'USD',
        approvalRequired: values.approvalRequired,
        fulfillmentGroupId: values.fulfillmentGroupId || null,
        price: values.price ? parseFloat(values.price) : null,
        estimatedDays: values.estimatedDays ? parseInt(values.estimatedDays, 10) : null,
      };
      await createItem.mutateAsync(payload);
      toast.success('Catalog item created successfully');
      navigate('/catalog');
    } catch {
      toast.error('Failed to create catalog item');
    }
  });

  const isReady = !catLoading && !teamsLoading;

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
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Package size={26} color="#818cf8" />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Create Catalog Item
            </h1>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 64px' }}>
        {!isReady ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Loader2 size={32} color={PRIMARY} className="animate-spin" />
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div
              style={{
                background: SURFACE, borderRadius: 16,
                border: `1px solid ${BORDER}`, padding: 28,
              }}
            >
              {/* Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag size={14} color={PRIMARY} />
                    Name <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                </label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  placeholder="e.g. Laptop Request"
                  style={{ ...inputStyle, borderColor: errors.name ? '#EF4444' : BORDER }}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = errors.name ? '#EF4444' : BORDER)}
                />
                {errors.name && (
                  <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.name.message}</p>
                )}
              </div>

              {/* Short Description */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} color={PRIMARY} />
                    Short Description <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                </label>
                <input
                  {...register('shortDescription', { required: 'Short description is required' })}
                  placeholder="Brief summary for the catalog listing"
                  style={{ ...inputStyle, borderColor: errors.shortDescription ? '#EF4444' : BORDER }}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = errors.shortDescription ? '#EF4444' : BORDER)}
                />
                {errors.shortDescription && (
                  <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.shortDescription.message}</p>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} color={TEXT_SECONDARY} />
                    Description
                  </span>
                </label>
                <textarea
                  {...register('description')}
                  placeholder="Detailed description of this catalog item..."
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>

              {/* Category + Type row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={14} color={PRIMARY} />
                      Category <span style={{ color: '#EF4444' }}>*</span>
                    </span>
                  </label>
                  <select
                    {...register('categoryId', { required: 'Category is required' })}
                    style={{ ...inputStyle, cursor: 'pointer', borderColor: errors.categoryId ? '#EF4444' : BORDER }}
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.categoryId.message}</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tag size={14} color={PRIMARY} />
                      Type <span style={{ color: '#EF4444' }}>*</span>
                    </span>
                  </label>
                  <select
                    {...register('type', { required: true })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {CATALOG_ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price + Currency row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <DollarSign size={14} color={TEXT_SECONDARY} />
                      Price
                    </span>
                  </label>
                  <input
                    {...register('price')}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                    onBlur={(e) => (e.target.style.borderColor = BORDER)}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Currency</label>
                  <select
                    {...register('currency')}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              {/* Fulfillment Group + Estimated Days */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color={TEXT_SECONDARY} />
                      Fulfillment Group
                    </span>
                  </label>
                  <select
                    {...register('fulfillmentGroupId')}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">None</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} color={TEXT_SECONDARY} />
                      Estimated Days
                    </span>
                  </label>
                  <input
                    {...register('estimatedDays')}
                    type="number"
                    min="1"
                    placeholder="e.g. 3"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                    onBlur={(e) => (e.target.style.borderColor = BORDER)}
                  />
                </div>
              </div>

              {/* Approval Required */}
              <div style={{ marginBottom: 28 }}>
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', fontSize: 14, color: TEXT,
                  }}
                >
                  <input
                    type="checkbox"
                    {...register('approvalRequired')}
                    style={{
                      width: 18, height: 18, accentColor: PRIMARY,
                      cursor: 'pointer',
                    }}
                  />
                  <ShieldCheck size={16} color={PRIMARY} />
                  <span style={{ fontWeight: 500 }}>Approval Required</span>
                  <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                    Requests for this item will need manager approval
                  </span>
                </label>
              </div>

              {/* Submit */}
              <div
                style={{
                  display: 'flex', justifyContent: 'flex-end', gap: 12,
                  borderTop: `1px solid ${BORDER}`, paddingTop: 20,
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/catalog')}
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
                  disabled={createItem.isPending}
                  style={{
                    padding: '10px 24px', borderRadius: 10,
                    border: 'none', background: PRIMARY,
                    fontSize: 14, fontWeight: 600, color: '#ffffff',
                    cursor: createItem.isPending ? 'not-allowed' : 'pointer',
                    opacity: createItem.isPending ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                  }}
                >
                  {createItem.isPending && <Loader2 size={14} className="animate-spin" />}
                  Create Item
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CatalogItemCreate;
