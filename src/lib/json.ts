/**
 * JSON helpers shared by converters and the conversion pipeline.
 */

/**
 * Assigns an own, enumerable property. Plain `obj[key] = value` with a
 * user-supplied key of `"__proto__"` invokes the prototype setter instead of
 * creating a property, silently dropping the entry.
 */
export function defineOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/** Ordinal (code-unit) comparison — stable across locales, unlike localeCompare. */
export function compareOrdinal(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * `JSON.stringify` that emits `bigint` values as bare integer literals instead
 * of throwing. Used when a parser hands back 64-bit integers (e.g. TOML) that
 * would lose precision as JS numbers.
 */
export function stringifyJson(value: unknown, space?: number): string {
  let sawBigInt = false;
  const marker = `\u0000bigint:${Math.random().toString(36).slice(2)}:`;
  const json = JSON.stringify(
    value,
    (_key, v: unknown) => {
      if (typeof v === 'bigint') {
        sawBigInt = true;
        return `${marker}${v.toString()}`;
      }
      return v;
    },
    space,
  );
  if (json === undefined) return 'null';
  if (!sawBigInt) return json;
  // JSON.stringify escapes the NUL in the marker as \u0000.
  const escaped = JSON.stringify(marker).slice(1, -1);
  return json.split(`"${escaped}`).reduce((acc, part, i) => {
    if (i === 0) return part;
    const end = part.indexOf('"');
    return acc + part.slice(0, end) + part.slice(end + 1);
  }, '');
}

/**
 * True when a JSON number literal in `source` cannot round-trip through a JS
 * double (|n| > 2^53 or more significant digits than a double holds). Used to
 * warn before precision is silently lost.
 */
export function hasUnsafeInteger(source: string): boolean {
  // Only integer literals of 16+ digits can exceed 2^53 — skip the scan otherwise.
  if (!/\d{16}/.test(source)) return false;
  // Tokenize strings and numbers so digits inside string literals don't count.
  const re = /"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const token = match[0];
    if (token.startsWith('"') || /[.eE]/.test(token)) continue;
    if (!Number.isSafeInteger(Number(token))) return true;
  }
  return false;
}
