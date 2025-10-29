---
sidebar_position: 4
---

# Performance

jslog is designed for high performance while maintaining zero dependencies. In benchmarks, **jslog wins 2 out of 3 categories**, outperforming pino in complex logging and high throughput scenarios.

## Benchmark Results

### Simple Logging (1M iterations)

| Library | Ops/sec | Rank |
|---------|---------|------|
| pino | 510,535 | #1 |
| jslog | 479,579 | #2 |
| bunyan | 241,987 | #3 |
| winston | 135,045 | #4 |
| log4js | 21,106 | #5 |

jslog achieves competitive performance, within 6.1% of pino (more consistent with ±6.15% variance vs pino's ±26.94%).

### Complex Logging with Attributes (100K iterations)

| Library | Ops/sec | Rank | Difference |
|---------|---------|------|------------|
| jslog | 367,958 | #1 | - |
| pino | 329,373 | #2 | -10.5% |
| log4js | 221,374 | #3 | -39.8% |
| winston | 107,410 | #4 | -70.8% |
| bunyan | 53,580 | #5 | -85.4% |

### High Throughput (10K logs, 1K iterations)

| Library | Logs/sec | Rank | Difference |
|---------|----------|------|------------|
| jslog | 422,052 | #1 | - |
| bunyan | 211,607 | #2 | -49.9% |
| winston | 192,742 | #3 | -54.3% |
| pino | 192,704 | #4 | -54.3% |
| log4js | 69,554 | #5 | -83.5% |

:::info
Benchmarks vary ±10-30% between runs due to system load, V8 optimizations, and garbage collection. Tests run on Apple M1, 8 cores, 8GB RAM, Node.js v20.17.0. jslog maintains zero dependencies.
:::

## Running Benchmarks Yourself

You can run these benchmarks on your own system:

```bash
# Clone the repository
git clone https://github.com/omdxp/jslog.git
cd jslog/benchmarks

# Install dependencies
npm install

# Run all benchmarks
npm run bench

# Or run individual benchmarks
npm run bench:simple      # Simple string logging
npm run bench:complex     # Complex logging with attributes
npm run bench:throughput  # High throughput test
```

:::warning Benchmark Variance
Results can vary significantly between runs:
- **System load:** Background processes affect performance
- **V8 JIT warmup:** First runs may be slower
- **Garbage collection:** Can cause spikes in individual runs
- **CPU throttling:** Thermal throttling on laptops
- **Node.js version:** Different V8 versions optimize differently

For accurate results, close other applications and run benchmarks multiple times. The benchmark library runs multiple iterations and uses statistical analysis to determine the fastest library.
:::

## Average Ranking

jslog achieves an average rank of **1.67** across all benchmark categories, winning in 2 out of 3 benchmarks (complex logging and high throughput).

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
- Competitive with pino (within 10.5% in complex logging)

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
- **Outperforms pino in complex logging (10.5% faster)**  
- **Outperforms pino in high throughput (54.3% faster)**
- Competitive in simple logging (within 6.1%, more consistent performance)
- Zero dependencies (pino has dependencies)
- Simpler codebase
- More features (20+ additional features)
- **Wins 2 out of 3 benchmarks**

Trade-offs:
- pino slightly faster in simple logging (but with 26.94% variance vs jslog's 6.15%)
- pino has object pools and C++ bindings available
- pino has a larger ecosystem

### vs winston

- 3.6x faster in simple logging
- 3.4x faster in complex logging  
- 2.2x faster in high throughput

### vs bunyan

- 2.0x faster in simple logging
- 6.9x faster in complex logging
- 2.0x faster in high throughput

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
- Competitive with pino (within 10.5%)

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
// ~480K requests/sec logging capacity
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
// ~368K logs/sec capacity
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

jslog achieves **superior performance** in key scenarios with zero dependencies:

- **#2 in simple logging** (within 6.1% of pino, more consistent)
- **#1 in complex logging** (10.5% faster than pino)
- **#1 in high throughput** (54.3% faster than pino)
- Average rank **1.67** across all benchmarks
- **Wins 2 out of 3 benchmarks against pino**
- Zero dependencies
