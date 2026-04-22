/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Clean light theme with indigo-purple accents ── */
        void: '#eef2ff',
        obsidian: '#ffffff',
        slate: {
          DEFAULT: '#eef2ff',
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
        gray: {
          50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db',
          400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151',
          800: '#1f2937', 900: '#111827', 950: '#030712',
        },
        gunmetal: '#e0e7ff',
        steel: '#c7d2fe',
        graphite: '#64748b',
        signal: '#6366f1',
        emerald: {
          DEFAULT: '#22c55e',
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        amber: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        crimson: '#ef4444',
        red: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d',
        },
        violet: {
          DEFAULT: '#a855f7',
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
          400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
          800: '#5b21b6', 900: '#4c1d95',
        },
        fuchsia: { DEFAULT: '#d946ef' },
        plum: '#6366f1',
        'signal-dim': 'rgba(99,102,241,0.08)',
        'emerald-dim': 'rgba(34,197,94,0.08)',
        'amber-dim': 'rgba(245,158,11,0.08)',
        'crimson-dim': 'rgba(239,68,68,0.08)',
        'violet-dim': 'rgba(168,85,247,0.08)',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'Outfit', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        'glow-purple': '0 10px 15px -3px rgba(99,102,241,0.15), 0 4px 6px -4px rgba(99,102,241,0.1)',
        'glow-pink': '0 10px 15px -3px rgba(168,85,247,0.15), 0 4px 6px -4px rgba(168,85,247,0.1)',
        'glow-brand': '0 10px 15px -3px rgba(99,102,241,0.2), 0 4px 6px -4px rgba(168,85,247,0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'gradient-shift': 'gradientShift 6s ease-in-out infinite',
        'pulse-purple': 'pulsePurple 2s ease-in-out infinite',
        'glow-breathe': 'glowBreathe 3s ease-in-out infinite',
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulsePurple: {
          '0%, 100%': { boxShadow: '0 0 8px -2px rgba(99,102,241,0.2)' },
          '50%': { boxShadow: '0 0 20px -2px rgba(99,102,241,0.35)' },
        },
        glowBreathe: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(to right, rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.04) 1px, transparent 1px)',
        'gradient-brand': 'linear-gradient(135deg, #6366f1, #a855f7)',
        'gradient-hero': 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e0e7ff 100%)',
        'gradient-btn': 'linear-gradient(135deg, #6366f1, #a855f7)',
        'gradient-accent': 'linear-gradient(90deg, #6366f1, #a855f7, #d946ef)',
      },
    },
  },
  plugins: [],
};
