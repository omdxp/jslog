/**
 * Simple Logging Benchmark
 * Tests basic string logging performance
 */

const Benchmark = require("benchmark");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Setup loggers
const setupLoggers = () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-"));
  const nullStream = fs.createWriteStream("/dev/null");

  // jslog
  const { New, JSONHandler } = require("@omdxp/jslog");
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
    jslog: jslogLogger,
    pino: pinoLogger,
    winston: winstonLogger,
    bunyan: bunyanLogger,
    log4js: log4jsLogger,
  };
};

const loggers = setupLoggers();

console.log("==========================================");
console.log("Simple String Logging Benchmark");
console.log("==========================================\n");

const suite = new Benchmark.Suite();

suite
  .add("jslog", () => {
    loggers.jslog.info("Hello, world!");
  })
  .add("pino", () => {
    loggers.pino.info("Hello, world!");
  })
  .add("winston", () => {
    loggers.winston.info("Hello, world!");
  })
  .add("bunyan", () => {
    loggers.bunyan.info("Hello, world!");
  })
  .add("log4js", () => {
    loggers.log4js.info("Hello, world!");
  })
  .on("cycle", (event) => {
    console.log(String(event.target));
  })
  .on("complete", function () {
    console.log("\n📊 Fastest is: " + this.filter("fastest").map("name"));

    // Calculate and display relative performance
    const fastest = this.filter("fastest")[0];
    console.log("\n📈 Relative Performance:");
    this.forEach((bench) => {
      const ratio = (fastest.hz / bench.hz).toFixed(2);
      const percent = ((1 - bench.hz / fastest.hz) * 100).toFixed(1);
      if (bench === fastest) {
        console.log(`   ${bench.name}: baseline (fastest)`);
      } else {
        console.log(`   ${bench.name}: ${ratio}x slower (${percent}% slower)`);
      }
    });
    console.log("\n");
  })
  .run({ async: false });
