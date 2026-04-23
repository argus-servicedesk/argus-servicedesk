import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Search, X, Plus, Tag, Clock, AlertCircle,
  ChevronRight, FileText, CheckCircle2, AlertTriangle, Filter,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useAlertKB } from '../../hooks/useProblems';

// ── Types ──────────────────────────────────────────────────────────────────────
interface KBArticle {
  id: string;
  title: string;
  problemNumber?: string;
  state?: string;
  rootCauseAnalysis?: any;
  workaround?: string;
  category?: string;
  tags?: string[];
  updatedAt: string;
  incidents?: { id: string }[];
  _count?: { incidents: number };
}

interface AlertKBEntry {
  id: string;
  name: string;
  description?: string;
  symptoms?: string[];
  resolution?: string;
  remediation?: string;
  category?: string;
  tags?: string[];
}

const CATEGORIES = ['All', 'Infrastructure', 'Application', 'Database', 'Network', 'Security', 'Other'];

const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Infrastructure: { bg: 'rgba(99,102,241,0.12)',  text: '#6366f1', border: 'rgba(99,102,241,0.25)' },
  Application:    { bg: 'rgba(5,150,105,0.12)',   text: '#059669', border: 'rgba(5,150,105,0.25)' },
  Database:       { bg: 'rgba(217,119,6,0.12)',   text: '#D97706', border: 'rgba(217,119,6,0.25)' },
  Network:        { bg: 'rgba(99,102,241,0.12)',   text: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  Security:       { bg: 'rgba(220,38,38,0.12)',   text: '#DC2626', border: 'rgba(220,38,38,0.25)' },
  Other:          { bg: 'rgba(168,85,247,0.12)',   text: '#a855f7', border: 'rgba(168,85,247,0.25)' },
};

function catStyle(cat?: string) {
  return CAT_COLORS[cat || 'Other'] || CAT_COLORS.Other;
}

function guessCategory(article: KBArticle): string {
  const t = (article.title || '').toLowerCase();
  if (t.includes('disk') || t.includes('cpu') || t.includes('memory') || t.includes('node') || t.includes('server')) return 'Infrastructure';
  if (t.includes('db') || t.includes('database') || t.includes('postgres') || t.includes('mysql') || t.includes('redis')) return 'Database';
  if (t.includes('network') || t.includes('icmp') || t.includes('switch') || t.includes('fortigate') || t.includes('ping')) return 'Network';
  if (t.includes('security') || t.includes('ssl') || t.includes('cert') || t.includes('login') || t.includes('auth')) return 'Security';
  if (t.includes('pod') || t.includes('deploy') || t.includes('k8s') || t.includes('kube') || t.includes('container')) return 'Infrastructure';
  if (t.includes('app') || t.includes('service') || t.includes('api') || t.includes('error')) return 'Application';
  return article.category || 'Other';
}

function fmtDate(iso: string) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function rcaSnippet(rca: any): string {
  if (!rca) return '';
  if (typeof rca === 'string') return rca.slice(0, 120);
  if (rca.rootCause) return String(rca.rootCause).slice(0, 120);
  if (rca.summary) return String(rca.summary).slice(0, 120);
  return '';
}

// ── Article Detail Modal ───────────────────────────────────────────────────────
function ArticleModal({ article, onClose }: { article: KBArticle; onClose: () => void }) {
  const cat = guessCategory(article);
  const cs = catStyle(cat);
  const rca = article.rootCauseAnalysis;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(248,250,252,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.20)', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: cs.bg, border: `1px solid ${cs.border}` }}>
              <BookOpen className="w-4 h-4" style={{ color: cs.text }} />
            </div>
            <div>
              {article.problemNumber && (
                <p className="text-[10px] font-mono font-bold tracking-widest uppercase mb-0.5" style={{ color: cs.text }}>
                  {article.problemNumber}
                </p>
              )}
              <h2 className="text-[17px] font-display font-bold leading-snug" style={{ color: '#0f172a' }}>{article.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: cs.bg, color: cs.text, border: `1px solid ${cs.border}` }}>
                  {cat}
                </span>
                <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: '#94a3b8' }}>
                  <Clock className="w-3 h-3" /> {fmtDate(article.updatedAt)}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-colors shrink-0"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Root Cause */}
          {rca && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Root Cause Analysis</p>
              <div className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
                {typeof rca === 'string' ? (
                  <p className="text-[13px] leading-relaxed" style={{ color: '#6366f1' }}>{rca}</p>
                ) : (
                  <div className="space-y-2">
                    {rca.rootCause && <p className="text-[13px]" style={{ color: '#6366f1' }}><span className="font-semibold" style={{ color: '#0f172a' }}>Root Cause:</span> {rca.rootCause}</p>}
                    {rca.impact && <p className="text-[13px]" style={{ color: '#6366f1' }}><span className="font-semibold" style={{ color: '#0f172a' }}>Impact:</span> {rca.impact}</p>}
                    {rca.immediateAction && <p className="text-[13px]" style={{ color: '#6366f1' }}><span className="font-semibold" style={{ color: '#0f172a' }}>Immediate Action:</span> {rca.immediateAction}</p>}
                    {rca.permanentFix && <p className="text-[13px]" style={{ color: '#6366f1' }}><span className="font-semibold" style={{ color: '#0f172a' }}>Permanent Fix:</span> {rca.permanentFix}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workaround */}
          {article.workaround && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Workaround / Resolution</p>
              <div className="flex items-start gap-3 rounded-xl p-4"
                style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.20)' }}>
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#059669' }} />
                <p className="text-[13px] leading-relaxed" style={{ color: '#6366f1' }}>{article.workaround}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((tag, i) => (
                  <span key={i} className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(99,102,241,0.08)', color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related incidents count */}
          {(article._count?.incidents || 0) > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3"
              style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.20)' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#D97706' }} />
              <p className="text-[12px] font-medium" style={{ color: '#D97706' }}>
                {article._count!.incidents} related incident{article._count!.incidents !== 1 ? 's' : ''} linked to this problem
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AlertKB Card (from agentPipeline KB) ──────────────────────────────────────
function AlertKBCard({ entry, onClick }: { entry: AlertKBEntry; onClick: () => void }) {
  const cat = entry.category || 'Other';
  const cs = catStyle(cat);
  return (
    <button onClick={onClick}
      className="text-left rounded-xl p-4 w-full transition-all group"
      style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = cs.border)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)')}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: cs.bg, border: `1px solid ${cs.border}` }}>
          <FileText className="w-3.5 h-3.5" style={{ color: cs.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: '#0f172a' }}>{entry.name}</p>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-colors" style={{ color: '#94a3b8' }} />
          </div>
          {entry.description && (
            <p className="text-[11px] mt-1 leading-relaxed line-clamp-2" style={{ color: '#64748b' }}>{entry.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: cs.bg, color: cs.text, border: `1px solid ${cs.border}` }}>{cat}</span>
            {entry.remediation && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(5,150,105,0.10)', color: '#059669', border: '1px solid rgba(5,150,105,0.20)' }}>
                AUTO-REMEDIABLE
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── AlertKB Detail Modal ───────────────────────────────────────────────────────
function AlertKBModal({ entry, onClose }: { entry: AlertKBEntry; onClose: () => void }) {
  const cat = entry.category || 'Other';
  const cs = catStyle(cat);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(248,250,252,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl"
        style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.20)', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
          <div>
            <h3 className="text-[15px] font-display font-bold" style={{ color: '#0f172a' }}>{entry.name}</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
              style={{ background: cs.bg, color: cs.text, border: `1px solid ${cs.border}` }}>{cat}</span>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {entry.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#94a3b8' }}>Description</p>
              <p className="text-[13px] leading-relaxed" style={{ color: '#6366f1' }}>{entry.description}</p>
            </div>
          )}
          {entry.symptoms && entry.symptoms.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#94a3b8' }}>Symptoms</p>
              <ul className="space-y-1">
                {entry.symptoms.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: '#6366f1' }}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {entry.resolution && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#94a3b8' }}>Resolution Steps</p>
              <div className="rounded-xl p-4" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.20)' }}>
                <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: '#6366f1' }}>{entry.resolution}</p>
              </div>
            </div>
          )}
          {entry.remediation && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#94a3b8' }}>Auto-Remediation Action</p>
              <div className="rounded-xl px-4 py-3 flex items-center gap-2"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#6366f1' }} />
                <p className="text-[12px] font-semibold" style={{ color: '#6366f1' }}>{entry.remediation}</p>
              </div>
            </div>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.08)', color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function KnowledgeBasePage() {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [tab, setTab]             = useState<'kedb' | 'alerts'>('kedb');
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [selectedAlertKB, setSelectedAlertKB] = useState<AlertKBEntry | null>(null);

  // KEDB: problems with KEDB data
  const { data: kedbResp, isLoading: kedbLoading } = useQuery({
    queryKey: ['kb-kedb'],
    queryFn: async () => {
      const { data } = await api.get('/problems?limit=100&state=KNOWN_ERROR');
      return data;
    },
    staleTime: 60000,
  });
  const articles: KBArticle[] = (kedbResp?.data || []).filter((p: KBArticle) =>
    p.rootCauseAnalysis || p.workaround
  );

  // Alert KB from agentPipeline
  const { data: alertKBResp, isLoading: alertKBLoading } = useAlertKB();
  const alertKBRaw = alertKBResp?.data || [];

  // Normalise alertKB entries
  const alertKBEntries: AlertKBEntry[] = alertKBRaw.map((e: any) => ({
    id: e.id || e.name,
    name: e.name || e.alertName || 'Unknown',
    description: e.description,
    symptoms: e.symptoms || (e.symptom ? [e.symptom] : []),
    resolution: e.resolution || e.steps,
    remediation: e.remediation,
    category: e.category || guessAlertCategory(e.name || ''),
    tags: e.tags || [],
  }));

  function guessAlertCategory(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('disk') || n.includes('cpu') || n.includes('mem') || n.includes('host') || n.includes('node')) return 'Infrastructure';
    if (n.includes('kube') || n.includes('pod') || n.includes('deploy') || n.includes('container')) return 'Infrastructure';
    if (n.includes('db') || n.includes('database') || n.includes('connection')) return 'Database';
    if (n.includes('network') || n.includes('icmp') || n.includes('switch') || n.includes('fortigate')) return 'Network';
    if (n.includes('ssl') || n.includes('cert') || n.includes('login') || n.includes('security')) return 'Security';
    if (n.includes('app') || n.includes('api') || n.includes('error') || n.includes('hpa')) return 'Application';
    return 'Other';
  }

  // Filter
  const filteredArticles = articles.filter(a => {
    const cat = guessCategory(a);
    const matchCat = category === 'All' || cat === category;
    const matchSearch = !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.workaround || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredAlertKB = alertKBEntries.filter(e => {
    const matchCat = category === 'All' || e.category === category;
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const isLoading = tab === 'kedb' ? kedbLoading : alertKBLoading;

  return (
    <div className="animate-fade-in relative -m-6 p-6 min-h-screen"
      style={{ background: '#F8FAFC' }}>
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[120px] opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.20) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)' }} />
      </div>

      <div className="relative">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)' }}>
        {/* 3px accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #4F46E5, #818CF8, #A5B4FC, transparent)' }} />
        {/* Dot-grid texture */}
        <div className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/4 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.45) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.35) 0%, transparent 70%)' }} />

        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(79,70,229,0.20)', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
                <BookOpen className="w-5 h-5" style={{ color: '#A5B4FC' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#A5B4FC' }}>Intelligence</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                  <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>Knowledge Base</span>
                </div>
                <h1 className="text-[22px] font-display font-bold tracking-tight" style={{ color: '#ffffff' }}>Knowledge Base</h1>
                <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  KEDB articles, alert patterns, resolution guides
                </p>
              </div>
            </div>
            {canEdit && (
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Plus className="w-4 h-4" />
                Create Article
              </button>
            )}
          </div>

          {/* Hero KPI cards */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-3.5 h-3.5" style={{ color: '#A5B4FC' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>KEDB Articles</span>
              </div>
              <p className="text-[22px] font-extrabold font-mono" style={{ color: '#ffffff' }}>{articles.length}</p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-3.5 h-3.5" style={{ color: '#A5B4FC' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Alert Patterns</span>
              </div>
              <p className="text-[22px] font-extrabold font-mono" style={{ color: '#ffffff' }}>{alertKBEntries.length}</p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Tag className="w-3.5 h-3.5" style={{ color: '#A5B4FC' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Categories</span>
              </div>
              <p className="text-[22px] font-extrabold font-mono" style={{ color: '#ffffff' }}>{CATEGORIES.length - 1}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-0.5 mt-0 mb-4" style={{ background: 'linear-gradient(90deg, #4F46E5, #818CF8, #A5B4FC, transparent)' }} />

      {/* ── Layout ── */}
      <div className="flex gap-4 pt-0 pb-6">

        {/* Left: category filter */}
        <div className="w-44 shrink-0">
          <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                <Filter className="w-3 h-3" /> Category
              </p>
            </div>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="w-full text-left px-3 py-2 text-[12px] font-medium transition-colors"
                style={
                  category === cat
                    ? { background: 'rgba(99,102,241,0.12)', color: '#6366f1', borderLeft: '2px solid #6366f1' }
                    : { color: '#64748b', borderLeft: '2px solid transparent' }
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tab switcher */}
          <div className="rounded-xl overflow-hidden mt-3" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Source</p>
            </div>
            {[
              { key: 'kedb', label: 'KEDB (Problems)', icon: BookOpen },
              { key: 'alerts', label: 'Alert Patterns', icon: AlertCircle },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as 'kedb' | 'alerts')}
                className="w-full text-left px-3 py-2 text-[12px] font-medium transition-colors flex items-center gap-2"
                style={
                  tab === t.key
                    ? { background: 'rgba(99,102,241,0.12)', color: '#6366f1', borderLeft: '2px solid #6366f1' }
                    : { color: '#64748b', borderLeft: '2px solid transparent' }
                }
              >
                <t.icon className="w-3.5 h-3.5 shrink-0" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: articles */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search knowledge base..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] focus:outline-none"
              style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a', backdropFilter: 'blur(12px)' }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2">
              <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
              <span className="text-[12px] font-mono" style={{ color: '#64748b' }}>Loading knowledge base...</span>
            </div>
          )}

          {/* KEDB Articles */}
          {tab === 'kedb' && !isLoading && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-mono" style={{ color: '#64748b' }}>{filteredArticles.length} articles</span>
              </div>
              {filteredArticles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                  style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <BookOpen className="w-10 h-10 mb-3" style={{ color: '#94a3b8' }} />
                  <p className="text-[13px] font-mono" style={{ color: '#64748b' }}>No KEDB articles found</p>
                  <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>Problems in KNOWN_ERROR state with RCA/workaround appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredArticles.map(a => {
                    const cat = guessCategory(a);
                    const cs = catStyle(cat);
                    const snippet = rcaSnippet(a.rootCauseAnalysis);
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelectedArticle(a)}
                        className="text-left rounded-xl p-4 transition-all group"
                        style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = cs.border)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)')}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: cs.bg, border: `1px solid ${cs.border}` }}>
                            <BookOpen className="w-3.5 h-3.5" style={{ color: cs.text }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] font-semibold truncate" style={{ color: '#0f172a' }}>{a.title}</p>
                              <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-colors" style={{ color: '#94a3b8' }} />
                            </div>
                            {snippet && (
                              <p className="text-[11px] mt-1 leading-relaxed line-clamp-2" style={{ color: '#64748b' }}>{snippet}...</p>
                            )}
                            {a.workaround && !snippet && (
                              <p className="text-[11px] mt-1 line-clamp-2" style={{ color: '#64748b' }}>{a.workaround}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {a.problemNumber && (
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                                  style={{ background: 'rgba(99,102,241,0.08)', color: '#64748b' }}>{a.problemNumber}</span>
                              )}
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                                style={{ background: cs.bg, color: cs.text, border: `1px solid ${cs.border}` }}>{cat}</span>
                              {a.tags && a.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgba(99,102,241,0.06)', color: '#94a3b8' }}>
                                  <Tag className="w-2 h-2" />{tag}
                                </span>
                              ))}
                              <span className="text-[9px] font-mono ml-auto flex items-center gap-1" style={{ color: '#94a3b8' }}>
                                <Clock className="w-2.5 h-2.5" />{fmtDate(a.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Alert KB */}
          {tab === 'alerts' && !isLoading && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-mono" style={{ color: '#64748b' }}>{filteredAlertKB.length} patterns</span>
              </div>
              {filteredAlertKB.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                  style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <AlertCircle className="w-10 h-10 mb-3" style={{ color: '#94a3b8' }} />
                  <p className="text-[13px] font-mono" style={{ color: '#64748b' }}>No alert patterns found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredAlertKB.map(e => (
                    <AlertKBCard key={e.id} entry={e} onClick={() => setSelectedAlertKB(e)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedArticle && <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />}
      {selectedAlertKB && <AlertKBModal entry={selectedAlertKB} onClose={() => setSelectedAlertKB(null)} />}
      </div>
    </div>
  );
}
