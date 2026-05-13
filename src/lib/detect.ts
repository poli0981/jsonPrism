/**
 * JSON validation + shape detection.
 *
 * Detection tells the UI which converters are "obvious fits":
 *  - array-of-objects → CSV/TSV/Markdown/SQL/JSONL
 *  - flat object (string→string) → RESX
 *  - any object → YAML/TOML/XML
 *  - any value → YAML/XML
 */

export type JsonShape =
  | 'unknown'
  | 'scalar'
  | 'object'
  | 'array'
  | 'flat-object'
  | 'array-of-objects';

export interface ParseSuccess {
  ok: true;
  value: unknown;
  shape: JsonShape;
}

export interface ParseFailure {
  ok: false;
  error: string;
  line?: number;
  column?: number;
}

export type ParseResult = ParseSuccess | ParseFailure;

export function parseJsonInput(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'empty' };
  try {
    const value: unknown = JSON.parse(trimmed);
    return { ok: true, value, shape: detectShape(value) };
  } catch (err) {
    const msg = (err as Error).message;
    const pos = parsePosition(msg, trimmed);
    if (pos !== null) {
      return { ok: false, error: msg, line: pos.line, column: pos.column };
    }
    return { ok: false, error: msg };
  }
}

export function detectShape(value: unknown): JsonShape {
  if (value === null) return 'scalar';
  if (typeof value !== 'object') return 'scalar';
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((v) => v !== null && typeof v === 'object' && !Array.isArray(v))) {
      return 'array-of-objects';
    }
    return 'array';
  }
  // object
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.every(([, v]) => typeof v === 'string')) return 'flat-object';
  return 'object';
}

function parsePosition(message: string, text: string): { line: number; column: number } | null {
  const match = /position\s+(\d+)/i.exec(message);
  if (!match) return null;
  const pos = Number.parseInt(match[1]!, 10);
  if (!Number.isFinite(pos)) return null;
  let line = 1;
  let col = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, column: col };
}
