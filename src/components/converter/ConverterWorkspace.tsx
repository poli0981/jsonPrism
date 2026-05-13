import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import { getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
import { parseJsonInput } from '@/lib/detect';
import { loadOptions, saveOptions, clearOptions } from '@/lib/options-storage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTauriDragDrop } from '@/hooks/useTauriDragDrop';
import { useBatchStore } from '@/stores/batchStore';
import { DirectionToggle, type Direction } from './DirectionToggle';
import { FormatPicker } from './FormatPicker';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import { SettingsPanel } from './SettingsPanel';
import { ShapeHint } from './ShapeHint';
import { StatusBar } from './StatusBar';
import { BatchPanel } from './BatchPanel';

const STORAGE_FORMAT_KEY = 'jsonprism.selected_format';
const STORAGE_DIRECTION_KEY = 'jsonprism.direction';

export function ConverterWorkspace() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [format, setFormat] = useState<FormatId>(() => {
    const stored = window.localStorage.getItem(STORAGE_FORMAT_KEY);
    return (stored as FormatId | null) ?? 'jsonl';
  });
  const [direction, setDirection] = useState<Direction>(() => {
    const stored = window.localStorage.getItem(STORAGE_DIRECTION_KEY);
    return stored === 'reverse' ? 'reverse' : 'forward';
  });
  const [optionsByFormat, setOptionsByFormat] = useState<Record<string, Record<string, unknown>>>(
    () => {
      // Lazy-load on demand; start with default options for current format.
      const c = getConverter(format);
      return { [format]: loadOptions(format, c.defaultOptions) };
    },
  );

  const actionsRef = useRef<{ copy: () => void; download: () => void } | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const addBatchFiles = useBatchStore((s) => s.addFiles);

  const handleMultiFileDrop = useCallback(
    (files: File[]) => {
      const result = addBatchFiles(files);
      if (result.added > 0) {
        toast.success(t('batch.toast.added', { count: result.added }));
        setBatchOpen(true);
      }
      if (result.skipped > 0) {
        toast.warning(t('batch.toast.skipped', { count: result.skipped, max: 500 }));
      }
    },
    [addBatchFiles, t],
  );

  // Native OS drag-drop bridge (no-op outside Tauri).
  useTauriDragDrop(handleMultiFileDrop);

  const switchFormat = useCallback((next: FormatId) => {
    setFormat(next);
    window.localStorage.setItem(STORAGE_FORMAT_KEY, next);
    setOptionsByFormat((prev) => {
      if (prev[next]) return prev;
      const c = getConverter(next);
      return { ...prev, [next]: loadOptions(next, c.defaultOptions) };
    });
  }, []);

  const switchDirection = useCallback(
    (next: Direction) => {
      setDirection(next);
      window.localStorage.setItem(STORAGE_DIRECTION_KEY, next);
      // If the current format doesn't support the new direction, switch to one that does.
      if (next === 'reverse' && typeof getConverter(format).reverse !== 'function') {
        const fallback = (['jsonl', 'csv', 'yaml', 'toml', 'resx'] as FormatId[]).find(
          (id) => typeof getConverter(id).reverse === 'function',
        );
        if (fallback) {
          setFormat(fallback);
          window.localStorage.setItem(STORAGE_FORMAT_KEY, fallback);
        }
      }
    },
    [format],
  );

  const currentOptions = optionsByFormat[format] ?? getConverter(format).defaultOptions;

  const setCurrentOptions = useCallback(
    (next: Record<string, unknown>) => {
      setOptionsByFormat((prev) => ({ ...prev, [format]: next }));
      saveOptions(format, next);
    },
    [format],
  );

  const resetCurrentOptions = useCallback(() => {
    const c = getConverter(format);
    clearOptions(format);
    setOptionsByFormat((prev) => ({ ...prev, [format]: { ...c.defaultOptions } }));
    toast.success(t('toast.options_reset'));
  }, [format, t]);

  const { output, inputError, outputError, shape, parseMs } = useMemo(() => {
    const start = performance.now();
    if (!input.trim()) {
      return { output: '', inputError: null, outputError: null, shape: null, parseMs: null };
    }
    const converter = getConverter(format);
    if (!converter.meta.ready) {
      return {
        output: '',
        inputError: null,
        outputError: t('errors.converter_not_ready_phase', { phase: converter.meta.phase }),
        shape: null,
        parseMs: performance.now() - start,
      };
    }

    if (direction === 'reverse') {
      if (typeof converter.reverse !== 'function') {
        return {
          output: '',
          inputError: null,
          outputError: t('format_status.no_reverse'),
          shape: null,
          parseMs: performance.now() - start,
        };
      }
      const result = converter.reverse(
        { text: input },
        currentOptions as Parameters<typeof converter.reverse>[1],
      );
      const ms = performance.now() - start;
      return result.ok
        ? { output: result.output, inputError: null, outputError: null, shape: null, parseMs: ms }
        : { output: '', inputError: result.error, outputError: null, shape: null, parseMs: ms };
    }

    const parsed = parseJsonInput(input);
    if (!parsed.ok) {
      const msg = parsed.error === 'empty' ? null : parsed.error;
      return {
        output: '',
        inputError: msg,
        outputError: null,
        shape: null,
        parseMs: performance.now() - start,
      };
    }
    const result = converter.convert(
      { data: parsed.value, rawText: input },
      currentOptions as Parameters<typeof converter.convert>[1],
    );
    const ms = performance.now() - start;
    if (result.ok) {
      return {
        output: result.output,
        inputError: null,
        outputError: null,
        shape: parsed.shape,
        parseMs: ms,
      };
    }
    return {
      output: '',
      inputError: null,
      outputError: result.error,
      shape: parsed.shape,
      parseMs: ms,
    };
  }, [input, format, currentOptions, direction, t]);

  useKeyboardShortcuts([
    { key: 'k', mod: true, handler: () => setInput('') },
    { key: 's', mod: true, handler: () => actionsRef.current?.download() },
    { key: ',', mod: true, handler: () => setSettingsOpen((v) => !v) },
  ]);

  const inputBytes = useMemo(() => new TextEncoder().encode(input).length, [input]);
  const outputBytes = useMemo(() => new TextEncoder().encode(output).length, [output]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DirectionToggle value={direction} onChange={switchDirection} />
          <FormatPicker
            value={format}
            onChange={switchFormat}
            shape={shape}
            direction={direction}
          />
        </div>
        <div className="flex items-center gap-3">
          <ShapeHint shape={shape} />
          <BatchPanel
            format={format}
            options={currentOptions}
            open={batchOpen}
            onOpenChange={setBatchOpen}
          />
          <SettingsPanel
            format={format}
            options={currentOptions}
            onChange={setCurrentOptions}
            onReset={resetCurrentOptions}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          />
        </div>
      </div>

      <div className="border-border bg-card/40 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="grid min-h-0 flex-1 md:grid-cols-2">
          <div className="md:border-border/60 min-h-0 border-b md:border-r md:border-b-0">
            <InputPanel
              value={input}
              onChange={setInput}
              error={inputError}
              onMultiFileDrop={handleMultiFileDrop}
            />
          </div>
          <div className="min-h-0">
            <OutputPanel
              format={format}
              content={output}
              error={outputError}
              options={currentOptions}
              direction={direction}
              registerActions={(a) => {
                actionsRef.current = a;
              }}
            />
          </div>
        </div>
        <StatusBar inputBytes={inputBytes} outputBytes={outputBytes} parseMs={parseMs} />
      </div>
    </div>
  );
}
