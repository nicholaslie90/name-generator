import { describe, it, expect } from 'vitest';
import { translate } from '../scripts/enrich-id-glosses.mjs';

/** The offline glossary translator (used to backfill Indonesian meanings). */
describe('translate — copula and possessive', () => {
  it('renders "X is my Y" as "X adalah Y-ku"', () => {
    expect(translate('God is my oath').id).toBe('Tuhan adalah sumpahku');
    expect(translate('God is my judge').id).toBe('Tuhan adalah hakimku');
    expect(translate('God is my father').id).toBe('Tuhan adalah ayahku');
  });

  it('treats a plain copula as "adalah" (no possessive)', () => {
    expect(translate('God is gracious').id).toBe('Tuhan adalah anggun');
  });

  it('renders a bare possessive as a suffix', () => {
    expect(translate('my God').id).toBe('Tuhanku');
  });

  it('does NOT insert "adalah" after "who is" (relative clause)', () => {
    expect(translate('one who is brave').id).toBe('yang berani');
  });

  it('leaves genitive "of" phrases unchanged', () => {
    expect(translate('gift of God').id).toBe('anugerah dari Tuhan');
  });
});
