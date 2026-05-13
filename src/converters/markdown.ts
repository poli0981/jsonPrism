import type { Converter } from './types';

type Alignment = 'left' | 'center' | 'right' | 'none';

interface MarkdownOptions {
  alignment: Alignment;
  escapePipes: boolean;
}

export const markdownConverter: Converter<MarkdownOptions> = {
  meta: {
    id: 'markdown',
    labelKey: 'formats.markdown',
    extension: 'md',
    mimeType: 'text/markdown',
    phase: 2,
    ready: true,
  },
  defaultOptions: {
    alignment: 'left',
    escapePipes: true,
  },
  optionSchema: [
    {
      type: 'enum',
      key: 'alignment',
      labelKey: 'options.markdown.alignment',
      choices: [
        { value: 'left', labelKey: 'options.markdown.align_left' },
        { value: 'center', labelKey: 'options.markdown.align_center' },
        { value: 'right', labelKey: 'options.markdown.align_right' },
        { value: 'none', labelKey: 'options.markdown.align_none' },
      ],
    },
    {
      type: 'boolean',
      key: 'escapePipes',
      labelKey: 'options.markdown.escape_pipes',
      descriptionKey: 'options.markdown.escape_pipes_desc',
    },
  ],
  convert({ data }, opts) {
    if (!Array.isArray(data)) {
      return {
        ok: false,
        error: 'Markdown table requires the root value to be an array of objects.',
      };
    }
    if (data.length === 0) {
      return { ok: true, output: '' };
    }
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row === null || typeof row !== 'object' || Array.isArray(row)) {
        return {
          ok: false,
          error: `Row ${i} is not an object — Markdown table requires objects.`,
        };
      }
    }

    // Collect keys preserving insertion order from first occurrence.
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const row of data) {
      for (const k of Object.keys(row as Record<string, unknown>)) {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    }

    const headerCells = keys.map((k) => formatCell(k, opts.escapePipes));
    const header = `| ${headerCells.join(' | ')} |`;
    const sep = alignmentSeparator(opts.alignment);
    const alignRow = `| ${keys.map(() => sep).join(' | ')} |`;
    const dataRows = data.map((row) => {
      const obj = row as Record<string, unknown>;
      const cells = keys.map((k) => formatCell(obj[k], opts.escapePipes));
      return `| ${cells.join(' | ')} |`;
    });

    return { ok: true, output: [header, alignRow, ...dataRows].join('\n') + '\n' };
  },
};

function alignmentSeparator(alignment: Alignment): string {
  switch (alignment) {
    case 'left':
      return ':---';
    case 'center':
      return ':---:';
    case 'right':
      return '---:';
    case 'none':
      return '---';
  }
}

function formatCell(value: unknown, escapePipes: boolean): string {
  if (value === undefined || value === null) return '';
  let str: string;
  if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  // GFM convention: line breaks inside cells become <br>.
  str = str.replace(/\r?\n/g, '<br>');
  if (escapePipes) {
    str = str.replace(/\|/g, '\\|');
  }
  return str;
}
