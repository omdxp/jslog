---
sidebar_position: 7
---

# Middleware

Composable handler middleware for transforming and enriching log records.

## Overview

Middleware allows you to transform, enrich, filter, and manipulate log records before they reach the handler. Build powerful logging pipelines by composing middleware functions.

## Basic Usage

```typescript
import { 
  New, 
  MiddlewareHandler, 
  JSONHandler,
  timestampMiddleware,
  hostnameMiddleware 
} from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    timestampMiddleware(),
    hostnameMiddleware()
  ]
}));

logger.info('Application started');
// Includes timestamp and hostname automatically
```

## Built-in Middleware

### Timestamp Middleware

Add timestamp to every log:

```typescript
import { timestampMiddleware } from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    timestampMiddleware()  // Adds 'timestamp' attribute
  ]
}));
```

### Hostname Middleware

Add hostname/server name:

```typescript
import { hostnameMiddleware } from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    hostnameMiddleware()  // Adds 'hostname' attribute
  ]
}));
```

### PID Middleware

Add process ID:

```typescript
import { pidMiddleware } from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    pidMiddleware()  // Adds 'pid' attribute
  ]
}));
```

### Rate Limit Middleware

Limit log rate:

```typescript
import { rateLimitMiddleware } from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    rateLimitMiddleware(100)  // Max 100 logs/second
  ]
}));
```

### Deduplication Middleware

Prevent duplicate logs:

```typescript
import { dedupeMiddleware } from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    dedupeMiddleware(5000)  // Dedupe within 5 seconds
  ]
}));

logger.info('Duplicate message');
logger.info('Duplicate message');  // Skipped!
```

### Enrich Middleware

Add custom attributes:

```typescript
import { enrichMiddleware } from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    enrichMiddleware({
      app: 'my-app',
      version: '1.0.0',
      env: process.env.NODE_ENV
    })
  ]
}));
```

### Transform Middleware

Transform attributes:

```typescript
import { transformMiddleware } from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    transformMiddleware((record) => {
      // Uppercase all message
      record.message = record.message.toUpperCase();
      return record;
    })
  ]
}));
```

### Conditional Middleware

Apply middleware conditionally:

```typescript
import { conditionalMiddleware, timestampMiddleware } from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    conditionalMiddleware(
      (record) => record.level >= Level.ERROR,
      timestampMiddleware()
    )
  ]
}));
```

### Error Boundary Middleware

Catch middleware errors:

```typescript
import { errorBoundaryMiddleware } from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    errorBoundaryMiddleware(),  // Prevents middleware errors from breaking logs
    riskyMiddleware()
  ]
}));
```

## Custom Middleware

Create your own middleware:

```typescript
import type { HandlerMiddleware } from '@omdxp/jslog';

function customMiddleware(): HandlerMiddleware {
  return (record) => {
    // Add request ID from async context
    const requestId = getRequestId();
    if (requestId) {
      record.attrs.push({ 
        key: 'requestId', 
        value: requestId 
      });
    }
    return record;
  };
}

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [customMiddleware()]
}));
```

## Middleware Composition

Stack multiple middleware:

```typescript
import {
  New,
  MiddlewareHandler,
  JSONHandler,
  timestampMiddleware,
  hostnameMiddleware,
  pidMiddleware,
  enrichMiddleware,
  rateLimitMiddleware,
  dedupeMiddleware
} from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [
    // Order matters!
    timestampMiddleware(),
    hostnameMiddleware(),
    pidMiddleware(),
    enrichMiddleware({ app: 'my-app' }),
    dedupeMiddleware(1000),
    rateLimitMiddleware(100)
  ]
}));
```

## MetricsMiddleware

Track logging statistics:

```typescript
import { 
  New, 
  MiddlewareHandler, 
  MetricsMiddleware,
  JSONHandler 
} from '@omdxp/jslog';

const metrics = new MetricsMiddleware();

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [metrics.middleware()]
}));

// Log some stuff
logger.info('Message 1');
logger.warn('Warning');
logger.error('Error');

// Get statistics
const stats = metrics.getStats();
console.log('Total logs:', stats.total);
console.log('By level:', stats.byLevel);
console.log('Errors:', stats.errors);

// Reset metrics
metrics.reset();
```

## Real-World Examples

### Request Context Enrichment

```typescript
import { AsyncLocalStorage } from 'async_hooks';

const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
}>();

function requestContextMiddleware(): HandlerMiddleware {
  return (record) => {
    const context = requestContext.getStore();
    if (context) {
      record.attrs.push(
        { key: 'requestId', value: context.requestId },
        { key: 'userId', value: context.userId || 'anonymous' }
      );
    }
    return record;
  };
}

const logger = New(new MiddlewareHandler({
  handler: new JSONHandler(),
  middleware: [requestContextMiddleware()]
}));

// In Express middleware
app.use((req, res, next) => {
  requestContext.run({
    requestId: generateRequestId(),
    userId: req.user?.id
  }, next);
});
```

### PII Redaction

```typescript
function piiRedactionMiddleware(): HandlerMiddleware {
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const phoneRegex = /\d{3}-\d{3}-\d{4}/g;
  
  return (record) => {
    // Redact message
    record.message = record.message
      .replace(emailRegex, '[EMAIL]')
      .replace(phoneRegex, '[PHONE]');
    
    // Redact attributes
    record.attrs = record.attrs.map(attr => {
      if (typeof attr.value === 'string') {
        return {
          ...attr,
          value: attr.value
            .replace(emailRegex, '[EMAIL]')
            .replace(phoneRegex, '[PHONE]')
        };
      }
      return attr;
    });
    
    return record;
  };
}
```

### Performance Tracking

```typescript
function performanceMiddleware(): HandlerMiddleware {
  const startTime = Date.now();
  let logCount = 0;
  
  return (record) => {
    logCount++;
    const uptime = Date.now() - startTime;
    const logsPerSecond = (logCount / uptime) * 1000;
    
    record.attrs.push(
      { key: 'logCount', value: logCount },
      { key: 'logsPerSecond', value: Math.round(logsPerSecond) }
    );
    
    return record;
  };
}
```

### Environment-Based Routing

```typescript
function environmentRoutingMiddleware(): HandlerMiddleware {
  return (record) => {
    const env = process.env.NODE_ENV;
    
    // Add environment tag
    record.attrs.push({ key: 'env', value: env });
    
    // In development, add extra debug info
    if (env === 'development') {
      record.attrs.push(
        { key: 'source', value: `${record.source?.file}:${record.source?.line}` }
      );
    }
    
    return record;
  };
}
```

## Best Practices

**Do:**
- Order middleware intentionally (enrichment before filtering)
- Keep middleware functions pure and fast
- Use error boundaries for risky middleware
- Document what each middleware does

**Don't:**
- Perform expensive operations in middleware
- Mutate records in place without cloning
- Forget that middleware runs on every log
- Stack too many middleware (impacts performance)

## Performance Tips

```typescript
// Good: Fast, simple middleware
function fastMiddleware(): HandlerMiddleware {
  const hostname = os.hostname();
  return (record) => {
    record.attrs.push({ key: 'host', value: hostname });
    return record;
  };
}

// Bad: Slow middleware with I/O
function slowMiddleware(): HandlerMiddleware {
  return (record) => {
    // Don't do this!
    const data = fs.readFileSync('/some/file');
    record.attrs.push({ key: 'data', value: data });
    return record;
  };
}
```

## See Also

- [AsyncHandler](./async-handler) - Non-blocking logging
- [FilterHandler](./filter-handler) - Conditional logging
- [Handlers](../core-concepts/handlers) - Handler concepts
