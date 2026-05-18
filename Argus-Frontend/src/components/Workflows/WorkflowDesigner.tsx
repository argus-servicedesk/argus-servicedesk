import { useState } from 'react';
import { 
  GitBranch, Plus, ChevronRight, Settings, Play, CheckCircle2, 
  AlertTriangle, X, Trash2, Save, MoveRight, Layers, Layout,
  MoreVertical, Edit3, Power, Clock, User
} from 'lucide-react';
import { useWorkflows, useCreateWorkflow, useUpdateWorkflow } from '../../hooks/useWorkflows';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface State {
  id?: string;
  name: string;
  is_initial: boolean;
  is_final: boolean;
  color: string;
}

interface Transition {
  id?: string;
  from_state: string;
  from_state_name?: string;
  to_state: string;
  to_state_name?: string;
  name: string;
  required_permission?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  target_model: string;
  is_active: boolean;
  states: State[];
  transitions: Transition[];
  created_at: string;
}

// ── Components ────────────────────────────────────────────────────────────────

export default function WorkflowDesigner() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { data: workflows, isLoading } = useWorkflows();
  
  const selectedWorkflow = workflows?.find((w: Workflow) => w.id === selectedWorkflowId);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* Sidebar - Workflow List */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <GitBranch size={18} className="text-indigo-600" />
            Workflows
          </h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
            </div>
          ) : (workflows || []).map((w: Workflow) => (
            <button
              key={w.id}
              onClick={() => setSelectedWorkflowId(w.id)}
              className={clsx(
                "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group",
                selectedWorkflowId === w.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                  : "hover:bg-slate-100 text-slate-600"
              )}
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{w.name}</p>
                <p className={clsx("text-[10px] uppercase font-bold tracking-wider", selectedWorkflowId === w.id ? "text-indigo-100" : "text-slate-400")}>
                  {w.target_model}
                </p>
              </div>
              <ChevronRight size={16} className={clsx("transition-transform", selectedWorkflowId === w.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100")} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Area - Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedWorkflow ? (
          <WorkflowEditor workflow={selectedWorkflow} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6">
              <GitBranch size={40} className="text-indigo-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Workflow Designer</h3>
            <p className="max-w-md text-center text-sm leading-relaxed">
              Design state machines for your ITSM processes. Define custom states, transitions, 
              and conditions for Incidents, Changes, and Problems.
            </p>
            <button 
              onClick={() => setIsCreating(true)}
              className="mt-8 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Create New Workflow
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowEditor({ workflow }: { workflow: Workflow }) {
  const [activeTab, setActiveTab] = useState<'visual' | 'states' | 'transitions' | 'settings'>('visual');
  const updateWorkflow = useUpdateWorkflow();

  const handleToggleActive = () => {
    updateWorkflow.mutate({ id: workflow.id, is_active: !workflow.is_active });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Editor Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">{workflow.name}</h1>
            <span className={clsx(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
              workflow.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            )}>
              {workflow.is_active ? 'Active' : 'Draft'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{workflow.description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggleActive}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
              workflow.is_active 
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" 
                : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            )}
          >
            <Power size={14} />
            {workflow.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6 flex items-center gap-8">
        {[
          { id: 'visual', label: 'Visual Designer', icon: Layout },
          { id: 'states', label: 'States', icon: Layers },
          { id: 'transitions', label: 'Transitions', icon: MoveRight },
          { id: 'settings', label: 'General Settings', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "py-4 text-sm font-bold flex items-center gap-2 transition-all relative",
              activeTab === tab.id ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
        {activeTab === 'visual' && <VisualCanvas workflow={workflow} />}
        {activeTab === 'states' && <StatesList workflow={workflow} />}
        {activeTab === 'transitions' && <TransitionsList workflow={workflow} />}
        {activeTab === 'settings' && <SettingsPanel workflow={workflow} />}
      </div>
    </div>
  );
}

function VisualCanvas({ workflow }: { workflow: Workflow }) {
  return (
    <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-12 bg-white/50">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
          <Layout size={32} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Visual Designer</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          The drag-and-drop canvas is initializing. You can manage States and Transitions 
          using the list views in the other tabs for now.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {workflow.states.map(s => (
            <div key={s.id} className="px-3 py-1.5 rounded-lg border bg-white shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-xs font-bold text-slate-700">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatesList({ workflow }: { workflow: Workflow }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Workflow States</h3>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
          <Plus size={14} /> Add State
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workflow.states.map(state => (
          <div key={state.id} className="bg-white p-5 rounded-2xl border shadow-sm group hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${state.color}15` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: state.color }} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{state.name}</p>
                  <div className="flex gap-2 mt-1">
                    {state.is_initial && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Initial</span>}
                    {state.is_final && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">Final</span>}
                  </div>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransitionsList({ workflow }: { workflow: Workflow }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Workflow Transitions</h3>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
          <Plus size={14} /> Add Transition
        </button>
      </div>

      <div className="space-y-3">
        {workflow.transitions.map(t => (
          <div key={t.id} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 min-w-[120px]">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">{t.from_state_name}</span>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{t.name}</p>
                <MoveRight size={20} className="text-slate-300" />
              </div>
              <div className="flex items-center gap-3 min-w-[120px]">
                <div className="w-2 h-2 rounded-full bg-indigo-600" />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">{t.to_state_name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {t.required_permission && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
                  <User size={10} />
                  {t.required_permission}
                </span>
              )}
              <button className="p-2 text-slate-400 hover:text-slate-600">
                <Edit3 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ workflow }: { workflow: Workflow }) {
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border shadow-sm space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-6">General Settings</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Workflow Name</label>
            <input 
              defaultValue={workflow.name}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
            <textarea 
              defaultValue={workflow.description}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Entity</label>
              <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-600 uppercase tracking-widest">
                {workflow.target_model}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Created</label>
              <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-600">
                {new Date(workflow.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-8 border-t flex justify-end gap-3">
        <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
          <Save size={18} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
