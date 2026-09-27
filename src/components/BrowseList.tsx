import { useMemo, useState } from 'react';
import { COMMON_NAMES } from '../data';
import { ORIGINS, ORIGIN_LABELS, type CommonName, type Gender, type Origin } from '../types';

const LETTERS = ['all', ...'abcdefghijklmnopqrstuvwxyz'];
const GENDER_ICON: Record<Gender, string> = { L: '♂', P: '♀', N: '⚥' };

/**
 * Group the given-name dictionary by origin for one initial letter (or 'all') + gender,
 * optionally keeping only names whose name or meaning (ID/EN) contains `query`.
 */
export function browseGroups(letter: string, gender: Gender, query = ''): [Origin, CommonName[]][] {
  const q = query.trim().toLowerCase();
  const pool = COMMON_NAMES.filter(
    (n) =>
      (letter === 'all' || n.initial === letter) &&
      (gender === 'N' || n.gender === gender || n.gender === 'N') &&
      (!q || `${n.name}\n${n.meaning.id}\n${n.meaning.en}`.toLowerCase().includes(q)),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const byOrigin = new Map<Origin, CommonName[]>();
  for (const n of pool) {
    const list = byOrigin.get(n.origin) ?? [];
    list.push(n);
    byOrigin.set(n.origin, list);
  }
  return ORIGINS.filter((o) => byOrigin.has(o)).map((o) => [o, byOrigin.get(o)!]);
}

/** A–Z index of every attested first name, grouped by etymology. */
export default function BrowseList({ gender }: { gender: Gender }) {
  const [letter, setLetter] = useState('a');
  const [query, setQuery] = useState('');
  // The keyword filter lives in the "Semua" view only.
  const activeQuery = letter === 'all' ? query : '';
  const groups = useMemo(() => browseGroups(letter, gender, activeQuery), [letter, gender, activeQuery]);
  const total = groups.reduce((sum, [, names]) => sum + names.length, 0);

  return (
    <div className="browse">
      <div className="chips browse__letters">
        {LETTERS.map((l) => (
          <button
            key={l}
            type="button"
            className="chip"
            aria-pressed={letter === l}
            onClick={() => setLetter(l)}
          >
            {l === 'all' ? 'Semua' : l.toUpperCase()}
          </button>
        ))}
      </div>
      {letter === 'all' && (
        <div className="field">
          <label className="field__label" htmlFor="browse-search">
            Cari kata kunci <span className="field__hint">/ Filter by keyword (name or meaning)</span>
          </label>
          <input
            id="browse-search"
            type="search"
            placeholder="mis. God, Tuhan, cahaya"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      <p className="field__hint">
        {letter === 'all'
          ? activeQuery.trim()
            ? `${total} nama cocok «${activeQuery.trim()}» · names matching “${activeQuery.trim()}”`
            : `${total} nama, semua huruf · all names A–Z`
          : `${total} nama berawalan «${letter.toUpperCase()}» · names starting with “${letter.toUpperCase()}”`}
      </p>
      {groups.map(([origin, names]) => (
        <section key={origin} className="browse__group">
          <h3 className="browse__title">
            {ORIGIN_LABELS[origin].id}{' '}
            <span className="field__hint">/ {ORIGIN_LABELS[origin].en} — {names.length}</span>
          </h3>
          <ul className="browse__list">
            {names.map((n) => (
              <li key={n.id} className="browse__item">
                <strong>{n.name}</strong> <span className="browse__gender">{GENDER_ICON[n.gender]}</span>
                <span className="browse__meaning">{n.meaning.id}</span>
                {n.meaning.en !== n.meaning.id && <span className="browse__meaning" lang="en">{n.meaning.en}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
