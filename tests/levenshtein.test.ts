import { describe, it, expect } from 'vitest';
import { levenshtein } from '../src/lib/generator';

describe('levenshtein', () => {
  it('is 0 for identical strings', () => {
    expect(levenshtein('marcus', 'marcus')).toBe(0);
  });
  it('counts single edits', () => {
    expect(levenshtein('markus', 'marcus')).toBe(1); // k->c
    expect(levenshtein('sara', 'sarah')).toBe(1);    // insert h
  });
  it('counts two edits', () => {
    expect(levenshtein('markus', 'mark')).toBe(2);   // delete u, s
  });
  it('is symmetric', () => {
    expect(levenshtein('abc', 'xabc')).toBe(levenshtein('xabc', 'abc'));
  });
});
