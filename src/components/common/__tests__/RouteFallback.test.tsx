import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/i18n';
import { RouteFallback } from '../RouteFallback';

describe('RouteFallback', () => {
  it('shows a translated loading indicator while a route chunk streams in', () => {
    const { container } = render(<RouteFallback />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(container.querySelector('svg')).toHaveClass('animate-spin');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
