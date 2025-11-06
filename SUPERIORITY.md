# jslog vs Go's log/slog: Feature Comparison

This document provides a comprehensive comparison between jslog and Go's standard library `log/slog` package, highlighting the additional capabilities that jslog provides for production logging requirements.

## Core API Compatibility + Enhancements

### Variadic Parameters (NEW in v1.7.0)
jslog now supports **Go slog-style variadic parameters** for a more ergonomic API:

```typescript
// Go slog-style - pass key-value pairs directly
logger.info('User login', 'user', 'alice', 'attempts', 3, 'success', true);

// Traditional typed style - explicit type control
logger.info('User login', String('user', 'alice'), Int('attempts', 3), Bool('success', true));

// Mix both styles as needed
logger.info('Mixed', String('typed', 'value'), 'key', 'value');
```

This matches Go's `slog.Info()` API exactly while preserving the option for explicit typing when needed.

**Go slog**: `slog.Info("msg", "key", value, "key2", value2)`
**jslog**: `info("msg", "key", value, "key2", value2)` ✅ Same API!

## Extended Feature Set

### 1. ColorHandler
ANSI color-coded console output for improved log readability during development and debugging.

```typescript
const logger = New(new ColorHandler());
logger.error("Critical error detected");
```

**Go slog equivalent**: Requires third-party packages or manual ANSI code implementation.

### 2. PrettyHandler
Format nested objects with proper indentation for human-readable output. Fully supports groups with proper prefix tracking.

```typescript
const logger = New(new PrettyHandler({
  handler: new ColorHandler(),
  indent: 2
}));

logger.info('Complex data', Any('user', {
  profile: { settings: { theme: 'dark' } }
}));

// Groups are properly tracked and displayed
const appLogger = logger.withGroup('app');
appLogger.info('Application event', { event: 'startup' });
// Output: app.event="startup"
```

**Go slog equivalent**: No built-in pretty formatting for nested objects.

### 3. FileHandler with Automatic Rotation
Built-in file logging with configurable size-based rotation and backup retention.

```typescript
const logger = New(new FileHandler({
  filepath: './logs/app.log',
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5, // Keep 5 backups
  format: 'json'
}));
```

**Go slog equivalent**: Requires external libraries like `lumberjack` or manual implementation.

### 4. BufferedHandler
Batched log writing for improved throughput in high-volume scenarios.

```typescript
const logger = New(new BufferedHandler({
  handler: new JSONHandler(),
  bufferSize: 100,
  flushInterval: 1000 // ms
}));
```

**Go slog equivalent**: Manual buffering implementation required.

### 5. SamplingHandler
Probabilistic sampling for managing log volume in high-traffic applications.

```typescript
const logger = New(new SamplingHandler({
  handler: new TextHandler(),
  rate: 0.1, // 10% of logs
  initialCount: 100 // Always log first 100
}));
```

**Go slog equivalent**: Custom wrapper implementation needed.

### 6. FilterHandler
Advanced filtering logic beyond basic level-based filtering.

```typescript
const logger = New(new FilterHandler({
  handler: new ColorHandler(),
  filter: (record) => record.level >= Level.ERROR || record.message.includes('critical')
}));
```

**Go slog equivalent**: Requires custom handler wrapper.

### 7. AsyncHandler
Non-blocking log operations with internal buffering and error handling.

```typescript
const logger = New(new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  errorHandler: (err) => console.error('Log error:', err)
}));
```

**Go slog equivalent**: While Go has goroutines, explicit async handler patterns require manual implementation.

### 8. Middleware Pattern
Composable handler middleware for cross-cutting logging concerns.

```typescript
const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    hostnameMiddleware(),
    pidMiddleware(),
    dedupeMiddleware(1000),
    rateLimitMiddleware(100)
  ]
}));
```

**Go slog equivalent**: Handler wrapping pattern must be manually implemented.

### 9. MetricsMiddleware
Built-in logging statistics and metrics collection.

```typescript
const metrics = new MetricsMiddleware();
const logger = New(new MiddlewareHandler({
  handler: new ColorHandler(),
  middleware: [metrics.middleware()]
}));

// Access metrics
console.log(metrics.getStats());
// { total: 1000, byLevel: { INFO: 500, ERROR: 100 }, errors: 100 }
```

**Go slog equivalent**: Manual metrics tracking implementation required.

### 10. Deduplication Middleware
Automatic detection and suppression of duplicate log entries within a time window.

```typescript
const logger = New(new MiddlewareHandler({
  handler: new ColorHandler(),
  middleware: [dedupeMiddleware(1000)] // 1 second window
}));
logger.info("Same message");
logger.info("Same message"); // Automatically suppressed
```

**Go slog equivalent**: Custom deduplication logic needed.

### 11. Rate Limiting Middleware
Built-in rate limiting to prevent log flooding.

```typescript
const logger = New(new MiddlewareHandler({
  handler: new ColorHandler(),
  middleware: [rateLimitMiddleware(100)] // Max 100/second
}));
```

**Go slog equivalent**: External rate limiting library or manual implementation.

### 12. Fluent Attribute Builder
Chainable API for constructing complex attribute sets.

```typescript
logger.info("User event", 
  ...attrs()
    .str("user", "alice")
    .num("age", 30)
    .bool("active", true)
    .if(isPremium, "tier", "premium")
    .from({ extra: "data" })
    .build()
);
```

**Go slog equivalent**: Standard attribute construction only.

### 13. Performance Timers
Integrated timing utilities for performance measurement.

```typescript
const timer = startTimer("db_query");
await db.query("SELECT * FROM users");
logger.info("Query complete", timer.elapsed());
// Logs: operation="45.23ms"
```

**Go slog equivalent**: Manual `time.Now()` usage and calculation.

### 14. Correlation ID Tracking
Global correlation ID management for distributed tracing.

```typescript
setCorrelationId("trace-123");
logger.info("Request 1", CorrelationId());
logger.info("Request 2", CorrelationId());
// Both logs include correlation_id="trace-123"
```

**Go slog equivalent**: Manual context propagation required.

### 15. HTTP Request/Response Helpers
Pre-built attribute helpers for web application logging.

```typescript
logger.info("Request", ...HttpReq({
  method: "POST",
  url: "/api/users",
  ip: "192.168.1.1"
}));

logger.info("Response", ...HttpRes({
  status: 200,
  duration: 45.23,
  size: 1024
}));
```

**Go slog equivalent**: Manual attribute construction for each field.

### 16. System Information Helpers
Built-in helpers for environment and resource usage logging.

```typescript
logger.info("App started", ...EnvInfo());
// node_version="v20.0.0" platform="linux" arch="x64" pid=12345

logger.warn("High memory", ...MemoryUsage());
// memory_rss="256MB" memory_heap_used="128MB"
```

**Go slog equivalent**: Manual extraction from `runtime` package.

### 17. Data Masking Utilities
Built-in PII redaction for sensitive data.

```typescript
logger.info("User signup",
  String("email", maskEmail("user@example.com")), // u***r@example.com
  String("cc", maskCreditCard("1234567890123456")) // ************3456
);
```

**Go slog equivalent**: Custom masking functions required.

### 18. Stack Traces & Caller Information
Automatic stack trace capture and source location tracking.

```typescript
logger.error("Crash", StackTrace());
logger.info("Debug", Caller());
// caller="/src/app.ts:42"
```

**Go slog equivalent**: `runtime.Caller` must be manually invoked.

### 19. Error Boundary Middleware
Graceful error handling to prevent handler failures from crashing the application.

```typescript
const logger = New(new MiddlewareHandler({
  handler: new ColorHandler(),
  middleware: [
    errorBoundaryMiddleware((err, record) => {
      console.error('Handler failed:', err);
    })
  ]
}));
```

**Go slog equivalent**: Manual recover/panic handling in custom wrappers.

### 20. SQL Query Helpers
Structured logging helpers for database operations.

```typescript
logger.info("Query executed", ...SqlQuery({
  query: "SELECT * FROM users WHERE active = true",
  params: [true],
  duration: 45.23, // duration in ms
  rows: 142        // rows returned
}));
```

**Go slog equivalent**: Manual attribute construction for SQL logging.

### 21. Safe Circular Reference Handling
Automatic detection and handling of circular object references in logged data.

```typescript
const obj: any = {};
obj.circular = obj;
logger.info("Complex object", Any("data", obj));
// Safely handles circular references without errors
```

**Go slog equivalent**: Would cause runtime panic without custom serialization.

## Comprehensive Feature Matrix

| Feature | jslog | Go slog | Notes |
|---------|-------|---------|-------|
| Basic logging | Yes | Yes | Core functionality |
| Log levels | Yes | Yes | DEBUG, INFO, WARN, ERROR |
| Structured attributes | Yes | Yes | Key-value pairs |
| Text handler | Yes | Yes | Human-readable output |
| JSON handler | Yes | Yes | Machine-parseable output |
| Color output | Yes | No | Requires third-party library in Go |
| Pretty formatting | Yes | No | Nested object indentation |
| File logging | Yes | No | Requires external package in Go |
| Log rotation | Yes | No | Manual implementation in Go |
| Buffering | Yes | No | Performance optimization |
| Sampling | Yes | No | High-volume scenarios |
| Advanced filtering | Yes | No | Beyond level-based |
| Async handlers | Yes | No | Non-blocking I/O |
| Middleware pattern | Yes | No | Composable handlers |
| Built-in metrics | Yes | No | Usage statistics |
| Deduplication | Yes | No | Spam prevention |
| Rate limiting | Yes | No | Flood protection |
| Fluent API | Yes | No | Chainable attributes |
| Performance timers | Yes | No | Built-in timing |
| Correlation IDs | Yes | No | Distributed tracing |
| HTTP helpers | Yes | No | Web logging utilities |
| System info | Yes | No | Environment details |
| Data masking | Yes | No | PII protection |
| Error boundaries | Yes | No | Fault isolation |
| Circular ref handling | Yes | No | Safe serialization |

## Summary

While Go's `log/slog` provides a solid foundation for structured logging with excellent performance characteristics, jslog extends this foundation with production-ready features that would otherwise require significant additional implementation effort or third-party libraries in Go.

### Key Advantages of jslog

1. **Batteries Included**: Advanced features like file rotation, buffering, and sampling are built-in rather than requiring external dependencies.

2. **Middleware Architecture**: Composable handler middleware enables clean separation of cross-cutting concerns like metrics, deduplication, and rate limiting.

3. **Developer Experience**: Features like color output, fluent APIs, and specialized helpers (HTTP, SQL, masking) reduce boilerplate and improve code readability.

4. **Production Ready**: Built-in metrics, error boundaries, and async handlers provide essential capabilities for high-scale production deployments.

## Performance Characteristics

**Bundle Size**: ~30KB minified (ESM), including all advanced features

**Runtime Overhead**: Minimal when using async handlers and buffering for high-throughput scenarios

**Memory Footprint**: Configurable through buffer sizes and sampling rates

## Ecosystem Integration

jslog is designed to work seamlessly with:
- Express.js and other Node.js web frameworks
- TypeScript projects (full type safety included)
- Containerized applications (Docker, Kubernetes)
- Serverless environments (AWS Lambda, Azure Functions)
- Monitoring systems (via JSON output and custom handlers)

## Conclusion

jslog provides a comprehensive logging solution for Node.js applications that matches Go's slog for core functionality while extending it with features commonly needed in production environments. The additional capabilities reduce implementation time and maintenance burden for development teams.

## Acknowledgments

This library was inspired by Go's excellent `log/slog` package. We appreciate the thoughtful design decisions made by the Go team in creating a modern structured logging API.
