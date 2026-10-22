/**
 * Tiny scoped logger. Nothing leaves the device: entries go to the console and
 * to an in-memory ring buffer that the About page can copy as diagnostics when
 * a user files a bug report (PRIVACY.md: no remote error reporting).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  time: string;
  level: LogLevel;
  scope: string;
  message: string;
}

const MAX_ENTRIES = 200;
const buffer: LogEntry[] = [];

function describe(value: unknown): string {
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function record(level: LogLevel, scope: string, args: unknown[]): void {
  buffer.push({
    time: new Date().toISOString(),
    level,
    scope,
    message: args.map(describe).join(' '),
  });
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
}

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export function createLogger(scope: string): Logger {
  const prefix = `[jsonprism:${scope}]`;
  return {
    debug: (...args) => {
      if (!import.meta.env.DEV) return;
      record('debug', scope, args);
      console.debug(prefix, ...args);
    },
    info: (...args) => {
      record('info', scope, args);
      console.info(prefix, ...args);
    },
    warn: (...args) => {
      record('warn', scope, args);
      console.warn(prefix, ...args);
    },
    error: (...args) => {
      record('error', scope, args);
      console.error(prefix, ...args);
    },
  };
}

/** Most recent entries, oldest first. */
export function recentLogs(limit = 50): LogEntry[] {
  return buffer.slice(-limit);
}

/** Test helper. */
export function clearLogs(): void {
  buffer.length = 0;
}

let globalHandlersInstalled = false;

/** Routes uncaught errors and unhandled rejections into the log buffer. */
export function installGlobalErrorHandlers(target: Window = window): void {
  if (globalHandlersInstalled) return;
  globalHandlersInstalled = true;
  const log = createLogger('global');
  target.addEventListener('error', (event) => {
    log.error(event.error ?? event.message);
  });
  target.addEventListener('unhandledrejection', (event) => {
    log.error('Unhandled promise rejection:', event.reason);
  });
}
