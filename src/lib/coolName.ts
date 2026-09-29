import { ORIGIN_LABELS, type CoolName, type CoolRequest, type FusionRoot, type GenerateResult, type NameElement } from '../types';
import { defaultRng, pick } from './generator';
import { isBullySafe } from './bullySafe';
import { firstSense } from './composeMeaning';

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

/**
 * Rough spoken syllables: vowel groups (y only when not next to a vowel, so
 * Wijaya = 3), minus a silent final "e".
 * ponytail: "ia" stays one group (Kurniawan = 3, not 4) so Chinese-Indonesian
 * surnames like Liang/Tjia stay 1; add a surname exception list if that matters.
 */
export function countSyllables(word: string): number {
  const w = norm(word);
  if (!w) return 0;
  const groups = w.match(/[aeiou]+|(?<![aeiou])y(?![aeiou])/g)?.length ?? 0;
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
  if (first.fusedFrom) {
    const [h, t] = first.fusedFrom;
    notes.push(`Composed: ${originName(h)} ${h.text} + ${originName(t)} ${t.text}.`);
  }
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

/** Short English origin label for notes, e.g. "Celtic" rather than "Celtic (Irish/Scottish/Welsh)". */
const originName = (r: FusionRoot) => ORIGIN_LABELS[r.origin].en.replace(/ \(.*\)$/, '');

/**
 * Compose a first name from a head + tail root of different origins, e.g.
 * arya (Sanskrit "noble") + mir (Slavic "peace") → Aryamir. Returns null for
 * same-origin or same-meaning roots, awkward sounds (3-consonant clusters,
 * doubled letters at the seam, stutters like "rara", a vowel-to-vowel seam
 * other than "a" + "el", outside 4–8 letters) or anything bully-unsafe.
 */
export function fuseRoots(head: FusionRoot, tail: FusionRoot): CoolName | null {
  if (head.origin === tail.origin) return null;
  if (tail.allowWith && !tail.allowWith.includes(head.origin)) return null;
  const hEn = firstSense(head.meaning.en);
  const tEn = firstSense(tail.meaning.en);
  if (hEn === tEn) return null;
  const last = lastChar(head.text);
  const vowelSeam = /[aeiou]/.test(last) && /[aeiou]/.test(tail.text[0]);
  if (vowelSeam && last !== tail.text[0] && !(last === 'a' && tail.text === 'el')) return null;
  if (!vowelSeam && last === tail.text[0]) return null; // Amir + rex → "Amirrex"
  const word = head.text + (vowelSeam && last === tail.text[0] ? tail.text.slice(1) : tail.text);
  if (!/^[a-z]{4,8}$/.test(word) || /[^aeiouy]{3}|([aeiou])\1|([a-z]{2,3})\2/.test(word)) return null;
  const name = cap(word);
  if (!isBullySafe([name], '')) return null;
  return {
    id: `fz-${head.text}-${tail.text}`,
    name,
    role: 'first',
    syllables: countSyllables(word),
    origin: head.origin,
    meaning: { id: `${firstSense(head.meaning.id)}-${firstSense(tail.meaning.id)}`, en: `${hEn}-${tEn}` },
    vibes: [...new Set([head.vibe, tail.vibe])],
    fusedFrom: [head, tail],
  };
}

function rootElement(r: FusionRoot): NameElement {
  return { id: r.id, text: r.text, initial: r.text[0], origin: r.origin, gender: 'L', meaning: r.meaning };
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
  fused: CoolName[] = [],
): GenerateResult {
  const want = req.initial?.toLowerCase();
  const byInitial = (list: CoolName[]) => (want ? list.filter((n) => n.name[0].toLowerCase() === want) : list);
  const source = req.source ?? 'mix';
  // 'mix' picks a source per draw, so the smaller real list isn't drowned out by composed names.
  const pools = [source !== 'fused' ? byInitial(firsts) : [], source !== 'real' ? byInitial(fused) : []].filter(
    (p) => p.length > 0,
  );
  if (pools.length === 0 || middles.length === 0) {
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
  const usable = (f: CoolName, m: CoolName) =>
    f.name !== m.name &&
    !req.exclude?.has(`${f.name} ${m.name}`.toLowerCase()) &&
    isBullySafe([f.name, m.name], surname);
  const scored: { f: CoolName; m: CoolName; score: number }[] = [];
  for (let i = 0; i < DRAWS; i++) {
    const f = pick(pick(pools, rng), rng);
    const m = pick(middles, rng);
    if (usable(f, m)) scored.push({ f, m, score: scorePair(f, m, surname) });
  }
  // Random draws all missed (mostly shown already): scan every pair once.
  if (scored.length === 0) {
    for (const f of pools.flat()) for (const m of middles) if (usable(f, m)) scored.push({ f, m, score: scorePair(f, m, surname) });
  }
  // Everything has been shown: repeat one so the app's "all shown" notice fires.
  if (scored.length === 0 && req.exclude) {
    return generateCoolName({ ...req, exclude: undefined }, firsts, middles, rng, fused);
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
    elements: [...(f.fusedFrom ? f.fusedFrom.map(rootElement) : [toElement(f)]), toElement(m)],
    origins: [...new Set([...(f.fusedFrom ? f.fusedFrom.map((r) => r.origin) : [f.origin]), m.origin])],
    wordGroups: [f.fusedFrom ? 2 : 1, 1],
    analysis: analyzePair(f, m, surname),
  };
}
