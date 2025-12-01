import { Logger, RingBufferHandler, TextHandler, Level } from "../index";

console.log("Ring Buffer Tests");

// Test 1: Basic capture
console.log("Test 1: Basic capture");
const ring = new RingBufferHandler({ limit: 5 });
const logger = new Logger(ring);

logger.info("msg 1");
logger.info("msg 2");
logger.info("msg 3");

const records = ring.getRecords();
console.log(`Captured ${records.length} records`);
if (records.length === 3) console.log("Count correct");
if (records[0].message === "msg 1") console.log("First message correct");
if (records[2].message === "msg 3") console.log("Last message correct");

// Test 2: Limit enforcement
console.log("Test 2: Limit enforcement");
logger.info("msg 4");
logger.info("msg 5");
logger.info("msg 6"); // Should push out msg 1

const records2 = ring.getRecords();
console.log(`Captured ${records2.length} records (limit 5)`);
if (records2[0].message === "msg 2")
  console.log("Oldest message dropped correctly");
if (records2[4].message === "msg 6") console.log("Newest message present");

// Test 3: With Attributes and Groups
console.log("Test 3: With Attributes and Groups");
const ring2 = new RingBufferHandler();
const logger2 = new Logger(ring2)
  .with({ key: "myKey", value: "myValue" })
  .withGroup("g1");

logger2.info("grouped message");

const records3 = ring2.getRecords();
const rec = records3[0];
// Check if attributes are resolved
const attr = rec.attrs.find((a) => a.key === "g1.myKey");
if (attr && attr.value === "myValue")
  console.log("Attributes resolved with group prefix");

// Test 4: Flush
console.log("Test 4: Flush");
const ring3 = new RingBufferHandler();
const logger3 = new Logger(ring3);
logger3.info("flush me");

console.log("Flushing to stdout:");
const textHandler = new TextHandler(); // defaults to stdout
ring3.flush(textHandler);
