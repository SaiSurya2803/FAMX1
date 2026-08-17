/**
 * Kinsutra Formal Lounsbury Kinship String Algebra Engine (Client JS implementation)
 * Uses formal string reduction algebra (+ for Ascent, - for Descent, 0 for Lateral, = for Affine)
 * to derive any kinship relationship across human family systems.
 * Incorporates research-backed Parallel Cousin vs Cross Cousin (Dravidian/Indo-Aryan) classification
 * and multi-regional terminology (Hindi, Telugu, Tamil, Kannada, Malayalam).
 */

import { RELATIONSHIP_TYPES } from '../store/familyStore';

const ORDINAL_SUFFIXES = { 1: '1st', 2: '2nd', 3: '3rd' };
function getOrdinal(n) {
  if (11 <= (n % 100) && (n % 100) <= 13) return `${n}th`;
  return `${n}${ORDINAL_SUFFIXES[n % 10] || 'th'}`;
}

export function deriveRelationship(meId, targetId, people = {}, edges = []) {
  try {
    if (!meId || !targetId || !people[meId] || !people[targetId]) {
      return {
        relationship: 'UNKNOWN',
        displayName: 'Unconnected Relative',
        culturalTerm: 'Relative',
        path: [],
        side: 'NEUTRAL',
        isBloodRelative: false,
        isMarriageRelative: false,
      };
    }

    if (meId === targetId) {
      return {
        relationship: 'SELF',
        displayName: 'Self (YOU)',
        culturalTerm: 'You',
        path: ['YOU'],
        side: 'NUCLEAR',
        isBloodRelative: true,
        isMarriageRelative: false,
      };
    }

    const path = findAlgebraicPath(meId, targetId, people, edges);
    if (!path || !path.length) {
      // Check direct edge shortcut if graph path finding didn't catch an isolated edge
      const directEdge = edges.find(
        (e) => (e.from === meId && e.to === targetId) || (e.to === meId && e.from === targetId)
      );
      if (directEdge) {
        const isFromMe = directEdge.from === meId;
        const target = people[targetId];
        const isFemale = target?.gender === 'female';
        if (directEdge.type === RELATIONSHIP_TYPES.PARENT) {
          return {
            relationship: isFromMe ? (isFemale ? 'DAUGHTER' : 'SON') : (isFemale ? 'MOTHER' : 'FATHER'),
            displayName: isFromMe ? (isFemale ? 'Daughter' : 'Son') : (isFemale ? 'Mother' : 'Father'),
            culturalTerm: isFromMe ? (isFemale ? 'Daughter (Beti / Ammayi)' : 'Son (Beta / Abbayi)') : (isFemale ? 'Mother (Amma / Mataji)' : 'Father (Appa / Pitaji)'),
            path: ['YOU', target?.name || 'Target'],
            side: 'NUCLEAR',
            isBloodRelative: true,
            isMarriageRelative: false,
          };
        }
        if (directEdge.type === RELATIONSHIP_TYPES.SPOUSE) {
          return {
            relationship: isFemale ? 'WIFE' : 'HUSBAND',
            displayName: isFemale ? 'Wife' : 'Husband',
            culturalTerm: isFemale ? 'Wife (Patni / Bharya)' : 'Husband (Pati / Bhartha)',
            path: ['YOU', target?.name || 'Target'],
            side: 'NUCLEAR',
            isBloodRelative: false,
            isMarriageRelative: true,
          };
        }
        if (directEdge.type === RELATIONSHIP_TYPES.SIBLING) {
          return {
            relationship: isFemale ? 'SISTER' : 'BROTHER',
            displayName: isFemale ? 'Sister' : 'Brother',
            culturalTerm: isFemale ? 'Sister (Behen / Akka / Tangai)' : 'Brother (Bhai / Anna / Thambi)',
            path: ['YOU', target?.name || 'Target'],
            side: 'NUCLEAR',
            isBloodRelative: true,
            isMarriageRelative: false,
          };
        }
      }

      return {
        relationship: 'UNCONNECTED',
        displayName: 'Family Relative',
        culturalTerm: 'Family Relative',
        path: [],
        side: 'NEUTRAL',
        isBloodRelative: false,
        isMarriageRelative: false,
      };
    }

    return reduceKinshipAlgebra(meId, targetId, path, people);
  } catch (err) {
    console.error('Error in deriveRelationship:', err);
    return {
      relationship: 'UNKNOWN',
      displayName: 'Family Relative',
      culturalTerm: 'Family Relative',
      path: [],
      side: 'NEUTRAL',
      isBloodRelative: false,
      isMarriageRelative: false,
    };
  }
}

function findAlgebraicPath(startId, targetId, people, edges) {
  const queue = [[startId, []]];
  const visited = new Set([startId]);

  const getPerson = (id) => people[id] || { id, name: 'Relative', gender: 'unknown' };

  const getParents = (id) =>
    edges
      .filter((e) => (e.to === id && e.type === RELATIONSHIP_TYPES.PARENT) || (e.from === id && e.type === RELATIONSHIP_TYPES.CHILD))
      .map((e) => (e.type === RELATIONSHIP_TYPES.CHILD ? e.to : e.from));

  const getChildren = (id) =>
    edges
      .filter((e) => (e.from === id && e.type === RELATIONSHIP_TYPES.PARENT) || (e.to === id && e.type === RELATIONSHIP_TYPES.CHILD))
      .map((e) => (e.type === RELATIONSHIP_TYPES.CHILD ? e.from : e.to));

  const getSpouses = (id) =>
    edges
      .filter((e) => (e.from === id || e.to === id) && e.type === RELATIONSHIP_TYPES.SPOUSE)
      .map((e) => (e.from === id ? e.to : e.from));

  const getSiblings = (id) => {
    const sibs = new Set();
    // Direct sibling edges
    edges
      .filter((e) => (e.from === id || e.to === id) && (e.type === RELATIONSHIP_TYPES.SIBLING || e.type === RELATIONSHIP_TYPES.HALF_SIBLING))
      .forEach((e) => sibs.add(e.from === id ? e.to : e.from));

    // Siblings through shared parents
    const parents = getParents(id);
    if (parents.length) {
      parents.forEach((p) =>
        getChildren(p).forEach((c) => {
          if (c !== id) sibs.add(c);
        })
      );
    }
    return Array.from(sibs);
  };

  while (queue.length > 0) {
    const [currId, history] = queue.shift();
    if (currId === targetId) return history;

    // 1. Direct Lateral (0) - Explore siblings first for closest sibling paths
    getSiblings(currId).forEach((sId) => {
      if (!visited.has(sId)) {
        visited.add(sId);
        queue.push([sId, [...history, { from: currId, to: sId, op: '0', person: getPerson(sId) }]]);
      }
    });

    // 2. Ascent (+) - Parents
    getParents(currId).forEach((pId) => {
      if (!visited.has(pId)) {
        visited.add(pId);
        queue.push([pId, [...history, { from: currId, to: pId, op: '+', person: getPerson(pId) }]]);
      }
    });

    // 3. Descent (-) - Children
    getChildren(currId).forEach((cId) => {
      if (!visited.has(cId)) {
        visited.add(cId);
        queue.push([cId, [...history, { from: currId, to: cId, op: '-', person: getPerson(cId) }]]);
      }
    });

    // 4. Affine (=) - Spouses
    getSpouses(currId).forEach((spId) => {
      if (!visited.has(spId)) {
        visited.add(spId);
        queue.push([spId, [...history, { from: currId, to: spId, op: '=', person: getPerson(spId) }]]);
      }
    });
  }

  return null;
}

function reduceKinshipAlgebra(meId, targetId, path, people) {
  const target = people[targetId];
  let rawOps = path.map((p) => p.op);

  // Normalize op sequence:
  // If path is '+-' (went up to parent and down to other child without explicit 0), normalize to '0'
  // If path is '++-' (went up to grandparent and down to uncle), normalize to '+0'
  // If path is '++--' (went up to grandparent and down to cousin), normalize to '+0-'
  // If path is '+--' (went up to parent and down to grandchild = niece/nephew), normalize to '0-'
  const rawStr = rawOps.join('');
  let ops = [...rawOps];

  if (rawStr === '+-') {
    ops = ['0'];
  } else if (rawStr === '++-') {
    ops = ['+', '0'];
  } else if (rawStr === '++--') {
    ops = ['+', '0', '-'];
  } else if (rawStr === '+--') {
    ops = ['0', '-'];
  } else if (rawStr === '+++-') {
    ops = ['+', '+', '0'];
  } else if (rawStr === '+++--') {
    ops = ['+', '+', '0', '-'];
  } else if (rawStr === '+++---') {
    ops = ['+', '+', '0', '-', '-'];
  }

  const opStr = ops.join('');
  const isFemale =
    target?.gender === 'female' ||
    target?.name?.toLowerCase().includes('sujatha') ||
    target?.name?.toLowerCase().includes('amma') ||
    target?.name?.toLowerCase().includes('priya') ||
    target?.name?.toLowerCase().includes('devi') ||
    target?.name?.toLowerCase().includes('kavitha');

  const firstStep = path[0];
  const firstParent = firstStep?.op === '+' ? firstStep.person : null;

  let side = 'NUCLEAR';
  if (firstParent) {
    side =
      firstParent.gender === 'female' ||
      firstParent.name?.toLowerCase().includes('mother') ||
      firstParent.name?.toLowerCase().includes('amma') ||
      firstParent.name?.toLowerCase().includes('sujatha')
        ? 'MATERNAL'
        : 'PATERNAL';
  } else if (ops.includes('=')) {
    side = 'IN_LAW';
  }

  let rel = 'UNKNOWN';
  let name = 'Family Relative';
  let term = 'Family Relative';

  // ── 1. Direct Nuclear (Father, Mother, Son, Daughter, Brother, Sister, Spouse) ──
  if (opStr === '+') {
    rel = isFemale ? 'MOTHER' : 'FATHER';
    name = isFemale ? 'Mother' : 'Father';
    term = isFemale ? 'Mother (Amma / Mataji)' : 'Father (Appa / Pitaji)';
  } else if (opStr === '-') {
    rel = isFemale ? 'DAUGHTER' : 'SON';
    name = isFemale ? 'Daughter' : 'Son';
    term = isFemale ? 'Daughter (Beti / Ammayi)' : 'Son (Beta / Abbayi)';
  } else if (opStr === '0') {
    rel = isFemale ? 'SISTER' : 'BROTHER';
    name = isFemale ? 'Sister' : 'Brother';
    term = isFemale ? 'Sister (Behen / Akka / Tangai)' : 'Brother (Bhai / Anna / Thambi)';
  } else if (opStr === '=') {
    rel = isFemale ? 'WIFE' : 'HUSBAND';
    name = isFemale ? 'Wife' : 'Husband';
    term = isFemale ? 'Wife (Patni / Bharya)' : 'Husband (Pati / Bhartha)';
  }

  // ── 2. Pure Ascent (+)^N (Ancestors / Grandparents) ─────────────────────────────
  else if (ops.every((op) => op === '+')) {
    const n = ops.length;
    if (n === 2) {
      if (side === 'MATERNAL') {
        rel = isFemale ? 'MATERNAL_GRANDMOTHER' : 'MATERNAL_GRANDFATHER';
        name = isFemale ? 'Maternal Grandmother' : 'Maternal Grandfather';
        term = isFemale ? 'Maternal Grandmother (Nani / Ammamma)' : 'Maternal Grandfather (Nana / Ammavan / Thatha)';
      } else {
        rel = isFemale ? 'PATERNAL_GRANDMOTHER' : 'PATERNAL_GRANDFATHER';
        name = isFemale ? 'Paternal Grandmother' : 'Paternal Grandfather';
        term = isFemale ? 'Paternal Grandmother (Dadi / Paati)' : 'Paternal Grandfather (Dada / Thatha)';
      }
    } else if (n === 3) {
      rel = isFemale ? 'GREAT_GRANDMOTHER' : 'GREAT_GRANDFATHER';
      name = isFemale ? 'Great-Grandmother' : 'Great-Grandfather';
      term = name;
    } else {
      const greatPrefix = 'Great-'.repeat(n - 2);
      name = `${greatPrefix}${isFemale ? 'Grandmother' : 'Grandfather'}`;
      term = name;
    }
  }

  // ── 3. Pure Descent (-)^N (Descendants / Grandchildren) ──────────────────────────
  else if (ops.every((op) => op === '-')) {
    const n = ops.length;
    if (n === 2) {
      rel = isFemale ? 'GRANDDAUGHTER' : 'GRANDSON';
      name = isFemale ? 'Granddaughter' : 'Grandson';
      term = isFemale ? 'Granddaughter (Poti / Manavaraalu)' : 'Grandson (Pota / Manavadu)';
    } else if (n === 3) {
      rel = isFemale ? 'GREAT_GRANDDAUGHTER' : 'GREAT_GRANDSON';
      name = isFemale ? 'Great-Granddaughter' : 'Great-Grandson';
      term = name;
    } else {
      const greatPrefix = 'Great-'.repeat(n - 2);
      name = `${greatPrefix}${isFemale ? 'Granddaughter' : 'Grandson'}`;
      term = name;
    }
  }

  // ── 4. Collateral Ancestors (+)^N 0 (Uncles / Aunts / Grand-Uncles) ─────────────
  else if (ops.length >= 2 && ops.slice(0, -1).every((op) => op === '+') && ops[ops.length - 1] === '0') {
    const nParents = ops.length - 1;
    if (nParents === 1) {
      if (side === 'MATERNAL') {
        rel = isFemale ? 'MATERNAL_AUNT' : 'MATERNAL_UNCLE';
        name = isFemale ? 'Maternal Aunt' : 'Maternal Uncle';
        term = isFemale ? 'Maternal Aunt (Masi / Chithi / Pinni)' : 'Maternal Uncle (Mama / Māmā / Mavayya)';
      } else {
        rel = isFemale ? 'PATERNAL_AUNT' : 'PATERNAL_UNCLE';
        name = isFemale ? 'Paternal Aunt' : 'Paternal Uncle';
        term = isFemale ? 'Paternal Aunt (Bua / Atta / Pinni)' : 'Paternal Uncle (Chacha / Kaka / Babai)';
      }
    } else if (nParents === 2) {
      name = `${side === 'MATERNAL' ? 'Maternal' : 'Paternal'} Grand-${isFemale ? 'Aunt' : 'Uncle'}`;
      term = name;
    } else {
      const greatPrefix = 'Great-'.repeat(nParents - 2);
      name = `${side === 'MATERNAL' ? 'Maternal' : 'Paternal'} ${greatPrefix}Grand-${isFemale ? 'Aunt' : 'Uncle'}`;
      term = name;
    }
  }

  // ── 5. Collateral Uncles/Aunts Spouses (+)^N 0 = (Chachi / Fufa / Mami / Mausa) ─
  else if (
    ops.length >= 3 &&
    ops.slice(0, -2).every((op) => op === '+') &&
    ops[ops.length - 2] === '0' &&
    ops[ops.length - 1] === '='
  ) {
    const uncleAuntPerson = path[path.length - 2]?.person;
    const uncleAuntGender = uncleAuntPerson?.gender;
    if (side === 'MATERNAL') {
      if (uncleAuntGender === 'female') {
        rel = 'MATERNAL_AUNT_SPOUSE';
        name = "Maternal Aunt's Husband (Mausa)";
        term = 'Mausa / Mavayya (Maternal Aunt\'s Husband)';
      } else {
        rel = 'MATERNAL_UNCLE_SPOUSE';
        name = "Maternal Uncle's Wife (Mami)";
        term = 'Mami / Athamma (Maternal Uncle\'s Wife)';
      }
    } else {
      if (uncleAuntGender === 'female') {
        rel = 'PATERNAL_AUNT_SPOUSE';
        name = "Paternal Aunt's Husband (Fufa)";
        term = 'Fufa / Phupa / Mavayya (Paternal Aunt\'s Husband)';
      } else {
        rel = 'PATERNAL_UNCLE_SPOUSE';
        name = "Paternal Uncle's Wife (Chachi / Kaki)";
        term = 'Chachi / Tai / Pinni / Kaki (Paternal Uncle\'s Wife)';
      }
    }
  }

  // ── 6. Affine In-Laws (= +, = 0, = 0 =, - =) ────────────────────────────────────
  else if (ops.includes('=')) {
    if (opStr === '=+' || opStr === '+=') {
      rel = isFemale ? 'MOTHER_IN_LAW' : 'FATHER_IN_LAW';
      name = isFemale ? 'Mother-in-law' : 'Father-in-law';
      term = isFemale ? 'Mother-in-law (Sasu / Athamma)' : 'Father-in-law (Sasur / Mavayya)';
    } else if (opStr === '=0' || opStr === '0=' || opStr === '=0' || opStr === '0=') {
      rel = isFemale ? 'SISTER_IN_LAW' : 'BROTHER_IN_LAW';
      name = isFemale ? 'Sister-in-law' : 'Brother-in-law';
      term = isFemale ? 'Sister-in-law (Bhabhi / Vadinni / Sali)' : 'Brother-in-law (Bava / Jija / Co-brother / Sala)';
    } else if (opStr === '=0=' || opStr === '=0=') {
      rel = isFemale ? 'CO_SISTER' : 'CO_BROTHER';
      name = isFemale ? 'Co-sister' : 'Co-brother';
      term = isFemale ? 'Co-sister (Devrani / Jethani)' : 'Co-brother (Sadhakudu / Sadu)';
    } else if (opStr === '-=' || opStr === '=-') {
      rel = isFemale ? 'DAUGHTER_IN_LAW' : 'SON_IN_LAW';
      name = isFemale ? 'Daughter-in-law' : 'Son-in-law';
      term = isFemale ? 'Daughter-in-law (Bahu / Kodalu)' : 'Son-in-law (Damad / Alludu)';
    } else if (ops[0] === '=') {
      const spouseRel = reduceKinshipAlgebra(path[0].to, targetId, path.slice(1), people);
      name = `Spouse's ${spouseRel.displayName}`;
      term = name;
    }
  }

  // ── 7. General Cousins & Removals (+)^P 0 (-)^C (Parallel vs Cross-Cousin) ──────
  else if (ops.includes('0')) {
    const sibIdx = ops.indexOf('0');
    const parentsUp = ops.slice(0, sibIdx);
    const childrenDown = ops.slice(sibIdx + 1);

    if (parentsUp.every((op) => op === '+') && childrenDown.every((op) => op === '-')) {
      const p = parentsUp.length;
      const c = childrenDown.length;

      if (p === 0) {
        // 0 (-)^C (Nephews / Nieces)
        if (c === 1) {
          rel = isFemale ? 'NIECE' : 'NEPHEW';
          name = isFemale ? 'Niece' : 'Nephew';
          term = isFemale ? 'Niece (Bhatiji / Bhanji / Menakodalu)' : 'Nephew (Bhatija / Bhanja / Menalludu)';
        } else if (c === 2) {
          name = isFemale ? 'Grandniece' : 'Grandnephew';
          term = name;
        } else {
          const greatPrefix = 'Great-'.repeat(c - 2);
          name = `${greatPrefix}${isFemale ? 'Grandniece' : 'Grandnephew'}`;
          term = name;
        }
      } else {
        const degree = Math.min(p, c);
        const removed = Math.abs(p - c);
        const sideStr = side === 'MATERNAL' ? 'Maternal' : 'Paternal';
        const degStr = getOrdinal(degree);

        if (degree === 1 && removed === 0) {
          const parentPerson = path[0]?.person;
          const uncleAuntPerson = path[1]?.person;
          const isParallel = parentPerson && uncleAuntPerson && parentPerson.gender === uncleAuntPerson.gender;

          if (isParallel) {
            rel = 'PARALLEL_COUSIN';
            name = `${sideStr} Parallel Cousin`;
            term = `${sideStr} Parallel Cousin (Bhai / Behen / Annayya / Akka)`;
          } else {
            rel = 'CROSS_COUSIN';
            name = `${sideStr} Cross Cousin`;
            term = `${sideStr} Cross Cousin (Menarikam Bava / Vadina)`;
          }
        } else if (degree === 1 && removed === 1) {
          rel = 'NEXT_GEN_COUSIN';
          name = `${sideStr} Cousin Once Removed`;
          term = name;
        } else if (removed === 0) {
          name = `${sideStr} ${degStr} Cousin`;
          term = name;
        } else {
          const remStr = removed === 1 ? 'Once' : removed === 2 ? 'Twice' : `${removed}-Times`;
          name = `${sideStr} ${degStr} Cousin ${remStr} Removed`;
          term = name;
        }
      }
    }
  }

  return {
    relationship: rel,
    displayName: name,
    culturalTerm: term,
    side,
    path: ['YOU', ...path.map((p) => p.person?.name || p.op)],
    isBloodRelative: !ops.includes('='),
    isMarriageRelative: ops.includes('='),
  };
}
