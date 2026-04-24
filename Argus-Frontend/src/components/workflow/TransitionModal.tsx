import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TransitionModalProps {
  open: boolean;
  onClose: () => void;
  missingFields: string[];
  onSubmit: (fieldValues: Record<string, any>) => void;
}

export const TransitionModal: React.FC<TransitionModalProps> = ({ open, onClose, missingFields, onSubmit }) => {
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const handleFieldChange = (field: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    missingFields.forEach(field => {
      if (!fieldValues[field] || !String(fieldValues[field]).trim()) {
        newErrors[field] = `${field.replace(/_/g, ' ')} is required`;
      }
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onSubmit(fieldValues);
  };

  const label = (field: string) => field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const isTextArea = (field: string) => field.includes('reason') || field.includes('notes') || field.includes('description');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl p-6 shadow-2xl" style={{ background: '#ffffff' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#1e293b' }}>Complete Transition</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: '#64748b' }}>Provide required information to complete this transition.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {missingFields.map(field => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1" style={{ color: '#334155' }}>{label(field)}</label>
              {isTextArea(field) ? (
                <textarea
                  rows={3}
                  placeholder={`Enter ${label(field).toLowerCase()}`}
                  value={fieldValues[field] || ''}
                  onChange={e => handleFieldChange(field, e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
                  style={{ border: `1px solid ${errors[field] ? '#ef4444' : 'rgba(99,102,241,0.25)'}`, color: '#1e293b' }}
                />
              ) : (
                <input
                  type="text"
                  placeholder={`Enter ${label(field).toLowerCase()}`}
                  value={fieldValues[field] || ''}
                  onChange={e => handleFieldChange(field, e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ border: `1px solid ${errors[field] ? '#ef4444' : 'rgba(99,102,241,0.25)'}`, color: '#1e293b' }}
                />
              )}
              {errors[field] && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors[field]}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ border: '1px solid rgba(99,102,241,0.2)', color: '#64748b' }}>
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              Complete Transition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
