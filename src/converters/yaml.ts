import yaml from 'js-yaml';
import type { Converter } from './types';

interface YamlOptions {
  indent: number;
  /** Use flow style for collections? Block is the default and more readable. */
  flowLevel: number; // -1 = always block, 0 = flow at root, etc.
  /** Quote style for strings. */
  quoteStyle: 'auto' | 'single' | 'double';
}

export const yamlConverter: Converter<YamlOptions> = {
  meta: {
    id: 'yaml',
    labelKey: 'formats.yaml',
    extension: 'yaml',
    mimeType: 'application/yaml',
    phase: 1,
    ready: true,
  },
  defaultOptions: {
    indent: 2,
    flowLevel: -1,
    quoteStyle: 'auto',
  },
  optionSchema: [
    {
      type: 'integer',
      key: 'indent',
      labelKey: 'options.yaml.indent',
      min: 2,
      max: 8,
    },
    {
      type: 'enum',
      key: 'quoteStyle',
      labelKey: 'options.yaml.quote_style',
      choices: [
        { value: 'auto', labelKey: 'options.yaml.quote_auto' },
        { value: 'single', labelKey: 'options.yaml.quote_single' },
        { value: 'double', labelKey: 'options.yaml.quote_double' },
      ],
    },
  ],
  convert({ data }, opts) {
    try {
      const output = yaml.dump(data, {
        indent: opts.indent,
        flowLevel: opts.flowLevel,
        styles: {
          // No-op for now; quote style hook reserved for Phase 1 polish.
        },
        forceQuotes: opts.quoteStyle === 'double',
        quotingType: opts.quoteStyle === 'single' ? "'" : '"',
        noRefs: true,
        sortKeys: false,
      });
      return { ok: true, output };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};
