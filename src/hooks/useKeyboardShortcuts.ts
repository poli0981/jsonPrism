import { useEffect, useRef } from 'react';

export interface ShortcutDef {
  /** `KeyboardEvent.code`, e.g. 'KeyS' or 'Comma' — layout-independent. */
  code: string;
  mod?: boolean; // require Ctrl (Win/Linux) or Cmd (macOS)
  shift?: boolean;
  preventDefault?: boolean;
  handler: () => void;
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    // CodeMirror's contenteditable element
    target.closest('.cm-editor') !== null
  );
}

/**
 * App-wide keyboard shortcuts. Matching uses `event.code`, so they work on
 * non-Latin keyboard layouts too. Ignored while a dialog or sheet is open,
 * while an IME is composing, and for auto-repeat (holding Mod+S must not
 * download ten times). The listener is registered once; the latest shortcut
 * list is read through a ref.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDef[]): void {
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      const modPressed = isMac() ? e.metaKey : e.ctrlKey;
      for (const s of latest.current) {
        if (e.code !== s.code) continue;
        const wantMod = s.mod === true;
        if (wantMod !== modPressed) continue;
        if ((s.shift ?? false) !== e.shiftKey) continue;
        // Non-mod shortcuts never fire while typing.
        if (!wantMod && isEditable(e.target)) continue;
        if (s.preventDefault ?? true) e.preventDefault();
        s.handler();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function modKey(): 'Cmd' | 'Ctrl' {
  return isMac() ? 'Cmd' : 'Ctrl';
}
