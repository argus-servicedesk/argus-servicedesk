import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Search, Plus, Package, Tag, Clock, ShieldCheck,
  DollarSign, Folder, Grid3X3, X, Loader2, ChevronRight,
  Layers, Monitor, KeyRound, Settings, Boxes,
} from 'lucide-react';
import type { ServiceCategory, CatalogItem, CatalogItemType } from '../../types/index';
import {
  useCatalogCategories,
  useCatalogItems,
  useCreateCategory,
} from '../../hooks/useCatalog';
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

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
}

function CatalogList() {
  const navigate = useNavigate();
  const { canManage, isClient } = useAuth();
  const canConfigureCatalog = canManage('catalog') && !isClient;
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CatalogItemType | ''>('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const { data: categoriesRes, isLoading: catLoading } = useCatalogCategories();
  const { data: itemsRes, isLoading: itemsLoading } = useCatalogItems(
    typeFilter ? { type: typeFilter } : {}
  );

  const categories: ServiceCategory[] = categoriesRes?.data ?? [];
  const allItems: CatalogItem[] = itemsRes?.data ?? [];

  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.shortDescription.toLowerCase().includes(q)
    );
  }, [allItems, search]);

  const createCategory = useCreateCategory();
  const categoryForm = useForm<CategoryFormData>({ defaultValues: { name: '', description: '', icon: '' } });

  const onCreateCategory = categoryForm.handleSubmit(async (values) => {
    try {
      await createCategory.mutateAsync(values as unknown as Record<string, unknown>);
      toast.success('Category created');
      setShowCategoryModal(false);
      categoryForm.reset();
    } catch {
      toast.error('Failed to create category');
    }
  });

  const isLoading = catLoading || itemsLoading;

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      {/* Hero Banner */}
      <div
        style={{
          background: HERO_GRADIENT,
          padding: '48px 32px 40px',
          borderRadius: '0 0 24px 24px',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Package size={28} color="#818cf8" />
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Service Catalog
                </h1>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 15, margin: 0 }}>
                Browse available services and request what you need
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {canConfigureCatalog && (
                <>
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 18px', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#ffffff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    <Folder size={16} />
                    Create Category
                  </button>
                  <button
                    onClick={() => navigate('/catalog/create')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 20px', borderRadius: 10,
                      border: 'none',
                      background: PRIMARY, color: '#ffffff',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                    }}
                  >
                    <Plus size={16} />
                    Create Item
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 64px' }}>
        {/* Categories Grid */}
        {categories.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 16 }}>
              Categories
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 16,
              }}
            >
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    background: SURFACE, borderRadius: 14,
                    border: `1px solid ${BORDER}`,
                    padding: 20, cursor: 'pointer',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = PRIMARY;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(99,102,241,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = BORDER;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                  onClick={() => setTypeFilter('' as CatalogItemType)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'rgba(99,102,241,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Grid3X3 size={20} color={PRIMARY} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: TEXT, margin: 0 }}>
                        {cat.name}
                      </h3>
                    </div>
                    <span
                      style={{
                        fontSize: 12, fontWeight: 600, color: PRIMARY,
                        background: 'rgba(99,102,241,0.08)',
                        padding: '2px 8px', borderRadius: 6,
                      }}
                    >
                      {cat._count?.catalogItems ?? 0}
                    </span>
                  </div>
                  {cat.description && (
                    <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: 0, lineHeight: 1.5 }}>
                      {cat.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Items Section */}
        <section>
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 20, flexWrap: 'wrap', gap: 12,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: TEXT, margin: 0 }}>
              Catalog Items
            </h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  color={TEXT_SECONDARY}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: 260, padding: '9px 12px 9px 36px', borderRadius: 10,
                    border: `1px solid ${BORDER}`, background: SURFACE,
                    fontSize: 14, color: TEXT, outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as CatalogItemType | '')}
                style={{
                  padding: '9px 14px', borderRadius: 10,
                  border: `1px solid ${BORDER}`, background: SURFACE,
                  fontSize: 14, color: TEXT, cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="">All Types</option>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
              <Loader2 size={32} color={PRIMARY} className="animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center', padding: '64px 20px',
                background: SURFACE, borderRadius: 14, border: `1px solid ${BORDER}`,
              }}
            >
              <Package size={40} color={TEXT_SECONDARY} style={{ marginBottom: 12 }} />
              <p style={{ color: TEXT_SECONDARY, fontSize: 15 }}>No catalog items found</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {filteredItems.map((item) => {
                const tc = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.GENERAL;
                const TypeIcon = tc.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/catalog/${item.id}`)}
                    style={{
                      background: SURFACE, borderRadius: 14,
                      border: `1px solid ${BORDER}`,
                      padding: 20, cursor: 'pointer',
                      transition: 'box-shadow 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = PRIMARY;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(99,102,241,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = BORDER;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div
                        style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: tc.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <TypeIcon size={22} color={tc.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h3
                            style={{
                              fontSize: 15, fontWeight: 600, color: TEXT,
                              margin: 0, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                          >
                            {item.name}
                          </h3>
                          <ChevronRight size={14} color={TEXT_SECONDARY} style={{ flexShrink: 0 }} />
                        </div>
                        <p
                          style={{
                            fontSize: 13, color: TEXT_SECONDARY, margin: '0 0 12px',
                            lineHeight: 1.5, overflow: 'hidden',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {item.shortDescription}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          {/* Type Badge */}
                          <span
                            style={{
                              fontSize: 11, fontWeight: 600, color: tc.color,
                              background: tc.bg, padding: '3px 8px', borderRadius: 6,
                              textTransform: 'uppercase', letterSpacing: 0.5,
                            }}
                          >
                            {tc.label}
                          </span>
                          {/* Price */}
                          {item.price != null && item.price > 0 && (
                            <span
                              style={{
                                fontSize: 12, fontWeight: 600, color: '#059669',
                                display: 'flex', alignItems: 'center', gap: 3,
                              }}
                            >
                              <DollarSign size={12} />
                              {item.price.toLocaleString()} {item.currency}
                            </span>
                          )}
                          {/* Estimated Days */}
                          {item.estimatedDays != null && (
                            <span
                              style={{
                                fontSize: 12, color: TEXT_SECONDARY,
                                display: 'flex', alignItems: 'center', gap: 3,
                              }}
                            >
                              <Clock size={12} />
                              {item.estimatedDays}d
                            </span>
                          )}
                          {/* Approval Required */}
                          {item.approvalRequired && (
                            <span
                              style={{
                                fontSize: 11, fontWeight: 500, color: '#D97706',
                                background: 'rgba(245,158,11,0.1)',
                                padding: '2px 7px', borderRadius: 6,
                                display: 'flex', alignItems: 'center', gap: 3,
                              }}
                            >
                              <ShieldCheck size={11} />
                              Approval
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: SURFACE, borderRadius: 16,
              padding: 28, width: '100%', maxWidth: 460,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: TEXT, margin: 0 }}>
                Create Category
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 4, borderRadius: 6,
                }}
              >
                <X size={20} color={TEXT_SECONDARY} />
              </button>
            </div>

            <form onSubmit={onCreateCategory}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 6 }}>
                  Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  {...categoryForm.register('name', { required: true })}
                  placeholder="e.g. IT Equipment"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: `1px solid ${BORDER}`, fontSize: 14, color: TEXT,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 6 }}>
                  Description
                </label>
                <textarea
                  {...categoryForm.register('description')}
                  placeholder="Brief description of this category..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: `1px solid ${BORDER}`, fontSize: 14, color: TEXT,
                    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 6 }}>
                  Icon (emoji or keyword)
                </label>
                <input
                  {...categoryForm.register('icon')}
                  placeholder="e.g. laptop, shield"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: `1px solid ${BORDER}`, fontSize: 14, color: TEXT,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  style={{
                    padding: '10px 18px', borderRadius: 10,
                    border: `1px solid ${BORDER}`, background: SURFACE,
                    fontSize: 14, color: TEXT, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategory.isPending}
                  style={{
                    padding: '10px 22px', borderRadius: 10,
                    border: 'none', background: PRIMARY,
                    fontSize: 14, fontWeight: 600, color: '#ffffff',
                    cursor: createCategory.isPending ? 'not-allowed' : 'pointer',
                    opacity: createCategory.isPending ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {createCategory.isPending && <Loader2 size={14} className="animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CatalogList;
