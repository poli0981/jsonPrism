/**
 * Tauri runtime helpers.
 *
 * In a web build these functions are tree-shaken because `isTauri()`
 * resolves to a static `false`. In a Tauri build, they bridge to native
 * dialogs / file system via the @tauri-apps/* plugins.
 *
 * Imports are dynamic so the web bundle doesn't pull the Tauri plugins.
 */

interface TauriWindowGlobals {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
}

export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  const g = window as unknown as TauriWindowGlobals;
  return g.__TAURI__ !== undefined || g.__TAURI_INTERNALS__ !== undefined;
}

/**
 * Open a native file picker. Returns selected file paths,
 * or null if the user cancelled.
 */
export async function nativeOpenFiles(options?: { multiple?: boolean }): Promise<string[] | null> {
  if (!isTauri()) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const result = await open({
    multiple: options?.multiple ?? false,
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'All', extensions: ['*'] },
    ],
  });
  if (result === null) return null;
  return Array.isArray(result) ? result : [result];
}

/**
 * Show a native save dialog for a binary blob (e.g. the batch .zip).
 * Returns the path the user picked, or null on cancel.
 */
export async function nativeSaveBlob(blob: Blob, suggestedName: string): Promise<string | null> {
  if (!isTauri()) return null;
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');
  const path = await save({
    defaultPath: suggestedName,
    filters: [
      { name: 'Zip Archive', extensions: ['zip'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (!path) return null;
  const buffer = new Uint8Array(await blob.arrayBuffer());
  await writeFile(path, buffer);
  return path;
}

/**
 * Read a file at the given native path as a UTF-8 string.
 */
export async function nativeReadText(path: string): Promise<string> {
  if (!isTauri()) {
    throw new Error('nativeReadText is only available inside Tauri.');
  }
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  return readTextFile(path);
}

// MIME type per extension. Used so File objects created from native paths
// carry a sensible `type` instead of being hard-coded to `application/json`.
const TYPE_BY_EXT: Record<string, string> = {
  json: 'application/json',
  yaml: 'application/x-yaml',
  yml: 'application/x-yaml',
  toml: 'application/toml',
  xml: 'application/xml',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  resx: 'application/xml',
  txt: 'text/plain',
};

/**
 * FNV-1a 32-bit hash of a path, returned as an unsigned 32-bit integer.
 * Used as a stable `lastModified` for File objects when `stat()` is
 * unavailable — `batchStore` dedups on `(name, size, lastModified)`,
 * so the value must be deterministic across repeated drops of the same path.
 */
export function pathHashAsMillis(path: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < path.length; i += 1) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Convert a native file path to a browser-style File so the
 * existing batch store and editor flows can consume it unchanged.
 *
 * `lastModified` is read from the file's real mtime via `stat()` so that
 * re-dropping the same file dedups correctly (batchStore keys on
 * name|size|lastModified). Falling back to `Date.now()` would break dedup
 * because every drop produces a fresh timestamp.
 */
export async function fileFromNativePath(path: string): Promise<File> {
  const text = await nativeReadText(path);
  const name = path.replace(/^.*[\\/]/, ''); // basename
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  const type = TYPE_BY_EXT[ext] ?? 'application/octet-stream';

  let lastModified: number;
  try {
    const { stat } = await import('@tauri-apps/plugin-fs');
    const info = await stat(path);
    lastModified = info.mtime ? info.mtime.getTime() : pathHashAsMillis(path);
  } catch {
    // Capability missing or file vanished between read + stat — fall back
    // to a deterministic hash so repeat drops still dedup.
    lastModified = pathHashAsMillis(path);
  }

  return new File([text], name, { type, lastModified });
}

/**
 * Diagnostic info from the Rust side (OS, arch, app version).
 * Not currently shown in the UI but useful for bug reports.
 */
export async function tauriHostInfo(): Promise<{
  os: string;
  arch: string;
  family: string;
  app_version: string;
} | null> {
  if (!isTauri()) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('host_info');
}
