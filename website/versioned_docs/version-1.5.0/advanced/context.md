---
sidebar_position: 9
---

# Context Support

Context support allows you to carry common attributes through your application, making it easy to track requests, users, or any other contextual information without repeating attributes in every log call.

## What is LogContext?

`LogContext` is a container that holds key-value pairs that represent contextual information. It provides a fluent API for building and managing context data.

## Basic Usage

### Creating a Context

```typescript
import { LogContext, Logger, JSONHandler } from '@omdxp/jslog';

const ctx = new LogContext()
  .set('requestId', 'req-123')
  .set('userId', 'user-456')
  .set('method', 'POST');

const logger = new Logger(new JSONHandler());
logger.infoContext('Processing request', ctx);
// Output: {"time":"...","level":"INFO","msg":"Processing request","requestId":"req-123","userId":"user-456","method":"POST"}
```

### Adding More Attributes

You can add additional attributes on top of the context:

```typescript
import { String, Int } from '@omdxp/jslog';

logger.infoContext(
  'Request completed',
  ctx,
  Int('statusCode', 200),
  String('duration', '145ms')
);
// Output: {"time":"...","level":"INFO","msg":"Request completed","requestId":"req-123","userId":"user-456","method":"POST","statusCode":200,"duration":"145ms"}
```

## Context Methods

### Available Logging Methods

All log levels support context:

```typescript
logger.debugContext(msg, ctx, ...attrs);
logger.infoContext(msg, ctx, ...attrs);
logger.warnContext(msg, ctx, ...attrs);
logger.errorContext(msg, ctx, ...attrs);
```

### Global Functions

You can also use global context functions:

```typescript
import { infoContext, LogContext } from '@omdxp/jslog';

const ctx = new LogContext().set('app', 'api');
infoContext('App started', ctx);
```

## Merging Contexts

Combine multiple contexts together:

```typescript
const requestContext = new LogContext()
  .set('requestId', 'req-123')
  .set('path', '/api/users');

const userContext = new LogContext()
  .set('userId', 'user-456')
  .set('role', 'admin');

const merged = requestContext.merge(userContext);

logger.infoContext('User action', merged);
// Output: {"time":"...","level":"INFO","msg":"User action","requestId":"req-123","path":"/api/users","userId":"user-456","role":"admin"}
```

## Practical Examples

### Request Tracking

Track HTTP requests across your application:

```typescript
import { LogContext, Logger, JSONHandler, String, Int } from '@omdxp/jslog';

const logger = new Logger(new JSONHandler());

app.use((req, res, next) => {
  // Create context for this request
  const ctx = new LogContext()
    .set('requestId', generateRequestId())
    .set('method', req.method)
    .set('path', req.path)
    .set('ip', req.ip);

  // Attach to request for use in handlers
  req.context = ctx;

  logger.infoContext('Incoming request', ctx);
  next();
});

// In your route handler
app.post('/api/users', (req, res) => {
  const ctx = req.context;
  
  logger.infoContext('Creating user', ctx, String('username', req.body.username));
  
  // ... process request
  
  logger.infoContext('User created', ctx, Int('statusCode', 201));
});
```

### Background Jobs

Track background job execution:

```typescript
async function processJob(jobId: string, data: any) {
  const ctx = new LogContext()
    .set('jobId', jobId)
    .set('jobType', 'email-notification')
    .set('startTime', new Date().toISOString());

  logger.infoContext('Job started', ctx);

  try {
    await sendEmail(data);
    logger.infoContext('Job completed', ctx, String('status', 'success'));
  } catch (error) {
    logger.errorContext('Job failed', ctx, Err(error));
  }
}
```

### Multi-tenant Applications

Track tenant information across operations:

```typescript
const tenantContext = new LogContext()
  .set('tenantId', 'tenant-123')
  .set('tenantName', 'Acme Corp')
  .set('tier', 'enterprise');

// Use throughout tenant operations
logger.infoContext('Database query', tenantContext, String('query', 'SELECT ...'));
logger.warnContext('Rate limit warning', tenantContext, Int('remaining', 10));
```

## Context API Reference

### LogContext Class

#### `set(key: string, value: Value): LogContext`

Adds a key-value pair to the context. Returns `this` for chaining.

```typescript
const ctx = new LogContext()
  .set('key1', 'value1')
  .set('key2', 42);
```

#### `get(key: string): Value | undefined`

Retrieves a value from the context.

```typescript
const userId = ctx.get('userId');
```

#### `toAttrs(): Attr[]`

Converts the context to an array of attributes.

```typescript
const attrs = ctx.toAttrs();
// [{ key: 'requestId', value: 'req-123' }, ...]
```

#### `merge(other: LogContext): LogContext`

Creates a new context by merging two contexts. The `other` context's values take precedence in case of conflicts.

```typescript
const merged = ctx1.merge(ctx2);
```

## Best Practices

### Create Context Early

Create your context at the entry point of your operation:

```typescript
// Good
function handleRequest(req) {
  const ctx = new LogContext()
    .set('requestId', req.id)
    .set('userId', req.user.id);
  
  processRequest(ctx);
}

// Avoid creating context deep in the call stack
```

### Keep Context Immutable

Always use `merge()` to combine contexts rather than modifying existing ones:

```typescript
// Good
const newCtx = baseContext.merge(additionalContext);

// Avoid
baseContext.set('newKey', 'value'); // mutates baseContext
```

### Use Meaningful Keys

Choose clear, consistent key names:

```typescript
// Good
ctx.set('userId', '123')
   .set('requestId', 'req-456')
   .set('transactionId', 'tx-789');

// Avoid
ctx.set('uid', '123')
   .set('rid', 'req-456')
   .set('tid', 'tx-789');
```

### Don't Overload Context

Keep contexts focused on truly contextual data:

```typescript
// Good - request context
const ctx = new LogContext()
  .set('requestId', '123')
  .set('userId', '456');

// Avoid - mixing concerns
const ctx = new LogContext()
  .set('requestId', '123')
  .set('calculation_result', 42)  // This is data, not context
  .set('temporary_flag', true);    // This is state, not context
```

## Performance Considerations

### Context is Lightweight

`LogContext` is just a wrapper around a `Map`, so it's very efficient:

```typescript
// Creating context is cheap
const ctx = new LogContext().set('key', 'value');
```

### Merging Creates New Instances

Keep in mind that `merge()` creates a new context:

```typescript
// Each merge creates a new LogContext
const ctx1 = new LogContext().set('a', 1);
const ctx2 = ctx1.merge(new LogContext().set('b', 2));
const ctx3 = ctx2.merge(new LogContext().set('c', 3));
```

## Next Steps

- **[Middleware](./middleware)** - Automatically add context with middleware
- **[Utilities](./utilities)** - Helper functions for common context patterns
- **[Examples](../examples/basic-usage)** - More real-world examples
