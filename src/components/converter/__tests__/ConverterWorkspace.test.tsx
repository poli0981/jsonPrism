import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import type { CodeEditorProps } from '@/components/converter/CodeEditor';
import { toast } from '@/components/ui/sonner';
import { WORKER_THRESHOLD_CHARS } from '@/lib/convert-client';
import { downloadBlob } from '@/lib/download';
import { useBatchStore } from '@/stores/batchStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ConverterWorkspace } from '../ConverterWorkspace';

// CodeMirror has its own tests; a labelled textarea keeps the workspace fast.
vi.mock('@/components/converter/CodeEditorLazy', () => ({
  CodeEditorLazy: ({ value, onChange, readOnly, language, ariaLabel }: CodeEditorProps) => (
    <textarea
      value={value}
      readOnly={readOnly}
      aria-label={ariaLabel}
      data-language={language}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));
vi.mock('@/components/ui/sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/lib/download', () => ({ downloadBlob: vi.fn() }));
// Capture the native (desktop) drag-drop bridge so tests can drive it.
const nativeDrop = vi.hoisted(() => ({ handler: null as ((files: File[]) => void) | null }));
vi.mock('@/hooks/useTauriDragDrop', () => ({
  useTauriDragDrop: (onFiles: (files: File[]) => void) => {
    nativeDrop.handler = onFiles;
  },
}));

beforeEach(() => {
  useWorkspaceStore.setState({
    input: '',
    format: 'jsonl',
    direction: 'forward',
    optionsByFormat: {},
  });
  useBatchStore.getState().clear();
  nativeDrop.handler = null;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const inputBox = (name = 'Input JSON') => screen.getByRole('textbox', { name });
const outputBox = (name: string) => screen.getByRole('textbox', { name });
const chips = () => screen.getByRole('group', { name: 'Target format' });

function type(text: string, name?: string) {
  fireEvent.change(inputBox(name), { target: { value: text } });
}

function pressShortcut(code: string) {
  fireEvent.keyDown(window, { code, ctrlKey: true });
}

/** Files as react-dropzone reads them from a drop event. */
function dataTransfer(files: File[]) {
  return {
    files,
    items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
    types: ['Files'],
  };
}

describe('ConverterWorkspace — live conversion', () => {
  it('starts idle with both panels side by side on desktop', () => {
    render(<ConverterWorkspace />);
    expect(inputBox()).toHaveValue('');
    expect(
      screen.getByText('Output will appear here once you provide valid JSON.'),
    ).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Detected:/)).not.toBeInTheDocument();
  });

  it('converts JSON as it is typed and reports the result', () => {
    render(<ConverterWorkspace />);
    type('[{"id":1}]');

    expect(useWorkspaceStore.getState().input).toBe('[{"id":1}]');
    expect(outputBox('JSONL output (read-only)')).toHaveValue('{"id":1}\n');
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('10 B')).toBeInTheDocument();
    expect(screen.getByText('9 B')).toBeInTheDocument();
    expect(screen.getByText('Detected: array of objects')).toBeInTheDocument();
    expect(within(chips()).getByRole('button', { name: 'CSV' })).toHaveAttribute(
      'title',
      'Suggested for the detected shape',
    );
  });

  it('points at the syntax error and flags the status', () => {
    render(<ConverterWorkspace />);
    type('{"a":1,}');

    expect(screen.getByRole('status')).toHaveTextContent(/^Ln 1, Col 8/);
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /output/ })).not.toBeInTheDocument();
  });

  it('shows converter errors in the output panel', () => {
    useWorkspaceStore.setState({ format: 'toml' });
    render(<ConverterWorkspace />);
    type('[1, 2]');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'TOML requires the root value to be a plain object (table).',
    );
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('warns when large integers lose precision', () => {
    useWorkspaceStore.setState({ format: 'yaml' });
    render(<ConverterWorkspace />);
    type('{"id": 12345678901234567890}');
    expect(screen.getByText('precision loss')).toBeInTheDocument();
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('re-converts when another format is picked', async () => {
    const user = userEvent.setup();
    render(<ConverterWorkspace />);
    type('[{"id":1,"name":"Tunic"}]');

    await user.click(within(chips()).getByRole('button', { name: 'CSV' }));

    expect(useWorkspaceStore.getState().format).toBe('csv');
    expect(within(chips()).getByRole('button', { name: 'CSV' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(outputBox('CSV output (read-only)')).toHaveValue('id,name\n1,Tunic');
    expect(screen.getByText('.csv')).toBeInTheDocument();
  });

  it('shows "working" while a large input converts off the main thread', async () => {
    vi.useFakeTimers();
    // No Worker in this environment: the client converts in-thread after the debounce.
    vi.stubGlobal('Worker', undefined);
    const big = JSON.stringify([{ blob: 'x'.repeat(WORKER_THRESHOLD_CHARS) }]);
    render(<ConverterWorkspace />);

    act(() => useWorkspaceStore.getState().setInput(big));
    expect(screen.getByText('working')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading…')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading…')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'JSONL output (read-only)' })).toHaveValue(
      `${JSON.stringify({ blob: 'x'.repeat(WORKER_THRESHOLD_CHARS) })}\n`,
    );
  });
});

describe('ConverterWorkspace — direction', () => {
  it('falls back to a reversible format when switching to reverse', async () => {
    const user = userEvent.setup();
    useWorkspaceStore.setState({ format: 'xml' });
    render(<ConverterWorkspace />);

    await user.click(screen.getByRole('button', { name: '→ JSON' }));

    expect(useWorkspaceStore.getState()).toMatchObject({ direction: 'reverse', format: 'jsonl' });
    expect(inputBox('Input JSONL')).toBeInTheDocument();
    expect(within(chips()).getByRole('button', { name: 'XML' })).toBeDisabled();
  });

  it('keeps a reversible format and converts it back to JSON', async () => {
    const user = userEvent.setup();
    useWorkspaceStore.setState({ format: 'csv' });
    render(<ConverterWorkspace />);

    await user.click(screen.getByRole('button', { name: '→ JSON' }));
    expect(useWorkspaceStore.getState()).toMatchObject({ direction: 'reverse', format: 'csv' });

    type('a,b\n1,x', 'Input CSV');
    const output = outputBox('JSON output (read-only)');
    expect(JSON.parse((output as HTMLTextAreaElement).value)).toEqual([{ a: 1, b: 'x' }]);
    expect(screen.queryByRole('button', { name: 'Sample' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'JSON →' }));
    expect(useWorkspaceStore.getState()).toMatchObject({ direction: 'forward', format: 'csv' });
    expect(inputBox()).toBeInTheDocument();
  });

  it('converts JSONC back to JSON and places errors in the original text', () => {
    useWorkspaceStore.setState({ format: 'jsonc', direction: 'reverse' });
    render(<ConverterWorkspace />);

    type('{\n  // comment\n  "a": [1, 2,],\n}', 'Input JSONC');
    expect(outputBox('JSON output (read-only)')).toHaveValue('{\n  "a": [\n    1,\n    2\n  ]\n}');

    type('{\n  /* comment */\n  "a": 1\n  "b": 2\n}', 'Input JSONC');
    expect(screen.getByRole('status')).toHaveTextContent(/^Ln 4, Col 3/);
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('leaves an input-only format when switching to JSON →', async () => {
    const user = userEvent.setup();
    useWorkspaceStore.setState({ format: 'jsonc', direction: 'reverse' });
    render(<ConverterWorkspace />);

    await user.click(screen.getByRole('button', { name: 'JSON →' }));
    expect(useWorkspaceStore.getState()).toMatchObject({ direction: 'forward', format: 'jsonl' });
    expect(within(chips()).getByRole('button', { name: 'JSONC' })).toBeDisabled();
  });

  it('offers to read JSON with comments as JSONC', async () => {
    const user = userEvent.setup();
    render(<ConverterWorkspace />);
    type('[1, /* two */ 2]');

    await user.click(screen.getByRole('button', { name: 'Convert JSONC → JSON' }));
    expect(useWorkspaceStore.getState()).toMatchObject({ direction: 'reverse', format: 'jsonc' });
    expect(inputBox('Input JSONC')).toHaveValue('[1, /* two */ 2]');
    expect(outputBox('JSON output (read-only)')).toHaveValue('[\n  1,\n  2\n]');
  });
});

describe('ConverterWorkspace — options', () => {
  it('applies option changes to the output and can reset them', async () => {
    const user = userEvent.setup();
    render(<ConverterWorkspace />);
    type('[{"a":1}]');

    await user.click(screen.getByRole('button', { name: 'Options' }));
    const dialog = await screen.findByRole('dialog', { name: 'JSONL · Options' });
    await user.click(within(dialog).getByRole('switch', { name: 'Pretty-print each line' }));
    expect(useWorkspaceStore.getState().optionsByFormat['jsonl']).toEqual({ pretty: true });

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(outputBox('JSONL output (read-only)')).toHaveValue('{\n  "a": 1\n}\n');

    await user.click(screen.getByRole('button', { name: 'Options' }));
    await user.click(await screen.findByRole('button', { name: 'Reset to defaults' }));
    expect(toast.success).toHaveBeenCalledWith('Options reset to defaults');
    expect(useWorkspaceStore.getState().optionsByFormat['jsonl']).toEqual({ pretty: false });
  });
});

describe('ConverterWorkspace — keyboard shortcuts', () => {
  it('toggles the options sheet with Mod+,', async () => {
    render(<ConverterWorkspace />);
    act(() => pressShortcut('Comma'));
    expect(await screen.findByRole('dialog', { name: 'JSONL · Options' })).toBeInTheDocument();
  });

  it('downloads the output with Mod+S', async () => {
    render(<ConverterWorkspace />);
    type('[{"a":1}]');

    await act(async () => pressShortcut('KeyS'));

    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'output.jsonl');
    await expect(vi.mocked(downloadBlob).mock.lastCall![0].text()).resolves.toBe('{"a":1}\n');
    expect(toast.success).toHaveBeenCalledWith('Downloaded output.jsonl');
  });

  it('ignores Mod+S while there is nothing to download', async () => {
    render(<ConverterWorkspace />);
    await act(async () => pressShortcut('KeyS'));
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});

describe('ConverterWorkspace — files', () => {
  it('queues several dropped files and opens the batch panel', async () => {
    render(<ConverterWorkspace />);
    const files = [
      new File(['[1]'], 'one.json', { type: 'application/json' }),
      new File(['[2]'], 'two.json', { type: 'application/json' }),
    ];

    // Dropped on the editor, the event bubbles up to the input panel's dropzone.
    fireEvent.drop(inputBox(), { dataTransfer: dataTransfer(files) });

    expect(await screen.findByRole('dialog', { name: /Batch queue/ })).toBeInTheDocument();
    expect(useBatchStore.getState().itemOrder).toHaveLength(2);
    expect(toast.success).toHaveBeenCalledWith('Added 2 files to the queue');
  });

  it('loads a single file dropped from the OS into the editor (desktop app)', async () => {
    render(<ConverterWorkspace />);
    act(() => nativeDrop.handler!([new File(['[{"from":"disk"}]'], 'disk.json')]));

    await waitFor(() => expect(inputBox()).toHaveValue('[{"from":"disk"}]'));
    expect(toast.success).toHaveBeenCalledWith('Loaded disk.json');
    // The output follows in a deferred (lower-priority) render.
    expect(await screen.findByRole('textbox', { name: 'JSONL output (read-only)' })).toHaveValue(
      '{"from":"disk"}\n',
    );
  });

  it('accepts an OS file without an extension (Android content URI)', async () => {
    render(<ConverterWorkspace />);
    act(() => nativeDrop.handler!([new File(['{"a":1}'], '1000000123')]));
    await waitFor(() => expect(inputBox()).toHaveValue('{"a":1}'));
  });

  it('rejects an OS file of the wrong format', () => {
    render(<ConverterWorkspace />);
    act(() => nativeDrop.handler!([new File(['a: 1'], 'config.yaml')]));
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)');
    expect(inputBox()).toHaveValue('');
  });

  it('accepts OS files in the reverse format', async () => {
    useWorkspaceStore.setState({ format: 'yaml', direction: 'reverse' });
    render(<ConverterWorkspace />);
    act(() => nativeDrop.handler!([new File(['a: 1'], 'config.yml')]));
    await waitFor(() => expect(inputBox('Input YAML')).toHaveValue('a: 1'));
  });

  it('reports an OS file that cannot be read', async () => {
    render(<ConverterWorkspace />);
    const file = new File(['[]'], 'gone.json');
    Object.defineProperty(file, 'text', {
      value: () => Promise.reject(new Error('The file was moved')),
    });

    act(() => nativeDrop.handler!([file]));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to load file: The file was moved'),
    );
    expect(inputBox()).toHaveValue('');
  });

  it('sends several OS files to the batch queue', async () => {
    render(<ConverterWorkspace />);
    act(() => nativeDrop.handler!([new File(['[1]'], 'a.json'), new File(['[2]'], 'b.json')]));
    expect(await screen.findByRole('dialog', { name: /Batch queue/ })).toBeInTheDocument();
    expect(useBatchStore.getState().itemOrder).toHaveLength(2);
  });
});

describe('ConverterWorkspace — mobile layout', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })),
    );
  });

  const badgeOn = (tab: HTMLElement) => tab.querySelector('[aria-hidden="true"]') !== null;

  it('shows input and output as tabs', () => {
    render(<ConverterWorkspace />);
    expect(screen.getByRole('tab', { name: 'Input' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Output' })).toHaveAttribute('aria-selected', 'false');
    // Both editors stay mounted so undo history survives tab switches.
    expect(inputBox()).toBeInTheDocument();
  });

  it('marks unseen output on the Output tab until it is opened', async () => {
    const user = userEvent.setup();
    render(<ConverterWorkspace />);
    const outputTab = screen.getByRole('tab', { name: 'Output' });
    expect(badgeOn(outputTab)).toBe(false);

    type('[{"a":1}]');
    expect(badgeOn(outputTab)).toBe(true);

    await user.click(outputTab);
    expect(outputTab).toHaveAttribute('aria-selected', 'true');
    expect(badgeOn(outputTab)).toBe(false);
    expect(outputBox('JSONL output (read-only)')).toHaveValue('{"a":1}\n');

    await user.click(screen.getByRole('tab', { name: 'Input' }));
    expect(badgeOn(outputTab)).toBe(false);
    type('[{"a":2}]');
    expect(badgeOn(outputTab)).toBe(true);
  });
});
