import { describe, expect, it, vi } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { outputFilename, processBatch, uniquifyFilenames, zipOutputs } from '../batch-processor';
import type { BatchItem } from '@/stores/batchStore';
import * as registry from '@/converters/registry';

function makeItem(id: string, name: string, content: string): BatchItem {
  return {
    id,
    file: new File([content], name, { type: 'application/json' }),
    filename: name,
    size: content.length,
    status: 'queued',
  };
}

describe('outputFilename', () => {
  it('replaces an existing extension', () => {
    expect(outputFilename('data.json', 'csv')).toBe('data.csv');
    expect(outputFilename('foo.txt', 'yaml')).toBe('foo.yaml');
  });

  it('appends extension when source has none', () => {
    expect(outputFilename('noext', 'csv')).toBe('noext.csv');
  });

  it('handles dot-prefixed names without losing them', () => {
    expect(outputFilename('.config', 'yaml')).toBe('.config.yaml');
  });
});

describe('uniquifyFilenames', () => {
  it('preserves unique names', () => {
    expect(uniquifyFilenames(['a.csv', 'b.csv'])).toEqual(['a.csv', 'b.csv']);
  });

  it('appends counter suffix on collisions', () => {
    expect(uniquifyFilenames(['a.csv', 'a.csv', 'a.csv'])).toEqual(['a.csv', 'a_2.csv', 'a_3.csv']);
  });

  it('preserves extension when uniquifying', () => {
    expect(uniquifyFilenames(['foo.yaml', 'foo.yaml'])).toEqual(['foo.yaml', 'foo_2.yaml']);
  });
});

describe('processBatch', () => {
  it('runs every item and reports done status', async () => {
    const items = [makeItem('1', 'a.json', '[{"id":1}]'), makeItem('2', 'b.json', '[{"id":2}]')];
    const updates: Record<string, Partial<BatchItem>[]> = {};
    await processBatch(
      items,
      'jsonl',
      { pretty: false },
      {
        onUpdate: (id, patch) => {
          (updates[id] ??= []).push(patch);
        },
      },
      new AbortController().signal,
    );
    expect(updates['1']?.some((p) => p.status === 'done')).toBe(true);
    expect(updates['2']?.some((p) => p.status === 'done')).toBe(true);
    const final1 = updates['1']!.at(-1)!;
    expect(final1.status).toBe('done');
    expect(final1.output).toContain('"id":1');
  });

  it('reports error for invalid JSON but continues processing', async () => {
    const items = [
      makeItem('bad', 'broken.json', '{not valid'),
      makeItem('good', 'good.json', '[{"a":1}]'),
    ];
    const finalStatuses: Record<string, string> = {};
    await processBatch(
      items,
      'jsonl',
      { pretty: false },
      {
        onUpdate: (id, patch) => {
          if (patch.status) finalStatuses[id] = patch.status;
        },
      },
      new AbortController().signal,
    );
    expect(finalStatuses['bad']).toBe('error');
    expect(finalStatuses['good']).toBe('done');
  });

  it('reports converter-level errors per item', async () => {
    const items = [
      // JSONL requires array root; passing an object should fail.
      makeItem('obj', 'obj.json', '{"a":1}'),
      makeItem('arr', 'arr.json', '[{"a":1}]'),
    ];
    const finalStatuses: Record<string, string> = {};
    await processBatch(
      items,
      'jsonl',
      { pretty: false },
      {
        onUpdate: (id, patch) => {
          if (patch.status) finalStatuses[id] = patch.status;
        },
      },
      new AbortController().signal,
    );
    expect(finalStatuses['obj']).toBe('error');
    expect(finalStatuses['arr']).toBe('done');
  });

  it('aborts mid-batch when signal is triggered', async () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeItem(`i${i}`, `file${i}.json`, '[{"a":1}]'),
    );
    const controller = new AbortController();
    const seen = new Set<string>();
    const promise = processBatch(
      items,
      'jsonl',
      { pretty: false },
      {
        onUpdate: (id, patch) => {
          if (patch.status === 'processing') seen.add(id);
        },
      },
      controller.signal,
    );
    // Abort almost immediately.
    setTimeout(() => controller.abort(), 0);
    await promise;
    // Should not have processed all 10.
    expect(seen.size).toBeLessThan(items.length);
  });

  it('marks all items as error if converter is not ready', async () => {
    // All shipped converters are `ready: true`, so mock one as not ready to
    // exercise the defensive branch in processBatch.
    const original = registry.getConverter('jsonl');
    const spy = vi.spyOn(registry, 'getConverter').mockReturnValue({
      ...original,
      meta: { ...original.meta, ready: false },
    });
    try {
      const items = [makeItem('1', 'a.json', '{}')];
      const updates: Partial<BatchItem>[] = [];
      await processBatch(
        items,
        'jsonl',
        {},
        { onUpdate: (_id, patch) => updates.push(patch) },
        new AbortController().signal,
      );
      expect(updates.some((u) => u.status === 'error')).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('zipOutputs', () => {
  it('zips successful outputs only', async () => {
    const items: BatchItem[] = [
      {
        id: '1',
        file: new File(['{}'], 'a.json'),
        filename: 'a.json',
        size: 2,
        status: 'done',
        output: '{"id":1}\n',
        outputSize: 9,
      },
      {
        id: '2',
        file: new File(['{}'], 'b.json'),
        filename: 'b.json',
        size: 2,
        status: 'error',
        error: 'bad',
      },
      {
        id: '3',
        file: new File(['{}'], 'c.json'),
        filename: 'c.json',
        size: 2,
        status: 'done',
        output: '{"id":3}\n',
        outputSize: 9,
      },
    ];
    const { blob, fileCount } = await zipOutputs(items, 'jsonl');
    expect(fileCount).toBe(2);
    expect(blob.size).toBeGreaterThan(0);

    // Decode and verify both files are present with correct content.
    const buffer = await blob.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(buffer));
    expect(Object.keys(unzipped).sort()).toEqual(['a.jsonl', 'c.jsonl']);
    expect(strFromU8(unzipped['a.jsonl']!)).toBe('{"id":1}\n');
  });

  it('uniquifies filenames inside the zip on collision', async () => {
    const items: BatchItem[] = [
      {
        id: '1',
        file: new File(['{}'], 'data.json'),
        filename: 'data.json',
        size: 2,
        status: 'done',
        output: 'a\n',
        outputSize: 2,
      },
      {
        id: '2',
        file: new File(['{}'], 'data.json'),
        filename: 'data.json',
        size: 2,
        status: 'done',
        output: 'b\n',
        outputSize: 2,
      },
    ];
    const { blob } = await zipOutputs(items, 'jsonl');
    const buffer = await blob.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(buffer));
    expect(Object.keys(unzipped).sort()).toEqual(['data.jsonl', 'data_2.jsonl']);
  });
});
