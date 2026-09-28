import type { CoolName, CoolRequest, GenerateResult, NameElement } from '../types';
import { defaultRng, pick } from './generator';
import { isBullySafe } from './bullySafe';

/** Random pairs sampled per generation; the best-scoring band is kept. */
const DRAWS = 30;

const GOOD_CADENCE = new Set(['2+2+1', '1+2+1', '2+1+1']);
const OK_CADENCE = new Set(['3+1+1', '2+3+1']);
const FLOWING = /[lrmn]/;
const FIRM = /[kdtgbpc]/;
const STOPS = new Set(['k', 'd', 't', 'g', 'b', 'p', 'c']);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const firstWord = (s: string) => s.trim().split(/\s+/)[0] ?? '';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lastChar = (s: string) => s[s.length - 1] ?? '';

/** Rough spoken syllables: vowel groups, minus a silent final "e". Good enough for surnames. */
export function countSyllables(word: string): number {
  const w = norm(word);
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g)?.length ?? 0;
  const silentE = w.length > 2 && /[^aeiouy]e$/.test(w) ? 1 : 0;
  return Math.max(1, groups - silentE);
}

/** Ending sound used for rhyme checks: a vowel class, else the last two letters. */
function rhymeKey(word: string): string {
  const w = norm(word);
  if (/(y|ie|ee|ey|i)$/.test(w)) return 'ee';
  const v = w.match(/[aou]$/);
  return v ? v[0] : w.slice(-2);
}

interface Parts { f: string; m: string; s: string; cadence: string }

function parts(first: CoolName, middle: CoolName, surname: string): Parts {
  const s = norm(firstWord(surname));
  const sSyl = s ? countSyllables(s) : 1;
  return { f: norm(first.name), m: norm(middle.name), s, cadence: `${first.syllables}+${middle.syllables}+${sSyl}` };
}

/** Higher = better flow. See spec §3 for the rules. */
export function scorePair(first: CoolName, middle: CoolName, surname: string): number {
  const { f, m, s, cadence } = parts(first, middle, surname);
  let score = 0;
  if (GOOD_CADENCE.has(cadence)) score += 3;
  else if (OK_CADENCE.has(cadence)) score += 1;
  if (first.syllables === 1 && middle.syllables === 1) score -= 3;

  score += lastChar(f) === m[0] ? -3 : 2;
  if (s) score += lastChar(m) === s[0] ? -3 : 2;

  if (f[0] === m[0]) score -= 2;
  if (s && (rhymeKey(m) === rhymeKey(s) || rhymeKey(f) === rhymeKey(s))) score -= 3;

  const all = f + m + s;
  if (FLOWING.test(all) && FIRM.test(all)) score += 1;
  return score;
}

/** Cadence, combined vibe and 1–2 phonetic sentences for a pair. */
export function analyzePair(first: CoolName, middle: CoolName, surname: string) {
  const { f, m, s, cadence } = parts(first, middle, surname);
  const surnameWord = cap(firstWord(surname).toLowerCase());

  const vibes = [...new Set([first.vibes[0], middle.vibes[0]])];
  const vibe = cap(vibes.join(', '));

  const notes: string[] = [];
  if (cadence === '1+2+1' && s) notes.push('1-2-1 cadence gives extra weight to the first name.');
  const a = lastChar(f);
  if (a !== m[0]) {
    const kind = STOPS.has(a) || STOPS.has(m[0]) ? 'Firm' : 'Clean';
    notes.push(`${kind} '${a}' → '${m[0].toUpperCase()}' break keeps the names distinct.`);
  }
  const all = f + m + s;
  if (/[lr]/.test(all) && FIRM.test(all)) notes.push('Flowing liquids (L, R) balanced by firm stops.');
  // The surname note is the most reassuring one, so it always survives the cut.
  const surnameNote =
    s && rhymeKey(m) !== rhymeKey(s) && rhymeKey(f) !== rhymeKey(s) ? `No sound overlap with ${surnameWord}.` : '';
  const picked = notes.slice(0, surnameNote ? 1 : 2);
  if (surnameNote) picked.push(surnameNote);

  return {
    cadence: s ? cadence.split('+').join(' + ') : `${first.syllables} + ${middle.syllables}`,
    vibe,
    phonetics: picked.join(' '),
  };
}

function toElement(n: CoolName): NameElement {
  return {
    id: n.id,
    text: n.name.toLowerCase(),
    initial: n.name[0].toLowerCase(),
    origin: n.origin,
    gender: 'L',
    meaning: n.meaning,
  };
}

/**
 * Pair a rare first name with a classic middle name: sample DRAWS random pairs,
 * drop bully-unsafe ones, and pick randomly within 1 point of the best score.
 */
export function generateCoolName(
  req: CoolRequest,
  firsts: CoolName[],
  middles: CoolName[],
  rng: () => number = defaultRng(),
): GenerateResult {
  const want = req.initial?.toLowerCase();
  const pool = want ? firsts.filter((n) => n.name[0].toLowerCase() === want) : firsts;
  if (pool.length === 0 || middles.length === 0) {
    return {
      error: 'empty-pool',
      slotIndex: -1,
      message: {
        id: 'Tidak ada nama keren dengan awalan itu — coba huruf lain.',
        en: 'No cool name starts with that letter — try another.',
      },
    };
  }

  const surname = req.surname.trim();
  const scored: { f: CoolName; m: CoolName; score: number }[] = [];
  for (let i = 0; i < DRAWS; i++) {
    const f = pick(pool, rng);
    const m = pick(middles, rng);
    if (f.name === m.name || !isBullySafe([f.name, m.name], surname)) continue;
    scored.push({ f, m, score: scorePair(f, m, surname) });
  }
  if (scored.length === 0) {
    return {
      error: 'empty-pool',
      slotIndex: -1,
      message: {
        id: 'Tidak ada pasangan nama yang aman — coba huruf atau nama keluarga lain.',
        en: 'No safe name pairing found — try another letter or surname.',
      },
    };
  }

  const top = Math.max(...scored.map((x) => x.score));
  const { f, m } = pick(scored.filter((x) => x.score >= top - 1), rng);
  return {
    name: `${f.name} ${m.name}`,
    surname,
    elements: [toElement(f), toElement(m)],
    origins: [...new Set([f.origin, m.origin])],
    analysis: analyzePair(f, m, surname),
  };
}
