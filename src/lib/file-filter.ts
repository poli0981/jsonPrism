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

/** Split files into (accepted, wrong-format count) by extension whitelist. */
export function filterByExtension(files: File[], allowed: string[]): FilterByExtensionResult {
  const valid: File[] = [];
  let wrongFormat = 0;
  for (const f of files) {
    if (allowed.includes(extOf(f.name))) valid.push(f);
    else wrongFormat += 1;
  }
  return { valid, wrongFormat };
}
