"use strict";

const bench = require("fastbench");
const jslog = require("@omdxp/jslog");
const pino = require("pino");
const bunyan = require("bunyan");
const fs = require("node:fs");
const dest = fs.createWriteStream("/dev/null");

// jslog setup
const jslogTextParent = jslog.New(new jslog.TextHandler({ writer: dest }));
const jslogJSONParent = jslog.New(new jslog.JSONHandler({ writer: dest }));

// pino setup
const plogNodeStream = pino(dest);
const plogDest = pino(pino.destination("/dev/null"));
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

const max = 10;

const run = bench(
  [
    function benchJslogTextCreation(cb) {
      const child = jslogTextParent.with(jslog.String("a", "property"));
      for (var i = 0; i < max; i++) {
        child.info("message", jslog.String("hello", "world"));
      }
      setImmediate(cb);
    },
    function benchJslogJSONCreation(cb) {
      const child = jslogJSONParent.with(jslog.String("a", "property"));
      for (var i = 0; i < max; i++) {
        child.info("message", jslog.String("hello", "world"));
      }
      setImmediate(cb);
    },
    function benchBunyanCreation(cb) {
      const child = blog.child({ a: "property" });
      for (var i = 0; i < max; i++) {
        child.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoCreation(cb) {
      const child = plogDest.child({ a: "property" });
      for (var i = 0; i < max; i++) {
        child.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoMinLengthCreation(cb) {
      const child = plogMinLength.child({ a: "property" });
      for (var i = 0; i < max; i++) {
        child.info({ hello: "world" });
      }
      setImmediate(cb);
    },
    function benchPinoNodeStreamCreation(cb) {
      const child = plogNodeStream.child({ a: "property" });
      for (var i = 0; i < max; i++) {
        child.info({ hello: "world" });
      }
      setImmediate(cb);
    },
  ],
  10000
);

run(run);
