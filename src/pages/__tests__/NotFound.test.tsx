import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import '@/i18n';
import NotFound from '../errors/NotFound';

describe('NotFound page', () => {
  it('explains the missing route and leads back to the converter', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/no/such/page']}>
        <Routes>
          <Route path="/" element={<p>converter page</p>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText(/this route doesn't exist/)).toBeInTheDocument();
    expect(document.title).toBe('Page not found · JSONPrism');

    await user.click(screen.getByRole('link', { name: 'Back to Convert' }));
    expect(screen.getByText('converter page')).toBeInTheDocument();
  });
});
