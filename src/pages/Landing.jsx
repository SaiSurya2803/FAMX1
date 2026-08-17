import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useFamilyStore } from '../store/familyStore';
import './Landing.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── Graph data ──────────────────────────────────────────────
   All nodes pre-defined. They appear progressively via scroll.
   Positions are in a 900×640 viewBox.
   ─────────────────────────────────────────────────────────── */
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
  { heading: 'Your family\nis a living network.',         sub: 'Create yours.' },
];

/* ─── SVG Graph component ─────────────────────────────────── */
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
          <stop offset="0%" stopColor="#e8c87e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#c8a96e" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="node-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#e8e4dc" stopOpacity="0.7" />
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
            stroke={isSpouseEdge ? 'rgba(180,100,100,0.3)' : 'rgba(180,155,100,0.22)'}
            strokeWidth={isSpouseEdge ? 1.5 : 1}
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
              <circle r={node.r + 18} fill="none" stroke="#c8a96e" strokeWidth={0.5} opacity={0.2} className="me-halo-outer" />
              <circle r={node.r + 10} fill="none" stroke="#c8a96e" strokeWidth={0.5} opacity={0.3} className="me-halo-inner" />
            </>
          )}

          <circle
            r={node.r}
            fill={node.isMe ? 'url(#me-grad)' : 'url(#node-grad)'}
            stroke={node.isMe ? '#c8a96e' : 'rgba(180,155,100,0.4)'}
            strokeWidth={node.isMe ? 1.5 : 1}
            filter={node.isMe ? 'url(#me-glow)' : (node.r >= 12 ? 'url(#node-glow)' : undefined)}
          />

          {/* Label */}
          {node.label && (
            <text
              y={node.r + 13}
              textAnchor="middle"
              fill={node.isMe ? 'var(--accent)' : 'var(--text-secondary)'}
              fontSize={node.isMe ? 11 : 8.5}
              fontFamily="Inter, sans-serif"
              fontWeight={node.isMe ? '600' : '400'}
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

/* ─── Landing Page ────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const isOnboarded = useFamilyStore((s) => s.isOnboarded);

  const containerRef = useRef(null);
  const nodeRefs     = useRef({});
  const edgeRefs     = useRef([]);
  const lastStage    = useRef(-1);

  const targetPath = isOnboarded ? '/app' : '/onboarding';
  const buttonText = isOnboarded ? 'Open family graph →' : 'Begin your story';

  useEffect(() => {
    const ctx = gsap.context(() => {

      /* ── Initial state: hide all non-ME nodes ───────────── */
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

      /* ── Intro: hero content fades in ───────────────────── */
      gsap.fromTo('.lhero-eyebrow',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.2 }
      );
      gsap.fromTo('.lhero-text-wrap',
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.4 }
      );
      gsap.fromTo('.lhero-scroll-hint',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 1.2 }
      );
      gsap.fromTo('.lhero-cta-wrap',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.7 }
      );

      /* ── Build master timeline ──────────────────────────── */
      const tl = gsap.timeline();
      const TOTAL = STAGES.length;   // 8 stages

      // Helper: reveal nodes of a given stage
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
            { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)',
              transformOrigin: `${n.x}px ${n.y}px`, delay: ni * 0.06 },
            0
          );
        });
        stageEdges.forEach(({ i: ei }) => {
          sub.fromTo(`#ge-${ei}`, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.15);
        });
        return sub;
      };

      // Helper: transition text
      const switchText = (fromIdx, toIdx) => {
        const sub = gsap.timeline();
        sub.to(`#hs-${fromIdx}`, { opacity: 0, y: -28, duration: 0.4, ease: 'power2.in' });
        sub.fromTo(`#hs-${toIdx}`,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '>-0.1'
        );
        return sub;
      };

      // Stage 0 → 1
      tl.add(switchText(0, 1), 1)
        .add(revealNodes(1), 0.9);

      // Stage 1 → 2
      tl.add(switchText(1, 2), 2.2)
        .add(revealNodes(2), 2.1);

      // Stage 2 → 3
      tl.add(switchText(2, 3), 3.4)
        .add(revealNodes(3), 3.3);

      // Stage 3 → 4
      tl.add(switchText(3, 4), 4.6)
        .add(revealNodes(4), 4.5);

      // Stage 4 → 5
      tl.add(switchText(4, 5), 5.8)
        .add(revealNodes(5), 5.7);

      // Stage 5 → 6
      tl.add(switchText(5, 6), 7.0)
        .add(revealNodes(6), 6.9);

      // Stage 6 → 7 (final)
      tl.add(switchText(6, 7), 8.2)
        .add(revealNodes(7), 8.1);

      // Pulse the full network at the end
      tl.to('.lhero-graph circle', {
        filter: 'brightness(1.15)',
        duration: 0.6,
        stagger: { each: 0.02, from: 'center' },
      }, 9);

      // Highlight main CTA at final stage
      tl.to('#hero-start-btn',
        { scale: 1.06, backgroundColor: '#C8A96E', color: '#1C1814', duration: 0.6, ease: 'back.out(1.7)' },
        9.2
      );

      /* ── ScrollTrigger: pin and scrub ───────────────────── */
      ScrollTrigger.create({
        trigger: '.lhero-outer',
        pin: '.lhero-sticky',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        animation: tl,
        invalidateOnRefresh: true,
      });

      /* ── Below-hero sections animate in ────────────────── */
      gsap.utils.toArray('.lfeat-card').forEach((card, i) => {
        gsap.fromTo(card,
          { opacity: 0, y: 48 },
          {
            opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 82%',
            },
            delay: i * 0.12,
          }
        );
      });

      gsap.fromTo('.lcta-inner',
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: '.lcta', start: 'top 75%' },
        }
      );

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="landing-page" ref={containerRef}>

      {/* ── PINNED HERO ──────────────────────────────────── */}
      <div className="lhero-outer">
        <div className="lhero-sticky">

          {/* Organic background blobs */}
          <div className="lhero-bg" aria-hidden="true">
            <svg className="lhero-blob lhero-blob--1" viewBox="0 0 600 600" fill="none">
              <path d="M300 50 C450 50 550 150 550 300 C550 450 450 550 300 550 C150 550 50 450 50 300 C50 150 150 50 300 50Z"
                fill="#C8A96E" fillOpacity="0.07" />
            </svg>
            <svg className="lhero-blob lhero-blob--2" viewBox="0 0 500 500" fill="none">
              <path d="M250 80 C360 60 440 140 460 250 C480 360 400 460 280 470 C160 480 70 400 60 280 C50 160 140 100 250 80Z"
                fill="#B08040" fillOpacity="0.05" />
            </svg>
            <svg className="lhero-blob lhero-blob--3" viewBox="0 0 400 400" fill="none">
              <ellipse cx="200" cy="200" rx="180" ry="150" fill="#D4AA70" fillOpacity="0.06"/>
            </svg>
          </div>

          {/* Left: text content */}
          <div className="lhero-content">
            <p className="lhero-eyebrow">Kinsutra</p>

            <div className="lhero-text-wrap">
              {STAGES.map((stage, i) => (
                <div
                  key={i}
                  id={`hs-${i}`}
                  className={`lhero-stage-text ${i === 0 ? 'lhero-stage-text--active' : ''}`}
                  aria-hidden={i > 0}
                >
                  <h1 className="lhero-headline">
                    {stage.heading.split('\n').map((line, j) => (
                      <span key={j} className="lhero-line">
                        {j % 2 === 1
                          ? <em>{line}</em>
                          : line}
                        {j < stage.heading.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </h1>
                  {stage.sub && (
                    <p className="lhero-sub">{stage.sub}</p>
                  )}
                </div>
              ))}
            </div>

            {/* CTA button */}
            <div className="lhero-cta-wrap">
              <button
                className="lhero-btn"
                onClick={() => navigate(targetPath)}
                id="hero-start-btn"
              >
                {buttonText}
              </button>
            </div>
          </div>

          {/* Right: Growing SVG graph */}
          <div className="lhero-graph-wrap">
            <HeroGraph nodeRefs={nodeRefs} edgeRefs={edgeRefs} />
          </div>

          {/* Scroll indicator */}
          <div className="lhero-scroll-hint">
            <div className="lhero-scroll-line" />
            <span className="lhero-scroll-label">Scroll to explore</span>
          </div>

        </div>
      </div>

      {/* ── FEATURES SECTION ─────────────────────────────── */}
      <section className="lfeat">
        <div className="lfeat-inner">
          <p className="lfeat-eyebrow">Why Kinsutra</p>
          <h2 className="lfeat-heading">
            A new way to<br/><em>understand your family.</em>
          </h2>

          <div className="lfeat-grid">
            {[
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="5" cy="5"   r="2"   stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
                    <circle cx="23" cy="5"  r="2"   stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
                    <circle cx="5" cy="23"  r="2"   stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
                    <circle cx="23" cy="23" r="2"   stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
                    <line x1="14" y1="14" x2="5"  y2="5"  stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                    <line x1="14" y1="14" x2="23" y2="5"  stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                    <line x1="14" y1="14" x2="5"  y2="23" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                    <line x1="14" y1="14" x2="23" y2="23" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                  </svg>
                ),
                title: 'Living Graph',
                desc:  'See your family as an interconnected network, not a static tree. Watch it grow with every person you add.',
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M6 22V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <line x1="10" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="10" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Every Story Matters',
                desc: 'Record names, birthdays, photos and places. Each person in your network becomes a rich chapter of your history.',
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M22 8H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h5l3 3 3-3h5a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <circle cx="10" cy="15" r="1" fill="currentColor"/>
                    <circle cx="14" cy="15" r="1" fill="currentColor"/>
                    <circle cx="18" cy="15" r="1" fill="currentColor"/>
                  </svg>
                ),
                title: 'Familiar Messaging',
                desc: 'Message any family member directly, with relationship context shown beneath their name. It just feels right.',
              },
            ].map((feat, i) => (
              <div key={i} className="lfeat-card">
                <div className="lfeat-card__icon">{feat.icon}</div>
                <h3 className="lfeat-card__title">{feat.title}</h3>
                <p  className="lfeat-card__desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAND ───────────────────────────────────── */}
      <div className="lband">
        {[
          { num: '∞',   label: 'Generations' },
          { num: '10+', label: 'Relationship types' },
          { num: '0',   label: 'Data sold' },
          { num: '100%',label: 'Your story' },
        ].map((s, i) => (
          <div key={i} className="lband-stat">
            <span className="lband-num">{s.num}</span>
            <span className="lband-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section className="lcta">
        <div className="lcta-inner">
          {/* Decorative graph hint */}
          <div className="lcta-graph-hint" aria-hidden="true">
            <svg viewBox="0 0 320 180" fill="none" width="320" height="180">
              <circle cx="160" cy="90"  r="14" fill="#C8A96E" fillOpacity="0.18" stroke="#C8A96E" strokeWidth="1.5"/>
              <circle cx="100" cy="45"  r="9"  fill="#C8A96E" fillOpacity="0.1" stroke="#C8A96E" strokeWidth="1" opacity="0.7"/>
              <circle cx="220" cy="45"  r="9"  fill="#C8A96E" fillOpacity="0.1" stroke="#C8A96E" strokeWidth="1" opacity="0.7"/>
              <circle cx="70"  cy="130" r="7"  fill="#C8A96E" fillOpacity="0.08" stroke="#C8A96E" strokeWidth="1" opacity="0.5"/>
              <circle cx="255" cy="130" r="7"  fill="#C8A96E" fillOpacity="0.08" stroke="#C8A96E" strokeWidth="1" opacity="0.5"/>
              <circle cx="155" cy="155" r="7"  fill="#C8A96E" fillOpacity="0.08" stroke="#C8A96E" strokeWidth="1" opacity="0.5"/>
              <line x1="160" y1="90" x2="100" y2="45"  stroke="#C8A96E" strokeWidth="1" opacity="0.25"/>
              <line x1="160" y1="90" x2="220" y2="45"  stroke="#C8A96E" strokeWidth="1" opacity="0.25"/>
              <line x1="100" y1="45" x2="70"  y2="130" stroke="#C8A96E" strokeWidth="1" opacity="0.15"/>
              <line x1="220" y1="45" x2="255" y2="130" stroke="#C8A96E" strokeWidth="1" opacity="0.15"/>
              <line x1="160" y1="90" x2="155" y2="155" stroke="#C8A96E" strokeWidth="1" opacity="0.2"/>
            </svg>
          </div>

          <p className="lcta-eyebrow">Ready to begin?</p>
          <h2 className="lcta-heading">
            Your family story<br/><em>starts with you.</em>
          </h2>
          <p className="lcta-sub">
            Start with yourself. Add one person at a time.<br/>Watch your world unfold.
          </p>

          <button
            className="lcta-btn"
            onClick={() => navigate(targetPath)}
            id="final-cta-btn"
          >
            {isOnboarded ? 'Open family graph →' : 'Create your family graph'}
          </button>

          <p className="lcta-hint">Free forever. No account required to explore.</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="lfooter">
        <div className="lfooter-inner">
          <div className="lfooter-brand">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="2.5" fill="currentColor" />
              <circle cx="4" cy="4" r="1.5" fill="currentColor" opacity="0.5"/>
              <circle cx="16" cy="4" r="1.5" fill="currentColor" opacity="0.5"/>
              <circle cx="4" cy="16" r="1.5" fill="currentColor" opacity="0.4"/>
              <circle cx="16" cy="16" r="1.5" fill="currentColor" opacity="0.4"/>
              <line x1="10" y1="10" x2="4" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
              <line x1="10" y1="10" x2="16" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
              <line x1="10" y1="10" x2="4" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
              <line x1="10" y1="10" x2="16" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
            </svg>
            <span>Kinsutra</span>
          </div>
          <p className="lfooter-copy">
            Built with care. Your data stays with you.
          </p>
        </div>
      </footer>

    </div>
  );
}
