// Simple logging utility for debugging and error tracking
// Only logs to console in development mode for production safety
// Integrates with Sentry for production error tracking

import { captureError } from "./sentry";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: Date;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 100;

// Check if we're in development mode
const isDev = import.meta.env.DEV;

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
    if (isDev) {
      console.log(`[INFO] ${message}`, data ?? "");
    }
    persistLog(entry);
  },

  warn: (message: string, data?: unknown) => {
    const entry = formatLog("warn", message, data);
    if (isDev) {
      console.warn(`[WARN] ${message}`, data ?? "");
    }
    persistLog(entry);
  },

  error: (message: string, error?: unknown) => {
    const entry = formatLog("error", message, error);
    // Always log errors but only to console in dev
    if (isDev) {
      console.error(`[ERROR] ${message}`, error ?? "");
    }
    persistLog(entry);

    // Send to Sentry in production
    if (error instanceof Error) {
      captureError(error, { message });
    }
  },

  debug: (message: string, data?: unknown) => {
    if (isDev) {
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