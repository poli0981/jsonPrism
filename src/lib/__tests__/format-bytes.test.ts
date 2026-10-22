import { describe, expect, it } from 'vitest';
import { formatBytes } from '../format-bytes';

describe('formatBytes', () => {
  it('shows whole bytes below 1 KiB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('switches to KB with one decimal from 1 KiB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(250 * 1024)).toBe('250.0 KB');
  });

  it('switches to MB with two decimals from 1 MiB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.50 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1024.00 MB');
  });

  // Regression: the unit was chosen before rounding, so the last ~50 bytes
  // below 1 MiB printed as "1024.0 KB".
  it('never prints 1024.0 KB just below 1 MiB', () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe('1.00 MB');
    expect(formatBytes(1024 * 1024 - 52)).toBe('1023.9 KB');
  });
});
