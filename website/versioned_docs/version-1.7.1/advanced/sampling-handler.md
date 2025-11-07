---
sidebar_position: 4
---

# SamplingHandler

Probabilistic log sampling for high-volume applications.

## Overview

`SamplingHandler` logs only a percentage of messages, reducing log volume while maintaining statistical visibility. Perfect for high-traffic production systems.

## Basic Usage

```typescript
import { New, SamplingHandler, JSONHandler } from '@omdxp/jslog';

const logger = New(new SamplingHandler({
  handler: new JSONHandler(),
  rate: 0.1  // Log only 10% of messages
}));

// Only ~10 of these will be logged
for (let i = 0; i < 100; i++) {
  logger.info(`Request ${i}`);
}
```

## Configuration Options

```typescript
interface SamplingHandlerOptions {
  handler: Handler;     // Underlying handler
  rate: number;         // Sample rate (0.0 to 1.0)
}
```

## Sample Rates

Common sampling rates:

| Rate | Percentage | Use Case |
|------|------------|----------|
| 1.0 | 100% | Development, debugging |
| 0.5 | 50% | Moderate traffic reduction |
| 0.1 | 10% | High-traffic endpoints |
| 0.01 | 1% | Extremely high traffic |
| 0.001 | 0.1% | Metrics/stats only |

## Use Cases

### High-Traffic Endpoints

Sample routine requests but log all errors:

```typescript
import { 
  New, 
  SamplingHandler, 
  FilterHandler,
  JSONHandler,
  Level 
} from '@omdxp/jslog';

// Sample 10% of INFO logs, but log all ERROR logs
const logger = New(new FilterHandler({
  handler: new SamplingHandler({
    handler: new JSONHandler(),
    rate: 0.1
  }),
  filter: (record) => {
    // Always log errors, sample others
    if (record.level >= Level.ERROR) {
      return true;
    }
    return Math.random() < 0.1;
  }
}));
```

### API Request Logging

```typescript
import { New, SamplingHandler, FileHandler, HttpReq } from '@omdxp/jslog';

const logger = New(new SamplingHandler({
  handler: new FileHandler({ filepath: './logs/api.log' }),
  rate: 0.05  // 5% sampling
}));

app.use((req, res, next) => {
  logger.info('API request', ...HttpReq({
    method: req.method,
    url: req.url,
    ip: req.ip
  }));
  next();
});
```

### Different Rates per Environment

```typescript
const sampleRate = {
  development: 1.0,   // 100% in dev
  staging: 0.5,       // 50% in staging
  production: 0.1     // 10% in production
}[process.env.NODE_ENV || 'development'];

const logger = New(new SamplingHandler({
  handler: new JSONHandler(),
  rate: sampleRate
}));
```

## Level-Based Sampling

Sample INFO logs but always log warnings and errors:

```typescript
import { New, FilterHandler, SamplingHandler, JSONHandler, Level } from '@omdxp/jslog';

const logger = New(new FilterHandler({
  handler: new JSONHandler(),
  filter: (record) => {
    // Always log WARN and ERROR
    if (record.level >= Level.WARN) {
      return true;
    }
    // Sample INFO and DEBUG at 10%
    return Math.random() < 0.1;
  }
}));
```

## Combining with Metrics

Track sampled vs total requests:

```typescript
import { 
  New, 
  SamplingHandler, 
  MiddlewareHandler,
  MetricsMiddleware,
  JSONHandler 
} from '@omdxp/jslog';

const metrics = new MetricsMiddleware();

const logger = New(new MiddlewareHandler({
  handler: new SamplingHandler({
    handler: new JSONHandler(),
    rate: 0.1
  }),
  middleware: [metrics.middleware()]
}));

// Check stats later
setInterval(() => {
  const stats = metrics.getStats();
  console.log('Total logs:', stats.total);
  console.log('Sampled:', stats.total * 0.1);
}, 60000);
```

## Statistical Accuracy

With proper sampling, you can still detect patterns:

```typescript
// Even with 1% sampling, anomalies are visible
const logger = New(new SamplingHandler({
  handler: new JSONHandler(),
  rate: 0.01
}));

// If you see multiple errors in the 1% sample,
// there's likely a bigger problem
app.use((req, res, next) => {
  if (res.statusCode >= 500) {
    logger.error('Server error', HttpReq(req), HttpRes(res));
  } else {
    logger.info('Request', HttpReq(req));
  }
  next();
});
```

## A/B Testing Sampling

Use consistent sampling for user sessions:

```typescript
function getUserSampleRate(userId: string): number {
  // Hash user ID to get consistent sampling
  const hash = hashCode(userId);
  return (hash % 100) / 100;
}

app.use((req, res, next) => {
  const userId = req.user?.id;
  const rate = getUserSampleRate(userId);
  
  if (Math.random() < rate) {
    logger.info('User action', String('userId', userId));
  }
  next();
});
```

## Best Practices

**Do:**
- Use higher sample rates in development
- Always log errors and warnings at 100%
- Monitor metrics to ensure sampling is working
- Document your sampling strategy

**Don't:**
- Sample critical business events
- Use sampling for compliance/audit logs
- Set rate to 0 (use `DiscardHandler` instead)
- Forget that you're sampling (add metadata to indicate it)

## Trade-offs

**Pros:**
- Dramatically reduces log volume
- Lowers storage costs
- Reduces I/O pressure
- Still provides statistical visibility

**Cons:**
- May miss individual events
- Debugging specific issues harder
- Requires larger sample sizes for accuracy

## See Also

- [FilterHandler](./filter-handler) - Conditional logging
- [Middleware](./middleware) - Track log statistics
