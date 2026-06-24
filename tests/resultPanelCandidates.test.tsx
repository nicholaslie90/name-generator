import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultPanel from '../src/components/ResultPanel';
import type { GeneratedName } from '../src/types';
import type { WordAnalysis } from '../src/lib/generator';

const CURRENT: GeneratedName = {
  name: 'Sara',
  surname: '',
  elements: [{ id: 's', text: 'sara', initial: 's', origin: 'arab', gender: 'P', meaning: { id: 'murni', en: 'pure' } }],
  origins: ['arab'],
  wordGroups: [1],
};

const WORDS: WordAnalysis[] = [
  {
    raw: 'Sara',
    candidates: [
      { kind: 'exact', displayName: 'Sara', elements: CURRENT.elements, meaning: { id: 'putri', en: 'princess' }, origins: ['ibrani'] },
      { kind: 'exact', displayName: 'Sara', elements: CURRENT.elements, meaning: { id: 'murni', en: 'pure' }, origins: ['arab'] },
    ],
  },
];

const noop = () => {};

describe('ResultPanel — analyze mode candidates', () => {
  it('renders candidate chips and hides the history nav when wordAnalyses is provided', async () => {
    const onSelectCandidate = vi.fn();
    render(
      <ResultPanel
        current={CURRENT}
        error={null}
        notice={null}
        position={{ index: 0, total: 1 }}
        canPrev={false}
        onPrev={noop}
        onNext={noop}
        onRegenerate={noop}
        onReset={noop}
        wordAnalyses={WORDS}
        selections={[1]}
        onSelectCandidate={onSelectCandidate}
      />,
    );
    const group = screen.getByRole('group', { name: /Sara/ });
    const chips = within(group).getAllByRole('button');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveAttribute('aria-pressed', 'false');
    expect(chips[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Nama sebelumnya')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nama berikutnya')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Buat lagi · Regenerate')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Reset')).not.toBeInTheDocument();
    await userEvent.click(chips[0]);
    expect(onSelectCandidate).toHaveBeenCalledWith(0, 0);
  });

  it('keeps the normal history nav when no wordAnalyses are given', () => {
    render(
      <ResultPanel
        current={CURRENT}
        error={null}
        notice={null}
        position={{ index: 0, total: 1 }}
        canPrev={false}
        onPrev={noop}
        onNext={noop}
        onRegenerate={noop}
        onReset={noop}
      />,
    );
    expect(screen.getByLabelText('Nama berikutnya')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Sara/ })).not.toBeInTheDocument();
  });
});
