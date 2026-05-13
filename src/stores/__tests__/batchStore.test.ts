import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BATCH_MAX_FILES, useBatchStore } from '../batchStore';

function makeFile(name: string, content = '{}'): File {
  return new File([content], name, { type: 'application/json' });
}

beforeEach(() => {
  useBatchStore.getState().clear();
});

afterEach(() => {
  useBatchStore.getState().clear();
});

describe('batchStore', () => {
  it('starts empty', () => {
    const s = useBatchStore.getState();
    expect(s.size()).toBe(0);
    expect(s.hasAny()).toBe(false);
    expect(s.ready()).toBe(false);
  });

  it('addFiles adds queued items preserving order', () => {
    const result = useBatchStore
      .getState()
      .addFiles([makeFile('a.json'), makeFile('b.json'), makeFile('c.json')]);
    expect(result.added).toBe(3);
    expect(result.skipped).toBe(0);
    const s = useBatchStore.getState();
    expect(s.size()).toBe(3);
    expect(s.itemOrder.map((id) => s.items[id]!.filename)).toEqual(['a.json', 'b.json', 'c.json']);
    expect(s.itemOrder.every((id) => s.items[id]!.status === 'queued')).toBe(true);
  });

  it('addFiles enforces BATCH_MAX_FILES', () => {
    const fitting = Array.from({ length: BATCH_MAX_FILES - 1 }, (_, i) => makeFile(`f${i}.json`));
    useBatchStore.getState().addFiles(fitting);
    const result = useBatchStore
      .getState()
      .addFiles([makeFile('one_more.json'), makeFile('over_the_limit.json')]);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.reason).toBe('limit');
    expect(useBatchStore.getState().size()).toBe(BATCH_MAX_FILES);
  });

  it('removeItem removes one queue entry by id', () => {
    useBatchStore.getState().addFiles([makeFile('a.json'), makeFile('b.json')]);
    const firstId = useBatchStore.getState().itemOrder[0]!;
    useBatchStore.getState().removeItem(firstId);
    expect(useBatchStore.getState().size()).toBe(1);
    expect(useBatchStore.getState().items[firstId]).toBeUndefined();
  });

  it('clear resets everything', () => {
    useBatchStore.getState().addFiles([makeFile('a.json')]);
    useBatchStore.getState().setProcessing(true);
    useBatchStore.getState().clear();
    const s = useBatchStore.getState();
    expect(s.size()).toBe(0);
    expect(s.processing).toBe(false);
  });

  it('updateItem applies patches', () => {
    useBatchStore.getState().addFiles([makeFile('a.json')]);
    const id = useBatchStore.getState().itemOrder[0]!;
    useBatchStore.getState().updateItem(id, {
      status: 'done',
      output: 'x',
      outputSize: 1,
    });
    const item = useBatchStore.getState().items[id]!;
    expect(item.status).toBe('done');
    expect(item.output).toBe('x');
    expect(item.outputSize).toBe(1);
  });

  it('ready() returns true once any item is done', () => {
    useBatchStore.getState().addFiles([makeFile('a.json'), makeFile('b.json')]);
    const id = useBatchStore.getState().itemOrder[0]!;
    useBatchStore.getState().updateItem(id, { status: 'done', output: 'x' });
    expect(useBatchStore.getState().ready()).toBe(true);
  });

  it('resetStatuses sets all items back to queued and clears outputs/errors', () => {
    useBatchStore.getState().addFiles([makeFile('a.json'), makeFile('b.json')]);
    const [id1, id2] = useBatchStore.getState().itemOrder;
    useBatchStore.getState().updateItem(id1!, { status: 'done', output: 'x', outputSize: 1 });
    useBatchStore.getState().updateItem(id2!, { status: 'error', error: 'bad' });
    useBatchStore.getState().resetStatuses();
    const s = useBatchStore.getState();
    expect(s.items[id1!]!.status).toBe('queued');
    expect(s.items[id1!]!.output).toBeUndefined();
    expect(s.items[id2!]!.status).toBe('queued');
    expect(s.items[id2!]!.error).toBeUndefined();
  });
});
