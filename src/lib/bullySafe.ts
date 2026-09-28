import blocklist from '../data/bullyBlocklist.json';

const WORDS = new Set(blocklist.words);
const INITIALS = new Set(blocklist.initials);
const PHRASES = new Set(blocklist.phrasesWithSurname);

/** Lowercase letters only. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

/** Leading consonants + first vowel group, e.g. "taiga" → "tai", "lucan" → "lu". */
function firstSyllable(w: string): string {
  return w.match(/^[^aeiouy]*[aeiouy]+/)?.[0] ?? w;
}

/** Exact forms a word could be teased with: the word, its first syllable, its 3/4-letter prefixes. */
function teaseForms(w: string): string[] {
  return [w, firstSyllable(w), w.slice(0, 3), w.slice(0, 4)];
}

/**
 * True when a given-name combination is unlikely to invite teasing at an
 * Indonesian/international school. Exact matching only — never "contains" —
 * so innocent look-alikes (Cassian, Bastian) pass.
 */
export function isBullySafe(words: string[], surname: string): boolean {
  const given = words.map(norm).filter(Boolean);
  const sur = norm(surname.trim().split(/\s+/)[0] ?? '');

  if (given.some((w) => teaseForms(w).some((f) => WORDS.has(f)))) return false;

  const initials = given.map((w) => w[0]).join('');
  if (given.length >= 2 && INITIALS.has(initials)) return false;
  if (sur && INITIALS.has(initials + sur[0])) return false;

  const last = given[given.length - 1];
  if (sur && last && PHRASES.has(`${last} ${sur}`)) return false;

  return true;
}
