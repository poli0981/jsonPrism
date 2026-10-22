import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CodeMirror, { EditorState, EditorView, type BasicSetupOptions } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { xml } from '@codemirror/lang-xml';
import { markdown } from '@codemirror/lang-markdown';
import { sql } from '@codemirror/lang-sql';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { lintGutter, linter, type Diagnostic } from '@codemirror/lint';
import { tags as t } from '@lezer/highlight';
import { parseJsonInput } from '@/lib/detect';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export type EditorLanguage =
  'json' | 'jsonl' | 'plain' | 'yaml' | 'xml' | 'markdown' | 'sql' | 'toml';

export interface CodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  language?: EditorLanguage;
  className?: string;
  placeholder?: string;
  /** Accessible name for the editable region (screen readers). */
  ariaLabel?: string;
}

/**
 * Prism Spectrum highlight style — assigns each lezer highlight tag
 * a color from the prism palette via CSS variables.
 */
const prismHighlightStyle = HighlightStyle.define([
  { tag: t.propertyName, color: 'var(--color-prism-violet)' },
  { tag: t.string, color: 'var(--color-prism-cyan)' },
  { tag: t.number, color: 'var(--color-prism-amber)' },
  { tag: [t.bool, t.null, t.keyword], color: 'var(--color-prism-rose)', fontStyle: 'italic' },
  { tag: t.punctuation, color: 'var(--muted-foreground)' },
  { tag: t.bracket, color: 'var(--muted-foreground)' },
  { tag: t.comment, color: 'var(--muted-foreground)', fontStyle: 'italic' },
]);

// Stable references: a new basicSetup object or extensions array on every
// render makes @uiw/react-codemirror reconfigure the whole editor per keystroke.
const EDITABLE_SETUP: BasicSetupOptions = {
  lineNumbers: true,
  highlightActiveLine: true,
  highlightActiveLineGutter: true,
  foldGutter: true,
  autocompletion: false,
  searchKeymap: true,
};
const READ_ONLY_SETUP: BasicSetupOptions = {
  ...EDITABLE_SETUP,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
};

/** Wrapping a multi-megabyte single line (minified JSON, base64) is very slow. */
const WRAP_LIMIT_CHARS = 1_000_000;

// File drops belong to the panel's dropzone (load into the editor or route to
// the batch queue). Without this, CodeMirror inserts the files' text itself.
const yieldFileDrops = EditorView.domEventHandlers({
  drop: (event) => (event.dataTransfer?.files.length ?? 0) > 0,
});

/** Linting re-parses the whole document; beyond this the conversion reports errors alone. */
const LINT_LIMIT_CHARS = 2_000_000;
const MAX_JSONL_DIAGNOSTICS = 100;

/**
 * Lints `text` (starting at document offset `start`) with the converter's own
 * parser, so the editor and the conversion agree — a leading byte-order mark
 * is fine, and error positions match on every engine. Blank text is a
 * prompt, not an error.
 */
function parseDiagnostic(view: EditorView, text: string, start: number): Diagnostic | null {
  const result = parseJsonInput(text);
  if (result.ok || result.error === 'empty') return null;
  const { doc } = view.state;
  let from = start;
  if (result.line !== undefined && result.column !== undefined) {
    const line = doc.line(Math.min(doc.lineAt(start).number + result.line - 1, doc.lines));
    from = Math.min(line.from + result.column - 1, line.to);
  }
  return { from, to: from, severity: 'error', message: result.error };
}

const jsonLint = linter((view) => {
  if (view.state.doc.length > LINT_LIMIT_CHARS) return [];
  const diagnostic = parseDiagnostic(view, view.state.doc.toString(), 0);
  return diagnostic ? [diagnostic] : [];
});

// JSONL: every non-blank line is its own JSON document.
const jsonlLint = linter((view) => {
  const { doc } = view.state;
  if (doc.length > LINT_LIMIT_CHARS) return [];
  const diagnostics: Diagnostic[] = [];
  for (let n = 1; n <= doc.lines && diagnostics.length < MAX_JSONL_DIAGNOSTICS; n++) {
    const line = doc.line(n);
    const diagnostic = parseDiagnostic(view, line.text, line.from);
    if (diagnostic) diagnostics.push(diagnostic);
  }
  return diagnostics;
});

function languageExtensions(language: EditorLanguage, readOnly: boolean) {
  switch (language) {
    case 'json':
      return readOnly ? [json()] : [json(), lintGutter(), jsonLint];
    case 'jsonl':
      return readOnly ? [json()] : [json(), lintGutter(), jsonlLint];
    case 'yaml':
      return [yaml()];
    case 'xml':
      return [xml()];
    case 'markdown':
      return [markdown()];
    case 'sql':
      return [sql()];
    case 'toml':
      return [StreamLanguage.define(toml)];
    case 'plain':
      return [];
  }
}

// English phrases used by CodeMirror's search panel, folding and lint UI.
const PHRASE_KEYS: Record<string, string> = {
  Find: 'find',
  Replace: 'replace',
  next: 'next',
  previous: 'previous',
  all: 'all',
  'match case': 'match_case',
  regexp: 'regexp',
  'by word': 'by_word',
  replace: 'replace_one',
  'replace all': 'replace_all',
  close: 'close',
  'Go to line': 'go_to_line',
  go: 'go',
  'Fold line': 'fold_line',
  'Unfold line': 'unfold_line',
  'folded code': 'folded_code',
  unfold: 'unfold',
  Diagnostics: 'diagnostics',
  'No diagnostics': 'no_diagnostics',
};

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  language = 'json',
  className,
  placeholder,
  ariaLabel,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const { t: translate, i18n } = useTranslation();
  const wrap = value.length < WRAP_LIMIT_CHARS;

  const phrases = useMemo(() => {
    const entries = Object.entries(PHRASE_KEYS).map(([phrase, key]) => [
      phrase,
      translate(`editor.phrases.${key}`, { defaultValue: phrase }),
    ]);
    return EditorState.phrases.of(Object.fromEntries(entries));
    // i18n.language drives re-translation; translate is stable per language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const extensions = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    const theme = EditorView.theme(
      {
        '&': {
          backgroundColor: 'transparent',
          color: 'var(--foreground)',
          height: '100%',
          fontSize: '13px',
        },
        // Scrollbar styling comes from globals.css so the "hide scrollbars"
        // preference applies here too.
        '.cm-scroller': {
          fontFamily: 'var(--font-mono)',
          lineHeight: '1.6',
          overflow: 'auto',
        },
        '.cm-content': {
          padding: '12px 0',
          caretColor: 'var(--color-prism-violet)',
        },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--muted-foreground)',
        },
        '.cm-activeLine': {
          backgroundColor: isDark
            ? 'color-mix(in oklch, var(--color-prism-violet) 7%, transparent)'
            : 'color-mix(in oklch, var(--color-prism-violet) 5%, transparent)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'transparent',
          color: 'var(--foreground)',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
          backgroundColor:
            'color-mix(in oklch, var(--color-prism-violet) 25%, transparent) !important',
        },
        '.cm-cursor': {
          borderLeftColor: 'var(--color-prism-violet)',
          borderLeftWidth: '2px',
        },
        '.cm-placeholder': {
          color: 'var(--muted-foreground)',
        },
        '&.cm-focused': {
          outline: 'none',
        },
      },
      { dark: isDark },
    );
    return [
      ...languageExtensions(language, readOnly),
      syntaxHighlighting(prismHighlightStyle),
      ...(wrap ? [EditorView.lineWrapping] : []),
      yieldFileDrops,
      phrases,
      EditorView.contentAttributes.of({
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        ...(readOnly ? { 'aria-readonly': 'true' } : {}),
      }),
      theme,
    ];
  }, [ariaLabel, language, phrases, readOnly, resolvedTheme, wrap]);

  return (
    <div className={cn('h-full overflow-hidden', className)}>
      <CodeMirror
        value={value}
        readOnly={readOnly}
        editable={!readOnly}
        {...(onChange !== undefined ? { onChange } : {})}
        {...(placeholder !== undefined ? { placeholder } : {})}
        extensions={extensions}
        basicSetup={readOnly ? READ_ONLY_SETUP : EDITABLE_SETUP}
        height="100%"
        theme="none"
      />
    </div>
  );
}
