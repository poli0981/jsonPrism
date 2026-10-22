import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import { AppearanceMenu } from '../AppearanceMenu';
import { ThemeProvider } from '@/lib/theme';
import { THEME_STORAGE_KEY } from '@/lib/theme-dom';
import { PREFERENCES_KEY, usePreferencesStore } from '@/stores/preferencesStore';

function renderMenu() {
  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <AppearanceMenu />
      <button type="button">elsewhere</button>
    </ThemeProvider>,
  );
  return user;
}

const html = document.documentElement;
const trigger = () => screen.getByRole('button', { name: 'Appearance' });
const queryPanel = () => screen.queryByRole('group', { name: 'Appearance' });
const triggerIcon = () => trigger().querySelector('svg');

beforeEach(() => {
  usePreferencesStore.setState({ hideScrollbars: false, analytics: true });
});

afterEach(() => {
  delete html.dataset['scrollbars'];
  html.classList.remove('dark');
  html.style.colorScheme = '';
});

describe('AppearanceMenu', () => {
  it('opens a labelled panel and focuses the current theme', async () => {
    const user = renderMenu();
    expect(trigger()).toHaveAttribute('aria-haspopup', 'true');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).not.toHaveAttribute('aria-controls');
    expect(queryPanel()).not.toBeInTheDocument();

    await user.click(trigger());
    const panel = screen.getByRole('group', { name: 'Appearance' });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', panel.id);

    const themes = within(screen.getByRole('radiogroup', { name: 'Theme' })).getAllByRole('radio');
    expect(themes.map((radio) => radio.textContent)).toEqual(['Light', 'Dark', 'System']);
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'System' })).toHaveFocus();
  });

  it('switches the theme and reflects it on the trigger', async () => {
    const user = renderMenu();
    expect(triggerIcon()).toHaveClass('lucide-monitor');

    await user.click(trigger());
    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'System' })).not.toBeChecked();
    expect(html).not.toHaveClass('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(triggerIcon()).toHaveClass('lucide-sun');

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(html).toHaveClass('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(triggerIcon()).toHaveClass('lucide-moon');
    // Choosing a theme keeps the panel open for further tweaks.
    expect(queryPanel()).toBeInTheDocument();
  });

  it('moves focus through the menu with arrow keys, Home and End', async () => {
    const user = renderMenu();
    await user.click(trigger());
    const items = [
      screen.getByRole('radio', { name: 'Light' }),
      screen.getByRole('radio', { name: 'Dark' }),
      screen.getByRole('radio', { name: 'System' }),
      screen.getByRole('switch', { name: 'Hide scrollbars' }),
      screen.getByRole('switch', { name: 'Anonymous usage analytics' }),
    ];
    expect(items[2]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(items[3]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(items[4]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(items[4]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{End}');
    expect(items[4]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(items[4]).toHaveFocus();
  });

  it('hides scrollbars app-wide from the display switch or its label', async () => {
    const user = renderMenu();
    await user.click(trigger());
    const toggle = screen.getByRole('switch', { name: 'Hide scrollbars' });
    expect(toggle).not.toBeChecked();

    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(html.dataset['scrollbars']).toBe('hidden');
    expect(usePreferencesStore.getState().hideScrollbars).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) as string)).toMatchObject({
      hideScrollbars: true,
    });

    await user.click(screen.getByText('Hide scrollbars'));
    expect(toggle).not.toBeChecked();
    expect(html.dataset['scrollbars']).toBeUndefined();
  });

  it('lets web users opt out of anonymous analytics', async () => {
    const user = renderMenu();
    await user.click(trigger());
    const toggle = screen.getByRole('switch', { name: 'Anonymous usage analytics' });
    expect(toggle).toHaveAccessibleDescription(
      'Cloudflare Web Analytics, no cookies. Turning it off applies from your next visit.',
    );
    expect(toggle).toBeChecked();

    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(usePreferencesStore.getState().analytics).toBe(false);
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = renderMenu();
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(queryPanel()).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveFocus();
  });

  it('closes on a click outside, but not on clicks inside', async () => {
    const user = renderMenu();
    await user.click(trigger());
    await user.click(screen.getByText('Display & privacy'));
    expect(queryPanel()).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(queryPanel()).not.toBeInTheDocument();
  });

  it('toggles closed from the trigger', async () => {
    const user = renderMenu();
    await user.click(trigger());
    await user.click(trigger());
    expect(queryPanel()).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });
});
