import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomizationPanel from '../src/components/CustomizationPanel';
import type { FormState } from '../src/components/ParameterForm';
import type { WordAnalysis } from '../src/lib/generator';

const FORM: FormState = { nameStyle: 'familiar', surname: '', gender: 'N', slots: [{}, {}] };

function base(over: Partial<React.ComponentProps<typeof CustomizationPanel>> = {}) {
  const props = {
    form: FORM,
    onFormChange: vi.fn(),
    onGenerate: vi.fn(),
    style: 'elegant' as const,
    onStyleChange: vi.fn(),
    nameFont: 'great-vibes' as const,
    onNameFontChange: vi.fn(),
    frameRef: createRef<HTMLDivElement>(),
    exportName: 'Sara',
    exportSurname: '',
    onReset: vi.fn(),
    ...over,
  };
  render(<CustomizationPanel {...props} />);
  return props;
}

const WORDS: WordAnalysis[] = [
  {
    raw: 'Sara',
    candidates: [
      { kind: 'exact', displayName: 'Sara', elements: [], meaning: { id: 'putri', en: 'princess' }, origins: ['ibrani'] },
      { kind: 'exact', displayName: 'Sara', elements: [], meaning: { id: 'murni', en: 'pure' }, origins: ['arab'] },
    ],
  },
];

describe('CustomizationPanel', () => {
  it('shows the form, style switch, font switch, export and reset', () => {
    base();
    expect(screen.getByText(/Gaya nama/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Frame style/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Name font/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Unduh PNG · Download PNG')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset')).toBeInTheDocument();
  });

  it('in analyze mode shows candidate chips and hides Reset', async () => {
    const onSelectCandidate = vi.fn();
    base({
      form: { ...FORM, nameStyle: 'analyze', ownName: 'Sara' },
      wordAnalyses: WORDS,
      selections: [1],
      onSelectCandidate,
    });
    const group = screen.getByRole('group', { name: /Sara/ });
    const chips = within(group).getAllByRole('button');
    expect(chips).toHaveLength(2);
    expect(chips[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Reset')).not.toBeInTheDocument();
    await userEvent.click(chips[0]);
    expect(onSelectCandidate).toHaveBeenCalledWith(0, 0);
  });
});
