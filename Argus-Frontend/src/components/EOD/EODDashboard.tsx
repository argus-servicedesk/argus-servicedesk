// EOD Operations Dashboard

import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Activity, CheckCircle, AlertTriangle, XCircle,
  Globe, RefreshCw,
  ChevronRight, ChevronDown,
  Maximize2, Minimize2, Eye,
} from 'lucide-react';

/* ===================================================================
   DESIGN SYSTEM — matches DashboardOverview T constants
   =================================================================== */
const T = {
  pageBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  panelBg: '#FFFFFF',
  panelBorder: '#E2E8F0',
  panelHeaderBg: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  divider: '#E2E8F0',
  heroBg: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)',
  // Accents
  indigo: '#4F46E5',
  violet: '#7C3AED',
  emerald: '#059669',
  amber: '#D97706',
  crimson: '#DC2626',
  blue: '#2563EB',
  cyan: '#0891B2',
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
} as const;

export default function EODDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: T.text, marginBottom: '8px' }}>
          EOD Operations Dashboard
        </h1>
        <p style={{ color: T.textSecondary, fontSize: '14px' }}>
          End of Day operations monitoring and status
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '12px', padding: '20px', boxShadow: T.cardShadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: T.textSecondary, fontSize: '13px', fontWeight: '500' }}>Total Tasks</span>
            <Activity style={{ width: '20px', height: '20px', color: T.indigo }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: T.text }}>0</div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '12px', padding: '20px', boxShadow: T.cardShadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: T.textSecondary, fontSize: '13px', fontWeight: '500' }}>Completed</span>
            <CheckCircle style={{ width: '20px', height: '20px', color: T.emerald }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: T.text }}>0</div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '12px', padding: '20px', boxShadow: T.cardShadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: T.textSecondary, fontSize: '13px', fontWeight: '500' }}>Pending</span>
            <AlertTriangle style={{ width: '20px', height: '20px', color: T.amber }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: T.text }}>0</div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '12px', padding: '20px', boxShadow: T.cardShadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: T.textSecondary, fontSize: '13px', fontWeight: '500' }}>Failed</span>
            <XCircle style={{ width: '20px', height: '20px', color: T.crimson }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: T.text }}>0</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: '12px', padding: '24px', boxShadow: T.cardShadow }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: T.text }}>EOD Tasks</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: T.indigo,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px', ...(refreshing && { animation: 'spin 1s linear infinite' }) }} />
            Refresh
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '40px', color: T.textMuted }}>
          <p style={{ fontSize: '14px' }}>No EOD tasks configured yet</p>
        </div>
      </div>
    </div>
  );
}
