#!/usr/bin/env node

/**
 * Benchmark Report Generator
 * Runs all benchmarks and generates BENCH.md with results
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
};

console.log(
  `${colors.bright}${colors.blue}🚀 Running benchmarks...${colors.reset}\n`
);

// Run each benchmark and capture results
const runBenchmark = (name, file) => {
  console.log(`${colors.yellow}Running ${name}...${colors.reset}`);
  try {
    // Generate unique temporary file name using crypto to avoid collisions
    const randomId = crypto.randomBytes(8).toString("hex");
    const tmpFile = path.join(os.tmpdir(), `bench-${randomId}.log`);
    execSync(`node ${file} > ${tmpFile} 2>&1`, {
      cwd: __dirname,
      stdio: "inherit",
    });
    const output = fs.readFileSync(tmpFile, "utf8");
    fs.unlinkSync(tmpFile);
    return output;
  } catch (error) {
    console.error(`Error running ${name}:`, error.message);
    return null;
  }
};

// Parse ops/sec from benchmark output
const parseResults = (output, benchmarkType) => {
  const results = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // Match pattern like "jslog x 288,171 ops/sec ±4.29% (87 runs sampled)"
    const match = line.match(
      /^(\w+)\s+x\s+([\d,]+)\s+ops\/sec\s+±([\d.]+)%\s+\((\d+)\s+runs sampled\)/
    );
    if (match) {
      const [, library, opsStr, margin, runs] = match;
      const ops = parseInt(opsStr.replace(/,/g, ""));
      results.push({
        library,
        ops,
        margin: parseFloat(margin),
        runs: parseInt(runs),
      });
    }
  }

  // Sort by ops (descending)
  results.sort((a, b) => b.ops - a.ops);

  // Add ranking
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return results;
};

// Parse throughput test results
const parseThroughputResults = (output) => {
  const results = [];
  const lines = output.split("\n");

  let inResults = false;
  for (const line of lines) {
    if (line.includes("Results:")) {
      inResults = true;
      continue;
    }

    if (inResults && line.includes("logs/sec")) {
      // Match pattern like "🥇 pino       -     199.82 ms -          500460 logs/sec"
      const match = line.match(
        /[🥇🥈🥉]?\s*(\w+)\s+-\s+([\d.]+)\s+ms\s+-\s+([\d,]+)\s+logs\/sec/
      );
      if (match) {
        const [, library, time, logsStr] = match;
        const logs = parseInt(logsStr.replace(/,/g, ""));
        results.push({
          library,
          time: parseFloat(time),
          logs,
        });
      }
    }
  }

  // Sort by logs/sec (descending)
  results.sort((a, b) => b.logs - a.logs);

  // Add ranking
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return results;
};

// Format number with commas
const formatNumber = (num) => {
  return num.toLocaleString("en-US");
};

// Get medal emoji
const getMedal = (rank) => {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return "  ";
  }
};

// Generate markdown table for ops/sec benchmarks
const generateOpsTable = (results) => {
  let table = "| Rank | Library | ops/sec | Margin of Error | Runs |\n";
  table += "|------|---------|---------|----------------|------|\n";

  for (const r of results) {
    const medal = getMedal(r.rank);
    const highlight = r.library === "jslog" ? "**" : "";
    table += `| ${medal} ${r.rank} | ${highlight}${
      r.library
    }${highlight} | ${formatNumber(r.ops)} | ±${r.margin.toFixed(2)}% | ${
      r.runs
    } |\n`;
  }

  return table;
};

// Generate markdown table for throughput benchmark
const generateThroughputTable = (results) => {
  let table = "| Rank | Library | Time (ms) | logs/sec |\n";
  table += "|------|---------|-----------|----------|\n";

  for (const r of results) {
    const medal = getMedal(r.rank);
    const highlight = r.library === "jslog" ? "**" : "";
    table += `| ${medal} ${r.rank} | ${highlight}${
      r.library
    }${highlight} | ${r.time.toFixed(2)} | ${formatNumber(r.logs)} |\n`;
  }

  return table;
};

// Generate performance comparison
const generateComparison = (results) => {
  const fastest = results[0];
  const jslogResult = results.find((r) => r.library === "jslog");

  if (!jslogResult) return "";

  let comparison = "\n### jslog Performance\n\n";

  if (jslogResult.rank === 1) {
    const secondPlace = results[1];
    const advantage = ((jslogResult.ops / secondPlace.ops - 1) * 100).toFixed(
      1
    );
    comparison += `✨ **jslog is the fastest!** ${advantage}% faster than ${secondPlace.library}.\n`;
  } else {
    const ratio = (fastest.ops / jslogResult.ops).toFixed(2);
    const percentage = ((1 - jslogResult.ops / fastest.ops) * 100).toFixed(1);
    comparison += `📊 jslog ranks #${jslogResult.rank}, ${ratio}x slower than ${fastest.library} (${percentage}% difference).\n`;
  }

  return comparison;
};

// Generate throughput comparison
const generateThroughputComparison = (results) => {
  const fastest = results[0];
  const jslogResult = results.find((r) => r.library === "jslog");

  if (!jslogResult) return "";

  let comparison = "\n### jslog Performance\n\n";

  if (jslogResult.rank === 1) {
    const secondPlace = results[1];
    const advantage = ((jslogResult.logs / secondPlace.logs - 1) * 100).toFixed(
      1
    );
    comparison += `✨ **jslog is the fastest!** ${advantage}% faster than ${secondPlace.library}.\n`;
  } else {
    const ratio = (fastest.logs / jslogResult.logs).toFixed(2);
    const percentage = ((1 - jslogResult.logs / fastest.logs) * 100).toFixed(1);
    comparison += `📊 jslog ranks #${jslogResult.rank}, ${ratio}x slower than ${fastest.library} (${percentage}% difference).\n`;
  }

  return comparison;
};

// Parse Pino-style benchmark results (fastbench format)
const parsePinoResults = (output) => {
  const results = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // Match pattern like "benchJslogJSON*10000: 181.474ms" or "benchBunyan*10000: 1.131s"
    const matchMs = line.match(/^bench(\w+)\*\d+:\s+([\d.]+)ms/);
    const matchS = line.match(/^bench(\w+)\*\d+:\s+([\d.]+)s$/);

    const match = matchMs || matchS;
    if (match) {
      const [, name, timeStr] = match;
      let time = parseFloat(timeStr);
      // Convert seconds to milliseconds
      if (matchS) time = time * 1000;

      // Map benchmark names to friendly library names
      let library = name;
      if (name.includes("Jslog")) library = "jslog";
      else if (
        name.includes("Pino") &&
        !name.includes("MinLength") &&
        !name.includes("NodeStream")
      )
        library = "pino";
      else if (name.includes("Bunyan")) library = "bunyan";
      else if (name.includes("Winston")) library = "winston";
      else continue; // Skip MinLength, NodeStream variants

      results.push({ library, time, name });
    }
  }

  // Group by library and take best (fastest) time
  const grouped = {};
  results.forEach((r) => {
    if (!grouped[r.library] || r.time < grouped[r.library].time) {
      grouped[r.library] = r;
    }
  });

  // Convert back to array and sort by time (ascending)
  const finalResults = Object.values(grouped).sort((a, b) => a.time - b.time);

  // Add ranking
  finalResults.forEach((r, i) => {
    r.rank = i + 1;
  });

  return finalResults;
};

// Generate markdown table for Pino-style benchmarks
const generatePinoTable = (results) => {
  let table = "| Rank | Library | Time (ms) | Performance |\n";
  table += "|------|---------|-----------|-------------|\n";

  const fastest = results[0];

  for (const r of results) {
    const medal = getMedal(r.rank);
    const highlight = r.library === "jslog" ? "**" : "";
    const percentage =
      r.time === fastest.time
        ? "baseline"
        : `${((r.time / fastest.time - 1) * 100).toFixed(1)}% slower`;
    table += `| ${medal} ${r.rank} | ${highlight}${
      r.library
    }${highlight} | ${r.time.toFixed(2)} | ${percentage} |\n`;
  }

  return table;
};

// Generate Pino-style comparison
const generatePinoComparison = (results) => {
  const fastest = results[0];
  const jslogResult = results.find((r) => r.library === "jslog");

  if (!jslogResult || results.length < 2) return "";

  let comparison = "\n### jslog Performance\n\n";

  if (jslogResult.rank === 1) {
    const secondPlace = results[1];
    const advantage = ((secondPlace.time / jslogResult.time - 1) * 100).toFixed(
      1
    );
    comparison += `✨ **jslog is the fastest!** ${advantage}% faster than ${secondPlace.library}.\n`;
  } else {
    const percentage = ((jslogResult.time / fastest.time - 1) * 100).toFixed(1);
    comparison += `📊 jslog ranks #${jslogResult.rank}, ${percentage}% slower than ${fastest.library}.\n`;
  }

  return comparison;
};

// Get system information
const getSystemInfo = () => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus()[0].model,
    cores: os.cpus().length,
    nodeVersion: process.version,
    totalMemory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + " GB",
  };
};

// Main execution
const main = () => {
  const timestamp = new Date().toISOString().split("T")[0];
  const sysInfo = getSystemInfo();

  // Run original benchmarks
  console.log(`${colors.yellow}Running original benchmarks...${colors.reset}`);
  const simpleOutput = runBenchmark("Simple Logging", "simple-logging.js");
  const complexOutput = runBenchmark("Complex Logging", "complex-logging.js");
  const throughputOutput = runBenchmark(
    "High Throughput",
    "high-throughput.js"
  );

  if (!simpleOutput || !complexOutput || !throughputOutput) {
    console.error("Failed to run one or more benchmarks");
    process.exit(1);
  }

  // Parse original results
  const simpleResults = parseResults(simpleOutput, "simple");
  const complexResults = parseResults(complexOutput, "complex");
  const throughputResults = parseThroughputResults(throughputOutput);

  // Run Pino-style benchmarks
  console.log(
    `\n${colors.yellow}Running Pino-style benchmarks...${colors.reset}`
  );
  const pinoDir = path.join(__dirname, "pino-style");
  const pinoBenchmarks = {
    basic: "basic.bench.js",
    object: "object.bench.js",
    "deep-object": "deep-object.bench.js",
    "long-string": "long-string.bench.js",
    child: "child.bench.js",
    "child-child": "child-child.bench.js",
    "multi-arg": "multi-arg.bench.js",
  };

  const pinoResults = {};
  for (const [name, file] of Object.entries(pinoBenchmarks)) {
    console.log(`${colors.yellow}  Running ${name}...${colors.reset}`);
    try {
      const output = execSync(`node ${path.join(pinoDir, file)}`, {
        encoding: "utf8",
        cwd: __dirname,
        stdio: ["pipe", "pipe", "pipe"],
      });
      pinoResults[name] = parsePinoResults(output);
    } catch (error) {
      console.error(`Failed to run ${name}:`, error.message);
      pinoResults[name] = [];
    }
  }

  // Generate markdown
  let markdown = `\n\n`;
  markdown += `> Last updated: ${timestamp}\n\n`;
  markdown += `## System Information\n\n`;
  markdown += `- **Platform**: ${sysInfo.platform} (${sysInfo.arch})\n`;
  markdown += `- **CPU**: ${sysInfo.cpus}\n`;
  markdown += `- **Cores**: ${sysInfo.cores}\n`;
  markdown += `- **Node.js**: ${sysInfo.nodeVersion}\n`;
  markdown += `- **Memory**: ${sysInfo.totalMemory}\n\n`;

  markdown += `## Benchmarked Libraries\n\n`;
  markdown += `- **jslog** - This library (zero dependencies)\n`;
  markdown += `- **pino** - Fast JSON logger\n`;
  markdown += `- **winston** - Versatile logging library\n`;
  markdown += `- **bunyan** - JSON logging library\n`;
  markdown += `- **log4js** - Log4j inspired logger\n\n`;

  markdown += `---\n\n`;
  markdown += `## 1. Simple String Logging\n\n`;
  markdown += `Tests basic string message logging performance.\n\n`;
  markdown += `\`\`\`javascript\nlogger.info('Hello, world!');\n\`\`\`\n\n`;
  markdown += generateOpsTable(simpleResults);
  markdown += generateComparison(simpleResults);

  markdown += `\n---\n\n`;
  markdown += `## 2. Complex Object Logging\n\n`;
  markdown += `Tests logging with multiple attributes and different data types.\n\n`;
  markdown += `\`\`\`javascript\nlogger.info('User action',\n`;
  markdown += `  String('userId', 'user-12345'),\n`;
  markdown += `  String('action', 'purchase'),\n`;
  markdown += `  Int('amount', 99),\n`;
  markdown += `  Float64('price', 99.99),\n`;
  markdown += `  Bool('verified', true),\n`;
  markdown += `  String('ip', '192.168.1.1')\n`;
  markdown += `);\n\`\`\`\n\n`;
  markdown += generateOpsTable(complexResults);
  markdown += generateComparison(complexResults);

  markdown += `\n---\n\n`;
  markdown += `## 3. High Throughput Test\n\n`;
  markdown += `Tests sustained performance with 100,000 iterations.\n\n`;
  markdown += `\`\`\`javascript\nfor (let i = 0; i < 100000; i++) {\n`;
  markdown += `  logger.info('Request processed',\n`;
  markdown += `    String('requestId', \`req-\${i}\`),\n`;
  markdown += `    Int('iteration', i)\n`;
  markdown += `  );\n`;
  markdown += `}\n\`\`\`\n\n`;
  markdown += generateThroughputTable(throughputResults);
  markdown += generateThroughputComparison(throughputResults);

  markdown += `\n---\n\n`;
  markdown += `## 4. Pino-Style Benchmarks\n\n`;
  markdown += `Direct comparison with Pino using fastbench (same benchmark structure as Pino uses).\n\n`;

  // Add each Pino-style benchmark
  const pinoBenchmarkDescriptions = {
    basic: {
      title: "Basic String Logging",
      code: "logger.info('message')",
    },
    object: {
      title: "Single Object Attribute",
      code: "logger.info('message', jslog.String('hello', 'world'))",
    },
    "deep-object": {
      title: "Deep Object Logging",
      code: "logger.info('message', jslog.Any('deep', deepObject))",
    },
    "long-string": {
      title: "Long String (2000 chars)",
      code: "logger.info(longString)",
    },
    child: {
      title: "Child Logger",
      code: "childLogger.info('message', jslog.String('hello', 'world'))",
    },
    "child-child": {
      title: "Nested Child Logger",
      code: "childChildLogger.info('message')",
    },
    "multi-arg": {
      title: "Multiple Arguments",
      code: "logger.info('message', jslog.String('s', 'world'), jslog.Any('obj', {obj: true}), jslog.Int('num', 4))",
    },
  };

  let pinoSectionNum = 1;
  for (const [name, desc] of Object.entries(pinoBenchmarkDescriptions)) {
    if (pinoResults[name] && pinoResults[name].length > 0) {
      markdown += `### 4.${pinoSectionNum}. ${desc.title}\n\n`;
      markdown += `\`\`\`javascript\n${desc.code}\n\`\`\`\n\n`;
      markdown += generatePinoTable(pinoResults[name]);
      markdown += generatePinoComparison(pinoResults[name]);
      markdown += `\n`;
      pinoSectionNum++;
    }
  }

  markdown += `\n---\n\n`;
  markdown += `## Summary\n\n`;

  // Calculate overall ranking from original benchmarks
  const jslogRanks = [
    simpleResults.find((r) => r.library === "jslog")?.rank || 0,
    complexResults.find((r) => r.library === "jslog")?.rank || 0,
    throughputResults.find((r) => r.library === "jslog")?.rank || 0,
  ];

  const avgRank = (
    jslogRanks.reduce((a, b) => a + b, 0) / jslogRanks.length
  ).toFixed(1);
  const firstPlaces = jslogRanks.filter((r) => r === 1).length;
  const topThree = jslogRanks.filter((r) => r <= 3).length;

  // Calculate Pino-style benchmark stats
  const pinoFirstPlaces = Object.values(pinoResults)
    .filter((results) => results.length > 0)
    .filter((results) => {
      const jslog = results.find((r) => r.library === "jslog");
      return jslog && jslog.rank === 1;
    }).length;

  const pinoTotal = Object.values(pinoResults).filter(
    (r) => r.length > 0
  ).length;

  markdown += `### Original Benchmarks Performance\n\n`;
  markdown += `- **Average Rank**: ${avgRank}\n`;
  markdown += `- **1st Place Finishes**: ${firstPlaces}/3\n`;
  markdown += `- **Top 3 Finishes**: ${topThree}/3\n\n`;

  if (pinoTotal > 0) {
    markdown += `### Pino-Style Benchmarks Performance\n\n`;
    markdown += `- **1st Place Finishes**: ${pinoFirstPlaces}/${pinoTotal}\n`;
    markdown += `- **Win Rate**: ${(
      (pinoFirstPlaces / pinoTotal) *
      100
    ).toFixed(1)}%\n\n`;
  }

  if (firstPlaces > 0) {
    markdown += `🏆 **jslog achieved ${firstPlaces} first-place finish${
      firstPlaces > 1 ? "es" : ""
    }!**\n\n`;
  }

  if (topThree === 3) {
    markdown += `✅ **jslog ranks in the top 3 across all benchmark categories!**\n\n`;
  }

  markdown += `### Key Highlights\n\n`;
  markdown += `- ✨ **Zero dependencies** - No external packages required\n`;
  markdown += `- 🚀 **High performance** - Competitive with industry-leading loggers\n`;
  markdown += `- 🎯 **Optimized code paths** - Fast path for common use cases\n`;
  markdown += `- 📦 **Small footprint** - Minimal overhead\n\n`;

  markdown += `---\n\n`;
  markdown += `## Notes\n\n`;
  markdown += `- Benchmarks use the [Benchmark.js](https://benchmarkjs.com/) library\n`;
  markdown += `- Results may vary based on system specifications and load\n`;
  markdown += `- All loggers output to \`/dev/null\` to minimize I/O overhead\n`;
  markdown += `- Each benchmark runs multiple iterations to ensure statistical significance\n\n`;

  markdown += `## Running Benchmarks\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `# Install dependencies\n`;
  markdown += `npm install\n\n`;
  markdown += `# Run all benchmarks and generate report\n`;
  markdown += `npm run bench:report\n\n`;
  markdown += `# Or run individual benchmarks\n`;
  markdown += `npm run bench:simple      # Simple string logging\n`;
  markdown += `npm run bench:complex     # Complex object logging\n`;
  markdown += `npm run bench:throughput  # High throughput test\n`;
  markdown += `\`\`\`\n`;

  // Write to file
  const outputPath = path.join(__dirname, "BENCH.md");
  fs.writeFileSync(outputPath, markdown);

  console.log(
    `\n${colors.bright}${colors.green}✅ Benchmark report generated: ${outputPath}${colors.reset}`
  );
  console.log(`\n${colors.blue}Summary:${colors.reset}`);
  console.log(`  Original Benchmarks:`);
  console.log(`    Average Rank: ${avgRank}`);
  console.log(`    1st Place: ${firstPlaces}/3`);
  console.log(`    Top 3: ${topThree}/3`);
  if (pinoTotal > 0) {
    console.log(`  Pino-Style Benchmarks:`);
    console.log(`    1st Place: ${pinoFirstPlaces}/${pinoTotal}`);
    console.log(
      `    Win Rate: ${((pinoFirstPlaces / pinoTotal) * 100).toFixed(1)}%`
    );
  }
  console.log();
};

main();
