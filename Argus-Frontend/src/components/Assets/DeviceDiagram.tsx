import { useRef, useEffect, useState, useCallback } from 'react';
import { Loader2, MonitorSpeaker } from 'lucide-react';
import { useSvgTemplate } from '../../hooks/useSvgTemplates';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PortInfo {
  portId: string;
  portName: string;
  portType: 'data' | 'wan' | 'mgmt' | 'dmz' | 'ha' | 'unknown';
}

interface DeviceDiagramProps {
  templateId: string;
  ipAddress?: string;
  onPortClick?: (port: PortInfo) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  port: PortInfo | null;
}

// ─── Port class prefix to type mapping ──────────────────────────────────────

const PORT_CLASS_MAP: Record<string, PortInfo['portType']> = {
  pport: 'data',
  pdmz: 'dmz',
  pmgmt: 'mgmt',
  pwan: 'wan',
  pha: 'ha',
};

const PORT_TYPE_LABELS: Record<PortInfo['portType'], string> = {
  data: 'Data Port',
  wan: 'WAN Port',
  mgmt: 'Management Port',
  dmz: 'DMZ Port',
  ha: 'HA Port',
  unknown: 'Port',
};

const PORT_TYPE_COLORS: Record<PortInfo['portType'], string> = {
  data: '#6366f1',
  wan: '#f59e0b',
  mgmt: '#10b981',
  dmz: '#ef4444',
  ha: '#8b5cf6',
  unknown: '#94a3b8',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function parsePortFromElement(el: Element): PortInfo | null {
  const classList = (el.className && typeof el.className === 'object' ? (el.className as SVGAnimatedString).baseVal : el.getAttribute('class')) || '';
  const classes = classList.split(/\s+/);

  for (const cls of classes) {
    for (const [prefix, portType] of Object.entries(PORT_CLASS_MAP)) {
      if (cls.startsWith(prefix)) {
        const portId = cls;
        const titleEl = el.querySelector('title');
        const portName = titleEl?.textContent || el.getAttribute('title') || cls.replace(prefix, '').replace(/^[-_]/, '');
        return { portId, portName, portType };
      }
    }
  }
  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DeviceDiagram({ templateId, ipAddress, onPortClick }: DeviceDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, port: null });

  const { data, isLoading, isError } = useSvgTemplate(templateId, ipAddress);
  const svgContent = data?.data?.svgContent || '';

  // ── Click delegation for port elements ──
  const handleContainerClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Element;
      // Walk up to find a port element (max 5 levels)
      let el: Element | null = target;
      let port: PortInfo | null = null;
      for (let i = 0; i < 5 && el && el !== containerRef.current; i++) {
        port = parsePortFromElement(el);
        if (port) break;
        el = el.parentElement;
      }

      if (port && el) {
        const rect = el.getBoundingClientRect();
        const containerRect = containerRef.current!.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 8,
          port,
        });
        onPortClick?.(port);
      } else {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    },
    [onPortClick],
  );

  // ── Attach click listener ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgContent) return;
    container.addEventListener('click', handleContainerClick);
    return () => container.removeEventListener('click', handleContainerClick);
  }, [svgContent, handleContainerClick]);

  // ── Inject hover styles into rendered SVG ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgContent) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Make SVG responsive
    svg.setAttribute('width', '100%');
    svg.removeAttribute('height');
    svg.style.height = 'auto';
    svg.style.maxWidth = '100%';
    svg.style.display = 'block';

    // Inject port hover styles
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    const portSelectors = Object.keys(PORT_CLASS_MAP)
      .map((prefix) => `[class*="${prefix}"]`)
      .join(', ');
    style.textContent = `
      ${portSelectors} {
        cursor: pointer;
        transition: filter 0.2s ease, opacity 0.2s ease;
      }
      ${portSelectors}:hover {
        filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.7)) drop-shadow(0 0 12px rgba(16, 185, 129, 0.4));
        opacity: 0.9;
      }
    `;
    svg.insertBefore(style, svg.firstChild);
  }, [svgContent]);

  // ── Dismiss tooltip on outside click / escape ──
  useEffect(() => {
    if (!tooltip.visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTooltip((prev) => ({ ...prev, visible: false }));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [tooltip.visible]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-12 flex flex-col items-center justify-center gap-3"
        style={{ background: '#1E293B', minHeight: '300px' }}
      >
        <Loader2 size={28} className="animate-spin" style={{ color: '#6366f1' }} />
        <p className="text-xs" style={{ color: '#94a3b8' }}>
          Loading device diagram...
        </p>
        {/* Skeleton bars */}
        <div className="w-full max-w-md space-y-2 mt-4">
          {[200, 280, 240].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded animate-pulse"
              style={{ width: `${w}px`, background: 'rgba(99,102,241,0.15)', margin: '0 auto' }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error / no data state ──
  if (isError || !svgContent) {
    return (
      <div
        className="rounded-xl p-12 flex flex-col items-center justify-center gap-3"
        style={{ background: '#1E293B', minHeight: '200px' }}
      >
        <MonitorSpeaker size={32} style={{ color: '#475569' }} />
        <p className="text-sm font-medium" style={{ color: '#64748b' }}>
          No diagram available
        </p>
        <p className="text-xs" style={{ color: '#475569' }}>
          A device diagram template has not been configured for this model.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: '#1E293B' }}>
      {/* ── SVG Container ── */}
      <div
        ref={containerRef}
        className="overflow-x-auto p-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* ── Port Tooltip ── */}
      {tooltip.visible && tooltip.port && (
        <div
          className="absolute pointer-events-none z-50 animate-fade-in"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div
            className="rounded-lg px-3 py-2 shadow-xl text-center whitespace-nowrap"
            style={{
              background: '#0f172a',
              border: `1px solid ${PORT_TYPE_COLORS[tooltip.port.portType]}40`,
              boxShadow: `0 0 16px ${PORT_TYPE_COLORS[tooltip.port.portType]}20`,
            }}
          >
            <p className="text-xs font-semibold" style={{ color: PORT_TYPE_COLORS[tooltip.port.portType] }}>
              {tooltip.port.portName || tooltip.port.portId}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
              {PORT_TYPE_LABELS[tooltip.port.portType]}
            </p>
          </div>
          {/* Arrow */}
          <div
            className="mx-auto w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `5px solid ${PORT_TYPE_COLORS[tooltip.port.portType]}40`,
            }}
          />
        </div>
      )}
    </div>
  );
}
