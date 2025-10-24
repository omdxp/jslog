import { Handler, Record, Level, Attr } from "./logger.js";
import * as fs from "fs";
import * as path from "path";

/**
 * FileHandler - Write logs to files (Go slog doesn't have this! 😎)
 */
export interface FileHandlerOptions {
  level?: Level;
  filepath: string;
  maxSize?: number; // Max size in bytes before rotation
  maxFiles?: number; // Max number of backup files
  format?: "text" | "json";
}

export class FileHandler implements Handler {
  private level: Level;
  private filepath: string;
  private maxSize: number;
  private maxFiles: number;
  private format: "text" | "json";
  private currentSize: number = 0;
  private stream: fs.WriteStream;

  constructor(options: FileHandlerOptions) {
    this.level = options.level ?? Level.INFO;
    this.filepath = options.filepath;
    this.maxSize = options.maxSize ?? 10 * 1024 * 1024; // 10MB default
    this.maxFiles = options.maxFiles ?? 5;
    this.format = options.format ?? "json";

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

  handle(record: Record): void {
    let line: string;

    if (this.format === "json") {
      const obj: any = {
        time: record.time.toISOString(),
        level: Level[record.level],
        msg: record.message,
      };
      for (const attr of record.attrs) {
        obj[attr.key] = attr.value;
      }
      line = JSON.stringify(obj) + "\n";
    } else {
      const parts = [
        `time=${record.time.toISOString()}`,
        `level=${Level[record.level]}`,
        `msg="${record.message}"`,
      ];
      for (const attr of record.attrs) {
        parts.push(`${attr.key}=${JSON.stringify(attr.value)}`);
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
    return this; // File handler doesn't support persistent attrs
  }

  withGroup(_name: string): Handler {
    return this; // File handler doesn't support groups
  }

  close(): void {
    this.stream.end();
  }
}

/**
 * BufferedHandler - Buffer logs and flush periodically (Go slog ain't got this!)
 */
export interface BufferedHandlerOptions {
  handler: Handler;
  bufferSize?: number; // Number of records to buffer
  flushInterval?: number; // Milliseconds between flushes
}

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

  handle(record: Record): void {
    this.buffer.push(record);
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

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

  close(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}

/**
 * SamplingHandler - Only log a percentage of messages (performance beast!)
 */
export interface SamplingHandlerOptions {
  handler: Handler;
  rate?: number; // 0.0 to 1.0 (0.1 = 10% of logs)
  initialCount?: number; // Always log first N messages
  thereafter?: number; // Then log 1 in N messages
}

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
 * FilterHandler - Filter logs based on custom criteria (sick flexibility!)
 */
export interface FilterHandlerOptions {
  handler: Handler;
  filter: (record: Record) => boolean;
}

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
 * ColorHandler - Colorful console output (make it pretty! 🌈)
 */
export interface ColorHandlerOptions {
  level?: Level;
  colorize?: boolean;
}

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

export class ColorHandler implements Handler {
  private level: Level;
  private colorize: boolean;
  private attrs: Attr[] = [];
  private groups: string[] = [];

  constructor(options: ColorHandlerOptions = {}) {
    this.level = options.level ?? Level.INFO;
    this.colorize = options.colorize ?? true;
  }

  enabled(level: Level): boolean {
    return level >= this.level;
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

    // Message (bright white)
    parts.push(
      this.colorize
        ? `${COLORS.bright}${record.message}${COLORS.reset}`
        : record.message
    );

    // Attributes (dim)
    const attrParts: string[] = [];
    for (const attr of [...this.attrs, ...record.attrs]) {
      const key =
        this.groups.length > 0
          ? `${this.groups.join(".")}.${attr.key}`
          : attr.key;
      const value =
        typeof attr.value === "string"
          ? `"${attr.value}"`
          : JSON.stringify(attr.value);
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
    });
    handler.attrs = [...this.attrs, ...attrs];
    handler.groups = [...this.groups];
    return handler;
  }

  withGroup(name: string): Handler {
    const handler = new ColorHandler({
      level: this.level,
      colorize: this.colorize,
    });
    handler.attrs = [...this.attrs];
    handler.groups = [...this.groups, name];
    return handler;
  }
}
