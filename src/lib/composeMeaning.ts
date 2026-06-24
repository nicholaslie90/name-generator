import { ORIGIN_LABELS, type GeneratedName, type Origin } from '../types';

interface Bilingual {
  id: string;
  en: string;
}

/**
 * Compose a bilingual meaning from the chosen words. Each word's meaning is
 * shown in order, separated by a middot — readable for multi-word names and
 * safe for English-only glosses.
 */
export function composeMeaning(g: GeneratedName): Bilingual {
  const groups = g.wordGroups ?? g.elements.map(() => 1);

  // Chunk elements into words per `groups`; any leftover becomes its own word.
  const words: GeneratedName['elements'][] = [];
  let idx = 0;
  for (const n of groups) {
    words.push(g.elements.slice(idx, idx + n));
    idx += n;
  }
  while (idx < g.elements.length) {
    words.push([g.elements[idx]]);
    idx += 1;
  }

  const render = (lang: 'id' | 'en'): string =>
    words
      .map((w) =>
        w.length === 1
          ? capitalize(w[0].meaning[lang])
          : [capitalize(firstSense(w[0].meaning[lang])), ...w.slice(1).map((e) => firstSense(e.meaning[lang]))].join('-'),
      )
      .join(' · ');

  return { id: render('id'), en: render('en') };
}

/** The leading sense of a gloss — text before the first comma, trimmed. */
function firstSense(s: string): string {
  const i = s.indexOf(',');
  return (i >= 0 ? s.slice(0, i) : s).trim();
}

/** A bilingual etymology line naming the distinct origins used. */
export function composeEtymology(g: GeneratedName): Bilingual {
  const labels = g.origins.map((o: Origin) => ORIGIN_LABELS[o]);
  return {
    id: `Etimologi: ${labels.map((l) => l.id).join(' · ')}`,
    en: `Etymology: ${labels.map((l) => l.en).join(' · ')}`,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
