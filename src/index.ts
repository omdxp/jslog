/**
 * @omdxp/jslog - Structured logging for Node.js
 *
 * A high-performance structured logging library inspired by Go's log/slog,
 * with additional features specifically designed for Node.js applications.
 *
 * @packageDocumentation
 *
 * @example Basic usage
 * ```typescript
 * import { Logger, TextHandler, Level, Int, String } from '@omdxp/jslog';
 *
 * const logger = new Logger(new TextHandler({ level: Level.INFO }));
 * logger.info("Server started", Int("port", 3000), String("env", "production"));
 * ```
 *
 * @example With file rotation
 * ```typescript
 * import { Logger, FileHandler } from '@omdxp/jslog';
 *
 * const logger = new Logger(new FileHandler({
 *   filepath: './logs/app.log',
 *   maxSize: 10 * 1024 * 1024,  // 10MB
 *   maxFiles: 5
 * }));
 * ```
 *
 * @example Async non-blocking logging
 * ```typescript
 * import { Logger, AsyncHandler, JSONHandler } from '@omdxp/jslog';
 *
 * const logger = new Logger(new AsyncHandler({
 *   handler: new JSONHandler()
 * }));
 * logger.info("This never blocks");
 * ```
 */

import type { LogContext } from "./utils";

// Core types and interfaces

// Core types and classes
export {
  Logger,
  Level,
  LevelVar,
  type Attr,
  type Value,
  type Record,
  type Handler,
  type Source,
  type LogValuer,
} from "./logger";

// Standard handlers
export {
  TextHandler,
  JSONHandler,
  DiscardHandler,
  MultiHandler,
  type HandlerOptions,
} from "./handlers";

// Advanced handlers (Go slog wishes it had these!)
export {
  FileHandler,
  BufferedHandler,
  SamplingHandler,
  FilterHandler,
  ColorHandler,
  PrettyHandler,
  CircuitBreakerHandler,
  type FileHandlerOptions,
  type BufferedHandlerOptions,
  type SamplingHandlerOptions,
  type FilterHandlerOptions,
  type ColorHandlerOptions,
  type PrettyHandlerOptions,
  RingBufferHandler,
  type RingBufferHandlerOptions,
  type CircuitBreakerHandlerOptions,
} from "./advanced-handlers";

// Async & Middleware support (composition FTW!)
export {
  AsyncHandler,
  MiddlewareHandler,
  MetricsMiddleware,
  type AsyncHandlerOptions,
  type MiddlewareHandlerOptions,
  type HandlerMiddleware,
  // Middleware functions
  timestampMiddleware,
  hostnameMiddleware,
  pidMiddleware,
  rateLimitMiddleware,
  dedupeMiddleware,
  enrichMiddleware,
  transformMiddleware,
  conditionalMiddleware,
  errorBoundaryMiddleware,
} from "./middleware";

// Utility functions (Go slog can't compete!)
export {
  Timer,
  startTimer,
  LogContext,
  AttrBuilder,
  attrs,
  setCorrelationId,
  getCorrelationId,
  clearCorrelationId,
  CorrelationId,
  generateRequestId,
  generateTraceId,
  safeStringify,
  lazy,
  redact,
  maskEmail,
  maskCreditCard,
  maskPhone,
  EnvInfo,
  MemoryUsage,
  HttpReq,
  HttpRes,
  SqlQuery,
  StackTrace,
  Caller,
  type HttpRequest,
  type HttpResponse,
} from "./utils";

// Attribute helpers
export {
  attr,
  String,
  Int,
  Int64,
  Uint64,
  Float64,
  Bool,
  Time,
  Duration,
  Any,
  Group,
  Err,
} from "./logger";

import { Logger, Level, Attr, Handler } from "./logger";
import { TextHandler } from "./handlers";

/**
 * Default logger instance (similar to Go's slog.Default())
 * @internal
 */
let defaultLogger: Logger | null = null;

/**
 * Get or create the default logger.
 *
 * Returns the default logger instance. If no default logger has been set,
 * creates one with a TextHandler at INFO level.
 *
 * @returns The default Logger instance
 *
 * @example
 * ```typescript
 * import { Default, String } from '@omdxp/jslog';
 *
 * const logger = Default();
 * logger.info('Using default logger', String('mode', 'default'));
 * ```
 */
export function Default(): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger(new TextHandler({ level: Level.INFO }));
  }
  return defaultLogger;
}

/**
 * Set the default logger.
 *
 * Replaces the default logger instance with a custom logger.
 * All subsequent calls to Default() and convenience functions will use this logger.
 *
 * @param logger - The Logger instance to set as default
 *
 * @example
 * ```typescript
 * import { SetDefault, New, JSONHandler } from '@omdxp/jslog';
 *
 * const customLogger = New(new JSONHandler());
 * SetDefault(customLogger);
 *
 * // Now all default logging uses JSON format
 * info('This will be JSON');
 * ```
 */
export function SetDefault(logger: Logger): void {
  defaultLogger = logger;
}

/**
 * Create a new logger with the given handler.
 *
 * @param handler - The Handler to use for this logger
 * @returns A new Logger instance
 *
 * @example
 * ```typescript
 * import { New, ColorHandler, Level } from '@omdxp/jslog';
 *
 * const logger = New(new ColorHandler({ level: Level.DEBUG }));
 * logger.debug('Colorful debug message');
 * ```
 *
 * @example With multiple handlers
 * ```typescript
 * import { New, MultiHandler, TextHandler, FileHandler } from '@omdxp/jslog';
 *
 * const logger = New(new MultiHandler([
 *   new TextHandler(),
 *   new FileHandler({ filepath: './app.log' })
 * ]));
 * ```
 */
export function New(handler: Handler): Logger {
  return new Logger(handler);
}

// ============================================================================
// Convenience Functions
// ============================================================================
// These functions use the default logger instance for quick logging without
// creating a logger explicitly. Similar to Go's slog package functions.

/**
 * Log a message at DEBUG level using the default logger.
 *
 * Supports both explicit Attr objects and Go slog-style key-value pairs.
 *
 * @param msg - The log message
 * @param attrs - Attr objects or alternating key-value pairs
 *
 * @example Using Attr helpers
 * ```typescript
 * import { debug, String, Int } from '@omdxp/jslog';
 *
 * debug('Processing request', String('path', '/api/users'), Int('count', 42));
 * ```
 *
 * @example Using key-value pairs (Go slog style)
 * ```typescript
 * debug('Processing request', 'path', '/api/users', 'count', 42);
 * ```
 */
export function debug(msg: string, ...attrs: any[]): void {
  Default().debug(msg, ...attrs);
}

/**
 * Log a message at DEBUG level with context using the default logger.
 *
 * @param msg - The log message
 * @param ctx - The log context (for correlation IDs, trace IDs, etc.)
 * @param attrs - Attr objects or alternating key-value pairs
 *
 * @example
 * ```typescript
 * import { debugContext, String } from '@omdxp/jslog';
 *
 * const ctx = { requestId: 'req-123', traceId: 'trace-456' };
 * debugContext('Debug with context', ctx, String('step', 'validation'));
 * ```
 */
export function debugContext(
  msg: string,
  ctx: LogContext,
  ...attrs: any[]
): void {
  Default().debugContext(msg, ctx, ...attrs);
}

/**
 * Log a message at INFO level using the default logger.
 *
 * Supports both explicit Attr objects and Go slog-style key-value pairs.
 *
 * @param msg - The log message
 * @param attrs - Attr objects or alternating key-value pairs
 *
 * @example Using Attr helpers
 * ```typescript
 * import { info, String, Int } from '@omdxp/jslog';
 *
 * info('Server started', String('env', 'production'), Int('port', 3000));
 * ```
 *
 * @example Using key-value pairs (Go slog style)
 * ```typescript
 * info('Server started', 'env', 'production', 'port', 3000);
 * ```
 */
export function info(msg: string, ...attrs: any[]): void {
  Default().info(msg, ...attrs);
}

/**
 * Log a message at INFO level with context using the default logger.
 *
 * @param msg - The log message
 * @param ctx - The log context (for correlation IDs, trace IDs, etc.)
 * @param attrs - Attr objects or alternating key-value pairs
 *
 * @example
 * ```typescript
 * import { infoContext, String } from '@omdxp/jslog';
 *
 * const ctx = { requestId: 'req-123' };
 * infoContext('Request processed', ctx, String('status', 'success'));
 * ```
 */
export function infoContext(
  msg: string,
  ctx: LogContext,
  ...attrs: any[]
): void {
  Default().infoContext(msg, ctx, ...attrs);
}

/**
 * Log a message at WARN level using the default logger.
 *
 * Supports both explicit Attr objects and Go slog-style key-value pairs.
 *
 * @param msg - The log message
 * @param attrs - Attr objects or alternating key-value pairs
 *
 * @example Using Attr helpers
 * ```typescript
 * import { warn, Int, String } from '@omdxp/jslog';
 *
 * warn('High memory usage', Int('percentage', 85), String('action', 'monitor'));
 * ```
 *
 * @example Using key-value pairs (Go slog style)
 * ```typescript
 * warn('High memory usage', 'percentage', 85, 'action', 'monitor');
 * ```
 */
export function warn(msg: string, ...attrs: any[]): void {
  Default().warn(msg, ...attrs);
}

/**
 * Log a message at WARN level with context using the default logger.
 *
 * @param msg - The log message
 * @param ctx - The log context (for correlation IDs, trace IDs, etc.)
 * @param attrs - Attr objects or alternating key-value pairs
 *
 * @example
 * ```typescript
 * import { warnContext, Int } from '@omdxp/jslog';
 *
 * const ctx = { requestId: 'req-123' };
 * warnContext('Slow query detected', ctx, Int('duration', 5000));
 * ```
 */
export function warnContext(
  msg: string,
  ctx: LogContext,
  ...attrs: any[]
): void {
  Default().warnContext(msg, ctx, ...attrs);
}

/**
 * Log a message at ERROR level using the default logger.
 *
 * Supports both explicit Attr objects and Go slog-style key-value pairs.
 *
 * @param msg - The log message
 * @param attrs - Attr objects or alternating key-value pairs
 *
 * @example Using Attr helpers
 * ```typescript
 * import { error, String, Err } from '@omdxp/jslog';
 *
 * try {
 *   // some operation
 * } catch (err) {
 *   error('Operation failed', String('operation', 'db-query'), Err(err as Error));
 * }
 * ```
 *
 * @example Using key-value pairs (Go slog style)
 * ```typescript
 * error('Operation failed', 'operation', 'db-query', 'attempts', 3);
 * ```
 */
export function error(msg: string, ...attrs: any[]): void {
  Default().error(msg, ...attrs);
}

/**
 * Log a message at ERROR level with context using the default logger.
 *
 * @param msg - The log message
 * @param ctx - The log context (for correlation IDs, trace IDs, etc.)
 * @param attrs - Attr objects or alternating key-value pairs
 *
 * @example
 * ```typescript
 * import { errorContext, Err } from '@omdxp/jslog';
 *
 * const ctx = { requestId: 'req-123', userId: 'user-456' };
 * errorContext('Authentication failed', ctx, Err(new Error('Invalid token')));
 * ```
 */
export function errorContext(
  msg: string,
  ctx: LogContext,
  ...attrs: any[]
): void {
  Default().errorContext(msg, ctx, ...attrs);
}

/**
 * Log a message at the specified level using the default logger.
 *
 * Supports both explicit Attr objects and Go slog-style key-value pairs.
 *
 * @param level - The log level (DEBUG, INFO, WARN, or ERROR)
 * @param msg - The log message
 * @param attrs - Attr objects or alternating key-value pairs
 *
 * @example Using Attr helpers
 * ```typescript
 * import { log, Level, String } from '@omdxp/jslog';
 *
 * const severity = Level.WARN;
 * log(severity, 'Dynamic level logging', String('source', 'api'));
 * ```
 *
 * @example Using key-value pairs (Go slog style)
 * ```typescript
 * log(Level.INFO, 'Dynamic level logging', 'source', 'api', 'version', '1.0');
 * ```
 */
export function log(level: Level, msg: string, ...attrs: any[]): void {
  Default().log(level, msg, ...attrs);
}

/**
 * Log a message at the specified level with pre-allocated attributes.
 *
 * More efficient than log() when you have attributes already in array form.
 * Note: This function expects actual Attr objects, not key-value pairs.
 *
 * @param level - The log level (DEBUG, INFO, WARN, or ERROR)
 * @param msg - The log message
 * @param attrs - Pre-constructed Attr objects
 *
 * @example
 * ```typescript
 * import { logAttrs, Level, String, Int } from '@omdxp/jslog';
 *
 * const attrs = [String('user', 'alice'), Int('age', 30)];
 * logAttrs(Level.INFO, 'User data', ...attrs);
 * ```
 */
export function logAttrs(level: Level, msg: string, ...attrs: Attr[]): void {
  Default().logAttrs(level, msg, ...attrs);
}

/**
 * Create a child logger from the default logger with persistent attributes.
 *
 * Returns a new Logger that includes the given attributes in all log entries.
 * The original default logger is not modified.
 *
 * @param attrs - Attributes to include in all logs from the returned logger
 * @returns A new Logger instance with the attributes attached
 *
 * @example
 * ```typescript
 * import { with_, String, Int } from '@omdxp/jslog';
 *
 * const requestLogger = with_(String('requestId', 'req-123'), String('userId', 'user-456'));
 * requestLogger.info('Processing request');
 * requestLogger.info('Request completed');
 * // Both logs include requestId and userId
 * ```
 *
 * @example With groups
 * ```typescript
 * import { with_, Group, String } from '@omdxp/jslog';
 *
 * const logger = with_(
 *   Group('server', String('host', 'localhost'), Int('port', 3000))
 * );
 * logger.info('Server started');
 * // Output includes: server.host="localhost" server.port=3000
 * ```
 */
export function with_(...attrs: Attr[]): Logger {
  return Default().with(...attrs);
}

/**
 * Create a child logger from the default logger with a group prefix.
 *
 * Returns a new Logger where all attributes are prefixed with the group name.
 * Groups can be nested by calling withGroup multiple times.
 *
 * @param name - The group name to prefix all attributes with
 * @returns A new Logger instance with the group applied
 *
 * @example
 * ```typescript
 * import { withGroup, String, Int } from '@omdxp/jslog';
 *
 * const dbLogger = withGroup('database');
 * dbLogger.info('Connected', String('host', 'localhost'), Int('port', 5432));
 * // Output: database.host="localhost" database.port=5432
 * ```
 *
 * @example Nested groups
 * ```typescript
 * import { withGroup, String } from '@omdxp/jslog';
 *
 * const appLogger = withGroup('app');
 * const dbLogger = appLogger.withGroup('database');
 * dbLogger.info('Query executed', String('sql', 'SELECT * FROM users'));
 * // Output: app.database.sql="SELECT * FROM users"
 * ```
 */
export function withGroup(name: string): Logger {
  return Default().withGroup(name);
}
