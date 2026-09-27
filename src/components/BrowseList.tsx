import { useMemo, useState } from 'react';
import { COMMON_NAMES } from '../data';
import { useSaved, type SavedName } from '../hooks/useSaved';
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

/** Heart toggle that adds/removes a name from the saved list. */
export function SaveButton({ entry, saved, onToggle }: { entry: SavedName; saved: boolean; onToggle: (e: SavedName) => void }) {
  return (
    <button
      type="button"
      className="save-btn"
      aria-pressed={saved}
      aria-label={`${saved ? 'Hapus' : 'Simpan'} ${entry.name} · ${saved ? 'Unsave' : 'Save'}`}
      onClick={() => onToggle({ name: entry.name, meaning: entry.meaning })}
    >
      {saved ? '♥' : '♡'}
    </button>
  );
}

/** A–Z index of every attested first name, grouped by etymology. */
export default function BrowseList({ gender }: { gender: Gender }) {
  const [letter, setLetter] = useState('a');
  const [query, setQuery] = useState('');
  // The keyword filter applies to Semua and single letters, not the saved list.
  const activeQuery = letter === 'saved' ? '' : query.trim();
  const { saved, isSaved, toggle } = useSaved();
  const [copied, setCopied] = useState(false);
  const groups = useMemo(
    () => (letter === 'saved' ? [] : browseGroups(letter, gender, activeQuery)),
    [letter, gender, activeQuery],
  );
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
        <button type="button" className="chip" aria-pressed={letter === 'saved'} onClick={() => setLetter('saved')}>
          ♥ Tersimpan · {saved.length}
        </button>
      </div>
      {letter === 'saved' && (
        <>
          <p className="field__hint">
            {saved.length
              ? `${saved.length} nama tersimpan di browser ini · saved in this browser`
              : 'Belum ada — ketuk ♡ pada nama · Nothing saved yet — tap ♡ on a name'}
          </p>
          {saved.length > 0 && (
            <button
              type="button"
              className="chip"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(saved.map((s) => `${s.name} — ${s.meaning.id} / ${s.meaning.en}`).join('\n'))
                  .then(() => setCopied(true), () => {})
              }
            >
              {copied ? '✓ Tersalin · Copied' : 'Salin daftar · Copy list'}
            </button>
          )}
          <ul className="browse__list browse__saved">
            {saved.map((s) => (
              <li key={s.name} className="browse__item">
                <SaveButton entry={s} saved onToggle={toggle} />
                <strong>{s.name}</strong>
                <span className="browse__meaning">{s.meaning.id}</span>
                {s.meaning.en !== s.meaning.id && <span className="browse__meaning" lang="en">{s.meaning.en}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {letter !== 'saved' && (
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
      {letter !== 'saved' && (
      <p className="field__hint">
        {letter === 'all'
          ? activeQuery
            ? `${total} nama cocok «${activeQuery}» · names matching “${activeQuery}”`
            : `${total} nama, semua huruf · all names A–Z`
          : activeQuery
            ? `${total} nama berawalan «${letter.toUpperCase()}» cocok «${activeQuery}» · names starting with “${letter.toUpperCase()}” matching “${activeQuery}”`
            : `${total} nama berawalan «${letter.toUpperCase()}» · names starting with “${letter.toUpperCase()}”`}
      </p>
      )}
      {letter === 'all' && groups.length > 1 && (
        <nav className="chips browse__jump" aria-label="Lompat ke etimologi / Jump to etymology">
          {groups.map(([origin, names]) => (
            <button
              key={origin}
              type="button"
              className="chip"
              onClick={() => document.getElementById(`browse-${origin}`)?.scrollIntoView?.({ behavior: 'smooth' })}
            >
              {ORIGIN_LABELS[origin].id} · {names.length}
            </button>
          ))}
        </nav>
      )}
      {groups.map(([origin, names]) => (
        <section key={origin} id={`browse-${origin}`} className="browse__group">
          <h3 className="browse__title">
            {ORIGIN_LABELS[origin].id}{' '}
            <span className="field__hint">/ {ORIGIN_LABELS[origin].en} — {names.length}</span>
          </h3>
          <ul className="browse__list">
            {names.map((n) => (
              <li key={n.id} className="browse__item">
                <SaveButton entry={n} saved={isSaved(n.name)} onToggle={toggle} />
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
