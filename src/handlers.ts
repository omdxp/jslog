import { Handler, Record, Level, Attr, Value, LevelVar } from "./logger.js";

/**
 * HandlerOptions configures a Handler
 */
export interface HandlerOptions {
  level?: Level | LevelVar;
  addSource?: boolean;
  replaceAttr?: (groups: string[], attr: Attr) => Attr;
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

  constructor(options: HandlerOptions = {}) {
    this.level = options.level ?? Level.INFO;
    this.attrs = [];
    this.groups = [];
    this.addSource = options.addSource ?? false;
    this.replaceAttr = options.replaceAttr;
  }

  enabled(level: Level): boolean {
    const minLevel =
      this.level instanceof LevelVar ? this.level.level() : this.level;
    return level >= minLevel;
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
  constructor(options: HandlerOptions = {}) {
    super(options);
  }

  handle(record: Record): void {
    const parts: string[] = [];

    // Time
    const timeAttr = this.processAttr({ key: "time", value: record.time });
    parts.push(
      `time=${
        timeAttr.value instanceof Date
          ? (timeAttr.value as Date).toISOString()
          : timeAttr.value
      }`
    );

    // Level
    const levelAttr = this.processAttr({
      key: "level",
      value: Level[record.level],
    });
    parts.push(`level=${levelAttr.value}`);

    // Message
    const msgAttr = this.processAttr({ key: "msg", value: record.message });
    parts.push(`msg="${msgAttr.value}"`);

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

    console.log(parts.join(" "));
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
    });
    handler.attrs = [...this.attrs, ...attrs];
    handler.groups = [...this.groups];
    return handler;
  }

  withGroup(name: string): Handler {
    const handler = new TextHandler({
      level: this.level,
      addSource: this.addSource,
      replaceAttr: this.replaceAttr,
    });
    handler.attrs = [...this.attrs];
    handler.groups = [...this.groups, name];
    return handler;
  }
}

/**
 * JSONHandler outputs logs in JSON format
 * Similar to Go's slog.JSONHandler
 */
export class JSONHandler extends BaseHandler {
  constructor(options: HandlerOptions = {}) {
    super(options);
  }

  handle(record: Record): void {
    const obj: any = {};

    // Time
    const timeAttr = this.processAttr({ key: "time", value: record.time });
    obj.time =
      timeAttr.value instanceof Date
        ? (timeAttr.value as Date).toISOString()
        : timeAttr.value;

    // Level
    const levelAttr = this.processAttr({
      key: "level",
      value: Level[record.level],
    });
    obj.level = levelAttr.value;

    // Message
    const msgAttr = this.processAttr({ key: "msg", value: record.message });
    obj.msg = msgAttr.value;

    // Handler-level attributes
    for (const attr of this.attrs) {
      const processed = this.processAttr(attr);
      this.addAttr(obj, processed);
    }

    // Record attributes
    for (const attr of record.attrs) {
      const processed = this.processAttr(attr);
      this.addAttr(obj, processed);
    }

    console.log(JSON.stringify(obj));
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
      // It's an Attr - convert to object
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

  withAttrs(attrs: Attr[]): Handler {
    const handler = new JSONHandler({
      level: this.level,
      addSource: this.addSource,
      replaceAttr: this.replaceAttr,
    });
    handler.attrs = [...this.attrs, ...attrs];
    handler.groups = [...this.groups];
    return handler;
  }

  withGroup(name: string): Handler {
    const handler = new JSONHandler({
      level: this.level,
      addSource: this.addSource,
      replaceAttr: this.replaceAttr,
    });
    handler.attrs = [...this.attrs];
    handler.groups = [...this.groups, name];
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
}
