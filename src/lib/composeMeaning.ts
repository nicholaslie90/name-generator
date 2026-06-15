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
  const idParts = g.elements.map((e) => capitalize(e.meaning.id));
  const enParts = g.elements.map((e) => capitalize(e.meaning.en));

  if (g.elements.length === 1) {
    return { id: idParts[0], en: enParts[0] };
  }

  return { id: idParts.join(' · '), en: enParts.join(' · ') };
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
