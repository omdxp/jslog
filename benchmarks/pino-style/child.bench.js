"use strict";

const bench = require("fastbench");
const jslog = require("@omdxp/jslog");
const pino = require("pino");
const bunyan = require("bunyan");
const fs = require("node:fs");
const dest = fs.createWriteStream("/dev/null");

// jslog setup (using .with() for child logger)
const jslogTextParent = jslog.New(new jslog.TextHandler({ writer: dest }));
const jslogText = jslogTextParent.with(jslog.String("a", "property"));
const jslogJSONParent = jslog.New(new jslog.JSONHandler({ writer: dest }));
const jslogJSON = jslogJSONParent.with(jslog.String("a", "property"));

// pino setup
const plogNodeStream = pino(dest).child({ a: "property" });
delete require.cache[require.resolve("pino")];
const plogDest = require("pino")(pino.destination("/dev/null")).child({
  a: "property",
});
delete require.cache[require.resolve("pino")];
const plogMinLength = require("pino")(
  pino.destination({ dest: "/dev/null", sync: false, minLength: 4096 })
).child({ a: "property" });

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
  .child({ a: "property" });

const max = 10;

const run = bench(
  [
    function benchJslogTextChild(cb) {
      for (var i = 0; i < max; i++) {
        jslogText.info("message", jslog.String("hello", "world"));
      }
      setImmediate(cb);
    },
    function benchJslogJSONChild(cb) {
      for (var i = 0; i < max; i++) {
        jslogJSON.info("message", jslog.String("hello", "world"));
      }
      setImmediate(cb);
    },
    function benchBunyanChild(cb) {
      for (var i = 0; i < max; i++) {
        blog.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoChild(cb) {
      for (var i = 0; i < max; i++) {
        plogDest.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoMinLengthChild(cb) {
      for (var i = 0; i < max; i++) {
        plogMinLength.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoNodeStreamChild(cb) {
      for (var i = 0; i < max; i++) {
        plogNodeStream.info({ hello: "world" });
      }
      setImmediate(cb);
    },
  ],
  10000
);

run(run);
