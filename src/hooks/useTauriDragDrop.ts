import { useEffect } from 'react';
import { createLogger } from '@/lib/logger';
import { fileFromNativePath, isTauri } from '@/lib/tauri';

const log = createLogger('tauri-drop');

/**
 * Listen for native OS drag-drop events fired by the Tauri webview.
 * When files are dropped from File Explorer / Finder / Nautilus,
 * Tauri delivers a list of paths; we read them and hand back File
 * objects so the existing web-based flows can consume them.
 *
 * No-op outside Tauri (and compiled out of the web build).
 */
export function useTauriDragDrop(onFiles: (files: File[]) => void): void {
  useEffect(() => {
    if (!__IS_TAURI_BUILD__ || !isTauri()) return;

    let unlisten: (() => void) | null = null;
    let disposed = false;

    void (async () => {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      // Tauri 2 fires `tauri://drag-drop` with payload `{ paths: string[], position }`.
      const off = await getCurrentWebviewWindow().listen<{ paths: string[] }>(
        'tauri://drag-drop',
        async (event) => {
          if (disposed) return;
          const paths = event.payload?.paths ?? [];
          if (paths.length === 0) return;
          try {
            const files = await Promise.all(paths.map(fileFromNativePath));
            onFiles(files);
          } catch (err) {
            log.error('Reading dropped files failed:', err);
          }
        },
      );
      // The effect may have been cleaned up while `listen()` was pending.
      if (disposed) off();
      else unlisten = off;
    })().catch((err: unknown) => log.error('Could not register the drag-drop listener:', err));

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [onFiles]);
}
