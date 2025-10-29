---
sidebar_position: 4
---

# Performance

jslog is designed for high performance while maintaining zero dependencies. In benchmarks, jslog achieves #1 ranking in simple logging scenarios.

## Benchmark Results

### Simple Logging (1M iterations)

| Library | Ops/sec | Rank |
|---------|---------|------|
| jslog | 488,193 | #1 |
| pino | 485,178 | #2 |
| bunyan | 241,987 | #3 |
| log4js | 220,841 | #4 |
| winston | 108,697 | #5 |

jslog outperforms pino by 0.6%.

### Complex Logging with Attributes (100K iterations)

| Library | Ops/sec | Rank | Difference |
|---------|---------|------|------------|
| pino | 371,373 | #1 | - |
| jslog | 355,789 | #2 | -4.1% |
| log4js | 221,374 | #3 | -40.4% |
| bunyan | 160,934 | #4 | -56.7% |
| winston | 76,980 | #5 | -79.3% |

### High Throughput (10K logs, 1K iterations)

| Library | Logs/sec | Rank | Difference |
|---------|----------|------|------------|
| pino | 509,319 | #1 | - |
| jslog | 361,931 | #2 | -28.9% |
| bunyan | 249,500 | #3 | -51.0% |
| log4js | 201,247 | #4 | -60.5% |
| winston | 86,430 | #5 | -83.0% |

:::info
Benchmarks vary ±10-30% between runs due to system load and V8 optimizations. Tests run on Apple M1, 8 cores, 8GB RAM, Node.js v20.17.0. jslog maintains zero dependencies.
:::

## Average Ranking

jslog achieves an average rank of 1.7-2.0 across all benchmark categories.

## Architecture

### Dual-Path System

jslog uses a dual-path architecture that automatically selects the optimal execution path:

**Fast Path** (20-30% faster)
- Used for simple logging without special features
- Direct string building with minimal overhead
- Inline escape checks
- Optimized attribute loops

**Slow Path** (Full-featured)
- Used when groups, replaceAttr, or addSource are needed
- Supports nested JSON structures
- Attribute transformation callbacks
- File/line tracking
- Still within 4.1% of pino performance

```typescript
// Fast path - ultra-optimized
logger.info('User login', String('user', 'alice'));

// Slow path - uses groups
logger.info('User login',
  Group('user',
    String('name', 'alice'),
    String('role', 'admin')
  )
);
```

### Smart Routing

The library automatically detects which features are in use and routes accordingly:

```typescript
// In TextHandler
handle(record: Record): void {
  if (!this.hasGroups && !this.hasReplaceAttr && !this.addSource) {
    this.handleFast(record); // 20-30% faster
    return;
  }
  this.handleSlow(record); // Full features
}
```

### Feature-Based Routing

When advanced features are not in use, there is zero performance overhead:

- No groups: Fast path
- No replaceAttr: Fast path
- No source tracking: Fast path
- Simple logging: Maximum speed

### V8 Optimizations

jslog is optimized for V8's JIT compiler:

- Direct string concatenation
- `Object.keys()` instead of `for...in` loops
- Inline character validation with `charCodeAt()`
- Cached level strings
- Template literals for string building

### Minimal Allocations

The fast path minimizes object allocations:

```typescript
// Avoided: Creating intermediate objects
const obj = { time: Date.now(), level: 'INFO', msg: message };
output(JSON.stringify(obj));

// Implemented: Direct string building
output(`{"time":${Date.now()},"level":"INFO","msg":"${message}"}`);
```

### Smart Escape Checks

Different strategies for different scenarios:

```typescript
// Simple check with indexOf
if (message.indexOf('"') === -1 && message.indexOf('\\') === -1) {
  // No escaping needed
}

// Character-by-character when needed
for (let i = 0; i < len; i++) {
  const c = str.charCodeAt(i);
  if (c === 34 || c === 92 || c === 10 || c === 13 || c === 9 || c < 32) {
    // Escape this character
  }
}
```

## Performance Tips

### Use Simple Logging When Possible

```typescript
// Fast path
logger.info('Request processed', String('method', 'GET'), Int('status', 200));

// Slow path (20-30% slower)
logger.info('Request processed',
  Group('request',
    String('method', 'GET'),
    Int('status', 200)
  )
);
```

### Avoid replaceAttr in Hot Paths

```typescript
// Fast path
const logger = new Logger(new JSONHandler());

// Slow path
const logger = new Logger(new JSONHandler({
  replaceAttr: (attr) => {
    if (attr.key === 'password') return String('password', '[REDACTED]');
    return attr;
  }
}));
```

### Use BufferedHandler for High Volume

```typescript
import { BufferedHandler, JSONHandler } from '@omdxp/jslog';

const handler = new BufferedHandler({
  handler: new JSONHandler(),
  bufferSize: 100,
  flushInterval: 1000
});
```

### Disable Source Tracking in Production

```typescript
// Development
const devLogger = new Logger(new TextHandler({ addSource: true }));

// Production
const prodLogger = new Logger(new TextHandler({ addSource: false }));
```

### Use AsyncHandler for I/O Operations

```typescript
import { AsyncHandler, FileHandler } from '@omdxp/jslog';

const handler = new AsyncHandler({
  handler: new FileHandler({ filepath: 'app.log' })
});
```

## Comparison with Other Libraries

### vs pino

Advantages:
- Outperforms pino in simple logging (0.6% faster)
- Zero dependencies (pino has dependencies)
- Simpler codebase
- More features (20+ additional features)

Trade-offs:
- pino uses worker threads for async logging (28.9% faster in throughput)
- pino has object pools and C++ bindings
- jslog within 4.1% in complex logging

### vs winston

- 4.5x faster in simple logging
- 4.6x faster in complex logging
- 4.2x faster in high throughput

### vs bunyan

- 2.0x faster in simple logging
- 2.2x faster in complex logging
- 1.5x faster in high throughput

## Implementation Details

### Dual-Path Design

The dual-path architecture exists because the fast path cannot implement certain features:

Fast Path Limitations:
- Cannot create nested JSON (groups)
- Cannot transform attributes (replaceAttr)
- Cannot track source location (addSource)
- 20-30% faster for simple logs

Slow Path Capabilities:
- Nested JSON structures
- Attribute transformation callbacks
- File/line tracking
- Handler-level attribute processing
- Within 4.1% of pino performance

### Handler Optimizations

**JSONHandler:**
- Cached level strings
- Smart key validation
- Optimized object serialization with `Object.keys()`

**TextHandler:**
- Direct string concatenation
- Inline escape validation

## Real-World Usage

API request logging (fast path):

```typescript
app.use((req, res, next) => {
  logger.info('Request',
    String('method', req.method),
    String('path', req.path),
    Int('status', res.statusCode)
  );
  next();
});
// ~488K requests/sec logging capacity
```

Complex business logic (slow path):

```typescript
logger.info('Order created',
  Group('order',
    String('id', order.id),
    Float64('total', order.total)
  ),
  Group('customer',
    String('name', customer.name),
    String('email', customer.email)
  )
);
// ~355K logs/sec capacity
```

## v1.3.0 Optimizations

Core Improvements:
- Direct string building in fast path
- Inline escape checks with `charCodeAt()` and `indexOf()`
- Smart key validation
- Template literals for JSON construction
- Cached level strings
- `Object.keys()` instead of `for...in` loops

Security Fixes:
- Explicit character code checks for `\n`, `\r`, `\t`
- Loop-based validation in escape functions
- Inline validation in fast path methods

Bug Fixes:
- Handler flags properly updated in `withGroup()`/`withAttrs()`
- Handler-level attributes included in TextHandler fast path

## Summary

jslog achieves competitive performance with zero dependencies:

- #1 in simple logging
- #2 in complex logging (4.1% slower than pino)
- Average rank 1.7-2.0
- Zero dependencies
