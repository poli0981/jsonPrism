import { useEffect } from 'react';

export interface ShortcutDef {
  key: string;          // lowercase key, e.g. 'k', 's', '/'
  mod?: boolean;        // require Ctrl (Win/Linux) or Cmd (macOS)
  shift?: boolean;
  preventDefault?: boolean;
  handler: () => void;
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip if user is typing in editable text — except for Mod-prefixed.
      const target = e.target as HTMLElement | null;
      const inEditable =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          // CodeMirror's contenteditable element
          target.closest('.cm-editor') !== null);

      for (const s of shortcuts) {
        if (e.key.toLowerCase() !== s.key.toLowerCase()) continue;
        const wantMod = s.mod === true;
        const modPressed = isMac() ? e.metaKey : e.ctrlKey;
        if (wantMod !== modPressed) continue;
        if ((s.shift ?? false) !== e.shiftKey) continue;
        // If non-mod shortcut and user is in editable, skip.
        if (!wantMod && inEditable) continue;
        if (s.preventDefault ?? true) e.preventDefault();
        s.handler();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts]);
}

export function modKey(): 'Cmd' | 'Ctrl' {
  return isMac() ? 'Cmd' : 'Ctrl';
}
