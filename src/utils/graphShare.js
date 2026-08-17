/**
 * Kinsutra Family Graph Sharing & Token Encoding Utility
 * Allows encoding a family graph into a shareable Access Token Code,
 * and importing/merging shared graph payloads with 100% UTF-8 character safety.
 */

function utf8_to_b64(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
    String.fromCharCode('0x' + p1)
  ));
}

function b64_to_utf8(str) {
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c) =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
}

export function generateGraphToken(people, edges, familyName = 'Shared Family') {
  const payload = {
    v: 1,
    familyName,
    exportedAt: Date.now(),
    people: Object.values(people).map((p) => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      birthDate: p.birthDate || '',
      birthPlace: p.birthPlace || '',
      photo: p.photo || null,
    })),
    edges: edges.map((e) => ({
      from: e.from,
      to: e.to,
      type: e.type,
      label: e.label,
    })),
  };

  try {
    const jsonStr = JSON.stringify(payload);
    const b64 = utf8_to_b64(jsonStr);
    return `KIN-NET-${b64}`;
  } catch (err) {
    console.error('Failed to encode graph token:', err);
    return null;
  }
}

export function parseGraphToken(tokenStr) {
  if (!tokenStr) return null;
  let rawStr = tokenStr.trim();
  if (rawStr.startsWith('KIN-NET-')) {
    rawStr = rawStr.slice(8);
  }

  try {
    const jsonStr = b64_to_utf8(rawStr);
    const data = JSON.parse(jsonStr);
    if (data && data.people && data.edges) {
      return data;
    }
  } catch (err) {
    console.error('Invalid family graph token:', err);
  }
  return null;
}
