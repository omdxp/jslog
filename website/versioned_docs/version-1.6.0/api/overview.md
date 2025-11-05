---
sidebar_position: 1
---

# Overview

Complete API reference for jslog.

## Quick Reference

### Core Exports

```typescript
import {
  // Logger
  Logger,
  Default,
  SetDefault,
  New,
  
  // Levels
  Level,
  LevelVar,
  
  // Standard Handlers
  TextHandler,
  JSONHandler,
  MultiHandler,
  DiscardHandler,
  
  // Advanced Handlers
  FileHandler,
  ColorHandler,
  PrettyHandler,
  BufferedHandler,
  SamplingHandler,
  FilterHandler,
  AsyncHandler,
  
  // Middleware
  MiddlewareHandler,
  MetricsMiddleware,
  
  // Attributes
  String,
  Int,
  Int64,
  Uint64,
  Float64,
  Bool,
  Time,
  Duration,
  Any,
  Group,
  Err,
  attr,
  
  // Utilities
  Timer,
  startTimer,
  LogContext,
  AttrBuilder,
  attrs,
  
  // Correlation IDs
  setCorrelationId,
  getCorrelationId,
  clearCorrelationId,
  CorrelationId,
  
  // Helpers
  generateRequestId,
  generateTraceId,
  HttpReq,
  HttpRes,
  SqlQuery,
  EnvInfo,
  MemoryUsage,
  StackTrace,
  Caller,
  
  // Data Masking
  redact,
  maskEmail,
  maskCreditCard,
  maskPhone,
  safeStringify,
  lazy,
  
  // Types
  type Attr,
  type Value,
  type Record,
  type Handler,
  type Source,
  type LogValuer,
  type HandlerOptions,
  type HttpRequest,
  type HttpResponse,
} from '@omdxp/jslog';
```

## Module Structure

### Core Module
- Logger and logging functions
- Log levels
- Basic handlers

### Handlers Module
- Standard handlers (Text, JSON, Multi, Discard)
- Advanced handlers (File, Color, Buffered, etc.)

### Middleware Module
- Middleware handlers
- Pre-built middleware functions
- Metrics collection

### Utils Module
- Performance timers
- Correlation IDs
- HTTP helpers
- Data masking
- System info

## Type Definitions

### Value

All possible attribute values:

```typescript
type Value =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Error
  | Value[]
  | { [key: string]: Value }
  | Attr
  | LogValuer;
```

### Attr

Attribute structure:

```typescript
interface Attr {
  key: string;
  value: Value;
}
```

### Record

Log record structure:

```typescript
interface Record {
  time: Date;
  message: string;
  level: Level;
  attrs: Attr[];
  pc?: number;
  source?: Source;
}
```

### Handler

Handler interface:

```typescript
interface Handler {
  enabled(level: Level): boolean;
  handle(record: Record): void;
  withAttrs(attrs: Attr[]): Handler;
  withGroup(name: string): Handler;
}
```

## Next Steps

- **[Getting Started](../getting-started/installation)** - Install jslog
- **[Core Concepts](../core-concepts/loggers)** - Learn the fundamentals
- **[Examples](../examples/basic-usage)** - See examples
