import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import BrowseList from '../src/components/BrowseList';

describe('saved names', () => {
  beforeEach(() => localStorage.clear());

  it('hearting a name persists it and lists it under Tersimpan', () => {
    const { unmount } = render(<BrowseList gender="L" />);
    fireEvent.click(screen.getAllByRole('button', { name: /^Simpan / })[0]);
    const stored = JSON.parse(localStorage.getItem('saved-names')!);
    expect(stored).toHaveLength(1);
    unmount();

    // A fresh mount reads it back from storage.
    render(<BrowseList gender="L" />);
    fireEvent.click(screen.getByRole('button', { name: /Tersimpan · 1/ }));
    expect(screen.getByText(stored[0].name)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Hapus / }));
    expect(JSON.parse(localStorage.getItem('saved-names')!)).toEqual([]);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem('saved-names', '{not json');
    render(<BrowseList gender="L" />);
    expect(screen.getByRole('button', { name: /Tersimpan · 0/ })).toBeInTheDocument();
  });
});
