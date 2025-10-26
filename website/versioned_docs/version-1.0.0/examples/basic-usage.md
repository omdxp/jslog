---
sidebar_position: 1
---

# Basic Usage

Simple examples to get you started with jslog.

## Hello World

The simplest possible logging:

```typescript
import { info } from '@omdxp/jslog';

info('Hello, World!');
// Output: time=2024-01-01T00:00:00.000Z level=INFO msg="Hello, World!"
```

## With Attributes

Add structured data to your logs:

```typescript
import { info, String, Int, Bool } from '@omdxp/jslog';

info('User logged in',
  String('user', 'alice'),
  String('ip', '192.168.1.1'),
  Int('session_duration', 3600),
  Bool('remember_me', true)
);
```

## All Log Levels

```typescript
import { debug, info, warn, error, String } from '@omdxp/jslog';

debug('Debugging info', String('state', 'initializing'));
info('Application started', String('version', '1.0.0'));
warn('Deprecated API used', String('api', '/v1/users'));
error('Connection failed', String('host', 'db.example.com'));
```

## Custom Logger

Create your own logger instance:

```typescript
import { Logger, JSONHandler, Level, String } from '@omdxp/jslog';

const logger = new Logger(new JSONHandler({ level: Level.INFO }));

logger.info('Custom logger', String('type', 'json'));
// Output: {"time":"2024-01-01T00:00:00.000Z","level":"INFO","msg":"Custom logger","type":"json"}
```

## With Persistent Context

Add context that persists across log calls:

```typescript
import { New, TextHandler, String, Int } from '@omdxp/jslog';

const logger = New(new TextHandler());

// Create a request-scoped logger
const requestLogger = logger.with(
  String('request_id', 'req-123'),
  String('user_id', 'user-456')
);

requestLogger.info('Request received');
requestLogger.info('Processing data', Int('records', 42));
requestLogger.info('Request completed');
// All three logs include request_id and user_id
```

## Error Handling

Log errors with full stack traces:

```typescript
import { error, Err, String } from '@omdxp/jslog';

try {
  throw new Error('Something went wrong!');
} catch (err) {
  error('Operation failed',
    Err(err as Error),
    String('operation', 'database_query')
  );
}
// Includes full error details and stack trace
```

## Grouped Attributes

Organize related data:

```typescript
import { info, Group, String, Int } from '@omdxp/jslog';

info('User created',
  Group('user',
    String('id', 'u123'),
    String('email', 'alice@example.com'),
    String('role', 'admin')
  ),
  Group('metadata',
    String('created_by', 'system'),
    Int('version', 1)
  )
);
```

## Conditional Logging

Only log when level is enabled:

```typescript
import { New, TextHandler, Level, Any } from '@omdxp/jslog';

const logger = New(new TextHandler({ level: Level.INFO }));

// Avoid expensive operations when DEBUG is disabled
if (logger.enabled(Level.DEBUG)) {
  const debugData = computeExpensiveDebugInfo();
  logger.debug('Debug info', Any('data', debugData));
}
```

## Environment-Based Configuration

Different logging for different environments:

```typescript
import { Logger, TextHandler, JSONHandler, ColorHandler, Level } from '@omdxp/jslog';

const env = process.env.NODE_ENV || 'development';

let handler;
if (env === 'production') {
  handler = new JSONHandler({ level: Level.INFO });
} else if (env === 'test') {
  handler = new DiscardHandler();
} else {
  handler = new ColorHandler({ level: Level.DEBUG });
}

const logger = new Logger(handler);
```

## Multiple Handlers

Log to multiple destinations:

```typescript
import { Logger, MultiHandler, ColorHandler, FileHandler, Level } from '@omdxp/jslog';

const handler = new MultiHandler([
  // Colorful console output for developers
  new ColorHandler({ level: Level.DEBUG }),
  
  // JSON file for production analysis
  new FileHandler({
    filepath: './logs/app.log',
    level: Level.INFO,
    format: 'json'
  })
]);

const logger = new Logger(handler);

logger.debug('Debug to console only');
logger.info('Info to both console and file');
logger.error('Error to both console and file');
```

## Next Steps

- **[Core Concepts](../core-concepts/loggers)** - Deep dive into core concepts
- **[Advanced Features](../advanced/file-handler)** - Explore advanced handlers
- **[API Reference](../api/overview)** - Complete API documentation
