/**
 * Log levels matching Go's slog levels
 */
export enum Level {
  DEBUG = -4,
  INFO = 0,
  WARN = 4,
  ERROR = 8,
}

/**
 * Value types for attributes
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
 * LogValuer interface allows custom types to define how they should be logged
 */
export interface LogValuer {
  logValue(): Value;
}

/**
 * Represents a key-value attribute in a log record
 */
export interface Attr {
  key: string;
  value: Value;
}

/**
 * Creates an attribute
 */
export function attr(key: string, value: Value): Attr {
  return { key, value };
}

/**
 * Convenience functions for common attribute types
 */
export const String = (key: string, value: string): Attr => attr(key, value);
export const Int = (key: string, value: number): Attr => attr(key, value);
export const Int64 = (key: string, value: number): Attr => attr(key, value);
export const Uint64 = (key: string, value: number): Attr => attr(key, value);
export const Float64 = (key: string, value: number): Attr => attr(key, value);
export const Bool = (key: string, value: boolean): Attr => attr(key, value);
export const Time = (key: string, value: Date): Attr => attr(key, value);
export const Duration = (key: string, ms: number): Attr => attr(key, `${ms}ms`);
export const Any = (key: string, value: any): Attr => attr(key, value);

/**
 * Group creates a named group of attributes
 */
export const Group = (key: string, ...attrs: Attr[]): Attr => {
  const obj: { [key: string]: Value } = {};
  for (const attr of attrs) {
    obj[attr.key] = attr.value;
  }
  return attr(key, obj);
};

/**
 * Error attribute helpers
 */
export const Err = (err: Error | string): Attr => {
  if (typeof err === "string") {
    return attr("error", err);
  }
  return Group(
    "error",
    String("message", err.message),
    String("name", err.name),
    String("stack", err.stack || "")
  );
};

/**
 * Record represents a single log entry
 */
export interface Record {
  time: Date;
  message: string;
  level: Level;
  attrs: Attr[];
  pc?: number; // Program counter (source location) - for compatibility
  source?: Source; // Actual source location info
}

/**
 * Source location information
 */
export interface Source {
  function?: string;
  file?: string;
  line?: number;
}

/**
 * Get source location from stack trace
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
 * Handler interface - processes log records
 * Similar to Go's slog.Handler
 */
export interface Handler {
  enabled(level: Level): boolean;
  handle(record: Record): void;
  withAttrs(attrs: Attr[]): Handler;
  withGroup(name: string): Handler;
}

/**
 * LevelVar is a Level variable that allows dynamic level changes
 */
export class LevelVar {
  private _level: Level;

  constructor(level: Level = Level.INFO) {
    this._level = level;
  }

  level(): Level {
    return this._level;
  }

  set(level: Level): void {
    this._level = level;
  }

  string(): string {
    return Level[this._level];
  }
}

/**
 * Logger - main logging interface
 * Similar to Go's slog.Logger
 */
export class Logger {
  constructor(private handler: Handler) {}

  /**
   * Get the handler
   */
  getHandler(): Handler {
    return this.handler;
  }

  /**
   * Log at a specific level
   */
  log(level: Level, msg: string, ...attrs: Attr[]): void {
    this.logAttrs(level, msg, ...attrs);
  }

  /**
   * LogAttrs is a more efficient variant of log that accepts pre-constructed attributes
   */
  logAttrs(level: Level, msg: string, ...attrs: Attr[]): void {
    if (!this.handler.enabled(level)) {
      return;
    }

    const record: Record = {
      time: new Date(),
      message: msg,
      level,
      attrs,
    };

    // Capture source location if the handler supports it
    // Skip: Error creation, getSource, logAttrs, calling method (info/debug/etc)
    const source = getSource(3);
    if (source) {
      record.source = source;
      record.pc = 1; // Set a non-zero PC to indicate source is available
    }

    this.handler.handle(record);
  }

  /**
   * Log at DEBUG level
   */
  debug(msg: string, ...attrs: Attr[]): void {
    this.log(Level.DEBUG, msg, ...attrs);
  }

  /**
   * DebugContext logs at DEBUG level (for future context support)
   */
  debugContext(msg: string, ...attrs: Attr[]): void {
    this.debug(msg, ...attrs);
  }

  /**
   * Log at INFO level
   */
  info(msg: string, ...attrs: Attr[]): void {
    this.log(Level.INFO, msg, ...attrs);
  }

  /**
   * InfoContext logs at INFO level (for future context support)
   */
  infoContext(msg: string, ...attrs: Attr[]): void {
    this.info(msg, ...attrs);
  }

  /**
   * Log at WARN level
   */
  warn(msg: string, ...attrs: Attr[]): void {
    this.log(Level.WARN, msg, ...attrs);
  }

  /**
   * WarnContext logs at WARN level (for future context support)
   */
  warnContext(msg: string, ...attrs: Attr[]): void {
    this.warn(msg, ...attrs);
  }

  /**
   * Log at ERROR level
   */
  error(msg: string, ...attrs: Attr[]): void {
    this.log(Level.ERROR, msg, ...attrs);
  }

  /**
   * ErrorContext logs at ERROR level (for future context support)
   */
  errorContext(msg: string, ...attrs: Attr[]): void {
    this.error(msg, ...attrs);
  }

  /**
   * With returns a logger with additional attributes
   */
  with(...attrs: Attr[]): Logger {
    if (attrs.length === 0) {
      return this;
    }
    return new Logger(this.handler.withAttrs(attrs));
  }

  /**
   * WithGroup returns a logger that starts a new group
   */
  withGroup(name: string): Logger {
    if (name === "") {
      return this;
    }
    return new Logger(this.handler.withGroup(name));
  }

  /**
   * Enabled reports whether the logger is enabled for the given level
   */
  enabled(level: Level): boolean {
    return this.handler.enabled(level);
  }
}
