/**
 * Universal Smart Kinsutra AI Agent Graph Parser
 * Handles arbitrary text formats, bracketed expressions, CSV, Excel spreadsheets,
 * multi-member rows, relation rows, and freeform natural language.
 */

import { RELATIONSHIP_TYPES } from '../store/familyStore';

// Helper: Sanitize person names by stripping punctuation, stop words, and extra spaces
export function sanitizePersonName(str) {
  if (!str) return '';
  let clean = String(str)
    .replace(/[\.\,\;\:\!\?\"\'\(\)\[\]\{\}\*\/\\]/g, ' ')
    .trim();

  // Common leading/trailing English stop-word phrases
  const stopWords = ['is', 'was', 'are', 'were', 'the', 'a', 'an', 'has', 'have', 'had', 'and', 'or', 'of', 'to', 'in', 'named', 'called', 'eldest', 'second', 'youngest', 'first', 'sons', 'son', 'daughters', 'daughter', 'children', 'child', 'one', 'two', 'three', 'four', 'five'];

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

  if (relClean.includes('father') || relClean.includes('son') || relClean.includes('husband') || relClean.includes('brother') || relClean.includes('grandfather') || relClean.includes('uncle')) {
    return 'male';
  }
  if (relClean.includes('mother') || relClean.includes('daughter') || relClean.includes('wife') || relClean.includes('sister') || relClean.includes('grandmother') || relClean.includes('aunt')) {
    return 'female';
  }

  // Common Indian female name suffixes & patterns
  if (nameClean.endsWith('a') || nameClean.endsWith('i') || nameClean.endsWith('ee') || nameClean.includes('devi') || nameClean.includes('kumari') || nameClean.includes('sujatha') || nameClean.includes('hymavathi') || nameClean.includes('lakshmi') || nameClean.includes('ananya')) {
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
      (e) => (e.fromName.toLowerCase() === p1Name.toLowerCase() && e.toName.toLowerCase() === p2Name.toLowerCase() && e.type === type) ||
             (e.fromName.toLowerCase() === p2Name.toLowerCase() && e.toName.toLowerCase() === p1Name.toLowerCase() && e.type === type)
    );
    if (!exists) {
      edgesList.push({ fromName: p1Name, toName: p2Name, type });
    }
  };

  // Split lines / sentences
  const lines = inputText.split(/[\n;.]+/).map((l) => l.trim()).filter(Boolean);

  lines.forEach((line) => {
    // Pattern 1: "X and Y have three sons: Ramesh, Suresh, and Mahesh" / "X and Y have two children: a son named Arjun..."
    const mHaveKids = line.match(/([a-zA-Z\s]+)\s+and\s+([a-zA-Z\s]+)\s+have\s+(?:[a-zA-Z\s]+:)?\s*([a-zA-Z\s,&]+)/i);
    if (mHaveKids) {
      const p1 = addPersonRef(mHaveKids[1]);
      const p2 = addPersonRef(mHaveKids[2]);
      if (p1 && p2) addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SPOUSE);

      const rawKidsStr = mHaveKids[3];
      const kidsList = rawKidsStr.split(/and|&|,/).map((k) => sanitizePersonName(k)).filter((k) => k && k.length >= 2);
      kidsList.forEach((kName) => {
        const child = addPersonRef(kName);
        if (child) {
          if (p1) addEdgeRef(p1, child, RELATIONSHIP_TYPES.PARENT);
          if (p2) addEdgeRef(p2, child, RELATIONSHIP_TYPES.PARENT);
        }
      });
      return;
    }

    // Pattern 2: "Ramesh, Suresh, and Mahesh are brothers / siblings"
    const mSibGroup = line.match(/([a-zA-Z\s,&]+)\s+are\s+(?:brothers|sisters|siblings)/i);
    if (mSibGroup) {
      const sibs = mSibGroup[1].split(/and|&|,/).map((s) => sanitizePersonName(s)).filter((s) => s && s.length >= 2);
      for (let i = 0; i < sibs.length; i++) {
        for (let j = i + 1; j < sibs.length; j++) {
          const s1 = addPersonRef(sibs[i]);
          const s2 = addPersonRef(sibs[j]);
          if (s1 && s2) addEdgeRef(s1, s2, RELATIONSHIP_TYPES.SIBLING);
        }
      }
      return;
    }

    // Pattern 3: "Kiran is the paternal grandfather of Arjun, Priya, Rahul..."
    const mGrand = line.match(/([a-zA-Z\s]+)\s+is\s+(?:the\s+)?(?:paternal|maternal)?\s*(?:grandfather|grandmother)\s+of\s+([a-zA-Z\s,&]+)/i);
    if (mGrand) {
      const gp = addPersonRef(mGrand[1]);
      const rawGc = mGrand[2].split(/and|&|,/).map((g) => sanitizePersonName(g)).filter((g) => g && g.length >= 2);
      rawGc.forEach((gcName) => {
        const gc = addPersonRef(gcName);
        if (gp && gc) addEdgeRef(gp, gc, RELATIONSHIP_TYPES.GRANDPARENT);
      });
      return;
    }

    // Pattern A: "Bheema (Son of Kiran and Sujatha)"
    const mBracket = line.match(/([a-zA-Z\s]+)\s*\(([^)]+)\)/);
    if (mBracket) {
      const subject = addPersonRef(mBracket[1]);
      const content = mBracket[2].trim();

      const mSonOf = content.match(/son\s+of\s+([a-zA-Z\s&,]+)/i);
      const mDauOf = content.match(/daughter\s+of\s+([a-zA-Z\s&,]+)/i);
      const mChildOf = content.match(/child\s+of\s+([a-zA-Z\s&,]+)/i);
      const mFatherOf = content.match(/father\s+of\s+([a-zA-Z\s&,]+)/i);
      const mMotherOf = content.match(/mother\s+of\s+([a-zA-Z\s&,]+)/i);

      if (mSonOf || mDauOf || mChildOf) {
        const parentsStr = (mSonOf || mDauOf || mChildOf)[1];
        const parents = parentsStr.split(/and|&|,/).map((p) => p.trim()).filter(Boolean);
        parents.forEach((pName) => {
          const parentObj = addPersonRef(pName);
          if (subject && parentObj) addEdgeRef(parentObj, subject, RELATIONSHIP_TYPES.PARENT);
        });
      } else if (mFatherOf || mMotherOf) {
        const childrenStr = (mFatherOf || mMotherOf)[1];
        const children = childrenStr.split(/and|&|,/).map((c) => c.trim()).filter(Boolean);
        children.forEach((cName) => {
          const childObj = addPersonRef(cName);
          if (subject && childObj) addEdgeRef(subject, childObj, RELATIONSHIP_TYPES.PARENT);
        });
      }
      return;
    }

    // Pattern B: "Kiran is father of Bheema" / "Sujatha mother of Bheema"
    const mFather = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*father\s+of\s+([a-zA-Z\s]+)/i);
    const mMother = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*mother\s+of\s+([a-zA-Z\s]+)/i);
    const mParent = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*parent\s+of\s+([a-zA-Z\s]+)/i);

    if (mFather) {
      const f = addPersonRef(mFather[1], 'father');
      const c = addPersonRef(mFather[2]);
      if (f && c) addEdgeRef(f, c, RELATIONSHIP_TYPES.PARENT);
      return;
    }
    if (mMother) {
      const m = addPersonRef(mMother[1], 'mother');
      const c = addPersonRef(mMother[2]);
      if (m && c) addEdgeRef(m, c, RELATIONSHIP_TYPES.PARENT);
      return;
    }
    if (mParent) {
      const p = addPersonRef(mParent[1]);
      const c = addPersonRef(mParent[2]);
      if (p && c) addEdgeRef(p, c, RELATIONSHIP_TYPES.PARENT);
      return;
    }

    // Pattern C: "Bheema is son of Kiran" / "Ramesh is the eldest son of Kiran and Sujatha"
    const mSonParents = line.match(/([a-zA-Z\s]+)\s+is\s+(?:the\s+)?(?:eldest|second|youngest)?\s*son\s+of\s+([a-zA-Z\s]+)\s+and\s+([a-zA-Z\s]+)/i);
    if (mSonParents) {
      const son = addPersonRef(mSonParents[1], 'son');
      const p1 = addPersonRef(mSonParents[2]);
      const p2 = addPersonRef(mSonParents[3]);
      if (p1 && son) addEdgeRef(p1, son, RELATIONSHIP_TYPES.PARENT);
      if (p2 && son) addEdgeRef(p2, son, RELATIONSHIP_TYPES.PARENT);
      if (p1 && p2) addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SPOUSE);
      return;
    }

    const mSon = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*son\s+of\s+([a-zA-Z\s]+)/i);
    const mDau = line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*daughter\s+of\s+([a-zA-Z\s]+)/i);

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

    // Pattern D: "Kiran is married to Sujatha" / "Kiran husband of Sujatha"
    const mSpouse = line.match(/([a-zA-Z\s]+)\s+(?:is|was)?\s*married\s+to\s+([a-zA-Z\s]+)/i) ||
                    line.match(/([a-zA-Z\s]+)\s+(?:is|was|the)?\s*(?:husband|wife|spouse)\s+of\s+([a-zA-Z\s]+)/i);
    if (mSpouse) {
      const s1 = addPersonRef(mSpouse[1]);
      const s2 = addPersonRef(mSpouse[2]);
      if (s1 && s2) addEdgeRef(s1, s2, RELATIONSHIP_TYPES.SPOUSE);
      return;
    }

    // Pattern E: "Kiran - Father - Bheema" / "Bheema, Son, Kiran"
    const parts = line.split(/[-:,]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const p1Str = parts[0];
      const relStr = parts[1].toLowerCase();
      const p2Str = parts[2];

      const p1 = addPersonRef(p1Str, relStr);
      const p2 = addPersonRef(p2Str);

      if (p1 && p2) {
        if (relStr.includes('father') || relStr.includes('mother') || relStr.includes('parent')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.PARENT);
        } else if (relStr.includes('son') || relStr.includes('daughter') || relStr.includes('child')) {
          addEdgeRef(p2, p1, RELATIONSHIP_TYPES.PARENT);
        } else if (relStr.includes('husband') || relStr.includes('wife') || relStr.includes('spouse')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SPOUSE);
        } else if (relStr.includes('brother') || relStr.includes('sister') || relStr.includes('sibling')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SIBLING);
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
    const clean = String(nameStr).trim();
    if (!clean || clean.length < 2) return null;

    const key = clean.toLowerCase();
    if (!peopleMap[key]) {
      peopleMap[key] = {
        name: clean,
        gender: inferGender(clean, genderHint),
      };
    }
    return peopleMap[key].name;
  };

  const addEdgeRef = (p1Name, p2Name, type) => {
    if (!p1Name || !p2Name || p1Name.toLowerCase() === p2Name.toLowerCase()) return;
    const exists = edgesList.some(
      (e) => (e.fromName.toLowerCase() === p1Name.toLowerCase() && e.toName.toLowerCase() === p2Name.toLowerCase() && e.type === type) ||
             (e.fromName.toLowerCase() === p2Name.toLowerCase() && e.toName.toLowerCase() === p1Name.toLowerCase() && e.type === type)
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
    const childrenStr = getCellVal(row, ['children', 'child', 'son', 'daughter']);
    const siblingsStr = getCellVal(row, ['siblings', 'sibling', 'brother', 'sister']);

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
        } else if (rel.includes('husband') || rel.includes('wife') || rel.includes('spouse') || rel.includes('in-law') || rel.includes('in law')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SPOUSE);
        } else if (rel.includes('father') || rel.includes('mother')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.PARENT);
        } else if (rel.includes('son') || rel.includes('daughter') || rel.includes('child')) {
          if (rel.includes('grand')) {
            // Handled via lineage parent connection
          } else {
            addEdgeRef(p2, p1, RELATIONSHIP_TYPES.PARENT);
          }
        } else if (rel.includes('brother') || rel.includes('sister') || rel.includes('sibling') || rel.includes('cousin')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SIBLING);
        } else if (rel.includes('uncle') || rel.includes('aunt') || rel.includes('nephew') || rel.includes('niece')) {
          addEdgeRef(p1, p2, RELATIONSHIP_TYPES.SIBLING);
        }
      }
    }
  });

  return {
    people: Object.values(peopleMap),
    edges: edgesList,
  };
}
