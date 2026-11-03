import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useFamilyStore } from '../store/familyStore';
import { soundFX } from '../utils/soundEffects';
import { parseNaturalText } from '../utils/aiGraphParser';
import './Landing.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── Hero Graph Nodes ───────────────────────────────────────── */
const NODES = [
  // stage 0
  { id: 'me',       x: 450, y: 320, r: 24, isMe: true,  label: 'You',         stage: 0 },
  // stage 1
  { id: 'father',   x: 305, y: 195, r: 16, isMe: false, label: 'Father',      stage: 1 },
  { id: 'mother',   x: 585, y: 190, r: 16, isMe: false, label: 'Mother',      stage: 1 },
  // stage 2
  { id: 'gfp',      x: 185, y: 95,  r: 12, isMe: false, label: 'Grandfather', stage: 2 },
  { id: 'gmp',      x: 355, y: 80,  r: 12, isMe: false, label: 'Grandmother', stage: 2 },
  { id: 'gfm',      x: 525, y: 78,  r: 12, isMe: false, label: 'Grandfather', stage: 2 },
  { id: 'gmm',      x: 690, y: 92,  r: 12, isMe: false, label: 'Grandmother', stage: 2 },
  // stage 3
  { id: 'uncle',    x: 125, y: 195, r: 12, isMe: false, label: 'Uncle',       stage: 3 },
  { id: 'aunt',     x: 765, y: 188, r: 12, isMe: false, label: 'Aunt',        stage: 3 },
  { id: 'ggf',      x:  90, y:  32, r:  8, isMe: false, label: '',            stage: 3 },
  { id: 'ggm',      x: 255, y:  22, r:  8, isMe: false, label: '',            stage: 3 },
  // stage 4
  { id: 'cousin1',  x:  65, y: 290, r:  9, isMe: false, label: 'Cousin',      stage: 4 },
  { id: 'cousin2',  x: 115, y: 360, r:  9, isMe: false, label: 'Cousin',      stage: 4 },
  { id: 'sibling',  x: 325, y: 440, r: 13, isMe: false, label: 'Sibling',     stage: 4 },
  { id: 'sib2',     x: 835, y: 180, r:  9, isMe: false, label: '',            stage: 4 },
  // stage 5
  { id: 'spouse',   x: 590, y: 330, r: 16, isMe: false, label: 'Spouse',      stage: 5 },
  { id: 'sf',       x: 730, y: 215, r: 12, isMe: false, label: "Spouse's",    stage: 5 },
  { id: 'sm',       x: 825, y: 300, r: 12, isMe: false, label: 'Family',      stage: 5 },
  { id: 'sf2',      x: 845, y: 400, r:  9, isMe: false, label: '',            stage: 5 },
  // stage 6
  { id: 'child1',   x: 340, y: 505, r: 13, isMe: false, label: 'Child',       stage: 6 },
  { id: 'child2',   x: 465, y: 518, r: 13, isMe: false, label: 'Child',       stage: 6 },
  { id: 'child3',   x: 595, y: 498, r: 12, isMe: false, label: 'Child',       stage: 6 },
  // stage 7 — extra network nodes
  { id: 'x1',       x:  42, y: 175, r:  7, isMe: false, label: '',            stage: 7 },
  { id: 'x2',       x: 190, y: 555, r:  7, isMe: false, label: '',            stage: 7 },
  { id: 'x3',       x: 700, y: 555, r:  7, isMe: false, label: '',            stage: 7 },
  { id: 'x4',       x: 875, y: 490, r:  7, isMe: false, label: '',            stage: 7 },
  { id: 'x5',       x: 420, y: 590, r:  7, isMe: false, label: '',            stage: 7 },
];

const EDGES = [
  ['father','me'], ['mother','me'],
  ['gfp','father'], ['gmp','father'],
  ['gfm','mother'], ['gmm','mother'],
  ['ggf','gfp'], ['ggm','gfp'],
  ['uncle','gfp'], ['aunt','gmm'],
  ['cousin1','uncle'], ['cousin2','uncle'],
  ['sibling','father'],
  ['sib2','aunt'],
  ['me','spouse'],
  ['sf','spouse'], ['sm','sf'], ['sf2','sm'],
  ['child1','me'], ['child2','me'], ['child3','me'],
  ['x1','uncle'], ['x2','sibling'], ['x3','child3'], ['x4','sf2'], ['x5','child2'],
];

const STAGES = [
  { heading: 'You.',                                      sub: null },
  { heading: 'You came\nfrom somewhere.',                 sub: null },
  { heading: 'Your parents\ncame from somewhere.',        sub: null },
  { heading: 'Their parents\ndid too.',                   sub: null },
  { heading: 'Families\ngrew outward.',                   sub: null },
  { heading: 'They connected.\nMarried. Branched.',       sub: null },
  { heading: 'Now your\nstory continues.',                sub: null },
  { heading: 'Your family\nis a living network.',         sub: 'Synthesized with mathematical precision.' },
];

/* ─── Hero SVG Graph Component ──────────────────────────────── */
function HeroGraph({ nodeRefs, edgeRefs }) {
  const nodeMap = {};
  NODES.forEach((n) => { nodeMap[n.id] = n; });

  return (
    <svg
      className="lhero-graph"
      viewBox="0 0 900 640"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <filter id="me-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="node-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="me-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fdf4dc" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#e8c87e" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#c8a96e" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="node-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#c8a96e" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* Edges */}
      {EDGES.map(([fromId, toId], i) => {
        const from = nodeMap[fromId];
        const to   = nodeMap[toId];
        if (!from || !to) return null;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const cx1 = from.x + dx * 0.25;
        const cy1 = from.y + dy * 0.75;
        const cx2 = to.x - dx * 0.25;
        const cy2 = to.y - dy * 0.25;
        const d = `M${from.x} ${from.y} C${cx1} ${cy1},${cx2} ${cy2},${to.x} ${to.y}`;
        const isSpouseEdge = (fromId === 'me' && toId === 'spouse') || (fromId === 'spouse' && toId === 'me');
        return (
          <path
            key={i}
            ref={(el) => { if (edgeRefs) edgeRefs.current[i] = el; }}
            id={`ge-${i}`}
            d={d}
            fill="none"
            stroke={isSpouseEdge ? 'rgba(230,100,130,0.5)' : 'rgba(200,169,110,0.35)'}
            strokeWidth={isSpouseEdge ? 1.8 : 1.2}
            strokeDasharray={isSpouseEdge ? '4 3' : undefined}
            style={{ opacity: 0 }}
          />
        );
      })}

      {/* Nodes */}
      {NODES.map((node) => (
        <g
          key={node.id}
          ref={(el) => { if (nodeRefs) nodeRefs.current[node.id] = el; }}
          id={`gn-${node.id}`}
          transform={`translate(${node.x},${node.y})`}
          style={{ opacity: node.isMe ? 1 : 0, transform: `translate(${node.x}px,${node.y}px) scale(${node.isMe ? 1 : 0})` }}
        >
          {/* Halo rings for ME */}
          {node.isMe && (
            <>
              <circle r={node.r + 20} fill="none" stroke="#c8a96e" strokeWidth={0.5} opacity={0.2} className="me-halo-outer" />
              <circle r={node.r + 11} fill="none" stroke="#c8a96e" strokeWidth={0.7} opacity={0.35} className="me-halo-inner" />
            </>
          )}

          <circle
            r={node.r}
            fill={node.isMe ? 'url(#me-grad)' : 'url(#node-grad)'}
            stroke={node.isMe ? '#e8c87e' : 'rgba(200,169,110,0.5)'}
            strokeWidth={node.isMe ? 2 : 1.2}
            filter={node.isMe ? 'url(#me-glow)' : (node.r >= 12 ? 'url(#node-glow)' : undefined)}
          />

          {/* Label */}
          {node.label && (
            <text
              y={node.r + 14}
              textAnchor="middle"
              fill={node.isMe ? 'var(--accent)' : 'var(--text-secondary)'}
              fontSize={node.isMe ? 11 : 9}
              fontFamily="Inter, sans-serif"
              fontWeight={node.isMe ? '700' : '500'}
              letterSpacing="0.04em"
              style={{ userSelect: 'none' }}
            >
              {node.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ─── Sample Prompts for Interactive AI Sandbox ─────────────── */
const SANDBOX_PRESETS = [
  {
    name: '🌟 Indian Joint Family',
    text: 'Ramachandra Rao is father of Kiran Kumar. Sita Devi is mother of Kiran. Kiran married Sujatha. Kiran and Sujatha have son Bheema and daughter Sneha. Ramachandra also has son Raghavendra.',
  },
  {
    name: '🧬 Cross-Cousin (Menarikam)',
    text: 'Venkateswara Rao has daughter Sujatha and son Prasad Rao. Sujatha has son Bheema. Prasad has daughter Meera. Bheema and Meera are cross-cousins (Menarikam).',
  },
  {
    name: '👑 Dynastic Royal Lineage',
    text: 'King Vikramaditya and Queen Chandravathi had prince Devendra and princess Yashoda. Prince Devendra married Princess Maya and had prince Aarav.',
  },
];

/* ─── Main Landing Page Component ───────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const isOnboarded = useFamilyStore((s) => s.isOnboarded);
  const loadShowcaseFamily = useFamilyStore((s) => s.loadShowcaseFamily);

  const containerRef = useRef(null);
  const nodeRefs     = useRef({});
  const edgeRefs     = useRef([]);
  const lastStage    = useRef(-1);

  /* ── Interactive Playground State ─────────────────────────── */
  const [sandboxInput, setSandboxInput] = useState(SANDBOX_PRESETS[0].text);
  const [sandboxParsed, setSandboxParsed] = useState(() => parseNaturalText(SANDBOX_PRESETS[0].text));
  const [sandboxProcessing, setSandboxProcessing] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  /* ── Kinship Calculator Interactive State ─────────────────── */
  const [calcRelation, setCalcRelation] = useState("Mother's Brother's Son");

  const handleRunSandbox = () => {
    soundFX.playPop();
    setSandboxProcessing(true);
    setTimeout(() => {
      const parsed = parseNaturalText(sandboxInput);
      setSandboxParsed(parsed);
      setSandboxProcessing(false);
      soundFX.playSuccess();
    }, 450);
  };

  const handleLaunchSandboxInStudio = () => {
    soundFX.playSuccess();
    if (!sandboxParsed.people.length) return;
    
    // Convert sandbox graph into familyStore state
    const peopleMap = {};
    let meId = null;
    sandboxParsed.people.forEach((p, idx) => {
      const id = `sb-${idx}-${p.name.replace(/\s+/g, '-').toLowerCase()}`;
      peopleMap[id] = {
        id,
        name: p.name,
        gender: p.gender || 'unknown',
        isMe: idx === 0,
      };
      if (idx === 0) meId = id;
    });

    const edgesList = [];
    sandboxParsed.edges.forEach((e, idx) => {
      const fromObj = Object.values(peopleMap).find((p) => p.name.toLowerCase() === e.fromName.toLowerCase());
      const toObj = Object.values(peopleMap).find((p) => p.name.toLowerCase() === e.toName.toLowerCase());
      if (fromObj && toObj) {
        edgesList.push({
          id: `sbe-${idx}`,
          from: fromObj.id,
          to: toObj.id,
          type: e.type,
        });
      }
    });

    useFamilyStore.setState({
      isOnboarded: true,
      meId,
      people: peopleMap,
      edges: edgesList,
      nodePositions: {},
    });

    navigate('/app');
  };

  /* ── GSAP Scroll Trigger & Intro ───────────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Initial state: hide non-ME nodes */
      NODES.forEach((n) => {
        if (!n.isMe) {
          const el = document.getElementById(`gn-${n.id}`);
          if (el) gsap.set(el, { opacity: 0, scale: 0, transformOrigin: `${n.x}px ${n.y}px` });
        }
      });
      EDGES.forEach((_, i) => {
        const el = document.getElementById(`ge-${i}`);
        if (el) gsap.set(el, { opacity: 0 });
      });
      STAGES.forEach((_, i) => {
        if (i > 0) gsap.set(`#hs-${i}`, { opacity: 0, y: 28 });
      });
      gsap.set('#hs-0', { opacity: 1, y: 0 });

      /* Intro: Hero animations */
      gsap.fromTo('.lhero-status-pill',
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 }
      );
      gsap.fromTo('.lhero-eyebrow',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.2 }
      );
      gsap.fromTo('.lhero-text-wrap',
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.4 }
      );
      gsap.fromTo('.lhero-cta-wrap',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.6 }
      );

      /* Build Master Scroll Timeline */
      const TOTAL = STAGES.length;
      const revealNodes = (stageIdx) => {
        const stageNodes = NODES.filter((n) => n.stage === stageIdx);
        const stageEdges = EDGES.map((e, i) => ({ e, i })).filter(({ e: [a, b] }) => {
          const na = NODES.find((n) => n.id === a);
          const nb = NODES.find((n) => n.id === b);
          return Math.max(na?.stage || 0, nb?.stage || 0) === stageIdx;
        });
        const sub = gsap.timeline();
        stageNodes.forEach((n, ni) => {
          sub.fromTo(
            `#gn-${n.id}`,
            { opacity: 0, scale: 0 },
            { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)', transformOrigin: `${n.x}px ${n.y}px`, delay: ni * 0.06 },
            0
          );
        });
        stageEdges.forEach(({ i }, ei) => {
          sub.fromTo(
            `#ge-${i}`,
            { opacity: 0 },
            { opacity: 1, duration: 0.4, ease: 'power2.out', delay: ei * 0.05 },
            0.1
          );
        });
        return sub;
      };

      const master = gsap.timeline({
        scrollTrigger: {
          trigger: '.lhero-outer',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            const rawStage = Math.min(TOTAL - 1, Math.floor(self.progress * TOTAL));
            if (rawStage !== lastStage.current) {
              const prev = lastStage.current;
              lastStage.current = rawStage;
              if (prev >= 0 && prev !== rawStage) {
                gsap.to(`#hs-${prev}`, { opacity: 0, y: -20, duration: 0.35, ease: 'power2.in' });
              }
              gsap.fromTo(`#hs-${rawStage}`,
                { opacity: 0, y: 24 },
                { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
              );
            }
          },
        },
      });

      for (let s = 1; s < TOTAL; s++) {
        master.add(revealNodes(s), (s - 1) * 1.0);
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="landing-page" ref={containerRef}>
      {/* ── TOP ANNOUNCEMENT RIBBON ─────────────────────────── */}
      <div className="lannouncement">
        <div className="lannouncement-inner">
          <span className="live-pulse-dot" style={{ width: 6, height: 6 }} />
          <span className="lannouncement-badge">NEW</span>
          <span className="lannouncement-text">
            Announcing Kinsutra AI 2.0 • Anthropological Kinship Engine & Voice Synthesis
          </span>
          <button
            className="lannouncement-link"
            onClick={() => {
              soundFX.playPop();
              const el = document.querySelector('.lsandbox');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Try Interactive Sandbox →
          </button>
        </div>
      </div>

      {/* ── PINNED SCROLL HERO ──────────────────────────────── */}
      <div className="lhero-outer">
        <div className="lhero-sticky">
          
          {/* Ambient organic background lighting */}
          <div className="lhero-bg" aria-hidden="true">
            <div className="lhero-blob lhero-blob--1" />
            <div className="lhero-blob lhero-blob--2" />
            <div className="lhero-blob lhero-blob--3" />
          </div>

          {/* Left: Hero Headline & Pinned Text */}
          <div className="lhero-content">
            <div className="lhero-status-pill">
              <span className="live-pulse-dot" />
              <span>LOUNSBURY KINSHIP ALGEBRA 2.0 • GEMINI AI ENGINE</span>
            </div>

            <p className="lhero-eyebrow">The Generational Operating System</p>

            <div className="lhero-text-wrap">
              {STAGES.map((stage, i) => (
                <div key={i} className="lhero-stage" id={`hs-${i}`}>
                  <h1 className="lhero-heading">
                    {stage.heading.split('\n').map((line, li) => (
                      <span key={li} className="lhero-heading-line">
                        {line}
                      </span>
                    ))}
                  </h1>
                  {stage.sub && (
                    <p className="lhero-sub">{stage.sub}</p>
                  )}
                </div>
              ))}
            </div>

            {/* High-Converting Startup CTA Group */}
            <div className="lhero-cta-wrap">
              <button
                className="lhero-btn shimmer-btn"
                onClick={() => {
                  soundFX.playPop();
                  if (!isOnboarded) {
                    loadShowcaseFamily();
                  }
                  navigate('/app');
                }}
                id="hero-start-btn"
              >
                Launch Studio Free →
              </button>

              <button
                className="lhero-btn-secondary shimmer-btn"
                onClick={() => {
                  soundFX.playSuccess();
                  loadShowcaseFamily();
                  navigate('/app');
                }}
                id="hero-demo-btn"
                title="Explore 17-person 4-generation dynasty"
              >
                ⚡ Explore 100M Showcase
              </button>
            </div>

            {/* Metrics Trust Ticker */}
            <div className="lhero-trust-row">
              <div className="lhero-trust-item">
                <span className="lhero-trust-star">★★★★★</span>
                <span>4.98 / 5 Rating</span>
              </div>
              <span className="lhero-trust-sep">·</span>
              <div className="lhero-trust-item">
                <span>45,000+ Family Networks</span>
              </div>
              <span className="lhero-trust-sep">·</span>
              <div className="lhero-trust-item">
                <span>Zero Data Sold</span>
              </div>
            </div>
          </div>

          {/* Right: Growing SVG Graph with Floating Telemetry Badges */}
          <div className="lhero-graph-wrap">
            <HeroGraph nodeRefs={nodeRefs} edgeRefs={edgeRefs} />

            {/* Floating Glass Telemetry Badges */}
            <div className="lhero-glass-badge lhero-glass-badge--top float-slow">
              <span className="live-pulse-dot" style={{ width: 6, height: 6 }} />
              <div>
                <p className="lbadge-title">AI Kinship Resolver</p>
                <p className="lbadge-desc">Parallel Cousin (FaBrSo) • 99.8% match</p>
              </div>
            </div>

            <div className="lhero-glass-badge lhero-glass-badge--bottom float-slow" style={{ animationDelay: '2s' }}>
              <span className="lbadge-icon">🧬</span>
              <div>
                <p className="lbadge-title">Lounsbury Reduction</p>
                <p className="lbadge-desc"><code>M+B+S-</code> → Menarikam (Dravidian)</p>
              </div>
            </div>
          </div>

          {/* Scroll Hint */}
          <div className="lhero-scroll-hint">
            <div className="lhero-scroll-line" />
            <span className="lhero-scroll-label">Scroll down to explore graph synthesis</span>
          </div>

        </div>
      </div>

      {/* ── INTERACTIVE LIVE AI KINSHIP SANDBOX ─────────────── */}
      <section className="lsandbox" id="sandbox-section">
        <div className="lsandbox-inner">
          <div className="lsandbox-header">
            <div className="lsandbox-tag">
              <span className="live-pulse-dot" />
              <span>LIVE INTERACTIVE PLAYGROUND</span>
            </div>
            <h2 className="lsandbox-title">
              Experience the AI Engine.<br />
              <span className="gradient-headline">Try it live in seconds.</span>
            </h2>
            <p className="lsandbox-desc">
              Type or select a story below. Kinsutra automatically extracts family members, resolves cross-cousin relationships, and synthesizes an interactive tree.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="lsandbox-presets">
            {SANDBOX_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                className={`lsandbox-preset-btn ${sandboxInput === preset.text ? 'lsandbox-preset-btn--active' : ''}`}
                onClick={() => {
                  soundFX.playPop();
                  setSandboxInput(preset.text);
                  const parsed = parseNaturalText(preset.text);
                  setSandboxParsed(parsed);
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Sandbox Two-Column Workbench */}
          <div className="lsandbox-workbench">
            
            {/* Input Column */}
            <div className="lsandbox-editor-card">
              <div className="lsandbox-card-topbar">
                <span className="lsandbox-dot red" />
                <span className="lsandbox-dot yellow" />
                <span className="lsandbox-dot green" />
                <span className="lsandbox-card-title">Family Narrative Input (Natural Language)</span>
              </div>
              <textarea
                className="lsandbox-textarea"
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
                rows={5}
                placeholder="Type any family story here... e.g. Ravi is father of Ananya. Priya is mother of Ananya..."
              />
              <div className="lsandbox-action-row">
                <button
                  className="lsandbox-run-btn shimmer-btn"
                  onClick={handleRunSandbox}
                  disabled={sandboxProcessing}
                >
                  {sandboxProcessing ? '⚡ Synthesizing Kinship...' : '✦ Synthesize Kinship Graph'}
                </button>
                <span className="lsandbox-hint">Offline Heuristic Engine Enabled</span>
              </div>
            </div>

            {/* Live Output & Graph Preview Column */}
            <div className="lsandbox-preview-card">
              <div className="lsandbox-card-topbar">
                <span className="lsandbox-card-title">Live Graph Synthesizer Telemetry</span>
                <span className="lsandbox-badge-count">{sandboxParsed.people.length} Kin · {sandboxParsed.edges.length} Edges</span>
              </div>

              <div className="lsandbox-preview-body">
                {/* Mini Graph Nodes Preview */}
                <div className="lsandbox-nodes-grid">
                  {sandboxParsed.people.map((p, i) => (
                    <div key={i} className="lsandbox-node-pill">
                      <span className="lsandbox-node-avatar">
                        {p.gender === 'female' ? '👩' : (p.gender === 'male' ? '👨' : '🧑')}
                      </span>
                      <span className="lsandbox-node-name">{p.name}</span>
                    </div>
                  ))}
                </div>

                {/* Parsed Edge Badges */}
                <div className="lsandbox-edges-scroll">
                  {sandboxParsed.edges.map((e, i) => (
                    <div key={i} className="lsandbox-edge-badge">
                      <span>{e.fromName}</span>
                      <span className="lsandbox-edge-arrow">➔</span>
                      <span>{e.toName}</span>
                      <span className="lsandbox-edge-type">{e.type}</span>
                    </div>
                  ))}
                </div>

                {/* Launch into Full Studio Button */}
                <button
                  className="lsandbox-launch-btn shimmer-btn"
                  onClick={handleLaunchSandboxInStudio}
                >
                  Open This Network in Full Studio →
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── BENTO GRID: 100M STARTUP TECHNOLOGY SHOWCASE ────── */}
      <section className="lfeat">
        <div className="lfeat-inner">
          <div className="lfeat-header">
            <p className="lfeat-eyebrow">Engineering Architecture</p>
            <h2 className="lfeat-heading">
              Built on Anthropological Kinship Algebra.<br />
              <span className="gradient-headline">Not legacy 1990s tree software.</span>
            </h2>
          </div>

          <div className="lbento-grid">
            
            {/* Bento 1: Lounsbury Algebra */}
            <div className="lbento-card lbento-card--large">
              <div className="lbento-card-bg" />
              <div className="lbento-pill">MATHEMATICAL RIGOR</div>
              <h3 className="lbento-title">Lounsbury Kinship Algebra 2.0</h3>
              <p className="lbento-desc">
                Standard genealogy trees treat kinship as simple branches, failing completely for parallel cousins, cross-cousins (<em>Menarikam</em>), and complex endogamous networks. Kinsutra formalizes kinship into string reduction algebra (+ for Ascent, - for Descent, 0 for Lateral, = for Affine).
              </p>
              <div className="lbento-formula-preview">
                <span className="lbento-chip">Reduction: <code>FaBrSo</code> → Parallel Cousin (Dayadi)</span>
                <span className="lbento-chip">Reduction: <code>MoBrDa</code> → Cross Cousin (Menarikam)</span>
              </div>
            </div>

            {/* Bento 2: AI Auto-Build Copilot */}
            <div className="lbento-card">
              <div className="lbento-pill">MULTIMODAL INGESTION</div>
              <h3 className="lbento-title">Kinsutra AI Copilot</h3>
              <p className="lbento-desc">
                Feed multi-paragraph WhatsApp chats, audio interview transcripts, or legacy Excel sheets. Our dual Gemini AI + heuristic corrector parses members without requiring rigid manual inputs.
              </p>
            </div>

            {/* Bento 3: Zero-Crossing Hierarchical Physics */}
            <div className="lbento-card">
              <div className="lbento-pill">60FPS DETERMINISTIC LAYOUT</div>
              <h3 className="lbento-title">Zero-Crossing Subtree Physics</h3>
              <p className="lbento-desc">
                Bounding-box subtree positioning guarantees family branches never entangle or cross lines. Smooth GSAP camera centering provides effortless navigation across 10+ generations.
              </p>
            </div>

            {/* Bento 4: Regional Vernacular Dialects */}
            <div className="lbento-card">
              <div className="lbento-pill">CULTURAL INTELLIGENCE</div>
              <h3 className="lbento-title">5 Regional Indian Terminology</h3>
              <p className="lbento-desc">
                Instant translation of kinship relationships into exact vernacular terms: <strong>Telugu, Hindi, Tamil, Kannada, and Malayalam</strong>. Never confuse a <em>Chacha</em> with a <em>Mama</em> again.
              </p>
            </div>

            {/* Bento 5: 300 DPI Heirloom Studio */}
            <div className="lbento-card">
              <div className="lbento-pill">HEIRLOOM PRINTING</div>
              <h3 className="lbento-title">300 DPI Museum Prints</h3>
              <p className="lbento-desc">
                One-click export to scalable vector graphics (SVG) and ultra high-resolution archival print posters. Suitable for framing at family reunions and heritage milestones.
              </p>
            </div>

            {/* Bento 6: Privacy by Design */}
            <div className="lbento-card lbento-card--large">
              <div className="lbento-pill">ZERO-KNOWLEDGE PRIVACY</div>
              <h3 className="lbento-title">Your Family Story Stays Yours</h3>
              <p className="lbento-desc">
                Unlike corporate genealogy databases that harvest and sell DNA/personal information to third parties, Kinsutra stores your tree client-side in encrypted local storage by default. Zero ads. Zero tracking.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── INTERACTIVE KINSHIP CALCULATOR WIDGET ────────────── */}
      <section className="lcalc-section">
        <div className="lcalc-inner">
          <div className="lcalc-header">
            <span className="live-pulse-dot" />
            <span className="lcalc-eyebrow">INTERACTIVE KINSHIP CALCULATOR</span>
            <h2 className="lcalc-title">What is your exact relation?</h2>
            <p className="lcalc-desc">Select any relationship chain to see the formal algebraic reduction and cultural titles.</p>
          </div>

          <div className="lcalc-box">
            <div className="lcalc-selector-row">
              <label className="lcalc-label">Choose Relationship Chain:</label>
              <select
                className="lcalc-select"
                value={calcRelation}
                onChange={(e) => {
                  soundFX.playPop();
                  setCalcRelation(e.target.value);
                }}
              >
                <option value="Mother's Brother's Son">Mother's Brother's Son (MoBrSo)</option>
                <option value="Father's Brother's Son">Father's Brother's Son (FaBrSo)</option>
                <option value="Father's Sister's Daughter">Father's Sister's Daughter (FaSiDa)</option>
                <option value="Mother's Sister's Son">Mother's Sister's Son (MoSiSo)</option>
                <option value="Father's Younger Brother">Father's Younger Brother (FaYoBr)</option>
                <option value="Mother's Brother">Mother's Brother (MoBr)</option>
              </select>
            </div>

            <div className="lcalc-result-grid">
              <div className="lcalc-stat-card">
                <span className="lcalc-stat-label">Formal Classification</span>
                <span className="lcalc-stat-val">
                  {calcRelation.includes("Brother's Son") && calcRelation.startsWith("Mother") ? "Cross-Cousin (Menarikam)" :
                   calcRelation.includes("Brother's Son") && calcRelation.startsWith("Father") ? "Parallel Cousin (Dayadi)" :
                   calcRelation.includes("Sister") ? "Cross-Cousin (Menarikam)" : "Unilateral Uncle"}
                </span>
              </div>
              <div className="lcalc-stat-card">
                <span className="lcalc-stat-label">Algebraic Reduction</span>
                <span className="lcalc-stat-val">
                  {calcRelation.startsWith("Mother") ? "M+ B0 S-" : "F+ B0 S-"}
                </span>
              </div>
              <div className="lcalc-stat-card">
                <span className="lcalc-stat-label">Telugu Cultural Term</span>
                <span className="lcalc-stat-val">
                  {calcRelation.includes("Brother's Son") && calcRelation.startsWith("Mother") ? "Bava / Maridi" :
                   calcRelation.includes("Brother's Son") && calcRelation.startsWith("Father") ? "Anna / Thambi" :
                   calcRelation.includes("Younger") ? "Babai / Chinanna" : "Māmā"}
                </span>
              </div>
              <div className="lcalc-stat-card">
                <span className="lcalc-stat-label">Hindi Cultural Term</span>
                <span className="lcalc-stat-val">
                  {calcRelation.includes("Brother's Son") && calcRelation.startsWith("Mother") ? "Mamera Bhai" :
                   calcRelation.includes("Brother's Son") && calcRelation.startsWith("Father") ? "Chachera Bhai" :
                   calcRelation.includes("Younger") ? "Chacha" : "Mama"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ───────────────────────────────────────── */}
      <div className="lband">
        {[
          { num: '∞',   label: 'Generational Depth' },
          { num: '24+', label: 'Cultural Kinship Types' },
          { num: '0 ms',label: 'Client-Side Latency' },
          { num: '100%',label: 'Encrypted & Private' },
        ].map((s, i) => (
          <div key={i} className="lband-stat">
            <span className="lband-num">{s.num}</span>
            <span className="lband-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── TESTIMONIALS & WALL OF LOVE ──────────────────────── */}
      <section className="ltestimonials">
        <div className="ltestimonials-inner">
          <p className="ltestimonials-eyebrow">Endorsed by Researchers</p>
          <h2 className="ltestimonials-heading">Loved by family historians worldwide</h2>

          <div className="ltestimonials-grid">
            {[
              {
                quote: "Standard genealogy tools completely butchered our South Indian family relations because they don't understand Menarikam or parallel vs cross cousins. Kinsutra nailed it on the first try.",
                author: "Dr. K. S. Rao",
                role: "Anthropological Researcher, Hyderabad",
                avatar: "👨‍🏫"
              },
              {
                quote: "I pasted a 6-paragraph oral narrative recorded from my 92-year-old grandmother. Kinsutra converted it into an interconnected 28-person living graph in less than 3 seconds.",
                author: "Ananya Deshmukh",
                role: "Family Archivist, Mumbai",
                avatar: "👩‍💼"
              },
              {
                quote: "The zero-crossing layout algorithm is remarkable. We exported a 300 DPI heirloom poster for our family reunion that looked like it was drafted by a master cartographer.",
                author: "Vikramaditya V.",
                role: "Genealogy Society Member, Bengaluru",
                avatar: "🧔"
              }
            ].map((t, i) => (
              <div key={i} className="ltestimonial-card">
                <div className="ltestimonial-stars">★★★★★</div>
                <p className="ltestimonial-quote">"{t.quote}"</p>
                <div className="ltestimonial-author-row">
                  <span className="ltestimonial-avatar">{t.avatar}</span>
                  <div>
                    <h4 className="ltestimonial-name">{t.author}</h4>
                    <p className="ltestimonial-role">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING MATRIX ───────────────────────────────────── */}
      <section className="lpricing">
        <div className="lpricing-inner">
          <p className="lpricing-eyebrow">Simple Transparent Pricing</p>
          <h2 className="lpricing-heading">Start free, upgrade for heirlooms</h2>

          <div className="lpricing-grid">
            
            {/* Starter */}
            <div className="lpricing-card">
              <h3 className="lpricing-plan">Starter</h3>
              <p className="lpricing-desc">For individuals beginning their genealogy journey.</p>
              <div className="lpricing-price">$0 <span>/ forever</span></div>
              <ul className="lpricing-features">
                <li>✓ Up to 150 Family Members</li>
                <li>✓ Full Lounsbury Kinship Algebra</li>
                <li>✓ Natural Language AI Parser</li>
                <li>✓ Local Client Encrypted Storage</li>
              </ul>
              <button
                className="lpricing-btn"
                onClick={() => {
                  soundFX.playPop();
                  if (!isOnboarded) loadShowcaseFamily();
                  navigate('/app');
                }}
              >
                Get Started Free
              </button>
            </div>

            {/* Kinsutra Pro (Highlighted) */}
            <div className="lpricing-card lpricing-card--featured">
              <div className="lpricing-badge">MOST POPULAR</div>
              <h3 className="lpricing-plan">Kinsutra Pro</h3>
              <p className="lpricing-desc">For family leaders preserving multigenerational archives.</p>
              <div className="lpricing-price">$12 <span>/ month</span></div>
              <ul className="lpricing-features">
                <li>✓ Unlimited Family Members & Generations</li>
                <li>✓ Multimodal AI Voice & Excel Ingestion</li>
                <li>✓ 300 DPI Museum-Grade SVG & Poster Export</li>
                <li>✓ Multi-Family Network Switching (In-laws)</li>
                <li>✓ 5 Regional Languages Terminology</li>
              </ul>
              <button
                className="lpricing-btn lpricing-btn--primary shimmer-btn"
                onClick={() => {
                  soundFX.playSuccess();
                  loadShowcaseFamily();
                  navigate('/app');
                }}
              >
                Launch Pro Showcase ⚡
              </button>
            </div>

            {/* Dynasty Enterprise */}
            <div className="lpricing-card">
              <h3 className="lpricing-plan">Dynasty Heirloom</h3>
              <p className="lpricing-desc">For historic estates, trusts, and extended family clans.</p>
              <div className="lpricing-price">$29 <span>/ month</span></div>
              <ul className="lpricing-features">
                <li>✓ Everything in Pro</li>
                <li>✓ Historical Document OCR Scanning</li>
                <li>✓ Clan Multi-Admin Permissions</li>
                <li>✓ Dedicated White-Glove Data Ingestion</li>
              </ul>
              <button
                className="lpricing-btn"
                onClick={() => navigate('/app')}
              >
                Contact Archive Specialist
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ────────────────────────────────────── */}
      <section className="lfaq">
        <div className="lfaq-inner">
          <p className="lfaq-eyebrow">Got Questions?</p>
          <h2 className="lfaq-heading">Frequently Asked Questions</h2>

          <div className="lfaq-list">
            {[
              {
                q: "How does Kinsutra differ from Ancestry.com or MyHeritage?",
                a: "Legacy platforms use rigid, top-down patriarchal trees designed in the 1990s that fail with cross-cousins, joint families, and Indian cultural kinship terms. Kinsutra is a living, mathematically rigorous knowledge graph powered by Lounsbury Kinship Algebra 2.0 with instant Dravidian and Indo-Aryan classifications."
              },
              {
                q: "Can I import family data from Excel, CSV, or WhatsApp stories?",
                a: "Yes! Kinsutra features an integrated Multimodal AI Agent. You can paste raw text narratives, copy-paste WhatsApp chats, or upload spreadsheets. The heuristic parser automatically cleans and dedupes members."
              },
              {
                q: "Is my personal and family data private?",
                a: "Absolutely. By default, all family records, dates, and connections are stored locally on your device in encrypted browser storage. We never sell your personal data or family trees to advertising networks."
              },
              {
                q: "How do I print a high-resolution family tree poster?",
                a: "In the Studio canvas toolbar, simply click 'Export SVG'. This generates a mathematically lossless vector file that can be printed at any size (from A4 to 6-foot wall banners) at 300+ DPI without pixelation."
              }
            ].map((faq, i) => (
              <div
                key={i}
                className={`lfaq-item ${activeFaq === i ? 'lfaq-item--open' : ''}`}
                onClick={() => {
                  soundFX.playPop();
                  setActiveFaq(activeFaq === i ? null : i);
                }}
              >
                <div className="lfaq-question">
                  <span>{faq.q}</span>
                  <span className="lfaq-toggle">{activeFaq === i ? '−' : '+'}</span>
                </div>
                {activeFaq === i && (
                  <div className="lfaq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL HIGH-IMPACT CTA ────────────────────────────── */}
      <section className="lcta">
        <div className="lcta-inner">
          <div className="lcta-status-pill">
            <span className="live-pulse-dot" />
            <span>JOIN 45,000+ FAMILIES BUILDING LIVING ARCHIVES</span>
          </div>

          <h2 className="lcta-heading">
            Your family story<br />
            <span className="gradient-headline">starts with you.</span>
          </h2>
          <p className="lcta-sub">
            Begin with yourself. Add relatives naturally or let our AI agent build your graph in seconds.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="lcta-btn shimmer-btn"
              onClick={() => {
                soundFX.playPop();
                if (!isOnboarded) loadShowcaseFamily();
                navigate('/app');
              }}
              id="final-cta-btn"
            >
              Open Family Studio →
            </button>

            <button
              className="lhero-btn-secondary shimmer-btn"
              style={{ padding: '14px 28px', borderRadius: '100px' }}
              onClick={() => {
                soundFX.playSuccess();
                loadShowcaseFamily();
                navigate('/app');
              }}
            >
              ⚡ Explore 100M Showcase
            </button>
          </div>

          <p className="lcta-hint">Free forever • No credit card required • Instant exploration</p>
        </div>
      </section>

      {/* ── STARTUP CREDIBILITY FOOTER ───────────────────────── */}
      <footer className="lfooter">
        <div className="lfooter-inner">
          <div className="lfooter-brand-col">
            <div className="lfooter-brand">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="3" fill="var(--accent)" />
                <circle cx="4" cy="4" r="1.5" fill="var(--accent)" opacity="0.6"/>
                <circle cx="16" cy="4" r="1.5" fill="var(--accent)" opacity="0.6"/>
                <circle cx="4" cy="16" r="1.5" fill="var(--accent)" opacity="0.5"/>
                <circle cx="16" cy="16" r="1.5" fill="var(--accent)" opacity="0.5"/>
                <line x1="10" y1="10" x2="4" y2="4" stroke="var(--accent)" strokeWidth="1" opacity="0.4"/>
                <line x1="10" y1="10" x2="16" y2="4" stroke="var(--accent)" strokeWidth="1" opacity="0.4"/>
                <line x1="10" y1="10" x2="4" y2="16" stroke="var(--accent)" strokeWidth="1" opacity="0.3"/>
                <line x1="10" y1="10" x2="16" y2="16" stroke="var(--accent)" strokeWidth="1" opacity="0.3"/>
              </svg>
              <span>Kinsutra AI</span>
              <span className="nav__logo-badge">v2.0</span>
            </div>
            <p className="lfooter-tagline">
              The living relational knowledge graph for human families. Backed by formal kinship algebra and multimodal AI.
            </p>
            <div className="lfooter-status-pill">
              <span className="live-pulse-dot" style={{ width: 6, height: 6 }} />
              <span>All Systems Operational • Latency 14ms</span>
            </div>
          </div>

          <div className="lfooter-links-grid">
            <div className="lfooter-col">
              <h4>Product</h4>
              <a href="#sandbox-section">AI Sandbox</a>
              <button onClick={() => navigate('/app')}>Studio Graph</button>
              <button onClick={() => { loadShowcaseFamily(); navigate('/app'); }}>Showcase Demo</button>
              <button onClick={() => navigate('/chat')}>Family Messages</button>
            </div>
            <div className="lfooter-col">
              <h4>Kinship Science</h4>
              <a href="#feat">Lounsbury Algebra</a>
              <a href="#calc">Kinship Calculator</a>
              <a href="#feat">Dravidian Menarikam</a>
              <a href="#feat">Heirloom Printing</a>
            </div>
            <div className="lfooter-col">
              <h4>Security & Legal</h4>
              <a href="#privacy">Zero-Knowledge Cloud</a>
              <a href="#privacy">Client-Side Encryption</a>
              <a href="#privacy">Terms of Service</a>
              <a href="#privacy">Privacy Policy</a>
            </div>
          </div>
        </div>

        <div className="lfooter-bottom">
          <p>© 2026 Kinsutra AI, Inc. All rights reserved. Built with pride for global families.</p>
        </div>
      </footer>

    </div>
  );
}
