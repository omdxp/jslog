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
 * HandlerOptions configures a Handler
 */
export interface HandlerOptions {
  level?: Level | LevelVar;
  addSource?: boolean;
  replaceAttr?: (groups: string[], attr: Attr) => Attr;
  writer?: Writable; // Stream to write to (defaults to stdout)
}

/**
 * Base handler with common functionality
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

  protected processAttr(attr: Attr): Attr {
    if (this.replaceAttr) {
      return this.replaceAttr(this.groups, attr);
    }
    return attr;
  }
}

/**
 * TextHandler outputs logs in a text format
 * Similar to Go's slog.TextHandler
 */
export class TextHandler extends BaseHandler {
  private hasGroups: boolean = false;
  private hasReplaceAttr: boolean = false;

  constructor(options: HandlerOptions = {}) {
    super(options);
    this.hasGroups = this.groups.length > 0;
    this.hasReplaceAttr = !!this.replaceAttr;
  }

  handle(record: Record): void {
    // Fast path - no special features
    if (!this.hasGroups && !this.hasReplaceAttr && !this.addSource) {
      this.handleFast(record);
      return;
    }

    // Slow path with all features
    this.handleSlow(record);
  }

  private handleFast(record: Record): void {
    // Build string with minimal overhead
    const time = record.time.toISOString();
    const msg = record.message;

    // Fast path check - only escape if needed
    let safeMsg = true;
    const msgLen = msg.length;
    for (let i = 0; i < msgLen; i++) {
      const c = msg.charCodeAt(i);
      if (c < 32 || c === 34 || c === 92) {
        safeMsg = false;
        break;
      }
    }

    // Build output in one go - V8 optimizes concatenation
    let output =
      "time=" +
      time +
      " level=" +
      getLevelString(record.level) +
      ' msg="' +
      (safeMsg ? msg : this.escapeText(msg)) +
      '"';

    // Handler-level attributes (from withAttrs)
    const handlerAttrs = this.attrs;
    const handlerLen = handlerAttrs.length;
    for (let i = 0; i < handlerLen; i++) {
      const attr = handlerAttrs[i];
      output += " " + attr.key + "=" + this.formatValueFast(attr.value);
    }

    // Record attributes
    const attrs = record.attrs;
    const len = attrs.length;
    for (let i = 0; i < len; i++) {
      const attr = attrs[i];
      output += " " + attr.key + "=" + this.formatValueFast(attr.value);
    }

    output += "\n";
    this.writer.write(output);
  }

  private escapeText(str: string): string {
    // Check if escape is needed first (fast path)
    let needsEscape = false;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      // Check for: " (34), \ (92), \n (10), \r (13), \t (9), other control chars
      if (c === 34 || c === 92 || c === 10 || c === 13 || c === 9 || c < 32) {
        needsEscape = true;
        break;
      }
    }

    if (!needsEscape) return str;

    // Build escaped string
    let result = "";
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      const char = str[i];
      if (c === 34) result += '\\"'; // "
      else if (c === 92) result += "\\\\"; // \
      else if (c === 10) result += "\\n"; // newline
      else if (c === 13) result += "\\r"; // carriage return
      else if (c === 9) result += "\\t"; // tab
      else if (c < 32) result += "\\u" + c.toString(16).padStart(4, "0");
      // other control chars
      else result += char;
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
    return handler;
  }
}

/**
 * JSONHandler outputs logs in JSON format
 * Similar to Go's slog.JSONHandler
 */
export class JSONHandler extends BaseHandler {
  private hasGroups: boolean = false;
  private hasReplaceAttr: boolean = false;
  private hasHandlerAttrs: boolean = false;
  // Pre-calculated level strings for ultra-fast path
  private readonly levelStrings = {
    [-4]: '"DEBUG"',
    [0]: '"INFO"',
    [4]: '"WARN"',
    [8]: '"ERROR"',
  } as const;

  constructor(options: HandlerOptions = {}) {
    super(options);
    this.hasGroups = this.groups.length > 0;
    this.hasReplaceAttr = !!this.replaceAttr;
    this.hasHandlerAttrs = this.attrs.length > 0;
  }

  handle(record: Record): void {
    // Use ultra-fast path when no special features are enabled
    if (
      !this.hasGroups &&
      !this.hasReplaceAttr &&
      !this.hasHandlerAttrs &&
      !this.addSource
    ) {
      this.handleFast(record);
      return;
    }

    // Slow path with all features
    this.handleSlow(record);
  }

  private handleFast(record: Record): void {
    // Ultra-optimized JSON building
    const time = record.time.toISOString();
    const level = record.level;
    const msg = record.message;

    // Build JSON - check msg for special chars ONLY if it contains them
    // Most log messages are clean, so indexOf is faster than charCodeAt loop
    const needsMsgEscape =
      msg.indexOf('"') >= 0 || msg.indexOf("\\") >= 0 || msg.indexOf("\n") >= 0;

    let json =
      '{"time":"' +
      time +
      '","level":' +
      (this.levelStrings[level] || '"' + getLevelString(level) + '"') +
      ',"msg":"' +
      (needsMsgEscape ? this.escapeJson(msg) : msg) +
      '"';

    // Add attributes
    const attrs = record.attrs;
    const len = attrs.length;
    for (let i = 0; i < len; i++) {
      const attr = attrs[i];
      json += ',"' + attr.key + '":' + this.stringifyValueFast(attr.value);
    }

    json += "}\n";
    this.writer.write(json);
  }

  private escapeJson(str: string): string {
    // Fast path - most strings don't need escaping
    let needsEscape = false;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c === 34 || c === 92 || c === 10 || c === 13 || c === 9 || c < 32) {
        needsEscape = true;
        break;
      }
    }

    if (!needsEscape) return str;

    // Slow path - build escaped string
    let result = "";
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      const code = str.charCodeAt(i);
      if (code === 34) result += '\\"';
      else if (code === 92) result += "\\\\";
      else if (code === 10) result += "\\n";
      else if (code === 13) result += "\\r";
      else if (code === 9) result += "\\t";
      else if (code < 32)
        result += "\\u" + ("0000" + code.toString(16)).slice(-4);
      else result += c;
    }
    return result;
  }

  private stringifyValueFast(value: Value): string {
    // Null/undefined
    if (value == null) return "null"; // intentional == to catch both

    const type = typeof value;

    // Numbers and booleans - no conversion needed
    if (type === "number") return "" + value; // faster than String()
    if (type === "boolean") return value ? "true" : "false";

    // Strings - most common case
    if (type === "string") {
      const str = value as string;
      const len = str.length;

      // Fast check for simple strings (alphanumeric + spaces + common chars)
      let simple = true;
      for (let i = 0; i < len; i++) {
        const c = str.charCodeAt(i);
        // Allow: space(32), alphanumeric, dash, underscore, @, .
        if (c < 32 || c === 34 || c === 92) {
          simple = false;
          break;
        }
      }
      return simple ? '"' + str + '"' : '"' + this.escapeJson(str) + '"';
    }

    // Objects - check for Date first (common case)
    if (type === "object") {
      // Check if it's a Date by checking for getTime method
      if (value && typeof (value as any).toISOString === "function") {
        return '"' + (value as Date).toISOString() + '"';
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
    handler.hasHandlerAttrs = true; // We're adding attrs, so this is now true
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
    return handler;
  }
}

/**
 * DiscardHandler discards all log records
 * Useful for benchmarking or disabling logging
 */
export class DiscardHandler implements Handler {
  enabled(_level: Level): boolean {
    return false;
  }

  handle(_record: Record): void {
    // Do nothing
  }

  withAttrs(_attrs: Attr[]): Handler {
    return this;
  }

  withGroup(_name: string): Handler {
    return this;
  }
}

/**
 * MultiHandler sends records to multiple handlers
 */
export class MultiHandler implements Handler {
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
   * Close all wrapped handlers that support closing.
   * Useful for graceful shutdown when using FileHandler, BufferedHandler, or AsyncHandler.
   */
  close(): void {
    for (const handler of this.handlers) {
      if ("close" in handler && typeof handler.close === "function") {
        handler.close();
      }
    }
  }
}
