"use strict";

const bench = require("fastbench");
const jslog = require("@omdxp/jslog");
const pino = require("pino");
const bunyan = require("bunyan");
const fs = require("node:fs");
const dest = fs.createWriteStream("/dev/null");

// jslog setup (nested .with() calls)
const jslogTextParent = jslog.New(new jslog.TextHandler({ writer: dest }));
const jslogText = jslogTextParent
  .with(jslog.String("a", "property"))
  .with(jslog.String("sub", "child"));
const jslogJSONParent = jslog.New(new jslog.JSONHandler({ writer: dest }));
const jslogJSON = jslogJSONParent
  .with(jslog.String("a", "property"))
  .with(jslog.String("sub", "child"));

// pino setup
const plogNodeStream = pino(dest)
  .child({ a: "property" })
  .child({ sub: "child" });
delete require.cache[require.resolve("pino")];
const plogDest = require("pino")(pino.destination("/dev/null"))
  .child({ a: "property" })
  .child({ sub: "child" });
delete require.cache[require.resolve("pino")];
const plogMinLength = require("pino")(
  pino.destination({ dest: "/dev/null", sync: false, minLength: 4096 })
)
  .child({ a: "property" })
  .child({ sub: "child" });

// bunyan setup
const blog = bunyan
  .createLogger({
    name: "myapp",
    streams: [
      {
        level: "trace",
        stream: dest,
      },
    ],
  })
  .child({ a: "property" })
  .child({ sub: "child" });

const max = 10;

const run = bench(
  [
    function benchJslogTextChildChild(cb) {
      for (var i = 0; i < max; i++) {
        jslogText.info("message", jslog.String("hello", "world"));
      }
      setImmediate(cb);
    },
    function benchJslogJSONChildChild(cb) {
      for (var i = 0; i < max; i++) {
        jslogJSON.info("message", jslog.String("hello", "world"));
      }
      setImmediate(cb);
    },
    function benchBunyanChildChild(cb) {
      for (var i = 0; i < max; i++) {
        blog.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoChildChild(cb) {
      for (var i = 0; i < max; i++) {
        plogDest.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoMinLengthChildChild(cb) {
      for (var i = 0; i < max; i++) {
        plogMinLength.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoNodeStreamChildChild(cb) {
      for (var i = 0; i < max; i++) {
        plogNodeStream.info({ hello: "world" });
      }
      setImmediate(cb);
    },
  ],
  10000
);

run(run);
