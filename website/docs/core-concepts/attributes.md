---
sidebar_position: 3
---

# Attributes

Attributes are key-value pairs that add structured data to log records.

## What are Attributes?

Attributes provide context to log messages in a structured, machine-parseable format.

:::tip NEW in v1.7.0 - Variadic Parameters
jslog now supports **Go slog-style variadic parameters**! You can use either:
- **Go style**: `info('msg', 'key', 'value', 'key2', 'value2')`
- **Traditional**: `info('msg', String('key', 'value'), Int('key2', 42))`
- **Mixed**: Combine both styles in the same call!
:::

```typescript
import { info, String, Int, Bool } from '@omdxp/jslog';

// Go slog-style (NEW in v1.7.0!)
info('User action',
  'user', 'alice',
  'action', 'login',
  'attempts', 3,
  'success', true
);

// Traditional typed style
info('User action',
  String('user', 'alice'),     // String attribute
  String('action', 'login'),   // String attribute
  Int('attempts', 3),          // Integer attribute
  Bool('success', true)        // Boolean attribute
);

// Mixed style - use both!
info('User action',
  String('user', 'alice'),   // Typed
  'action', 'login',         // Variadic
  Int('attempts', 3),        // Typed
  'success', true            // Variadic
);
```

## Attribute Types

### String

String values:

```typescript
import { String } from '@omdxp/jslog';

logger.info('Event', String('name', 'user.created'));
```

### Int / Int64

Integer values:

```typescript
import { Int, Int64 } from '@omdxp/jslog';

logger.info('Metrics',
  Int('count', 42),
  Int64('user_id', 9007199254740991)
);
```

### Uint64

Unsigned 64-bit integer:

```typescript
import { Uint64 } from '@omdxp/jslog';

logger.info('ID', Uint64('transaction_id', 12345678901234567));
```

### Float64

Floating point numbers:

```typescript
import { Float64 } from '@omdxp/jslog';

logger.info('Metrics',
  Float64('cpu_usage', 85.5),
  Float64('memory_mb', 1024.75)
);
```

### Bool

Boolean values:

```typescript
import { Bool } from '@omdxp/jslog';

logger.info('Status',
  Bool('is_active', true),
  Bool('has_premium', false)
);
```

### Time

Date/time values:

```typescript
import { Time } from '@omdxp/jslog';

logger.info('Event',
  Time('created_at', new Date()),
  Time('scheduled_for', new Date('2024-12-31'))
);
```

### Duration

Duration in milliseconds:

```typescript
import { Duration } from '@omdxp/jslog';

logger.info('Performance',
  Duration('elapsed', 1500)  // Outputs as "1500ms"
);
```

### Any

Any value (objects, arrays, etc.):

```typescript
import { Any } from '@omdxp/jslog';

logger.info('Complex data',
  Any('config', { timeout: 5000, retries: 3 }),
  Any('tags', ['production', 'api'])
);
```

### Group

Group related attributes:

```typescript
import { Group, String, Int } from '@omdxp/jslog';

logger.info('User event',
  Group('user',
    String('id', 'u123'),
    String('email', 'alice@example.com')
  ),
  Group('location',
    String('city', 'NYC'),
    String('country', 'USA')
  )
);

// JSON Output:
// {
//   "user": { "id": "u123", "email": "alice@example.com" },
//   "location": { "city": "NYC", "country": "USA" }
// }
```

### Err

Error objects with stack traces:

```typescript
import { Err } from '@omdxp/jslog';

try {
  throw new Error('Connection timeout');
} catch (err) {
  logger.error('Operation failed', Err(err as Error));
}

// Can also use with error messages
logger.error('Failed', Err('Custom error message'));
```

## Advanced Attribute Usage

### Nested Groups

```typescript
import { Group, String, Int } from '@omdxp/jslog';

logger.info('Server config',
  Group('server',
    Int('port', 8080),
    Group('database',
      String('host', 'localhost'),
      Int('pool_size', 10)
    )
  )
);

// Output: server.port=8080 server.database.host="localhost" server.database.pool_size=10
```

### Using with Logger Context

```typescript
import { New, TextHandler, String, Int } from '@omdxp/jslog';

const baseLogger = New(new TextHandler());

// Add persistent attributes
const appLogger = baseLogger.with(
  String('app', 'myapp'),
  String('version', '1.0.0')
);

// All logs from appLogger include these attributes
appLogger.info('Started', Int('port', 3000));
// Output includes: app="myapp" version="1.0.0" port=3000
```

### AttrBuilder (Fluent API)

Build attributes fluently:

```typescript
import { attrs } from '@omdxp/jslog';

const attributes = attrs()
  .str('user', 'alice')
  .num('age', 30)
  .bool('active', true)
  .time('created', new Date())
  .if(condition, 'conditional', 'value')  // Only add if condition is true
  .from({ role: 'admin', team: 'engineering' })  // Add from object
  .build();

logger.info('User created', ...attributes);
```

## Generic Attribute Constructor

Create attributes manually:

```typescript
import { attr } from '@omdxp/jslog';

const customAttr = attr('custom_key', 'custom_value');
logger.info('Message', customAttr);
```

## LogValuer Interface

Create custom types that control how they're logged:

```typescript
import { LogValuer, Value } from '@omdxp/jslog';

class User implements LogValuer {
  constructor(
    public id: string,
    public email: string,
    private password: string  // Sensitive!
  ) {}

  logValue(): Value {
    // Only expose safe data
    return {
      id: this.id,
      email: this.maskEmail(this.email)
    };
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    return `${name[0]}***@${domain}`;
  }
}

const user = new User('u123', 'alice@example.com', 'secret');
logger.info('User action', Any('user', user));
// Logs: user={"id":"u123","email":"a***@example.com"}
```

## Best Practices

### 1. Use Appropriate Types

```typescript
// ❌ Bad: Everything as strings
logger.info('Stats', String('count', '42'), String('active', 'true'));

// ✅ Good: Use proper types
logger.info('Stats', Int('count', 42), Bool('active', true));
```

### 2. Group Related Data

```typescript
// ❌ Bad: Flat structure
logger.info('Event',
  String('user_id', '123'),
  String('user_email', 'alice@example.com'),
  String('user_role', 'admin')
);

// ✅ Good: Grouped
logger.info('Event',
  Group('user',
    String('id', '123'),
    String('email', 'alice@example.com'),
    String('role', 'admin')
  )
);
```

### 3. Consistent Naming

```typescript
// ✅ Good: Consistent snake_case
logger.info('Event',
  String('user_id', '123'),
  String('request_id', 'req-456'),
  Int('response_time_ms', 150)
);
```

### 4. Avoid Sensitive Data

```typescript
// ❌ Bad: Logging sensitive data
logger.info('Login', String('password', password));

// ✅ Good: Redact or omit
logger.info('Login', String('user', username));  // No password!
```

## Next Steps

- **[Handlers](./handlers)** - Understanding handlers
- **[Levels](./levels)** - Understanding log levels
- **[Examples](../examples/basic-usage)** - Attribute usage examples
