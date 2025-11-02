#!/usr/bin/env node
"use strict";

const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const benchmarks = {
  basic: "basic.bench.js",
  object: "object.bench.js",
  "deep-object": "deep-object.bench.js",
  "long-string": "long-string.bench.js",
  child: "child.bench.js",
  "child-child": "child-child.bench.js",
  "child-creation": "child-creation.bench.js",
  "multi-arg": "multi-arg.bench.js",
  formatters: "formatters.bench.js",
};

function usage() {
  console.log(`
    jslog Pino-Style Benchmarks

    To run a benchmark, specify which to run:

    ・all            ⁃ run all benchmarks (takes a while)
    ・basic          ⁃ log a simple string
    ・object         ⁃ logging a basic object
    ・deep-object    ⁃ logging a large object
    ・long-string    ⁃ logging a long string
    ・multi-arg      ⁃ multiple log method arguments
    ・child          ⁃ child from a parent
    ・child-child    ⁃ child from a child
    ・child-creation ⁃ child constructor
    ・formatters     ⁃ difference between with or without formatters

    Example:

      node runbench.js basic
  `);
}

const benchmarkName = process.argv[2];

if (!benchmarkName || benchmarkName === "--help" || benchmarkName === "-h") {
  usage();
  process.exit(0);
}

const benchmarkDir = join(__dirname, "pino-style");
const quiet = process.argv[3] === "-q";

function runBenchmark(name) {
  const benchFile = benchmarks[name];
  if (!benchFile) {
    console.error(`Unknown benchmark: ${name}`);
    console.error(`Available: ${Object.keys(benchmarks).join(", ")}`);
    process.exit(1);
  }

  const benchPath = join(benchmarkDir, benchFile);

  if (!quiet) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Running: ${name}`);
    console.log("=".repeat(60));
  }

  const result = spawnSync("node", [benchPath], {
    stdio: "inherit",
    cwd: __dirname,
  });

  if (result.status !== 0) {
    console.error(`\nBenchmark ${name} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }

  if (!quiet) {
    console.log("=".repeat(60));
  }
}

if (benchmarkName === "all") {
  console.log("\n🚀 Running ALL benchmarks...\n");
  Object.keys(benchmarks).forEach((name) => {
    runBenchmark(name);
  });
  console.log("\n✅ All benchmarks completed!\n");
} else {
  runBenchmark(benchmarkName);
}
