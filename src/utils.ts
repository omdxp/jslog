import { Attr, Value } from "./logger";

/**
 * Timer for measuring operation duration with high precision.
 *
 * Uses `performance.now()` for accurate timing measurements.
 * Useful for logging operation durations and performance metrics.
 *
 * @example
 * ```typescript
 * const timer = new Timer("db_query");
 * await executeQuery();
 * logger.info("Query completed", timer.elapsed());
 * // Logs: db_query=15.23ms
 * ```
 */
export class Timer {
  private start: number;
  private name: string;

  /**
   * Creates a new timer with the specified name.
   *
   * @param name - The name to use for the elapsed time attribute
   */
  constructor(name: string) {
    this.name = name;
    this.start = performance.now();
  }

  /**
   * Returns the elapsed time as a log attribute.
   *
   * @returns An Attr with the timer name and formatted elapsed time
   *
   * @example
   * ```typescript
   * logger.info("Operation done", timer.elapsed());
   * // Output: operation_time=123.45ms
   * ```
   */
  elapsed(): Attr {
    const ms = performance.now() - this.start;
    return { key: this.name, value: `${ms.toFixed(2)}ms` };
  }

  /**
   * Returns the elapsed time in milliseconds as a number.
   *
   * @returns Elapsed time in milliseconds
   *
   * @example
   * ```typescript
   * if (timer.elapsedMs() > 1000) {
   *   logger.warn("Slow operation", Int("duration", timer.elapsedMs()));
   * }
   * ```
   */
  elapsedMs(): number {
    return performance.now() - this.start;
  }
}

/**
 * Creates and starts a new timer.
 *
 * Convenience function for creating Timer instances.
 *
 * @param name - The name to use for the elapsed time attribute (default: "elapsed")
 * @returns A new Timer instance
 *
 * @example
 * ```typescript
 * const timer = startTimer("api_call");
 * await fetch('/api/data');
 * logger.info("API call completed", timer.elapsed());
 * ```
 */
export function startTimer(name: string = "elapsed"): Timer {
  return new Timer(name);
}

/**
 * Context bag for carrying structured data across log calls.
 *
 * Similar to context.Context in Go but specifically designed for logging.
 * Allows accumulating key-value pairs that can be converted to log attributes.
 *
 * @example
 * ```typescript
 * const ctx = new LogContext()
 *   .set("requestId", "abc-123")
 *   .set("userId", "user-456")
 *   .set("env", "production");
 *
 * logger.infoContext("Request processed", ctx);
 * // Includes all context attributes in the log
 * ```
 */
export class LogContext {
  private data: Map<string, Value> = new Map();

  /**
   * Sets a key-value pair in the context.
   *
   * @param key - The attribute key
   * @param value - The attribute value
   * @returns This context for method chaining
   */
  set(key: string, value: Value): LogContext {
    this.data.set(key, value);
    return this;
  }

  /**
   * Gets a value from the context.
   *
   * @param key - The attribute key
   * @returns The value if found, undefined otherwise
   */
  get(key: string): Value | undefined {
    return this.data.get(key);
  }

  /**
   * Converts the context to an array of log attributes.
   *
   * @returns Array of Attr objects
   */
  toAttrs(): Attr[] {
    return Array.from(this.data.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  }

  /**
   * Merges this context with another, returning a new context.
   *
   * Values from the other context override values from this context.
   *
   * @param other - The context to merge with
   * @returns A new merged LogContext
   *
   * @example
   * ```typescript
   * const baseCtx = new LogContext().set("env", "prod");
   * const requestCtx = new LogContext().set("requestId", "123");
   * const merged = baseCtx.merge(requestCtx);
   * // Contains both env and requestId
   * ```
   */
  merge(other: LogContext): LogContext {
    const merged = new LogContext();
    this.data.forEach((v, k) => merged.set(k, v));
    other.data.forEach((v, k) => merged.set(k, v));
    return merged;
  }
}

/**
 * Fluent builder for constructing attribute arrays.
 *
 * Provides a convenient fluent interface for building multiple attributes
 * with proper typing and method chaining.
 *
 * @example
 * ```typescript
 * const attrs = new AttrBuilder()
 *   .str("username", "john")
 *   .num("age", 30)
 *   .bool("active", true)
 *   .time("lastLogin", new Date())
 *   .build();
 *
 * logger.info("User data", ...attrs);
 * ```
 */
export class AttrBuilder {
  private attrs: Attr[] = [];

  /**
   * Adds a string attribute.
   *
   * @param key - The attribute key
   * @param value - The string value
   * @returns This builder for method chaining
   */
  str(key: string, value: string): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  /**
   * Adds a numeric attribute.
   *
   * @param key - The attribute key
   * @param value - The numeric value
   * @returns This builder for method chaining
   */
  num(key: string, value: number): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  /**
   * Adds a boolean attribute.
   *
   * @param key - The attribute key
   * @param value - The boolean value
   * @returns This builder for method chaining
   */
  bool(key: string, value: boolean): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  /**
   * Adds a time/date attribute.
   *
   * @param key - The attribute key
   * @param value - The Date value
   * @returns This builder for method chaining
   */
  time(key: string, value: Date): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  /**
   * Adds an attribute with any value type.
   *
   * @param key - The attribute key
   * @param value - The value of any type
   * @returns This builder for method chaining
   */
  any(key: string, value: any): AttrBuilder {
    this.attrs.push({ key, value });
    return this;
  }

  /**
   * Adds an error attribute with structured error information.
   *
   * @param error - The Error object to log
   * @returns This builder for method chaining
   *
   * @example
   * ```typescript
   * try {
   *   // ... code ...
   * } catch (e) {
   *   const attrs = new AttrBuilder().err(e).str("operation", "save").build();
   *   logger.error("Operation failed", ...attrs);
   * }
   * ```
   */
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
   * Conditionally adds an attribute only if the condition is true.
   *
   * @param condition - Whether to add the attribute
   * @param key - The attribute key
   * @param value - The attribute value
   * @returns This builder for method chaining
   *
   * @example
   * ```typescript
   * const attrs = new AttrBuilder()
   *   .str("username", "john")
   *   .if(isAdmin, "role", "admin")
   *   .if(hasPermissions, "permissions", permissions)
   *   .build();
   * ```
   */
  if(condition: boolean, key: string, value: Value): AttrBuilder {
    if (condition) {
      this.attrs.push({ key, value });
    }
    return this;
  }

  /**
   * Adds multiple attributes from an object.
   *
   * @param obj - Object whose properties will be converted to attributes
   * @returns This builder for method chaining
   *
   * @example
   * ```typescript
   * const userData = { id: "123", name: "Alice", active: true };
   * const attrs = new AttrBuilder().from(userData).build();
   * ```
   */
  from(obj: Record<string, Value>): AttrBuilder {
    for (const [key, value] of Object.entries(obj)) {
      this.attrs.push({ key, value });
    }
    return this;
  }

  /**
   * Builds and returns the array of attributes.
   *
   * @returns Array of constructed Attr objects
   */
  build(): Attr[] {
    return this.attrs;
  }
}

/**
 * Creates a new AttrBuilder instance.
 *
 * Convenience function for fluent attribute construction.
 *
 * @returns A new AttrBuilder instance
 *
 * @example
 * ```typescript
 * logger.info("Event", ...attrs().str("user", "john").num("count", 5).build());
 * ```
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

export interface SqlQueryOptions {
  query: string;
  params?: any[];
  duration?: number;
  rows?: number;
}

export function SqlQuery(options: SqlQueryOptions): Attr[] {
  const attrs: Attr[] = [{ key: "sql_query", value: options.query }];

  if (options.params !== undefined) {
    attrs.push({ key: "sql_params", value: options.params });
  }
  if (options.duration !== undefined) {
    attrs.push({
      key: "sql_duration",
      value: `${options.duration.toFixed(2)}ms`,
    });
  }
  if (options.rows !== undefined) {
    attrs.push({ key: "sql_rows", value: options.rows });
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
