import React, { useState } from 'react';
import { Button } from '../ui/button';
import { useExecuteTransition } from '../../hooks/useWorkflow';
import { TransitionModal } from './TransitionModal';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface TransitionButtonProps {
  module: 'INCIDENT' | 'PROBLEM' | 'CHANGE';
  recordId: string;
  fromState: string;
  toState: string;
  label: string;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const TransitionButton: React.FC<TransitionButtonProps> = ({
  module,
  recordId,
  fromState,
  toState,
  label,
  disabled = false,
  variant = 'default',
  size = 'default',
}) => {
  const [showModal, setShowModal] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const executeTransition = useExecuteTransition();
  
  const handleClick = async () => {
    try {
      const { data } = await api.post('/workflow/validate/', {
        module,
        record_id: recordId,
        from_state: fromState,
        to_state: toState,
      });
      const validation = data.data;
      
      if (!validation.allowed) {
        toast.error(`Transition not allowed: ${validation.errors.join(', ')}`);
        return;
      }
      
      if (validation.missing_fields && validation.missing_fields.length > 0) {
        // Open modal for missing fields
        setValidationResult(validation);
        setShowModal(true);
      } else {
        // Execute directly
        executeTransition.mutate({
          module,
          record_id: recordId,
          from_state: fromState,
          to_state: toState,
        }, {
          onSuccess: () => {
            toast.success(`Successfully transitioned to ${toState}`);
          },
          onError: (error: any) => {
            toast.error(`Failed to execute transition: ${error.message}`);
          },
        });
      }
    } catch (error: any) {
      toast.error(`Validation failed: ${error.message}`);
    }
  };
  
  const handleModalSubmit = (fieldValues: Record<string, any>) => {
    executeTransition.mutate({
      module,
      record_id: recordId,
      from_state: fromState,
      to_state: toState,
      field_updates: fieldValues,
    }, {
      onSuccess: () => {
        toast.success(`Successfully transitioned to ${toState}`);
        setShowModal(false);
      },
      onError: (error: any) => {
        toast.error(`Failed to execute transition: ${error.message}`);
      },
    });
  };
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled || executeTransition.isPending}
        onClick={handleClick}
      >
        {executeTransition.isPending ? 'Processing...' : label}
      </Button>
      
      {showModal && validationResult && (
        <TransitionModal
          open={showModal}
          onClose={() => setShowModal(false)}
          missingFields={validationResult.missing_fields}
          onSubmit={handleModalSubmit}
        />
      )}
    </>
  );
};