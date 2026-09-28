# Cool Boy Names ("Keren" mode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a default "Keren" mode that pairs a rare, good-meaning boy first name with a classic middle name, scores the pair phonetically, rejects bully-prone combinations, and shows cadence · vibe · phonetic note on the frame.

**Architecture:** The feature has three layers:
- **Data:** `coolBoyNames.json` (curated) and `bullyBlocklist.json`.
- **Pure functions:** `bullySafe.ts` does the filtering; `coolName.ts` does the scoring, pairing and analysis.
- **UI wiring:** a new `NameStyle` value, the form, routing in `App`, and the analysis block in `NameFrame`.

The engine returns a normal `GeneratedName` with a new optional `analysis` field, so history, swipe and export work unchanged.

**Tech Stack:** React 18 + TypeScript + Vite, Vitest + Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-28-cool-boy-names-design.md`

## Global Constraints

- Only real, attested names — no invented/composed names in this mode.
- Every curated entry: positive bilingual meaning (`id` Indonesian, `en` English), 1–2 vibes from `noble | bright | bold | grounded | joyful | wise | modern | cosmopolitan`.
- Format is always `First Middle` (+ surname if given); no word-count control in this mode.
- Defaults: `nameStyle: 'cool'`, `gender: 'L'`. Girl/neutral stay selectable in other modes.
- Blocklist matches are **exact** (whole word, 3/4-letter prefix, first syllable, initials, full phrase) — never substring "contains".
- No new npm dependencies; no network calls.
- Commit + push to `main` after each verified task (remote `github-nicholaslie90`). Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Surname typed after a name is shown:** the analysis ("No sound overlap with Lie", cadence) and the initials check must reflect the *current* surname. In Keren mode, surname edits therefore regenerate (Task 4 adds `surname` to `filterSig` for cool mode, with a test).
2. **Surname with odd input** (`"  lie "`, `"Van Der Berg"`, `"O'Neil"`, digits): the checks normalize the surname and use its first word; nothing throws (Task 1 + Task 2 tests).
3. **Initial filter with no matching first names** (e.g. `x`): returns a bilingual empty-pool error, not a crash or infinite loop (Task 2 test).
4. **Pool exhausted by no-repeat:** App's existing MAX_TRIES notice still fires; the top-1 band keeps enough variety that 20 consecutive Next presses yield 20 distinct names (Task 4 test).
5. **Innocent look-alikes** (Cassian, Tristan, Bastian, Sebastian) must never be blocked by prefix/substring logic (Task 1 test).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/types.ts` (modify) | `CoolName`, `Vibe`, `CoolRequest`, `GeneratedName.analysis`, `'cool'` in `NameStyle` |
| `src/data/bullyBlocklist.json` (create) | Editable blocklist: words, initials, phrases |
| `src/lib/bullySafe.ts` (create) | `isBullySafe(words, surname)` |
| `src/lib/coolName.ts` (create) | `countSyllables`, `scorePair`, `analyzePair`, `generateCoolName` |
| `src/lib/generator.ts` (modify) | export existing `pick` |
| `src/data/coolBoyNames.json` (create) | ~250 curated names |
| `src/data/index.ts` (modify) | export `COOL_FIRST`, `COOL_MIDDLE` |
| `src/components/ParameterForm.tsx` (modify) | Keren option, hide irrelevant controls |
| `src/App.tsx` (modify) | defaults, routing, surname-sensitive regen |
| `src/components/NameFrame.tsx` + `.module.css` (modify) | render `analysis` |
| `tests/bullySafe.test.ts`, `tests/coolName.test.ts`, `tests/coolData.test.ts`, `tests/app.cool.test.tsx` (create) | tests |
| `tests/app.words.test.tsx` (modify) | select Umum before word-count tests |
| `README.md` (modify) | document Keren mode |

---

### Task 1: Types + bully-safety filter

**Files:**
- Modify: `src/types.ts`
- Create: `src/data/bullyBlocklist.json`, `src/lib/bullySafe.ts`
- Test: `tests/bullySafe.test.ts`

**Interfaces:**
- Produces: `isBullySafe(words: string[], surname: string): boolean`; types `Vibe`, `CoolName`, `CoolRequest`, `GeneratedName.analysis`, `NameStyle` includes `'cool'`.

- [ ] **Step 1: Add types to `src/types.ts`**

Change the `NameStyle` line to:

```ts
export type NameStyle = 'cool' | 'familiar' | 'composed' | 'meaning' | 'analyze' | 'browse';
```

After the `CommonName` interface, add:

```ts
/** Vibe tags for curated "Keren" names. */
export type Vibe = 'noble' | 'bright' | 'bold' | 'grounded' | 'joyful' | 'wise' | 'modern' | 'cosmopolitan';

/** A curated boy name for the "Keren" style: a rare first name or a classic middle name. */
export interface CoolName {
  id: string;
  name: string;
  role: 'first' | 'middle';
  /** Spoken syllable count (Lucan=2, Zael=1, Evander=3). */
  syllables: number;
  origin: Origin;
  meaning: { id: string; en: string };
  /** 1–2 tags; the first is the primary vibe. */
  vibes: Vibe[];
}

export interface CoolRequest {
  surname: string;
  /** Optional desired first letter of the first name (lowercase). Empty = auto. */
  initial?: string;
}
```

In `GeneratedName`, after `wordGroups?`, add:

```ts
  /** Keren-mode phonetic analysis, shown on the frame. */
  analysis?: { cadence: string; vibe: string; phonetics: string };
```

Also add `cool: ...` to any `Record<NameStyle, …>` (only `STYLE_HINTS` in `ParameterForm.tsx`) so `tsc` passes. Use this temporary entry, which Task 4 finalizes: `cool: 'Nama keren · nama langka + klasik · rare + classic',`.

- [ ] **Step 2: Create `src/data/bullyBlocklist.json`**

```json
{
  "words": [
    "tai", "tahi", "asu", "babi", "bego", "dodol", "kentut", "upil", "tolol", "goblok",
    "bodoh", "bodo", "oon", "anjing", "anjay", "kampret", "bangsat", "pantat", "bokong",
    "tete", "titit", "pepek", "memek", "kontol", "jancuk", "cuk", "setan", "iblis",
    "monyet", "kunyuk", "kodok", "kebo", "gendut", "cebol", "botak", "banci", "bencong",
    "pukimak", "sial", "bau", "busuk", "ompong", "culun", "lebay", "alay",
    "dick", "willy", "randy", "gaylord", "seymour", "fanny", "butt", "poo", "pee", "fart",
    "fat", "pig", "ass", "dumb", "dork", "nerd", "loser", "turd", "crap", "puke", "gay",
    "upin", "ipin", "shrek", "barney", "elmo", "dora", "sponge", "patrick"
  ],
  "initials": [
    "bab", "bak", "asu", "tai", "pki", "kkn", "gay", "fat", "pig", "ass", "wtf", "bs",
    "bh", "kb", "omg", "lol", "std", "fbi", "kfc", "dog", "cow", "rat", "poo", "pee", "sos"
  ],
  "phrasesWithSurname": [
    "never lie", "tell lie", "white lie", "big lie", "no lie", "tell lies", "black lie",
    "tan tan", "king kong"
  ]
}
```

- [ ] **Step 3: Write the failing test `tests/bullySafe.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isBullySafe } from '../src/lib/bullySafe';

describe('isBullySafe', () => {
  it('accepts ordinary names', () => {
    expect(isBullySafe(['Lucan', 'Darren'], 'Lie')).toBe(true);
    expect(isBullySafe(['Zael', 'Marcus'], 'Lie')).toBe(true);
  });

  it('never blocks innocent look-alikes (no substring matching)', () => {
    for (const n of ['Cassian', 'Tristan', 'Bastian', 'Sebastian', 'Glasson']) {
      expect(isBullySafe([n], ''), n).toBe(true);
    }
  });

  it('rejects a blocklisted whole word', () => {
    expect(isBullySafe(['Randy', 'Arthur'], '')).toBe(false);
  });

  it('rejects a blocklisted nickname (3/4-letter prefix)', () => {
    expect(isBullySafe(['Taiga', 'Arthur'], '')).toBe(false); // "tai"
    expect(isBullySafe(['Dickson', 'Arthur'], '')).toBe(false); // "dick"
  });

  it('rejects bad 3-letter initials with the surname', () => {
    expect(isBullySafe(['Bastian', 'Arthur'], 'Budi')).toBe(false); // B·A·B
    expect(isBullySafe(['Aidan', 'Sven'], 'Utomo')).toBe(false); // A·S·U
  });

  it('rejects bad 2-letter initials without a surname', () => {
    expect(isBullySafe(['Benedict', 'Simon'], '')).toBe(false); // B·S
  });

  it('rejects middle + surname phrases', () => {
    expect(isBullySafe(['Lucan', 'Never'], 'Lie')).toBe(false);
  });

  it('normalizes messy surnames and uses the first surname word', () => {
    expect(isBullySafe(['Lucan', 'Never'], '  LIE  ')).toBe(false);
    expect(isBullySafe(['Lucan', 'Darren'], "O'Neil 123")).toBe(true);
    expect(isBullySafe(['Bastian', 'Arthur'], 'Budi Santoso')).toBe(false);
    expect(isBullySafe(['Lucan', 'Darren'], '')).toBe(true);
  });
});
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `npx vitest run tests/bullySafe.test.ts`
Expected: FAIL — cannot resolve `../src/lib/bullySafe`.

- [ ] **Step 5: Implement `src/lib/bullySafe.ts`**

```ts
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
```

- [ ] **Step 6: Run the tests + type-check**

Run: `npx vitest run tests/bullySafe.test.ts && npx tsc -b`
Expected: all PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/components/ParameterForm.tsx src/data/bullyBlocklist.json src/lib/bullySafe.ts tests/bullySafe.test.ts
git commit -m "feat: bully-safety filter and Keren types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 2: Pairing engine

**Files:**
- Create: `src/lib/coolName.ts`
- Modify: `src/lib/generator.ts` (export `pick`)
- Test: `tests/coolName.test.ts`

**Interfaces:**
- Consumes: `isBullySafe` (Task 1), `CoolName`, `CoolRequest`, `GenerateResult` (Task 1), `makeRng`, `defaultRng`, `pick` from `generator.ts`.
- Produces:
  - `countSyllables(word: string): number`
  - `scorePair(first: CoolName, middle: CoolName, surname: string): number`
  - `analyzePair(first: CoolName, middle: CoolName, surname: string): { cadence: string; vibe: string; phonetics: string }`
  - `generateCoolName(req: CoolRequest, firsts: CoolName[], middles: CoolName[], rng?: () => number): GenerateResult`

- [ ] **Step 1: Export `pick` in `src/lib/generator.ts`**

Change `function pick<T>(` to `export function pick<T>(`.

- [ ] **Step 2: Write the failing test `tests/coolName.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { countSyllables, scorePair, analyzePair, generateCoolName } from '../src/lib/coolName';
import { makeRng } from '../src/lib/generator';
import { isGenerateError, type CoolName } from '../src/types';

const cn = (name: string, syllables: number, role: CoolName['role'], vibes: CoolName['vibes'] = ['noble']): CoolName => ({
  id: `cb-${name.toLowerCase()}`, name, role, syllables, origin: 'latin', vibes,
  meaning: { id: `arti ${name}`, en: `meaning ${name}` },
});

const Lucan = cn('Lucan', 2, 'first', ['modern', 'bright']);
const Zael = cn('Zael', 1, 'first', ['bold']);
const Kai = cn('Kai', 1, 'first');
const Darren = cn('Darren', 2, 'middle', ['bright']);
const Marcus = cn('Marcus', 2, 'middle', ['bold']);
const Jude = cn('Jude', 1, 'middle');
const Nathan = cn('Nathan', 2, 'middle');
const Leo = cn('Leo', 2, 'middle');
const Riley = cn('Riley', 2, 'middle');

describe('countSyllables', () => {
  it('counts vowel groups with a silent final e', () => {
    expect(countSyllables('Lie')).toBe(1);
    expect(countSyllables('Lucan')).toBe(2);
    expect(countSyllables('Santoso')).toBe(3);
    expect(countSyllables('Jude')).toBe(1);
    expect(countSyllables('')).toBe(0);
  });
});

describe('scorePair', () => {
  it('prefers a 2+2+1 cadence over 1+1+1', () => {
    expect(scorePair(Lucan, Darren, 'Lie')).toBeGreaterThan(scorePair(Kai, Jude, 'Lie'));
  });
  it('penalises the same letter meeting at the seam', () => {
    expect(scorePair(Lucan, Nathan, 'Lie')).toBeLessThan(scorePair(Lucan, Darren, 'Lie'));
  });
  it('penalises alliteration', () => {
    expect(scorePair(Lucan, Leo, 'Tan')).toBeLessThan(scorePair(Lucan, Marcus, 'Tan'));
  });
  it('penalises a rhyme with the surname', () => {
    expect(scorePair(Lucan, Riley, 'Lie')).toBeLessThan(scorePair(Lucan, Darren, 'Lie'));
  });
});

describe('analyzePair', () => {
  it('reports cadence, vibe and a phonetic note', () => {
    const a = analyzePair(Lucan, Darren, 'Lie');
    expect(a.cadence).toBe('2 + 2 + 1');
    expect(a.vibe).toBe('Modern, bright');
    expect(a.phonetics).toMatch(/'n' → 'D'/);
    expect(a.phonetics).toMatch(/Lie/);
  });
  it('flags the 1-2-1 cadence', () => {
    expect(analyzePair(Zael, Marcus, 'Lie').phonetics).toMatch(/1-2-1/);
  });
  it('omits the surname part of the cadence when there is none', () => {
    expect(analyzePair(Lucan, Darren, '').cadence).toBe('2 + 2');
  });
});

describe('generateCoolName', () => {
  const firsts = [Lucan, Zael, Kai];
  const middles = [Darren, Marcus, Jude, Nathan];

  it('returns a first + middle name with analysis and elements', () => {
    const r = generateCoolName({ surname: 'Lie' }, firsts, middles, makeRng(1));
    if (isGenerateError(r)) throw new Error('unexpected error');
    const [f, m] = r.name.split(' ');
    expect(firsts.map((n) => n.name)).toContain(f);
    expect(middles.map((n) => n.name)).toContain(m);
    expect(r.surname).toBe('Lie');
    expect(r.elements).toHaveLength(2);
    expect(r.elements[0].gender).toBe('L');
    expect(r.analysis?.cadence).toMatch(/\+ 1$/);
  });

  it('honours the initial filter', () => {
    for (let s = 0; s < 10; s++) {
      const r = generateCoolName({ surname: '', initial: 'z' }, firsts, middles, makeRng(s));
      if (isGenerateError(r)) throw new Error('unexpected error');
      expect(r.name.startsWith('Zael ')).toBe(true);
    }
  });

  it('returns a bilingual empty-pool error when no first name matches', () => {
    const r = generateCoolName({ surname: '', initial: 'x' }, firsts, middles, makeRng(1));
    expect(isGenerateError(r) && r.message?.en).toBeTruthy();
  });

  it('returns an error when every pair is bully-unsafe', () => {
    const r = generateCoolName({ surname: 'Lie' }, [Lucan], [cn('Never', 2, 'middle')], makeRng(1));
    expect(isGenerateError(r)).toBe(true);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx vitest run tests/coolName.test.ts`
Expected: FAIL — cannot resolve `../src/lib/coolName`.

- [ ] **Step 4: Implement `src/lib/coolName.ts`**

```ts
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

  score += f[f.length - 1] === m[0] ? -3 : 2;
  if (s) score += m[m.length - 1] === s[0] ? -3 : 2;

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
  const a = f[f.length - 1] ?? '';
  if (a !== m[0]) {
    const kind = STOPS.has(a) || STOPS.has(m[0]) ? 'Firm' : 'Clean';
    notes.push(`${kind} '${a}' → '${m[0].toUpperCase()}' break keeps the names distinct.`);
  }
  const all = f + m + s;
  if (/[lr]/.test(all) && FIRM.test(all)) notes.push('Flowing liquids (L, R) balanced by firm stops.');
  if (s && rhymeKey(m) !== rhymeKey(s) && rhymeKey(f) !== rhymeKey(s)) {
    notes.push(`No sound overlap with ${surnameWord}.`);
  }
  // Keep the surname note when present — it is the most reassuring one.
  const surnameNote = notes.find((n) => n.startsWith('No sound overlap'));
  const picked = notes.filter((n) => n !== surnameNote).slice(0, surnameNote ? 1 : 2);
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
```

- [ ] **Step 5: Run the tests + type-check**

Run: `npx vitest run tests/coolName.test.ts && npx tsc -b`
Expected: all PASS. If a scoring test fails, fix the scoring rule to match the spec (§3) — do not loosen the test.

- [ ] **Step 6: Commit**

```bash
git add src/lib/coolName.ts src/lib/generator.ts tests/coolName.test.ts
git commit -m "feat: Keren pairing engine with cadence/vibe/phonetic analysis

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 3: Curated name data

**Files:**
- Create: `src/data/coolBoyNames.json`
- Modify: `src/data/index.ts`
- Test: `tests/coolData.test.ts`

**Interfaces:**
- Consumes: `CoolName`, `isBullySafe`, `countSyllables`.
- Produces: `COOL_FIRST: CoolName[]`, `COOL_MIDDLE: CoolName[]` from `src/data/index.ts`.

- [ ] **Step 1: Write the failing test `tests/coolData.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { COOL_FIRST, COOL_MIDDLE } from '../src/data';
import { isBullySafe } from '../src/lib/bullySafe';
import { countSyllables } from '../src/lib/coolName';
import { ORIGINS } from '../src/types';

const ALL = [...COOL_FIRST, ...COOL_MIDDLE];
const VIBES = ['noble', 'bright', 'bold', 'grounded', 'joyful', 'wise', 'modern', 'cosmopolitan'];

describe('curated cool boy names', () => {
  it('has enough first and middle names', () => {
    expect(COOL_FIRST.length).toBeGreaterThanOrEqual(150);
    expect(COOL_MIDDLE.length).toBeGreaterThanOrEqual(60);
  });

  it('has unique ids and unique names per role', () => {
    expect(new Set(ALL.map((n) => n.id)).size).toBe(ALL.length);
    for (const list of [COOL_FIRST, COOL_MIDDLE]) {
      expect(new Set(list.map((n) => n.name.toLowerCase())).size).toBe(list.length);
    }
  });

  it('every entry is well-formed', () => {
    for (const n of ALL) {
      expect(n.name, n.id).toMatch(/^[A-Z][a-z]+$/);
      expect(n.meaning.id.trim(), n.id).not.toBe('');
      expect(n.meaning.en.trim(), n.id).not.toBe('');
      expect(n.vibes.length, n.id).toBeGreaterThanOrEqual(1);
      expect(n.vibes.length, n.id).toBeLessThanOrEqual(2);
      for (const v of n.vibes) expect(VIBES, n.id).toContain(v);
      expect(ORIGINS, n.id).toContain(n.origin);
      expect(Math.abs(n.syllables - countSyllables(n.name)), n.id).toBeLessThanOrEqual(1);
    }
  });

  it('every entry passes the bully-safety check on its own', () => {
    for (const n of ALL) expect(isBullySafe([n.name], ''), n.name).toBe(true);
  });

  it('includes the reference examples', () => {
    const firsts = COOL_FIRST.map((n) => n.name);
    const middles = COOL_MIDDLE.map((n) => n.name);
    for (const f of ['Lucan', 'Zael', 'Caspian', 'Evander', 'Orion']) expect(firsts).toContain(f);
    for (const m of ['Darren', 'Marcus', 'Arthur', 'Asher']) expect(middles).toContain(m);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/coolData.test.ts`
Expected: FAIL — `COOL_FIRST` is not exported.

- [ ] **Step 3: Author `src/data/coolBoyNames.json`**

A JSON array of `CoolName` objects: **≥170 `first`, ≥80 `middle`**. Format, one entry per line like the other data files:

```json
[
  { "id": "cb-lucan", "name": "Lucan", "role": "first", "syllables": 2, "origin": "latin", "meaning": { "id": "cahaya", "en": "light" }, "vibes": ["modern", "bright"] },
  { "id": "cb-zael", "name": "Zael", "role": "first", "syllables": 1, "origin": "ibrani", "meaning": { "id": "karunia Tuhan", "en": "gift of God" }, "vibes": ["bold", "modern"] },
  { "id": "cb-evander", "name": "Evander", "role": "first", "syllables": 3, "origin": "yunani", "meaning": { "id": "orang yang baik", "en": "good man" }, "vibes": ["noble", "wise"] },
  { "id": "cb-darren", "name": "Darren", "role": "middle", "syllables": 2, "origin": "keltik", "meaning": { "id": "agung", "en": "great" }, "vibes": ["bright", "grounded"] },
  { "id": "cb-arthur", "name": "Arthur", "role": "middle", "syllables": 2, "origin": "keltik", "meaning": { "id": "beruang; kuat dan gagah", "en": "bear; strong" }, "vibes": ["noble"] }
]
```

Curation rules:
- **first:** real but uncommon boy names, easy to say in both Indonesian and English. Spread them across origins, and prefer 1–2 syllables with a few 3-syllable ones. Pool to draw from: Lucan, Zael, Caspian, Evander, Orion, Kael, Soren, Thiago, Cassian, Leander, Ronan, Silas, Alaric, Castiel, Idris, Rafael, Emrys, Lorcan, Callum, Anselm, Oren, Zaid, Arion, Tobiah, Elio, Dorian, Lysander, Aurelio, Kenzo, Haruki, Arjuna, Bhaskara, Rayyan, Zayan, Kiran, Aarav, Darius, Cyrus, Kaveh, Arash, Faris, Nael, Ilyas, Emeric, Everett, Rhys, Tiernan, Declan, Cian, Oisin, Bram, Leif, Anders, Stellan, Viggo, Mateo, Enzo, Luca, Nico, Stefan, Milan, Radek, Kofi, Jabari, Kairo, Ezra, Aksel, Tavi, Aiden, Rowan, Theon, Ilian, Aurel, Cael, Remy. Add more of the same calibre to reach ≥170.
- **middle:** classic, widely known boy names, e.g. Darren, Marcus, Arthur, Asher, Julian, Adrian, Gabriel, Samuel, Daniel, Nathaniel, Alexander, Benedict, Vincent, Lucas, Oliver, Henry, Edward, Matthew, Andrew, Stephen, Victor, Felix, Leonard, Oscar, Theodore, Elliot, Isaac, Caleb, Joel, Simon, Philip, Peter, Martin, Thomas, Ethan. Reach ≥80.
- **Meanings must be positive.** Skip names whose only attested meaning is negative or neutral-odd, e.g. James ("supplanter"), Doran ("stranger"), Cecil ("blind"), Claude ("lame"), Cameron ("crooked nose"). Where several meanings exist, use the positive one that is well attested. When the existing `src/data/commonNames*.json` has the name, prefer its gloss if it is positive. `meaning.id` is a natural Indonesian translation.
- **Bully-safe:** run every name past the blocklist mentally *and* avoid Indonesian homophones of crude words (e.g. names starting "Tai-", "Kon-tol", "Pan-tat", "Asu-", "Bab-i").
- `syllables` is the **spoken** count (Orion = 3, Caspian = 3, Zael = 1, Rhys = 1).
- `origin` uses the existing `Origin` keys (`latin`, `yunani`, `ibrani`, `keltik`, `jermanik`, `nordik`, `arab`, `persia`, `sanskerta`, `jepang`, `slavia`, `afrika`, `inggris`, `lainnya`, …).
- No name appears in both roles.

- [ ] **Step 4: Export from `src/data/index.ts`**

Add the import next to the other JSON imports:

```ts
import coolBoyNames from './coolBoyNames.json';
```

Add `CoolName` to the existing type import: `import type { CommonName, CoolName, NameElement } from '../types';`. At the end of the file, add:

```ts
/** Curated "Keren" names: rare first names and classic middle names for boys. */
const COOL_NAMES = coolBoyNames as CoolName[];
export const COOL_FIRST: CoolName[] = COOL_NAMES.filter((n) => n.role === 'first');
export const COOL_MIDDLE: CoolName[] = COOL_NAMES.filter((n) => n.role === 'middle');
```

- [ ] **Step 5: Run the tests, fix the data until green**

Run: `npx vitest run tests/coolData.test.ts && npx tsc -b`
Expected: PASS. Fix data entries that fail; do not relax the test.

- [ ] **Step 6: Independent meaning verification**

Dispatch one reviewer agent (`model: "opus"`) with the JSON file. For each entry it answers: is the English meaning a real, well-attested meaning of this name, is it positive, and is the Indonesian a faithful translation? It returns the list of entries it disputes. Fix or remove every disputed entry (removal is fine as long as the counts stay ≥150 / ≥60), then re-run Step 5.

- [ ] **Step 7: Commit**

```bash
git add src/data/coolBoyNames.json src/data/index.ts tests/coolData.test.ts
git commit -m "data: curated rare first + classic middle boy names for Keren mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 4: UI wiring (mode, defaults, frame)

**Files:**
- Modify: `src/components/ParameterForm.tsx`, `src/App.tsx`, `src/components/NameFrame.tsx`, `src/components/NameFrame.module.css`
- Modify test: `tests/app.words.test.tsx`
- Create test: `tests/app.cool.test.tsx`

**Interfaces:**
- Consumes: `generateCoolName` (Task 2), `COOL_FIRST`, `COOL_MIDDLE` (Task 3), `GeneratedName.analysis` (Task 1).

- [ ] **Step 1: Write the failing test `tests/app.cool.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';
import styles from '../src/components/NameFrame.module.css';

const nameText = () => document.querySelector(`.${styles.name}`)?.textContent?.trim() ?? '';
const analysisText = () => document.querySelector(`.${styles.analysis}`)?.textContent ?? '';

describe('App: Keren mode is the default', () => {
  it('starts in Keren mode with a two-word boy name and an analysis line', () => {
    render(<App />);
    expect(nameText().split(/\s+/)).toHaveLength(2);
    expect(analysisText()).toMatch(/\d \+ \d/);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    expect(screen.getByRole('button', { name: 'Keren' })).toHaveAttribute('aria-pressed', 'true');
    // Gender and word-count controls are hidden in Keren mode.
    expect(screen.queryByRole('button', { name: 'Laki-laki' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3' })).not.toBeInTheDocument();
  });

  it('defaults to boys when switching to another mode', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    fireEvent.click(screen.getByRole('button', { name: 'Umum' }));
    expect(screen.getByRole('button', { name: 'Laki-laki' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('refreshes the analysis when the surname changes', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    const input = screen.getByPlaceholderText('mis. Santoso');
    fireEvent.change(input, { target: { value: 'L' } });
    fireEvent.change(input, { target: { value: 'Lie' } });
    expect(analysisText()).toMatch(/\+ 1/);
    expect(analysisText()).not.toMatch(/overlap with L\./);
  });

  it('twenty Next presses give twenty distinct names', () => {
    render(<App />);
    const seen = new Set([nameText()]);
    for (let i = 0; i < 19; i++) {
      fireEvent.click(screen.getByLabelText('Nama berikutnya'));
      seen.add(nameText());
    }
    expect(seen.size).toBe(20);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/app.cool.test.tsx`
Expected: FAIL — no Keren button / no `.analysis` element.

- [ ] **Step 3: Update `src/components/ParameterForm.tsx`**

1. Put Keren first in `NAME_STYLES`:

```ts
const NAME_STYLES: { value: NameStyle; label: string; hint: string }[] = [
  { value: 'cool', label: 'Keren', hint: 'nama langka + klasik · rare + classic' },
  { value: 'familiar', label: 'Umum', hint: 'mis. Cindy, Elaine, Christie' },
  { value: 'composed', label: 'Unik', hint: 'dirangkai dari akar kata' },
  { value: 'meaning', label: 'Arti', hint: 'mis. joy, happy, glee' },
  { value: 'analyze', label: 'Nama Sendiri', hint: 'ketik nama, lihat artinya' },
  { value: 'browse', label: 'Jelajah', hint: 'daftar A–Z semua etimologi' },
];
```

2. The indices into `NAME_STYLES` shift by one, so update `STYLE_HINTS` to look hints up by value, not by index:

```ts
const hint = (v: NameStyle) => NAME_STYLES.find((s) => s.value === v)!.hint;
const STYLE_HINTS: Record<NameStyle, string> = {
  cool: 'Nama keren untuk anak laki-laki · ' + hint('cool'),
  familiar: 'Nama umum yang dikenal · ' + hint('familiar'),
  composed: 'Nama unik · ' + hint('composed'),
  meaning: 'Cari dari arti · ' + hint('meaning'),
  analyze: 'Arti nama Anda · ' + hint('analyze'),
  browse: 'Jelajahi semua nama per huruf · browse all names by letter, all etymologies',
};
```

3. In the component, add `const cool = value.nameStyle === 'cool';` next to `const familiar = …`.
4. Change the initial-letter field condition from `{familiar && (` to `{(familiar || cool) && (`.
5. Change the gender field condition from `{!analyze && (` to `{!analyze && !cool && (`.
6. Change the word-count field condition from `{!analyze && !browse && (` to `{!analyze && !browse && !cool && (`.
7. Change the mode-specific chain head from `{browse ? null : analyze ? (` to `{browse || cool ? null : analyze ? (`.

- [ ] **Step 4: Update `src/App.tsx`**

1. Import: `import { ELEMENTS, COMMON_NAMES, MEANING_POOL, COOL_FIRST, COOL_MIDDLE } from './data';` and `import { generateCoolName } from './lib/coolName';`.
2. Defaults:

```ts
const INITIAL_FORM: FormState = {
  nameStyle: 'cool',
  surname: '',
  gender: 'L',
  slots: [{}, {}],
};
```

3. At the top of `runGenerator`, before the `hasSurname` line:

```ts
    if (form.nameStyle === 'cool') {
      return generateCoolName({ surname: form.surname, initial: form.familiarInitial }, COOL_FIRST, COOL_MIDDLE);
    }
```

4. In `filterSig`, add this field after `surnamePresent`:

```ts
    // Keren pairing and analysis depend on the surname itself, so regenerate on edits.
    coolSurname: form.nameStyle === 'cool' ? form.surname.trim().toLowerCase() : '',
```

- [ ] **Step 5: Render the analysis in `src/components/NameFrame.tsx`**

After `<div className={styles.etymology}>{etymology.id}</div>`, add:

```tsx
        {result.analysis && (
          <div className={styles.analysis}>
            <div>{result.analysis.cadence} · {result.analysis.vibe}</div>
            {result.analysis.phonetics && <div className={styles.phonetics}>{result.analysis.phonetics}</div>}
          </div>
        )}
```

Append to `src/components/NameFrame.module.css` after the `.etymology` rule:

```css
.analysis {
  margin-top: 1.4cqw;
  font-family: var(--font-display);
  font-size: 2.1cqw;
  letter-spacing: 0.08em;
  opacity: 0.85;
}

.phonetics {
  margin-top: 0.5cqw;
  font-style: italic;
  font-size: 1.9cqw;
  letter-spacing: 0.02em;
}
```

- [ ] **Step 6: Update `tests/app.words.test.tsx` for the new default**

The word-count tests assume the old default (Umum). Add this helper below `openCustomize`:

```ts
function useFamiliar() {
  openCustomize();
  fireEvent.click(screen.getByRole('button', { name: 'Umum' }));
}
```

In each `it(...)` that calls `setWords` or checks the word count, call `useFamiliar();` directly after `render(<App />);`. Tests that only check that a name exists or that Next produces a new one ("auto-generates a name on first load", "the Next arrow generates a fresh name") stay as they are.

- [ ] **Step 7: Run the full suite + build**

Run: `npx vitest run && npm run build`
Expected: all tests PASS (154 existing + new), build succeeds. If any other existing test fails because of the new default, fix it the same way (select the mode it assumes first) rather than changing app behaviour.

- [ ] **Step 8: Manual check in the browser**

Run `npm run dev`, open the app, and confirm:
- the first card shows a two-word name with a cadence · vibe line and a phonetic note;
- typing the surname `Lie` updates the note to mention Lie;
- the PNG export includes the analysis lines.

- [ ] **Step 9: Commit**

```bash
git add src/components/ParameterForm.tsx src/App.tsx src/components/NameFrame.tsx src/components/NameFrame.module.css tests/app.cool.test.tsx tests/app.words.test.tsx
git commit -m "feat: Keren mode as default with cadence/vibe/phonetic frame line

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 5: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the mode**

In `README.md` under "**Three name styles:**", add this as the first bullet:

```markdown
  - **Keren (Cool) — default, for boys** — pairs a rare, good-meaning first
    name (Lucan, Caspian, Zael…) with a classic middle name (Darren, Marcus,
    Arthur…), scores the pair for cadence and flow against the surname, and
    shows the cadence (e.g. 2 + 2 + 1), combined vibe and a phonetic note on
    the frame. Every pairing is screened for names that could invite teasing
    at an Indonesian/international school (`src/data/bullyBlocklist.json`).
```

Change the gender bullet's "gender (Laki-laki / Perempuan / Netral)" to "gender (defaults to Laki-laki; Perempuan / Netral available)". In the Architecture table, add:

```markdown
| Keren pairing + analysis | `src/lib/coolName.ts`, `src/lib/bullySafe.ts`, `src/data/coolBoyNames.json` |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document Keren mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```
