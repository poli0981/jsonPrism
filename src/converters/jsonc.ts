import type { ConversionFailure, Converter } from './types';
import { errorPosition, offsetToLineColumn } from '@/lib/detect';
import { errorMessage } from '@/lib/errors';

type JsoncIndent = '2' | '4' | 'tab' | 'minify';

interface JsoncOptions {
  /** Layout of the JSON output; `minify` puts it on one line. */
  indent: JsoncIndent;
}

const INDENT_UNITS: Record<JsoncIndent, string | null> = {
  '2': '  ',
  '4': '    ',
  tab: '\t',
  minify: null,
};

/**
 * Formatted output beyond this many characters is refused: deep nesting makes
 * indentation grow quadratically, and engines cap strings near 2^29.
 */
const MAX_OUTPUT_CHARS = 2 ** 28;

const QUOTE = 0x22;
const SLASH = 0x2f;
const STAR = 0x2a;
const BACKSLASH = 0x5c;
const COMMA = 0x2c;
const COLON = 0x3a;
const LF = 0x0a;
const CR = 0x0d;
const OPEN_BRACE = 0x7b;
const CLOSE_BRACE = 0x7d;
const OPEN_BRACKET = 0x5b;
const CLOSE_BRACKET = 0x5d;

/** Characters that end a number or `true`/`false`/`null` literal. */
const DELIMITERS = ' \t\r\n{}[],:';

function isJsonWhitespace(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === LF || c === CR;
}

/**
 * Index just past the string literal opening at `start`. An unterminated
 * string stops at the end of its line; JSON.parse reports it later.
 */
function skipString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c === QUOTE) return i + 1;
    if (c === LF || c === CR) return i;
    i += c === BACKSLASH ? 2 : 1;
  }
  return text.length;
}

function skipWhitespace(text: string, start: number): number {
  let i = start;
  while (i < text.length && isJsonWhitespace(text.charCodeAt(i))) i++;
  return i;
}

/**
 * End of the comment starting at `start`: `start` itself when there is no
 * comment there, -1 for a block comment that never closes.
 */
function commentEnd(text: string, start: number): number {
  const next = text.charCodeAt(start + 1);
  if (next === SLASH) {
    let i = start + 2;
    while (i < text.length && text.charCodeAt(i) !== LF && text.charCodeAt(i) !== CR) i++;
    return i;
  }
  if (next === STAR) {
    const close = text.indexOf('*/', start + 2);
    return close < 0 ? -1 : close + 2;
  }
  return start;
}

/**
 * Replaces every comment with spaces, keeping line breaks, so offsets — and
 * the line/column of any later JSON error — still match the user's text.
 * Returns the offset of an unterminated block comment instead.
 */
function blankComments(text: string): string | number {
  const parts: string[] = [];
  let copied = 0;
  let i = 0;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c === QUOTE) {
      i = skipString(text, i);
      continue;
    }
    const end = c === SLASH ? commentEnd(text, i) : i;
    if (end < 0) return i;
    if (end === i) {
      i++;
      continue;
    }
    parts.push(text.slice(copied, i), text.slice(i, end).replace(/[^\r\n]/g, ' '));
    copied = end;
    i = end;
  }
  if (copied === 0) return text;
  parts.push(text.slice(copied));
  return parts.join('');
}

/** A comma after `[`, `{`, `,` or `:` is a syntax error, never a trailing comma. */
function followsValue(previous: number): boolean {
  return (
    previous !== OPEN_BRACKET && previous !== OPEN_BRACE && previous !== COMMA && previous !== COLON
  );
}

/** Replaces each comma that directly precedes `]` or `}` with a space. */
function blankTrailingCommas(json: string): string {
  const commas: number[] = [];
  let pending = -1;
  let previous = OPEN_BRACKET;
  let i = 0;
  while (i < json.length) {
    const c = json.charCodeAt(i);
    if (isJsonWhitespace(c)) {
      i++;
      continue;
    }
    if (pending >= 0 && (c === CLOSE_BRACKET || c === CLOSE_BRACE)) commas.push(pending);
    pending = c === COMMA && followsValue(previous) ? i : -1;
    previous = c;
    i = c === QUOTE ? skipString(json, i) : i + 1;
  }
  if (commas.length === 0) return json;
  const parts: string[] = [];
  let copied = 0;
  for (const at of commas) {
    parts.push(json.slice(copied, at), ' ');
    copied = at + 1;
  }
  parts.push(json.slice(copied));
  return parts.join('');
}

function failAt(error: string, text: string, offset: number): ConversionFailure {
  return { ok: false, error, ...offsetToLineColumn(text, offset) };
}

/**
 * Turns JSONC into plain JSON text at the same offsets: comments and trailing
 * commas become spaces, then JSON.parse validates the rest. Shared by the
 * converter and the input editor's linter so both report the same errors.
 */
export function parseJsonc(text: string): { ok: true; json: string } | ConversionFailure {
  // JSON.parse rejects a byte-order mark; a space keeps the offsets.
  const source = text.charCodeAt(0) === 0xfeff ? ' ' + text.slice(1) : text;
  const uncommented = blankComments(source);
  if (typeof uncommented === 'number') {
    return failAt('Unterminated block comment: add the closing */.', source, uncommented);
  }
  const json = blankTrailingCommas(uncommented);
  if (skipWhitespace(json, 0) === json.length) {
    return { ok: false, error: 'No JSON value: the input is empty or only has comments.' };
  }
  try {
    JSON.parse(json);
    return { ok: true, json };
  } catch (err) {
    const message = errorMessage(err);
    const position = errorPosition(message, json);
    return position ? { ok: false, error: message, ...position } : { ok: false, error: message };
  }
}

/** End of the string, number or literal token starting at `start`. */
function valueEnd(json: string, start: number): number {
  if (json.charCodeAt(start) === QUOTE) return skipString(json, start);
  let i = start + 1;
  while (i < json.length && !DELIMITERS.includes(json[i]!)) i++;
  return i;
}

/**
 * Lays out valid JSON token by token. Tokens are copied verbatim — numbers
 * keep every digit, duplicate and `__proto__` keys survive — because no JS
 * value is built. Iterative, so deep nesting cannot overflow the stack.
 * Returns null when the output would be too large.
 */
function reprint(json: string, unit: string | null): string | null {
  const out: string[] = [];
  const colon = unit === null ? ':' : ': ';
  // Line breaks slice one shared indent string instead of repeating per line.
  let indent = '';
  const newline = (depth: number): string => {
    if (unit === null) return '';
    const width = depth * unit.length;
    if (indent.length < width) indent = unit.repeat(depth * 2);
    return '\n' + indent.slice(0, width);
  };
  let size = 0;
  let depth = 0;
  let i = skipWhitespace(json, 0);
  while (i < json.length) {
    const ch = json[i]!;
    let end = i + 1;
    let piece: string;
    switch (ch) {
      case '{':
      case '[': {
        const next = skipWhitespace(json, end);
        if (json[next] === (ch === '{' ? '}' : ']')) {
          piece = ch + json[next];
          end = next + 1;
        } else {
          depth++;
          piece = ch + newline(depth);
        }
        break;
      }
      case '}':
      case ']':
        depth--;
        piece = newline(depth) + ch;
        break;
      case ',':
        piece = ',' + newline(depth);
        break;
      case ':':
        piece = colon;
        break;
      default:
        end = valueEnd(json, i);
        piece = json.slice(i, end);
    }
    size += piece.length;
    if (size > MAX_OUTPUT_CHARS) return null;
    out.push(piece);
    i = skipWhitespace(json, end);
  }
  return out.join('');
}

/**
 * JSONC (JSON with Comments — tsconfig.json, VS Code settings) → JSON. An
 * input-only format: JSON is already valid JSONC, so there is no forward pass.
 */
export const jsoncConverter: Converter<JsoncOptions> = {
  meta: {
    id: 'jsonc',
    labelKey: 'formats.jsonc',
    extension: 'jsonc',
    // Most JSONC files are named .json (tsconfig.json, settings.json).
    altExtensions: ['json'],
    mimeType: 'application/jsonc',
    phase: 4,
    ready: true,
    inputOnly: true,
  },
  defaultOptions: { indent: '2' },
  optionSchema: [
    {
      type: 'enum',
      key: 'indent',
      labelKey: 'options.jsonc.indent',
      descriptionKey: 'options.jsonc.indent_desc',
      choices: [
        { value: '2', labelKey: 'options.jsonc.indent_2' },
        { value: '4', labelKey: 'options.jsonc.indent_4' },
        { value: 'tab', labelKey: 'options.jsonc.indent_tab' },
        { value: 'minify', labelKey: 'options.jsonc.indent_minify' },
      ],
    },
  ],
  convert() {
    return {
      ok: false,
      error: 'JSONC is an input format: switch the direction to → JSON to convert it.',
    };
  },
  reverse({ text }, { indent }) {
    const parsed = parseJsonc(text);
    if (!parsed.ok) return parsed;
    const output = reprint(parsed.json, INDENT_UNITS[indent]);
    return output === null
      ? {
          ok: false,
          error: 'The formatted JSON is too large (very deep nesting). Choose "Minified".',
        }
      : { ok: true, output };
  },
};
