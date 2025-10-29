/**
 * Advanced features example of @omdxp/jslog
 */

import {
  Level,
  LevelVar,
  TextHandler,
  JSONHandler,
  MultiHandler,
  DiscardHandler,
  String,
  Int,
  Int64,
  Float64,
  Bool,
  Time,
  Duration,
  Group,
  Err,
  Any,
  New,
  LogContext,
} from "../index";

console.log("=== Level Variants ===");
const logger1 = New(new TextHandler({ level: Level.DEBUG }));
logger1.debug("Debug message", String("component", "auth"));
logger1.info("Info message", String("component", "auth"));
logger1.warn("Warning message", String("component", "auth"));
logger1.error("Error message", String("component", "auth"));

console.log("\n=== Dynamic Level with LevelVar ===");
const levelVar = new LevelVar(Level.INFO);
const logger2 = New(new TextHandler({ level: levelVar }));

logger2.debug("This won't show", String("reason", "level is INFO"));
logger2.info("This will show", String("status", "visible"));

// Change level dynamically
levelVar.set(Level.DEBUG);
logger2.debug("Now this shows!", String("reason", "level changed to DEBUG"));

console.log("\n=== Attribute Types ===");
const logger3 = New(new JSONHandler({ level: Level.DEBUG }));
logger3.info(
  "All attribute types",
  String("name", "Alice"),
  Int("age", 30),
  Int64("userId", 123456789),
  Float64("score", 98.5),
  Bool("active", true),
  Time("createdAt", new Date()),
  Duration("elapsed", 1500),
  Any("metadata", { plan: "pro", tier: 2 })
);

console.log("\n=== Group Attributes ===");
logger3.info(
  "User action",
  String("action", "login"),
  Group("user", String("id", "123"), String("email", "user@example.com")),
  Group("location", String("city", "NYC"), String("country", "USA"))
);

console.log("\n=== Error Handling ===");
try {
  throw new Error("Database connection failed");
} catch (err) {
  logger3.error("Operation failed", Err(err as Error), String("retry", "true"));
}

console.log("\n=== Nested Groups ===");
const appLogger = logger3.withGroup("app");
appLogger.info("Application started", Int("port", 8080));

const dbLogger = appLogger.withGroup("database");
dbLogger.info("Connected", String("host", "localhost"), Int("pool", 10));

const cacheLogger = appLogger.withGroup("cache");
cacheLogger.info("Cache ready", String("type", "redis"));

console.log("\n=== Replace Attribute Function ===");
const logger4 = New(
  new TextHandler({
    level: Level.DEBUG,
    replaceAttr: (groups, attr) => {
      // Redact password fields
      if (attr.key === "password") {
        return { key: attr.key, value: "***REDACTED***" };
      }
      // Rename msg to message
      if (attr.key === "msg") {
        return { key: "message", value: attr.value };
      }
      // Add prefix to all attributes in "secure" group
      if (groups.includes("secure")) {
        return { key: `secure_${attr.key}`, value: attr.value };
      }
      return attr;
    },
  })
);

logger4.info(
  "User login",
  String("username", "alice"),
  String("password", "secret123")
);

const secureLogger = logger4.withGroup("secure");
secureLogger.info(
  "Sensitive data",
  String("token", "abc123"),
  String("key", "xyz789")
);

console.log("\n=== Replace Attribute with JSON (key renaming) ===");
const logger4json = New(
  new JSONHandler({
    level: Level.DEBUG,
    replaceAttr: (groups, attr) => {
      // Rename keys to match common logging standards
      if (attr.key === "msg") {
        return { key: "message", value: attr.value };
      }
      if (attr.key === "time") {
        return { key: "timestamp", value: attr.value };
      }
      return attr;
    },
  })
);

logger4json.info("Testing key renaming", String("user", "bob"));

console.log("\n=== Multi Handler ===");
const textHandler = new TextHandler({ level: Level.INFO });
const jsonHandler = new JSONHandler({ level: Level.WARN });
const multiHandler = new MultiHandler([textHandler, jsonHandler]);
const logger5 = New(multiHandler);

logger5.info("Info level - only text", String("format", "text"));
logger5.warn("Warn level - both formats", String("format", "both"));
logger5.error("Error level - both formats", String("format", "both"));

console.log("\n=== Discard Handler ===");
const discardLogger = New(new DiscardHandler());
discardLogger.info("This will be discarded", String("visible", "false"));
console.log("(Nothing logged above - handler discards all records)");

console.log("\n=== Context Methods ===");
const logger6 = New(new TextHandler({ level: Level.DEBUG }));
const ctx = new LogContext().set("ctx", "value");
logger6.debugContext("Debug with context", ctx);
logger6.infoContext("Info with context", ctx);
logger6.warnContext("Warn with context", ctx);
logger6.errorContext("Error with context", ctx);

console.log("\n=== Enabled Check ===");
const logger7 = New(new TextHandler({ level: Level.WARN }));
if (logger7.enabled(Level.DEBUG)) {
  console.log("Debug is enabled");
} else {
  console.log("Debug is NOT enabled (current level is WARN)");
}

if (logger7.enabled(Level.ERROR)) {
  console.log("Error is enabled");
}

console.log("\n=== Persistent Attributes ===");
const baseLogger = New(new TextHandler({ level: Level.INFO }));
const requestLogger = baseLogger.with(
  String("request_id", "req-123"),
  String("user_id", "user-456")
);

requestLogger.info("Request received", String("path", "/api/users"));
requestLogger.info("Query executed", Int("rows", 42));
requestLogger.info("Response sent", Int("status", 200));

console.log("\n=== Complex Nested Structure ===");
const complexLogger = New(new JSONHandler({ level: Level.INFO }));
complexLogger.info(
  "Complex event",
  String("event", "user.signup"),
  Group(
    "user",
    String("id", "u123"),
    String("email", "user@example.com"),
    Group("profile", String("name", "John Doe"), Int("age", 28))
  ),
  Group(
    "metadata",
    Time("timestamp", new Date()),
    Duration("processingTime", 250),
    Bool("success", true)
  )
);
