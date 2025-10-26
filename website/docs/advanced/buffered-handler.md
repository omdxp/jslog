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

Always flush on shutdown to avoid losing buffered logs:

```typescript
import { New, BufferedHandler, FileHandler } from '@omdxp/jslog';

const handler = new BufferedHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  bufferSize: 100,
  flushInterval: 5000
});

const logger = New(handler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await handler.flush();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await handler.flush();
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
- Always flush on shutdown
- Monitor buffer size vs flush interval balance
- Use with file handlers or network handlers

**Don't:**
- Use huge buffer sizes (risk losing many logs on crash)
- Forget to flush on shutdown
- Use for critical error logging (errors should be immediate)

## See Also

- [AsyncHandler](./async-handler) - Non-blocking log operations
- [FileHandler](./file-handler) - File logging
