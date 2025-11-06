---
sidebar_position: 2
---

# Quick Start

Get up and running with jslog in 5 minutes!

## Your First Logger

```typescript
import { Logger, TextHandler, Level, String, Int } from '@omdxp/jslog';

// Create a logger
const logger = new Logger(new TextHandler({ level: Level.INFO }));

// NEW in v1.7.0: Go slog-style variadic parameters!
logger.info('User logged in', 'user', 'alice', 'ip', '192.168.1.1');
logger.warn('High CPU usage', 'percentage', 85);
logger.error('Database connection failed', 'error', 'timeout');

// Traditional style also works
logger.info('User logged in', String('user', 'alice'), String('ip', '192.168.1.1'));
```

Output:
```
time=2024-01-01T12:00:00.000Z level=INFO msg="User logged in" user="alice" ip="192.168.1.1"
time=2024-01-01T12:00:01.000Z level=WARN msg="High CPU usage" percentage=85
time=2024-01-01T12:00:02.000Z level=ERROR msg="Database connection failed" error="timeout"
```

## Using the Default Logger

For quick scripts, use the convenience functions:

```typescript
import { info, warn, error, String, Int } from '@omdxp/jslog';

// Go slog-style (NEW in v1.7.0!)
info('Application started', 'env', 'production', 'port', 3000);
warn('Memory usage high', 'usage', 512);
error('Failed to connect', 'host', 'localhost');

// Traditional style
info('Application started', String('env', 'production'), Int('port', 3000));

// Mix both styles if needed
info('Mixed', String('typed', 'value'), 'key', 'value');
```

## JSON Output

For production environments, JSON output is preferred:

```typescript
import { Logger, JSONHandler, Level, String, Int, Bool } from '@omdxp/jslog';

const logger = new Logger(new JSONHandler({ level: Level.INFO }));

// Go slog-style variadic (NEW in v1.7.0!)
logger.info('Request processed', 'method', 'POST', 'path', '/api/users', 'status', 201, 'cached', false);

// Traditional style
logger.info('Request processed',
  String('method', 'POST'),
  String('path', '/api/users'),
  Int('status', 201),
  Bool('cached', false)
);
```

Output:
```json
{"time":"2024-01-01T12:00:00.000Z","level":"INFO","msg":"Request processed","method":"POST","path":"/api/users","status":201,"cached":false}
```

## Adding Context

Create loggers with persistent attributes:

```typescript
import { New, TextHandler, String, Int } from '@omdxp/jslog';

const logger = New(new TextHandler());

// Create a request logger with persistent request ID
// Use either style for with() too!
const requestLogger = logger.with('request_id', '123-456');

requestLogger.info('Processing request');
requestLogger.info('Query executed', 'rows', 42);
requestLogger.info('Response sent', 'status', 200);
```

All logs will include `request_id="123-456"`.

## Next Steps

- **[Core Concepts](../core-concepts/loggers)** - Understand loggers, handlers, and attributes
- **[Handlers](../core-concepts/handlers)** - Learn about different handler types
- **[Configuration](./configuration)** - Advanced configuration options
