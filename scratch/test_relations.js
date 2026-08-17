import { parseNaturalText } from '../src/utils/aiGraphParser.js';
import { deriveRelationship } from '../src/utils/relationshipEngine.js';
import { RELATIONSHIP_TYPES } from '../src/store/familyStore.js';

console.log('=== KINSHIP & RELATIONSHIPS COMPREHENSIVE TEST SUITE ===\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
  }
}

// ── Test 1: NLP Parser with Complex Multi-Member Expressions ─────────
console.log('\n--- 1. Testing NLP Parsing ---');
const sampleText = `
Kiran and Sujatha have three sons: Ramesh, Suresh, and Mahesh.
Ramesh is married to Lakshmi.
Ramesh and Lakshmi have a son named Arjun and a daughter named Priya.
Suresh is married to Ananya.
Suresh and Ananya have a son named Rahul.
Bheema is the son of Kiran and Sujatha.
`;

const parsed = parseNaturalText(sampleText);
console.log('Parsed People count:', parsed.people.length);
console.log('Parsed Edges count:', parsed.edges.length);

assert(parsed.people.length >= 9, 'Should extract all family members');
assert(parsed.edges.some(e => e.type === RELATIONSHIP_TYPES.SPOUSE), 'Should extract spouse relationships');
assert(parsed.edges.some(e => e.type === RELATIONSHIP_TYPES.PARENT), 'Should extract parent-child relationships');

// ── Test 2: Possessive NLP Expressions ───────────────────────────────
console.log('\n--- 2. Testing Possessive Expressions ---');
const possessiveSample = `
Kiran is Arjun's grandfather.
Sujatha is Arjun's grandmother.
Priya is Arjun's sister.
Ramesh is Arjun's father.
Lakshmi is Arjun's mother.
`;
const parsedPossessive = parseNaturalText(possessiveSample);
assert(parsedPossessive.edges.some(e => e.type === RELATIONSHIP_TYPES.GRANDPARENT), 'Should parse possessive grandfather');
assert(parsedPossessive.edges.some(e => e.type === RELATIONSHIP_TYPES.SIBLING), 'Should parse possessive sister');
assert(parsedPossessive.edges.some(e => e.type === RELATIONSHIP_TYPES.PARENT), 'Should parse possessive father');

// ── Test 3: Relationship Algebra Engine Traversal ────────────────────
console.log('\n--- 3. Testing Relationship Derivation Engine ---');

const people = {
  kiran:   { id: 'kiran',   name: 'Kiran',   gender: 'male' },
  sujatha: { id: 'sujatha', name: 'Sujatha', gender: 'female' },
  ramesh:  { id: 'ramesh',  name: 'Ramesh',  gender: 'male' },
  lakshmi: { id: 'lakshmi', name: 'Lakshmi', gender: 'female' },
  suresh:  { id: 'suresh',  name: 'Suresh',  gender: 'male' },
  ananya:  { id: 'ananya',  name: 'Ananya',  gender: 'female' },
  arjun:   { id: 'arjun',   name: 'Arjun',   gender: 'male' },
  priya:   { id: 'priya',   name: 'Priya',   gender: 'female' },
  rahul:   { id: 'rahul',   name: 'Rahul',   gender: 'male' },
};

const edges = [
  // Kiran + Sujatha
  { id: 'e1', from: 'kiran', to: 'sujatha', type: RELATIONSHIP_TYPES.SPOUSE },
  { id: 'e2', from: 'kiran', to: 'ramesh',  type: RELATIONSHIP_TYPES.PARENT },
  { id: 'e3', from: 'sujatha', to: 'ramesh',type: RELATIONSHIP_TYPES.PARENT },
  { id: 'e4', from: 'kiran', to: 'suresh',  type: RELATIONSHIP_TYPES.PARENT },
  { id: 'e5', from: 'sujatha', to: 'suresh',type: RELATIONSHIP_TYPES.PARENT },

  // Ramesh + Lakshmi -> Arjun, Priya
  { id: 'e6', from: 'ramesh', to: 'lakshmi', type: RELATIONSHIP_TYPES.SPOUSE },
  { id: 'e7', from: 'ramesh', to: 'arjun',   type: RELATIONSHIP_TYPES.PARENT },
  { id: 'e8', from: 'lakshmi', to: 'arjun',  type: RELATIONSHIP_TYPES.PARENT },
  { id: 'e9', from: 'ramesh', to: 'priya',   type: RELATIONSHIP_TYPES.PARENT },
  { id: 'e10', from: 'lakshmi', to: 'priya', type: RELATIONSHIP_TYPES.PARENT },

  // Suresh + Ananya -> Rahul
  { id: 'e11', from: 'suresh', to: 'ananya', type: RELATIONSHIP_TYPES.SPOUSE },
  { id: 'e12', from: 'suresh', to: 'rahul',  type: RELATIONSHIP_TYPES.PARENT },
  { id: 'e13', from: 'ananya', to: 'rahul',  type: RELATIONSHIP_TYPES.PARENT },
];

// ME = Arjun
const meId = 'arjun';

const rFather = deriveRelationship(meId, 'ramesh', people, edges);
assert(rFather.displayName === 'Father', `Arjun -> Ramesh should be Father (got: ${rFather.displayName})`);

const rMother = deriveRelationship(meId, 'lakshmi', people, edges);
assert(rMother.displayName === 'Mother', `Arjun -> Lakshmi should be Mother (got: ${rMother.displayName})`);

const rSister = deriveRelationship(meId, 'priya', people, edges);
assert(rSister.displayName === 'Sister', `Arjun -> Priya should be Sister (got: ${rSister.displayName})`);

const rGrandpa = deriveRelationship(meId, 'kiran', people, edges);
assert(rGrandpa.displayName === 'Paternal Grandfather', `Arjun -> Kiran should be Paternal Grandfather (got: ${rGrandpa.displayName})`);

const rGrandma = deriveRelationship(meId, 'sujatha', people, edges);
assert(rGrandma.displayName === 'Paternal Grandmother', `Arjun -> Sujatha should be Paternal Grandmother (got: ${rGrandma.displayName})`);

const rUncle = deriveRelationship(meId, 'suresh', people, edges);
assert(rUncle.displayName === 'Paternal Uncle', `Arjun -> Suresh should be Paternal Uncle (got: ${rUncle.displayName})`);

const rAunt = deriveRelationship(meId, 'ananya', people, edges);
assert(rAunt.displayName.includes('Uncle\'s Wife') || rAunt.displayName.includes('Aunt'), `Arjun -> Ananya should be Paternal Uncle's Wife / Aunt (got: ${rAunt.displayName})`);

const rCousin = deriveRelationship(meId, 'rahul', people, edges);
assert(rCousin.displayName.includes('Cousin'), `Arjun -> Rahul should be Cousin (got: ${rCousin.displayName})`);

// ME = Ramesh
const rSelf = deriveRelationship('ramesh', 'ramesh', people, edges);
assert(rSelf.relationship === 'SELF', `Ramesh -> Ramesh should be Self (got: ${rSelf.relationship})`);

const rWife = deriveRelationship('ramesh', 'lakshmi', people, edges);
assert(rWife.displayName === 'Wife', `Ramesh -> Lakshmi should be Wife (got: ${rWife.displayName})`);

const rSon = deriveRelationship('ramesh', 'arjun', people, edges);
assert(rSon.displayName === 'Son', `Ramesh -> Arjun should be Son (got: ${rSon.displayName})`);

const rDaughter = deriveRelationship('ramesh', 'priya', people, edges);
assert(rDaughter.displayName === 'Daughter', `Ramesh -> Priya should be Daughter (got: ${rDaughter.displayName})`);

const rBrother = deriveRelationship('ramesh', 'suresh', people, edges);
assert(rBrother.displayName === 'Brother', `Ramesh -> Suresh should be Brother (got: ${rBrother.displayName})`);

const rNephew = deriveRelationship('ramesh', 'rahul', people, edges);
assert(rNephew.displayName === 'Nephew', `Ramesh -> Rahul should be Nephew (got: ${rNephew.displayName})`);

console.log(`\n========================================`);
console.log(`FINAL RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
