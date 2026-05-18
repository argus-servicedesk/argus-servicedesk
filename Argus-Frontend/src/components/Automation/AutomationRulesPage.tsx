import { useState } from 'react';
import { 
  Zap, Plus, Search, Filter, MoreVertical, 
  Play, Power, Trash2, Edit3, ChevronRight,
  Shield, Bell, GitBranch, Terminal,
  Clock, CheckCircle2, AlertCircle, X, Loader2
} from 'lucide-react';
import { useAutomations, useCreateAutomation, useUpdateAutomation, useDeleteAutomation } from '../../hooks/useAutomations';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  target_model: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  ON_CREATE: 'On Record Created',
  ON_UPDATE: 'On Record Updated',
  ON_DELETE: 'On Record Deleted',
  ON_SLA_BREACH: 'On SLA Breach',
};

// ── Components ────────────────────────────────────────────────────────────────

export default function AutomationRulesPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const { data: rules, isLoading } = useAutomations();
  const deleteRule = useDeleteAutomation();
  const updateRule = useUpdateAutomation();

  const handleToggle = (rule: AutomationRule) => {
    updateRule.mutate({ id: rule.id, is_active: !rule.is_active });
    toast.success(`Rule ${!rule.is_active ? 'activated' : 'deactivated'}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      deleteRule.mutate(id);
      toast.success('Rule deleted');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <Zap size={20} />
            </div>
            Automation Rules
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure trigger-based actions and business logic for your ITSM workflows.</p>
        </div>
        
        <button 
          onClick={() => { setSelectedRule(null); setIsEditorOpen(true); }}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          Create Rule
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: rules?.length || 0, icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Active', value: rules?.filter((r: any) => r.is_active).length || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Executions (24h)', value: '1.2k', icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Errors', value: '0', icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rule List */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                placeholder="Search rules..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button className="p-2 rounded-xl border bg-white text-slate-600 hover:bg-slate-50 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="divide-y">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p className="text-sm font-medium">Loading rules...</p>
            </div>
          ) : rules?.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <Zap size={32} className="text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No automation rules yet</h3>
              <p className="text-sm text-slate-400 mt-1">Start by creating your first business automation rule.</p>
            </div>
          ) : rules?.map((rule: AutomationRule) => (
            <div key={rule.id} className="group hover:bg-slate-50/50 transition-colors">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <button 
                    onClick={() => handleToggle(rule)}
                    className={clsx(
                      "w-12 h-6 rounded-full relative transition-colors",
                      rule.is_active ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <div className={clsx(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      rule.is_active ? "left-7" : "left-1"
                    )} />
                  </button>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 truncate">{rule.name}</h4>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                        {rule.target_model.split('.').pop()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-md mt-0.5">{rule.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trigger</p>
                    <p className="text-xs font-semibold text-slate-700">{TRIGGER_LABELS[rule.trigger] || rule.trigger}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setSelectedRule(rule); setIsEditorOpen(true); }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
