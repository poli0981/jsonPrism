import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';
import '@/i18n';
import { toast } from '@/components/ui/sonner';
import type { Direction, FormatId } from '@/converters/types';
import { pathHashAsMillis } from '@/lib/tauri';
import { BATCH_MAX_FILES, useBatchStore } from '@/stores/batchStore';
import { BatchPanel } from '../BatchPanel';

function jsonFile(name: string, content = '[{"id":1}]'): File {
  return new File([content], name, { type: 'application/json', lastModified: 1_700_000_000_000 });
}

/** Queues files directly through the store; returns their ids. */
function seed(...files: File[]): string[] {
  const before = useBatchStore.getState().itemOrder.length;
  act(() => {
    useBatchStore.getState().addFiles(files);
  });
  return useBatchStore.getState().itemOrder.slice(before);
}

function queuedNames(): string[] {
  const { items, itemOrder } = useBatchStore.getState();
  return itemOrder.map((id) => items[id]?.filename ?? '?');
}

function renderPanel({
  format = 'jsonl' as FormatId,
  direction = 'forward' as Direction,
  open = true,
}: { format?: FormatId; direction?: Direction; open?: boolean } = {}) {
  const onOpenChange = vi.fn<(open: boolean) => void>();
  const view = render(
    <BatchPanel
      format={format}
      direction={direction}
      options={{ pretty: false }}
      open={open}
      onOpenChange={onOpenChange}
    />,
  );
  return { ...view, onOpenChange };
}

/** The hidden `<input type="file">` the browse button forwards to. */
function browseInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"].hidden');
  if (!input) throw new Error('browse input not rendered');
  return input;
}

function dropZone(): HTMLElement {
  const zone = browseInput().parentElement;
  if (!zone) throw new Error('drop zone not rendered');
  return zone;
}

/** A drag event payload as react-dropzone reads it (jsdom has no DataTransfer). */
function withFiles(files: File[]) {
  return {
    dataTransfer: {
      files,
      items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
      types: ['Files'],
    },
  };
}

function chip(label: string): HTMLElement {
  return within(screen.getByRole('status')).getByText(label).parentElement!;
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });

let user: UserEvent;

beforeEach(() => {
  // No artificial delays between pointer steps; `accept` is only a hint, so
  // uploads reach the component's own extension filter.
  user = userEvent.setup({ delay: null, applyAccept: false });
  useBatchStore.getState().clear();
  vi.spyOn(toast, 'success').mockImplementation(() => 0);
  vi.spyOn(toast, 'warning').mockImplementation(() => 0);
  vi.spyOn(toast, 'info').mockImplementation(() => 0);
  vi.spyOn(toast, 'error').mockImplementation(() => 0);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BatchPanel trigger', () => {
  it('shows how many files are queued and asks to open the sheet', async () => {
    seed(jsonFile('a.json'), jsonFile('b.json'), jsonFile('c.json'));
    const { onOpenChange } = renderPanel({ open: false });

    const trigger = button(/Batch/);
    expect(trigger).toHaveTextContent('Batch3');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('shows no count while the queue is empty', () => {
    renderPanel({ open: false });
    expect(button(/Batch/)).toHaveTextContent(/^Batch$/);
  });
});

describe('BatchPanel sheet', () => {
  it('renders an empty queue with every action disabled', () => {
    renderPanel();

    expect(screen.getByRole('dialog', { name: 'Batch queue 0 / 500' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Process multiple JSON files into JSONL at once. All processing happens on your device.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Drop JSON files here')).toBeInTheDocument();
    expect(
      screen.getByText('No files queued yet. Drop JSON files above to begin.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(button('Clear')).toBeDisabled();
    expect(button('Process')).toBeDisabled();
    expect(button('Download .zip')).toBeDisabled();
  });

  it('labels everything for the reverse direction', () => {
    seed(new File(['a: 1'], 'config.yaml'));
    renderPanel({ format: 'yaml', direction: 'reverse' });

    expect(
      screen.getByText(
        'Process multiple YAML files into JSON at once. All processing happens on your device.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Drop YAML files here')).toBeInTheDocument();
    expect(screen.getByText('→ .json')).toBeInTheDocument();
    expect(browseInput()).toHaveAttribute('accept', '.yaml,.yml,.txt,application/yaml');
  });

  it('lists queued files with live summary counts', () => {
    const [, done, failed] = seed(jsonFile('a.json'), jsonFile('b.json'), jsonFile('c.json'));
    act(() => {
      useBatchStore.getState().updateItem(done!, { status: 'done', output: '{"id":1}\n' });
      useBatchStore.getState().updateItem(failed!, { status: 'error', error: 'Bad JSON' });
    });
    renderPanel();

    expect(screen.getByRole('dialog', { name: 'Batch queue 3 / 500' })).toBeInTheDocument();
    expect(chip('queued')).toHaveTextContent('queued1');
    expect(chip('done')).toHaveTextContent('done1');
    expect(chip('failed')).toHaveTextContent('failed1');
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getAllByText('→ .jsonl')).toHaveLength(3);
    expect(button('Clear')).toBeEnabled();
    expect(button('Process')).toBeEnabled();
    expect(button('Download .zip')).toBeEnabled();
  });

  it('closes from the sheet close button', async () => {
    const { onOpenChange } = renderPanel();

    await user.click(button('Close'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('BatchPanel adding files (web)', () => {
  it('forwards the browse button to the hidden file input', async () => {
    renderPanel();
    const click = vi.spyOn(browseInput(), 'click').mockImplementation(() => {});

    await user.click(button('or click to browse…'));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it('queues picked files, skipping the wrong format, and resets the input', async () => {
    renderPanel();
    const input = browseInput();

    await user.upload(input, [jsonFile('a.json'), new File(['x,y'], 'table.csv')]);

    expect(queuedNames()).toEqual(['a.json']);
    expect(toast.success).toHaveBeenCalledWith('Added 1 file to the queue');
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)');
    expect(input.value).toBe('');
    expect(screen.getByRole('dialog', { name: 'Batch queue 1 / 500' })).toBeInTheDocument();
  });

  it('ignores an empty selection', () => {
    renderPanel();

    fireEvent.change(browseInput(), { target: { files: [] } });

    expect(queuedNames()).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('adds nothing when every picked file has the wrong format', async () => {
    renderPanel();

    await user.upload(browseInput(), [new File(['x,y'], 'table.csv')]);

    expect(queuedNames()).toEqual([]);
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('reports duplicates', async () => {
    const data = jsonFile('data.json');
    seed(data);
    renderPanel();

    await user.upload(browseInput(), [data]);

    expect(queuedNames()).toEqual(['data.json']);
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 duplicate file');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('reports files beyond the queue limit', async () => {
    seed(...Array.from({ length: BATCH_MAX_FILES - 1 }, (_, i) => jsonFile(`f${i}.json`)));
    renderPanel();

    await user.upload(browseInput(), [jsonFile('x.json'), jsonFile('y.json')]);

    expect(useBatchStore.getState().itemOrder).toHaveLength(BATCH_MAX_FILES);
    expect(toast.success).toHaveBeenCalledWith('Added 1 file to the queue');
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (limit: 500)');
  });

  it('highlights the drop zone while dragging and queues dropped files', async () => {
    renderPanel();
    const file = jsonFile('dropped.json');

    fireEvent.dragEnter(dropZone(), withFiles([file]));
    expect(await screen.findByText('Release to add files')).toBeInTheDocument();

    fireEvent.drop(dropZone(), withFiles([file]));

    await waitFor(() => expect(queuedNames()).toEqual(['dropped.json']));
    expect(toast.success).toHaveBeenCalledWith('Added 1 file to the queue');
    expect(screen.getByText('Drop JSON files here')).toBeInTheDocument();
  });

  it('warns when the drop contains files of another type', async () => {
    renderPanel();

    fireEvent.drop(dropZone(), withFiles([new File(['x,y'], 'table.csv', { type: 'text/csv' })]));

    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)'),
    );
    expect(queuedNames()).toEqual([]);
  });
});

describe('BatchPanel queue actions', () => {
  it('processes the queue and offers the outputs as a zip', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:batch');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    seed(jsonFile('one.json', '[{"a":1}]'), jsonFile('two.json', '[{"b":2},{"c":3}]'));
    renderPanel();

    await user.click(button('Process'));

    await waitFor(() => expect(chip('done')).toHaveTextContent('done2'));
    expect(chip('queued')).toHaveTextContent('queued0');
    expect(screen.getByText('out: 8 B')).toBeInTheDocument();
    expect(screen.getByText('out: 16 B')).toBeInTheDocument();
    await waitFor(() => expect(button('Process')).toBeEnabled());

    await user.click(button('Download .zip'));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Packed 2 files into a .zip'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatch(/^jsonprism-batch-\d{4}-\d{2}-\d{2}\.zip$/);
  });

  it('swaps Process for Cancel while a batch runs', async () => {
    const [running] = seed(jsonFile('a.json'), jsonFile('b.json'));
    const controller = new AbortController();
    act(() => {
      useBatchStore.getState().setAbortController(controller);
      useBatchStore.getState().setProcessing(true);
      useBatchStore.getState().updateItem(running!, { status: 'processing' });
    });
    renderPanel();

    // The row being converted is neither queued, done nor failed.
    expect(chip('queued')).toHaveTextContent('queued1');
    expect(chip('done')).toHaveTextContent('done0');
    expect(screen.queryByRole('button', { name: 'Process' })).not.toBeInTheDocument();
    expect(button('Clear')).toBeDisabled();
    expect(button('Download .zip')).toBeDisabled();
    expect(button('Remove a.json from queue')).toBeDisabled();

    await user.click(button('Cancel'));

    expect(controller.signal.aborted).toBe(true);
    expect(toast.info).toHaveBeenCalledWith('Batch cancelled');
  });

  it('removes single rows and clears the queue', async () => {
    seed(jsonFile('a.json'), jsonFile('b.json'));
    renderPanel();

    await user.click(button('Remove a.json from queue'));
    expect(queuedNames()).toEqual(['b.json']);
    expect(screen.queryByText('a.json')).not.toBeInTheDocument();

    await user.click(button('Clear'));
    expect(queuedNames()).toEqual([]);
    expect(
      screen.getByText('No files queued yet. Drop JSON files above to begin.'),
    ).toBeInTheDocument();
  });

  it('aborts a running batch when its queue empties', () => {
    const [only] = seed(jsonFile('a.json'));
    const controller = new AbortController();
    act(() => {
      useBatchStore.getState().setAbortController(controller);
      useBatchStore.getState().setProcessing(true);
    });
    renderPanel();
    expect(controller.signal.aborted).toBe(false);

    act(() => useBatchStore.getState().removeItem(only!));

    expect(controller.signal.aborted).toBe(true);
  });
});

describe('BatchPanel native picker (Tauri)', () => {
  const ANDROID_URI = 'content://com.android.providers.media.documents/document/msf%3A1000000123';
  let ipc: [string, Record<string, unknown>][];
  let picked: string[] | null;
  let unreadable: string | null;

  beforeEach(() => {
    ipc = [];
    picked = ['/home/me/a.json', ANDROID_URI];
    unreadable = null;
    // fileFromNativePath logs the stat() fallback at debug level.
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.stubGlobal('__IS_TAURI_BUILD__', true);
    mockIPC((cmd, payload) => {
      const args = (payload ?? {}) as Record<string, unknown>;
      ipc.push([cmd, args]);
      switch (cmd) {
        case 'plugin:dialog|open':
          return picked;
        case 'plugin:fs|read_text_file':
          if (args['path'] === unreadable) throw new Error('permission denied');
          return Array.from(new TextEncoder().encode('[{"id":1}]'));
        case 'plugin:fs|stat':
          // stat() on Android content URIs is unreliable.
          if (String(args['path']).startsWith('content://')) throw new Error('unsupported');
          return { mtime: 1_700_000_000_000 };
        default:
          throw new Error(`Unexpected IPC command ${cmd}`);
      }
    });
  });

  afterEach(() => {
    cleanup();
    clearMocks();
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
    Reflect.deleteProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__');
  });

  const dialogOptions = () => ipc.find(([cmd]) => cmd === 'plugin:dialog|open')?.[1]['options'];

  it('queues files chosen in the native dialog, keeping extension-less Android picks', async () => {
    renderPanel();
    const webPicker = vi.spyOn(browseInput(), 'click');

    await user.click(button('or click to browse…'));

    await waitFor(() => expect(queuedNames()).toEqual(['a.json', '1000000123']));
    const { items, itemOrder } = useBatchStore.getState();
    // Real mtime where stat() works, a stable path hash where it does not.
    expect(itemOrder.map((id) => items[id]!.file.lastModified)).toEqual([
      1_700_000_000_000,
      pathHashAsMillis(ANDROID_URI),
    ]);
    expect(webPicker).not.toHaveBeenCalled();
    expect(dialogOptions()).toEqual({
      multiple: true,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    });
    expect(toast.success).toHaveBeenCalledWith('Added 2 files to the queue');
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('offers the source format in reverse mode and does nothing on cancel', async () => {
    picked = null;
    renderPanel({ format: 'yaml', direction: 'reverse' });

    await user.click(button('or click to browse…'));

    await waitFor(() =>
      expect(dialogOptions()).toEqual({
        multiple: true,
        filters: [
          { name: 'YAML', extensions: ['yaml', 'yml'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      }),
    );
    expect(ipc.map(([cmd]) => cmd)).toEqual(['plugin:dialog|open']);
    expect(queuedNames()).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('does nothing when the dialog returns no paths', async () => {
    picked = [];
    renderPanel();

    await user.click(button('or click to browse…'));

    await waitFor(() => expect(dialogOptions()).toBeDefined());
    expect(queuedNames()).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports files the native side cannot read', async () => {
    picked = ['/home/me/a.json'];
    unreadable = '/home/me/a.json';
    renderPanel();

    await user.click(button('or click to browse…'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to load file: permission denied'),
    );
    expect(queuedNames()).toEqual([]);
  });
});
