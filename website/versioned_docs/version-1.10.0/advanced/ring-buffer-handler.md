---
sidebar_position: 10
---

# Ring Buffer Handler

The `RingBufferHandler` stores log records in a circular buffer in memory. It is particularly useful for implementing the "Flight Recorder" pattern, where you keep a history of recent logs but only output them when an error occurs or upon request.

## Usage

```typescript
import { Logger, RingBufferHandler, TextHandler } from '@omdxp/jslog';

// Create a ring buffer that holds the last 100 records
const ring = new RingBufferHandler({ limit: 100 });
const logger = new Logger(ring);

// Log normally - these are stored in memory, not printed
logger.info("Application started");
logger.debug("Connecting to DB...");
logger.info("DB Connected");

// ... application runs ...

// If an error occurs, you can flush the buffer to another handler
try {
  throw new Error("Something went wrong");
} catch (err) {
  console.error("Crash detected! Dumping log history:");
  
  // Flush all stored records to stdout using TextHandler
  ring.flush(new TextHandler());
}
```

## Configuration

The `RingBufferHandler` constructor accepts an options object:

```typescript
interface RingBufferHandlerOptions {
  /** Maximum number of records to keep in memory (default: 1000) */
  limit?: number;
}
```

## Methods

### `flush(handler: Handler)`

Replays all stored records to the target handler. The target handler's `enabled()` check is respected for each record.

```typescript
// Flush to JSON format
ring.flush(new JSONHandler());
```

### `getRecords()`

Returns a copy of the stored records as an array of `Record` objects.

```typescript
const records = ring.getRecords();
console.log(`We have ${records.length} logs stored`);
```

### `clear()`

Clears all stored records from the buffer.

```typescript
ring.clear();
```

## Use Cases

### 1. Crash Reporting (Flight Recorder)

In production, you might not want to log `DEBUG` level messages to disk to save space and I/O. However, when a crash happens, those debug logs are invaluable.

Use a `RingBufferHandler` to capture `DEBUG` logs in memory, and a `FileHandler` for `INFO` and above. When an error occurs, flush the ring buffer to the file.

```typescript
import { Logger, MultiHandler, FileHandler, RingBufferHandler, Level } from '@omdxp/jslog';

const fileHandler = new FileHandler({ filepath: 'app.log', level: Level.INFO });
const ringHandler = new RingBufferHandler({ limit: 1000 }); // Captures everything by default

const logger = new Logger(new MultiHandler([fileHandler, ringHandler]));

// ... later on error ...
logger.error("Critical failure");
ringHandler.flush(fileHandler); // Dump debug history to the log file
```

### 2. In-Memory Inspection

For testing or monitoring dashboards, you might want to inspect the last N logs programmatically.

```typescript
app.get('/api/recent-logs', (req, res) => {
  const records = ringHandler.getRecords();
  res.json(records.map(r => ({
    time: r.time,
    msg: r.message,
    level: r.level
  })));
});
```

## Performance

`RingBufferHandler` is extremely fast as it only pushes objects to an array. However, be mindful of the `limit` option to avoid excessive memory usage. The default limit is 1000 records.
