import {
  Handler,
  Record,
  Level,
  Attr,
  Value,
  LevelVar,
  getLevelString,
} from "./logger";
import { Writable } from "stream";

/**
 * Configuration options for handler construction.
 *
 * These options control handler behavior including minimum log level,
 * source tracking, attribute transformation, and output destination.
 */
export interface HandlerOptions {
  /** Minimum level to log. Can be static Level or dynamic LevelVar (default: INFO) */
  level?: Level | LevelVar;
  /** Whether to capture and include source location (file, line, function) (default: false) */
  addSource?: boolean;
  /** Optional function to transform or filter attributes before output */
  replaceAttr?: (groups: string[], attr: Attr) => Attr;
  /** Stream to write output to (default: process.stdout) */
  writer?: Writable;
}

/**
 * Base handler providing common functionality for all handlers.
 *
 * Implements level filtering, source tracking configuration, attribute transformation,
 * and output stream management. Concrete handlers extend this class and implement
 * the abstract methods for specific output formats.
 *
 * @internal
 */
abstract class BaseHandler implements Handler {
  protected level: Level | LevelVar;
  protected attrs: Attr[];
  protected groups: string[];
  protected addSource: boolean;
  protected replaceAttr?: (groups: string[], attr: Attr) => Attr;
  protected writer: Writable;

  constructor(options: HandlerOptions = {}) {
    this.level = options.level ?? Level.INFO;
    this.attrs = [];
    this.groups = [];
    this.addSource = options.addSource ?? false;
    this.replaceAttr = options.replaceAttr;
    this.writer = options.writer ?? process.stdout;
  }

  enabled(level: Level): boolean {
    const minLevel =
      this.level instanceof LevelVar ? this.level.level() : this.level;
    return level >= minLevel;
  }

  needsSource(): boolean {
    return this.addSource;
  }

  abstract handle(record: Record): void;
  abstract withAttrs(attrs: Attr[]): Handler;
  abstract withGroup(name: string): Handler;

  /**
   * Applies attribute transformation if configured.
   *
   * @param attr - The attribute to process
   * @returns The transformed attribute or the original if no transformation is configured
   */
  protected processAttr(attr: Attr): Attr {
    if (this.replaceAttr) {
      return this.replaceAttr(this.groups, attr);
    }
    return attr;
  }
}

// Ultra-fast ISO string cache - only convert timestamps once per millisecond
let lastTimeMs = 0;
let cachedTimeStr = "";

function getISOString(date: Date): string {
  const timeMs = date.getTime();
  if (timeMs !== lastTimeMs) {
    lastTimeMs = timeMs;
    cachedTimeStr = date.toISOString();
  }
  return cachedTimeStr;
}

// Pre-computed level strings for instant lookup (avoid function calls)
const LEVEL_STRINGS: { [key: number]: string } = {
  [-4]: "DEBUG",
  [0]: "INFO",
  [4]: "WARN",
  [8]: "ERROR",
};

const JSON_LEVEL_STRINGS: { [key: number]: string } = {
  [-4]: '"DEBUG"',
  [0]: '"INFO"',
  [4]: '"WARN"',
  [8]: '"ERROR"',
};

/**
 * TextHandler outputs logs in a key=value text format.
 *
 * Similar to Go's slog.TextHandler, this handler produces human-readable
 * structured logs suitable for development and traditional log aggregation systems.
 *
 * @example
 * ```typescript
 * const handler = new TextHandler({ level: Level.INFO, addSource: true });
 * const logger = new Logger(handler);
 * logger.info("Server started", Int("port", 3000));
 * // Output: time=2024-01-15T10:30:00.000Z level=INFO msg="Server started" port=3000
 * ```
 */
export class TextHandler extends BaseHandler {
  private hasGroups: boolean = false;
  private hasReplaceAttr: boolean = false;
  private hasHandlerAttrs: boolean = false;
  // Pre-serialized handler attributes for instant concatenation
  private prebuiltAttrs: string = "";

  constructor(options: HandlerOptions = {}) {
    super(options);
    this.hasGroups = this.groups.length > 0;
    this.hasReplaceAttr = !!this.replaceAttr;
    this.hasHandlerAttrs = this.attrs.length > 0;
    // Pre-serialize handler attributes once at construction
    this.prebuiltAttrs = this.buildPrebuiltAttrs(this.attrs);
  }

  // Pre-serialize handler attributes for zero-cost concatenation
  private buildPrebuiltAttrs(attrs: Attr[]): string {
    let result = "";
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      result += " " + attr.key + "=" + this.formatValueFast(attr.value);
    }
    return result;
  }

  handle(record: Record): void {
    // Fast path - pre-serialized attributes enable ultra-fast child loggers
    if (!this.hasGroups && !this.hasReplaceAttr && !this.addSource) {
      this.handleFast(record);
      return;
    }

    // Slow path with all features
    this.handleSlow(record);
  }

  private handleFast(record: Record): void {
    // Ultra-fast path with intelligent caching
    const time = getISOString(record.time);
    const msg = record.message;
    const level = record.level;

    // Inline escaping for maximum speed - avoid function call overhead
    const msgLen = msg.length;
    let escapedMsg: string;

    if (msgLen > 100) {
      const jsonStr = JSON.stringify(msg);
      escapedMsg = jsonStr.slice(1, -1);
    } else if (msgLen === 0) {
      escapedMsg = "";
    } else {
      // Fast path for short strings
      let needsEscape = false;
      for (let i = 0; i < msgLen; i++) {
        const code = msg.charCodeAt(i);
        if (code === 34 || code === 92 || code < 32) {
          needsEscape = true;
          break;
        }
      }
      if (needsEscape) {
        const jsonStr = JSON.stringify(msg);
        escapedMsg = jsonStr.slice(1, -1);
      } else {
        escapedMsg = msg;
      }
    }

    // Use pre-computed level string (avoid function call)
    const levelStr = LEVEL_STRINGS[level] || getLevelString(level);

    // Build output using string concatenation + pre-serialized attrs
    let output =
      "time=" +
      time +
      " level=" +
      levelStr +
      ' msg="' +
      escapedMsg +
      '"' +
      this.prebuiltAttrs;

    // Record attributes - ultra-fast inline path (assume clean strings)
    const attrs = record.attrs;
    const len = attrs.length;

    for (let i = 0; i < len; i++) {
      const attr = attrs[i];
      const val = attr.value;

      // Ultra-fast type switching (inline everything)
      if (typeof val === "string") {
        output += " " + attr.key + '="' + val + '"';
      } else if (typeof val === "number" || typeof val === "boolean") {
        output += " " + attr.key + "=" + val;
      } else if (val === null || val === undefined) {
        output += " " + attr.key + "=" + val;
      } else {
        // Objects/arrays - inline JSON.stringify
        output += " " + attr.key + "=" + JSON.stringify(val);
      }
    }
    output += "\n";

    // Direct write for maximum throughput
    this.writer.write(output);
  }

  private escapeText(str: string): string {
    const len = str.length;

    // Smart optimization: for long strings (> 100 chars), use native JSON.stringify
    // It's implemented in C++ and faster than any JS implementation for large inputs
    if (len > 100) {
      // JSON.stringify handles ALL escaping (quotes, backslash, control chars)
      // Just strip the outer quotes that JSON.stringify adds
      const jsonStr = JSON.stringify(str);
      return jsonStr.slice(1, -1);
    }

    // Fast path for short strings with manual string slicing
    let result = "";
    let last = 0;
    let found = false;
    let point = 255;

    for (let i = 0; i < len && point >= 32; i++) {
      point = str.charCodeAt(i);
      if (point === 34 || point === 92) {
        // " or \
        result += str.slice(last, i) + "\\";
        last = i;
        found = true;
      }
    }

    if (!found) {
      result = str;
    } else {
      result += str.slice(last);
    }

    // If we hit a control char (< 32), use JSON.stringify for safety
    if (point < 32) {
      const jsonStr = JSON.stringify(str);
      return jsonStr.slice(1, -1);
    }

    return result;
  }

  private formatValueFast(value: Value): string {
    // Fast path for common primitives
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    const type = typeof value;
    if (type === "number" || type === "boolean") return String(value);
    if (type === "string") return '"' + this.escapeText(value as string) + '"';

    // Check for Date/Error without instanceof
    if (type === "object" && value) {
      if (typeof (value as any).toISOString === "function") {
        return (value as Date).toISOString();
      }
      if (
        typeof (value as any).message === "string" &&
        typeof (value as any).stack === "string"
      ) {
        return '"' + this.escapeText((value as Error).message) + '"';
      }
    }

    // Fallback to JSON
    return JSON.stringify(value);
  }

  private handleSlow(record: Record): void {
    const parts: string[] = [];

    // Time
    const timeAttr = this.processAttr({ key: "time", value: record.time });
    parts.push(
      `${timeAttr.key}=${
        timeAttr.value instanceof Date
          ? (timeAttr.value as Date).toISOString()
          : timeAttr.value
      }`
    );

    // Level
    const levelAttr = this.processAttr({
      key: "level",
      value: getLevelString(record.level),
    });
    parts.push(`${levelAttr.key}=${levelAttr.value}`);

    // Source (if addSource is enabled and source info is available)
    if (this.addSource && record.source) {
      const sourceStr = `${record.source.file || "?"}:${
        record.source.line || 0
      }`;
      const sourceAttr = this.processAttr({
        key: "source",
        value: sourceStr,
      });
      parts.push(`${sourceAttr.key}=${sourceAttr.value}`);
    }

    // Message
    const msgAttr = this.processAttr({ key: "msg", value: record.message });
    parts.push(`${msgAttr.key}="${msgAttr.value}"`);

    // Handler-level attributes
    for (const attr of this.attrs) {
      const processed = this.processAttr(attr);
      parts.push(this.formatAttr(processed));
    }

    // Record attributes
    for (const attr of record.attrs) {
      const processed = this.processAttr(attr);
      parts.push(this.formatAttr(processed));
    }

    this.writer.write(parts.join(" ") + "\n");
  }

  private formatAttr(attr: Attr): string {
    const key =
      this.groups.length > 0
        ? `${this.groups.join(".")}.${attr.key}`
        : attr.key;

    return this.formatValue(key, attr.value);
  }

  private formatValue(key: string, value: Value): string {
    if (value === null) {
      return `${key}=null`;
    }
    if (value === undefined) {
      return `${key}=undefined`;
    }
    if (typeof value === "string") {
      return `${key}="${value}"`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return `${key}=${value}`;
    }
    if (value instanceof Date) {
      return `${key}=${value.toISOString()}`;
    }
    if (value instanceof Error) {
      return `${key}="${value.message}"`;
    }
    if (Array.isArray(value)) {
      return `${key}=${JSON.stringify(value)}`;
    }
    if (typeof value === "object" && "key" in value && "value" in value) {
      // It's an Attr
      const attr = value as Attr;
      return this.formatValue(`${key}.${attr.key}`, attr.value);
    }
    return `${key}=${JSON.stringify(value)}`;
  }

  withAttrs(attrs: Attr[]): Handler {
    const handler = new TextHandler({
      level: this.level,
      addSource: this.addSource,
      replaceAttr: this.replaceAttr,
      writer: this.writer,
    });
    handler.attrs = [...this.attrs, ...attrs];
    handler.groups = [...this.groups];
    handler.hasGroups = this.hasGroups;
    handler.hasReplaceAttr = this.hasReplaceAttr;
    handler.hasHandlerAttrs = handler.attrs.length > 0;
    // Rebuild pre-serialized attributes
    handler.prebuiltAttrs = handler.buildPrebuiltAttrs(handler.attrs);
    return handler;
  }

  withGroup(name: string): Handler {
    const handler = new TextHandler({
      level: this.level,
      addSource: this.addSource,
      replaceAttr: this.replaceAttr,
      writer: this.writer,
    });
    handler.attrs = [...this.attrs];
    handler.groups = [...this.groups, name];
    handler.hasGroups = true; // Update flag since we're adding a group
    handler.hasReplaceAttr = this.hasReplaceAttr;
    handler.hasHandlerAttrs = this.hasHandlerAttrs;
    // Preserve pre-serialized attributes
    handler.prebuiltAttrs = this.prebuiltAttrs;
    return handler;
  }
}

/**
 * JSONHandler outputs logs in JSON format.
 *
 * Similar to Go's slog.JSONHandler, produces machine-readable JSON logs
 * suitable for structured log aggregation and analysis systems.
 *
 * @example
 * ```typescript
 * const handler = new JSONHandler({ level: Level.INFO });
 * const logger = new Logger(handler);
 * logger.info("User login", String("userId", "123"), String("ip", "1.2.3.4"));
 * // Output: {"time":"2024-01-15T10:30:00.000Z","level":"INFO","msg":"User login","userId":"123","ip":"1.2.3.4"}
 * ```
 */
export class JSONHandler extends BaseHandler {
  private hasGroups: boolean = false;
  private hasReplaceAttr: boolean = false;
  private hasHandlerAttrs: boolean = false;
  // Pre-calculated level strings for instant lookup
  private readonly levelStrings = {
    [-4]: '"DEBUG"',
    [0]: '"INFO"',
    [4]: '"WARN"',
    [8]: '"ERROR"',
  } as const;
  // Pre-serialized handler attributes for instant concatenation
  private prebuiltAttrs: string = "";

  constructor(options: HandlerOptions = {}) {
    super(options);
    this.hasGroups = this.groups.length > 0;
    this.hasReplaceAttr = !!this.replaceAttr;
    this.hasHandlerAttrs = this.attrs.length > 0;
    // Pre-serialize handler attributes once at construction
    this.prebuiltAttrs = this.buildPrebuiltAttrs(this.attrs);
  }

  // Pre-serialize handler attributes for zero-cost concatenation
  private buildPrebuiltAttrs(attrs: Attr[]): string {
    let result = "";
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      result += ',"' + attr.key + '":' + this.stringifyValueFast(attr.value);
    }
    return result;
  }

  handle(record: Record): void {
    // Fast path - pre-serialized attributes enable ultra-fast child loggers
    if (!this.hasGroups && !this.hasReplaceAttr && !this.addSource) {
      this.handleFast(record);
      return;
    }

    // Slow path with all features
    this.handleSlow(record);
  }

  private handleFast(record: Record): void {
    // Ultra-optimized JSON building with intelligent caching
    const time = getISOString(record.time);
    const level = record.level;
    const msg = record.message;

    // Inline escaping for maximum speed - avoid function call overhead
    const msgLen = msg.length;
    let escapedMsg: string;

    if (msgLen > 100) {
      const jsonStr = JSON.stringify(msg);
      escapedMsg = jsonStr.slice(1, -1);
    } else if (msgLen === 0) {
      escapedMsg = "";
    } else {
      // Fast path for short strings
      let needsEscape = false;
      for (let i = 0; i < msgLen; i++) {
        const code = msg.charCodeAt(i);
        if (code === 34 || code === 92 || code < 32) {
          needsEscape = true;
          break;
        }
      }
      if (needsEscape) {
        const jsonStr = JSON.stringify(msg);
        escapedMsg = jsonStr.slice(1, -1);
      } else {
        escapedMsg = msg;
      }
    }

    // Use pre-computed level string (avoid function call)
    const levelStr =
      JSON_LEVEL_STRINGS[level] || '"' + getLevelString(level) + '"';

    // Build JSON - string concatenation is fastest
    let json =
      '{"time":"' +
      time +
      '","level":' +
      levelStr +
      ',"msg":"' +
      escapedMsg +
      '"' +
      this.prebuiltAttrs;

    // Record attributes - ultra-fast inline path with minimal type checks
    const attrs = record.attrs;
    const len = attrs.length;

    for (let i = 0; i < len; i++) {
      const attr = attrs[i];
      const val = attr.value;
      const t = typeof val;

      // Fastest possible type switching - check primitives first
      if (t === "string") {
        json += ',"' + attr.key + '":"' + val + '"';
      } else if (t === "number" || t === "boolean") {
        json += ',"' + attr.key + '":' + val;
      } else if (val == null) {
        json += ',"' + attr.key + '":null';
      } else {
        // Objects/arrays - inline JSON.stringify
        json += ',"' + attr.key + '":' + JSON.stringify(val);
      }
    }

    json += "}\n";

    // Direct write for maximum throughput
    this.writer.write(json);
  }

  private escapeJson(str: string): string {
    const len = str.length;

    // Smart optimization: for long strings (> 100 chars), use native JSON.stringify
    // It's implemented in C++ and faster than any JS implementation for large inputs
    if (len > 100) {
      // JSON.stringify handles ALL escaping (quotes, backslash, control chars)
      // Just strip the outer quotes that JSON.stringify adds
      const jsonStr = JSON.stringify(str);
      return jsonStr.slice(1, -1);
    }

    // Fast path for short strings with manual string slicing
    let result = "";
    let last = 0;
    let found = false;
    let point = 255;

    for (let i = 0; i < len && point >= 32; i++) {
      point = str.charCodeAt(i);
      if (point === 34 || point === 92) {
        // " or \
        result += str.slice(last, i) + "\\";
        last = i;
        found = true;
      }
    }

    if (!found) {
      result = str;
    } else {
      result += str.slice(last);
    }

    // If we hit a control char (< 32), use JSON.stringify for safety
    if (point < 32) {
      const jsonStr = JSON.stringify(str);
      return jsonStr.slice(1, -1);
    }

    return result;
  }

  private stringifyValueFast(value: Value): string {
    // Null/undefined
    if (value == null) return "null";

    const type = typeof value;

    // Numbers - fastest path
    if (type === "number") return String(value);
    if (type === "boolean") return value ? "true" : "false";

    // Strings - optimize for common case (short, clean strings)
    if (type === "string") {
      const str = value as string;
      const len = str.length;

      // For short strings (< 50 chars), check if escaping needed
      if (len < 50) {
        let simple = true;
        for (let i = 0; i < len; i++) {
          const c = str.charCodeAt(i);
          if (c < 32 || c === 34 || c === 92) {
            simple = false;
            break;
          }
        }
        return simple ? `"${str}"` : `"${this.escapeJson(str)}"`;
      }

      // For long strings, use indexOf (faster for long strings)
      const needsEscape =
        str.indexOf('"') >= 0 ||
        str.indexOf("\\") >= 0 ||
        str.indexOf("\n") >= 0;
      return needsEscape ? `"${this.escapeJson(str)}"` : `"${str}"`;
    }

    // Objects - check for Date first (common case)
    if (type === "object" && value) {
      // Date check
      if (typeof (value as any).toISOString === "function") {
        return `"${(value as Date).toISOString()}"`;
      }
    }

    // Fallback to JSON.stringify for complex types
    return JSON.stringify(value);
  }

  private handleSlow(record: Record): void {
    const obj: any = {};

    // Time - use toISOString() directly on Date object
    obj.time = record.time.toISOString();

    // Level - use cached string
    obj.level = getLevelString(record.level);

    // Source (if addSource is enabled and source info is available)
    if (this.addSource && record.source) {
      obj.source = {
        function: record.source.function,
        file: record.source.file,
        line: record.source.line,
      };
    }

    // Message
    obj.msg = record.message;

    // Handler-level attributes - fast path for common case
    if (this.attrs.length > 0) {
      if (this.groups.length === 0 && !this.replaceAttr) {
        // Fast path: no groups, no replaceAttr
        for (let i = 0; i < this.attrs.length; i++) {
          const attr = this.attrs[i];
          obj[attr.key] = this.serializeValue(attr.value);
        }
      } else {
        // Slow path: with groups or replaceAttr
        for (const attr of this.attrs) {
          const processed = this.processAttr(attr);
          this.addAttr(obj, processed);
        }
      }
    }

    // Record attributes - fast path for common case
    if (record.attrs.length > 0) {
      if (this.groups.length === 0 && !this.replaceAttr) {
        // Fast path: no groups, no replaceAttr
        for (let i = 0; i < record.attrs.length; i++) {
          const attr = record.attrs[i];
          obj[attr.key] = this.serializeValue(attr.value);
        }
      } else {
        // Slow path: with groups or replaceAttr
        for (const attr of record.attrs) {
          const processed = this.processAttr(attr);
          this.addAttr(obj, processed);
        }
      }
    }

    this.writer.write(JSON.stringify(obj) + "\n");
  }

  private addAttr(obj: any, attr: Attr): void {
    const value = this.serializeValue(attr.value);

    if (this.groups.length > 0) {
      let current = obj;
      for (const group of this.groups) {
        if (!current[group]) {
          current[group] = {};
        }
        current = current[group];
      }
      current[attr.key] = value;
    } else {
      obj[attr.key] = value;
    }
  }

  private serializeValue(value: Value): any {
    // Fast path for primitives
    if (value === null || value === undefined) {
      return value;
    }

    const type = typeof value;
    if (type === "string" || type === "number" || type === "boolean") {
      return value;
    }

    // Fast path for Date
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Fast path for Error
    if (value instanceof Error) {
      return {
        message: value.message,
        name: value.name,
        stack: value.stack,
      };
    }

    // Fast path for arrays
    if (Array.isArray(value)) {
      return value.map((v) => this.serializeValue(v));
    }

    // Check if it's an Attr object
    if (
      type === "object" &&
      value !== null &&
      "key" in (value as object) &&
      "value" in (value as object)
    ) {
      const attr = value as Attr;
      return { [attr.key]: this.serializeValue(attr.value) };
    }

    // Generic object serialization
    if (type === "object" && value !== null) {
      const result: any = {};
      const obj = value as any;
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        result[k] = this.serializeValue(obj[k]);
      }
      return result;
    }

    return value;
  }

  withAttrs(attrs: Attr[]): Handler {
    const handler = new JSONHandler({
      level: this.level,
      addSource: this.addSource,
      replaceAttr: this.replaceAttr,
      writer: this.writer,
    });
    handler.attrs = [...this.attrs, ...attrs];
    handler.groups = [...this.groups];
    handler.hasGroups = this.hasGroups;
    handler.hasReplaceAttr = this.hasReplaceAttr;
    handler.hasHandlerAttrs = handler.attrs.length > 0;
    // Rebuild pre-serialized attributes
    handler.prebuiltAttrs = handler.buildPrebuiltAttrs(handler.attrs);
    return handler;
  }

  withGroup(name: string): Handler {
    const handler = new JSONHandler({
      level: this.level,
      addSource: this.addSource,
      replaceAttr: this.replaceAttr,
      writer: this.writer,
    });
    handler.attrs = [...this.attrs];
    handler.groups = [...this.groups, name];
    handler.hasGroups = true; // Update flag since we're adding a group
    handler.hasReplaceAttr = this.hasReplaceAttr;
    handler.hasHandlerAttrs = this.hasHandlerAttrs;
    // Preserve pre-serialized attributes
    handler.prebuiltAttrs = this.prebuiltAttrs;
    return handler;
  }
}

/**
 * DiscardHandler discards all log records without processing them.
 *
 * Useful for benchmarking logger performance overhead or completely
 * disabling logging in production without changing application code.
 *
 * @example
 * ```typescript
 * // Benchmark logger overhead
 * const handler = new DiscardHandler();
 * const logger = new Logger(handler);
 * logger.info("This is discarded"); // No-op, zero cost
 * ```
 */
export class DiscardHandler implements Handler {
  enabled(_level: Level): boolean {
    return false;
  }

  handle(_record: Record): void {
    // Do nothing - discard all logs
  }

  withAttrs(_attrs: Attr[]): Handler {
    return this;
  }

  withGroup(_name: string): Handler {
    return this;
  }
}

/**
 * MultiHandler sends log records to multiple handlers simultaneously.
 *
 * Allows logging to multiple destinations (e.g., console and file) with a single logger.
 *
 * @example
 * ```typescript
 * const handler = new MultiHandler([
 *   new TextHandler({ writer: process.stdout }),
 *   new JSONHandler({ writer: fileStream }),
 *   new FileHandler({ filepath: './app.log' })
 * ]);
 * const logger = new Logger(handler);
 * logger.info("Event occurred"); // Logged to all three destinations
 * ```
 */
export class MultiHandler implements Handler {
  /**
   * Creates a MultiHandler that distributes logs to multiple handlers.
   *
   * @param handlers - Array of handlers to send logs to
   */
  constructor(private handlers: Handler[]) {}

  enabled(level: Level): boolean {
    return this.handlers.some((h) => h.enabled(level));
  }

  needsSource(): boolean {
    return this.handlers.some((h) => h.needsSource?.());
  }

  handle(record: Record): void {
    for (const handler of this.handlers) {
      if (handler.enabled(record.level)) {
        handler.handle(record);
      }
    }
  }

  withAttrs(attrs: Attr[]): Handler {
    return new MultiHandler(this.handlers.map((h) => h.withAttrs(attrs)));
  }

  withGroup(name: string): Handler {
    return new MultiHandler(this.handlers.map((h) => h.withGroup(name)));
  }

  /**
   * Closes all wrapped handlers that support closing.
   *
   * Cascades the close operation to all child handlers, properly handling both
   * synchronous and asynchronous close methods. Waits for all async operations
   * to complete in parallel before returning.
   *
   * Useful for graceful shutdown when using FileHandler, BufferedHandler, AsyncHandler,
   * or other handlers that manage resources requiring cleanup.
   *
   * @returns A promise that resolves when all handlers have closed
   *
   * @example
   * ```typescript
   * const multiHandler = new MultiHandler([
   *   new FileHandler({ filepath: './app.log' }),
   *   new BufferedHandler({ handler: consoleHandler })
   * ]);
   *
   * // On shutdown
   * await multiHandler.close();
   * ```
   */
  async close(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const handler of this.handlers) {
      if ("close" in handler && typeof handler.close === "function") {
        const result = (handler as any).close();
        // If it returns a Promise, collect it
        if (result && typeof result.then === "function") {
          closePromises.push(result);
        }
      }
    }

    // Wait for all async close operations to complete
    await Promise.all(closePromises);
  }
}
