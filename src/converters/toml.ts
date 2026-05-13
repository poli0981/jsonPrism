import { stringify } from 'smol-toml';
import type { Converter } from './types';

interface TomlOptions {
  /** Sort keys alphabetically (recursive). Useful for diffs. */
  sortKeys: boolean;
}

export const tomlConverter: Converter<TomlOptions> = {
  meta: {
    id: 'toml',
    labelKey: 'formats.toml',
    extension: 'toml',
    mimeType: 'application/toml',
    phase: 2,
    ready: true,
  },
  defaultOptions: {
    sortKeys: false,
  },
  optionSchema: [
    {
      type: 'boolean',
      key: 'sortKeys',
      labelKey: 'options.toml.sort_keys',
      descriptionKey: 'options.toml.sort_keys_desc',
    },
  ],
  convert({ data }, opts) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return {
        ok: false,
        error: 'TOML requires the root value to be a plain object (table).',
      };
    }
    try {
      const processed = opts.sortKeys ? sortKeysRecursive(data) : data;
      // smol-toml's stringify signature accepts a TOML-compatible object.
      // We cast through unknown because the library types are strict.
      const output = stringify(processed as Parameters<typeof stringify>[0]);
      return { ok: true, output };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};

function sortKeysRecursive(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeysRecursive);
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = sortKeysRecursive(obj[k]);
  }
  return sorted;
}
