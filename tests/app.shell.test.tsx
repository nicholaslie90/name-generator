// tests/app.shell.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';

describe('App shell: modal + minimal main view', () => {
  it('hides the form until the customize button is pressed', () => {
    render(<App />);
    expect(screen.queryByText(/Gaya nama/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    expect(screen.getByText(/Gaya nama/)).toBeInTheDocument();
  });

  it('closes the modal on Escape', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the previous arrow is disabled on first load', () => {
    render(<App />);
    expect(screen.getByLabelText('Nama sebelumnya')).toBeDisabled();
  });

  it('does not render the old header, footer, or counter', () => {
    render(<App />);
    expect(screen.queryByText('Name Generator')).not.toBeInTheDocument();
    expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument();
  });
});
