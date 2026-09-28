import { describe, it, expect } from 'vitest';
import { fuseRoots, generateCoolName } from '../src/lib/coolName';
import { makeRng } from '../src/lib/generator';
import { isGenerateError, type CoolName, type FusionRoot } from '../src/types';

const root = (text: string, origin: FusionRoot['origin'], en: string, id = en): FusionRoot => ({
  id: `r-${text}`, text, origin, meaning: { id, en }, vibe: 'noble',
});
const arya = root('arya', 'sanskerta', 'noble', 'mulia');
const mir = root('mir', 'slavia', 'peace', 'damai');
const veli = root('veli', 'slavia', 'great');
const bene = root('bene', 'latin', 'good');
const el = root('el', 'ibrani', 'God');
const kast = root('kast', 'jermanik', 'x');
const tren = root('tren', 'keltik', 'y');

const real: CoolName = {
  id: 'cb-lucan', name: 'Lucan', role: 'first', syllables: 2, origin: 'latin', vibes: ['bright'],
  meaning: { id: 'dari Lucania', en: 'from Lucania' },
};
const middle: CoolName = {
  id: 'cb-marcus', name: 'Marcus', role: 'middle', syllables: 2, origin: 'latin', vibes: ['bold'],
  meaning: { id: 'untuk Mars', en: 'of Mars' },
};

describe('fuseRoots', () => {
  it('fuses a head and tail of different origins into a first name', () => {
    const n = fuseRoots(arya, mir)!;
    expect(n.name).toBe('Aryamir');
    expect(n.role).toBe('first');
    expect(n.syllables).toBe(3);
    expect(n.fusedFrom).toEqual([arya, mir]);
    expect(n.meaning.en).toBe('noble-peace');
    expect(n.meaning.id).toBe('mulia-damai');
  });

  it('refuses same-origin roots', () => {
    expect(fuseRoots(veli, mir)).toBeNull();
  });

  it('drops a doubled vowel at the seam', () => {
    expect(fuseRoots(bene, el)!.name).toBe('Benel');
  });

  it('rejects two roots with the same meaning', () => {
    expect(fuseRoots(root('nuru', 'afrika', 'light'), root('nur', 'arab', 'light'))).toBeNull();
  });

  it('rejects a vowel-to-vowel seam except before -el', () => {
    expect(fuseRoots(root('amani', 'afrika', 'peace'), root('ulf', 'nordik', 'wolf'))).toBeNull();
    expect(fuseRoots(arya, el)!.name).toBe('Aryael');
  });

  it('uses only the leading sense of each root in the meaning', () => {
    const n = fuseRoots(root('hard', 'jermanik', 'brave, strong', 'berani, kuat'), el)!;
    expect(n.meaning.en).toBe('brave-God');
    expect(n.meaning.id).toBe('berani-God');
  });

  it('rejects the same consonant meeting at the seam', () => {
    expect(fuseRoots(root('amir', 'arab', 'prince'), root('rex', 'latin', 'king'))).toBeNull();
  });

  it('rejects stuttering repeats like "rara" or "yaya"', () => {
    expect(fuseRoots(root('ezra', 'ibrani', 'help'), root('rad', 'slavia', 'joy'))).toBeNull();
    expect(fuseRoots(root('jaya', 'sanskerta', 'victory'), root('yar', 'persia', 'friend'))).toBeNull();
  });

  it('allows -el only after an "a"', () => {
    expect(fuseRoots(root('leo', 'latin', 'lion'), el)).toBeNull();
  });

  it('rejects unpronounceable clusters', () => {
    expect(fuseRoots(kast, tren)).toBeNull(); // "kasttren"
  });
});

describe('generateCoolName with composed names', () => {
  const fused = [fuseRoots(arya, mir)!, fuseRoots(bene, el)!];

  it("source 'fused' returns a composed first name with both roots in the elements", () => {
    const r = generateCoolName({ surname: 'Lie', source: 'fused' }, [real], [middle], makeRng(3), fused);
    if (isGenerateError(r)) throw new Error('unexpected error');
    expect(['Aryamir Marcus', 'Benel Marcus']).toContain(r.name);
    expect(r.elements).toHaveLength(3);
    expect(r.wordGroups).toEqual([2, 1]);
    expect(r.analysis?.phonetics).toMatch(/^Composed: /);
  });

  it("source 'real' never returns a composed name", () => {
    for (let s = 0; s < 20; s++) {
      const r = generateCoolName({ surname: '', source: 'real' }, [real], [middle], makeRng(s), fused);
      if (isGenerateError(r)) throw new Error('unexpected error');
      expect(r.name).toBe('Lucan Marcus');
    }
  });

  it("the default 'mix' draws from both sources", () => {
    const firsts = new Set<string>();
    for (let s = 0; s < 40; s++) {
      const r = generateCoolName({ surname: '' }, [real], [middle], makeRng(s), fused);
      if (!isGenerateError(r)) firsts.add(r.name.split(' ')[0]);
    }
    expect(firsts.has('Lucan')).toBe(true);
    expect([...firsts].some((n) => n !== 'Lucan')).toBe(true);
  });
});
