import React from 'react';
import { useTransitionLogs } from '../../hooks/useWorkflow';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock, User } from 'lucide-react';

interface TransitionLogProps {
  module: 'INCIDENT' | 'PROBLEM' | 'CHANGE';
  recordId: string;
}

export const TransitionLog: React.FC<TransitionLogProps> = ({
  module,
  recordId,
}) => {
  const { data: logs, isLoading, error } = useTransitionLogs(module, recordId);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Failed to load transition history</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No transitions recorded yet</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Transition History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start space-x-4 p-4 border rounded-lg bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {log.from_state}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <Badge variant="default" className="text-xs">
                    {log.to_state}
                  </Badge>
                  {!log.success && (
                    <Badge variant="destructive" className="text-xs">
                      Failed
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{log.transitioned_by || 'System'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(log.transitioned_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                
                {log.notes && (
                  <p className="text-sm text-gray-700 mb-2">{log.notes}</p>
                )}
                
                {log.actions_executed && log.actions_executed.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Actions executed:</span>{' '}
                    {log.actions_executed.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};