import { afterEach, describe, expect, it } from 'vitest';
import {
  clearOptions,
  loadOptions,
  sanitizeOptions,
  saveOptions,
  type OptionsSpec,
} from '../options-storage';
import { sqlConverter } from '@/converters/sql';

const KEY = 'jsonprism.options.jsonl';

const JSONL: OptionsSpec = {
  defaultOptions: { pretty: false },
  optionSchema: [{ type: 'boolean', key: 'pretty', labelKey: 'x' }],
};

afterEach(() => {
  window.localStorage.clear();
});

describe('options-storage', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadOptions('jsonl', JSONL)).toEqual({ pretty: false });
  });

  it('round-trips through saveOptions / loadOptions', () => {
    saveOptions('jsonl', { pretty: true }, JSONL);
    expect(loadOptions('jsonl', JSONL)).toEqual({ pretty: true });
  });

  it('stores only overrides, so new defaults reach existing users', () => {
    saveOptions('jsonl', { pretty: false }, JSONL);
    expect(window.localStorage.getItem(KEY)).toBeNull();
    saveOptions('jsonl', { pretty: true }, JSONL);
    expect(JSON.parse(window.localStorage.getItem(KEY) as string)).toEqual({
      v: 2,
      values: { pretty: true },
    });
  });

  it('reads legacy (v1) whole-object storage', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ pretty: true }));
    expect(loadOptions('jsonl', JSONL)).toEqual({ pretty: true });
  });

  it('falls back to defaults when stored value is malformed', () => {
    window.localStorage.setItem(KEY, '{not valid json');
    expect(loadOptions('jsonl', JSONL)).toEqual({ pretty: false });
  });

  it('clearOptions removes the stored value', () => {
    saveOptions('jsonl', { pretty: true }, JSONL);
    clearOptions('jsonl');
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});

describe('sanitizeOptions', () => {
  it('drops wrong types, unknown enum values and keys outside the schema', () => {
    const stored = {
      dialect: 'oracle',
      multiRow: 'yes',
      chunkSize: 2.5,
      tableName: 42,
      extra: true,
    };
    expect(sanitizeOptions(stored, sqlConverter)).toEqual(sqlConverter.defaultOptions);
  });

  it('clamps integers into the schema range', () => {
    expect(sanitizeOptions({ chunkSize: 999_999 }, sqlConverter)['chunkSize']).toBe(10_000);
    expect(sanitizeOptions({ chunkSize: -5 }, sqlConverter)['chunkSize']).toBe(1);
  });

  it('keeps valid values', () => {
    expect(sanitizeOptions({ dialect: 'mysql', multiRow: false }, sqlConverter)).toMatchObject({
      dialect: 'mysql',
      multiRow: false,
    });
  });
});
