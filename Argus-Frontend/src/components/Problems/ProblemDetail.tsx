import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowLeft,
  Bug,
  Clock,
  User,
  Target,
  Link2,
  ChevronRight,
  AlertTriangle,
  Send,
  Lightbulb,
  Loader2,
  Pencil,
  X,
  Save,
  ChevronDown,
  UserPlus,
  CheckCircle,
  Brain,
  Shield,
  BookOpen,
  Zap,
  Terminal,
  Activity,
  Server,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProblem, useUpdateProblem, useAiRCA, useAlertKB } from '../../hooks/useProblems';
import { useTeams } from '../../hooks/useTeams';
import api from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'P1' | 'P2' | 'P3' | 'P4';
type ProblemState = 'NEW' | 'INVESTIGATION' | 'RCA_IN_PROGRESS' | 'KNOWN_ERROR' | 'RESOLVED' | 'CLOSED';

interface WorkNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const priorityStyle: Record<Priority, { bg: string; color: string; border: string }> = {
  P1: { bg: 'rgba(239,68,68,0.15)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' },
  P2: { bg: 'rgba(245,158,11,0.15)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' },
  P3: { bg: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.3)' },
  P4: { bg: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' },
};

const stateStyleMap: Record<ProblemState, { bg: string; color: string; border: string }> = {
  NEW:             { bg: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.3)' },
  INVESTIGATION:   { bg: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  RCA_IN_PROGRESS: { bg: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.3)' },
  KNOWN_ERROR:     { bg: 'rgba(220,38,38,0.15)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' },
  RESOLVED:        { bg: 'rgba(5,150,105,0.15)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)' },
  CLOSED:          { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' },
};

const stateLabel: Record<ProblemState, string> = {
  NEW: 'New',
  INVESTIGATION: 'Investigating',
  RCA_IN_PROGRESS: 'RCA Identified',
  KNOWN_ERROR: 'Known Error',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── State Transitions ──────────────────────────────────────────────────────

const PROBLEM_TRANSITIONS: Record<string, string[]> = {
  NEW:                    ['INVESTIGATION'],
  INVESTIGATION:          ['RCA_IN_PROGRESS', 'KNOWN_ERROR'],
  RCA_IN_PROGRESS:  ['KNOWN_ERROR', 'RESOLVED'],
  KNOWN_ERROR:            ['RESOLVED'],
  RESOLVED:               ['CLOSED'],
  CLOSED:                 [],
};

const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Database', 'Security', 'Cloud', 'Infrastructure', 'Application', 'Configuration', 'Human Error', 'Other'];

// ─── Modals ─────────────────────────────────────────────────────────────────

function EditProblemModal({ problem, onClose }: { problem: any; onClose: () => void }) {
  const updateProblem = useUpdateProblem();
  const [form, setForm] = useState({
    shortDescription: problem.shortDescription || '',
    description: problem.description || '',
    priority: problem.priority || 'P3',
    category: problem.category || '',
    workaround: problem.workaround || '',
    rootCause: problem.rootCause || '',
  });

  const handleSave = async () => {
    try {
      const data: any = {};
      if (form.shortDescription !== problem.shortDescription) data.shortDescription = form.shortDescription;
      if (form.description !== (problem.description || '')) data.description = form.description;
      if (form.priority !== problem.priority) data.priority = form.priority;
      if (form.category !== (problem.category || '')) data.category = form.category;
      if (form.workaround !== (problem.workaround || '')) data.workaround = form.workaround;
      if (form.rootCause !== (problem.rootCause || '')) data.rootCause = form.rootCause;
      if (Object.keys(data).length === 0) { onClose(); return; }
      await updateProblem.mutateAsync({ id: problem.id, data });
      toast.success('Problem updated');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update');
    }
  };

  const darkInputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a', borderRadius: '8px', padding: '8px 12px', width: '100%', fontSize: '14px', outline: 'none' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full max-w-lg p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.2)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: '#0f172a' }}>Edit Problem</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: '#94a3b8' }}><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Short Description *</label>
            <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} style={darkInputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="resize-y" style={darkInputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={darkInputStyle}>
                {PRIORITIES.map((v) => <option key={v} value={v} style={{ background: '#ffffff' }}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={darkInputStyle}>
                <option value="" style={{ background: '#ffffff' }}>Select...</option>
                {CATEGORIES.map((v) => <option key={v} value={v} style={{ background: '#ffffff' }}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Root Cause</label>
            <textarea rows={2} value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} className="resize-y" style={darkInputStyle} placeholder="Root cause analysis..." />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Workaround</label>
            <textarea rows={2} value={form.workaround} onChange={(e) => setForm({ ...form, workaround: e.target.value })} className="resize-y" style={darkInputStyle} placeholder="Known workaround..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>Cancel</button>
          <button onClick={handleSave} disabled={updateProblem.isPending || !form.shortDescription.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(99,102,241,0.5)', opacity: (updateProblem.isPending || !form.shortDescription.trim()) ? 0.6 : 1 }}>
            {updateProblem.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignProblemModal({ problem, onClose }: { problem: any; onClose: () => void }) {
  const updateProblem = useUpdateProblem();
  const { data: teamsData } = useTeams();
  const teams = teamsData?.data || [];
  const [selectedTeam, setSelectedTeam] = useState(problem.assignmentGroupId || '');
  const [selectedUser, setSelectedUser] = useState(problem.assignedToId || '');
  const currentTeam = teams.find((t: any) => t.id === selectedTeam);
  const members = currentTeam?.members || [];

  const handleAssign = async () => {
    try {
      const data: any = {};
      if (selectedTeam && selectedTeam !== problem.assignmentGroupId) data.assignmentGroupId = selectedTeam;
      if (selectedUser && selectedUser !== problem.assignedToId) data.assignedToId = selectedUser;
      if (Object.keys(data).length === 0) { onClose(); return; }
      await updateProblem.mutateAsync({ id: problem.id, data });
      toast.success('Problem assigned');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to assign');
    }
  };

  const darkInputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.15)', color: '#0f172a', borderRadius: '8px', padding: '8px 12px', width: '100%', fontSize: '14px', outline: 'none' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full max-w-md p-6 space-y-4 shadow-2xl animate-fade-in rounded-2xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.2)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: '#0f172a' }}>Assign Problem</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: '#94a3b8' }}><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Assignment Group</label>
            <select value={selectedTeam} onChange={(e) => { setSelectedTeam(e.target.value); setSelectedUser(''); }} style={darkInputStyle}>
              <option value="" style={{ background: '#ffffff' }}>Select team...</option>
              {teams.map((t: any) => <option key={t.id} value={t.id} style={{ background: '#ffffff' }}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Assign To</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={darkInputStyle}>
              <option value="" style={{ background: '#ffffff' }}>Select member...</option>
              {members.map((m: any) => {
                const user = m.user || m;
                return <option key={user.id} value={user.id} style={{ background: '#ffffff' }}>{user.firstName} {user.lastName}</option>;
              })}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>Cancel</button>
          <button onClick={handleAssign} disabled={updateProblem.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(99,102,241,0.5)', opacity: updateProblem.isPending ? 0.6 : 1 }}>
            {updateProblem.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

function ProblemStateDropdown({ problem }: { problem: any }) {
  const updateProblem = useUpdateProblem();
  const [open, setOpen] = useState(false);
  const allowed = PROBLEM_TRANSITIONS[problem.state] || [];
  if (allowed.length === 0) return null;

  const labels: Record<string, string> = {
    INVESTIGATION: 'Investigating',
    RCA_IN_PROGRESS: 'RCA Identified',
    KNOWN_ERROR: 'Known Error',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };

  const handleTransition = async (newState: string) => {
    setOpen(false);
    try {
      const data: any = { state: newState };
      if (newState === 'KNOWN_ERROR') data.isKnownError = true;
      await updateProblem.mutateAsync({ id: problem.id, data });
      toast.success(`State changed to ${labels[newState] || newState}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'State change failed');
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <ChevronDown size={14} /> Change State
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg py-1 shadow-xl animate-fade-in" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.2)' }}>
            {allowed.map((s) => (
              <button key={s} onClick={() => handleTransition(s)} className="w-full text-left px-3 py-2 text-sm transition-colors" style={{ color: '#334155' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {labels[s] || s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Confidence Arc Gauge ────────────────────────────────────────────────────

function ConfidenceGauge({ value }: { value: number }) {
  const angle = (value / 100) * 180;
  const radians = (angle - 90) * (Math.PI / 180);
  const r = 40;
  const cx = 50, cy = 50;
  const x = cx + r * Math.cos(radians);
  const y = cy + r * Math.sin(radians);
  const largeArc = angle > 90 ? 1 : 0;
  const color = value >= 70 ? '#6EE7B7' : value >= 40 ? '#FCD34D' : '#FCA5A5';
  const trackColor = 'rgba(99,102,241,0.15)';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 60" className="w-24 h-14">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={trackColor} strokeWidth="6" strokeLinecap="round" />
        <path d={`M 10 50 A 40 40 0 ${largeArc} 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className="text-lg font-display font-bold" style={{ color }}>{value}%</span>
      <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Confidence</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'rca' | 'worknotes' | 'related'>('details');
  const [newNote, setNewNote] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);

  const { data: problemData, isLoading, isError, refetch } = useProblem(id || '');
  const aiRCA = useAiRCA();
  const { data: kbData } = useAlertKB();
  const alertKBEntries: any[] = kbData?.data || [];

  const prb = problemData?.data;
  const worknotes: WorkNote[] = (prb?.workNotes || []).map((note: any) => {
    const authorName = typeof note.author === 'object'
      ? [note.author?.firstName, note.author?.lastName].filter(Boolean).join(' ')
      : typeof note.user === 'object'
      ? [note.user?.firstName, note.user?.lastName].filter(Boolean).join(' ')
      : (note.author || note.user || 'Unknown');
    return { ...note, author: authorName };
  });
  const relatedIncidents = (prb?.linkedIncidents || []).map((li: any) => ({
    id: li.incident?.id || li.id,
    number: li.incident?.number || li.number || '',
    title: li.incident?.shortDescription || li.title || '',
    priority: li.incident?.priority,
    state: li.incident?.state,
    alertName: li.incident?.alertName,
  }));
  const relatedChanges = prb?.relatedChangeId
    ? [{ id: prb.relatedChangeId, number: '', title: 'Related Change' }]
    : [];

  const rca = prb?.rootCauseAnalysis as any;

  const assignedToName = typeof prb?.assignedTo === 'object'
    ? [prb.assignedTo?.firstName, prb.assignedTo?.lastName].filter(Boolean).join(' ') || 'Unassigned'
    : (prb?.assignedTo || 'Unassigned');
  const assignmentGroupName = typeof prb?.assignmentGroup === 'object'
    ? (prb.assignmentGroup?.name || 'Unassigned')
    : (prb?.assignmentGroup || 'Unassigned');

  // Match KB entries based on linked incident alert names
  const matchedKBEntries = alertKBEntries.filter((kb: any) => {
    const kbKey = kb.key?.toLowerCase() || '';
    return relatedIncidents.some((inc: any) => {
      const alertName = (inc.alertName || inc.title || '').toLowerCase();
      return alertName.includes(kbKey) || kbKey.includes(alertName.split(/[^a-z]/)[0]);
    });
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setNoteLoading(true);
    try {
      await api.post(`/problems/${id}/notes`, { content: newNote });
      toast.success('Work note added');
      setNewNote('');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add note');
    } finally { setNoteLoading(false); }
  };

  const handleAiRCA = async () => {
    if (!id) return;
    try {
      await aiRCA.mutateAsync(id);
      toast.success('AI root cause analysis complete');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'AI analysis failed');
    }
  };

  const handleAcceptRCA = async () => {
    if (!id || !rca) return;
    try {
      const updateData: any = {
        rootCause: rca.rootCause,
        state: 'RCA_IN_PROGRESS',
      };
      if (rca.workaround) updateData.workaround = rca.workaround;
      if (rca.permanentFix) updateData.permanentFix = rca.permanentFix;
      if (rca.category) updateData.category = rca.category;
      await api.patch(`/problems/${id}`, updateData);
      toast.success('RCA accepted \u2014 state moved to RCA In Progress');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to accept RCA');
    }
  };

  const handleApplyKB = async (kb: any) => {
    if (!id) return;
    try {
      await api.patch(`/problems/${id}/rca`, {
        rootCause: kb.rootCauses.join('; '),
        workaround: kb.remediate?.[0] || '',
      });
      toast.success('KB applied to root cause');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to apply KB');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin" style={{ color: '#6366f1' }} />
      </div>
    );
  }

  if (isError || !prb) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={32} style={{ color: '#DC2626' }} />
        <p style={{ color: '#64748b' }}>Failed to load problem</p>
        <button onClick={() => navigate('/problems')} className="text-sm px-3 py-1.5 rounded-lg" style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>Back to Problems</button>
      </div>
    );
  }

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'rca', label: 'Root Cause' },
    { key: 'worknotes', label: 'Work Notes', count: worknotes.length },
    { key: 'related', label: 'Related', count: relatedIncidents.length + relatedChanges.length },
  ] as const;

  const priMeta = priorityStyle[(prb.priority as Priority) || 'P3'] || priorityStyle.P3;
  const stMeta = stateStyleMap[(prb.state as ProblemState) || 'NEW'] || stateStyleMap.NEW;

  return (
    <div className="animate-fade-in space-y-0" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 40%, #f8fafc 100%)', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #6d28d9 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)', filter: 'blur(70px)' }} />

        <div className="relative px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate('/problems')} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
              <ArrowLeft size={14} /> Problems
            </button>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span className="font-mono text-sm" style={{ color: '#ddd6fe' }}>{prb.number}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 flex-wrap mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold" style={{ background: priMeta.bg, color: priMeta.color, border: priMeta.border }}>{prb.priority}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: stMeta.bg, color: stMeta.color, border: stMeta.border }}>{stateLabel[prb.state as keyof typeof stateLabel]}</span>
                {prb.category && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>{prb.category}</span>}
              </div>
              <h1 className="text-xl font-display font-bold" style={{ color: '#ffffff' }}>{prb.shortDescription}</h1>
              <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span className="flex items-center gap-1.5"><User size={14} /> {assignedToName}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> {relativeTime(prb.createdAt)}</span>
                <span className="flex items-center gap-1.5"><AlertTriangle size={14} style={{ color: '#fbbf24' }} /> {relatedIncidents.length} linked incidents</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowEditModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.12)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.12)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
                <UserPlus size={13} /> Assign
              </button>
              <ProblemStateDropdown problem={prb} />
            </div>
          </div>
        </div>
        {/* Divider */}
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #ddd6fe, transparent)' }} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-2 rounded-t-xl" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(255,255,255,0.4)' }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="px-4 py-2.5 text-sm font-medium transition-colors relative" style={{ color: activeTab === tab.key ? '#334155' : '#94a3b8' }}>
            {tab.label}
            {'count' in tab && tab.count > 0 && <span className="ml-1.5 text-xs" style={{ color: '#94a3b8' }}>({tab.count})</span>}
            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#6366f1' }} />}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
          <div className="lg:col-span-2 rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: '#64748b' }}>Description</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#334155' }}>{prb.description}</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl p-5 space-y-3" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
              <h3 className="text-sm font-medium mb-2" style={{ color: '#64748b' }}>Properties</h3>
              {[
                ['Category', prb.category || 'N/A'],
                ['Assignment Group', assignmentGroupName],
                ['Assigned To', assignedToName],
                ['Created', formatDate(prb.createdAt)],
                ['Updated', formatDate(prb.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span className="font-mono text-xs" style={{ color: '#0f172a' }}>{value}</span>
                </div>
              ))}
            </div>
            {prb.workaround && (
              <div className="rounded-xl p-5" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', backdropFilter: 'blur(12px)' }}>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: '#D97706' }}><Lightbulb size={14} /> Workaround</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{prb.workaround}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Root Cause Tab */}
      {activeTab === 'rca' && (
        <div className="space-y-5 mt-5">
          {/* 1. AI Root Cause Suggestion Panel */}
          <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#0f172a' }}>
                <Brain size={16} style={{ color: '#334155' }} />
                AI Root Cause Analysis
              </h3>
              <button
                onClick={handleAiRCA}
                disabled={aiRCA.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
                {aiRCA.isPending ? (<><Loader2 size={13} className="animate-spin" /> Analyzing...</>) : (<><Zap size={13} /> Analyze with AI</>)}
              </button>
            </div>

            {/* AI Loading State */}
            {aiRCA.isPending && (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 animate-pulse" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Brain size={28} style={{ color: '#334155' }} />
                </div>
                <p className="text-sm" style={{ color: '#64748b' }}>Analyzing linked incidents and knowledge base...</p>
                <p className="text-[10px] font-mono mt-1" style={{ color: '#94a3b8' }}>Ollama Qwen3-32B + ALERT_KB ({alertKBEntries.length} entries)</p>
              </div>
            )}

            {/* AI Results */}
            {rca && !aiRCA.isPending && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center justify-center">
                    <ConfidenceGauge value={rca.confidence || 0} />
                  </div>
                  <div className="md:col-span-3 space-y-3">
                    <div className="flex items-center gap-2">
                      {rca.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.3)' }}>
                          {rca.category}
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.12)' }}>
                      <p className="text-sm font-medium mb-2" style={{ color: '#0f172a' }}>Root Cause</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{rca.rootCause}</p>
                    </div>
                  </div>
                </div>

                {/* Evidence */}
                {rca.evidence?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#64748b' }}><Activity size={12} /> Evidence</p>
                    <div className="space-y-1">
                      {rca.evidence.map((ev: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm" style={{ color: '#334155' }}>
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#334155' }} />
                          {ev}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workaround + Fix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rca.workaround && (
                    <div className="rounded-lg p-3" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}>
                      <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: '#D97706' }}><Lightbulb size={11} /> Suggested Workaround</p>
                      <p className="text-xs" style={{ color: '#334155' }}>{rca.workaround}</p>
                    </div>
                  )}
                  {rca.permanentFix && (
                    <div className="rounded-lg p-3" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: '#059669' }}><CheckCircle size={11} /> Suggested Permanent Fix</p>
                      <p className="text-xs" style={{ color: '#334155' }}>{rca.permanentFix}</p>
                    </div>
                  )}
                </div>

                {/* Accept Button */}
                <button
                  onClick={handleAcceptRCA}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(5,150,105,0.15)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(5,150,105,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(5,150,105,0.15)')}>
                  <CheckCircle size={13} />
                  Accept RCA & Advance State
                </button>
              </div>
            )}

            {/* No RCA yet */}
            {!rca && !aiRCA.isPending && (
              <div className="text-center py-6">
                <Brain size={32} className="mx-auto mb-2" style={{ color: '#94a3b8' }} />
                <p className="text-sm" style={{ color: '#94a3b8' }}>Click "Analyze with AI" to generate a root cause suggestion</p>
                <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>Uses linked incidents, ALERT_KB, and Ollama AI</p>
              </div>
            )}
          </div>

          {/* 2. Impact Blast Radius */}
          <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#0f172a' }}>
              <Shield size={14} style={{ color: '#DC2626' }} />
              Impact & Blast Radius
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <AlertTriangle size={18} className="mx-auto mb-1" style={{ color: '#D97706' }} />
                <p className="text-lg font-display font-bold" style={{ color: '#0f172a' }}>{relatedIncidents.length}</p>
                <p className="text-[10px]" style={{ color: '#94a3b8' }}>Linked Incidents</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <Server size={18} className="mx-auto mb-1" style={{ color: '#334155' }} />
                <p className="text-lg font-display font-bold" style={{ color: '#0f172a' }}>{prb.category || '\u2014'}</p>
                <p className="text-[10px]" style={{ color: '#94a3b8' }}>Category</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <Users size={18} className="mx-auto mb-1" style={{ color: '#64748b' }} />
                <p className="text-lg font-display font-bold" style={{ color: '#0f172a' }}>{assignmentGroupName}</p>
                <p className="text-[10px]" style={{ color: '#94a3b8' }}>Team Impacted</p>
              </div>
            </div>
          </div>

          {/* 3. Evidence Chain */}
          {relatedIncidents.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#0f172a' }}>
                <Activity size={14} style={{ color: '#D97706' }} />
                Evidence Chain
              </h3>
              <div className="space-y-0">
                {relatedIncidents.map((inc: any, idx: number) => (
                  <div key={inc.id} className="relative">
                    <div className="flex items-start gap-3 py-2.5">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' }}>
                          {idx + 1}
                        </div>
                        {idx < relatedIncidents.length - 1 && <div className="w-px h-6 mt-1" style={{ background: 'rgba(99,102,241,0.15)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => navigate(`/incidents/${inc.id}`)} className="text-xs font-mono hover:underline" style={{ color: '#334155' }}>{inc.number}</button>
                        <p className="text-xs truncate" style={{ color: '#64748b' }}>{inc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {inc.priority && <PriorityBadge p={inc.priority} />}
                          {inc.state && <span className="text-[9px] font-mono" style={{ color: '#94a3b8' }}>{inc.state}</span>}
                          {inc.alertName && <span className="text-[9px] font-mono px-1 rounded" style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706' }}>{inc.alertName}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Knowledge Base Match */}
          {(matchedKBEntries.length > 0 || alertKBEntries.length > 0) && (
            <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#0f172a' }}>
                <BookOpen size={14} style={{ color: '#334155' }} />
                Knowledge Base {matchedKBEntries.length > 0 ? 'Matches' : 'Browser'}
                {matchedKBEntries.length > 0 && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(5,150,105,0.15)', color: '#059669' }}>{matchedKBEntries.length} match{matchedKBEntries.length !== 1 ? 'es' : ''}</span>}
              </h3>
              <div className="space-y-3">
                {(matchedKBEntries.length > 0 ? matchedKBEntries : alertKBEntries.slice(0, 5)).map((kb: any) => (
                  <div key={kb.key} className="rounded-xl p-4" style={{ background: matchedKBEntries.includes(kb) ? 'rgba(5,150,105,0.06)' : 'rgba(255,255,255,0.6)', border: matchedKBEntries.includes(kb) ? '1px solid rgba(5,150,105,0.2)' : '1px solid rgba(99,102,241,0.08)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.12)', color: '#0f172a' }}>{kb.key}</span>
                        <span className="text-[10px]" style={{ color: '#94a3b8' }}>{kb.category}</span>
                      </div>
                      <button
                        onClick={() => handleApplyKB(kb)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded transition-all"
                        style={{ color: '#334155' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        Apply to RCA
                      </button>
                    </div>
                    {kb.rootCauses?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-semibold mb-1" style={{ color: '#64748b' }}>Root Causes</p>
                        {kb.rootCauses.slice(0, 2).map((rc: string, i: number) => (
                          <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#334155' }}>
                            <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: '#64748b' }} /> {rc}
                          </p>
                        ))}
                      </div>
                    )}
                    {kb.investigate?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-semibold mb-1 flex items-center gap-1" style={{ color: '#64748b' }}><Terminal size={9} /> Diagnostic</p>
                        {kb.investigate.slice(0, 2).map((cmd: string, i: number) => (
                          <p key={i} className="text-[10px] font-mono px-2 py-0.5 rounded mb-0.5" style={{ background: 'rgba(255,255,255,0.6)', color: '#64748b' }}>{cmd}</p>
                        ))}
                      </div>
                    )}
                    {kb.remediate?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold mb-1 flex items-center gap-1" style={{ color: '#64748b' }}><Zap size={9} /> Remediation</p>
                        {kb.remediate.slice(0, 2).map((rem: string, i: number) => (
                          <p key={i} className="text-[10px] font-mono px-2 py-0.5 rounded mb-0.5" style={{ background: 'rgba(5,150,105,0.08)', color: '#059669' }}>{rem}</p>
                        ))}
                      </div>
                    )}
                    {kb.blastRadius && (
                      <p className="text-[10px] px-2 py-0.5 rounded mt-2 inline-block" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>Blast: {kb.blastRadius}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Existing RCA (manual) */}
          <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#334155' }}>
              <Target size={14} /> Manual Root Cause
            </h3>
            {prb.rootCause ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#334155' }}>{prb.rootCause}</p>
            ) : (
              <p className="text-sm italic" style={{ color: '#94a3b8' }}>Root cause analysis is pending investigation.</p>
            )}
            {prb.permanentFix && (
              <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#059669' }}>Permanent Fix</p>
                <p className="text-xs" style={{ color: '#334155' }}>{prb.permanentFix}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Work Notes Tab */}
      {activeTab === 'worknotes' && (
        <div className="space-y-4 mt-5">
          <div className="rounded-xl p-4 flex gap-3" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <input type="text" placeholder="Add a work note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              className="flex-1"
              style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '8px', padding: '8px 12px', color: '#0f172a', fontSize: '14px', outline: 'none' }} />
            <button onClick={handleAddNote} disabled={noteLoading || !newNote.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(99,102,241,0.5)', opacity: (noteLoading || !newNote.trim()) ? 0.6 : 1 }}>
              {noteLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Add Note
            </button>
          </div>
          {worknotes.map((note) => (
            <div key={note.id} className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#334155' }}>
                    {note.author.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{note.author}</span>
                </div>
                <span className="text-xs" style={{ color: '#94a3b8' }}>{relativeTime(note.createdAt)}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Related Tab */}
      {activeTab === 'related' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#64748b' }}>
              <Link2 size={14} /> Related Incidents ({relatedIncidents.length})
            </h3>
            <div className="space-y-2">
              {relatedIncidents.map((inc: any) => (
                <button key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)} className="w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.15)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.6)')}>
                  <div>
                    <span className="font-mono text-xs" style={{ color: '#334155' }}>{inc.number}</span>
                    <p className="text-sm mt-0.5" style={{ color: '#0f172a' }}>{inc.title}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: '#94a3b8' }} />
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#64748b' }}>
              <Link2 size={14} /> Related Changes ({relatedChanges.length})
            </h3>
            <div className="space-y-2">
              {relatedChanges.map((chg: any) => (
                <button key={chg.id} onClick={() => navigate(`/changes/${chg.id}`)} className="w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.15)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.6)')}>
                  <div>
                    <span className="font-mono text-xs" style={{ color: '#334155' }}>{chg.number}</span>
                    <p className="text-sm mt-0.5" style={{ color: '#0f172a' }}>{chg.title}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: '#94a3b8' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEditModal && <EditProblemModal problem={prb} onClose={() => setShowEditModal(false)} />}
      {showAssignModal && <AssignProblemModal problem={prb} onClose={() => setShowAssignModal(false)} />}
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const meta =
    p === 'P1' ? { bg: 'rgba(239,68,68,0.15)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' } :
    p === 'P2' ? { bg: 'rgba(245,158,11,0.15)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' } :
    p === 'P3' ? { bg: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.3)' } :
    { bg: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold rounded-md" style={{ background: meta.bg, color: meta.color, border: meta.border }}>
      {p}
    </span>
  );
}
