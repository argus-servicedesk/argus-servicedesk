import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye, Calendar, User, Tag, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useKBArticle, useSubmitKBFeedback } from '../../hooks/useKnowledgeBase';

function formatDate(d: string | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PortalArticleView() {
  const { id } = useParams<{ id: string }>();
  const { data: articleData, isLoading } = useKBArticle(id ?? '');
  const submitFeedback = useSubmitKBFeedback();
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);

  const article = articleData?.data ?? articleData;

  const handleFeedback = (helpful: boolean) => {
    if (!id) return;
    submitFeedback.mutate(
      { articleId: id, helpful },
      {
        onSuccess: () => {
          setFeedbackSent(helpful);
          toast.success(helpful ? 'Glad it helped!' : 'Thanks for the feedback.');
        },
        onError: () => {
          toast.error('Failed to submit feedback.');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: '#e2e8f0', borderTopColor: '#6366f1' }}
        />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-sm" style={{ color: '#64748b' }}>
          Article not found.
        </p>
        <Link
          to="/portal/knowledge-base"
          className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
          style={{ color: '#6366f1' }}
        >
          <ArrowLeft size={14} />
          Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link
        to="/portal/knowledge-base"
        className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
        style={{ color: '#6366f1' }}
      >
        <ArrowLeft size={14} />
        Back to Knowledge Base
      </Link>

      {/* Article Card */}
      <article
        className="rounded-xl border p-6 sm:p-8"
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
      >
        {/* Category */}
        {(article.categoryName || article.category) && (
          <span
            className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: '#eef2ff', color: '#6366f1' }}
          >
            {article.categoryName ?? article.category}
          </span>
        )}

        {/* Title */}
        <h1 className="mb-4 text-2xl font-bold leading-tight" style={{ color: '#0f172a' }}>
          {article.title}
        </h1>

        {/* Meta */}
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm" style={{ color: '#94a3b8' }}>
          {article.author && (
            <span className="inline-flex items-center gap-1.5">
              <User size={14} />
              {typeof article.author === 'object'
                ? `${article.author.firstName ?? ''} ${article.author.lastName ?? ''}`.trim()
                : article.author}
            </span>
          )}
          {article.publishedAt && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(article.publishedAt)}
            </span>
          )}
          {article.viewCount != null && (
            <span className="inline-flex items-center gap-1.5">
              <Eye size={14} />
              {article.viewCount} views
            </span>
          )}
        </div>

        {/* Content */}
        <div
          className="prose prose-sm max-w-none"
          style={{ color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: '1.75' }}
        >
          {article.content}
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-6" style={{ borderColor: '#e2e8f0' }}>
            <Tag size={14} style={{ color: '#94a3b8' }} />
            {article.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-md px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: '#F8FAFC', color: '#64748b', border: '1px solid #e2e8f0' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Feedback */}
      <div
        className="rounded-xl border p-6 text-center"
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
      >
        {feedbackSent !== null ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle size={18} style={{ color: '#059669' }} />
            <span className="text-sm font-medium" style={{ color: '#065f46' }}>
              Thank you for your feedback!
            </span>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium" style={{ color: '#0f172a' }}>
              Was this article helpful?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleFeedback(true)}
                disabled={submitFeedback.isPending}
                className="inline-flex items-center gap-2 rounded-lg border px-5 py-2 text-sm font-medium transition-colors hover:bg-green-50 disabled:opacity-50"
                style={{ borderColor: '#e2e8f0', color: '#059669' }}
              >
                <ThumbsUp size={16} />
                Yes
              </button>
              <button
                onClick={() => handleFeedback(false)}
                disabled={submitFeedback.isPending}
                className="inline-flex items-center gap-2 rounded-lg border px-5 py-2 text-sm font-medium transition-colors hover:bg-red-50 disabled:opacity-50"
                style={{ borderColor: '#e2e8f0', color: '#ef4444' }}
              >
                <ThumbsDown size={16} />
                No
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
