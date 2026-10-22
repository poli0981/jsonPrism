import { CORE_SCHEMA, dump, load, mergeTag } from 'js-yaml';
import type { Converter } from './types';
import { errorMessage } from '@/lib/errors';

interface YamlOptions {
  indent: number;
  /** Use flow style for collections? Block is the default and more readable. */
  flowLevel: number; // -1 = always block, 0 = flow at root, etc.
  /** Quote style for strings. */
  quoteStyle: 'auto' | 'single' | 'double';
}

// YAML 1.2 core schema plus `<<` merge keys (common in CI/compose files).
// Timestamps stay strings, so dates are never shifted to UTC behind the user.
const LOAD_SCHEMA = CORE_SCHEMA.withTags(mergeTag);

// Guards for untrusted input: an alias "billion laughs" document expands a
// few hundred bytes into gigabytes and freezes the tab.
const MAX_ALIASES = 1_000;
const MAX_MERGE_KEYS = 10_000;
const MAX_DEPTH = 200;
// Aliases are loaded as shared references, so the cost only shows up when the
// value is expanded. Count nodes as JSON.stringify would see them and stop
// early instead of building a gigabyte string (also catches self-references).
const MAX_EXPANDED_NODES = 5_000_000;

function exceedsNodeBudget(root: unknown, budget: number): boolean {
  const stack: unknown[] = [root];
  let seen = 0;
  while (stack.length > 0) {
    const value = stack.pop();
    seen += 1;
    if (seen > budget) return true;
    if (value !== null && typeof value === 'object') {
      for (const child of Object.values(value)) stack.push(child);
    }
  }
  return false;
}

export const yamlConverter: Converter<YamlOptions> = {
  meta: {
    id: 'yaml',
    labelKey: 'formats.yaml',
    extension: 'yaml',
    altExtensions: ['yml'],
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
      const output = dump(data, {
        indent: opts.indent,
        flowLevel: opts.flowLevel,
        // 'auto' quotes only when a string would otherwise change type, using
        // double quotes as JSONPrism 1.x did; 'single' / 'double' quote every
        // non-key string in that style.
        quoteStyle: opts.quoteStyle === 'single' ? 'single' : 'double',
        forceQuotes: opts.quoteStyle !== 'auto',
        noRefs: true,
      });
      return { ok: true, output };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
  reverse({ text }) {
    if (text.trim().length === 0) {
      return { ok: false, error: 'The YAML document is empty.' };
    }
    try {
      const value = load(text, {
        schema: LOAD_SCHEMA,
        maxAliases: MAX_ALIASES,
        maxTotalMergeKeys: MAX_MERGE_KEYS,
        maxDepth: MAX_DEPTH,
      });
      if (exceedsNodeBudget(value, MAX_EXPANDED_NODES)) {
        return {
          ok: false,
          error:
            'The YAML expands to too many values (over 5 million) or references itself. Check its anchors and aliases.',
        };
      }
      return { ok: true, output: JSON.stringify(value === undefined ? null : value, null, 2) };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
};
