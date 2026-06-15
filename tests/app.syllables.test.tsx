import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../src/App';
import { COMMON_NAMES } from '../src/data';
import styles from '../src/components/NameFrame.module.css';

function syllablesOf(name: string): number | undefined {
  return COMMON_NAMES.find((n) => n.name === name)?.syllables;
}

function generatedName(): string {
  const el = document.querySelector(`.${styles.name}`);
  return el?.textContent?.trim() ?? '';
}

function setSyllables(count: number) {
  // The syllable segmented control: buttons labelled "2", "3", "4".
  fireEvent.click(screen.getByRole('button', { name: String(count) }));
}

function clickGenerate() {
  fireEvent.click(screen.getByRole('button', { name: /Buat Nama/i }));
}

describe('App: syllable count affects generated familiar names', () => {
  it('generated names match the selected syllable count', () => {
    render(<App />);

    for (const count of [2, 3, 4]) {
      setSyllables(count);
      const got: number[] = [];
      for (let i = 0; i < 8; i++) {
        clickGenerate();
        const name = generatedName();
        const syl = syllablesOf(name);
        if (syl !== undefined) got.push(syl);
      }
      // every generated name should have exactly the selected syllable count
      expect(got.length, `count=${count}: produced names`).toBeGreaterThan(0);
      expect(got.every((s) => s === count), `count=${count}: got ${got.join(',')}`).toBe(true);
    }
  });

  it('auto-regenerates the preview when the syllable count changes (no Generate click)', () => {
    render(<App />);
    setSyllables(2);
    clickGenerate();
    expect(syllablesOf(generatedName())).toBe(2);

    // Changing the count alone should refresh the displayed name.
    setSyllables(4);
    expect(syllablesOf(generatedName())).toBe(4);
    setSyllables(3);
    expect(syllablesOf(generatedName())).toBe(3);
  });

  it('the visible counter and frame update on regenerate', () => {
    render(<App />);
    setSyllables(2);
    clickGenerate();
    const first = generatedName();
    expect(first).not.toBe('');
    const panel = screen.getByText(/Regenerate/i).closest('.result') as HTMLElement;
    expect(within(panel).getByText(/1 \/ 1/)).toBeTruthy();
  });
});
