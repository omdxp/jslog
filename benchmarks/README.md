# jslog Benchmarks

Performance benchmarks comparing `@omdxp/jslog` against popular Node.js logging libraries.

## Benchmarked Libraries

- **jslog** - This library
- **pino** - Fast JSON logger
- **winston** - Versatile logging library
- **bunyan** - JSON logging library
- **log4js** - Log4j inspired logger

## Running Benchmarks

```bash
# Install dependencies
npm install

# Run all benchmarks
npm run bench

# Run individual benchmarks
npm run bench:simple      # Simple string logging
npm run bench:complex     # Complex object logging
npm run bench:throughput  # High throughput test
```

## Benchmark Types

### 1. Simple String Logging
Tests basic string message logging performance.

```javascript
logger.info('Hello, world!');
```

### 2. Complex Object Logging
Tests logging with multiple attributes and different data types.

```javascript
logger.info('User action',
  String('userId', 'user-12345'),
  String('action', 'purchase'),
  Int('amount', 99),
  Float64('price', 99.99),
  Bool('verified', true),
  String('ip', '192.168.1.1')
);
```

### 3. High Throughput
Tests sustained performance with 100,000 iterations.

```javascript
for (let i = 0; i < 100000; i++) {
  logger.info('Request processed',
    String('requestId', `req-${i}`),
    Int('iteration', i)
  );
}
```

## Interpreting Results

- **ops/sec** - Operations per second (higher is better)
- **logs/sec** - Log entries per second (higher is better)
- **Relative Performance** - How much slower compared to the fastest

## System Info

Results may vary based on:
- CPU speed and cores
- Node.js version
- Operating system
- Available memory
- Disk I/O speed (when logging to files)

## Contributing

To add more benchmarks or libraries:

1. Add the library to `package.json`
2. Create a new benchmark file
3. Update this README
4. Run and verify results

## License

MIT
