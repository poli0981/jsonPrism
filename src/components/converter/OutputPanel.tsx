import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Download, LoaderCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { ToolbarButton } from '@/components/common/ToolbarButton';
import { getConverter } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { decodeBytes, type Encoding } from '@/lib/bytes';
import { downloadBlob } from '@/lib/download';
import { outputLanguageFor } from '@/lib/editor-language';
import { errorMessage } from '@/lib/errors';
import { isTauri, nativeSaveBlob } from '@/lib/tauri';
import { CodeEditorLazy } from './CodeEditorLazy';

interface OutputPanelProps {
  format: FormatId;
  content: string;
  error?: string | null;
  /** A newer result is being computed (large input in the worker). */
  pending?: boolean;
  /** Current converter options — needed to decode binary output for download. */
  options?: Record<string, unknown>;
  /** Forward = JSON→format; reverse = format→JSON. Drives download extension. */
  direction?: Direction;
  /** Imperative handle so the workspace can trigger download from a keyboard shortcut. */
  registerActions?: (actions: { copy: () => void; download: () => void }) => void;
}

const COPIED_FEEDBACK_MS = 1500;

export function OutputPanel({
  format,
  content,
  error,
  pending = false,
  options,
  direction = 'forward',
  registerActions,
}: OutputPanelProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const converter = getConverter(format);
  const isReverse = direction === 'reverse';
  const outputExt = isReverse ? 'json' : converter.meta.extension;
  const outputMime = isReverse ? 'application/json' : converter.meta.mimeType;
  const formatLabel = isReverse ? 'JSON' : t(converter.meta.labelKey);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(t('toast.copied', { format: formatLabel }));
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      toast.error(t('toast.copy_failed'));
    }
  }, [content, formatLabel, t]);

  const handleDownload = useCallback(async () => {
    if (!content || error) return;
    const filename = `output.${outputExt}`;
    try {
      const blob =
        !isReverse && converter.meta.binary
          ? // Decode the displayed text back to raw bytes so the file is real
            // BSON / CBOR / MessagePack. .slice() yields a plain ArrayBuffer view.
            new Blob(
              [
                decodeBytes(
                  content,
                  (options?.['encoding'] as Encoding | undefined) ?? 'base64',
                ).slice(),
              ],
              { type: outputMime },
            )
          : new Blob([content], { type: outputMime });
      if (isTauri()) {
        // Android WebViews ignore <a download>; desktop webviews are inconsistent.
        const saved = await nativeSaveBlob(blob, filename, {
          name: formatLabel,
          extensions: [outputExt],
        });
        if (saved) toast.success(t('toast.downloaded', { filename }));
        return;
      }
      downloadBlob(blob, filename);
      toast.success(t('toast.downloaded', { filename }));
    } catch (err) {
      toast.error(t('toast.download_failed', { message: errorMessage(err) }));
    }
  }, [content, converter, error, formatLabel, isReverse, options, outputExt, outputMime, t]);

  useEffect(() => {
    registerActions?.({ copy: () => void handleCopy(), download: () => void handleDownload() });
  }, [registerActions, handleCopy, handleDownload]);

  const disabled = !content || !!error;

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/70 flex items-center justify-between gap-2 border-b px-3 py-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="label-mono">{t('home.output_label')}</span>
          <span className="label-mono text-foreground/70">.{outputExt}</span>
          {pending && (
            <LoaderCircle
              className="text-primary h-3.5 w-3.5 motion-safe:animate-spin"
              aria-label={t('common.loading')}
            />
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => void handleCopy()}
            label={t('home.copy')}
            visibleLabel={copied ? t('home.copied') : t('home.copy')}
            icon={
              copied ? (
                <Check className="text-success motion-safe:animate-pop h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5 transition-transform motion-safe:group-hover:-translate-y-px" />
              )
            }
            disabled={disabled}
          />
          <ToolbarButton
            onClick={() => void handleDownload()}
            label={t('home.download')}
            icon={<Download className="motion-safe:group-hover:animate-bob h-3.5 w-3.5" />}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {error ? (
          <div
            role="alert"
            tabIndex={0} // NOSONAR(S6845): scrollable region; keyboard users need focus to scroll it
            className="text-destructive h-full overflow-auto p-4 font-mono text-sm whitespace-pre-wrap"
          >
            {error}
          </div>
        ) : content ? (
          <CodeEditorLazy
            value={content}
            readOnly
            language={outputLanguageFor(format, direction)}
            ariaLabel={t('home.output_aria', { format: formatLabel })}
          />
        ) : (
          <div className="text-muted-foreground p-4 text-sm">
            {isReverse
              ? t('home.output_empty_format', {
                  ext: converter.meta.extension.toUpperCase(),
                })
              : t('home.output_empty')}
          </div>
        )}
      </div>
    </div>
  );
}
