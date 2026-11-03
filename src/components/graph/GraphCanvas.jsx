import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';
import { useGraphLayout } from '../../hooks/useGraphLayout';
import { useFamilyStore } from '../../store/familyStore';
import { soundFX } from '../../utils/soundEffects';
import './GraphCanvas.css';

const MIN_SCALE      = 0.15;
const MAX_SCALE      = 4;
const ZOOM_SENSITIVITY = 0.001;

/** Convert screen point → SVG world point */
function screenToWorld(sx, sy, camera) {
  return {
    x: (sx - camera.x) / camera.scale,
    y: (sy - camera.y) / camera.scale,
  };
}

export function GraphCanvas({
  selectedId,
  onSelectNode,
  onAddRelative,
  viewMode = 'network',
  generationFilter = 10,
}) {
  const svgRef   = useRef(null);
  const gRef     = useRef(null);
  const meId     = useFamilyStore((s) => s.meId);
  const people   = useFamilyStore((s) => s.people);
  const setNodePos = useFamilyStore((s) => s.setNodePosition);
  const loadShowcaseFamily = useFamilyStore((s) => s.loadShowcaseFamily);

  // ── Camera state (Defaults to center of viewport) ─────────
  const initCam = () => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 450,
    y: typeof window !== 'undefined' ? (window.innerHeight - 72) / 2 : 300,
    scale: 0.95,
  });
  const [camera, setCamera] = useState(initCam);
  const cameraRef = useRef(initCam());
  const animRef   = useRef(null);

  const updateCamera = useCallback((newCam) => {
    cameraRef.current = { ...newCam };
    setCamera({ ...newCam });
  }, []);

  // ── Pan state (canvas drag) ───────────────────────────────
  const panRef = useRef(null); // { startX, startY }

  // ── Node drag state ───────────────────────────────────────
  const nodeDragRef = useRef(null);
  // { nodeId, startWorldX, startWorldY, screenStartX, screenStartY }

  // ── Graph data ────────────────────────────────────────────
  const { nodes, edges } = useGraphLayout();

  // ── Centre on ME or first node on mount ───────────────────
  useEffect(() => {
    if (nodes.length === 0) return;
    const target = nodes.find((n) => n.id === meId) || nodes[0];
    if (!target) return;

    const doCenter = () => {
      const rect = svgRef.current?.getBoundingClientRect();
      const w = rect?.width || window.innerWidth;
      const h = rect?.height || (window.innerHeight - 72);
      const nc = { x: w / 2 - target.x, y: h / 2 - target.y, scale: 0.95 };
      updateCamera(nc);
    };

    doCenter();
    const timer = setTimeout(doCenter, 60);
    return () => clearTimeout(timer);
  }, [meId, nodes, updateCamera]);

  // ── Focus on node (smooth GSAP) ───────────────────────────
  const focusNode = useCallback((nodeId) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (!target || !svgRef.current) return;
    const { width, height } = svgRef.current.getBoundingClientRect();
    const targetScale = 1.1;
    const tx = width  / 2 - target.x * targetScale;
    const ty = height / 2 - target.y * targetScale;
    if (animRef.current) animRef.current.kill();
    const proxy = { ...cameraRef.current };
    animRef.current = gsap.to(proxy, {
      x: tx, y: ty, scale: targetScale,
      duration: 0.9, ease: 'power3.out',
      onUpdate: () => updateCamera({ ...proxy }),
    });
  }, [nodes, updateCamera]);

  useEffect(() => {
    if (selectedId) focusNode(selectedId);
  }, [selectedId, focusNode]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'g' || e.key === 'G') {
        if (document.activeElement.tagName === 'INPUT') return;
        focusNode(meId);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [meId, focusNode]);

  // ── Node drag start ───────────────────────────────────────
  const handleNodeDragStart = useCallback((nodeId, e) => {
    e.stopPropagation?.();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX === undefined) return;

    const world = screenToWorld(clientX, clientY, cameraRef.current);
    const node  = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Offset from cursor to node centre
    nodeDragRef.current = {
      nodeId,
      offsetX: node.x - world.x,
      offsetY: node.y - world.y,
    };
    if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
  }, [nodes]);

  // ── Pointer move ──────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    // Node drag takes priority
    if (nodeDragRef.current) {
      const world = screenToWorld(e.clientX, e.clientY, cameraRef.current);
      const { nodeId, offsetX, offsetY } = nodeDragRef.current;
      setNodePos(nodeId, world.x + offsetX, world.y + offsetY);
      return;
    }
    // Canvas pan
    if (panRef.current) {
      updateCamera({
        ...cameraRef.current,
        x: e.clientX - panRef.current.startX,
        y: e.clientY - panRef.current.startY,
      });
    }
  }, [updateCamera, setNodePos]);

  const handleMouseUp = useCallback(() => {
    nodeDragRef.current = null;
    panRef.current      = null;
    if (svgRef.current) svgRef.current.style.cursor = 'grab';
  }, []);

  // ── Canvas mousedown (pan) ────────────────────────────────
  const handleSvgMouseDown = useCallback((e) => {
    // Only pan on canvas background clicks
    if (e.target !== svgRef.current && e.target !== gRef.current) return;
    panRef.current = {
      startX: e.clientX - cameraRef.current.x,
      startY: e.clientY - cameraRef.current.y,
    };
    if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
  }, []);

  // ── Wheel zoom ────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const svg  = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const oldScale = cameraRef.current.scale;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (1 + delta)));
    const r = newScale / oldScale;
    updateCamera({
      x: mx - (mx - cameraRef.current.x) * r,
      y: my - (my - cameraRef.current.y) * r,
      scale: newScale,
    });
  }, [updateCamera]);

  // ── Touch pan/pinch ───────────────────────────────────────
  const touchRef = useRef(null);
  const handleTouchStart = useCallback((e) => {
    if (nodeDragRef.current) return; // node drag handled by node
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchRef.current = {
        type: 'pan',
        startX: t.clientX - cameraRef.current.x,
        startY: t.clientY - cameraRef.current.y,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = {
        type: 'pinch',
        dist: Math.sqrt(dx * dx + dy * dy),
        scale: cameraRef.current.scale,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    // Node drag
    if (nodeDragRef.current && e.touches.length === 1) {
      const t = e.touches[0];
      const world = screenToWorld(t.clientX, t.clientY, cameraRef.current);
      const { nodeId, offsetX, offsetY } = nodeDragRef.current;
      setNodePos(nodeId, world.x + offsetX, world.y + offsetY);
      return;
    }
    if (!touchRef.current) return;
    if (touchRef.current.type === 'pan' && e.touches.length === 1) {
      const t = e.touches[0];
      updateCamera({
        ...cameraRef.current,
        x: t.clientX - touchRef.current.startX,
        y: t.clientY - touchRef.current.startY,
      });
    } else if (touchRef.current.type === 'pinch' && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      updateCamera({
        ...cameraRef.current,
        scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE,
          touchRef.current.scale * (dist / touchRef.current.dist))),
      });
    }
  }, [updateCamera, setNodePos]);

  const handleTouchEnd = useCallback(() => {
    nodeDragRef.current = null;
    touchRef.current    = null;
  }, []);

  // ── Click canvas to deselect ──────────────────────────────
  const handleSvgClick = useCallback((e) => {
    if (e.target === svgRef.current || e.target === gRef.current) {
      onSelectNode(null);
    }
  }, [onSelectNode]);

  const layoutVersion = useFamilyStore((s) => s.layoutVersion);

  // ── Smooth Camera Re-centering Listener ───────────────────
  useEffect(() => {
    const handleCenter = (e) => {
      setTimeout(() => {
        const targetId = e?.detail?.id || meId;
        const targetNode = nodes.find((n) => n.id === targetId) || nodes[0];
        if (!targetNode || !svgRef.current) return;

        const { width, height } = svgRef.current.getBoundingClientRect();
        const targetX = width / 2 - targetNode.x;
        const targetY = height / 2 - targetNode.y;

        if (animRef.current) animRef.current.kill();
        const obj = { ...cameraRef.current };
        animRef.current = gsap.to(obj, {
          x: targetX,
          y: targetY,
          scale: 1,
          duration: 0.8,
          ease: 'power2.out',
          onUpdate: () => updateCamera({ x: obj.x, y: obj.y, scale: obj.scale }),
        });
      }, 50);
    };

    window.addEventListener('graph:center', handleCenter);
    return () => window.removeEventListener('graph:center', handleCenter);
  }, [meId, nodes, updateCamera, layoutVersion]);

  const transform = `translate(${camera.x},${camera.y}) scale(${camera.scale})`;

  // ── Filter nodes and edges by Generation Time Scrubber ─────
  const maxGen = useMemo(() => {
    return nodes.reduce((max, n) => Math.max(max, n.gen || 1), 1);
  }, [nodes]);

  const visibleNodes = useMemo(() => {
    if (viewMode !== 'generations') {
      return nodes;
    }
    const limit = (generationFilter && generationFilter > 0) ? generationFilter : maxGen;
    return nodes.filter((n) => (n.gen ?? 1) <= limit);
  }, [nodes, viewMode, generationFilter, maxGen]);

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to) && people[e.from] && people[e.to]
  );

  // ── Compute Lineage Trace Highlight Set ─────────────────────
  const activeTraceId = selectedId || meId;
  const lineageNodeIds = new Set();
  if (viewMode === 'lineage' && activeTraceId) {
    lineageNodeIds.add(activeTraceId);
    visibleEdges.forEach((e) => {
      if (e.from === activeTraceId || e.to === activeTraceId) {
        lineageNodeIds.add(e.from);
        lineageNodeIds.add(e.to);
      }
    });
  }

  // ── Compute Generation Tier Heights for 'generations' mode ─
  const relLevels = Array.from(new Set(visibleNodes.map((n) => n.relLevel ?? 0))).sort((a, b) => b - a);

  // ── Compute Bounding Box of Nodes for Chalkboard Keepsake Layout ──
  const bounds = useMemo(() => {
    if (!visibleNodes.length) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    visibleNodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });
    return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2 };
  }, [visibleNodes]);

  return (
    <svg
      ref={svgRef}
      className="graph-canvas"
      onMouseDown={handleSvgMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleSvgClick}
      aria-label="Family relationship graph"
      role="application"
    >
      <defs>
        <filter id="glow-me" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* 3D Realistic Red Pushpin Gradient */}
        <radialGradient id="red-pin-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="35%" stopColor="#ef4444" />
          <stop offset="85%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>

        {/* Golden Amber Pushpin Gradient */}
        <radialGradient id="gold-pin-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </radialGradient>
      </defs>

      <g ref={gRef} transform={transform}>
        {/* ── Chalkboard Memory Board Keepsake Doodles (Matching Reference Photo) ── */}
        {bounds && (
          <g className="chalkboard-doodles" style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {/* Top-Left: "FAMILY TREE" Chalk Oval */}
            <g transform={`translate(${bounds.minX - 180}, ${bounds.minY - 20})`}>
              <ellipse cx="0" cy="0" rx="90" ry="50" fill="none" stroke="#fde047" strokeWidth="2.5" strokeDasharray="14 4" opacity="0.9" filter="drop-shadow(0 0 4px rgba(253, 224, 71, 0.4))" />
              <ellipse cx="-2" cy="1" rx="95" ry="54" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="8 6" opacity="0.6" />
              <text x="0" y="-8" textAnchor="middle" dominantBaseline="central" fill="#fde047" fontSize="26" fontFamily="var(--font-chalk-display, 'Fredericka the Great', cursive)" fontWeight="700" letterSpacing="0.08em">
                FAMILY
              </text>
              <text x="0" y="20" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="28" fontFamily="var(--font-chalk-display, 'Fredericka the Great', cursive)" fontWeight="700" letterSpacing="0.08em">
                TREE
              </text>
            </g>

            {/* Crown Chalk Doodle above Grandparents in Yellow Chalk */}
            <g transform={`translate(${bounds.cx}, ${bounds.minY - 95})`} opacity="0.9">
              <path d="M-22 10 L-22 -8 L-10 2 L0 -14 L10 2 L22 -8 L22 10 Z" fill="none" stroke="#fde047" strokeWidth="2.5" strokeLinejoin="round" filter="drop-shadow(0 0 3px rgba(253, 224, 71, 0.5))" />
            </g>

            {/* Top-Right: "FOTO KELUARGA" Family Keepsake Polaroid */}
            <g transform={`translate(${bounds.maxX + 140}, ${bounds.minY - 10}) rotate(3)`} filter="drop-shadow(0 8px 18px rgba(0,0,0,0.45))">
              <rect x="-65" y="-60" width="130" height="135" rx="3" fill="#ffffff" />
              <image
                href="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&q=80"
                x="-57" y="-52" width="114" height="85"
                preserveAspectRatio="xMidYMid slice"
              />
              <text x="0" y="54" textAnchor="middle" dominantBaseline="central" fill="#0f172a" fontSize="12" fontFamily="var(--font-heading)" fontWeight="700" letterSpacing="0.06em">
                FAMILY ARCHIVE 📸
              </text>
              <rect x="-22" y="-67" width="44" height="14" rx="1" fill="rgba(254, 240, 138, 0.85)" stroke="rgba(202, 138, 4, 0.4)" strokeWidth="0.8" />
              <circle cx="0" cy="-57" r="7.5" fill="url(#red-pin-grad)" stroke="#991b1b" strokeWidth="0.8" />
              <ellipse cx="-2.2" cy="-59.2" rx="2.5" ry="1.5" fill="rgba(255,255,255,0.75)" />
            </g>

            {/* Hand-Drawn Chalk Doodles in Different Chalk Colors */}
            <g opacity="0.8" strokeLinecap="round">
              {/* Sky Blue Chalk Star */}
              <path
                d={`M${bounds.minX - 100} ${bounds.minY + 120} l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 Z`}
                stroke="#38bdf8"
                fill="rgba(56, 189, 248, 0.15)"
                strokeWidth="2"
                filter="drop-shadow(0 0 3px rgba(56, 189, 248, 0.5))"
              />
              {/* Pastel Pink Chalk Heart */}
              <path
                d={`M${bounds.cx - 60} ${bounds.maxY - 20} c-10 -15 -25 0 0 22 c25 -22 10 -37 0 -22 Z`}
                stroke="#f472b6"
                fill="rgba(244, 114, 182, 0.2)"
                strokeWidth="2"
                filter="drop-shadow(0 0 3px rgba(244, 114, 182, 0.5))"
              />
              {/* Mint Green Chalk Butterfly / Flourish */}
              <path
                d={`M${bounds.cx + 50} ${bounds.minY + 160} c-15 -15 -20 15 0 10 c20 5 15 -25 0 -10 Z`}
                stroke="#4ade80"
                fill="none"
                strokeWidth="2"
                filter="drop-shadow(0 0 3px rgba(74, 222, 128, 0.5))"
              />
              {/* Tangerine Orange Chalk Lightning Star */}
              <path
                d={`M${bounds.maxX + 40} ${bounds.minY + 90} l-8 14 h10 l-6 16 16 -18 h-10 Z`}
                stroke="#fb923c"
                fill="rgba(251, 146, 60, 0.2)"
                strokeWidth="2"
                filter="drop-shadow(0 0 3px rgba(251, 146, 60, 0.5))"
              />
              {/* Lavender Purple Chalk Sparkle */}
              <path
                d={`M${bounds.minX - 60} ${bounds.maxY + 40} l0 14 m-7 -7 l14 0 m-5 -5 l10 10 m0 -10 l-10 10`}
                stroke="#c084fc"
                fill="none"
                strokeWidth="2"
                filter="drop-shadow(0 0 3px rgba(192, 132, 252, 0.5))"
              />
            </g>
          </g>
        )}

        {/* Generation Tier Background Guides (when viewMode === 'generations') */}
        {viewMode === 'generations' && relLevels.map((relLvl) => {
          const tierNodes = visibleNodes.filter((n) => (n.relLevel ?? 0) === relLvl);
          if (tierNodes.length === 0) return null;
          const avgY = tierNodes.reduce((sum, n) => sum + n.y, 0) / tierNodes.length;

          let labelStr = 'GENERATION 1 (YOU)';
          if (relLvl === 0) labelStr = 'GENERATION 1 (YOU)';
          else if (relLvl === 1) labelStr = 'GENERATION 2 (PARENTS)';
          else if (relLvl === 2) labelStr = 'GENERATION 3 (GRANDPARENTS)';
          else if (relLvl > 2) labelStr = `GENERATION ${relLvl + 1} (GREAT-GRANDPARENTS)`;
          else if (relLvl === -1) labelStr = 'GENERATION 2 (CHILDREN)';
          else if (relLvl === -2) labelStr = 'GENERATION 3 (GRANDCHILDREN)';
          else if (relLvl < -2) labelStr = `GENERATION ${Math.abs(relLvl) + 1} (DESCENDANTS)`;

          return (
            <g key={relLvl} opacity={0.4}>
              <line
                x1={-2000}
                y1={avgY}
                x2={2000}
                y2={avgY}
                stroke="var(--accent)"
                strokeWidth={1}
                strokeDasharray="6 6"
              />
              <text
                x={-600}
                y={avgY - 12}
                fill="var(--accent)"
                fontSize={11}
                fontFamily="var(--font-sans)"
                fontWeight="600"
                letterSpacing="0.08em"
              >
                {labelStr}
              </text>
            </g>
          );
        })}

        {/* Edges behind nodes */}
        {visibleEdges.map((edge) => {
          const from = visibleNodes.find((n) => n.id === edge.from);
          const to   = visibleNodes.find((n) => n.id === edge.to);
          const isHighlighted = viewMode === 'lineage' && (lineageNodeIds.has(edge.from) && lineageNodeIds.has(edge.to));
          return (
            <GraphEdge
              key={edge.id}
              edge={edge}
              fromNode={from}
              toNode={to}
              meId={meId}
              people={people}
              edges={edges}
              scale={camera.scale}
              isHighlighted={isHighlighted}
            />
          );
        })}

        {/* Nodes */}
        {visibleNodes.map((node) => {
          const isDimmed = viewMode === 'lineage' && lineageNodeIds.size > 0 && !lineageNodeIds.has(node.id);
          return (
            <g key={node.id} opacity={isDimmed ? 0.3 : 1} style={{ transition: 'opacity 0.25s ease' }}>
              <GraphNode
                node={{ ...node, isMe: node.id === meId }}
                isSelected={selectedId === node.id}
                onSelect={onSelectNode}
                onDragStart={handleNodeDragStart}
                onAddRelative={onAddRelative}
                scale={camera.scale}
              />
            </g>
          );
        })}
      </g>

      {visibleNodes.length === 0 && (
        <foreignObject x="0" y="0" width="100%" height="100%" style={{ pointerEvents: 'none' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            pointerEvents: 'none',
          }}>
            <div style={{
              pointerEvents: 'all',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
              borderRadius: 20,
              padding: '36px 40px',
              maxWidth: 440,
              textAlign: 'center',
              boxShadow: 'var(--shadow-xl)',
              backdropFilter: 'blur(16px)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🌳</div>
              <h3 style={{
                fontFamily: "var(--font-heading)",
                color: 'var(--text-primary)',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                marginBottom: 8,
              }}>
                Kinship Graph Canvas
              </h3>
              <p style={{
                fontFamily: "var(--font-sans)",
                color: 'var(--text-secondary)',
                fontSize: 14,
                lineHeight: 1.6,
                marginBottom: 20,
              }}>
                No family members in this view yet. Start building your living family story or explore the showcase dynasty!
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="shimmer-btn"
                  onClick={() => {
                    soundFX.playPop();
                    onAddRelative?.(meId || null);
                  }}
                  style={{
                    background: 'var(--accent)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    padding: '10px 20px',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
                  }}
                >
                  ➕ Add First Relative
                </button>
                <button
                  type="button"
                  className="shimmer-btn"
                  onClick={() => {
                    soundFX.playSuccess();
                    loadShowcaseFamily();
                  }}
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-muted)',
                    borderRadius: 'var(--radius-full)',
                    padding: '10px 20px',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Load Showcase Dynasty
                </button>
              </div>
            </div>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
