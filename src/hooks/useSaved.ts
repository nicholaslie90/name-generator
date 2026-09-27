import { useState } from 'react';

export interface SavedName {
  name: string;
  meaning: { id: string; en: string };
}

const KEY = 'saved-names';
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function load(): SavedName[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v)
      ? v.filter(
          (s): s is SavedName =>
            typeof s?.name === 'string' && typeof s?.meaning?.id === 'string' && typeof s?.meaning?.en === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

/** Names the user has hearted, kept in this browser's localStorage. */
export function useSaved() {
  const [saved, setSaved] = useState(load);
  const isSaved = (name: string) => saved.some((s) => same(s.name, name));
  const toggle = (entry: SavedName) =>
    setSaved((prev) => {
      const next = prev.some((s) => same(s.name, entry.name))
        ? prev.filter((s) => !same(s.name, entry.name))
        : [...prev, entry];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private mode / blocked storage: keep the in-memory list for this visit.
      }
      return next;
    });
  return { saved, isSaved, toggle };
}
