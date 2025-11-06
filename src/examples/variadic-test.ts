import { Logger, ColorHandler, String, Int } from "../index";

const logger = new Logger(new ColorHandler());

console.log("=== Variadic Key-Value Pairs (Go slog style) ===");
logger.info("User login", "username", "alice", "attempts", 3, "success", true);
logger.warn("High memory", "usage", 0.85, "threshold", 0.8);
logger.error(
  "Connection failed",
  "host",
  "db.example.com",
  "port",
  5432,
  "timeout",
  5000
);

console.log("\n=== Traditional Attr Helpers ===");
logger.info("User login", String("username", "bob"), Int("attempts", 1));
logger.warn("High memory", String("status", "critical"));

console.log("\n=== Mixed Style (both work!) ===");
logger.info(
  "Mixed",
  String("typed", "value"),
  "key1",
  "value1",
  Int("count", 42),
  "key2",
  "value2"
);

console.log("\n=== Nested Values ===");
logger.info("Complex data", "user", { id: 123, name: "Charlie" }, "tags", [
  "admin",
  "vip",
]);
