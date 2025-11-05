---
sidebar_position: 3
---

# PrettyHandler

The `PrettyHandler` formats log output with proper indentation and structure, making nested objects and complex data much more readable. It works as a wrapper around other handlers and can be combined with `ColorHandler` for beautiful, colorized pretty output.

## Features

- 🎨 **Beautiful Formatting**: Deep indentation for nested objects
- 🔧 **Handler Wrapper**: Works with any underlying handler (TextHandler, JSONHandler, ColorHandler)
- 📊 **Smart Arrays**: Optional compact mode for primitive arrays
- 🎯 **Depth Control**: Configurable maximum depth to prevent excessive nesting
- 🌈 **Composable**: Combine with ColorHandler for colorized pretty output
- ⚡ **Multi-handler Support**: Use in MultiHandler for different outputs

## Basic Usage

### With TextHandler

```typescript
import { Logger, PrettyHandler, TextHandler, Any } from '@omdxp/jslog';

const logger = new Logger(
  new PrettyHandler({
    handler: new TextHandler()
  })
);

logger.info('User data', Any('user', {
  id: 123,
  name: 'Alice',
  profile: {
    bio: 'Developer',
    settings: {
      theme: 'dark',
      notifications: true
    }
  }
}));
```

### With JSONHandler

```typescript
import { Logger, PrettyHandler, JSONHandler, Any } from '@omdxp/jslog';

const logger = new Logger(
  new PrettyHandler({
    handler: new JSONHandler()
  })
);

logger.info('API Response', Any('data', {
  status: 200,
  body: {
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]
  }
}));
```

## Combining with ColorHandler

For the best development experience, combine `PrettyHandler` with `ColorHandler`:

```typescript
import { Logger, PrettyHandler, ColorHandler, Any } from '@omdxp/jslog';

const logger = new Logger(
  new PrettyHandler({
    handler: new ColorHandler(),
    indent: 4
  })
);

logger.info('Beautiful colorized output', Any('config', {
  server: {
    host: 'localhost',
    port: 3000,
    ssl: {
      enabled: true,
      cert: '/path/to/cert.pem'
    }
  },
  database: {
    host: 'db.example.com',
    port: 5432
  }
}));
```

## Configuration Options

### indent

Number of spaces for each indentation level (default: `2`).

```typescript
const logger = new Logger(
  new PrettyHandler({
    handler: new TextHandler(),
    indent: 4  // Use 4 spaces instead of 2
  })
);
```

### maxDepth

Maximum depth for nested objects (default: `10`). Objects deeper than this will show `[Max depth reached]`.

```typescript
const logger = new Logger(
  new PrettyHandler({
    handler: new TextHandler(),
    maxDepth: 5
  })
);

logger.info('Deep nesting', Any('data', {
  l1: { l2: { l3: { l4: { l5: { l6: 'too deep' } } } } }
}));
// l6 will show as [Max depth reached]
```

### compactArrays

Display primitive arrays in compact mode (default: `false`).

```typescript
const logger = new Logger(
  new PrettyHandler({
    handler: new ColorHandler(),
    compactArrays: true
  })
);

logger.info('Tags', Any('tags', ['typescript', 'logging', 'nodejs']));
// Output: tags=[typescript, logging, nodejs]

logger.info('Numbers', Any('numbers', [1, 2, 3, 4, 5]));
// Output: numbers=[1, 2, 3, 4, 5]

// Complex arrays are still prettified
logger.info('Users', Any('users', [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]));
// Each user object is formatted with indentation
```

## Advanced Examples

### MultiHandler: Pretty Console + Compact File

Log pretty output to console while keeping compact JSON for file processing:

```typescript
import {
  Logger,
  MultiHandler,
  PrettyHandler,
  ColorHandler,
  JSONHandler
} from '@omdxp/jslog';
import * as fs from 'fs';

const logger = new Logger(
  new MultiHandler([
    // Pretty colorized console output
    new PrettyHandler({
      handler: new ColorHandler(),
      indent: 2
    }),
    // Compact JSON for file/processing
    new JSONHandler({
      writer: fs.createWriteStream('./app.log')
    })
  ])
);

logger.info('Request processed', Any('request', {
  method: 'POST',
  path: '/api/users',
  body: { name: 'Alice', email: 'alice@example.com' }
}));
```

### Error Logging with Pretty Format

```typescript
try {
  throw new Error('Database connection failed');
} catch (err) {
  logger.error('Operation failed', Err(err), Any('context', {
    operation: 'query',
    database: 'users_db',
    attempts: 3,
    lastAttempt: new Date()
  }));
}

// Output will show:
// - Error message, name, and stack (prettified)
// - Context object with proper indentation
```

### Groups with PrettyHandler

PrettyHandler properly tracks and displays group prefixes:

```typescript
const appLogger = logger.withGroup('app');
appLogger.info('Application event', { event: 'startup' });

const dbLogger = appLogger.withGroup('database');
dbLogger.info('Database query', Any('query', {
  sql: 'SELECT * FROM users WHERE active = true',
  duration: 45,
  params: []
}));
```

**Output:**
```
2025-11-05T18:56:11.489Z INFO  Application event
app.event="startup"
2025-11-05T18:56:11.489Z INFO  Database query
app.database.query:
{
    duration: 45,
    params: [],
    sql: "SELECT * FROM users WHERE active = true"
}
```

Notice how groups are properly prefixed to attribute keys (`app.event`, `app.database.query`), making it easy to see the attribute hierarchy.

### Development vs Production

Use PrettyHandler in development and compact handlers in production:

```typescript
const isDev = process.env.NODE_ENV === 'development';

const logger = new Logger(
  isDev
    ? new PrettyHandler({
        handler: new ColorHandler(),
        indent: 2
      })
    : new JSONHandler()
);
```

### Child Loggers with Attributes

```typescript
const childLogger = logger.with(
  String('service', 'api'),
  String('version', '1.0.0')
);

childLogger.info('Request processed', Any('request', {
  id: 'req_123',
  method: 'GET',
  path: '/users/123',
  response: {
    status: 200,
    body: {
      id: 123,
      name: 'Alice',
      roles: ['admin', 'user']
    }
  }
}));

// All logs will include service and version attributes
// with proper formatting
```

## Performance Considerations

- **Development Only**: `PrettyHandler` adds formatting overhead. Use it in development but consider compact handlers for production.
- **Depth Limit**: Set `maxDepth` appropriately to avoid excessive processing of deeply nested structures.
- **MultiHandler**: When using `MultiHandler`, put `PrettyHandler` first for console output and compact handlers for file/network logging.

## How It Works

`PrettyHandler` is a **wrapper handler** that:

1. Intercepts log records before they reach the underlying handler
2. Prettifies all attribute values (recursively formatting objects and arrays)
3. Passes the modified record to the wrapped handler
4. Does NOT handle streams or output itself - that's the wrapped handler's job

This design makes it composable with any other handler:

```typescript
// Works with TextHandler
new PrettyHandler({ handler: new TextHandler() })

// Works with JSONHandler
new PrettyHandler({ handler: new JSONHandler() })

// Works with ColorHandler
new PrettyHandler({ handler: new ColorHandler() })

// Works with FileHandler (via advanced handlers)
new PrettyHandler({ handler: new FileHandler({ filepath: './app.log' }) })

// Works in chains
new PrettyHandler({
  handler: new BufferedHandler({
    handler: new FileHandler({ filepath: './app.log' })
  })
})
```

## API Reference

### Constructor

```typescript
constructor(options: PrettyHandlerOptions)
```

### Options

```typescript
interface PrettyHandlerOptions {
  handler: Handler;          // Required: The underlying handler
  indent?: number;           // Optional: Spaces per indent (default: 2)
  maxDepth?: number;         // Optional: Max nesting depth (default: 10)
  compactArrays?: boolean;   // Optional: Compact primitive arrays (default: false)
}
```

### Methods

- `enabled(level: Level): boolean` - Delegates to wrapped handler
- `needsSource(): boolean` - Delegates to wrapped handler
- `handle(record: Record): void` - Prettifies and delegates to wrapped handler
- `withAttrs(attrs: Attr[]): Handler` - Returns new PrettyHandler with attributes
- `withGroup(name: string): Handler` - Returns new PrettyHandler with group
- `close(): Promise<void>` - Closes wrapped handler if it supports closing

## See Also

- [ColorHandler](./color-handler.md) - Add colors to your logs
- [MultiHandler](../core-concepts/handlers.md#multihandler) - Send logs to multiple destinations
- [TextHandler](../core-concepts/handlers.md#texthandler) - Text output format
- [JSONHandler](../core-concepts/handlers.md#jsonhandler) - JSON output format
