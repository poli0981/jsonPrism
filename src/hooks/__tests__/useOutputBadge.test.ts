import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOutputBadge } from '../useOutputBadge';

type Tab = 'input' | 'output';

function setup(output: string, activeTab: Tab) {
  return renderHook(
    (props: { output: string; activeTab: Tab }) => useOutputBadge(props.output, props.activeTab),
    {
      initialProps: { output, activeTab },
    },
  );
}

describe('useOutputBadge', () => {
  it('stays off for the output that was already there on mount', () => {
    const { result } = setup('{"a":1}', 'input');
    expect(result.current).toBe(false);
  });

  it('turns on when the output changes while the input tab is showing', () => {
    const { result, rerender } = setup('', 'input');
    rerender({ output: '{"a":1}', activeTab: 'input' });
    expect(result.current).toBe(true);
    // Still unread after further changes.
    rerender({ output: '{"a":2}', activeTab: 'input' });
    expect(result.current).toBe(true);
  });

  it('clears once the output tab is opened and stays clear when going back', () => {
    const { result, rerender } = setup('', 'input');
    rerender({ output: 'a: 1', activeTab: 'input' });
    expect(result.current).toBe(true);

    rerender({ output: 'a: 1', activeTab: 'output' });
    expect(result.current).toBe(false);

    rerender({ output: 'a: 1', activeTab: 'input' });
    expect(result.current).toBe(false);
  });

  it('never shows while the output tab itself is active', () => {
    const { result, rerender } = setup('a', 'output');
    rerender({ output: 'b', activeTab: 'output' });
    expect(result.current).toBe(false);
    // The change was seen, so leaving the tab does not light the badge.
    rerender({ output: 'b', activeTab: 'input' });
    expect(result.current).toBe(false);
  });

  it('does not flag an output that was cleared', () => {
    const { result, rerender } = setup('a,b', 'input');
    rerender({ output: '', activeTab: 'input' });
    expect(result.current).toBe(false);
  });
});
