"use strict";

const bench = require("fastbench");
const jslog = require("@omdxp/jslog");
const pino = require("pino");
const bunyan = require("bunyan");
const winston = require("winston");
const fs = require("node:fs");
const dest = fs.createWriteStream("/dev/null");

// Create deep object from package.json
const deep = Object.assign({}, require("../../package.json"), {
  level: "info",
});

// jslog setup
const jslogText = jslog.New(new jslog.TextHandler({ writer: dest }));
const jslogJSON = jslog.New(new jslog.JSONHandler({ writer: dest }));

// pino setup
const plogNodeStream = pino(dest);
delete require.cache[require.resolve("pino")];
const plogDest = require("pino")(pino.destination("/dev/null"));
delete require.cache[require.resolve("pino")];
const plogMinLength = require("pino")(
  pino.destination({ dest: "/dev/null", sync: false, minLength: 4096 })
);

// bunyan setup
const blog = bunyan.createLogger({
  name: "myapp",
  streams: [
    {
      level: "trace",
      stream: dest,
    },
  ],
});

// winston setup
const chill = winston.createLogger({
  transports: [
    new winston.transports.Stream({
      stream: fs.createWriteStream("/dev/null"),
    }),
  ],
});

const max = 10;

const run = bench(
  [
    function benchJslogTextDeepObj(cb) {
      for (var i = 0; i < max; i++) {
        jslogText.info("deep object", jslog.Any("data", deep));
      }
      setImmediate(cb);
    },
    function benchJslogJSONDeepObj(cb) {
      for (var i = 0; i < max; i++) {
        jslogJSON.info("deep object", jslog.Any("data", deep));
      }
      setImmediate(cb);
    },
    function benchBunyanDeepObj(cb) {
      for (var i = 0; i < max; i++) {
        blog.info(deep);
      }
      setImmediate(cb);
    },
    function benchWinstonDeepObj(cb) {
      for (var i = 0; i < max; i++) {
        chill.log(deep);
      }
      setImmediate(cb);
    },
    function benchPinoDeepObj(cb) {
      for (var i = 0; i < max; i++) {
        plogDest.info(deep);
      }
      setImmediate(cb);
    },
    function benchPinoMinLengthDeepObj(cb) {
      for (var i = 0; i < max; i++) {
        plogMinLength.info(deep);
      }
      setImmediate(cb);
    },
    function benchPinoNodeStreamDeepObj(cb) {
      for (var i = 0; i < max; i++) {
        plogNodeStream.info(deep);
      }
      setImmediate(cb);
    },
  ],
  10000
);

run(run);
