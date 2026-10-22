import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import '@/i18n';
import { Header } from '../Header';
import { REPO_URL } from '@/lib/links';
import { ThemeProvider } from '@/lib/theme';

function renderHeader(path = '/') {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <Header />
        <Routes>
          <Route path="/" element={<p>converter page</p>} />
          <Route path="/about" element={<p>about page</p>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
  return user;
}

const nav = () => screen.getByRole('navigation', { name: 'Main' });

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('Header', () => {
  it('links the brand home and shows the build version and commit', () => {
    renderHeader('/about');
    const brand = within(screen.getByRole('banner')).getByRole('link', { name: 'JSONPrism home' });
    expect(brand).toHaveAttribute('href', '/');
    expect(within(brand).getByText(`v${__APP_VERSION__} · ${__APP_COMMIT__}`)).toBeInTheDocument();
  });

  it('marks the current page in the main navigation', async () => {
    const user = renderHeader('/');
    const convert = within(nav()).getByRole('link', { name: 'Convert' });
    const about = within(nav()).getByRole('link', { name: 'About' });
    expect(convert).toHaveAttribute('href', '/');
    expect(convert).toHaveAttribute('aria-current', 'page');
    expect(about).not.toHaveAttribute('aria-current');

    await user.click(about);
    expect(screen.getByText('about page')).toBeInTheDocument();
    expect(about).toHaveAttribute('aria-current', 'page');
    // `end` keeps "Convert" from matching every nested route.
    expect(convert).not.toHaveAttribute('aria-current');
  });

  it('opens the GitHub repository in a new tab', () => {
    renderHeader();
    const github = screen.getByRole('link', { name: 'GitHub' });
    expect(github).toHaveAttribute('href', REPO_URL);
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noreferrer');
  });

  it('hosts the language switcher and appearance menu', () => {
    renderHeader();
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('group', { name: 'Language' })).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: 'Appearance' })).toBeInTheDocument();
  });
});
