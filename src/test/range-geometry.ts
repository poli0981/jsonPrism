import { afterAll, beforeAll } from 'vitest';

const emptyRect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 };
const rangeGeometry = ['getClientRects', 'getBoundingClientRect'] as const;

/**
 * jsdom has no layout engine, but CodeMirror measures text ranges to draw the
 * cursor and selection layers. Call this at the top level of a test file: the
 * Range geometry methods return empty boxes for that file's tests, and the
 * originals come back afterwards. Empty geometry is enough for the tests.
 */
export function stubRangeGeometry(): void {
  const originals = rangeGeometry.map((key) =>
    Object.getOwnPropertyDescriptor(Range.prototype, key),
  );

  beforeAll(() => {
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => ({ ...emptyRect, toJSON: () => emptyRect });
  });

  afterAll(() => {
    rangeGeometry.forEach((key, i) => {
      const original = originals[i];
      if (original) Object.defineProperty(Range.prototype, key, original);
      else Reflect.deleteProperty(Range.prototype, key);
    });
  });
}
