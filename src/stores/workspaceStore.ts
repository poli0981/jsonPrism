import { create } from 'zustand';
import { getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
import { clearOptions, loadOptions, saveOptions } from '@/lib/options-storage';
import type { Direction } from '@/components/converter/DirectionToggle';

/**
 * Workspace state — the things a user expects to survive route changes
 * (Convert → About → Convert).
 *
 * Persistence model:
 *  - `format` / `direction` → localStorage (cheap, always safe).
 *  - `optionsByFormat`     → localStorage per format (existing options-storage).
 *  - `input`                → in-memory only. Survives route changes because
 *                             this store is global, but does not survive
 *                             a full page reload. Persisting `input` to
 *                             localStorage was considered and skipped to
 *                             avoid quota errors on large pastes.
 */

const STORAGE_FORMAT_KEY = 'jsonprism.selected_format';
const STORAGE_DIRECTION_KEY = 'jsonprism.direction';

interface WorkspaceState {
  input: string;
  format: FormatId;
  direction: Direction;
  optionsByFormat: Record<string, Record<string, unknown>>;

  setInput(v: string): void;
  setFormat(f: FormatId): void;
  setDirection(d: Direction): void;
  setOptionsForFormat(format: FormatId, opts: Record<string, unknown>): void;
  resetOptionsForFormat(format: FormatId): void;
}

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota / shim missing — non-fatal */
  }
}

function readInitialFormat(): FormatId {
  const stored = safeGet(STORAGE_FORMAT_KEY);
  return (stored as FormatId | null) ?? 'jsonl';
}

function readInitialDirection(): Direction {
  return safeGet(STORAGE_DIRECTION_KEY) === 'reverse' ? 'reverse' : 'forward';
}

function persistFormat(f: FormatId): void {
  safeSet(STORAGE_FORMAT_KEY, f);
}

function persistDirection(d: Direction): void {
  safeSet(STORAGE_DIRECTION_KEY, d);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  const initialFormat = readInitialFormat();
  const initialDirection = readInitialDirection();
  const initialOptions: Record<string, Record<string, unknown>> = {
    [initialFormat]: loadOptions(initialFormat, getConverter(initialFormat).defaultOptions),
  };

  return {
    input: '',
    format: initialFormat,
    direction: initialDirection,
    optionsByFormat: initialOptions,

    setInput: (v) => set({ input: v }),

    setFormat: (f) => {
      persistFormat(f);
      const existing = get().optionsByFormat[f];
      if (existing) {
        set({ format: f });
      } else {
        const c = getConverter(f);
        set((state) => ({
          format: f,
          optionsByFormat: { ...state.optionsByFormat, [f]: loadOptions(f, c.defaultOptions) },
        }));
      }
    },

    setDirection: (d) => {
      persistDirection(d);
      set({ direction: d });
    },

    setOptionsForFormat: (format, opts) => {
      saveOptions(format, opts);
      set((state) => ({
        optionsByFormat: { ...state.optionsByFormat, [format]: opts },
      }));
    },

    resetOptionsForFormat: (format) => {
      const c = getConverter(format);
      clearOptions(format);
      set((state) => ({
        optionsByFormat: { ...state.optionsByFormat, [format]: { ...c.defaultOptions } },
      }));
    },
  };
});
