import { describe, expect, it } from 'vitest';
import { jsonlConverter } from '../jsonl';
import { csvConverter, tsvConverter } from '../csv';
import { yamlConverter } from '../yaml';
import { tomlConverter } from '../toml';
import { resxConverter } from '../resx';

describe('reverse: JSONL → JSON', () => {
  it('round-trips an array of records', () => {
    const data = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
    const forward = jsonlConverter.convert({ data }, jsonlConverter.defaultOptions);
    expect(forward.ok).toBe(true);
    if (!forward.ok) return;
    const back = jsonlConverter.reverse!({ text: forward.output }, jsonlConverter.defaultOptions);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(JSON.parse(back.output)).toEqual(data);
  });

  it('reports the line number on parse failure', () => {
    const back = jsonlConverter.reverse!(
      { text: '{"ok":1}\n{broken\n' },
      jsonlConverter.defaultOptions,
    );
    expect(back.ok).toBe(false);
    if (back.ok) return;
    expect(back.error).toMatch(/Line 2/);
  });
});

describe('reverse: CSV → JSON', () => {
  it('round-trips through header mode', () => {
    const text = 'id,name\n1,alpha\n2,beta\n';
    const back = csvConverter.reverse!({ text }, csvConverter.defaultOptions);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(JSON.parse(back.output)).toEqual([
      { id: 1, name: 'alpha' },
      { id: 2, name: 'beta' },
    ]);
  });

  it('returns arrays when header is disabled', () => {
    const text = '1,alpha\n2,beta\n';
    const back = csvConverter.reverse!(
      { text },
      { ...csvConverter.defaultOptions, header: false },
    );
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(JSON.parse(back.output)).toEqual([
      [1, 'alpha'],
      [2, 'beta'],
    ]);
  });

  it('uses tabs for TSV reverse', () => {
    const text = 'id\tname\n1\talpha\n';
    const back = tsvConverter.reverse!({ text }, tsvConverter.defaultOptions);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(JSON.parse(back.output)).toEqual([{ id: 1, name: 'alpha' }]);
  });
});

describe('reverse: YAML → JSON', () => {
  it('round-trips nested structures', () => {
    const data = { name: 'alpha', tags: ['a', 'b'], nested: { count: 3 } };
    const forward = yamlConverter.convert({ data }, yamlConverter.defaultOptions);
    expect(forward.ok).toBe(true);
    if (!forward.ok) return;
    const back = yamlConverter.reverse!({ text: forward.output }, yamlConverter.defaultOptions);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(JSON.parse(back.output)).toEqual(data);
  });

  it('reports YAML parse errors', () => {
    const back = yamlConverter.reverse!({ text: 'key: : value' }, yamlConverter.defaultOptions);
    expect(back.ok).toBe(false);
  });
});

describe('reverse: TOML → JSON', () => {
  it('round-trips tables and arrays', () => {
    const data = { app: { name: 'JSONPrism', version: '1.0.0' }, tags: ['a', 'b'] };
    const forward = tomlConverter.convert({ data }, tomlConverter.defaultOptions);
    expect(forward.ok).toBe(true);
    if (!forward.ok) return;
    const back = tomlConverter.reverse!({ text: forward.output }, tomlConverter.defaultOptions);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(JSON.parse(back.output)).toEqual(data);
  });

  it('reports TOML parse errors', () => {
    const back = tomlConverter.reverse!({ text: 'broken = =\n' }, tomlConverter.defaultOptions);
    expect(back.ok).toBe(false);
  });
});

describe('reverse: RESX → JSON', () => {
  it('round-trips flat key/value entries', () => {
    const data = { Welcome: 'Hi', Bye: 'See you' };
    const forward = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(forward.ok).toBe(true);
    if (!forward.ok) return;
    const back = resxConverter.reverse!({ text: forward.output }, resxConverter.defaultOptions);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(JSON.parse(back.output)).toEqual(data);
  });

  it('preserves comment metadata via the configured commentKey', () => {
    const data = { Welcome: { value: 'Hi', _comment: 'Greeting' } };
    const forward = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(forward.ok).toBe(true);
    if (!forward.ok) return;
    const back = resxConverter.reverse!({ text: forward.output }, resxConverter.defaultOptions);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(JSON.parse(back.output)).toEqual(data);
  });
});
