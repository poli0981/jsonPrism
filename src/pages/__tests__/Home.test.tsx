import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/i18n';
import { Home } from '../Home';

// The workspace pulls in the editor and every parser; it has its own tests.
vi.mock('@/components/converter/ConverterWorkspace', () => ({
  ConverterWorkspace: () => <section aria-label="Converter workspace" />,
}));

describe('Home page', () => {
  it('introduces the converter above the workspace', () => {
    render(<Home />);
    expect(screen.getByText('JSON → 12 formats · and back')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Disperse JSON.' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'One JSON input, twelve formats — and back. Conversion runs on your device.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Up to 500 files at once/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Converter workspace' })).toBeInTheDocument();
  });
});
