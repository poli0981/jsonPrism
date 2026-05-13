import { afterEach, describe, expect, it } from 'vitest';
import { clearOptions, loadOptions, saveOptions } from '../options-storage';

const KEY = 'jsonprism.options.jsonl';

afterEach(() => {
  window.localStorage.clear();
});

describe('options-storage', () => {
  it('returns defaults when nothing is stored', () => {
    const defaults = { pretty: false };
    expect(loadOptions('jsonl', defaults)).toEqual(defaults);
  });

  it('round-trips through saveOptions / loadOptions', () => {
    saveOptions('jsonl', { pretty: true });
    expect(loadOptions('jsonl', { pretty: false })).toEqual({ pretty: true });
  });

  it('merges stored options with new default keys', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ pretty: true }));
    const defaults = { pretty: false, newOption: 'default' };
    expect(loadOptions('jsonl', defaults)).toEqual({ pretty: true, newOption: 'default' });
  });

  it('falls back to defaults when stored value is malformed', () => {
    window.localStorage.setItem(KEY, '{not valid json');
    expect(loadOptions('jsonl', { pretty: false })).toEqual({ pretty: false });
  });

  it('clearOptions removes the stored value', () => {
    saveOptions('jsonl', { pretty: true });
    clearOptions('jsonl');
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});
