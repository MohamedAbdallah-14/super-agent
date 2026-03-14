# Node.js Performance Expertise Module

> Comprehensive performance engineering guide for Node.js applications.
> Covers event loop architecture, concurrency models, V8 garbage collection,
> memory leak detection, stream processing, profiling tools, and common
> anti-patterns with benchmarked before/after examples.

---

## Table of Contents

1. [Event Loop Architecture and Blocking Detection](#1-event-loop-architecture-and-blocking-detection)
2. [Worker Threads vs Cluster vs Child Process](#2-worker-threads-vs-cluster-vs-child-process)
3. [V8 Garbage Collection Optimization](#3-v8-garbage-collection-optimization)
4. [Memory Leak Detection](#4-memory-leak-detection)
5. [Stream Processing for Large Data](#5-stream-processing-for-large-data)
6. [Connection Pooling for Databases](#6-connection-pooling-for-databases)
7. [Profiling Tools and Techniques](#7-profiling-tools-and-techniques)
8. [Common Bottlenecks](#8-common-bottlenecks)
9. [Anti-Patterns and Fixes](#9-anti-patterns-and-fixes)
10. [Benchmarking Methodology](#10-benchmarking-methodology)

---

## 1. Event Loop Architecture and Blocking Detection

### How the Event Loop Works

Node.js uses a single-threaded event loop powered by libuv. Every incoming request,
timer callback, and I/O completion is processed on this single thread. When a callback
takes too long, all other clients are starved -- no new connections are accepted, no
responses are sent, no timers fire.

The event loop cycles through six phases in order:

```
timers -> pending callbacks -> idle/prepare -> poll -> check -> close callbacks
   ^                                                                    |
   |____________________________________________________________________|
```

Each phase has a FIFO queue of callbacks. The `poll` phase is where most I/O callbacks
execute and where the loop spends most of its time waiting for new events.

### Quantifying "Blocking"

A callback that runs for more than 10ms is generally considered blocking. At 100ms,
user-facing latency becomes noticeable. At 1s, timeouts cascade.

Benchmark impact of synchronous operations on throughput:

| Operation                        | Event Loop Delay | Throughput Impact |
|----------------------------------|------------------|-------------------|
| JSON.parse (1 KB payload)        | ~0.05ms          | Negligible        |
| JSON.parse (10 MB payload)       | ~50ms            | Severe            |
| fs.readFileSync (100 KB)         | ~2ms             | Moderate          |
| fs.readFileSync (50 MB)          | ~120ms           | Critical          |
| crypto.pbkdf2Sync (100k iter)    | ~80ms            | Critical          |
| RegExp backtracking (pathological)| 100ms-seconds   | Application hang  |

Source: [NodeSource - Debugging the Event Loop](https://nodesource.com/blog/node-js-performance-monitoring-part-3-debugging-the-event-loop),
[StackInsight - Blocking I/O Empirical Study](https://stackinsight.dev/blog/blocking-io-empirical-study)

### Detecting Blocked Event Loops

**1. The `blocked` library (production-safe)**

```js
const blocked = require('blocked');

blocked((ms) => {
  console.warn(`Event loop blocked for ${ms}ms`);
}, { threshold: 20 }); // fires when loop is blocked >20ms
```

Overhead: <1% CPU. Safe for production.
Source: [tj/node-blocked on GitHub](https://github.com/tj/node-blocked)

**2. The `blocked-at` library (development/staging)**

```js
const blocked = require('blocked-at');

blocked((time, stack) => {
  console.warn(`Blocked for ${time}ms, operation started at:`, stack);
}, { threshold: 20 });
```

Uses Async Hooks internally, adding 5-15% overhead. Use in staging to pinpoint
the exact call site that blocks.
Source: [naugtur/blocked-at on GitHub](https://github.com/naugtur/blocked-at)

**3. Sentry Event Loop Block Detection**

Sentry's Node.js SDK (v8+) monitors the event loop and captures stack traces
when blocking exceeds a configurable threshold, enabling production alerting
without custom instrumentation.
Source: [Sentry Docs - Event Loop Block Detection](https://docs.sentry.io/platforms/javascript/guides/node/configuration/event-loop-block/)

**4. Built-in `monitorEventLoopDelay` (Node.js 12+)**

```js
const { monitorEventLoopDelay } = require('perf_hooks');
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  console.log(`Event loop p99: ${(h.percentile(99) / 1e6).toFixed(2)}ms`);
  h.reset();
}, 5000);
```

Zero-dependency, built into Node. Reports histogram percentiles of event loop delay.

### Mitigation Strategies

- **Partition CPU work**: Break large loops into chunks using `setImmediate()` to
  yield back to the event loop between batches.
- **Offload to Worker Threads**: For work exceeding 5ms, move it off the main thread.
- **Avoid pathological RegExp**: Use `re2` (Google's safe regex library) or test
  patterns with [rxxr2](https://www.cs.bham.ac.uk/~hxt/research/rxxr2/) for
  catastrophic backtracking.

---

## 2. Worker Threads vs Cluster vs Child Process

Node.js provides three concurrency primitives for parallelism. Each serves a
different use case and carries different overhead.

### Comparison Matrix

| Feature              | `cluster`            | `worker_threads`      | `child_process`      |
|----------------------|----------------------|-----------------------|----------------------|
| Memory model         | Separate V8 heaps    | Separate V8 heaps*    | Separate process     |
| Memory overhead      | ~30-50 MB per worker | ~10-15 MB per thread  | ~30-50 MB per child  |
| Communication        | IPC (serialized)     | MessagePort or SAB    | IPC (serialized)     |
| Shared memory        | No                   | Yes (SharedArrayBuffer)| No                  |
| Port sharing         | Yes (built-in)       | No                    | No                   |
| Use case             | HTTP scaling         | CPU-bound tasks       | Subprocess execution |
| Startup time         | ~100-300ms           | ~5-50ms               | ~100-300ms           |

*Worker threads have separate V8 heaps but can share memory via SharedArrayBuffer.

### Cluster: Scaling HTTP Servers

The cluster module forks the process N times (typically `os.cpus().length` workers),
and the master distributes incoming connections via round-robin (Linux) or
OS-level load balancing.

```js
const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid}: forking ${numCPUs} workers`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting`);
    cluster.fork();
  });
} else {
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('OK');
  }).listen(3000);
}
```

**Benchmark (autocannon, 10s, 100 connections, 8-core machine):**

| Configuration     | Requests/sec | Latency p99 | Memory Total |
|-------------------|-------------|-------------|--------------|
| Single process    | ~41,000     | 12ms        | 80 MB        |
| Cluster (8 workers)| ~180,000   | 5ms         | 480 MB       |

Throughput scales near-linearly: ~4.4x improvement on 8 cores. Memory scales
linearly because each worker gets its own V8 heap.
Source: [DEV Community - Node.js Performance Optimization: Cluster Module](https://dev.to/safvantsy/nodejs-performance-optimization-cluster-module-1dap)

### Worker Threads: CPU-Bound Parallelism

Worker threads share the process but run on separate OS threads with isolated V8
instances. They are ideal for CPU-heavy work like image processing, crypto, or
data transformation.

```js
// main.js
const { Worker, isMainThread, parentPort } = require('worker_threads');

function runFibWorker(n) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./fib-worker.js', { workerData: n });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

// fib-worker.js
const { workerData, parentPort } = require('worker_threads');
function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
parentPort.postMessage(fib(workerData));
```

**Worker Pool Pattern (recommended):**

Creating a new worker per request adds ~5-50ms startup overhead. Use a fixed pool:

```js
const { StaticPool } = require('node-worker-threads-pool');

const pool = new StaticPool({
  size: os.cpus().length,
  task: './fib-worker.js',
});

// Reuses existing workers -- no startup cost per call
const result = await pool.exec(40);
```

**Benchmark -- Fibonacci(40), 100 concurrent requests:**

| Approach                    | Requests/sec | Latency p99 | Notes                    |
|-----------------------------|-------------|-------------|--------------------------|
| Main thread (blocking)      | 1.2         | 82,000ms    | All requests queued      |
| Worker per request          | 8.5         | 12,000ms    | Startup overhead per req |
| Fixed worker pool (8 threads)| 48         | 2,100ms     | 4x over per-request      |

Source: [DEV Community - Benchmarking Node.js Worker Threads](https://dev.to/dhwaneetbhatt/benchmarking-nodejs-worker-threads-5c9b),
[AppSignal - Dealing with CPU-bound Tasks](https://blog.appsignal.com/2024/01/17/dealing-with-cpu-bound-tasks-in-nodejs.html)

### Child Process: External Programs

Use `child_process.spawn` or `execFile` when you need to run external binaries
(ffmpeg, ImageMagick, Python scripts). The overhead is similar to cluster forking
but communication is via stdin/stdout pipes rather than IPC.

### Decision Framework

```
Is the work I/O-bound?
  YES -> Use async I/O on the main thread. No parallelism needed.
  NO  -> Is it an HTTP server needing horizontal scaling?
           YES -> Use cluster (or PM2 in cluster mode).
           NO  -> Is it CPU-bound JavaScript?
                    YES -> Use worker_threads with a fixed pool.
                    NO  -> Use child_process.spawn for external binaries.
```

---

## 3. V8 Garbage Collection Optimization

### V8 Heap Architecture

V8 divides the heap into generations based on the "generational hypothesis"
(most objects die young):

```
                        V8 Heap
  +-------------------------------------------------+
  |  New Space (Young Generation)                   |
  |  +--------------+  +--------------+             |
  |  | Semi-space A  |  | Semi-space B  |           |
  |  | (from-space)  |  | (to-space)    |           |
  |  +--------------+  +--------------+             |
  +-------------------------------------------------+
  |  Old Space (Old Generation)                     |
  |  +--------------------------------------+       |
  |  | Objects that survived 2+ scavenges    |      |
  |  +--------------------------------------+       |
  +-------------------------------------------------+
  |  Large Object Space  |  Code Space  |  Map      |
  +-------------------------------------------------+
```

**Scavenge GC (Minor GC):** Collects new space. Fast (1-5ms typically). Runs frequently.
Uses a copying algorithm between the two semi-spaces.

**Mark-Sweep-Compact (Major GC):** Collects old space. Slower (50-200ms+). Runs
less frequently. Can cause noticeable pauses.

### Key V8 Flags for GC Tuning

**`--max-old-space-size=<MB>`** (default: ~1.7 GB on 64-bit)

Sets the maximum old generation heap size. Increase for memory-intensive apps:

```bash
# Allow 4 GB for old space (e.g., large dataset processing)
node --max-old-space-size=4096 server.js
```

When heap approaches this limit, V8 triggers aggressive GC and eventually throws
`FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`.

**`--max-semi-space-size=<MB>`** (default: 16 MB per semi-space)

Controls the size of each semi-space in the young generation. Increasing this
reduces the frequency of minor GC at the cost of higher memory usage.

Benchmark results from NearForm and Alibaba Cloud:

| --max-semi-space-size | Scavenge Count (3 min) | Total GC Pause | QPS Change |
|-----------------------|------------------------|----------------|------------|
| 16 MB (default)       | ~1000                  | 48s            | baseline   |
| 64 MB                 | ~294                   | 12s            | +10%       |
| 128 MB                | ~180                   | 8s             | +11-18%    |
| 256 MB                | ~160                   | 7s             | +12% (diminishing) |

The optimal value for most web servers is **64-128 MB**. Beyond 128 MB, returns
diminish while memory usage increases significantly.
Source: [NearForm - Impact of --max-semi-space-size](https://nearform.com/digital-community/optimising-node-js-applications-the-impact-of-max-semi-space-size-on-garbage-collection-efficiency/),
[Alibaba Cloud - GC Optimization](https://www.alibabacloud.com/blog/better-node-application-performance-through-gc-optimization_595119)

**Combined tuning example:**

```bash
node --max-old-space-size=4096 \
     --max-semi-space-size=64 \
     server.js
```

This configuration achieved a combined throughput improvement of 11-45% depending
on workload in Akamas benchmarks.
Source: [Akamas - Tuning Node.js and V8](https://akamas.io/resources/tuning-nodejs-v8-performance-efficiency/)

### Tracing GC Activity

```bash
# Print GC events with timing
node --trace-gc server.js

# Output example:
# [44729:0x4408180] 2890 ms: Scavenge 28.5 (33.2) -> 26.8 (35.2) MB, 1.2 / 0.0 ms
# [44729:0x4408180] 5765 ms: Mark-sweep 45.1 (52.3) -> 31.2 (49.0) MB, 22.8 / 0.0 ms
```

For detailed GC traces:

```bash
node --trace-gc --trace-gc-verbose server.js
```

### Reducing GC Pressure

1. **Reuse objects** instead of creating new ones in hot paths:

```js
// BAD: Creates a new object per request (~50,000 objects/sec at load)
app.get('/api', (req, res) => {
  const result = { status: 'ok', timestamp: Date.now(), data: getData() };
  res.json(result);
});

// GOOD: Reuse a mutable response template
const responseTemplate = { status: 'ok', timestamp: 0, data: null };
app.get('/api', (req, res) => {
  responseTemplate.timestamp = Date.now();
  responseTemplate.data = getData();
  res.json(responseTemplate);
});
```

2. **Pre-allocate arrays** when size is known:

```js
// BAD: Array grows dynamically, triggering multiple reallocations
const results = [];
for (let i = 0; i < 100000; i++) results.push(compute(i));

// GOOD: Pre-allocate
const results = new Array(100000);
for (let i = 0; i < 100000; i++) results[i] = compute(i);
```

3. **Use Buffer.allocUnsafe()** for temporary buffers when you will overwrite all bytes:

```js
// SAFE but slower: zeroes out memory
const buf = Buffer.alloc(65536);

// Faster for scratch buffers: skips zeroing (~6x faster allocation)
const buf = Buffer.allocUnsafe(65536);
```

---

## 4. Memory Leak Detection

### Symptoms of a Memory Leak

- RSS (Resident Set Size) grows monotonically over hours/days.
- GC frequency increases but freed memory decreases each cycle.
- Eventually: `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed`.

### Tool 1: Heap Snapshots via `--inspect`

```bash
# Start with inspector
node --inspect server.js

# Or attach to a running process (sends SIGUSR1)
kill -USR1 <pid>  # Enables inspector on default port 9229
```

Open `chrome://inspect` in Chrome, connect to the Node process, go to the Memory
tab, and take heap snapshots.

**The Three-Snapshot Technique:**

1. Take snapshot S1 (baseline).
2. Run the suspected leaking operation repeatedly.
3. Take snapshot S2.
4. Run the operation more.
5. Take snapshot S3.
6. Compare S2 vs S1 (Summary -> Comparison mode) to see allocations.
7. Compare S3 vs S2 to confirm the same objects keep growing.

Objects that appear in both deltas with positive counts are likely leaking.

**Warning:** Taking a heap snapshot pauses the event loop and can double memory
usage temporarily. In production, ensure the process can tolerate a crash or
route traffic away first.
Source: [Node.js Docs - Using Heap Snapshot](https://nodejs.org/en/learn/diagnostics/memory/using-heap-snapshot)

### Tool 2: `heapdump` Module (Programmatic Snapshots)

```js
const heapdump = require('heapdump');

// Take a snapshot on demand (e.g., via admin endpoint or signal)
process.on('SIGUSR2', () => {
  const filename = `/tmp/heapdump-${Date.now()}.heapsnapshot`;
  heapdump.writeSnapshot(filename, (err) => {
    if (err) console.error(err);
    else console.log(`Heap snapshot written to ${filename}`);
  });
});
```

### Tool 3: Clinic.js Doctor and HeapProfiler

Clinic.js is an open-source performance toolkit by NearForm, built on top of 0x.

```bash
npm install -g clinic autocannon

# Run Doctor to detect issues (event loop delays, GC, active handles)
clinic doctor -- node server.js
# In another terminal: autocannon -c 100 -d 20 http://localhost:3000

# Run HeapProfiler for memory allocation flame graphs
clinic heapprofiler -- node server.js
# In another terminal: autocannon -c 50 -d 30 http://localhost:3000
```

Doctor generates an HTML report classifying the issue as:
- **I/O problem** (event loop is idle but responses are slow)
- **Event loop problem** (event loop delay is high)
- **GC problem** (GC is consuming >20% of CPU time)
- **None detected** (the application is healthy)

**Limitation:** Clinic.js can struggle with profiling sessions longer than ~1 hour
due to report generation memory requirements.
Source: [NearForm - Introducing Clinic.js](https://www.nearform.com/blog/introducing-node-clinic-a-performance-toolkit-for-node-js-developers/)

### Tool 4: `process.memoryUsage()` for Continuous Monitoring

```js
setInterval(() => {
  const mem = process.memoryUsage();
  console.log({
    rss_mb:       (mem.rss / 1024 / 1024).toFixed(1),
    heapTotal_mb: (mem.heapTotal / 1024 / 1024).toFixed(1),
    heapUsed_mb:  (mem.heapUsed / 1024 / 1024).toFixed(1),
    external_mb:  (mem.external / 1024 / 1024).toFixed(1),
  });
}, 10000);
```

Export these metrics to Prometheus/Grafana for trend analysis. A leak shows as
a monotonically increasing `heapUsed` over time.

### Common Leak Sources

| Source                          | Detection Method            | Fix                                    |
|---------------------------------|-----------------------------|-----------------------------------------|
| Global caches without eviction  | Growing Map/Set in snapshot | Use LRU cache (lru-cache package)       |
| Event listener accumulation     | `emitter.listenerCount()`  | Remove listeners in cleanup/dispose     |
| Closures holding large scope    | Retained size in snapshot   | Nullify references after use            |
| Unresolved promises             | Growing promise count       | Add timeouts and rejection handlers     |
| Detached DOM (SSR frameworks)   | Retained DOM tree in heap   | Properly destroy render contexts        |

---

## 5. Stream Processing for Large Data

### Why Streams Matter

Node.js streams process data in chunks rather than loading entire payloads into
memory. For large files and datasets, this is the difference between an application
that works and one that crashes.

**Benchmark: Reading a 1.7 GB file**

| Method                    | Peak Memory | Time to Process | Notes                     |
|---------------------------|-------------|-----------------|---------------------------|
| `fs.readFile()`           | 1,730 MB    | 3.2s            | Entire file buffered      |
| `fs.createReadStream()`   | 25 MB       | 2.1s            | 64 KB chunks              |

For a 7.4 GB file, `fs.readFile` crashes with heap OOM, while streaming uses only
61.9 MiB RAM -- a 98.68% memory reduction.
Source: [Paige Niedringhaus - Streams For the Win](https://www.paigeniedringhaus.com/blog/streams-for-the-win-a-performance-comparison-of-node-js-methods-for-reading-large-datasets-pt-2/)

### Stream Types and Usage

```js
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');

// ANTI-PATTERN: Buffer entire file
const data = fs.readFileSync('large-log.csv');      // 2 GB -> OOM
const lines = data.toString().split('\n');           // doubles memory

// CORRECT: Stream processing with backpressure
await pipeline(
  fs.createReadStream('large-log.csv'),
  zlib.createGzip(),                                 // compress on the fly
  fs.createWriteStream('large-log.csv.gz')
);
// Peak memory: ~64 KB regardless of file size
```

### Transform Streams for Data Processing

```js
const { Transform } = require('stream');

const csvToJson = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    const line = chunk.toString().trim();
    const [id, name, value] = line.split(',');
    callback(null, { id, name, value: parseFloat(value) });
  },
});

// Process millions of CSV rows with constant memory
await pipeline(
  fs.createReadStream('data.csv'),
  require('split2')(),         // split by newlines
  csvToJson,
  async function* (source) {   // async generator as transform
    for await (const record of source) {
      if (record.value > 100) yield JSON.stringify(record) + '\n';
    }
  },
  fs.createWriteStream('filtered.jsonl')
);
```

### HTTP Response Streaming

```js
// ANTI-PATTERN: Buffers entire 500 MB query result
app.get('/export', async (req, res) => {
  const rows = await db.query('SELECT * FROM large_table'); // 200 MB in memory
  res.json(rows);
});

// CORRECT: Stream from database cursor
app.get('/export', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write('[');
  const cursor = db.query(new Cursor('SELECT * FROM large_table'));
  let first = true;
  let rows;
  while ((rows = await cursor.read(1000)).length > 0) {
    for (const row of rows) {
      if (!first) res.write(',');
      res.write(JSON.stringify(row));
      first = false;
    }
  }
  res.end(']');
  cursor.close();
});
```

### Backpressure Handling

Streams automatically handle backpressure through the `highWaterMark` (default
16 KB for byte streams, 16 objects for object mode). When the writable side is
full, the readable side pauses automatically. Using `pipeline()` (or
`stream.pipeline()`) handles this correctly; manual `.pipe()` chains can miss
error propagation and backpressure edge cases.

---

## 6. Connection Pooling for Databases

### Why Pooling Matters

Each new database connection involves:
- TCP three-way handshake (~1-3ms local, 10-50ms remote)
- TLS negotiation (~5-30ms)
- Authentication protocol (~2-10ms)

At 1000 req/s with a new connection per request, that is 15-90 seconds of cumulative
overhead per second -- clearly unsustainable.

### PostgreSQL with `pg` Pool

```js
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  max: 20,                     // max connections in pool
  min: 5,                      // keep 5 warm connections
  idleTimeoutMillis: 30000,    // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail if connection takes >5s
  maxUses: 7500,               // recycle after 7500 queries (prevents leaks)
});

// Automatic checkout and return
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**Benchmark: Pooled vs non-pooled (PostgreSQL, 100 concurrent requests):**

| Approach                | Avg Latency | Throughput  | Connections Used |
|-------------------------|-------------|-------------|------------------|
| New connection per query| 45ms        | ~2,200 req/s| 100 simultaneous |
| Pool (max: 20)          | 15ms        | ~6,600 req/s| 20 reused        |

Pooled connections are approximately 3x faster.
Source: [Stack Overflow - Improve Database Performance with Connection Pooling](https://stackoverflow.blog/2020/10/14/improve-database-performance-with-connection-pooling/)

### MySQL with `mysql2`

```js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  database: 'myapp',
  connectionLimit: 20,
  queueLimit: 0,                // unlimited queue (requests wait for free conn)
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000, // TCP keep-alive every 30s
});

const [rows] = await pool.execute('SELECT * FROM orders WHERE user_id = ?', [userId]);
```

### Redis Connection Management

```js
const Redis = require('ioredis');

// Single connection with auto-reconnect (ioredis handles this)
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// For high throughput: use pipelining (batch commands in single round-trip)
const pipe = redis.pipeline();
for (let i = 0; i < 1000; i++) {
  pipe.get(`key:${i}`);
}
const results = await pipe.exec(); // 1 round-trip instead of 1000
```

### Pool Sizing Formula

A widely-used heuristic from the HikariCP project (applicable to Node.js):

```
optimal_pool_size = (core_count * 2) + effective_spindle_count
```

For SSD-backed databases, spindle count is effectively 1:

- 4-core server: pool size = (4 * 2) + 1 = **9**
- 8-core server: pool size = (8 * 2) + 1 = **17**

Over-provisioning connections (e.g., 100) can degrade database performance due to
context switching and lock contention on the database side.

---

## 7. Profiling Tools and Techniques

### Tool Comparison

| Tool              | Type           | Overhead | Best For                    | Output Format        |
|-------------------|----------------|----------|-----------------------------|----------------------|
| `--prof`          | CPU sampling   | 5-10%    | V8 tick analysis            | Text / flamegraph    |
| `--inspect`       | CPU/Memory     | 1-5%     | Interactive debugging       | Chrome DevTools      |
| `clinic doctor`   | Auto-diagnosis | 10-15%   | Issue classification        | HTML report          |
| `clinic flame`    | CPU profiling  | 10-15%   | Flame graph visualization   | Interactive HTML     |
| `clinic bubbleprof`| Async profiling| 15-20%  | Async operation analysis    | Bubble chart HTML    |
| `0x`              | CPU profiling  | 5-10%    | Quick flame graphs          | Interactive HTML     |
| `perf` + stacks   | System profiling| 1-3%   | Production, kernel + user   | Flame graph SVG      |

### Using `--prof` (Built-in V8 Profiler)

```bash
# Step 1: Profile the application
node --prof server.js
# Generate load: autocannon -c 100 -d 30 http://localhost:3000

# Step 2: Process the tick log (generates after process exits)
node --prof-process isolate-0x*.log > processed.txt

# Step 3: Examine output
# Look for [JavaScript] and [C++] sections
# Top entries by "ticks" are your hottest functions
```

Example output interpretation:

```
 [JavaScript]:
   ticks  total  nonlib   name
    523   18.2%   24.1%  LazyCompile: *processRequest /app/server.js:45
    312   10.8%   14.4%  LazyCompile: *JSON.parse
    198    6.9%    9.1%  LazyCompile: *validateInput /app/validators.js:12
```

The `*` prefix means the function was optimized by TurboFan. Functions without `*`
are running in interpreted mode and may benefit from optimization.
Source: [Node.js Docs - Profiling Node.js Applications](https://nodejs.org/en/learn/getting-started/profiling)

### Using `0x` for Flame Graphs

```bash
npm install -g 0x

# Profile with automatic flame graph generation
0x -- node server.js
# Generate load in another terminal, then Ctrl+C

# Opens interactive flame graph in browser automatically
```

0x generates flame graphs where:
- **Width** = percentage of CPU time spent in that function
- **Height** = stack depth
- **Hot (red/orange) frames** = functions consuming the most CPU
- You can click to zoom into specific call stacks

Source: [0x on GitHub](https://github.com/davidmarkclements/0x)

### Using Clinic.js Flame

```bash
npm install -g clinic

# Generate flame graph with load testing
clinic flame --autocannon [ -c 100 -d 30 / ] -- node server.js

# The above runs autocannon automatically against your server
# Generates an interactive HTML flame graph on completion
```

Clinic Flame wraps 0x and adds analysis for synchronous bottlenecks --
functions that block the event loop appear as wide, hot frames.
Source: [Clinic.js - Flame Walkthrough](https://clinicjs.hashbase.io/flame/walkthrough/setup)

### Using Flamebearer (Lightweight Alternative)

```bash
npm install -g flamebearer

# Step 1: Profile
node --prof app.js

# Step 2: Generate flamegraph
node --prof-process --preprocess -j isolate*.log | flamebearer
# Opens flame.html in the browser
```

Flamebearer is faster than 0x for generating visualizations from existing
`--prof` output, useful when you already have V8 logs.
Source: [mapbox/flamebearer on GitHub](https://github.com/mapbox/flamebearer)

### Production Profiling with `perf`

For low-overhead (<3%) production profiling on Linux:

```bash
# Start node with perf maps enabled
node --perf-basic-prof-only-functions server.js &

# Record 30 seconds of CPU samples
perf record -F 99 -p $(pgrep -f server.js) -g -- sleep 30

# Generate flame graph (requires brendangregg/FlameGraph)
perf script | stackcollapse-perf.pl | flamegraph.pl > flamegraph.svg
```

The `--perf-basic-prof-only-functions` flag writes a map file that lets `perf`
resolve JavaScript function names with minimal overhead (unlike
`--perf-basic-prof` which also maps internal V8 code).
Source: [Node.js Docs - Flame Graphs](https://nodejs.org/en/learn/diagnostics/flame-graphs)

---

## 8. Common Bottlenecks

### 8.1 Event Loop Blocking

**Cause:** Synchronous operations, CPU-heavy computations, or pathological regex
on the main thread.

**Detection:** `monitorEventLoopDelay()` shows p99 > 20ms. `blocked` library fires
alerts.

**Impact:** A single 200ms blocking operation at 1000 req/s delays ~200 queued
requests. Throughput drops by 3.2x with synchronous I/O operations in hot paths.
Source: [StackInsight - Blocking I/O Empirical Study](https://stackinsight.dev/blog/blocking-io-empirical-study)

### 8.2 Synchronous I/O in Request Handlers

**Cause:** Using `fs.readFileSync`, `fs.writeFileSync`, or synchronous subprocess
calls inside request handling code.

**Impact:** Each call blocks all other requests. A 10ms readFileSync at 5000 req/s
means only ~100 req/s effective throughput.

```js
// BLOCKS: 280x throughput drop under concurrent load
app.get('/config', (req, res) => {
  const config = fs.readFileSync('/etc/app/config.json', 'utf8');
  res.json(JSON.parse(config));
});

// NON-BLOCKING: Full throughput maintained
app.get('/config', async (req, res) => {
  const config = await fs.promises.readFile('/etc/app/config.json', 'utf8');
  res.json(JSON.parse(config));
});

// OPTIMAL: Cache in memory, reload on change
let cachedConfig = JSON.parse(fs.readFileSync('/etc/app/config.json', 'utf8'));
fs.watch('/etc/app/config.json', async () => {
  cachedConfig = JSON.parse(
    await fs.promises.readFile('/etc/app/config.json', 'utf8')
  );
});
app.get('/config', (req, res) => res.json(cachedConfig));
```

### 8.3 Memory Leaks

**Cause:** Unbounded caches, event listener accumulation, closure retention,
unresolved promises.

**Impact:** Gradual memory growth leading to increased GC pressure (CPU spikes),
eventually OOM crash.

**Detection:**
```bash
# Monitor RSS growth over time
watch -n 5 'ps -o rss,vsz,pid -p $(pgrep -f server.js)'
```

### 8.4 Unhandled Promise Chains

**Cause:** Promise rejections without `.catch()` or retry loops that chain promises
infinitely.

```js
// MEMORY LEAK: Promise chain grows indefinitely on repeated failures
async function pollWithRetry() {
  try {
    return await fetchData();
  } catch (e) {
    return pollWithRetry(); // Each retry adds to the promise chain
  }
}

// FIXED: Use a loop instead of recursion
async function pollWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchData();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

Source: [Cribl - Promise Chaining Memory Leak Pattern](https://cribl.io/blog/promise-chaining-memory-leak/)

### 8.5 DNS Lookup Overhead

**Cause:** Node.js `dns.lookup()` uses the synchronous `getaddrinfo(3)` system call
on libuv's threadpool (default: 4 threads). More than 4 concurrent DNS lookups
block the entire threadpool, stalling all file I/O and DNS operations.

**Impact:** Each DNS lookup adds 50-150ms. Without HTTP Keep-Alive, every outbound
request pays this cost.

```js
// PROBLEM: Default HTTP client did NOT use Keep-Alive before Node 19
const http = require('http');
// Each request = DNS lookup + TCP handshake + TLS handshake

// FIX 1: Enable Keep-Alive (connections reused, DNS cached per socket)
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 30000,
});
http.get('http://api.example.com/data', { agent }, callback);

// FIX 2: Increase UV_THREADPOOL_SIZE for DNS-heavy applications
// Set BEFORE any require() calls:
// process.env.UV_THREADPOOL_SIZE = '16';
// Or at launch: UV_THREADPOOL_SIZE=16 node server.js
```

**Benchmark (outbound HTTP requests with and without Keep-Alive):**

| Configuration     | Avg Latency | Max Throughput | CPU Usage |
|-------------------|-------------|----------------|-----------|
| No Keep-Alive     | 110-120ms   | ~800 req/s     | High      |
| Keep-Alive enabled| 20-30ms     | ~1,600 req/s   | 50% lower |

Keep-Alive provides a ~75% latency reduction and 2x throughput increase.
Source: [Lob Engineering - Use HTTP Keep-Alive](https://www.lob.com/blog/use-http-keep-alive),
[HTTP Toolkit - Fixing DNS in Node.js](https://httptoolkit.com/blog/configuring-nodejs-dns/)

Note: Starting from Node.js 19+, `http.Agent` has `keepAlive: true` by default.

---

## 9. Anti-Patterns and Fixes

### Anti-Pattern 1: Synchronous File I/O in Servers

```js
// ANTI-PATTERN
const template = fs.readFileSync('template.html', 'utf8'); // OK at startup
app.get('/page', (req, res) => {
  const data = fs.readFileSync('data.json', 'utf8');       // BLOCKS per request
  res.send(template.replace('{{data}}', data));
});

// FIX: Async with caching
let cachedData = null;
async function getData() {
  if (!cachedData) cachedData = await fs.promises.readFile('data.json', 'utf8');
  return cachedData;
}
app.get('/page', async (req, res) => {
  const data = await getData();
  res.send(template.replace('{{data}}', data));
});
```

**Impact:** With 50 concurrent users, `readFileSync` on a 1 MB file causes
~40% end-to-end latency increase.
Source: [Node.js Docs - Blocking vs Non-Blocking](https://nodejs.org/en/learn/asynchronous-work/overview-of-blocking-vs-non-blocking)

### Anti-Pattern 2: CPU-Heavy Work on Main Thread

```js
// ANTI-PATTERN: Blocks event loop for ~800ms
app.post('/hash', (req, res) => {
  const hash = crypto.pbkdf2Sync(req.body.password, salt, 100000, 64, 'sha512');
  res.json({ hash: hash.toString('hex') });
});

// FIX: Use async variant (runs on libuv threadpool)
app.post('/hash', (req, res) => {
  crypto.pbkdf2(req.body.password, salt, 100000, 64, 'sha512', (err, hash) => {
    res.json({ hash: hash.toString('hex') });
  });
});

// BETTER FIX for custom CPU work: Worker thread pool
const { Worker } = require('worker_threads');
app.post('/process', async (req, res) => {
  const result = await runInWorker('./heavy-computation.js', req.body);
  res.json(result);
});
```

**Benchmark (autocannon, 50 connections, 10s):**

| Approach               | Requests/sec | p99 Latency |
|------------------------|-------------|-------------|
| pbkdf2Sync (blocking)  | ~62         | 8,200ms     |
| pbkdf2 (async)         | ~9,200      | 28ms        |

The async variant is ~148x faster in throughput because it does not block
the event loop.

### Anti-Pattern 3: Accumulating Closures and Listeners

```js
// ANTI-PATTERN: Listener added per request, never removed
app.get('/stream', (req, res) => {
  const handler = (data) => res.write(data);
  eventSource.on('data', handler);
  // Listener is never removed -- accumulates per connection
});

// FIX: Remove listener on connection close
app.get('/stream', (req, res) => {
  const handler = (data) => res.write(data);
  eventSource.on('data', handler);
  req.on('close', () => eventSource.removeListener('data', handler));
});
```

After 10,000 requests without cleanup, memory grows by ~50 MB from retained
closures, and `emitter.listenerCount('data')` reaches 10,000.

### Anti-Pattern 4: Not Using Streams for Large Responses

```js
// ANTI-PATTERN: Buffers entire 500 MB file
app.get('/download/:file', async (req, res) => {
  const data = await fs.promises.readFile(`/uploads/${req.params.file}`);
  res.send(data); // 500 MB in memory per concurrent download
});

// FIX: Stream the file
app.get('/download/:file', (req, res) => {
  const stream = fs.createReadStream(`/uploads/${req.params.file}`);
  stream.pipe(res);
  stream.on('error', (err) => {
    res.status(404).end('File not found');
  });
});
```

**Impact:** 10 concurrent 500 MB downloads = 5 GB RAM with buffering vs ~10 MB
with streaming.

### Anti-Pattern 5: Missing Connection Pooling

```js
// ANTI-PATTERN: New connection per query
app.get('/user/:id', async (req, res) => {
  const client = new pg.Client(connectionString);
  await client.connect();                              // 10-50ms overhead each time
  const result = await client.query(
    'SELECT * FROM users WHERE id = $1', [req.params.id]
  );
  await client.end();
  res.json(result.rows[0]);
});

// FIX: Use a shared pool
const pool = new pg.Pool({ max: 20, connectionString });
app.get('/user/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1', [req.params.id]
  );
  res.json(result.rows[0]);
});
```

### Anti-Pattern 6: Large JSON.parse on Main Thread

```js
// ANTI-PATTERN: 50 MB JSON payload parsed synchronously (~50ms block)
app.post('/import', express.json({ limit: '100mb' }), (req, res) => {
  processData(req.body); // JSON.parse already blocked for 50ms
});

// FIX: Stream JSON parsing with stream-json
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

app.post('/import', (req, res) => {
  const jsonPipeline = req
    .pipe(parser())
    .pipe(streamArray());

  jsonPipeline.on('data', ({ value }) => processRecord(value));
  jsonPipeline.on('end', () => res.json({ status: 'done' }));
  jsonPipeline.on('error', (err) => res.status(400).json({ error: err.message }));
});
```

---

## 10. Benchmarking Methodology

### Tools

**autocannon** (Node.js native, recommended for Node apps):

```bash
npm install -g autocannon

# Basic benchmark: 100 connections, 30 seconds
autocannon -c 100 -d 30 http://localhost:3000/api

# With pipelining (10 requests per connection before waiting)
autocannon -c 100 -d 30 -p 10 http://localhost:3000/api

# Output includes: latency histogram, req/s, throughput
```

**wrk** (C-based, higher load generation capacity):

```bash
# Install: brew install wrk (macOS) or apt install wrk (Ubuntu)

# 4 threads, 100 connections, 30 seconds
wrk -t4 -c100 -d30s http://localhost:3000/api

# With Lua script for POST requests
wrk -t4 -c100 -d30s -s post.lua http://localhost:3000/api
```

**Comparison:**

| Feature               | autocannon        | wrk             |
|------------------------|-------------------|-----------------|
| Language               | JavaScript        | C               |
| Max load (single core) | ~54k req/s        | ~100k+ req/s    |
| HTTP pipelining        | Yes               | No              |
| Scripting              | JS (programmatic) | Lua             |
| Latency histogram      | Built-in          | With HdrHistogram|
| Installation           | npm install -g    | System package  |

Both tools saturate a typical Node.js HTTP server at ~41k req/s on a single core.
Source: [autocannon on GitHub](https://github.com/mcollina/autocannon)

### Benchmarking Best Practices

1. **Warm up first**: Run 5-10 seconds of load before measuring to allow V8's
   TurboFan optimizer to compile hot functions.

2. **Isolate variables**: Change one thing at a time. Benchmark before and after.

3. **Use percentiles, not averages**: p50 (median), p95, and p99 latency reveal
   tail latency that averages hide.

4. **Match production conditions**: Test with realistic payload sizes, database
   state, and connection counts.

5. **Multiple runs**: Run each benchmark 3-5 times and report median results
   to account for system noise.

6. **Disable CPU frequency scaling** during benchmarks:
   ```bash
   # Linux: Set CPU governor to performance
   echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
   ```

### Complete Before/After Benchmark Example

**Scenario:** Express API serving user profiles with database lookup.

```js
// BEFORE: No pooling, sync config read, no Keep-Alive
const express = require('express');
const pg = require('pg');
const fs = require('fs');
const app = express();

app.get('/user/:id', async (req, res) => {
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const client = new pg.Client(config.db);
  await client.connect();
  const result = await client.query(
    'SELECT * FROM users WHERE id = $1', [req.params.id]
  );
  await client.end();
  res.json(result.rows[0]);
});
app.listen(3000);
```

```bash
# BEFORE benchmark
autocannon -c 100 -d 30 http://localhost:3000/user/42
# Result: 420 req/s, p99: 890ms, memory: 180 MB
```

```js
// AFTER: Connection pool, cached config, Keep-Alive
const express = require('express');
const pg = require('pg');
const fs = require('fs');
const app = express();

// Read config once at startup (sync is fine here)
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const pool = new pg.Pool({ ...config.db, max: 20, min: 5 });

app.get('/user/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1', [req.params.id]
  );
  res.json(result.rows[0]);
});

const server = app.listen(3000);
server.keepAliveTimeout = 65000; // Slightly higher than typical LB timeout (60s)
```

```bash
# AFTER benchmark
autocannon -c 100 -d 30 http://localhost:3000/user/42
# Result: 6,800 req/s, p99: 22ms, memory: 95 MB
```

**Improvement: 16.2x throughput, 40x latency reduction, 47% memory reduction.**

### Recommended V8 Flags for Production

```bash
node \
  --max-old-space-size=4096 \
  --max-semi-space-size=64 \
  --trace-warnings \
  server.js
```

Additional flags for specific scenarios:

```bash
# Expose GC for manual triggering (testing only, not production)
--expose-gc

# Enable source maps for production error stacks
--enable-source-maps

# Increase UV threadpool for DNS/file-heavy workloads
UV_THREADPOOL_SIZE=16 node server.js
```

---

## Quick Reference: Performance Checklist

```
[ ] No synchronous I/O in request handlers (readFileSync, writeFileSync)
[ ] CPU-bound work offloaded to worker threads or async alternatives
[ ] Database connections pooled (pg.Pool, mysql2.createPool)
[ ] HTTP Keep-Alive enabled for outbound requests
[ ] Streams used for files > 1 MB (createReadStream, pipeline)
[ ] JSON parsing streamed for payloads > 10 MB
[ ] Event listeners removed on disconnect (removeListener in 'close')
[ ] Promise chains use loops, not recursion for retries
[ ] --max-semi-space-size=64 set for high-throughput servers
[ ] --max-old-space-size set appropriately for available RAM
[ ] UV_THREADPOOL_SIZE increased if >4 concurrent DNS lookups expected
[ ] Event loop delay monitored (monitorEventLoopDelay or blocked library)
[ ] Memory usage tracked over time (process.memoryUsage -> Prometheus)
[ ] Caching layer for frequently-read, rarely-changed data
[ ] Profiling run under load before deployment (clinic flame or 0x)
```

---

## Sources

- [NodeSource - State of Node.js Performance 2024](https://nodesource.com/blog/State-of-Nodejs-Performance-2024)
- [NearForm - Impact of --max-semi-space-size on GC Efficiency](https://nearform.com/digital-community/optimising-node-js-applications-the-impact-of-max-semi-space-size-on-garbage-collection-efficiency/)
- [Platformatic - V8 Memory Management and GC Tuning](https://blog.platformatic.dev/optimizing-nodejs-performance-v8-memory-management-and-gc-tuning)
- [Akamas - Tuning Node.js and V8 to Unlock 2x Performance](https://akamas.io/resources/tuning-nodejs-v8-performance-efficiency/)
- [Alibaba Cloud - Node.js GC Optimization](https://www.alibabacloud.com/blog/better-node-application-performance-through-gc-optimization_595119)
- [Node.js Docs - Don't Block the Event Loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
- [Node.js Docs - Profiling Node.js Applications](https://nodejs.org/en/learn/getting-started/profiling)
- [Node.js Docs - Flame Graphs](https://nodejs.org/en/learn/diagnostics/flame-graphs)
- [Node.js Docs - Using Heap Snapshot](https://nodejs.org/en/learn/diagnostics/memory/using-heap-snapshot)
- [Node.js Docs - Tracing Garbage Collection](https://nodejs.org/en/learn/diagnostics/memory/using-gc-traces)
- [Ashby Engineering - Detecting Event Loop Blockers](https://www.ashbyhq.com/blog/engineering/detecting-event-loop-blockers)
- [Sentry - Event Loop Block Detection](https://docs.sentry.io/platforms/javascript/guides/node/configuration/event-loop-block/)
- [StackInsight - Blocking I/O Empirical Study](https://stackinsight.dev/blog/blocking-io-empirical-study)
- [Paige Niedringhaus - Streams For the Win](https://www.paigeniedringhaus.com/blog/streams-for-the-win-a-performance-comparison-of-node-js-methods-for-reading-large-datasets-pt-2/)
- [Stack Overflow - Database Connection Pooling](https://stackoverflow.blog/2020/10/14/improve-database-performance-with-connection-pooling/)
- [Lob Engineering - Use HTTP Keep-Alive](https://www.lob.com/blog/use-http-keep-alive)
- [HTTP Toolkit - Fixing DNS in Node.js](https://httptoolkit.com/blog/configuring-nodejs-dns/)
- [NearForm - Introducing Clinic.js](https://www.nearform.com/blog/introducing-node-clinic-a-performance-toolkit-for-node-js-developers/)
- [Cribl - Promise Chaining Memory Leak Pattern](https://cribl.io/blog/promise-chaining-memory-leak/)
- [RisingStack - Node.js Garbage Collection Explained](https://blog.risingstack.com/node-js-at-scale-node-js-garbage-collection/)
- [AppSignal - CPU-bound Tasks in Node.js](https://blog.appsignal.com/2024/01/17/dealing-with-cpu-bound-tasks-in-nodejs.html)
- [DEV Community - Benchmarking Worker Threads](https://dev.to/dhwaneetbhatt/benchmarking-nodejs-worker-threads-5c9b)
- [0x on GitHub](https://github.com/davidmarkclements/0x)
- [autocannon on GitHub](https://github.com/mcollina/autocannon)
- [tj/node-blocked on GitHub](https://github.com/tj/node-blocked)
- [naugtur/blocked-at on GitHub](https://github.com/naugtur/blocked-at)
- [mapbox/flamebearer on GitHub](https://github.com/mapbox/flamebearer)
