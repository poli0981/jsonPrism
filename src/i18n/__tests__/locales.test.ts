import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import vi from '../locales/vi.json';
import ja from '../locales/ja.json';
import zhCN from '../locales/zh-CN.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

const variables = (s: string) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

const english = flatten(en as Tree);

describe.each([
  ['vi', vi],
  ['ja', ja],
  ['zh-CN', zhCN],
])('%s locale', (_name, locale) => {
  const translated = flatten(locale as Tree);

  it('has exactly the same keys as English', () => {
    expect([...translated.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('keeps the same interpolation variables', () => {
    for (const [key, value] of english) {
      expect(variables(translated.get(key) ?? ''), key).toEqual(variables(value));
    }
  });

  it('has no empty strings', () => {
    for (const [key, value] of translated) expect(value.trim(), key).not.toBe('');
  });
});
