# @omdxp/jslog

A structured logging library for Node.js that makes Go's `log/slog` look basic.

## Why jslog?

- Everything Go's slog has
- Plus 20+ features Go slog doesn't have
- File logging with auto-rotation
- Buffering, sampling, filtering
- Async handlers
- Middleware pattern
- Metrics collection
- Rate limiting & deduplication
- Colorful output
- And way more...

See full comparison in [SUPERIORITY.md](./SUPERIORITY.md)

## Features

### Core Features (Like Go slog)
- **Structured Logging**: Key-value pairs for easy parsing and analysis
- **Multiple Handlers**: JSON, Text, Multi, and Discard handlers
- **Log Levels**: DEBUG, INFO, WARN, ERROR with dynamic level control
- **Contextual Logging**: Add persistent attributes and groups to loggers
- **TypeScript First**: Full type safety and IntelliSense support
- **Modern Build System**: Built with tsup and tsx
- **Custom Handlers**: Easy to implement custom log handlers
- **Attribute Transformation**: ReplaceAttr function for redacting or transforming values
- **Rich Attribute Types**: String, Int, Float, Bool, Time, Duration, Group, Error, and more
- **Nested Groups**: Organize related attributes hierarchically
- **Dynamic Levels**: Change log levels at runtime with LevelVar

### Advanced Features (Go slog can't do this!)
- **ColorHandler**: Beautiful, colorful console output
- **FileHandler**: Write to files with automatic rotation
- **BufferedHandler**: Batch logs for performance
- **SamplingHandler**: Log only a percentage of messages
- **FilterHandler**: Conditional logging based on custom logic
- **AsyncHandler**: Non-blocking log operations
- **Middleware Pattern**: Compose handlers with middleware
- **Metrics**: Built-in logging statistics
- **Deduplication**: Prevent log spam automatically
- **Rate Limiting**: Automatic rate limiting
- **Fluent API**: Chain attributes with AttrBuilder
- **Performance Timers**: Built-in timing utilities
- **Correlation IDs**: Global request/trace tracking
- **HTTP Helpers**: Easy request/response logging
- **System Info**: Environment and memory helpers
- **Data Masking**: Built-in PII redaction
- **Stack Traces**: Automatic stack trace capture
- **Error Boundaries**: Catch handler errors safely

## Installation

```bash
npm install @omdxp/jslog
```

## Quick Start

```typescript
import { info, warn, error, String, Int } from '@omdxp/jslog';

// Simple logging
info('Application started', String('env', 'production'), Int('port', 3000));
warn('High memory usage', Int('percentage', 85));
error('Failed to connect', String('host', 'localhost'));
```

## Usage

### Basic Logging

```typescript
import { Logger, TextHandler, Level, String, Int } from '@omdxp/jslog';

const logger = new Logger(new TextHandler({ level: Level.DEBUG }));

logger.info('User logged in', String('user', 'alice'), String('ip', '192.168.1.1'));
logger.warn('Rate limit exceeded', Int('requests', 1000));
logger.error('Database connection failed', String('error', 'timeout'));
```

### All Attribute Types

```typescript
import { String, Int, Int64, Float64, Bool, Time, Duration, Any, Group } from '@omdxp/jslog';

logger.info('Event',
  String('name', 'user.created'),
  Int('userId', 42),
  Int64('bigNumber', 9007199254740991),
  Float64('score', 98.5),
  Bool('verified', true),
  Time('createdAt', new Date()),
  Duration('elapsed', 1500), // in milliseconds
  Any('metadata', { plan: 'pro' }),
  Group('address', 
    String('city', 'NYC'),
    String('country', 'USA')
  )
);
```

### JSON Output

```typescript
import { JSONHandler, New } from '@omdxp/jslog';

const logger = New(new JSONHandler());
logger.info('Request processed', String('method', 'GET'), Int('status', 200));
// Output: {"time":"2024-01-01T00:00:00.000Z","level":"INFO","msg":"Request processed","method":"GET","status":200}
```

### Contextual Logging

```typescript
// Add persistent attributes
const requestLogger = logger.with(String('request_id', '123-456'));
requestLogger.info('Processing request');
requestLogger.info('Request completed');

// Group related attributes
const dbLogger = logger.withGroup('database');
dbLogger.info('Connected', String('host', 'localhost'));
// Output: time=... level=INFO msg="Connected" database.host="localhost"
```

### Attribute Helpers

```typescript
import { String, Int, Bool, Any, Error as ErrorAttr } from '@omdxp/jslog';

logger.info('Event',
  String('name', 'user.created'),
  Int('userId', 42),
  Bool('verified', true),
  Any('metadata', { plan: 'pro' })
);

try {
  throw new Error('Something went wrong');
} catch (err) {
  logger.error('Operation failed', ErrorAttr(err as Error));
}
```

### Dynamic Log Levels

```typescript
import { LevelVar, TextHandler } from '@omdxp/jslog';

const levelVar = new LevelVar(Level.INFO);
const logger = new Logger(new TextHandler({ level: levelVar }));

logger.debug('Not visible'); // Won't show
logger.info('Visible');      // Will show

// Change level at runtime
levelVar.set(Level.DEBUG);
logger.debug('Now visible!'); // Will show
```

### Multiple Handlers

```typescript
import { MultiHandler, TextHandler, JSONHandler } from '@omdxp/jslog';

const textHandler = new TextHandler({ level: Level.INFO });
const jsonHandler = new JSONHandler({ level: Level.WARN });
const multiHandler = new MultiHandler([textHandler, jsonHandler]);

const logger = new Logger(multiHandler);
logger.info('Only in text');        // TextHandler only
logger.warn('In both formats');     // Both handlers
logger.error('In both formats');    // Both handlers
```

### Attribute Transformation

```typescript
import { TextHandler } from '@omdxp/jslog';

const logger = new Logger(new TextHandler({
  level: Level.INFO,
  replaceAttr: (groups, attr) => {
    // Redact sensitive fields
    if (attr.key === 'password' || attr.key === 'token') {
      return { key: attr.key, value: '***REDACTED***' };
    }
    // Transform time format
    if (attr.key === 'time' && attr.value instanceof Date) {
      return { key: attr.key, value: attr.value.toLocaleString() };
    }
    return attr;
  }
}));

logger.info('Login', String('user', 'alice'), String('password', 'secret'));
// Output: ... user="alice" password="***REDACTED***"
```

### Discard Handler

```typescript
import { DiscardHandler } from '@omdxp/jslog';

// Useful for benchmarking or disabling logging
const logger = new Logger(new DiscardHandler());
logger.info('This will be discarded'); // No output
```

## API Reference

### Loggers

- `Default()` - Get the default logger
- `SetDefault(logger)` - Set the default logger
- `New(handler)` - Create a new logger with a handler

### Log Levels

```typescript
enum Level {
  DEBUG = -4,
  INFO = 0,
  WARN = 4,
  ERROR = 8,
}
```

### Handlers

- `TextHandler` - Human-readable text format
- `JSONHandler` - Structured JSON format
- `MultiHandler` - Send to multiple handlers
- `DiscardHandler` - Discard all logs (for testing/benchmarking)

### Handler Options

```typescript
interface HandlerOptions {
  level?: Level | LevelVar;           // Minimum log level
  addSource?: boolean;                // Add source location (future)
  replaceAttr?: (groups, attr) => Attr; // Transform attributes
}
```

### Logger Methods

- `log(level, msg, ...attrs)` - Log at specific level
- `logAttrs(level, msg, ...attrs)` - Efficient logging variant
- `debug(msg, ...attrs)` - Log at DEBUG level
- `debugContext(msg, ...attrs)` - Debug with context (future)
- `info(msg, ...attrs)` - Log at INFO level
- `infoContext(msg, ...attrs)` - Info with context (future)
- `warn(msg, ...attrs)` - Log at WARN level
- `warnContext(msg, ...attrs)` - Warn with context (future)
- `error(msg, ...attrs)` - Log at ERROR level
- `errorContext(msg, ...attrs)` - Error with context (future)
- `with(...attrs)` - Create logger with persistent attributes
- `withGroup(name)` - Create logger with attribute group
- `enabled(level)` - Check if level is enabled

### Attribute Functions

- `String(key, value)` - String attribute
- `Int(key, value)` - Integer attribute
- `Int64(key, value)` - 64-bit integer attribute
- `Uint64(key, value)` - Unsigned 64-bit integer attribute
- `Float64(key, value)` - Float attribute
- `Bool(key, value)` - Boolean attribute
- `Time(key, date)` - Date/time attribute
- `Duration(key, ms)` - Duration in milliseconds
- `Any(key, value)` - Any value attribute
- `Group(key, ...attrs)` - Group attributes
- `Error(err)` - Error attribute with stack trace
- `attr(key, value)` - Generic attribute constructor

### Convenience Functions

- `debug(msg, ...attrs)` - Log at DEBUG level
- `debugContext(msg, ...attrs)` - Debug with context
- `info(msg, ...attrs)` - Log at INFO level
- `infoContext(msg, ...attrs)` - Info with context
- `warn(msg, ...attrs)` - Log at WARN level
- `warnContext(msg, ...attrs)` - Warn with context
- `error(msg, ...attrs)` - Log at ERROR level
- `errorContext(msg, ...attrs)` - Error with context
- `log(level, msg, ...attrs)` - Log at specific level
- `logAttrs(level, msg, ...attrs)` - Efficient variant
- `with_(...attrs)` - Get default logger with attributes
- `withGroup(name)` - Get default logger with group

## Development

```bash
# Install dependencies
npm install

# Run basic example
npm test

# Run advanced features example
npm run test:advanced

# Build
npm run build

# Type check
npm run typecheck

# Watch mode for development
npm run dev
```

## Comparison with Go's log/slog

This library closely mirrors Go's `log/slog` API:


| Go slog             | jslog                | Status        |
| ------------------- | -------------------- | ------------- |
| `slog.Debug()`      | `debug()`            | Implemented   |
| `slog.Info()`       | `info()`             | Implemented   |
| `slog.Warn()`       | `warn()`             | Implemented   |
| `slog.Error()`      | `error()`            | Implemented   |
| `slog.New()`        | `New()`              | Implemented   |
| `slog.Default()`    | `Default()`          | Implemented   |
| `slog.SetDefault()` | `SetDefault()`       | Implemented   |
| `slog.With()`       | `logger.with()`      | Implemented   |
| `slog.WithGroup()`  | `logger.withGroup()` | Implemented   |
| `slog.String()`     | `String()`           | Implemented   |
| `slog.Int()`        | `Int()`              | Implemented   |
| `slog.Bool()`       | `Bool()`             | Implemented   |
| `slog.Time()`       | `Time()`             | Implemented   |
| `slog.Duration()`   | `Duration()`         | Implemented   |
| `slog.Group()`      | `Group()`            | Implemented   |
| `slog.Any()`        | `Any()`              | Implemented   |
| `slog.TextHandler`  | `TextHandler`        | Implemented   |
| `slog.JSONHandler`  | `JSONHandler`        | Implemented   |
| `slog.Level`        | `Level`              | Implemented   |
| `slog.LevelVar`     | `LevelVar`           | Implemented   |
| `Handler` interface | `Handler`            | Implemented   |
| `ReplaceAttr`       | `replaceAttr` option | Implemented   |

## Inspiration

This library is inspired by Go's [`log/slog`](https://pkg.go.dev/log/slog) package, bringing structured logging patterns to the Node.js ecosystem.

## License

[MIT License](./LICENSE)
