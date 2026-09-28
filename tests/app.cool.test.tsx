import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';
import styles from '../src/components/NameFrame.module.css';

const nameText = () => document.querySelector(`.${styles.name}`)?.textContent?.trim() ?? '';
const analysisText = () => document.querySelector(`.${styles.analysis}`)?.textContent ?? '';

describe('App: Keren mode is the default', () => {
  it('starts in Keren mode with a two-word boy name and an analysis line', () => {
    render(<App />);
    expect(nameText().split(/\s+/)).toHaveLength(2);
    expect(analysisText()).toMatch(/\d \+ \d/);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    expect(screen.getByRole('button', { name: 'Keren' })).toHaveAttribute('aria-pressed', 'true');
    // Gender and word-count controls are hidden in Keren mode.
    expect(screen.queryByRole('button', { name: 'Laki-laki' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3' })).not.toBeInTheDocument();
  });

  it('defaults to boys when switching to another mode', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    fireEvent.click(screen.getByRole('button', { name: 'Umum' }));
    expect(screen.getByRole('button', { name: 'Laki-laki' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('refreshes the analysis when the surname changes', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    const input = screen.getByPlaceholderText('mis. Santoso');
    fireEvent.change(input, { target: { value: 'L' } });
    fireEvent.change(input, { target: { value: 'Lie' } });
    expect(analysisText()).toMatch(/\+ 1/);
    expect(analysisText()).not.toMatch(/overlap with L\./);
  });

  it('twenty Next presses give twenty distinct names', () => {
    render(<App />);
    const seen = new Set([nameText()]);
    for (let i = 0; i < 19; i++) {
      fireEvent.click(screen.getByLabelText('Nama berikutnya'));
      seen.add(nameText());
    }
    expect(seen.size).toBe(20);
  });

  it('keeps the shown name while the surname is edited', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    const input = screen.getByPlaceholderText('mis. Santoso');
    fireEvent.change(input, { target: { value: 'L' } });
    const shown = nameText();
    fireEvent.change(input, { target: { value: 'Li' } });
    fireEvent.change(input, { target: { value: 'Lie' } });
    expect(nameText()).toBe(shown);
  });

  it('older cards show the analysis for the current surname', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    const input = screen.getByPlaceholderText('mis. Santoso');
    fireEvent.change(input, { target: { value: 'Santoso' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByLabelText('Nama berikutnya'));
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    fireEvent.change(screen.getByPlaceholderText('mis. Santoso'), { target: { value: 'Lie' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByLabelText('Nama sebelumnya'));
    expect(analysisText()).toMatch(/\+ 1 ·/);
  });

  it('defaults the first-name source to Campur and can switch to composed names', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    expect(screen.getByRole('button', { name: 'Campur' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Rangkaian' }));
    expect(analysisText()).toMatch(/Composed: /);
    fireEvent.click(screen.getByRole('button', { name: 'Asli' }));
    expect(analysisText()).not.toMatch(/Composed: /);
  });
});
