import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowLeft,
  GitBranch,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Activity,
  Shield,
  Calendar,
  FileText,
  AlertTriangle,
  Loader2,
  Pencil,
  X,
  Save,
  ChevronDown,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useChange, useUpdateChange } from '../../hooks/useChanges';
import { useTeams } from '../../hooks/useTeams';
import { useExecuteTransition } from '../../hooks/useWorkflow';
import { useAuthStore } from '../../stores/authStore';
import { TransitionLog } from '../workflow/TransitionLog';
import api from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type ChangeType = 'NORMAL' | 'STANDARD' | 'EMERGENCY';
type ChangeState = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SCHEDULED' | 'IMPLEMENTING' | 'COMPLETED' | 'CANCELLED';
type Risk = 'HIGH' | 'MEDIUM' | 'LOW';

interface Approval {
  id: string;
  approver: string | { id?: string; firstName?: string; lastName?: string };
  state?: 'PENDING' | 'APPROVED' | 'REJECTED';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments: string;
  approvedAt?: string | null;
  decidedAt?: string | null;
}

interface TimelineEvent {
  id: string;
  type: string;
  description?: string;
  action?: string;
  actor?: string;
  user?: string | { firstName?: string; lastName?: string };
  timestamp?: string;
  createdAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const typeStyle: Record<ChangeType, React.CSSProperties> = {
  NORMAL: { background: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.3)' },
  STANDARD: { background: 'rgba(79,70,229,0.15)', color: '#A5B4FC', border: '1px solid rgba(79,70,229,0.3)' },
  EMERGENCY: { background: 'rgba(220,38,38,0.15)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' },
};
const stateStyle: Record<ChangeState, React.CSSProperties> = {
  DRAFT: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' },
  SUBMITTED: { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  APPROVED: { background: 'rgba(99,102,241,0.15)', color: '#334155', border: '1px solid rgba(99,102,241,0.3)' },
  SCHEDULED: { background: 'rgba(79,70,229,0.15)', color: '#A5B4FC', border: '1px solid rgba(79,70,229,0.3)' },
  IMPLEMENTING: { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  COMPLETED: { background: 'rgba(5,150,105,0.15)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)' },
  CANCELLED: { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' },
};
const riskStyle: Record<Risk, React.CSSProperties> = {
  HIGH: { background: 'rgba(220,38,38,0.15)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' },
  MEDIUM: { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  LOW: { background: 'rgba(5,150,105,0.15)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)' },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatPersonName(value: unknown): string {
  if (!value) return 'Unknown';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { firstName?: string; lastName?: string; name?: string };
    if (obj.firstName || obj.lastName) {
      return [obj.firstName, obj.lastName].filter(Boolean).join(' ');
    }
    if (obj.name) return obj.name;
  }
  return 'Unknown';
}

// ─── State Transitions ──────────────────────────────────────────────────────

const CHANGE_TRANSITIONS: Record<string, string[]> = {
  NEW:          ['ASSESSMENT', 'APPROVAL', 'CANCELLED'],
  ASSESSMENT:   ['APPROVAL', 'CANCELLED'],
  APPROVAL:     ['SCHEDULED', 'CANCELLED'],
  SCHEDULED:    ['IMPLEMENTING', 'CANCELLED'],
  IMPLEMENTING: ['REVIEW', 'CANCELLED'],
  REVIEW:       ['CLOSED', 'CANCELLED'],
  CLOSED:       [],
  CANCELLED:    [],
};

const CHANGE_TYPES = ['NORMAL', 'STANDARD', 'EMERGENCY'];
const RISK_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Database', 'Security', 'Cloud', 'Infrastructure', 'Application', 'Other'];

// ─── Modals ─────────────────────────────────────────────────────────────────

function EditChangeModal({ change, onClose }: { change: any; onClose: () => void }) {
  const updateChange = useUpdateChange();
  const [form, setForm] = useState({
    shortDescription: change.shortDescription || '',
    description: change.description || '',
    type: change.type || 'NORMAL',
    risk: change.risk || change.riskLevel || 'MEDIUM',
    category: change.category || '',
    justification: change.justification || '',
  });

  const handleSave = async () => {
    try {
      const data: any = {};
      if (form.shortDescription !== change.shortDescription) data.shortDescription = form.shortDescription;
      if (form.description !== (change.description || '')) data.description = form.description;
      if (form.type !== change.type) data.type = form.type;
      if (form.risk !== (change.risk || change.riskLevel)) data.riskLevel = form.risk;
      if (form.category !== (change.category || '')) data.category = form.category;
      if (form.justification !== (change.justification || '')) data.justification = form.justification;
      if (Object.keys(data).length === 0) { onClose(); return; }
      await updateChange.mutateAsync({ id: change.id, data });
      toast.success('Change updated');
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
          <h3 className="text-lg font-semibold" style={{ color: '#0f172a' }}>Edit Change</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: '#94a3b8' }}><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Short Description *</label>
            <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} style={darkInputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Description</label>
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="resize-y" style={darkInputStyle} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={darkInputStyle}>
                {CHANGE_TYPES.map((v) => <option key={v} value={v} style={{ background: '#ffffff' }}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Risk</label>
              <select value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })} style={darkInputStyle}>
                {RISK_LEVELS.map((v) => <option key={v} value={v} style={{ background: '#ffffff' }}>{v}</option>)}
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
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Justification</label>
            <textarea rows={2} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} className="resize-y" style={darkInputStyle} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>Cancel</button>
          <button onClick={handleSave} disabled={updateChange.isPending || !form.shortDescription.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(99,102,241,0.5)', opacity: (updateChange.isPending || !form.shortDescription.trim()) ? 0.6 : 1 }}>
            {updateChange.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignChangeModal({ change, onClose }: { change: any; onClose: () => void }) {
  const updateChange = useUpdateChange();
  const { data: teamsData } = useTeams();
  const teams = teamsData?.data || [];
  const [selectedTeam, setSelectedTeam] = useState(change.assignmentGroupId || '');
  const [selectedUser, setSelectedUser] = useState(change.assignedToId || '');
  const currentTeam = teams.find((t: any) => t.id === selectedTeam);
  const members = currentTeam?.members || [];

  const handleAssign = async () => {
    try {
      const data: any = {};
      if (selectedTeam && selectedTeam !== change.assignmentGroupId) data.assignmentGroupId = selectedTeam;
      if (selectedUser && selectedUser !== change.assignedToId) data.assignedToId = selectedUser;
      if (Object.keys(data).length === 0) { onClose(); return; }
      await updateChange.mutateAsync({ id: change.id, data });
      toast.success('Change assigned');
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
          <h3 className="text-lg font-semibold" style={{ color: '#0f172a' }}>Assign Change</h3>
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
          <button onClick={handleAssign} disabled={updateChange.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(99,102,241,0.5)', opacity: updateChange.isPending ? 0.6 : 1 }}>
            {updateChange.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeStateDropdown({ change }: { change: any }) {
  const executeTransition = useExecuteTransition();
  const [open, setOpen] = useState(false);
  const allowed = CHANGE_TRANSITIONS[change.state] || [];
  if (allowed.length === 0) return null;

  const handleTransition = async (newState: string) => {
    setOpen(false);
    try {
      await executeTransition.mutateAsync({
        module: 'CHANGE',
        record_id: change.id,
        from_state: change.state,
        to_state: newState,
      });
      toast.success(`State changed to ${newState.replace(/_/g, ' ')}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'State change failed');
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
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChangeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'details' | 'plans' | 'approvals' | 'timeline'>('details');
  const { user } = useAuthStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const actionHandled = useRef(false);

  const { data: changeData, isLoading, isError, refetch } = useChange(id || '');
  const chg = changeData?.data;
  const approvals: Approval[] = chg?.approvals || [];
  const timeline: TimelineEvent[] = chg?.activities || [];

  // Check if current user has pending approval
  const currentUserApproval = approvals.find(
    (approval) => {
      const approverId = typeof approval.approver === 'object' && approval.approver && 'id' in approval.approver
        ? approval.approver.id 
        : approval.approver;
      const approvalState = approval.state || approval.status;
      return approverId === user?.id && approvalState === 'PENDING';
    }
  );

  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      await api.post(`/changes/${id}/approve/`, { comments: 'Approved' });
      toast.success('Change approved');
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve');
    } finally { setApproveLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectComments.trim()) {
      toast.error('Comments are required for rejection');
      return;
    }
    setApproveLoading(true);
    try {
      await api.post(`/changes/${id}/reject/`, { comments: rejectComments });
      toast.success('Change rejected');
      setShowRejectModal(false);
      setRejectComments('');
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject');
    } finally { setApproveLoading(false); }
  };

  // Handle ?action=approve / ?action=reject from email links
  useEffect(() => {
    if (!chg || actionHandled.current) return;
    const action = searchParams.get('action');
    if (!action) return;
    actionHandled.current = true;
    // Clear the query param so refresh doesn't re-trigger
    setSearchParams({}, { replace: true });
    setActiveTab('approvals');
    if (action === 'approve') {
      handleApprove();
    } else if (action === 'reject') {
      setShowRejectModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chg]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin" style={{ color: '#6366f1' }} />
      </div>
    );
  }

  // Error state
  if (isError || !chg) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle size={40} style={{ color: '#DC2626' }} />
        <p className="text-lg" style={{ color: '#64748b' }}>Failed to load change</p>
        <button onClick={() => navigate('/changes')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>
          <ArrowLeft size={16} /> Back to Changes
        </button>
      </div>
    );
  }

  // Map API field names to display values
  const requestedBy = formatPersonName(chg.requestedBy);
  const assignedTo = formatPersonName(chg.assignedTo);
  const assignmentGroup = typeof chg.assignmentGroup === 'object' && chg.assignmentGroup
    ? (chg.assignmentGroup.name || 'Unassigned')
    : (chg.assignmentGroup || 'Unassigned');
  const riskLevel = (chg.risk || chg.riskLevel || 'MEDIUM') as Risk;
  const scheduledStart = chg.plannedStartDate || chg.scheduledStart;
  const scheduledEnd = chg.plannedEndDate || chg.scheduledEnd;
  const backoutPlan = chg.rollbackPlan || chg.backoutPlan || '';
  const configItems: string[] = (chg.affectedCIs || chg.configItems || []).map((ci: any) =>
    typeof ci === 'object' && ci !== null ? (ci.configItem?.name || ci.name || ci.ciName || String(ci)) : String(ci)
  );

  const tabs = [
    { key: 'details' as const, label: 'Details' },
    { key: 'plans' as const, label: 'Plans' },
    ...(chg?.state === 'APPROVAL' || approvals.length > 0 ? [{ key: 'approvals' as const, label: 'Approvals', count: approvals.length }] : []),
    { key: 'timeline' as const, label: 'Timeline', count: timeline.length },
  ];

  return (
    <div className="animate-fade-in space-y-0" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 40%, #f8fafc 100%)', minHeight: '100vh', margin: '-1.5rem', padding: '1.5rem' }}>
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter: 'blur(70px)' }} />

        <div className="relative px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate('/changes')} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
              <ArrowLeft size={14} /> Changes
            </button>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span className="font-mono text-sm" style={{ color: '#c4b5fd' }}>{chg.number}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 flex-wrap mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-md font-mono" style={typeStyle[chg.type as ChangeType] || typeStyle.NORMAL}>{chg.type}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md" style={stateStyle[chg.state as ChangeState] || stateStyle.DRAFT}>{chg.state}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md" style={riskStyle[riskLevel]}>Risk: {riskLevel}</span>
              </div>
              <h1 className="text-xl font-display font-bold" style={{ color: '#ffffff' }}>{chg.shortDescription}</h1>
              <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span className="flex items-center gap-1.5"><User size={14} /> {requestedBy}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> {relativeTime(chg.createdAt)}</span>
                {scheduledStart && <span className="flex items-center gap-1.5"><Calendar size={14} style={{ color: '#c4b5fd' }} /> {formatDate(scheduledStart)}</span>}
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
              {chg.state === 'APPROVAL' && currentUserApproval && (
                <>
                  <button onClick={() => setShowRejectModal(true)} disabled={approveLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all" style={{ background: 'rgba(220,38,38,0.25)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.35)' }}>
                    <XCircle size={13} /> Reject
                  </button>
                  <button onClick={handleApprove} disabled={approveLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    {approveLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Approve
                  </button>
                </>
              )}
              <ChangeStateDropdown change={chg} />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8, #c4b5fd, transparent)' }} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-2 rounded-t-xl" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(255,255,255,0.4)' }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="px-4 py-2.5 text-sm font-medium transition-colors relative" style={{ color: activeTab === tab.key ? '#334155' : '#94a3b8' }}>
            {tab.label}
            {'count' in tab && tab.count !== undefined && tab.count > 0 && <span className="ml-1.5 text-xs" style={{ color: '#94a3b8' }}>({tab.count})</span>}
            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#6366f1' }} />}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
          <div className="lg:col-span-2 rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: '#64748b' }}>Description</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#334155' }}>{chg.description}</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl p-5 space-y-3" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
              <h3 className="text-sm font-medium mb-2" style={{ color: '#64748b' }}>Properties</h3>
              {[
                ['Assigned To', assignedTo],
                ['Assignment Group', assignmentGroup],
                ['Scheduled Start', formatDate(scheduledStart)],
                ['Scheduled End', formatDate(scheduledEnd)],
                ['Created', formatDate(chg.createdAt)],
                ['Updated', formatDate(chg.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span className="font-mono text-xs" style={{ color: '#0f172a' }}>{value}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: '#64748b' }}>Configuration Items</h3>
              <div className="space-y-1.5">
                {configItems.length > 0 ? configItems.map((ci, idx) => (
                  <div key={ci + idx} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#334155' }} />
                    <span className="font-mono text-xs" style={{ color: '#0f172a' }}>{ci}</span>
                  </div>
                )) : (
                  <p className="text-sm" style={{ color: '#94a3b8' }}>No configuration items</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-6 mt-5">
          {[
            { title: 'Implementation Plan', icon: FileText, content: chg.implementationPlan },
            { title: 'Backout Plan', icon: Shield, content: backoutPlan },
            { title: 'Test Plan', icon: CheckCircle, content: chg.testPlan },
          ].map((plan) => (
            <div key={plan.title} className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#64748b' }}>
                <plan.icon size={14} /> {plan.title}
              </h3>
              <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.6)', color: '#334155', border: '1px solid rgba(99,102,241,0.15)' }}>{plan.content || 'No plan provided'}</pre>
            </div>
          ))}
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="space-y-4 mt-5">
          {approvals.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>No approvals found</p>
          ) : (
            <>
              {/* Current user approval actions */}
              {chg.state === 'APPROVAL' && currentUserApproval && (
                <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: '#6366f1' }}>Your Approval Required</h3>
                  <p className="text-sm mb-4" style={{ color: '#64748b' }}>
                    This change requires your approval before it can proceed to the next stage.
                  </p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleApprove} 
                      disabled={approveLoading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                      style={{ 
                        background: '#059669', 
                        color: '#ffffff',
                        opacity: approveLoading ? 0.6 : 1
                      }}
                    >
                      {approveLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      Approve
                    </button>
                    <button 
                      onClick={() => setShowRejectModal(true)} 
                      disabled={approveLoading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                      style={{ 
                        background: '#DC2626', 
                        color: '#ffffff',
                        opacity: approveLoading ? 0.6 : 1
                      }}
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              )}
              
              {/* Approval list */}
              {approvals.map((approval) => {
                const approvalState = approval.state || approval.status || 'PENDING';
                const approverName = formatPersonName(approval.approver);
                const borderColor = approvalState === 'APPROVED' ? 'rgba(5,150,105,0.3)' : approvalState === 'REJECTED' ? 'rgba(220,38,38,0.3)' : 'rgba(217,119,6,0.3)';
                return (
                  <div key={approval.id} className="rounded-xl p-5" style={{ background: '#ffffff', border: `1px solid ${borderColor}`, backdropFilter: 'blur(12px)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: approvalState === 'APPROVED' ? 'rgba(5,150,105,0.15)' : approvalState === 'REJECTED' ? 'rgba(220,38,38,0.15)' : 'rgba(217,119,6,0.15)' }}>
                          {approvalState === 'APPROVED' ? <CheckCircle size={16} style={{ color: '#059669' }} /> : approvalState === 'REJECTED' ? <XCircle size={16} style={{ color: '#DC2626' }} /> : <Clock size={16} style={{ color: '#D97706' }} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#0f172a' }}>{approverName}</p>
                          <p className="text-xs" style={{ color: '#94a3b8' }}>
                            {approval.approvedAt || approval.decidedAt ? formatDate(approval.approvedAt || approval.decidedAt) : 'Pending'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md" style={approvalState === 'APPROVED' ? { background: 'rgba(5,150,105,0.15)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)' } : approvalState === 'REJECTED' ? { background: 'rgba(220,38,38,0.15)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' } : { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' }}>{approvalState}</span>
                    </div>
                    {approval.comments && <p className="text-sm mt-2 pl-11" style={{ color: '#64748b' }}>{approval.comments}</p>}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="rounded-xl p-5 mt-5" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
          {timeline.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>No timeline events</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: 'rgba(99,102,241,0.15)' }} />
              <div className="space-y-6">
                {timeline.map((event) => {
                  const eventDescription = event.description || event.action || '';
                  const eventActor = event.actor || formatPersonName(event.user);
                  const eventTimestamp = event.timestamp || event.createdAt || '';
                  return (
                    <div key={event.id} className="flex gap-4 relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(99,102,241,0.2)', color: '#334155' }}>
                        <Activity size={14} />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm" style={{ color: '#0f172a' }}>{eventDescription}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#94a3b8' }}>
                          <span>{eventActor}</span>
                          {eventTimestamp && <span>{formatDate(eventTimestamp)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 px-6 pb-6">
        <TransitionLog module="CHANGE" recordId={chg.id} />
      </div>
      {/* Modals */}
      {showEditModal && <EditChangeModal change={chg} onClose={() => setShowEditModal(false)} />}
      {showAssignModal && <AssignChangeModal change={chg} onClose={() => setShowAssignModal(false)} />}
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowRejectModal(false)}>
          <div className="w-full max-w-md p-6 space-y-4 shadow-2xl animate-fade-in rounded-2xl" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: '#0f172a' }}>Reject Change</h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 rounded-lg" style={{ color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Rejection Comments *</label>
                <textarea 
                  rows={4} 
                  value={rejectComments} 
                  onChange={(e) => setRejectComments(e.target.value)}
                  placeholder="Please provide a reason for rejecting this change..."
                  className="resize-y w-full p-3 text-sm rounded-lg border focus:outline-none"
                  style={{ 
                    background: 'rgba(255,255,255,0.6)', 
                    border: '1px solid rgba(99,102,241,0.15)', 
                    color: '#0f172a' 
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowRejectModal(false)} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: '#64748b', border: '1px solid rgba(99,102,241,0.15)' }}>Cancel</button>
              <button 
                onClick={handleReject} 
                disabled={approveLoading || !rejectComments.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ 
                  background: '#DC2626', 
                  color: '#FFFFFF', 
                  opacity: (approveLoading || !rejectComments.trim()) ? 0.6 : 1 
                }}
              >
                {approveLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Reject Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
