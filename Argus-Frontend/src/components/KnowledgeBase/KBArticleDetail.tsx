import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Calendar,
  User,
  Tag,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  useKBArticle,
  useUpdateKBArticle,
  useSubmitKBFeedback,
} from '../../hooks/useKnowledgeBase';
import type { KBArticle, KBArticleState, KBFeedback } from '../../types/index';

const COLORS = {
  primary: '#6366f1',
  surface: '#ffffff',
  background: '#F8FAFC',
  border: '#e2e8f0',
  text: '#0f172a',
};

const STATE_BADGE: Record<KBArticleState, { bg: string; text: string }> = {
  DRAFT: { bg: '#f1f5f9', text: '#475569' },
  REVIEW: { bg: '#fef3c7', text: '#92400e' },
  PUBLISHED: { bg: '#dcfce7', text: '#166534' },
  ARCHIVED: { bg: '#f3f4f6', text: '#6b7280' },
};

const TRANSITIONS: Record<KBArticleState, { label: string; to: KBArticleState; color: string }[]> = {
  DRAFT: [
    { label: 'Submit for Review', to: 'REVIEW', color: '#f59e0b' },
    { label: 'Publish', to: 'PUBLISHED', color: '#22c55e' },
  ],
  REVIEW: [
    { label: 'Publish', to: 'PUBLISHED', color: '#22c55e' },
    { label: 'Return to Draft', to: 'DRAFT', color: '#64748b' },
  ],
  PUBLISHED: [
    { label: 'Archive', to: 'ARCHIVED', color: '#6b7280' },
    { label: 'Revert to Draft', to: 'DRAFT', color: '#64748b' },
  ],
  ARCHIVED: [
    { label: 'Restore to Draft', to: 'DRAFT', color: '#64748b' },
  ],
};

function KBArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const { data: articleData, isLoading } = useKBArticle(id ?? '');
  const updateArticle = useUpdateKBArticle();
  const submitFeedback = useSubmitKBFeedback();

  const article: KBArticle | undefined = articleData?.data;

  const formatDate = (d: string) => {
    const date = new Date(d);
    if (!d || Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    if (!d || Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleStateChange = (newState: KBArticleState) => {
    if (!id) return;
    updateArticle.mutate(
      { id, data: { state: newState } },
      {
        onSuccess: () => toast.success(`Article moved to ${newState}`),
        onError: () => toast.error('Failed to update state'),
      }
    );
  };

  const handleFeedback = (helpful: boolean) => {
    if (!id) return;
    submitFeedback.mutate(
      { articleId: id, helpful },
      {
        onSuccess: () => toast.success('Thank you for your feedback!'),
        onError: () => toast.error('Failed to submit feedback'),
      }
    );
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: '100vh', backgroundColor: COLORS.background }}
      >
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          Loading article...
        </p>
      </div>
    );
  }

  if (!article) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4"
        style={{ minHeight: '100vh', backgroundColor: COLORS.background }}
      >
        <BookOpen size={48} style={{ color: '#cbd5e1' }} />
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          Article not found.
        </p>
        <button
          onClick={() => navigate('/kb')}
          className="text-sm font-medium"
          style={{ color: COLORS.primary }}
        >
          Back to Knowledge Base
        </button>
      </div>
    );
  }

  const badge = STATE_BADGE[article.state];
  const transitions = TRANSITIONS[article.state] ?? [];
  const feedbackList: KBFeedback[] = article.feedback ?? [];
  const helpfulCount = feedbackList.filter((f) => f.helpful).length;
  const notHelpfulCount = feedbackList.filter((f) => !f.helpful).length;

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
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/kb')}
            className="flex items-center gap-1.5 text-indigo-200 text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Knowledge Base
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{article.title}</h1>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {article.state}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-200">
                {article.author && (
                  <span className="flex items-center gap-1.5">
                    <User size={14} />
                    {article.author.firstName} {article.author.lastName}
                  </span>
                )}
                {article.publishedAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    Published {formatDate(article.publishedAt)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Eye size={14} />
                  {article.viewCount} views
                </span>
                {article.category && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={14} />
                    {article.category.name}
                  </span>
                )}
              </div>

              {article.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <Tag size={14} className="text-indigo-300" />
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#e0e7ff' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* State Transitions */}
        {canManage('kb') && transitions.length > 0 && (
          <div
            className="rounded-xl p-4 flex flex-wrap items-center gap-3"
            style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <span className="text-sm font-medium mr-1" style={{ color: '#64748b' }}>
              Actions:
            </span>
            {transitions.map((t) => (
              <button
                key={t.to}
                onClick={() => handleStateChange(t.to)}
                disabled={updateArticle.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: t.color }}
              >
                <ChevronRight size={14} />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Article Content */}
        <div
          className="rounded-xl p-8"
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          {article.excerpt && (
            <p
              className="text-sm italic mb-6 pb-4"
              style={{ color: '#64748b', borderBottom: `1px solid ${COLORS.border}` }}
            >
              {article.excerpt}
            </p>
          )}
          <div
            className="prose max-w-none"
            style={{
              color: COLORS.text,
              fontSize: 15,
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
            }}
          >
            {article.content}
          </div>
        </div>

        {/* Feedback Section */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <h2
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ color: COLORS.text }}
          >
            <ThumbsUp size={18} style={{ color: COLORS.primary }} />
            Feedback
          </h2>

          {/* Stats */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#dcfce7', color: '#166534' }}
              >
                <ThumbsUp size={14} />
                {helpfulCount} Helpful
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
              >
                <ThumbsDown size={14} />
                {notHelpfulCount} Not Helpful
              </div>
            </div>
          </div>

          {/* Quick Feedback Buttons */}
          <div
            className="flex items-center gap-3 mb-6 pb-6"
            style={{ borderBottom: `1px solid ${COLORS.border}` }}
          >
            <span className="text-sm" style={{ color: '#64748b' }}>
              Was this article helpful?
            </span>
            <button
              onClick={() => handleFeedback(true)}
              disabled={submitFeedback.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-green-50 disabled:opacity-50"
              style={{ border: `1px solid #bbf7d0`, color: '#166534' }}
            >
              <ThumbsUp size={14} />
              Yes
            </button>
            <button
              onClick={() => handleFeedback(false)}
              disabled={submitFeedback.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-50 disabled:opacity-50"
              style={{ border: `1px solid #fecaca`, color: '#991b1b' }}
            >
              <ThumbsDown size={14} />
              No
            </button>
          </div>

          {/* Recent Feedback Comments */}
          <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.text }}>
            Recent Feedback
          </h3>
          {feedbackList.length === 0 && (
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              No feedback yet.
            </p>
          )}
          <div className="space-y-3">
            {feedbackList.slice(0, 10).map((fb) => (
              <div
                key={fb.id}
                className="flex items-start gap-3 rounded-lg p-3"
                style={{ backgroundColor: COLORS.background }}
              >
                <div
                  className="mt-0.5 rounded-full p-1.5"
                  style={{
                    backgroundColor: fb.helpful ? '#dcfce7' : '#fee2e2',
                  }}
                >
                  {fb.helpful ? (
                    <ThumbsUp size={12} style={{ color: '#166534' }} />
                  ) : (
                    <ThumbsDown size={12} style={{ color: '#991b1b' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {fb.user && (
                      <span className="text-sm font-medium" style={{ color: COLORS.text }}>
                        {fb.user.firstName} {fb.user.lastName}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#94a3b8' }}>
                      <Clock size={10} />
                      {formatDateTime(fb.createdAt)}
                    </span>
                  </div>
                  {fb.comment && (
                    <p className="text-sm" style={{ color: '#64748b' }}>
                      {fb.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KBArticleDetail;
