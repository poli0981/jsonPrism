import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@/i18n';
import { Footer } from '../Footer';

describe('Footer', () => {
  it('shows the app version and license', () => {
    render(<Footer />);
    expect(
      within(screen.getByRole('contentinfo')).getByText(
        `JSONPrism · v${__APP_VERSION__} · Apache-2.0`,
      ),
    ).toBeInTheDocument();
  });

  it.each([
    ['Discord', 'https://discord.gg/2aNR3aVt'],
    ['X (Twitter)', 'https://twitter.com/SkullMute0011'],
    ['Bluesky', 'https://bsky.app/profile/skullmute0011.bsky.social'],
  ])('links the %s community in a new tab', (name, href) => {
    render(<Footer />);
    const link = screen.getByRole('link', { name });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('title', name);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('credits the maintainer', () => {
    render(<Footer />);
    expect(screen.getByText('Built by')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'poli0981 (Kokone)' })).toHaveAttribute(
      'href',
      'https://github.com/poli0981',
    );
  });
});
