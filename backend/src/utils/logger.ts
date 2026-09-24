import { env } from "../config/env.js";

type LogLevel = "error" | "warn" | "info" | "http" | "debug";

const levels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const currentLevel = levels[env.LOG_LEVEL] ?? levels.info;

function formatMessage(level: string, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  error(message: string, meta?: unknown) {
    if (currentLevel >= levels.error) {
      console.error(formatMessage("error", message, meta));
    }
  },
  warn(message: string, meta?: unknown) {
    if (currentLevel >= levels.warn) {
      console.warn(formatMessage("warn", message, meta));
    }
  },
  info(message: string, meta?: unknown) {
    if (currentLevel >= levels.info) {
      console.log(formatMessage("info", message, meta));
    }
  },
  http(message: string, meta?: unknown) {
    if (currentLevel >= levels.http) {
      console.log(formatMessage("http", message, meta));
    }
  },
  debug(message: string, meta?: unknown) {
    if (currentLevel >= levels.debug) {
      console.log(formatMessage("debug", message, meta));
    }
  },
};
