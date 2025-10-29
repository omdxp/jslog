/**
 * High Throughput Benchmark
 * Tests performance under sustained high load
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// Setup loggers
const setupLoggers = () => {
  const nullStream = fs.createWriteStream("/dev/null");

  // jslog
  const { New, JSONHandler, String, Int } = require("@omdxp/jslog");
  const jslogLogger = New(new JSONHandler({ writer: nullStream }));

  // pino
  const pino = require("pino");
  const pinoLogger = pino(nullStream);

  // winston
  const winston = require("winston");
  const winstonLogger = winston.createLogger({
    transports: [new winston.transports.Stream({ stream: nullStream })],
    format: winston.format.json(),
  });

  // bunyan
  const bunyan = require("bunyan");
  const bunyanLogger = bunyan.createLogger({
    name: "benchmark",
    streams: [{ stream: nullStream }],
  });

  // log4js
  const log4js = require("log4js");
  log4js.configure({
    appenders: { out: { type: "stdout" } },
    categories: { default: { appenders: ["out"], level: "info" } },
  });
  const log4jsLogger = log4js.getLogger();

  return {
    jslog: { logger: jslogLogger, String, Int },
    pino: pinoLogger,
    winston: winstonLogger,
    bunyan: bunyanLogger,
    log4js: log4jsLogger,
  };
};

const ITERATIONS = 100000;

const benchmark = (name, fn) => {
  const start = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    fn(i);
  }
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1e6; // Convert to milliseconds
  const logsPerSecond = (ITERATIONS / (duration / 1000)).toFixed(0);

  return {
    name,
    duration: duration.toFixed(2),
    logsPerSecond,
  };
};

console.log("==========================================");
console.log("High Throughput Benchmark");
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log("==========================================\n");

const loggers = setupLoggers();

const results = [];

// jslog
results.push(
  benchmark("jslog", (i) => {
    loggers.jslog.logger.info(
      "Request processed",
      loggers.jslog.String("requestId", `req-${i}`),
      loggers.jslog.Int("iteration", i)
    );
  })
);

// pino
results.push(
  benchmark("pino", (i) => {
    loggers.pino.info(
      {
        requestId: `req-${i}`,
        iteration: i,
      },
      "Request processed"
    );
  })
);

// winston
results.push(
  benchmark("winston", (i) => {
    loggers.winston.info("Request processed", {
      requestId: `req-${i}`,
      iteration: i,
    });
  })
);

// bunyan
results.push(
  benchmark("bunyan", (i) => {
    loggers.bunyan.info(
      {
        requestId: `req-${i}`,
        iteration: i,
      },
      "Request processed"
    );
  })
);

// log4js
results.push(
  benchmark("log4js", (i) => {
    loggers.log4js.info("Request processed", {
      requestId: `req-${i}`,
      iteration: i,
    });
  })
);

// Sort by logs per second (descending)
results.sort((a, b) => parseInt(b.logsPerSecond) - parseInt(a.logsPerSecond));

console.log("Results:");
console.log("--------");
results.forEach((result, index) => {
  const medal =
    index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
  console.log(
    `${medal} ${result.name.padEnd(10)} - ${result.duration.padStart(
      10
    )} ms - ${result.logsPerSecond.padStart(15)} logs/sec`
  );
});

console.log("\n📈 Relative Performance:");
const fastest = results[0];
results.forEach((result) => {
  const ratio = (
    parseInt(fastest.logsPerSecond) / parseInt(result.logsPerSecond)
  ).toFixed(2);
  const percent = (
    (1 - parseInt(result.logsPerSecond) / parseInt(fastest.logsPerSecond)) *
    100
  ).toFixed(1);
  if (result === fastest) {
    console.log(`   ${result.name}: baseline (fastest)`);
  } else {
    console.log(`   ${result.name}: ${ratio}x slower (${percent}% slower)`);
  }
});

console.log("\n");
