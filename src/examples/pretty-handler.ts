/**
 * PrettyHandler examples showing various use cases
 */

import {
  Logger,
  Level,
  PrettyHandler,
  TextHandler,
  JSONHandler,
  ColorHandler,
  MultiHandler,
  String,
  Int,
  Any,
  Err,
} from "../index";

console.log("=== Basic PrettyHandler with TextHandler ===");
const prettyText = new Logger(
  new PrettyHandler({
    handler: new TextHandler({ level: Level.DEBUG }),
  })
);

prettyText.info("Simple message", String("user", "Alice"), Int("age", 30));

prettyText.info(
  "Nested object",
  Any("user", {
    id: 123,
    name: "Alice",
    email: "alice@example.com",
    profile: {
      bio: "Developer",
      settings: {
        theme: "dark",
        notifications: true,
        privacy: {
          showEmail: false,
          showPhone: false,
        },
      },
    },
  })
);

console.log("\n=== Regular TextHandler (Without Pretty) for Comparison ===");
const regularText = new Logger(new TextHandler({ level: Level.DEBUG }));

regularText.info(
  "Same nested object",
  Any("user", {
    id: 123,
    name: "Alice",
    email: "alice@example.com",
    profile: {
      bio: "Developer",
      settings: {
        theme: "dark",
        notifications: true,
        privacy: {
          showEmail: false,
          showPhone: false,
        },
      },
    },
  })
);

console.log("\n=== PrettyHandler with JSONHandler ===");
const prettyJson = new Logger(
  new PrettyHandler({
    handler: new JSONHandler({ level: Level.INFO }),
  })
);

prettyJson.info(
  "User registration",
  String("event", "signup"),
  Any("data", {
    user: {
      id: "usr_123",
      email: "bob@example.com",
      metadata: {
        referrer: "google",
        campaign: "summer2024",
      },
    },
    timestamp: new Date(),
  })
);

console.log("\n=== PrettyHandler + ColorHandler (Pretty & Colorful!) ===");
const prettyColor = new Logger(
  new PrettyHandler({
    handler: new ColorHandler({ level: Level.DEBUG }),
    indent: 4,
  })
);

prettyColor.debug(
  "Debug with nested data",
  Any("config", {
    server: {
      host: "localhost",
      port: 3000,
      ssl: {
        enabled: true,
        cert: "/path/to/cert.pem",
        key: "/path/to/key.pem",
      },
    },
    database: {
      host: "db.example.com",
      port: 5432,
      pool: {
        min: 2,
        max: 10,
      },
    },
  })
);

prettyColor.info("Info level with pretty colors");
prettyColor.warn(
  "Warning with pretty format",
  String("reason", "threshold exceeded")
);
prettyColor.error("Error with pretty display", String("code", "E001"));

console.log("\n=== Arrays and Complex Structures ===");
prettyColor.info(
  "Complex data structure",
  Any("analytics", {
    events: [
      { type: "click", target: "button", timestamp: "2024-01-15T10:30:00Z" },
      { type: "view", target: "page", timestamp: "2024-01-15T10:30:05Z" },
      { type: "submit", target: "form", timestamp: "2024-01-15T10:30:10Z" },
    ],
    summary: {
      total: 3,
      byType: {
        click: 1,
        view: 1,
        submit: 1,
      },
    },
  })
);

console.log("\n=== Compact Arrays Mode ===");
const compactHandler = new Logger(
  new PrettyHandler({
    handler: new ColorHandler(),
    compactArrays: true,
  })
);

compactHandler.info(
  "Compact primitive arrays",
  Any("numbers", [1, 2, 3, 4, 5]),
  Any("tags", ["typescript", "logging", "nodejs"])
);

compactHandler.info(
  "Complex arrays still prettified",
  Any("users", [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Charlie" },
  ])
);

console.log("\n=== Error Handling with Pretty Display ===");
try {
  throw new Error("Database connection failed");
} catch (err) {
  prettyColor.error(
    "Operation failed",
    Err(err as Error),
    Any("context", {
      operation: "query",
      database: "users_db",
      attempts: 3,
      lastAttempt: new Date(),
    })
  );
}

console.log("\n=== MultiHandler: Pretty Console + Compact File ===");
const multiLogger = new Logger(
  new MultiHandler([
    new PrettyHandler({
      handler: new ColorHandler(),
      indent: 2,
    }),
    new JSONHandler(), // Compact JSON for processing
  ])
);

multiLogger.info(
  "Logged to both handlers",
  Any("request", {
    method: "POST",
    path: "/api/users",
    body: {
      name: "Alice",
      email: "alice@example.com",
    },
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0",
    },
  })
);

console.log("\n=== Groups with PrettyHandler ===");
const appLogger = prettyColor.withGroup("app");
appLogger.info("Application event", String("event", "startup"));

const dbLogger = appLogger.withGroup("database");
dbLogger.info(
  "Database query",
  Any("query", {
    sql: "SELECT * FROM users WHERE active = true",
    params: [],
    duration: 45,
  })
);

console.log("\n=== Deep Nesting Test ===");
prettyColor.info(
  "Very deep structure",
  Any("deep", {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              level6: {
                value: "Found me!",
                data: [1, 2, 3],
              },
            },
          },
        },
      },
    },
  })
);

console.log("\n=== Max Depth Limit ===");
const limitedDepth = new Logger(
  new PrettyHandler({
    handler: new ColorHandler(),
    maxDepth: 3,
  })
);

limitedDepth.info(
  "Limited depth",
  Any("deep", {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: "This won't show in full detail",
          },
        },
      },
    },
  })
);

console.log("\n=== Mixed Content Types ===");
prettyColor.info(
  "Various data types",
  String("string", "hello"),
  Int("number", 42),
  Any("boolean", true),
  Any("null", null),
  Any("date", new Date()),
  Any("array", [1, "two", true, null]),
  Any("object", {
    nested: {
      key: "value",
    },
  })
);

console.log("\n=== Child Logger with Attributes ===");
const childLogger = prettyColor.with(
  String("service", "api"),
  String("version", "1.0.0")
);

childLogger.info(
  "Request processed",
  Any("request", {
    id: "req_123",
    method: "GET",
    path: "/users/123",
    response: {
      status: 200,
      body: {
        id: 123,
        name: "Alice",
        roles: ["admin", "user"],
      },
    },
  })
);
