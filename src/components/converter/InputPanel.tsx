import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Eraser, FileText, FolderOpen } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { SAMPLE_JSON } from '@/lib/sample';
import { isTauri, nativeOpenFiles, fileFromNativePath } from '@/lib/tauri';
import { CodeEditor } from './CodeEditor';

interface InputPanelProps {
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  /** Called when 2+ files are dropped — workspace routes them into batch. */
  onMultiFileDrop?: (files: File[]) => void;
}

export function InputPanel({ value, onChange, error, onMultiFileDrop }: InputPanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setDragActive(false);
      if (acceptedFiles.length === 0) return;
      if (acceptedFiles.length > 1 && onMultiFileDrop) {
        onMultiFileDrop(acceptedFiles);
        return;
      }
      const file = acceptedFiles[0]!;
      void readFile(file).then(
        (text) => {
          onChange(text);
          toast.success(t('toast.file_loaded', { name: file.name }));
        },
        (err: Error) => {
          toast.error(t('toast.file_failed', { message: err.message }));
        },
      );
    },
    [onChange, onMultiFileDrop, t],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: { 'application/json': ['.json'], 'text/plain': ['.txt'] },
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
    void readFile(file).then(
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
        accept=".json,.txt,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="border-border/60 flex items-center justify-between border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            {t('home.input_label')}
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
          <ToolbarButton
            onClick={() => onChange(SAMPLE_JSON)}
            label={t('home.load_sample')}
            icon={<FileText className="h-3.5 w-3.5" />}
          />
          <ToolbarButton
            onClick={() => onChange('')}
            label={t('home.clear')}
            icon={<Eraser className="h-3.5 w-3.5" />}
            disabled={!value}
          />
        </div>
      </div>

      <div className="relative flex-1">
        <CodeEditor
          value={value}
          onChange={onChange}
          language="json"
          placeholder={t('home.input_placeholder')}
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

async function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`));
    reader.readAsText(file);
  });
}

interface ToolbarButtonProps {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

function ToolbarButton({ onClick, label, icon, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
