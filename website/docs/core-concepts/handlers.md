---
sidebar_position: 2
---

# Handlers

Handlers determine how and where log records are processed and output.

## What is a Handler?

A `Handler` is an interface that processes log records. jslog comes with several built-in handlers:

- `TextHandler` - Human-readable text output
- `JSONHandler` - Structured JSON output
- `ColorHandler` - Colorful console output
- `FileHandler` - Write to files with rotation
- `MultiHandler` - Send to multiple handlers
- `DiscardHandler` - Discard all logs
- And many more advanced handlers!

## Handler Interface

All handlers implement this interface:

```typescript
interface Handler {
  enabled(level: Level): boolean;
  handle(record: Record): void;
  withAttrs(attrs: Attr[]): Handler;
  withGroup(name: string): Handler;
}
```

## Built-in Handlers

### TextHandler

Human-readable text format, perfect for development:

```typescript
import { Logger, TextHandler, Level } from '@omdxp/jslog';

const logger = new Logger(new TextHandler({
  level: Level.DEBUG,
  addSource: false,
  replaceAttr: (groups, attr) => {
    // Optional attribute transformation
    return attr;
  }
}));

logger.info('User logged in', String('user', 'alice'));
// Output: time=2024-01-01T00:00:00.000Z level=INFO msg="User logged in" user="alice"
```

### JSONHandler

Structured JSON output, ideal for production:

```typescript
import { Logger, JSONHandler, Level } from '@omdxp/jslog';

const logger = new Logger(new JSONHandler({ level: Level.INFO }));

logger.info('Request processed', String('method', 'GET'), Int('status', 200));
// Output: {"time":"2024-01-01T00:00:00.000Z","level":"INFO","msg":"Request processed","method":"GET","status":200}
```

### ColorHandler

Beautiful, colorful console output:

```typescript
import { Logger, ColorHandler } from '@omdxp/jslog';

const logger = new Logger(new ColorHandler({
  colorize: true,  // Enable colors
  level: Level.DEBUG
}));

logger.debug('Debug message');  // Cyan
logger.info('Info message');    // Green
logger.warn('Warning message'); // Yellow
logger.error('Error message');  // Red
```

### MultiHandler

Send logs to multiple handlers simultaneously:

```typescript
import { Logger, MultiHandler, TextHandler, JSONHandler, FileHandler } from '@omdxp/jslog';

const handler = new MultiHandler([
  new TextHandler({ level: Level.DEBUG }),
  new JSONHandler({ level: Level.INFO }),
  new FileHandler({ 
    filepath: './logs/app.log',
    level: Level.WARN
  })
]);

const logger = new Logger(handler);
```

#### Graceful Shutdown with MultiHandler

MultiHandler automatically closes all wrapped handlers that support it:

```typescript
import { MultiHandler, FileHandler, BufferedHandler, AsyncHandler, JSONHandler } from '@omdxp/jslog';

const multiHandler = new MultiHandler([
  new FileHandler({ filepath: './logs/app.log' }),
  new BufferedHandler({ 
    handler: new JSONHandler(),
    bufferSize: 100 
  }),
  new AsyncHandler({ 
    handler: new FileHandler({ filepath: './logs/async.log' })
  })
]);

const logger = new Logger(multiHandler);

// On shutdown, close all handlers at once
process.on('SIGTERM', async () => {
  // This calls close() on FileHandler, BufferedHandler, and AsyncHandler
  await multiHandler.close();
  process.exit(0);
});
```

The `close()` method cascades to all wrapped handlers, ensuring:
- File streams are closed
- Buffers are flushed
- Timers are cleared
- Async operations complete

### DiscardHandler

Discard all logs (useful for testing or benchmarking):

```typescript
import { Logger, DiscardHandler } from '@omdxp/jslog';

const logger = new Logger(new DiscardHandler());
logger.info('This will be discarded');  // No output
```

## Handler Options

### Common Options

All handlers support these options:

```typescript
interface HandlerOptions {
  level?: Level | LevelVar;           // Minimum log level
  addSource?: boolean;                // Add source location
  replaceAttr?: (groups, attr) => Attr; // Transform attributes
}
```

### replaceAttr Function

Transform or redact attributes:

```typescript
const handler = new TextHandler({
  replaceAttr: (groups, attr) => {
    // Redact sensitive data
    if (attr.key === 'password' || attr.key === 'token') {
      return { key: attr.key, value: '***REDACTED***' };
    }
    
    // Rename keys
    if (attr.key === 'msg') {
      return { key: 'message', value: attr.value };
    }
    
    // Format dates
    if (attr.key === 'time' && attr.value instanceof Date) {
      return { key: attr.key, value: attr.value.toISOString() };
    }
    
    return attr;
  }
});
```

## Creating Custom Handlers

Implement the `Handler` interface:

```typescript
import { Handler, Record, Level, Attr } from '@omdxp/jslog';

class CustomHandler implements Handler {
  constructor(private level: Level = Level.INFO) {}

  enabled(level: Level): boolean {
    return level >= this.level;
  }

  handle(record: Record): void {
    // Process the log record
    console.log('Custom handler:', record.message);
  }

  withAttrs(attrs: Attr[]): Handler {
    // Return new handler with additional attributes
    return this;
  }

  withGroup(name: string): Handler {
    // Return new handler with group
    return this;
  }
}

// Use it
const logger = new Logger(new CustomHandler());
```

## Handler Patterns

### Development vs Production

```typescript
const isDev = process.env.NODE_ENV === 'development';

const handler = isDev
  ? new ColorHandler({ level: Level.DEBUG })
  : new JSONHandler({ level: Level.INFO });

const logger = new Logger(handler);
```

### Multiple Destinations

```typescript
const handler = new MultiHandler([
  // Console for immediate feedback
  new ColorHandler({ level: Level.INFO }),
  
  // File for persistence
  new FileHandler({
    filepath: './logs/app.log',
    level: Level.WARN,
    format: 'json'
  })
]);
```

### Conditional Logging

```typescript
const shouldLog = process.env.ENABLE_LOGGING === 'true';

const handler = shouldLog
  ? new JSONHandler({ level: Level.INFO })
  : new DiscardHandler();

const logger = new Logger(handler);
```

## Next Steps

- **[Advanced Handlers](../advanced/file-handler)** - File logging and more
- **[Attributes](./attributes)** - Understanding log attributes
- **[Examples](../examples/basic-usage)** - See handlers in action
