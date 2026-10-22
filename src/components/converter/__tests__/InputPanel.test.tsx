import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import type { CodeEditorProps } from '@/components/converter/CodeEditor';
import { toast } from '@/components/ui/sonner';
import type { Direction, FormatId } from '@/converters/types';
import { parseJsonInput } from '@/lib/detect';
import { SAMPLE_JSON } from '@/lib/sample';
import { fileFromNativePath, isTauri, nativeOpenFiles } from '@/lib/tauri';
import type * as TauriModule from '@/lib/tauri';
import { InputPanel } from '../InputPanel';

vi.mock('@/components/converter/CodeEditorLazy', () => ({
  CodeEditorLazy: ({ value, onChange, language, ariaLabel, placeholder }: CodeEditorProps) => (
    <textarea
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      data-language={language}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));
vi.mock('@/components/ui/sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/lib/tauri', async (importOriginal) => ({
  ...(await importOriginal<typeof TauriModule>()),
  isTauri: vi.fn(() => false),
  nativeOpenFiles: vi.fn(),
  fileFromNativePath: vi.fn(),
}));

interface PanelProps {
  value?: string;
  error?: string | null;
  errorLine?: number | null;
  errorColumn?: number | null;
  format?: FormatId;
  direction?: Direction;
  onMultiFileDrop?: (files: File[]) => void;
}

function renderPanel(props: PanelProps = {}) {
  const onChange = vi.fn();
  const utils = render(
    <InputPanel
      value={props.value ?? ''}
      onChange={onChange}
      error={props.error ?? null}
      errorLine={props.errorLine ?? null}
      errorColumn={props.errorColumn ?? null}
      format={props.format ?? 'csv'}
      direction={props.direction ?? 'forward'}
      {...(props.onMultiFileDrop ? { onMultiFileDrop: props.onMultiFileDrop } : {})}
    />,
  );
  const root = utils.container.firstElementChild as HTMLElement;
  const fileInput = utils.container.querySelector<HTMLInputElement>('input[aria-hidden="true"]')!;
  return { ...utils, onChange, root, fileInput };
}

const jsonFile = (name = 'games.json', text = '[{"id":1}]') =>
  new File([text], name, { type: 'application/json' });

/** What a browser hands to drag events: `items` for the drag, files on drop. */
function dataTransfer(files: File[]) {
  return {
    files,
    items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
    types: ['Files'],
  };
}

beforeEach(() => {
  vi.mocked(isTauri).mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InputPanel — layout', () => {
  it('asks for JSON going forward', () => {
    renderPanel({ format: 'yaml' });
    const editor = screen.getByRole('textbox', { name: 'Input JSON' });
    expect(editor).toHaveAttribute(
      'placeholder',
      'Paste your JSON here, drop files, or load a sample…',
    );
    expect(editor).toHaveAttribute('data-language', 'json');
    expect(screen.getByText('Input JSON')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sample' })).toBeInTheDocument();
  });

  it("asks for the format's own text going back, without the JSON sample", () => {
    renderPanel({ format: 'yaml', direction: 'reverse' });
    const editor = screen.getByRole('textbox', { name: 'Input YAML' });
    expect(editor).toHaveAttribute(
      'placeholder',
      'Paste your YAML here, drop files, or load a sample…',
    );
    expect(editor).toHaveAttribute('data-language', 'yaml');
    expect(screen.queryByRole('button', { name: 'Sample' })).not.toBeInTheDocument();
  });

  it('limits the file picker to what the direction accepts', () => {
    expect(renderPanel().fileInput).toHaveAttribute('accept', '.json,.txt,application/json');
    expect(renderPanel({ format: 'toml', direction: 'reverse' }).fileInput).toHaveAttribute(
      'accept',
      '.toml,.txt,application/toml',
    );
  });

  it('passes edits straight through', () => {
    const { onChange } = renderPanel();
    fireEvent.change(screen.getByRole('textbox', { name: 'Input JSON' }), {
      target: { value: '{"a":1}' },
    });
    expect(onChange).toHaveBeenCalledWith('{"a":1}');
  });
});

describe('InputPanel — toolbar', () => {
  it('loads the sample data, which is valid array-of-objects JSON', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Sample' }));
    expect(onChange).toHaveBeenCalledWith(SAMPLE_JSON);
    expect(parseJsonInput(SAMPLE_JSON)).toMatchObject({ ok: true, shape: 'array-of-objects' });
  });

  it('clears the input, but only when there is something to clear', async () => {
    const user = userEvent.setup();
    const { onChange, rerender } = renderPanel();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

    rerender(<InputPanel value="[1]" onChange={onChange} format="csv" direction="forward" />);
    const clear = screen.getByRole('button', { name: 'Clear' });
    expect(clear).toBeEnabled();
    await user.click(clear);
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('InputPanel — error banner', () => {
  it('keeps an empty polite live region while the input is valid', () => {
    renderPanel();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toBeEmptyDOMElement();
  });

  it('shows the parse error with its line and column', () => {
    renderPanel({
      error: "Expected ',' or '}' after property value",
      errorLine: 3,
      errorColumn: 5,
    });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent("Ln 3, Col 5Expected ',' or '}' after property value");
  });

  it('defaults the column to 1 when only the line is known', () => {
    renderPanel({ error: 'Unexpected end of JSON input', errorLine: 2 });
    expect(screen.getByText('Ln 2, Col 1')).toBeInTheDocument();
  });

  it('shows errors without a known position as-is', () => {
    renderPanel({ error: 'Invalid CSV' });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/^Invalid CSV$/);
  });
});

describe('InputPanel — file picker (web)', () => {
  it('opens the hidden file input', async () => {
    const user = userEvent.setup();
    const { fileInput } = renderPanel();
    const click = vi.spyOn(fileInput, 'click');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(nativeOpenFiles).not.toHaveBeenCalled();
  });

  it('loads a picked JSON file into the editor', async () => {
    const { fileInput, onChange } = renderPanel();
    fireEvent.change(fileInput, { target: { files: [jsonFile('games.json', '[{"id":7}]')] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('[{"id":7}]'));
    expect(toast.success).toHaveBeenCalledWith('Loaded games.json');
  });

  it('accepts .txt files as a freeform escape hatch', async () => {
    const { fileInput, onChange } = renderPanel({ format: 'yaml', direction: 'reverse' });
    fireEvent.change(fileInput, {
      target: { files: [new File(['a: 1'], 'notes.TXT', { type: 'text/plain' })] },
    });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('a: 1'));
  });

  it('rejects a file of the wrong format', async () => {
    const { fileInput, onChange } = renderPanel();
    fireEvent.change(fileInput, { target: { files: [new File(['a,b'], 'data.csv')] } });
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)');
    await Promise.resolve();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports a file that cannot be read', async () => {
    class FailingReader {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal('FileReader', FailingReader);
    const { fileInput, onChange } = renderPanel();
    fireEvent.change(fileInput, { target: { files: [jsonFile('locked.json')] } });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to load file: Cannot read file: locked.json',
      ),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does nothing when the picker is dismissed', () => {
    const { fileInput, onChange } = renderPanel();
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });
});

describe('InputPanel — drag and drop', () => {
  it('shows a drop overlay while files are dragged over the panel', async () => {
    const { root } = renderPanel();
    const files = [jsonFile()];
    fireEvent.dragEnter(root, { dataTransfer: dataTransfer(files) });
    expect(await screen.findByText('Drop to load')).toBeInTheDocument();

    fireEvent.dragLeave(root, { dataTransfer: dataTransfer(files) });
    await waitFor(() => expect(screen.queryByText('Drop to load')).not.toBeInTheDocument());
  });

  it('loads a single dropped file and hides the overlay', async () => {
    const { root, onChange } = renderPanel();
    const files = [jsonFile('drop.json', '{"dropped":true}')];
    fireEvent.dragEnter(root, { dataTransfer: dataTransfer(files) });
    await screen.findByText('Drop to load');

    fireEvent.drop(root, { dataTransfer: dataTransfer(files) });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('{"dropped":true}'));
    expect(toast.success).toHaveBeenCalledWith('Loaded drop.json');
    expect(screen.queryByText('Drop to load')).not.toBeInTheDocument();
  });

  it('routes several dropped files to the batch handler', async () => {
    const onMultiFileDrop = vi.fn();
    const { root, onChange } = renderPanel({ onMultiFileDrop });
    const files = [jsonFile('a.json'), jsonFile('b.json')];
    fireEvent.drop(root, { dataTransfer: dataTransfer(files) });
    await waitFor(() => expect(onMultiFileDrop).toHaveBeenCalledTimes(1));
    expect(onMultiFileDrop.mock.calls[0]![0].map((f: File) => f.name)).toEqual([
      'a.json',
      'b.json',
    ]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('loads the first of several files when there is no batch handler', async () => {
    const { root, onChange } = renderPanel();
    fireEvent.drop(root, {
      dataTransfer: dataTransfer([jsonFile('first.json', '[1]'), jsonFile('second.json', '[2]')]),
    });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('[1]'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('warns about dropped files of the wrong format', async () => {
    const { root, onChange } = renderPanel();
    fireEvent.drop(root, {
      dataTransfer: dataTransfer([
        new File(['a,b'], 'one.csv', { type: 'text/csv' }),
        new File(['a: 1'], 'two.yaml', { type: 'application/yaml' }),
      ]),
    });
    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith('Skipped 2 files (wrong format)'),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('still loads the valid file from a mixed drop', async () => {
    const { root, onChange } = renderPanel({ format: 'csv', direction: 'reverse' });
    fireEvent.drop(root, {
      dataTransfer: dataTransfer([
        new File(['a,b\n1,2'], 'table.csv', { type: 'text/csv' }),
        jsonFile('wrong.json'),
      ]),
    });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('a,b\n1,2'));
    expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)');
  });
});

describe('InputPanel — native file dialog (desktop app)', () => {
  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(true);
  });

  it('offers JSON and text filters going forward and loads the pick', async () => {
    const user = userEvent.setup();
    vi.mocked(nativeOpenFiles).mockResolvedValueOnce(['C:\\data\\games.json']);
    vi.mocked(fileFromNativePath).mockResolvedValueOnce(jsonFile('games.json', '[{"id":3}]'));
    const { onChange, fileInput } = renderPanel();
    const click = vi.spyOn(fileInput, 'click');

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(nativeOpenFiles).toHaveBeenCalledWith({
      multiple: false,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    });
    expect(fileFromNativePath).toHaveBeenCalledWith('C:\\data\\games.json');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('[{"id":3}]'));
    expect(toast.success).toHaveBeenCalledWith('Loaded games.json');
    expect(click).not.toHaveBeenCalled();
  });

  it("filters on the format's own extensions going back", async () => {
    const user = userEvent.setup();
    vi.mocked(nativeOpenFiles).mockResolvedValueOnce(null);
    renderPanel({ format: 'yaml', direction: 'reverse' });

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(nativeOpenFiles).toHaveBeenCalledWith({
      multiple: false,
      filters: [
        { name: 'YAML', extensions: ['yaml', 'yml'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    });
  });

  it.each([null, []])('does nothing when the dialog returns %j', async (picked) => {
    const user = userEvent.setup();
    vi.mocked(nativeOpenFiles).mockResolvedValueOnce(picked);
    const { onChange } = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(fileFromNativePath).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('rejects a picked file with a disallowed extension', async () => {
    const user = userEvent.setup();
    vi.mocked(nativeOpenFiles).mockResolvedValueOnce(['/home/me/data.csv']);
    vi.mocked(fileFromNativePath).mockResolvedValueOnce(new File(['a,b'], 'data.csv'));
    const { onChange } = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith('Skipped 1 file (wrong format)'),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts Android content URIs without an extension', async () => {
    const user = userEvent.setup();
    vi.mocked(nativeOpenFiles).mockResolvedValueOnce([
      'content://com.android.providers.downloads.documents/document/msf%3A1000000123',
    ]);
    vi.mocked(fileFromNativePath).mockResolvedValueOnce(new File(['{"ok":1}'], '1000000123'));
    const { onChange } = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('{"ok":1}'));
    expect(toast.success).toHaveBeenCalledWith('1 file loaded');
  });

  it('reports a native read failure', async () => {
    const user = userEvent.setup();
    vi.mocked(nativeOpenFiles).mockResolvedValueOnce(['/root/secret.json']);
    vi.mocked(fileFromNativePath).mockRejectedValueOnce(new Error('forbidden path'));
    const { onChange } = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to load file: forbidden path'),
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
