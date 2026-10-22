import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import type { CodeEditorProps } from '@/components/converter/CodeEditor';
import { toast } from '@/components/ui/sonner';
import { downloadBlob } from '@/lib/download';
import { isTauri, nativeSaveBlob } from '@/lib/tauri';
import type * as TauriModule from '@/lib/tauri';
import { OutputPanel } from '../OutputPanel';

// CodeMirror is covered by CodeEditor.test.tsx; a textarea keeps this file fast.
vi.mock('@/components/converter/CodeEditorLazy', () => ({
  CodeEditorLazy: ({ value, readOnly, language, ariaLabel }: CodeEditorProps) => (
    <textarea value={value} readOnly={readOnly} aria-label={ariaLabel} data-language={language} />
  ),
}));
vi.mock('@/components/ui/sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/lib/download', () => ({ downloadBlob: vi.fn() }));
vi.mock('@/lib/tauri', async (importOriginal) => ({
  ...(await importOriginal<typeof TauriModule>()),
  isTauri: vi.fn(() => false),
  nativeSaveBlob: vi.fn(),
}));

const CSV = 'id,name\n1,Tunic';

// user-event's own clipboard stub reads through jsdom's FileReader, which
// rejects the Node Blob that src/test/setup.ts installs; use a plain spy.
const writeText = vi.fn<(text: string) => Promise<void>>();
function installClipboard() {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
}

/** userEvent.setup() swaps in its clipboard stub, so re-install ours after it. */
function setupUser() {
  const user = userEvent.setup();
  installClipboard();
  return user;
}

beforeEach(() => {
  vi.mocked(isTauri).mockReturnValue(false);
  writeText.mockResolvedValue(undefined);
  installClipboard();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'clipboard');
});

const copyButton = () => screen.getByRole('button', { name: 'Copy' });
const downloadButton = () => screen.getByRole('button', { name: 'Download' });

async function lastDownloaded(): Promise<{ blob: Blob; name: string; bytes: number[] }> {
  const [blob, name] = vi.mocked(downloadBlob).mock.lastCall!;
  return { blob, name, bytes: [...new Uint8Array(await blob.arrayBuffer())] };
}

describe('OutputPanel — states', () => {
  it('prompts for input while there is no output', () => {
    render(<OutputPanel format="csv" content="" />);
    expect(
      screen.getByText('Output will appear here once you provide valid JSON.'),
    ).toBeInTheDocument();
    expect(screen.getByText('.csv')).toBeInTheDocument();
    expect(copyButton()).toBeDisabled();
    expect(downloadButton()).toBeDisabled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('names the source format in reverse', () => {
    render(<OutputPanel format="yaml" content="" direction="reverse" />);
    expect(
      screen.getByText('Output will appear here once you provide valid YAML.'),
    ).toBeInTheDocument();
    expect(screen.getByText('.json')).toBeInTheDocument();
  });

  it('shows the output in a read-only editor with the target grammar', () => {
    render(<OutputPanel format="yaml" content="a: 1" />);
    const editor = screen.getByRole('textbox', { name: 'YAML output (read-only)' });
    expect(editor).toHaveValue('a: 1');
    expect(editor).toHaveAttribute('readonly');
    expect(editor).toHaveAttribute('data-language', 'yaml');
    expect(copyButton()).toBeEnabled();
    expect(downloadButton()).toBeEnabled();
  });

  it('labels reverse output as JSON', () => {
    render(<OutputPanel format="csv" content='[{"a":1}]' direction="reverse" />);
    const editor = screen.getByRole('textbox', { name: 'JSON output (read-only)' });
    expect(editor).toHaveAttribute('data-language', 'json');
  });

  it('replaces the output with a focusable alert on error', () => {
    render(
      <OutputPanel format="toml" content="" error="TOML requires the root value to be a table." />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('TOML requires the root value to be a table.');
    expect(alert).toHaveAttribute('tabindex', '0');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(copyButton()).toBeDisabled();
    expect(downloadButton()).toBeDisabled();
  });

  it('disables the actions when an error accompanies stale output', () => {
    render(<OutputPanel format="csv" content={CSV} error="Conversion failed: boom" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Conversion failed: boom');
    expect(copyButton()).toBeDisabled();
    expect(downloadButton()).toBeDisabled();
  });

  it('shows a spinner while a newer result is computed', () => {
    const { rerender } = render(<OutputPanel format="csv" content={CSV} pending />);
    expect(screen.getByLabelText('Loading…')).toBeInTheDocument();
    rerender(<OutputPanel format="csv" content={CSV} />);
    expect(screen.queryByLabelText('Loading…')).not.toBeInTheDocument();
  });
});

describe('OutputPanel — copy', () => {
  it('copies the output and confirms it', async () => {
    const user = setupUser();
    render(<OutputPanel format="csv" content={CSV} />);

    await user.click(copyButton());

    expect(writeText).toHaveBeenCalledWith(CSV);
    expect(toast.success).toHaveBeenCalledWith('Copied CSV to clipboard');
    // The visible label flips; the accessible name stays "Copy".
    expect(copyButton()).toHaveTextContent('Copied');
  });

  it('reverts the "Copied" label after a moment, restarting on each copy', async () => {
    vi.useFakeTimers();
    render(<OutputPanel format="csv" content={CSV} />);

    await act(async () => fireEvent.click(copyButton()));
    expect(copyButton()).toHaveTextContent('Copied');

    act(() => vi.advanceTimersByTime(1000));
    await act(async () => fireEvent.click(copyButton()));
    act(() => vi.advanceTimersByTime(1000));
    expect(copyButton()).toHaveTextContent('Copied');

    act(() => vi.advanceTimersByTime(500));
    expect(copyButton()).toHaveTextContent('Copy');
    expect(copyButton()).not.toHaveTextContent('Copied');
  });

  it('clears the feedback timer on unmount', async () => {
    vi.useFakeTimers();
    const { unmount } = render(<OutputPanel format="csv" content={CSV} />);
    await act(async () => fireEvent.click(copyButton()));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports a clipboard failure', async () => {
    const user = setupUser();
    writeText.mockRejectedValueOnce(new Error('denied'));
    render(<OutputPanel format="csv" content={CSV} />);

    await user.click(copyButton());

    expect(toast.error).toHaveBeenCalledWith("Couldn't copy to clipboard");
    expect(toast.success).not.toHaveBeenCalled();
    expect(copyButton()).toHaveTextContent('Copy');
  });
});

describe('OutputPanel — download (web)', () => {
  it('downloads text output with the format extension and MIME type', async () => {
    const user = setupUser();
    render(<OutputPanel format="csv" content={CSV} />);

    await user.click(downloadButton());

    const { blob, name } = await lastDownloaded();
    expect(name).toBe('output.csv');
    expect(blob.type).toBe('text/csv');
    await expect(blob.text()).resolves.toBe(CSV);
    expect(toast.success).toHaveBeenCalledWith('Downloaded output.csv');
  });

  it('downloads reverse output as JSON', async () => {
    const user = setupUser();
    render(<OutputPanel format="yaml" content='{"a":1}' direction="reverse" />);

    await user.click(downloadButton());

    const { blob, name } = await lastDownloaded();
    expect(name).toBe('output.json');
    expect(blob.type).toBe('application/json');
    await expect(blob.text()).resolves.toBe('{"a":1}');
  });

  it('decodes base64 display text back to raw bytes for binary formats', async () => {
    const user = setupUser();
    render(<OutputPanel format="bson" content="AQID/w==" options={{ encoding: 'base64' }} />);

    await user.click(downloadButton());

    const { blob, name, bytes } = await lastDownloaded();
    expect(name).toBe('output.bson');
    expect(blob.type).toBe('application/bson');
    expect(bytes).toEqual([1, 2, 3, 255]);
  });

  it('decodes hex display text when that encoding is selected', async () => {
    const user = setupUser();
    render(<OutputPanel format="cbor" content="a1616101" options={{ encoding: 'hex' }} />);

    await user.click(downloadButton());

    const { name, bytes } = await lastDownloaded();
    expect(name).toBe('output.cbor');
    expect(bytes).toEqual([0xa1, 0x61, 0x61, 0x01]);
  });

  it('assumes base64 when no encoding option is given', async () => {
    const user = setupUser();
    render(<OutputPanel format="msgpack" content="gaFhAQ==" />);

    await user.click(downloadButton());

    const { blob, bytes } = await lastDownloaded();
    expect(blob.type).toBe('application/x-msgpack');
    expect(bytes).toEqual([0x81, 0xa1, 0x61, 0x01]);
  });

  it('reports a download that cannot be built', async () => {
    const user = setupUser();
    render(<OutputPanel format="bson" content="abc" options={{ encoding: 'hex' }} />);

    await user.click(downloadButton());

    expect(downloadBlob).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Download failed: Hex string has odd length');
  });
});

describe('OutputPanel — download (desktop app)', () => {
  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(true);
  });

  it('saves through the native dialog', async () => {
    const user = setupUser();
    vi.mocked(nativeSaveBlob).mockResolvedValueOnce('C:\\Users\\me\\output.csv');
    render(<OutputPanel format="csv" content={CSV} />);

    await user.click(downloadButton());

    expect(nativeSaveBlob).toHaveBeenCalledWith(expect.any(Blob), 'output.csv', {
      name: 'CSV',
      extensions: ['csv'],
    });
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Downloaded output.csv');
  });

  it('stays quiet when the save dialog is cancelled', async () => {
    const user = setupUser();
    vi.mocked(nativeSaveBlob).mockResolvedValueOnce(null);
    render(<OutputPanel format="yaml" content="a: 1" direction="reverse" />);

    await user.click(downloadButton());

    expect(nativeSaveBlob).toHaveBeenCalledWith(expect.any(Blob), 'output.json', {
      name: 'JSON',
      extensions: ['json'],
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports a failed native save', async () => {
    const user = setupUser();
    vi.mocked(nativeSaveBlob).mockRejectedValueOnce(new Error('Permission denied'));
    render(<OutputPanel format="csv" content={CSV} />);

    await user.click(downloadButton());

    expect(toast.error).toHaveBeenCalledWith('Download failed: Permission denied');
  });
});

describe('OutputPanel — imperative actions (keyboard shortcuts)', () => {
  it('registers copy and download handlers that act on the current output', async () => {
    const registerActions = vi.fn();
    render(<OutputPanel format="csv" content={CSV} registerActions={registerActions} />);
    const actions = registerActions.mock.lastCall![0] as { copy(): void; download(): void };

    await act(async () => actions.download());
    expect((await lastDownloaded()).name).toBe('output.csv');

    await act(async () => actions.copy());
    expect(writeText).toHaveBeenCalledWith(CSV);
  });

  it('re-registers when the output changes', async () => {
    const registerActions = vi.fn();
    const { rerender } = render(
      <OutputPanel format="csv" content="a" registerActions={registerActions} />,
    );
    rerender(<OutputPanel format="csv" content="b" registerActions={registerActions} />);
    const actions = registerActions.mock.lastCall![0] as { download(): void };

    await act(async () => actions.download());
    await expect((await lastDownloaded()).blob.text()).resolves.toBe('b');
  });

  it('ignores the shortcuts while there is nothing valid to act on', async () => {
    const registerActions = vi.fn();
    const { rerender } = render(
      <OutputPanel format="csv" content="" registerActions={registerActions} />,
    );
    let actions = registerActions.mock.lastCall![0] as { copy(): void; download(): void };
    await act(async () => {
      actions.copy();
      actions.download();
    });

    rerender(
      <OutputPanel format="csv" content={CSV} error="stale" registerActions={registerActions} />,
    );
    actions = registerActions.mock.lastCall![0] as { copy(): void; download(): void };
    await act(async () => actions.download());

    expect(writeText).not.toHaveBeenCalled();
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
