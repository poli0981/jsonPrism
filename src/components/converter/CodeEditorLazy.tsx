import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { ChunkErrorBoundary } from '@/components/common/ChunkErrorBoundary';
import type { CodeEditorProps } from './CodeEditor';

// CodeMirror + its language packs are the heaviest part of the bundle. Defer
// them so first paint never waits on the `cm-core`/`cm-langs` chunks.
const CodeEditor = lazy(() => import('./CodeEditor').then((m) => ({ default: m.CodeEditor })));

/**
 * Plain-textarea stand-in shown while the editor chunk loads (and reused as the
 * graceful fallback if that chunk fails to load — see ChunkErrorBoundary).
 * It's a real controlled input, so typing before CodeMirror arrives is kept
 * (the value lives in the Zustand store, not the editor).
 */
function EditorFallback({
  value,
  onChange,
  placeholder,
  readOnly = false,
  className,
}: CodeEditorProps) {
  return (
    <div className={cn('h-full overflow-hidden', className)}>
      <textarea
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="text-foreground placeholder:text-muted-foreground/50 h-full w-full resize-none bg-transparent px-4 py-4 font-mono text-[13px] leading-[1.6] outline-none"
      />
    </div>
  );
}

export function CodeEditorLazy(props: CodeEditorProps) {
  return (
    // If the editor chunk fails to load, keep the input usable via the textarea
    // rather than blanking the panel or crashing the app.
    <ChunkErrorBoundary fallback={<EditorFallback {...props} />}>
      <Suspense fallback={<EditorFallback {...props} />}>
        <CodeEditor {...props} />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
