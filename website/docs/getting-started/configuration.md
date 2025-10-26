---
sidebar_position: 3
---

# Configuration

Configure jslog for your production environment.

## Log Levels

jslog supports four log levels, matching Go's slog:

```typescript
enum Level {
  DEBUG = -4,  // Detailed debug information
  INFO = 0,    // General informational messages
  WARN = 4,    // Warning messages
  ERROR = 8,   // Error messages
}
```

### Setting the Level

```typescript
import { Logger, TextHandler, Level } from '@omdxp/jslog';

// Only log WARN and ERROR
const logger = new Logger(new TextHandler({ level: Level.WARN }));

logger.debug('This will not show');
logger.info('This will not show');
logger.warn('This will show!');
logger.error('This will show!');
```

## Dynamic Level Control

Change log levels at runtime with `LevelVar`:

```typescript
import { LevelVar, Logger, TextHandler, Level } from '@omdxp/jslog';

const levelVar = new LevelVar(Level.INFO);
const logger = new Logger(new TextHandler({ level: levelVar }));

logger.debug('Not visible');  // Won't show
logger.info('Visible');       // Will show

// Change level dynamically (e.g., via API endpoint)
levelVar.set(Level.DEBUG);
logger.debug('Now visible!'); // Will show
```

## Handler Options

### TextHandler Options

```typescript
import { TextHandler, Level } from '@omdxp/jslog';

const handler = new TextHandler({
  level: Level.INFO,
  addSource: true,  // Add source location info
  replaceAttr: (groups, attr) => {
    // Transform or redact attributes
    if (attr.key === 'password') {
      return { key: attr.key, value: '***REDACTED***' };
    }
    return attr;
  }
});
```

### JSONHandler Options

```typescript
import { JSONHandler, Level } from '@omdxp/jslog';

const handler = new JSONHandler({
  level: Level.INFO,
  addSource: false,
  replaceAttr: (groups, attr) => {
    // Rename keys for external systems
    if (attr.key === 'msg') {
      return { key: 'message', value: attr.value };
    }
    return attr;
  }
});
```

## Environment-Based Configuration

```typescript
import { Logger, TextHandler, JSONHandler, Level } from '@omdxp/jslog';

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || 'INFO';

const handler = isDevelopment 
  ? new TextHandler({ level: Level[logLevel] })
  : new JSONHandler({ level: Level[logLevel] });

const logger = new Logger(handler);
```

## Multiple Handlers

Send logs to multiple destinations:

```typescript
import { Logger, MultiHandler, TextHandler, JSONHandler, FileHandler, Level } from '@omdxp/jslog';

const multiHandler = new MultiHandler([
  new TextHandler({ level: Level.DEBUG }),  // Console in text format
  new JSONHandler({ level: Level.INFO }),   // Console in JSON format
  new FileHandler({                          // File with rotation
    filepath: './logs/app.log',
    level: Level.WARN,
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  })
]);

const logger = new Logger(multiHandler);
```

## Default Logger

Configure the default logger for your application:

```typescript
import { SetDefault, New, ColorHandler, Level } from '@omdxp/jslog';

// Set up your default logger once at app startup
const defaultLogger = New(new ColorHandler({ level: Level.DEBUG }));
SetDefault(defaultLogger);

// Now use convenience functions anywhere
import { info, error, String } from '@omdxp/jslog';

info('Using default logger', String('configured', 'true'));
```

## Next Steps

- **[Handlers](../core-concepts/handlers)** - Explore all available handlers
- **[Advanced Features](../advanced/file-handler)** - File logging, buffering, and more
