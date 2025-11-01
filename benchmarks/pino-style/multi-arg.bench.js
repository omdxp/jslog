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

const deep = require("../../package.json");
deep.deep = Object.assign({}, JSON.parse(JSON.stringify(deep)));
deep.deep.deep = Object.assign({}, JSON.parse(JSON.stringify(deep)));
deep.deep.deep.deep = Object.assign({}, JSON.parse(JSON.stringify(deep)));

const max = 10;

const run = bench(
  [
    function benchJslogTextMultiArg(cb) {
      for (var i = 0; i < max; i++) {
        jslogText.info(
          "message",
          jslog.String("s", "world"),
          jslog.Any("obj", { obj: true }),
          jslog.Int("num", 4)
        );
      }
      setImmediate(cb);
    },
    function benchJslogJSONMultiArg(cb) {
      for (var i = 0; i < max; i++) {
        jslogJSON.info(
          "message",
          jslog.String("s", "world"),
          jslog.Any("obj", { obj: true }),
          jslog.Int("num", 4)
        );
      }
      setImmediate(cb);
    },
    function benchBunyanInterpolate(cb) {
      for (var i = 0; i < max; i++) {
        blog.info("hello %s", "world");
      }
      setImmediate(cb);
    },
    function benchWinstonInterpolate(cb) {
      for (var i = 0; i < max; i++) {
        chill.log("info", "hello %s", "world");
      }
      setImmediate(cb);
    },
    function benchPinoInterpolate(cb) {
      for (var i = 0; i < max; i++) {
        plogDest.info("hello %s", "world");
      }
      setImmediate(cb);
    },
    function benchPinoMinLengthInterpolate(cb) {
      for (var i = 0; i < max; i++) {
        plogMinLength.info("hello %s", "world");
      }
      setImmediate(cb);
    },
    function benchPinoNodeStreamInterpolate(cb) {
      for (var i = 0; i < max; i++) {
        plogNodeStream.info("hello %s", "world");
      }
      setImmediate(cb);
    },
    function benchBunyanInterpolateAll(cb) {
      for (var i = 0; i < max; i++) {
        blog.info("hello %s %j %d", "world", { obj: true }, 4);
      }
      setImmediate(cb);
    },
    function benchWinstonInterpolateAll(cb) {
      for (var i = 0; i < max; i++) {
        chill.log("info", "hello %s %j %d", "world", { obj: true }, 4);
      }
      setImmediate(cb);
    },
    function benchPinoInterpolateAll(cb) {
      for (var i = 0; i < max; i++) {
        plogDest.info("hello %s %j %d", "world", { obj: true }, 4);
      }
      setImmediate(cb);
    },
    function benchPinoMinLengthInterpolateAll(cb) {
      for (var i = 0; i < max; i++) {
        plogMinLength.info("hello %s %j %d", "world", { obj: true }, 4);
      }
      setImmediate(cb);
    },
    function benchPinoNodeStreamInterpolateAll(cb) {
      for (var i = 0; i < max; i++) {
        plogNodeStream.info("hello %s %j %d", "world", { obj: true }, 4);
      }
      setImmediate(cb);
    },
  ],
  10000
);

run(run);
