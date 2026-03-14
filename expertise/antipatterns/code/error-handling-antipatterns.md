# Error Handling Anti-Patterns

**Module:** Code Anti-Patterns / Error Handling
**Severity range:** Low to Critical
**Applies to:** All languages with exception/error mechanisms
**Prerequisites:** Basic understanding of try/catch, async patterns, typed error systems

Error handling code is the least tested, least reviewed, and most dangerous code in any system.
A 2014 University of Toronto study of Cassandra, HBase, HDFS, MapReduce, and Redis found that
92% of catastrophic failures were caused by incorrect handling of non-fatal errors explicitly
signalled in software. In 35% of those cases, the error handler was empty, only contained a log
statement, or had clearly incomplete logic. These are not exotic edge cases -- they are trivial
mistakes that pass code review because error handling is treated as an afterthought. This module
catalogs 18 recurring anti-patterns, each with detection heuristics, real-world incident data,
and concrete fixes.

---

## Anti-Pattern Catalog

### AP-01: Pokemon Exception Handling

**Also known as:** Catch 'Em All, Diaper Pattern, Catch-All
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```python
# Python
try:
    process_order(order)
except Exception:
    pass

# Java
try {
    processOrder(order);
} catch (Exception e) {
    // handle error
}

# JavaScript
try {
    processOrder(order);
} catch (e) {
    console.log("something went wrong");
}
```

**Why developers do it:**

Quick fix during development to "get it working." Often starts as a placeholder that survives to production. Developers also use it defensively when they do not know which exceptions a third-party library can throw. The CWE (Common Weakness Enumeration) lists this as record #397.

**What goes wrong:**

The handler catches `NameError`, `TypeError`, `KeyboardInterrupt`, `SystemExit`, and everything else indiscriminately. A misspelled variable name becomes indistinguishable from a network timeout. The University of Toronto study found this pattern directly contributed to catastrophic failures in distributed data stores -- the error handler swallowed a real failure signal, and the system continued operating on corrupted state.

In one documented case, an `undefined` variable raised a `NameError` inside a Pokemon catch block. The function returned `None` silently, causing downstream data corruption that was only discovered days later when customers reported incorrect billing amounts.

**The fix:**

```python
# Before: catches everything including SystemExit and KeyboardInterrupt
try:
    result = external_api.fetch(order_id)
except Exception:
    pass

# After: catch specific, actionable exceptions
try:
    result = external_api.fetch(order_id)
except ConnectionTimeout:
    result = cache.get_stale(order_id)
    metrics.increment("api.timeout.fallback")
except ValidationError as e:
    logger.warning("Invalid order %s: %s", order_id, e)
    raise
```

**Detection rule:**

Flag any `catch(Exception)`, `catch(...)`, `except Exception`, or bare `except:` that does not re-raise. Lint rules: `pylint broad-except`, `SonarQube S2221`, `ESLint no-useless-catch`.

---

### AP-02: The Silent Swallow

**Also known as:** Exception Hiding, Error Swallowing, Empty Catch
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

```java
try {
    db.executeUpdate(sql);
} catch (SQLException e) {
    // TODO: handle this later
}

try {
    sendNotification(user);
} catch (Exception e) {
    // not critical, ignore
}
```

```javascript
try {
    await saveToDatabase(record);
} catch (err) {
    // swallow
}
```

**Why developers do it:**

The developer believes the exception is non-critical ("it's just a notification") or plans to handle it later. Wikipedia documents this as "error hiding" -- the practice of catching an error and continuing without logging, processing, or reporting it.

**What goes wrong:**

Information about the error is permanently lost. Depending on the system, this can cause unintended side effects that cascade into other errors. The n8n workflow automation platform had a documented bug (Issue #19434) where a URL constructor threw an error inside a Code node. The try-catch swallowed it and returned an empty string. The real issue -- missing `URL` constructor in the sandboxed environment -- was invisible. Users saw only mysterious data-processing failures.

Harness.io reported that swallowed exceptions are a major factor causing production errors to go unnoticed, particularly hiding database rollback failures, file I/O errors, and network timeouts.

**The fix:**

```java
// Before
try {
    db.executeUpdate(sql);
} catch (SQLException e) {}

// After: at minimum, log. Better: propagate or handle.
try {
    db.executeUpdate(sql);
} catch (SQLException e) {
    logger.error("Failed to execute update: {}", sql, e);
    throw new DataAccessException("Update failed for query", e);
}
```

If the exception genuinely can be ignored (e.g., best-effort cache write), document why explicitly:

```java
try {
    cache.put(key, value);
} catch (CacheException e) {
    // Intentionally ignored: cache miss is acceptable, DB is source of truth.
    // Metric tracked separately via cache health monitor.
    metrics.increment("cache.write.failure");
}
```

**Detection rule:**

Flag empty catch blocks and catch blocks containing only comments or TODO markers. Lint rules: `SonarQube S108`, `ESLint no-empty`, `clang-tidy bugprone-empty-catch`, `Checkstyle EmptyCatchBlock`.

---

### AP-03: Exceptions as Flow Control

**Also known as:** Conditional Exceptions, Exception-Driven Logic, Vexing Exceptions
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

```python
# Using exception to check if user exists
def get_user(user_id):
    try:
        return db.query(f"SELECT * FROM users WHERE id = {user_id}")
    except UserNotFoundError:
        return create_default_user(user_id)

# Using exception for type checking
def parse_input(value):
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value
```

```csharp
// C# classic: using Parse + catch instead of TryParse
int age;
try {
    age = int.Parse(userInput);
} catch (FormatException) {
    age = 0;
}
```

**Why developers do it:**

It feels concise. In Python, "easier to ask forgiveness than permission" (EAFP) is sometimes cited as justification, but EAFP applies to race-condition avoidance, not routine control flow.

**What goes wrong:**

Joshua Bloch demonstrated in Effective Java that exception-based looping is roughly 2x slower than conditional checks because the JVM must capture the entire call stack on every throw. Microsoft's performance documentation explicitly labels this a "Performance Sin." Beyond speed, it obscures intent -- a reader cannot tell whether the exception path is the error case or the expected case.

The Databricks SDK for Python (Issue #1117) documented how inconsistent exception handling forced users into control-flow anti-patterns, checking HTTP status by catching exceptions rather than inspecting return values.

**The fix:**

```csharp
// Before: exception as flow control
int age;
try {
    age = int.Parse(userInput);
} catch (FormatException) {
    age = 0;
}

// After: use TryParse / conditional check
int age = int.TryParse(userInput, out var parsed) ? parsed : 0;
```

```python
# Before
try:
    value = my_dict[key]
except KeyError:
    value = default

# After
value = my_dict.get(key, default)
```

**Detection rule:**

Flag catch blocks where the exception type represents a predictable, non-exceptional condition (e.g., `KeyError`, `FormatException`, `NumberFormatException`) and where the catch body sets a default value. High ratio of caught-to-uncaught exceptions in production telemetry is a signal.

---

### AP-04: Null as Error Signal

**Also known as:** The Billion-Dollar Mistake, Null Return Pattern, Silent Null
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```java
public User findUser(String id) {
    try {
        return userRepo.findById(id);
    } catch (DatabaseException e) {
        return null;  // caller has no idea why
    }
}

// Caller side -- the NullPointerException lottery
User user = findUser(id);
String name = user.getName();  // NPE if user is null
```

```javascript
function getConfig(key) {
    const val = configStore[key];
    if (!val) return null;
    return val;
}
// Caller forgets null check -> TypeError: Cannot read property of null
```

**Why developers do it:**

It avoids throwing, which feels "simpler." The method signature stays clean. Tony Hoare, inventor of the null reference, called it his "billion-dollar mistake" at QCon London 2009, stating: "It has led to innumerable errors, vulnerabilities, and system crashes, which have probably caused a billion dollars of pain and damage in the last forty years."

**What goes wrong:**

The null propagates through the system until it detonates far from the original error site. Debugging becomes a search through call chains to find where null was introduced. Every caller must defensively null-check, and inevitably one does not. The original error context (why the lookup failed) is permanently lost.

**The fix:**

```java
// Before
public User findUser(String id) {
    try {
        return userRepo.findById(id);
    } catch (DatabaseException e) {
        return null;
    }
}

// After: use Optional (Java), Result type (Rust), or throw
public Optional<User> findUser(String id) {
    return userRepo.findOptionalById(id);
}

// Or throw with context
public User findUser(String id) throws UserNotFoundException {
    return userRepo.findById(id)
        .orElseThrow(() -> new UserNotFoundException(id));
}
```

```typescript
// TypeScript: use strict null checks + union types
function getConfig(key: string): ConfigValue | undefined {
    return configStore.get(key);
}
```

**Detection rule:**

Flag methods that catch exceptions and return null. Flag methods returning null without `@Nullable` annotation. Enable `-strictNullChecks` in TypeScript, `Optional` enforcement in Java. Lint: `SonarQube S2637`, `NullAway`.

---

### AP-05: Log and Rethrow

**Also known as:** Double Logging, Log-and-Throw, Catch-Log-Rethrow
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```java
try {
    processPayment(order);
} catch (PaymentException e) {
    logger.error("Payment failed", e);
    throw e;  // same exception logged again at next catch
}

// Three layers up:
try {
    handleOrder(order);
} catch (PaymentException e) {
    logger.error("Order processing failed", e);  // same stack trace, third time
    throw new OrderException("Order failed", e);
}
```

**Why developers do it:**

Each layer wants to "make sure" the error is logged. Developers do not trust that higher layers will log the exception. The TheServerSide documented this as one of the most common Java exception anti-patterns.

**What goes wrong:**

The same stack trace appears 3-5 times in logs, each with different context text. During an incident, an engineer searching for the root cause finds dozens of duplicate log entries, making it harder to identify the actual first occurrence. Rolf Engelhard described the result: "a log file that contains every stacktrace in a dozen repetitions and variations -- a nightmare when you try to understand what is going on." SonarQube rule S2139 specifically targets this pattern.

**The fix:**

Either log OR rethrow. Never both.

```java
// Option A: Add context and rethrow (preferred in library code)
try {
    processPayment(order);
} catch (PaymentException e) {
    throw new OrderException("Payment failed for order " + order.getId(), e);
}

// Option B: Log and handle (preferred at boundary/top level)
try {
    processPayment(order);
} catch (PaymentException e) {
    logger.error("Payment failed for order {}: {}", order.getId(), e.getMessage(), e);
    return PaymentResult.failed(e.getMessage());
}
```

**Detection rule:**

Flag catch blocks that contain both a `logger.error()` call and a `throw` statement. Lint: `SonarQube S2139`, `PMD LoggerAndThrow`, Palantir baseline-error-prone `LogAndThrow`.

---

### AP-06: Catching the Base Error Class

**Also known as:** Catching Throwable, Catching BaseException, Nuclear Catch
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

```java
try {
    processData(input);
} catch (Throwable t) {
    logger.error("Error processing data", t);
    return defaultResult();
}
```

```python
try:
    process_data(input)
except BaseException:
    return default_result()
```

**Why developers do it:**

"I want to catch absolutely everything so the system never crashes." It feels like defensive programming.

**What goes wrong:**

In Java, `Throwable` includes `OutOfMemoryError`, `StackOverflowError`, and `ThreadDeath`. Catching these prevents the JVM from properly reporting fatal conditions. An `OutOfMemoryError` caught and "handled" by returning a default value leaves the JVM in an unstable state -- subsequent allocations may fail unpredictably, and the application limps along corrupting data instead of failing fast.

In Python, catching `BaseException` also catches `SystemExit` and `KeyboardInterrupt`, meaning Ctrl+C no longer works and `sys.exit()` calls are silently ignored. Baeldung documented this as a definitive bad practice: "Throwable is the superclass of all exceptions and errors. Catching it will intercept serious errors that the application cannot or should not handle."

**The fix:**

```java
// Before
try {
    processData(input);
} catch (Throwable t) {
    return defaultResult();
}

// After: catch only recoverable exceptions
try {
    processData(input);
} catch (ProcessingException | IOException e) {
    logger.error("Data processing failed", e);
    return defaultResult();
}
// Let OutOfMemoryError, StackOverflowError propagate and crash the process
```

**Detection rule:**

Flag `catch(Throwable)`, `catch(Error)` in Java; `except BaseException` in Python; `catch {}` without type in Swift. Lint: `SonarQube S1181`, `Checkstyle IllegalCatch`, `PMD AvoidCatchingThrowable`.

---

### AP-07: Generic Error Messages

**Also known as:** "Something Went Wrong" Syndrome, Unhelpful Error, Context-Free Error
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```javascript
try {
    await deployService(config);
} catch (err) {
    throw new Error("Deployment failed");
    // Original error: "EACCES: permission denied, open '/etc/nginx/conf.d/app.conf'"
    // What the on-call engineer sees: "Deployment failed"
}
```

```python
except DatabaseError as e:
    raise AppError("An error occurred while processing your request")
```

**Why developers do it:**

Security guidance says "don't expose internals to users." Developers apply this rule everywhere, including internal logs and error chains, stripping context that only engineers would see.

**What goes wrong:**

The on-call engineer sees "Deployment failed" in the alert. They have no idea if it is a permission error, a network error, a config syntax error, or a disk space issue. Triage time increases from minutes to hours. The security concern about user-facing messages is valid, but internal error chains and server-side logs need full context.

CQR's security research acknowledges the tension: user-facing errors should be generic, but server-side logs must contain the full error chain with stack trace and contextual data, accessible only to authorized personnel.

**The fix:**

Separate user-facing messages from internal error context:

```python
# Before
except DatabaseError as e:
    raise AppError("An error occurred")

# After: preserve context internally, sanitize externally
except DatabaseError as e:
    logger.error("DB query failed", extra={
        "query": query_name,
        "table": table,
        "original_error": str(e),
    })
    raise AppError(
        user_message="We're having trouble processing your request. Please try again.",
        internal_message=f"DatabaseError in {query_name} on {table}: {e}",
        original=e,
    )
```

**Detection rule:**

Flag `throw new Error(string_literal)` where the literal contains no variable interpolation. Flag catch blocks that discard the original exception's message. Custom lint rule: error constructors must include either the original error or at least one variable.

---

### AP-08: Rethrowing Without Context

**Also known as:** Naked Rethrow, Context-Free Propagation, Blame Laundering
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

```java
try {
    loadConfig(path);
} catch (IOException e) {
    throw new ConfigException(e.getMessage());
    // Lost: the original stack trace, the exception chain
}
```

```python
try:
    parse_config(path)
except yaml.YAMLError as e:
    raise ConfigError(str(e))  # original traceback gone
```

**Why developers do it:**

They want to translate the exception to a domain-specific type but forget to chain the cause. In Python, using `raise X` inside a catch without `from e` discards the original traceback.

**What goes wrong:**

The stack trace in the new exception starts at the rethrow point, not at the original failure. Debugging now requires guessing what happened before the rethrow. In large systems, this creates "stack trace gaps" where the most useful frames are missing.

**The fix:**

```java
// Before: breaks the chain
throw new ConfigException(e.getMessage());

// After: chain the cause
throw new ConfigException("Failed to load config from " + path, e);
```

```python
# Before
raise ConfigError(str(e))

# After: use 'from' to chain
raise ConfigError(f"Failed to parse {path}") from e
```

**Detection rule:**

Flag `throw new XException(e.getMessage())` -- constructing a new exception from only the message string. Flag Python `raise X` inside an except block without `from`. Lint: `SonarQube S3438`, `Pylint W0707 (raise-missing-from)`.

---

### AP-09: Nested Try-Catch Pyramids

**Also known as:** Try-Catch Hell, Tower of Terror, Exception Nesting
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```javascript
try {
    const config = loadConfig();
    try {
        const db = connectDB(config);
        try {
            const data = db.query(sql);
            try {
                return transform(data);
            } catch (transformErr) {
                logger.error("Transform failed", transformErr);
            }
        } catch (queryErr) {
            logger.error("Query failed", queryErr);
        }
    } catch (dbErr) {
        logger.error("DB connection failed", dbErr);
    }
} catch (configErr) {
    logger.error("Config load failed", configErr);
}
```

**Why developers do it:**

Each operation needs different error handling, and developers nest them sequentially without extracting functions. Maximiliano Contieri cataloged this as Code Smell #80: "Exceptions are handy. But code is not clear when nesting."

**What goes wrong:**

Readability collapses. Error handling logic becomes tangled with business logic. The nested structure makes it hard to determine which catch corresponds to which try. Modifying one layer risks breaking the error handling of another.

**The fix:**

Extract into separate functions with single-level try-catch, or use early returns:

```javascript
// After: flat structure with extracted functions
function processRequest() {
    const config = loadConfigSafe();  // throws ConfigError
    const db = connectDBSafe(config); // throws DBError
    const data = querySafe(db, sql);  // throws QueryError
    return transformSafe(data);       // throws TransformError
}

// Each function handles its own cleanup, throws domain-specific error
function loadConfigSafe() {
    try {
        return loadConfig();
    } catch (err) {
        throw new ConfigError("Config load failed", { cause: err });
    }
}
```

**Detection rule:**

Flag try blocks nested more than 2 levels deep. Measure cyclomatic complexity inside catch blocks. Lint: custom rule checking AST nesting depth of try statements.

---

### AP-10: Ignoring Async Errors

**Also known as:** Floating Promises, Fire-and-Forget, Unhandled Rejection
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

```javascript
// No await, no .catch() -- the promise floats
app.post("/orders", (req, res) => {
    processOrder(req.body);  // returns a promise, nobody catches it
    res.json({ status: "accepted" });
});

// Async callback without error handling
setTimeout(async () => {
    await riskyOperation();  // if this throws, nothing catches it
}, 1000);
```

```python
# Python: creating a task and forgetting about it
import asyncio

async def handler(request):
    asyncio.create_task(send_notification(request.user))  # fire and forget
    return Response("OK")
# If send_notification raises, the error is silently dropped
```

**Why developers do it:**

The "fire and forget" pattern seems appropriate for non-critical side effects. Developers forget that async functions return promises that need handling.

**What goes wrong:**

Starting in Node.js 15, unhandled promise rejections crash the process by default. DZone documented a production incident: "The tiny mistake that crashed our Node.js app" -- a missing `.catch()` on a database cleanup promise. In development it never failed; in production under load, the database connection pool exhausted, the promise rejected, and the entire server process terminated.

Before Node 15, unhandled rejections were silently swallowed (a `DeprecationWarning` was the only signal), meaning errors accumulated invisibly.

**The fix:**

```javascript
// Before: floating promise
processOrder(req.body);

// After: await with error handling
try {
    await processOrder(req.body);
} catch (err) {
    logger.error("Order processing failed", { orderId: req.body.id, err });
    // decide: retry, dead-letter queue, or error response
}

// For intentional fire-and-forget: explicit void with catch
void processOrder(req.body).catch(err => {
    logger.error("Background order processing failed", err);
    deadLetterQueue.push({ order: req.body, error: err });
});
```

Add global safety nets (but do not rely on them):

```javascript
process.on('unhandledRejection', (reason, promise) => {
    logger.fatal('Unhandled Rejection', { reason });
    metrics.increment('unhandled.rejection');
    process.exit(1);  // fail fast
});
```

**Detection rule:**

Flag async function calls without `await`, `.then()`, or `.catch()`. TypeScript: enable `@typescript-eslint/no-floating-promises`. ESLint: `require-await`, `no-floating-promises`. Python: flag `asyncio.create_task()` without storing the returned task.

---

### AP-11: Using Assert for Runtime Validation

**Also known as:** Assert-as-Guard, Debug-Only Validation
**Frequency:** Occasional
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

```python
def transfer_money(from_account, to_account, amount):
    assert amount > 0, "Transfer amount must be positive"
    assert from_account.balance >= amount, "Insufficient funds"
    # proceed with transfer...
```

```java
public void processPayment(double amount) {
    assert amount > 0 : "Amount must be positive";
    // Java assertions disabled by default in production
}
```

**Why developers do it:**

Assert reads cleanly and communicates intent. It works in tests and development. Developers forget that assertions can be -- and routinely are -- disabled in production.

**What goes wrong:**

Python's `-O` flag and `PYTHONOPTIMIZE` environment variable strip all assert statements at the bytecode level. Java requires explicit `-ea` to enable assertions, and virtually no production JVM runs with assertions enabled. Snyk's security research documented this as a vulnerability vector: "Disabling asserts in a production environment can be devastating. This practice can introduce various backdoors and breakpoints in the application."

A negative transfer amount or insufficient-balance check that only exists as an assert statement becomes a gaping hole in production. Money moves in wrong directions, and the validation that was supposed to prevent it has been compiled away.

**The fix:**

```python
# Before: assert (removed in production with -O)
assert amount > 0, "Transfer amount must be positive"

# After: explicit validation that cannot be disabled
if amount <= 0:
    raise ValueError(f"Transfer amount must be positive, got {amount}")

if from_account.balance < amount:
    raise InsufficientFundsError(
        f"Account {from_account.id} has {from_account.balance}, "
        f"needed {amount}"
    )
```

Reserve `assert` for:
- Test assertions (`assert result == expected`)
- Invariants during development that should never fail (`assert len(sorted_list) == len(original)`)
- Never for input validation, authorization checks, or business rules

**Detection rule:**

Flag `assert` statements that reference function parameters, user input, or request data. Lint: `Bandit S101` (Python), `SonarQube S3869` (Java). Snyk rule `python/AssertUsedForSecurity`.

---

### AP-12: Conflating Validation and System Errors

**Also known as:** Error Type Confusion, User-Error-as-500, Mixed Error Domains
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```python
def create_user(data):
    try:
        validate_email(data["email"])
        validate_age(data["age"])
        db.insert(data)
    except Exception as e:
        return {"error": str(e)}, 500  # email typo returns 500 Internal Server Error
```

```javascript
app.post("/users", async (req, res) => {
    try {
        const user = await createUser(req.body);
        res.json(user);
    } catch (err) {
        // ValidationError("invalid email") -> 500
        // DatabaseError("connection refused") -> 500
        // Both return the same status code
        res.status(500).json({ error: "Internal server error" });
    }
});
```

**Why developers do it:**

A single try-catch is simpler than distinguishing error types. Developers do not create separate exception hierarchies for validation versus system errors.

**What goes wrong:**

Monitoring systems fire alerts for "invalid email" validation failures as if they were system outages. On-call engineers investigate user typos at 3 AM. Conversely, actual system errors (database down) get the same treatment as bad input, so they may be dismissed as "just more validation noise." SRE teams lose trust in alerts. Users see "Internal Server Error" for fixable input mistakes.

**The fix:**

```python
class ValidationError(AppError):
    """Client-side input error (4xx)."""
    status_code = 400

class SystemError(AppError):
    """Server-side infrastructure error (5xx)."""
    status_code = 500

def create_user(data):
    # Validation: explicit, returns 4xx
    errors = validate_user_input(data)
    if errors:
        raise ValidationError(errors)

    # System operation: may throw 5xx
    try:
        return db.insert(data)
    except DatabaseError as e:
        raise SystemError("Failed to create user") from e
```

**Detection rule:**

Flag catch blocks that return HTTP 500 for all exception types without distinguishing. Flag error hierarchies where validation and system exceptions share a common non-root base class.

---

### AP-13: Stringly-Typed Errors

**Also known as:** Error String Matching, Message-Based Dispatch, Error-Message-as-API
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```go
if err != nil {
    if strings.Contains(err.Error(), "connection refused") {
        retryConnection()
    } else if strings.Contains(err.Error(), "timeout") {
        extendTimeout()
    }
}
```

```javascript
try {
    await api.call();
} catch (err) {
    if (err.message.includes("rate limit")) {
        await sleep(1000);
        return api.call();
    }
}
```

**Why developers do it:**

The error type system is not expressive enough, or the library only returns generic errors with different messages. Quick pattern matching on strings is faster to write than proper type checking.

**What goes wrong:**

Dave Cheney, in his widely-cited Go blog post, stated: "Comparing the string form of an error is, in my opinion, a code smell. You should try to avoid it." The error message is for humans, not code. When a library author rephrases "connection refused" to "unable to connect," every string-matching caller silently breaks. There is no compiler or type checker to catch the regression. These bugs only manifest at runtime, under the exact failure condition being matched.

**The fix:**

```go
// Before: string matching
if strings.Contains(err.Error(), "connection refused") {
    retryConnection()
}

// After: use error types and errors.Is / errors.As
var connErr *net.OpError
if errors.As(err, &connErr) {
    retryConnection()
}
```

```javascript
// Before: string matching
if (err.message.includes("rate limit")) { ... }

// After: use error codes or typed errors
if (err instanceof RateLimitError) { ... }
// or
if (err.code === "RATE_LIMITED") { ... }
```

**Detection rule:**

Flag `err.Error()`, `err.message`, or `e.getMessage()` used inside string comparison functions (`contains`, `includes`, `equals`, `startsWith`). Lint: `errorlint` (Go), custom ESLint rule for `err.message.includes`.

---

### AP-14: Missing Error Boundaries

**Also known as:** White Screen of Death, Unbounded Error Propagation, No Blast Radius
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```jsx
// React app with no error boundary
function App() {
    return (
        <Dashboard>
            <UserProfile />    {/* if this throws, entire app dies */}
            <OrderHistory />
            <Notifications />
        </Dashboard>
    );
}
```

**Why developers do it:**

Error boundaries require class components in React (no hook equivalent for `componentDidCatch`). Developers building with functional components skip them because they feel archaic. In backend systems, developers rely on global exception handlers without module-level boundaries.

**What goes wrong:**

React's own documentation states: "As of React 16, errors that were not caught by any error boundary will result in unmounting of the whole React component tree." A single `TypeError` in a `UserProfile` widget takes down the entire application, rendering a blank white page. Wix Engineering documented this as the "White Screen of Death" for React Native, where uncaught errors crashed the entire app instead of just the offending component.

FreeCodeCamp documented the pattern: "Everything is set up and works properly, but the application crashes in production because of a missed little error, and then the whole screen goes white while clicking some button."

**The fix:**

```jsx
// Wrap independent features in separate error boundaries
function App() {
    return (
        <Dashboard>
            <ErrorBoundary fallback={<ProfileError />}>
                <UserProfile />
            </ErrorBoundary>
            <ErrorBoundary fallback={<OrdersUnavailable />}>
                <OrderHistory />
            </ErrorBoundary>
            <ErrorBoundary fallback={<NotificationsOff />}>
                <Notifications />
            </ErrorBoundary>
        </Dashboard>
    );
}
```

In backend systems, use bulkheads:

```python
# Process each item independently; one failure doesn't stop the batch
results = []
for item in batch:
    try:
        results.append(process(item))
    except ProcessingError as e:
        logger.error("Item %s failed: %s", item.id, e)
        results.append(FailedResult(item.id, e))
```

**Detection rule:**

In React: flag component trees with more than 50 components and no `ErrorBoundary` wrapper. In backends: flag batch-processing loops without per-item error handling. Lint: `eslint-plugin-react` custom rule for error boundary coverage.

---

### AP-15: Not Using Finally / Cleanup

**Also known as:** Resource Leak Pattern, Missing Cleanup, Dangling Handles
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```java
Connection conn = null;
try {
    conn = dataSource.getConnection();
    PreparedStatement stmt = conn.prepareStatement(sql);
    ResultSet rs = stmt.executeQuery();
    return processResults(rs);
} catch (SQLException e) {
    throw new DataAccessException(e);
}
// conn, stmt, rs never closed if exception occurs in processResults
```

```python
f = open("/tmp/data.csv", "w")
f.write(generate_report())  # if this throws, file handle leaks
f.close()
```

**Why developers do it:**

They assume the happy path always completes. In garbage-collected languages, they assume the GC will clean up (it does not close file handles, database connections, or network sockets).

**What goes wrong:**

Connection pool exhaustion is the classic symptom. Under normal load, connections are returned. Under error conditions, leaked connections accumulate until the pool is exhausted and the entire application blocks waiting for connections. This failure mode only manifests under stress -- exactly when you can least afford it.

**The fix:**

```java
// Before: manual cleanup (leak-prone)
Connection conn = dataSource.getConnection();
// ...

// After: try-with-resources (Java 7+)
try (Connection conn = dataSource.getConnection();
     PreparedStatement stmt = conn.prepareStatement(sql);
     ResultSet rs = stmt.executeQuery()) {
    return processResults(rs);
}
```

```python
# Before
f = open("/tmp/data.csv", "w")
f.write(generate_report())
f.close()

# After: context manager
with open("/tmp/data.csv", "w") as f:
    f.write(generate_report())
```

```javascript
// JavaScript: use finally for cleanup
const client = await pool.connect();
try {
    return await client.query(sql);
} finally {
    client.release();
}

// Or with Symbol.asyncDispose (TC39 Stage 3)
await using client = await pool.connect();
return await client.query(sql);
```

**Detection rule:**

Flag `Connection`, `InputStream`, `FileHandle` allocations not inside try-with-resources or `with` blocks. Lint: `SonarQube S2095`, `SpotBugs OBL_UNSATISFIED_OBLIGATION`, `Pylint R1732 (consider-using-with)`.

---

### AP-16: Error Codes vs Exceptions Confusion

**Also known as:** Mixed Signaling, Dual Error System, Return-Code-in-Exception-Land
**Frequency:** Occasional
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**

```python
# Mixing paradigms: returns error codes AND throws exceptions
def process_payment(order):
    result = gateway.charge(order.amount)
    if result.status_code == -1:
        return {"error": "payment_declined", "code": -1}
    if result.status_code == -2:
        raise PaymentGatewayError("Gateway unreachable")
    if result.status_code == 0:
        return {"success": True}
    # What about status_code == -3? Undefined behavior.
```

```go
// Go: returning both error and value, caller ignores error
result, err := processPayment(order)
// Developer checks result but not err
if result.Success {
    completeOrder(order)
}
```

**Why developers do it:**

Different team members prefer different styles. Legacy code uses error codes, new code uses exceptions, and they meet at integration points. Go's `(value, error)` convention can be undermined when callers check only the value.

**What goes wrong:**

Callers do not know which error channel to check. Some callers check the return value, others wrap in try-catch, and some do both. The LWN.net article on "Exceptions vs Error Codes" documents how mixing paradigms leads to unhandled error paths because callers make incorrect assumptions about which mechanism signals failure.

**The fix:**

Pick one paradigm per language/module boundary and enforce it:

```python
# Before: mixed
def process_payment(order):
    result = gateway.charge(order.amount)
    if result.status_code == -1:
        return {"error": "payment_declined"}
    if result.status_code == -2:
        raise PaymentGatewayError("unreachable")

# After: exceptions only (Python/Java/JS convention)
def process_payment(order):
    """Raises PaymentDeclined or GatewayUnreachable. Returns OrderReceipt on success."""
    result = gateway.charge(order.amount)
    if result.status_code == -1:
        raise PaymentDeclined(order_id=order.id, reason=result.message)
    if result.status_code == -2:
        raise GatewayUnreachable(gateway=gateway.name)
    return OrderReceipt(result)
```

**Detection rule:**

Flag functions that both `return error_dict` and `raise Exception` in different branches. Flag Go functions where the caller uses the first return value without checking `err != nil`. Lint: `errcheck` (Go), custom AST rule for mixed return/raise.

---

### AP-17: Panic-Driven Error Handling

**Also known as:** Crash-Happy Code, Fail-Loud Everywhere, Panic-as-Error
**Frequency:** Occasional
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

```go
func loadConfig(path string) Config {
    data, err := os.ReadFile(path)
    if err != nil {
        panic("failed to read config: " + err.Error())
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        panic("failed to parse config: " + err.Error())
    }
    return cfg
}
```

```rust
fn get_user(id: &str) -> User {
    db.find_user(id).unwrap()  // panics on None
}
```

**Why developers do it:**

"If this fails, nothing else matters" reasoning. In Go, the `panic`/`recover` mechanism looks like exceptions, tempting developers to use it as one. In Rust, `.unwrap()` is shorter than proper error propagation.

**What goes wrong:**

Go's official documentation states: "Don't use panic for normal error handling. Use error and multiple return values." Eli Bendersky documented how panic breaks the natural control flow of the program, surprising other developers. In Go's `net/http`, panics in request handlers are recovered by the server, but David Symonds (from the Go team) noted this may itself be an anti-pattern: "Quietly catching a panic might leave the server in an inconsistent or incorrect state."

A config file missing on one server in a fleet should not crash the process -- it should use a fallback or degrade gracefully. A database lookup returning no result is not a panic-worthy event.

**The fix:**

```go
// Before: panic
func loadConfig(path string) Config {
    data, err := os.ReadFile(path)
    if err != nil {
        panic("failed to read config")
    }
    // ...
}

// After: return error
func loadConfig(path string) (Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return Config{}, fmt.Errorf("reading config %s: %w", path, err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return Config{}, fmt.Errorf("parsing config %s: %w", path, err)
    }
    return cfg, nil
}
```

```rust
// Before
fn get_user(id: &str) -> User {
    db.find_user(id).unwrap()
}

// After
fn get_user(id: &str) -> Result<User, DbError> {
    db.find_user(id).ok_or_else(|| DbError::NotFound(id.to_string()))
}
```

**Detection rule:**

Flag `panic()` calls in Go outside of `init()` or test files. Flag `.unwrap()` in Rust outside of tests. Lint: `clippy::unwrap_used`, `golangci-lint gocritic panic` rule.

---

### AP-18: Destructive Finally Blocks

**Also known as:** Finally Swallows Exception, Return-in-Finally, Finally Override
**Frequency:** Rare but Catastrophic
**Severity:** Critical
**Detection difficulty:** Very Hard

**What it looks like:**

```java
public int calculate() {
    try {
        throw new RuntimeException("Critical error");
    } finally {
        return 42;  // silently swallows the RuntimeException
    }
}
// Returns 42. No exception propagated. No trace. Nothing.
```

```python
def calculate():
    try:
        raise ValueError("Critical error")
    finally:
        return 42  # ValueError silently discarded
```

**Why developers do it:**

They add a `return` in `finally` as a "safety net" to ensure the method always returns something. They do not realize that a return in `finally` overrides any exception being propagated.

**What goes wrong:**

The exception is silently discarded -- not caught, not logged, not propagated. It simply ceases to exist. Vishal Junghare documented this in Java: "A finally block can quietly swallow exceptions." This is one of the most insidious bugs because it leaves zero evidence. The method returns a plausible-looking value (42), making the bug extremely hard to detect.

**The fix:**

Never return from a finally block. Use finally only for cleanup:

```java
// Before: return in finally swallows exception
public int calculate() {
    try {
        return riskyComputation();
    } finally {
        return 42;
    }
}

// After: finally only for cleanup
public int calculate() {
    try {
        return riskyComputation();
    } finally {
        cleanupResources();  // no return statement
    }
}
```

**Detection rule:**

Flag `return` statements inside `finally` blocks. Lint: `SonarQube S1143`, `PMD ReturnFromFinallyBlock`, `Pylint W0150 (lost-exception)`, `ESLint no-unsafe-finally`.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns | Frequency |
|---|---|---|
| **Lack of testing error paths** | AP-01, AP-02, AP-06, AP-10, AP-18 | Very High |
| **Time pressure / "ship it" culture** | AP-01, AP-02, AP-07, AP-09 | Very High |
| **Not understanding language semantics** | AP-06, AP-11, AP-17, AP-18 | High |
| **Cargo-cult defensive programming** | AP-01, AP-06, AP-04 | High |
| **Missing error type hierarchy** | AP-07, AP-12, AP-13, AP-16 | High |
| **Over-applying security guidance** | AP-07, AP-08 | Medium |
| **Unfamiliarity with async model** | AP-10, AP-15 | High |
| **No code review standards for error handling** | AP-02, AP-05, AP-09 | High |
| **Copy-paste from Stack Overflow** | AP-03, AP-09, AP-17 | Medium |
| **GC creating false sense of safety** | AP-15, AP-04 | Medium |

---

## Self-Check Questions

Use these during code review or self-review. A "yes" answer indicates a potential anti-pattern.

1. **Does any catch block have an empty body, or only a comment/TODO?** (AP-02)
2. **Does any catch clause use the broadest possible exception type (`Exception`, `Throwable`, `BaseException`, bare `catch`)?** (AP-01, AP-06)
3. **Are there catch blocks that both log the exception AND rethrow it?** (AP-05)
4. **Does any function catch an exception and return null without documenting why?** (AP-04)
5. **Are there `assert` statements validating user input, authorization, or business rules?** (AP-11)
6. **Do any catch blocks construct a new exception using only `e.getMessage()` without chaining the cause?** (AP-08)
7. **Is error string content (`e.message`, `err.Error()`) compared using `contains`, `includes`, or `equals`?** (AP-13)
8. **Are there async function calls without `await`, `.catch()`, or stored task references?** (AP-10)
9. **Do HTTP handlers return the same status code (usually 500) for validation errors and system errors?** (AP-12)
10. **Are there `return` statements inside `finally` blocks?** (AP-18)
11. **Do resource allocations (connections, file handles, locks) occur outside try-with-resources or context managers?** (AP-15)
12. **Are try-catch blocks nested more than 2 levels deep?** (AP-09)
13. **Does the codebase mix error-code returns and exceptions for the same type of failure?** (AP-16)
14. **Are there `panic()` or `.unwrap()` calls in non-initialization, non-test code?** (AP-17)
15. **Does the React component tree have more than 50 components without any `ErrorBoundary`?** (AP-14)

---

## Code Smell Quick Reference

| Smell | Pattern to Look For | Likely Anti-Pattern | Severity |
|---|---|---|---|
| `except Exception: pass` | Bare catch with empty body | AP-01 + AP-02 | Critical |
| `catch (Throwable t)` | Catching JVM-level errors | AP-06 | Critical |
| `return null` in catch block | Exception converted to null | AP-04 | High |
| `logger.error(e); throw e;` | Log followed by rethrow | AP-05 | Medium |
| `throw new X(e.getMessage())` | New exception from message only | AP-08 | Medium |
| `assert user_input > 0` | Assert on external input | AP-11 | Critical |
| `int.Parse` in try-catch | Exception as flow control | AP-03 | Medium |
| `err.message.includes("...")` | String-matching on error text | AP-13 | High |
| `processAsync(x)` (no await) | Floating promise | AP-10 | Critical |
| Nested `try { try { try {` | 3+ nesting levels | AP-09 | Medium |
| `return 42` inside `finally` | Return overriding exception | AP-18 | Critical |
| `res.status(500)` for all errors | No error type distinction | AP-12 | High |
| `panic("not found")` | Panic for expected condition | AP-17 | High |
| No `ErrorBoundary` in React tree | Uncontained error blast radius | AP-14 | High |
| `conn = getConnection()` without `try-finally` | Resource outside cleanup block | AP-15 | High |
| Function returns error dict AND raises | Mixed error signaling | AP-16 | Medium |

---

## Key Research

The University of Toronto study "Simple Testing Can Prevent Most Critical Failures" (OSDI 2014, Yuan et al.) analyzed 198 failures across Cassandra, HBase, HDFS, MapReduce, and Redis. Core findings relevant to this module:

- **92%** of catastrophic failures resulted from incorrect handling of non-fatal errors
- **35%** had trivial error-handling bugs (empty handlers, log-only handlers, incomplete logic)
- **77%** of failures could be reproduced by a unit test
- **98%** manifested on no more than 3 nodes
- The authors built Aspirator, a static checker that automatically detected these bugs

This research provides empirical backing for why error handling anti-patterns are not theoretical concerns -- they are the primary cause of production catastrophes in distributed systems.

---

*Researched: 2026-03-08 | Sources: Yuan et al. "Simple Testing Can Prevent Most Critical Failures" (OSDI 2014), Harness.io "Swallowed Exceptions: The Silent Killer of Java Applications", DZone "The Tiny Mistake That Crashed Our Node.js App", Tony Hoare "Null References: The Billion-Dollar Mistake" (QCon 2009), Dave Cheney "Don't just check errors, handle them gracefully", TheServerSide "Either log or rethrow Java exceptions", Baeldung "Is It a Bad Practice to Catch Throwable?", React documentation on Error Boundaries, Wix Engineering "White Screen of Death", Snyk "The dangers of assert in Python", Eli Bendersky "On the uses and misuses of panics in Go", SonarQube rules S2139/S1181/S108/S2095, CWE-397, OWASP Top 10 Proactive Controls C10, Maximiliano Contieri "Code Smell 80 - Nested Try/Catch", n8n Issue #19434, Databricks SDK Issue #1117*
