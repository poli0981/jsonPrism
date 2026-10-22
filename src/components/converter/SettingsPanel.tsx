import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Settings2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { getConverter } from '@/converters/registry';
import type { FormatId, OptionSchemaField } from '@/converters/types';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  format: FormatId;
  options: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  onReset: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({
  format,
  options,
  onChange,
  onReset,
  open,
  onOpenChange,
}: SettingsPanelProps) {
  const { t } = useTranslation();
  const converter = getConverter(format);
  const schema = converter.optionSchema as ReadonlyArray<
    OptionSchemaField<Record<string, unknown>>
  >;
  const formatLabel = t(converter.meta.labelKey);
  const hasFields = schema.length > 0;

  const setField = (key: string, value: unknown) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="group text-muted-foreground hover:bg-muted hover:text-foreground border-border bg-card/60 inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition"
        >
          <Settings2
            className="h-3.5 w-3.5 transition-transform duration-500 motion-safe:group-hover:rotate-90"
            aria-hidden
          />
          <span>{t('home.options')}</span>
        </button>
      </SheetTrigger>
      <SheetContent
        closeLabel={t('common.close')}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            <span className="text-spectrum">{formatLabel}</span>{' '}
            <span className="text-muted-foreground text-base font-normal">
              · {t('settings.title')}
            </span>
          </SheetTitle>
          <SheetDescription>
            {hasFields ? t('settings.description') : t('settings.no_options')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 [scrollbar-gutter:stable] overflow-y-auto px-6 pb-6">
          {hasFields ? (
            <div className="flex flex-col gap-5">
              {schema.map((field) => (
                <FieldRenderer
                  key={`${format}:${field.key}`}
                  field={field}
                  value={options[field.key]}
                  onChange={(v) => setField(field.key, v)}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-12 text-center text-sm">
              {t('settings.no_options_long')}
            </p>
          )}
        </div>

        {hasFields && (
          <div className="border-border/70 flex items-center justify-end gap-2 border-t px-6 py-3">
            <button
              type="button"
              onClick={onReset}
              className="group text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs transition"
            >
              <RotateCcw
                className="h-3.5 w-3.5 transition-transform duration-500 motion-safe:group-hover:-rotate-180"
                aria-hidden
              />
              {t('settings.reset')}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface FieldRendererProps {
  field: OptionSchemaField<Record<string, unknown>>;
  value: unknown;
  onChange: (v: unknown) => void;
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const { t } = useTranslation();
  const id = `field-${field.key}`;
  const descriptionId = field.descriptionKey ? `${id}-desc` : undefined;
  const description = field.descriptionKey && (
    <p id={descriptionId} className="text-muted-foreground text-xs">
      {t(field.descriptionKey)}
    </p>
  );

  if (field.type === 'enum') {
    return (
      <fieldset className="flex flex-col gap-1.5" aria-describedby={descriptionId}>
        <legend className="mb-1.5 text-sm font-medium">{t(field.labelKey)}</legend>
        <div className="flex flex-wrap gap-1">
          {field.choices.map((choice) => {
            const active = String(value) === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(choice.value)}
                className={cn(
                  'min-h-8 rounded-md border px-2.5 text-xs font-medium transition',
                  active
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border bg-card/60 text-muted-foreground hover:text-foreground',
                )}
              >
                {t(choice.labelKey)}
              </button>
            );
          })}
        </div>
        {description}
      </fieldset>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium" htmlFor={id}>
          {t(field.labelKey)}
        </label>
        {field.type === 'boolean' && (
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(v) => onChange(v)}
            aria-describedby={descriptionId}
          />
        )}
      </div>

      {field.type === 'integer' && (
        <IntegerInput
          id={id}
          value={typeof value === 'number' ? value : (field.min ?? 0)}
          min={field.min}
          max={field.max}
          describedBy={descriptionId}
          onCommit={onChange}
        />
      )}

      {field.type === 'string' && (
        <input
          id={id}
          type="text"
          value={String(value ?? '')}
          placeholder={field.placeholder}
          aria-describedby={descriptionId}
          maxLength={200}
          onChange={(e) => onChange(e.target.value)}
          className="border-border bg-background focus:ring-ring rounded-md border px-3 py-1.5 font-mono text-sm focus:ring-2 focus:outline-none"
        />
      )}

      {description}
    </div>
  );
}

interface IntegerInputProps {
  id: string;
  value: number;
  min: number | undefined;
  max: number | undefined;
  describedBy: string | undefined;
  onCommit: (v: number) => void;
}

/**
 * Keeps the raw text while typing (so "", "-" or "1" on the way to "10" are
 * allowed) and commits a clamped integer when the text parses or on blur.
 */
function IntegerInput({ id, value, min, max, describedBy, onCommit }: IntegerInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Math.trunc(n)));

  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      value={draft ?? String(value)}
      min={min}
      max={max}
      step={1}
      aria-describedby={describedBy}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        const n = Number(text);
        if (text.trim() !== '' && Number.isFinite(n) && clamp(n) === n) onCommit(n);
      }}
      onBlur={() => {
        if (draft !== null) {
          const n = Number(draft);
          if (draft.trim() !== '' && Number.isFinite(n)) onCommit(clamp(n));
          setDraft(null);
        }
      }}
      className="border-border bg-background focus:ring-ring rounded-md border px-3 py-1.5 font-mono text-sm focus:ring-2 focus:outline-none"
    />
  );
}
