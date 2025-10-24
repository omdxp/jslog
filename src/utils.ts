import { Attr, Value } from "./logger.js";

/**
 * Utility functions for jslog
 *
 * Performance measurement utilities (Go slog can't do this!)
 */
export class Timer {
  private start: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.start = performance.now();
  }

  /**
   * Get elapsed time as an attribute
   */
  elapsed(): Attr {
    const ms = performance.now() - this.start;
    return { key: this.name, value: `${ms.toFixed(2)}ms` };
  }

  /**
   * Get elapsed time in milliseconds
   */
  elapsedMs(): number {
    return performance.now() - this.start;
  }
}

/**
 * Start a timer - use with logger
 */
export function startTimer(name: string = "elapsed"): Timer {
  return new Timer(name);
}

/**
 * Context bag for carrying values (better than Go's context!)
 */
export class LogContext {
  private data: Map<string, Value> = new Map();

  set(key: string, value: Value): LogContext {
    this.data.set(key, value);
    return this;
  }

  get(key: string): Value | undefined {
    return this.data.get(key);
  }

  toAttrs(): Attr[] {
    return Array.from(this.data.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  }

  merge(other: LogContext): LogContext {
    const merged = new LogContext();
    this.data.forEach((v, k) => merged.set(k, v));
    other.data.forEach((v, k) => merged.set(k, v));
    return merged;
  }
}

/**
 * Batch attribute builder (fluent interface FTW!)
 */
export class AttrBuilder {
  private attrs: Attr[] = [];

  str(key: string, value: string): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  num(key: string, value: number): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  bool(key: string, value: boolean): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  time(key: string, value: Date): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  any(key: string, value: any): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  err(error: Error): AttrBuilder {
    this.attrs.push({
      key: "error",
      value: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
    });
    return this;
  }

  /**
   * Add attribute only if condition is true
   */
  if(condition: boolean, key: string, value: Value): AttrBuilder {
    if (condition) {
      this.attrs.push({ key, value });
    }
    return this;
  }

  /**
   * Add multiple attributes from object
   */
  from(obj: Record<string, Value>): AttrBuilder {
    for (const [key, value] of Object.entries(obj)) {
      this.attrs.push({ key, value });
    }
    return this;
  }

  build(): Attr[] {
    return this.attrs;
  }
}

/**
 * Quick attr builder
 */
export function attrs(): AttrBuilder {
  return new AttrBuilder();
}

/**
 * Correlation ID tracker (microservices love this!)
 */
let currentCorrelationId: string | undefined;

export function setCorrelationId(id: string): void {
  currentCorrelationId = id;
}

export function getCorrelationId(): string | null {
  return currentCorrelationId || null;
}

export function clearCorrelationId(): void {
  currentCorrelationId = undefined;
}

export function CorrelationId(): Attr | null {
  return currentCorrelationId
    ? { key: "correlation_id", value: currentCorrelationId }
    : null;
}

/**
 * Request ID generator
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Trace ID generator (for distributed tracing)
 */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

/**
 * Safe stringify for circular references (Go would panic lol)
 */
export function safeStringify(obj: any, indent?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    },
    indent
  );
}

/**
 * Lazy evaluation - only compute expensive values if needed
 */
export function lazy<T>(fn: () => T): { logValue: () => T } {
  return {
    logValue: fn,
  };
}

/**
 * Redact sensitive data patterns
 */
export function redact(value: string, pattern: RegExp = /./g): string {
  return value.replace(pattern, "*");
}

/**
 * Mask email addresses
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.charAt(0) + "***" + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask credit card numbers
 */
export function maskCreditCard(cc: string): string {
  return cc.replace(/\d(?=\d{4})/g, "*");
}

/**
 * Mask phone numbers
 */
export function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{4})/g, "*");
}

/**
 * Environment info attribute
 */
export function EnvInfo(): Attr[] {
  return [
    { key: "node_version", value: process.version },
    { key: "platform", value: process.platform },
    { key: "arch", value: process.arch },
    { key: "pid", value: process.pid },
  ];
}

/**
 * Memory usage attribute
 */
export function MemoryUsage(): Attr[] {
  const usage = process.memoryUsage();
  return [
    { key: "memory_rss", value: `${(usage.rss / 1024 / 1024).toFixed(2)}MB` },
    {
      key: "memory_heap_used",
      value: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    },
    {
      key: "memory_heap_total",
      value: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    },
  ];
}

/**
 * HTTP request helper
 */
export interface HttpRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  ip?: string;
  userAgent?: string;
}

export function HttpReq(req: HttpRequest): Attr[] {
  const attrs: Attr[] = [
    { key: "http_method", value: req.method },
    { key: "http_url", value: req.url },
  ];

  if (req.ip) attrs.push({ key: "http_ip", value: req.ip });
  if (req.userAgent)
    attrs.push({ key: "http_user_agent", value: req.userAgent });

  return attrs;
}

/**
 * HTTP response helper
 */
export interface HttpResponse {
  status: number;
  duration?: number;
  size?: number;
}

export function HttpRes(res: HttpResponse): Attr[] {
  const attrs: Attr[] = [{ key: "http_status", value: res.status }];

  if (res.duration !== undefined) {
    attrs.push({ key: "http_duration", value: `${res.duration.toFixed(2)}ms` });
  }
  if (res.size !== undefined) {
    attrs.push({ key: "http_size", value: `${res.size} bytes` });
  }

  return attrs;
}

/**
 * SQL query helper
 */
export function SqlQuery(
  query: string,
  duration?: number,
  rows?: number
): Attr[] {
  const attrs: Attr[] = [{ key: "sql_query", value: query }];

  if (duration !== undefined) {
    attrs.push({ key: "sql_duration", value: `${duration.toFixed(2)}ms` });
  }
  if (rows !== undefined) {
    attrs.push({ key: "sql_rows", value: rows });
  }

  return attrs;
}

/**
 * Stack trace capture
 */
export function StackTrace(): Attr {
  const stack = new Error().stack || "";
  const lines = stack.split("\n").slice(2); // Remove first 2 lines
  return { key: "stack_trace", value: lines.join("\n") };
}

/**
 * Caller info (file and line number)
 */
export function Caller(): Attr {
  const stack = new Error().stack || "";
  const lines = stack.split("\n");
  const callerLine = lines[2] || "unknown";
  const match = callerLine.match(/\((.+):(\d+):(\d+)\)/);

  if (match) {
    return {
      key: "caller",
      value: `${match[1]}:${match[2]}`,
    };
  }

  return { key: "caller", value: "unknown" };
}
