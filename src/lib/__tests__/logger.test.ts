import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearLogs, createLogger, recentLogs } from '../logger';

afterEach(() => {
  clearLogs();
  vi.restoreAllMocks();
});

describe('logger', () => {
  it('prefixes console output with the scope and records entries', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createLogger('unit').warn('careful', { n: 1 });
    expect(warn).toHaveBeenCalledWith('[jsonprism:unit]', 'careful', { n: 1 });
    const [entry] = recentLogs();
    expect(entry).toMatchObject({ level: 'warn', scope: 'unit', message: 'careful {"n":1}' });
  });

  it('keeps a bounded ring buffer', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createLogger('ring');
    for (let i = 0; i < 250; i++) log.info(`line ${i}`);
    const entries = recentLogs(1000);
    expect(entries).toHaveLength(200);
    expect(entries.at(-1)?.message).toBe('line 249');
  });

  it('records errors with their stack', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger('err').error(new Error('boom'));
    expect(recentLogs(1)[0]?.message).toContain('boom');
  });
});
