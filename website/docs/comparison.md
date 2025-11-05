---
sidebar_position: 10
---

# jslog vs Go slog

How jslog compares to Go's log/slog package.

## Core Compatibility

jslog implements the complete Go slog API:

| Feature | Go slog | jslog | Status |
|---------|---------|-------|--------|
| `slog.Debug()` | Yes | Yes | Implemented |
| `slog.Info()` | Yes | Yes | Implemented |
| `slog.Warn()` | Yes | Yes | Implemented |
| `slog.Error()` | Yes | Yes | Implemented |
| `slog.New()` | Yes | Yes | Implemented |
| `slog.Default()` | Yes | Yes | Implemented |
| `slog.SetDefault()` | Yes | Yes | Implemented |
| `slog.With()` | Yes | Yes | Implemented |
| `slog.WithGroup()` | Yes | Yes | Implemented |
| `slog.TextHandler` | Yes | Yes | Implemented |
| `slog.JSONHandler` | Yes | Yes | Implemented |
| `slog.Level` | Yes | Yes | Implemented |
| `slog.LevelVar` | Yes | Yes | Implemented |
| `Handler` interface | Yes | Yes | Implemented |
| `ReplaceAttr` | Yes | Yes | Implemented |

## Features jslog Has That Go slog Doesn't

### 1. ColorHandler
Beautiful ANSI color-coded console output:

```typescript
const logger = New(new ColorHandler());
logger.error('Critical error detected');  // Red!
```

**Go slog**: Requires third-party packages.

### 2. PrettyHandler
Format nested objects with proper indentation for readable output:

```typescript
const logger = New(new PrettyHandler({
  handler: new ColorHandler(),
  indent: 2
}));
logger.info('Complex data', Any('user', {
  profile: { settings: { theme: 'dark' } }
}));
```

**Go slog**: No built-in pretty formatting for nested objects.

### 3. FileHandler with Rotation
Built-in file logging with automatic rotation:

```typescript
const logger = New(new FileHandler({
  filepath: './logs/app.log',
  maxSize: 10 * 1024 * 1024,  // 10MB
  maxFiles: 5
}));
```

**Go slog**: Requires external libraries like `lumberjack`.

### 4. BufferedHandler
Batch log writing for better performance:

```typescript
const logger = New(new BufferedHandler({
  handler: new JSONHandler(),
  bufferSize: 100,
  flushInterval: 1000
}));
```

**Go slog**: Manual buffering implementation required.

### 5. SamplingHandler
Probabilistic sampling for high-traffic apps:

```typescript
const logger = New(new SamplingHandler({
  handler: new TextHandler(),
  rate: 0.1  // Log 10% of messages
}));
```

**Go slog**: Custom handler wrapper needed.

### 6. FilterHandler
Advanced filtering beyond level-based filtering:

```typescript
const logger = New(new FilterHandler({
  handler: new ColorHandler(),
  filter: (record) => record.level >= Level.ERROR || record.message.includes('critical')
}));
```

**Go slog**: Custom handler implementation required.

### 7. AsyncHandler
Non-blocking log operations:

```typescript
const logger = New(new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  errorHandler: (err) => console.error('Log error:', err)
}));
```

**Go slog**: While Go has goroutines, explicit async patterns require manual setup.

### 8. Middleware Pattern
Composable handler middleware:

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

**Go slog**: Handler wrapping pattern must be manually implemented.

### 9. Built-in Metrics
Automatic logging statistics:

```typescript
const metrics = new MetricsMiddleware();
const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [metrics.middleware()]
}));

// Later...
console.log(metrics.getStats());
```

**Go slog**: No built-in metrics.

### 10. Deduplication
Automatic spam prevention:

```typescript
const logger = New(new MiddlewareHandler({
  handler: new ColorHandler(),
  middleware: [dedupeMiddleware(1000)]
}));

logger.info('Repeated message');  // Shows
logger.info('Repeated message');  // Deduplicated!
```

**Go slog**: Manual implementation needed.

### 11. Rate Limiting
Automatic rate limiting:

```typescript
const logger = New(new MiddlewareHandler({
  handler: new TextHandler(),
  middleware: [rateLimitMiddleware(100)]  // Max 100/second
}));
```

**Go slog**: Manual rate limiting required.

### 12. Fluent Attribute Builder
Chain attributes easily:

```typescript
const attrs = attrs()
  .str('user', 'alice')
  .num('age', 30)
  .bool('active', true)
  .if(condition, 'conditional', 'value')
  .build();

logger.info('User created', ...attrs);
```

**Go slog**: No fluent API.

### 13. Performance Timers
Built-in timing utilities:

```typescript
const timer = startTimer('operation');
// ... do work ...
logger.info('Operation complete', timer.elapsed());
```

**Go slog**: Manual timer implementation needed.

### 14. Correlation IDs
Global request/trace tracking:

```typescript
setCorrelationId('trace-123');

logger.info('Request 1', CorrelationId());  // Includes trace-123
logger.info('Request 2', CorrelationId());  // Includes trace-123
```

**Go slog**: Manual context management required.

### 15. HTTP Helpers
Easy request/response logging:

```typescript
logger.info('HTTP request', ...HttpReq({
  method: 'POST',
  url: '/api/users',
  ip: '192.168.1.1'
}));

logger.info('HTTP response', ...HttpRes({
  status: 201,
  duration: 45,
  size: 1024
}));
```

**Go slog**: Manual attribute construction.

### 16. System Info
Environment and memory helpers:

```typescript
logger.info('App started', ...EnvInfo());
logger.info('Memory status', ...MemoryUsage());
```

**Go slog**: Manual info gathering.

### 17. Data Masking
Built-in PII redaction:

```typescript
logger.info('User data',
  String('email', maskEmail('alice@example.com')),  // a***@example.com
  String('card', maskCreditCard('4532-1234-5678-9010'))  // ****-****-****-9010
);
```

**Go slog**: Manual masking functions needed.

### 18. Stack Traces
Automatic stack trace capture:

```typescript
logger.error('Error occurred', StackTrace());
```

**Go slog**: Manual stack trace capture.

### 19. Caller Info
Automatic source location:

```typescript
logger.info('Log with caller', Caller());
// Includes file and line number
```

**Go slog**: Has `addSource` but limited.

### 20. Error Boundaries
Catch handler errors safely:

```typescript
const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [errorBoundaryMiddleware()]
}));
```

**Go slog**: Manual error handling needed.

### 21. Circular Reference Handling
Safe JSON serialization:

```typescript
const circular = { a: 1 };
circular.self = circular;

logger.info('Data', Any('obj', circular));  // Safely handled!
```

**Go slog**: Would panic on circular references.

## Summary

jslog gives you **everything Go's slog has**, plus **21+ additional features** specifically designed for Node.js production environments!

### When to Use jslog

**You should use jslog if:**
- You want Go's slog API in Node.js
- You need production-ready logging features
- You want file rotation, buffering, sampling
- You need async handlers and middleware
- You want built-in utilities and helpers

**You came from Go and want familiar logging:**
- API-compatible with Go's slog
- Same mental model and patterns
- Easy transition for Go developers

## Next Steps

- **[Getting Started](./getting-started/installation)** - Install and start using jslog
- **[Core Concepts](./core-concepts/loggers)** - Learn the fundamentals
- **[Advanced Features](./advanced/file-handler)** - Explore advanced handlers
