import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { clearMocks, mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import '@/i18n';
import { toast } from '@/components/ui/sonner';
import type { Direction, FormatId } from '@/converters/types';
import { useBatchFileRouter } from '@/hooks/useBatchFileRouter';
import { BATCH_MAX_FILES, useBatchStore } from '@/stores/batchStore';

type Args = Record<string, unknown>;
type Callback = (data: unknown) => unknown;
type TauriWindow = Window & {
  __TAURI_INTERNALS__?: { callbacks?: Map<number, Callback> };
};

function file(name: string, content = '[]'): File {
  return new File([content], name, { lastModified: 1_700_000_000_000 });
}

function queuedNames(): string[] {
  const { items, itemOrder } = useBatchStore.getState();
  return itemOrder.map((id) => items[id]?.filename ?? '?');
}

function setup(
  format: FormatId = 'csv',
  direction: Direction = 'forward',
  withAddedCallback = true,
) {
  const onSingleFile = vi.fn<(file: File) => void>();
  const onFilesAdded = vi.fn<() => void>();
  const { result } = renderHook(() =>
    useBatchFileRouter(
      format,
      direction,
      onSingleFile,
      withAddedCallback ? onFilesAdded : undefined,
    ),
  );
  const drop = (files: File[]) => act(() => result.current(files));
  return { drop, onSingleFile, onFilesAdded };
}

beforeEach(() => {
  useBatchStore.getState().clear();
  vi.spyOn(toast, 'success').mockImplementation(() => 0);
  vi.spyOn(toast, 'warning').mockImplementation(() => 0);
});

afterEach(() => {
  cleanup();
  clearMocks();
  Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  Reflect.deleteProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useBatchFileRouter (web drops)', () => {
  it('queues JSON and text files and reports how many were added', () => {
    const { drop, onFilesAdded, onSingleFile } = setup();

    drop([file('a.json'), file('notes.TXT')]);

    expect(queuedNames()).toEqual(['a.json', 'notes.TXT']);
    expect(toast.success).toHaveBeenCalledWith('Added 2 files to the queue');
    expect(toast.warning).not.toHaveBeenCalled();
    expect(onFilesAdded).toHaveBeenCalledTimes(1);
    expect(onSingleFile).not.toHaveBeenCalled();
  });

  it('skips files with the wrong extension and keeps the rest', () => {
    const { drop } = setup();

    drop([file('a.json'), file('b.csv'), file('c.yaml')]);

    expect(queuedNames()).toEqual(['a.json']);
    expect(toast.warning).toHaveBeenCalledWith('Skipped 2 files (wrong format)');
    expect(toast.success).toHaveBeenCalledWith('Added 1 file to the queue');
  });

  it('adds nothing when no file has an accepted extension', () => {
    const { drop, onFilesAdded } = setup();

    drop([file('table.csv')]);

    expect(queuedNames()).toEqual([]);
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)');
    expect(toast.success).not.toHaveBeenCalled();
    expect(onFilesAdded).not.toHaveBeenCalled();
  });

  it('reports duplicates without announcing new files', () => {
    const { drop, onFilesAdded } = setup();
    const data = file('data.json');
    drop([data]);
    vi.mocked(toast.success).mockClear();
    onFilesAdded.mockClear();

    drop([data]);

    expect(queuedNames()).toEqual(['data.json']);
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 duplicate file');
    expect(toast.success).not.toHaveBeenCalled();
    expect(onFilesAdded).not.toHaveBeenCalled();
  });

  it('reports files beyond the queue limit', () => {
    useBatchStore
      .getState()
      .addFiles(Array.from({ length: BATCH_MAX_FILES - 1 }, (_, i) => file(`f${i}.json`)));
    const { drop } = setup();

    drop([file('x.json'), file('y.json'), file('z.json')]);

    expect(useBatchStore.getState().itemOrder).toHaveLength(BATCH_MAX_FILES);
    expect(toast.success).toHaveBeenCalledWith('Added 1 file to the queue');
    expect(toast.warning).toHaveBeenCalledWith('Skipped 2 files (limit: 500)');
  });

  it("accepts the format's own extensions in reverse mode", () => {
    const { drop } = setup('yaml', 'reverse');

    drop([file('a.yaml'), file('b.YML'), file('c.json'), file('d.txt')]);

    expect(queuedNames()).toEqual(['a.yaml', 'b.YML', 'd.txt']);
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)');
  });

  it('does not require an onFilesAdded callback', () => {
    const { drop } = setup('jsonl', 'forward', false);

    drop([file('a.json')]);

    expect(queuedNames()).toEqual(['a.json']);
    expect(toast.success).toHaveBeenCalledWith('Added 1 file to the queue');
  });
});

describe('useBatchFileRouter (native Tauri drops)', () => {
  const disk: Record<string, string> = {
    '/home/me/one.json': '{"single":true}',
    '/home/me/a.json': '[1]',
    '/home/me/b.json': '[2]',
    '/home/me/c.csv': 'x,y',
  };
  let listens: Args[];

  beforeEach(() => {
    listens = [];
    vi.stubGlobal('__IS_TAURI_BUILD__', true);
    mockWindows('main');
    mockIPC((cmd, payload) => {
      const args = (payload ?? {}) as Args;
      const path = args['path'] as string;
      switch (cmd) {
        case 'plugin:event|listen':
          listens.push(args);
          return args['handler'];
        case 'plugin:event|unlisten':
          return null;
        case 'plugin:fs|read_text_file':
          return Array.from(new TextEncoder().encode(disk[path] ?? ''));
        case 'plugin:fs|stat':
          return { mtime: 1_700_000_000_000 };
        default:
          throw new Error(`Unexpected IPC command ${cmd}`);
      }
    });
  });

  /** Delivers a `tauri://drag-drop` event to the hook's native listener. */
  async function nativeDrop(paths: string[]): Promise<void> {
    await vi.waitFor(() => expect(listens).toHaveLength(1));
    const callback = (window as TauriWindow).__TAURI_INTERNALS__?.callbacks?.get(
      listens[0]!['handler'] as number,
    );
    if (!callback) throw new Error('drag-drop listener is not registered');
    await act(async () => {
      await callback({ event: 'tauri://drag-drop', id: 1, payload: { paths } });
    });
  }

  it('opens a single dropped file in the editor', async () => {
    const { onSingleFile } = setup('csv', 'forward');

    await nativeDrop(['/home/me/one.json']);

    expect(onSingleFile).toHaveBeenCalledTimes(1);
    const [opened] = onSingleFile.mock.calls[0]!;
    expect(opened.name).toBe('one.json');
    await expect(opened.text()).resolves.toBe('{"single":true}');
    expect(queuedNames()).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('queues several dropped files with the usual format filtering', async () => {
    const { onSingleFile, onFilesAdded } = setup('csv', 'forward');

    await nativeDrop(['/home/me/a.json', '/home/me/b.json', '/home/me/c.csv']);

    expect(onSingleFile).not.toHaveBeenCalled();
    expect(queuedNames()).toEqual(['a.json', 'b.json']);
    expect(toast.success).toHaveBeenCalledWith('Added 2 files to the queue');
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)');
    expect(onFilesAdded).toHaveBeenCalledTimes(1);
  });
});
