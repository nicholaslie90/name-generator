/** Etymological origin families. Expanded to cover the imported dictionary. */
export type Origin =
  | 'arab'
  | 'sanskerta'
  | 'latin'
  | 'ibrani'
  | 'yunani'
  | 'inggris'
  | 'keltik'
  | 'jermanik'
  | 'slavia'
  | 'afrika'
  | 'pasifik_asia'
  | 'jepang'
  | 'nordik'
  | 'persia'
  | 'nusantara'
  | 'lainnya';

/** All origins (used for labels and validation). */
export const ORIGINS: Origin[] = [
  'arab',
  'ibrani',
  'yunani',
  'latin',
  'inggris',
  'keltik',
  'jermanik',
  'sanskerta',
  'slavia',
  'afrika',
  'pasifik_asia',
  'jepang',
  'nordik',
  'persia',
  'nusantara',
  'lainnya',
];

/**
 * Origins that have building-block roots in the ELEMENTS dataset — only these
 * are offered in "composed" (per-syllable) mode.
 */
export const ELEMENT_ORIGINS: Origin[] = ['arab', 'sanskerta', 'latin', 'ibrani', 'yunani', 'jermanik', 'keltik', 'slavia', 'afrika', 'pasifik_asia', 'jepang', 'nordik', 'persia', 'nusantara'];

/** Origins offered in "familiar" mode (the full expanded set). */
export const COMMON_ORIGINS: Origin[] = ORIGINS;

/** Bilingual label for each origin, shown in the UI and the frame. */
export const ORIGIN_LABELS: Record<Origin, { id: string; en: string }> = {
  arab: { id: 'Arab', en: 'Arabic' },
  ibrani: { id: 'Ibrani', en: 'Hebrew' },
  yunani: { id: 'Yunani', en: 'Greek' },
  latin: { id: 'Latin & Roman', en: 'Latin & Romance' },
  inggris: { id: 'Inggris', en: 'English' },
  keltik: { id: 'Keltik', en: 'Celtic (Irish/Scottish/Welsh)' },
  jermanik: { id: 'Jermanik', en: 'Germanic (German)' },
  sanskerta: { id: 'Sanskerta & Hindu', en: 'Sanskrit & Hindu' },
  slavia: { id: 'Slavia', en: 'Slavic' },
  afrika: { id: 'Afrika', en: 'African' },
  pasifik_asia: { id: 'Pasifik & Asia', en: 'Pacific & Asian' },
  jepang: { id: 'Jepang', en: 'Japanese' },
  nordik: { id: 'Nordik', en: 'Norse/Scandinavian' },
  persia: { id: 'Persia & Turki', en: 'Persian & Turkic' },
  nusantara: { id: 'Nusantara', en: 'Nusantara (Javanese/Sundanese/Malay)' },
  lainnya: { id: 'Lainnya', en: 'Other' },
};

/** L = laki-laki (male), P = perempuan (female), N = netral (neutral/unisex). */
export type Gender = 'L' | 'P' | 'N';

/** Where an element reads best within an assembled name. */
export type Position = 'prefix' | 'suffix' | 'any';

/** A single name-building block (a syllable/root) with a bilingual meaning. */
export interface NameElement {
  id: string;
  text: string;
  /** Normalized lowercase first letter of `text`. */
  initial: string;
  origin: Origin;
  gender: Gender;
  meaning: { id: string; en: string };
  position?: Position;
}

/** A curated, attested given name used by the "familiar" name style. */
export interface CommonName {
  id: string;
  name: string;
  /** Normalized lowercase first letter of `name`. */
  initial: string;
  syllables: number;
  origin: Origin;
  gender: Gender;
  meaning: { id: string; en: string };
  /** True for names attested in the Bible (Old or New Testament). */
  biblical?: boolean;
  /** True for names with Islamic resonance (prophets, companions, common Muslim names). */
  islamic?: boolean;
}

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

/** Which generation style the user picked. */
export type NameStyle = 'cool' | 'familiar' | 'composed' | 'meaning' | 'analyze' | 'browse';

/** Per-syllable constraints chosen by the user. */
export interface SlotConstraint {
  /** Optional desired initial letter (lowercase). Empty = any. */
  initial?: string;
  /** Optional subset of origins for this slot. Empty/undefined = all. */
  origins?: Origin[];
}

export interface GenerateRequest {
  surname: string;
  gender: Gender;
  slots: SlotConstraint[];
  /** When true, each slot may fuse 1–2 roots into a single word (samasa style). */
  fuse?: boolean;
}

export interface FamiliarRequest {
  surname: string;
  gender: Gender;
  /** Number of words (name parts) in the generated full name. */
  words: number;
  /** Optional desired first letter of the first word (lowercase). Empty = auto. */
  initial?: string;
  /** Optional subset of origins. Empty/undefined = all. */
  origins?: Origin[];
  /** When true, force every word to share one (randomly chosen) origin. */
  sameOrigin?: boolean;
  /** When true, draw only from names attested in the Bible. */
  biblicalOnly?: boolean;
  /** When true, draw only from names with Islamic resonance. */
  islamicOnly?: boolean;
}

export interface MeaningRequest {
  surname: string;
  gender: Gender;
  /** Number of words (name parts) in the generated full name. */
  words: number;
  /** Raw meaning query, e.g. "joy, happy, glee" (comma/space separated). */
  query: string;
  /** When true, force every part to share one (randomly chosen) origin. */
  sameOrigin?: boolean;
}

export interface GeneratedName {
  name: string;
  surname: string;
  elements: NameElement[];
  /** Distinct origins used, in first-seen order. */
  origins: Origin[];
  /**
   * Number of roots per word. sum(wordGroups) === elements.length.
   * Absent => each element is its own word (backward compatible).
   */
  wordGroups?: number[];
  /** Keren-mode phonetic analysis, shown on the frame. */
  analysis?: { cadence: string; vibe: string; phonetics: string };
}

/** Returned instead of a name when a slot has no matching candidates. */
export interface GenerateError {
  error: 'empty-pool';
  /** Index of the slot (0-based) whose constraints matched nothing. */
  slotIndex: number;
  /** Optional mode-specific bilingual message shown in place of the default. */
  message?: { id: string; en: string };
}

export type GenerateResult = GeneratedName | GenerateError;

export function isGenerateError(r: GenerateResult): r is GenerateError {
  return 'error' in r;
}
