import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseGraphToken } from '../utils/graphShare';
import { sanitizePersonName } from '../utils/aiGraphParser';

/* ─── Extended Cultural & Global Kinship Types ─────────────── */
export const RELATIONSHIP_TYPES = {
  PARENT: 'parent',
  CHILD: 'child',
  SPOUSE: 'spouse',
  SIBLING: 'sibling',
  GRANDPARENT: 'grandparent',
  GRANDCHILD: 'grandchild',
  UNCLE_AUNT: 'uncle_aunt',
  NEPHEW_NIECE: 'nephew_niece',
  IN_LAW: 'in_law',
  COUSIN: 'cousin',
  STEP_PARENT: 'step_parent',
  STEP_CHILD: 'step_child',
  HALF_SIBLING: 'half_sibling',
};

/* Detailed Cultural Kinship Catalog (India & Global) */
export const KINSHIP_CATALOG = [
  // Immediate
  { id: 'father',                type: RELATIONSHIP_TYPES.PARENT,     label: 'Father (Appa / Pitaji)',           emoji: '👨' },
  { id: 'mother',                type: RELATIONSHIP_TYPES.PARENT,     label: 'Mother (Amma / Mataji)',           emoji: '👩' },
  { id: 'son',                   type: RELATIONSHIP_TYPES.CHILD,      label: 'Son (Beta)',                       emoji: '👦' },
  { id: 'daughter',              type: RELATIONSHIP_TYPES.CHILD,      label: 'Daughter (Beti)',                  emoji: '👧' },
  { id: 'spouse',                type: RELATIONSHIP_TYPES.SPOUSE,     label: 'Spouse / Partner (Pati / Patni)',  emoji: '💍' },
  { id: 'brother',               type: RELATIONSHIP_TYPES.SIBLING,    label: 'Brother (Bhai / Anna / Thambi)',   emoji: '👦' },
  { id: 'sister',                type: RELATIONSHIP_TYPES.SIBLING,    label: 'Sister (Behen / Akka / Tangai)',   emoji: '👧' },

  // Grandparents (Paternal / Maternal)
  { id: 'paternal_grandfather',  type: RELATIONSHIP_TYPES.GRANDPARENT,label: 'Paternal Grandfather (Dada / Thatha)', emoji: '👴' },
  { id: 'paternal_grandmother',  type: RELATIONSHIP_TYPES.GRANDPARENT,label: 'Paternal Grandmother (Dadi / Paati)',  emoji: '👵' },
  { id: 'maternal_grandfather',  type: RELATIONSHIP_TYPES.GRANDPARENT,label: 'Maternal Grandfather (Nana / Ammavan)',emoji: '👴' },
  { id: 'maternal_grandmother',  type: RELATIONSHIP_TYPES.GRANDPARENT,label: 'Maternal Grandmother (Nani / Ammamma)',emoji: '👵' },
  { id: 'grandchild',            type: RELATIONSHIP_TYPES.GRANDCHILD, label: 'Grandchild (Pota / Poti)',          emoji: '👶' },

  // Uncles & Aunts (Indian Kinship)
  { id: 'paternal_uncle',        type: RELATIONSHIP_TYPES.UNCLE_AUNT, label: 'Paternal Uncle (Chacha / Kaka / Babai)', emoji: '🧔' },
  { id: 'paternal_aunt',         type: RELATIONSHIP_TYPES.UNCLE_AUNT, label: 'Paternal Aunt (Bua / Atta / Pinni)',   emoji: '👩' },
  { id: 'maternal_uncle',        type: RELATIONSHIP_TYPES.UNCLE_AUNT, label: 'Maternal Uncle (Mama / Māmā)',        emoji: '🧔' },
  { id: 'maternal_aunt',         type: RELATIONSHIP_TYPES.UNCLE_AUNT, label: 'Maternal Aunt (Masi / Chithi / Pinni)',  emoji: '👩' },

  // In-Laws
  { id: 'father_in_law',         type: RELATIONSHIP_TYPES.IN_LAW,     label: 'Father-in-law (Sasur / Mavayya)',   emoji: '👨' },
  { id: 'mother_in_law',         type: RELATIONSHIP_TYPES.IN_LAW,     label: 'Mother-in-law (Sasu / Athamma)',    emoji: '👩' },
  { id: 'brother_in_law',        type: RELATIONSHIP_TYPES.IN_LAW,     label: 'Brother-in-law (Bava / Co-brother)',emoji: '👨' },
  { id: 'sister_in_law',         type: RELATIONSHIP_TYPES.IN_LAW,     label: 'Sister-in-law (Bhabhi / Vadinni)',  emoji: '👩' },

  // Extended & Step
  { id: 'cousin',                type: RELATIONSHIP_TYPES.COUSIN,     label: 'Cousin (Cousin brother/sister)',    emoji: '🧑' },
  { id: 'nephew',                type: RELATIONSHIP_TYPES.NEPHEW_NIECE,label: 'Nephew (Bhatija / Bhanja)',         emoji: '👦' },
  { id: 'niece',                 type: RELATIONSHIP_TYPES.NEPHEW_NIECE,label: 'Niece (Bhatiji / Bhanji)',          emoji: '👧' },
  { id: 'step_parent',           type: RELATIONSHIP_TYPES.STEP_PARENT,label: 'Step-parent',                       emoji: '👨‍👧' },
  { id: 'step_child',            type: RELATIONSHIP_TYPES.STEP_CHILD, label: 'Step-child',                        emoji: '👶' },
  { id: 'half_sibling',          type: RELATIONSHIP_TYPES.HALF_SIBLING,label: 'Half-sibling',                     emoji: '🧒' },
];

/**
 * Transitive & Kinship Inference Engine:
 * Analyzes existing relationships and automatically infers missing edges symmetrically for both Father & Mother sides.
 */
function inferTransitiveEdges(edges) {
  if (!Array.isArray(edges)) return [];

  // Filter out shortcut edges and convert legacy CHILD edges to canonical PARENT edges
  const normalizedEdges = [];
  edges.forEach((e) => {
    if (!e || !e.from || !e.to || e.from === e.to) return;
    const t = e.type;
    if (
      t === RELATIONSHIP_TYPES.GRANDPARENT ||
      t === RELATIONSHIP_TYPES.UNCLE_AUNT ||
      t === RELATIONSHIP_TYPES.IN_LAW ||
      t === RELATIONSHIP_TYPES.COUSIN
    ) {
      return;
    }

    if (t === RELATIONSHIP_TYPES.CHILD) {
      normalizedEdges.push({ id: e.id || crypto.randomUUID(), from: e.to, to: e.from, type: RELATIONSHIP_TYPES.PARENT });
    } else {
      normalizedEdges.push({ id: e.id || crypto.randomUUID(), from: e.from, to: e.to, type: t });
    }
  });

  const edgeSet = new Set(normalizedEdges.map((e) => `${e.from}->${e.to}:${e.type}`));
  const newEdges = [...normalizedEdges];

  const addInferred = (from, to, type) => {
    if (!from || !to || from === to) return;
    const key1 = `${from}->${to}:${type}`;
    const key2 = `${to}->${from}:${type}`;
    const exists = newEdges.some(
      (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from)
    );
    if (!exists && !edgeSet.has(key1) && !edgeSet.has(key2)) {
      edgeSet.add(key1);
      newEdges.push({
        id: crypto.randomUUID(),
        from,
        to,
        type,
        isInferred: true,
      });
    }
  };

  // Rule 1: Co-Parents -> Spouses
  newEdges.forEach((e1) => {
    if (e1.type === RELATIONSHIP_TYPES.PARENT) {
      newEdges.forEach((e2) => {
        if (e2.type === RELATIONSHIP_TYPES.PARENT && e1.to === e2.to && e1.from !== e2.from) {
          addInferred(e1.from, e2.from, RELATIONSHIP_TYPES.SPOUSE);
        }
      });
    }
  });

  // Rule 2: Spouse of Parent -> Parent of Child
  newEdges.forEach((e1) => {
    if (e1.type === RELATIONSHIP_TYPES.PARENT) {
      const parentId = e1.from;
      const childId = e1.to;
      newEdges.forEach((e2) => {
        if (e2.type === RELATIONSHIP_TYPES.SPOUSE) {
          if (e2.from === parentId && e2.to !== childId) addInferred(e2.to, childId, RELATIONSHIP_TYPES.PARENT);
          if (e2.to === parentId && e2.from !== childId) addInferred(e2.from, childId, RELATIONSHIP_TYPES.PARENT);
        }
      });
    }
  });

  // Rule 3: Parents of Sibling -> Parent of Child
  newEdges.forEach((e1) => {
    if (e1.type === RELATIONSHIP_TYPES.SIBLING) {
      const s1 = e1.from;
      const s2 = e1.to;
      newEdges.forEach((e2) => {
        if (e2.type === RELATIONSHIP_TYPES.PARENT) {
          if (e2.to === s1) addInferred(e2.from, s2, RELATIONSHIP_TYPES.PARENT, 'Parent');
          if (e2.to === s2) addInferred(e2.from, s1, RELATIONSHIP_TYPES.PARENT, 'Parent');
        }
      });
    }
  });

  return newEdges;
}

function generateFamilyCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KIN-${num}`;
}

/* ─── Store ───────────────────────────────────────────────── */
export const useFamilyStore = create(
  persist(
    (set, get) => ({
      /* App state */
      isOnboarded: false,
      meId: null,
      theme: 'light',

      /* Multi-Family Networks Management */
      activeFamilyId: 'default-fam',
      families: [
        {
          id: 'default-fam',
          name: 'Primary Family Network',
          code: 'KIN-8842',
        }
      ],

      /* Active Tree Data */
      people: {},
      edges: [],
      nodePositions: {},

      /* Messages, Groups, Events */
      messages: [],
      groups: [],
      events: [],

      /* ── Actions ─────────────────────────────────────────── */
      setTheme: (theme) => set({ theme }),

      completeOnboarding: (personData) => {
        const meId = crypto.randomUUID();
        const me = {
          id: meId,
          name: personData.name,
          birthDate: personData.birthDate || '',
          birthPlace: personData.birthPlace || '',
          gender: personData.gender || 'unknown',
          whatsapp: personData.whatsapp || '',
          email: personData.email || '',
          photo: personData.photo || null,
          isMe: true,
          createdAt: Date.now(),
        };

        const defaultFam = {
          id: 'default-fam',
          name: `${personData.name.split(' ')[0]}'s Family Network`,
          code: generateFamilyCode(),
        };

        set({
          isOnboarded: true,
          meId,
          activeFamilyId: defaultFam.id,
          families: [defaultFam],
          people: { [meId]: me },
          edges: [],
        });

        return meId;
      },

      logout: () => set({
        isOnboarded: false,
        meId: null,
        activeFamilyId: 'default-fam',
        families: [{ id: 'default-fam', name: 'Primary Family Network', code: 'KIN-8842' }],
        people: {},
        edges: [],
        nodePositions: {},
        messages: [],
        groups: [],
        events: [],
      }),

      /* Switch Logged In / Active Member Perspective inside the Tree */
      switchPerspective: (targetPersonId) => {
        const { people, families, activeFamilyId } = get();
        if (!people[targetPersonId]) return;

        const updatedPeople = { ...people };
        Object.keys(updatedPeople).forEach((id) => {
          updatedPeople[id] = { ...updatedPeople[id], isMe: id === targetPersonId };
        });

        const updatedFamilies = families.map((f) =>
          f.id === activeFamilyId ? { ...f, meId: targetPersonId, people: updatedPeople } : f
        );

        set({ meId: targetPersonId, people: updatedPeople, families: updatedFamilies });
      },

      /* Create a New Family Tree (e.g. Husband Side / Wife Side) */
      createFamilyTree: (familyName) => {
        const { families, people, edges, meId, activeFamilyId } = get();
        const newFamId = crypto.randomUUID();
        const code = generateFamilyCode();

        // Save current active family state into families list
        const updatedFamilies = families.map((f) =>
          f.id === activeFamilyId
            ? { ...f, people, edges, meId }
            : f
        );

        const newFam = {
          id: newFamId,
          name: familyName || "Secondary Family Network",
          code,
          meId: null,
          people: {},
          edges: [],
        };

        set({
          activeFamilyId: newFamId,
          families: [...updatedFamilies, newFam],
          people: {},
          edges: [],
          meId: null,
          nodePositions: {},
        });

        return newFam;
      },

      /* Switch Active Family Tree (e.g. Husband Side -> Wife Side) */
      switchFamilyTree: (familyId) => {
        const { families, activeFamilyId, people, edges, meId } = get();
        if (familyId === activeFamilyId) return;

        // Save current active tree data
        const updatedFamilies = families.map((f) =>
          f.id === activeFamilyId
            ? { ...f, people, edges, meId }
            : f
        );

        const targetFam = updatedFamilies.find((f) => f.id === familyId);
        if (!targetFam) return;

        set({
          activeFamilyId: familyId,
          families: updatedFamilies,
          people: targetFam.people || {},
          edges: targetFam.edges || [],
          meId: targetFam.meId || (Object.keys(targetFam.people || {})[0] || null),
          nodePositions: {},
        });
      },

      /* Join Existing Family Tree with Family Access Code */
      joinFamilyTree: (code) => {
        const cleanCode = code?.trim().toUpperCase();
        if (!cleanCode) return false;

        const { createFamilyTree } = get();
        const newFam = createFamilyTree(`Shared Family (${cleanCode})`);
        newFam.code = cleanCode;
        return true;
      },

      /* Copy / Import Shared Family Graph Token */
      importSharedGraph: (tokenStr, mode = 'merge') => {
        const data = parseGraphToken(tokenStr);
        if (!data) return false;

        const { people: importedPeople, edges: importedEdges, familyName } = data;

        if (mode === 'new_tree') {
          const { createFamilyTree } = get();
          createFamilyTree(familyName || 'Copied Shared Family');

          const newPeopleMap = {};
          importedPeople.forEach((p) => {
            newPeopleMap[p.id] = { ...p, isMe: false };
          });

          set({
            people: newPeopleMap,
            edges: inferTransitiveEdges(importedEdges),
            meId: importedPeople[0]?.id || null,
          });
          return true;
        }

        // Merge mode into active tree
        const { people: currentPeople, edges: currentEdges } = get();
        const mergedPeople = { ...currentPeople };
        const idMapping = {}; // importedId -> existingId

        const existingByName = {};
        Object.values(currentPeople).forEach((p) => {
          existingByName[p.name.trim().toLowerCase()] = p.id;
        });

        importedPeople.forEach((p) => {
          const key = p.name.trim().toLowerCase();
          if (existingByName[key]) {
            idMapping[p.id] = existingByName[key];
          } else {
            const newId = crypto.randomUUID();
            idMapping[p.id] = newId;
            mergedPeople[newId] = {
              ...p,
              id: newId,
              isMe: false,
            };
          }
        });

        const newEdges = [...currentEdges];
        importedEdges.forEach((e) => {
          const mappedFrom = idMapping[e.from] || e.from;
          const mappedTo = idMapping[e.to] || e.to;
          if (mappedFrom && mappedTo && mappedFrom !== mappedTo) {
            const exists = newEdges.some(
              (ex) => (ex.from === mappedFrom && ex.to === mappedTo) || (ex.from === mappedTo && ex.to === mappedFrom)
            );
            if (!exists) {
              newEdges.push({
                id: crypto.randomUUID(),
                from: mappedFrom,
                to: mappedTo,
                type: e.type,
                label: e.label,
              });
            }
          }
        });

        set({
          people: mergedPeople,
          edges: inferTransitiveEdges(newEdges),
        });
        return true;
      },

      addPerson: (data) => {
        const cleanName = sanitizePersonName(data.name) || 'Unknown';
        const nameKey = cleanName.toLowerCase();
        const { people } = get();

        // Check if person with same name already exists
        const existing = Object.values(people).find(
          (p) => sanitizePersonName(p.name).toLowerCase() === nameKey
        );

        if (existing) {
          if (existing.gender === 'unknown' && data.gender && data.gender !== 'unknown') {
            set((state) => ({
              people: {
                ...state.people,
                [existing.id]: { ...state.people[existing.id], gender: data.gender, name: cleanName },
              },
            }));
          }
          return existing.id;
        }

        const id = crypto.randomUUID();
        const person = {
          id,
          name: cleanName,
          birthDate: data.birthDate || '',
          birthPlace: data.birthPlace || '',
          gender: data.gender || 'unknown',
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          photo: data.photo || null,
          isMe: false,
          createdAt: Date.now(),
        };
        set((state) => ({ people: { ...state.people, [id]: person } }));
        return id;
      },

      updatePerson: (id, updates) => {
        const cleanUpdates = { ...updates };
        if (cleanUpdates.name) {
          cleanUpdates.name = sanitizePersonName(cleanUpdates.name);
        }
        set((state) => ({
          people: {
            ...state.people,
            [id]: { ...state.people[id], ...cleanUpdates },
          },
        }));
      },

      deletePerson: (id) => {
        set((state) => {
          const people = { ...state.people };
          delete people[id];
          const edges = state.edges.filter((e) => e.from !== id && e.to !== id);
          const nodePositions = { ...state.nodePositions };
          delete nodePositions[id];

          let newMeId = state.meId;
          if (state.meId === id) {
            newMeId = Object.keys(people)[0] || null;
            if (newMeId && people[newMeId]) {
              people[newMeId] = { ...people[newMeId], isMe: true };
            }
          }

          return { people, edges: inferTransitiveEdges(edges), nodePositions, meId: newMeId };
        });
      },

      setNodePosition: (id, x, y) => {
        set((state) => ({
          nodePositions: { ...state.nodePositions, [id]: { x, y } },
        }));
      },

      resetNodePositions: () => {
        set({ nodePositions: {}, layoutVersion: Date.now() });
      },

      addEdge: (from, to, type) => {
        if (!from || !to || from === to) return null;

        const { edges } = get();
        let edgeFrom = from;
        let edgeTo = to;
        let edgeType = type;

        if (type === RELATIONSHIP_TYPES.CHILD) {
          edgeFrom = to;
          edgeTo = from;
          edgeType = RELATIONSHIP_TYPES.PARENT;
        }

        const existing = edges.find(
          (e) => (e.from === edgeFrom && e.to === edgeTo) || (e.from === edgeTo && e.to === edgeFrom)
        );

        if (existing) {
          const updatedEdges = edges.map((e) =>
            e.id === existing.id ? { id: e.id, from: edgeFrom, to: edgeTo, type: edgeType } : e
          );
          set({ edges: inferTransitiveEdges(updatedEdges) });
          return existing.id;
        }

        const id = crypto.randomUUID();
        const newEdge = { id, from: edgeFrom, to: edgeTo, type: edgeType };
        const allEdges = [...edges, newEdge];
        const inferredEdges = inferTransitiveEdges(allEdges);

        set({ edges: inferredEdges });
        return id;
      },

      removeEdge: (id) => {
        set((state) => {
          const edgeToRemove = state.edges.find((e) => e.id === id);
          if (!edgeToRemove) return { edges: state.edges.filter((e) => e.id !== id) };
          const filtered = state.edges.filter(
            (e) => !((e.from === edgeToRemove.from && e.to === edgeToRemove.to) ||
                     (e.from === edgeToRemove.to && e.to === edgeToRemove.from))
          );
          return { edges: filtered };
        });
      },

      updateEdge: (id, type, label) => {
        set((state) => {
          const updated = state.edges.map((e) =>
            e.id === id ? { ...e, type, label: label || type } : e
          );
          return { edges: inferTransitiveEdges(updated) };
        });
      },

      mergePeople: (primaryId, duplicateId) => {
        if (!primaryId || !duplicateId || primaryId === duplicateId) return;

        set((state) => {
          const people = { ...state.people };
          delete people[duplicateId];

          const edges = state.edges.map((e) => {
            let from = e.from;
            let to = e.to;
            if (from === duplicateId) from = primaryId;
            if (to === duplicateId) to = primaryId;
            return { ...e, from, to };
          }).filter((e) => e.from !== e.to);

          const nodePositions = { ...state.nodePositions };
          delete nodePositions[duplicateId];

          return { people, edges: inferTransitiveEdges(edges), nodePositions };
        });
      },

      /* Messaging */
      sendMessage: (fromId, toId, text, groupId = null) => {
        const msg = {
          id: crypto.randomUUID(),
          fromId, toId, groupId,
          text, timestamp: Date.now(), read: false,
        };
        set((state) => ({ messages: [...state.messages, msg] }));
      },

      markRead: (msgId) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === msgId ? { ...m, read: true } : m
          ),
        }));
      },

      createGroup: (name, memberIds, description = '') => {
        const group = { id: crypto.randomUUID(), name, memberIds, description, createdAt: Date.now() };
        set((state) => ({ groups: [...state.groups, group] }));
        return group.id;
      },

      addEvent: (title, date, type, personIds, description = '') => {
        const event = { id: crypto.randomUUID(), title, date, type, personIds, description };
        set((state) => ({ events: [...state.events, event] }));
        return event.id;
      },

      /* Helpers */
      getRelationshipLabel: (fromId, toId) => {
        const { edges } = get();
        const edge = edges.find(
          (e) => (e.from === fromId && e.to === toId) ||
                 (e.from === toId && e.to === fromId)
        );
        return edge ? edge.label : null;
      },

      getNeighbors: (personId) => {
        const { edges, people } = get();
        return edges
          .filter((e) => e.from === personId || e.to === personId)
          .map((e) => ({
            person: people[e.from === personId ? e.to : e.from],
            edge: e,
          }))
          .filter((n) => n.person);
      },

      getConversation: (aId, bId) => {
        const { messages } = get();
        return messages
          .filter((m) =>
            !m.groupId &&
            ((m.fromId === aId && m.toId === bId) ||
             (m.fromId === bId && m.toId === aId))
          )
          .sort((a, b) => a.timestamp - b.timestamp);
      },

      getPersonCount: () => Object.keys(get().people).length,

      getGenerationCount: () => {
        const { edges, meId } = get();
        if (!meId) return 0;
        let maxUp = 0;
        const visited = new Set();
        const queue = [{ id: meId, gen: 0 }];
        while (queue.length) {
          const { id, gen } = queue.shift();
          if (visited.has(id)) continue;
          visited.add(id);
          if (gen > maxUp) maxUp = gen;
          edges
            .filter((e) => e.to === id && e.type === RELATIONSHIP_TYPES.PARENT)
            .forEach((e) => queue.push({ id: e.from, gen: gen + 1 }));
        }
        let maxDown = 0;
        const queue2 = [{ id: meId, gen: 0 }];
        const visited2 = new Set();
        while (queue2.length) {
          const { id, gen } = queue2.shift();
          if (visited2.has(id)) continue;
          visited2.add(id);
          if (gen > maxDown) maxDown = gen;
          edges
            .filter((e) => e.from === id && e.type === RELATIONSHIP_TYPES.CHILD)
            .forEach((e) => queue2.push({ id: e.to, gen: gen + 1 }));
        }
        return maxUp + maxDown + 1;
      },
    }),
    {
      name: 'familygraph-store',
      version: 9,
      migrate: (persistedState, version) => {
        // v8 → v9: sanitizePersonName is handled by onRehydrateStorage
        // Just pass state through; rehydration purger cleans everything
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        if (state && state.people) {
          const canonicalPeople = {};
          const aliasMap = {}; // duplicateId -> canonicalId

          Object.values(state.people).forEach((p) => {
            const cleanName = sanitizePersonName(p.name);
            if (!cleanName || cleanName.length < 2) return;
            const key = cleanName.toLowerCase();
            if (!canonicalPeople[key]) {
              canonicalPeople[key] = { ...p, name: cleanName };
              aliasMap[p.id] = p.id;
            } else {
              aliasMap[p.id] = canonicalPeople[key].id;
              if (canonicalPeople[key].gender === 'unknown' && p.gender && p.gender !== 'unknown') {
                canonicalPeople[key].gender = p.gender;
              }
            }
          });

          // Rebuild people map with canonical unique IDs
          const cleanPeopleMap = {};
          Object.values(canonicalPeople).forEach((p) => {
            cleanPeopleMap[p.id] = p;
          });

          // Remap meId
          if (state.meId && aliasMap[state.meId]) {
            state.meId = aliasMap[state.meId];
          }

          // Remap edges
          if (state.edges) {
            const remappedEdges = state.edges
              .map((e) => ({
                ...e,
                from: aliasMap[e.from] || e.from,
                to: aliasMap[e.to] || e.to,
              }))
              .filter((e) => e.from && e.to && e.from !== e.to);
            state.edges = inferTransitiveEdges(remappedEdges);
          }

          state.people = cleanPeopleMap;
        }
      },
    }
  )
);
