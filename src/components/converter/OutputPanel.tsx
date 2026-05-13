import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { FormatId } from '@/converters/types';
import { getConverter } from '@/converters/registry';

interface OutputPanelProps {
  format: FormatId;
  content: string;
  error?: string | null;
  /** Imperative handle so the workspace can trigger download from a keyboard shortcut. */
  registerActions?: (actions: { copy: () => void; download: () => void }) => void;
}

export function OutputPanel({ format, content, error, registerActions }: OutputPanelProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const converter = getConverter(format);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(t('toast.copied', { format: t(converter.meta.labelKey) }));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('toast.copy_failed'));
    }
  };

  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content], { type: converter.meta.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output.${converter.meta.extension}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('toast.downloaded', { filename: `output.${converter.meta.extension}` }));
  };

  // Register actions every render — cheap, no useEffect needed.
  registerActions?.({ copy: handleCopy, download: handleDownload });

  const disabled = !content || !!error;

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/60 flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            {t('home.output_label')}
          </span>
          <span className="text-muted-foreground/60 font-mono text-xs">
            · .{converter.meta.extension}
          </span>
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
      <div className="relative flex-1 overflow-auto">
        {error ? (
          <div className="text-destructive p-4 font-mono text-sm whitespace-pre-wrap">{error}</div>
        ) : content ? (
          <pre className="font-mono p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">
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
