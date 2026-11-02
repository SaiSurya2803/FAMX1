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

function inferTransitiveEdges(edges) {
  if (!Array.isArray(edges)) return [];

  // Normalize legacy CHILD, GRANDCHILD, STEP_CHILD edges to canonical direction
  const normalizedEdges = [];
  edges.forEach((e) => {
    if (!e || !e.from || !e.to || e.from === e.to) return;
    const t = e.type;

    if (t === RELATIONSHIP_TYPES.CHILD) {
      normalizedEdges.push({ id: e.id || crypto.randomUUID(), from: e.to, to: e.from, type: RELATIONSHIP_TYPES.PARENT });
    } else if (t === RELATIONSHIP_TYPES.GRANDCHILD) {
      normalizedEdges.push({ id: e.id || crypto.randomUUID(), from: e.to, to: e.from, type: RELATIONSHIP_TYPES.GRANDPARENT });
    } else if (t === RELATIONSHIP_TYPES.STEP_CHILD) {
      normalizedEdges.push({ id: e.id || crypto.randomUUID(), from: e.to, to: e.from, type: RELATIONSHIP_TYPES.STEP_PARENT });
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
          if (e2.to === s1) addInferred(e2.from, s2, RELATIONSHIP_TYPES.PARENT);
          if (e2.to === s2) addInferred(e2.from, s1, RELATIONSHIP_TYPES.PARENT);
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

      /* ── Load $100M Showcase Dynastic Lineage ───────────── */
      loadShowcaseFamily: () => {
        const meId = 'showcase-me';
        const people = {
          'showcase-pgpa': {
            id: 'showcase-pgpa',
            memberNo: 1,
            name: 'Ramachandra Rao',
            gender: 'male',
            birthDate: '1942-04-12',
            birthPlace: 'Mysore, Karnataka',
            isDeceased: true,
            deathDate: '2019-11-14',
            phone: '+91 98450 11223',
            whatsapp: '+91 98450 11223',
            instagram: 'ramachandrarao_legacy',
            facebook: 'ramachandra.rao.mysore',
            snapchat: '',
            photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
            isMe: false,
          },
          'showcase-pgma': {
            id: 'showcase-pgma',
            memberNo: 2,
            name: 'Sita Devi',
            gender: 'female',
            birthDate: '1946-08-19',
            birthPlace: 'Bengaluru, Karnataka',
            isDeceased: true,
            deathDate: '2022-05-08',
            phone: '+91 98450 11224',
            whatsapp: '+91 98450 11224',
            instagram: '',
            facebook: 'sita.devi.rao',
            snapchat: '',
            photo: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400&q=80',
            isMe: false,
          },
          'showcase-mgpa': {
            id: 'showcase-mgpa',
            memberNo: 3,
            name: 'Venkateswara Rao',
            gender: 'male',
            birthDate: '1944-01-05',
            birthPlace: 'Hyderabad, Telangana',
            isDeceased: false,
            phone: '+91 98450 11225',
            whatsapp: '+91 98450 11225',
            instagram: 'venkat_rao_44',
            facebook: 'venkateswara.rao.hyd',
            snapchat: '',
            photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
            isMe: false,
          },
          'showcase-mgma': {
            id: 'showcase-mgma',
            memberNo: 4,
            name: 'Lakshmi Devi',
            gender: 'female',
            birthDate: '1948-11-23',
            birthPlace: 'Vijayawada, AP',
            isDeceased: false,
            phone: '+91 98450 11226',
            whatsapp: '+91 98450 11226',
            instagram: '',
            facebook: 'lakshmi.devi.vijayawada',
            snapchat: '',
            photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
            isMe: false,
          },
          'showcase-father': {
            id: 'showcase-father',
            memberNo: 5,
            name: 'Kiran Kumar Rao',
            gender: 'male',
            birthDate: '1968-06-15',
            birthPlace: 'Hyderabad, Telangana',
            isDeceased: false,
            phone: '+91 98490 33445',
            whatsapp: '+91 98490 33445',
            instagram: 'kiran.rao.68',
            facebook: 'kiran.kumar.rao',
            snapchat: 'kiran_rao68',
            photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
            isMe: false,
          },
          'showcase-mother': {
            id: 'showcase-mother',
            memberNo: 6,
            name: 'Sujatha Rao',
            gender: 'female',
            birthDate: '1972-03-28',
            birthPlace: 'Vijayawada, AP',
            isDeceased: false,
            phone: '+91 98490 33446',
            whatsapp: '+91 98490 33446',
            instagram: 'sujatharao_artist',
            facebook: 'sujatha.rao.art',
            snapchat: 'sujatha_r72',
            photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
            isMe: false,
          },
          'showcase-puncle': {
            id: 'showcase-puncle',
            memberNo: 7,
            name: 'Raghavendra Rao',
            gender: 'male',
            birthDate: '1971-09-10',
            birthPlace: 'Hyderabad, Telangana',
            isDeceased: false,
            phone: '+91 98490 33447',
            whatsapp: '+91 98490 33447',
            instagram: 'raghav.rao',
            facebook: 'raghavendra.rao',
            snapchat: '',
            photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
            isMe: false,
          },
          'showcase-paunt': {
            id: 'showcase-paunt',
            memberNo: 8,
            name: 'Kavitha Rao',
            gender: 'female',
            birthDate: '1975-02-14',
            birthPlace: 'Chennai, TN',
            isDeceased: false,
            phone: '+91 98490 33448',
            whatsapp: '+91 98490 33448',
            instagram: 'kavitha.designs',
            facebook: 'kavitha.rao.chennai',
            snapchat: '',
            photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
            isMe: false,
          },
          'showcase-muncle': {
            id: 'showcase-muncle',
            memberNo: 9,
            name: 'Prasad Rao',
            gender: 'male',
            birthDate: '1975-12-04',
            birthPlace: 'Vijayawada, AP',
            isDeceased: false,
            phone: '+91 98490 33449',
            whatsapp: '+91 98490 33449',
            instagram: 'prasad.rao.doc',
            facebook: 'dr.prasad.rao',
            snapchat: '',
            photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80',
            isMe: false,
          },
          'showcase-maunt': {
            id: 'showcase-maunt',
            memberNo: 10,
            name: 'Lalitha Rao',
            gender: 'female',
            birthDate: '1978-07-21',
            birthPlace: 'Tirupati, AP',
            isDeceased: false,
            phone: '+91 98490 33450',
            whatsapp: '+91 98490 33450',
            instagram: 'lalitha_rao',
            facebook: 'lalitha.rao',
            snapchat: '',
            photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&q=80',
            isMe: false,
          },
          [meId]: {
            id: meId,
            memberNo: 11,
            name: 'Bheema Sai Surya',
            gender: 'male',
            birthDate: '1998-05-18',
            birthPlace: 'Bengaluru, Karnataka',
            isDeceased: false,
            phone: '+91 99801 55667',
            whatsapp: '+91 99801 55667',
            instagram: 'bheema_surya',
            facebook: 'bheema.sai.surya',
            snapchat: 'bheema_surya98',
            photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
            isMe: true,
          },
          'showcase-spouse': {
            id: 'showcase-spouse',
            memberNo: 12,
            name: 'Ananya Sharma',
            gender: 'female',
            birthDate: '2000-09-12',
            birthPlace: 'Mumbai, Maharashtra',
            isDeceased: false,
            phone: '+91 99801 55668',
            whatsapp: '+91 99801 55668',
            instagram: 'ananya.sharma.art',
            facebook: 'ananya.sharma',
            snapchat: 'ananya_snap',
            photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
            isMe: false,
          },
          'showcase-brother': {
            id: 'showcase-brother',
            memberNo: 13,
            name: 'Vikram Surya',
            gender: 'male',
            birthDate: '2002-01-30',
            birthPlace: 'Bengaluru, Karnataka',
            isDeceased: false,
            phone: '+91 99801 55669',
            whatsapp: '+91 99801 55669',
            instagram: 'vikram_surya_fit',
            facebook: 'vikram.surya',
            snapchat: 'vikram_s22',
            photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
            isMe: false,
          },
          'showcase-sister': {
            id: 'showcase-sister',
            memberNo: 14,
            name: 'Sneha Surya',
            gender: 'female',
            birthDate: '2005-04-14',
            birthPlace: 'Bengaluru, Karnataka',
            isDeceased: false,
            phone: '+91 99801 55670',
            whatsapp: '+91 99801 55670',
            instagram: 'sneha_surya_music',
            facebook: 'sneha.surya',
            snapchat: 'sneha_s05',
            photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
            isMe: false,
          },
          'showcase-parallel-cousin': {
            id: 'showcase-parallel-cousin',
            memberNo: 15,
            name: 'Arjun Rao',
            gender: 'male',
            birthDate: '1999-10-08',
            birthPlace: 'Hyderabad, Telangana',
            isDeceased: false,
            phone: '+91 98480 77889',
            whatsapp: '+91 98480 77889',
            instagram: 'arjun.rao.code',
            facebook: 'arjun.rao.tech',
            snapchat: 'arjun_r99',
            photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80',
            isMe: false,
          },
          'showcase-cross-cousin': {
            id: 'showcase-cross-cousin',
            memberNo: 16,
            name: 'Meera Rao',
            gender: 'female',
            birthDate: '2001-08-25',
            birthPlace: 'Vijayawada, AP',
            isDeceased: false,
            phone: '+91 98480 77890',
            whatsapp: '+91 98480 77890',
            instagram: 'meera_classical',
            facebook: 'meera.rao.music',
            snapchat: 'meera_vibes',
            photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
            isMe: false,
          },
          'showcase-son': {
            id: 'showcase-son',
            memberNo: 17,
            name: 'Aarav Surya',
            gender: 'male',
            birthDate: '2024-02-10',
            birthPlace: 'Bengaluru, Karnataka',
            isDeceased: false,
            phone: '',
            whatsapp: '',
            instagram: '',
            facebook: '',
            snapchat: '',
            photo: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&q=80',
            isMe: false,
          },
        };

        const edges = [
          { id: 'sc-1', from: 'showcase-pgpa', to: 'showcase-father', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-2', from: 'showcase-pgma', to: 'showcase-father', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-3', from: 'showcase-pgpa', to: 'showcase-puncle', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-4', from: 'showcase-pgma', to: 'showcase-puncle', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-5', from: 'showcase-pgpa', to: 'showcase-pgma', type: RELATIONSHIP_TYPES.SPOUSE },

          { id: 'sc-6', from: 'showcase-mgpa', to: 'showcase-mother', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-7', from: 'showcase-mgma', to: 'showcase-mother', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-8', from: 'showcase-mgpa', to: 'showcase-muncle', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-9', from: 'showcase-mgma', to: 'showcase-muncle', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-10', from: 'showcase-mgpa', to: 'showcase-mgma', type: RELATIONSHIP_TYPES.SPOUSE },

          { id: 'sc-11', from: 'showcase-father', to: 'showcase-mother', type: RELATIONSHIP_TYPES.SPOUSE },
          { id: 'sc-12', from: 'showcase-father', to: meId, type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-13', from: 'showcase-mother', to: meId, type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-14', from: 'showcase-father', to: 'showcase-brother', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-15', from: 'showcase-mother', to: 'showcase-brother', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-16', from: 'showcase-father', to: 'showcase-sister', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-17', from: 'showcase-mother', to: 'showcase-sister', type: RELATIONSHIP_TYPES.PARENT },

          { id: 'sc-18', from: 'showcase-puncle', to: 'showcase-paunt', type: RELATIONSHIP_TYPES.SPOUSE },
          { id: 'sc-19', from: 'showcase-puncle', to: 'showcase-parallel-cousin', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-20', from: 'showcase-paunt', to: 'showcase-parallel-cousin', type: RELATIONSHIP_TYPES.PARENT },

          { id: 'sc-21', from: 'showcase-muncle', to: 'showcase-maunt', type: RELATIONSHIP_TYPES.SPOUSE },
          { id: 'sc-22', from: 'showcase-muncle', to: 'showcase-cross-cousin', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-23', from: 'showcase-maunt', to: 'showcase-cross-cousin', type: RELATIONSHIP_TYPES.PARENT },

          { id: 'sc-24', from: meId, to: 'showcase-spouse', type: RELATIONSHIP_TYPES.SPOUSE },
          { id: 'sc-25', from: meId, to: 'showcase-son', type: RELATIONSHIP_TYPES.PARENT },
          { id: 'sc-26', from: 'showcase-spouse', to: 'showcase-son', type: RELATIONSHIP_TYPES.PARENT },
        ];

        const showcaseFam = {
          id: 'showcase-network',
          name: 'Surya Dynastic Lineage (Showcase)',
          code: 'KIN-100M',
        };

        set({
          isOnboarded: true,
          meId,
          activeFamilyId: showcaseFam.id,
          families: [showcaseFam],
          people,
          edges: inferTransitiveEdges(edges),
          nodePositions: {},
        });
        return meId;
      },

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
          memberNo: data.memberNo || (Object.keys(people).length + 1),
          name: cleanName,
          birthDate: data.birthDate || '',
          birthPlace: data.birthPlace || '',
          isDeceased: !!data.isDeceased,
          deathDate: data.deathDate || '',
          gender: data.gender || 'unknown',
          phone: data.phone || '',
          whatsapp: data.whatsapp || data.phone || '',
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          snapchat: data.snapchat || '',
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
        } else if (type === RELATIONSHIP_TYPES.GRANDCHILD) {
          edgeFrom = to;
          edgeTo = from;
          edgeType = RELATIONSHIP_TYPES.GRANDPARENT;
        } else if (type === RELATIONSHIP_TYPES.STEP_CHILD) {
          edgeFrom = to;
          edgeTo = from;
          edgeType = RELATIONSHIP_TYPES.STEP_PARENT;
        }

        const existing = edges.find(
          (e) => (e.from === edgeFrom && e.to === edgeTo) || (e.from === edgeTo && e.to === edgeFrom)
        );

        if (existing) {
          // If existing edge already has the exact same type and direction, return existing id
          if (existing.type === edgeType && existing.from === edgeFrom && existing.to === edgeTo) {
            return existing.id;
          }
          // For symmetric edges (SPOUSE, SIBLING), direction does not matter
          if (
            (edgeType === RELATIONSHIP_TYPES.SPOUSE && existing.type === RELATIONSHIP_TYPES.SPOUSE) ||
            (edgeType === RELATIONSHIP_TYPES.SIBLING && existing.type === RELATIONSHIP_TYPES.SIBLING)
          ) {
            return existing.id;
          }
          // Otherwise update edge type
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
