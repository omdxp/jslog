---
sidebar_position: 8
---

# Utilities

Helper functions and utilities that make logging easier and more powerful.

## Attribute Builder

Fluent API for building attributes:

```typescript
import { attrs, New, JSONHandler } from '@omdxp/jslog';

const logger = New(new JSONHandler());

const userAttrs = attrs()
  .str('username', 'alice')
  .num('age', 30)
  .bool('active', true)
  .if(user.isPremium, 'tier', 'premium')
  .build();

logger.info('User created', ...userAttrs);
```

### Methods

```typescript
const builder = attrs();

// Add attributes
builder.str(key: string, value: string);
builder.num(key: string, value: number);
builder.bool(key: string, value: boolean);
builder.time(key: string, value: Date);
builder.any(key: string, value: any);
builder.group(name: string, ...attrs: Attr[]);

// Conditional attributes
builder.if(condition: boolean, key: string, value: any);

// Build final array
const attributes = builder.build();
```

## Correlation IDs

Track requests across your application:

```typescript
import { 
  setCorrelationId, 
  getCorrelationId, 
  CorrelationId,
  clearCorrelationId 
} from '@omdxp/jslog';

// Set correlation ID for request
app.use((req, res, next) => {
  setCorrelationId(generateRequestId());
  next();
});

// Use in logs
logger.info('Processing request', CorrelationId());

// Get current ID
const id = getCorrelationId();

// Clear after request
app.use((req, res, next) => {
  res.on('finish', () => clearCorrelationId());
  next();
});
```

## Performance Timers

Measure operation duration:

```typescript
import { startTimer, Timer } from '@omdxp/jslog';

// Start a timer
const timer = startTimer('database_query');

// Do work
await queryDatabase();

// Log with elapsed time
logger.info('Query completed', timer.elapsed());
// Output: duration_ms=145

// Or get duration manually
const duration = timer.getDuration();
```

### Timer Methods

```typescript
const timer = new Timer('operation_name');

// Get elapsed time as attribute
timer.elapsed();  // Returns Attr with duration in ms

// Get raw duration
timer.getDuration();  // Returns number (milliseconds)

// Check if timer is running
timer.isRunning();  // Returns boolean
```

## HTTP Helpers

Log HTTP requests and responses easily:

### HTTP Request

```typescript
import { HttpReq } from '@omdxp/jslog';

logger.info('Incoming request', ...HttpReq({
  method: req.method,
  url: req.url,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  headers: req.headers
}));
```

### HTTP Response

```typescript
import { HttpRes } from '@omdxp/jslog';

logger.info('Response sent', ...HttpRes({
  status: res.statusCode,
  duration: Date.now() - startTime,
  size: res.getHeader('content-length')
}));
```

### SQL Query Helper

```typescript
import { SqlQuery } from '@omdxp/jslog';

logger.info('Database query', ...SqlQuery({
  query: 'SELECT * FROM users WHERE id = ?',
  params: [userId],
  duration: queryTime,
  rows: result.length
}));
```

## Data Masking

Redact sensitive information:

### Email Masking

```typescript
import { maskEmail, String } from '@omdxp/jslog';

logger.info('User email', 
  String('email', maskEmail('alice@example.com'))
);
// Output: a***@example.com
```

### Credit Card Masking

```typescript
import { maskCreditCard } from '@omdxp/jslog';

logger.info('Payment', 
  String('card', maskCreditCard('4532-1234-5678-9010'))
);
// Output: ****-****-****-9010
```

### Phone Masking

```typescript
import { maskPhone } from '@omdxp/jslog';

logger.info('Contact', 
  String('phone', maskPhone('555-123-4567'))
);
// Output: ***-***-4567
```

### Custom Redaction

```typescript
import { redact } from '@omdxp/jslog';

const redacted = redact('sensitive data', 3);
// Output: sen***
```

## System Information

### Environment Info

```typescript
import { EnvInfo } from '@omdxp/jslog';

logger.info('Application started', ...EnvInfo());
// Adds: platform, arch, nodeVersion, cwd, etc.
```

### Memory Usage

```typescript
import { MemoryUsage } from '@omdxp/jslog';

logger.info('Health check', ...MemoryUsage());
// Adds: heapUsed, heapTotal, rss, external
```

## Stack Traces

Capture stack traces for errors:

```typescript
import { StackTrace } from '@omdxp/jslog';

try {
  riskyOperation();
} catch (error) {
  logger.error('Operation failed', 
    Err(error),
    StackTrace()
  );
}
```

## Caller Information

Get source file and line number:

```typescript
import { Caller } from '@omdxp/jslog';

logger.info('Debug point', Caller());
// Adds: file, line, function
```

## Lazy Evaluation

Defer expensive computations:

```typescript
import { lazy } from '@omdxp/jslog';

logger.debug('Stats', 
  lazy('expensive_data', () => {
    // Only executed if DEBUG level is enabled
    return computeExpensiveStats();
  })
);
```

## Safe Stringify

Safely serialize objects with circular references:

```typescript
import { safeStringify } from '@omdxp/jslog';

const circular = { a: 1 };
circular.self = circular;

const json = safeStringify(circular);
// No error, circular reference handled
```

## ID Generation

Generate unique identifiers:

```typescript
import { generateRequestId, generateTraceId } from '@omdxp/jslog';

// Request ID (UUID v4)
const requestId = generateRequestId();
// Output: "550e8400-e29b-41d4-a716-446655440000"

// Trace ID (for distributed tracing)
const traceId = generateTraceId();
// Output: "1234567890abcdef"
```

## Complete Example

Putting it all together:

```typescript
import {
  New,
  JSONHandler,
  attrs,
  startTimer,
  setCorrelationId,
  CorrelationId,
  HttpReq,
  HttpRes,
  maskEmail,
  String,
  Err
} from '@omdxp/jslog';

const logger = New(new JSONHandler());

app.use((req, res, next) => {
  // Set correlation ID
  setCorrelationId(generateRequestId());
  
  // Start request timer
  const timer = startTimer('request');
  
  // Log request
  logger.info('Request started', 
    CorrelationId(),
    ...HttpReq({
      method: req.method,
      url: req.url,
      ip: req.ip
    })
  );
  
  res.on('finish', () => {
    // Build attributes
    const responseAttrs = attrs()
      .num('statusCode', res.statusCode)
      .num('duration', timer.getDuration())
      .if(req.user, 'userId', req.user?.id)
      .if(req.user?.email, 'email', maskEmail(req.user.email))
      .build();
    
    // Log response
    logger.info('Request completed',
      CorrelationId(),
      timer.elapsed(),
      ...responseAttrs
    );
  });
  
  next();
});
```

## Best Practices

**Do:**
- Use attribute builders for complex log entries
- Mask sensitive data (emails, credit cards, etc.)
- Add correlation IDs for request tracking
- Use timers to measure performance
- Leverage lazy evaluation for expensive computations

**Don't:**
- Log unmasked PII
- Create timers without using them
- Forget to clear correlation IDs
- Overuse lazy evaluation (has overhead)

## See Also

- [Attributes](../core-concepts/attributes) - Core attribute concepts
- [Middleware](./middleware) - Transform and enrich logs
- [Examples](../examples/basic-usage) - Real-world examples
