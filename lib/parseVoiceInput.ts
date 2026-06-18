import type { ParsedVoiceItem } from '@/types';

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
};

const KNOWN_UNITS = new Set([
  'lb', 'lbs',
  'can', 'cans',
  'gallon', 'gallons',
  'bunch', 'bunches',
  'box', 'boxes',
  'bag', 'bags',
  'carton', 'cartons',
  'oz',
  'pack', 'packs',
]);

function parseSegment(raw: string): ParsedVoiceItem {
  const rawText = raw.trim();
  const tokens = rawText.split(/\s+/).filter(Boolean);
  let i = 0;

  // Extract leading quantity — word ("two") or digit ("2")
  let qty = 1;
  if (tokens[i] !== undefined) {
    const word = tokens[i].toLowerCase();
    if (WORD_NUMBERS[word] !== undefined) {
      qty = WORD_NUMBERS[word];
      i++;
    } else {
      const n = Number(tokens[i]);
      if (!Number.isNaN(n) && n > 0) {
        qty = n;
        i++;
      }
    }
  }

  // Extract unit from known list
  let unit: string | null = null;
  if (tokens[i] !== undefined && KNOWN_UNITS.has(tokens[i].toLowerCase())) {
    unit = tokens[i].toLowerCase();
    i++;
  }

  // Strip connecting "of" ("two cans of black beans" → "black beans")
  if (tokens[i]?.toLowerCase() === 'of') i++;

  const nameTokens = tokens.slice(i);

  if (nameTokens.length === 0) {
    // EC2-3: couldn't extract a name — pass rawText so user can fix it
    return { name: rawText, qty, unit, rawText, parsed: false };
  }

  const nameLower = nameTokens.join(' ').toLowerCase();
  const name = nameLower.charAt(0).toUpperCase() + nameLower.slice(1);
  return { name, qty, unit, rawText, parsed: true };
}

export function parseVoiceInput(transcript: string): ParsedVoiceItem[] {
  const segments = transcript
    .split(/\band\b|,|\balso\b/i)
    .map((s) => s.replace(/^\s*add\s+/i, '').trim()) // strip leading "add"
    .filter((s) => s.length > 0);

  const items = segments.map(parseSegment);

  // EC2-4: merge items with the same name (case-insensitive) by combining qty
  const merged: ParsedVoiceItem[] = [];
  for (const item of items) {
    const existing = merged.find(
      (m) => m.name.toLowerCase() === item.name.toLowerCase(),
    );
    if (existing) {
      existing.qty += item.qty;
    } else {
      merged.push({ ...item });
    }
  }

  return merged;
}
