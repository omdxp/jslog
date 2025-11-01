"use strict";

const bench = require("fastbench");
const jslog = require("@omdxp/jslog");
const pino = require("pino");
const fs = require("node:fs");
const dest = fs.createWriteStream("/dev/null");

// jslog setup without replaceAttr
const jslogNoFormatter = jslog.New(new jslog.JSONHandler({ writer: dest }));

// jslog setup with replaceAttr (formatter)
const jslogWithFormatter = jslog.New(
  new jslog.JSONHandler({
    writer: dest,
    replaceAttr: (groups, attr) => {
      if (attr.key === "level") {
        return jslog.Any("log", { level: attr.value });
      }
      return attr;
    },
  })
);

// pino setup without formatters
const pinoNoFormatters = pino(pino.destination("/dev/null"));

// pino setup with formatters
const formatters = {
  level(label, number) {
    return {
      log: {
        level: label,
      },
    };
  },
  bindings(bindings) {
    return {
      process: {
        pid: bindings.pid,
      },
      host: {
        name: bindings.hostname,
      },
    };
  },
  log(obj) {
    return { foo: "bar", ...obj };
  },
};

delete require.cache[require.resolve("pino")];
const pinoFormatters = require("pino")(
  { formatters },
  pino.destination("/dev/null")
);

const max = 10;

const run = bench(
  [
    function benchJslogNoFormatter(cb) {
      for (var i = 0; i < max; i++) {
        jslogNoFormatter.info("message", jslog.String("hello", "world"));
      }
      setImmediate(cb);
    },
    function benchJslogWithFormatter(cb) {
      for (var i = 0; i < max; i++) {
        jslogWithFormatter.info("message", jslog.String("hello", "world"));
      }
      setImmediate(cb);
    },
    function benchPinoNoFormatters(cb) {
      for (var i = 0; i < max; i++) {
        pinoNoFormatters.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoFormatters(cb) {
      for (var i = 0; i < max; i++) {
        pinoFormatters.info({ hello: "world" });
      }
      setImmediate(cb);
    },
  ],
  10000
);

run(run);
