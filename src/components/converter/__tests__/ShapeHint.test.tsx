import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/i18n';
import type { JsonShape } from '@/lib/detect';
import { ShapeHint } from '../ShapeHint';

describe('ShapeHint', () => {
  it('renders nothing before a shape is known', () => {
    const { container } = render(<ShapeHint shape={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unknown shape', () => {
    const { container } = render(<ShapeHint shape="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each<[JsonShape, string]>([
    ['array-of-objects', 'Detected: array of objects'],
    ['flat-object', 'Detected: flat object'],
    ['object', 'Detected: object'],
    ['array', 'Detected: array'],
    ['scalar', 'Detected: scalar'],
  ])('names the detected %s shape', (shape, text) => {
    render(<ShapeHint shape={shape} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
