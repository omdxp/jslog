---
sidebar_position: 1
---

# Loggers

Understanding the Logger class and how to use it effectively.

## What is a Logger?

A `Logger` is the main interface for logging in jslog. It accepts a `Handler` that determines how and where log records are processed.

```typescript
import { Logger, TextHandler } from '@omdxp/jslog';

const logger = new Logger(new TextHandler());
```

## Creating Loggers

### Using the New Function

```typescript
import { New, JSONHandler } from '@omdxp/jslog';

const logger = New(new JSONHandler());
```

### Using the Constructor

```typescript
import { Logger, ColorHandler } from '@omdxp/jslog';

const logger = new Logger(new ColorHandler());
```

### Using the Default Logger

```typescript
import { Default } from '@omdxp/jslog';

const logger = Default();  // Returns singleton default logger
```

## Logging Methods

### Basic Logging

```typescript
logger.debug(msg, ...attrs);  // DEBUG level
logger.info(msg, ...attrs);   // INFO level
logger.warn(msg, ...attrs);   // WARN level
logger.error(msg, ...attrs);  // ERROR level
```

### With Attributes

```typescript
import { String, Int, Bool } from '@omdxp/jslog';

logger.info('User action',
  String('action', 'login'),
  String('user', 'alice'),
  Int('attempts', 3),
  Bool('success', true)
);
```

### Generic Log Method

```typescript
import { Level } from '@omdxp/jslog';

logger.log(Level.WARN, 'Custom level log', String('key', 'value'));
```

## Context Methods

### Adding Persistent Attributes

Create a new logger with additional attributes:

```typescript
import { String } from '@omdxp/jslog';

const baseLogger = New(new TextHandler());

// Create logger with request context
const requestLogger = baseLogger.with(
  String('request_id', 'req-123'),
  String('user_id', 'user-456')
);

requestLogger.info('Processing request');
// Output includes: request_id="req-123" user_id="user-456"
```

### Adding Groups

Organize related attributes:

```typescript
const dbLogger = baseLogger.withGroup('database');

dbLogger.info('Connected', String('host', 'localhost'));
// Output: database.host="localhost"

// Nested groups
const poolLogger = dbLogger.withGroup('pool');
poolLogger.info('Created', Int('size', 10));
// Output: database.pool.size=10
```

## Checking if a Level is Enabled

Avoid expensive operations when logging is disabled:

```typescript
import { Level } from '@omdxp/jslog';

if (logger.enabled(Level.DEBUG)) {
  const expensiveData = computeExpensiveDebugInfo();
  logger.debug('Debug info', Any('data', expensiveData));
}
```

## Context Methods

:::info
Context support is available in version 1.2.0 and later. In this version (1.1.2), these methods behave the same as their non-context counterparts.
:::

```typescript
logger.debugContext(msg, ...attrs);
logger.infoContext(msg, ...attrs);
logger.warnContext(msg, ...attrs);
logger.errorContext(msg, ...attrs);
```

## Logger Composition

Create specialized loggers for different parts of your application:

```typescript
// Base logger
const appLogger = New(new JSONHandler({ level: Level.INFO }));

// Service-specific loggers
const authLogger = appLogger.withGroup('auth');
const dbLogger = appLogger.withGroup('database');
const apiLogger = appLogger.withGroup('api');

// Use them independently
authLogger.info('User authenticated', String('user', 'alice'));
dbLogger.warn('Slow query', Int('duration_ms', 1500));
apiLogger.error('Request failed', Int('status', 500));
```

## Best Practices

### 1. Use Structured Attributes

```typescript
// ❌ Bad: String interpolation
logger.info(`User ${userId} logged in from ${ip}`);

// ✅ Good: Structured attributes
logger.info('User logged in', String('user_id', userId), String('ip', ip));
```

### 2. Create Logger Hierarchies

```typescript
const rootLogger = New(new JSONHandler());
const serviceLogger = rootLogger.withGroup('myservice');
const requestLogger = serviceLogger.with(String('version', '1.0.0'));
```

### 3. Check Level Before Expensive Operations

```typescript
if (logger.enabled(Level.DEBUG)) {
  logger.debug('State', Any('state', complexObject));
}
```

### 4. Use Appropriate Log Levels

- **DEBUG**: Detailed information for debugging
- **INFO**: General informational messages
- **WARN**: Warning messages for potentially harmful situations
- **ERROR**: Error messages for failures

## Next Steps

- **[Handlers](./handlers)** - Learn about different handler types
- **[Attributes](./attributes)** - Master attribute types and usage
- **[Levels](./levels)** - Understand log levels in depth
