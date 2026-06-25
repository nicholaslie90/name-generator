import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Deck from '../src/components/Deck';
import type { GeneratedName } from '../src/types';

const CURRENT: GeneratedName = {
  name: 'Sara',
  surname: '',
  elements: [{ id: 's', text: 'sara', initial: 's', origin: 'arab', gender: 'P', meaning: { id: 'murni', en: 'pure' } }],
  origins: ['arab'],
  wordGroups: [1],
};

function renderDeck(over: Partial<React.ComponentProps<typeof Deck>> = {}) {
  const props = {
    current: CURRENT,
    style: 'elegant' as const,
    nameFontFamily: undefined,
    error: null,
    notice: null,
    canPrev: true,
    onNext: vi.fn(),
    onPrev: vi.fn(),
    navDisabled: false,
    onOpenCustomize: vi.fn(),
    frameRef: createRef<HTMLDivElement>(),
    ...over,
  };
  render(<Deck {...props} />);
  return props;
}

describe('Deck', () => {
  it('renders the current name and the customize button', () => {
    const props = renderDeck();
    expect(screen.getByText('Sara')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    expect(props.onOpenCustomize).toHaveBeenCalledTimes(1);
  });

  it('right arrow calls onNext, left arrow calls onPrev', () => {
    const props = renderDeck();
    fireEvent.click(screen.getByLabelText('Nama berikutnya'));
    expect(props.onNext).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Nama sebelumnya'));
    expect(props.onPrev).toHaveBeenCalledTimes(1);
  });

  it('disables the left arrow when canPrev is false', () => {
    renderDeck({ canPrev: false });
    expect(screen.getByLabelText('Nama sebelumnya')).toBeDisabled();
  });

  it('hides the nav arrows when navDisabled', () => {
    renderDeck({ navDisabled: true });
    expect(screen.queryByLabelText('Nama berikutnya')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nama sebelumnya')).not.toBeInTheDocument();
  });

  it('maps ArrowRight/ArrowLeft keys to onNext/onPrev', () => {
    const props = renderDeck();
    const deck = screen.getByText('Sara').closest('.deck') as HTMLElement;
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(props.onNext).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(deck, { key: 'ArrowLeft' });
    expect(props.onPrev).toHaveBeenCalledTimes(1);
  });

  it('renders the error state with a retry that calls onNext', () => {
    const props = renderDeck({
      current: null,
      error: { error: 'empty-pool', slotIndex: -1, message: { id: 'Tidak ada', en: 'None' } },
    });
    expect(screen.getByText('Tidak ada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Coba lagi/ }));
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });
});
