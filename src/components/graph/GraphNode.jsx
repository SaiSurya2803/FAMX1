import { useState, useCallback, useMemo } from 'react';
import { soundFX } from '../../utils/soundEffects';
import { useFamilyStore } from '../../store/familyStore';
import { deriveRelationship } from '../../utils/relationshipEngine';

const CARD_W = 94;
const CARD_H = 120;
const PHOTO_W = 80;
const PHOTO_H = 70;

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

// Generate deterministic organic tilt (-2.5deg to +2.5deg) for natural polaroid board look
function getOrganicTilt(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return ((hash % 100) / 100) * 5 - 2.5; // between -2.5 and +2.5 deg
}

export function GraphNode({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onAddRelative,
  scale = 1,
}) {
  const [hovered, setHovered] = useState(false);
  const meId   = useFamilyStore((s) => s.meId);
  const people = useFamilyStore((s) => s.people);
  const edges  = useFamilyStore((s) => s.edges);

  const isMe = node.isMe || node.id === meId;
  const tilt = useMemo(() => (isMe ? 0 : getOrganicTilt(node.id)), [node.id, isMe]);

  // Derive relationship label for polaroid chin (e.g. Grandfather / Kakek, Papa, Mama, Sepupu)
  const roleLabel = useMemo(() => {
    if (isMe) return 'YOU (KAMU)';
    if (!meId || !people[meId]) return 'Family';
    const derived = deriveRelationship(meId, node.id, people, edges);
    if (!derived) return 'Relative';
    // Display cultural term or title
    return derived.displayName || 'Relative';
  }, [isMe, meId, node.id, people, edges]);

  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    onDragStart && onDragStart(node.id, e);
  }, [node.id, onDragStart]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    soundFX.playSelect();
    onSelect(node.id);
  }, [node.id, onSelect]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    onAddRelative && onAddRelative(node.id);
  }, [node.id, onAddRelative]);

  const handleTouchStart = useCallback((e) => {
    e.stopPropagation();
    onDragStart && onDragStart(node.id, e.touches[0]);
  }, [node.id, onDragStart]);

  const currentScale = hovered ? 1.08 : (isSelected ? 1.05 : 1);
  const currentLift  = hovered ? -6 : (isSelected ? -4 : 0);

  return (
    <g
      className={`polaroid-node${isMe ? ' polaroid-node--me' : ''}${isSelected ? ' polaroid-node--selected' : ''}`}
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={handleTouchStart}
      style={{ cursor: 'grab' }}
      role="button"
      aria-label={`${node.name}${isMe ? ' (you)' : ''}`}
    >
      {/* Invisible broad hit box */}
      <rect
        x={-CARD_W / 2 - 12}
        y={-CARD_H / 2 - 12}
        width={CARD_W + 24}
        height={CARD_H + 24}
        fill="transparent"
        style={{ pointerEvents: 'all' }}
      />

      {/* Main Polaroid Body with Organic Tilt & Lift */}
      <g
        transform={`translate(0, ${currentLift}) rotate(${tilt}) scale(${currentScale})`}
        style={{
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), filter 0.25s ease',
          transformOrigin: '0px -40px',
          filter: hovered
            ? 'drop-shadow(0 14px 28px rgba(0,0,0,0.55))'
            : isSelected
            ? 'drop-shadow(0 10px 24px rgba(200,169,110,0.45))'
            : 'drop-shadow(0 6px 14px rgba(0,0,0,0.38))',
        }}
      >
        {/* Selection Glowing Outline */}
        {isSelected && (
          <rect
            x={-CARD_W / 2 - 3}
            y={-CARD_H / 2 - 3}
            width={CARD_W + 6}
            height={CARD_H + 6}
            rx={6}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
        )}

        {/* Polaroid Card White Frame */}
        <rect
          x={-CARD_W / 2}
          y={-CARD_H / 2}
          width={CARD_W}
          height={CARD_H}
          rx={4}
          fill="#ffffff"
          stroke={isMe ? 'var(--accent)' : 'rgba(0,0,0,0.08)'}
          strokeWidth={isMe ? 2 : 1}
        />

        {/* Subtle photo area inset border */}
        <rect
          x={-PHOTO_W / 2}
          y={-CARD_H / 2 + 8}
          width={PHOTO_W}
          height={PHOTO_H}
          rx={2}
          fill="#e2e8f0"
          stroke="rgba(0,0,0,0.12)"
          strokeWidth={0.8}
        />

        {/* Photo Clip Path & Image */}
        <clipPath id={`clip-polaroid-${node.id}`}>
          <rect
            x={-PHOTO_W / 2}
            y={-CARD_H / 2 + 8}
            width={PHOTO_W}
            height={PHOTO_H}
            rx={2}
          />
        </clipPath>

        {node.photo ? (
          <image
            href={node.photo}
            x={-PHOTO_W / 2}
            y={-CARD_H / 2 + 8}
            width={PHOTO_W}
            height={PHOTO_H}
            clipPath={`url(#clip-polaroid-${node.id})`}
            preserveAspectRatio="xMidYMid slice"
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <g clipPath={`url(#clip-polaroid-${node.id})`}>
            {/* Fallback illustrated avatar with gender tint */}
            <rect
              x={-PHOTO_W / 2}
              y={-CARD_H / 2 + 8}
              width={PHOTO_W}
              height={PHOTO_H}
              fill={node.gender === 'female' ? '#fdf2f8' : (node.gender === 'male' ? '#f0f9ff' : '#f8fafc')}
            />
            <text
              x={0}
              y={-CARD_H / 2 + 45}
              textAnchor="middle"
              dominantBaseline="central"
              fill={node.gender === 'female' ? '#ec4899' : '#0284c7'}
              fontSize={22}
              fontFamily="var(--font-sans)"
              fontWeight="700"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {getInitials(node.name)}
            </text>
          </g>
        )}

        {/* Deceased Memorial Ribbon (Top-Right Corner) */}
        {node.isDeceased && (
          <g style={{ pointerEvents: 'none' }}>
            <polygon
              points={`${PHOTO_W / 2 - 20},${-CARD_H / 2 + 8} ${PHOTO_W / 2},${-CARD_H / 2 + 8} ${PHOTO_W / 2},${-CARD_H / 2 + 28}`}
              fill="#1e293b"
            />
            <text
              x={PHOTO_W / 2 - 6}
              y={-CARD_H / 2 + 18}
              textAnchor="middle"
              fontSize={8}
              fill="#fbbf24"
            >
              🕯️
            </text>
          </g>
        )}

        {/* White Chin: Person Name */}
        <text
          x={0}
          y={CARD_H / 2 - 24}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#0f172a"
          fontSize={10.5}
          fontFamily="var(--font-sans)"
          fontWeight="700"
          letterSpacing="-0.01em"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {node.name.length > 14 ? `${node.name.slice(0, 13)}…` : node.name}
        </text>

        {/* White Chin: Role / Relationship Title in Golden Chalk Script */}
        <text
          x={0}
          y={CARD_H / 2 - 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isMe ? '#d97706' : '#b45309'}
          fontSize={8.5}
          fontFamily="var(--font-sans)"
          fontWeight="600"
          letterSpacing="0.03em"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {roleLabel.toUpperCase()}
        </text>

        {/* Member Number Badge (Top-Left of Polaroid Chin) */}
        {node.memberNo && (
          <g transform={`translate(${-CARD_W / 2 + 6}, ${CARD_H / 2 - 12})`}>
            <rect x={0} y={-5} width={18} height={10} rx={3} fill="#f1f5f9" />
            <text x={9} y={1} textAnchor="middle" dominantBaseline="central" fill="#64748b" fontSize={7} fontWeight="700">
              #{node.memberNo}
            </text>
          </g>
        )}

        {/* Translucent Washi Tape Strip at Top */}
        <rect
          x={-24}
          y={-CARD_H / 2 - 7}
          width={48}
          height={14}
          rx={1}
          fill="rgba(248, 250, 252, 0.72)"
          stroke="rgba(203, 213, 225, 0.55)"
          strokeWidth={0.7}
          style={{ pointerEvents: 'none' }}
        />

        {/* Realistic Red 3D Pushpin / Thumbtack */}
        <g transform={`translate(0, ${-CARD_H / 2 + 3})`} style={{ pointerEvents: 'none' }}>
          {/* Pushpin Cast Shadow */}
          <ellipse cx={2} cy={5} rx={7} ry={3.5} fill="rgba(0,0,0,0.42)" />
          {/* Metallic Pin Stem */}
          <line x1={0} y1={0} x2={1} y2={4} stroke="#94a3b8" strokeWidth={1.5} />
          {/* Spherical Red Pin Head */}
          <circle r={7.5} fill="url(#red-pin-grad)" stroke="#991b1b" strokeWidth={0.8} />
          {/* Highlight gloss shine */}
          <ellipse cx={-2.2} cy={-2.2} rx={2.8} ry={1.6} fill="rgba(255,255,255,0.75)" transform="rotate(-30 -2.2 -2.2)" />
        </g>
      </g>
    </g>
  );
}
