import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import '@/i18n';
import { LanguageSwitcher } from '../LanguageSwitcher';

afterEach(async () => {
  await act(() => i18n.changeLanguage('en'));
});

describe('LanguageSwitcher', () => {
  it('offers every UI language and marks the current one', () => {
    render(<LanguageSwitcher />);
    const group = screen.getByRole('group', { name: 'Language' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['EN', 'VI', 'JA', 'ZH']);
    expect(within(group).getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(group).getByRole('button', { name: '日本語' })).toHaveAttribute('lang', 'ja');
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  });

  it('switches the UI language and <html lang> from the button group', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Tiếng Việt' }));
    expect(i18n.resolvedLanguage).toBe('vi');
    expect(document.documentElement.lang).toBe('vi');
    expect(screen.getByRole('button', { name: 'Tiếng Việt' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(window.localStorage.getItem('jsonprism.lang')).toBe('vi');
  });

  it('switches the UI language from the compact select on phones', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.selectOptions(screen.getByRole('combobox'), 'zh-CN');
    expect(i18n.resolvedLanguage).toBe('zh-CN');
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(screen.getByRole('combobox')).toHaveValue('zh-CN');
    expect(screen.getByRole('button', { name: '简体中文' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('treats the UI as English until a language has resolved', async () => {
    const unresolved = createInstance();
    await unresolved.init({ resources: {} });
    expect(unresolved.resolvedLanguage).toBeUndefined();

    render(
      <I18nextProvider i18n={unresolved}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );
    expect(screen.getByRole('combobox')).toHaveValue('en');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  });
});
