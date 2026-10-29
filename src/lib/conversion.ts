/**
 * The conversion pipeline shared by the live editor, the batch queue and the
 * conversion Web Worker: parse (forward) or reverse-parse, convert, measure.
 * Pure and synchronous — safe to run on the main thread or inside a worker.
 */

import { getConverter, safeConvert, safeReverse } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { utf8ByteLength, type Encoding } from './bytes';
import { parseJsonInput, type JsonShape, type ParseResult } from './detect';

export interface ConversionRequest {
  text: string;
  format: FormatId;
  direction: Direction;
  options: Record<string, unknown>;
  sourceName?: string;
}

export type ConversionOutcome =
  | { kind: 'empty' }
  | { kind: 'no-reverse' }
  | { kind: 'input-error'; message: string; line?: number; column?: number }
  | { kind: 'output-error'; message: string; shape: JsonShape }
  | {
      kind: 'ok';
      output: string;
      shape: JsonShape | null;
      precisionLoss: boolean;
      /** Size of the file a download would produce (decoded bytes for binary formats). */
      outputBytes: number;
    };

export interface TimedOutcome {
  outcome: ConversionOutcome;
  ms: number;
}

// One-entry parse cache: changing converter options re-runs convert() on the
// already-parsed value instead of re-parsing a large document.
let lastParse: { text: string; result: ParseResult } | null = null;

function parseCached(text: string): ParseResult {
  if (lastParse?.text !== text) lastParse = { text, result: parseJsonInput(text) };
  return lastParse.result;
}

/** Bytes represented by a base64/hex string produced by `encodeBytes`. */
export function encodedByteLength(encoded: string, encoding: Encoding): number {
  if (encoding === 'hex') return Math.floor(encoded.length / 2);
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((encoded.length * 3) / 4) - padding);
}

export function runConversion(req: ConversionRequest): TimedOutcome {
  const start = performance.now();
  const outcome = convertOnce(req);
  return { outcome, ms: performance.now() - start };
}

function convertOnce({
  text,
  format,
  direction,
  options,
  sourceName,
}: ConversionRequest): ConversionOutcome {
  if (!text.trim()) return { kind: 'empty' };
  const converter = getConverter(format);

  if (direction === 'reverse') {
    if (typeof converter.reverse !== 'function') return { kind: 'no-reverse' };
    const result = safeReverse(converter, { text, ...(sourceName ? { sourceName } : {}) }, options);
    if (!result.ok) {
      return {
        kind: 'input-error',
        message: result.error,
        ...(result.line !== undefined ? { line: result.line } : {}),
        ...(result.column !== undefined ? { column: result.column } : {}),
      };
    }
    return {
      kind: 'ok',
      output: result.output,
      shape: null,
      precisionLoss: false,
      outputBytes: utf8ByteLength(result.output),
    };
  }

  const parsed = parseCached(text);
  if (!parsed.ok) {
    return {
      kind: 'input-error',
      message: parsed.error,
      ...(parsed.line !== undefined ? { line: parsed.line } : {}),
      ...(parsed.column !== undefined ? { column: parsed.column } : {}),
    };
  }
  const result = safeConvert(
    converter,
    { data: parsed.value, rawText: text, ...(sourceName ? { sourceName } : {}) },
    options,
  );
  if (!result.ok) return { kind: 'output-error', message: result.error, shape: parsed.shape };
  const outputBytes = converter.meta.binary
    ? encodedByteLength(result.output, (options['encoding'] as Encoding | undefined) ?? 'base64')
    : utf8ByteLength(result.output);
  return {
    kind: 'ok',
    output: result.output,
    shape: parsed.shape,
    precisionLoss: parsed.precisionLoss,
    outputBytes,
  };
}
