import { Handler, Record, Level, Attr, Value } from "./logger";
import * as fs from "fs";
import * as path from "path";

/**
 * Configuration options for FileHandler.
 */
export interface FileHandlerOptions {
  /** Minimum log level to write (default: INFO) */
  level?: Level;
  /** File path to write logs to */
  filepath: string;
  /** Maximum file size in bytes before rotation (default: 10MB) */
  maxSize?: number;
  /** Maximum number of backup files to keep (default: 5) */
  maxFiles?: number;
  /** Output format: "text" for key=value or "json" for JSON (default: "json") */
  format?: "text" | "json";
  /** Whether to include source location information (default: false) */
  addSource?: boolean;
  /** Optional function to transform attributes before output */
  replaceAttr?: (groups: string[], attr: Attr) => Attr;
}

/**
 * FileHandler writes logs to files with automatic rotation.
 *
 * Provides built-in file rotation based on size limits, similar to logrotate.
 * Automatically creates the target directory if it doesn't exist.
 * Supports both text and JSON output formats.
 *
 * @example
 * ```typescript
 * const handler = new FileHandler({
 *   filepath: './logs/app.log',
 *   maxSize: 10 * 1024 * 1024,  // 10MB
 *   maxFiles: 5,                 // Keep 5 backups
 *   format: 'json'
 * });
 * const logger = new Logger(handler);
 * logger.info("Event logged to file");
 *
 * // Don't forget to close on shutdown
 * await handler.close();
 * ```
 */
export class FileHandler implements Handler {
  private level: Level;
  private filepath: string;
  private maxSize: number;
  private maxFiles: number;
  private format: "text" | "json";
  private currentSize: number = 0;
  private stream: fs.WriteStream;
  private addSource: boolean;
  private replaceAttr?: (groups: string[], attr: Attr) => Attr;
  private groups: string[] = [];

  constructor(options: FileHandlerOptions) {
    this.level = options.level ?? Level.INFO;
    this.filepath = options.filepath;
    this.maxSize = options.maxSize ?? 10 * 1024 * 1024; // 10MB default
    this.maxFiles = options.maxFiles ?? 5;
    this.format = options.format ?? "json";
    this.addSource = options.addSource ?? false;
    this.replaceAttr = options.replaceAttr;

    // Create directory if it doesn't exist
    const dir = path.dirname(this.filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Check current file size
    if (fs.existsSync(this.filepath)) {
      this.currentSize = fs.statSync(this.filepath).size;
    }

    this.stream = fs.createWriteStream(this.filepath, { flags: "a" });
  }

  enabled(level: Level): boolean {
    return level >= this.level;
  }

  needsSource(): boolean {
    return this.addSource;
  }

  private processAttr(attr: Attr): Attr {
    if (this.replaceAttr) {
      return this.replaceAttr(this.groups, attr);
    }
    return attr;
  }

  handle(record: Record): void {
    let line: string;

    if (this.format === "json") {
      const obj: any = {};

      // Time
      const timeAttr = this.processAttr({ key: "time", value: record.time });
      obj[timeAttr.key] = record.time.toISOString();

      // Level
      const levelAttr = this.processAttr({
        key: "level",
        value: Level[record.level],
      });
      obj[levelAttr.key] = levelAttr.value;

      // Source (if addSource is enabled)
      if (this.addSource && record.source) {
        const sourceObj = {
          function: record.source.function,
          file: record.source.file,
          line: record.source.line,
        };
        const sourceAttr = this.processAttr({
          key: "source",
          value: sourceObj,
        });
        obj[sourceAttr.key] = sourceAttr.value;
      }

      // Message
      const msgAttr = this.processAttr({ key: "msg", value: record.message });
      obj[msgAttr.key] = msgAttr.value;

      for (const attr of record.attrs) {
        const processed = this.processAttr(attr);
        obj[processed.key] = this.serializeValue(processed.value);
      }
      line = JSON.stringify(obj) + "\n";
    } else {
      const parts: string[] = [];

      // Time
      const timeAttr = this.processAttr({ key: "time", value: record.time });
      parts.push(`${timeAttr.key}=${record.time.toISOString()}`);

      // Level
      const levelAttr = this.processAttr({
        key: "level",
        value: Level[record.level],
      });
      parts.push(`${levelAttr.key}=${levelAttr.value}`);

      // Source (if addSource is enabled)
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

      for (const attr of record.attrs) {
        const processed = this.processAttr(attr);
        parts.push(`${processed.key}=${JSON.stringify(processed.value)}`);
      }
      line = parts.join(" ") + "\n";
    }

    // Check if we need to rotate
    if (this.currentSize + line.length > this.maxSize) {
      this.rotate();
    }

    this.stream.write(line);
    this.currentSize += line.length;
  }

  private serializeValue(value: Value): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof Error) {
      return {
        message: value.message,
        name: value.name,
        stack: value.stack,
      };
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.serializeValue(v));
    }
    if (typeof value === "object" && "key" in value && "value" in value) {
      const attr = value as Attr;
      return { [attr.key]: this.serializeValue(attr.value) };
    }
    if (typeof value === "object") {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.serializeValue(v);
      }
      return result;
    }
    return value;
  }

  private rotate(): void {
    this.stream.end();

    // Rotate files
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldFile = `${this.filepath}.${i}`;
      const newFile = `${this.filepath}.${i + 1}`;
      if (fs.existsSync(oldFile)) {
        if (i === this.maxFiles - 1) {
          fs.unlinkSync(oldFile); // Delete oldest
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }

    // Move current file to .1
    if (fs.existsSync(this.filepath)) {
      fs.renameSync(this.filepath, `${this.filepath}.1`);
    }

    // Create new file
    this.stream = fs.createWriteStream(this.filepath, { flags: "a" });
    this.currentSize = 0;
  }

  withAttrs(_attrs: Attr[]): Handler {
    // File handler doesn't support persistent attributes for simplicity
    // to avoid complexity in file format handling
    return this;
  }

  withGroup(_name: string): Handler {
    // File handler doesn't support groups for simplicity
    // to avoid complexity in file format handling
    return this;
  }

  /**
   * Closes the file stream.
   *
   * Call this method during graceful shutdown to ensure all buffered data is written
   * and the file handle is properly closed.
   *
   * @example
   * ```typescript
   * process.on('SIGTERM', () => {
   *   fileHandler.close();
   *   process.exit(0);
   * });
   * ```
   */
  close(): void {
    this.stream.end();
  }
}

/**
 * Configuration options for BufferedHandler.
 */
export interface BufferedHandlerOptions {
  /** The underlying handler to buffer logs for */
  handler: Handler;
  /** Number of records to buffer before flushing (default: 100) */
  bufferSize?: number;
  /** Milliseconds between automatic flushes (default: 1000) */
  flushInterval?: number;
}

/**
 * BufferedHandler buffers log records and flushes them in batches.
 *
 * Improves performance by reducing the number of I/O operations, especially useful
 * when writing to files or external services. Automatically flushes based on buffer
 * size or time interval.
 *
 * @example
 * ```typescript
 * const handler = new BufferedHandler({
 *   handler: new FileHandler({ filepath: './app.log' }),
 *   bufferSize: 100,      // Flush after 100 logs
 *   flushInterval: 1000   // Or every 1 second
 * });
 * const logger = new Logger(handler);
 *
 * logger.info("Buffered log"); // Held in memory
 * // ... 99 more logs ...
 * logger.info("This triggers flush"); // All 100 written at once
 *
 * // On shutdown, ensure all logs are written
 * await handler.close();
 * ```
 */
export class BufferedHandler implements Handler {
  private handler: Handler;
  private buffer: Record[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private timer?: NodeJS.Timeout;

  constructor(options: BufferedHandlerOptions) {
    this.handler = options.handler;
    this.bufferSize = options.bufferSize ?? 100;
    this.flushInterval = options.flushInterval ?? 1000;

    // Start periodic flush
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  enabled(level: Level): boolean {
    return this.handler.enabled(level);
  }

  needsSource(): boolean {
    return this.handler.needsSource?.() ?? false;
  }

  handle(record: Record): void {
    this.buffer.push(record);
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  /**
   * Manually flushes all buffered records to the underlying handler.
   *
   * Useful for ensuring logs are written before a checkpoint or manual sync.
   * This is automatically called when the buffer is full or on the flush interval.
   *
   * @example
   * ```typescript
   * bufferedHandler.flush(); // Force immediate write
   * ```
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    const toFlush = [...this.buffer];
    this.buffer = [];

    for (const record of toFlush) {
      this.handler.handle(record);
    }
  }

  withAttrs(attrs: Attr[]): Handler {
    return new BufferedHandler({
      handler: this.handler.withAttrs(attrs),
      bufferSize: this.bufferSize,
      flushInterval: this.flushInterval,
    });
  }

  withGroup(name: string): Handler {
    return new BufferedHandler({
      handler: this.handler.withGroup(name),
      bufferSize: this.bufferSize,
      flushInterval: this.flushInterval,
    });
  }

  /**
   * Stops the flush timer, flushes remaining logs, and closes the wrapped handler.
   *
   * This method should be called during graceful shutdown to ensure all buffered
   * logs are written and any resources held by the wrapped handler are released.
   * Properly handles both synchronous and asynchronous close methods on the wrapped handler.
   *
   * @returns A promise that resolves when the handler is fully closed
   *
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   await bufferedHandler.close();
   *   process.exit(0);
   * });
   * ```
   */
  async close(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();

    // Close wrapped handler if it supports closing
    if ("close" in this.handler && typeof this.handler.close === "function") {
      const result = (this.handler as any).close();
      // If it returns a Promise, await it
      if (result && typeof result.then === "function") {
        await result;
      }
    }
  }
}

/**
 * Configuration options for SamplingHandler.
 */
export interface SamplingHandlerOptions {
  /** The underlying handler to send sampled logs to */
  handler: Handler;
  /** Sampling rate from 0.0 to 1.0 (e.g., 0.1 = 10% of logs) */
  rate?: number;
  /** Always log the first N messages (default: 0) */
  initialCount?: number;
  /** After initial count, log 1 in N messages (default: 1) */
  thereafter?: number;
}

/**
 * SamplingHandler samples log records based on configurable criteria.
 *
 * Reduces log volume during high-throughput scenarios by only processing a percentage
 * of log messages. Useful for production environments with high log verbosity.
 *
 * @example
 * ```typescript
 * // Log 10% of messages
 * const handler = new SamplingHandler({
 *   handler: new TextHandler(),
 *   rate: 0.1  // 10%
 * });
 *
 * // Always log first 100, then 1 in 10
 * const handler = new SamplingHandler({
 *   handler: new TextHandler(),
 *   initialCount: 100,
 *   thereafter: 10
 * });
 * ```
 */
export class SamplingHandler implements Handler {
  private handler: Handler;
  private rate: number;
  private counter: number = 0;
  private initialCount: number;
  private thereafter: number;

  constructor(options: SamplingHandlerOptions) {
    this.handler = options.handler;
    this.rate = options.rate ?? 1.0;
    this.initialCount = options.initialCount ?? 0;
    this.thereafter = options.thereafter ?? 1;
  }

  enabled(level: Level): boolean {
    return this.handler.enabled(level);
  }

  needsSource(): boolean {
    return this.handler.needsSource?.() ?? false;
  }

  handle(record: Record): void {
    this.counter++;

    // Always log initial messages
    if (this.counter <= this.initialCount) {
      this.handler.handle(record);
      return;
    }

    // Sample based on rate
    if (this.rate < 1.0) {
      if (Math.random() < this.rate) {
        this.handler.handle(record);
      }
    }
    // Sample based on thereafter
    else if (this.thereafter > 1) {
      if ((this.counter - this.initialCount) % this.thereafter === 1) {
        this.handler.handle(record);
      }
    } else {
      this.handler.handle(record);
    }
  }

  withAttrs(attrs: Attr[]): Handler {
    return new SamplingHandler({
      handler: this.handler.withAttrs(attrs),
      rate: this.rate,
      initialCount: this.initialCount,
      thereafter: this.thereafter,
    });
  }

  withGroup(name: string): Handler {
    return new SamplingHandler({
      handler: this.handler.withGroup(name),
      rate: this.rate,
      initialCount: this.initialCount,
      thereafter: this.thereafter,
    });
  }
}

/**
 * Configuration options for FilterHandler.
 */
export interface FilterHandlerOptions {
  /** The underlying handler to send filtered logs to */
  handler: Handler;
  /** Filter function that returns true to allow the log, false to discard it */
  filter: (record: Record) => boolean;
}

/**
 * FilterHandler filters log records based on custom criteria.
 *
 * Allows fine-grained control over which logs are processed based on any
 * property of the log record (message, level, attributes, etc.).
 *
 * @example
 * ```typescript
 * // Only log messages containing "error"
 * const handler = new FilterHandler({
 *   handler: new TextHandler(),
 *   filter: (record) => record.message.toLowerCase().includes('error')
 * });
 *
 * // Only log specific user IDs
 * const handler = new FilterHandler({
 *   handler: new TextHandler(),
 *   filter: (record) => {
 *     const userId = record.attrs.find(a => a.key === 'userId')?.value;
 *     return userId === '123' || userId === '456';
 *   }
 * });
 * ```
 */
export class FilterHandler implements Handler {
  private handler: Handler;
  private filter: (record: Record) => boolean;

  constructor(options: FilterHandlerOptions) {
    this.handler = options.handler;
    this.filter = options.filter;
  }

  enabled(level: Level): boolean {
    return this.handler.enabled(level);
  }

  needsSource(): boolean {
    return this.handler.needsSource?.() ?? false;
  }

  handle(record: Record): void {
    if (this.filter(record)) {
      this.handler.handle(record);
    }
  }

  withAttrs(attrs: Attr[]): Handler {
    return new FilterHandler({
      handler: this.handler.withAttrs(attrs),
      filter: this.filter,
    });
  }

  withGroup(name: string): Handler {
    return new FilterHandler({
      handler: this.handler.withGroup(name),
      filter: this.filter,
    });
  }
}

/**
 * Configuration options for ColorHandler.
 */
export interface ColorHandlerOptions {
  /** Minimum log level to output (default: INFO) */
  level?: Level;
  /** Whether to colorize output (default: true) */
  colorize?: boolean;
  /** Whether to include source location information (default: false) */
  addSource?: boolean;
  /** Optional function to transform attributes before output */
  replaceAttr?: (groups: string[], attr: Attr) => Attr;
}

/**
 * ANSI color codes for terminal output.
 * @internal
 */
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

/**
 * ColorHandler outputs colorized logs to the console.
 *
 * Provides syntax-highlighted log output for improved readability during development.
 * Automatically applies appropriate colors based on log level.
 *
 * @example
 * ```typescript
 * const handler = new ColorHandler({
 *   level: Level.DEBUG,
 *   colorize: true,
 *   addSource: true
 * });
 * const logger = new Logger(handler);
 *
 * logger.debug("Debug message");  // Cyan
 * logger.info("Info message");    // Green
 * logger.warn("Warning");         // Yellow
 * logger.error("Error occurred"); // Red (bright)
 * ```
 */
export class ColorHandler implements Handler {
  private level: Level;
  private colorize: boolean;
  private attrs: Attr[] = [];
  private groups: string[] = [];
  private addSource: boolean;
  private replaceAttr?: (groups: string[], attr: Attr) => Attr;

  constructor(options: ColorHandlerOptions = {}) {
    this.level = options.level ?? Level.INFO;
    this.colorize = options.colorize ?? true;
    this.addSource = options.addSource ?? false;
    this.replaceAttr = options.replaceAttr;
  }

  enabled(level: Level): boolean {
    return level >= this.level;
  }

  needsSource(): boolean {
    return this.addSource;
  }

  private processAttr(attr: Attr): Attr {
    if (this.replaceAttr) {
      return this.replaceAttr(this.groups, attr);
    }
    return attr;
  }

  handle(record: Record): void {
    const parts: string[] = [];

    // Time (gray)
    parts.push(
      this.colorize
        ? `${COLORS.gray}${record.time.toISOString()}${COLORS.reset}`
        : record.time.toISOString()
    );

    // Level with colors
    const levelStr = Level[record.level].padEnd(5);
    let coloredLevel = levelStr;
    if (this.colorize) {
      switch (record.level) {
        case Level.DEBUG:
          coloredLevel = `${COLORS.cyan}${levelStr}${COLORS.reset}`;
          break;
        case Level.INFO:
          coloredLevel = `${COLORS.green}${levelStr}${COLORS.reset}`;
          break;
        case Level.WARN:
          coloredLevel = `${COLORS.yellow}${levelStr}${COLORS.reset}`;
          break;
        case Level.ERROR:
          coloredLevel = `${COLORS.red}${COLORS.bright}${levelStr}${COLORS.reset}`;
          break;
      }
    }
    parts.push(coloredLevel);

    // Source (if addSource is enabled)
    if (this.addSource && record.source) {
      const sourceStr = `${record.source.file || "?"}:${
        record.source.line || 0
      }`;
      const sourceAttr = this.processAttr({
        key: "source",
        value: sourceStr,
      });
      const coloredSource = this.colorize
        ? `${COLORS.magenta}${String(sourceAttr.value)}${COLORS.reset}`
        : String(sourceAttr.value);
      parts.push(coloredSource);
    }

    // Message (bright white)
    parts.push(
      this.colorize
        ? `${COLORS.bright}${record.message}${COLORS.reset}`
        : record.message
    );

    // Attributes (dim)
    const attrParts: string[] = [];
    for (const attr of [...this.attrs, ...record.attrs]) {
      const processed = this.processAttr(attr);
      const key =
        this.groups.length > 0
          ? `${this.groups.join(".")}.${processed.key}`
          : processed.key;
      const value =
        typeof processed.value === "string"
          ? `"${processed.value}"`
          : JSON.stringify(processed.value);
      attrParts.push(
        this.colorize
          ? `${COLORS.dim}${key}=${value}${COLORS.reset}`
          : `${key}=${value}`
      );
    }

    if (attrParts.length > 0) {
      parts.push(attrParts.join(" "));
    }

    console.log(parts.join(" "));
  }

  withAttrs(attrs: Attr[]): Handler {
    const handler = new ColorHandler({
      level: this.level,
      colorize: this.colorize,
      addSource: this.addSource,
      replaceAttr: this.replaceAttr,
    });
    handler.attrs = [...this.attrs, ...attrs];
    handler.groups = [...this.groups];
    return handler;
  }

  withGroup(name: string): Handler {
    const handler = new ColorHandler({
      level: this.level,
      colorize: this.colorize,
      addSource: this.addSource,
      replaceAttr: this.replaceAttr,
    });
    handler.attrs = [...this.attrs];
    handler.groups = [...this.groups, name];
    return handler;
  }
}
