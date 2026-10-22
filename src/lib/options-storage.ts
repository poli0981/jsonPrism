import type { FormatId, OptionSchemaField } from '@/converters/types';

const PREFIX = 'jsonprism.options.';
/** v2 stores only the user's overrides; v1 (unversioned) stored the whole object. */
const STORAGE_VERSION = 2;

/** What options storage needs to know about a converter. */
export interface OptionsSpec {
  defaultOptions: object;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionSchema: ReadonlyArray<OptionSchemaField<any>>;
}

type Options = Record<string, unknown>;

/**
 * Keeps only values the schema can render: right type, a known enum choice,
 * an integer inside [min, max]. Keys outside the schema (e.g. a CSV's fixed
 * delimiter) always come from the defaults, so stale or hand-edited storage
 * can't push a converter into an impossible state.
 */
export function sanitizeOptions(raw: unknown, spec: OptionsSpec): Options {
  const defaults = spec.defaultOptions as Options;
  const result: Options = { ...defaults };
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return result;
  const stored = raw as Options;
  for (const field of spec.optionSchema) {
    if (!Object.hasOwn(stored, field.key)) continue;
    const value = stored[field.key];
    switch (field.type) {
      case 'boolean':
        if (typeof value === 'boolean') result[field.key] = value;
        break;
      case 'enum':
        if (typeof value === 'string' && field.choices.some((c) => c.value === value)) {
          result[field.key] = value;
        }
        break;
      case 'integer':
        if (typeof value === 'number' && Number.isInteger(value)) {
          const min = field.min ?? Number.MIN_SAFE_INTEGER;
          const max = field.max ?? Number.MAX_SAFE_INTEGER;
          result[field.key] = Math.min(max, Math.max(min, value));
        }
        break;
      case 'string':
        if (typeof value === 'string') result[field.key] = value.slice(0, 200);
        break;
    }
  }
  return result;
}

export function loadOptions(format: FormatId, spec: OptionsSpec): Options {
  if (typeof window === 'undefined') return { ...(spec.defaultOptions as Options) };
  try {
    const raw = window.localStorage.getItem(PREFIX + format);
    if (!raw) return sanitizeOptions(null, spec);
    const parsed = JSON.parse(raw) as unknown;
    const values =
      parsed !== null &&
      typeof parsed === 'object' &&
      (parsed as { v?: unknown }).v === STORAGE_VERSION
        ? (parsed as { values?: unknown }).values
        : parsed; // v1: the stored object *was* the options
    return sanitizeOptions(values, spec);
  } catch {
    return sanitizeOptions(null, spec);
  }
}

/** Persists only the values that differ from the defaults. */
export function saveOptions(format: FormatId, options: Options, spec: OptionsSpec): void {
  const defaults = spec.defaultOptions as Options;
  const overrides: Options = {};
  for (const field of spec.optionSchema) {
    if (options[field.key] !== defaults[field.key]) overrides[field.key] = options[field.key];
  }
  try {
    if (Object.keys(overrides).length === 0) {
      window.localStorage.removeItem(PREFIX + format);
    } else {
      window.localStorage.setItem(
        PREFIX + format,
        JSON.stringify({ v: STORAGE_VERSION, values: overrides }),
      );
    }
  } catch {
    /* quota / private-mode errors are non-fatal */
  }
}

export function clearOptions(format: FormatId): void {
  try {
    window.localStorage.removeItem(PREFIX + format);
  } catch {
    /* non-fatal */
  }
}
