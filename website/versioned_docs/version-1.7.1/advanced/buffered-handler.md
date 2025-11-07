---
sidebar_position: 3
---

# BufferedHandler

Batch log writing for better performance in high-throughput applications.

## Overview

`BufferedHandler` batches log records and writes them in groups, reducing I/O operations and improving performance. Perfect for high-traffic applications.

## Basic Usage

```typescript
import { New, BufferedHandler, JSONHandler } from '@omdxp/jslog';

const logger = New(new BufferedHandler({
  handler: new JSONHandler(),
  bufferSize: 100,        // Flush after 100 records
  flushInterval: 1000     // Or flush every 1 second
}));

// Logs are buffered
logger.info('Log 1');
logger.info('Log 2');
// ... written in batches
```

## Configuration Options

```typescript
interface BufferedHandlerOptions {
  handler: Handler;           // Underlying handler to write to
  bufferSize?: number;        // Max records before flush (default: 100)
  flushInterval?: number;     // Flush interval in ms (default: 1000)
}
```

## How It Works

Records are buffered until either:
1. Buffer reaches `bufferSize` records
2. `flushInterval` milliseconds elapse
3. `flush()` is called manually

```typescript
const logger = New(new BufferedHandler({
  handler: new JSONHandler(),
  bufferSize: 50,
  flushInterval: 2000
}));

// These are buffered
for (let i = 0; i < 30; i++) {
  logger.info(`Message ${i}`);
}

// Force flush now
await (logger.handler as BufferedHandler).flush();
```

## Performance Benefits

Buffering reduces I/O operations:

```typescript
// Without buffering: 1000 write operations
for (let i = 0; i < 1000; i++) {
  logger.info(`Request ${i}`);
}

// With buffering (size=100): ~10 write operations
const bufferedLogger = New(new BufferedHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  bufferSize: 100
}));

for (let i = 0; i < 1000; i++) {
  bufferedLogger.info(`Request ${i}`);
}
```

## Graceful Shutdown

**Important:** BufferedHandler uses a timer that keeps the process alive. Always call `close()` before exit.

```typescript
import { New, BufferedHandler, FileHandler } from '@omdxp/jslog';

const bufferedHandler = new BufferedHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  bufferSize: 100,
  flushInterval: 5000
});

const logger = New(bufferedHandler);

logger.info('Application running...');

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down...');
  
  // Flush remaining logs, stop timer, and close wrapped handler
  await bufferedHandler.close();
  
  console.log('All logs flushed. Goodbye!');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

### What `close()` Does

1. **Clears the flush timer** - Stops the interval that keeps process alive
2. **Flushes remaining logs** - Writes any buffered records
3. **Closes wrapped handler** - Calls close() on wrapped handler if it supports it
4. **Returns a Promise** - Waits for async close operations to complete
5. **Allows clean exit** - Process can terminate without hanging

### Manual Flush vs Close

```typescript
const bufferedHandler = new BufferedHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  bufferSize: 100
});

// flush() - Only writes buffer, timer keeps running (synchronous)
bufferedHandler.flush();

// close() - Writes buffer, stops timer, AND closes wrapped handlers (async)
await bufferedHandler.close();
```

### Express.js Example

```typescript
import express from 'express';
import { New, BufferedHandler, JSONHandler } from '@omdxp/jslog';

const bufferedHandler = new BufferedHandler({
  handler: new JSONHandler(),
  bufferSize: 200,
  flushInterval: 2000
});

const logger = New(bufferedHandler);
const app = express();

app.get('/api/data', (req, res) => {
  logger.info('Request received');
  res.json({ data: [] });
});

const server = app.listen(3000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Flush logs and stop timer
  bufferedHandler.close();
  
  process.exit(0);
});
```

## Use Cases

### High-Traffic APIs

```typescript
import { New, BufferedHandler, JSONHandler } from '@omdxp/jslog';

const logger = New(new BufferedHandler({
  handler: new JSONHandler(),
  bufferSize: 500,
  flushInterval: 1000
}));

app.use((req, res, next) => {
  logger.info('Request', HttpReq(req));
  next();
});
```

### Batch Processing

```typescript
const logger = New(new BufferedHandler({
  handler: new FileHandler({ filepath: './logs/batch.log' }),
  bufferSize: 1000,
  flushInterval: 5000
}));

for (const item of largeDataset) {
  processItem(item);
  logger.info('Processed item', String('id', item.id));
}

await (logger.handler as BufferedHandler).flush();
```

## Combining with Async Handler

For maximum performance, combine buffering with async handling:

```typescript
import { New, AsyncHandler, BufferedHandler, FileHandler } from '@omdxp/jslog';

const logger = New(new AsyncHandler({
  handler: new BufferedHandler({
    handler: new FileHandler({ filepath: './logs/app.log' }),
    bufferSize: 200,
    flushInterval: 2000
  })
}));
```

## Trade-offs

**Pros:**
- Reduced I/O operations
- Better performance for high-throughput scenarios
- Lower system resource usage

**Cons:**
- Potential log loss if process crashes before flush
- Slight delay before logs appear
- Memory usage for buffer

## Best Practices

**Do:**
- Set appropriate buffer size based on your traffic
- **Always call `close()` before process exit**
- Monitor buffer size vs flush interval balance
- Use with file handlers or network handlers
- Implement graceful shutdown handlers

**Don't:**
- Use huge buffer sizes (risk losing many logs on crash)
- Forget to call `close()` on shutdown (process will hang)
- Use for critical error logging (errors should be immediate)
- Exit process without flushing buffer

## See Also

- [AsyncHandler](./async-handler) - Non-blocking log operations
- [FileHandler](./file-handler) - File logging
