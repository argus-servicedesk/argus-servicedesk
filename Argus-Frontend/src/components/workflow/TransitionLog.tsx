import React from 'react';
import { useTransitionLogs } from '../../hooks/useWorkflow';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock, User, GitBranch } from 'lucide-react';

interface TransitionLogProps {
  module: 'INCIDENT' | 'PROBLEM' | 'CHANGE';
  recordId: string;
}

export const TransitionLog: React.FC<TransitionLogProps> = ({ module, recordId }) => {
  const { data: logs, isLoading, error } = useTransitionLogs(module, recordId);

  return (
    <div className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)' }}>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch size={14} style={{ color: '#6366f1' }} />
        <span className="text-sm font-medium" style={{ color: '#334155' }}>Transition History</span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#6366f1' }} />
        </div>
      )}

      {error && (
        <p className="text-sm py-4 text-center" style={{ color: '#ef4444' }}>Failed to load transition history</p>
      )}

      {!isLoading && !error && (!logs || logs.length === 0) && (
        <p className="text-sm py-4 text-center" style={{ color: '#94a3b8' }}>No transitions recorded yet</p>
      )}

      {!isLoading && !error && logs && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg p-3" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.10)' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>
                  {log.from_state.replace(/_/g, ' ')}
                </span>
                <ArrowRight size={12} style={{ color: '#94a3b8' }} />
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                  {log.to_state.replace(/_/g, ' ')}
                </span>
                {!log.success && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>Failed</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
                  <User size={10} /> {log.transitioned_by || 'System'}
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
                  <Clock size={10} /> {formatDistanceToNow(new Date(log.transitioned_at), { addSuffix: true })}
                </span>
              </div>
              {log.notes && (
                <p className="mt-1 text-xs" style={{ color: '#475569' }}>{log.notes}</p>
              )}
              {log.actions_executed && log.actions_executed.length > 0 && (
                <p className="mt-1 text-xs" style={{ color: '#94a3b8' }}>
                  Actions: {log.actions_executed.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
