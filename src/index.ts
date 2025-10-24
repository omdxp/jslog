/**
 * @omdxp/jslog
 *
 * Structured logging for Node.js inspired by Go's log/slog.
 * Now with features that make Go slog look basic!
 */

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
  type FileHandlerOptions,
  type BufferedHandlerOptions,
  type SamplingHandlerOptions,
  type FilterHandlerOptions,
  type ColorHandlerOptions,
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
  Error,
  attr,
} from "./logger";

import { Logger, Level, Attr, Handler } from "./logger";
import { TextHandler } from "./handlers";

// Default logger instance (similar to Go's slog.Default())
let defaultLogger: Logger | null = null;

/**
 * Get or create the default logger
 */
export function Default(): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger(new TextHandler({ level: Level.INFO }));
  }
  return defaultLogger;
}

/**
 * Set the default logger
 */
export function SetDefault(logger: Logger): void {
  defaultLogger = logger;
}

/**
 * Create a new logger with the given handler
 */
export function New(handler: Handler): Logger {
  return new Logger(handler);
}

// Convenience functions using the default logger

export function debug(msg: string, ...attrs: Attr[]): void {
  Default().debug(msg, ...attrs);
}

export function debugContext(msg: string, ...attrs: Attr[]): void {
  Default().debugContext(msg, ...attrs);
}

export function info(msg: string, ...attrs: Attr[]): void {
  Default().info(msg, ...attrs);
}

export function infoContext(msg: string, ...attrs: Attr[]): void {
  Default().infoContext(msg, ...attrs);
}

export function warn(msg: string, ...attrs: Attr[]): void {
  Default().warn(msg, ...attrs);
}

export function warnContext(msg: string, ...attrs: Attr[]): void {
  Default().warnContext(msg, ...attrs);
}

export function error(msg: string, ...attrs: Attr[]): void {
  Default().error(msg, ...attrs);
}

export function errorContext(msg: string, ...attrs: Attr[]): void {
  Default().errorContext(msg, ...attrs);
}

export function log(level: Level, msg: string, ...attrs: Attr[]): void {
  Default().log(level, msg, ...attrs);
}

export function logAttrs(level: Level, msg: string, ...attrs: Attr[]): void {
  Default().logAttrs(level, msg, ...attrs);
}

/**
 * With returns a logger that includes the given attributes
 */
export function with_(...attrs: Attr[]): Logger {
  return Default().with(...attrs);
}

/**
 * WithGroup returns a logger that starts a group
 */
export function withGroup(name: string): Logger {
  return Default().withGroup(name);
}
