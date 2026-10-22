import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Direction, FormatId } from '@/converters/types';
import { convertLive, SupersededError, WORKER_THRESHOLD_CHARS } from '@/lib/convert-client';
import { runConversion, type ConversionRequest, type TimedOutcome } from '@/lib/conversion';
import type { JsonShape } from '@/lib/detect';
import { errorMessage } from '@/lib/errors';

export interface ConversionView {
  output: string;
  inputError: string | null;
  inputErrorLine: number | null;
  inputErrorColumn: number | null;
  outputError: string | null;
  shape: JsonShape | null;
  /** Wall time of the parse + convert, in ms. */
  ms: number | null;
  outputBytes: number;
  precisionLoss: boolean;
  /** A newer result is on its way (worker running or typing in progress). */
  pending: boolean;
}

const EMPTY: ConversionView = {
  output: '',
  inputError: null,
  inputErrorLine: null,
  inputErrorColumn: null,
  outputError: null,
  shape: null,
  ms: null,
  outputBytes: 0,
  precisionLoss: false,
  pending: false,
};

/** Large inputs wait for a short pause in typing before converting off-thread. */
const LARGE_INPUT_DEBOUNCE_MS = 200;

/**
 * Converts the editor input as the user types.
 *
 * - `useDeferredValue` keeps keystrokes responsive: React renders the typed
 *   text first and converts at lower priority.
 * - Inputs ≥ {@link WORKER_THRESHOLD_CHARS} convert in a Web Worker; the last
 *   result stays on screen (marked `pending`) until the new one arrives.
 * - Small inputs convert synchronously for instant feedback.
 */
export function useConversionResult(
  input: string,
  format: FormatId,
  direction: Direction,
  options: Record<string, unknown>,
): ConversionView {
  const { t } = useTranslation();
  const deferredInput = useDeferredValue(input);
  const large = deferredInput.length >= WORKER_THRESHOLD_CHARS;

  const request = useMemo<ConversionRequest>(
    () => ({ text: deferredInput, format, direction, options }),
    [deferredInput, format, direction, options],
  );

  const syncResult = useMemo(() => (large ? null : runConversion(request)), [large, request]);

  const [asyncState, setAsyncState] = useState<{
    request: ConversionRequest;
    result: TimedOutcome | { failure: string };
  } | null>(null);

  useEffect(() => {
    if (!large) return;
    let active = true;
    const timer = setTimeout(() => {
      convertLive(request).then(
        (result) => {
          if (active) setAsyncState({ request, result });
        },
        (err: unknown) => {
          if (active && !(err instanceof SupersededError)) {
            setAsyncState({ request, result: { failure: errorMessage(err) } });
          }
        },
      );
    }, LARGE_INPUT_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [large, request]);

  return useMemo(() => {
    const typing = input !== deferredInput;
    const latest = large ? asyncState?.result : syncResult;
    const pending = typing || (large && asyncState?.request !== request);
    if (!latest) return { ...EMPTY, pending };
    if ('failure' in latest) {
      return {
        ...EMPTY,
        outputError: t('errors.conversion_failed', { message: latest.failure }),
        pending,
      };
    }
    const { outcome, ms } = latest;
    switch (outcome.kind) {
      case 'empty':
        return { ...EMPTY, pending };
      case 'no-reverse':
        return { ...EMPTY, outputError: t('format_status.no_reverse'), ms, pending };
      case 'input-error':
        return {
          ...EMPTY,
          inputError: outcome.message,
          inputErrorLine: outcome.line ?? null,
          inputErrorColumn: outcome.column ?? null,
          ms,
          pending,
        };
      case 'output-error':
        return { ...EMPTY, outputError: outcome.message, shape: outcome.shape, ms, pending };
      case 'ok':
        return {
          ...EMPTY,
          output: outcome.output,
          shape: outcome.shape,
          ms,
          outputBytes: outcome.outputBytes,
          precisionLoss: outcome.precisionLoss,
          pending,
        };
    }
  }, [asyncState, deferredInput, input, large, request, syncResult, t]);
}
