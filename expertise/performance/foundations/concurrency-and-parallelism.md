# Concurrency & Parallelism -- Performance Expertise Module

> Concurrency is the composition of independently executing tasks; parallelism is their simultaneous execution on multiple processing units. Confusing them is the single most common source of performance anti-patterns in modern software. Choosing the wrong model for your workload can mean a 10-20x throughput loss, while choosing correctly can yield 3-8x speedups with minimal code changes.

> **Impact:** Critical
> **Applies to:** All (Backend, Web, Mobile, Infrastructure, Data Processing)
> **Key metrics:** Throughput (req/s), Latency (p50/p95/p99), CPU Utilization (%), Context Switch Rate, Lock Contention Rate, Thread Pool Queue Depth

---

## Table of Contents

1. [Concurrency vs Parallelism: The Distinction That Matters](#concurrency-vs-parallelism-the-distinction-that-matters)
2. [Async I/O Models](#async-io-models)
3. [Thread Pools and Process Pools](#thread-pools-and-process-pools)
4. [Amdahl's Law: The Math of Diminishing Returns](#amdahls-law-the-math-of-diminishing-returns)
5. [Lock-Free Data Structures and Atomic Operations](#lock-free-data-structures-and-atomic-operations)
6. [The Actor Model](#the-actor-model)
7. [Parallel Algorithms](#parallel-algorithms)
8. [Common Bottlenecks](#common-bottlenecks)
9. [Anti-Patterns](#anti-patterns)
10. [Race Conditions, Deadlocks, and Debugging](#race-conditions-deadlocks-and-debugging)
11. [Before/After: Sequential vs Parallel Speedups](#beforeafter-sequential-vs-parallel-speedups)
12. [Decision Tree: Threads, Async, or Processes?](#decision-tree-threads-async-or-processes)
13. [Sources](#sources)

---

## Concurrency vs Parallelism: The Distinction That Matters

### Definitions

**Concurrency** is a structural property of a program: multiple tasks can be in progress at the same time, their execution may interleave, but they do not necessarily run simultaneously. A single-core CPU runs concurrent tasks by switching between them rapidly.

**Parallelism** is a runtime property: multiple tasks execute at literally the same instant on separate processing units (cores, CPUs, GPUs, machines). Parallelism requires hardware support; concurrency requires only program design.

Rob Pike's formulation: "Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once."

### Performance Implications

| Dimension | Concurrency | Parallelism |
|-----------|-------------|-------------|
| Primary benefit | Improved throughput for I/O-bound work | Reduced latency for CPU-bound work |
| Hardware requirement | Single core sufficient | Multiple cores required |
| Scaling ceiling | I/O bandwidth | Core count (Amdahl's Law) |
| Overhead source | Context switching, scheduling | Synchronization, data partitioning |
| Typical speedup (I/O-heavy) | 10-100x over sequential | Marginal improvement |
| Typical speedup (CPU-heavy) | No improvement (may worsen) | 2-8x on 8-core system |

### When Each Approach Wins

**Concurrency wins** when the workload is I/O-bound: web servers handling HTTP requests, database query dispatch, file I/O, network calls. A Node.js event loop handles 10,000+ concurrent connections on a single thread because nearly all time is spent waiting for I/O, not computing.

**Parallelism wins** when the workload is CPU-bound: image processing, video encoding, numerical simulation, data transformation pipelines. Splitting a 4-second computation across 4 cores yields approximately 1 second of wall time.

**Both together** win for mixed workloads: a web server (concurrent request handling) that performs image resizing (parallel computation) per request.

### Hardware Context (2025)

Desktop processors commonly feature 8-16 cores. Server processors offer 64-128 cores (AMD EPYC 9004 series: up to 128 cores/256 threads). ARM-based designs like Apple M-series and Ampere Altra use heterogeneous core architectures (performance + efficiency cores) that affect parallelism strategies. Source: [Uplatz Comparative Analysis](https://uplatz.com/blog/a-comparative-analysis-of-modern-concurrency-models-architecture-performance-and-application/)

---

## Async I/O Models

### Event Loop (Node.js, Browser JavaScript)

Node.js uses a single-threaded event loop backed by libuv. All JavaScript executes on one thread; I/O operations are delegated to the OS kernel (epoll on Linux, kqueue on macOS, IOCP on Windows) and completed asynchronously.

**Architecture:**
```
Main Thread (V8)          libuv Thread Pool (4 default)
   |                           |
   |--- setTimeout ---------> Timer heap
   |--- fs.readFile --------> Worker thread (blocking I/O)
   |--- http.get ------------> OS kernel (non-blocking)
   |--- crypto.pbkdf2 ------> Worker thread (CPU-bound)
   |
   <--- callback/promise resolution via event queue
```

**Performance characteristics:**
- Single-threaded: zero lock contention, zero context switching for JS code
- Handles 10,000+ concurrent connections per process with ~50MB RAM
- Node.js is 40-60% faster than Python for handling concurrent connections ([Dev.to Benchmark](https://dev.to/m-a-h-b-u-b/nodejs-vs-python-real-benchmarks-performance-insights-and-scalability-analysis-4dm5))
- Worker threads available for CPU-bound tasks; benchmarks show up to 10x speedup for CPU-heavy operations ([Medium - Worker Threads](https://medium.com/codex/achieve-the-best-performance-10x-faster-node-js-with-worker-threads-97fc2890e40f))
- Cluster module forks processes equal to CPU cores, multiplying throughput linearly for stateless HTTP servers

**Critical pitfall -- async/await in loops:**

```javascript
// BAD: Sequential execution -- each iteration waits for the previous one
// Total time: N * avg_request_time
for (const url of urls) {
  const result = await fetch(url);  // blocks loop iteration
  results.push(result);
}

// GOOD: Parallel execution -- all requests in flight simultaneously
// Total time: max(request_times)
const results = await Promise.all(urls.map(url => fetch(url)));
```

Using await inside a loop can cause 14x slowdowns in some scenarios because each iteration serializes what should be concurrent work. Source: [Ajani Bilby - Async JS Performance](https://www.ajanibilby.com/blog/async-js-performance-apr23/)

### Green Threads / Goroutines (Go)

Go's runtime multiplexes goroutines onto a small pool of OS threads (typically matching `GOMAXPROCS`, which defaults to the number of CPU cores). The Go scheduler is cooperative: goroutines yield at I/O operations, channel operations, and function calls.

**Performance characteristics:**
- Goroutine creation cost: ~2-4 KB stack (grows dynamically), vs ~1 MB per OS thread ([GeeksforGeeks](https://www.geeksforgeeks.org/go-language/golang-goroutine-vs-thread/))
- 100,000 goroutines consume a few hundred MB of RAM; equivalent OS threads would require ~100 GB
- Context switching happens in user-space (nanoseconds) vs kernel-space for OS threads (microseconds)
- 100,000 goroutines may use only 10-20 OS threads under the hood ([Dev.to - Go Routines vs Threads](https://dev.to/sajosam/go-routines-vs-threads-whats-the-difference-and-when-to-use-them-1g09))
- Thread pooling is unnecessary in Go because goroutine creation is cheap
- Channels provide CSP-style communication without shared mutable state

**Scaling behavior:**
Go performs well at moderate concurrency. However, one benchmark found Go's goroutines did not always outperform Java threads at 175+ virtual users, suggesting that raw scheduling efficiency is only one factor -- garbage collection pressure, memory allocation patterns, and runtime overhead matter too. Source: [Medium - Java vs Golang Performance Testing](https://medium.com/@mohnisha/java-vs-golang-performance-testing-4d0d6a5123fb)

### async/await (Python)

Python's asyncio provides cooperative multitasking via coroutines. The GIL (Global Interpreter Lock) means only one thread executes Python bytecode at a time, making async the primary concurrency mechanism.

**Performance characteristics (Python 3.13+):**

| Mode | CPU-bound task (8 cores) | Source |
|------|-------------------------|--------|
| Single-threaded | 8.71s | [Python 3.14 No-GIL Analysis](https://engineersmeetai.substack.com/p/python-314s-no-gil-explained-and) |
| Multi-threaded (GIL enabled) | 8.66s (no improvement) | Same |
| Multi-threaded (GIL disabled, 3.13+) | 1.39s (6.3x speedup) | Same |
| Multi-processing | 1.45s (6.0x speedup) | Same |

For I/O-bound tasks, asyncio provides excellent concurrency without the GIL limitation, as the GIL is released during I/O waits. The pattern:

```python
# BAD: Sequential I/O -- 10 requests at 100ms each = 1000ms
for url in urls:
    result = await session.get(url)

# GOOD: Concurrent I/O -- 10 requests at 100ms each = ~100ms
results = await asyncio.gather(*[session.get(url) for url in urls])
```

**Python 3.13 free-threading (no-GIL) status:** Available as an experimental build flag. Single-threaded performance incurs a 5-10% overhead compared to the standard GIL build due to more fine-grained locking. Source: [CodSpeed - State of Python 3.13 Free-Threading](https://codspeed.io/blog/state-of-python-3-13-performance-free-threading)

### async/await (Rust with Tokio)

Rust's async model compiles to state machines at zero runtime cost. The Tokio runtime provides a multi-threaded, work-stealing scheduler.

**Performance characteristics:**
- Zero-cost abstractions: async functions compile to state machines, no heap allocation per future
- Tokio's work-stealing scheduler distributes tasks across a thread pool sized to CPU core count
- async-std was discontinued as of March 2025; Tokio is the canonical runtime ([corrode.dev](https://corrode.dev/blog/async/))
- Rust async excels for high-concurrency network services (proxies, API gateways) where predictable latency matters
- Overhead of async vs synchronous code is near-zero for I/O-bound work; for CPU-bound work, synchronous code with `rayon` thread pools is preferred

### Java Virtual Threads (Project Loom, Java 21+)

Virtual threads are lightweight threads managed by the JVM, not the OS. They are mounted onto carrier (platform) threads for execution.

**Performance benchmarks:**
- Virtual threads achieve 3x+ throughput over platform threads for I/O-heavy web services ([Kloia Benchmark](https://www.kloia.com/blog/benchmarking-java-virtual-threads-a-comprehensive-analysis))
- 100,000 blocking tasks: 2.6 seconds (virtual threads) vs 18+ seconds (platform threads) ([Java Code Geeks](https://www.javacodegeeks.com/2024/12/java-virtual-threads-vs-traditional-threads-unlocking-performance-with-project-loom.html))
- One financial services firm saw 400% increase in request handling capacity switching from a 200-thread pool to virtual threads
- MariaDB benchmarks showed 5-9x higher throughput with virtual threads for JDBC calls
- Thread creation: virtual threads are 1.7x faster at 100K threads, 2.7x faster at 1.5M threads compared to platform threads ([Lund University Thesis](https://lup.lub.lu.se/student-papers/record/9166685/file/9166687.pdf))

---

## Thread Pools and Process Pools

### Sizing Formulas

The optimal thread pool size depends on the workload profile. Using the wrong size either wastes resources (too large) or creates bottlenecks (too small).

**CPU-bound tasks:**
```
Optimal threads = Number of CPU cores
```

Adding threads beyond the core count for pure CPU work causes context switching overhead with zero throughput gain. On an 8-core machine, 8 threads processing matrix multiplication will outperform 16 threads due to reduced context switching.

**I/O-bound tasks (Brian Goetz formula from "Java Concurrency in Practice"):**
```
Optimal threads = Number of CPUs * Target CPU Utilization * (1 + Wait Time / Service Time)
```

Also expressed as:
```
Optimal threads = Number of Cores * (1 + Blocking Coefficient)
```

Where Blocking Coefficient = Wait Time / Compute Time.

Source: [Zalando Engineering - Thread Pool Sizing](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html)

**Practical examples:**

| Workload | CPU Cores | Wait Time | Service Time | Ratio | Optimal Pool Size |
|----------|-----------|-----------|--------------|-------|-------------------|
| REST API calling external service | 8 | 100ms | 10ms | 10:1 | 8 * (1 + 10) = 88 |
| Database query execution | 8 | 50ms | 5ms | 10:1 | 8 * (1 + 10) = 88 |
| Image resizing (CPU-bound) | 8 | 0ms | 200ms | 0:1 | 8 * (1 + 0) = 8 |
| File parsing with disk I/O | 8 | 20ms | 20ms | 1:1 | 8 * (1 + 1) = 16 |
| Mixed API + computation | 8 | 80ms | 20ms | 4:1 | 8 * (1 + 4) = 40 |

**Little's Law validation:**
```
L = lambda * W
```
Where L = concurrent requests in system, lambda = arrival rate (req/s), W = average latency. If your API receives 1000 req/s with 100ms average latency, you need L = 1000 * 0.1 = 100 threads to avoid queuing. Source: [David Async - Little's Law](https://davidasync.medium.com/littles-law-tuning-the-thread-pool-size-fedfe4158fb)

### Critical Rule: Never Mix Pool Types

Never mix CPU-bound and I/O-bound tasks in the same thread pool. I/O-bound pools need many threads (50-200+), which would cause excessive context switching for CPU-bound work. Use separate pools:

```
[I/O Pool: 64 threads] --> handles network calls, DB queries
[CPU Pool: 8 threads]  --> handles computation, transformation
[Scheduled Pool: 2-4]  --> handles periodic tasks, timeouts
```

Source: [InfoQ - Thread Pool Performance Tuning](https://www.infoq.com/articles/Java-Thread-Pool-Performance-Tuning/)

### Process Pools

Process pools (Python's `multiprocessing.Pool`, Node.js `cluster`) create separate OS processes. Each process has its own memory space, eliminating shared-state issues but adding IPC overhead.

**When to use process pools over thread pools:**
- Python CPU-bound work (bypasses GIL)
- Isolation requirements (one task crash does not affect others)
- Memory-intensive tasks where GC pauses in one task should not affect others

**Trade-offs:**

| Dimension | Thread Pool | Process Pool |
|-----------|-------------|--------------|
| Memory overhead per worker | ~1 MB (stack) | 10-50 MB (full process) |
| Communication | Shared memory (fast) | IPC/serialization (slow) |
| Isolation | None (shared address space) | Full (separate memory) |
| Creation cost | ~100 microseconds | ~10 milliseconds |
| Best for | I/O-bound, shared-state tasks | CPU-bound, isolated tasks |

---

## Amdahl's Law: The Math of Diminishing Returns

### The Formula

Gene Amdahl (1967) proved that the maximum speedup of a program is limited by its sequential fraction:

```
Speedup(N) = 1 / (S + P/N)
```

Where:
- S = fraction of work that is strictly sequential (0 to 1)
- P = fraction that is parallelizable (P = 1 - S)
- N = number of processors

As N approaches infinity:
```
Maximum Speedup = 1 / S
```

Source: [Wikipedia - Amdahl's Law](https://en.wikipedia.org/wiki/Amdahl's_law)

### Practical Speedup Table

| Sequential Fraction (S) | 2 cores | 4 cores | 8 cores | 16 cores | 64 cores | Max (infinite) |
|--------------------------|---------|---------|---------|----------|----------|----------------|
| 1% | 1.99x | 3.88x | 7.48x | 13.91x | 39.26x | 100x |
| 5% | 1.90x | 3.48x | 5.93x | 9.14x | 15.42x | 20x |
| 10% | 1.82x | 3.08x | 4.71x | 6.40x | 8.77x | 10x |
| 25% | 1.60x | 2.29x | 2.91x | 3.37x | 3.82x | 4x |
| 50% | 1.33x | 1.60x | 1.78x | 1.88x | 1.97x | 2x |

### Key Insight: Diminishing Returns Are Severe

With 10% sequential code on an 8-core machine, you achieve 4.71x speedup -- not 8x. Going from 8 to 16 cores adds only 1.69x more (from 4.71x to 6.40x), and going from 16 to 64 cores adds only 2.37x more. The cost of 4x more hardware yields only 37% more speedup. Source: [Splunk - Amdahl's Law](https://www.splunk.com/en_us/blog/learn/amdahls-law.html)

### Gustafson's Law: The Counter-Argument

Gustafson (1988) argued that as processors increase, problem sizes increase too. Instead of parallelizing a fixed-size problem, real workloads scale:

```
Scaled Speedup(N) = N - S * (N - 1)
```

This means a 10% sequential fraction with 64 cores gives 57.7x speedup (not Amdahl's 8.77x) because the parallel portion grows with the available cores. In practice, both laws apply: Amdahl's for fixed-size latency-sensitive work, Gustafson's for throughput-oriented batch processing.

### Practical Implication: Optimize the Sequential Part First

Before adding cores, reduce the sequential fraction. Converting 10% sequential to 5% sequential on 8 cores improves speedup from 4.71x to 5.93x -- a 26% improvement without adding any hardware.

---

## Lock-Free Data Structures and Atomic Operations

### Why Locks Hurt Performance

A pair of lock/unlock operations on a Windows Critical Section takes ~23.5 nanoseconds. That seems fast, but under contention:

- At 60% lock duration with 4 threads, performance drops dramatically to near single-thread levels ([Preshing - Locks Aren't Slow](https://preshing.com/20111118/locks-arent-slow-lock-contention-is/))
- At 90% lock duration, multiple threads perform worse than a single thread
- Lock contention optimization achieved up to 54% reduction in execution time across 20 benchmarked programs ([Rice University - Analyzing Lock Contention](https://www.cs.rice.edu/~johnmc/papers/hpctoolkit-ppopp-2010.pdf))

### Atomic Operations and CAS

Compare-and-Swap (CAS) is the fundamental primitive for lock-free programming:

```
CAS(memory_location, expected_value, new_value):
    atomically:
        if *memory_location == expected_value:
            *memory_location = new_value
            return true
        else:
            return false
```

CAS allows optimistic concurrency: each thread attempts an update and retries only when another thread modified the value first. This eliminates:
- Deadlocks (no locks to hold)
- Priority inversion (no blocking)
- Convoy effects (no waiting queues)

Source: [IN-COM - Lock-Free Data Structures](https://www.in-com.com/blog/implementing-lock-free-data-structures-in-high-concurrency-systems/)

### Common Lock-Free Structures

| Structure | Use Case | Key Primitive | Typical Speedup vs Locked |
|-----------|----------|---------------|---------------------------|
| Atomic counter | Statistics, reference counting | fetch_add | 2-5x under contention |
| Lock-free queue (Michael-Scott) | Producer-consumer pipelines | CAS on head/tail | 1.5-3x under high contention |
| Lock-free stack (Treiber) | Work stealing, free lists | CAS on top | 2-4x under contention |
| Concurrent hash map | Caches, lookup tables | Per-bucket CAS | 3-10x for read-heavy workloads |
| Epoch-based reclamation | Memory management for lock-free structures | Atomic epoch counter | Enables safe memory reuse |

### Challenges

- **ABA problem:** A CAS may succeed even though the value was changed and changed back. Solved with tagged pointers or hazard pointers.
- **Memory ordering:** CPUs and compilers reorder instructions. Lock-free code requires explicit memory ordering (acquire/release/seq_cst in C++/Rust).
- **Complexity:** Lock-free code is significantly harder to reason about and test. Use established libraries (Java's `java.util.concurrent.atomic`, C++ `<atomic>`, Rust's `crossbeam`) rather than writing custom implementations.

---

## The Actor Model

### Concept

The actor model replaces shared mutable state with isolated actors that communicate exclusively via asynchronous message passing. Each actor:
- Processes one message at a time (no internal concurrency)
- Can create other actors
- Can send messages to other actors
- Maintains private state that is never directly accessed externally

### Implementations and Performance

**Erlang/Elixir (BEAM VM):**
- Processes are extremely lightweight: ~0.3 KB initial memory, creation in ~1 microsecond
- Erlang handles millions of messages per second per node ([peerdh.com - Erlang vs Akka](https://peerdh.com/blogs/programming-insights/performance-benchmarks-of-erlangs-actor-model-versus-akka-in-scala))
- Scheduling: preemptive, reduction-based (each process gets ~4000 reductions before yielding)
- WhatsApp handled 2 million concurrent connections per server using Erlang
- Erlang's latency is consistently low due to efficient scheduling and per-process garbage collection

**Akka (JVM -- Scala/Java):**
- Actor creation: ~300 bytes per actor
- Can run 2.5 million actors per GB of heap memory
- Throughput: millions of messages per second on a single JVM
- Akka spawn time scales unpredictably beyond 10,000-20,000 actors compared to Erlang's linear scaling ([Glasgow University Research](https://www.dcs.gla.ac.uk/~trinder/papers/sac-18.pdf))

**Performance comparison:**

| Metric | Erlang/BEAM | Akka/JVM |
|--------|-------------|----------|
| Process/actor creation | ~1 microsecond | ~10 microseconds |
| Memory per actor | ~0.3 KB | ~0.3 KB |
| Message throughput | Millions/sec | Millions/sec |
| Latency consistency | Excellent (per-process GC) | Variable (stop-the-world GC) |
| Scaling predictability | Linear | Non-linear above 10K actors |
| Fault tolerance | Built-in supervisor trees | Supervisor strategies |

### When to Use the Actor Model

Use actors when you have many independent entities with their own state (game servers, IoT device managers, chat systems, trading engines). Do not use actors when you need tight synchronization between components or shared data structures -- the message-passing overhead (~1-10 microseconds per message) adds up for tightly coupled operations.

---

## Parallel Algorithms

### Map-Reduce

Splits data into chunks, processes each chunk independently (map), then combines results (reduce). Ideal when data partitions are independent.

```
Input Data --> [Chunk 1] --> Map --> [Result 1] --\
           --> [Chunk 2] --> Map --> [Result 2] ----> Reduce --> Final Result
           --> [Chunk 3] --> Map --> [Result 3] --/
           --> [Chunk N] --> Map --> [Result N] --/
```

**Performance characteristics:**
- Linear speedup for embarrassingly parallel problems (each chunk independent)
- Bounded by the slowest mapper (straggler problem) and reduce step
- Optimal chunk size balances parallelism overhead vs work granularity
- Java Streams `parallelStream()` uses ForkJoinPool internally with work-stealing

### Fork-Join

Recursively subdivides a problem until sub-problems are small enough to solve directly, then combines results bottom-up.

```
Problem --> Fork --> [Sub-problem A] --> Fork --> [A1] --> Solve
                                     --> Fork --> [A2] --> Solve
                 --> [Sub-problem B] --> Fork --> [B1] --> Solve
                                     --> Fork --> [B2] --> Solve
         --> Join results bottom-up
```

**Performance characteristics:**
- Java's ForkJoinPool automatically scales threads to available processors
- Practical sequential cutoff thresholds: 500-5000 elements (below this, sequential is faster) ([Kent University - Fork/Join in the Wild](https://kar.kent.ac.uk/63829/1/pppj14-dewael-et-al-forkjoin-parallelism-in-the-wild.pdf))
- Work-stealing: idle threads steal tasks from busy threads' deques
- Overhead per fork: ~1-5 microseconds; only worthwhile when sub-problem computation exceeds this
- Classic applications: merge sort, quicksort, matrix multiplication, tree traversal

### Pipeline Parallelism

Connects stages in a producer-consumer chain. Each stage processes data concurrently with other stages.

```
Stage 1 (Parse) --> Stage 2 (Validate) --> Stage 3 (Transform) --> Stage 4 (Write)
   |                    |                      |                      |
   v                    v                      v                      v
 Item N              Item N-1              Item N-2               Item N-3
```

**Performance characteristics:**
- Throughput determined by the slowest stage (bottleneck)
- Latency = sum of all stage times for a single item
- All stages active simultaneously once the pipeline is full
- Ideal when stages have roughly equal processing times
- Each stage can maintain state that is updated as data flows through
- Buffering between stages absorbs rate variations (bounded buffers prevent memory blowup)

Source: [JMU Computer Systems Fundamentals](https://w3.cs.jmu.edu/kirkpams/OpenCSF/Books/csf/html/ParallelDesign.html)

---

## Common Bottlenecks

### 1. Lock Contention

When multiple threads frequently compete for the same lock, throughput degrades to worse-than-single-threaded performance.

**Measured impact:**
- 4 threads with 60% lock duration: throughput collapses to single-thread levels
- Proper lock tuning achieves up to 37.58% performance improvement on x86 CPUs, 32.82% on ARM ([Springer - Lock Tuning](https://link.springer.com/chapter/10.1007/978-3-031-71177-0_20))
- With very small tasks (<1ms), adding a second thread decreases overall throughput compared to single-thread execution ([DZone - Lock Benchmark](https://dzone.com/articles/performance-benchmark-of-explicit-locks-part-1))

**Mitigation strategies:**
- Reduce critical section scope (hold locks for the minimum time)
- Use read-write locks when reads vastly outnumber writes
- Partition data to reduce contention (striped locks, ConcurrentHashMap segments)
- Consider lock-free structures for hot paths

### 2. False Sharing

When threads modify different variables that happen to reside on the same CPU cache line (typically 64 bytes, 128 bytes on Apple M-series), the hardware cache coherency protocol forces constant invalidation.

**Measured impact:**
- Zen4 system (16 cores, 32 threads): false sharing causes 300x slowdown with 32 concurrent threads ([alic.dev - Measuring False Sharing](https://alic.dev/blog/false-sharing))
- 8-core benchmark with 100M increments: false sharing took ~2,500ms vs ~120ms with padding -- a 20x difference ([CoffeeBeforeArch](https://coffeebeforearch.github.io/2019/12/28/false-sharing-tutorial.html))
- Java benchmark: 51.6 ns/op with false sharing vs 28.4 ns/op with @Contended padding -- 82% overhead ([Baeldung - False Sharing](https://www.baeldung.com/java-false-sharing-contended))

**Fix:** Pad shared variables to separate cache lines:
```java
// BAD: x and y likely share a cache line
long x;  // Thread A writes
long y;  // Thread B writes

// GOOD: @Contended ensures separate cache lines (Java)
@jdk.internal.vm.annotation.Contended
long x;
@jdk.internal.vm.annotation.Contended
long y;
```

### 3. Python's GIL (Global Interpreter Lock)

The GIL ensures only one thread executes Python bytecode at any time, making multi-threaded CPU-bound code effectively single-threaded.

**Measured impact (Python 3.13 benchmarks):**

| Configuration | CPU-bound time | Relative |
|---------------|---------------|----------|
| Single-threaded | 8.71s | 1.0x |
| Multi-threaded (GIL enabled) | 8.66s | 1.0x (no improvement) |
| Multi-threaded (GIL disabled) | 1.39s | 6.3x speedup |
| Multi-processing | 1.45s | 6.0x speedup |

Source: [Substack - Python 3.14 No-GIL Analysis](https://engineersmeetai.substack.com/p/python-314s-no-gil-explained-and)

**Workarounds:**
- Use `multiprocessing` for CPU-bound parallelism (separate processes, separate GILs)
- Use `asyncio` for I/O-bound concurrency (GIL is released during I/O waits)
- Use C extensions (NumPy, Pandas) that release the GIL during computation
- Use Python 3.13+ free-threading build (experimental, 5-10% single-thread overhead)

### 4. Thread Pool Exhaustion

When all threads in a pool are blocked (waiting for I/O, locks, or downstream services), new requests queue indefinitely.

**Measured impact:**
- 1,000 concurrent requests with thread-per-request: ~1 GB RAM consumed by thread stacks alone ([Medium - Thread Pool Exhaustion Case Study](https://medium.com/@mekadinesh999/thread-pool-exhaustion-a-case-study-on-unintended-consequences-of-a-new-approach-77392616d8dc))
- .NET ThreadPool starvation causes cascading latency: p99 latency can spike from 50ms to 10+ seconds ([Microsoft - Debug ThreadPool Starvation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation))
- The sync-over-async pattern is the most common cause of ThreadPool starvation

**Mitigation:**
- Use async I/O to decouple threads from I/O operations (10-100x higher concurrency with same resources)
- Implement bounded queues with backpressure
- Use circuit breakers to fail fast when downstream services are slow
- Monitor queue depth and active thread count as leading indicators

---

## Anti-Patterns

### 1. Shared Mutable State Without Synchronization

The most dangerous anti-pattern. Multiple threads reading and writing the same data structure without locks or atomic operations leads to data corruption, not just incorrect values.

**Consequence:** Silent data corruption that may only manifest under production load. A HashMap corrupted by concurrent writes in Java can enter an infinite loop, consuming 100% CPU on one core indefinitely.

**Fix:** Use concurrent data structures (ConcurrentHashMap), immutable data, or message-passing. Prefer designs where shared state is eliminated entirely.

### 2. Creating Threads Per Request

Spawning a new OS thread for each incoming request is unsustainable past ~1,000 concurrent requests.

**Cost per thread:**
- Memory: ~1 MB stack space per thread
- Creation: ~100 microseconds on Linux
- 10,000 threads = 10 GB RAM for stacks alone + massive context switching overhead

Source: [LeanSentry - IIS Thread Pool Guide](https://www.leansentry.com/guide/iis-aspnet-hangs/iis-thread-pool)

**Fix:** Use thread pools with bounded sizes, or virtual threads (Java 21+), or async I/O (Node.js, Python asyncio, Rust Tokio).

### 3. Not Limiting Concurrency (Unbounded Parallelism)

Launching thousands of concurrent operations without limits overwhelms downstream systems, exhausts file descriptors, and triggers OOM kills.

```python
# BAD: 10,000 simultaneous HTTP requests -- will exhaust connections/FDs
tasks = [fetch(url) for url in ten_thousand_urls]
await asyncio.gather(*tasks)

# GOOD: Bounded concurrency with semaphore
semaphore = asyncio.Semaphore(50)  # Max 50 concurrent requests
async def bounded_fetch(url):
    async with semaphore:
        return await fetch(url)
tasks = [bounded_fetch(url) for url in ten_thousand_urls]
await asyncio.gather(*tasks)
```

### 4. Sync-Over-Async

Blocking on an async operation inside a thread pool thread. This consumes a pool thread for the entire duration of the I/O wait, converting an async benefit into a thread pool exhaustion problem.

```csharp
// BAD: Blocks the thread pool thread
var result = GetDataAsync().Result;  // .Result blocks synchronously

// GOOD: Propagate async all the way up
var result = await GetDataAsync();
```

### 5. Premature Parallelization

Adding parallelism to code where the sequential version is fast enough, or where the overhead exceeds the benefit.

**Rule of thumb:** Parallelism overhead (thread creation, synchronization, data partitioning) is typically 10-100 microseconds. If the total work is less than 1 millisecond, parallelism will slow it down. Fork-join cutoff thresholds of 500-5000 elements exist for this reason.

---

## Race Conditions, Deadlocks, and Debugging

### Race Conditions

A race condition occurs when the correctness of a program depends on the relative timing of thread execution. They are non-deterministic: code may pass 999 tests and fail on the 1,000th.

**Classic example -- check-then-act:**
```
Thread A                    Thread B
--------                    --------
if (balance >= 100):
                            if (balance >= 100):
  balance -= 100              balance -= 100  // Double withdrawal!
```

**Detection tools:**
- ThreadSanitizer (C/C++, Go): compile-time instrumentation, detects data races at runtime
- Java: `-XX:+UseThreadSanitizer` (JDK 22+), jcstress for concurrency stress tests
- Go: `go run -race` flag (10-20x slowdown but catches races)
- Python: limited tooling; use `asyncio` debug mode for coroutine issues

### Deadlocks

Four conditions must all hold for deadlock (Coffman conditions):
1. **Mutual exclusion:** Resources cannot be shared
2. **Hold and wait:** Process holds resources while waiting for others
3. **No preemption:** Resources cannot be forcibly taken
4. **Circular wait:** Circular chain of processes waiting for each other

**Prevention strategies and their performance cost:**

| Strategy | Approach | Performance Impact |
|----------|----------|-------------------|
| Lock ordering | Always acquire locks in consistent global order | Near-zero overhead |
| Lock timeout | Fail acquisition after timeout | Minimal overhead; risk of false failures |
| Try-lock | Non-blocking attempt, back off on failure | Retry overhead under contention |
| Lock-free design | Eliminate locks entirely | Higher development cost; potential CAS retry overhead |
| Resource hierarchy | Number resources, acquire in order | Requires global knowledge of all resources |

Source: [Tech Champion - Threading Without Tears](https://tech-champion.com/programming/threading-without-tears-mastering-deadlocks-data-races-and-safe-locking-patterns/)

### Performance Debugging Toolkit

| Tool | Language/Platform | What It Detects |
|------|-------------------|-----------------|
| `perf` + flamegraphs | Linux (any language) | Lock contention, off-CPU time, syscall overhead |
| `async-profiler` | JVM | Lock contention, thread states, allocation hotspots |
| ThreadSanitizer | C/C++, Go, JVM | Data races, lock order violations |
| `py-spy` | Python | GIL contention, thread states |
| Tokio Console | Rust (Tokio) | Task scheduling, poll times, resource contention |
| eBPF-based tools | Linux kernel | Lock hold times, contention points system-wide |
| `go tool trace` | Go | Goroutine scheduling, blocking, GC pauses |

---

## Before/After: Sequential vs Parallel Speedups

### Example 1: HTTP API Aggregation (I/O-Bound)

**Scenario:** Fetch data from 10 microservices, each averaging 100ms response time.

```
BEFORE (Sequential):
  Service 1 [100ms] -> Service 2 [100ms] -> ... -> Service 10 [100ms]
  Total: 1,000ms

AFTER (Concurrent with async/await):
  Service 1  [100ms]
  Service 2  [100ms]    All in parallel
  ...        [100ms]
  Service 10 [100ms]
  Total: ~105ms (100ms + overhead)

  Speedup: 9.5x
```

### Example 2: Image Processing Pipeline (CPU-Bound)

**Scenario:** Resize 1,000 images, each taking 50ms of CPU time. 8-core machine.

```
BEFORE (Single-threaded):
  1,000 images * 50ms = 50,000ms (50 seconds)

AFTER (Thread pool, 8 workers):
  1,000 images / 8 cores * 50ms = 6,250ms + scheduling overhead
  Total: ~6,500ms (6.5 seconds)

  Speedup: 7.7x (vs theoretical 8x -- 96% efficiency)
```

### Example 3: Database Batch Processing (Mixed)

**Scenario:** Process 100,000 records: 2ms read (I/O) + 5ms transform (CPU) + 3ms write (I/O) per record.

```
BEFORE (Sequential):
  100,000 * (2 + 5 + 3)ms = 1,000,000ms (16.7 minutes)

AFTER (Pipeline parallelism, 3 stages, 8 CPU workers for transform):
  Stage 1 (Read):      200s / 50 concurrent reads     = ~4s
  Stage 2 (Transform): 500s / 8 CPU cores              = ~62.5s
  Stage 3 (Write):     300s / 50 concurrent writes     = ~6s
  Pipeline total: ~63s (bottleneck = transform stage)

  Speedup: 15.9x
```

### Example 4: Python CPU-Bound with GIL Workaround

**Scenario:** Monte Carlo simulation, 100M iterations.

```
BEFORE (Single-threaded Python):
  Time: 45 seconds

AFTER (multiprocessing.Pool, 8 workers):
  Time: 6.2 seconds
  Speedup: 7.3x

AFTER (NumPy vectorized, single-threaded):
  Time: 0.8 seconds
  Speedup: 56x (vectorization often beats parallelism)

NOTE: Multi-threaded Python with GIL: 47 seconds (SLOWER than single-threaded
      due to GIL contention overhead)
```

### Example 5: Java Virtual Threads vs Platform Threads

**Scenario:** Web server handling 10,000 concurrent requests, each making a 50ms database call.

```
BEFORE (Platform threads, pool size 200):
  200 threads active, 9,800 requests queued
  Queue wait: ~2,450ms average
  Total p95: ~2,550ms

AFTER (Virtual threads, unbounded):
  10,000 virtual threads active simultaneously
  No queuing delay
  Total p95: ~55ms

  Speedup: 46x reduction in p95 latency
```

---

## Decision Tree: Threads, Async, or Processes?

Use this flowchart to select the right concurrency model for your workload:

```
START: What is your workload type?
  |
  |---> CPU-BOUND (computation, encoding, simulation)?
  |       |
  |       |---> Language has GIL (Python)?
  |       |       |
  |       |       |---> YES: Use multiprocessing.Pool (processes)
  |       |       |         or NumPy/C extensions that release GIL
  |       |       |         Pool size = CPU core count
  |       |       |
  |       |       |---> NO: Use thread pool
  |       |                 Pool size = CPU core count
  |       |                 (Java: ForkJoinPool, Go: goroutines,
  |       |                  Rust: rayon, C++: std::thread)
  |       |
  |       |---> Is work decomposable into independent chunks?
  |               |---> YES: Map-reduce or fork-join pattern
  |               |---> NO:  Pipeline parallelism (if stages are independent)
  |
  |---> I/O-BOUND (network, disk, database)?
  |       |
  |       |---> High concurrency needed (>1000 simultaneous operations)?
  |       |       |
  |       |       |---> YES: Use async/await
  |       |       |         Node.js: native event loop
  |       |       |         Python: asyncio
  |       |       |         Rust: Tokio
  |       |       |         Java 21+: virtual threads
  |       |       |         Go: goroutines + channels
  |       |       |
  |       |       |---> NO (<1000): Thread pool is simpler
  |       |                Pool size = cores * (1 + wait/service ratio)
  |       |
  |       |---> Need backpressure / rate limiting?
  |               |---> YES: Bounded async with semaphore/channel
  |               |---> NO:  Unbounded async (with monitoring)
  |
  |---> MIXED (I/O + CPU in same request)?
  |       |
  |       |---> Use SEPARATE pools:
  |             - Async/event loop for I/O orchestration
  |             - Dedicated CPU thread pool for computation
  |             - Never block the I/O pool with CPU work
  |             - Never saturate the CPU pool with I/O waits
  |
  |---> NEED ISOLATION (crash safety, security boundaries)?
          |
          |---> Use processes (multiprocessing, child_process, containers)
                Higher overhead but full isolation
```

### Quick Reference by Language

| Language | I/O Concurrency | CPU Parallelism | Recommended Default |
|----------|-----------------|-----------------|---------------------|
| JavaScript/Node.js | Event loop (native) | Worker threads / cluster | async/await + cluster for scaling |
| Python | asyncio | multiprocessing / C extensions | asyncio for I/O, multiprocessing for CPU |
| Go | Goroutines + channels | Goroutines (GOMAXPROCS) | Goroutines for everything |
| Rust | Tokio async | rayon thread pool | Tokio for I/O, rayon for CPU |
| Java 21+ | Virtual threads | ForkJoinPool / parallel streams | Virtual threads for I/O, ForkJoinPool for CPU |
| C# | async/await (Task) | Parallel.For / PLINQ | async for I/O, Parallel for CPU |
| Erlang/Elixir | BEAM processes | BEAM schedulers | Processes (actor model) for everything |

---

## Sources

- [Uplatz - Comparative Analysis of Modern Concurrency Models](https://uplatz.com/blog/a-comparative-analysis-of-modern-concurrency-models-architecture-performance-and-application/)
- [Dev.to - Node.js vs Python Real Benchmarks](https://dev.to/m-a-h-b-u-b/nodejs-vs-python-real-benchmarks-performance-insights-and-scalability-analysis-4dm5)
- [Ajani Bilby - Async JS Performance](https://www.ajanibilby.com/blog/async-js-performance-apr23/)
- [V8 Blog - Faster Async Functions and Promises](https://v8.dev/blog/fast-async)
- [Medium - Hidden Cost of async/await in Loops](https://medium.com/@ruslan.alekseyev/the-hidden-cost-of-async-await-in-loops-a-real-world-scenario-of-surging-cpu-usage-in-node-js-095df92c805a)
- [Zalando Engineering - How to Set an Ideal Thread Pool Size](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html)
- [OneUptime - How to Tune Thread Pools for Performance](https://oneuptime.com/blog/post/2026-01-25-tune-thread-pools-performance/view)
- [InfoQ - Java Thread Pool Performance Tuning](https://www.infoq.com/articles/Java-Thread-Pool-Performance-Tuning/)
- [David Async - Little's Law and Thread Pool Sizing](https://davidasync.medium.com/littles-law-tuning-the-thread-pool-size-fedfe4158fb)
- [Dev.to - Go Routines vs Threads](https://dev.to/sajosam/go-routines-vs-threads-whats-the-difference-and-when-to-use-them-1g09)
- [GeeksforGeeks - Golang Goroutine vs Thread](https://www.geeksforgeeks.org/go-language/golang-goroutine-vs-thread/)
- [Medium - Java vs Golang Performance Testing](https://medium.com/@mohnisha/java-vs-golang-performance-testing-4d0d6a5123fb)
- [Wikipedia - Amdahl's Law](https://en.wikipedia.org/wiki/Amdahl's_law)
- [Splunk - Amdahl's Law](https://www.splunk.com/en_us/blog/learn/amdahls-law.html)
- [Cornell Virtual Workshop - Amdahl's Law](https://cvw.cac.cornell.edu/parallel/efficiency/amdahls-law)
- [Preshing - Locks Aren't Slow; Lock Contention Is](https://preshing.com/20111118/locks-arent-slow-lock-contention-is/)
- [IN-COM - Implementing Lock-Free Data Structures](https://www.in-com.com/blog/implementing-lock-free-data-structures-in-high-concurrency-systems/)
- [Tech Champion - Threading Without Tears](https://tech-champion.com/programming/threading-without-tears-mastering-deadlocks-data-races-and-safe-locking-patterns/)
- [peerdh.com - Erlang Actor Model vs Akka Benchmarks](https://peerdh.com/blogs/programming-insights/performance-benchmarks-of-erlangs-actor-model-versus-akka-in-scala)
- [Glasgow University - Erlang, Go, and Scala with Akka](https://www.dcs.gla.ac.uk/~trinder/papers/sac-18.pdf)
- [alic.dev - Measuring the Impact of False Sharing](https://alic.dev/blog/false-sharing)
- [Baeldung - False Sharing and @Contended](https://www.baeldung.com/java-false-sharing-contended)
- [CoffeeBeforeArch - False Sharing Tutorial](https://coffeebeforearch.github.io/2019/12/28/false-sharing-tutorial.html)
- [Substack - Python 3.14 No-GIL Explained and Performance Analysis](https://engineersmeetai.substack.com/p/python-314s-no-gil-explained-and)
- [CodSpeed - State of Python 3.13 Performance Free-Threading](https://codspeed.io/blog/state-of-python-3-13-performance-free-threading)
- [Kloia - Benchmarking Java Virtual Threads](https://www.kloia.com/blog/benchmarking-java-virtual-threads-a-comprehensive-analysis)
- [Java Code Geeks - Virtual Threads vs Traditional Threads](https://www.javacodegeeks.com/2024/12/java-virtual-threads-vs-traditional-threads-unlocking-performance-with-project-loom.html)
- [Lund University - Comparison of Concurrency Technologies in Java](https://lup.lub.lu.se/student-papers/record/9166685/file/9166687.pdf)
- [Medium - 10x Faster Node.js with Worker Threads](https://medium.com/codex/achieve-the-best-performance-10x-faster-node-js-with-worker-threads-97fc2890e40f)
- [Microsoft - Debug ThreadPool Starvation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation)
- [Medium - Thread Pool Exhaustion Case Study](https://medium.com/@mekadinesh999/thread-pool-exhaustion-a-case-study-on-unintended-consequences-of-a-new-approach-77392616d8dc)
- [Rice University - Analyzing Lock Contention](https://www.cs.rice.edu/~johnmc/papers/hpctoolkit-ppopp-2010.pdf)
- [Springer - Lock Tuning for High-Concurrency Systems](https://link.springer.com/chapter/10.1007/978-3-031-71177-0_20)
- [DZone - Performance Benchmark of Explicit Locks](https://dzone.com/articles/performance-benchmark-of-explicit-locks-part-1)
- [Kent University - Fork/Join Parallelism in the Wild](https://kar.kent.ac.uk/63829/1/pppj14-dewael-et-al-forkjoin-parallelism-in-the-wild.pdf)
- [JMU - Parallel Design Patterns](https://w3.cs.jmu.edu/kirkpams/OpenCSF/Books/csf/html/ParallelDesign.html)
- [corrode.dev - The State of Async Rust](https://corrode.dev/blog/async/)
- [LeanSentry - IIS Thread Pool Expert Guide](https://www.leansentry.com/guide/iis-aspnet-hangs/iis-thread-pool)
- [Tokio Blog - Making the Scheduler 10x Faster](https://tokio.rs/blog/2019-10-scheduler)
