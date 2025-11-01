"use strict";

const bench = require("fastbench");
const jslog = require("@omdxp/jslog");
const pino = require("pino");
const bunyan = require("bunyan");
const winston = require("winston");
const fs = require("node:fs");
const dest = fs.createWriteStream("/dev/null");

// jslog setup
const jslogText = jslog.New(new jslog.TextHandler({ writer: dest }));
const jslogJSON = jslog.New(new jslog.JSONHandler({ writer: dest }));

// pino setup
const plogNodeStream = pino(dest);
delete require.cache[require.resolve("pino")];
const plogDest = require("pino")(pino.destination("/dev/null"));
delete require.cache[require.resolve("pino")];
const plogMinLength = require("pino")(
  pino.destination({ dest: "/dev/null", minLength: 4096 })
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
    function benchJslogText(cb) {
      for (var i = 0; i < max; i++) {
        jslogText.info("hello world");
      }
      setImmediate(cb);
    },
    function benchJslogJSON(cb) {
      for (var i = 0; i < max; i++) {
        jslogJSON.info("hello world");
      }
      setImmediate(cb);
    },
    function benchBunyan(cb) {
      for (var i = 0; i < max; i++) {
        blog.info("hello world");
      }
      setImmediate(cb);
    },
    function benchWinston(cb) {
      for (var i = 0; i < max; i++) {
        chill.info("hello world");
      }
      setImmediate(cb);
    },
    function benchPino(cb) {
      for (var i = 0; i < max; i++) {
        plogDest.info("hello world");
      }
      setImmediate(cb);
    },
    function benchPinoMinLength(cb) {
      for (var i = 0; i < max; i++) {
        plogMinLength.info("hello world");
      }
      setImmediate(cb);
    },
    function benchPinoNodeStream(cb) {
      for (var i = 0; i < max; i++) {
        plogNodeStream.info("hello world");
      }
      setImmediate(cb);
    },
  ],
  10000
);

run(run);
