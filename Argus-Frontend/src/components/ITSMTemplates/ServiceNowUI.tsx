/**
 * ServiceNow-style ITSM UI primitives for dense record forms.
 * Visual target: classic ServiceNow incident/change/problem form anatomy.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Link2,
  Loader2,
  Printer,
  Save,
} from 'lucide-react';

export const sn = {
  pageBg: '#ffffff',
  shellBg: '#f4f6f8',
  sectionBg: '#e8eef5',
  labelBg: '#f7f8fa',
  cardBg: '#ffffff',
  border: '#d8dde6',
  borderStrong: '#c6ccd5',
  borderInput: '#cbd2dc',
  label: '#2e3a46',
  text: '#1f2937',
  navy: '#001d5b',
  link: '#001d5b',
  primaryBtn: '#06136e',
  primaryBtnHover: '#020b4e',
  critical: '#d0272b',
  progress: '#f05a00',
} as const;

type BadgeTone = 'critical' | 'warn' | 'neutral' | 'success' | 'progress' | 'info';

export function SNPage({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={clsx('sn-itsm-page sn-itms-page', className)} style={{ background: sn.pageBg, ...style }}>
      <style>{`
        .sn-itsm-page {
          color: ${sn.text};
          font-family: Arial, Helvetica, sans-serif;
        }
        .sn-itsm-page input.sn-field,
        .sn-itsm-page select.sn-field,
        .sn-itsm-page textarea.sn-field {
          width: 100%;
          border: 1px solid ${sn.borderInput};
          background: #fff;
          color: #000;
          font-size: 20px;
          line-height: 1.25;
          outline: none;
          border-radius: 4px;
          box-shadow: inset 0 1px 1px rgba(0,0,0,0.025);
        }
        .sn-itsm-page input.sn-field,
        .sn-itsm-page select.sn-field {
          height: 45px;
          padding: 0 16px;
        }
        .sn-itsm-page textarea.sn-field {
          min-height: 146px;
          padding: 14px 16px;
          resize: vertical;
        }
        .sn-itsm-page input.sn-field:focus,
        .sn-itsm-page select.sn-field:focus,
        .sn-itsm-page textarea.sn-field:focus {
          border-color: #6b7da4;
          box-shadow: 0 0 0 2px rgba(6,19,110,0.10);
        }
        .sn-itsm-page .sn-readonly {
          min-height: 45px;
          display: flex;
          align-items: center;
          color: ${sn.text};
          font-size: 18px;
          font-weight: 700;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }
        .sn-itsm-page .sn-record-grid {
          display: grid;
          grid-template-columns: minmax(170px, 270px) minmax(240px, 1fr) minmax(170px, 270px) minmax(240px, 1fr);
          border-top: 1px solid ${sn.border};
          border-left: 1px solid ${sn.border};
        }
        .sn-itsm-page .sn-record-label,
        .sn-itsm-page .sn-record-control {
          min-height: 75px;
          border-right: 1px solid ${sn.border};
          border-bottom: 1px solid ${sn.border};
          display: flex;
          align-items: center;
        }
        .sn-itsm-page .sn-record-label {
          background: ${sn.labelBg};
          color: ${sn.label};
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 700;
        }
        .sn-itsm-page .sn-record-control {
          background: #fff;
          padding: 15px 24px;
        }
        .sn-itsm-page .sn-record-control-wide {
          grid-column: span 3;
        }
        .sn-itsm-page .sn-record-control-stack {
          align-items: stretch;
          flex-direction: column;
          justify-content: center;
        }
        .sn-itsm-page .sn-record-label-tall,
        .sn-itsm-page .sn-record-control-tall {
          min-height: 160px;
        }
        .sn-itsm-page .sn-tab {
          border: 1px solid ${sn.border};
          border-bottom: 0;
          background: #f7f8fa;
          color: #2f3944;
          font-size: 14px;
          font-weight: 700;
          padding: 10px 16px;
        }
        .sn-itsm-page .sn-tab-active {
          background: #fff;
          color: ${sn.navy};
          position: relative;
          top: 1px;
        }
        .sn-itsm-page .sn-list-shell {
          border: 1px solid ${sn.border};
          background: #fff;
        }
        .sn-itsm-page .sn-list-titlebar {
          min-height: 58px;
          border-bottom: 1px solid ${sn.border};
          background: #f7f8fa;
          color: ${sn.label};
        }
        .sn-itsm-page .sn-list-toolbar {
          border-bottom: 1px solid ${sn.border};
          background: #fff;
        }
        .sn-itsm-page .sn-list-input,
        .sn-itsm-page .sn-list-select {
          height: 34px;
          border: 1px solid ${sn.borderInput};
          border-radius: 3px;
          background: #fff;
          color: #111827;
          font-size: 14px;
          outline: none;
        }
        .sn-itsm-page .sn-list-input {
          padding: 0 12px 0 34px;
        }
        .sn-itsm-page .sn-list-select {
          padding: 0 30px 0 10px;
        }
        .sn-itsm-page .sn-list-input:focus,
        .sn-itsm-page .sn-list-select:focus {
          border-color: #6b7da4;
          box-shadow: 0 0 0 2px rgba(6,19,110,0.08);
        }
        .sn-itsm-page .sn-list-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 14px;
        }
        .sn-itsm-page .sn-list-table th {
          height: 39px;
          border-right: 1px solid ${sn.border};
          border-bottom: 1px solid ${sn.borderStrong};
          background: #eef2f6;
          color: #344054;
          padding: 0 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .sn-itsm-page .sn-list-table td {
          height: 43px;
          border-right: 1px solid ${sn.border};
          border-bottom: 1px solid ${sn.border};
          background: #fff;
          color: #1f2937;
          padding: 6px 12px;
          vertical-align: middle;
        }
        .sn-itsm-page .sn-list-table tr:hover td {
          background: #f8fbff;
        }
        .sn-itsm-page .sn-list-link {
          color: ${sn.navy};
          font-weight: 700;
          text-decoration: none;
        }
        .sn-itsm-page .sn-list-link:hover {
          text-decoration: underline;
        }
        .sn-itsm-page .sn-list-empty {
          min-height: 280px;
          border-bottom: 1px solid ${sn.border};
          background: #fff;
        }
        .sn-itsm-page .sn-soft-button {
          min-height: 34px;
          border: 1px solid ${sn.borderStrong};
          border-radius: 3px;
          background: #fff;
          color: #111827;
          padding: 0 12px;
          font-size: 14px;
          font-weight: 700;
        }
        .sn-itsm-page .sn-soft-button:hover {
          background: #f3f5f8;
        }
        .sn-itsm-page .sn-primary-button {
          min-height: 36px;
          border: 1px solid ${sn.primaryBtn};
          border-radius: 3px;
          background: ${sn.primaryBtn};
          color: #fff;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 700;
        }
        .sn-itsm-page .sn-primary-button:hover {
          background: ${sn.primaryBtnHover};
        }
        .sn-itsm-page .sn-status-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 24px;
          border-radius: 3px;
          border: 1px solid ${sn.border};
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }
        @media (max-width: 980px) {
          .sn-itsm-page .sn-record-grid {
            grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
          }
          .sn-itsm-page .sn-record-control-wide {
            grid-column: span 1;
          }
          .sn-itsm-page .sn-record-label,
          .sn-itsm-page .sn-record-control {
            min-height: 64px;
            padding-left: 16px;
            padding-right: 16px;
          }
        }
        @media (max-width: 640px) {
          .sn-itsm-page .sn-record-grid {
            grid-template-columns: 1fr;
          }
          .sn-itsm-page .sn-record-label {
            min-height: 38px;
            padding-top: 10px;
            padding-bottom: 8px;
            align-items: flex-end;
          }
          .sn-itsm-page .sn-record-control {
            min-height: 58px;
            padding-top: 8px;
          }
          .sn-itsm-page .sn-record-control-wide {
            grid-column: auto;
          }
        }
      `}</style>
      {children}
    </div>
  );
}

export function SNPillBadge({
  label,
  tone = 'neutral',
  dot,
  icon: Icon,
}: {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const styles: Record<BadgeTone, CSSProperties> = {
    critical: { background: '#fff6f6', color: sn.critical, border: '1px solid #ff4b52' },
    warn: { background: '#fff7e8', color: '#b45309', border: '1px solid #f5c266' },
    neutral: { background: '#f5f6f7', color: '#344054', border: '1px solid #d8dde6' },
    success: { background: '#ecfdf3', color: '#067647', border: '1px solid #9be7bd' },
    progress: { background: '#fff1df', color: sn.progress, border: '1px solid #ffe1b8' },
    info: { background: '#eff6ff', color: '#075985', border: '1px solid #bfdbfe' },
  };
  const dotColor = tone === 'critical' ? sn.critical : tone === 'progress' ? sn.progress : 'currentColor';

  return (
    <span
      className="inline-flex items-center gap-2 rounded px-5 py-2.5 text-[16px] font-bold uppercase leading-none"
      style={{ ...styles[tone], minHeight: 45 }}
    >
      {dot && <span className="h-[17px] w-[17px] rounded-full shrink-0" style={{ background: dotColor }} />}
      {Icon && <Icon size={18} className={clsx('shrink-0', tone === 'progress' && 'animate-spin')} />}
      <span>{label}</span>
    </span>
  );
}

function SNActionButton({
  children,
  icon: Icon,
  onClick,
  primary,
  disabled,
}: {
  children: ReactNode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded border px-6 py-3 text-[18px] font-medium transition-colors disabled:opacity-60"
      style={
        primary
          ? { background: sn.primaryBtn, borderColor: sn.primaryBtn, color: '#fff', minWidth: 133, minHeight: 47 }
          : { background: '#fff', borderColor: sn.borderStrong, color: '#050505', minWidth: 114, minHeight: 47 }
      }
      onMouseEnter={(event) => {
        if (primary && !disabled) event.currentTarget.style.background = sn.primaryBtnHover;
        if (!primary && !disabled) event.currentTarget.style.background = '#f8fafc';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = primary ? sn.primaryBtn : '#fff';
      }}
    >
      <Icon size={19} className="shrink-0" />
      {children}
    </button>
  );
}

export function SNRecordHeader({
  number,
  titleNumber,
  priorityPill,
  statePill,
  extraBadges,
  onClone,
  onLink,
  onPrint,
  onUpdate,
  updateLoading,
  updateLabel = 'Update',
  secondaryActions,
}: {
  number: string;
  titleNumber?: ReactNode;
  priorityPill: ReactNode;
  statePill: ReactNode;
  extraBadges?: ReactNode;
  onClone?: () => void;
  onLink?: () => void;
  onPrint?: () => void;
  onUpdate?: () => void;
  updateLoading?: boolean;
  updateLabel?: string;
  secondaryActions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b bg-white px-8 py-6 xl:flex-row xl:items-center xl:justify-between" style={{ borderColor: sn.border }}>
      <div className="flex min-w-0 flex-wrap items-center gap-6">
        <h1
          className="truncate font-mono text-[30px] font-black leading-none"
          style={{ color: sn.navy, letterSpacing: '0' }}
          title={number}
        >
          {titleNumber ?? number}
        </h1>
        {priorityPill}
        {statePill}
        {extraBadges}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {secondaryActions}
        {onClone && <SNActionButton icon={Copy} onClick={onClone}>Clone</SNActionButton>}
        {onLink && <SNActionButton icon={Link2} onClick={onLink}>Link</SNActionButton>}
        {onPrint && <SNActionButton icon={Printer} onClick={onPrint}>Print</SNActionButton>}
        {onUpdate && (
          <SNActionButton icon={updateLoading ? Loader2 : Save} onClick={onUpdate} primary disabled={updateLoading}>
            {updateLabel}
          </SNActionButton>
        )}
      </div>
    </div>
  );
}

export function SNCollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-x border-b" style={{ borderColor: sn.border }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-7 py-4 text-left text-[18px] font-bold uppercase tracking-wide"
        style={{ color: sn.label, background: sn.sectionBg, borderTop: `1px solid ${sn.border}` }}
      >
        {open ? <ChevronDown size={20} className="shrink-0" /> : <ChevronRight size={20} className="shrink-0" />}
        {title}
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

export function SNRecordGrid({ children }: { children: ReactNode }) {
  return <div className="sn-record-grid">{children}</div>;
}

export function SNRecordField({
  label,
  required,
  children,
  fullWidth,
  tall,
  stack,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
  tall?: boolean;
  stack?: boolean;
}) {
  return (
    <>
      <div className={clsx('sn-record-label', tall && 'sn-record-label-tall')}>
        <span>
          {label}
          {required && <span style={{ color: sn.critical }}> *</span>}
        </span>
      </div>
      <div
        className={clsx(
          'sn-record-control',
          fullWidth && 'sn-record-control-wide',
          tall && 'sn-record-control-tall',
          stack && 'sn-record-control-stack',
        )}
      >
        {children}
      </div>
    </>
  );
}

export function SNReadOnly({
  children,
  muted,
  color,
}: {
  children: ReactNode;
  muted?: boolean;
  color?: string;
}) {
  return (
    <div className="sn-readonly" style={{ color: color ?? (muted ? '#667085' : undefined) }}>
      {children}
    </div>
  );
}

export function SNFieldGrid({ children }: { children: ReactNode }) {
  return <SNRecordGrid>{children}</SNRecordGrid>;
}

export function SNLabel({ children, required, htmlFor }: { children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-bold" style={{ color: sn.label }}>
      {children}
      {required && <span style={{ color: sn.critical }}> *</span>}
    </label>
  );
}

export function SNFormRow({
  label,
  required,
  children,
  fullWidth,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <SNRecordField label={label} required={required} fullWidth={fullWidth}>
      {children}
    </SNRecordField>
  );
}

export function SNTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ key: string; label: string; count?: number }>;
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-end gap-1 border-b px-1" style={{ borderColor: sn.border }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={clsx('sn-tab', active === tab.key && 'sn-tab-active')}
        >
          {tab.label}
          {tab.count ? <span className="ml-1 font-normal text-slate-500">({tab.count})</span> : null}
        </button>
      ))}
    </div>
  );
}
