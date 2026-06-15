import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../src/App';
import styles from '../src/components/NameFrame.module.css';

function generatedName(): string {
  return document.querySelector(`.${styles.name}`)?.textContent?.trim() ?? '';
}

function wordCount(): number {
  const n = generatedName();
  return n ? n.split(/\s+/).length : 0;
}

function setWords(count: number) {
  fireEvent.click(screen.getByRole('button', { name: String(count) }));
}

function clickGenerate() {
  fireEvent.click(screen.getByRole('button', { name: /Buat Nama/i }));
}

describe('App: word count controls how many words the name has', () => {
  it('generated names have exactly the selected number of words', () => {
    render(<App />);
    for (const count of [2, 3, 4]) {
      setWords(count);
      for (let i = 0; i < 6; i++) {
        clickGenerate();
        expect(wordCount(), `count=${count}, name="${generatedName()}"`).toBe(count);
      }
    }
  });

  it('auto-regenerates with the new word count when changed (no Generate click)', () => {
    render(<App />);
    setWords(2);
    clickGenerate();
    expect(wordCount()).toBe(2);
    setWords(4);
    expect(wordCount()).toBe(4);
    setWords(3);
    expect(wordCount()).toBe(3);
  });

  it('shows the position counter on first generation', () => {
    render(<App />);
    setWords(2);
    clickGenerate();
    const panel = screen.getByText(/Regenerate/i).closest('.result') as HTMLElement;
    expect(within(panel).getByText(/1 \/ 1/)).toBeTruthy();
  });
});
