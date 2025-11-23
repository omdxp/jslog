import {
  Logger,
  TextHandler,
  JSONHandler,
  ColorHandler,
  Level,
  String,
  Int,
} from "../index.js";

console.log("=== Source Location Tests ===\n");

// Test 1: TextHandler with addSource
console.log("1. TextHandler with source location:");
const textLogger = new Logger(
  new TextHandler({ level: Level.INFO, addSource: true })
);
textLogger.info("Text handler with source", String("test", "value"));

// Test 2: JSONHandler with addSource
console.log("\n2. JSONHandler with source location:");
const jsonLogger = new Logger(
  new JSONHandler({ level: Level.INFO, addSource: true })
);
jsonLogger.info("JSON handler with source", Int("count", 42));

// Test 3: ColorHandler with addSource
console.log("\n3. ColorHandler with source location:");
const colorLogger = new Logger(
  new ColorHandler({ level: Level.INFO, addSource: true })
);
colorLogger.info("Color handler with source", String("color", "blue"));

// Test 4: Source in nested function calls
console.log("\n4. Source location in nested functions:");
const nestedLogger = new Logger(
  new TextHandler({ level: Level.INFO, addSource: true })
);

function outerFunction() {
  innerFunction();
}

function innerFunction() {
  nestedLogger.info("Called from inner function", String("depth", "2"));
}

outerFunction();

// Test 5: Source in class methods
console.log("\n5. Source location in class methods:");
class UserService {
  private logger = new Logger(
    new JSONHandler({ level: Level.INFO, addSource: true })
  );

  createUser(name: string) {
    this.logger.info("Creating user", String("name", name));
  }

  deleteUser(id: number) {
    this.logger.warn("Deleting user", Int("id", id));
  }
}

const service = new UserService();
service.createUser("alice");
service.deleteUser(123);

// Test 6: Source location at different log levels
console.log("\n6. Source location at different log levels:");
const multiLevelLogger = new Logger(
  new TextHandler({ level: Level.DEBUG, addSource: true })
);
multiLevelLogger.debug("Debug message with source");
multiLevelLogger.info("Info message with source");
multiLevelLogger.warn("Warning message with source");
multiLevelLogger.error("Error message with source");

// Test 7: Source with wrapped logging function
console.log("\n7. Source location with wrapper function:");
const wrapperLogger = new Logger(
  new JSONHandler({ level: Level.INFO, addSource: true })
);

function logWrapper(message: string, ...attrs: any[]) {
  wrapperLogger.info(message, ...attrs);
}

logWrapper("Message from wrapper", String("wrapped", "true"));

// Test 8: Source without addSource (should not include source)
console.log("\n8. Handler without addSource (no source expected):");
const noSourceLogger = new Logger(new TextHandler({ level: Level.INFO }));
noSourceLogger.info("This should NOT have source", String("test", "value"));

console.log("\n=== Source Location Tests Complete ===");
