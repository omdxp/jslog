/**
 * Complex Logging Benchmark
 * Tests logging with multiple attributes and nested objects
 */

const Benchmark = require("benchmark");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Setup loggers
const setupLoggers = () => {
  const nullStream = fs.createWriteStream("/dev/null");

  // jslog
  const {
    New,
    JSONHandler,
    String,
    Int,
    Float64,
    Bool,
  } = require("@omdxp/jslog");
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
    jslog: { logger: jslogLogger, String, Int, Float64, Bool },
    pino: pinoLogger,
    winston: winstonLogger,
    bunyan: bunyanLogger,
    log4js: log4jsLogger,
  };
};

const loggers = setupLoggers();

console.log("==========================================");
console.log("Complex Object Logging Benchmark");
console.log("==========================================\n");

const suite = new Benchmark.Suite();

suite
  .add("jslog", () => {
    loggers.jslog.logger.info(
      "User action",
      loggers.jslog.String("userId", "user-12345"),
      loggers.jslog.String("action", "purchase"),
      loggers.jslog.Int("amount", 99),
      loggers.jslog.Float64("price", 99.99),
      loggers.jslog.Bool("verified", true),
      loggers.jslog.String("ip", "192.168.1.1")
    );
  })
  .add("pino", () => {
    loggers.pino.info(
      {
        userId: "user-12345",
        action: "purchase",
        amount: 99,
        price: 99.99,
        verified: true,
        ip: "192.168.1.1",
      },
      "User action"
    );
  })
  .add("winston", () => {
    loggers.winston.info("User action", {
      userId: "user-12345",
      action: "purchase",
      amount: 99,
      price: 99.99,
      verified: true,
      ip: "192.168.1.1",
    });
  })
  .add("bunyan", () => {
    loggers.bunyan.info(
      {
        userId: "user-12345",
        action: "purchase",
        amount: 99,
        price: 99.99,
        verified: true,
        ip: "192.168.1.1",
      },
      "User action"
    );
  })
  .add("log4js", () => {
    loggers.log4js.info("User action", {
      userId: "user-12345",
      action: "purchase",
      amount: 99,
      price: 99.99,
      verified: true,
      ip: "192.168.1.1",
    });
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
