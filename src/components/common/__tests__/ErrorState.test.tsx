import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('renders code, title, message and actions', () => {
    render(
      <ErrorState
        code={404}
        title="Not found"
        message="That route doesn't exist."
        actions={<button type="button">Home</button>}
      />,
    );
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Not found' })).toBeInTheDocument();
    expect(screen.getByText("That route doesn't exist.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  });

  it('omits the code block when no code is given', () => {
    render(<ErrorState title="Generic error" />);
    expect(screen.getByRole('heading', { name: 'Generic error' })).toBeInTheDocument();
    expect(screen.queryByText('404')).not.toBeInTheDocument();
  });
});
