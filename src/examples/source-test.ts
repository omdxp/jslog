import { Logger, TextHandler, JSONHandler, Level } from "../index";
import { ColorHandler } from "../advanced-handlers";

console.log("=== Testing addSource parameter ===\n");

// Test 1: TextHandler with addSource
console.log("1. TextHandler with addSource:");
const textLogger = new Logger(
  new TextHandler({ addSource: true, level: Level.DEBUG })
);
textLogger.info("This should show source info", { key: "user", value: "omar" });

console.log("\n2. TextHandler without addSource:");
const textLoggerNoSource = new Logger(new TextHandler({ addSource: false }));
textLoggerNoSource.info("This should NOT show source info", {
  key: "user",
  value: "omar",
});

// Test 3: JSONHandler with addSource
console.log("\n3. JSONHandler with addSource:");
const jsonLogger = new Logger(new JSONHandler({ addSource: true }));
jsonLogger.warn("JSON with source", { key: "status", value: "testing" });

console.log("\n4. JSONHandler without addSource:");
const jsonLoggerNoSource = new Logger(new JSONHandler({ addSource: false }));
jsonLoggerNoSource.warn("JSON without source", {
  key: "status",
  value: "testing",
});

// Test 5: ColorHandler with addSource
console.log("\n5. ColorHandler with addSource:");
const colorLogger = new Logger(
  new ColorHandler({ addSource: true, colorize: true })
);
colorLogger.error("Colorful with source!", { key: "cool", value: true });

console.log("\n6. ColorHandler without addSource:");
const colorLoggerNoSource = new Logger(
  new ColorHandler({ addSource: false, colorize: true })
);
colorLoggerNoSource.error("Colorful without source!", {
  key: "cool",
  value: true,
});

// Test 7: replaceAttr working
console.log("\n7. Testing replaceAttr (should uppercase all keys):");
const replaceLogger = new Logger(
  new TextHandler({
    addSource: true,
    replaceAttr: (groups, attr) => {
      return { key: attr.key.toUpperCase(), value: attr.value };
    },
  })
);
replaceLogger.info("Check out them UPPERCASE keys", {
  key: "name",
  value: "homie",
});

// Test 8: Wrapped function - source should point to the wrapper, not logger internals
console.log("\n8. Testing wrapped logging function:");

function logError(logger: Logger, message: string, error: Error) {
  logger.error(message, { key: "error", value: error.message });
}

function logInfo(logger: Logger, message: string, userId: number) {
  logger.info(message, { key: "userId", value: userId });
}

const wrapLogger = new Logger(new JSONHandler({ addSource: true }));

// The source should show this file and the line where we call logError/logInfo
logError(
  wrapLogger,
  "Something went wrong in wrapper",
  new Error("Test error")
);
logInfo(wrapLogger, "User action logged from wrapper", 42);

console.log("\n=== All tests complete! ===");
