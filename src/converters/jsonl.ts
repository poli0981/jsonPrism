import type { Converter } from './types';

interface JsonlOptions {
  /** Pretty-print each line? Usually false (canonical JSONL is one-line-per-record). */
  pretty: boolean;
}

export const jsonlConverter: Converter<JsonlOptions> = {
  meta: {
    id: 'jsonl',
    labelKey: 'formats.jsonl',
    extension: 'jsonl',
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
      return { ok: false, error: (err as Error).message };
    }
  },
};
