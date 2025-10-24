/**
 * BEAST MODE FEATURES
 * Showcase all the advanced features that Go slog doesn't have
 */

import {
  Level,
  New,
  String,
  Int,
  // Advanced Handlers
  ColorHandler,
  FileHandler,
  BufferedHandler,
  SamplingHandler,
  FilterHandler,
  MultiHandler,
  AsyncHandler,
  // Middleware
  MiddlewareHandler,
  MetricsMiddleware,
  hostnameMiddleware,
  pidMiddleware,
  dedupeMiddleware,
  rateLimitMiddleware,
  enrichMiddleware,
  errorBoundaryMiddleware,
  // Utils
  startTimer,
  attrs,
  generateRequestId,
  HttpReq,
  HttpRes,
  MemoryUsage,
  EnvInfo,
  StackTrace,
  Caller,
  maskEmail,
  setCorrelationId,
  CorrelationId,
} from "../index";

console.log(" BEAST MODE FEATURES - Go slog can't do this! \n");

// 1. COLORFUL CONSOLE OUTPUT 🌈
console.log("=== 1. ColorHandler (Pretty Logs!) ===");
const colorLogger = New(new ColorHandler({ level: Level.DEBUG }));
colorLogger.debug("Debug in cyan", String("status", "investigating"));
colorLogger.info("Info in green", String("status", "running"));
colorLogger.warn("Warning in yellow", String("status", "degraded"));
colorLogger.error("Error in red", String("status", "critical"));

// 2. FILE LOGGING WITH AUTO-ROTATION 📁
console.log("\n=== 2. FileHandler (Auto-rotating logs!) ===");
const fileLogger = New(
  new FileHandler({
    filepath: "./logs/app.log",
    maxSize: 1024 * 1024, // 1MB
    maxFiles: 3,
    format: "json",
  })
);
fileLogger.info("This goes to a file!", String("feature", "file_logging"));
console.log(" Log written to ./logs/app.log");

// 3. BUFFERED HANDLER - PERFORMANCE BEAST ⚡
console.log("\n=== 3. BufferedHandler (Batched for speed!) ===");
const bufferedLogger = New(
  new BufferedHandler({
    handler: new ColorHandler(),
    bufferSize: 50,
    flushInterval: 100,
  })
);
for (let i = 0; i < 5; i++) {
  bufferedLogger.info(`Buffered message ${i}`, Int("index", i));
}
console.log(" Logs buffered and flushed in batches!");

// 4. SAMPLING HANDLER - ONLY LOG 10% 🎯
console.log("\n=== 4. SamplingHandler (10% sample rate) ===");
const samplingLogger = New(
  new SamplingHandler({
    handler: new ColorHandler(),
    rate: 0.1, // Only 10% of logs
    initialCount: 2, // Always log first 2
  })
);
for (let i = 0; i < 20; i++) {
  samplingLogger.info(`Message ${i}`, Int("index", i));
}

// 5. FILTER HANDLER - CONDITIONAL LOGGING 🎛️
console.log("\n=== 5. FilterHandler (Only errors!) ===");
const filterLogger = New(
  new FilterHandler({
    handler: new ColorHandler(),
    filter: (record) => record.level >= Level.ERROR,
  })
);
filterLogger.info("This won't show");
filterLogger.warn("This won't show either");
filterLogger.error("But this will show!", String("filtered", "true"));

// 6. MULTI HANDLER - MULTIPLE DESTINATIONS 📡
console.log("\n=== 6. MultiHandler (Console + File!) ===");
const multiLogger = New(
  new MultiHandler([
    new ColorHandler({ level: Level.DEBUG }),
    new FileHandler({
      filepath: "./logs/multi.log",
      format: "json",
      level: Level.WARN,
    }),
  ])
);
multiLogger.info("To console only");
multiLogger.error("To console AND file!", String("multi", "true"));

// 7. ASYNC HANDLER - NON-BLOCKING
console.log("\n=== 7. AsyncHandler (Non-blocking I/O!) ===");
const asyncLogger = New(
  new AsyncHandler({
    handler: new ColorHandler(),
    errorHandler: (err) => console.error("Async error:", err),
  })
);
asyncLogger.info("Non-blocking log");

// 8. MIDDLEWARE PATTERN - COMPOSITION
console.log("\n=== 8. Middleware (Add hostname, PID, etc!) ===");
const middlewareLogger = New(
  new MiddlewareHandler({
    handler: new ColorHandler(),
    middleware: [
      hostnameMiddleware(),
      pidMiddleware(),
      enrichMiddleware(() => [
        { key: "app", value: "beast-mode" },
        { key: "version", value: "2.0.0" },
      ]),
    ],
  })
);
middlewareLogger.info("With all middleware applied");

// 9. METRICS COLLECTION
console.log("\n=== 9. MetricsMiddleware (Track log stats!) ===");
const metrics = new MetricsMiddleware();
const metricsLogger = New(
  new MiddlewareHandler({
    handler: new ColorHandler(),
    middleware: [metrics.middleware()],
  })
);
metricsLogger.debug("Debug 1");
metricsLogger.info("Info 1");
metricsLogger.info("Info 2");
metricsLogger.warn("Warn 1");
for (let i = 0; i < 5; i++) {
  metricsLogger.error("Error log");
}
console.log("Metrics:", metrics.getStats());

// 10. DEDUPLICATION - PREVENT SPAM
console.log("\n=== 10. Deduplication (Prevent spam!) ===");
const dedupeLogger = New(
  new MiddlewareHandler({
    handler: new ColorHandler(),
    middleware: [dedupeMiddleware(1000)],
  })
);
dedupeLogger.info("This message");
dedupeLogger.info("This message"); // Deduplicated!
dedupeLogger.info("This message"); // Deduplicated!
dedupeLogger.info("Different message");

// 11. RATE LIMITING
console.log("\n=== 11. Rate Limiting (Max 3/second) ===");
const rateLimitLogger = New(
  new MiddlewareHandler({
    handler: new ColorHandler(),
    middleware: [rateLimitMiddleware(3)],
  })
);
for (let i = 0; i < 10; i++) {
  rateLimitLogger.info(`Message ${i}`); // Will rate limit
}

// 12. ATTRIBUTE BUILDER - FLUENT API
console.log("\n=== 12. AttrBuilder (Fluent interface!) ===");
const builderLogger = New(new ColorHandler());
builderLogger.info(
  "Complex attributes",
  ...attrs()
    .str("user", "alice")
    .num("age", 30)
    .bool("active", true)
    .if(true, "conditional", "yes")
    .from({ extra: "data", more: "info" })
    .build()
);

// 13. PERFORMANCE TIMER
console.log("\n=== 13. Performance Timer ===");
const timer = startTimer("operation");
// Simulate some work
for (let i = 0; i < 1000000; i++) {}
builderLogger.info("Operation complete", timer.elapsed());

// 14. CORRELATION IDS 🔗
console.log("\n=== 14. Correlation IDs (Distributed tracing!) ===");
setCorrelationId("trace-123-456");
const corrLogger = New(new ColorHandler());
const corrId = CorrelationId();
if (corrId) {
  corrLogger.info("Request 1", corrId, String("service", "api"));
  corrLogger.info("Request 2", corrId, String("service", "db"));
}

// 15. HTTP REQUEST/RESPONSE HELPERS 🌐
console.log("\n=== 15. HTTP Helpers ===");
builderLogger.info(
  "HTTP request",
  ...HttpReq({
    method: "POST",
    url: "/api/users",
    ip: "192.168.1.1",
    userAgent: "Mozilla/5.0",
  })
);
builderLogger.info(
  "HTTP response",
  ...HttpRes({
    status: 200,
    duration: 45.23,
    size: 1024,
  })
);

// 16. ENVIRONMENT & MEMORY INFO
console.log("\n=== 16. System Info ===");
colorLogger.info("App started", ...EnvInfo());
colorLogger.info("Memory status", ...MemoryUsage());

// 17. SENSITIVE DATA MASKING
console.log("\n=== 17. Data Masking ===");
builderLogger.info(
  "User signup",
  String("email", maskEmail("alice@example.com")),
  String("password", "***REDACTED***")
);

// 18. STACK TRACE
console.log("\n=== 18. Stack Traces & Caller ===");
colorLogger.error("Error occurred", StackTrace());
builderLogger.info("Log with caller info", Caller());

// 19. ERROR BOUNDARY
console.log("\n=== 19. Error Boundary (Catch handler errors!) ===");
const safeLogger = New(
  new MiddlewareHandler({
    handler: new ColorHandler(),
    middleware: [
      errorBoundaryMiddleware((err, record) => {
        console.error(`🛡️ Caught error: ${err.message}`);
      }),
    ],
  })
);
safeLogger.info("Safe logging!", String("protected", "true"));

// 20. REQUEST ID GENERATION 🆔
console.log("\n=== 20. Request ID Generation ===");
const reqId = generateRequestId();
const reqLogger = builderLogger.with(String("request_id", reqId));
reqLogger.info("Request started");
reqLogger.info("Processing...");
reqLogger.info("Request completed");

console.log("\n" + "=".repeat(70));
console.log("JSLOG IS THE GOAT! GO SLOG COULD NEVER!");
console.log("=".repeat(70));
console.log("Features Go slog doesn't have:");
console.log("   - Color output");
console.log("   - File logging with rotation");
console.log("   - Buffering");
console.log("   - Sampling");
console.log("   - Filtering");
console.log("   - Async handlers");
console.log("   - Middleware pattern");
console.log("   - Metrics collection");
console.log("   - Deduplication");
console.log("   - Rate limiting");
console.log("   - Fluent attribute builder");
console.log("   - Performance timers");
console.log("   - Correlation IDs");
console.log("   - HTTP helpers");
console.log("   - System info helpers");
console.log("   - Data masking");
console.log("   - Stack traces");
console.log("   - Error boundaries");
console.log("   - Request ID generation");
console.log("   - Circular reference handling");
console.log("=".repeat(70) + "\n");
