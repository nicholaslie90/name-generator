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
