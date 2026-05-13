import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { FormatId } from '@/converters/types';
import { getConverter } from '@/converters/registry';
import { decodeBytes } from '@/converters/bson';
import type { Direction } from './DirectionToggle';

interface OutputPanelProps {
  format: FormatId;
  content: string;
  error?: string | null;
  /** Current converter options — needed to decode binary output for download. */
  options?: Record<string, unknown>;
  /** Forward = JSON→format; reverse = format→JSON. Drives download extension. */
  direction?: Direction;
  /** Imperative handle so the workspace can trigger download from a keyboard shortcut. */
  registerActions?: (actions: { copy: () => void; download: () => void }) => void;
}

export function OutputPanel({
  format,
  content,
  error,
  options,
  direction = 'forward',
  registerActions,
}: OutputPanelProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const converter = getConverter(format);
  const isReverse = direction === 'reverse';
  const outputExt = isReverse ? 'json' : converter.meta.extension;
  const outputMime = isReverse ? 'application/json' : converter.meta.mimeType;

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(t('toast.copied', { format: t(converter.meta.labelKey) }));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('toast.copy_failed'));
    }
  }, [content, converter, t]);

  const handleDownload = useCallback(() => {
    if (!content) return;
    const filename = `output.${outputExt}`;
    let blob: Blob;
    if (!isReverse && converter.meta.binary) {
      // Decode encoded text back to raw bytes so the downloaded file is a
      // real binary BSON / CBOR / MessagePack payload.
      const encoding = (options?.['encoding'] ?? 'base64') as 'base64' | 'hex';
      const bytes = decodeBytes(content, encoding);
      // .slice() copies into a fresh ArrayBuffer (not SharedArrayBuffer),
      // which is what Blob's typed constructor accepts.
      blob = new Blob([bytes.slice()], { type: outputMime });
    } else {
      blob = new Blob([content], { type: outputMime });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('toast.downloaded', { filename }));
  }, [content, converter, isReverse, outputExt, outputMime, options, t]);

  useEffect(() => {
    registerActions?.({ copy: handleCopy, download: handleDownload });
  }, [registerActions, handleCopy, handleDownload]);

  const disabled = !content || !!error;

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/60 flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {t('home.output_label')}
          </span>
          <span className="text-muted-foreground/60 font-mono text-xs">· .{outputExt}</span>
        </div>
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={handleCopy}
            label={copied ? '✓' : t('home.copy')}
            icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            disabled={disabled}
          />
          <ToolbarButton
            onClick={handleDownload}
            label={t('home.download')}
            icon={<Download className="h-3.5 w-3.5" />}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="scrollbar-hide relative flex-1 overflow-auto">
        {error ? (
          <div className="text-destructive p-4 font-mono text-sm whitespace-pre-wrap">{error}</div>
        ) : content ? (
          <pre className="p-4 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap">
            {content}
          </pre>
        ) : (
          <div className="text-muted-foreground/60 p-4 text-sm italic">
            {t('home.output_empty')}
          </div>
        )}
      </div>
    </div>
  );
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
