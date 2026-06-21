import { describe, it, expect } from 'vitest';
import { analyzeName } from '../src/lib/generator';
import { isGenerateError, type CommonName, type GeneratedName, type NameElement } from '../src/types';

const NAMES: CommonName[] = [
  { id: 'c1', name: 'Sophia', initial: 's', syllables: 3, origin: 'latin', gender: 'P', meaning: { id: 'kebijaksanaan', en: 'wisdom' } },
  { id: 'c2', name: 'David', initial: 'd', syllables: 2, origin: 'ibrani', gender: 'L', meaning: { id: 'dikasihi', en: 'beloved' }, biblical: true },
];

const ELEMENTS: NameElement[] = [
  { id: 'a-nur', text: 'nur', initial: 'n', origin: 'arab', gender: 'N', meaning: { id: 'cahaya', en: 'light' } },
  { id: 's-wira', text: 'wira', initial: 'w', origin: 'sanskerta', gender: 'L', meaning: { id: 'pahlawan', en: 'hero' } },
];

function analyze(input: string) {
  return analyzeName(input, NAMES, ELEMENTS);
}

describe('analyzeName', () => {
  it('returns the meaning + origin of an exactly matched known name', () => {
    const r = analyze('Sophia');
    expect(isGenerateError(r)).toBe(false);
    const g = r as GeneratedName;
    expect(g.name).toBe('Sophia');
    expect(g.elements).toHaveLength(1);
    expect(g.elements[0].meaning.en).toBe('wisdom');
    expect(g.origins).toEqual(['latin']);
  });

  it('matches case-insensitively', () => {
    const g = analyze('sOpHiA') as GeneratedName;
    expect(g.elements[0].meaning.id).toBe('kebijaksanaan');
  });

  it('decomposes an unknown word into known roots', () => {
    const g = analyze('Nuralia') as GeneratedName;
    // contains the root "nur" (light, arab)
    expect(g.elements.some((e) => e.id === 'a-nur')).toBe(true);
    expect(g.origins).toContain('arab');
  });

  it('analyzes each word of a multi-word name', () => {
    const g = analyze('Sophia Nur') as GeneratedName;
    expect(g.name).toBe('Sophia Nur');
    expect(g.elements.map((e) => e.meaning.en)).toEqual(['wisdom', 'light']);
    expect(g.origins).toEqual(['latin', 'arab']);
  });

  it('falls back to a "not found" meaning for an unmatched word (still a valid result)', () => {
    const r = analyze('Xyzqq');
    expect(isGenerateError(r)).toBe(false);
    const g = r as GeneratedName;
    expect(g.name).toBe('Xyzqq');
    expect(g.elements).toHaveLength(1);
    expect(g.elements[0].meaning.id.toLowerCase()).toContain('tidak ditemukan');
    expect(g.elements[0].meaning.en.toLowerCase()).toContain('not found');
  });

  it('preserves the typed casing of the name', () => {
    const g = analyze('  Aira   Nuraini  ') as GeneratedName;
    expect(g.name).toBe('Aira Nuraini');
  });

  it('returns an error with a message for empty input', () => {
    const r = analyze('   ');
    expect(isGenerateError(r)).toBe(true);
    if (isGenerateError(r)) {
      expect(r.slotIndex).toBe(-1);
      expect(r.message).toBeDefined();
    }
  });
});
