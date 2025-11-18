import pino from "pino";

/**
 * Structured logger using Pino
 * Provides better debugging, log levels, and PII redaction
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),

  // Pretty print in development
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,

  // Format log levels
  formatters: {
    level: (label) => ({ level: label }),
  },

  // Redact sensitive data
  redact: {
    paths: [
      "email",
      "password",
      "token",
      "secret",
      "*.email",
      "*.password",
      "*.token",
      "user.email",
      "session.user.email",
      "guardians",
      "note", // May contain PII in incident notes
    ],
    remove: true,
  },

  // Base context
  base: {
    env: process.env.NODE_ENV,
  },
});

/**
 * Create a child logger with additional context
 * @example
 * const log = createLogger({ module: 'incidents' });
 * log.info({ incidentId }, 'Incident logged');
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Log an error with stack trace
 */
export function logError(error: unknown, message: string, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    logger.error({ err: error, ...context }, message);
  } else {
    logger.error({ error: String(error), ...context }, message);
  }
}

/**
 * Log successful operations
 */
export function logSuccess(message: string, context?: Record<string, unknown>) {
  logger.info(context, message);
}

/**
 * Log warnings
 */
export function logWarning(message: string, context?: Record<string, unknown>) {
  logger.warn(context, message);
}

/**
 * Log debug information (only in development)
 */
export function logDebug(message: string, context?: Record<string, unknown>) {
  logger.debug(context, message);
}
