import { create } from 'zustand';
import { getConverter, isFormatId } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { clearOptions, loadOptions, saveOptions } from '@/lib/options-storage';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';

/**
 * Workspace state — the things a user expects to survive route changes
 * (Convert → About → Convert).
 *
 * Persistence model:
 *  - `format` / `direction` → localStorage (cheap, always safe).
 *  - `optionsByFormat`     → localStorage per format (options-storage).
 *  - `input`                → in-memory only. Survives route changes because
 *                             this store is global, but does not survive
 *                             a full page reload. Persisting `input` to
 *                             localStorage was considered and skipped to
 *                             avoid quota errors on large pastes.
 */

const STORAGE_FORMAT_KEY = 'jsonprism.selected_format';
const STORAGE_DIRECTION_KEY = 'jsonprism.direction';
const DEFAULT_FORMAT: FormatId = 'jsonl';

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

/**
 * A stored format that no longer exists (renamed, hand-edited, "toString")
 * used to make `getConverter` throw while this module loaded — every reload
 * then crashed until storage was cleared.
 */
function readInitialFormat(): FormatId {
  const stored = safeGetItem(STORAGE_FORMAT_KEY);
  return isFormatId(stored) ? stored : DEFAULT_FORMAT;
}

function readInitialDirection(format: FormatId): Direction {
  // An input-only format (JSONC) has no JSON → direction.
  if (getConverter(format).meta.inputOnly) return 'reverse';
  return safeGetItem(STORAGE_DIRECTION_KEY) === 'reverse' ? 'reverse' : 'forward';
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  const initialFormat = readInitialFormat();
  const initialDirection = readInitialDirection(initialFormat);
  const initialOptions: Record<string, Record<string, unknown>> = {
    [initialFormat]: loadOptions(initialFormat, getConverter(initialFormat)),
  };

  return {
    input: '',
    format: initialFormat,
    direction: initialDirection,
    optionsByFormat: initialOptions,

    setInput: (v) => set({ input: v }),

    setFormat: (f) => {
      if (!isFormatId(f)) return;
      safeSetItem(STORAGE_FORMAT_KEY, f);
      const existing = get().optionsByFormat[f];
      if (existing) {
        set({ format: f });
      } else {
        set((state) => ({
          format: f,
          optionsByFormat: { ...state.optionsByFormat, [f]: loadOptions(f, getConverter(f)) },
        }));
      }
    },

    setDirection: (d) => {
      safeSetItem(STORAGE_DIRECTION_KEY, d);
      set({ direction: d });
    },

    setOptionsForFormat: (format, opts) => {
      saveOptions(format, opts, getConverter(format));
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
