import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@/i18n';
import type { CodeEditorProps } from '@/components/converter/CodeEditor';
import type * as CodeEditorModule from '@/components/converter/CodeEditor';
import { ThemeProvider } from '@/lib/theme';
import { CodeEditorLazy } from '../CodeEditorLazy';

// The real editor module, behind a switch that simulates a failed chunk load.
const chunk = vi.hoisted(() => ({ broken: false }));
vi.mock('@/components/converter/CodeEditor', async (importOriginal) => {
  const actual = await importOriginal<typeof CodeEditorModule>();
  const { createElement } = await import('react');
  return {
    ...actual,
    CodeEditor: (props: CodeEditorProps) => {
      if (chunk.broken) {
        throw new TypeError(
          'Failed to fetch dynamically imported module: /assets/CodeEditor-1a2b3c.js',
        );
      }
      return createElement(actual.CodeEditor, props);
    },
  };
});

const emptyRect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 };
const originalGetClientRects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects');
beforeAll(() => {
  // jsdom has no layout; CodeMirror measures ranges for the cursor layer.
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...emptyRect, toJSON: () => emptyRect });
});

afterAll(() => {
  if (originalGetClientRects) {
    Object.defineProperty(Range.prototype, 'getClientRects', originalGetClientRects);
  } else {
    Reflect.deleteProperty(Range.prototype, 'getClientRects');
  }
  Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
});

afterEach(() => {
  chunk.broken = false;
  vi.restoreAllMocks();
});

function renderLazy(props: CodeEditorProps) {
  return render(
    <ThemeProvider>
      <CodeEditorLazy {...props} />
    </ThemeProvider>,
  );
}

describe('CodeEditorLazy', () => {
  // Must run first: once the lazy chunk resolves, React caches it for the file.
  it('offers a working textarea until CodeMirror has loaded', async () => {
    const onChange = vi.fn();
    const { container } = renderLazy({
      value: '{"a":1}',
      onChange,
      placeholder: 'Paste your JSON here…',
      ariaLabel: 'Input JSON',
    });

    const fallback = screen.getByRole('textbox', { name: 'Input JSON' });
    expect(fallback.tagName).toBe('TEXTAREA');
    expect(fallback).toHaveValue('{"a":1}');
    expect(fallback).toHaveAttribute('placeholder', 'Paste your JSON here…');
    expect(fallback).toHaveAttribute('spellcheck', 'false');
    expect(fallback).not.toHaveAttribute('readonly');
    fireEvent.change(fallback, { target: { value: '{"a":2}' } });
    expect(onChange).toHaveBeenCalledWith('{"a":2}');

    await waitFor(() => expect(container.querySelector('.cm-editor')).not.toBeNull());
    expect(container.querySelector('textarea')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Input JSON' })).toHaveClass('cm-content');
  });

  it('renders CodeMirror straight away once the chunk is cached', () => {
    const { container } = renderLazy({ value: 'a: 1', language: 'yaml', readOnly: true });
    expect(container.querySelector('.cm-content')).toHaveAttribute('data-language', 'yaml');
  });

  it('keeps a usable textarea if the editor chunk fails to load', () => {
    chunk.broken = true;
    // React and the boundary both report the caught error; keep the output clean.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onChange = vi.fn();
    renderLazy({ value: 'name: Tunic', onChange, ariaLabel: 'Input YAML' });

    const fallback = screen.getByRole('textbox', { name: 'Input YAML' });
    expect(fallback.tagName).toBe('TEXTAREA');
    expect(fallback).toHaveValue('name: Tunic');
    fireEvent.change(fallback, { target: { value: 'name: Inscryption' } });
    expect(onChange).toHaveBeenCalledWith('name: Inscryption');
    expect(consoleError).toHaveBeenCalledWith(
      '[jsonprism:chunk]',
      'Chunk failed to load:',
      expect.any(TypeError),
      expect.any(String),
    );
  });

  it('keeps the read-only fallback read-only', () => {
    chunk.broken = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderLazy({ value: '{"out":true}', readOnly: true, ariaLabel: 'JSON output (read-only)' });

    const fallback = screen.getByRole('textbox', { name: 'JSON output (read-only)' });
    expect(fallback).toHaveAttribute('readonly');
    fireEvent.change(fallback, { target: { value: 'x' } });
    expect(fallback).toHaveValue('{"out":true}');
  });
});
