# Source Location Tracking

Track where log messages originate in your code with zero runtime dependencies.

## Overview

Source location tracking captures the file path, line number, and function name where each log call is made. This feature helps you quickly identify the exact location of log statements during development and debugging.

**Key Features:**
- ✅ Zero runtime dependencies - pure stack trace parsing
- ✅ TypeScript support - shows `.ts` files with tsx/ts-node
- ✅ Production ready - shows compiled `.js` files in production
- ✅ Smart filtering - skips internal jslog frames automatically
- ✅ Function names - captures method/function context
- ✅ Relative paths - clean output relative to working directory

## Basic Usage

Enable source tracking by setting `addSource: true` in any handler:

```typescript
import { Logger, TextHandler, Level, String } from '@omdxp/jslog';

const logger = new Logger(new TextHandler({ 
  level: Level.INFO, 
  addSource: true 
}));

logger.info('User logged in', String('user', 'alice'));
// Output: time=... level=INFO source=app.ts:8 msg="User logged in" user="alice"
```

## Output Formats

### Text Handler

Text handlers show source as `file:line`:

```typescript
const logger = new Logger(new TextHandler({ addSource: true }));

logger.info('Processing request', String('id', '123'));
// Output: time=... level=INFO source=app.ts:15 msg="Processing request" id="123"
```

### JSON Handler

JSON handlers include source as an object with file, line, and function:

```typescript
const logger = new Logger(new JSONHandler({ addSource: true }));

function processOrder(orderId: number) {
  logger.info('Order received', Int('orderId', orderId));
}

processOrder(12345);
// Output: {
//   "time": "...",
//   "level": "INFO",
//   "source": {
//     "function": "processOrder",
//     "file": "app.ts",
//     "line": 23
//   },
//   "msg": "Order received",
//   "orderId": 12345
// }
```

### Color Handler

Color handlers display source information inline with syntax highlighting:

```typescript
const logger = new Logger(new ColorHandler({ addSource: true }));

logger.warn('High memory usage', String('usage', '85%'));
// Output: 2025-11-23T17:00:00.000Z WARN app.ts:42 High memory usage usage="85%"
```

## Advanced Examples

### Class Methods

Source tracking captures method names in classes:

```typescript
class UserService {
  private logger = new Logger(new JSONHandler({ addSource: true }));
  
  createUser(name: string) {
    this.logger.info('Creating user', String('name', name));
    // Source: { "function": "UserService.createUser", "file": "user-service.ts", "line": 8 }
  }
  
  deleteUser(id: number) {
    this.logger.warn('Deleting user', Int('id', id));
    // Source: { "function": "UserService.deleteUser", "file": "user-service.ts", "line": 13 }
  }
}
```

### Nested Functions

Source tracking shows the actual call site, not wrapper functions:

```typescript
const logger = new Logger(new TextHandler({ addSource: true }));

function outerFunction() {
  innerFunction();
}

function innerFunction() {
  logger.info('Called from inner');
  // Source shows innerFunction at line 8, not outerFunction
}

outerFunction();
```

### Different Log Levels

Source tracking works at all log levels:

```typescript
const logger = new Logger(new TextHandler({ 
  level: Level.DEBUG, 
  addSource: true 
}));

logger.debug('Debug info');    // source=app.ts:12
logger.info('Info message');   // source=app.ts:13
logger.warn('Warning');        // source=app.ts:14
logger.error('Error occurred'); // source=app.ts:15
```

## Development vs Production

### TypeScript Development (tsx/ts-node)

During development with TypeScript, source locations show `.ts` files:

```bash
$ npx tsx app.ts
time=... level=INFO source=app.ts:25 msg="Server started" port=3000
```

### Compiled JavaScript (node)

In production with compiled JavaScript, source locations show `.js` files:

```bash
$ node dist/app.js
time=... level=INFO source=dist/app.js:42 msg="Server started" port=3000
```

Both scenarios provide accurate line numbers for troubleshooting.

## Performance Considerations

Source location tracking captures a stack trace for each log call. While the overhead is minimal, consider:

- **Development**: Always enable for better debugging experience
- **Production**: Enable selectively for important logs or error levels
- **High-throughput**: Disable for performance-critical paths

Example of conditional source tracking:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const logger = new Logger(new TextHandler({ 
  level: Level.INFO,
  addSource: isDevelopment // Only in development
}));
```

Or enable only for errors:

```typescript
const errorLogger = new Logger(new JSONHandler({ 
  level: Level.ERROR,
  addSource: true // Only track error sources
}));

const infoLogger = new Logger(new TextHandler({ 
  level: Level.INFO,
  addSource: false // No source for info logs
}));
```

## How It Works

jslog uses pure JavaScript stack trace parsing with zero dependencies:

1. Captures `Error().stack` when a log call is made
2. Filters out internal jslog frames (logger.ts, handlers.ts, etc.)
3. Filters out Node.js internals and runtime loaders
4. Parses the first user code frame for file/line/function
5. Makes file paths relative to `process.cwd()` for clean output

This approach works across all environments without requiring source maps or external libraries.

## Troubleshooting

### Source shows "undefined"

If source is undefined, the stack trace parsing may have failed. This can happen if:
- All frames were filtered out (rare edge case)
- Running in a non-standard environment

### Source shows wrong file

Ensure you're not running compiled code with source maps. The feature works best:
- In development with tsx/ts-node (shows TypeScript files)
- In production with compiled JavaScript (shows compiled files)

### Performance impact

Source tracking adds ~0.1-0.5ms per log call. For most applications this is negligible. If you're logging thousands of times per second, consider disabling it or using it selectively.

## Best Practices

1. **Enable in development**: Always use `addSource: true` during development
2. **Selective in production**: Enable for errors and critical logs only
3. **Use with JSON handlers**: JSON output preserves function names
4. **Combine with context**: Use with `.with()` for even richer debugging context

Example combining all best practices:

```typescript
const isDev = process.env.NODE_ENV === 'development';

// Development logger with full context
const logger = new Logger(new JSONHandler({ 
  level: isDev ? Level.DEBUG : Level.INFO,
  addSource: isDev
})).with(
  String('service', 'api'),
  String('version', '1.0.0')
);

// Production error logger always has source
const errorLogger = new Logger(new JSONHandler({ 
  level: Level.ERROR,
  addSource: true // Always track error sources
}));
```

## Related Features

- [Context Logging](./context.md) - Add persistent attributes
- [JSON Handler](../core-concepts/handlers.md#json-handler) - Structured output
- [Error Handling](./utilities.md#error-helpers) - Stack trace utilities
- [Middleware](./middleware.md) - Transform log records
