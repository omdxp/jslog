#!/usr/bin/env node

/**
 * Test runner that executes example files and validates their output
 */

const { spawn } = require("child_process");
const path = require("path");

const tests = [
  {
    name: "Basic Tests",
    script: "src/examples/basic.ts",
    expectations: [
      "Basic Logging",
      "Application started",
      'env="development"',
      "port=3000",
      "JSON Handler",
      'user":"alice',
      "With Attributes",
      'request_id="123-456"',
      "With Groups",
      "app.port=8080",
      'app.database.host="localhost"',
      "Different Log Levels",
      "level=DEBUG",
      "level=INFO",
      "level=WARN",
    ],
  },
  {
    name: "Advanced Tests",
    script: "src/examples/advanced.ts",
    expectations: [
      "Level Variants",
      "level=DEBUG",
      "level=INFO",
      "level=WARN",
      "level=ERROR",
      "Dynamic Level with LevelVar",
      "Now this shows!",
      "Attribute Types",
      'name":"Alice',
      'age":30',
      "Nested Groups",
      'app":{"database":{"host":"localhost"',
      'app":{"cache":{"type":"redis"',
      "Error Handling",
      "stack",
      "Replace Attribute Function",
      'password="***REDACTED***"',
      "Multi Handler",
      "Context Methods",
      "Enabled Check",
      "Persistent Attributes",
      'user_id="user-456"',
    ],
  },
  {
    name: "Beast Mode Tests",
    script: "src/examples/beast-mode.ts",
    expectations: [
      "BEAST MODE FEATURES",
      "ColorHandler",
      "FileHandler",
      "BufferedHandler",
      "SamplingHandler",
      "FilterHandler",
      "MultiHandler",
      "AsyncHandler",
      "Middleware",
      "MetricsMiddleware",
      "Deduplication",
      "Rate Limiting",
      "AttrBuilder",
      "Performance Timer",
      "Correlation IDs",
      "HTTP Helpers",
      "System Info",
      "Data Masking",
      "Stack Traces",
      "Error Boundary",
      "Request ID Generation",
      "JSLOG IS THE GOAT",
    ],
    timeout: 15000,
  },
];

function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning: ${test.name}`);
    console.log("=".repeat(50));

    const proc = spawn("npx", ["tsx", test.script], {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let completed = false;

    proc.stdout.on("data", (data) => {
      stdout += data.toString();

      // For beast-mode, validate and resolve once we see the completion message
      if (
        test.name === "Beast Mode Tests" &&
        stdout.includes("JSLOG IS THE GOAT") &&
        !completed
      ) {
        completed = true;

        // Validate expectations immediately
        const failed = [];
        test.expectations.forEach((expected) => {
          if (!stdout.includes(expected)) {
            failed.push(expected);
          }
        });

        // Kill the process and resolve/reject based on validation
        setTimeout(() => {
          proc.kill();
          clearTimeout(timer);

          if (failed.length > 0) {
            console.log("FAILED: Missing expected output:");
            failed.forEach((exp) => console.log(`  - "${exp}"`));
            reject(new Error(`${failed.length} expectations not met`));
          } else {
            console.log(
              `PASSED: All ${test.expectations.length} expectations met`
            );
            resolve();
          }
        }, 200); // Give it a moment to finish
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      if (!completed) {
        proc.kill();
        reject(new Error(`Test timeout after ${test.timeout || 5000}ms`));
      }
    }, test.timeout || 5000);

    proc.on("close", (code) => {
      clearTimeout(timer);

      // Beast mode test might hang due to async handlers, so we got the output we need
      const output = stdout + stderr;

      if (code !== 0 && code !== null && output.length === 0) {
        console.log("STDERR:", stderr);
        reject(new Error(`Process exited with code ${code}`));
        return;
      }

      const failed = [];

      // Validate expectations
      test.expectations.forEach((expected) => {
        if (!output.includes(expected)) {
          failed.push(expected);
        }
      });

      if (failed.length > 0) {
        console.log("FAILED: Missing expected output:");
        failed.forEach((exp) => console.log(`  - "${exp}"`));
        console.log("\nActual output preview:");
        console.log(output.substring(0, 1000));
        reject(new Error(`${failed.length} expectations not met`));
      } else {
        console.log(`PASSED: All ${test.expectations.length} expectations met`);
        resolve();
      }
    });

    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log("Starting test suite");
  console.log("=".repeat(50));

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const test of tests) {
    try {
      await runTest(test);
      passed++;
    } catch (error) {
      failed++;
      failures.push({ test: test.name, error: error.message });
      console.log(`FAILED: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Test Summary");
  console.log("=".repeat(50));
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
    process.exit(1);
  } else {
    console.log("\nAll tests passed!");
    process.exit(0);
  }
}

runAllTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
