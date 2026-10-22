import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { deserialize } from 'bson';
import { decode as decodeMsgpack } from '@msgpack/msgpack';
import { processBatch, uniquifyFilenames, zipOutputs } from '../batch-processor';
import type { BatchItem } from '@/stores/batchStore';
import { bsonConverter } from '@/converters/bson';
import { msgpackConverter } from '@/converters/msgpack';

function item(id: string, name: string, content: string): BatchItem {
  return {
    id,
    file: new File([content], name, { type: 'application/json' }),
    filename: name,
    size: content.length,
    status: 'queued',
  };
}

describe('uniquifyFilenames (audit regressions)', () => {
  it('never produces the same name twice, even when a suffix is already taken', () => {
    expect(uniquifyFilenames(['a.csv', 'a.csv', 'a_2.csv'])).toEqual([
      'a.csv',
      'a_2.csv',
      'a_2_2.csv',
    ]);
    const names = uniquifyFilenames(['x.json', 'x_2.json', 'x.json', 'x.json']);
    expect(new Set(names).size).toBe(names.length);
  });

  it('treats names differing only in case as collisions (case-insensitive file systems)', () => {
    expect(uniquifyFilenames(['A.csv', 'a.csv'])).toEqual(['A.csv', 'a_2.csv']);
  });
});

describe('zipOutputs (audit regressions)', () => {
  it('stores binary formats as real bytes, not base64 text', async () => {
    const data = { id: 7, name: 'prism' };
    const converted = bsonConverter.convert({ data }, { encoding: 'base64' });
    if (!converted.ok) throw new Error(converted.error);
    const done: BatchItem = {
      ...item('1', 'doc.json', '{}'),
      status: 'done',
      output: converted.output,
    };
    const { blob, fileCount } = await zipOutputs([done], 'bson', 'forward', 'base64');
    expect(fileCount).toBe(1);
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(deserialize(entries['doc.bson']!)).toEqual(data);
  });

  it('decodes hex-encoded MessagePack output too', async () => {
    const data = [1, 'two', { three: 3 }];
    const converted = msgpackConverter.convert({ data }, { encoding: 'hex' });
    if (!converted.ok) throw new Error(converted.error);
    const done: BatchItem = {
      ...item('1', 'list.json', '[]'),
      status: 'done',
      output: converted.output,
    };
    const { blob } = await zipOutputs([done], 'msgpack', 'forward', 'hex');
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(decodeMsgpack(entries['list.msgpack']!)).toEqual(data);
  });

  it('keeps text formats as UTF-8 text and names reverse outputs .json', async () => {
    const done: BatchItem = {
      ...item('1', 'data.csv', 'a\n1'),
      status: 'done',
      output: '[{"a":1}]',
    };
    const { blob } = await zipOutputs([done], 'csv', 'reverse');
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(strFromU8(entries['data.json']!)).toBe('[{"a":1}]');
  });
});

describe('processBatch (audit regressions)', () => {
  it('puts an item interrupted by cancel back into the queue', async () => {
    const controller = new AbortController();
    const statuses: string[] = [];
    await processBatch(
      [item('1', 'a.json', '[{"a":1}]')],
      'jsonl',
      { pretty: false },
      {
        onUpdate: (_id, patch) => {
          if (patch.status) statuses.push(patch.status);
          if (patch.status === 'processing') controller.abort();
        },
      },
      controller.signal,
    );
    expect(statuses).toEqual(['processing', 'queued']);
  });

  it('reports empty files with a translatable code', async () => {
    const patches: Partial<BatchItem>[] = [];
    await processBatch(
      [item('1', 'empty.json', '   ')],
      'jsonl',
      { pretty: false },
      { onUpdate: (_id, patch) => patches.push(patch) },
      new AbortController().signal,
    );
    expect(patches.at(-1)).toMatchObject({ status: 'error', errorCode: 'empty_file' });
  });

  it('reports the decoded byte size for binary outputs', async () => {
    const patches: Partial<BatchItem>[] = [];
    await processBatch(
      [item('1', 'doc.json', '{"a":1}')],
      'bson',
      { encoding: 'base64' },
      { onUpdate: (_id, patch) => patches.push(patch) },
      new AbortController().signal,
    );
    const done = patches.at(-1)!;
    expect(done.status).toBe('done');
    // {"a":1} as BSON is 12 bytes; its base64 text would be 16 characters.
    expect(done.outputSize).toBe(12);
  });
});
