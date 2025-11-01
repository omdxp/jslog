import { Handler, Record, Level, Attr } from "./logger";

/**
 * Configuration options for AsyncHandler.
 */
export interface AsyncHandlerOptions {
  /** The underlying handler to process logs asynchronously */
  handler: Handler;
  /** Optional callback for handling errors during async log processing */
  errorHandler?: (error: Error) => void;
}

/**
 * AsyncHandler processes log records asynchronously in the background.
 *
 * Ensures logging operations never block the main thread by queueing records
 * and processing them via setImmediate. Maintains log order while providing
 * non-blocking performance.
 *
 * @example
 * ```typescript
 * const handler = new AsyncHandler({
 *   handler: new FileHandler({ filepath: './app.log' }),
 *   errorHandler: (err) => console.error('Log error:', err)
 * });
 * const logger = new Logger(handler);
 *
 * logger.info("This returns immediately");
 * // Log is written in the background
 *
 * // On shutdown
 * await handler.close();
 * ```
 */
export class AsyncHandler implements Handler {
  private handler: Handler;
  private errorHandler?: (error: Error) => void;
  private queue: Promise<void> = Promise.resolve();
  private closed: boolean = false;

  constructor(options: AsyncHandlerOptions) {
    this.handler = options.handler;
    this.errorHandler = options.errorHandler;
  }

  enabled(level: Level): boolean {
    return this.handler.enabled(level);
  }

  needsSource(): boolean {
    return this.handler.needsSource?.() ?? false;
  }

  handle(record: Record): void {
    if (this.closed) {
      return; // Silently drop logs after close
    }

    // Queue the operation to ensure order
    this.queue = this.queue
      .then(() => {
        return new Promise<void>((resolve) => {
          setImmediate(() => {
            try {
              this.handler.handle(record);
              resolve();
            } catch (error) {
              if (this.errorHandler) {
                this.errorHandler(error as Error);
              }
              resolve();
            }
          });
        });
      })
      .catch((error) => {
        if (this.errorHandler) {
          this.errorHandler(error);
        }
      });
  }

  /**
   * Closes the handler and waits for all pending async operations to complete.
   *
   * Sets the handler to closed state (rejecting new logs), waits for the queue
   * to drain, then closes the wrapped handler if it supports closing.
   * Properly handles both synchronous and asynchronous close methods.
   *
   * After calling close(), any new log records will be silently dropped.
   *
   * @returns Promise that resolves when all pending operations are complete
   *
   * @example
   * ```typescript
   * const handler = new AsyncHandler({ handler: new JSONHandler() });
   * const logger = new Logger(handler);
   *
   * logger.info("Processing...");
   *
   * // Graceful shutdown
   * await handler.close();
   * process.exit(0);
   * ```
   */
  async close(): Promise<void> {
    this.closed = true;
    await this.queue;

    // Close wrapped handler if it supports closing
    if ("close" in this.handler && typeof this.handler.close === "function") {
      const closeMethod = (this.handler as any).close;
      // Handle both sync and async close methods
      const result = closeMethod.call(this.handler);
      if (result && typeof result.then === "function") {
        await result;
      }
    }
  }

  withAttrs(attrs: Attr[]): Handler {
    return new AsyncHandler({
      handler: this.handler.withAttrs(attrs),
      errorHandler: this.errorHandler,
    });
  }

  withGroup(name: string): Handler {
    return new AsyncHandler({
      handler: this.handler.withGroup(name),
      errorHandler: this.errorHandler,
    });
  }

  /**
   * Flushes any pending async operations.
   *
   * Waits for the current queue to drain. Useful for ensuring all logs
   * are processed before continuing with critical operations.
   *
   * @returns Promise that resolves when the queue is empty
   */
  async flush(): Promise<void> {
    await this.queue;
  }
}

/**
 * Middleware function type for transforming log records.
 *
 * Middleware can inspect, modify, or filter log records before they reach the handler.
 *
 * @param record - The log record to process
 * @param next - Function to call the next middleware or handler
 */
export type HandlerMiddleware = (
  record: Record,
  next: (record: Record) => void
) => void;

/**
 * Configuration options for MiddlewareHandler.
 */
export interface MiddlewareHandlerOptions {
  /** The underlying handler to process logs after middleware */
  handler: Handler;
  /** Array of middleware functions to apply in order */
  middleware: HandlerMiddleware[];
}

/**
 * MiddlewareHandler applies a chain of middleware transformations to log records.
 *
 * Middleware can modify records, add attributes, filter logs, or perform any custom
 * processing before passing to the underlying handler.
 *
 * @example
 * ```typescript
 * const addRequestId: HandlerMiddleware = (record, next) => {
 *   record.attrs.push({ key: 'requestId', value: getCurrentRequestId() });
 *   next(record);
 * };
 *
 * const filterSensitive: HandlerMiddleware = (record, next) => {
 *   if (!record.message.includes('password')) {
 *     next(record);
 *   }
 *   // Else drop the log
 * };
 *
 * const handler = new MiddlewareHandler({
 *   handler: new TextHandler(),
 *   middleware: [addRequestId, filterSensitive]
 * });
 * ```
 */
export class MiddlewareHandler implements Handler {
  private handler: Handler;
  private middleware: HandlerMiddleware[];

  constructor(options: MiddlewareHandlerOptions) {
    this.handler = options.handler;
    this.middleware = options.middleware;
  }

  enabled(level: Level): boolean {
    return this.handler.enabled(level);
  }

  needsSource(): boolean {
    return this.handler.needsSource?.() ?? false;
  }

  handle(record: Record): void {
    const execute = (index: number, rec: Record): void => {
      if (index >= this.middleware.length) {
        this.handler.handle(rec);
        return;
      }

      this.middleware[index](rec, (nextRecord) => {
        execute(index + 1, nextRecord);
      });
    };

    execute(0, record);
  }

  withAttrs(attrs: Attr[]): Handler {
    return new MiddlewareHandler({
      handler: this.handler.withAttrs(attrs),
      middleware: this.middleware,
    });
  }

  withGroup(name: string): Handler {
    return new MiddlewareHandler({
      handler: this.handler.withGroup(name),
      middleware: this.middleware,
    });
  }

  /**
   * Closes the wrapped handler if it supports closing.
   *
   * Delegates the close operation to the wrapped handler, properly handling both
   * synchronous and asynchronous close methods.
   *
   * @returns Promise that resolves when the handler is closed
   *
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   await middlewareHandler.close();
   *   process.exit(0);
   * });
   * ```
   */
  async close(): Promise<void> {
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
 * Pre-built middleware functions
 */

/**
 * Add timestamp with custom format
 */
export function timestampMiddleware(
  format?: (date: Date) => string
): HandlerMiddleware {
  return (record, next) => {
    const formatted = format ? format(record.time) : record.time.toISOString();
    next({
      ...record,
      attrs: [{ key: "timestamp", value: formatted }, ...record.attrs],
    });
  };
}

/**
 * Add hostname to all logs
 */
export function hostnameMiddleware(): HandlerMiddleware {
  const hostname =
    typeof require !== "undefined" ? require("os").hostname() : "unknown";

  return (record, next) => {
    next({
      ...record,
      attrs: [{ key: "hostname", value: hostname }, ...record.attrs],
    });
  };
}

/**
 * Add PID to all logs
 */
export function pidMiddleware(): HandlerMiddleware {
  return (record, next) => {
    next({
      ...record,
      attrs: [{ key: "pid", value: process.pid }, ...record.attrs],
    });
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(maxPerSecond: number): HandlerMiddleware {
  let count = 0;
  let lastReset = Date.now();

  return (record, next) => {
    const now = Date.now();
    if (now - lastReset >= 1000) {
      count = 0;
      lastReset = now;
    }

    if (count < maxPerSecond) {
      count++;
      next(record);
    }
    // Otherwise drop the log (rate limited)
  };
}

/**
 * Deduplication middleware (prevent spam!)
 */
export function dedupeMiddleware(windowMs: number = 1000): HandlerMiddleware {
  const seen = new Map<string, number>();

  return (record, next) => {
    const key = `${record.level}:${record.message}`;
    const now = Date.now();
    const lastSeen = seen.get(key);

    if (!lastSeen || now - lastSeen >= windowMs) {
      seen.set(key, now);
      next(record);

      // Cleanup old entries
      if (seen.size > 1000) {
        const cutoff = now - windowMs;
        for (const [k, v] of seen.entries()) {
          if (v < cutoff) seen.delete(k);
        }
      }
    }
    // Otherwise skip (duplicate)
  };
}

/**
 * Enrichment middleware - add custom data to all logs
 */
export function enrichMiddleware(
  enrich: (record: Record) => Attr[]
): HandlerMiddleware {
  return (record, next) => {
    const extraAttrs = enrich(record);
    next({
      ...record,
      attrs: [...extraAttrs, ...record.attrs],
    });
  };
}

/**
 * Transform middleware - modify the record
 */
export function transformMiddleware(
  transform: (record: Record) => Record
): HandlerMiddleware {
  return (record, next) => {
    next(transform(record));
  };
}

/**
 * Conditional middleware - only apply to certain logs
 */
export function conditionalMiddleware(
  condition: (record: Record) => boolean,
  middleware: HandlerMiddleware
): HandlerMiddleware {
  return (record, next) => {
    if (condition(record)) {
      middleware(record, next);
    } else {
      next(record);
    }
  };
}

/**
 * Error boundary middleware - catch errors in downstream handlers
 */
export function errorBoundaryMiddleware(
  onError?: (error: Error, record: Record) => void
): HandlerMiddleware {
  return (record, next) => {
    try {
      next(record);
    } catch (error) {
      if (onError) {
        onError(error as Error, record);
      } else {
        console.error("Error in log handler:", error);
      }
    }
  };
}

/**
 * Metrics middleware - collect logging metrics
 */
export class MetricsMiddleware {
  private counts: Map<Level, number> = new Map();
  private errors: number = 0;

  middleware(): HandlerMiddleware {
    return (record, next) => {
      const current = this.counts.get(record.level) || 0;
      this.counts.set(record.level, current + 1);

      if (record.level === Level.ERROR) {
        this.errors++;
      }

      next(record);
    };
  }

  getStats() {
    return {
      total: Array.from(this.counts.values()).reduce((a, b) => a + b, 0),
      byLevel: Object.fromEntries(
        Array.from(this.counts.entries()).map(([level, count]) => [
          Level[level],
          count,
        ])
      ),
      errors: this.errors,
    };
  }

  reset() {
    this.counts.clear();
    this.errors = 0;
  }
}
