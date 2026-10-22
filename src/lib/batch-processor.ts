import { Zip, ZipDeflate } from 'fflate';
import { getConverter } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { decodeBytes, type Encoding } from './bytes';
import { convertFile } from './convert-client';
import type { ConversionOutcome } from './conversion';
import { errorMessage } from './errors';
import { createLogger } from './logger';
import type { BatchItem, BatchErrorCode } from '@/stores/batchStore';

const log = createLogger('batch');

export interface ProcessingCallbacks {
  onUpdate(id: string, patch: Partial<BatchItem>): void;
  /** Optional progress hook called after each item. */
  onProgress?(processed: number, total: number): void;
}

/** Yield control to the browser so the UI stays responsive. */
function yieldToUI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function errorPatch(errorCode: BatchErrorCode | undefined, error: string): Partial<BatchItem> {
  return { status: 'error', error, ...(errorCode ? { errorCode } : {}) };
}

function patchFor(outcome: ConversionOutcome): Partial<BatchItem> {
  switch (outcome.kind) {
    case 'ok':
      return { status: 'done', output: outcome.output, outputSize: outcome.outputBytes };
    case 'empty':
      return errorPatch('empty_file', 'Empty file.');
    case 'no-reverse':
      return errorPatch('no_reverse', 'This format has no reverse conversion.');
    case 'input-error':
    case 'output-error':
      return errorPatch(undefined, outcome.message);
  }
}

/**
 * Process a batch of queued items through the chosen converter.
 *
 * - Each file is read and converted in the conversion worker (main thread as
 *   a fallback) and reported back via callbacks
 * - Errors per item don't stop the rest
 * - Cooperatively cancellable via AbortSignal; an item interrupted mid-flight
 *   goes back to `queued` so the next run picks it up again
 */
export async function processBatch(
  items: BatchItem[],
  format: FormatId,
  options: Record<string, unknown>,
  callbacks: ProcessingCallbacks,
  signal: AbortSignal,
  direction: Direction = 'forward',
): Promise<void> {
  const converter = getConverter(format);
  if (direction === 'reverse' && typeof converter.reverse !== 'function') {
    for (const item of items) callbacks.onUpdate(item.id, patchFor({ kind: 'no-reverse' }));
    return;
  }

  let processed = 0;
  for (const item of items) {
    if (signal.aborted) return;
    callbacks.onUpdate(item.id, { status: 'processing' });

    let patch: Partial<BatchItem>;
    try {
      const { outcome } = await convertFile(
        item.file,
        { format, direction, options, sourceName: item.filename },
        signal,
      );
      patch = patchFor(outcome);
    } catch (err) {
      if (signal.aborted) {
        callbacks.onUpdate(item.id, { status: 'queued' });
        return;
      }
      log.warn(`Could not convert ${item.filename}:`, err);
      patch = errorPatch('read_failed', errorMessage(err));
    }

    if (signal.aborted) {
      callbacks.onUpdate(item.id, { status: 'queued' });
      return;
    }
    callbacks.onUpdate(item.id, patch);
    processed += 1;
    callbacks.onProgress?.(processed, items.length);
    await yieldToUI();
  }
}

/**
 * Replace the source extension with the output extension. Falls back to
 * appending if there is no extension to strip.
 */
export function outputFilename(sourceName: string, outputExt: string): string {
  const dot = sourceName.lastIndexOf('.');
  const base = dot > 0 ? sourceName.slice(0, dot) : sourceName;
  return `${base}.${outputExt}`;
}

/**
 * De-duplicate filenames inside the zip by appending `_2`, `_3`, etc. Checks
 * every generated name against all names already used, so
 * `['a.csv', 'a.csv', 'a_2.csv']` can't produce two `a_2.csv` entries.
 */
export function uniquifyFilenames(names: string[]): string[] {
  const used = new Set<string>();
  const counters = new Map<string, number>();
  const taken = (name: string) => used.has(name.toLowerCase());
  return names.map((name) => {
    let candidate = name;
    if (taken(candidate)) {
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      let n = counters.get(name) ?? 1;
      do {
        n += 1;
        candidate = `${base}_${n}${ext}`;
      } while (taken(candidate));
      counters.set(name, n);
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

/**
 * Bundle successful conversion outputs into a ZIP blob. Binary formats are
 * decoded back to raw bytes so `.bson` / `.cbor` / `.msgpack` entries are real
 * binary files, matching single-file downloads.
 */
export async function zipOutputs(
  items: BatchItem[],
  format: FormatId,
  direction: Direction = 'forward',
  encoding: Encoding = 'base64',
): Promise<{ blob: Blob; fileCount: number }> {
  const converter = getConverter(format);
  const isReverse = direction === 'reverse';
  // In reverse mode the outputs are JSON, so they get the .json extension
  // regardless of which source format the user dropped in.
  const outputExt = isReverse ? 'json' : converter.meta.extension;
  const binary = !isReverse && converter.meta.binary === true;
  const done = items.filter((i) => i.status === 'done' && i.output !== undefined);
  const names = uniquifyFilenames(done.map((i) => outputFilename(i.filename, outputExt)));

  const chunks: Uint8Array[] = [];
  const finished = new Promise<void>((resolve, reject) => {
    const zip = new Zip((err, chunk, final) => {
      if (err) {
        reject(err);
        return;
      }
      chunks.push(chunk);
      if (final) resolve();
    });
    const encoder = new TextEncoder();
    void (async () => {
      try {
        for (let i = 0; i < done.length; i++) {
          const output = done[i]!.output!;
          const entry = new ZipDeflate(names[i]!, { level: 6 });
          zip.add(entry);
          entry.push(binary ? decodeBytes(output, encoding) : encoder.encode(output), true);
          // Deflate runs synchronously per entry; let the UI breathe between files.
          if (i % 8 === 7) await yieldToUI();
        }
        zip.end();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(errorMessage(err)));
      }
    })();
  });
  await finished;

  return {
    // fflate allocates plain ArrayBuffers; the cast avoids copying every chunk.
    blob: new Blob(chunks as unknown as BlobPart[], { type: 'application/zip' }),
    fileCount: done.length,
  };
}
