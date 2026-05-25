import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, Loader2, Plus, Power, Search } from 'lucide-react';
import api from '../../lib/api';

interface ClientOrg {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  isActive?: boolean;
  created_at?: string;
  createdAt?: string;
}

function extractList(payload: any): ClientOrg[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function slugFromName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ClientManagement() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');

  const clientsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get('/organizations/');
      return extractList(data);
    },
    staleTime: 30000,
  });

  const createClient = useMutation({
    mutationFn: async () => {
      const clientName = name.trim();
      const { data } = await api.post('/organizations/', {
        name: clientName,
        slug: slugFromName(clientName),
        is_active: true,
      });
      return data;
    },
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Client created');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || error?.response?.data?.message || 'Failed to create client');
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await api.patch(`/organizations/${id}/`, { is_active: isActive });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Client updated');
    },
    onError: () => toast.error('Failed to update client'),
  });

  const clients = useMemo(() => {
    const items = clientsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => String(item.name || '').toLowerCase().includes(q) || String(item.slug || '').toLowerCase().includes(q));
  }, [clientsQuery.data, search]);

  return (
    <div className="min-h-full space-y-5 bg-slate-50 p-6">
      <div className="rounded-md border bg-white p-5" style={{ borderColor: '#d8dde6' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" style={{ color: '#001d5b' }} />
              <h1 className="text-xl font-bold text-slate-900">Clients</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">Create and manage separate client companies for portal login isolation.</p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) createClient.mutate();
            }}
            className="flex w-full gap-2 lg:w-auto"
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Client company name"
              className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-indigo-500 lg:w-72"
            />
            <button
              type="submit"
              disabled={!name.trim() || createClient.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Client
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-md border bg-white" style={{ borderColor: '#d8dde6' }}>
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: '#d8dde6' }}>
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients"
            className="w-full text-sm outline-none"
          />
        </div>

        {clientsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading clients...
          </div>
        ) : clients.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No clients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const isActive = client.isActive ?? client.is_active ?? true;
                  return (
                    <tr key={client.id} className="border-t" style={{ borderColor: '#eef2f7' }}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{client.name}</td>
                      <td className="px-4 py-3 text-slate-500">{client.slug || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => updateClient.mutate({ id: client.id, isActive: !isActive })}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          <Power className="h-3.5 w-3.5" />
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
