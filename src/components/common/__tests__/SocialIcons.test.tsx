import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  BlueskyIcon,
  DiscordIcon,
  GithubIcon,
  MastodonIcon,
  TelegramIcon,
  XIcon,
  YoutubeIcon,
} from '../SocialIcons';

const ICONS = {
  BlueskyIcon,
  DiscordIcon,
  GithubIcon,
  MastodonIcon,
  TelegramIcon,
  XIcon,
  YoutubeIcon,
};

describe('SocialIcons', () => {
  it.each(Object.entries(ICONS))(
    '%s is a decorative glyph that inherits size and color',
    (_name, Icon) => {
      const { container } = render(<Icon className="h-4 w-4" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'currentColor');
      expect(svg).toHaveClass('h-4', 'w-4');
      expect(svg?.querySelector('path')?.getAttribute('d')).toMatch(/^M/);
    },
  );
});
