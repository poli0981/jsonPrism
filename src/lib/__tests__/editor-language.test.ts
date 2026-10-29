import { describe, expect, it } from 'vitest';
import type { FormatId } from '@/converters/types';
import { ALL_FORMATS } from '@/converters/registry';
import { editorLanguageFor, outputLanguageFor } from '../editor-language';

/** Expected CodeMirror language for text written in each format. */
const FORMAT_LANGUAGE: Record<FormatId, string> = {
  jsonl: 'jsonl',
  jsonc: 'jsonc',
  csv: 'plain',
  tsv: 'plain',
  yaml: 'yaml',
  xml: 'xml',
  toml: 'toml',
  resx: 'xml',
  markdown: 'markdown',
  sql: 'sql',
  bson: 'plain',
  cbor: 'plain',
  msgpack: 'plain',
};

describe('editorLanguageFor (input editor)', () => {
  it('always highlights JSON going forward', () => {
    for (const format of ALL_FORMATS) {
      expect(editorLanguageFor(format, 'forward')).toBe('json');
    }
  });

  it.each(ALL_FORMATS)('uses the %s grammar going back', (format) => {
    expect(editorLanguageFor(format, 'reverse')).toBe(FORMAT_LANGUAGE[format]);
  });
});

describe('outputLanguageFor (read-only output editor)', () => {
  it.each(ALL_FORMATS)('uses the %s grammar going forward', (format) => {
    expect(outputLanguageFor(format, 'forward')).toBe(FORMAT_LANGUAGE[format]);
  });

  it('always highlights JSON going back', () => {
    for (const format of ALL_FORMATS) {
      expect(outputLanguageFor(format, 'reverse')).toBe('json');
    }
  });
});
