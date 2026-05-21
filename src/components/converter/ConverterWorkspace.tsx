import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBatchFileRouter } from '@/hooks/useBatchFileRouter';
import { useConversionResult } from '@/hooks/useConversionResult';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useOutputBadge } from '@/hooks/useOutputBadge';
import { getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
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

  const openBatch = useCallback(() => setBatchOpen(true), []);
  const handleMultiFileDrop = useBatchFileRouter(format, direction, openBatch);

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

  const { output, inputError, outputError, shape, parseMs } = useConversionResult(
    input,
    format,
    direction,
    currentOptions,
  );

  useKeyboardShortcuts([
    { key: 'k', mod: true, handler: () => setInput('') },
    { key: 's', mod: true, handler: () => actionsRef.current?.download() },
    { key: ',', mod: true, handler: () => setSettingsOpen((v) => !v) },
  ]);

  const hasUnreadOutput = useOutputBadge(output, activeTab);

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
