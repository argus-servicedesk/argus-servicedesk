import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Database,
  Globe,
  Network,
  HardDrive,
  Container,
  Monitor,
  Box,
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useTopologyData, type TopologyNode, type TopologyConnection, type TopologyRelationship } from '../../hooks/useTopology';

// -- Constants --

const typeIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  SERVER: Server,
  KUBERNETES_CLUSTER: Container,
  DATABASE: Database,
  APPLICATION: Globe,
  NETWORK: Network,
  STORAGE: HardDrive,
  CONTAINER: Box,
  VM: Monitor,
  LOAD_BALANCER: GitBranch,
  FIREWALL: Network,
  ROUTER: Network,
  SWITCH: Network,
};

const LAYER_CONFIG = [
  {
    key: 'network',
    label: 'Network Layer',
    types: ['NETWORK', 'FIREWALL', 'ROUTER', 'SWITCH', 'LOAD_BALANCER'],
    color: '#E879F9',
    bgAccent: 'rgba(217,70,239,0.04)',
  },
  {
    key: 'compute',
    label: 'Compute Layer',
    types: ['SERVER', 'KUBERNETES_CLUSTER', 'VM'],
    color: '#6366f1',
    bgAccent: 'rgba(99,102,241,0.04)',
  },
  {
    key: 'data',
    label: 'Data Layer',
    types: ['DATABASE', 'APPLICATION', 'STORAGE', 'CONTAINER'],
    color: '#F59E0B',
    bgAccent: 'rgba(245,158,11,0.04)',
  },
];

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;
const LAYER_GAP = 160;
const NODE_GAP = 32;
const LAYER_TOP_PADDING = 60;
const LEFT_LABEL_WIDTH = 140;

const statusBorderColors: Record<string, string> = {
  LIVE: '#34D399',
  MAINTENANCE: '#FBBF24',
  DECOMMISSIONED: '#94a3b8',
  PLANNED: '#64748b',
};

const connectionLineColors: Record<string, string> = {
  active: '#34D399',
  degraded: '#FBBF24',
  down: '#EF4444',
};

// -- Helpers --

interface LayoutNode {
  node: TopologyNode;
  x: number;
  y: number;
  layerIndex: number;
}

function computeLayout(nodes: TopologyNode[]): { layoutNodes: LayoutNode[]; totalWidth: number; totalHeight: number } {
  const layoutNodes: LayoutNode[] = [];
  let maxRowWidth = 0;

  LAYER_CONFIG.forEach((layer, layerIndex) => {
    const layerNodes = nodes.filter((n) => layer.types.includes(n.type));
    const rowWidth = layerNodes.length * NODE_WIDTH + (layerNodes.length - 1) * NODE_GAP;
    if (rowWidth > maxRowWidth) maxRowWidth = rowWidth;

    const startX = LEFT_LABEL_WIDTH + 40;
    const y = LAYER_TOP_PADDING + layerIndex * (NODE_HEIGHT + LAYER_GAP);

    layerNodes.forEach((node, i) => {
      layoutNodes.push({
        node,
        x: startX + i * (NODE_WIDTH + NODE_GAP),
        y,
        layerIndex,
      });
    });
  });

  const totalWidth = Math.max(maxRowWidth + LEFT_LABEL_WIDTH + 120, 900);
  const totalHeight = LAYER_TOP_PADDING + LAYER_CONFIG.length * (NODE_HEIGHT + LAYER_GAP) + 40;

  return { layoutNodes, totalWidth, totalHeight };
}

// -- Sub-components --

function TopologyNodeCard({
  ln,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  ln: LayoutNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const Icon = typeIcons[ln.node.type] || Server;
  const borderColor = statusBorderColors[ln.node.status] ?? '#94a3b8';
  const statusDot = borderColor;
  const hasDiagram = !!(ln.node.manufacturer && ln.node.model);

  return (
    <foreignObject x={ln.x} y={ln.y} width={NODE_WIDTH} height={NODE_HEIGHT}>
      <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          background: '#FFFFFF',
          border: `2px solid ${borderColor}`,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
          cursor: 'pointer',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column' as const,
          justifyContent: 'space-between' as const,
          transition: 'box-shadow 0.2s, transform 0.2s',
          position: 'relative' as const,
          overflow: 'hidden',
        }}
        className="topology-node-card"
      >
        {/* Top row: icon + name + status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(99,102,241,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon style={{ width: 14, height: 14, color: '#6366f1' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#0f172a',
                whiteSpace: 'nowrap' as const,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '16px',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {ln.node.name}
            </div>
          </div>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statusDot,
              flexShrink: 0,
              boxShadow: `0 0 6px ${statusDot}`,
            }}
          />
        </div>

        {/* IP address */}
        <div
          style={{
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#64748b',
            marginTop: 2,
            whiteSpace: 'nowrap' as const,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {ln.node.ipAddress ?? '--'}
        </div>

        {/* Bottom row: type badge + SVG badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
          <span
            style={{
              fontSize: 9,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              color: '#6366f1',
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.12)',
              borderRadius: 4,
              padding: '1px 5px',
              letterSpacing: '0.02em',
            }}
          >
            {ln.node.type.replace(/_/g, ' ')}
          </span>
          {hasDiagram && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: '#D97706',
                background: 'rgba(217,119,6,0.08)',
                border: '1px solid rgba(217,119,6,0.18)',
                borderRadius: 4,
                padding: '1px 4px',
                letterSpacing: '0.05em',
              }}
            >
              SVG
            </span>
          )}
        </div>
      </div>
    </foreignObject>
  );
}

function ConnectionTooltip({
  conn,
  x,
  y,
}: {
  conn: TopologyConnection;
  x: number;
  y: number;
}) {
  return (
    <foreignObject x={x - 100} y={y - 60} width={200} height={56}>
      <div
        style={{
          background: '#1E293B',
          borderRadius: 8,
          padding: '6px 10px',
          color: '#ffffff',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap' as const,
          textAlign: 'center' as const,
          lineHeight: '16px',
        }}
      >
        {conn.sourcePort && conn.destPort && (
          <div>{conn.sourcePort} &rarr; {conn.destPort}</div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 2 }}>
          {conn.bandwidth && <span style={{ color: '#94a3b8' }}>BW: {conn.bandwidth}</span>}
          {conn.vlan && <span style={{ color: '#94a3b8' }}>VLAN: {conn.vlan}</span>}
        </div>
        {!conn.sourcePort && !conn.destPort && !conn.bandwidth && !conn.vlan && (
          <div style={{ color: '#94a3b8' }}>{conn.connectionType ?? 'Connection'}</div>
        )}
      </div>
    </foreignObject>
  );
}

// -- Main Component --

export default function TopologyView() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredConn, setHoveredConn] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useTopologyData();

  const nodes = data?.data?.nodes ?? [];
  const connections = data?.data?.connections ?? [];
  const relationships = data?.data?.relationships ?? [];

  const { layoutNodes, totalWidth, totalHeight } = useMemo(() => computeLayout(nodes), [nodes]);

  // Map node id -> layout position
  const nodePositions = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    layoutNodes.forEach((ln) => map.set(ln.node.id, ln));
    return map;
  }, [layoutNodes]);

  // Build edges from connections and relationships
  const edges = useMemo(() => {
    const result: Array<{
      id: string;
      sourceId: string;
      destId: string;
      color: string;
      dashed: boolean;
      conn: TopologyConnection | null;
    }> = [];

    connections.forEach((c) => {
      const color = connectionLineColors[c.status ?? ''] ?? '#94a3b8';
      result.push({
        id: c.id,
        sourceId: c.sourceDeviceId,
        destId: c.destinationDeviceId,
        color,
        dashed: false,
        conn: c,
      });
    });

    relationships.forEach((r) => {
      // Skip if already drawn as connection
      if (result.some((e) => (e.sourceId === r.parentId && e.destId === r.childId))) return;
      result.push({
        id: r.id,
        sourceId: r.parentId,
        destId: r.childId,
        color: '#94a3b8',
        dashed: r.type === 'DEPENDS_ON',
        conn: null,
      });
    });

    return result;
  }, [connections, relationships]);

  // Zoom controls
  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.15, 2.5)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.15, 0.3)), []);
  const zoomReset = useCallback(() => { setScale(1); setPan({ x: 0, y: 0 }); }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.topology-node-card')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Scroll to zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setScale((s) => Math.min(Math.max(s + delta, 0.3), 2.5));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // -- Loading / Error states --

  if (isLoading) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          minHeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <Loader2 style={{ width: 32, height: 32, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: '#6366f1' }}>Loading topology data...</p>
        <p style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>Fetching device connections and relationships</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          minHeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: 48,
        }}
      >
        <AlertTriangle style={{ width: 32, height: 32, color: '#D97706', marginBottom: 12 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Failed to load topology</p>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <button
          onClick={zoomIn}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#64748b',
          }}
          title="Zoom in"
        >
          <ZoomIn style={{ width: 16, height: 16 }} />
        </button>
        <button
          onClick={zoomOut}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#64748b',
          }}
          title="Zoom out"
        >
          <ZoomOut style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ height: 1, background: '#E2E8F0', margin: '2px 4px' }} />
        <button
          onClick={zoomReset}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#64748b',
          }}
          title="Reset view"
        >
          <Maximize2 style={{ width: 14, height: 14 }} />
        </button>
        <div
          style={{
            textAlign: 'center',
            fontSize: 9,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#94a3b8',
            padding: '2px 0',
          }}
        >
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          background: '#FAFBFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          minHeight: 600,
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : 'grab',
          position: 'relative',
          // Subtle grid pattern
          backgroundImage:
            'radial-gradient(circle, #E2E8F0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <svg
          width={totalWidth}
          height={totalHeight}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {/* Layer backgrounds and labels */}
          {LAYER_CONFIG.map((layer, i) => {
            const y = LAYER_TOP_PADDING + i * (NODE_HEIGHT + LAYER_GAP) - 20;
            const layerHasNodes = nodes.some((n) => layer.types.includes(n.type));
            return (
              <g key={layer.key}>
                {/* Layer background strip */}
                <rect
                  x={0}
                  y={y}
                  width={totalWidth}
                  height={NODE_HEIGHT + 40}
                  rx={8}
                  fill={layer.bgAccent}
                  stroke="none"
                />
                {/* Layer label */}
                <foreignObject x={8} y={y + 8} width={LEFT_LABEL_WIDTH - 8} height={NODE_HEIGHT + 24}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      height: '100%',
                      paddingLeft: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase' as const,
                        color: layer.color,
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      {layer.label}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#94a3b8',
                        fontFamily: 'JetBrains Mono, monospace',
                        marginTop: 2,
                      }}
                    >
                      {nodes.filter((n) => layer.types.includes(n.type)).length} devices
                    </div>
                  </div>
                </foreignObject>
                {/* Dashed separator between layers */}
                {i < LAYER_CONFIG.length - 1 && (
                  <line
                    x1={LEFT_LABEL_WIDTH}
                    y1={y + NODE_HEIGHT + 40 + (LAYER_GAP - 40) / 2}
                    x2={totalWidth - 20}
                    y2={y + NODE_HEIGHT + 40 + (LAYER_GAP - 40) / 2}
                    stroke="#E2E8F0"
                    strokeWidth={1}
                    strokeDasharray="6,4"
                  />
                )}
                {/* Empty state for layer */}
                {!layerHasNodes && (
                  <foreignObject x={LEFT_LABEL_WIDTH + 40} y={y + 8} width={300} height={NODE_HEIGHT + 24}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        fontSize: 11,
                        color: '#cbd5e1',
                        fontStyle: 'italic',
                      }}
                    >
                      No devices in this layer
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Connection lines */}
          {edges.map((edge) => {
            const source = nodePositions.get(edge.sourceId);
            const dest = nodePositions.get(edge.destId);
            if (!source || !dest) return null;

            const x1 = source.x + NODE_WIDTH / 2;
            const y1 = source.y + NODE_HEIGHT;
            const x2 = dest.x + NODE_WIDTH / 2;
            const y2 = dest.y;

            // Bezier curve for smoother connections
            const midY = (y1 + y2) / 2;
            const isHovered = hoveredConn === edge.id;

            return (
              <g key={edge.id}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={isHovered ? 3 : 1.5}
                  strokeDasharray={edge.dashed ? '6,4' : undefined}
                  opacity={isHovered ? 1 : 0.6}
                  style={{ transition: 'stroke-width 0.15s, opacity 0.15s' }}
                />
                {/* Invisible wider hit area for hover */}
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  onMouseEnter={() => setHoveredConn(edge.id)}
                  onMouseLeave={() => setHoveredConn(null)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Connection tooltip */}
                {isHovered && edge.conn && (
                  <ConnectionTooltip
                    conn={edge.conn}
                    x={(x1 + x2) / 2}
                    y={midY}
                  />
                )}
                {/* Arrow head at destination */}
                <polygon
                  points={`${x2 - 4},${y2 - 8} ${x2 + 4},${y2 - 8} ${x2},${y2 - 2}`}
                  fill={edge.color}
                  opacity={isHovered ? 1 : 0.6}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {layoutNodes.map((ln) => (
            <TopologyNodeCard
              key={ln.node.id}
              ln={ln}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
              onClick={() => navigate(`/assets/${ln.node.id}`)}
            />
          ))}
        </svg>

        {/* No connections message */}
        {nodes.length > 0 && connections.length === 0 && relationships.length === 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '10px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              zIndex: 10,
              maxWidth: 500,
            }}
          >
            <Info style={{ width: 16, height: 16, color: '#6366f1', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#64748b', lineHeight: '18px' }}>
              No connections configured. Add connections between devices in the Asset Detail page to see the topology.
            </span>
          </div>
        )}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              padding: 32,
            }}
          >
            <Network style={{ width: 48, height: 48, color: '#cbd5e1', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#6366f1' }}>No devices found</p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Add assets to the CMDB to populate the topology view
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
