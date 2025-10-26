---
sidebar_position: 5
---

# FilterHandler

Advanced conditional logging with custom filter functions.

## Overview

`FilterHandler` allows you to filter log records based on custom logic beyond simple level filtering. Filter by message content, attributes, context, or any custom criteria.

## Basic Usage

```typescript
import { New, FilterHandler, JSONHandler } from '@omdxp/jslog';

const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Only log records with 'critical' in the message
    return record.message.includes('critical');
  }
}));

logger.info('Normal operation');      // Filtered out
logger.info('Critical failure!');     // Logged
```

## Configuration Options

```typescript
interface FilterHandlerOptions {
  handler: Handler;
  filter: (record: Record) => boolean;
}
```

## Filter Functions

### Level-Based Filtering

```typescript
import { New, FilterHandler, JSONHandler, Level } from '@omdxp/jslog';

const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Log ERROR and above, OR anything with 'important'
    return record.level >= Level.ERROR || 
           record.message.includes('important');
  }
}));
```

### Attribute-Based Filtering

```typescript
import { New, FilterHandler, JSONHandler, String } from '@omdxp/jslog';

const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Only log records from production environment
    const env = record.attrs.find(a => a.key === 'env');
    return env?.value === 'production';
  }
}));

logger.info('Test', String('env', 'development'));  // Filtered
logger.info('Live', String('env', 'production'));   // Logged
```

### Time-Based Filtering

```typescript
const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Only log during business hours (9 AM - 5 PM)
    const hour = new Date().getHours();
    return hour >= 9 && hour < 17;
  }
}));
```

## Common Patterns

### Exclude Noisy Logs

```typescript
const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Exclude health check logs
    return !record.message.includes('health check') &&
           !record.message.includes('ping');
  }
}));
```

### User-Based Filtering

```typescript
const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Only log for admin users
    const userId = record.attrs.find(a => a.key === 'userId');
    return isAdmin(userId?.value);
  }
}));
```

### Sampling with Attributes

```typescript
const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Always log errors, sample everything else at 10%
    if (record.level >= Level.ERROR) {
      return true;
    }
    return Math.random() < 0.1;
  }
}));
```

### Environment-Specific Filtering

```typescript
const isDev = process.env.NODE_ENV === 'development';

const logger = New(new FilterHandler({
  handler: new ColorHandler(),
  filter: (record) => {
    if (isDev) {
      // Log everything in development
      return true;
    }
    // In production, only log WARN and above
    return record.level >= Level.WARN;
  }
}));
```

## Combining Filters

### Multiple Conditions

```typescript
const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Complex filter logic
    const isError = record.level >= Level.ERROR;
    const isCritical = record.message.includes('critical');
    const hasUserId = record.attrs.some(a => a.key === 'userId');
    
    return isError || (isCritical && hasUserId);
  }
}));
```

### Chainable Filters

```typescript
import { New, FilterHandler, JSONHandler } from '@omdxp/jslog';

// First filter: Level
const levelFiltered = new FilterHandler({
  handler: new JSONHandler(),
  filter: (r) => r.level >= Level.INFO
});

// Second filter: Message content
const logger = New(new FilterHandler({
  handler: levelFiltered,
  filter: (r) => !r.message.includes('debug')
}));
```

## Use Cases

### Rate Limiting Per User

```typescript
const userCounters = new Map<string, { count: number; resetAt: number }>();

const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    const userId = record.attrs.find(a => a.key === 'userId')?.value as string;
    if (!userId) return true;
    
    const now = Date.now();
    const counter = userCounters.get(userId);
    
    if (!counter || now > counter.resetAt) {
      userCounters.set(userId, { count: 1, resetAt: now + 60000 });
      return true;
    }
    
    if (counter.count < 100) {
      counter.count++;
      return true;
    }
    
    return false; // Rate limit exceeded
  }
}));
```

### Geographic Filtering

```typescript
const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    const region = record.attrs.find(a => a.key === 'region')?.value;
    // Only log from specific regions
    return ['us-east-1', 'eu-west-1'].includes(region as string);
  }
}));
```

### Error Code Filtering

```typescript
const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    const statusCode = record.attrs.find(a => a.key === 'statusCode')?.value;
    // Only log 4xx and 5xx errors
    return statusCode >= 400;
  }
}));
```

## Performance Considerations

Keep filter functions fast:

```typescript
// Good: Simple, fast filter
const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => record.level >= Level.WARN
}));

// Bad: Slow filter with heavy computation
const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Don't do this!
    const result = expensiveComputation(record);
    return result.shouldLog;
  }
}));
```

## Best Practices

**Do:**
- Keep filter functions simple and fast
- Use early returns for performance
- Document your filter logic
- Test filters thoroughly

**Don't:**
- Perform expensive operations in filters
- Mutate the record in filter functions
- Use filters for transformation (use middleware instead)
- Forget that filtered logs are lost forever

## See Also

- [SamplingHandler](./sampling-handler) - Probabilistic filtering
- [Middleware](./middleware) - Transform before filtering
- [Levels](../core-concepts/levels) - Basic level filtering
