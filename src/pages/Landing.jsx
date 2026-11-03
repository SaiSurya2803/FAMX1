import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useFamilyStore } from '../store/familyStore';
import { soundFX } from '../utils/soundEffects';
import { parseNaturalText } from '../utils/aiGraphParser';
import './Landing.css';

/* ─── Hero Graph Nodes (Enriched with Kinship Intelligence) ──── */
const NODES = [
  // Stage 0: Ego (Origin)
  { id: 'me',       x: 450, y: 320, r: 24, isMe: true,  label: 'You',         name: 'Arjun Rao',         role: 'Root Individual (Ego)',       formula: 'EGO',          telugu: 'Nēnu',            hindi: 'Aap',           tamil: 'Naan',        stage: 0 },
  
  // Stage 1: Direct Ascent
  { id: 'father',   x: 305, y: 195, r: 16, isMe: false, label: 'Father',      name: 'Ramesh Rao',        role: 'Paternal Parent',             formula: 'Fa (+)',       telugu: 'Nānna',           hindi: 'Pitāji',        tamil: 'Appā',        stage: 1 },
  { id: 'mother',   x: 585, y: 190, r: 16, isMe: false, label: 'Mother',      name: 'Lakshmi Devi',      role: 'Maternal Parent',             formula: 'Mo (+)',       telugu: 'Amma',            hindi: 'Mātāji',        tamil: 'Ammā',        stage: 1 },
  
  // Stage 2: Grandparent Ancestral Tier
  { id: 'gfp',      x: 185, y: 95,  r: 13, isMe: false, label: 'Grandfather', name: 'Kiran Rao',         role: 'Paternal Grandfather',        formula: 'FaFa (++)',    telugu: 'Thātha',          hindi: 'Dādāji',        tamil: 'Thāthā',      stage: 2 },
  { id: 'gmp',      x: 355, y: 80,  r: 13, isMe: false, label: 'Grandmother', name: 'Sujatha Rao',       role: 'Paternal Grandmother',        formula: 'FaMo (++)',    telugu: 'Nānnamma',        hindi: 'Dādīji',        tamil: 'Pātti',       stage: 2 },
  { id: 'gfm',      x: 525, y: 78,  r: 13, isMe: false, label: 'Grandfather', name: 'Venkateswara Rao',  role: 'Maternal Grandfather',        formula: 'MoFa (++)',    telugu: 'Thātha',          hindi: 'Nānāji',        tamil: 'Thāthā',      stage: 2 },
  { id: 'gmm',      x: 690, y: 92,  r: 13, isMe: false, label: 'Grandmother', name: 'Kamala Devi',       role: 'Maternal Grandmother',        formula: 'MoMo (++)',    telugu: 'Ammamma',         hindi: 'Nānīji',        tamil: 'Pātti',       stage: 2 },
  
  // Stage 3: Collateral Lineages & Great-Ancestors
  { id: 'uncle',    x: 125, y: 195, r: 13, isMe: false, label: 'Uncle',       name: 'Suresh Rao',        role: 'Paternal Uncle (Junior)',     formula: 'FaBr (+ 0)',   telugu: 'Bābāi / Chinānna', hindi: 'Chāchā',        tamil: 'Chithappā',   stage: 3 },
  { id: 'aunt',     x: 765, y: 188, r: 13, isMe: false, label: 'Aunt',        name: 'Padma Rao',         role: 'Maternal Aunt (Junior)',      formula: 'MoSi (+ 0)',   telugu: 'Pinni',           hindi: 'Mausi',         tamil: 'Chiththi',    stage: 3 },
  { id: 'ggf',      x:  90, y:  32, r:  9, isMe: false, label: 'Great-GF',    name: 'Govind Rao',        role: 'Paternal Great-Grandfather',  formula: 'FaFaFa (+++)', telugu: 'Muthātha',        hindi: 'Pardādā',       tamil: 'Kollu Thāthā', stage: 3 },
  { id: 'ggm',      x: 255, y:  22, r:  9, isMe: false, label: 'Great-GM',    name: 'Radha Devi',        role: 'Paternal Great-Grandmother',  formula: 'FaFaMo (+++)', telugu: 'Muthavva',        hindi: 'Pardādī',       tamil: 'Kollu Pātti', stage: 3 },
  
  // Stage 4: Cousins (Parallel & Cross / Menarikam) & Siblings
  { id: 'cousin1',  x:  65, y: 290, r: 10, isMe: false, label: 'Cousin',      name: 'Rahul Rao',         role: 'Parallel Cousin (Dāyādi)',    formula: 'FaBrSo (+ 0 -)', telugu: 'Anna / Thambi',   hindi: 'Chachērā Bhāi', tamil: 'Annan',       stage: 4 },
  { id: 'cousin2',  x: 115, y: 360, r: 10, isMe: false, label: 'Cousin',      name: 'Sneha Rao',         role: 'Parallel Cousin',             formula: 'FaBrDa (+ 0 -)', telugu: 'Akka / Chelli',   hindi: 'Chachērī Bahan', tamil: 'Akka',       stage: 4 },
  { id: 'sibling',  x: 325, y: 440, r: 14, isMe: false, label: 'Sister',      name: 'Priya Rao',         role: 'Biological Sister',           formula: 'Si (0)',       telugu: 'Chelli',          hindi: 'Bahan',         tamil: 'Thangai',     stage: 4 },
  { id: 'sib2',     x: 835, y: 180, r: 10, isMe: false, label: 'Cross-Cousin', name: 'Aditya Varma',     role: 'Cross-Cousin (Mēnarīkam)',    formula: 'MoBrSo (+ 0 -)', telugu: 'Bāva',            hindi: 'Mamērā Bhāi',   tamil: 'Machan',      stage: 4 },
  
  // Stage 5: Affinal Alliances (Spouse & In-Laws)
  { id: 'spouse',   x: 590, y: 330, r: 16, isMe: false, label: 'Spouse',      name: 'Ananya Rao',        role: 'Spouse (Wife)',               formula: 'Wi (=)',       telugu: 'Bhārya',          hindi: 'Patnī',         tamil: 'Manaivi',     stage: 5 },
  { id: 'sf',       x: 730, y: 215, r: 12, isMe: false, label: "Father-in-law", name: 'Prasad Rao',      role: 'Father-in-Law',               formula: 'WiFa (= +)',   telugu: 'Māmā',            hindi: 'Sasur',         tamil: 'Māmanār',     stage: 5 },
  { id: 'sm',       x: 825, y: 300, r: 12, isMe: false, label: 'Mother-in-law', name: 'Sarada Devi',     role: 'Mother-in-Law',               formula: 'WiMo (= +)',   telugu: 'Atta',            hindi: 'Sāas',          tamil: 'Māmiyār',     stage: 5 },
  { id: 'sf2',      x: 845, y: 400, r: 10, isMe: false, label: 'Brother-in-law', name: 'Karthik Rao',    role: 'Brother-in-Law',              formula: 'WiBr (= 0)',   telugu: 'Bāva / Maridi',   hindi: 'Sālā',          tamil: 'Machan',      stage: 5 },
  
  // Stage 6: Direct Descent (Children)
  { id: 'child1',   x: 340, y: 505, r: 13, isMe: false, label: 'Son',         name: 'Dhruv Rao',         role: 'Elder Son',                   formula: 'So (-)',       telugu: 'Kodu-ku',         hindi: 'Bētā',          tamil: 'Magan',       stage: 6 },
  { id: 'child2',   x: 465, y: 518, r: 13, isMe: false, label: 'Daughter',    name: 'Diya Rao',          role: 'Daughter',                    formula: 'Da (-)',       telugu: 'Kūthuru',         hindi: 'Bētī',          tamil: 'Magal',       stage: 6 },
  { id: 'child3',   x: 595, y: 498, r: 13, isMe: false, label: 'Son',         name: 'Aarav Rao',         role: 'Younger Son',                 formula: 'So (-)',       telugu: 'Chinna Koduku',   hindi: 'Chhotā Bētā',   tamil: 'Ilamagan',    stage: 6 },
  
  // Stage 7: Extended Clan Dynasty
  { id: 'x1',       x:  42, y: 175, r:  8, isMe: false, label: 'Clan Elder',  name: 'V. Krishna Rao',    role: 'Patrilineal Clan Elder',      formula: 'FaFaBr (+ + 0)', telugu: 'Peddanānna',     hindi: 'Tauji',         tamil: 'Periyappā',   stage: 7 },
  { id: 'x2',       x: 190, y: 555, r:  8, isMe: false, label: 'Nephew',      name: 'Rohan',             role: 'Nephew',                      formula: 'SiSo (0 -)',   telugu: 'Mēnalluḍu',       hindi: 'Bhānjā',        tamil: 'Marumagan',   stage: 7 },
  { id: 'x3',       x: 700, y: 555, r:  8, isMe: false, label: 'Granddaughter', name: 'Maya',            role: 'Granddaughter',               formula: 'SoDa (- -)',   telugu: 'Manumaralu',      hindi: 'Pōtī',          tamil: 'Pēthi',       stage: 7 },
  { id: 'x4',       x: 875, y: 490, r:  8, isMe: false, label: 'In-Law Kin',  name: 'Meera Rao',         role: 'Affinal Relative',            formula: 'WiBrWi (= 0 =)', telugu: 'Vadina',         hindi: 'Bhabhi',        tamil: 'Anni',        stage: 7 },
  { id: 'x5',       x: 420, y: 590, r:  8, isMe: false, label: 'Grandson',    name: 'Vihaan',            role: 'Grandson',                    formula: 'DaSo (- -)',   telugu: 'Manamaḍu',        hindi: 'Nātī',          tamil: 'Pēran',       stage: 7 },
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

/* ─── Generational Genesis Stages ───────────────────────────── */
const STAGES = [
  {
    idx: 0,
    tag: 'ORIGIN',
    short: '0. You',
    heading: 'You.',
    sub: 'The Conscious Root (Ego)',
    desc: 'Every family tree begins from a single conscious individual — the reference root for all kinship algebra.',
  },
  {
    idx: 1,
    tag: 'ASCENT +1',
    short: '1. Parents',
    heading: 'Direct Ascent.',
    sub: 'Father & Mother Pillars',
    desc: 'Two ancestral branches converge: the patrilineal stem and matrilineal stem form the core foundation.',
  },
  {
    idx: 2,
    tag: 'ASCENT +2',
    short: '2. Grandparents',
    heading: 'The 4 Pillars.',
    sub: 'Paternal & Maternal Roots',
    desc: 'Four grandparents anchor lineage memory, splitting generational heritage into deep cultural lineages.',
  },
  {
    idx: 3,
    tag: 'COLLATERAL',
    short: '3. Collateral Clans',
    heading: 'Expanding Outward.',
    sub: 'Uncles, Aunts & Great-Elders',
    desc: 'Collateral branches stretch horizontally across ancestral villages, establishing clan alliances.',
  },
  {
    idx: 4,
    tag: 'ALGEBRA',
    short: '4. Cousins & Siblings',
    heading: 'Parallel & Cross.',
    sub: 'Dayadi vs Menarikam',
    desc: 'Lounsbury formal algebra cleanly distinguishes FaBrSo (Parallel / Dayadi) from MoBrSo (Cross / Menarikam).',
  },
  {
    idx: 5,
    tag: 'AFFINE =',
    short: '5. Marriage Alliances',
    heading: 'Affinal Networks.',
    sub: 'Spouse & In-Laws',
    desc: 'Marriage bridges two independent genealogical graphs into a single interconnected, resilient social fabric.',
  },
  {
    idx: 6,
    tag: 'DESCENT -1',
    short: '6. Children',
    heading: 'Generational Ascent.',
    sub: 'Descent & Continuity',
    desc: 'The next generation branches forward, inheriting oral traditions, cultural identity, and living history.',
  },
  {
    idx: 7,
    tag: 'DYNASTY',
    short: '7. Living Network',
    heading: 'A Living Knowledge Graph.',
    sub: '25+ Kinship Nodes at 60 FPS',
    desc: 'The complete multi-generational dynasty: synthesized with mathematical rigor and instantaneous calculation.',
  },
];

/* ─── Interactive AI Sandbox Presets ────────────────────────── */
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
  {
    name: '🌿 Multi-Tier Diaspora',
    text: 'Arjun married Ananya. Arjun is son of Ramesh and Lakshmi. Arjun has sister Priya. Ananya is daughter of Prasad and Sarada. Arjun and Ananya have son Dhruv and daughter Diya.',
  },
];

/* ─── Comprehensive Kinship Calculator Chains ───────────────── */
const KINSHIP_CHAINS = [
  {
    label: "Mother's Brother's Son (MoBrSo)",
    classification: 'Cross-Cousin (Mēnarīkam)',
    formula: 'Mo + Br 0 So -',
    reduction: 'M+ B0 S-',
    telugu: 'Bāva / Maridi',
    hindi: 'Mamērā Bhāi',
    tamil: 'Machān',
    significance: 'Eligible cross-cousin matrimonial alliance in Dravidian anthropological tradition.',
  },
  {
    label: "Father's Brother's Son (FaBrSo)",
    classification: 'Parallel Cousin (Dāyādi / Agnatic)',
    formula: 'Fa + Br 0 So -',
    reduction: 'F+ B0 S-',
    telugu: 'Anna / Thambi (Brother)',
    hindi: 'Chachērā Bhāi',
    tamil: 'Annan / Thambi',
    significance: 'Parallel agnatic cousin regarded as equal to a biological brother in customary law.',
  },
  {
    label: "Mother's Sister's Daughter (MoSiDa)",
    classification: 'Parallel Cousin (Matrilateral)',
    formula: 'Mo + Si 0 Da -',
    reduction: 'M+ Z0 D-',
    telugu: 'Akka / Chelli (Sister)',
    hindi: 'Mausērī Bahan',
    tamil: 'Akkā / Thangai',
    significance: 'Classified strictly as sibling category in Dravidian and Indo-Aryan systems.',
  },
  {
    label: "Father's Sister's Son (FaSiSo)",
    classification: 'Cross-Cousin (Patrilateral Menarikam)',
    formula: 'Fa + Si 0 So -',
    reduction: 'F+ Z0 S-',
    telugu: 'Bāva / Menarikam Kin',
    hindi: 'Phuphērā Bhāi',
    tamil: 'Machān / Athān',
    significance: 'Classic Dravidian cross-cousin relationship connecting maternal and paternal stems.',
  },
  {
    label: "Mother's Brother (MoBr)",
    classification: 'Maternal Uncle (Avunculate)',
    formula: 'Mo + Br 0',
    reduction: 'M+ B0',
    telugu: 'Māmā / Mēnamāma',
    hindi: 'Māmā',
    tamil: 'Māman',
    significance: 'Key ritual patron and decision maker in traditional Indian life-cycle ceremonies.',
  },
  {
    label: "Father's Younger Brother (FaYoBr)",
    classification: 'Junior Paternal Uncle (Patron)',
    formula: 'Fa + Br 0 (junior)',
    reduction: 'F+ B0 (jr)',
    telugu: 'Bābāi / Chinānna',
    hindi: 'Chāchā',
    tamil: 'Chithappā',
    significance: 'Classified as junior father in Dravidian bifurcate-merging kinship.',
  },
  {
    label: "Father's Elder Brother (FaElBr)",
    classification: 'Senior Paternal Uncle (Patriarch)',
    formula: 'Fa + Br 0 (senior)',
    reduction: 'F+ B0 (sr)',
    telugu: 'Peddanānna',
    hindi: 'Tāuji',
    tamil: 'Periyappā',
    significance: 'Senior patriarchal authority figure holding joint clan responsibilities.',
  },
  {
    label: "Father's Father (FaFa)",
    classification: 'Paternal Grandfather (Agnatic Stem)',
    formula: 'Fa + Fa +',
    reduction: 'F+ F+',
    telugu: 'Thātha',
    hindi: 'Dādāji',
    tamil: 'Thāthā',
    significance: 'Head of patrilineage; source of hereditary gotra and family name.',
  },
  {
    label: "Mother's Mother (MoMo)",
    classification: 'Maternal Grandmother (Matriarch)',
    formula: 'Mo + Mo +',
    reduction: 'M+ M+',
    telugu: 'Ammamma',
    hindi: 'Nānīji',
    tamil: 'Pātti',
    significance: 'Matrilineal matriarch and custodian of generational culinary and oral lore.',
  },
  {
    label: "Spouse's Mother (WiMo / HuMo)",
    classification: 'Mother-in-Law (Affinal Pillar)',
    formula: 'Wi = Mo +',
    reduction: 'W= M+',
    telugu: 'Atta / Atthagāru',
    hindi: 'Sāas',
    tamil: 'Māmiyār',
    significance: 'Key affinal connection linking the domestic spheres of both married households.',
  },
  {
    label: "Sister's Son (SiSo)",
    classification: 'Sister’s Son / Nephew (Menalludu)',
    formula: 'Si 0 So -',
    reduction: 'Z0 S-',
    telugu: 'Mēnalluḍu',
    hindi: 'Bhānjā',
    tamil: 'Marumagan',
    significance: 'Special avuncular kinship bond with maternal uncles in South Asian heritage.',
  },
];

/* ─── Hero SVG Graph Component ──────────────────────────────── */
function HeroGraph({ currentStage, onHoverNode, activeNode }) {
  const nodeMap = {};
  NODES.forEach((n) => { nodeMap[n.id] = n; });

  return (
    <svg
      className="lhero-graph"
      viewBox="0 0 900 640"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Interactive Living Kinship Graph"
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
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="me-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="0.8" />
        </radialGradient>
        <radialGradient id="node-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#fde047" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#c8a96e" stopOpacity="0.45" />
        </radialGradient>
        <radialGradient id="spouse-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fbcfe8" stopOpacity="1" />
          <stop offset="70%" stopColor="#ec4899" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#9d174d" stopOpacity="0.6" />
        </radialGradient>
      </defs>

      {/* Edges */}
      {EDGES.map(([fromId, toId], i) => {
        const from = nodeMap[fromId];
        const to   = nodeMap[toId];
        if (!from || !to) return null;
        
        const isVisible = from.stage <= currentStage && to.stage <= currentStage;
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
            id={`ge-${i}`}
            d={d}
            fill="none"
            stroke={isSpouseEdge ? 'rgba(244,114,182,0.85)' : 'rgba(253,224,71,0.45)'}
            strokeWidth={isSpouseEdge ? 2 : 1.3}
            strokeDasharray={isSpouseEdge ? '5 3' : undefined}
            className={`lhero-edge ${isVisible ? 'lhero-edge--active' : ''}`}
            style={{
              opacity: isVisible ? 1 : 0.05,
              transition: 'opacity 0.4s ease, stroke 0.3s ease',
            }}
          />
        );
      })}

      {/* Nodes */}
      {NODES.map((node) => {
        const isVisible = node.stage <= currentStage;
        const isSelected = activeNode?.id === node.id;
        const isSpouse = node.id === 'spouse';

        return (
          <g
            key={node.id}
            id={`gn-${node.id}`}
            transform={`translate(${node.x},${node.y})`}
            className={`lhero-node-g ${isVisible ? 'lhero-node-g--active' : 'lhero-node-g--dim'} ${isSelected ? 'lhero-node-g--selected' : ''}`}
            onMouseEnter={() => onHoverNode(node)}
            onClick={() => {
              soundFX.playPop();
              onHoverNode(node);
            }}
            style={{
              opacity: isVisible ? 1 : 0.1,
              transform: `translate(${node.x}px, ${node.y}px) scale(${isVisible ? (isSelected ? 1.25 : 1) : 0.4})`,
              transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
              cursor: isVisible ? 'pointer' : 'default',
            }}
          >
            {/* Halo rings for ME */}
            {node.isMe && (
              <>
                <circle r={node.r + 20} fill="none" stroke="var(--chalk-yellow)" strokeWidth={0.6} opacity={0.3} className="me-halo-outer" />
                <circle r={node.r + 11} fill="none" stroke="var(--chalk-yellow)" strokeWidth={0.8} opacity={0.5} className="me-halo-inner" />
              </>
            )}

            {/* Selection ripple ring */}
            {isSelected && (
              <circle
                r={node.r + 8}
                fill="none"
                stroke="var(--chalk-yellow)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                className="selected-node-ring"
              />
            )}

            <circle
              r={node.r}
              fill={node.isMe ? 'url(#me-grad)' : (isSpouse ? 'url(#spouse-grad)' : 'url(#node-grad)')}
              stroke={node.isMe ? '#fde047' : (isSelected ? '#fde047' : 'rgba(253,224,71,0.6)')}
              strokeWidth={node.isMe || isSelected ? 2.5 : 1.2}
              filter={node.isMe || isSelected ? 'url(#me-glow)' : 'url(#node-glow)'}
            />

            {/* Label */}
            {node.label && (
              <text
                y={node.r + 13}
                textAnchor="middle"
                fill={node.isMe || isSelected ? 'var(--chalk-yellow)' : 'var(--text-secondary)'}
                fontSize={node.isMe ? 12 : (isSelected ? 11 : 9.5)}
                fontFamily="var(--font-sans)"
                fontWeight={node.isMe || isSelected ? '700' : '500'}
                letterSpacing="0.03em"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {node.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Main Landing Page Component ───────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const isOnboarded = useFamilyStore((s) => s.isOnboarded);
  const loadShowcaseFamily = useFamilyStore((s) => s.loadShowcaseFamily);

  const containerRef = useRef(null);

  /* ── Interactive Stage Evolution State ─────────────────────── */
  const [currentStage, setCurrentStage] = useState(7); // Default to full network so users see the glory immediately
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNode, setActiveNode] = useState(NODES[0]); // Default to 'You'

  /* ── Interactive Playground State ─────────────────────────── */
  const [sandboxInput, setSandboxInput] = useState(SANDBOX_PRESETS[0].text);
  const [sandboxParsed, setSandboxParsed] = useState(() => parseNaturalText(SANDBOX_PRESETS[0].text));
  const [sandboxProcessing, setSandboxProcessing] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  /* ── Kinship Calculator Interactive State ─────────────────── */
  const [calcIndex, setCalcIndex] = useState(0);
  const activeChain = KINSHIP_CHAINS[calcIndex];

  /* ── Stage Transition Handler ─────────────────────────────── */
  const handleSelectStage = useCallback((idx) => {
    soundFX.playPop();
    setCurrentStage(idx);
    // Focus the most prominent node introduced in that stage
    const stageNodes = NODES.filter((n) => n.stage === idx);
    if (stageNodes.length > 0) {
      setActiveNode(stageNodes[0]);
    }
  }, []);

  /* ── Auto Play Stage Evolution Timer ──────────────────────── */
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        const next = (prev + 1) % STAGES.length;
        const stageNodes = NODES.filter((n) => n.stage === next);
        if (stageNodes.length > 0) setActiveNode(stageNodes[0]);
        return next;
      });
    }, 2400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  /* ── Run AI Sandbox ───────────────────────────────────────── */
  const handleRunSandbox = () => {
    soundFX.playPop();
    setSandboxProcessing(true);
    setTimeout(() => {
      const parsed = parseNaturalText(sandboxInput);
      setSandboxParsed(parsed);
      setSandboxProcessing(false);
      soundFX.playSuccess();
    }, 400);
  };

  /* ── Launch Sandbox Graph in Full Studio ───────────────────── */
  const handleLaunchSandboxInStudio = () => {
    soundFX.playSuccess();
    if (!sandboxParsed.people.length) return;
    
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

  /* ── Intro Header Animations ──────────────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.lhero-main-title',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.1 }
      );
      gsap.fromTo('.lhero-main-desc',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.25 }
      );
      gsap.fromTo('.lhero-cta-wrap',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.4 }
      );
      gsap.fromTo('.lhero-stepper-wrap',
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.55 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const curStageInfo = STAGES[currentStage] || STAGES[7];

  return (
    <div className="landing-page" ref={containerRef}>
      
      {/* ── TOP ANNOUNCEMENT RIBBON (Cleanly placed below Navbar) ── */}
      <div className="lannouncement">
        <div className="lannouncement-inner">
          <span className="live-pulse-dot" style={{ width: 6, height: 6 }} />
          <span className="lannouncement-badge">NEW RELEASE</span>
          <span className="lannouncement-text">
            Announcing Kinsutra AI 2.0 • Anthropological Kinship Algebra & Multi-Dialect Synthesis
          </span>
          <button
            className="lannouncement-link"
            onClick={() => {
              soundFX.playPop();
              document.querySelector('.lsandbox')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Try Interactive AI Sandbox ↓
          </button>
        </div>
      </div>

      {/* ── FLAGSHIP HERO SECTION ───────────────────────────── */}
      <section className="lhero-section">
        
        {/* Ambient organic lighting blobs */}
        <div className="lhero-bg" aria-hidden="true">
          <div className="lhero-blob lhero-blob--1" />
          <div className="lhero-blob lhero-blob--2" />
          <div className="lhero-blob lhero-blob--3" />
        </div>

        <div className="lhero-container">
          
          {/* Executive Centered Headline & CTAs */}
          <div className="lhero-intro">
            
            <div className="lhero-status-pill">
              <span className="live-pulse-dot" />
              <span>LOUNSBURY KINSHIP ALGEBRA 2.0 • ANTHROPOLOGY-BACKED GRAPH ENGINE</span>
            </div>

            <h1 className="lhero-main-title">
              Your Family is Not a Simple Tree.<br />
              <span className="gradient-headline">It is a Living Relational Network.</span>
            </h1>

            <p className="lhero-main-desc">
              Map multigenerational ancestry with mathematical precision. Formalized by Lounsbury Kinship Algebra, Dravidian &amp; Indo-Aryan classifications, and multimodal AI speech-to-tree synthesis.
            </p>

            {/* High-Converting Primary CTAs */}
            <div className="lhero-cta-wrap">
              <button
                className="lhero-btn shimmer-btn"
                onClick={() => {
                  soundFX.playPop();
                  if (!isOnboarded) loadShowcaseFamily();
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
                <span>100% Client-Side Encrypted</span>
              </div>
            </div>

          </div>

          {/* Interactive Hardware Showcase Viewport */}
          <div className="lhero-showcase-window">
            
            {/* Viewport Topbar Header / HUD */}
            <div className="lshowcase-topbar">
              <div className="lshowcase-dots">
                <span className="lshowcase-dot red" />
                <span className="lshowcase-dot yellow" />
                <span className="lshowcase-dot green" />
              </div>

              <div className="lshowcase-stage-badge">
                <span className="lshowcase-stage-pill">{curStageInfo.tag}</span>
                <span className="lshowcase-stage-name">{curStageInfo.heading}</span>
              </div>

              {/* Active Inspector HUD */}
              {activeNode && (
                <div className="lshowcase-telemetry-pill">
                  <span className="live-pulse-dot" style={{ width: 6, height: 6 }} />
                  <span className="ltelemetry-name">{activeNode.name}</span>
                  <span className="ltelemetry-role">({activeNode.role})</span>
                  <code className="ltelemetry-code">{activeNode.formula}</code>
                  <span className="ltelemetry-regional">{activeNode.telugu} · {activeNode.hindi}</span>
                </div>
              )}

              <div className="lshowcase-actions">
                <button
                  className={`lstepper-play-btn ${isPlaying ? 'lstepper-play-btn--active' : ''}`}
                  onClick={() => {
                    soundFX.playPop();
                    setIsPlaying(!isPlaying);
                  }}
                  title={isPlaying ? 'Pause Genesis Evolution' : 'Auto Play Genesis Evolution'}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play Genesis'}
                </button>
                <button
                  className="lstepper-full-btn"
                  onClick={() => handleSelectStage(7)}
                  title="View Full 25+ Node Dynasty"
                >
                  Full Dynasty
                </button>
              </div>
            </div>

            {/* Center Canvas Viewport */}
            <div className="lshowcase-canvas-wrap">
              <HeroGraph
                currentStage={currentStage}
                onHoverNode={(node) => setActiveNode(node)}
                activeNode={activeNode}
              />

              {/* Active Kinship Floating Telemetry Card */}
              {activeNode && (
                <div className="lhero-glass-badge lhero-glass-badge--top float-slow">
                  <div className="lbadge-header-row">
                    <span className="live-pulse-dot" style={{ width: 7, height: 7 }} />
                    <span className="lbadge-tag">{activeNode.role}</span>
                  </div>
                  <div className="lbadge-body">
                    <h4 className="lbadge-person-name">{activeNode.name}</h4>
                    <p className="lbadge-formula">
                      Algebra: <code>{activeNode.formula}</code>
                    </p>
                    <div className="lbadge-vernacular-row">
                      <span>Telugu: <strong>{activeNode.telugu}</strong></span>
                      <span>·</span>
                      <span>Hindi: <strong>{activeNode.hindi}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Lounsbury Mathematical Engine Chip */}
              <div className="lhero-glass-badge lhero-glass-badge--bottom float-slow" style={{ animationDelay: '1.5s' }}>
                <span className="lbadge-icon">🧬</span>
                <div>
                  <p className="lbadge-title">Lounsbury Reduction 2.0</p>
                  <p className="lbadge-desc">
                    Active Stage: <code>{curStageInfo.tag}</code> • 0ms Client Latency
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Docked Genesis Scrubber */}
            <div className="lshowcase-bottombar">
              <div className="lshowcase-bottombar-info">
                <p className="lstepper-desc">{curStageInfo.desc}</p>
                <span className="lhero-graph-hint">✦ Hover or click nodes to inspect kinship formulas &amp; regional terms</span>
              </div>

              {/* Stage Pills Scrubber */}
              <div className="lstepper-pills">
                {STAGES.map((s) => (
                  <button
                    key={s.idx}
                    className={`lstepper-pill ${currentStage === s.idx ? 'lstepper-pill--active' : ''}`}
                    onClick={() => handleSelectStage(s.idx)}
                  >
                    {s.short}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

      </section>

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

      {/* ── BENTO GRID: STARTUP ARCHITECTURE SHOWCASE ───────── */}
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
              <h3 className="lbento-title">5 Regional Indian Languages</h3>
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
              <div className="lbento-card-bg" />
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
      <section className="lcalc-section" id="calc-section">
        <div className="lcalc-inner">
          <div className="lcalc-header">
            <span className="live-pulse-dot" />
            <span className="lcalc-eyebrow">INTERACTIVE KINSHIP CALCULATOR</span>
            <h2 className="lcalc-title">What is your exact relation?</h2>
            <p className="lcalc-desc">
              Select any relationship chain below to see the formal algebraic reduction, anthropological classification, and cultural regional titles.
            </p>
          </div>

          <div className="lcalc-box">
            <div className="lcalc-selector-row">
              <label className="lcalc-label">Choose Kinship Chain:</label>
              <select
                className="lcalc-select"
                value={calcIndex}
                onChange={(e) => {
                  soundFX.playPop();
                  setCalcIndex(Number(e.target.value));
                }}
              >
                {KINSHIP_CHAINS.map((chain, idx) => (
                  <option key={idx} value={idx}>
                    {chain.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Result Cards Grid */}
            <div className="lcalc-result-grid">
              
              <div className="lcalc-stat-card">
                <span className="lcalc-stat-label">Formal Classification</span>
                <span className="lcalc-stat-val lcalc-stat-val--highlight">
                  {activeChain.classification}
                </span>
                <span className="lcalc-stat-sub">{activeChain.significance}</span>
              </div>

              <div className="lcalc-stat-card">
                <span className="lcalc-stat-label">Algebraic Reduction</span>
                <span className="lcalc-stat-val">
                  <code>{activeChain.reduction}</code>
                </span>
                <span className="lcalc-stat-sub">Chain: {activeChain.formula}</span>
              </div>

              <div className="lcalc-stat-card">
                <span className="lcalc-stat-label">Telugu Cultural Term</span>
                <span className="lcalc-stat-val lcalc-stat-val--accent">
                  {activeChain.telugu}
                </span>
                <span className="lcalc-stat-sub">Dravidian Kinship Classification</span>
              </div>

              <div className="lcalc-stat-card">
                <span className="lcalc-stat-label">Hindi Cultural Term</span>
                <span className="lcalc-stat-val">
                  {activeChain.hindi}
                </span>
                <span className="lcalc-stat-sub">Indo-Aryan Kinship Classification</span>
              </div>

              <div className="lcalc-stat-card">
                <span className="lcalc-stat-label">Tamil Cultural Term</span>
                <span className="lcalc-stat-val">
                  {activeChain.tamil}
                </span>
                <span className="lcalc-stat-sub">Classical Dravidian Term</span>
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
      <section className="lpricing" id="pricing-section">
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
                <li>✓ Unlimited Family Members &amp; Generations</li>
                <li>✓ Multimodal AI Voice &amp; Excel Ingestion</li>
                <li>✓ 300 DPI Museum-Grade SVG &amp; Poster Export</li>
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
                onClick={() => {
                  soundFX.playPop();
                  navigate('/app');
                }}
              >
                Explore Dynasty Studio
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
                <circle cx="10" cy="10" r="3" fill="var(--chalk-yellow)" />
                <circle cx="4" cy="4" r="1.5" fill="var(--chalk-yellow)" opacity="0.6"/>
                <circle cx="16" cy="4" r="1.5" fill="var(--chalk-yellow)" opacity="0.6"/>
                <circle cx="4" cy="16" r="1.5" fill="var(--chalk-yellow)" opacity="0.5"/>
                <circle cx="16" cy="16" r="1.5" fill="var(--chalk-yellow)" opacity="0.5"/>
                <line x1="10" y1="10" x2="4" y2="4" stroke="var(--chalk-yellow)" strokeWidth="1" opacity="0.4"/>
                <line x1="10" y1="10" x2="16" y2="4" stroke="var(--chalk-yellow)" strokeWidth="1" opacity="0.4"/>
                <line x1="10" y1="10" x2="4" y2="16" stroke="var(--chalk-yellow)" strokeWidth="1" opacity="0.3"/>
                <line x1="10" y1="10" x2="16" y2="16" stroke="var(--chalk-yellow)" strokeWidth="1" opacity="0.3"/>
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
              <button onClick={() => document.querySelector('.lsandbox')?.scrollIntoView({ behavior: 'smooth' })}>AI Sandbox</button>
              <button onClick={() => navigate('/app')}>Studio Graph</button>
              <button onClick={() => { loadShowcaseFamily(); navigate('/app'); }}>Showcase Demo</button>
              <button onClick={() => navigate('/chat')}>Family Messages</button>
            </div>
            <div className="lfooter-col">
              <h4>Kinship Science</h4>
              <button onClick={() => document.querySelector('.lfeat')?.scrollIntoView({ behavior: 'smooth' })}>Lounsbury Algebra</button>
              <button onClick={() => document.querySelector('.lcalc-section')?.scrollIntoView({ behavior: 'smooth' })}>Kinship Calculator</button>
              <button onClick={() => document.querySelector('.lfeat')?.scrollIntoView({ behavior: 'smooth' })}>Dravidian Menarikam</button>
              <button onClick={() => document.querySelector('.lfeat')?.scrollIntoView({ behavior: 'smooth' })}>Heirloom Printing</button>
            </div>
            <div className="lfooter-col">
              <h4>Security &amp; Legal</h4>
              <button onClick={() => document.querySelector('.lfeat')?.scrollIntoView({ behavior: 'smooth' })}>Zero-Knowledge Cloud</button>
              <button onClick={() => document.querySelector('.lfeat')?.scrollIntoView({ behavior: 'smooth' })}>Client-Side Encryption</button>
              <button onClick={() => navigate('/')}>Terms of Service</button>
              <button onClick={() => navigate('/')}>Privacy Policy</button>
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
