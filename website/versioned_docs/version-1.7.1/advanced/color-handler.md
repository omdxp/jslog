---
sidebar_position: 2
---

# ColorHandler

Beautiful ANSI color-coded console output for development.

## Overview

`ColorHandler` provides colorful console output with automatic coloring based on log levels. Makes your development logs easy to read and debug.

## Basic Usage

```typescript
import { New, ColorHandler, Level, String, Int } from '@omdxp/jslog';

const logger = New(new ColorHandler());

logger.debug('Debug message', String('key', 'value'));  // Gray
logger.info('Info message', Int('count', 42));          // Blue
logger.warn('Warning message');                          // Yellow
logger.error('Error message');                           // Red
```

## Configuration Options

```typescript
interface ColorHandlerOptions {
  level?: Level;              // Minimum log level (default: DEBUG)
  addSource?: boolean;        // Add source location (default: false)
  replaceAttr?: (groups: string[], attr: Attr) => Attr;
}
```

## Color Scheme

Default colors by level:

| Level | Color | ANSI Code |
|-------|-------|-----------|
| DEBUG | Gray | `\x1b[90m` |
| INFO | Blue | `\x1b[34m` |
| WARN | Yellow | `\x1b[33m` |
| ERROR | Red | `\x1b[31m` |

## Development vs Production

Use `ColorHandler` for development and switch to `JSONHandler` for production:

```typescript
import { New, ColorHandler, JSONHandler } from '@omdxp/jslog';

const isDev = process.env.NODE_ENV === 'development';

const logger = New(
  isDev 
    ? new ColorHandler() 
    : new JSONHandler()
);
```

## Example Output

```typescript
import { New, ColorHandler, String, Int, Bool } from '@omdxp/jslog';

const logger = New(new ColorHandler());

logger.info(
  'User login',
  String('username', 'alice'),
  String('ip', '192.168.1.1'),
  Bool('success', true)
);
```

Output (in color):
```
2024-01-15 10:30:45 INFO User login username=alice ip=192.168.1.1 success=true
```

## Combining with Other Features

### With File Handler

Use `MultiHandler` to write colorful logs to console and plain logs to file:

```typescript
import { New, ColorHandler, FileHandler, MultiHandler } from '@omdxp/jslog';

const logger = New(new MultiHandler([
  new ColorHandler(),                           // Colorful console
  new FileHandler({ filepath: './logs/app.log' })  // Plain file logs
]));
```

### With Middleware

Add middleware for enrichment:

```typescript
import { 
  New, 
  MiddlewareHandler, 
  ColorHandler,
  timestampMiddleware,
  hostnameMiddleware 
} from '@omdxp/jslog';

const logger = New(new MiddlewareHandler({
  handler: new ColorHandler(),
  middleware: [
    timestampMiddleware(),
    hostnameMiddleware()
  ]
}));
```

## Best Practices

**Do:**
- Use `ColorHandler` in development for easy debugging
- Switch to `JSONHandler` in production for machine-parseable logs
- Combine with `MultiHandler` to output to multiple destinations

**Don't:**
- Use `ColorHandler` in production (ANSI codes interfere with log aggregators)
- Pipe colored output to files (colors are for terminals only)

## See Also

- [TextHandler](../core-concepts/handlers#texthandler) - Plain text output
- [JSONHandler](../core-concepts/handlers#jsonhandler) - JSON output
- [FileHandler](./file-handler) - File logging with rotation
