import { useEffect } from 'react';
import { fileFromNativePath, isTauri } from '@/lib/tauri';

/**
 * Listen for native OS drag-drop events fired by the Tauri webview.
 * When files are dropped from File Explorer / Finder / Nautilus,
 * Tauri delivers a list of paths; we read them and hand back File
 * objects so the existing web-based batch flow can consume them.
 *
 * No-op outside Tauri.
 */
export function useTauriDragDrop(onFiles: (files: File[]) => void): void {
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const win = getCurrentWebviewWindow();
      // Tauri 2 fires `tauri://drag-drop` with payload `{ paths: string[], position }`.
      unlisten = await win.listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
        if (cancelled) return;
        const paths = event.payload?.paths ?? [];
        if (paths.length === 0) return;
        try {
          const files = await Promise.all(paths.map(fileFromNativePath));
          onFiles(files);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Tauri drag-drop read failed:', err);
        }
      });
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [onFiles]);
}
