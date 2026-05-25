import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ChevronDown, Check, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface Org {
  id: string;
  name: string;
  slug: string;
  environment: string;
  isActive: boolean;
  _count?: { users: number; incidents: number };
}

const envColors: Record<string, { bg: string; color: string; border: string }> = {
  PROD: { bg: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' },
  DR: { bg: 'rgba(217,119,6,0.08)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' },
  UAT: { bg: 'rgba(14,165,233,0.08)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.2)' },
  DEV: { bg: '#eef2f6', color: '#344054', border: '1px solid #d8dde6' },
};

export default function OrgSwitcher() {
  const user = useAuthStore((s) => s.user);
  const selectedOrgId = useAuthStore((s) => s.selectedOrgId);
  const setSelectedOrg = useAuthStore((s) => s.setSelectedOrg);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function switchOrg(id: string | null) {
    setSelectedOrg(id);
    setOpen(false);
    qc.invalidateQueries({ predicate: (q) => !q.queryKey.includes('organizations') });
  }
  const isSuperAdmin = user?.role === 'ADMIN' && !user?.organizationId;

  const { data } = useQuery<any>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get('/organizations?limit=50');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    staleTime: 120000,
    enabled: isSuperAdmin,
  });

  // Defensive: other components share queryKey ['organizations'] with different
  // response shape contracts. Unwrap whatever cache shape we got.
  const orgs: Org[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.results)
        ? data.results
        : [];
  const selected = orgs.find((o) => o.id === selectedOrgId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!isSuperAdmin) return null;

  const defaultEnvStyle = { bg: '#eef2f6', color: '#344054', border: '1px solid #d8dde6' };

  return (
    <div ref={ref} className="relative px-3 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
        style={{
          background: '#ffffff',
          border: '1px solid #c6ccd5',
          color: '#0f172a',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e2e8f0';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f1f5f9';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      >
        <Building2 size={14} style={{ color: '#001d5b' }} className="shrink-0" />
        <span className="truncate flex-1 text-left">
          {selected ? selected.name : 'All Organizations'}
        </span>
        {selected && (() => {
          const es = envColors[selected.environment] || defaultEnvStyle;
          return (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
              style={{ background: es.bg, color: es.color, border: es.border }}
            >
              {selected.environment}
            </span>
          );
        })()}
        <ChevronDown size={12} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl max-h-[400px] overflow-y-auto"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(99,102,241,0.12)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {/* All orgs option */}
          <button
            onClick={() => switchOrg(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
            style={{
              borderBottom: '1px solid #e2e8f0',
              background: !selectedOrgId ? 'rgba(99,102,241,0.06)' : 'transparent',
              color: !selectedOrgId ? '#6366f1' : '#64748b',
            }}
            onMouseEnter={(e) => {
              if (selectedOrgId) {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedOrgId) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }
            }}
          >
            <Globe size={13} />
            <span className="flex-1 text-left font-medium">All Organizations</span>
            {!selectedOrgId && <Check size={13} style={{ color: '#6366f1' }} />}
          </button>

          {orgs.map((org) => {
            const isSelected = selectedOrgId === org.id;
            const es = envColors[org.environment] || defaultEnvStyle;
            return (
              <button
                key={org.id}
                onClick={() => switchOrg(org.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                style={{
                  background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                  color: isSelected ? '#6366f1' : '#64748b',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                <Building2 size={12} className="shrink-0 opacity-50" />
                <span className="flex-1 text-left truncate">{org.name}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0"
                  style={{ background: es.bg, color: es.color, border: es.border }}
                >
                  {org.environment}
                </span>
                {isSelected && <Check size={12} style={{ color: '#6366f1' }} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
