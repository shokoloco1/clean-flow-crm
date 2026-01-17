// Simple logging utility for debugging and error tracking
// Can be extended to integrate with services like Sentry, LogRocket, etc.

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: Date;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 100;

function formatLog(level: LogLevel, message: string, data?: unknown): LogEntry {
  return {
    level,
    message,
    data,
    timestamp: new Date(),
  };
}

function persistLog(entry: LogEntry) {
  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

export const logger = {
  info: (message: string, data?: unknown) => {
    const entry = formatLog("info", message, data);
    console.log(`[INFO] ${message}`, data ?? "");
    persistLog(entry);
  },

  warn: (message: string, data?: unknown) => {
    const entry = formatLog("warn", message, data);
    console.warn(`[WARN] ${message}`, data ?? "");
    persistLog(entry);
  },

  error: (message: string, error?: unknown) => {
    const entry = formatLog("error", message, error);
    console.error(`[ERROR] ${message}`, error ?? "");
    persistLog(entry);
    
    // Here you could integrate with error tracking services
    // Example: Sentry.captureException(error);
  },

  debug: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      const entry = formatLog("debug", message, data);
      console.debug(`[DEBUG] ${message}`, data ?? "");
      persistLog(entry);
    }
  },

  // Get recent logs for debugging
  getLogs: () => [...logs],

  // Clear logs
  clear: () => {
    logs.length = 0;
  },
};