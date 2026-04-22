import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, X } from 'lucide-react';
import { useCreateKBArticle, useKBCategories } from '../../hooks/useKnowledgeBase';
import type { KBCategory } from '../../types/index';

const COLORS = {
  primary: '#6366f1',
  surface: '#ffffff',
  background: '#F8FAFC',
  border: '#e2e8f0',
  text: '#0f172a',
};

interface FormValues {
  title: string;
  content: string;
  excerpt: string;
  categoryId: string;
  tagsInput: string;
}

function KBArticleCreate() {
  const navigate = useNavigate();
  const createArticle = useCreateKBArticle();
  const { data: categoriesData } = useKBCategories();
  const categories: KBCategory[] = categoriesData?.data ?? [];

  const [tags, setTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { title: '', content: '', excerpt: '', categoryId: '', tagsInput: '' } });

  const tagsInput = watch('tagsInput');

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const raw = tagsInput.trim().replace(/,+$/, '').trim();
      if (raw && !tags.includes(raw)) {
        setTags((prev) => [...prev, raw]);
      }
      setValue('tagsInput', '');
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const onSubmit = handleSubmit((values) => {
    // Collect any remaining text in the tag input
    const finalTags = [...tags];
    const leftover = values.tagsInput.trim().replace(/,+$/, '').trim();
    if (leftover && !finalTags.includes(leftover)) {
      finalTags.push(leftover);
    }

    const payload: Record<string, unknown> = {
      title: values.title,
      content: values.content,
      tags: finalTags,
    };
    if (values.excerpt) payload.excerpt = values.excerpt;
    if (values.categoryId) payload.categoryId = values.categoryId;

    createArticle.mutate(payload, {
      onSuccess: () => {
        toast.success('Article created successfully');
        navigate('/kb');
      },
      onError: () => toast.error('Failed to create article'),
    });
  });

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    width: '100%',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: '#475569',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.background }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          padding: '40px 32px',
          color: '#ffffff',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/kb')}
            className="flex items-center gap-1.5 text-indigo-200 text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Knowledge Base
          </button>
          <div className="flex items-center gap-3">
            <FileText size={28} />
            <h1 className="text-2xl font-bold">Create Article</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <form
          onSubmit={onSubmit}
          className="rounded-xl p-8 space-y-6"
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          {/* Title */}
          <div>
            <label style={labelStyle}>
              Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              placeholder="Enter article title"
              style={inputStyle}
            />
            {errors.title && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Content */}
          <div>
            <label style={labelStyle}>
              Content <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              {...register('content', { required: 'Content is required' })}
              rows={14}
              placeholder="Write your article content here... (Markdown supported)"
              style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }}
            />
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
              Markdown formatting is supported.
            </p>
            {errors.content && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                {errors.content.message}
              </p>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label style={labelStyle}>Excerpt</label>
            <textarea
              {...register('excerpt')}
              rows={3}
              placeholder="Brief summary shown in article listings"
              style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select
              {...register('categoryId')}
              style={inputStyle}
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags</label>
            <div
              className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 min-h-[42px]"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: '#eef2ff', color: COLORS.primary }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:opacity-70"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                {...register('tagsInput')}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Type a tag and press Enter or comma' : 'Add more...'}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                style={{ color: COLORS.text }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
              Press Enter or comma to add a tag.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={createArticle.isPending}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: COLORS.primary }}
            >
              {createArticle.isPending ? 'Creating...' : 'Create Article'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/kb')}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ border: `1px solid ${COLORS.border}`, color: '#64748b' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default KBArticleCreate;
