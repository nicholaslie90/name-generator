import { describe, it, expect } from 'vitest';
import { isBullySafe } from '../src/lib/bullySafe';

describe('isBullySafe', () => {
  it('accepts ordinary names', () => {
    expect(isBullySafe(['Lucan', 'Darren'], 'Lie')).toBe(true);
    expect(isBullySafe(['Zael', 'Marcus'], 'Lie')).toBe(true);
  });

  it('never blocks innocent look-alikes (no substring matching)', () => {
    for (const n of ['Cassian', 'Tristan', 'Bastian', 'Sebastian', 'Glasson']) {
      expect(isBullySafe([n], ''), n).toBe(true);
    }
  });

  it('rejects a blocklisted whole word', () => {
    expect(isBullySafe(['Randy', 'Arthur'], '')).toBe(false);
  });

  it('rejects a blocklisted nickname (3/4-letter prefix)', () => {
    expect(isBullySafe(['Taiga', 'Arthur'], '')).toBe(false); // "tai"
    expect(isBullySafe(['Dickson', 'Arthur'], '')).toBe(false); // "dick"
  });

  it('rejects bad 3-letter initials with the surname', () => {
    expect(isBullySafe(['Bastian', 'Arthur'], 'Budi')).toBe(false); // B·A·B
    expect(isBullySafe(['Aidan', 'Sven'], 'Utomo')).toBe(false); // A·S·U
  });

  it('rejects bad 2-letter initials without a surname', () => {
    expect(isBullySafe(['Benedict', 'Simon'], '')).toBe(false); // B·S
  });

  it('rejects middle + surname phrases', () => {
    expect(isBullySafe(['Lucan', 'Never'], 'Lie')).toBe(false);
  });

  it('normalizes messy surnames and uses the first surname word', () => {
    expect(isBullySafe(['Lucan', 'Never'], '  LIE  ')).toBe(false);
    expect(isBullySafe(['Lucan', 'Darren'], "O'Neil 123")).toBe(true);
    expect(isBullySafe(['Bastian', 'Arthur'], 'Budi Santoso')).toBe(false);
    expect(isBullySafe(['Lucan', 'Darren'], '')).toBe(true);
  });
});
