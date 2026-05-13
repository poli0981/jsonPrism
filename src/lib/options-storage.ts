import type { FormatId } from '@/converters/types';

const PREFIX = 'jsonprism.options.';

export function loadOptions<T>(format: FormatId, defaults: T): T {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(PREFIX + format);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<T>;
    // Shallow-merge so newly-added option keys default correctly.
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveOptions<T>(format: FormatId, options: T): void {
  try {
    window.localStorage.setItem(PREFIX + format, JSON.stringify(options));
  } catch {
    /* quota / serialization errors are non-fatal */
  }
}

export function clearOptions(format: FormatId): void {
  try {
    window.localStorage.removeItem(PREFIX + format);
  } catch {
    /* non-fatal */
  }
}
