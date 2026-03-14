# Async & Concurrency Anti-Patterns

**Module:** Code Anti-Patterns / Async & Concurrency
**Severity range:** Medium to Critical
**Applies to:** JavaScript/TypeScript, Python, C#, Go, Java, Rust
**Prerequisites:** Basic understanding of async/await, promises/futures, threads, event loops

Concurrency bugs hide behind microsecond timing windows, pass single-threaded test suites, and
detonate under production load. Node.js v15 changed to crash-on-unhandled-rejection after years
of silently swallowed errors. CVE-2024-30088 showed a single TOCTOU race in the Windows kernel
enabled full privilege escalation. This module catalogs 18 async and concurrency anti-patterns
with detection heuristics, real incident data, and concrete fixes.

---

## Anti-Pattern Catalog

### AP-01: Callback Hell

**Also known as:** Pyramid of Doom, Hadouken Code
**Frequency:** Common (legacy) | **Severity:** Medium | **Detection difficulty:** Easy

**What it looks like:**
```javascript
getUser(id, function(err, user) {
    getOrders(user.id, function(err, orders) {
        getDetails(orders[0].id, function(err, details) {
            getShipping(details.trackingId, function(err, status) {
                render(user, orders, details, status);
            });
        });
    });
});
```

**Why developers do it:** Only pattern available in pre-Promise Node.js. Each requirement adds a nesting level.

**What goes wrong:** Error handling duplicated at every level. Missing one `if (err)` silently drops errors. Variable scoping spans closures -- renaming in an outer callback silently breaks inner ones. The callbackhell.com project documented this as the most complained-about pattern in early Node.js.

**The fix:**
```javascript
// After: flat async/await
async function loadDashboard(id) {
    const user = await getUser(id);
    const orders = await getOrders(user.id);
    const details = await getDetails(orders[0].id);
    const status = await getShipping(details.trackingId);
    render(user, orders, details, status);
}
```

**Detection rule:** ESLint `max-nested-callbacks` set to 3.

---

### AP-02: Fire and Forget

**Also known as:** Detached Promise, Unawaited Async, Orphan Task
**Frequency:** Very Common | **Severity:** High | **Detection difficulty:** Medium

**What it looks like:**
```javascript
app.post("/api/orders", (req, res) => {
    sendConfirmationEmail(order);  // Promise never awaited
    updateAnalytics(order);        // Promise never awaited
    res.json({ success: true });
});
```

**Why developers do it:** Fast response times -- "the email can send in the background." Works in dev because the process lives long enough.

**What goes wrong:** Exceptions are swallowed (pre-Node 15) or crash the process (Node 15+). During deployments, in-flight tasks die mid-execution. ASP.NET Core disposes scoped services (DbContext) when requests complete, so fire-and-forget tasks throw `ObjectDisposedException`. Microsoft's `IHostedService` docs explicitly warn against this.

**The fix:**
```javascript
// Before                                    // After
sendConfirmationEmail(order);                await queue.enqueue("email", { orderId: order.id });
```

**Detection rule:** ESLint `@typescript-eslint/no-floating-promises`. C#: `CA2012`.

---

### AP-03: Sequential Awaits in Loops

**Also known as:** Async Waterfall, One-at-a-Time Trap
**Frequency:** Very Common | **Severity:** Medium | **Detection difficulty:** Medium

**What it looks like:**
```javascript
for (const id of userIds) {
    const user = await fetchUser(id);  // each waits for previous
    users.push(user);
}
```

**Why developers do it:** `async/await` makes async code look synchronous -- its strength and its trap. A `for` loop with `await` reads naturally.

**What goes wrong:** 50 users at 200ms each = 10 seconds instead of ~200ms parallel. One case had a dashboard calling 30 microservices sequentially, producing 15-second page loads discovered only at full rollout.

**The fix:**
```javascript
// Before: 10 seconds                       // After: ~200ms
for (const id of ids) {                     const users = await Promise.all(
    users.push(await fetchUser(id));            ids.map(id => fetchUser(id))
}                                           );
```

**Detection rule:** ESLint `no-await-in-loop`.

---

### AP-04: Race Conditions

**Also known as:** Data Race, Check-Then-Act, Read-Modify-Write
**Frequency:** Common | **Severity:** Critical | **Detection difficulty:** Hard

**What it looks like:**
```python
async def purchase(item_id, user_id):
    item = await db.get(item_id)
    if item.quantity > 0:         # two requests both read quantity=1
        item.quantity -= 1        # both decrement to 0
        await db.save(item)       # oversold, quantity should be -1
```

**Why developers do it:** Single-threaded mental model. Works with one user in dev.

**What goes wrong:** Cloudflare's June 2024 outage: a race in their rate limiter let requests enter an infinite loop, causing 114 minutes of degraded service. AWS October 2025: a race in DNS management for DynamoDB caused a major disruption. Financial systems get double-charges, oversold inventory, and balances requiring manual reconciliation.

**The fix:**
```python
# Before: read-modify-write race             # After: atomic operation
item = await db.get(item_id)                  result = await db.update_one(
if item.quantity > 0:                             {"_id": item_id, "quantity": {"$gt": 0}},
    item.quantity -= 1                            {"$inc": {"quantity": -1}},
    await db.save(item)                       )
```

**Detection rule:** Go: `-race` flag. Flag any read-then-write on shared state without lock/atomic.

---

### AP-05: Deadlocks

**Also known as:** Deadly Embrace, Circular Wait, Lock Ordering Violation
**Frequency:** Uncommon | **Severity:** Critical | **Detection difficulty:** Hard

**What it looks like:**
```python
# Thread A                          # Thread B
lock_accounts.acquire()             lock_ledger.acquire()
lock_ledger.acquire()   # BLOCKED   lock_accounts.acquire()   # BLOCKED
```

**Why developers do it:** Locks added to fix races without a global lock ordering policy. Each module acquires locks in locally logical order.

**What goes wrong:** A PostgreSQL production incident: product deletion acquired EXCLUSIVE lock before DELETE while concurrent INSERTs needed the same lock in reverse order, crashing checkout. Another: a job scheduler and maintenance script shared advisory lock IDs, blocking each other indefinitely. System appeared "hung" -- zero CPU, no crash, no error, silence.

**The fix:**
```python
# Before: arbitrary ordering                 # After: consistent ordering by ID
def transfer(a, b, amount):                  def transfer(a, b, amount):
    a.lock.acquire()                             first, second = sorted([a, b], key=lambda x: x.id)
    b.lock.acquire()                             with first.lock, second.lock:
                                                     a.balance -= amount; b.balance += amount
```

**Detection rule:** PostgreSQL: `log_lock_waits = on`. Java: `jstack` thread dump. Flag nested lock acquisitions.

---

### AP-06: Promise Constructor Anti-Pattern

**Also known as:** Deferred Anti-Pattern, Unnecessary Promise Wrapping
**Frequency:** Common | **Severity:** Low-Medium | **Detection difficulty:** Easy

**What it looks like:**
```javascript
function getUser(id) {
    return new Promise((resolve, reject) => {
        fetchFromDb(id).then(resolve).catch(reject);  // pointless wrapping
    });
}
```

**Why developers do it:** Misunderstanding that `.then()` already returns a Promise. Overapplying callback-to-promise conversion patterns.

**What goes wrong:** The wrapper obscures errors. In the `async` executor variant (`new Promise(async (resolve, reject) => {})`), throwing does not reject -- it throws synchronously, bypassing Promise error handling. `reject()` does not stop execution, so code after it runs, potentially calling `resolve()`.

**The fix:**
```javascript
// Before                                    // After
return new Promise((resolve, reject) => {    return fetchFromDb(id);
    fetchFromDb(id).then(resolve).catch(reject);
});
```

**Detection rule:** ESLint `no-async-promise-executor`. Flag `new Promise` wrapping a single `.then/.catch` chain.

---

### AP-07: Missing Error Handling on Promises

**Also known as:** Floating Promise, Unhandled Rejection, Silent Failure
**Frequency:** Very Common | **Severity:** Critical | **Detection difficulty:** Medium

**What it looks like:**
```javascript
fetch("/api/users").then(r => r.json()).then(renderUsers);  // no .catch()
```

**Why developers do it:** Happy-path development. Plans to "add error handling later."

**What goes wrong:** Node.js 15+ crashes the process on unhandled rejections. Before that, operations silently failed. A DZone analysis documented a production API "randomly" crashing with no logs -- root cause was a missing `.catch()` on a database query in middleware. The unhandled rejection killed the process with no stack trace pointing to the failure.

**The fix:**
```javascript
fetch("/api/users")
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(renderUsers)
    .catch(err => { logger.error("User load failed", err); renderError(); });
```

**Detection rule:** ESLint `@typescript-eslint/no-floating-promises`. Node.js: `--unhandled-rejections=throw` in CI.

---

### AP-08: Mixing Callbacks and Promises

**Also known as:** Async Frankenstein, Dual-Mode API
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Medium

**What it looks like:**
```javascript
function getUser(id, callback) {
    fetchFromCache(id).then(cached => {
        if (cached) { callback(null, cached); return; }
        return fetchFromDb(id);
    }).then(user => {
        callback(null, user);    // called TWICE if cache hit
    }).catch(err => callback(err));
}
```

**Why developers do it:** Gradual migration from callbacks to promises. Library authors supporting both styles.

**What goes wrong:** Callback invoked multiple times. Error handling splits across two mechanisms. In Express, calling `next()` from both a callback and `.catch()` sends the response twice -- "headers already sent" crash.

**The fix:**
```javascript
// Pure async; wrap at boundary only
async function getUser(id) {
    const cached = await fetchFromCache(id);
    return cached || await fetchFromDb(id);
}
function getUserCb(id, cb) { getUser(id).then(u => cb(null, u), cb); }  // single adapter
```

**Detection rule:** `eslint-plugin-promise`: `no-callback-in-promise`, `no-promise-in-callback`.

---

### AP-09: Async Void

**Also known as:** Async Fire-and-Crash, Unobserved Task
**Frequency:** Common (C#, Dart) | **Severity:** Critical | **Detection difficulty:** Easy

**What it looks like:**
```csharp
public async void LogActivity(string msg) {
    await store.WriteAsync(msg);  // if this throws, process crashes
}
```

**Why developers do it:** Event handler delegates require `void`. Developers apply the pattern to non-event-handler methods by habit.

**What goes wrong:** A production ASP.NET Core app (documented by Josh the Coder, 2023) crashed periodically. An anonymous `async void` lambda inside a controller threw, bypassing all middleware and killing `w3wp.exe`. The `async void` was buried in a LINQ `.ForEach()` -- invisible in code review. GitHub issue dotnet/aspnetcore#13867 confirmed this as known process-crashing behavior.

**The fix:**
```csharp
// Before: async void (crasher)              // After: async Task (catchable)
public async void Log(string m) { ... }      public async Task LogAsync(string m) { ... }
```

**Detection rule:** C# Roslyn analyzer `VSTHRD100`. Dart: `avoid_void_async` lint rule.

---

### AP-10: Thread-Unsafe Singletons

**Also known as:** Lazy Init Race, Double-Checked Locking Bug
**Frequency:** Common | **Severity:** High | **Detection difficulty:** Hard

**What it looks like:**
```java
private static ConnectionPool instance;
public static ConnectionPool getInstance() {
    if (instance == null) instance = new ConnectionPool();  // two threads, two pools
    return instance;
}
```

**Why developers do it:** Lazy init avoids startup cost. Check-then-create is correct single-threaded.

**What goes wrong:** Two threads create separate instances; one gets GC'd while threads hold stale references. Connection pools leak connections. Config singletons diverge. Swift 6 now emits compiler warnings for non-Sendable shared static properties.

**The fix:**
```java
// After: holder pattern (JVM guarantees thread-safe class loading)
private static class Holder { static final ConnectionPool INSTANCE = new ConnectionPool(); }
public static ConnectionPool getInstance() { return Holder.INSTANCE; }
```

**Detection rule:** SpotBugs `LI_LAZY_INIT_STATIC`. PMD `SingletonClassReturningNewInstance`.

---

### AP-11: Busy Waiting

**Also known as:** Spin Loop, Poll Loop, CPU Burner
**Frequency:** Common | **Severity:** Medium-High | **Detection difficulty:** Easy

**What it looks like:**
```python
while not os.path.exists(path):
    pass  # 100% CPU on one core, doing nothing useful
```

**Why developers do it:** Simplest "wait for something" implementation. Works in dev where the wait is milliseconds.

**What goes wrong:** Burns a full CPU core. In containers with CPU limits, steals budget from real work. Causes priority inversion: low-priority thread spinning prevents higher-priority threads from releasing the lock it's waiting on.

**The fix:**
```python
# After: exponential backoff
async def wait_for_file(path, timeout=30.0):
    deadline, interval = time.monotonic() + timeout, 0.1
    while not os.path.exists(path):
        if time.monotonic() > deadline: raise TimeoutError(f"{path} not ready")
        await asyncio.sleep(interval)
        interval = min(interval * 2, 5.0)
```

**Detection rule:** Flag `while` loops without `sleep`/`await`/`yield`/blocking calls in the body.

---

### AP-12: Over-Synchronization

**Also known as:** Lock Contention, Giant Lock, Synchronized Everything
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Medium

**What it looks like:**
```java
public synchronized User getUser(String id) { return cache.get(id); }
public synchronized List<User> search(String q) { /* blocks while getUser runs */ }
public synchronized void clearCache() { /* blocks everything */ }
```

**Why developers do it:** After a race condition, `synchronized` on every method is the "safe" fix.

**What goes wrong:** Application becomes effectively single-threaded. Under load, threads queue on the lock: latency spikes, throughput collapses. Profiling shows low CPU but high response times. 64-core servers perform worse than single-core from lock contention overhead.

**The fix:**
```java
// After: ConcurrentHashMap handles per-segment locking
private final ConcurrentHashMap<String, User> cache = new ConcurrentHashMap<>();
public User getUser(String id) { return cache.computeIfAbsent(id, this::fetch); }
```

**Detection rule:** PMD `AvoidSynchronizedAtMethodLevel`. Flag classes where >50% methods are `synchronized`.

---

### AP-13: TOCTOU (Time-of-Check to Time-of-Use)

**Also known as:** Check-Then-Act, Symlink Race
**Frequency:** Common | **Severity:** Critical | **Detection difficulty:** Hard

**What it looks like:**
```python
if os.access(filepath, os.W_OK):       # CHECK
    with open(filepath, "w") as f:     # USE -- attacker swapped symlink between lines
        f.write(data)
```

**Why developers do it:** Check-then-act is how humans reason sequentially. Security checks feel like they should precede the action.

**What goes wrong:** CVE-2024-30088: TOCTOU in Windows kernel allowed privilege escalation to SYSTEM. CVE-2018-15664: Docker symlink race yielded root access on host from within container. 2023 Pwn2Own: team compromised Tesla Model 3 gateway via TOCTOU. CWE-367 lists 400+ CVEs -- one of the most exploited vulnerability classes.

**The fix:**
```python
# After: atomic write-then-rename
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(filepath))
os.write(fd, data); os.fsync(fd); os.close(fd)
os.rename(tmp, filepath)  # atomic on same filesystem
```

**Detection rule:** Semgrep/CodeQL TOCTOU rules. Flag `os.access()` or `os.path.exists()` followed by `open()`.

---

### AP-14: Thundering Herd

**Also known as:** Cache Stampede, Dog-Pile Effect
**Frequency:** Common (at scale) | **Severity:** High | **Detection difficulty:** Medium

**What it looks like:**
```python
async def get_catalog():
    cached = await redis.get("catalog")
    if cached: return json.loads(cached)
    catalog = await db.query("SELECT * FROM products")  # every request hits DB
    await redis.set("catalog", json.dumps(catalog), ex=300)
    return catalog
```

**Why developers do it:** Standard cache-aside pattern. Correct at low concurrency.

**What goes wrong:** Twitter, Reddit, and Instagram have all publicly documented stampede incidents. When a popular key expires, the database goes from 500 queries/sec to 15,000 identical queries in one second. Database saturates, cache stays empty longer, more requests pile up -- positive feedback loop that can take down the data tier.

**The fix:**
```python
# After: single-flight with distributed lock
lock_key = f"lock:{key}"
if await redis.set(lock_key, "1", nx=True, ex=10):  # one winner fetches
    data = await fetch_fn()
    await redis.set(key, json.dumps(data), ex=ttl)
    await redis.delete(lock_key)
else:
    await asyncio.sleep(0.1)  # losers retry from cache
    return await get_with_singleflight(key, fetch_fn)
```

**Detection rule:** Alert on cache miss rate spikes correlated with DB query spikes. Track concurrent identical cache misses.

---

### AP-15: Async Constructors

**Also known as:** Constructor Side-Effect, Async Init Trap
**Frequency:** Common | **Severity:** Medium | **Detection difficulty:** Easy

**What it looks like:**
```javascript
class DbClient {
    constructor(connStr) {
        this.conn = this.connect(connStr);  // this.conn is a Promise, not a connection
    }
}
```

**Why developers do it:** Constructors are "where setup goes." Natural instinct to put initialization there.

**What goes wrong:** Constructor returns a half-initialized object. Every method must `await this.conn`. In Python, `asyncio.run()` in `__init__` crashes if an event loop is already running. The object violates the constructor's contract that the returned instance is ready to use.

**The fix:**
```javascript
class DbClient {
    constructor(conn) { this.conn = conn; }  // already resolved
    static async create(connStr) {
        return new DbClient(await pg.connect(connStr));
    }
}
const client = await DbClient.create(connStr);
```

**Detection rule:** Flag constructors containing `await`, `asyncio.run`, or Promise assignment.

---

### AP-16: Not Canceling Obsolete Operations

**Also known as:** Stale Closure, Zombie Request, Use-After-Unmount
**Frequency:** Very Common (frontend) | **Severity:** Medium | **Detection difficulty:** Medium

**What it looks like:**
```javascript
useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
    // no cleanup -- stale fetch overwrites current data
}, [userId]);
```

**Why developers do it:** Cancellation is not part of the happy path. AbortController feels like boilerplate.

**What goes wrong:** If a user navigates Alice -> Bob -> Charlie quickly, three fetches race. The last to complete wins -- which may be Alice's data on Charlie's profile. React team documented this in GitHub issue #15006. Memory leaks accumulate as unmounted components retain promise callbacks.

**The fix:**
```javascript
useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/users/${userId}`, { signal: ctrl.signal })
        .then(r => r.json()).then(setUser)
        .catch(e => { if (e.name !== "AbortError") setError(e); });
    return () => ctrl.abort();
}, [userId]);
```

**Detection rule:** Flag `useEffect` with `fetch`/async calls but no cleanup returning `abort()`.

---

### AP-17: Shared Mutable State Across Threads

**Also known as:** Unprotected Global, Thread-Hostile Singleton
**Frequency:** Common | **Severity:** Critical | **Detection difficulty:** Hard

**What it looks like:**
```kotlin
var counter = 0
suspend fun main() {
    val jobs = List(1000) { GlobalScope.launch { repeat(1000) { counter++ } } }
    jobs.forEach { it.join() }
    println(counter)  // prints ~578_923, not 1_000_000
}
```

**Why developers do it:** Global state is simplest. Python's GIL gives false safety (it protects bytecodes, not multi-step sequences). JS developers moving to Kotlin don't realize coroutines may run on different threads.

**What goes wrong:** Kotlin docs explicitly show the counter example producing 30-50% fewer increments than expected. In production: negative inventory, user sessions showing another user's data, analytics that never add up. Bugs depend on exact thread scheduling -- notoriously unreproducible.

**The fix:**
```kotlin
// Before: data race                         // After: atomic
var counter = 0                              val counter = AtomicInteger(0)
massiveRun { counter++ }                     massiveRun { counter.incrementAndGet() }
```

**Detection rule:** Go: `-race` flag. Rust: compiler prevents at compile time. Flag `global`/`var` mutated from async contexts.

---

### AP-18: Zombie Processes

**Also known as:** Defunct Process, Orphan Worker, Leaked Subprocess
**Frequency:** Common (containers) | **Severity:** High | **Detection difficulty:** Medium

**What it looks like:**
```python
def health_check():
    proc = subprocess.Popen(["curl", "-s", "http://localhost:8080/health"])
    # never calls proc.wait() -- zombie accumulates every 10 seconds
```

**Why developers do it:** `Popen`/`spawn` are fire-and-forget by default. Parent doesn't need the result.

**What goes wrong:** Kubernetes #81042: containers with exec probes accumulated zombies because pause container v3.0 didn't reap children. Zombies consumed PID table entries until the system hit PID limit, freezing the node. containerd #3781: zombie processes made pods fail readiness checks, causing cascading cluster restarts. Kubernetes #66892: pods stuck in "Terminating" because zombie children ignored SIGTERM.

**The fix:**
```python
# Before: zombie leak                       # After: managed lifecycle
proc = subprocess.Popen(cmd)                 result = subprocess.run(cmd, timeout=5, capture_output=True)
                                             # Container: ENTRYPOINT ["tini", "--"]
```

**Detection rule:** Flag `Popen` without `.wait()`/`.communicate()`. Kubernetes: flag pods without `tini`/`dumb-init`.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns | Prevention |
|---|---|---|
| Single-threaded mental model | AP-04, 10, 13, 17 | Concurrency training; race condition testing |
| Happy-path-only development | AP-02, 07, 16 | Chaos engineering; failure injection in CI |
| Copy-paste from outdated tutorials | AP-01, 06, 08 | Style guide with lint rules enforced in CI |
| "Works in dev" false confidence | AP-03, 11, 14 | Load testing before merge; production-like staging |
| Misunderstanding language semantics | AP-06, 09, 15 | Language-specific async guidelines; typed linting |
| Missing lifecycle management | AP-02, 16, 18 | RAII pattern; cleanup in finally/defer/using |
| Lock-based thinking without ordering | AP-05, 12 | Lock hierarchy docs; prefer lock-free structures |
| Ignoring cancellation as "edge case" | AP-16, 18 | AbortController/CancellationToken as mandatory API |

---

## Self-Check Questions

1. Is every Promise/Task/Future either awaited, returned, or handled with `.catch()`?
2. Are independent async operations in a loop running sequentially when `Promise.all` would work?
3. If this async operation throws, where does the exception go? Handler, crash, or void?
4. If the user navigates away or the server shuts down, does this operation clean up or become a zombie?
5. If this code acquires multiple locks, is the ordering consistent across all code paths?
6. Is there a gap between checking a condition and acting on it that another thread could exploit?
7. If 1000 requests hit this cache miss simultaneously, does the system survive?
8. Is any mutable variable accessed from multiple threads/coroutines without synchronization?
9. Does every `Popen`/`spawn`/`exec` have lifecycle management (wait, timeout, cleanup)?
10. Does any constructor perform async I/O, returning a half-initialized object?
11. Does this code mix callbacks and promises, or use `async void` where `async Task` is needed?
12. Does every external call have a bounded timeout, or can it hang forever?
13. If N clients retry this failed operation simultaneously, does the system stampede?
14. Is this lazy-initialized singleton safe under concurrent first access?
15. Is there a polling loop without sleep/backoff that will burn CPU?

---

## Code Smell Quick Reference

| Smell | Anti-Pattern | First Check |
|---|---|---|
| `>3` levels of callback nesting | AP-01 Callback Hell | Refactor to async/await |
| Promise returned but not awaited | AP-02 Fire and Forget | Add `await` or `.catch()` |
| `await` inside `for`/`for...of` | AP-03 Sequential Awaits | Use `Promise.all` if independent |
| Read-then-write without lock/atomic | AP-04 Race Condition | Use atomic op or transaction |
| Nested lock acquisitions | AP-05 Deadlock | Verify consistent lock ordering |
| `new Promise` wrapping `.then/.catch` | AP-06 Promise Constructor | Return inner promise directly |
| `.then()` chain with no `.catch()` | AP-07 Missing Error Handling | Add `.catch()` or try/catch |
| Function accepts callback AND returns Promise | AP-08 Mixed Models | Pick one; adapter at boundary |
| `async void` (C#) / `void...async` (Dart) | AP-09 Async Void | Change to `async Task`/`Future` |
| `if (instance == null) instance = new` | AP-10 Unsafe Singleton | Use language-safe lazy init |
| `while(true)` without sleep/yield | AP-11 Busy Waiting | Add backoff or event-driven wait |
| `synchronized` on every method | AP-12 Over-Synchronization | Use concurrent data structures |
| `os.access()` then `open()` | AP-13 TOCTOU | Atomic operation, handle error |
| Cache get-miss-fetch without lock | AP-14 Thundering Herd | Add single-flight/distributed lock |
| `await`/`asyncio.run` in constructor | AP-15 Async Constructor | Use static factory method |
| `useEffect` + fetch, no cleanup | AP-16 Not Canceling | Add AbortController cleanup |
| `global`/`var` mutated from async code | AP-17 Shared Mutable State | Atomic types or confinement |
| `Popen()`/`spawn()` without `.wait()` | AP-18 Zombie Processes | Use `subprocess.run` or add handler |

---

*Researched: 2026-03-08 | Sources: [Cloudflare Incident June 2024](https://blog.cloudflare.com/cloudflare-incident-on-june-20-2024/), [Node.js Unhandled Rejections (DZone)](https://dzone.com/articles/unhandled-promise-rejections-nodejs-crash), [Node.js Issue #20392](https://github.com/nodejs/node/issues/20392), [ASP.NET async void crash](https://joshthecoder.com/2023/12/01/sneaky-async-void-leads-to-aspnetcore-crash.html), [dotnet/aspnetcore #13867](https://github.com/dotnet/aspnetcore/issues/13867), [CVE-2024-30088 Windows TOCTOU](https://www.broadcom.com/support/security-center/protection-bulletin/microsoft-windows-kernel-toctou-race-condition-vulnerability-cve-2024-30088), [CWE-367](https://cwe.mitre.org/data/definitions/367.html), [CVE-2018-15664 Docker race](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use), [Kubernetes #81042 zombies](https://github.com/kubernetes/kubernetes/issues/81042), [containerd #3781](https://github.com/containerd/containerd/issues/3781), [Kubernetes #66892](https://github.com/kubernetes/kubernetes/issues/66892), [Thundering Herd (Encore)](https://encore.dev/blog/thundering-herd-problem), [PostgreSQL Deadlocks (Netdata)](https://www.netdata.cloud/academy/10-real-world-postgresql-deadlock/), [Kotlin shared mutable state](https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html), [React #15006](https://github.com/facebook/react/issues/15006), [Promise anti-patterns](https://medium.com/datafire-io/es6-promises-patterns-and-anti-patterns-bbb21a5d0918), [callbackhell.com](https://callbackhell.com/), [Async constructors](https://dev.to/somedood/the-proper-way-to-write-async-constructors-in-javascript-1o8c)*
