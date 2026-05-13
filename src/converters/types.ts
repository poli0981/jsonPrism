/**
 * Converter framework.
 *
 * Every target format implements `Converter<TOptions>`. The framework
 * handles parsing JSON, dispatching to the converter, surfacing
 * errors uniformly, and auto-generating the settings UI from
 * `optionSchema`.
 */

export type FormatId =
  | 'jsonl'
  | 'csv'
  | 'tsv'
  | 'yaml'
  | 'xml'
  | 'toml'
  | 'resx'
  | 'markdown'
  | 'sql';

export type ImplementationPhase = 1 | 2 | 3;

export interface ConverterMeta {
  id: FormatId;
  labelKey: string;
  extension: string;
  mimeType: string;
  phase: ImplementationPhase;
  ready: boolean;
}

export interface ConversionInput {
  data: unknown;
  rawText?: string;
  sourceName?: string;
}

export type ConversionResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

/**
 * Schema describing a single option field, used by the settings UI
 * to auto-render the right form widget.
 */
export type OptionSchemaField<TOptions> =
  | {
      type: 'boolean';
      key: keyof TOptions & string;
      labelKey: string;
      descriptionKey?: string;
    }
  | {
      type: 'enum';
      key: keyof TOptions & string;
      labelKey: string;
      descriptionKey?: string;
      choices: ReadonlyArray<{ value: string; labelKey: string }>;
    }
  | {
      type: 'integer';
      key: keyof TOptions & string;
      labelKey: string;
      descriptionKey?: string;
      min?: number;
      max?: number;
    }
  | {
      type: 'string';
      key: keyof TOptions & string;
      labelKey: string;
      descriptionKey?: string;
      placeholder?: string;
    };

export interface Converter<TOptions = Record<string, never>> {
  meta: ConverterMeta;
  defaultOptions: TOptions;
  /** Schema for auto-generating the settings UI. Empty for stub converters. */
  optionSchema: ReadonlyArray<OptionSchemaField<TOptions>>;
  convert(input: ConversionInput, options: TOptions): ConversionResult;
}
