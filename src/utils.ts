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
 * Global correlation ID storage for tracking requests across services.
 * @internal
 */
let currentCorrelationId: string | undefined;

/**
 * Set a correlation ID to track requests across microservices.
 *
 * The correlation ID is stored globally and can be included in logs
 * to trace requests through distributed systems.
 *
 * @param id - The correlation ID to set
 *
 * @example
 * ```typescript
 * import { setCorrelationId, info, CorrelationId } from '@omdxp/jslog';
 *
 * // At request entry point
 * setCorrelationId('corr-abc-123');
 *
 * // In any downstream function
 * info('Processing', CorrelationId());
 * // Output includes: correlation_id="corr-abc-123"
 * ```
 *
 * @example With middleware
 * ```typescript
 * app.use((req, res, next) => {
 *   setCorrelationId(req.headers['x-correlation-id'] || generateRequestId());
 *   next();
 * });
 * ```
 */
export function setCorrelationId(id: string): void {
  currentCorrelationId = id;
}

/**
 * Get the current correlation ID.
 *
 * @returns The current correlation ID or null if none is set
 *
 * @example
 * ```typescript
 * const id = getCorrelationId();
 * if (id) {
 *   // Forward to downstream service
 *   fetch('/api/service', {
 *     headers: { 'X-Correlation-ID': id }
 *   });
 * }
 * ```
 */
export function getCorrelationId(): string | null {
  return currentCorrelationId || null;
}

/**
 * Clear the current correlation ID.
 *
 * Useful for cleanup after request processing or in tests.
 *
 * @example
 * ```typescript
 * // After request completes
 * clearCorrelationId();
 * ```
 *
 * @example In tests
 * ```typescript
 * afterEach(() => {
 *   clearCorrelationId();
 * });
 * ```
 */
export function clearCorrelationId(): void {
  currentCorrelationId = undefined;
}

/**
 * Create a correlation ID attribute from the current global correlation ID.
 *
 * Returns null if no correlation ID is set.
 *
 * @returns An Attr with the correlation ID or null
 *
 * @example
 * ```typescript
 * import { info, CorrelationId } from '@omdxp/jslog';
 *
 * setCorrelationId('req-123');
 * info('Request started', CorrelationId());
 * // Output: correlation_id="req-123"
 * ```
 *
 * @example With conditional inclusion
 * ```typescript
 * const attrs = [String('action', 'login'), CorrelationId()].filter(Boolean);
 * info('User action', ...attrs);
 * ```
 */
export function CorrelationId(): Attr | null {
  return currentCorrelationId
    ? { key: "correlation_id", value: currentCorrelationId }
    : null;
}

/**
 * Generate a unique request ID.
 *
 * Creates IDs in format: `req_<timestamp>_<random>`
 * Suitable for tracking individual HTTP requests.
 *
 * @returns A unique request ID string
 *
 * @example
 * ```typescript
 * import { generateRequestId, setCorrelationId } from '@omdxp/jslog';
 *
 * app.use((req, res, next) => {
 *   const requestId = generateRequestId();
 *   setCorrelationId(requestId);
 *   res.setHeader('X-Request-ID', requestId);
 *   next();
 * });
 * ```
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique trace ID for distributed tracing.
 *
 * Creates IDs in format: `trace_<timestamp>_<random>`
 * Longer than request IDs, suitable for tracking across multiple services.
 *
 * @returns A unique trace ID string
 *
 * @example
 * ```typescript
 * import { generateTraceId, String, info } from '@omdxp/jslog';
 *
 * const traceId = generateTraceId();
 * info('Starting trace', String('trace_id', traceId));
 *
 * // Pass to downstream services
 * await fetch('/api/service', {
 *   headers: { 'X-Trace-ID': traceId }
 * });
 * ```
 */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

/**
 * Safely stringify objects with circular references.
 *
 * Unlike JSON.stringify, this handles circular references by replacing
 * them with "[Circular]" instead of throwing errors.
 *
 * @param obj - The object to stringify
 * @param indent - Optional indentation for pretty printing
 * @returns JSON string representation
 *
 * @example
 * ```typescript
 * const obj: any = { name: 'test' };
 * obj.self = obj;  // Circular reference
 *
 * const str = safeStringify(obj);
 * // Works! No error thrown
 * logger.info('Object', String('data', str));
 * ```
 *
 * @example With indentation
 * ```typescript
 * const formatted = safeStringify(complexObject, 2);
 * console.log(formatted);  // Pretty printed JSON
 * ```
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
 * Create a lazy-evaluated value for expensive computations.
 *
 * The function is only called if the log level is enabled and the log is actually written.
 * Useful for expensive operations like stack traces or large data serialization.
 *
 * @param fn - Function that returns the value when needed
 * @returns A LogValuer that defers computation
 *
 * @example
 * ```typescript
 * import { info, Any, lazy } from '@omdxp/jslog';
 *
 * info('Debug info', Any('expensive', lazy(() => {
 *   // This only runs if INFO level is enabled
 *   return computeExpensiveReport();
 * })));
 * ```
 *
 * @example Lazy stack trace
 * ```typescript
 * debug('Current state', Any('stack', lazy(() => {
 *   // Stack trace only captured if debug is enabled
 *   return new Error().stack;
 * })));
 * ```
 */
export function lazy<T>(fn: () => T): { logValue: () => T } {
  return {
    logValue: fn,
  };
}

/**
 * Redact sensitive data by replacing matches with asterisks.
 *
 * @param value - The string to redact
 * @param pattern - RegExp pattern to match (default: all characters)
 * @returns The redacted string
 *
 * @example
 * ```typescript
 * import { redact, String, info } from '@omdxp/jslog';
 *
 * const apiKey = 'sk_live_abc123def456';
 * info('API call', String('key', redact(apiKey, /sk_live_\w+/)));
 * // Output: key="***************"
 * ```
 *
 * @example Custom pattern
 * ```typescript
 * const ssn = '123-45-6789';
 * const masked = redact(ssn, /\d/g);  // "***-**-****"
 * ```
 */
export function redact(value: string, pattern: RegExp = /./g): string {
  return value.replace(pattern, "*");
}

/**
 * Mask email addresses preserving first and last character of local part.
 *
 * @param email - The email address to mask
 * @returns Masked email in format: `f***l@domain.com`
 *
 * @example
 * ```typescript
 * import { maskEmail, String, info } from '@omdxp/jslog';
 *
 * info('User registered', String('email', maskEmail('alice@example.com')));
 * // Output: email="a***e@example.com"
 * ```
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.charAt(0) + "***" + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask credit card numbers showing only last 4 digits.
 *
 * @param cc - The credit card number to mask
 * @returns Masked card number with only last 4 visible
 *
 * @example
 * ```typescript
 * import { maskCreditCard, String, info } from '@omdxp/jslog';
 *
 * info('Payment processed', String('card', maskCreditCard('4532123456789012')));
 * // Output: card="************9012"
 * ```
 */
export function maskCreditCard(cc: string): string {
  return cc.replace(/\d(?=\d{4})/g, "*");
}

/**
 * Mask phone numbers showing only last 4 digits.
 *
 * @param phone - The phone number to mask
 * @returns Masked phone number with only last 4 visible
 *
 * @example
 * ```typescript
 * import { maskPhone, String, info } from '@omdxp/jslog';
 *
 * info('SMS sent', String('phone', maskPhone('555-123-4567')));
 * // Output: phone="***-***-4567"
 * ```
 */
export function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{4})/g, "*");
}

/**
 * Get environment information as log attributes.
 *
 * Returns Node.js version, platform, architecture, and process ID.
 *
 * @returns Array of environment-related attributes
 *
 * @example
 * ```typescript
 * import { info, EnvInfo } from '@omdxp/jslog';
 *
 * info('Application started', ...EnvInfo());
 * // Output: node_version="v20.0.0" platform="linux" arch="x64" pid=12345
 * ```
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
 * Get current memory usage as log attributes.
 *
 * Returns RSS, heap used, and heap total in megabytes.
 *
 * @returns Array of memory-related attributes
 *
 * @example
 * ```typescript
 * import { warn, MemoryUsage } from '@omdxp/jslog';
 *
 * if (needsMemoryCheck) {
 *   warn('High memory usage detected', ...MemoryUsage());
 *   // Output: memory_rss="256.45MB" memory_heap_used="128.23MB" memory_heap_total="200.00MB"
 * }
 * ```
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
 * HTTP request information for structured logging.
 */
export interface HttpRequest {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request URL or path */
  url: string;
  /** Optional request headers */
  headers?: Record<string, string>;
  /** Optional client IP address */
  ip?: string;
  /** Optional User-Agent string */
  userAgent?: string;
}

/**
 * Log HTTP request details as attributes.
 *
 * Extracts method, URL, IP, and user agent into structured log attributes.
 * Compatible with Express, Fastify, and standard Node.js HTTP requests.
 *
 * @param req - HTTP request object
 * @returns Array of HTTP request attributes
 *
 * @example Express
 * ```typescript
 * import { info, HttpReq } from '@omdxp/jslog';
 *
 * app.use((req, res, next) => {
 *   info('Request started', ...HttpReq({
 *     method: req.method,
 *     url: req.url,
 *     ip: req.ip,
 *     userAgent: req.get('user-agent')
 *   }));
 *   next();
 * });
 * ```
 *
 * @example Fastify
 * ```typescript
 * fastify.addHook('onRequest', (request, reply, done) => {
 *   info('Incoming request', ...HttpReq({
 *     method: request.method,
 *     url: request.url,
 *     ip: request.ip
 *   }));
 *   done();
 * });
 * ```
 */
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
 * HTTP response information for structured logging.
 */
export interface HttpResponse {
  /** HTTP status code */
  status: number;
  /** Optional request duration in milliseconds */
  duration?: number;
  /** Optional response size in bytes */
  size?: number;
}

/**
 * Log HTTP response details as attributes.
 *
 * Captures status code, duration, and response size for observability.
 *
 * @param res - HTTP response object
 * @returns Array of HTTP response attributes
 *
 * @example Express
 * ```typescript
 * import { info, HttpRes } from '@omdxp/jslog';
 *
 * app.use((req, res, next) => {
 *   const start = Date.now();
 *   res.on('finish', () => {
 *     info('Request completed', ...HttpRes({
 *       status: res.statusCode,
 *       duration: Date.now() - start
 *     }));
 *   });
 *   next();
 * });
 * ```
 *
 * @example Combined with request info
 * ```typescript
 * info('HTTP transaction',
 *   ...HttpReq(request),
 *   ...HttpRes({ status: 200, duration: 45.2, size: 1024 })
 * );
 * // Output: http_method="GET" http_url="/api" http_status=200 http_duration="45.20ms" http_size="1.00KB"
 * ```
 */
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
 * SQL query information for database logging.
 */
export interface SqlQueryOptions {
  /** The SQL query string */
  query: string;
  /** Optional query parameters */
  params?: any[];
  /** Optional query duration in milliseconds */
  duration?: number;
  /** Optional number of rows affected/returned */
  rows?: number;
}

/**
 * Log SQL query details as attributes.
 *
 * Captures query text, parameters, duration, and row count for database observability.
 *
 * @param options - SQL query information
 * @returns Array of SQL query attributes
 *
 * @example Basic query
 * ```typescript
 * import { info, SqlQuery } from '@omdxp/jslog';
 *
 * info('Database query', ...SqlQuery({
 *   query: 'SELECT * FROM users WHERE id = $1',
 *   params: [123],
 *   duration: 15.5,
 *   rows: 1
 * }));
 * // Output: sql_query="SELECT * FROM users WHERE id = $1" sql_params=[123] sql_duration="15.50ms" sql_rows=1
 * ```
 *
 * @example With timer
 * ```typescript
 * const timer = startTimer();
 * const result = await db.query('SELECT * FROM products');
 * info('Products loaded', ...SqlQuery({
 *   query: 'SELECT * FROM products',
 *   duration: timer.elapsedMs(),
 *   rows: result.rowCount
 * }));
 * ```
 */
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
 * Capture current stack trace as a log attribute.
 *
 * Useful for debugging to see the call chain leading to a log statement.
 * The stack trace excludes the first 2 frames (Error() and StackTrace() itself).
 *
 * @returns Attr containing the formatted stack trace
 *
 * @example
 * ```typescript
 * import { warn, StackTrace } from '@omdxp/jslog';
 *
 * warn('Unexpected condition', StackTrace());
 * // Output includes: stack_trace="at functionName (file.ts:123)..."
 * ```
 *
 * @example Conditional stack traces
 * ```typescript
 * if (errorCount > 10) {
 *   error('Too many errors', Int('count', errorCount), StackTrace());
 * }
 * ```
 */
export function StackTrace(): Attr {
  const stack = new Error().stack || "";
  const lines = stack.split("\n").slice(2); // Remove first 2 lines
  return { key: "stack_trace", value: lines.join("\n") };
}

/**
 * Capture caller information (file and line number).
 *
 * Returns the file path and line number where the log was called from.
 * Lighter than StackTrace() - only captures immediate caller.
 *
 * @returns Attr with caller location in format "file.ts:123"
 *
 * @example
 * ```typescript
 * import { debug, Caller } from '@omdxp/jslog';
 *
 * debug('Debug point', Caller());
 * // Output: caller="src/service.ts:45"
 * ```
 *
 * @example Track call locations
 * ```typescript
 * function criticalOperation() {
 *   info('Critical operation started', Caller());
 *   // Logs which file/line called this function
 * }
 * ```
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
