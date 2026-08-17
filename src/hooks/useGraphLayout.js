import { useMemo } from 'react';
import { useFamilyStore, RELATIONSHIP_TYPES } from '../store/familyStore';

const H_NODE_GAP = 170;  // horizontal space between nodes
const BRANCH_GAP = 80;   // horizontal space between sub-family branches
const V_GEN_GAP  = 180;  // vertical gap between generation rows

export function useGraphLayout() {
  const people        = useFamilyStore((s) => s.people);
  const edges         = useFamilyStore((s) => s.edges);
  const meId          = useFamilyStore((s) => s.meId);
  const nodePositions = useFamilyStore((s) => s.nodePositions);
  const layoutVersion = useFamilyStore((s) => s.layoutVersion);

  const layout = useMemo(() => {
    if (!meId || !people[meId]) return { nodes: [], edges: [] };

    // ── 1. Determine Generation Tier for each Person ────────────
    const genMap = {};     // person_id -> integer tier (0 = top root ancestors, 1 = children, 2 = grandchildren...)
    const parentMap = {};  // child_id -> set of parent_ids
    const childMap = {};   // parent_id -> set of child_ids
    const spouseMap = {};  // person_id -> set of spouse_ids

    Object.keys(people).forEach((id) => {
      parentMap[id] = new Set();
      childMap[id] = new Set();
      spouseMap[id] = new Set();
    });

    edges.forEach((e) => {
      if (e.type === RELATIONSHIP_TYPES.PARENT) {
        if (parentMap[e.to]) parentMap[e.to].add(e.from);
        if (childMap[e.from]) childMap[e.from].add(e.to);
      }
      if (e.type === RELATIONSHIP_TYPES.SPOUSE) {
        if (spouseMap[e.from]) spouseMap[e.from].add(e.to);
        if (spouseMap[e.to]) spouseMap[e.to].add(e.from);
      }
    });

    // Roots are people who have no parents registered
    const roots = Object.keys(people).filter((id) => parentMap[id].size === 0);

    // BFS from roots downward
    const queue = [];
    const visited = new Set();

    if (roots.length > 0) {
      roots.forEach((rId) => {
        genMap[rId] = 0;
        queue.push(rId);
      });
    } else {
      genMap[meId] = 0;
      queue.push(meId);
    }

    while (queue.length) {
      const currId = queue.shift();
      if (visited.has(currId)) continue;
      visited.add(currId);
      const currGen = genMap[currId];

      // Assign same gen to spouses
      spouseMap[currId].forEach((spId) => {
        if (genMap[spId] === undefined) {
          genMap[spId] = currGen;
          queue.push(spId);
        }
      });

      // Assign currGen + 1 to children
      childMap[currId].forEach((chId) => {
        if (genMap[chId] === undefined) {
          genMap[chId] = currGen + 1;
          queue.push(chId);
        }
      });
    }

    // Default any unconnected person to gen 0
    Object.keys(people).forEach((id) => {
      if (genMap[id] === undefined) genMap[id] = 0;
    });

    // ── 2. Top-Down Subtree Layout Calculator ────────────────────
    const computed = {};
    const processedNodes = new Set();

    // Group people by generation tier
    const tiers = {};
    Object.entries(genMap).forEach(([id, gen]) => {
      if (!tiers[gen]) tiers[gen] = [];
      tiers[gen].push(id);
    });

    const sortedTiers = Object.keys(tiers)
      .map(Number)
      .sort((a, b) => a - b);

    // Recursive Subtree Layout Helper
    const layoutSubtree = (nodeId, startX, gen) => {
      if (processedNodes.has(nodeId)) return startX;

      let currX = startX;
      computed[nodeId] = { x: currX, y: gen * V_GEN_GAP };
      processedNodes.add(nodeId);

      // Place spouse next to node
      const spouses = Array.from(spouseMap[nodeId]);
      spouses.forEach((spId) => {
        if (!processedNodes.has(spId)) {
          currX += H_NODE_GAP;
          computed[spId] = { x: currX, y: gen * V_GEN_GAP };
          processedNodes.add(spId);
        }
      });

      // Get all children of this node and spouse(s)
      const allParents = [nodeId, ...spouses];
      const kidsSet = new Set();
      allParents.forEach((pId) => {
        childMap[pId].forEach((cId) => kidsSet.add(cId));
      });
      const kids = Array.from(kidsSet);

      if (kids.length > 0) {
        // Center children under couple
        const coupleCenterX = (computed[nodeId].x + currX) / 2;
        let kidsWidth = 0;

        // Calculate children layout width
        let kidX = coupleCenterX - ((kids.length - 1) * H_NODE_GAP) / 2;
        kids.forEach((kId) => {
          kidX = layoutSubtree(kId, kidX, gen + 1);
          kidX += BRANCH_GAP;
        });
      }

      return currX + H_NODE_GAP;
    };

    // Layout each top-tier root couple
    let globalX = 0;
    sortedTiers.forEach((gen) => {
      tiers[gen].forEach((id) => {
        if (!processedNodes.has(id)) {
          globalX = layoutSubtree(id, globalX, gen) + BRANCH_GAP;
        }
      });
    });

    // ── 3. Re-Center graph relative to ME node ───────────────────
    const meComp = computed[meId] || { x: 0, y: 0 };
    Object.keys(computed).forEach((id) => {
      computed[id] = {
        x: computed[id].x - meComp.x,
        y: computed[id].y - meComp.y,
      };
    });

    // ── 4. Build node list (Manual drag positions override) ──────
    const nodes = Object.values(people).map((person) => {
      const manual = nodePositions[person.id];
      const auto   = computed[person.id] || { x: 0, y: 0 };
      const rawGen = genMap[person.id] ?? 0;
      return {
        ...person,
        gen: rawGen + 1,
        relLevel: rawGen,
        rawGen,
        x: manual ? manual.x : auto.x,
        y: manual ? manual.y : auto.y,
      };
    });

    return { nodes, edges };
  }, [people, edges, meId, nodePositions, layoutVersion]);

  return layout;
}
