import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useKeyboardShortcuts', () => {
  it('matches on event.code so non-Latin layouts work', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ code: 'KeyS', mod: true, handler }]));
    const event = press({ code: 'KeyS', key: 'ы', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores auto-repeat', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ code: 'KeyS', mod: true, handler }]));
    press({ code: 'KeyS', ctrlKey: true, repeat: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('stays quiet while a dialog is open', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ code: 'Comma', mod: true, handler }]));
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.dataset['state'] = 'open';
    document.body.appendChild(dialog);
    press({ code: 'Comma', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses the latest handler without re-registering', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ fn }) => useKeyboardShortcuts([{ code: 'KeyS', mod: true, handler: fn }]),
      {
        initialProps: { fn: first },
      },
    );
    rerender({ fn: second });
    press({ code: 'KeyS', ctrlKey: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
