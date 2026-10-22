import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import '@/i18n';
import ErrorRoute from '../errors/ErrorRoute';

function renderAt(path: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>converter page</p>} />
        <Route path="/error/:code" element={<ErrorRoute />} />
        {/* Same page without the param: the component must cope with a missing code. */}
        <Route path="/error" element={<ErrorRoute />} />
      </Routes>
    </MemoryRouter>,
  );
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ErrorRoute', () => {
  it.each([
    ['403', 'Forbidden', "You don't have permission to view this."],
    ['404', 'Page not found', "The prism only refracts what's here — this route doesn't exist."],
    ['419', 'Session expired', 'Your session timed out. Reload to start fresh.'],
    ['500', 'Server error', 'Something broke on the way back. Try again in a moment.'],
  ])('shows dedicated copy for %s', (code, title, message) => {
    renderAt(`/error/${code}`);
    expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('uses generic copy for other codes but still shows the code', () => {
    renderAt('/error/502');
    expect(screen.getByText('502')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('An unexpected error occurred. Try reloading the page.'),
    ).toBeInTheDocument();
  });

  it('shows a placeholder when there is no code at all', () => {
    renderAt('/error');
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument();
  });

  it('leads back to the converter', async () => {
    const user = renderAt('/error/500');
    await user.click(screen.getByRole('link', { name: 'Back to Convert' }));
    expect(screen.getByText('converter page')).toBeInTheDocument();
  });

  it('reloads the page on request', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const user = renderAt('/error/419');
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
