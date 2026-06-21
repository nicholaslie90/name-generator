/** Type surface for the offline EN→ID gloss enrichment tooling. */
export function translate(gloss: string): { id: string; total: number; hit: number; miss: string[] };
export const GLOSS: Record<string, string>;
export const FUNCTION: Record<string, string>;
export const ADJ: Set<string>;
export const JUNK: string[];
export function load(file: string): unknown;
