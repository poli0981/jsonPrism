import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@/i18n';
import { BatchSummaryChips } from '../BatchSummaryChips';

function chip(label: string): HTMLElement {
  const chipElement = within(screen.getByRole('status')).getByText(label).parentElement;
  if (!chipElement) throw new Error(`no chip for ${label}`);
  return chipElement;
}

describe('BatchSummaryChips', () => {
  it('announces queued and done counts in a polite live region', () => {
    render(<BatchSummaryChips queuedCount={3} doneCount={1} errorCount={0} />);

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(chip('queued')).toHaveTextContent('queued3');
    expect(chip('done')).toHaveTextContent('done1');
    expect(within(region).queryByText('failed')).not.toBeInTheDocument();
  });

  it('adds a failed chip only when something failed', () => {
    render(<BatchSummaryChips queuedCount={0} doneCount={4} errorCount={2} />);

    expect(chip('failed')).toHaveTextContent('failed2');
    expect(chip('failed')).toHaveClass('text-destructive');
    expect(chip('done')).toHaveClass('text-success');
    expect(chip('queued')).toHaveClass('bg-muted');
  });

  it('updates the live region as counts change', () => {
    const { rerender } = render(<BatchSummaryChips queuedCount={2} doneCount={0} errorCount={0} />);

    rerender(<BatchSummaryChips queuedCount={0} doneCount={1} errorCount={1} />);

    expect(chip('queued')).toHaveTextContent('queued0');
    expect(chip('done')).toHaveTextContent('done1');
    expect(chip('failed')).toHaveTextContent('failed1');
  });
});
