---
sidebar_position: 4
---

# Log Levels

Understanding and managing log levels in jslog.

## Available Levels

jslog has four log levels, matching Go's log/slog:

```typescript
enum Level {
  DEBUG = -4,  // Detailed debug information
  INFO = 0,    // General informational messages
  WARN = 4,    // Warning messages
  ERROR = 8,   // Error messages
}
```

## Level Values

The numeric values allow for level comparison:

```typescript
Level.DEBUG < Level.INFO < Level.WARN < Level.ERROR
```

## Using Levels

### Setting Handler Level

```typescript
import { Logger, TextHandler, Level } from '@omdxp/jslog';

// Only log WARN and ERROR
const logger = new Logger(new TextHandler({ level: Level.WARN }));

logger.debug('Will not show');  // Below WARN
logger.info('Will not show');   // Below WARN
logger.warn('Will show');       // >= WARN
logger.error('Will show');      // >= WARN
```

### Logging at Specific Levels

```typescript
// Method shortcuts
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');

// Generic log method
logger.log(Level.WARN, 'Warning message');
logger.logAttrs(Level.ERROR, 'Error message');
```

## Dynamic Level Control

### LevelVar

Change log levels at runtime:

```typescript
import { LevelVar, Logger, TextHandler, Level } from '@omdxp/jslog';

// Create a level variable
const levelVar = new LevelVar(Level.INFO);

// Pass it to the handler
const logger = new Logger(new TextHandler({ level: levelVar }));

logger.debug('Not visible');  // Won't show
logger.info('Visible');       // Will show

// Change level at runtime (e.g., via API endpoint)
levelVar.set(Level.DEBUG);

logger.debug('Now visible!'); // Will show
```

### Get Current Level

```typescript
const currentLevel = levelVar.level();
console.log('Current level:', levelVar.string());  // "DEBUG", "INFO", etc.
```

## Checking if Level is Enabled

Avoid expensive operations when logging is disabled:

```typescript
import { Level, Any } from '@omdxp/jslog';

// ❌ Bad: Always computes expensive data
logger.debug('Debug info', Any('data', computeExpensiveData()));

// ✅ Good: Only compute if DEBUG is enabled
if (logger.enabled(Level.DEBUG)) {
  const data = computeExpensiveData();
  logger.debug('Debug info', Any('data', data));
}
```

## Level Best Practices

### DEBUG
Use for detailed information useful during development and debugging:

```typescript
logger.debug('Function called',
  String('function', 'processUser'),
  Any('args', { userId: '123' })
);

logger.debug('SQL query',
  String('query', 'SELECT * FROM users WHERE id = ?'),
  Any('params', [123])
);
```

### INFO
Use for general informational messages about application state:

```typescript
logger.info('Server started',
  Int('port', 3000),
  String('env', 'production')
);

logger.info('Request processed',
  String('method', 'POST'),
  String('path', '/api/users'),
  Int('status', 201)
);
```

### WARN
Use for potentially harmful situations that don't prevent execution:

```typescript
logger.warn('High memory usage',
  Float64('usage_percent', 85.5),
  Int('threshold', 80)
);

logger.warn('Deprecated API used',
  String('endpoint', '/v1/users'),
  String('use_instead', '/v2/users')
);
```

### ERROR
Use for error conditions that require attention:

```typescript
logger.error('Database connection failed',
  String('host', 'localhost'),
  Int('port', 5432),
  String('error', err.message)
);

logger.error('Payment processing failed',
  String('transaction_id', 'tx-123'),
  String('reason', 'insufficient_funds')
);
```

## Environment-Based Levels

```typescript
import { Level } from '@omdxp/jslog';

// Get level from environment
const logLevel = process.env.LOG_LEVEL || 'INFO';
const level = Level[logLevel as keyof typeof Level] || Level.INFO;

const logger = new Logger(new TextHandler({ level }));
```

## Multiple Handlers with Different Levels

```typescript
import { MultiHandler, TextHandler, FileHandler, Level } from '@omdxp/jslog';

const handler = new MultiHandler([
  // Console: Show everything in development
  new TextHandler({ level: Level.DEBUG }),
  
  // File: Only warnings and errors
  new FileHandler({
    filepath: './logs/warnings.log',
    level: Level.WARN
  })
]);

const logger = new Logger(handler);

logger.debug('Debug message');  // Only to console
logger.info('Info message');    // Only to console
logger.warn('Warning');         // To both console and file
logger.error('Error');          // To both console and file
```

## Dynamic Level Changes via API

Example Express.js endpoint for runtime level changes:

```typescript
import express from 'express';
import { LevelVar, Level } from '@omdxp/jslog';

const app = express();
const levelVar = new LevelVar(Level.INFO);

app.post('/admin/log-level', (req, res) => {
  const { level } = req.body;
  
  if (level in Level) {
    levelVar.set(Level[level as keyof typeof Level]);
    res.json({ success: true, level });
  } else {
    res.status(400).json({ error: 'Invalid level' });
  }
});

app.get('/admin/log-level', (req, res) => {
  res.json({ level: levelVar.string() });
});
```

## Next Steps

- **[Handlers](./handlers)** - Configure handlers with levels
- **[Configuration](../getting-started/configuration)** - Environment-based configuration
- **[Examples](../examples/basic-usage)** - See levels in action
