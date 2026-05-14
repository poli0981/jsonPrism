import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
import { parseJsonInput } from '@/lib/detect';
import { filterByExtension, getAllowedExtensions } from '@/lib/file-filter';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTauriDragDrop } from '@/hooks/useTauriDragDrop';
import { useBatchStore } from '@/stores/batchStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { DirectionToggle, type Direction } from './DirectionToggle';
import { FormatPicker } from './FormatPicker';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import { SettingsPanel } from './SettingsPanel';
import { ShapeHint } from './ShapeHint';
import { StatusBar } from './StatusBar';
import { BatchPanel } from './BatchPanel';

export function ConverterWorkspace() {
  const { t } = useTranslation();

  // Convert-tab state lives in a global Zustand store so it survives route
  // changes (Convert → About → Convert) instead of getting wiped on unmount.
  const input = useWorkspaceStore((s) => s.input);
  const setInput = useWorkspaceStore((s) => s.setInput);
  const format = useWorkspaceStore((s) => s.format);
  const setFormat = useWorkspaceStore((s) => s.setFormat);
  const direction = useWorkspaceStore((s) => s.direction);
  const setDirection = useWorkspaceStore((s) => s.setDirection);
  const optionsByFormat = useWorkspaceStore((s) => s.optionsByFormat);
  const setOptionsForFormat = useWorkspaceStore((s) => s.setOptionsForFormat);
  const resetOptionsForFormat = useWorkspaceStore((s) => s.resetOptionsForFormat);

  const actionsRef = useRef<{ copy: () => void; download: () => void } | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Mobile tab state — desktop ignores this and renders both panels side-by-side.
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');
  // Badge dot on Output tab when output changes while user is on Input tab.
  const [hasUnreadOutput, setHasUnreadOutput] = useState(false);
  const prevOutputRef = useRef('');
  const addBatchFiles = useBatchStore((s) => s.addFiles);

  const handleMultiFileDrop = useCallback(
    (files: File[]) => {
      const allowed = getAllowedExtensions(
        direction === 'reverse' ? 'reverse' : 'forward',
        getConverter(format).meta.extension,
      );
      const { valid, wrongFormat } = filterByExtension(files, allowed);
      if (wrongFormat > 0) {
        toast.warning(t('batch.toast.wrong_format', { count: wrongFormat }));
      }
      if (valid.length === 0) return;
      const result = addBatchFiles(valid);
      if (result.added > 0) {
        toast.success(t('batch.toast.added', { count: result.added }));
        setBatchOpen(true);
      }
      if (result.skipped > 0) {
        if (result.reason === 'duplicate') {
          toast.warning(t('batch.toast.duplicate', { count: result.skipped }));
        } else {
          toast.warning(t('batch.toast.skipped', { count: result.skipped, max: 500 }));
        }
      }
    },
    [addBatchFiles, direction, format, t],
  );

  // Native OS drag-drop bridge (no-op outside Tauri).
  useTauriDragDrop(handleMultiFileDrop);

  const switchFormat = useCallback(
    (next: FormatId) => {
      setFormat(next);
    },
    [setFormat],
  );

  const switchDirection = useCallback(
    (next: Direction) => {
      setDirection(next);
      // If the current format doesn't support the new direction, switch to one that does.
      if (next === 'reverse' && typeof getConverter(format).reverse !== 'function') {
        const fallback = (['jsonl', 'csv', 'yaml', 'toml', 'resx'] as FormatId[]).find(
          (id) => typeof getConverter(id).reverse === 'function',
        );
        if (fallback) setFormat(fallback);
      }
    },
    [format, setDirection, setFormat],
  );

  const currentOptions = optionsByFormat[format] ?? getConverter(format).defaultOptions;

  const setCurrentOptions = useCallback(
    (next: Record<string, unknown>) => {
      setOptionsForFormat(format, next);
    },
    [format, setOptionsForFormat],
  );

  const resetCurrentOptions = useCallback(() => {
    resetOptionsForFormat(format);
    toast.success(t('toast.options_reset'));
  }, [format, resetOptionsForFormat, t]);

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

  // Flip the badge dot on the Output tab whenever output changes while the
  // user is on the Input tab. Clearing happens once the user navigates over.
  useEffect(() => {
    if (output !== prevOutputRef.current) {
      prevOutputRef.current = output;
      if (output && activeTab !== 'output') {
        setHasUnreadOutput(true);
      }
    }
  }, [output, activeTab]);

  useEffect(() => {
    if (activeTab === 'output') setHasUnreadOutput(false);
  }, [activeTab]);

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
            direction={direction}
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
        {/* Mobile: Tabs UI — each tab gets the full workspace height so panels
            never overlap on short viewports. */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'input' | 'output')}
          className="flex min-h-0 flex-1 flex-col md:hidden"
        >
          <TabsList className="border-border/60 w-full justify-start gap-0 rounded-none border-b px-2">
            <TabsTrigger value="input">{t('home.tab_input')}</TabsTrigger>
            <TabsTrigger value="output" className="relative">
              {t('home.tab_output')}
              {hasUnreadOutput && (
                <span
                  aria-hidden
                  className="bg-primary absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
                />
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="input" className="min-h-0 flex-1">
            <InputPanel
              value={input}
              onChange={setInput}
              error={inputError}
              format={format}
              direction={direction}
              onMultiFileDrop={handleMultiFileDrop}
            />
          </TabsContent>
          <TabsContent value="output" className="min-h-0 flex-1">
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
          </TabsContent>
        </Tabs>

        {/* Desktop: side-by-side grid (≥ md). Rendered in parallel with the
            Tabs above so neither remounts on viewport resize and CodeMirror
            state survives the swap. */}
        <div className="hidden min-h-0 flex-1 md:grid md:grid-cols-2">
          <div className="border-border/60 min-h-0 border-r">
            <InputPanel
              value={input}
              onChange={setInput}
              error={inputError}
              format={format}
              direction={direction}
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
