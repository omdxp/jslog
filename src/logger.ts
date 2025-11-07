import type { LogContext } from "./utils";

/**
 * Log levels matching Go's slog levels.
 *
 * Levels are ordered by severity, with lower values indicating less severe messages.
 * The integer values allow for fine-grained control and custom levels between the defaults.
 *
 * @example
 * ```typescript
 * const logger = new Logger(handler);
 * logger.log(Level.INFO, "Server started");
 * logger.log(Level.ERROR, "Connection failed");
 * ```
 */
export enum Level {
  /** Debug-level messages for detailed diagnostic information */
  DEBUG = -4,
  /** Info-level messages for general informational messages */
  INFO = 0,
  /** Warn-level messages for warning conditions */
  WARN = 4,
  /** Error-level messages for error conditions */
  ERROR = 8,
}

/**
 * Cached level strings for performance.
 * Pre-computed string representations of log levels to avoid repeated enum-to-string conversions.
 * @internal
 */
const LEVEL_STRINGS = {
  [Level.DEBUG]: "DEBUG",
  [Level.INFO]: "INFO",
  [Level.WARN]: "WARN",
  [Level.ERROR]: "ERROR",
} as const;

/**
 * Converts a log level to its string representation.
 *
 * @param level - The log level to convert
 * @returns The string representation of the level (e.g., "INFO", "ERROR")
 *
 * @example
 * ```typescript
 * getLevelString(Level.INFO); // Returns "INFO"
 * ```
 */
export function getLevelString(level: Level): string {
  return LEVEL_STRINGS[level] || Level[level];
}

/**
 * Value types that can be used in log attributes.
 *
 * Supports primitive types, complex objects, arrays, and custom types implementing LogValuer.
 * This type definition ensures type safety when logging various data structures.
 */
export type Value =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Error
  | Value[]
  | { [key: string]: Value }
  | Attr
  | LogValuer;

/**
 * LogValuer interface allows custom types to define how they should be logged.
 *
 * Implement this interface on custom classes to control their log representation.
 *
 * @example
 * ```typescript
 * class User implements LogValuer {
 *   constructor(private id: string, private email: string) {}
 *
 *   logValue(): Value {
 *     return { id: this.id, email: this.email };
 *   }
 * }
 *
 * logger.info("User logged in", Any("user", new User("123", "user@example.com")));
 * ```
 */
export interface LogValuer {
  logValue(): Value;
}

/**
 * Represents a key-value attribute in a log record.
 *
 * Attributes provide structured context to log messages.
 * Use the helper functions (String, Int, Bool, etc.) for convenient attribute creation.
 */
export interface Attr {
  /** The attribute key/name */
  key: string;
  /** The attribute value */
  value: Value;
}

/**
 * Converts variadic arguments to Attr array.
 * Supports both Attr objects and alternating key-value pairs (like Go slog).
 *
 * @param args - Either Attr objects or alternating string keys and values
 * @returns Array of Attr objects
 *
 * @internal
 */
function argsToAttrs(args: any[]): Attr[] {
  const attrs: Attr[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // If it's already an Attr object (has key and value properties)
    if (arg && typeof arg === "object" && "key" in arg && "value" in arg) {
      attrs.push(arg as Attr);
    }
    // If it's a string key followed by a value (Go slog style)
    else if (typeof arg === "string" && i + 1 < args.length) {
      const key = arg;
      const value = args[++i]; // Consume next arg as value
      attrs.push({ key, value });
    }
    // Skip invalid args
  }

  return attrs;
}

/**
 * Generic attribute constructor.
 * Creates an attribute with the given key and value.
 *
 * @param key - The attribute key
 * @param value - The attribute value (any type)
 * @returns An Attr object
 *
 * @example
 * ```typescript
 * const customAttr = attr('custom_key', 'custom_value');
 * logger.info('Message', customAttr);
 * ```
 */
export const attr = (key: string, value: Value): Attr => ({ key, value });

/**
 * Creates a string attribute.
 *
 * @param key - The attribute key
 * @param value - The string value
 * @returns An Attr object
 *
 * @example
 * ```typescript
 * logger.info("User action", String("username", "john"));
 * ```
 */
export const String = (key: string, value: string): Attr => ({ key, value });

/**
 * Creates an integer attribute.
 *
 * @param key - The attribute key
 * @param value - The integer value
 * @returns An Attr object
 */
export const Int = (key: string, value: number): Attr => ({ key, value });

/**
 * Creates a 64-bit integer attribute.
 *
 * @param key - The attribute key
 * @param value - The 64-bit integer value
 * @returns An Attr object
 */
export const Int64 = (key: string, value: number): Attr => ({ key, value });

/**
 * Creates an unsigned 64-bit integer attribute.
 *
 * @param key - The attribute key
 * @param value - The unsigned 64-bit integer value
 * @returns An Attr object
 */
export const Uint64 = (key: string, value: number): Attr => ({ key, value });

/**
 * Creates a 64-bit floating-point attribute.
 *
 * @param key - The attribute key
 * @param value - The floating-point value
 * @returns An Attr object
 */
export const Float64 = (key: string, value: number): Attr => ({ key, value });

/**
 * Creates a boolean attribute.
 *
 * @param key - The attribute key
 * @param value - The boolean value
 * @returns An Attr object
 *
 * @example
 * ```typescript
 * logger.info("Operation complete", Bool("success", true));
 * ```
 */
export const Bool = (key: string, value: boolean): Attr => ({ key, value });

/**
 * Creates a time/date attribute.
 *
 * @param key - The attribute key
 * @param value - The Date value
 * @returns An Attr object
 *
 * @example
 * ```typescript
 * logger.info("Event occurred", Time("timestamp", new Date()));
 * ```
 */
export const Time = (key: string, value: Date): Attr => ({ key, value });

/**
 * Creates a duration attribute in milliseconds.
 *
 * @param key - The attribute key
 * @param ms - The duration in milliseconds
 * @returns An Attr object with formatted duration string
 *
 * @example
 * ```typescript
 * const start = Date.now();
 * // ... operation ...
 * logger.info("Operation complete", Duration("elapsed", Date.now() - start));
 * ```
 */
export const Duration = (key: string, ms: number): Attr => ({
  key,
  value: `${ms}ms`,
});

/**
 * Creates an attribute with any value type.
 *
 * @param key - The attribute key
 * @param value - The value of any type
 * @returns An Attr object
 *
 * @example
 * ```typescript
 * logger.info("Data received", Any("payload", { id: 1, name: "test" }));
 * ```
 */
export const Any = (key: string, value: any): Attr => ({ key, value });

/**
 * Creates a named group of attributes.
 *
 * Groups allow organizing related attributes under a common namespace.
 *
 * @param key - The group name
 * @param attrs - The attributes to include in the group
 * @returns An Attr object containing the grouped attributes
 *
 * @example
 * ```typescript
 * logger.info("Request completed",
 *   Group("http",
 *     String("method", "GET"),
 *     Int("status", 200),
 *     String("path", "/api/users")
 *   )
 * );
 * // Outputs: http.method=GET http.status=200 http.path=/api/users
 * ```
 */
export const Group = (key: string, ...attrs: Attr[]): Attr => {
  const obj: { [key: string]: Value } = {};
  for (const attr of attrs) {
    obj[attr.key] = attr.value;
  }
  return { key, value: obj };
};

/**
 * Creates an error attribute with structured error information.
 *
 * Automatically extracts message, name, and stack trace from Error objects.
 * Can also accept plain strings for simple error messages.
 *
 * @param err - An Error object or error message string
 * @returns An Attr object containing structured error information
 *
 * @example
 * ```typescript
 * try {
 *   // ... code that might throw ...
 * } catch (error) {
 *   logger.error("Operation failed", Err(error));
 * }
 * ```
 */
export const Err = (err: Error | string): Attr => {
  if (typeof err === "string") {
    return { key: "error", value: err };
  }
  return Group(
    "error",
    String("message", err.message),
    String("name", err.name),
    String("stack", err.stack || "")
  );
};

/**
 * Represents a single log entry with all associated metadata.
 *
 * Records are created internally by the Logger and passed to handlers for processing.
 */
export interface Record {
  /** The timestamp when the log was created */
  time: Date;
  /** The log message */
  message: string;
  /** The severity level of the log */
  level: Level;
  /** Additional structured attributes */
  attrs: Attr[];
  /** Program counter (source location) - for Go slog compatibility */
  pc?: number;
  /** Source location information (file, line, function) */
  source?: Source;
}

/**
 * Source location information captured from the call stack.
 *
 * Provides context about where a log statement originated in the code.
 */
export interface Source {
  /** The function name where the log was called */
  function?: string;
  /** The file path where the log was called */
  file?: string;
  /** The line number where the log was called */
  line?: number;
}

/**
 * Captures source location information from the current call stack.
 *
 * Parses the JavaScript stack trace to extract file, line, and function information.
 * This is an expensive operation and should only be called when needed.
 *
 * @param skipFrames - Number of stack frames to skip (default: 0)
 * @returns Source information or undefined if parsing fails
 *
 * @internal
 */
export function getSource(skipFrames: number = 0): Source | undefined {
  try {
    const err = new globalThis.Error();
    const stack = err.stack?.split("\n") || [];

    // Skip Error line, getSource line, and caller frames
    const frameIndex = 2 + skipFrames;

    if (frameIndex >= stack.length) {
      return undefined;
    }

    const frame = stack[frameIndex];

    // Parse stack frame (format varies by environment)
    // Example: "    at functionName (file.ts:line:col)"
    // or: "    at file.ts:line:col"
    const match = frame.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):\d+\)?/);

    if (match) {
      const functionName = match[1]?.trim();
      const file = match[2]?.trim();
      const line = parseInt(match[3], 10);

      return {
        function: functionName || undefined,
        file: file || undefined,
        line: isNaN(line) ? undefined : line,
      };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Handler interface for processing log records.
 *
 * Handlers determine how log records are formatted and where they are output.
 * This interface mirrors Go's slog.Handler design.
 *
 * @example
 * ```typescript
 * class CustomHandler implements Handler {
 *   enabled(level: Level): boolean {
 *     return level >= Level.INFO;
 *   }
 *
 *   handle(record: Record): void {
 *     console.log(JSON.stringify(record));
 *   }
 *
 *   withAttrs(attrs: Attr[]): Handler {
 *     return this; // Return new handler with attrs
 *   }
 *
 *   withGroup(name: string): Handler {
 *     return this; // Return new handler with group
 *   }
 * }
 * ```
 */
export interface Handler {
  /**
   * Reports whether the handler handles records at the given level.
   *
   * @param level - The log level to check
   * @returns true if the handler will process logs at this level
   */
  enabled(level: Level): boolean;

  /**
   * Processes a log record.
   *
   * @param record - The log record to process
   */
  handle(record: Record): void;

  /**
   * Returns a new handler with additional attributes.
   *
   * @param attrs - Attributes to add to the handler
   * @returns A new handler instance with the added attributes
   */
  withAttrs(attrs: Attr[]): Handler;

  /**
   * Returns a new handler with a named group.
   *
   * @param name - The group name
   * @returns A new handler instance with the group
   */
  withGroup(name: string): Handler;

  /**
   * Reports whether the handler needs source location information.
   *
   * Optional method. Return true if the handler requires source information
   * (file, line, function) to be captured. This is an expensive operation,
   * so handlers should only request it when necessary.
   *
   * @returns true if source information should be captured
   */
  needsSource?(): boolean;
}

/**
 * A variable log level that can be changed at runtime.
 *
 * Allows dynamic adjustment of logging verbosity without restarting the application.
 *
 * @example
 * ```typescript
 * const levelVar = new LevelVar(Level.INFO);
 * const handler = new TextHandler({ level: levelVar });
 *
 * // Later, enable debug logging
 * levelVar.set(Level.DEBUG);
 * ```
 */
export class LevelVar {
  private _level: Level;

  /**
   * Creates a new LevelVar with the specified initial level.
   *
   * @param level - The initial log level (default: INFO)
   */
  constructor(level: Level = Level.INFO) {
    this._level = level;
  }

  /**
   * Returns the current log level.
   *
   * @returns The current level
   */
  level(): Level {
    return this._level;
  }

  /**
   * Sets a new log level.
   *
   * @param level - The new log level to set
   */
  set(level: Level): void {
    this._level = level;
  }

  /**
   * Returns the string representation of the current level.
   *
   * @returns The level name (e.g., "INFO", "DEBUG")
   */
  string(): string {
    return Level[this._level];
  }
}

/**
 * The main logging interface.
 *
 * Logger provides a structured logging API similar to Go's slog.Logger.
 * It delegates actual log processing to a Handler implementation.
 *
 * @example
 * ```typescript
 * const logger = new Logger(new TextHandler({ level: Level.INFO }));
 *
 * logger.info("Server started", Int("port", 3000));
 * logger.error("Failed to connect", String("host", "localhost"), Err(error));
 *
 * // Create logger with persistent attributes
 * const requestLogger = logger.with(String("requestId", "abc-123"));
 * requestLogger.info("Processing request");
 * ```
 */
export class Logger {
  /**
   * Creates a new Logger with the specified handler.
   *
   * @param handler - The handler that will process log records
   */
  constructor(private handler: Handler) {}

  /**
   * Returns the handler used by this logger.
   *
   * @returns The current handler
   */
  getHandler(): Handler {
    return this.handler;
  }

  /**
   * Logs a message at the specified level with attributes.
   *
   * Supports both explicit Attr objects and Go slog-style key-value pairs.
   *
   * @param level - The log level
   * @param msg - The log message
   * @param attrs - Attr objects or alternating key-value pairs
   *
   * @example Using Attr helpers
   * ```typescript
   * logger.log(Level.INFO, "User login", String("user", "alice"), Int("attempts", 3));
   * ```
   *
   * @example Using key-value pairs (Go slog style)
   * ```typescript
   * logger.log(Level.INFO, "User login", "user", "alice", "attempts", 3);
   * ```
   */
  log(level: Level, msg: string, ...attrs: any[]): void {
    this.logAttrs(level, msg, ...argsToAttrs(attrs));
  }

  /**
   * Logs a message with pre-constructed attributes.
   *
   * More efficient variant of log() when attributes are already constructed.
   *
   * @param level - The log level
   * @param msg - The log message
   * @param attrs - Pre-constructed attributes
   *
   * @internal
   */
  logAttrs(level: Level, msg: string, ...attrs: Attr[]): void {
    if (!this.handler.enabled(level)) {
      return;
    }

    // Use single Date object - toISOString() is the expensive part, not Date creation
    const record: Record = {
      time: new Date(),
      message: msg,
      level,
      attrs,
    };

    // Only capture source if handler explicitly needs it (expensive operation)
    // Check if handler implements needsSource() and returns true
    if (this.handler.needsSource?.()) {
      record.source = getSource(3); // Skip getSource + log + info/warn/error = get to actual caller
    }

    this.handler.handle(record);
  }

  /**
   * Logs a message at DEBUG level.
   *
   * Supports both explicit Attr objects and Go slog-style key-value pairs.
   *
   * @param msg - The log message
   * @param attrs - Attr objects or alternating key-value pairs
   *
   * @example Using Attr helpers
   * ```typescript
   * logger.debug("Cache miss", String("key", "user:123"));
   * ```
   *
   * @example Using key-value pairs (Go slog style)
   * ```typescript
   * logger.debug("Cache miss", "key", "user:123", "ttl", 3600);
   * ```
   */
  debug(msg: string, ...attrs: any[]): void {
    this.log(Level.DEBUG, msg, ...attrs);
  }

  /**
   * Logs a message at DEBUG level with context support.
   *
   * @param msg - The log message
   * @param ctx - The log context containing additional attributes
   * @param attrs - Attr objects or alternating key-value pairs
   */
  debugContext(msg: string, ctx: LogContext, ...attrs: any[]): void {
    this.debug(msg, ...ctx.toAttrs(), ...attrs);
  }

  /**
   * Logs a message at INFO level.
   *
   * Supports both explicit Attr objects and Go slog-style key-value pairs.
   *
   * @param msg - The log message
   * @param attrs - Attr objects or alternating key-value pairs
   *
   * @example Using Attr helpers
   * ```typescript
   * logger.info("Server started", Int("port", 3000), String("env", "production"));
   * ```
   *
   * @example Using key-value pairs (Go slog style)
   * ```typescript
   * logger.info("Server started", "port", 3000, "env", "production");
   * ```
   */
  info(msg: string, ...attrs: any[]): void {
    this.log(Level.INFO, msg, ...attrs);
  }

  /**
   * Logs a message at INFO level with context support.
   *
   * @param msg - The log message
   * @param ctx - The log context containing additional attributes
   * @param attrs - Attr objects or alternating key-value pairs
   */
  infoContext(msg: string, ctx: LogContext, ...attrs: any[]): void {
    this.info(msg, ...ctx.toAttrs(), ...attrs);
  }

  /**
   * Logs a message at WARN level.
   *
   * Supports both explicit Attr objects and Go slog-style key-value pairs.
   *
   * @param msg - The log message
   * @param attrs - Attr objects or alternating key-value pairs
   *
   * @example Using Attr helpers
   * ```typescript
   * logger.warn("High memory usage", Float64("usage", 0.85));
   * ```
   *
   * @example Using key-value pairs (Go slog style)
   * ```typescript
   * logger.warn("High memory usage", "usage", 0.85, "threshold", 0.8);
   * ```
   */
  warn(msg: string, ...attrs: any[]): void {
    this.log(Level.WARN, msg, ...attrs);
  }

  /**
   * Logs a message at WARN level with context support.
   *
   * @param msg - The log message
   * @param ctx - The log context containing additional attributes
   * @param attrs - Attr objects or alternating key-value pairs
   */
  warnContext(msg: string, ctx: LogContext, ...attrs: any[]): void {
    this.warn(msg, ...ctx.toAttrs(), ...attrs);
  }

  /**
   * Logs a message at ERROR level.
   *
   * Supports both explicit Attr objects and Go slog-style key-value pairs.
   *
   * @param msg - The log message
   * @param attrs - Attr objects or alternating key-value pairs
   *
   * @example Using Attr helpers
   * ```typescript
   * logger.error("Database connection failed", Err(error), String("host", "db.example.com"));
   * ```
   *
   * @example Using key-value pairs (Go slog style)
   * ```typescript
   * logger.error("Database connection failed", "host", "db.example.com", "port", 5432);
   * ```
   */
  error(msg: string, ...attrs: any[]): void {
    this.log(Level.ERROR, msg, ...attrs);
  }

  /**
   * Logs a message at ERROR level with context support.
   *
   * @param msg - The log message
   * @param ctx - The log context containing additional attributes
   * @param attrs - Attr objects or alternating key-value pairs
   */
  errorContext(msg: string, ctx: LogContext, ...attrs: any[]): void {
    this.error(msg, ...ctx.toAttrs(), ...attrs);
  }

  /**
   * Returns a new logger with additional persistent attributes.
   *
   * The returned logger includes the specified attributes in every log message.
   *
   * @param attrs - Attributes to add to all subsequent logs
   * @returns A new Logger instance with the added attributes
   *
   * @example
   * ```typescript
   * const requestLogger = logger.with(String("requestId", "abc-123"));
   * requestLogger.info("Processing"); // Includes requestId attribute
   * requestLogger.error("Failed");    // Also includes requestId attribute
   * ```
   */
  with(...attrs: Attr[]): Logger {
    if (attrs.length === 0) {
      return this;
    }
    return new Logger(this.handler.withAttrs(attrs));
  }

  /**
   * Returns a new logger that groups subsequent attributes under a name.
   *
   * Groups allow organizing related attributes hierarchically.
   *
   * @param name - The group name
   * @returns A new Logger instance with the group
   *
   * @example
   * ```typescript
   * const dbLogger = logger.withGroup("database");
   * dbLogger.info("Query executed", Int("duration", 150));
   * // Outputs: database.duration=150
   * ```
   */
  withGroup(name: string): Logger {
    if (name === "") {
      return this;
    }
    return new Logger(this.handler.withGroup(name));
  }

  /**
   * Reports whether the logger is enabled for the given level.
   *
   * Can be used to avoid expensive computations when logging is disabled.
   *
   * @param level - The log level to check
   * @returns true if the logger will process logs at this level
   *
   * @example
   * ```typescript
   * if (logger.enabled(Level.DEBUG)) {
   *   const debugData = expensiveDebugDataGeneration();
   *   logger.debug("Debug info", Any("data", debugData));
   * }
   * ```
   */
  enabled(level: Level): boolean {
    return this.handler.enabled(level);
  }
}
