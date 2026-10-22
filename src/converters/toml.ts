import { parse, stringify } from 'smol-toml';
import type { Converter } from './types';
import { errorMessage } from '@/lib/errors';
import { compareOrdinal, defineOwn, stringifyJson } from '@/lib/json';

interface TomlOptions {
  /** Sort keys alphabetically (recursive). Useful for diffs. */
  sortKeys: boolean;
  /**
   * TOML has no null. `omit` drops null keys and null array items;
   * `error` stops and reports where the first null is.
   */
  nullHandling: 'omit' | 'error';
}

type Table = Record<string, unknown>;

class NullValueError extends Error {
  constructor(path: string) {
    super(
      `TOML has no null value, but ${path || 'the root'} is null. Remove it, replace it, or set "Null values" to "Omit".`,
    );
  }
}

function pathOf(parent: string, key: string | number): string {
  if (typeof key === 'number') return `${parent}[${key}]`;
  const safe = /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
  return parent ? `${parent}.${safe}` : safe;
}

/**
 * Prepares JSON data for smol-toml: handles nulls per option and optionally
 * sorts keys. Builds fresh objects with {@link defineOwn} so keys such as
 * "__proto__" survive.
 */
function prepare(value: unknown, opts: TomlOptions, path: string): unknown {
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    value.forEach((item, i) => {
      if (item === null || item === undefined) {
        if (opts.nullHandling === 'error') throw new NullValueError(pathOf(path, i));
        return;
      }
      out.push(prepare(item, opts, pathOf(path, i)));
    });
    return out;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value);
    if (opts.sortKeys) keys.sort(compareOrdinal);
    const out: Table = {};
    for (const key of keys) {
      const child = (value as Table)[key];
      if (child === null || child === undefined) {
        if (opts.nullHandling === 'error') throw new NullValueError(pathOf(path, key));
        continue;
      }
      defineOwn(out, key, prepare(child, opts, pathOf(path, key)));
    }
    return out;
  }
  return value;
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
    nullHandling: 'omit',
  },
  optionSchema: [
    {
      type: 'boolean',
      key: 'sortKeys',
      labelKey: 'options.toml.sort_keys',
      descriptionKey: 'options.toml.sort_keys_desc',
    },
    {
      type: 'enum',
      key: 'nullHandling',
      labelKey: 'options.toml.null_handling',
      descriptionKey: 'options.toml.null_handling_desc',
      choices: [
        { value: 'omit', labelKey: 'options.toml.null_omit' },
        { value: 'error', labelKey: 'options.toml.null_error' },
      ],
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
      const prepared = prepare(data, opts, '') as Parameters<typeof stringify>[0];
      return { ok: true, output: stringify(prepared) };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
  reverse({ text }) {
    try {
      // 64-bit integers beyond 2^53 come back as bigint and are written as
      // exact integer literals instead of being rounded.
      const value = parse(text, { integersAsBigInt: 'asNeeded' });
      return { ok: true, output: stringifyJson(value, 2) };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
};
