import { zip } from 'fflate';
import { getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
import { parseJsonInput } from './detect';
import type { BatchItem } from '@/stores/batchStore';

export interface ProcessingCallbacks {
  onUpdate(id: string, patch: Partial<BatchItem>): void;
  /** Optional progress hook called after each item (for UI yield). */
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

async function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Cannot read ${file.name}`));
    reader.readAsText(file);
  });
}

/**
 * Process a batch of queued items through the chosen converter.
 *
 * - Each item is read, parsed, converted, and reported back via callbacks
 * - Errors per item don't stop the rest
 * - Yields to the UI after every item
 * - Cooperatively cancellable via AbortSignal
 */
export async function processBatch(
  items: BatchItem[],
  format: FormatId,
  options: unknown,
  callbacks: ProcessingCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const converter = getConverter(format);
  if (!converter.meta.ready) {
    for (const item of items) {
      callbacks.onUpdate(item.id, {
        status: 'error',
        error: `Converter "${format}" is not implemented yet.`,
      });
    }
    return;
  }

  let processed = 0;

  for (const item of items) {
    if (signal.aborted) return;

    callbacks.onUpdate(item.id, { status: 'processing' });

    try {
      const text = await readFileText(item.file);
      if (signal.aborted) return;

      const parsed = parseJsonInput(text);
      if (!parsed.ok) {
        callbacks.onUpdate(item.id, {
          status: 'error',
          error: parsed.error === 'empty' ? 'Empty file.' : parsed.error,
        });
      } else {
        const result = converter.convert(
          { data: parsed.value, rawText: text, sourceName: item.filename },
          options as Parameters<typeof converter.convert>[1],
        );
        if (result.ok) {
          const outputSize = new TextEncoder().encode(result.output).length;
          callbacks.onUpdate(item.id, {
            status: 'done',
            output: result.output,
            outputSize,
          });
        } else {
          callbacks.onUpdate(item.id, { status: 'error', error: result.error });
        }
      }
    } catch (err) {
      callbacks.onUpdate(item.id, { status: 'error', error: (err as Error).message });
    }

    processed += 1;
    callbacks.onProgress?.(processed, items.length);
    await yieldToUI();
  }
}

/**
 * Strip the .json (or .txt) extension from a source filename and replace it
 * with the converter's output extension. Falls back to appending if there
 * is no extension to strip.
 */
export function outputFilename(sourceName: string, outputExt: string): string {
  const dot = sourceName.lastIndexOf('.');
  const base = dot > 0 ? sourceName.slice(0, dot) : sourceName;
  return `${base}.${outputExt}`;
}

/** De-duplicate filenames inside the zip by appending `_2`, `_3`, etc. */
export function uniquifyFilenames(names: string[]): string[] {
  const seen = new Map<string, number>();
  const out: string[] = [];
  for (const name of names) {
    const count = seen.get(name) ?? 0;
    if (count === 0) {
      out.push(name);
      seen.set(name, 1);
    } else {
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      out.push(`${base}_${count + 1}${ext}`);
      seen.set(name, count + 1);
    }
  }
  return out;
}

/** Bundle successful conversion outputs into a ZIP blob. */
export async function zipOutputs(
  items: BatchItem[],
  format: FormatId,
): Promise<{ blob: Blob; fileCount: number }> {
  const converter = getConverter(format);
  const done = items.filter((i) => i.status === 'done' && i.output !== undefined);
  const rawNames = done.map((i) => outputFilename(i.filename, converter.meta.extension));
  const uniqueNames = uniquifyFilenames(rawNames);

  const filesForZip: Record<string, Uint8Array> = {};
  for (let i = 0; i < done.length; i++) {
    const item = done[i]!;
    const name = uniqueNames[i]!;
    filesForZip[name] = new TextEncoder().encode(item.output!);
  }

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(filesForZip, { level: 6 }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  // .slice() returns a fresh Uint8Array<ArrayBuffer> — narrows the BlobPart
  // type so it satisfies the DOM lib's `ArrayBufferView<ArrayBuffer>` constraint.
  return {
    blob: new Blob([zipped.slice()], { type: 'application/zip' }),
    fileCount: done.length,
  };
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
