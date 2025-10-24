import { Handler, Record, Level, Attr } from "./logger.js";

/**
 * Async handler for non-blocking log operations (Go can't do this easily!)
 */
export interface AsyncHandlerOptions {
  handler: Handler;
  errorHandler?: (error: Error) => void;
}

export class AsyncHandler implements Handler {
  private handler: Handler;
  private errorHandler?: (error: Error) => void;
  private queue: Promise<void> = Promise.resolve();

  constructor(options: AsyncHandlerOptions) {
    this.handler = options.handler;
    this.errorHandler = options.errorHandler;
  }

  enabled(level: Level): boolean {
    return this.handler.enabled(level);
  }

  handle(record: Record): void {
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

  async flush(): Promise<void> {
    await this.queue;
  }
}

/**
 * Middleware pattern for handlers (composition baby! 🎨)
 */
export type HandlerMiddleware = (
  record: Record,
  next: (record: Record) => void
) => void;

export interface MiddlewareHandlerOptions {
  handler: Handler;
  middleware: HandlerMiddleware[];
}

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
