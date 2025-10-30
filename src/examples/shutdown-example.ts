/**
 * Proper shutdown handling example
 * Shows how to cleanly close all handlers
 */

import {
  New,
  FileHandler,
  BufferedHandler,
  AsyncHandler,
  MultiHandler,
  MiddlewareHandler,
  JSONHandler,
  String,
  hostnameMiddleware,
} from "../index";

async function main() {
  // Example 1: FileHandler
  console.log("=== FileHandler Shutdown ===");
  const fileHandler = new FileHandler({
    filepath: "./logs/shutdown-test.log",
  });
  const fileLogger = New(fileHandler);

  fileLogger.info("Writing to file", String("test", "value"));

  // Close file stream
  fileHandler.close();
  console.log("FileHandler closed\n");

  // Example 2: BufferedHandler
  console.log("=== BufferedHandler Shutdown ===");
  const bufferedHandler = new BufferedHandler({
    handler: new JSONHandler(),
    bufferSize: 100,
    flushInterval: 1000,
  });
  const bufferedLogger = New(bufferedHandler);

  bufferedLogger.info("Buffered log 1");
  bufferedLogger.info("Buffered log 2");

  // Flush and stop timer (now async to handle nested handlers)
  await bufferedHandler.close();
  console.log("BufferedHandler closed (flushed + timer cleared)\n");

  // Example 3: AsyncHandler
  console.log("=== AsyncHandler Shutdown ===");
  const asyncHandler = new AsyncHandler({
    handler: new JSONHandler(),
  });
  const asyncLogger = New(asyncHandler);

  asyncLogger.info("Async log 1");
  asyncLogger.info("Async log 2");

  // Wait for pending operations
  await asyncHandler.close();
  console.log("AsyncHandler closed (all operations complete)\n");

  // Example 4: MultiHandler
  console.log("=== MultiHandler Shutdown ===");
  const multiHandler = new MultiHandler([
    new FileHandler({ filepath: "./logs/multi-1.log" }),
    new BufferedHandler({
      handler: new FileHandler({ filepath: "./logs/multi-2.log" }),
      bufferSize: 50,
    }),
  ]);
  const multiLogger = New(multiHandler);

  multiLogger.info("Multi log 1");
  multiLogger.info("Multi log 2");

  // Closes all wrapped handlers (now async to handle nested handlers)
  await multiHandler.close();
  console.log("MultiHandler closed (all wrapped handlers closed)\n");

  // Example 5: MiddlewareHandler
  console.log("=== MiddlewareHandler Shutdown ===");
  const middlewareHandler = new MiddlewareHandler({
    handler: new BufferedHandler({
      handler: new FileHandler({ filepath: "./logs/middleware.log" }),
      bufferSize: 50,
    }),
    middleware: [hostnameMiddleware()],
  });
  const middlewareLogger = New(middlewareHandler);

  middlewareLogger.info("Middleware log");

  // Closes wrapped handler (now async)
  await middlewareHandler.close();
  console.log("MiddlewareHandler closed (wrapped handler closed)\n");

  // Example 6: Complex nested handlers
  console.log("=== Complex Nested Handlers ===");
  const complexHandler = new AsyncHandler({
    handler: new BufferedHandler({
      handler: new MultiHandler([
        new FileHandler({ filepath: "./logs/complex-1.log" }),
        new FileHandler({ filepath: "./logs/complex-2.log" }),
      ]),
      bufferSize: 100,
    }),
  });
  const complexLogger = New(complexHandler);

  complexLogger.info("Complex log 1");
  complexLogger.info("Complex log 2");

  // Close properly cascades through all layers
  await complexHandler.close();
  console.log("Complex handler closed (all layers closed)\n");

  console.log("All handlers shut down cleanly!");
}

main().catch(console.error);
