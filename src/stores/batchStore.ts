import { create } from 'zustand';

export type BatchItemStatus = 'queued' | 'processing' | 'done' | 'error';

/** Failures the UI translates itself; other errors carry the converter's message. */
export type BatchErrorCode = 'empty_file' | 'no_reverse' | 'read_failed';

export interface BatchItem {
  id: string;
  /** Original file reference; not serializable, kept in memory only. */
  file: File;
  filename: string;
  size: number;
  status: BatchItemStatus;
  output?: string;
  outputSize?: number;
  error?: string;
  errorCode?: BatchErrorCode;
}

/** Hard upper bound on queue size. UI may suggest a smaller default. */
export const BATCH_MAX_FILES = 500;

export type AddFilesReason = 'limit' | 'duplicate' | undefined;

interface BatchState {
  items: Record<string, BatchItem>;
  itemOrder: string[];
  processing: boolean;
  abortController: AbortController | null;

  // Queries
  size(): number;
  ready(): boolean; // any items in 'done' status?
  hasAny(): boolean;

  // Mutations
  addFiles(files: File[]): { added: number; skipped: number; reason?: AddFilesReason };
  removeItem(id: string): void;
  clear(): void;
  setProcessing(p: boolean): void;
  setAbortController(c: AbortController | null): void;
  updateItem(id: string, patch: Partial<BatchItem>): void;
  /** Applies many patches in one store update (one render instead of N). */
  updateItems(patches: ReadonlyMap<string, Partial<BatchItem>>): void;
  resetStatuses(): void;
}

let idSeq = 0;
function nextId(): string {
  idSeq += 1;
  return `b${Date.now().toString(36)}_${idSeq.toString(36)}`;
}

/** Stable key for deduplication. File objects are ephemeral but
 * `(name, size, lastModified)` is the standard "same file" heuristic. */
function fileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

/**
 * Applies a status patch. A new status clears the previous run's output/error
 * fields so a re-processed row never shows stale results.
 */
function withPatch(current: BatchItem, patch: Partial<BatchItem>): BatchItem {
  if (patch.status === undefined || patch.status === current.status)
    return { ...current, ...patch };
  const { output: _o, outputSize: _os, error: _e, errorCode: _ec, ...rest } = current;
  void _o;
  void _os;
  void _e;
  void _ec;
  return { ...rest, ...patch } as BatchItem;
}

export const useBatchStore = create<BatchState>((set, get) => ({
  items: {},
  itemOrder: [],
  processing: false,
  abortController: null,

  size: () => get().itemOrder.length,
  ready: () => Object.values(get().items).some((i) => i.status === 'done'),
  hasAny: () => get().itemOrder.length > 0,

  addFiles: (files) => {
    let added = 0;
    let skipped = 0;
    let reason: AddFilesReason;

    set((state) => {
      const remaining = BATCH_MAX_FILES - state.itemOrder.length;
      if (remaining <= 0) {
        skipped = files.length;
        reason = 'limit';
        return state;
      }

      const newItems: Record<string, BatchItem> = { ...state.items };
      const newOrder = [...state.itemOrder];

      // Seed dedup set with the current queue's file keys.
      const seen = new Set<string>();
      for (const id of state.itemOrder) {
        const existing = state.items[id];
        if (existing) seen.add(fileKey(existing.file));
      }

      for (const file of files) {
        if (newOrder.length >= BATCH_MAX_FILES) {
          skipped += 1;
          reason = 'limit';
          continue;
        }
        const key = fileKey(file);
        if (seen.has(key)) {
          skipped += 1;
          // Don't overwrite a 'limit' reason — limit is more actionable.
          if (reason !== 'limit') reason = 'duplicate';
          continue;
        }
        seen.add(key);
        const id = nextId();
        newItems[id] = {
          id,
          file,
          filename: file.name,
          size: file.size,
          status: 'queued',
        };
        newOrder.push(id);
        added += 1;
      }

      return { items: newItems, itemOrder: newOrder };
    });

    return { added, skipped, reason };
  },

  removeItem: (id) =>
    set((state) => {
      if (!state.items[id]) return state;
      const { [id]: _removed, ...rest } = state.items;
      void _removed;
      return {
        items: rest,
        itemOrder: state.itemOrder.filter((x) => x !== id),
      };
    }),

  clear: () =>
    set((state) => {
      state.abortController?.abort();
      return {
        items: {},
        itemOrder: [],
        processing: false,
        abortController: null,
      };
    }),

  setProcessing: (p) => set({ processing: p }),
  setAbortController: (c) => set({ abortController: c }),

  updateItem: (id, patch) =>
    set((state) => {
      const current = state.items[id];
      if (!current) return state;
      return {
        items: { ...state.items, [id]: withPatch(current, patch) },
      };
    }),

  updateItems: (patches) =>
    set((state) => {
      if (patches.size === 0) return state;
      const items = { ...state.items };
      for (const [id, patch] of patches) {
        const current = items[id];
        if (current) items[id] = withPatch(current, patch);
      }
      return { items };
    }),

  resetStatuses: () =>
    set((state) => {
      const newItems: Record<string, BatchItem> = {};
      for (const id of Object.keys(state.items)) {
        const item = state.items[id]!;
        // Reset to queued; drop any prior output/error fields without
        // assigning `undefined` (forbidden under exactOptionalPropertyTypes).
        const { output: _o, outputSize: _os, error: _e, errorCode: _ec, ...rest } = item;
        void _o;
        void _os;
        void _e;
        void _ec;
        newItems[id] = { ...rest, status: 'queued' };
      }
      return { items: newItems };
    }),
}));
