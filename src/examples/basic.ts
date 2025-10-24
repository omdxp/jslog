/**
 * Basic usage example of @omdxp/jslog
 */

import {
  Level,
  TextHandler,
  JSONHandler,
  String,
  Int,
  Bool,
  Error as ErrorAttr,
  info,
  warn,
  error,
  New,
  SetDefault,
} from "../index";

console.log("=== Basic Logging ===");
info("Application started", String("env", "development"), Int("port", 3000));
warn("High memory usage", Int("usage", 85));
error("Failed to connect", String("host", "localhost"));

console.log("\n=== JSON Handler ===");
const jsonLogger = New(new JSONHandler({ level: Level.DEBUG }));
SetDefault(jsonLogger);

info("User logged in", String("user", "alice"), String("ip", "192.168.1.1"));
error("Database error", ErrorAttr(new Error("Connection timeout")));

console.log("\n=== With Attributes ===");
const logger = New(new TextHandler({ level: Level.DEBUG }));
const requestLogger = logger.with(String("request_id", "123-456"));

requestLogger.info("Processing request", String("path", "/api/users"));
requestLogger.debug("Query executed", Int("rows", 42));

console.log("\n=== With Groups ===");
const appLogger = logger.withGroup("app");
appLogger.info("Server started", Int("port", 8080));

const dbLogger = appLogger.withGroup("database");
dbLogger.info("Connected", String("host", "localhost"), Int("pool_size", 10));

console.log("\n=== Different Log Levels ===");
const debugLogger = New(new TextHandler({ level: Level.DEBUG }));
debugLogger.debug("Debug message", String("detail", "verbose"));
debugLogger.info("Info message");
debugLogger.warn("Warning message", Bool("critical", false));
debugLogger.error("Error message", Int("code", 500));
