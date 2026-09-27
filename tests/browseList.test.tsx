import { describe, it, expect } from 'vitest';
import { browseGroups } from '../src/components/BrowseList';
import { COMMON_NAMES } from '../src/data';

describe('browseGroups', () => {
  it('returns every name for the letter across all etymologies, grouped by origin', () => {
    const groups = browseGroups('a', 'N');
    const total = groups.reduce((sum, [, names]) => sum + names.length, 0);
    expect(total).toBe(COMMON_NAMES.filter((n) => n.initial === 'a').length);
    // Every listed name starts with the letter; each group is one origin.
    for (const [origin, names] of groups) {
      for (const n of names) {
        expect(n.initial).toBe('a');
        expect(n.origin).toBe(origin);
      }
    }
    expect(groups.length).toBeGreaterThan(1);
  });

  it("'all' returns every name across all letters", () => {
    const total = browseGroups('all', 'N').reduce((sum, [, names]) => sum + names.length, 0);
    expect(total).toBe(COMMON_NAMES.length);
  });

  it('gender L keeps male + neutral names only', () => {
    const names = browseGroups('a', 'L').flatMap(([, ns]) => ns);
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((n) => n.gender === 'L' || n.gender === 'N')).toBe(true);
  });
});
