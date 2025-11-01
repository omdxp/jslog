---
sidebar_position: 6
---

# AsyncHandler

Non-blocking log operations for better application performance.

## Overview

`AsyncHandler` wraps another handler and processes log records asynchronously, preventing log operations from blocking your application's main thread.

## Basic Usage

```typescript
import { New, AsyncHandler, FileHandler } from '@omdxp/jslog';

const logger = New(new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  errorHandler: (err) => console.error('Log error:', err)
}));

// Returns immediately, doesn't block
logger.info('User logged in');
```

## Configuration Options

```typescript
interface AsyncHandlerOptions {
  handler: Handler;                    // Underlying handler
  errorHandler?: (error: Error) => void;  // Error callback
}
```

## How It Works

Log records are queued and processed asynchronously:

```typescript
const logger = New(new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/app.log' })
}));

// These return immediately
logger.info('Log 1');
logger.info('Log 2');
logger.info('Log 3');

// Logs are written asynchronously in the background
```

## Error Handling

Always provide an error handler:

```typescript
import { New, AsyncHandler, FileHandler } from '@omdxp/jslog';

const logger = New(new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  errorHandler: (err) => {
    // Handle logging errors
    console.error('Failed to write log:', err.message);
    
    // Optionally send to error tracking service
    errorTracker.captureException(err);
  }
}));
```

## Use Cases

### High-Performance APIs

Don't let logging slow down your API:

```typescript
import { New, AsyncHandler, JSONHandler, HttpReq, HttpRes } from '@omdxp/jslog';

const logger = New(new AsyncHandler({
  handler: new JSONHandler()
}));

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    // Logging happens async, doesn't slow down response
    logger.info('Request', 
      ...HttpReq(req),
      ...HttpRes({ 
        status: res.statusCode, 
        duration: Date.now() - start 
      })
    );
  });
  
  next();
});
```

### Background Job Processing

```typescript
const logger = New(new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/jobs.log' })
}));

async function processJob(job: Job) {
  logger.info('Job started', String('jobId', job.id));
  
  try {
    await job.execute();
    logger.info('Job completed', String('jobId', job.id));
  } catch (error) {
    logger.error('Job failed', String('jobId', job.id), Err(error));
  }
}
```

### Database Operations

```typescript
const logger = New(new AsyncHandler({
  handler: new JSONHandler()
}));

async function queryDatabase(sql: string) {
  const start = Date.now();
  
  try {
    const result = await db.query(sql);
    
    // Non-blocking log
    logger.info('Query executed',
      ...SqlQuery({ query: sql, duration: Date.now() - start })
    );
    
    return result;
  } catch (error) {
    logger.error('Query failed', String('sql', sql), Err(error));
    throw error;
  }
}
```

## Combining with BufferedHandler

Maximum performance: async + buffered:

```typescript
import { 
  New, 
  AsyncHandler, 
  BufferedHandler, 
  FileHandler 
} from '@omdxp/jslog';

const logger = New(new AsyncHandler({
  handler: new BufferedHandler({
    handler: new FileHandler({ filepath: './logs/app.log' }),
    bufferSize: 100,
    flushInterval: 1000
  }),
  errorHandler: (err) => console.error('Log error:', err)
}));

// Logs are queued async AND buffered
// Maximum throughput, minimum blocking
```

## Graceful Shutdown

**Important:** AsyncHandler keeps async operations running. Always call `close()` before process exit.

```typescript
import { New, AsyncHandler, FileHandler } from '@omdxp/jslog';

const asyncHandler = new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/app.log' })
});

const logger = New(asyncHandler);

logger.info('Application started');
logger.info('Processing requests...');

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down gracefully...');
  
  // Wait for all pending async operations to complete
  await asyncHandler.close();
  
  console.log('All logs written. Goodbye!');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

### What `close()` Does

1. **Stops accepting new logs** - Any logs after `close()` are silently dropped
2. **Waits for pending operations** - Returns a Promise that resolves when queue is empty
3. **Allows clean exit** - Process can terminate without hanging

### Without close() - Process Hangs

```typescript
const asyncHandler = new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/app.log' })
});

const logger = New(asyncHandler);

logger.info('Some log');

// BAD: Process hangs waiting for async operations
process.exit(0);
```

### With close() - Clean Exit

```typescript
const asyncHandler = new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/app.log' })
});

const logger = New(asyncHandler);

logger.info('Some log');

// GOOD: Wait for completion then exit
await asyncHandler.close();
process.exit(0);
```

### Express.js Example

```typescript
import express from 'express';
import { New, AsyncHandler, JSONHandler } from '@omdxp/jslog';

const asyncHandler = new AsyncHandler({
  handler: new JSONHandler()
});

const logger = New(asyncHandler);
const app = express();

app.get('/users', (req, res) => {
  logger.info('Fetching users');
  res.json({ users: [] });
});

const server = app.listen(3000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  
  // Stop accepting requests
  server.close(() => {
    console.log('Server closed');
  });
  
  // Wait for logs to flush
  await asyncHandler.close();
  
  process.exit(0);
});
```

### Docker/Kubernetes

```typescript
// Handle SIGTERM from container orchestrator
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down...');
  
  // Close connections, stop accepting traffic, etc.
  await server.close();
  
  // Flush all logs
  await asyncHandler.close();
  
  logger.info('Shutdown complete');
  process.exit(0);
});
```

## Performance Comparison

```typescript
import { New, FileHandler, AsyncHandler } from '@omdxp/jslog';

// Synchronous - blocks on each log
const syncLogger = New(new FileHandler({ 
  filepath: './logs/sync.log' 
}));

// Asynchronous - returns immediately
const asyncLogger = New(new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/async.log' })
}));

// Benchmark
console.time('sync');
for (let i = 0; i < 10000; i++) {
  syncLogger.info(`Log ${i}`);
}
console.timeEnd('sync');  // ~500ms

console.time('async');
for (let i = 0; i < 10000; i++) {
  asyncLogger.info(`Log ${i}`);
}
console.timeEnd('async');  // ~50ms
```

## Error Recovery

Handle errors gracefully:

```typescript
const logger = New(new AsyncHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  errorHandler: (err) => {
    // Log to stderr as fallback
    console.error('Logging failed:', err.message);
    
    // Try alternate handler
    try {
      const fallback = new JSONHandler();
      fallback.handle(record);
    } catch (fallbackErr) {
      console.error('Fallback failed:', fallbackErr);
    }
  }
}));
```

## Best Practices

**Do:**
- Always provide an error handler
- **Call `close()` before process exit**
- Use for I/O-bound handlers (file, network)
- Combine with buffering for maximum performance
- Implement graceful shutdown in production

**Don't:**
- Use for console output (already async in Node.js)
- Forget to handle errors
- Exit process without calling `close()` (will hang)
- Expect logs to be written synchronously
- Skip shutdown signal handlers

## Trade-offs

**Pros:**
- No blocking on log operations
- Better application performance
- Higher throughput
- Smoother request handling

**Cons:**
- Logs written with slight delay
- Need error handling
- Harder to debug (logs appear later)
- Must handle shutdown properly

## See Also

- [BufferedHandler](./buffered-handler) - Batch logging
- [FileHandler](./file-handler) - File logging
