import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/i18n';
import { StatusBar, type ConversionState } from '../StatusBar';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderBar(props: Partial<Parameters<typeof StatusBar>[0]> = {}) {
  return render(
    <StatusBar
      state="idle"
      inputBytes={0}
      outputBytes={0}
      ms={null}
      precisionLoss={false}
      {...props}
    />,
  );
}

describe('StatusBar', () => {
  it.each<[ConversionState, string]>([
    ['idle', 'idle'],
    ['working', 'working'],
    ['ok', 'ok'],
    ['error', 'error'],
  ])('announces the %s state in a polite live region', (state, label) => {
    renderBar({ state });
    const live = screen.getByText(label).closest('[aria-live]');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  it('shows input and output sizes in human units', () => {
    renderBar({ inputBytes: 2048, outputBytes: 3 * 1024 * 1024 });
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    expect(screen.getByText('3.00 MB')).toBeInTheDocument();
  });

  it('shows the conversion time only once there is one', () => {
    const { rerender } = renderBar({ ms: null });
    expect(screen.queryByText(/ ms$/)).not.toBeInTheDocument();

    rerender(
      <StatusBar state="ok" inputBytes={10} outputBytes={12} ms={3.14159} precisionLoss={false} />,
    );
    expect(screen.getByText('3.1 ms')).toBeInTheDocument();
  });

  it('warns about precision loss with an explanatory hint', () => {
    const { rerender } = renderBar();
    expect(screen.queryByText('precision loss')).not.toBeInTheDocument();

    rerender(<StatusBar state="ok" inputBytes={1} outputBytes={1} ms={1} precisionLoss />);
    expect(screen.getByText('precision loss')).toHaveAttribute(
      'title',
      expect.stringContaining('±2^53'),
    );
  });

  it('lists the keyboard shortcuts with Ctrl outside macOS', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    renderBar();
    expect(screen.getByText('UTF-8')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+,')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('lists the keyboard shortcuts with Cmd on macOS', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    renderBar();
    expect(screen.getByText('Cmd+S')).toBeInTheDocument();
    expect(screen.getByText('Cmd+,')).toBeInTheDocument();
  });
});
