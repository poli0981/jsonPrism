export type FileFilterDirection = 'forward' | 'reverse';

/**
 * Allowed file extensions for a given direction × format combo.
 * Forward: JSON-only input. Reverse: the format's native extension.
 * `.txt` is always accepted as a freeform escape hatch.
 *
 * Returned extensions are lowercase, without the leading dot.
 */
export function getAllowedExtensions(
  direction: FileFilterDirection,
  formatExtension: string,
): string[] {
  if (direction === 'reverse') {
    return [formatExtension.toLowerCase(), 'txt'];
  }
  return ['json', 'txt'];
}

/** Lowercase extension of a filename, empty string if there's no dot. */
export function extOf(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}

export interface FilterByExtensionResult {
  valid: File[];
  wrongFormat: number;
}

/**
 * Split files into (accepted, wrong-format count) by extension whitelist.
 *
 * `treatUnknownExtAsValid` accepts files whose name has no detectable
 * extension. Android's native picker returns opaque `content://` document ids
 * (e.g. `…/document/msf:1000000123`) that carry no filename, so re-filtering a
 * file the user already chose through the native dialog would wrongly reject
 * it. Use it only on the native-open path — web drag-drop stays strict.
 */
export function filterByExtension(
  files: File[],
  allowed: string[],
  treatUnknownExtAsValid = false,
): FilterByExtensionResult {
  const valid: File[] = [];
  let wrongFormat = 0;
  for (const f of files) {
    const ext = extOf(f.name);
    if (allowed.includes(ext) || (treatUnknownExtAsValid && ext === '')) valid.push(f);
    else wrongFormat += 1;
  }
  return { valid, wrongFormat };
}
