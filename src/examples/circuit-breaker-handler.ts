import { Logger, Level, type Handler, type Record } from "../index";
import { CircuitBreakerHandler } from "../index";

console.log("Circuit Breaker Tests");

class ThrowingHandler implements Handler {
  enabled(_level: Level): boolean {
    return true;
  }

  needsSource(): boolean {
    return false;
  }

  handle(_record: Record): void {
    throw new Error("primary handler failed");
  }

  withAttrs(): Handler {
    return this;
  }

  withGroup(): Handler {
    return this;
  }
}

class MarkerHandler implements Handler {
  enabled(_level: Level): boolean {
    return true;
  }

  needsSource(): boolean {
    return false;
  }

  handle(record: Record): void {
    console.log(`FALLBACK:${record.message}`);
  }

  withAttrs(): Handler {
    return this;
  }

  withGroup(): Handler {
    return this;
  }
}

const cb = new CircuitBreakerHandler({
  handler: new ThrowingHandler(),
  fallbackHandler: new MarkerHandler(),
  failureThreshold: 2,
  cooldownMs: 60_000,
});

const logger = new Logger(cb);

logger.info("one");
logger.info("two");
logger.info("three");

const stats = cb.getStats();
console.log(`STATS:open=${stats.open}`);
console.log(`STATS:errors=${stats.totalErrors}`);
console.log(`STATS:fallback=${stats.fallbackUsed}`);
console.log(`STATS:dropped=${stats.dropped}`);
