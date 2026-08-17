import { useState, useCallback } from 'react';

const NODE_RADIUS = 24;
const ME_RADIUS   = 30;

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function GraphNode({
  node,
  isSelected,
  onSelect,
  onDragStart,   // (nodeId, e) → called on mousedown
  onAddRelative,
  scale = 1,
}) {
  const [hovered, setHovered] = useState(false);
  const isMe   = node.isMe;
  const radius = isMe ? ME_RADIUS : NODE_RADIUS;

  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    onDragStart && onDragStart(node.id, e);
  }, [node.id, onDragStart]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onSelect(node.id);
  }, [node.id, onSelect]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    onAddRelative && onAddRelative(node.id);
  }, [node.id, onAddRelative]);

  // Touch drag support
  const handleTouchStart = useCallback((e) => {
    e.stopPropagation();
    onDragStart && onDragStart(node.id, e.touches[0]);
  }, [node.id, onDragStart]);

  const currentScale = hovered ? 1.2 : (isSelected ? 1.1 : 1);

  return (
    <g
      className={`graph-node${isMe ? ' graph-node--me' : ''}${isSelected ? ' graph-node--selected' : ''}`}
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
      {/* Invisible fixed hit circle to prevent hover boundary flicker */}
      <circle r={radius + 20} fill="transparent" style={{ pointerEvents: 'all' }} />

      {/* Visual content scales smoothly around node origin (0,0) */}
      <g
        style={{
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: `scale(${currentScale})`,
          transformOrigin: '0px 0px',
        }}
      >
      {/* ME halo rings */}
      {isMe && (
        <>
          <circle r={radius + 14} fill="none" stroke="var(--accent)" strokeWidth={0.5} opacity={0.15} className="me-halo-outer" />
          <circle r={radius + 7}  fill="none" stroke="var(--accent)" strokeWidth={0.5} opacity={0.25} className="me-halo-inner" />
        </>
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle r={radius + 6} fill="none"
          stroke={isMe ? 'var(--accent)' : 'var(--text-secondary)'}
          strokeWidth={1.5} opacity={0.5} strokeDasharray="4 3" />
      )}

      {/* Hover ring */}
      {hovered && !isSelected && (
        <circle r={radius + 4} fill="none"
          stroke={isMe ? 'var(--accent)' : 'var(--border-base-c)'}
          strokeWidth={1} opacity={0.4} />
      )}

      {/* Node fill */}
      <circle
        r={radius}
        fill={isMe ? 'var(--graph-node-me-fill)' : 'var(--graph-node-fill)'}
        stroke={isMe ? 'var(--graph-node-me-stroke)' : 'var(--graph-node-stroke)'}
        strokeWidth={isMe ? 1.5 : 1}
        style={{
          transition: 'opacity 200ms ease',
          filter: isMe
            ? 'drop-shadow(0 0 8px rgba(200,169,110,0.3))'
            : hovered
            ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))'
            : 'none',
        }}
      />

      {/* Photo or initials */}
      {node.photo ? (
        <clipPath id={`clip-${node.id}`}>
          <circle r={radius - 1} />
        </clipPath>
      ) : null}

      {node.photo ? (
        <image
          href={node.photo}
          x={-(radius - 1)}
          y={-(radius - 1)}
          width={(radius - 1) * 2}
          height={(radius - 1) * 2}
          clipPath={`url(#clip-${node.id})`}
          preserveAspectRatio="xMidYMid slice"
          style={{ pointerEvents: 'none' }}
        />
      ) : (
        <text
          x={0} y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isMe ? 'var(--accent)' : 'var(--text-secondary)'}
          fontSize={isMe ? 11 : 9}
          fontFamily="var(--font-sans)"
          fontWeight={isMe ? '600' : '500'}
          letterSpacing="0.04em"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {getInitials(node.name)}
        </text>
      )}

      {/* Name label */}
      <text
        x={0}
        y={radius + 14}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill={isMe ? 'var(--accent)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)'}
        fontSize={isMe ? 11 : 10}
        fontFamily="var(--font-sans)"
        fontWeight={isMe ? '600' : '400'}
        letterSpacing={isMe ? '0.04em' : '0.02em'}
        style={{ userSelect: 'none', pointerEvents: 'none', transition: 'fill 200ms ease' }}
      >
        {node.name.split(' ')[0]}
      </text>

      {isMe && (
        <text
          x={0} y={radius + 26}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="var(--text-tertiary)"
          fontSize={8}
          fontFamily="var(--font-sans)"
          fontWeight="400"
          letterSpacing="0.1em"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          YOU
        </text>
      )}
      </g>
    </g>
  );
}
