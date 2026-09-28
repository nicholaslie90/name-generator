# Cool boy names ("Keren" mode)

**Date:** 2026-09-28
**Status:** Draft — awaiting review

## Problem

The goal is cool-sounding, uncommon names with good meanings for a baby boy, in the
shape `Rare First + Classic Middle + Surname`, e.g.:

| Full name | Cadence | Vibe | Phonetic note |
| --- | --- | --- | --- |
| Lucan Darren Lie | 2 + 2 + 1 | Modern, bright leader | Flowing liquids (L, R) balanced by firm stops |
| Zael Marcus Lie | 1 + 2 + 1 | High-energy, confident | 1-2-1 cadence gives extra weight to the first name |
| Vaelen Arthur Lie | 2 + 2 + 1 | Cosmopolitan, noble | Zero overlap with the sound of *Lie* |

The app can't produce this today:

1. **No rarity or "cool" signal.** The 2,745 boy/neutral names in `COMMON_NAMES`
   carry no popularity or sound metadata.
2. **Coverage gaps.** Lucan, Zael, Kael and Caspian are not in the dataset.
3. **Weak meanings.** Several attested meanings are unflattering (Doran =
   "Stranger", James = "He who replaces").
4. **No phonetic analysis.** There is no cadence, vibe or flow reasoning anywhere.
5. **No bully-safety.** Nothing screens names that could be mocked at an
   Indonesian or international school.

## Goals

- A new name style **`cool`** (label **"Keren"**) that generates
  `First Middle [Surname]`, where First is a rare real boy name and Middle is a
  classic boy name, both with vetted positive meanings.
- Every result shows **cadence**, **combined vibe** and a **phonetic note**.
- Every result passes a **bully-safety check** (Indonesian + English).
- The app defaults to boys: `nameStyle: 'cool'`, `gender: 'L'`.

## Non-goals

- Invented/composed names (Renric, Vaelen) — only real, attested names are used.
- A vibe filter, or a configurable word count (fixed at first + middle).
- Merging the curated list into `COMMON_NAMES` (that would override existing
  meanings in other modes).
- Removing girl/neutral support anywhere.
- A guarantee against all teasing — the check reduces risk; it cannot be exhaustive.

## Design

### 1. Data — `src/data/coolBoyNames.json`

About 250 hand-curated entries:

```ts
interface CoolName {
  id: string;              // "cb-lucan"
  name: string;            // "Lucan"
  role: 'first' | 'middle';
  syllables: number;       // spoken syllables: Lucan=2, Zael=1, Evander=3
  origin: Origin;          // existing Origin union
  meaning: { id: string; en: string };   // positive, verified
  vibes: Vibe[];           // 1–2 tags
}
type Vibe = 'noble' | 'bright' | 'bold' | 'grounded' | 'joyful' | 'wise' | 'modern' | 'cosmopolitan';
```

- **first** (~170): rare-but-real names, e.g. Lucan, Caspian, Evander, Orion,
  Zael, Kael, Soren, Thiago, Cassian.
- **middle** (~80): classic, widely known names, e.g. Darren, Marcus, Arthur,
  Asher, Julian.
- **Inclusion rules:** the meaning must be positive and verifiable; the name must
  be easy to pronounce in both Indonesian and English; and it must pass the
  bully-safety rules below.
- **Verification:** a second model reviews every entry's meaning against its
  etymology, and any entry it can't confirm is dropped.
- `CoolName` is added to `src/types.ts`, and the data is exported from
  `src/data/index.ts` as `COOL_FIRST` / `COOL_MIDDLE`.

### 2. Bully-safety — `src/lib/bullySafe.ts`

Pure function `isBullySafe(words: string[], surname: string): boolean`, backed
by a plain blocklist file `src/data/bullyBlocklist.json` that is easy to edit:

```json
{ "words": ["tai", "tahi", "asu", "babi", "bego", "dodol", "kentut", "upil", "tolol",
            "goblok", "bodoh", "anjing", "pantat", "dick", "willy", "randy", "gaylord",
            "seymour", "fanny", "upin", "shrek", "..."],
  "initials": ["bab", "asu", "tai", "pki", "kkn", "gay", "fat", "pig", "ass", "wtf", "..."],
  "phrasesWithSurname": ["never", "tell", "dont", "no", "white", "big", "..."] }
```

Checks, all case-insensitive:

1. **Whole word:** no given-name word equals a blocklisted word.
2. **Nickname:** the word's first syllable and its first 3 and 4 letters must not
   equal a blocklisted word. Only exact equality is checked, never "contains", so
   innocent look-alikes pass (e.g. Cassian, Tristan, Bastian).
3. **Initials:** `first[0] + middle[0] + surname[0]` must not be a blocklisted
   acronym. The two-letter `first[0] + middle[0]` is checked too. Missing parts (e.g. no surname) are skipped.
4. **Phrase with surname:** `middle + " " + surname` must not form a phrase in
   `phrasesWithSurname`. This matters for surnames that are English words
   (e.g. *Lie*).

Curation applies the same rules up front; the runtime check is the safety net for
combinations.

### 3. Pairing engine — `src/lib/coolName.ts`

```ts
generateCoolName(req: CoolRequest, first: CoolName[], middle: CoolName[], rng): GenerateResult
interface CoolRequest { surname: string; initial?: string }
```

1. Filter `first` by the optional `initial`. An empty pool returns `empty-pool`.
2. Draw up to 30 random (first, middle) pairs, rejecting any where `first === middle`
   or `!isBullySafe`.
3. Score each pair with `scorePair` (exported for testing):
   - **Cadence**, using the surname's syllable count. The count comes from a simple
     vowel-group counter (`countSyllables`) and `1` when there is no surname.
     - +3 for 2+2+1, 1+2+1 or 2+1+1
     - +1 for 3+1+1 or 2+3+1
     - −3 when all parts are 1 syllable
   - **Clean break:** +2 when the last sound of first ≠ the first sound of middle,
     and again for middle → surname. −3 when the same letter meets itself at the
     seam (e.g. "Lucan Nathan").
   - **Alliteration:** −2 when first and middle share an initial.
   - **Surname echo:** −3 when middle or first rhymes with the surname (the same
     final vowel sound, e.g. Riley/Lie → "ee").
   - **Texture:** +1 when the full name has both a flowing sound (l, r, m, n) and a
     firm one (k, d, t, g, b, p, c).
4. Pick randomly among the pairs within 1 point of the top score, so results vary
   but stay good.
5. Return a `GeneratedName`:
   - `name: "Lucan Darren"`, `elements` via an `asElement`-style conversion, so
     `composeMeaning` / `composeEtymology` work unchanged.
   - A new optional `analysis` field.

```ts
// added to GeneratedName in src/types.ts
analysis?: { cadence: string; vibe: string; phonetics: string };
```

- `cadence`: `"2 + 2 + 1"`, or `"2 + 2"` when there is no surname.
- `vibe`: capitalised union of both names' first tags, e.g. `"Noble, bright"`.
- `phonetics`: 1–2 sentences picked from the rules that fired, e.g.
  *"Firm 'n' → 'D' break keeps the names distinct."*,
  *"Flowing liquids (L, R) balanced by firm stops."*,
  *"No sound overlap with Lie."*,
  *"1-2-1 cadence gives extra weight to the first name."*

### 4. UI

- `NameStyle` gains `'cool'`. `NAME_STYLES` gets `Keren` as the first entry, with
  the hint "nama langka + klasik · rare + classic".
- `INITIAL_FORM` becomes `{ nameStyle: 'cool', gender: 'L', ... }`.
- In `cool` mode, `ParameterForm` shows only the surname and the first-letter
  filter (reusing `familiarInitial`). Gender, word count and origin controls are
  hidden, because the list is boys-only and always 2 words.
- `App.runGenerator` routes `cool` → `generateCoolName(COOL_FIRST, COOL_MIDDLE)`.
  History, no-repeat, swipe and export are unchanged.
- `NameFrame` renders `analysis` (when present) below the etymology:
  `2 + 2 + 1 · Noble, bright`, with the phonetic note in a smaller line. The
  styling is a small addition to `NameFrame.module.css`, and the analysis is
  included in the PNG/PDF export.

## Blast radius

- **Changed defaults:** `app.shell` / `app.words` / `deck` tests that assume
  `familiar` or `N` must set the mode or be updated.
- **Types:** `GeneratedName.analysis` is optional, so other modes are unaffected.
  The `NameStyle` union grows, and every `Record<NameStyle, …>` (`STYLE_HINTS`)
  needs a `cool` entry.
- **Existing modes and data files are untouched.**
- **Bundle:** about 40 KB of new JSON.

## Security

The change is static data plus pure functions. There are no network calls and no
new dependencies. The user-provided surname is only rendered as React text
(escaped) and compared against the blocklist, never interpreted.

## Testing

- `tests/coolName.test.ts`:
  - a fixed seed returns a first + middle pair
  - the initial filter is honoured
  - `scorePair` prefers 2+2+1 over 1+1+1
  - clean-break and alliteration penalties apply
  - a surname rhyme is penalised
  - `analysis` fields are populated
- `tests/bullySafe.test.ts`:
  - rejected: blocked whole words, nicknames ("Taiga" → "tai"), initials ("B·A·B"
    with *Budi*) and the phrase "Never Lie"
  - accepted: Cassian, Tristan, Bastian
- `tests/coolData.test.ts`:
  - every entry has a non-empty bilingual meaning and 1–2 vibes
  - `syllables` is within ±1 of `countSyllables(name)`
  - unique ids
  - every entry passes `isBullySafe([name], '')`
- App test: the default mode is Keren, gender is L, and a generated name shows a
  cadence line.
