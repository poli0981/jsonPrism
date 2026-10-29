import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '../workspaceStore';

beforeEach(() => {
  // Reset to a known state. Cannot recreate the store cleanly without
  // re-importing, but resetting individual fields is enough for these tests.
  window.localStorage.clear();
  useWorkspaceStore.setState({
    input: '',
    format: 'jsonl',
    direction: 'forward',
    optionsByFormat: {},
  });
});

describe('workspaceStore', () => {
  it('setInput updates input', () => {
    useWorkspaceStore.getState().setInput('[1, 2, 3]');
    expect(useWorkspaceStore.getState().input).toBe('[1, 2, 3]');
  });

  it('setFormat persists to localStorage and hydrates options', () => {
    useWorkspaceStore.getState().setFormat('csv');
    expect(useWorkspaceStore.getState().format).toBe('csv');
    expect(window.localStorage.getItem('jsonprism.selected_format')).toBe('csv');
    expect(useWorkspaceStore.getState().optionsByFormat['csv']).toBeDefined();
  });

  it('setDirection persists to localStorage', () => {
    useWorkspaceStore.getState().setDirection('reverse');
    expect(useWorkspaceStore.getState().direction).toBe('reverse');
    expect(window.localStorage.getItem('jsonprism.direction')).toBe('reverse');
  });

  it('setOptionsForFormat updates the per-format slot', () => {
    useWorkspaceStore.getState().setOptionsForFormat('jsonl', { pretty: true });
    expect(useWorkspaceStore.getState().optionsByFormat['jsonl']).toEqual({ pretty: true });
  });

  it('resetOptionsForFormat restores converter defaults', () => {
    useWorkspaceStore.getState().setOptionsForFormat('jsonl', { pretty: true });
    useWorkspaceStore.getState().resetOptionsForFormat('jsonl');
    // jsonl converter's defaultOptions = { pretty: false }
    expect(useWorkspaceStore.getState().optionsByFormat['jsonl']).toEqual({ pretty: false });
  });

  it('switching format preserves prior format options', () => {
    useWorkspaceStore.getState().setOptionsForFormat('jsonl', { pretty: true });
    useWorkspaceStore.getState().setFormat('csv');
    useWorkspaceStore.getState().setFormat('jsonl');
    expect(useWorkspaceStore.getState().optionsByFormat['jsonl']).toEqual({ pretty: true });
  });
});

describe('workspaceStore initial state', () => {
  /** The store reads storage once, at module load — import a fresh copy per scenario. */
  async function loadStore() {
    vi.resetModules();
    const { useWorkspaceStore: store } = await import('../workspaceStore');
    return store;
  }

  it('restores the stored format and direction', async () => {
    window.localStorage.setItem('jsonprism.selected_format', 'yaml');
    window.localStorage.setItem('jsonprism.direction', 'reverse');
    const store = await loadStore();
    expect(store.getState()).toMatchObject({ format: 'yaml', direction: 'reverse' });
  });

  it('opens an input-only format in the → JSON direction', async () => {
    window.localStorage.setItem('jsonprism.selected_format', 'jsonc');
    window.localStorage.setItem('jsonprism.direction', 'forward');
    const store = await loadStore();
    expect(store.getState()).toMatchObject({ format: 'jsonc', direction: 'reverse' });
  });
});
