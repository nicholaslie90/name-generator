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
