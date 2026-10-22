import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLogs, createLogger, installGlobalErrorHandlers, recentLogs } from '../logger';

beforeEach(() => {
  for (const level of ['info', 'warn', 'error'] as const) {
    vi.spyOn(console, level).mockImplementation(() => {});
  }
});

afterEach(() => {
  clearLogs();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const lastMessage = () => recentLogs(1)[0]?.message;

describe('createLogger', () => {
  it('serialises non-string values as JSON', () => {
    createLogger('unit').info('count', 3, null, ['a'], { ok: true });
    expect(lastMessage()).toBe('count 3 null ["a"] {"ok":true}');
  });

  it('falls back to String() for values JSON cannot represent', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    createLogger('unit').warn(circular, 10n);
    expect(lastMessage()).toBe('[object Object] 10');
  });

  it('describes an Error without a stack by its name and message', () => {
    const error = new TypeError('bad input');
    Object.defineProperty(error, 'stack', { value: undefined });
    createLogger('unit').error(error);
    expect(lastMessage()).toBe('TypeError: bad input');
  });

  it('records debug output only in development builds', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.stubEnv('DEV', true);
    createLogger('dev').debug('trace', 1);
    expect(debug).toHaveBeenCalledWith('[jsonprism:dev]', 'trace', 1);
    expect(recentLogs(1)[0]).toMatchObject({ level: 'debug', scope: 'dev', message: 'trace 1' });

    clearLogs();
    debug.mockClear();
    vi.stubEnv('DEV', false);
    createLogger('prod').debug('trace');
    expect(debug).not.toHaveBeenCalled();
    expect(recentLogs()).toEqual([]);
  });

  it('returns the most recent entries oldest first, bounded by the limit', () => {
    const log = createLogger('order');
    log.info('one');
    log.info('two');
    log.info('three');
    expect(recentLogs(2).map((e) => e.message)).toEqual(['two', 'three']);
    expect(recentLogs(2)[0]?.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('installGlobalErrorHandlers', () => {
  it('routes uncaught errors and unhandled rejections into the log buffer, once', () => {
    const target = new EventTarget();
    installGlobalErrorHandlers(target as unknown as Window);

    target.dispatchEvent(new ErrorEvent('error', { error: new Error('kaboom') }));
    expect(recentLogs(1)[0]).toMatchObject({ level: 'error', scope: 'global' });
    expect(lastMessage()).toContain('kaboom');

    // Cross-origin script errors carry only a message.
    target.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }));
    expect(lastMessage()).toBe('Script error.');

    target.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: new Promise(() => {}),
        reason: 'quota exceeded',
      }),
    );
    expect(lastMessage()).toBe('Unhandled promise rejection: quota exceeded');

    // A second install is a no-op: no duplicate listeners on any target.
    const other = new EventTarget();
    installGlobalErrorHandlers(other as unknown as Window);
    const before = recentLogs(1000).length;
    other.dispatchEvent(new ErrorEvent('error', { message: 'ignored' }));
    target.dispatchEvent(new ErrorEvent('error', { message: 'once' }));
    expect(recentLogs(1000).length).toBe(before + 1);
    expect(lastMessage()).toBe('once');
  });
});
