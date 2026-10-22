import type { Converter } from './types';
import { errorMessage } from '@/lib/errors';

interface JsonlOptions {
  /** Pretty-print each line? Usually false (canonical JSONL is one-line-per-record). */
  pretty: boolean;
}

export const jsonlConverter: Converter<JsonlOptions> = {
  meta: {
    id: 'jsonl',
    labelKey: 'formats.jsonl',
    extension: 'jsonl',
    altExtensions: ['ndjson'],
    mimeType: 'application/x-ndjson',
    phase: 1,
    ready: true,
  },
  defaultOptions: { pretty: false },
  optionSchema: [
    {
      type: 'boolean',
      key: 'pretty',
      labelKey: 'options.jsonl.pretty',
      descriptionKey: 'options.jsonl.pretty_desc',
    },
  ],
  convert({ data }, { pretty }) {
    if (!Array.isArray(data)) {
      return {
        ok: false,
        error: 'JSONL requires the root value to be an array. Wrap your object in [] first.',
      };
    }
    try {
      const lines = data.map((row) =>
        pretty ? JSON.stringify(row, null, 2) : JSON.stringify(row),
      );
      return { ok: true, output: lines.join('\n') + '\n' };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
  reverse({ text }, { pretty }) {
    // Strip a UTF-8 BOM; keep blank lines in the count so error line numbers
    // match what the user sees in the editor.
    const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
    const values: unknown[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.trim().length === 0) continue;
      try {
        values.push(JSON.parse(line));
      } catch (err) {
        return { ok: false, error: `Line ${i + 1}: ${errorMessage(err)}` };
      }
    }
    try {
      return {
        ok: true,
        output: pretty ? JSON.stringify(values, null, 2) : JSON.stringify(values),
      };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
};
