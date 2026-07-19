import { useMemo, useState } from 'react';
import { COMMON_NAMES } from '../data';
import { ORIGINS, ORIGIN_LABELS, type CommonName, type Gender, type Origin } from '../types';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const GENDER_ICON: Record<Gender, string> = { L: '♂', P: '♀', N: '⚥' };

/** Group the given-name dictionary by origin for one initial letter + gender. */
export function browseGroups(letter: string, gender: Gender): [Origin, CommonName[]][] {
  const pool = COMMON_NAMES.filter(
    (n) => n.initial === letter && (gender === 'N' || n.gender === gender || n.gender === 'N'),
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
  const groups = useMemo(() => browseGroups(letter, gender), [letter, gender]);
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
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="field__hint">
        {total} nama berawalan «{letter.toUpperCase()}» · names starting with “{letter.toUpperCase()}”
      </p>
      {groups.map(([origin, names]) => (
        <section key={origin} className="browse__group">
          <h3 className="browse__title">
            {ORIGIN_LABELS[origin].id}{' '}
            <span className="field__hint">/ {ORIGIN_LABELS[origin].en} — {names.length}</span>
          </h3>
          <ul className="browse__list">
            {names.map((n) => (
              <li key={n.id} className="browse__item" title={n.meaning.en}>
                <strong>{n.name}</strong> <span className="browse__gender">{GENDER_ICON[n.gender]}</span>
                <span className="browse__meaning">{n.meaning.id}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
