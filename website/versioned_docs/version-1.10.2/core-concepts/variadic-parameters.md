---
sidebar_position: 4
---

# Variadic Parameters

:::tip NEW in v1.7.0
jslog now supports **Go slog-style variadic parameters**! Pass key-value pairs directly without needing attribute helper functions.
:::

## What are Variadic Parameters?

Variadic parameters allow you to pass key-value pairs directly to logging functions, matching Go's slog API exactly:

```typescript
import { info } from '@omdxp/jslog';

// Go slog-style - simple and clean!
info('User login', 'user', 'alice', 'attempts', 3, 'success', true);
```

## Three Ways to Log

jslog gives you flexibility in how you structure your logs:

### 1. Go slog-style Variadic (NEW!)

Pass alternating keys and values:

```typescript
import { info, warn, error } from '@omdxp/jslog';

info('Application started', 'env', 'production', 'port', 3000);
warn('High memory usage', 'usage', 0.85, 'threshold', 0.8);
error('Connection failed', 'host', 'db.example.com', 'port', 5432);
```

**Output:**
```
time=2024-01-01T12:00:00.000Z level=INFO msg="Application started" env="production" port=3000
time=2024-01-01T12:00:01.000Z level=WARN msg="High memory usage" usage=0.85 threshold=0.8
time=2024-01-01T12:00:02.000Z level=ERROR msg="Connection failed" host="db.example.com" port=5432
```

### 2. Traditional Typed Style

Use attribute helper functions for explicit type control:

```typescript
import { info, String, Int, Float64, Bool } from '@omdxp/jslog';

info('User action',
  String('user', 'alice'),
  Int('attempts', 3),
  Float64('score', 98.5),
  Bool('success', true)
);
```

**When to use:**
- Need explicit type control (Int vs Int64, Float64 vs number)
- Working with special types (Duration, Time, Uint64)
- Using advanced features (Group, Err)

### 3. Mixed Style

Combine both approaches in the same call:

```typescript
import { info, String, Int } from '@omdxp/jslog';

info('Mixed example',
  String('typed', 'value'),  // Explicit type
  'key1', 'value1',          // Variadic
  Int('count', 42),          // Explicit type
  'key2', 'value2'           // Variadic
);
```

## Type Inference

With variadic parameters, types are automatically inferred:

```typescript
info('Event',
  'name', 'user.created',        // string
  'userId', 42,                   // number
  'score', 98.5,                  // number
  'active', true,                 // boolean
  'tags', ['admin', 'vip'],      // array
  'metadata', { plan: 'pro' }    // object
);
```

**Output:**
```json
{
  "time": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "msg": "Event",
  "name": "user.created",
  "userId": 42,
  "score": 98.5,
  "active": true,
  "tags": ["admin", "vip"],
  "metadata": {"plan": "pro"}
}
```

## All Methods Support Variadic

Every logging method accepts variadic parameters:

### Logger Methods

```typescript
const logger = new Logger(new TextHandler());

logger.log(Level.INFO, 'Message', 'key', 'value');
logger.debug('Debug', 'state', 'initializing');
logger.info('Info', 'user', 'alice');
logger.warn('Warning', 'usage', 85);
logger.error('Error', 'code', 500);
```

### Convenience Functions

```typescript
import { debug, info, warn, error, log } from '@omdxp/jslog';

log(Level.INFO, 'Message', 'key', 'value');
debug('Debug', 'state', 'initializing');
info('Info', 'user', 'alice');
warn('Warning', 'usage', 85);
error('Error', 'code', 500);
```

### Context Methods

```typescript
import { debugContext, infoContext, warnContext, errorContext } from '@omdxp/jslog';

const ctx = createContext();

debugContext(ctx, 'Debug', 'state', 'ready');
infoContext(ctx, 'Info', 'action', 'process');
warnContext(ctx, 'Warning', 'level', 'high');
errorContext(ctx, 'Error', 'type', 'fatal');
```

### Persistent Attributes

The `with()` method also supports variadic parameters:

```typescript
import { New, TextHandler } from '@omdxp/jslog';

const logger = New(new TextHandler());

// Variadic style
const requestLogger = logger.with('request_id', '123-456', 'user_id', 'user-789');

// Traditional style
const requestLogger2 = logger.with(
  String('request_id', '123-456'),
  String('user_id', 'user-789')
);

// Both work the same!
requestLogger.info('Processing request', 'action', 'query');
```

## Comparison with Go slog

jslog's API matches Go's slog exactly:

### Go
```go
import "log/slog"

slog.Info("User login", "user", "alice", "attempts", 3, "success", true)
slog.Warn("High memory", "usage", 0.85, "threshold", 0.8)
slog.Error("Connection failed", "host", "db.example.com", "port", 5432)
```

### jslog
```typescript
import { info, warn, error } from '@omdxp/jslog';

info("User login", "user", "alice", "attempts", 3, "success", true);
warn("High memory", "usage", 0.85, "threshold", 0.8);
error("Connection failed", "host", "db.example.com", "port", 5432);
```

**Identical syntax!** 🎉

## Best Practices

### Use Variadic for Simple Logs

Quick, simple logging with automatic type inference:

```typescript
info('Request processed', 'method', 'POST', 'status', 200, 'duration', 45);
```

### Use Typed Helpers for Complex Types

When you need specific types or advanced features:

```typescript
import { info, Int64, Duration, Time, Group } from '@omdxp/jslog';

info('Database query',
  Int64('userId', 9007199254740991),  // Large number
  Duration('elapsed', 1500),           // Formatted as "1500ms"
  Time('timestamp', new Date()),       // Formatted timestamp
  Group('metadata',                    // Nested group
    String('query', 'SELECT * FROM users'),
    Int('rows', 42)
  )
);
```

### Mix Styles When Appropriate

Combine both for the best of both worlds:

```typescript
info('Complex event',
  'event', 'user.created',      // Simple variadic
  String('userId', 'u123'),     // Explicit string
  'email', 'alice@example.com', // Variadic
  Int('age', 30),               // Explicit int
  'active', true                // Variadic boolean
);
```

## Performance

Variadic parameters have **no performance overhead**. They're converted to the same internal `Attr` format at runtime:

```typescript
// These produce identical output and performance:
info('Message', 'key', 'value');
info('Message', String('key', 'value'));
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
// TypeScript knows these are the right types
info('Event',
  'name', 'string value',    // string
  'count', 42,               // number
  'active', true,            // boolean
  'data', { key: 'value' }   // object
);
```

## Migration Guide

Existing code continues to work without changes:

```typescript
// v1.6.0 and earlier - still works!
info('Message', String('key', 'value'), Int('count', 42));

// v1.7.0 - new variadic style
info('Message', 'key', 'value', 'count', 42);

// v1.7.0 - mix both
info('Message', String('key', 'value'), 'count', 42);
```

**No breaking changes!** Your existing code keeps working.

## Next Steps

- **[Attributes](./attributes)** - Learn about all attribute types
- **[Loggers](./loggers)** - Create and configure loggers
- **[Examples](../examples/basic-usage)** - See more examples
