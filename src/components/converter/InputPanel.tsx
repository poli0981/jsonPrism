import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Eraser, FileText, FolderOpen } from 'lucide-react';
import { ToolbarButton } from '@/components/common/ToolbarButton';
import { toast } from '@/components/ui/sonner';
import { useFileAccept } from '@/hooks/useFileAccept';
import { editorLanguageFor } from '@/lib/editor-language';
import { extOf } from '@/lib/file-filter';
import { readFileText } from '@/lib/read-file';
import { SAMPLE_JSON } from '@/lib/sample';
import { isTauri, nativeOpenFiles, fileFromNativePath } from '@/lib/tauri';
import type { FormatId } from '@/converters/types';
import { CodeEditorLazy } from './CodeEditorLazy';
import type { Direction } from './DirectionToggle';

interface InputPanelProps {
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  /** Drives accept list, file picker filter, and editor label. */
  format: FormatId;
  /** Forward = JSON-only; reverse = the format's native extension. */
  direction: Direction;
  /** Called when 2+ files are dropped — workspace routes them into batch. */
  onMultiFileDrop?: (files: File[]) => void;
}

export function InputPanel({
  value,
  onChange,
  error,
  format,
  direction,
  onMultiFileDrop,
}: InputPanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const { converter, isReverse, accept, fileInputAccept, allowedExtensions } = useFileAccept(
    format,
    direction,
  );

  const inputLabel = isReverse
    ? t('home.input_label_format', { format: t(converter.meta.labelKey) })
    : t('home.input_label');

  const editorLanguage = editorLanguageFor(format, direction);

  const hasAllowedExt = useCallback(
    (name: string) => allowedExtensions.includes(extOf(name)),
    [allowedExtensions],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setDragActive(false);
      if (acceptedFiles.length === 0) return;
      if (acceptedFiles.length > 1 && onMultiFileDrop) {
        onMultiFileDrop(acceptedFiles);
        return;
      }
      const file = acceptedFiles[0]!;
      if (!hasAllowedExt(file.name)) {
        toast.warning(t('batch.toast.wrong_format', { count: 1 }));
        return;
      }
      void readFileText(file).then(
        (text) => {
          onChange(text);
          toast.success(t('toast.file_loaded', { name: file.name }));
        },
        (err: Error) => {
          toast.error(t('toast.file_failed', { message: err.message }));
        },
      );
    },
    [hasAllowedExt, onChange, onMultiFileDrop, t],
  );

  const onDropRejected = useCallback(
    (rejections: { file: File }[]) => {
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

  const handleOpenFile = async () => {
    if (isTauri()) {
      const paths = await nativeOpenFiles({ multiple: false });
      if (!paths || paths.length === 0) return;
      try {
        const file = await fileFromNativePath(paths[0]!);
        if (!hasAllowedExt(file.name)) {
          toast.warning(t('batch.toast.wrong_format', { count: 1 }));
          return;
        }
        const text = await file.text();
        onChange(text);
        toast.success(t('toast.file_loaded', { name: file.name }));
      } catch (err) {
        toast.error(t('toast.file_failed', { message: (err as Error).message }));
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!hasAllowedExt(file.name)) {
      toast.warning(t('batch.toast.wrong_format', { count: 1 }));
      e.target.value = '';
      return;
    }
    void readFileText(file).then(
      (text) => {
        onChange(text);
        toast.success(t('toast.file_loaded', { name: file.name }));
      },
      (err: Error) => {
        toast.error(t('toast.file_failed', { message: err.message }));
      },
    );
    e.target.value = '';
  };

  const showOverlay = isDragActive || dragActive;

  return (
    <div className="relative flex h-full flex-col" {...getRootProps()}>
      <input {...getInputProps()} />
      <input
        ref={fileInputRef}
        type="file"
        accept={fileInputAccept}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="border-border/60 flex items-center justify-between border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {inputLabel}
          </span>
          {error && (
            <span className="text-destructive max-w-md truncate text-xs" title={error}>
              · {error}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={handleOpenFile}
            label={t('home.open_file')}
            icon={<FolderOpen className="h-3.5 w-3.5" />}
          />
          {!isReverse && (
            <ToolbarButton
              onClick={() => onChange(SAMPLE_JSON)}
              label={t('home.load_sample')}
              icon={<FileText className="h-3.5 w-3.5" />}
            />
          )}
          <ToolbarButton
            onClick={() => onChange('')}
            label={t('home.clear')}
            icon={<Eraser className="h-3.5 w-3.5" />}
            disabled={!value}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <CodeEditorLazy
          value={value}
          onChange={onChange}
          language={editorLanguage}
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
            <div className="border-primary/60 bg-card flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-8 py-6">
              <FolderOpen className="text-primary h-8 w-8" />
              <p className="font-display text-spectrum text-lg italic">
                {t('home.drop_zone_active')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
