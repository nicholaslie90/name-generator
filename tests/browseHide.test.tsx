import { render, screen, fireEvent, within } from '@testing-library/react';
import { it, expect } from 'vitest';
import BrowseList from '../src/components/BrowseList';
it('hide', () => {
  const { container } = render(<BrowseList gender="L" />);
  fireEvent.click(screen.getByText('Semua'));
  const before = container.querySelector('p.field__hint')!.textContent;
  const hide = container.querySelector('.browse__hide')!;
  fireEvent.click(within(hide as HTMLElement).getByText('Inggris'));
  const after = container.querySelector('p.field__hint')!.textContent;
  expect(after).not.toBe(before);
  expect(container.querySelector('#browse-inggris')).toBeNull();
  expect(within(screen.getByRole('navigation')).queryByText(/Inggris/)).toBeNull();
  fireEvent.click(screen.getByText('A'));
  expect(container.querySelector('#browse-inggris')).toBeNull();
  fireEvent.click(within(hide as HTMLElement).getByText('Inggris'));
  expect(container.querySelector('#browse-inggris')).not.toBeNull();
});
