/**
 * Universal Smart Kinsutra AI Agent Graph Parser
 * Handles arbitrary text formats, bracketed expressions, CSV, Excel spreadsheets,
 * multi-member rows, relation rows, and freeform natural language.
 */

import { RELATIONSHIP_TYPES } from '../store/familyStore.js';

// Helper: Sanitize person names by stripping punctuation, stop words, and extra spaces
export function sanitizePersonName(str) {
  if (!str) return '';
  let clean = String(str)
    .replace(/['’]s\b/gi, '') // Strip possessive 's first before removing apostrophes
    .replace(/[.,;:!?'`()[\]{}*/\\]/g, ' ')
    .trim();

  // Common leading/trailing English stop-word phrases
  const stopWords = [
    'is', 'was', 'are', 'were', 'the', 'a', 'an', 'has', 'have', 'had',
    'and', 'or', 'of', 'to', 'in', 'named', 'called', 'eldest', 'second',
    'youngest', 'first', 'third', 'sons', 'son', 'daughters', 'daughter',
    'children', 'child', 'one', 'two', 'three', 'four', 'five', 'their',
    'his', 'her', 'my', 'our'
  ];

  let words = clean.split(/\s+/).filter(Boolean);
  while (words.length > 1 && stopWords.includes(words[0].toLowerCase())) {
    words.shift();
  }
  while (words.length > 1 && stopWords.includes(words[words.length - 1].toLowerCase())) {
    words.pop();
  }

  return words.join(' ');
}

// Helper: Infer gender from name or relationship context
export function inferGender(nameStr, relContext = '') {
  if (!nameStr) return 'unknown';
  const nameClean = sanitizePersonName(nameStr).toLowerCase();
  const relClean = relContext.trim().toLowerCase();

  if (
    relClean.includes('father') || relClean.includes('dad') ||
    relClean.includes('son') || relClean.includes('husband') ||
    relClean.includes('brother') || relClean.includes('grandfather') ||
    relClean.includes('uncle') || relClean.includes('nephew') ||
    relClean.includes('boy') || relClean.includes('male')
  ) {
    return 'male';
  }
  if (
    relClean.includes('mother') || relClean.includes('mom') ||
    relClean.includes('daughter') || relClean.includes('wife') ||
    relClean.includes('sister') || relClean.includes('grandmother') ||
    relClean.includes('aunt') || relClean.includes('niece') ||
    relClean.includes('girl') || relClean.includes('female')
  ) {
    return 'female';
  }

  // Common Indian female name suffixes & patterns
  if (
    nameClean.endsWith('a') || nameClean.endsWith('i') || nameClean.endsWith('ee') ||
    nameClean.includes('devi') || nameClean.includes('kumari') || nameClean.includes('sujatha') ||
    nameClean.includes('hymavathi') || nameClean.includes('lakshmi') || nameClean.includes('ananya') ||
    nameClean.includes('priya') || nameClean.includes('kavitha') || nameClean.includes('shanti')
  ) {
    return 'female';
  }

  return 'male';
}

// ── 1. Universal Natural Language & Freeform Text Parser ───────────────
export function parseNaturalText(inputText) {
  if (!inputText || !inputText.trim()) return { people: [], edges: [] };

  const peopleMap = {}; // cleanNameLower -> { name, gender }
  const edgesList = []; // { fromName, toName, type }

  const addPersonRef = (nameStr, genderHint = 'unknown') => {
    if (!nameStr) return null;
    const clean = sanitizePersonName(nameStr);
    if (!clean || clean.length < 2) return null;

    const key = clean.toLowerCase();
    if (!peopleMap[key]) {
      peopleMap[key] = {
        name: clean,
        gender: inferGender(clean, genderHint),
      };
    } else if (peopleMap[key].gender === 'unknown' && genderHint !== 'unknown') {
      peopleMap[key].gender = inferGender(clean, genderHint);
    }
    return peopleMap[key].name;
  };

  const addEdgeRef = (p1Name, p2Name, type) => {
    if (!p1Name || !p2Name || p1Name.toLowerCase() === p2Name.toLowerCase()) return;
    const exists = edgesList.some(
      (e) =>
        (e.fromName.toLowerCase() === p1Name.toLowerCase() &&
          e.toName.toLowerCase() === p2Name.toLowerCase() &&
          e.type === type) ||
        (e.fromName.toLowerCase() === p2Name.toLowerCase() &&
          e.toName.toLowerCase() === p1Name.toLowerCase() &&
          e.type === type)
    );
    if (!exists) {
      edgesList.push({ fromName: p1Name, toName: p2Name, type });
    }
  };

  const splitNames = (str) => {
    if (!str) return [];
    return str
      .split(/(?:\s+and\s+|\s*&\s*|\s*,\s*|\s+with\s+)/i)
      .map((s) => sanitizePersonName(s))
      .filter((s) => s && s.length >= 2);
  };

  // Split lines / sentences by newline or semicolon, and clean trailing punctuation
  const lines = inputText
    .split(/[\n;]+/)
    .map((l) => l.replace(/[.,!]+$/, '').trim())
    .filter(Boolean);

  lines.forEach((line) => {
    // ── Pattern 1: Possessive "X is Y's father/mother/son/daughter/husband/wife/brother/sister"
    const mPossessive = line.match(
      /([a-zA-Z\s]+)\s+(?:is|was)\s+([a-zA-Z\s]+)(?:'s|’s|\s+s)\s+(father|mother|dad|mom|parent|husband|wife|spouse|son|daughter|child|brother|sister|sibling|grandfather|grandmother|uncle|aunt|cousin|nephew|niece)/i
    );
    if (mPossessive) {
      const subjectName = mPossessive[1];
      const targetName = mPossessive[2];
      const rel = mPossessive[3].toLowerCase();

      const sub = addPersonRef(subjectName, rel);
      const tgt = addPersonRef(targetName);

      if (sub && tgt) {
        if (rel.includes('grandfather') || rel.includes('grandmother') || rel.includes('grandparent')) {
          addEdgeRef(sub, tgt, RELATIONSHIP_TYPES.GRANDPARENT);
        } else if (rel.includes('grandson') || rel.includes('granddaughter') || rel.includes('grandchild')) {
          addEdgeRef(tgt, sub, RELATIONSHIP_TYPES.GRANDPARENT);
        } else if (rel.includes('father') || rel.includes('mother') || rel.includes('dad') || rel.includes('mom') || rel.includes('parent')) {
          addEdgeRef(sub, tgt, RELATIONSHIP_TYPES.PARENT);
        } else if (rel.includes('son') || rel.includes('daughter') || rel.includes('child')) {
          addEdgeRef(tgt, sub, RELATIONSHIP_TYPES.PARENT);
        } else if (rel.includes('husband') || rel.includes('wife') || rel.includes('spouse')) {
          addEdgeRef(sub, tgt, RELATIONSHIP_TYPES.SPOUSE);
        } else if (rel.includes('brother') || rel.includes('sister') || rel.includes('sibling')) {
          addEdgeRef(sub, tgt, RELATIONSHIP_TYPES.SIBLING);
        } else if (rel.includes('uncle') || rel.includes('aunt')) {
          addEdgeRef(sub, tgt, RELATIONSHIP_TYPES.UNCLE_AUNT);
        } else if (rel.includes('cousin')) {
          addEdgeRef(sub, tgt, RELATIONSHIP_TYPES.COUSIN);
        }
      }
      return;
    }

    // ── Pattern 2: "X and Y have three sons/children: Ramesh, Suresh, and Mahesh"
    const mHaveKidsTwo = line.match(
      /([a-zA-Z\s]+)\s+and\s+([a-zA-Z\s]+)\s+have\s+(?:[a-zA-Z0-9\s]+:)?\s*([a-zA-Z\s,&]+)/i
    );
    if (mHaveKidsTwo) {
      const p1 = addPersonRef(mHaveKidsTwo[1]);
      const p2 = addPersonRef(mHaveKidsTwo[2]);
      if (p1 && p2) addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SPOUSE);

      const rawKidsStr = mHaveKidsTwo[3];
      const kidsList = splitNames(rawKidsStr);
      kidsList.forEach((kName) => {
        const child = addPersonRef(kName);
        if (child) {
          if (p1) addEdgeRef(p1, child, RELATIONSHIP_TYPES.PARENT);
          if (p2) addEdgeRef(p2, child, RELATIONSHIP_TYPES.PARENT);
        }
      });
      return;
    }

    // ── Pattern 3: Single parent "X has children/sons/daughters: A, B, and C"
    const mHaveKidsSingle = line.match(
      /([a-zA-Z\s]+)\s+has\s+(?:[a-zA-Z0-9\s]+:)?\s*([a-zA-Z\s,&]+)/i
    );
    if (mHaveKidsSingle && !line.match(/\b(husband|wife|brother|sister|father|mother)\b/i)) {
      const p = addPersonRef(mHaveKidsSingle[1]);
      const kidsList = splitNames(mHaveKidsSingle[2]);
      kidsList.forEach((kName) => {
        const child = addPersonRef(kName);
        if (p && child) addEdgeRef(p, child, RELATIONSHIP_TYPES.PARENT);
      });
      return;
    }

    // ── Pattern 4: "Ramesh, Suresh, and Mahesh are brothers / sisters / siblings"
    const mSibGroup = line.match(/([a-zA-Z\s,&]+)\s+are\s+(?:brothers|sisters|siblings)/i);
    if (mSibGroup) {
      const sibs = splitNames(mSibGroup[1]);
      for (let i = 0; i < sibs.length; i++) {
        for (let j = i + 1; j < sibs.length; j++) {
          const s1 = addPersonRef(sibs[i]);
          const s2 = addPersonRef(sibs[j]);
          if (s1 && s2) addEdgeRef(s1, s2, RELATIONSHIP_TYPES.SIBLING);
        }
      }
      return;
    }

    // ── Pattern 5: "X and Y are married" / "X and Y are husband and wife" / "X and Y are a couple"
    const mSpouseGroup = line.match(/([a-zA-Z\s]+)\s+and\s+([a-zA-Z\s]+)\s+are\s+(?:married|husband\s+and\s+wife|wife\s+and\s+husband|a\s+couple|partners)/i);
    if (mSpouseGroup) {
      const s1 = addPersonRef(mSpouseGroup[1]);
      const s2 = addPersonRef(mSpouseGroup[2]);
      if (s1 && s2) addEdgeRef(s1, s2, RELATIONSHIP_TYPES.SPOUSE);
      return;
    }

    // ── Pattern 6: "Kiran is the paternal grandfather of Arjun, Priya, Rahul..."
    const mGrand = line.match(
      /([a-zA-Z\s]+)\s+is\s+(?:the\s+)?(?:paternal|maternal)?\s*(?:grandfather|grandmother)\s+of\s+([a-zA-Z\s,&]+)/i
    );
    if (mGrand) {
      const gp = addPersonRef(mGrand[1], 'grandfather');
      const gcs = splitNames(mGrand[2]);
      gcs.forEach((gcName) => {
        const gc = addPersonRef(gcName);
        if (gp && gc) addEdgeRef(gp, gc, RELATIONSHIP_TYPES.GRANDPARENT);
      });
      return;
    }

    // ── Pattern 7: "Bheema (Son of Kiran and Sujatha)"
    const mBracket = line.match(/([a-zA-Z\s]+)\s*\(([^)]+)\)/);
    if (mBracket) {
      const subject = addPersonRef(mBracket[1]);
      const content = mBracket[2].trim();

      const mChildOf = content.match(/(?:son|daughter|child)\s+of\s+([a-zA-Z\s&,]+)/i);
      const mParentOf = content.match(/(?:father|mother|parent)\s+of\s+([a-zA-Z\s&,]+)/i);
      const mSpouseOf = content.match(/(?:husband|wife|spouse)\s+of\s+([a-zA-Z\s&,]+)/i);

      if (mChildOf) {
        const parents = splitNames(mChildOf[1]);
        parents.forEach((pName) => {
          const parentObj = addPersonRef(pName);
          if (subject && parentObj) addEdgeRef(parentObj, subject, RELATIONSHIP_TYPES.PARENT);
        });
        if (parents.length >= 2) {
          const p1 = addPersonRef(parents[0]);
          const p2 = addPersonRef(parents[1]);
          if (p1 && p2) addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SPOUSE);
        }
      } else if (mParentOf) {
        const children = splitNames(mParentOf[1]);
        children.forEach((cName) => {
          const childObj = addPersonRef(cName);
          if (subject && childObj) addEdgeRef(subject, childObj, RELATIONSHIP_TYPES.PARENT);
        });
      } else if (mSpouseOf) {
        const sp = addPersonRef(mSpouseOf[1]);
        if (subject && sp) addEdgeRef(subject, sp, RELATIONSHIP_TYPES.SPOUSE);
      }
      return;
    }

    // ── Pattern 8: "X is father/mother/parent of Y, Z, and W" (multi-children support)
    const mFather = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*father\s+of\s+([a-zA-Z\s,&]+)/i);
    const mMother = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*mother\s+of\s+([a-zA-Z\s,&]+)/i);
    const mParent = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*parent\s+of\s+([a-zA-Z\s,&]+)/i);

    if (mFather) {
      const f = addPersonRef(mFather[1], 'father');
      const kids = splitNames(mFather[2]);
      kids.forEach((k) => {
        const c = addPersonRef(k);
        if (f && c) addEdgeRef(f, c, RELATIONSHIP_TYPES.PARENT);
      });
      return;
    }
    if (mMother) {
      const m = addPersonRef(mMother[1], 'mother');
      const kids = splitNames(mMother[2]);
      kids.forEach((k) => {
        const c = addPersonRef(k);
        if (m && c) addEdgeRef(m, c, RELATIONSHIP_TYPES.PARENT);
      });
      return;
    }
    if (mParent) {
      const p = addPersonRef(mParent[1]);
      const kids = splitNames(mParent[2]);
      kids.forEach((k) => {
        const c = addPersonRef(k);
        if (p && c) addEdgeRef(p, c, RELATIONSHIP_TYPES.PARENT);
      });
      return;
    }

    // ── Pattern 9: "X is the son/daughter/child of Y and Z" (multi-parent support)
    const mChildParents = line.match(
      /([a-zA-Z\s]+)\s+is\s+(?:the\s+)?(?:eldest|second|youngest|first)?\s*(son|daughter|child)\s+of\s+([a-zA-Z\s]+)\s+and\s+([a-zA-Z\s]+)/i
    );
    if (mChildParents) {
      const role = mChildParents[2].toLowerCase();
      const child = addPersonRef(mChildParents[1], role);
      const p1 = addPersonRef(mChildParents[3]);
      const p2 = addPersonRef(mChildParents[4]);
      if (p1 && child) addEdgeRef(p1, child, RELATIONSHIP_TYPES.PARENT);
      if (p2 && child) addEdgeRef(p2, child, RELATIONSHIP_TYPES.PARENT);
      if (p1 && p2) addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SPOUSE);
      return;
    }

    // ── Pattern 10: "X is the son/daughter/child of Y" (single parent)
    const mSon = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*son\s+of\s+([a-zA-Z\s]+)/i);
    const mDau = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*daughter\s+of\s+([a-zA-Z\s]+)/i);
    const mChild = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*child\s+of\s+([a-zA-Z\s]+)/i);

    if (mSon) {
      const c = addPersonRef(mSon[1], 'son');
      const p = addPersonRef(mSon[2]);
      if (p && c) addEdgeRef(p, c, RELATIONSHIP_TYPES.PARENT);
      return;
    }
    if (mDau) {
      const c = addPersonRef(mDau[1], 'daughter');
      const p = addPersonRef(mDau[2]);
      if (p && c) addEdgeRef(p, c, RELATIONSHIP_TYPES.PARENT);
      return;
    }
    if (mChild) {
      const c = addPersonRef(mChild[1]);
      const p = addPersonRef(mChild[2]);
      if (p && c) addEdgeRef(p, c, RELATIONSHIP_TYPES.PARENT);
      return;
    }

    // ── Pattern 11: "X is married to Y" / "X husband of Y" / "X wife of Y"
    const mSpouse =
      line.match(/([a-zA-Z\s]+)\s+(?:is|was)?\s*married\s+to\s+([a-zA-Z\s]+)/i) ||
      line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*(?:husband|wife|spouse)\s+of\s+([a-zA-Z\s]+)/i);
    if (mSpouse) {
      const s1 = addPersonRef(mSpouse[1]);
      const s2 = addPersonRef(mSpouse[2]);
      if (s1 && s2) addEdgeRef(s1, s2, RELATIONSHIP_TYPES.SPOUSE);
      return;
    }

    // ── Pattern 12: "X is brother/sister/sibling of Y"
    const mSib = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*(?:brother|sister|sibling)\s+of\s+([a-zA-Z\s]+)/i);
    if (mSib) {
      const s1 = addPersonRef(mSib[1]);
      const s2 = addPersonRef(mSib[2]);
      if (s1 && s2) addEdgeRef(s1, s2, RELATIONSHIP_TYPES.SIBLING);
      return;
    }

    // ── Pattern 13: "Kiran - Father - Bheema" / "Bheema, Son, Kiran" / "Father: Kiran"
    const parts = line.split(/[-:,]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const p1Str = parts[0];
      const relStr = parts[1].toLowerCase();
      const p2Str = parts[2];

      const p1 = addPersonRef(p1Str, relStr);
      const p2 = addPersonRef(p2Str);

      if (p1 && p2) {
        if (relStr.includes('grandfather') || relStr.includes('grandmother') || relStr.includes('grandparent')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.GRANDPARENT);
        } else if (relStr.includes('grandson') || relStr.includes('granddaughter') || relStr.includes('grandchild')) {
          addEdgeRef(p2, p1, RELATIONSHIP_TYPES.GRANDPARENT);
        } else if (relStr.includes('father') || relStr.includes('mother') || relStr.includes('parent')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.PARENT);
        } else if (relStr.includes('son') || relStr.includes('daughter') || relStr.includes('child')) {
          addEdgeRef(p2, p1, RELATIONSHIP_TYPES.PARENT);
        } else if (relStr.includes('husband') || relStr.includes('wife') || relStr.includes('spouse') || relStr.includes('married')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SPOUSE);
        } else if (relStr.includes('brother') || relStr.includes('sister') || relStr.includes('sibling')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SIBLING);
        } else if (relStr.includes('uncle') || relStr.includes('aunt')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.UNCLE_AUNT);
        } else if (relStr.includes('cousin')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.COUSIN);
        }
      }
    }
  });

  return {
    people: Object.values(peopleMap),
    edges: edgesList,
  };
}

// ── 2. Universal Excel / CSV Spreadsheet Parser ────────────────────────
export function parseExcelRows(rows) {
  if (!rows || !Array.isArray(rows) || !rows.length) {
    return { people: [], edges: [] };
  }

  const peopleMap = {};
  const edgesList = [];

  const addPersonRef = (nameStr, genderHint = 'unknown') => {
    if (!nameStr) return null;
    const clean = sanitizePersonName(nameStr);
    if (!clean || clean.length < 2) return null;

    const key = clean.toLowerCase();
    if (!peopleMap[key]) {
      peopleMap[key] = {
        name: clean,
        gender: inferGender(clean, genderHint),
      };
    } else if (peopleMap[key].gender === 'unknown' && genderHint !== 'unknown') {
      peopleMap[key].gender = inferGender(clean, genderHint);
    }
    return peopleMap[key].name;
  };

  const addEdgeRef = (p1Name, p2Name, type) => {
    if (!p1Name || !p2Name || p1Name.toLowerCase() === p2Name.toLowerCase()) return;
    const exists = edgesList.some(
      (e) =>
        (e.fromName.toLowerCase() === p1Name.toLowerCase() &&
          e.toName.toLowerCase() === p2Name.toLowerCase() &&
          e.type === type) ||
        (e.fromName.toLowerCase() === p2Name.toLowerCase() &&
          e.toName.toLowerCase() === p1Name.toLowerCase() &&
          e.type === type)
    );
    if (!exists) {
      edgesList.push({ fromName: p1Name, toName: p2Name, type });
    }
  };

  // Cell inspector helper
  const getCellVal = (row, aliases) => {
    for (const key of Object.keys(row)) {
      const kClean = key.trim().toLowerCase();
      for (const alias of aliases) {
        if (kClean === alias.toLowerCase() || kClean.includes(alias.toLowerCase())) {
          if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
            return String(row[key]).trim();
          }
        }
      }
    }
    return '';
  };

  rows.forEach((row) => {
    // Check Format A: Direct member row (Name, Father, Mother, Spouse, Children, Siblings)
    const personName = getCellVal(row, ['name', 'person', 'full name', 'member', 'individual']);
    const gender = getCellVal(row, ['gender', 'sex']);
    const father = getCellVal(row, ['father', 'father name', 'dad']);
    const mother = getCellVal(row, ['mother', 'mother name', 'mom']);
    const spouse = getCellVal(row, ['spouse', 'husband', 'wife', 'partner']);
    const childrenStr = getCellVal(row, ['children', 'child', 'son', 'daughter', 'sons', 'daughters']);
    const siblingsStr = getCellVal(row, ['siblings', 'sibling', 'brother', 'sister', 'brothers', 'sisters']);

    if (personName) {
      const subject = addPersonRef(personName, gender);

      if (father) {
        const f = addPersonRef(father, 'male');
        if (f && subject) addEdgeRef(f, subject, RELATIONSHIP_TYPES.PARENT);
      }
      if (mother) {
        const m = addPersonRef(mother, 'female');
        if (m && subject) addEdgeRef(m, subject, RELATIONSHIP_TYPES.PARENT);
        if (father) {
          const f = addPersonRef(father, 'male');
          if (f && m) addEdgeRef(f, m, RELATIONSHIP_TYPES.SPOUSE);
        }
      }
      if (spouse) {
        const s = addPersonRef(spouse);
        if (s && subject) addEdgeRef(subject, s, RELATIONSHIP_TYPES.SPOUSE);
      }
      if (childrenStr) {
        const kids = childrenStr.split(/[,;&|]+/).map((k) => k.trim()).filter(Boolean);
        kids.forEach((kName) => {
          const k = addPersonRef(kName);
          if (k && subject) addEdgeRef(subject, k, RELATIONSHIP_TYPES.PARENT);
          if (spouse) {
            const s = addPersonRef(spouse);
            if (s && k) addEdgeRef(s, k, RELATIONSHIP_TYPES.PARENT);
          }
        });
      }
      if (siblingsStr) {
        const sibs = siblingsStr.split(/[,;&|]+/).map((s) => s.trim()).filter(Boolean);
        sibs.forEach((sName) => {
          const s = addPersonRef(sName);
          if (s && subject) addEdgeRef(subject, s, RELATIONSHIP_TYPES.SIBLING);
        });
      }
    }

    // Check Format B: 3-column connection row (Person 1, Relation, Person 2)
    const relStr = getCellVal(row, ['relation', 'relationship', 'type', 'connection']);
    const relativeName = getCellVal(row, ['relative', 'relative name', 'related to', 'anchor', 'person 2']);

    if (personName && relStr && relativeName) {
      const p1 = addPersonRef(personName, relStr);
      const p2 = addPersonRef(relativeName);

      if (p1 && p2 && p1.toLowerCase() !== p2.toLowerCase()) {
        const rel = relStr.toLowerCase();

        if (rel.includes('head of family')) {
          // Primary Root
        } else if (
          rel.includes('husband') ||
          rel.includes('wife') ||
          rel.includes('spouse') ||
          rel.includes('married')
        ) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SPOUSE);
        } else if (rel.includes('father') || rel.includes('mother') || rel.includes('parent')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.PARENT);
        } else if (rel.includes('son') || rel.includes('daughter') || rel.includes('child')) {
          addEdgeRef(p2, p1, RELATIONSHIP_TYPES.PARENT);
        } else if (rel.includes('brother') || rel.includes('sister') || rel.includes('sibling')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SIBLING);
        } else if (rel.includes('grandfather') || rel.includes('grandmother') || rel.includes('grandparent')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.GRANDPARENT);
        } else if (rel.includes('grandchild') || rel.includes('grandson') || rel.includes('granddaughter')) {
          addEdgeRef(p2, p1, RELATIONSHIP_TYPES.GRANDPARENT);
        } else if (rel.includes('uncle') || rel.includes('aunt')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.UNCLE_AUNT);
        } else if (rel.includes('nephew') || rel.includes('niece')) {
          addEdgeRef(p2, p1, RELATIONSHIP_TYPES.UNCLE_AUNT);
        } else if (rel.includes('cousin')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.COUSIN);
        } else if (rel.includes('in-law') || rel.includes('in law')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.IN_LAW);
        }
      }
    }
  });

  return {
    people: Object.values(peopleMap),
    edges: edgesList,
  };
}
