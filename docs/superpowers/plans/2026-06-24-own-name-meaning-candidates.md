# Own-Name Meaning Candidates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In "Nama Sendiri" mode, surface multiple candidate meanings per typed word (from the existing dataset) and let the user pick the etymology/meaning per word via chips, with the frame updating live.

**Architecture:** A new pure function `analyzeNameCandidates()` in `src/lib/generator.ts` gathers ranked candidates per word from three dataset sources (exact across etymologies, fuzzy spelling ≤2, root decompositions). `buildAnalyzedName()` derives a standard `GeneratedName` from the per-word selections, which flows into the existing `NameFrame`/`composeMeaning`/export unchanged. A new `WordCandidateChips` component renders the per-word selectors, wired into `ResultPanel` and `App` for analyze mode only.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + Testing Library.

## Global Constraints

- Candidates come **only** from existing dataset content (`COMMON_NAMES`, `ELEMENTS`); never invent meanings. (No new dictionary entries in this plan.)
- Fuzzy matching: Levenshtein distance **≤ 2** AND the **same first letter**.
- Max **6** candidates per word (`MAX_CANDIDATES_PER_WORD = 6`); extras dropped after ranking.
- Candidate ranking order: `exact` → `fuzzy` (ascending distance) → `root`.
- Surname stays **display-only** (from the form, not analyzed).
- Analyze mode is **interactive**: chip selection updates the frame live and adds **no** history entries; Prev/Next/counter/regenerate are not shown in analyze mode.
- Zero-candidate word falls back to a single "arti tidak ditemukan · meaning not found" candidate (origin `lainnya`).
- All bilingual UI copy stays Indonesian · English, matching existing style.

---

### Task 1: Levenshtein distance utility

**Files:**
- Modify: `src/lib/generator.ts` (add exported `levenshtein`)
- Test: `tests/levenshtein.test.ts`

**Interfaces:**
- Produces: `export function levenshtein(a: string, b: string): number`

- [ ] **Step 1: Write the failing test**

Create `tests/levenshtein.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { levenshtein } from '../src/lib/generator';

describe('levenshtein', () => {
  it('is 0 for identical strings', () => {
    expect(levenshtein('marcus', 'marcus')).toBe(0);
  });
  it('counts single edits', () => {
    expect(levenshtein('markus', 'marcus')).toBe(1); // k->c
    expect(levenshtein('sara', 'sarah')).toBe(1);    // insert h
  });
  it('counts two edits', () => {
    expect(levenshtein('markus', 'mark')).toBe(2);   // delete u, s
  });
  it('is symmetric', () => {
    expect(levenshtein('abc', 'xabc')).toBe(levenshtein('xabc', 'abc'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/levenshtein.test.ts`
Expected: FAIL — `levenshtein is not a function` / import error.

- [ ] **Step 3: Write minimal implementation**

Add to `src/lib/generator.ts` (near the other helpers, e.g. just above `findRoots`):

```ts
/** Classic iterative Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/levenshtein.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/generator.ts tests/levenshtein.test.ts
git commit -m "feat: add levenshtein edit-distance helper"
```

---

### Task 2: `analyzeNameCandidates` — exact matches + fallback + multi-word

**Files:**
- Modify: `src/lib/generator.ts` (add types + function)
- Test: `tests/analyzeCandidates.test.ts`

**Interfaces:**
- Consumes: `CommonName`, `NameElement`, `Origin` (from `../types`); `asElement` (existing export); `distinct` (existing private helper in this file).
- Produces:
  ```ts
  export interface MeaningCandidate {
    kind: 'exact' | 'fuzzy' | 'root';
    displayName: string;                 // spelling/name this candidate represents
    elements: NameElement[];             // 1+ elements this contributes to the derived name
    meaning: { id: string; en: string }; // summary gloss shown on the chip
    origins: Origin[];                   // distinct origins in this candidate
    distance?: number;                   // set for kind 'fuzzy'
  }
  export interface WordAnalysis {
    raw: string;                         // the word as typed (casing preserved)
    candidates: MeaningCandidate[];      // ranked; always length >= 1
  }
  export function analyzeNameCandidates(
    input: string,
    names: CommonName[],
    elements: NameElement[],
  ): WordAnalysis[];                     // empty input -> []
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/analyzeCandidates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { analyzeNameCandidates } from '../src/lib/generator';
import type { CommonName, NameElement } from '../src/types';

const NAMES: CommonName[] = [
  { id: 'm1', name: 'Sara', initial: 's', syllables: 2, origin: 'ibrani', gender: 'P', meaning: { id: 'putri', en: 'princess' } },
  { id: 'm2', name: 'Sara', initial: 's', syllables: 2, origin: 'arab', gender: 'P', meaning: { id: 'murni', en: 'pure' } },
  { id: 'm3', name: 'Marcus', initial: 'm', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'kuat, perang', en: 'warlike' } },
];
const ELEMENTS: NameElement[] = [
  { id: 'e-nur', text: 'nur', initial: 'n', origin: 'arab', gender: 'N', meaning: { id: 'cahaya', en: 'light' } },
];

describe('analyzeNameCandidates — exact + fallback', () => {
  it('returns [] for empty input', () => {
    expect(analyzeNameCandidates('   ', NAMES, ELEMENTS)).toEqual([]);
  });

  it('returns one WordAnalysis per word, preserving typed casing in raw', () => {
    const r = analyzeNameCandidates('Sara Marcus', NAMES, ELEMENTS);
    expect(r.map((w) => w.raw)).toEqual(['Sara', 'Marcus']);
  });

  it('returns ALL exact matches across etymologies for a word', () => {
    const [sara] = analyzeNameCandidates('Sara', NAMES, ELEMENTS);
    const exact = sara.candidates.filter((c) => c.kind === 'exact');
    expect(exact.map((c) => c.origins[0]).sort()).toEqual(['arab', 'ibrani']);
    expect(exact.every((c) => c.elements.length === 1)).toBe(true);
  });

  it('falls back to a not-found candidate when nothing matches', () => {
    const [w] = analyzeNameCandidates('Zzzqq', NAMES, ELEMENTS);
    expect(w.candidates).toHaveLength(1);
    expect(w.candidates[0].meaning.id.toLowerCase()).toContain('tidak ditemukan');
    expect(w.candidates[0].meaning.en.toLowerCase()).toContain('not found');
    expect(w.candidates[0].origins).toEqual(['lainnya']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analyzeCandidates.test.ts`
Expected: FAIL — `analyzeNameCandidates is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/lib/generator.ts` (after `analyzeName`; the file already has `asElement`, `findRoots`, and `distinct`):

```ts
export const MAX_CANDIDATES_PER_WORD = 6;
export const FUZZY_MAX_DISTANCE = 2;

export interface MeaningCandidate {
  kind: 'exact' | 'fuzzy' | 'root';
  displayName: string;
  elements: NameElement[];
  meaning: { id: string; en: string };
  origins: Origin[];
  distance?: number;
}

export interface WordAnalysis {
  raw: string;
  candidates: MeaningCandidate[];
}

function notFoundCandidate(word: string, lw: string): MeaningCandidate {
  const meaning = { id: 'arti tidak ditemukan', en: 'meaning not found' };
  return {
    kind: 'root',
    displayName: word,
    elements: [
      { id: `unknown-${lw || 'x'}`, text: word.toLowerCase(), initial: lw[0] ?? '', origin: 'lainnya', gender: 'N', meaning },
    ],
    meaning,
    origins: ['lainnya'],
  };
}

export function analyzeNameCandidates(
  input: string,
  names: CommonName[],
  elements: NameElement[],
): WordAnalysis[] {
  const words = input.trim().split(/\s+/).filter(Boolean);
  return words.map((word) => {
    const lw = word.toLowerCase().replace(/[^a-z]/g, '');
    const candidates: MeaningCandidate[] = [];

    // (1) Exact matches across all etymology families.
    if (lw) {
      for (const n of names) {
        if (n.name.toLowerCase() === lw) {
          candidates.push({
            kind: 'exact',
            displayName: n.name,
            elements: [asElement(n)],
            meaning: n.meaning,
            origins: [n.origin],
          });
        }
      }
    }

    const ranked = candidates.length > 0 ? candidates : [notFoundCandidate(word, lw)];
    return { raw: word, candidates: ranked };
  });
}
```

Note: `Origin` must be imported in this file. If `import ... type { ... Origin ... }` is not already present at the top of `generator.ts`, add `Origin` to the existing type import from `../types`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analyzeCandidates.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/generator.ts tests/analyzeCandidates.test.ts
git commit -m "feat: analyzeNameCandidates exact matches + not-found fallback"
```

---

### Task 3: Add fuzzy spelling source + dedup + ranking

**Files:**
- Modify: `src/lib/generator.ts` (extend `analyzeNameCandidates`)
- Test: `tests/analyzeCandidates.test.ts` (add cases)

**Interfaces:**
- Consumes: `levenshtein` (Task 1), the candidate model (Task 2).
- Produces: same `analyzeNameCandidates` signature; now also emits `kind: 'fuzzy'` candidates ordered after exact, by ascending `distance`; duplicates removed.

- [ ] **Step 1: Write the failing test**

Append to `tests/analyzeCandidates.test.ts`:

```ts
describe('analyzeNameCandidates — fuzzy', () => {
  it('matches near spellings within distance 2 sharing the first letter', () => {
    const [w] = analyzeNameCandidates('Markus', NAMES, ELEMENTS);
    const marcus = w.candidates.find((c) => c.displayName === 'Marcus');
    expect(marcus).toBeDefined();
    expect(marcus!.kind).toBe('fuzzy');
    expect(marcus!.distance).toBe(1);
  });

  it('excludes matches with a different first letter even if close', () => {
    const names = [
      { id: 'x', name: 'Aarcus', initial: 'a', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'x', en: 'x' } },
    ] as CommonName[];
    const [w] = analyzeNameCandidates('Markus', names, []);
    expect(w.candidates.every((c) => c.kind !== 'fuzzy')).toBe(true);
  });

  it('orders exact before fuzzy, and fuzzy by ascending distance', () => {
    const names = [
      { id: 'a', name: 'Marcus', initial: 'm', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'kuat', en: 'strong' } },
      { id: 'b', name: 'Mark', initial: 'm', syllables: 1, origin: 'latin', gender: 'L', meaning: { id: 'perang', en: 'war' } },
      { id: 'c', name: 'Markus', initial: 'm', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'asli', en: 'exact' } },
    ] as CommonName[];
    const [w] = analyzeNameCandidates('Markus', names, []);
    expect(w.candidates[0].kind).toBe('exact');           // Markus exact
    const fuzzy = w.candidates.filter((c) => c.kind === 'fuzzy');
    expect(fuzzy.map((c) => c.distance)).toEqual([1, 2]); // Marcus(1) before Mark(2)
  });

  it('does not list the same name+origin+meaning twice', () => {
    const names = [
      { id: 'a', name: 'Sara', initial: 's', syllables: 2, origin: 'ibrani', gender: 'P', meaning: { id: 'putri', en: 'princess' } },
      { id: 'b', name: 'Sara', initial: 's', syllables: 2, origin: 'ibrani', gender: 'P', meaning: { id: 'putri', en: 'princess' } },
    ] as CommonName[];
    const [w] = analyzeNameCandidates('Sara', names, []);
    expect(w.candidates).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analyzeCandidates.test.ts`
Expected: FAIL — fuzzy candidates not produced / ordering assertions fail.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/generator.ts`, add a dedup-key helper and extend the per-word body of `analyzeNameCandidates` to collect fuzzy matches and dedup. Replace the body that currently builds `candidates` with:

```ts
function candidateKey(c: MeaningCandidate): string {
  return `${c.displayName.toLowerCase()}|${c.origins.join(',')}|${c.meaning.id}|${c.meaning.en}`;
}
```

Inside `analyzeNameCandidates`, after the exact loop and before the fallback, add the fuzzy loop, then dedup + sort:

```ts
    // (2) Fuzzy spelling matches: distance <= 2, same first letter, not already exact.
    if (lw) {
      for (const n of names) {
        const nl = n.name.toLowerCase();
        if (nl === lw) continue;
        if (nl[0] !== lw[0]) continue;
        const d = levenshtein(lw, nl);
        if (d <= FUZZY_MAX_DISTANCE) {
          candidates.push({
            kind: 'fuzzy',
            displayName: n.name,
            elements: [asElement(n)],
            meaning: n.meaning,
            origins: [n.origin],
            distance: d,
          });
        }
      }
    }

    // Rank: exact -> fuzzy(asc distance) -> root; dedup; (cap added in Task 4).
    const kindRank = { exact: 0, fuzzy: 1, root: 2 } as const;
    candidates.sort((a, b) => {
      if (kindRank[a.kind] !== kindRank[b.kind]) return kindRank[a.kind] - kindRank[b.kind];
      return (a.distance ?? 0) - (b.distance ?? 0);
    });
    const seen = new Set<string>();
    const deduped = candidates.filter((c) => {
      const k = candidateKey(c);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const ranked = deduped.length > 0 ? deduped : [notFoundCandidate(word, lw)];
    return { raw: word, candidates: ranked };
```

(Remove the previous `const ranked = candidates.length > 0 ? ...` line from Task 2 — it is replaced by the block above.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analyzeCandidates.test.ts`
Expected: PASS (all exact + fuzzy cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/generator.ts tests/analyzeCandidates.test.ts
git commit -m "feat: add fuzzy spelling candidates with ranking and dedup"
```

---

### Task 4: Add root decompositions + cap at 6

**Files:**
- Modify: `src/lib/composeMeaning.ts` (export `firstSense`)
- Modify: `src/lib/generator.ts` (root decompositions + cap)
- Test: `tests/analyzeCandidates.test.ts` (add cases)

**Interfaces:**
- Consumes: `findRoots` (existing private helper in `generator.ts`), `firstSense` (now exported from `composeMeaning.ts`).
- Produces: `analyzeNameCandidates` now also emits `kind: 'root'` candidates (1+ elements each) and caps each word at `MAX_CANDIDATES_PER_WORD`.

- [ ] **Step 1: Write the failing test**

Append to `tests/analyzeCandidates.test.ts`:

```ts
describe('analyzeNameCandidates — roots + cap', () => {
  const ROOTS: NameElement[] = [
    { id: 'r-nur', text: 'nur', initial: 'n', origin: 'arab', gender: 'N', meaning: { id: 'cahaya', en: 'light' } },
    { id: 'r-alia', text: 'alia', initial: 'a', origin: 'arab', gender: 'P', meaning: { id: 'mulia, tinggi', en: 'noble, exalted' } },
  ];

  it('decomposes an unknown word into known roots as a single candidate', () => {
    const [w] = analyzeNameCandidates('Nuralia', [], ROOTS);
    const root = w.candidates.find((c) => c.kind === 'root');
    expect(root).toBeDefined();
    expect(root!.elements.map((e) => e.id)).toEqual(['r-nur', 'r-alia']);
    // summary gloss joins leading senses with a hyphen
    expect(root!.meaning.id).toBe('cahaya-mulia');
    expect(root!.meaning.en).toBe('light-noble');
  });

  it('caps candidates per word at MAX_CANDIDATES_PER_WORD (6)', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `n${i}`, name: 'Marcus', initial: 'm', syllables: 2, origin: 'latin', gender: 'L',
      meaning: { id: `arti ${i}`, en: `meaning ${i}` },
    })) as CommonName[];
    const [w] = analyzeNameCandidates('Marcus', many, []);
    expect(w.candidates.length).toBeLessThanOrEqual(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analyzeCandidates.test.ts`
Expected: FAIL — no `root` candidate produced; cap not applied.

- [ ] **Step 3: Write minimal implementation**

First, export `firstSense` from `src/lib/composeMeaning.ts` by changing its declaration:

```ts
/** The leading sense of a gloss — text before the first comma, trimmed. */
export function firstSense(s: string): string {
  const i = s.indexOf(',');
  return (i >= 0 ? s.slice(0, i) : s).trim();
}
```

Then in `src/lib/generator.ts` add an import and two helpers, and extend the word body. Add at the top (with other imports):

```ts
import { firstSense } from './composeMeaning';
```

Add helpers near `analyzeNameCandidates`:

```ts
export const MAX_ROOT_DECOMPOSITIONS = 3;

/** Build up to N root decompositions of a word: greedy, plus alternatives that start at each distinct prefix root. */
function rootDecompositions(word: string, elements: NameElement[]): NameElement[][] {
  const results: NameElement[][] = [];
  const push = (split: NameElement[]) => {
    if (split.length === 0) return;
    const key = split.map((e) => e.id).join('+');
    if (!results.some((r) => r.map((e) => e.id).join('+') === key)) results.push(split);
  };
  push(findRoots(word, elements)); // greedy
  const prefixRoots = elements
    .filter((e) => e.text.length >= 3 && word.startsWith(e.text))
    .sort((a, b) => b.text.length - a.text.length);
  for (const first of prefixRoots) {
    push([first, ...findRoots(word.slice(first.text.length), elements)]);
    if (results.length >= MAX_ROOT_DECOMPOSITIONS) break;
  }
  return results.slice(0, MAX_ROOT_DECOMPOSITIONS);
}

/** Summary gloss for a candidate's elements: single root keeps its full gloss; multiple roots join leading senses with a hyphen. */
function combinedMeaning(elements: NameElement[]): { id: string; en: string } {
  if (elements.length === 1) return elements[0].meaning;
  return {
    id: elements.map((e) => firstSense(e.meaning.id)).join('-'),
    en: elements.map((e) => firstSense(e.meaning.en)).join('-'),
  };
}
```

In `analyzeNameCandidates`, add the root source after the fuzzy loop (before the sort):

```ts
    // (3) Root decompositions (one candidate per distinct split).
    if (lw) {
      for (const split of rootDecompositions(lw, elements)) {
        candidates.push({
          kind: 'root',
          displayName: word,
          elements: split,
          meaning: combinedMeaning(split),
          origins: distinct(split.map((e) => e.origin)),
        });
      }
    }
```

Finally, apply the cap when building `ranked` — change the `ranked` line to slice the deduped list:

```ts
    const capped = deduped.slice(0, MAX_CANDIDATES_PER_WORD);
    const ranked = capped.length > 0 ? capped : [notFoundCandidate(word, lw)];
    return { raw: word, candidates: ranked };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analyzeCandidates.test.ts tests/composeMeaning.test.ts`
Expected: PASS (root + cap cases; composeMeaning suite still green after the `export`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/generator.ts src/lib/composeMeaning.ts tests/analyzeCandidates.test.ts
git commit -m "feat: add root-decomposition candidates and per-word cap"
```

---

### Task 5: `buildAnalyzedName` — derive GeneratedName from selections

**Files:**
- Modify: `src/lib/generator.ts` (add `buildAnalyzedName`)
- Test: `tests/buildAnalyzedName.test.ts`

**Interfaces:**
- Consumes: `WordAnalysis` (Task 2), `composeMeaning` (existing), `distinct` (existing).
- Produces:
  ```ts
  export function buildAnalyzedName(
    words: WordAnalysis[],
    selections: number[],
    surname: string,
  ): GeneratedName | null;   // null when words is empty
  ```
  Picks `words[i].candidates[selections[i] ?? 0]` (clamped to a valid index), flattens their `elements`, sets `wordGroups` to each picked candidate's element count, `name` to the typed words joined, `origins` to the distinct element origins.

- [ ] **Step 1: Write the failing test**

Create `tests/buildAnalyzedName.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { analyzeNameCandidates, buildAnalyzedName } from '../src/lib/generator';
import { composeMeaning } from '../src/lib/composeMeaning';
import type { CommonName, NameElement } from '../src/types';

const NAMES: CommonName[] = [
  { id: 's-ib', name: 'Sara', initial: 's', syllables: 2, origin: 'ibrani', gender: 'P', meaning: { id: 'putri', en: 'princess' } },
  { id: 's-ar', name: 'Sara', initial: 's', syllables: 2, origin: 'arab', gender: 'P', meaning: { id: 'murni', en: 'pure' } },
];
const ELEMENTS: NameElement[] = [];

describe('buildAnalyzedName', () => {
  it('returns null for no words', () => {
    expect(buildAnalyzedName([], [], '')).toBeNull();
  });

  it('uses the selected candidate per word and composes its meaning', () => {
    const words = analyzeNameCandidates('Sara', NAMES, ELEMENTS);
    // index of the arab 'Sara' candidate
    const arabIdx = words[0].candidates.findIndex((c) => c.origins[0] === 'arab');
    const g = buildAnalyzedName(words, [arabIdx], 'Tan')!;
    expect(g.name).toBe('Sara');
    expect(g.surname).toBe('Tan');
    expect(g.origins).toEqual(['arab']);
    expect(composeMeaning(g).id.toLowerCase()).toContain('murni');
  });

  it('defaults to candidate 0 when a selection is missing or out of range', () => {
    const words = analyzeNameCandidates('Sara', NAMES, ELEMENTS);
    const g = buildAnalyzedName(words, [], '')!;
    expect(g.elements).toHaveLength(1);
    expect(g.wordGroups).toEqual([1]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/buildAnalyzedName.test.ts`
Expected: FAIL — `buildAnalyzedName is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/lib/generator.ts`:

```ts
export function buildAnalyzedName(
  words: WordAnalysis[],
  selections: number[],
  surname: string,
): GeneratedName | null {
  if (words.length === 0) return null;
  const chosen = words.map((w, i) => {
    const sel = selections[i] ?? 0;
    return w.candidates[sel] ?? w.candidates[0];
  });
  const elements = chosen.flatMap((c) => c.elements);
  const wordGroups = chosen.map((c) => Math.max(1, c.elements.length));
  return {
    name: words.map((w) => w.raw).join(' '),
    surname: surname.trim(),
    elements,
    origins: distinct(elements.map((e) => e.origin)),
    wordGroups,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/buildAnalyzedName.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/generator.ts tests/buildAnalyzedName.test.ts
git commit -m "feat: derive GeneratedName from per-word candidate selections"
```

---

### Task 6: `WordCandidateChips` component

**Files:**
- Create: `src/components/WordCandidateChips.tsx`
- Test: `tests/wordCandidateChips.test.tsx`

**Interfaces:**
- Consumes: `WordAnalysis` (from `../lib/generator`), `ORIGIN_LABELS` (from `../types`).
- Produces:
  ```ts
  interface Props {
    words: WordAnalysis[];
    selections: number[];
    onSelect: (wordIndex: number, candidateIndex: number) => void;
  }
  export default function WordCandidateChips(props: Props): JSX.Element | null;
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/wordCandidateChips.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordCandidateChips from '../src/components/WordCandidateChips';
import type { WordAnalysis } from '../src/lib/generator';

const WORDS: WordAnalysis[] = [
  {
    raw: 'Sara',
    candidates: [
      { kind: 'exact', displayName: 'Sara', elements: [], meaning: { id: 'putri', en: 'princess' }, origins: ['ibrani'] },
      { kind: 'exact', displayName: 'Sara', elements: [], meaning: { id: 'murni', en: 'pure' }, origins: ['arab'] },
    ],
  },
];

describe('WordCandidateChips', () => {
  it('renders a radiogroup per word with its candidate chips', () => {
    render(<WordCandidateChips words={WORDS} selections={[0]} onSelect={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: /Sara/ })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByText('putri')).toBeInTheDocument();
    expect(screen.getByText('murni')).toBeInTheDocument();
  });

  it('marks the selected chip and calls onSelect on click', async () => {
    const onSelect = vi.fn();
    render(<WordCandidateChips words={WORDS} selections={[0]} onSelect={onSelect} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith(0, 1);
  });

  it('renders nothing for no words', () => {
    const { container } = render(<WordCandidateChips words={[]} selections={[]} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wordCandidateChips.test.tsx`
Expected: FAIL — module `WordCandidateChips` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/WordCandidateChips.tsx`:

```tsx
import { ORIGIN_LABELS } from '../types';
import type { WordAnalysis } from '../lib/generator';

interface Props {
  words: WordAnalysis[];
  selections: number[];
  onSelect: (wordIndex: number, candidateIndex: number) => void;
}

export default function WordCandidateChips({ words, selections, onSelect }: Props) {
  if (words.length === 0) return null;
  return (
    <div className="candidates">
      {words.map((w, wi) => (
        <div className="candidates__word" key={`${w.raw}-${wi}`} role="radiogroup" aria-label={`Arti untuk ${w.raw}`}>
          <span className="candidates__label">{w.raw}</span>
          <div className="candidates__chips">
            {w.candidates.map((c, ci) => {
              const selected = (selections[wi] ?? 0) === ci;
              const originId = c.origins.map((o) => ORIGIN_LABELS[o].id).join(', ');
              const originEn = c.origins.map((o) => ORIGIN_LABELS[o].en).join(', ');
              return (
                <button
                  key={ci}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`chip${selected ? ' chip--on' : ''}`}
                  onClick={() => onSelect(wi, ci)}
                  title={`${c.meaning.en} · ${originEn}`}
                >
                  <strong className="chip__name">{c.displayName}</strong>
                  <span className="chip__meaning">{c.meaning.id}</span>
                  <span className="chip__origin">{originId}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wordCandidateChips.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/WordCandidateChips.tsx tests/wordCandidateChips.test.tsx
git commit -m "feat: add WordCandidateChips per-word meaning selector"
```

---

### Task 7: Wire candidates into ResultPanel + App (analyze mode)

**Files:**
- Modify: `src/components/ResultPanel.tsx` (render chips + hide history nav in analyze mode)
- Modify: `src/App.tsx` (compute analysis, hold selections, derive `current`, short-circuit `generate`)
- Modify: `src/styles/*` — add minimal `.candidates`/`.chip` styles (see note)
- Test: `tests/resultPanelCandidates.test.tsx`

**Interfaces:**
- Consumes: `analyzeNameCandidates`, `buildAnalyzedName`, `WordAnalysis` (from `../lib/generator`); `WordCandidateChips` (Task 6).
- ResultPanel new optional props:
  ```ts
  wordAnalyses?: WordAnalysis[];
  selections?: number[];
  onSelectCandidate?: (wordIndex: number, candidateIndex: number) => void;
  ```
  When `wordAnalyses` is a non-empty array, ResultPanel renders `<WordCandidateChips>` above the frame and hides the Prev/Next arrows, the counter, and the regenerate/reset buttons (analyze mode is interactive, not history-based). The frame and `ExportButtons` still render.

- [ ] **Step 1: Write the failing test**

Create `tests/resultPanelCandidates.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultPanel from '../src/components/ResultPanel';
import type { GeneratedName } from '../src/types';
import type { WordAnalysis } from '../src/lib/generator';

const CURRENT: GeneratedName = {
  name: 'Sara',
  surname: '',
  elements: [{ id: 's', text: 'sara', initial: 's', origin: 'arab', gender: 'P', meaning: { id: 'murni', en: 'pure' } }],
  origins: ['arab'],
  wordGroups: [1],
};

const WORDS: WordAnalysis[] = [
  {
    raw: 'Sara',
    candidates: [
      { kind: 'exact', displayName: 'Sara', elements: CURRENT.elements, meaning: { id: 'putri', en: 'princess' }, origins: ['ibrani'] },
      { kind: 'exact', displayName: 'Sara', elements: CURRENT.elements, meaning: { id: 'murni', en: 'pure' }, origins: ['arab'] },
    ],
  },
];

const noop = () => {};

describe('ResultPanel — analyze mode candidates', () => {
  it('renders candidate chips and hides the history nav when wordAnalyses is provided', async () => {
    const onSelectCandidate = vi.fn();
    render(
      <ResultPanel
        current={CURRENT}
        error={null}
        notice={null}
        position={{ index: 0, total: 1 }}
        canPrev={false}
        onPrev={noop}
        onNext={noop}
        onRegenerate={noop}
        onReset={noop}
        wordAnalyses={WORDS}
        selections={[1]}
        onSelectCandidate={onSelectCandidate}
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryByLabelText('Nama sebelumnya')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nama berikutnya')).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('radio')[0]);
    expect(onSelectCandidate).toHaveBeenCalledWith(0, 0);
  });

  it('keeps the normal history nav when no wordAnalyses are given', () => {
    render(
      <ResultPanel
        current={CURRENT}
        error={null}
        notice={null}
        position={{ index: 0, total: 1 }}
        canPrev={false}
        onPrev={noop}
        onNext={noop}
        onRegenerate={noop}
        onReset={noop}
      />,
    );
    expect(screen.getByLabelText('Nama berikutnya')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/resultPanelCandidates.test.tsx`
Expected: FAIL — ResultPanel does not accept/render `wordAnalyses`.

- [ ] **Step 3: Implement ResultPanel changes**

In `src/components/ResultPanel.tsx`: add the import and props, and branch the render. Add near the top:

```tsx
import WordCandidateChips from './WordCandidateChips';
import type { WordAnalysis } from '../lib/generator';
```

Extend `interface Props` with:

```tsx
  wordAnalyses?: WordAnalysis[];
  selections?: number[];
  onSelectCandidate?: (wordIndex: number, candidateIndex: number) => void;
```

Destructure them in the function signature (`wordAnalyses, selections, onSelectCandidate`). Then, inside the final `return (...)` (the non-error, non-empty branch), compute a flag and conditionally render. Replace the `result__stage` block and what follows it with:

```tsx
      const analyzeMode = !!wordAnalyses && wordAnalyses.length > 0;

      {analyzeMode && (
        <WordCandidateChips
          words={wordAnalyses!}
          selections={selections ?? []}
          onSelect={onSelectCandidate ?? (() => {})}
        />
      )}

      <div className="result__stage">
        {!analyzeMode && (
          <button className="navarrow" onClick={onPrev} disabled={!canPrev} aria-label="Nama sebelumnya">
            ‹
          </button>
        )}
        <NameFrame ref={frameRef} result={current} style={style} nameFontFamily={nameFontFamily} />
        {!analyzeMode && (
          <button className="navarrow" onClick={onNext} aria-label="Nama berikutnya">
            ›
          </button>
        )}
      </div>

      {!analyzeMode && (
        <span className="result__counter">
          {position.index + 1} / {position.total}
        </span>
      )}

      {notice && <p className="notice">{notice}</p>}

      <div className="result__actions">
        {!analyzeMode && (
          <button
            className="btn btn--ghost btn--icon"
            onClick={onRegenerate}
            title="Buat lagi · Regenerate"
            aria-label="Buat lagi · Regenerate"
          >
            ↻
          </button>
        )}
        <ExportButtons targetRef={frameRef} name={current.name} surname={current.surname} />
        {!analyzeMode && (
          <button className="btn btn--ghost btn--icon" onClick={onReset} title="Reset" aria-label="Reset">
            🗑
          </button>
        )}
      </div>
```

Note: `const analyzeMode = ...` must be declared as a normal statement before the `return (`, not inside JSX. Place `const analyzeMode = !!wordAnalyses && wordAnalyses.length > 0;` just above the final `return (` and remove the inline `const` shown above — reference `analyzeMode` in the JSX only.

- [ ] **Step 4: Run the ResultPanel test**

Run: `npx vitest run tests/resultPanelCandidates.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement App wiring**

In `src/App.tsx`:

(a) Update imports:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateName, generateFamiliarName, generateByMeaning, analyzeNameCandidates, buildAnalyzedName } from './lib/generator';
```

(Remove `analyzeName` from the import — it is no longer used by App; the function and its tests remain in the lib.)

(b) Add analyze state after the existing `useState`/`useRef` declarations:

```tsx
  const analysis = useMemo(
    () =>
      form.nameStyle === 'analyze'
        ? analyzeNameCandidates(form.ownName ?? '', COMMON_NAMES, ELEMENTS)
        : [],
    [form.nameStyle, form.ownName],
  );
  const analysisKey = useMemo(() => analysis.map((w) => w.raw).join('|'), [analysis]);
  const [selections, setSelections] = useState<number[]>([]);
  useEffect(() => {
    setSelections(analysis.map(() => 0));
  }, [analysisKey]);
```

(c) In `runGenerator()`, remove the `analyze` branch (it returned `analyzeName(...)`). Delete these lines:

```tsx
    if (form.nameStyle === 'analyze') {
      return analyzeName(form.ownName ?? '', COMMON_NAMES, ELEMENTS);
    }
```

(d) Short-circuit `generate()` for analyze mode — add as the first lines of `generate()`:

```tsx
    if (form.nameStyle === 'analyze') {
      // Analyze mode derives `current` live from chip selections; no history.
      setError(null);
      setNotice(null);
      return;
    }
```

(e) Replace the `current` derivation with an analyze-aware version:

```tsx
  const current =
    form.nameStyle === 'analyze'
      ? buildAnalyzedName(analysis, selections, form.surname)
      : cursor >= 0 && cursor < history.length
        ? { ...history[cursor], surname: form.surname.trim() }
        : null;
```

(f) Pass the analyze props to `ResultPanel`:

```tsx
        <ResultPanel
          current={current}
          error={error}
          notice={notice}
          position={{ index: cursor, total: history.length }}
          canPrev={cursor > 0}
          onPrev={goPrev}
          onNext={goNext}
          onRegenerate={generate}
          onReset={reset}
          wordAnalyses={form.nameStyle === 'analyze' ? analysis : undefined}
          selections={selections}
          onSelectCandidate={(wi, ci) =>
            setSelections((prev) => {
              const next = [...prev];
              next[wi] = ci;
              return next;
            })
          }
        />
```

- [ ] **Step 6: Add minimal styles**

Locate the stylesheet that defines `.chip` / `.btn` (search: `grep -rn "result__stage\|\.chip" src/styles src/*.css` — likely `src/styles/*.css` or a global `index.css`). Append candidate styles consistent with existing chip styling. If a `.chip` class already exists, only add the wrappers:

```css
.candidates { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; width: 100%; }
.candidates__word { display: flex; flex-direction: column; gap: 0.25rem; }
.candidates__label { font-weight: 600; font-size: 0.85rem; opacity: 0.7; }
.candidates__chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.candidates .chip { display: flex; flex-direction: column; align-items: flex-start; gap: 0.1rem; padding: 0.35rem 0.6rem; border: 1px solid var(--border, #d9cfc0); border-radius: 0.5rem; background: transparent; cursor: pointer; text-align: left; }
.candidates .chip--on { border-color: var(--accent, #b08d57); background: rgba(176, 141, 87, 0.12); }
.candidates .chip__meaning { font-size: 0.85rem; }
.candidates .chip__origin { font-size: 0.7rem; opacity: 0.6; }
```

(Adjust variable names/colors to match the project's existing tokens after inspecting the stylesheet.)

- [ ] **Step 7: Run the full suite + typecheck + build**

Run: `npm test`
Expected: PASS — all suites green, including the new ones and the existing `tests/analyze.test.ts` (which still imports `analyzeName`).

Run: `npm run build`
Expected: type-check + build succeed (no unused-import error for `analyzeName`).

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components/ResultPanel.tsx tests/resultPanelCandidates.test.tsx src/styles
git commit -m "feat: per-word meaning candidate chips in Nama Sendiri mode"
```

---

## Manual verification (after Task 7)

1. `npm run dev`, open the app, choose **Nama Sendiri**.
2. Type `Shan Markus Susanto` in the own-name field (and put `Susanto` in the surname field per the existing form's layout).
3. Expect a chip row per typed given-name word. `Markus` should now show a fuzzy candidate `Marcus` (and possibly `Mark`); selecting it updates the frame's meaning live.
4. Confirm exporting (PNG/PDF) reflects the selected meaning, and that Prev/Next/counter are hidden in this mode.

## Self-Review Notes (resolved)

- **Spec coverage:** exact-multi (T2), fuzzy ≤2 + same first letter (T3), multiple root decompositions (T4), dedup + ranking (T3), cap 6 (T4), zero-candidate fallback (T2), chips UI (T6), live derive without history + hidden nav (T7), surname display-only (T7 via form), export/frame untouched (consume derived `GeneratedName`). Covered.
- **Spec deviation:** the spec's `MeaningCandidate.label` field is dropped; chip presentation is built in `WordCandidateChips` from `displayName` + `meaning` + `origins` (DRY — no precomputed label). Candidates also carry `elements`/`origins` (plural) so root decompositions with multiple roots are representable, which the spec's single-`origin` sketch did not capture.
- **Type consistency:** `MeaningCandidate`/`WordAnalysis`/`analyzeNameCandidates`/`buildAnalyzedName` signatures are identical across Tasks 2–7. `firstSense` exported from `composeMeaning` and imported in `generator.ts` (T4).
