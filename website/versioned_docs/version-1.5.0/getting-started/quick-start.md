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

// Log some messages
logger.info('User logged in', String('user', 'alice'), String('ip', '192.168.1.1'));
logger.warn('High CPU usage', Int('percentage', 85));
logger.error('Database connection failed', String('error', 'timeout'));
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

info('Application started', String('env', 'production'), Int('port', 3000));
warn('Memory usage high', Int('usage', 512));
error('Failed to connect', String('host', 'localhost'));
```

## JSON Output

For production environments, JSON output is preferred:

```typescript
import { Logger, JSONHandler, Level, String, Int, Bool } from '@omdxp/jslog';

const logger = new Logger(new JSONHandler({ level: Level.INFO }));

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
import { New, TextHandler, String } from '@omdxp/jslog';

const logger = New(new TextHandler());

// Create a request logger with persistent request ID
const requestLogger = logger.with(String('request_id', '123-456'));

requestLogger.info('Processing request');
requestLogger.info('Query executed', Int('rows', 42));
requestLogger.info('Response sent', Int('status', 200));
```

All logs will include `request_id="123-456"`.

## Next Steps

- **[Core Concepts](../core-concepts/loggers)** - Understand loggers, handlers, and attributes
- **[Handlers](../core-concepts/handlers)** - Learn about different handler types
- **[Configuration](./configuration)** - Advanced configuration options
