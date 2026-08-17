import { useRef, useState } from 'react';
import { RELATIONSHIP_TYPES } from '../../store/familyStore';
import { deriveRelationship } from '../../utils/relationshipEngine';

const EDGE_CONFIGS = {
  [RELATIONSHIP_TYPES.PARENT]:          { color: 'var(--graph-edge-parent)', dash: 'none',    label: 'parent' },
  [RELATIONSHIP_TYPES.CHILD]:           { color: 'var(--graph-edge-parent)', dash: 'none',    label: 'child' },
  [RELATIONSHIP_TYPES.SPOUSE]:          { color: 'var(--graph-edge-spouse)', dash: 'none',    label: 'married' },
  [RELATIONSHIP_TYPES.SIBLING]:         { color: 'var(--graph-edge-sibling)',dash: '6 4',    label: 'sibling' },
  [RELATIONSHIP_TYPES.STEP_PARENT]:     { color: 'var(--graph-edge-parent)', dash: '4 4',    label: 'step-parent' },
  [RELATIONSHIP_TYPES.STEP_CHILD]:      { color: 'var(--graph-edge-parent)', dash: '4 4',    label: 'step-child' },
  [RELATIONSHIP_TYPES.ADOPTED_PARENT]:  { color: 'var(--graph-edge-parent)', dash: '2 6',    label: 'adoptive parent' },
  [RELATIONSHIP_TYPES.ADOPTED_CHILD]:   { color: 'var(--graph-edge-parent)', dash: '2 6',    label: 'adopted' },
  [RELATIONSHIP_TYPES.GRANDPARENT]:     { color: 'var(--graph-edge-parent)', dash: 'none',   label: 'grandparent' },
  [RELATIONSHIP_TYPES.GRANDCHILD]:      { color: 'var(--graph-edge-parent)', dash: 'none',   label: 'grandchild' },
};

function getCubicPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dy) > Math.abs(dx)) {
    const cy1 = y1 + dy * 0.5;
    const cy2 = y2 - dy * 0.5;
    return `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
  }
  const cx1 = x1 + dx * 0.5;
  const cx2 = x2 - dx * 0.5;
  return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
}

function getMidpoint(x1, y1, x2, y2) {
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

export function GraphEdge({ edge, fromNode, toNode, meId, people = {}, edges = [], scale = 1, isHighlighted = false }) {
  const [hovered, setHovered] = useState(false);
  const pathRef = useRef(null);

  if (!fromNode || !toNode || typeof fromNode.x !== 'number' || typeof toNode.x !== 'number') {
    return null;
  }

  const config = EDGE_CONFIGS[edge.type] || EDGE_CONFIGS[RELATIONSHIP_TYPES.SIBLING];
  const path = getCubicPath(fromNode.x, fromNode.y, toNode.x, toNode.y);
  const mid = getMidpoint(fromNode.x, fromNode.y, toNode.x, toNode.y);

  const strokeWidth = (hovered || isHighlighted) ? 2.5 : 1.5;
  const isSpouse = edge.type === RELATIONSHIP_TYPES.SPOUSE;

  // ── Calculate Perspective-Correct Relationship Label ─────
  let perspectiveLabel = config.label;
  if (meId && people[meId]) {
    if (fromNode.id === meId || toNode.id === meId) {
      const relativeId = fromNode.id === meId ? toNode.id : fromNode.id;
      const derived = deriveRelationship(meId, relativeId, people, edges);
      if (derived && derived.displayName && derived.displayName !== 'Family Relative' && derived.displayName !== 'Unconnected Relative') {
        perspectiveLabel = derived.displayName;
      }
    } else {
      if (edge.type === RELATIONSHIP_TYPES.SPOUSE) {
        perspectiveLabel = 'MARRIED';
      } else if (edge.type === RELATIONSHIP_TYPES.PARENT) {
        perspectiveLabel = 'PARENT';
      } else if (edge.type === RELATIONSHIP_TYPES.SIBLING) {
        perspectiveLabel = 'SIBLING';
      } else {
        perspectiveLabel = config.label;
      }
    }
  }

  const labelText = perspectiveLabel.toUpperCase();
  const labelWidth = Math.max(76, labelText.length * 7.5 + 24);

  return (
    <g
      className={`graph-edge${isHighlighted ? ' graph-edge--highlight' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wider hit area */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={24 / scale}
        strokeLinecap="round"
        style={{ cursor: 'default' }}
      />

      {/* Base edge curve */}
      <path
        ref={pathRef}
        d={path}
        fill="none"
        stroke={isHighlighted ? 'var(--accent)' : config.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={config.dash === 'none' ? undefined : config.dash}
        opacity={isHighlighted ? 0.95 : (hovered ? 0.9 : 0.6)}
        style={{
          transition: 'opacity 200ms ease, stroke-width 200ms ease, stroke 200ms ease',
        }}
      />

      {/* Kinetic Animated Energy Flow Particle Overlay */}
      <path
        d={path}
        fill="none"
        stroke={isSpouse ? '#e06b88' : 'var(--accent)'}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
        strokeDasharray="4 16"
        opacity={isHighlighted ? 0.9 : (hovered ? 0.8 : 0.35)}
        style={{
          animation: 'edge-pulse-flow 2.2s linear infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Dynamic Perspective Relationship Pill Label */}
      <g transform={`translate(${mid.x}, ${mid.y})`}>
        <rect
          x={-labelWidth / 2}
          y={-11}
          width={labelWidth}
          height={22}
          rx={11}
          fill="var(--bg-elevated)"
          stroke={isHighlighted ? 'var(--accent)' : config.color}
          strokeWidth={1.2}
          opacity={0.96}
        />
        <text
          x={0}
          y={1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isHighlighted ? 'var(--accent)' : 'var(--text-secondary)'}
          fontSize={10}
          fontFamily="var(--font-sans)"
          fontWeight="700"
          letterSpacing="0.05em"
          style={{ userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}
        >
          {labelText}
        </text>
      </g>
    </g>
  );
}
