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
async function nativeReadText(path: string): Promise<string> {
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
 * Derive a clean basename from a native path or an Android content URI.
 *
 * Desktop paths (`C:\…\data.json`, `/home/…/data.json`) pass through
 * unchanged. Android's dialog returns a percent-encoded `content://` URI
 * whose document id usually embeds the real path
 * (e.g. `…/document/raw%3A%2Fstorage%2Femulated%2F0%2FDownload%2Fdata.json`).
 * Decode it, then strip everything up to the last `/` or `:` so the editor,
 * the format-extension filter, and toasts see `data.json` instead of the raw
 * URI. Providers that hand back an opaque id (e.g. `msf:1000000123`) still
 * collapse to a short, stable token.
 */
export function basenameFromPath(path: string): string {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // malformed %-escape — fall back to the raw string
  }
  const afterSlash = decoded.replace(/^.*[\\/]/, '');
  return afterSlash.replace(/^.*:/, '') || afterSlash;
}

/**
 * Convert a native file path to a browser-style File so the
 * existing batch store and editor flows can consume it unchanged.
 *
 * `lastModified` is read from the file's real mtime via `stat()` so that
 * re-dropping the same file dedups correctly (batchStore keys on
 * name|size|lastModified). Falling back to `Date.now()` would break dedup
 * because every drop produces a fresh timestamp. On Android `stat()` on a
 * content URI is unreliable, so the hash fallback covers it.
 */
export async function fileFromNativePath(path: string): Promise<File> {
  const text = await nativeReadText(path);
  const name = basenameFromPath(path);
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
 * Open an external URL. In Tauri the webview won't honour `target="_blank"`
 * (Android in particular swallows it), so hand the URL to the system browser
 * via the opener plugin's `openUrl`. On the web, open a new tab as usual.
 *
 * NB: the shell plugin's `open()` throws "Scoped shell IO error: No such file
 * or directory (os error 2)" on Android — it has no native URL handler there.
 * The opener plugin routes through the platform's Intent/openURL API instead.
 */
export async function openExternal(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(url);
}

/**
 * Diagnostic info from the Rust side (OS, arch, app version).
 * Not currently shown in the UI but useful for bug reports.
 * @public
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
