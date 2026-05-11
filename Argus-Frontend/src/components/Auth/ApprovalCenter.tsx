import { useState } from 'react';
import { 
  ClipboardCheck, CheckCircle2, XCircle, Clock, 
  MessageSquare, FileText, User, ChevronRight,
  Shield, GitBranch, AlertTriangle, Loader2
} from 'lucide-react';
import { usePendingApprovals, useApprovalActions } from '../../hooks/useApprovals';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export default function ApprovalCenter() {
  const { data: pending, isLoading } = usePendingApprovals();
  const { approve, reject } = useApprovalActions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comments, setComments] = useState('');

  const handleAction = async (approverId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approve.mutateAsync({ approverId, comments });
        toast.success('Approved successfully');
      } else {
        await reject.mutateAsync({ approverId, comments });
        toast.error('Rejected');
      }
      setComments('');
      setSelectedId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <ClipboardCheck size={20} />
            </div>
            Approval Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review and action pending requests that require your authorization.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List of Pending */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Pending Requests ({pending?.length || 0})</h2>
          
          {isLoading ? (
            <div className="bg-white rounded-2xl border p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-indigo-600" />
            </div>
          ) : pending?.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium text-slate-500">All clear! No pending approvals.</p>
            </div>
          ) : pending?.map((req: any) => (
            <button
              key={req.id}
              onClick={() => setSelectedId(req.id)}
              className={clsx(
                "w-full text-left p-4 rounded-2xl border transition-all group",
                selectedId === req.id 
                  ? "bg-white border-indigo-500 shadow-lg shadow-indigo-100 ring-1 ring-indigo-500" 
                  : "bg-white hover:bg-slate-50 border-slate-200"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                  {req.target_object_details.type}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{req.target_object_details.number}</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">{req.title}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={12} />
                {new Date(req.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>

        {/* Details & Actions */}
        <div className="lg:col-span-2">
          {selectedId ? (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden sticky top-6">
              {pending?.filter((r: any) => r.id === selectedId).map((req: any) => {
                const myApprover = req.approvers.find((a: any) => a.state === 'PENDING');
                return (
                  <div key={req.id}>
                    <div className="p-6 border-b bg-slate-50/50">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center shadow-sm">
                          <FileText size={24} className="text-slate-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-800">{req.title}</h2>
                          <p className="text-sm text-slate-500">{req.target_object_details.type} Approval Request</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border">
                        {req.description || 'No additional description provided.'}
                      </p>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Approvers List */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Approval Chain</h3>
                        <div className="space-y-3">
                          {req.approvers.map((approver: any) => (
                            <div key={approver.id} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/30">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                  {approver.user_details.first_name[0]}{approver.user_details.last_name[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-700">{approver.user_details.first_name} {approver.user_details.last_name}</p>
                                  <p className="text-[10px] text-slate-400 uppercase">{approver.state}</p>
                                </div>
                              </div>
                              {approver.state === 'APPROVED' && <CheckCircle2 className="text-emerald-500" size={18} />}
                              {approver.state === 'REJECTED' && <XCircle className="text-rose-500" size={18} />}
                              {approver.state === 'PENDING' && <Clock className="text-amber-500" size={18} />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Area */}
                      <div className="space-y-4 pt-6 border-t">
                        <label className="block space-y-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Comments</span>
                          <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Add reason for approval or rejection..."
                            className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm h-24 resize-none"
                          />
                        </label>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleAction(myApprover.id, 'reject')}
                            disabled={reject.isPending}
                            className="flex-1 px-6 py-3 border-2 border-rose-100 text-rose-600 rounded-xl font-bold hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                          >
                            {reject.isPending ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                            Reject Request
                          </button>
                          <button
                            onClick={() => handleAction(myApprover.id, 'approve')}
                            disabled={approve.isPending}
                            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                          >
                            {approve.isPending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                            Approve Request
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 h-96 flex flex-col items-center justify-center text-slate-400 p-12">
              <ClipboardCheck size={48} className="opacity-10 mb-4" />
              <p className="text-sm font-medium">Select a request to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
