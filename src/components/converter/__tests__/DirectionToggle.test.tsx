import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import { DirectionToggle } from '../DirectionToggle';

describe('DirectionToggle', () => {
  it('exposes both directions as a labelled group of toggle buttons', () => {
    render(<DirectionToggle value="forward" onChange={() => {}} />);
    const group = screen.getByRole('group', { name: 'Direction' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['JSON →', '→ JSON']);
    for (const button of buttons) {
      expect(button).toHaveAttribute('title', 'Switch the conversion direction');
    }
  });

  it('marks the active direction with aria-pressed', () => {
    const { rerender } = render(<DirectionToggle value="forward" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'JSON →' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '→ JSON' })).toHaveAttribute('aria-pressed', 'false');

    rerender(<DirectionToggle value="reverse" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'JSON →' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '→ JSON' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports the clicked direction', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DirectionToggle value="forward" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '→ JSON' }));
    expect(onChange).toHaveBeenLastCalledWith('reverse');

    await user.click(screen.getByRole('button', { name: 'JSON →' }));
    expect(onChange).toHaveBeenLastCalledWith('forward');
  });

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DirectionToggle value="forward" onChange={onChange} />);

    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: '→ JSON' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('reverse');
  });
});
