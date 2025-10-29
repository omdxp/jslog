import {
  Logger,
  JSONHandler,
  LogContext,
  String,
  Int,
  infoContext,
} from "../index";

// Example: Using LogContext for request tracking
const requestContext = new LogContext()
  .set("requestId", "req-123")
  .set("userId", "user-456")
  .set("method", "POST")
  .set("path", "/api/users");

const logger = new Logger(new JSONHandler());

// Log with context
logger.infoContext("Processing request", requestContext);

// Add more attributes on top of context
logger.infoContext(
  "Request completed",
  requestContext,
  Int("statusCode", 200),
  String("duration", "145ms")
);

// Using global function
infoContext(
  "Another log with context",
  requestContext,
  String("extra", "data")
);

// Merge contexts
const userContext = new LogContext()
  .set("userName", "Alice")
  .set("role", "admin");

const mergedContext = requestContext.merge(userContext);

logger.infoContext(
  "User action",
  mergedContext,
  String("action", "create-post")
);
