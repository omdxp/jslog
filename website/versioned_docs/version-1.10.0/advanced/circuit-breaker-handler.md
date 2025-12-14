---
sidebar_position: 11
---

# Circuit Breaker Handler

The `CircuitBreakerHandler` wraps a primary handler and prevents cascading failures when that handler starts throwing errors.

When the primary handler fails repeatedly (e.g., disk full, network outage, broken stream), the circuit **opens** for a cooldown period and logs are routed to a fallback handler (if provided) or dropped.

## Usage

```typescript
import { Logger, CircuitBreakerHandler, FileHandler, TextHandler } from '@omdxp/jslog';

const handler = new CircuitBreakerHandler({
  handler: new FileHandler({ filepath: './logs/app.log' }),
  fallbackHandler: new TextHandler(),
  failureThreshold: 3,
  cooldownMs: 10_000,
});

const logger = new Logger(handler);
logger.info('hello');
```

## Configuration

```typescript
interface CircuitBreakerHandlerOptions {
  handler: Handler;
  fallbackHandler?: Handler;
  failureThreshold?: number; // default: 5
  cooldownMs?: number;       // default: 10_000
  onError?: (error: unknown, record: Record) => void;
}
```

## Notes

- The circuit opens when the primary handler throws `failureThreshold` times consecutively.
- While open, logs go to `fallbackHandler` if provided; otherwise they are dropped.
- The handler never re-throws errors from the primary or fallback handler.

## Inspecting Stats

```typescript
const stats = handler.getStats();
console.log(stats.open, stats.totalErrors, stats.fallbackUsed, stats.dropped);
```
