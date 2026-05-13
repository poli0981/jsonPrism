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
}

export function SettingsPanel({ format, options, onChange, onReset }: SettingsPanelProps) {
  const { t } = useTranslation();
  const converter = getConverter(format);
  const schema = converter.optionSchema as ReadonlyArray<OptionSchemaField<Record<string, unknown>>>;
  const formatLabel = t(converter.meta.labelKey);
  const hasFields = schema.length > 0;

  const setField = (key: string, value: unknown) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-xs transition"
          aria-label={t('home.options')}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>{t('home.options')}</span>
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            <span className="text-spectrum italic">{formatLabel}</span>{' '}
            <span className="text-muted-foreground font-sans text-base font-normal not-italic">
              · {t('settings.title')}
            </span>
          </SheetTitle>
          <SheetDescription>
            {hasFields ? t('settings.description') : t('settings.no_options')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {hasFields ? (
            <div className="flex flex-col gap-5">
              {schema.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={options[field.key]}
                  onChange={(v) => setField(field.key, v)}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-12 text-center text-sm italic">
              {t('settings.no_options_long')}
            </p>
          )}
        </div>

        {hasFields && (
          <div className="border-border/60 flex items-center justify-end gap-2 border-t px-6 py-3">
            <button
              type="button"
              onClick={onReset}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
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

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium" htmlFor={`field-${field.key}`}>
          {t(field.labelKey)}
        </label>
        {field.type === 'boolean' && (
          <Switch
            id={`field-${field.key}`}
            checked={Boolean(value)}
            onCheckedChange={(v) => onChange(v)}
          />
        )}
      </div>

      {field.type === 'enum' && (
        <div className="flex flex-wrap gap-1">
          {field.choices.map((choice) => {
            const active = String(value) === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => onChange(choice.value)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                  active
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border bg-card/40 text-muted-foreground hover:text-foreground',
                )}
              >
                {t(choice.labelKey)}
              </button>
            );
          })}
        </div>
      )}

      {field.type === 'integer' && (
        <input
          id={`field-${field.key}`}
          type="number"
          value={Number(value)}
          min={field.min}
          max={field.max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="border-border bg-background focus:ring-ring rounded-md border px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-2"
        />
      )}

      {field.type === 'string' && (
        <input
          id={`field-${field.key}`}
          type="text"
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="border-border bg-background focus:ring-ring rounded-md border px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-2"
        />
      )}

      {field.descriptionKey && (
        <p className="text-muted-foreground text-xs">{t(field.descriptionKey)}</p>
      )}
    </div>
  );
}
