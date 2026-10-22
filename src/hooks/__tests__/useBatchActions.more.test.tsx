import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';
import { strFromU8, unzipSync } from 'fflate';
import '@/i18n';
import { toast } from '@/components/ui/sonner';
import type { Direction, FormatId } from '@/converters/types';
import { useBatchActions } from '@/hooks/useBatchActions';
import { useBatchStore, type BatchItemStatus } from '@/stores/batchStore';

interface Row {
  name: string;
  content?: string;
  status?: BatchItemStatus;
  output?: string;
}

/** Queues files and moves them to the given state; returns their ids. */
function seed(rows: Row[]): string[] {
  const store = useBatchStore.getState();
  const before = store.itemOrder.length;
  store.addFiles(rows.map((row) => new File([row.content ?? '[]'], row.name)));
  const ids = useBatchStore.getState().itemOrder.slice(before);
  rows.forEach((row, i) => {
    const status = row.status ?? (row.output === undefined ? 'queued' : 'done');
    store.updateItem(ids[i]!, {
      status,
      ...(row.output === undefined ? {} : { output: row.output }),
    });
  });
  return ids;
}

function statuses(): BatchItemStatus[] {
  const { items, itemOrder } = useBatchStore.getState();
  return itemOrder.map((id) => items[id]!.status);
}

function renderActions(
  format: FormatId = 'jsonl',
  options: Record<string, unknown> = { pretty: false },
  direction: Direction = 'forward',
) {
  return renderHook(() => useBatchActions(format, direction, options)).result;
}

beforeEach(() => {
  useBatchStore.getState().clear();
  vi.spyOn(toast, 'success').mockImplementation(() => 0);
  vi.spyOn(toast, 'info').mockImplementation(() => 0);
  vi.spyOn(toast, 'error').mockImplementation(() => 0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useBatchActions.start', () => {
  it('ignores a second start while a batch is running', async () => {
    seed([{ name: 'done.json', output: '{"a":1}\n' }]);
    useBatchStore.getState().setProcessing(true);
    const result = renderActions();

    await act(() => result.current.start());

    expect(statuses()).toEqual(['done']);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('tells the user when nothing is queued', async () => {
    const result = renderActions();

    await act(() => result.current.start());

    expect(toast.info).toHaveBeenCalledWith('Nothing queued to process.');
    expect(useBatchStore.getState().processing).toBe(false);
    expect(useBatchStore.getState().abortController).toBeNull();
  });

  it('reports a run that fails as a whole and releases the queue', async () => {
    seed([{ name: 'a.json' }]);
    // A format id the registry does not know (e.g. stale persisted state).
    const result = renderActions('parquet' as FormatId, {});

    await act(() => result.current.start());

    expect(toast.success).toHaveBeenCalledWith('Processing 1 file…');
    expect(toast.error).toHaveBeenCalledWith('Batch failed: Unknown converter: parquet');
    expect(toast.success).not.toHaveBeenCalledWith('Batch complete');
    expect(useBatchStore.getState().processing).toBe(false);
    expect(useBatchStore.getState().abortController).toBeNull();
  });

  it('cancels a running batch and leaves unfinished rows queued', async () => {
    seed([
      { name: 'a.json', content: '[{"a":1}]' },
      { name: 'b.json', content: '[{"b":2}]' },
    ]);
    const result = renderActions();
    let run!: Promise<void>;

    act(() => {
      run = result.current.start();
    });
    expect(useBatchStore.getState().processing).toBe(true);
    act(() => result.current.cancel());
    await act(() => run);

    expect(statuses()).toEqual(['queued', 'queued']);
    expect(toast.info).toHaveBeenCalledWith('Batch cancelled');
    expect(toast.success).not.toHaveBeenCalledWith('Batch complete');
    expect(useBatchStore.getState().processing).toBe(false);
    expect(useBatchStore.getState().abortController).toBeNull();
  });

  it('cancel() is harmless when nothing is running', () => {
    const result = renderActions();

    act(() => result.current.cancel());

    expect(toast.info).toHaveBeenCalledWith('Batch cancelled');
    expect(useBatchStore.getState().processing).toBe(false);
  });

  it('does not reset the store when a newer run has taken over', async () => {
    seed([{ name: 'a.json', content: '[1]' }]);
    const result = renderActions();
    let first!: Promise<void>;
    act(() => {
      first = result.current.start();
    });
    const firstController = useBatchStore.getState().abortController;

    // The user clears the queue and starts again while run #1 winds down.
    act(() => useBatchStore.getState().clear());
    expect(firstController?.signal.aborted).toBe(true);
    seed([{ name: 'b.json', content: '[2]' }]);
    let second!: Promise<void>;
    act(() => {
      second = result.current.start();
    });
    const secondController = useBatchStore.getState().abortController;
    expect(secondController).not.toBe(firstController);

    await act(() => first);
    expect(useBatchStore.getState().processing).toBe(true);
    expect(useBatchStore.getState().abortController).toBe(secondController);

    await act(() => second);
    expect(useBatchStore.getState().processing).toBe(false);
    expect(statuses()).toEqual(['done']);
  });

  it('batches row updates with setTimeout when requestAnimationFrame is unavailable', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const [id] = seed([{ name: 'rows.json', content: '[{"a":1},{"b":2}]' }]);
    const result = renderActions();

    await act(() => result.current.start());

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 16);
    const item = useBatchStore.getState().items[id!]!;
    expect(item.status).toBe('done');
    expect(item.output).toBe('{"a":1}\n{"b":2}\n');
    expect(toast.success).toHaveBeenCalledWith('Batch complete');
  });
});

describe('useBatchActions.downloadZip', () => {
  const today = new Date('2026-10-22T08:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(today);
  });

  function captureBrowserDownload() {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:batch-zip');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicked: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ href: this.href, download: this.download });
    });
    return {
      clicked,
      revokeObjectURL,
      createObjectURL,
      async entries() {
        const blob = createObjectURL.mock.calls[0]![0] as Blob;
        expect(blob.type).toBe('application/zip');
        return unzipSync(new Uint8Array(await blob.arrayBuffer()));
      },
    };
  }

  it('downloads the finished outputs as a dated zip in the browser', async () => {
    const download = captureBrowserDownload();
    seed([
      { name: 'one.json', output: '{"a":1}\n' },
      { name: 'two.json', output: '{"b":2}\n' },
      { name: 'broken.json', status: 'error' },
      { name: 'waiting.json' },
    ]);
    const result = renderActions();

    await act(() => result.current.downloadZip());

    expect(download.clicked).toEqual([
      { href: 'blob:batch-zip', download: 'jsonprism-batch-2026-10-22.zip' },
    ]);
    const entries = await download.entries();
    expect(Object.keys(entries)).toEqual(['one.jsonl', 'two.jsonl']);
    expect(strFromU8(entries['one.jsonl']!)).toBe('{"a":1}\n');
    expect(toast.success).toHaveBeenCalledWith('Packed 2 files into a .zip');

    vi.advanceTimersByTime(30_000);
    expect(download.revokeObjectURL).toHaveBeenCalledWith('blob:batch-zip');
  });

  it('decodes binary outputs with the configured encoding', async () => {
    const download = captureBrowserDownload();
    seed([{ name: 'one.json', output: '81a16101' }]);
    const result = renderActions('msgpack', { encoding: 'hex' });

    await act(() => result.current.downloadZip());

    const entries = await download.entries();
    expect(Array.from(entries['one.msgpack']!)).toEqual([0x81, 0xa1, 0x61, 0x01]);
    expect(toast.success).toHaveBeenCalledWith('Packed 1 file into a .zip');
  });

  it('names reverse-mode outputs .json', async () => {
    const download = captureBrowserDownload();
    seed([{ name: 'people.yaml', output: '{"name":"Ada"}' }]);
    const result = renderActions('yaml', {}, 'reverse');

    await act(() => result.current.downloadZip());

    expect(Object.keys(await download.entries())).toEqual(['people.json']);
  });

  it('reports a zip that cannot be built', async () => {
    const download = captureBrowserDownload();
    seed([{ name: 'one.json', output: 'definitely not base64!' }]);
    const result = renderActions('msgpack', {});

    await act(() => result.current.downloadZip());

    expect(toast.error).toHaveBeenCalledWith('Could not build .zip: Base64 string is malformed');
    expect(toast.success).not.toHaveBeenCalled();
    expect(download.clicked).toEqual([]);
  });

  describe('inside Tauri', () => {
    let ipc: [string, unknown][];
    let savePath: string | null;

    beforeEach(() => {
      ipc = [];
      savePath = '/home/me/Downloads/batch.zip';
      vi.stubGlobal('__IS_TAURI_BUILD__', true);
      mockIPC((cmd, payload) => {
        ipc.push([cmd, payload]);
        if (cmd === 'plugin:dialog|save') return savePath;
        if (cmd === 'plugin:fs|write_file') return null;
        throw new Error(`Unexpected IPC command ${cmd}`);
      });
    });

    afterEach(() => {
      clearMocks();
      Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
      Reflect.deleteProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__');
    });

    it('saves through the native dialog instead of a browser download', async () => {
      const createObjectURL = vi.spyOn(URL, 'createObjectURL');
      seed([{ name: 'one.json', output: '{"a":1}\n' }]);
      const result = renderActions();

      await act(() => result.current.downloadZip());

      expect(ipc.map(([cmd]) => cmd)).toEqual(['plugin:dialog|save', 'plugin:fs|write_file']);
      expect(ipc[0]![1]).toEqual({
        options: {
          defaultPath: 'jsonprism-batch-2026-10-22.zip',
          filters: [
            { name: 'Zip archive', extensions: ['zip'] },
            { name: '*', extensions: ['*'] },
          ],
        },
      });
      const written = unzipSync(ipc[1]![1] as Uint8Array);
      expect(strFromU8(written['one.jsonl']!)).toBe('{"a":1}\n');
      expect(toast.success).toHaveBeenCalledWith('Packed 1 file into a .zip');
      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('writes nothing and stays quiet when the dialog is cancelled', async () => {
      savePath = null;
      seed([{ name: 'one.json', output: '{"a":1}\n' }]);
      const result = renderActions();

      await act(() => result.current.downloadZip());

      expect(ipc.map(([cmd]) => cmd)).toEqual(['plugin:dialog|save']);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
