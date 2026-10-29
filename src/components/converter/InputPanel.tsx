import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Eraser, FileText, FolderOpen, MessageSquareCode } from 'lucide-react';
import { ToolbarButton } from '@/components/common/ToolbarButton';
import { toast } from '@/components/ui/sonner';
import { parseJsonc } from '@/converters/jsonc';
import { extensionsFor } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { useFileAccept } from '@/hooks/useFileAccept';
import { WORKER_THRESHOLD_CHARS } from '@/lib/convert-client';
import { editorLanguageFor } from '@/lib/editor-language';
import { errorMessage } from '@/lib/errors';
import { extOf } from '@/lib/file-filter';
import { readFileText } from '@/lib/read-file';
import { SAMPLE_JSON } from '@/lib/sample';
import { fileFromNativePath, isTauri, nativeOpenFiles, type DialogFilter } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { CodeEditorLazy } from './CodeEditorLazy';

interface InputPanelProps {
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  errorLine?: number | null;
  errorColumn?: number | null;
  /** Drives accept list, file picker filter, and editor label. */
  format: FormatId;
  /** Forward = JSON-only; reverse = the format's native extensions. */
  direction: Direction;
  /** Called when 2+ files are dropped — workspace routes them into batch. */
  onMultiFileDrop?: (files: File[]) => void;
  /** Switches to JSONC → JSON; offered when JSON → fails on valid JSONC. */
  onReadAsJsonc?: () => void;
}

export function InputPanel({
  value,
  onChange,
  error,
  errorLine,
  errorColumn,
  format,
  direction,
  onMultiFileDrop,
  onReadAsJsonc,
}: InputPanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const { converter, isReverse, accept, fileInputAccept, allowedExtensions } = useFileAccept(
    format,
    direction,
  );
  const formatLabel = t(converter.meta.labelKey);
  const inputLabel = isReverse
    ? t('home.input_label_format', { format: formatLabel })
    : t('home.input_label');

  const hasAllowedExt = useCallback(
    (name: string) => allowedExtensions.includes(extOf(name)),
    [allowedExtensions],
  );

  const loadFile = useCallback(
    (file: File) => {
      if (!hasAllowedExt(file.name)) {
        toast.warning(t('batch.toast.wrong_format', { count: 1 }));
        return;
      }
      readFileText(file).then(
        (text) => {
          onChange(text);
          toast.success(t('toast.file_loaded', { name: file.name }));
        },
        (err: unknown) => toast.error(t('toast.file_failed', { message: errorMessage(err) })),
      );
    },
    [hasAllowedExt, onChange, t],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setDragActive(false);
      if (acceptedFiles.length === 0) return;
      if (acceptedFiles.length > 1 && onMultiFileDrop) {
        onMultiFileDrop(acceptedFiles);
        return;
      }
      loadFile(acceptedFiles[0]!);
    },
    [loadFile, onMultiFileDrop],
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      setDragActive(false);
      if (rejections.length > 0) {
        toast.warning(t('batch.toast.wrong_format', { count: rejections.length }));
      }
    },
    [t],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept,
    multiple: true,
    noClick: true,
    noKeyboard: true,
  });

  const dialogFilters = (): DialogFilter[] =>
    isReverse
      ? [
          { name: formatLabel, extensions: extensionsFor(format) },
          { name: t('file_dialog.text'), extensions: ['txt'] },
        ]
      : [
          { name: t('file_dialog.json'), extensions: ['json'] },
          { name: t('file_dialog.text'), extensions: ['txt'] },
        ];

  const handleOpenFile = async () => {
    if (!isTauri()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const paths = await nativeOpenFiles({ multiple: false, filters: dialogFilters() });
      if (!paths || paths.length === 0) return;
      const file = await fileFromNativePath(paths[0]!);
      // The native dialog already filtered; reject only when the name carries
      // a recognizable, disallowed extension. Android content URIs often have
      // no extension at all (opaque document ids) — don't reject those.
      const pickedExt = extOf(file.name);
      if (pickedExt && !allowedExtensions.includes(pickedExt)) {
        toast.warning(t('batch.toast.wrong_format', { count: 1 }));
        return;
      }
      onChange(await file.text());
      // Android content URIs sometimes yield an opaque document id with no
      // real filename (e.g. `msf:1000000123`); fall back to a count message.
      toast.success(
        pickedExt
          ? t('toast.file_loaded', { name: file.name })
          : t('toast.files_loaded', { count: 1 }),
      );
    } catch (err) {
      toast.error(t('toast.file_failed', { message: errorMessage(err) }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) loadFile(file);
  };

  // Comments or trailing commas make JSON → fail; if that is all that is wrong,
  // offer JSONC. Inputs this big convert in the worker, so skip the extra parse.
  const looksLikeJsonc = useMemo(
    () => !isReverse && !!error && value.length < WORKER_THRESHOLD_CHARS && parseJsonc(value).ok,
    [error, isReverse, value],
  );

  const showOverlay = isDragActive || dragActive;
  const position =
    errorLine != null
      ? t('home.error_position', { line: errorLine, column: errorColumn ?? 1 })
      : null;

  return (
    <div className="relative flex h-full flex-col" {...getRootProps()}>
      <input {...getInputProps()} />
      <input
        ref={fileInputRef}
        type="file"
        accept={fileInputAccept}
        className="hidden"
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden
      />

      <div className="border-border/70 flex items-center justify-between gap-2 border-b px-3 py-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="label-mono truncate">{inputLabel}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => void handleOpenFile()}
            label={t('home.open_file')}
            icon={<FolderOpen className="motion-safe:group-hover:animate-bob h-3.5 w-3.5" />}
          />
          {!isReverse && (
            <ToolbarButton
              onClick={() => onChange(SAMPLE_JSON)}
              label={t('home.load_sample')}
              icon={
                <FileText className="h-3.5 w-3.5 transition-transform motion-safe:group-hover:-rotate-6" />
              }
            />
          )}
          <ToolbarButton
            onClick={() => onChange('')}
            label={t('home.clear')}
            icon={<Eraser className="motion-safe:group-hover:animate-nudge h-3.5 w-3.5" />}
            disabled={!value}
          />
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={cn(
          'border-destructive/30 bg-destructive/5 text-destructive border-b px-3 py-1 font-mono text-xs',
          !error && 'sr-only',
        )}
      >
        {error ? (
          <>
            {position && <span className="mr-2 font-semibold">{position}</span>}
            <span className="break-words">{error}</span>
          </>
        ) : null}
      </div>

      {looksLikeJsonc && onReadAsJsonc && (
        <div className="border-border/70 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-3 py-1 text-xs">
          <span className="text-muted-foreground">{t('home.jsonc_hint')}</span>
          <button
            type="button"
            onClick={onReadAsJsonc}
            className="group border-primary/40 text-foreground hover:bg-primary/10 focus-visible:ring-ring inline-flex min-h-6 items-center gap-1.5 rounded-md border px-2 font-mono font-medium transition outline-none focus-visible:ring-2"
          >
            <MessageSquareCode
              className="h-3.5 w-3.5 transition-transform motion-safe:group-hover:-rotate-6"
              aria-hidden
            />
            {t('home.jsonc_switch')}
          </button>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <CodeEditorLazy
          value={value}
          onChange={onChange}
          language={editorLanguageFor(format, direction)}
          ariaLabel={inputLabel}
          placeholder={
            isReverse
              ? t('home.input_placeholder_format', {
                  ext: converter.meta.extension.toUpperCase(),
                })
              : t('home.input_placeholder')
          }
        />
        {showOverlay && (
          <div className="bg-background/80 pointer-events-none absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="border-primary/60 bg-card corner-ticks flex flex-col items-center gap-2 rounded-lg border border-dashed px-8 py-6">
              <FolderOpen className="text-primary motion-safe:animate-bob h-8 w-8" />
              <p className="label-mono text-foreground">{t('home.drop_zone_active')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
