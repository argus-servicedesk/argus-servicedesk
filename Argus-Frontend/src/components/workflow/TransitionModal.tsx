import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface TransitionModalProps {
  open: boolean;
  onClose: () => void;
  missingFields: string[];
  onSubmit: (fieldValues: Record<string, any>) => void;
}

export const TransitionModal: React.FC<TransitionModalProps> = ({
  open,
  onClose,
  missingFields,
  onSubmit,
}) => {
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleFieldChange = (fieldName: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: '',
      }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors: Record<string, string> = {};
    missingFields.forEach(field => {
      if (!fieldValues[field] || (typeof fieldValues[field] === 'string' && !fieldValues[field].trim())) {
        newErrors[field] = `${field.replace('_', ' ')} is required`;
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(fieldValues);
  };
  
  const getFieldLabel = (fieldName: string): string => {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const renderField = (fieldName: string) => {
    const label = getFieldLabel(fieldName);
    const isTextArea = fieldName.includes('reason') || fieldName.includes('notes') || fieldName.includes('description');
    
    return (
      <div key={fieldName} className="space-y-2">
        <Label htmlFor={fieldName}>{label}</Label>
        {isTextArea ? (
          <Textarea
            id={fieldName}
            placeholder={`Enter ${label.toLowerCase()}`}
            value={fieldValues[fieldName] || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            className={errors[fieldName] ? 'border-red-500' : ''}
          />
        ) : (
          <Input
            id={fieldName}
            placeholder={`Enter ${label.toLowerCase()}`}
            value={fieldValues[fieldName] || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            className={errors[fieldName] ? 'border-red-500' : ''}
          />
        )}
        {errors[fieldName] && (
          <p className="text-sm text-red-500">{errors[fieldName]}</p>
        )}
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Transition</DialogTitle>
          <DialogDescription>
            Please provide the required information to complete this transition.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {missingFields.map(renderField)}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Complete Transition
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};