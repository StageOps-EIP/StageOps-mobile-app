/**
 * Minimal logger — drop-in for console.* with level tagging.
 * Swap the sink in production (e.g. Sentry, custom API) by replacing `sink`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
  timestamp: number;
}

type LogSink = (entry: LogEntry) => void;

// Default sink: dev console. Replace at app init for production.
let _sink: LogSink = (entry) => {
  const prefix = `[${entry.level.toUpperCase()}][${entry.tag}]`;
  switch (entry.level) {
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug(prefix, entry.message, entry.data ?? '');
      break;
    case 'info':
      // eslint-disable-next-line no-console
      console.info(prefix, entry.message, entry.data ?? '');
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(prefix, entry.message, entry.data ?? '');
      break;
    case 'error':
      // eslint-disable-next-line no-console
      console.error(prefix, entry.message, entry.data ?? '');
      break;
  }
};

export function setLogSink(sink: LogSink): void {
  _sink = sink;
}

function emit(level: LogLevel, tag: string, message: string, data?: unknown): void {
  _sink({ level, tag, message, data, timestamp: Date.now() });
}

export const log = {
  debug: (tag: string, message: string, data?: unknown) => emit('debug', tag, message, data),
  info: (tag: string, message: string, data?: unknown) => emit('info', tag, message, data),
  warn: (tag: string, message: string, data?: unknown) => emit('warn', tag, message, data),
  error: (tag: string, message: string, data?: unknown) => emit('error', tag, message, data),
};

