import { useState } from 'react';
import {
  MapPin, Plus, Server,
  Edit3, Trash2, Activity, Loader2, X, Globe, Database,
  BarChart3, Clock,
} from 'lucide-react';
import { useSites, useCreateSite, useUpdateSite, useDeleteSite } from '../../hooks/useSites';
import type { Site } from '../../hooks/useSites';
import { useOrganizations } from '../../hooks/useOrganizations';

// ── Empty form state ──
const EMPTY_FORM: Record<string, string | number | boolean> = {
  organizationId: '', name: '', code: '', environment: 'Production', status: 'ACTIVE',
  location: '', state: '', country: '',
  serverIp: '', sshPort: '', redisHost: '',
  prometheusUrl: '', grafanaUrl: '', redmineUrl: '', incidentUrl: '',
};

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default function SiteManagement() {
  const { data, isLoading } = useSites();
  const { data: organizationsData } = useOrganizations();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sites: Site[] = Array.isArray(data) ? data : data?.data ?? data?.results ?? data?.sites ?? [];
  const organizations = extractList(organizationsData);

  // ── Handlers ──
  function openCreate() {
    setEditingSite(null);
    setForm({ ...EMPTY_FORM, organizationId: organizations.length === 1 ? organizations[0].id : '' });
    setModalOpen(true);
  }

  function openEdit(site: Site) {
    setEditingSite(site);
    setForm({
      organizationId: site.organizationId || site.organization?.id || '',
      name: site.name || '', code: site.slug || site.code || '', environment: site.environment || 'Production',
      status: site.status || 'ACTIVE', location: site.location || '', state: site.state || '', country: site.country || '',
      serverIp: site.serverIp || site.entityHost || '', sshPort: site.sshPort || site.entityPort || '',
      redisHost: site.redisHost || '',
      prometheusUrl: site.prometheusUrl || '', grafanaUrl: site.grafanaUrl || '',
      redmineUrl: site.redmineUrl || '', incidentUrl: site.incidentUrl || '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingSite) {
      await updateSite.mutateAsync({ id: editingSite.id, data: form });
    } else {
      await createSite.mutateAsync(form);
    }
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    await deleteSite.mutateAsync(id);
    setDeleteConfirm(null);
  }

  // ── Render ──
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0f0826 0%, #1a1145 40%, #2d1b69 70%, #1e1250 100%)',
        padding: '32px 32px 28px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(124,58,237,0.15), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500 }}>Settings</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>/</span>
            <span style={{ color: 'rgba(192,132,252,0.8)', fontSize: 11, fontWeight: 600 }}>Sites</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #7c3aed, #c084fc)', boxShadow: '0 0 24px rgba(124,58,237,0.4)',
              }}>
                <MapPin className="w-5 h-5" style={{ color: '#fff' }} />
              </div>
              <div>
                <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Site Management</h1>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>Configure and monitor connected sites</p>
              </div>
              <span style={{
                marginLeft: 8, fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                padding: '3px 10px', borderRadius: 20, color: '#c084fc',
                background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.25)',
              }}>
                {sites.length} site{sites.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button onClick={openCreate} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px',
              borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}>
              <Plus className="w-4 h-4" /> Add Site
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ margin: '0 auto 12px', color: '#c084fc' }} />
            <p style={{ fontSize: 13 }}>Loading sites...</p>
          </div>
        ) : sites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <MapPin className="w-12 h-12" style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>No sites configured</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Add your first site to get started</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
            {sites.map((site: Site) => (
              <div key={site.id} style={{
                background: '#fff', borderRadius: 14, border: '1px solid rgba(99,102,241,0.1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden', transition: 'box-shadow 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
              >
                {/* Card header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: site.isActive ? 'rgba(99,102,241,0.1)' : 'rgba(148,163,184,0.1)',
                    }}>
                      <Server className="w-4 h-4" style={{ color: site.isActive ? '#6366f1' : '#94a3b8' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{site.name}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: 'monospace', padding: '2px 7px',
                          borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                        }}>{site.code}</span>
                        {site.organization?.name && <span style={{ fontSize: 10, color: '#64748b' }}>{site.organization.name}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <MapPin className="w-3 h-3" style={{ color: '#94a3b8' }} />
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {[site.state, site.country].filter(Boolean).join(', ') || site.location || 'No location'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                    background: site.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: site.isActive ? '#10b981' : '#ef4444',
                    border: `1px solid ${site.isActive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                    {site.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding: '14px 20px' }}>
                  {/* Server IP */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Globe className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>{site.serverIp || '--'}</span>
                    {site.sshPort && <span style={{ fontSize: 10, color: '#94a3b8' }}>:{site.sshPort}</span>}
                  </div>

                  {/* Connection indicators */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Prometheus', url: site.prometheusUrl, icon: Activity },
                      { label: 'Redis', url: site.redisHost, icon: Database },
                      { label: 'Grafana', url: site.grafanaUrl, icon: BarChart3 },
                      { label: 'Incident URL', url: site.incidentUrl, icon: Clock },
                    ].map(svc => (
                      <div key={svc.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: svc.url ? '#10b981' : '#ef4444',
                          boxShadow: svc.url ? '0 0 6px rgba(16,185,129,0.4)' : '0 0 6px rgba(239,68,68,0.3)',
                        }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: svc.url ? '#64748b' : '#94a3b8' }}>{svc.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Updated {site.updatedAt ? new Date(site.updatedAt).toLocaleDateString('en-IN') : '--'}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(site)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px',
                        fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)',
                        background: 'rgba(99,102,241,0.06)', color: '#6366f1', cursor: 'pointer',
                      }}>
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => setDeleteConfirm(site.id)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px',
                        fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)',
                        background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer',
                      }}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }} onClick={() => setDeleteConfirm(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: 28, width: 400, maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Delete Site</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Are you sure? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer',
              }}>
                {deleteSite.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }} onClick={() => setModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, width: 600, maxWidth: '95vw', maxHeight: '90vh',
            overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '16px 16px 0 0',
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {editingSite ? 'Edit Site' : 'Add New Site'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{
                width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #e2e8f0', background: '#fff', color: '#94a3b8', cursor: 'pointer',
              }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Client Organization
                  </label>
                  <select
                    value={String(form.organizationId ?? '')}
                    onChange={e => setForm(prev => ({ ...prev, organizationId: e.target.value }))}
                    required={!editingSite}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
                      border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select client</option>
                    {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                </div>

                {[
                  { key: 'name', label: 'Site Name', span: 1 },
                  { key: 'code', label: 'Site Code / Slug', span: 1 },
                  { key: 'environment', label: 'Environment', span: 1 },
                  { key: 'status', label: 'Status', span: 1, type: 'select' },
                  { key: 'location', label: 'Location / Address', span: 2 },
                  { key: 'state', label: 'State', span: 1 },
                  { key: 'country', label: 'Country', span: 1 },
                  { key: 'serverIp', label: 'Entity Host', span: 1 },
                  { key: 'sshPort', label: 'Entity Port', span: 1, type: 'number' },
                  { key: 'redisHost', label: 'Redis URL', span: 2 },
                  { key: 'prometheusUrl', label: 'Prometheus URL', span: 2 },
                  { key: 'grafanaUrl', label: 'Grafana URL', span: 2 },
                  { key: 'redmineUrl', label: 'Redmine URL', span: 2 },
                  { key: 'incidentUrl', label: 'Incident URL', span: 2 },
                ].map(field => (
                  <div key={field.key} style={{ gridColumn: field.span === 2 ? '1 / -1' : undefined }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={String(form[field.key] ?? '')}
                        onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
                          border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="DEGRADED">Degraded</option>
                        <option value="OFFLINE">Offline</option>
                        <option value="RETIRED">Retired</option>
                      </select>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={String(form[field.key] ?? '')}
                        onChange={e => setForm(prev => ({ ...prev, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
                          border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none',
                          fontFamily: ['serverIp', 'redisHost', 'prometheusUrl', 'grafanaUrl', 'redmineUrl', 'incidentUrl'].includes(field.key) ? 'monospace' : 'inherit',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer',
                }}>Cancel</button>
                <button type="submit" disabled={createSite.isPending || updateSite.isPending} style={{
                  padding: '8px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                }}>
                  {(createSite.isPending || updateSite.isPending) ? 'Saving...' : editingSite ? 'Update Site' : 'Create Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
