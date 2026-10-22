import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { clearMocks, mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import { useTauriDragDrop } from '@/hooks/useTauriDragDrop';

/**
 * The real `@tauri-apps/api` + `plugin-fs` wrappers run against a fake IPC
 * bridge (Tauri's own `mockIPC`), so the hook, `fileFromNativePath` and the
 * plugins are exercised end to end; only the Rust side is simulated.
 */

type Args = Record<string, unknown>;
type Callback = (data: unknown) => unknown;
type TauriWindow = Window & {
  __TAURI_INTERNALS__?: { callbacks?: Map<number, Callback> };
};

const disk: Record<string, { text: string; mtime: number | null }> = {
  'C:\\drop\\rows.json': { text: '[{"a":1}]', mtime: Date.UTC(2026, 0, 2, 3, 4, 5) },
  '/home/me/config.yaml': { text: 'a: 1\n', mtime: Date.UTC(2026, 0, 3) },
};

let listens: Args[];
let unlistens: Args[];
/** Paths passed to `stat` (the last IPC call made for a readable file). */
let statted: string[];
/** Replaces the default `plugin:event|listen` reply (the callback id). */
let listenReply: ((handlerId: number) => unknown) | null;

function enterTauri(): void {
  vi.stubGlobal('__IS_TAURI_BUILD__', true);
  mockWindows('main');
  mockIPC((cmd, payload) => {
    const args = (payload ?? {}) as Args;
    switch (cmd) {
      case 'plugin:event|listen':
        listens.push(args);
        return listenReply ? listenReply(args['handler'] as number) : args['handler'];
      case 'plugin:event|unlisten':
        unlistens.push(args);
        return null;
      case 'plugin:fs|read_text_file': {
        const entry = disk[args['path'] as string];
        if (!entry) throw new Error(`No such file or directory: ${String(args['path'])}`);
        return Array.from(new TextEncoder().encode(entry.text));
      }
      case 'plugin:fs|stat': {
        statted.push(args['path'] as string);
        const entry = disk[args['path'] as string];
        if (!entry) throw new Error('No such file or directory');
        return { isFile: true, mtime: entry.mtime, atime: null, birthtime: null };
      }
      default:
        throw new Error(`Unexpected IPC command ${cmd}`);
    }
  });
}

/** The drag-drop callback registered by listen call #index. */
async function dropCallback(index = 0): Promise<Callback> {
  await vi.waitFor(() => expect(listens.length).toBeGreaterThan(index));
  const listen = listens[index]!;
  expect(listen['event']).toBe('tauri://drag-drop');
  expect(listen['target']).toEqual({ kind: 'WebviewWindow', label: 'main' });
  const callback = (window as TauriWindow).__TAURI_INTERNALS__?.callbacks?.get(
    listen['handler'] as number,
  );
  if (!callback) throw new Error('drag-drop callback is not registered');
  // Let the hook keep the unlisten function from the resolved listen().
  await new Promise((resolve) => setTimeout(resolve, 0));
  return callback;
}

/** What Tauri delivers for a drop from the file manager. */
function dropEvent(paths?: string[]) {
  return {
    event: 'tauri://drag-drop',
    id: 1,
    ...(paths ? { payload: { paths, position: { x: 10, y: 20 } } } : {}),
  };
}

let errorSpy: MockInstance<Console['error']>;

beforeEach(() => {
  listens = [];
  unlistens = [];
  statted = [];
  listenReply = null;
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Unmount while the fake bridge still exists: unmounting unlistens via IPC.
  cleanup();
  clearMocks();
  Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  Reflect.deleteProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useTauriDragDrop', () => {
  it('does not register anything outside the desktop app', async () => {
    const onFiles = vi.fn();
    renderHook(() => useTauriDragDrop(onFiles));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((window as TauriWindow).__TAURI_INTERNALS__).toBeUndefined();
    expect(listens).toEqual([]);
  });

  it('turns dropped native paths into File objects', async () => {
    enterTauri();
    const onFiles = vi.fn();
    renderHook(() => useTauriDragDrop(onFiles));
    const callback = await dropCallback();

    await callback(dropEvent(['C:\\drop\\rows.json', '/home/me/config.yaml']));

    expect(onFiles).toHaveBeenCalledTimes(1);
    const [files] = onFiles.mock.calls[0] as [File[]];
    expect(files.map((f) => [f.name, f.type, f.lastModified])).toEqual([
      ['rows.json', 'application/json', Date.UTC(2026, 0, 2, 3, 4, 5)],
      ['config.yaml', 'application/yaml', Date.UTC(2026, 0, 3)],
    ]);
    await expect(files[0]!.text()).resolves.toBe('[{"a":1}]');
    await expect(files[1]!.text()).resolves.toBe('a: 1\n');
  });

  it('ignores drag-drop events without paths', async () => {
    enterTauri();
    const onFiles = vi.fn();
    renderHook(() => useTauriDragDrop(onFiles));
    const callback = await dropCallback();

    await callback(dropEvent([]));
    await callback(dropEvent());

    expect(onFiles).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs unreadable drops instead of delivering a partial list', async () => {
    enterTauri();
    const onFiles = vi.fn();
    renderHook(() => useTauriDragDrop(onFiles));
    const callback = await dropCallback();

    await callback(dropEvent(['C:\\drop\\rows.json', '/gone.json']));

    expect(onFiles).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      '[jsonprism:tauri-drop]',
      'Reading dropped files failed:',
      expect.objectContaining({ message: 'No such file or directory: /gone.json' }),
    );
    // The readable file finishes in the background; let it settle on the bridge.
    await vi.waitFor(() => expect(statted).toContain('C:\\drop\\rows.json'));
  });

  it('stops listening on unmount', async () => {
    enterTauri();
    const { unmount } = renderHook(() => useTauriDragDrop(vi.fn()));
    await dropCallback();
    expect(unlistens).toEqual([]);

    unmount();

    await vi.waitFor(() => expect(unlistens).toHaveLength(1));
    expect(unlistens[0]).toMatchObject({ event: 'tauri://drag-drop' });
  });

  it('unlistens as soon as registration finishes when already unmounted', async () => {
    enterTauri();
    let finish: () => void = () => {};
    listenReply = (handlerId) =>
      new Promise((resolve) => {
        finish = () => resolve(handlerId);
      });
    const { unmount } = renderHook(() => useTauriDragDrop(vi.fn()));
    await vi.waitFor(() => expect(listens).toHaveLength(1));

    unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unlistens).toEqual([]);

    finish();
    await vi.waitFor(() => expect(unlistens).toHaveLength(1));
  });

  it('ignores an event that was already in flight when the hook unmounted', async () => {
    enterTauri();
    const onFiles = vi.fn();
    const { unmount } = renderHook(() => useTauriDragDrop(onFiles));
    const callback = await dropCallback();
    unmount();

    await callback(dropEvent(['C:\\drop\\rows.json']));

    expect(onFiles).not.toHaveBeenCalled();
  });

  it('logs when the listener cannot be registered', async () => {
    enterTauri();
    const denied = new Error('event.listen not allowed by capability');
    listenReply = () => Promise.reject(denied);

    renderHook(() => useTauriDragDrop(vi.fn()));

    await vi.waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        '[jsonprism:tauri-drop]',
        'Could not register the drag-drop listener:',
        denied,
      ),
    );
  });

  it('re-subscribes when the callback changes', async () => {
    enterTauri();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ onFiles }) => useTauriDragDrop(onFiles), {
      initialProps: { onFiles: first },
    });
    await dropCallback(0);

    rerender({ onFiles: second });
    const callback = await dropCallback(1);
    await vi.waitFor(() => expect(unlistens).toHaveLength(1));

    await callback(dropEvent(['C:\\drop\\rows.json']));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});
