import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordCandidateChips from '../src/components/WordCandidateChips';
import type { WordAnalysis } from '../src/lib/generator';

const WORDS: WordAnalysis[] = [
  {
    raw: 'Sara',
    candidates: [
      { kind: 'exact', displayName: 'Sara', elements: [], meaning: { id: 'putri', en: 'princess' }, origins: ['ibrani'] },
      { kind: 'exact', displayName: 'Sara', elements: [], meaning: { id: 'murni', en: 'pure' }, origins: ['arab'] },
    ],
  },
];

describe('WordCandidateChips', () => {
  it('renders a group per word with its candidate chips', () => {
    render(<WordCandidateChips words={WORDS} selections={[0]} onSelect={() => {}} />);
    expect(screen.getByRole('group', { name: /Sara/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('putri')).toBeInTheDocument();
    expect(screen.getByText('murni')).toBeInTheDocument();
  });

  it('marks the selected chip and calls onSelect on click', async () => {
    const onSelect = vi.fn();
    render(<WordCandidateChips words={WORDS} selections={[0]} onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith(0, 1);
  });

  it('renders nothing for no words', () => {
    const { container } = render(<WordCandidateChips words={[]} selections={[]} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
