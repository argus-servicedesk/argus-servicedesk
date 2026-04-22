import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Search, Eye, Tag } from 'lucide-react';
import { usePublishedKBArticles, useKBCategories } from '../../hooks/useKnowledgeBase';

interface Article {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  category?: string;
  categoryName?: string;
  viewCount?: number;
  tags?: string[];
  createdAt?: string;
}

export default function PortalKnowledgeBase() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState('');

  const filters: Record<string, string> = {};
  if (search) filters.search = search;
  if (selectedCategory) filters.category = selectedCategory;

  const { data: articlesData, isLoading } = usePublishedKBArticles(filters);
  const { data: catData } = useKBCategories();

  const articles: Article[] = articlesData?.data ?? [];
  const categories: { id: string; name: string }[] = catData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>
          <BookOpen size={24} className="mr-2 inline-block" style={{ color: '#6366f1' }} />
          Knowledge Base
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
          Find answers, how-to guides, and troubleshooting articles.
        </p>
      </div>

      {/* Search Bar */}
      <div
        className="flex items-center overflow-hidden rounded-xl border"
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
      >
        <div className="pl-4" style={{ color: '#94a3b8' }}>
          <Search size={18} />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles..."
          className="w-full border-0 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-400"
          style={{ color: '#0f172a' }}
        />
      </div>

      {/* Category Chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: !selectedCategory ? '#6366f1' : '#ffffff',
              color: !selectedCategory ? '#ffffff' : '#0f172a',
              borderColor: !selectedCategory ? '#6366f1' : '#e2e8f0',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: selectedCategory === cat.id ? '#6366f1' : '#ffffff',
                color: selectedCategory === cat.id ? '#ffffff' : '#0f172a',
                borderColor: selectedCategory === cat.id ? '#6366f1' : '#e2e8f0',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Articles Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: '#e2e8f0', borderTopColor: '#6366f1' }}
          />
        </div>
      ) : articles.length === 0 ? (
        <div
          className="rounded-xl border px-6 py-14 text-center"
          style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
        >
          <BookOpen size={40} className="mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>
            {search || selectedCategory
              ? 'No articles match your search. Try adjusting your filters.'
              : 'No articles published yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              to={`/portal/knowledge-base/${article.id}`}
              className="group flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-md"
              style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
            >
              {/* Category */}
              {(article.categoryName || article.category) && (
                <span className="mb-2 text-xs font-medium" style={{ color: '#6366f1' }}>
                  {article.categoryName ?? article.category}
                </span>
              )}

              {/* Title */}
              <h3
                className="mb-1 text-base font-semibold group-hover:underline"
                style={{ color: '#0f172a' }}
              >
                {article.title}
              </h3>

              {/* Excerpt */}
              <p className="mb-3 flex-1 text-sm line-clamp-3" style={{ color: '#64748b' }}>
                {article.excerpt ?? (article.content ? article.content.slice(0, 150) + '...' : '')}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs" style={{ color: '#94a3b8' }}>
                {article.viewCount != null && (
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} /> {article.viewCount} views
                  </span>
                )}
              </div>

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {article.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs"
                      style={{ backgroundColor: '#F8FAFC', color: '#64748b', border: '1px solid #e2e8f0' }}
                    >
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
