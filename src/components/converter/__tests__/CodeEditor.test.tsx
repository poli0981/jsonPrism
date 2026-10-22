import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, createEvent, fireEvent, render } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { diagnosticCount, forceLinting } from '@codemirror/lint';
import i18n from 'i18next';
import '@/i18n';
import { parseJsonInput } from '@/lib/detect';
import { editorLanguageFor } from '@/lib/editor-language';
import { ThemeProvider, type Theme } from '@/lib/theme';
import { CodeEditor, type CodeEditorProps, type EditorLanguage } from '../CodeEditor';

// jsdom has no layout engine; CodeMirror measures text ranges to draw the
// cursor and selection layers. Empty geometry is enough for these tests.
const emptyRect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 };
const rangeGeometry = ['getClientRects', 'getBoundingClientRect'] as const;
const originalGeometry = rangeGeometry.map((key) =>
  Object.getOwnPropertyDescriptor(Range.prototype, key),
);

beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...emptyRect, toJSON: () => emptyRect });
});

afterAll(() => {
  rangeGeometry.forEach((key, i) => {
    const original = originalGeometry[i];
    if (original) Object.defineProperty(Range.prototype, key, original);
    else Reflect.deleteProperty(Range.prototype, key);
  });
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

function renderEditor(props: CodeEditorProps, theme: Theme = 'dark') {
  const utils = render(
    <ThemeProvider defaultTheme={theme}>
      <CodeEditor {...props} />
    </ThemeProvider>,
  );
  const root = utils.container.querySelector<HTMLElement>('.cm-editor')!;
  const content = utils.container.querySelector<HTMLElement>('.cm-content')!;
  const view = EditorView.findFromDOM(root)!;
  const rerender = (next: CodeEditorProps) =>
    utils.rerender(
      <ThemeProvider defaultTheme={theme}>
        <CodeEditor {...next} />
      </ThemeProvider>,
    );
  return { ...utils, root, content, view, rerender };
}

/** Replace the whole document, as typing or pasting would. */
function typeInto(view: EditorView, text: string) {
  act(() => {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      userEvent: 'input.type',
    });
  });
}

async function lintNow(view: EditorView): Promise<number> {
  await act(async () => {
    forceLinting(view);
  });
  return diagnosticCount(view.state);
}

describe('CodeEditor — editable', () => {
  it('renders the value in a labelled, editable textbox', () => {
    const { content, view, container } = renderEditor({
      value: '{"a":1}',
      ariaLabel: 'Input JSON',
    });
    expect(view.state.doc.toString()).toBe('{"a":1}');
    expect(content).toHaveAttribute('role', 'textbox');
    expect(content).toHaveAttribute('aria-label', 'Input JSON');
    expect(content).toHaveAttribute('contenteditable', 'true');
    expect(content).not.toHaveAttribute('aria-readonly');
    expect(content).toHaveAttribute('data-language', 'json');
    expect(content).toHaveClass('cm-lineWrapping');
    expect(container.querySelector('.cm-lineNumbers')).not.toBeNull();
    expect(container.querySelector('.cm-gutter-lint')).not.toBeNull();
  });

  it('shows the placeholder while empty', () => {
    const { container } = renderEditor({ value: '', placeholder: 'Paste your JSON here…' });
    expect(container.querySelector('.cm-placeholder')).toHaveTextContent('Paste your JSON here…');
  });

  it('reports user edits through onChange', () => {
    const onChange = vi.fn();
    const { view } = renderEditor({ value: '', onChange });
    typeInto(view, '[1, 2]');
    expect(onChange).toHaveBeenLastCalledWith('[1, 2]', expect.anything());
  });

  it('follows the value prop without echoing it back', () => {
    const onChange = vi.fn();
    const { view, rerender } = renderEditor({ value: 'a', onChange });
    rerender({ value: '{"loaded":true}', onChange });
    expect(view.state.doc.toString()).toBe('{"loaded":true}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('tolerates a missing onChange', () => {
    const { view } = renderEditor({ value: '' });
    typeInto(view, '{}');
    expect(view.state.doc.toString()).toBe('{}');
  });
});

describe('CodeEditor — read-only', () => {
  it('marks the content read-only and drops the editing chrome', () => {
    const { content, container } = renderEditor({
      value: 'a: 1',
      readOnly: true,
      language: 'yaml',
      ariaLabel: 'YAML output (read-only)',
    });
    expect(content).toHaveAttribute('contenteditable', 'false');
    expect(content).toHaveAttribute('aria-readonly', 'true');
    expect(content).toHaveAttribute('aria-label', 'YAML output (read-only)');
    expect(container.querySelector('.cm-lineNumbers')).not.toBeNull();
    expect(container.querySelector('.cm-activeLine')).toBeNull();
    expect(container.querySelector('.cm-gutter-lint')).toBeNull();
  });

  it('does not lint read-only JSON', async () => {
    const { view } = renderEditor({ value: '{"broken":', readOnly: true });
    expect(await lintNow(view)).toBe(0);
  });
});

describe('CodeEditor — languages', () => {
  it.each<[EditorLanguage, string | null]>([
    ['json', 'json'],
    ['jsonl', 'json'],
    ['yaml', 'yaml'],
    ['xml', 'xml'],
    ['markdown', 'markdown'],
    ['sql', 'sql'],
    ['toml', 'toml'],
    ['plain', null],
  ])('loads the %s language pack', (language, expected) => {
    const { content } = renderEditor({ value: 'x', language, readOnly: true });
    if (expected) expect(content).toHaveAttribute('data-language', expected);
    else expect(content).not.toHaveAttribute('data-language');
  });

  it('defaults to JSON', () => {
    const { content } = renderEditor({ value: '[]' });
    expect(content).toHaveAttribute('data-language', 'json');
  });
});

describe('CodeEditor — JSON linting', () => {
  it('flags invalid JSON but not an empty or blank editor', async () => {
    const { view } = renderEditor({ value: '' });
    expect(await lintNow(view)).toBe(0);

    typeInto(view, '{"a": 1,');
    expect(await lintNow(view)).toBeGreaterThan(0);

    typeInto(view, '  \n\t ');
    expect(await lintNow(view)).toBe(0);

    typeInto(view, '{"a": 1}');
    expect(await lintNow(view)).toBe(0);
  });

  // Regression: JSONL typed in reverse mode used the JSON linter, which marked
  // every valid multi-line document as an error.
  it('does not flag valid JSONL typed in reverse mode', async () => {
    const { view } = renderEditor({
      value: '{"a":1}\n{"a":2}\n',
      language: editorLanguageFor('jsonl', 'reverse'),
    });
    expect(await lintNow(view)).toBe(0);
  });

  it('flags each invalid JSONL line on its own', async () => {
    const { view } = renderEditor({
      value: '{"a":1}\n{"a":\n\n[1,2]\nnope\n',
      language: editorLanguageFor('jsonl', 'reverse'),
    });
    expect(await lintNow(view)).toBe(2);
  });

  // Regression: the editor lint rejected a leading byte-order mark that the
  // converter accepts.
  it('agrees with the converter about a leading byte-order mark', async () => {
    const BOM = String.fromCharCode(0xfeff);
    const text = `${BOM}{"a":1}`;
    expect(parseJsonInput(text).ok).toBe(true);
    const { view } = renderEditor({ value: text });
    expect(await lintNow(view)).toBe(0);
  });
});

describe('CodeEditor — behaviour', () => {
  it('leaves file drops to the surrounding dropzone', async () => {
    const { content, view } = renderEditor({ value: 'keep' });
    const file = new File(['{"x":1}'], 'x.json', { type: 'application/json' });
    const drop = createEvent.drop(content, { dataTransfer: { files: [file], types: ['Files'] } });
    fireEvent(content, drop);
    // CodeMirror's own handler would read the file and insert its text.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(drop.defaultPrevented).toBe(true);
    expect(view.state.doc.toString()).toBe('keep');
  });

  it('does not claim drops that carry no files', () => {
    const { content } = renderEditor({ value: 'keep' });
    const textDrop = createEvent.drop(content, {
      dataTransfer: { files: [], types: ['text/plain'], getData: () => '' },
    });
    fireEvent(content, textDrop);
    expect(textDrop.defaultPrevented).toBe(false);

    const bareDrop = createEvent.drop(content);
    fireEvent(content, bareDrop);
    expect(bareDrop.defaultPrevented).toBe(false);
  });

  it('turns off line wrapping for huge single-line documents', () => {
    const { content } = renderEditor({ value: 'x'.repeat(1_000_000), readOnly: true });
    expect(content).not.toHaveClass('cm-lineWrapping');
  });

  it('follows the app theme', () => {
    expect(renderEditor({ value: '' }, 'dark').view.state.facet(EditorView.darkTheme)).toBe(true);
    expect(renderEditor({ value: '' }, 'light').view.state.facet(EditorView.darkTheme)).toBe(false);
  });

  it('translates search and lint UI phrases with the app language', async () => {
    const { view } = renderEditor({ value: '' });
    expect(view.state.phrase('Find')).toBe('Find');
    expect(view.state.phrase('Go to line')).toBe('Go to line');

    await act(async () => {
      await i18n.changeLanguage('vi');
    });
    expect(view.state.phrase('Find')).toBe(i18n.t('editor.phrases.find'));
    expect(view.state.phrase('Find')).not.toBe('Find');
  });
});
