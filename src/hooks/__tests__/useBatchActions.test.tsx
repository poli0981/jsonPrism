import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import '@/i18n';
import { useBatchActions } from '../useBatchActions';
import { useBatchStore } from '@/stores/batchStore';

beforeEach(() => {
  useBatchStore.getState().clear();
});

async function waitForIdle() {
  for (let i = 0; i < 100 && useBatchStore.getState().processing; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
}

describe('useBatchActions', () => {
  it('re-processing a finished batch keeps every row converted (regression)', async () => {
    useBatchStore
      .getState()
      .addFiles([new File(['[{"a":1}]'], 'one.json'), new File(['[{"b":2}]'], 'two.json')]);
    const { result } = renderHook(() => useBatchActions('jsonl', 'forward', { pretty: false }));

    await act(async () => {
      await result.current.start();
    });
    await waitForIdle();
    // Second run — this used to wipe the outputs and process nothing.
    await act(async () => {
      await result.current.start();
    });
    await waitForIdle();

    const { items, itemOrder } = useBatchStore.getState();
    const statuses = itemOrder.map((id) => items[id]?.status);
    expect(statuses).toEqual(['done', 'done']);
    expect(itemOrder.every((id) => typeof items[id]?.output === 'string')).toBe(true);
  });
});
