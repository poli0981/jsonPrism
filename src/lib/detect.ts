/**
 * JSON validation + shape detection.
 *
 * Detection tells the UI which converters are "obvious fits":
 *  - array-of-objects → CSV/TSV/Markdown/SQL/JSONL
 *  - flat object (string→string) → RESX
 *  - any object → YAML/TOML/XML
 *  - any value → YAML/XML
 */

import { errorMessage } from './errors';
import { hasUnsafeInteger } from './json';

export type JsonShape =
  'unknown' | 'scalar' | 'object' | 'array' | 'flat-object' | 'array-of-objects';

export interface ParseSuccess {
  ok: true;
  value: unknown;
  shape: JsonShape;
  /** Integer literals beyond ±2^53 were rounded by JSON.parse. */
  precisionLoss: boolean;
}

export interface ParseFailure {
  ok: false;
  error: string;
  line?: number;
  column?: number;
}

export type ParseResult = ParseSuccess | ParseFailure;

export function parseJsonInput(text: string): ParseResult {
  if (!text.trim()) return { ok: false, error: 'empty' };
  // JSON.parse rejects a byte-order mark; swap it for a space so error
  // positions still line up with the editor.
  const source = text.charCodeAt(0) === 0xfeff ? ' ' + text.slice(1) : text;
  try {
    const value: unknown = JSON.parse(source);
    return {
      ok: true,
      value,
      shape: detectShape(value),
      precisionLoss: hasUnsafeInteger(source),
    };
  } catch (err) {
    const msg = errorMessage(err);
    const pos = errorPosition(msg, source);
    return pos === null
      ? { ok: false, error: msg }
      : { ok: false, error: msg, line: pos.line, column: pos.column };
  }
}

export function detectShape(value: unknown): JsonShape {
  if (value === null) return 'scalar';
  if (typeof value !== 'object') return 'scalar';
  if (Array.isArray(value)) {
    if (
      value.length > 0 &&
      value.every((v) => v !== null && typeof v === 'object' && !Array.isArray(v))
    ) {
      return 'array-of-objects';
    }
    return 'array';
  }
  // object
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.every(([, v]) => typeof v === 'string')) return 'flat-object';
  return 'object';
}

/**
 * Line/column (1-based) of a JSON syntax error. Engines disagree on the
 * message format — V8 says "at position N (line L column C)", Firefox says
 * "at line L column C", WebKit (Safari, Tauri on macOS/Linux) says nothing —
 * so fall back to scanning the text ourselves.
 */
export function errorPosition(
  message: string,
  text: string,
): { line: number; column: number } | null {
  const lineCol = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
  if (lineCol) {
    return { line: Number(lineCol[1]), column: Number(lineCol[2]) };
  }
  // "position N" must not be matched inside the JSON snippet V8 echoes in quotes.
  const position = /(?:^|[^"'])\bposition\s+(\d+)/i.exec(message.replace(/"[^"]*"/g, '""'));
  const offset = position ? Number(position[1]) : findSyntaxErrorOffset(text);
  if (offset < 0 || !Number.isFinite(offset)) return null;
  return offsetToLineColumn(text, offset);
}

export function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const ESCAPABLE = '"\\/bfnrt';

/**
 * Offset of the first JSON syntax error, or -1 if the text is valid (or too
 * deeply nested to scan). Only runs on the failure path.
 */
export function findSyntaxErrorOffset(text: string): number {
  let i = 0;
  const n = text.length;

  class Stop {
    readonly offset: number;
    constructor(offset: number) {
      this.offset = offset;
    }
  }
  const fail = (): never => {
    throw new Stop(i);
  };
  const skipWhitespace = () => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13) i++;
      else break;
    }
  };
  const parseString = () => {
    i++; // opening quote
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 34) {
        i++;
        return;
      }
      if (c === 92) {
        i++;
        const e = text[i];
        if (e === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) fail();
          i += 5;
          continue;
        }
        if (e === undefined || !ESCAPABLE.includes(e)) fail();
        i++;
        continue;
      }
      if (c < 0x20) fail();
      i++;
    }
    fail();
  };
  const parseValue = (): void => {
    skipWhitespace();
    if (i >= n) fail();
    const c = text[i]!;
    if (c === '{') {
      i++;
      skipWhitespace();
      if (text[i] === '}') {
        i++;
        return;
      }
      for (;;) {
        skipWhitespace();
        if (text[i] !== '"') fail();
        parseString();
        skipWhitespace();
        if (text[i] !== ':') fail();
        i++;
        parseValue();
        skipWhitespace();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === '}') {
          i++;
          return;
        }
        fail();
      }
    }
    if (c === '[') {
      i++;
      skipWhitespace();
      if (text[i] === ']') {
        i++;
        return;
      }
      for (;;) {
        parseValue();
        skipWhitespace();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === ']') {
          i++;
          return;
        }
        fail();
      }
    }
    if (c === '"') {
      parseString();
      return;
    }
    if (c === '-' || (c >= '0' && c <= '9')) {
      const m = NUMBER_RE.exec(text.slice(i, i + 512));
      if (!m) fail();
      i += m![0].length;
      return;
    }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, i)) {
        i += literal.length;
        return;
      }
    }
    fail();
  };

  try {
    parseValue();
    skipWhitespace();
    if (i < n) fail();
    return -1;
  } catch (err) {
    return err instanceof Stop ? err.offset : -1; // RangeError on absurd nesting
  }
}
