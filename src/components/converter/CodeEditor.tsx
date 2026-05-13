import { useMemo } from 'react';
import CodeMirror, { type ReactCodeMirrorRef, EditorView } from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { lintGutter, linter } from '@codemirror/lint';
import { tags as t } from '@lezer/highlight';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  language?: 'json' | 'plain';
  className?: string;
  placeholder?: string;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
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

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  language = 'json',
  className,
  placeholder,
  editorRef,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();

  const extensions = useMemo(() => {
    const exts = [];
    if (language === 'json') {
      exts.push(json());
      if (!readOnly) {
        exts.push(lintGutter(), linter(jsonParseLinter()));
      }
    }
    exts.push(syntaxHighlighting(prismHighlightStyle));
    exts.push(EditorView.lineWrapping);
    return exts;
  }, [language, readOnly]);

  const themeExt = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    return EditorView.theme(
      {
        '&': {
          backgroundColor: 'transparent',
          color: 'var(--foreground)',
          height: '100%',
          fontSize: '13px',
        },
        '.cm-scroller': {
          fontFamily: 'var(--font-mono)',
          lineHeight: '1.6',
        },
        '.cm-content': {
          padding: '16px 0',
          caretColor: 'var(--color-prism-violet)',
        },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--muted-foreground)',
          opacity: '0.5',
        },
        '.cm-activeLine': {
          backgroundColor: isDark
            ? 'color-mix(in oklch, var(--color-prism-violet) 6%, transparent)'
            : 'color-mix(in oklch, var(--color-prism-violet) 4%, transparent)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'transparent',
          color: 'var(--foreground)',
          opacity: '0.9',
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
          opacity: '0.5',
        },
      },
      { dark: isDark },
    );
  }, [resolvedTheme]);

  return (
    <div className={cn('h-full overflow-hidden', className)}>
      <CodeMirror
        ref={editorRef}
        value={value}
        readOnly={readOnly}
        editable={!readOnly}
        {...(onChange !== undefined ? { onChange } : {})}
        {...(placeholder !== undefined ? { placeholder } : {})}
        extensions={[...extensions, themeExt]}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          foldGutter: true,
          autocompletion: false,
          searchKeymap: true,
        }}
        height="100%"
        theme="none"
      />
    </div>
  );
}
