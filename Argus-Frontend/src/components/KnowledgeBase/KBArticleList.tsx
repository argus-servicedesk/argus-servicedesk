import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Tag,
  Calendar,
  User,
  FolderPlus,
  Filter,
  ChevronRight,
} from 'lucide-react';
import {
  useKBArticles,
  useKBCategories,
  useCreateKBCategory,
} from '../../hooks/useKnowledgeBase';
import { useAuth } from '../../hooks/useAuth';
import type { KBArticle, KBCategory, KBArticleState } from '../../types/index';

const COLORS = {
  primary: '#6366f1',
  surface: '#ffffff',
  background: '#F8FAFC',
  border: '#e2e8f0',
  text: '#0f172a',
};

const STATE_TABS: { label: string; value: KBArticleState | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Review', value: 'REVIEW' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const STATE_BADGE: Record<KBArticleState, { bg: string; text: string }> = {
  DRAFT: { bg: '#f1f5f9', text: '#475569' },
  REVIEW: { bg: '#fef3c7', text: '#92400e' },
  PUBLISHED: { bg: '#dcfce7', text: '#166534' },
  ARCHIVED: { bg: '#f3f4f6', text: '#6b7280' },
};

function KBArticleList() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [activeTab, setActiveTab] = useState<KBArticleState | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const filters: Record<string, string | undefined> = {};
  if (activeTab !== 'ALL') filters.state = activeTab;
  if (categoryFilter) filters.categoryId = categoryFilter;
  if (search) filters.search = search;

  const { data: articlesData, isLoading: articlesLoading } = useKBArticles(filters);
  const { data: categoriesData } = useKBCategories();
  const createCategory = useCreateKBCategory();

  const articles: KBArticle[] = articlesData?.data ?? [];
  const categories: KBCategory[] = categoriesData?.data ?? [];

  const {
    register: regCat,
    handleSubmit: handleCatSubmit,
    reset: resetCat,
  } = useForm<{ name: string; description: string }>();

  const onCreateCategory = handleCatSubmit((values) => {
    createCategory.mutate(values, {
      onSuccess: () => {
        toast.success('Category created');
        resetCat();
      },
      onError: () => toast.error('Failed to create category'),
    });
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    if (!d || Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.background }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          padding: '48px 32px',
          color: '#ffffff',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen size={32} />
              <h1 className="text-3xl font-bold">Knowledge Base</h1>
            </div>
            <p className="text-indigo-200 text-sm mt-1">
              Manage articles, categories, and knowledge content
            </p>
          </div>
          {canManage('kb') && (
            <button
              onClick={() => navigate('/kb/create')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              style={{ backgroundColor: '#ffffff', color: COLORS.primary }}
            >
              <Plus size={18} />
              Create Article
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Filters Row */}
        <div
          className="rounded-xl p-5 flex flex-wrap items-center gap-4"
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          {/* State Tabs */}
          <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: COLORS.background }}>
            {STATE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: activeTab === tab.value ? COLORS.primary : 'transparent',
                  color: activeTab === tab.value ? '#ffffff' : '#64748b',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: '#94a3b8' }} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 outline-none"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 flex-1 min-w-[200px]"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <Search size={16} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: COLORS.text }}
            />
          </div>
        </div>

        {/* Articles */}
        <div className="space-y-3">
          {articlesLoading && (
            <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>
              Loading articles...
            </div>
          )}

          {!articlesLoading && articles.length === 0 && (
            <div
              className="text-center py-16 rounded-xl"
              style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            >
              <BookOpen size={40} className="mx-auto mb-3" style={{ color: '#cbd5e1' }} />
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                No articles found. Create your first article to get started.
              </p>
            </div>
          )}

          {articles.map((article: KBArticle) => {
            const badge = STATE_BADGE[article.state];
            return (
              <div
                key={article.id}
                onClick={() => navigate(`/kb/${article.id}`)}
                className="rounded-xl p-5 cursor-pointer transition-shadow hover:shadow-md flex items-start justify-between gap-4"
                style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3
                      className="text-base font-semibold truncate"
                      style={{ color: COLORS.text }}
                    >
                      {article.title}
                    </h3>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {article.state}
                    </span>
                  </div>

                  {article.excerpt && (
                    <p className="text-sm mb-2 line-clamp-1" style={{ color: '#64748b' }}>
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: '#94a3b8' }}>
                    {article.category && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} />
                        {article.category.name}
                      </span>
                    )}
                    {article.author && (
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {article.author.firstName} {article.author.lastName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {article.viewCount} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(article.createdAt)}
                    </span>
                    {article.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag size={12} />
                        {article.tags.slice(0, 3).join(', ')}
                        {article.tags.length > 3 && ` +${article.tags.length - 3}`}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: '#cbd5e1', flexShrink: 0, marginTop: 4 }} />
              </div>
            );
          })}
        </div>

        {canManage('kb') && (
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.text }}>
              <FolderPlus size={20} style={{ color: COLORS.primary }} />
              Manage Categories
            </h2>

            <form onSubmit={onCreateCategory} className="flex flex-wrap items-end gap-3 mb-5">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>
                  Name
                </label>
                <input
                  {...regCat('name', { required: true })}
                  placeholder="Category name"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>
                  Description
                </label>
                <input
                  {...regCat('description')}
                  placeholder="Short description"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
                />
              </div>
              <button
                type="submit"
                disabled={createCategory.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: COLORS.primary }}
              >
                {createCategory.isPending ? 'Adding...' : 'Add Category'}
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: '#eef2ff', color: COLORS.primary }}
                >
                  {cat.name}
                  {cat._count?.articles != null && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px]"
                      style={{ backgroundColor: COLORS.primary, color: '#ffffff' }}
                    >
                      {cat._count.articles}
                    </span>
                  )}
                </span>
              ))}
              {categories.length === 0 && (
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  No categories yet. Create one above.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KBArticleList;
