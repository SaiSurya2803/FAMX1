/**
 * LLM Engine Utility for Kinsutra AI Agent
 * Integrates Gemini API / OpenAI API REST calls with a high-performance
 * heuristic AI spell-corrector fallback to normalize shorthand, fix typos,
 * and extract canonical JSON graph structures.
 */

import { parseNaturalText, sanitizePersonName } from './aiGraphParser.js';

// Common shorthand dictionary
const SHORTHAND_DICT = {
  ftr: 'father',
  fth: 'father',
  mthr: 'mother',
  mth: 'mother',
  prnt: 'parent',
  wf: 'wife',
  hsbd: 'husband',
  hsb: 'husband',
  brtr: 'brother',
  bro: 'brother',
  str: 'sister',
  sis: 'sister',
  's/o': 'son of',
  'd/o': 'daughter of',
  'w/o': 'wife of',
  'h/o': 'husband of',
  n: 'and',
  '&': 'and',
};

// Built-in AI Heuristic Spell Corrector
export function autoCorrectTextHeuristic(rawText) {
  if (!rawText) return '';

  let cleaned = rawText;

  // Replace common shorthand terms
  Object.keys(SHORTHAND_DICT).forEach((short) => {
    const regex = new RegExp(`\\b${short.replace('/', '\\/')}\\b`, 'gi');
    cleaned = cleaned.replace(regex, SHORTHAND_DICT[short]);
  });

  // Capitalize names after relationship keywords
  cleaned = cleaned.replace(/\b(father|mother|parent|son|daughter|husband|wife|brother|sister)\s+of\s+([a-z])/gi, (m, rel, char) => `${rel} of ${char.toUpperCase()}`);

  return cleaned;
}

const normalizeEdgeType = (rawType) => {
  if (!rawType) return 'parent';
  const lower = String(rawType).trim().toLowerCase();
  if (lower.includes('parent') || lower.includes('father') || lower.includes('mother')) return 'parent';
  if (lower.includes('child') || lower.includes('son') || lower.includes('daughter')) return 'child';
  if (lower.includes('spouse') || lower.includes('husband') || lower.includes('wife') || lower.includes('married')) return 'spouse';
  if (lower.includes('sibling') || lower.includes('brother') || lower.includes('sister')) return 'sibling';
  if (lower.includes('grandparent') || lower.includes('grandfather') || lower.includes('grandmother')) return 'grandparent';
  if (lower.includes('grandchild') || lower.includes('grandson') || lower.includes('granddaughter')) return 'grandchild';
  if (lower.includes('uncle') || lower.includes('aunt')) return 'uncle_aunt';
  if (lower.includes('cousin')) return 'cousin';
  if (lower.includes('in_law') || lower.includes('in law')) return 'in_law';
  return lower;
};

const sanitizeLlmResult = (res) => {
  if (!res) return { correctedText: '', people: [], edges: [] };
  const people = (res.people || [])
    .map((p) => ({
      name: sanitizePersonName(p.name),
      gender: p.gender || 'unknown',
    }))
    .filter((p) => p.name && p.name.length >= 2);

  const edges = (res.edges || [])
    .map((e) => {
      const fromName = sanitizePersonName(e.fromName || e.from);
      const toName = sanitizePersonName(e.toName || e.to);
      let type = normalizeEdgeType(e.type);
      return { fromName, toName, type };
    })
    .filter((e) => e.fromName && e.toName && e.fromName.toLowerCase() !== e.toName.toLowerCase());

  return {
    correctedText: res.correctedText || '',
    people,
    edges,
  };
};

// Master LLM Processor with Automatic Fallback
export async function processTextWithAi(rawText, apiKey = '', provider = 'gemini') {
  if (!rawText || !rawText.trim()) {
    return { correctedText: '', people: [], edges: [] };
  }

  // 1. Try Live LLM API if key is provided
  if (apiKey.trim()) {
    try {
      let rawRes;
      if (provider === 'openai' || apiKey.startsWith('sk-')) {
        rawRes = await callOpenAiApi(rawText, apiKey.trim());
      } else {
        rawRes = await callGeminiApi(rawText, apiKey.trim());
      }
      return sanitizeLlmResult(rawRes);
    } catch (err) {
      console.warn('LLM API call failed, falling back to built-in AI Corrector:', err);
    }
  }

  // 2. Built-in Zero-Setup AI Corrector Fallback
  const corrected = autoCorrectTextHeuristic(rawText);
  const parsed = parseNaturalText(corrected);

  return sanitizeLlmResult({
    correctedText: corrected,
    people: parsed.people,
    edges: parsed.edges,
  });
}

function extractJsonFromLlmText(text) {
  if (!text) return null;
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const rawJson = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(rawJson);
    } catch {
      // Fallback to regex cleaning
    }
  }
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

// Call Google Gemini REST API
async function callGeminiApi(rawText, apiKey) {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  const promptText = `
You are Kinsutra AI, an expert kinship anthropology data parser.
The user provided the following raw, potentially misspelled or shorthand family relationship text:
"${rawText}"

Your task:
1. Auto-correct all typos, shorthand terms, and names.
2. Produce a clear, corrected English version of the text.
3. Extract all unique people with their genders.
4. Extract all canonical graph relationships:
   - "PARENT": from parent to child
   - "SPOUSE": between married partners
   - "SIBLING": between brothers/sisters

Return strictly valid JSON with no markdown syntax wrapping, following this schema:
{
  "correctedText": "string",
  "people": [
    { "name": "string", "gender": "male" | "female" | "unknown" }
  ],
  "edges": [
    { "fromName": "string", "toName": "string", "type": "PARENT" | "SPOUSE" | "SIBLING" }
  ]
}
`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP Error ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return extractJsonFromLlmText(rawContent);
}

// Call OpenAI / Groq / Perplexity REST API
async function callOpenAiApi(rawText, apiKey) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const systemPrompt = `
You are Kinsutra AI. Convert raw, messy family text into corrected JSON schema containing people and canonical edges (PARENT, SPOUSE, SIBLING).
Return JSON object: { "correctedText": "...", "people": [{ "name": "...", "gender": "..." }], "edges": [{ "fromName": "...", "toName": "...", "type": "PARENT" }] }
`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API HTTP Error ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';
  return extractJsonFromLlmText(rawContent);
}
