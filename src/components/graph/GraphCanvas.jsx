import { useRef, useState, useCallback, useEffect } from 'react';
import { gsap } from 'gsap';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';
import { useGraphLayout } from '../../hooks/useGraphLayout';
import { useFamilyStore } from '../../store/familyStore';
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
  const storeEdges = useFamilyStore((s) => s.edges);
  const setNodePos = useFamilyStore((s) => s.setNodePosition);

  // ── Camera state ──────────────────────────────────────────
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
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

  // ── Centre on ME on mount ─────────────────────────────────
  useEffect(() => {
    if (!meId || nodes.length === 0) return;
    const me = nodes.find((n) => n.id === meId);
    if (!me || !svgRef.current) return;
    const { width, height } = svgRef.current.getBoundingClientRect();
    const nc = { x: width / 2 - me.x, y: height / 2 - me.y, scale: 1 };
    updateCamera(nc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, nodes.length === 0]);

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
  const visibleNodes = nodes.filter((n) => (n.gen ?? 1) <= generationFilter);
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
      </defs>

      <g ref={gRef} transform={transform}>
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
        <text
          x="50%" y="50%" textAnchor="middle"
          fill="var(--text-tertiary)" fontSize="13"
          fontFamily="var(--font-sans)"
        >
          Your family graph will appear here
        </text>
      )}
    </svg>
  );
}
