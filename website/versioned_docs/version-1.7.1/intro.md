---
sidebar_position: 1
slug: /
---

# Introduction

Welcome to **jslog** - a structured logging library for Node.js that makes Go's log/slog look basic.

## What is jslog?

jslog is a production-ready structured logging library that brings the power of Go's log/slog to Node.js, with **20+ additional features** that Go slog doesn't have.

:::info Performance
jslog achieves #1 ranking in simple logging benchmarks, outperforming pino by 0.6% while maintaining zero dependencies.
- Simple Logging: 488,193 ops/sec (#1)
- Complex Logging: 355,789 ops/sec (4.1% slower than pino)
- Average Rank: 1.7-2.0 across all benchmark categories

[See detailed benchmarks](./performance)
:::

### Key Features

- **Everything Go's slog has** - Full API compatibility with Go's log/slog
- **ColorHandler** - Beautiful, colorful console output
- **PrettyHandler** - Format nested objects with proper indentation
- **FileHandler** - Write to files with automatic rotation
- **BufferedHandler** - Batch logs for performance
- **SamplingHandler** - Log only a percentage of messages
- **FilterHandler** - Conditional logging based on custom logic
- **AsyncHandler** - Non-blocking log operations
- **Middleware Pattern** - Compose handlers with middleware
- **Metrics** - Built-in logging statistics
- **Deduplication** - Prevent log spam automatically
- **Rate Limiting** - Automatic rate limiting
- **Fluent API** - Chain attributes with AttrBuilder
- **Performance Timers** - Built-in timing utilities
- **Correlation IDs** - Global request/trace tracking
- **HTTP Helpers** - Easy request/response logging
- **System Info** - Environment and memory helpers
- **Data Masking** - Built-in PII redaction
- **Stack Traces** - Automatic stack trace capture
- **Error Boundaries** - Catch handler errors safely

## Quick Start

### Installation

```bash
npm install @omdxp/jslog
```

### Basic Usage

```typescript
import { info, warn, error, String, Int } from '@omdxp/jslog';

// Go slog-style variadic parameters (NEW in v1.7.0!)
info('Application started', 'env', 'production', 'port', 3000);
warn('High memory usage', 'percentage', 85);
error('Failed to connect', 'host', 'localhost');

// Traditional style (still works)
info('Application started', String('env', 'production'), Int('port', 3000));
```

## Why Choose jslog?

### Go slog Compatibility + Variadic Parameters
Full API compatibility with Go's log/slog, now with variadic parameters! Use either Go-style key-value pairs OR typed attribute helpers - your choice.

### High Performance
Ranks #1 in simple logging benchmarks with 488,193 ops/sec, outperforming pino while maintaining zero dependencies. Average rank 1.7-2.0 across all benchmark categories.

### Production Ready
Built for production environments with performance, reliability, and observability in mind.

### Zero Dependencies
No external dependencies in production. Competitive performance with libraries that have dependencies.

### Type Safe
Full TypeScript support with complete type safety and IntelliSense.

### Compatible
API-compatible with Go's log/slog, making it familiar for Go developers.

### Feature Rich
20+ features that Go slog doesn't have, built specifically for Node.js environments.

## Next Steps

- **[Performance Guide](./performance)** - Performance benchmarks and optimization tips
- **[Getting Started](./getting-started/installation)** - Install and set up jslog
- **[Core Concepts](./core-concepts/loggers)** - Learn the fundamentals
- **[API Reference](./api/overview)** - Explore the complete API
- **[Examples](./examples/basic-usage)** - See jslog in action
- **[jslog vs Go slog](./comparison)** - Feature comparison
