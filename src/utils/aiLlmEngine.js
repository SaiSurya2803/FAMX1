/**
 * LLM Engine Utility for Kinsutra AI Agent
 * Integrates Gemini API / OpenAI API REST calls with a high-performance
 * heuristic AI spell-corrector fallback to normalize shorthand, fix typos,
 * and extract canonical JSON graph structures.
 */

import { parseNaturalText, sanitizePersonName } from './aiGraphParser';

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

const sanitizeLlmResult = (res) => {
  if (!res) return { correctedText: '', people: [], edges: [] };
  const people = (res.people || [])
    .map((p) => ({
      name: sanitizePersonName(p.name),
      gender: p.gender || 'unknown',
    }))
    .filter((p) => p.name && p.name.length >= 2);

  const edges = (res.edges || [])
    .map((e) => ({
      fromName: sanitizePersonName(e.fromName || e.from),
      toName: sanitizePersonName(e.toName || e.to),
      type: e.type,
    }))
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

// Call Google Gemini REST API
async function callGeminiApi(rawText, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP Error ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();

  return JSON.parse(jsonStr);
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
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API HTTP Error ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';
  const jsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();

  return JSON.parse(jsonStr);
}
