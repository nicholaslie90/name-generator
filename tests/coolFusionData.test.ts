import { describe, it, expect } from 'vitest';
import { COOL_FIRST, COOL_FUSED, FUSION_HEADS, FUSION_TAILS } from '../src/data';
import fusionRoots from '../src/data/coolFusionRoots.json';
import { isBullySafe } from '../src/lib/bullySafe';
import { ORIGINS } from '../src/types';

const VIBES = ['noble', 'bright', 'bold', 'grounded', 'joyful', 'wise', 'modern', 'cosmopolitan'];

describe('fusion roots', () => {
  it('has enough heads and tails', () => {
    expect(FUSION_HEADS.length).toBeGreaterThanOrEqual(40);
    expect(FUSION_TAILS.length).toBeGreaterThanOrEqual(25);
  });

  it('every root is well-formed with unique ids and texts', () => {
    const all = [...FUSION_HEADS, ...FUSION_TAILS];
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
    for (const list of [FUSION_HEADS, FUSION_TAILS]) {
      expect(new Set(list.map((r) => r.text)).size).toBe(list.length);
    }
    for (const r of all) {
      expect(r.text, r.id).toMatch(/^[a-z]{2,5}$/);
      expect(r.meaning.id.trim(), r.id).not.toBe('');
      expect(r.meaning.en.trim(), r.id).not.toBe('');
      expect(VIBES, r.id).toContain(r.vibe);
      expect(ORIGINS, r.id).toContain(r.origin);
    }
  });
});

describe('composed Keren first names', () => {
  it('yields a large pool', () => {
    expect(COOL_FUSED.length).toBeGreaterThanOrEqual(500);
  });

  it('never produces a blocked name', () => {
    const blocked = new Set(fusionRoots.blockedNames);
    expect(blocked.size).toBeGreaterThan(0);
    for (const n of COOL_FUSED) expect(blocked.has(n.name), n.name).toBe(false);
  });

  it('never fuses two roots of the same origin', () => {
    for (const n of COOL_FUSED) expect(n.fusedFrom![0].origin, n.name).not.toBe(n.fusedFrom![1].origin);
  });

  it('every composed name is bully-safe, pronounceable and not a real Keren name', () => {
    const real = new Set(COOL_FIRST.map((n) => n.name));
    const names = new Set<string>();
    for (const n of COOL_FUSED) {
      expect(isBullySafe([n.name], ''), n.name).toBe(true);
      expect(n.name, n.name).toMatch(/^[A-Z][a-z]{3,7}$/);
      expect(n.name.toLowerCase(), n.name).not.toMatch(/[^aeiouy]{3}|([aeiou])\1/);
      expect(real.has(n.name), n.name).toBe(false);
      names.add(n.name);
    }
    expect(names.size).toBe(COOL_FUSED.length);
  });
});

describe('initial coverage', () => {
  it('offers plenty of varied first names starting with I', () => {
    const real = COOL_FIRST.filter((n) => n.name[0] === 'I');
    const fused = COOL_FUSED.filter((n) => n.name[0] === 'I');
    expect(real.length).toBeGreaterThanOrEqual(15);
    expect(real.length + fused.length).toBeGreaterThanOrEqual(60);
    expect(new Set(fused.map((n) => n.fusedFrom![0].text)).size).toBeGreaterThanOrEqual(4);
  });
});
