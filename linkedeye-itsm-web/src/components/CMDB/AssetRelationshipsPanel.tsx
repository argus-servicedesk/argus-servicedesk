import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GitFork, Loader2, Plus, Trash2, X, Save,
  Server, ArrowRight, ChevronDown, ChevronRight,
  AlertTriangle, Network,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAssetRelationships, useCreateRelationship, useDeleteRelationship, useDependencyMap } from '../../hooks/useCMDB';
import { useAssets } from '../../hooks/useAssets';

const glassCard: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(5,150,105,0.12)',
  borderRadius: '0.75rem',
};

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(5,150,105,0.15)',
  color: '#0f172a',
  borderRadius: '0.75rem',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const RELATIONSHIP_TYPES = [
  'DEPENDS_ON',
  'RUNS_ON',
  'CONNECTS_TO',
  'CONTAINS',
  'MANAGED_BY',
  'BACKS_UP',
  'MONITORS',
  'HOSTS',
];

const relTypeStyle: Record<string, React.CSSProperties> = {
  DEPENDS_ON: { background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)' },
  RUNS_ON: { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' },
  CONNECTS_TO: { background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' },
  CONTAINS: { background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
  MANAGED_BY: { background: 'rgba(124,58,237,0.12)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.25)' },
  BACKS_UP: { background: 'rgba(14,165,233,0.12)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.25)' },
  MONITORS: { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' },
  HOSTS: { background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' },
};

const defaultRelStyle: React.CSSProperties = { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.25)' };

// ─── Dependency Tree ────────────────────────────────────────────────────────

function DependencyNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = node.children || node.dependencies || [];
  const hasChildren = children.length > 0;

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
        onClick={() => hasChildren && setExpanded(!expanded)}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(5,150,105,0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={12} style={{ color: '#059669' }} /> : <ChevronRight size={12} style={{ color: '#94a3b8' }} />
        ) : (
          <span className="w-3" />
        )}
        <Server size={12} style={{ color: '#059669' }} />
        <Link
          to={`/assets/${node.id}`}
          className="text-xs font-medium hover:underline"
          style={{ color: '#0f172a' }}
          onClick={(e) => e.stopPropagation()}
        >
          {node.name || node.id?.slice(0, 8)}
        </Link>
        {node.type && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={relTypeStyle[node.relationshipType] || defaultRelStyle}>
            {(node.relationshipType || node.type || '').replace(/_/g, ' ')}
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {children.map((child: any, i: number) => (
            <DependencyNode key={child.id || i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

interface AssetRelationshipsPanelProps {
  assetId: string;
}

export default function AssetRelationshipsPanel({ assetId }: AssetRelationshipsPanelProps) {
  const { data: relData, isLoading } = useAssetRelationships(assetId);
  const { data: depData } = useDependencyMap(assetId);
  const { data: assetsData } = useAssets({ pageSize: 200 });
  const createRelationship = useCreateRelationship(assetId);
  const deleteRelationship = useDeleteRelationship(assetId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ targetAssetId: '', type: 'DEPENDS_ON' });

  const relationships = relData?.data || [];
  const depMap = depData?.data;
  const assets = (assetsData?.data || []).filter((a: any) => a.id !== assetId);

  const handleCreate = async () => {
    if (!form.targetAssetId) { toast.error('Select a target asset'); return; }
    try {
      await createRelationship.mutateAsync({ targetAssetId: form.targetAssetId, type: form.type });
      toast.success('Relationship created');
      setShowForm(false);
      setForm({ targetAssetId: '', type: 'DEPENDS_ON' });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create');
    }
  };

  const handleDelete = async (relId: string) => {
    if (!confirm('Remove this relationship?')) return;
    try {
      await deleteRelationship.mutateAsync(relId);
      toast.success('Relationship removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to remove');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center gap-3">
        <Loader2 size={24} style={{ color: '#059669' }} className="animate-spin" />
        <p className="text-xs" style={{ color: '#94a3b8' }}>Loading relationships...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Relationships List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#059669' }}>
            <GitFork size={15} /> CI Relationships
            {relationships.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(5,150,105,0.15)', color: '#059669' }}>{relationships.length}</span>
            )}
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}
          >
            {showForm ? <X size={12} /> : <Plus size={12} />}
            {showForm ? 'Cancel' : 'Add'}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="p-4 rounded-xl mb-3" style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.12)' }}>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                  {RELATIONSHIP_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Target Asset</label>
                <select value={form.targetAssetId} onChange={(e) => setForm({ ...form, targetAssetId: e.target.value })} style={inputStyle}>
                  <option value="">-- Select --</option>
                  {assets.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.ciNumber || a.id.slice(0, 8)})</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleCreate} disabled={createRelationship.isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  {createRelationship.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {relationships.length === 0 ? (
          <div className="text-center py-6">
            <GitFork size={28} style={{ color: '#94a3b8' }} className="mx-auto mb-2" />
            <p className="text-xs" style={{ color: '#94a3b8' }}>No relationships defined</p>
          </div>
        ) : (
          <div className="space-y-2">
            {relationships.map((rel: any) => (
              <div
                key={rel.id}
                className="flex items-center justify-between p-3 rounded-xl transition-colors"
                style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.08)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(5,150,105,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(5,150,105,0.04)')}
              >
                <div className="flex items-center gap-3">
                  <Server size={14} style={{ color: '#059669' }} />
                  <div>
                    <Link to={`/assets/${rel.targetAsset?.id || rel.targetAssetId}`} className="text-sm font-medium hover:underline" style={{ color: '#0f172a' }}>
                      {rel.targetAsset?.name || rel.targetAssetId?.slice(0, 8) || 'Unknown'}
                    </Link>
                    {rel.targetAsset?.ciNumber && (
                      <span className="ml-2 text-[10px] font-mono" style={{ color: '#94a3b8' }}>{rel.targetAsset.ciNumber}</span>
                    )}
                  </div>
                  <ArrowRight size={12} style={{ color: '#94a3b8' }} />
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={relTypeStyle[rel.type] || defaultRelStyle}>
                    {(rel.type || '').replace(/_/g, ' ')}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(rel.id)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: '#94a3b8' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dependency Map */}
      {depMap && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: '#059669' }}>
            <Network size={15} /> Dependency Map
          </h3>
          <div style={glassCard} className="p-4">
            <DependencyNode node={depMap} />
          </div>
        </div>
      )}
    </div>
  );
}
