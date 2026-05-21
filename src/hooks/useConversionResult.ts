import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Direction } from '@/components/converter/DirectionToggle';
import { getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
import { parseJsonInput } from '@/lib/detect';

export function useConversionResult(
  input: string,
  format: FormatId,
  direction: Direction,
  options: Record<string, unknown>,
) {
  const { t } = useTranslation();

  return useMemo(() => {
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
        options as Parameters<typeof converter.reverse>[1],
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
      options as Parameters<typeof converter.convert>[1],
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
  }, [input, format, options, direction, t]);
}
