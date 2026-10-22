import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolbarButton } from '../ToolbarButton';

const icon = <svg data-testid="icon" aria-hidden />;

describe('ToolbarButton', () => {
  it('keeps the label as accessible name and tooltip when a shorter visible label is shown', () => {
    render(
      <ToolbarButton onClick={() => {}} label="Download output" visibleLabel="Save" icon={icon} />,
    );
    const button = screen.getByRole('button', { name: 'Download output' });
    expect(button).toHaveAttribute('title', 'Download output');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveTextContent('Save');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('shows the label itself when no visible label is given', () => {
    render(<ToolbarButton onClick={() => {}} label="Copy" icon={icon} />);
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveTextContent('Copy');
  });

  it('calls onClick unless disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<ToolbarButton onClick={onClick} label="Clear" icon={icon} />);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<ToolbarButton onClick={onClick} label="Clear" icon={icon} disabled />);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges extra classes with its own', () => {
    render(<ToolbarButton onClick={() => {}} label="Options" icon={icon} className="ml-auto" />);
    expect(screen.getByRole('button', { name: 'Options' })).toHaveClass('ml-auto', 'inline-flex');
  });
});
