---
sidebar_position: 1
---

# FileHandler

Write logs to files with automatic rotation and backup management.

## Overview

`FileHandler` writes logs to files with automatic rotation based on file size. This is a feature that Go's slog doesn't have out of the box!

## Basic Usage

```typescript
import { Logger, FileHandler, Level } from '@omdxp/jslog';

const logger = new Logger(new FileHandler({
  filepath: './logs/app.log',
  level: Level.INFO
}));

logger.info('Application started');
// Logs written to ./logs/app.log
```

## Configuration Options

```typescript
interface FileHandlerOptions {
  filepath: string;           // Path to log file
  level?: Level;              // Minimum log level (default: INFO)
  maxSize?: number;           // Max file size in bytes before rotation (default: 10MB)
  maxFiles?: number;          // Number of backup files to keep (default: 5)
  format?: 'text' | 'json';   // Output format (default: 'json')
  addSource?: boolean;        // Add source location (default: false)
  replaceAttr?: (groups: string[], attr: Attr) => Attr;  // Transform attributes
}
```

## File Rotation

### Automatic Rotation

Files are rotated automatically when they reach `maxSize`:

```typescript
const logger = new Logger(new FileHandler({
  filepath: './logs/app.log',
  maxSize: 10 * 1024 * 1024,  // 10MB
  maxFiles: 5                  // Keep 5 backups
}));

// When app.log reaches 10MB:
// app.log -> app.log.1
// app.log.1 -> app.log.2
// ...
// app.log.4 -> app.log.5
// New logs go to app.log
```

### Backup Files

Rotated files are renamed with incrementing numbers:

```
logs/
  app.log        (current)
  app.log.1      (most recent backup)
  app.log.2
  app.log.3
  app.log.4
  app.log.5      (oldest backup, will be deleted on next rotation)
```

## Output Formats

### JSON Format

```typescript
const logger = new Logger(new FileHandler({
  filepath: './logs/app.log',
  format: 'json'
}));

logger.info('Request processed', String('method', 'GET'));
// File contents:
// {"time":"2024-01-01T00:00:00.000Z","level":"INFO","msg":"Request processed","method":"GET"}
```

### Text Format

```typescript
const logger = new Logger(new FileHandler({
  filepath: './logs/app.log',
  format: 'text'
}));

logger.info('Request processed', String('method', 'GET'));
// File contents:
// time=2024-01-01T00:00:00.000Z level=INFO msg="Request processed" method="GET"
```

## Production Setup

### Application Logs

```typescript
import { Logger, FileHandler, Level } from '@omdxp/jslog';

const logger = new Logger(new FileHandler({
  filepath: './logs/app.log',
  level: Level.INFO,
  maxSize: 50 * 1024 * 1024,  // 50MB
  maxFiles: 10,
  format: 'json'
}));
```

### Error-Only Logs

```typescript
const errorLogger = new Logger(new FileHandler({
  filepath: './logs/errors.log',
  level: Level.ERROR,
  maxSize: 10 * 1024 * 1024,
  maxFiles: 20,  // Keep more error logs
  format: 'json'
}));
```

### Multiple File Handlers

```typescript
import { MultiHandler, FileHandler, ColorHandler } from '@omdxp/jslog';

const handler = new MultiHandler([
  // Console for development
  new ColorHandler({ level: Level.DEBUG }),
  
  // All logs
  new FileHandler({
    filepath: './logs/app.log',
    level: Level.INFO,
    format: 'json'
  }),
  
  // Errors only
  new FileHandler({
    filepath: './logs/errors.log',
    level: Level.ERROR,
    format: 'json'
  })
]);

const logger = new Logger(handler);
```

## Log Directory Structure

Organize logs by date or category:

```typescript
const date = new Date().toISOString().split('T')[0];  // YYYY-MM-DD

const handler = new MultiHandler([
  new FileHandler({
    filepath: `./logs/${date}/app.log`,
    level: Level.INFO
  }),
  new FileHandler({
    filepath: `./logs/${date}/errors.log`,
    level: Level.ERROR
  })
]);
```

## Cleanup

Close the file handler when shutting down:

```typescript
const fileHandler = new FileHandler({
  filepath: './logs/app.log'
});

const logger = new Logger(fileHandler);

// On shutdown
process.on('SIGTERM', () => {
  fileHandler.close();
  process.exit(0);
});
```

## Best Practices

### 1. Use JSON Format in Production

```typescript
// ✅ Good: JSON for production
const prodHandler = new FileHandler({
  filepath: './logs/app.log',
  format: 'json',  // Easy to parse by log aggregators
  level: Level.INFO
});
```

### 2. Separate Error Logs

```typescript
const handlers = new MultiHandler([
  // All logs
  new FileHandler({
    filepath: './logs/app.log',
    level: Level.INFO
  }),
  
  // High-priority errors
  new FileHandler({
    filepath: './logs/errors.log',
    level: Level.ERROR,
    maxFiles: 20  // Keep more error history
  })
]);
```

### 3. Configure Rotation Appropriately

```typescript
// High-traffic service
const highTrafficHandler = new FileHandler({
  filepath: './logs/api.log',
  maxSize: 100 * 1024 * 1024,  // 100MB
  maxFiles: 5  // Don't keep too many large files
});

// Low-traffic service
const lowTrafficHandler = new FileHandler({
  filepath: './logs/cron.log',
  maxSize: 1 * 1024 * 1024,  // 1MB
  maxFiles: 30  // Keep more history
});
```

### 4. Add Context to File Logs

```typescript
const fileLogger = new Logger(new FileHandler({
  filepath: './logs/app.log',
  format: 'json'
}));

// Add persistent context
const contextLogger = fileLogger.with(
  String('hostname', os.hostname()),
  String('pid', String(process.pid)),
  String('version', '1.0.0')
);
```

## Integration with Log Aggregators

### Structured JSON for Easy Parsing

```typescript
const logger = new Logger(new FileHandler({
  filepath: './logs/app.log',
  format: 'json',  // Perfect for Elasticsearch, Splunk, etc.
}));

logger.info('HTTP request',
  String('method', 'POST'),
  String('path', '/api/users'),
  Int('status', 201),
  Duration('duration', 45)
);
// Easy to query: status:201 AND method:POST
```

### Custom Attribute Formatting

```typescript
const logger = new Logger(new FileHandler({
  filepath: './logs/app.log',
  format: 'json',
  replaceAttr: (groups, attr) => {
    // Add @ prefix for ELK stack
    if (attr.key === 'time') {
      return { key: '@timestamp', value: attr.value };
    }
    return attr;
  }
}));
```

## Next Steps

- **[Core Concepts](../core-concepts/loggers)** - Understanding loggers
- **[Examples](../examples/basic-usage)** - Basic usage examples
- **[API Reference](../api/overview)** - Complete API reference
