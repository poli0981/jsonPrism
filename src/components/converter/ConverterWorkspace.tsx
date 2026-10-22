import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { extensionsFor, getConverter } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { useBatchFileRouter } from '@/hooks/useBatchFileRouter';
import { useConversionResult } from '@/hooks/useConversionResult';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useOutputBadge } from '@/hooks/useOutputBadge';
import { utf8ByteLength } from '@/lib/bytes';
import { errorMessage } from '@/lib/errors';
import { extOf, getAllowedExtensions } from '@/lib/file-filter';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { DirectionToggle } from './DirectionToggle';
import { FormatPicker } from './FormatPicker';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import { SettingsPanel } from './SettingsPanel';
import { ShapeHint } from './ShapeHint';
import { StatusBar, type ConversionState } from './StatusBar';
import { BatchPanel } from './BatchPanel';

const REVERSIBLE_FALLBACKS: FormatId[] = ['jsonl', 'csv', 'yaml', 'toml', 'resx'];

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
  const storedOptions = useWorkspaceStore((s) => s.optionsByFormat[s.format]);
  const setOptionsForFormat = useWorkspaceStore((s) => s.setOptionsForFormat);
  const resetOptionsForFormat = useWorkspaceStore((s) => s.resetOptionsForFormat);

  const actionsRef = useRef<{ copy: () => void; download: () => void } | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Mobile tab state — desktop renders both panels side-by-side.
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');
  // One layout at a time: mounting both (CSS-hidden) doubled every editor
  // update. Defaults to desktop where matchMedia is unavailable.
  const isDesktop = useMediaQuery('(min-width: 768px)', true);

  const openBatch = useCallback(() => setBatchOpen(true), []);

  const loadSingleFile = useCallback(
    (file: File) => {
      const allowed = getAllowedExtensions(direction, extensionsFor(format));
      const ext = extOf(file.name);
      if (ext && !allowed.includes(ext)) {
        toast.warning(t('batch.toast.wrong_format', { count: 1 }));
        return;
      }
      file.text().then(
        (text) => {
          setInput(text);
          toast.success(t('toast.file_loaded', { name: file.name }));
        },
        (err: unknown) => toast.error(t('toast.file_failed', { message: errorMessage(err) })),
      );
    },
    [direction, format, setInput, t],
  );
  const handleMultiFileDrop = useBatchFileRouter(format, direction, loadSingleFile, openBatch);

  const switchDirection = useCallback(
    (next: Direction) => {
      setDirection(next);
      // If the current format doesn't support the new direction, switch to one that does.
      if (next === 'reverse' && typeof getConverter(format).reverse !== 'function') {
        const fallback = REVERSIBLE_FALLBACKS.find(
          (id) => typeof getConverter(id).reverse === 'function',
        );
        if (fallback) setFormat(fallback);
      }
    },
    [format, setDirection, setFormat],
  );

  const currentOptions = useMemo(
    () => storedOptions ?? { ...getConverter(format).defaultOptions },
    [format, storedOptions],
  );

  const setCurrentOptions = useCallback(
    (next: Record<string, unknown>) => setOptionsForFormat(format, next),
    [format, setOptionsForFormat],
  );

  const resetCurrentOptions = useCallback(() => {
    resetOptionsForFormat(format);
    toast.success(t('toast.options_reset'));
  }, [format, resetOptionsForFormat, t]);

  const result = useConversionResult(input, format, direction, currentOptions);

  useKeyboardShortcuts([
    { code: 'KeyS', mod: true, handler: () => actionsRef.current?.download() },
    { code: 'Comma', mod: true, handler: () => setSettingsOpen((v) => !v) },
  ]);

  const hasUnreadOutput = useOutputBadge(result.output, activeTab);
  const inputBytes = useMemo(() => utf8ByteLength(input), [input]);
  const registerActions = useCallback((a: { copy: () => void; download: () => void }) => {
    actionsRef.current = a;
  }, []);

  const state: ConversionState = result.pending
    ? 'working'
    : result.inputError || result.outputError
      ? 'error'
      : result.output
        ? 'ok'
        : 'idle';

  const inputPanel = (
    <InputPanel
      value={input}
      onChange={setInput}
      error={result.inputError}
      errorLine={result.inputErrorLine}
      errorColumn={result.inputErrorColumn}
      format={format}
      direction={direction}
      onMultiFileDrop={handleMultiFileDrop}
    />
  );
  const outputPanel = (
    <OutputPanel
      format={format}
      content={result.output}
      error={result.outputError}
      pending={result.pending}
      options={currentOptions}
      direction={direction}
      registerActions={registerActions}
    />
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <DirectionToggle value={direction} onChange={switchDirection} />
          <FormatPicker
            value={format}
            onChange={setFormat}
            shape={result.shape}
            direction={direction}
          />
        </div>
        <div className="flex items-center gap-2">
          <ShapeHint shape={result.shape} />
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

      <div className="border-border bg-card/60 corner-ticks flex min-h-0 flex-1 flex-col rounded-lg border backdrop-blur-[2px]">
        {isDesktop ? (
          <div className="grid min-h-0 flex-1 grid-cols-2">
            <div className="border-border/70 min-h-0 border-r">{inputPanel}</div>
            <div className="min-h-0">{outputPanel}</div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'input' | 'output')}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="border-border/70 w-full justify-start gap-0 rounded-none border-b px-2">
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
            {/* forceMount keeps both editors alive (undo history, scroll) across tab switches. */}
            <TabsContent
              value="input"
              forceMount
              className="min-h-0 flex-1 data-[state=inactive]:hidden"
            >
              {inputPanel}
            </TabsContent>
            <TabsContent
              value="output"
              forceMount
              className="min-h-0 flex-1 data-[state=inactive]:hidden"
            >
              {outputPanel}
            </TabsContent>
          </Tabs>
        )}

        <StatusBar
          state={state}
          inputBytes={inputBytes}
          outputBytes={result.outputBytes}
          ms={result.ms}
          precisionLoss={result.precisionLoss}
        />
      </div>
    </div>
  );
}
